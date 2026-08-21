import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SCRIPT_PATH = join(
  REPOSITORY_ROOT,
  "scripts",
  "checkTechCatalogFaqs.cjs",
);
const TEMP_PREFIX = "integra-faq-audit-";
const PROCESS_INTEGRATION_TIMEOUT_MS = 60_000;
const temporaryRoots: string[] = [];

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

afterEach(async () => {
  while (temporaryRoots.length > 0) {
    const root = temporaryRoots.pop();
    if (!root) continue;
    assertOwnedTemporaryRoot(root);
    await rm(root, { recursive: true, force: true });
  }
});

describe("checkTechCatalogFaqs CLI", () => {
  it("returns exit 2 when the catalog cannot be read", async () => {
    const root = await mkdtemp(join(tmpdir(), TEMP_PREFIX));
    temporaryRoots.push(root);
    const preloadPath = join(root, "fail-tech-catalog-read.cjs");
    await writeFile(
      preloadPath,
      [
        'const fs = require("node:fs");',
        'const path = require("node:path");',
        "const originalReadFileSync = fs.readFileSync;",
        "fs.readFileSync = function patchedReadFileSync(file, ...args) {",
        '  if (path.basename(String(file)) === "techCatalog.ts") {',
        '    throw new Error("synthetic techCatalog read failure");',
        "  }",
        "  return originalReadFileSync.call(this, file, ...args);",
        "};",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = spawnSync(
      process.execPath,
      ["--require", preloadPath, SCRIPT_PATH],
      {
        cwd: REPOSITORY_ROOT,
        encoding: "utf8",
        env: { ...process.env },
      },
    );

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Error checking techCatalog.ts");
    expect(result.stderr).toContain("synthetic techCatalog read failure");
  }, PROCESS_INTEGRATION_TIMEOUT_MS);
});
