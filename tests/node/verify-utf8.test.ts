import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  posix,
  relative,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SCRIPT_PATH = join(REPOSITORY_ROOT, "scripts", "verifyUtf8.cjs");
const TEMP_PREFIX = "integra-utf8-audit-";
const PROCESS_INTEGRATION_TIMEOUT_MS = 60_000;
const temporaryRoots: string[] = [];
const require = createRequire(import.meta.url);
const REPRESENTATIVE_TEXT_PATHS = [
  "functions/bad.ts",
  "scripts/bad.cjs",
  ".github/workflows/bad.yml",
  "public/bad.svg",
  "migrations/bad.sql",
  "README.md",
] as const;

function assertOwnedTemporaryRoot(root: string): void {
  const resolvedRoot = resolve(root);
  const relativeToTemp = relative(resolve(tmpdir()), resolvedRoot);
  if (
    !relativeToTemp ||
    relativeToTemp.startsWith("..") ||
    isAbsolute(relativeToTemp) ||
    !basename(resolvedRoot).startsWith(TEMP_PREFIX)
  ) {
    throw new Error(`unsafe temporary cleanup target: ${resolvedRoot}`);
  }
}

async function createTemporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), TEMP_PREFIX));
  temporaryRoots.push(root);
  return root;
}

async function writeFixture(
  root: string,
  relativePath: string,
  content: string | Uint8Array,
): Promise<void> {
  const target = join(root, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
}

function runUtf8Audit(root: string) {
  return spawnSync(process.execPath, [SCRIPT_PATH, root], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    env: { ...process.env },
  });
}

afterEach(async () => {
  while (temporaryRoots.length > 0) {
    const root = temporaryRoots.pop();
    if (!root) continue;
    assertOwnedTemporaryRoot(root);
    await rm(root, { recursive: true, force: true });
  }
});

describe("verifyUtf8 CLI", () => {
  it("returns exit 1 for invalid repository text outside src", async () => {
    const root = await createTemporaryRoot();
    const gitInit = spawnSync("git", ["init", "--quiet"], {
      cwd: root,
      encoding: "utf8",
    });
    expect(gitInit.error).toBeUndefined();
    expect(gitInit.status).toBe(0);

    await writeFixture(root, ".gitignore", "node_modules/\n");
    for (const relativePath of REPRESENTATIVE_TEXT_PATHS) {
      await writeFixture(root, relativePath, Uint8Array.of(0x66, 0x6f, 0x80));
    }
    await writeFixture(root, "src/good.ts", "export const ok = true;\n");
    await writeFixture(root, "node_modules/ignored.ts", Uint8Array.of(0xff));
    await writeFixture(root, "public/photo.png", Uint8Array.of(0xff));

    const invalid = runUtf8Audit(root);
    expect(invalid.error).toBeUndefined();
    expect(invalid.status).toBe(1);
    const invalidOutput = `${invalid.stdout}\n${invalid.stderr}`;
    expect(invalid.stdout).toContain("Total files checked: 8");
    expect(invalid.stdout).toContain("Valid UTF-8 files: 2");
    expect(invalid.stdout).toContain("Invalid files: 6");
    const reportedInvalidPaths = invalid.stdout
      .split(/\r?\n/u)
      .filter((line) => line.startsWith("- "))
      .map((line) => line.slice(2));
    expect(reportedInvalidPaths).toEqual(
      [...REPRESENTATIVE_TEXT_PATHS].sort(),
    );
    for (const relativePath of [...REPRESENTATIVE_TEXT_PATHS].sort()) {
      expect(invalidOutput).toContain(relativePath);
      const occurrences = invalidOutput.match(
        new RegExp(relativePath.replaceAll(".", "\\."), "g"),
      );
      expect(occurrences ?? []).toHaveLength(1);
    }
    expect(invalidOutput).not.toContain("node_modules/ignored.ts");
    expect(invalidOutput).not.toContain("public/photo.png");
  }, PROCESS_INTEGRATION_TIMEOUT_MS);

  it("returns exit 0 for a valid repository text inventory", async () => {
    const root = await createTemporaryRoot();
    const gitInit = spawnSync("git", ["init", "--quiet"], {
      cwd: root,
      encoding: "utf8",
    });
    expect(gitInit.error).toBeUndefined();
    expect(gitInit.status).toBe(0);
    await writeFixture(root, ".gitignore", "node_modules/\n");
    for (const relativePath of REPRESENTATIVE_TEXT_PATHS) {
      await writeFixture(root, relativePath, "texto UTF-8 válido\n");
    }
    await writeFixture(root, "src/good.ts", "export const ok = true;\n");
    await writeFixture(root, "node_modules/ignored.ts", Uint8Array.of(0xff));
    await writeFixture(root, "public/photo.png", Uint8Array.of(0xff));

    const valid = runUtf8Audit(root);
    const validOutput = `${valid.stdout}\n${valid.stderr}`;
    expect(valid.error).toBeUndefined();
    expect(valid.status).toBe(0);
    expect(valid.stdout).toContain("Total files checked: 8");
    expect(valid.stdout).toContain("Valid UTF-8 files: 8");
    expect(valid.stdout).toContain("Invalid files: 0");
    expect(validOutput).not.toContain("node_modules/ignored.ts");
    expect(validOutput).not.toContain("public/photo.png");
  }, PROCESS_INTEGRATION_TIMEOUT_MS);

  it("returns exit 2 when the root has no Git inventory", async () => {
    const root = await createTemporaryRoot();
    await writeFixture(root, "README.md", "fixture sem inventário Git\n");

    const result = runUtf8Audit(root);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(2);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "UTF-8 inventory failed",
    );
  }, PROCESS_INTEGRATION_TIMEOUT_MS);

  it("rejects a nested directory link before any full Git inventory", async ({
    skip,
  }) => {
    const root = await createTemporaryRoot();
    const outsideRoot = await createTemporaryRoot();
    const controlRoot = await createTemporaryRoot();
    const gitInit = spawnSync("git", ["init", "--quiet"], {
      cwd: root,
      encoding: "utf8",
    });
    expect(gitInit.error).toBeUndefined();
    expect(gitInit.status).toBe(0);
    await writeFixture(
      outsideRoot,
      "external-secret.ts",
      Uint8Array.of(0xff),
    );
    await writeFixture(root, ".gitignore", "safe/ignored-linked/\n");
    await mkdir(join(root, "safe"), { recursive: true });

    try {
      await symlink(
        outsideRoot,
        join(root, "safe", "linked"),
        process.platform === "win32" ? "junction" : "dir",
      );
      await symlink(
        outsideRoot,
        join(root, "safe", "ignored-linked"),
        process.platform === "win32" ? "junction" : "dir",
      );
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "UNKNOWN";
      if (["EACCES", "EINVAL", "ENOSYS", "ENOTSUP", "EPERM"].includes(code)) {
        skip(`directory links are unavailable (${code})`);
        return;
      }
      throw error;
    }

    const lsFilesLogPath = join(controlRoot, "ls-files-calls.jsonl");
    const checkIgnoreLogPath = join(controlRoot, "check-ignore-calls.jsonl");
    const preloadPath = join(controlRoot, "block-full-first.cjs");
    await writeFile(lsFilesLogPath, "", "utf8");
    await writeFile(checkIgnoreLogPath, "", "utf8");
    await writeFile(
      preloadPath,
      [
        'const childProcess = require("node:child_process");',
        'const fs = require("node:fs");',
        "const originalSpawnSync = childProcess.spawnSync;",
        "childProcess.spawnSync = function guardedSpawnSync(command, args, options) {",
        '  if (command === "git") {',
        '    if (args.includes("ls-files")) {',
        "      fs.appendFileSync(",
        "        process.env.UTF8_LS_FILES_LOG,",
        '        `${JSON.stringify(args)}\\n`,',
        '        "utf8",',
        "      );",
        '      if (!args.includes("--directory")) {',
        '        throw new Error("FULL_INVENTORY_BEFORE_BFS_BLOCKED");',
        "      }",
        "    }",
        '    if (args.includes("check-ignore")) {',
        "      fs.appendFileSync(",
        "        process.env.UTF8_CHECK_IGNORE_LOG,",
        '        `${JSON.stringify(args)}\\n`,',
        '        "utf8",',
        "      );",
        "    }",
        "  }",
        "  return originalSpawnSync.call(this, command, args, options);",
        "};",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = spawnSync(
      process.execPath,
      ["--require", preloadPath, SCRIPT_PATH, root],
      {
        cwd: REPOSITORY_ROOT,
        encoding: "utf8",
        env: {
          ...process.env,
          UTF8_CHECK_IGNORE_LOG: checkIgnoreLogPath,
          UTF8_LS_FILES_LOG: lsFilesLogPath,
        },
      },
    );
    const output = `${result.stdout}\n${result.stderr}`;
    const lsFilesCalls = (await readFile(lsFilesLogPath, "utf8"))
      .trim()
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as string[]);
    const checkIgnoreCalls = (await readFile(checkIgnoreLogPath, "utf8"))
      .trim()
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as string[]);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(2);
    expect(lsFilesCalls).toHaveLength(1);
    expect(lsFilesCalls[0]).toContain("--directory");
    expect(lsFilesCalls[0]).toContain("-z");
    expect(checkIgnoreCalls.length).toBeGreaterThan(0);
    for (const call of checkIgnoreCalls) {
      expect(call).toContain("--stdin");
      expect(call).toContain("-z");
    }
    expect(output).not.toContain("FULL_INVENTORY_BEFORE_BFS_BLOCKED");
    expect(output).toContain("symbolic link is not allowed: safe/linked");
    expect(output).not.toContain("ignored-linked");
    expect(output).not.toContain("external-secret.ts");
  }, PROCESS_INTEGRATION_TIMEOUT_MS);

  it("validates a legitimate filename beginning with two dots", async () => {
    const root = await createTemporaryRoot();
    const gitInit = spawnSync("git", ["init", "--quiet"], {
      cwd: root,
      encoding: "utf8",
    });
    expect(gitInit.error).toBeUndefined();
    expect(gitInit.status).toBe(0);
    await writeFixture(root, "..inside.ts", Uint8Array.of(0xff));

    const result = runUtf8Audit(root);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Invalid files: 1");
    expect(result.stdout).toContain("- ..inside.ts");
  }, PROCESS_INTEGRATION_TIMEOUT_MS);

  it("keeps a backslash as filename data under POSIX path semantics", () => {
    const auditModule = require(SCRIPT_PATH) as {
      resolveInventoryPath?: (
        root: string,
        rawGitPath: string,
        pathApi: typeof posix,
      ) => { absolutePath: string; displayPath: string };
    };
    const rawGitPath = String.raw`back\slash.ts`;

    const resolved = auditModule.resolveInventoryPath?.(
      "/repository",
      rawGitPath,
      posix,
    );

    expect(resolved?.absolutePath).toBe(
      String.raw`/repository/back\slash.ts`,
    );
    expect(resolved?.displayPath).toBe(rawGitPath);
  });
});
