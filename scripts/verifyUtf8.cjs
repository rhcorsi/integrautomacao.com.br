const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { TextDecoder } = require("node:util");

const TEXT_EXTENSIONS = new Set([
  ".astro",
  ".cjs",
  ".css",
  ".csv",
  ".example",
  ".html",
  ".js",
  ".jsx",
  ".json",
  ".jsonc",
  ".md",
  ".mdx",
  ".mjs",
  ".ps1",
  ".py",
  ".sh",
  ".sql",
  ".svg",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".xsl",
  ".yaml",
  ".yml",
]);

const TEXT_BASENAMES = new Set([
  ".gitattributes",
  ".gitignore",
  ".npmrc",
  ".nvmrc",
  "CNAME",
  "Dockerfile",
  "LICENSE",
  "_headers",
  "_redirects",
]);

function isTextCandidate(rawGitPath) {
  const basename = path.posix.basename(rawGitPath);
  return (
    TEXT_BASENAMES.has(basename) ||
    TEXT_EXTENSIONS.has(path.posix.extname(basename).toLowerCase())
  );
}

function safeErrorCode(error) {
  return error && typeof error === "object" && typeof error.code === "string"
    ? error.code
    : "UNKNOWN";
}

function escapesRoot(root, target, pathApi = path) {
  const relativeToRoot = pathApi.relative(root, target);
  return (
    relativeToRoot === ".." ||
    relativeToRoot.startsWith(`..${pathApi.sep}`) ||
    pathApi.isAbsolute(relativeToRoot)
  );
}

function resolveInventoryPath(root, rawGitPath, pathApi = path) {
  const components = rawGitPath.split("/");
  if (
    !rawGitPath ||
    rawGitPath.startsWith("/") ||
    components.some((component) => !component || component === "..")
  ) {
    throw new Error(`unsafe inventory path: ${JSON.stringify(rawGitPath)}`);
  }

  const absolutePath = pathApi.resolve(root, ...components);
  const relativeToRoot = pathApi.relative(root, absolutePath);
  if (!relativeToRoot || escapesRoot(root, absolutePath, pathApi)) {
    throw new Error(`inventory path escapes root: ${JSON.stringify(rawGitPath)}`);
  }
  return {
    absolutePath,
    components,
    displayPath: components.join("/"),
    rawGitPath,
  };
}

function inspectAncestors(root, rootRealPath, candidate) {
  const { components } = candidate;
  let ancestorPath = root;

  for (let index = 0; index < components.length - 1; index += 1) {
    ancestorPath = path.join(ancestorPath, components[index]);
    const displayedPath = components.slice(0, index + 1).join("/");

    let stat;
    try {
      stat = fs.lstatSync(ancestorPath);
    } catch (error) {
      if (safeErrorCode(error) === "ENOENT") return false;
      throw new Error(
        `cannot inspect ${displayedPath} (${safeErrorCode(error)})`,
      );
    }

    if (stat.isSymbolicLink()) {
      throw new Error(`symbolic link is not allowed: ${displayedPath}`);
    }
    if (!stat.isDirectory()) {
      throw new Error(`unsupported path ancestor: ${displayedPath}`);
    }

    let ancestorRealPath;
    try {
      ancestorRealPath = fs.realpathSync.native(ancestorPath);
    } catch (error) {
      throw new Error(
        `cannot resolve ${displayedPath} (${safeErrorCode(error)})`,
      );
    }
    if (escapesRoot(rootRealPath, ancestorRealPath)) {
      throw new Error(`real path escapes root: ${displayedPath}`);
    }
  }

  return true;
}

function readGitInventory(root, shallow) {
  const args = [
    "-C",
    root,
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
  ];
  if (shallow) args.push("--directory");
  args.push("-z");

  const result = spawnSync(
    "git",
    args,
    { encoding: null, windowsHide: true },
  );

  if (result.error) {
    throw new Error(`git ls-files could not start (${safeErrorCode(result.error)})`);
  }
  if (result.status !== 0) {
    throw new Error(`git ls-files exited ${result.status ?? "without status"}`);
  }

  let inventoryText;
  try {
    inventoryText = new TextDecoder("utf-8", { fatal: true }).decode(
      result.stdout ?? Buffer.alloc(0),
    );
  } catch {
    throw new Error("git ls-files returned a non-UTF-8 path");
  }

  return inventoryText
    .split("\0")
    .filter(Boolean)
    .sort();
}

function inspectInventoryEntry(root, rootRealPath, inventoryPath, expectedKind) {
  const rawGitPath = inventoryPath.endsWith("/")
    ? inventoryPath.slice(0, -1)
    : inventoryPath;
  const candidate = resolveInventoryPath(root, rawGitPath);
  if (!inspectAncestors(root, rootRealPath, candidate)) return null;

  let stat;
  try {
    stat = fs.lstatSync(candidate.absolutePath);
  } catch (error) {
    if (safeErrorCode(error) === "ENOENT") return null;
    throw new Error(
      `cannot inspect ${candidate.displayPath} (${safeErrorCode(error)})`,
    );
  }

  if (stat.isSymbolicLink()) {
    throw new Error(`symbolic link is not allowed: ${candidate.displayPath}`);
  }
  if (expectedKind === "file" && !stat.isFile()) {
    throw new Error(`unsupported text candidate: ${candidate.displayPath}`);
  }
  if (expectedKind === "directory" && !stat.isDirectory()) {
    throw new Error(`unsupported inventory directory: ${candidate.displayPath}`);
  }
  if (!stat.isFile() && !stat.isDirectory()) {
    throw new Error(`unsupported inventory path: ${candidate.displayPath}`);
  }

  let candidateRealPath;
  try {
    candidateRealPath = fs.realpathSync.native(candidate.absolutePath);
  } catch (error) {
    throw new Error(
      `cannot resolve ${candidate.displayPath} (${safeErrorCode(error)})`,
    );
  }
  if (escapesRoot(rootRealPath, candidateRealPath)) {
    throw new Error(`real path escapes root: ${candidate.displayPath}`);
  }
  return { ...candidate, isDirectory: stat.isDirectory() };
}

function readIgnoredPaths(root, rawGitPaths) {
  if (rawGitPaths.length === 0) return new Set();
  const input = Buffer.from(`${rawGitPaths.join("\0")}\0`, "utf8");
  const result = spawnSync(
    "git",
    ["-C", root, "check-ignore", "--stdin", "-z"],
    { encoding: null, input, windowsHide: true },
  );

  if (result.error) {
    throw new Error(`git check-ignore could not start (${safeErrorCode(result.error)})`);
  }
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`git check-ignore exited ${result.status ?? "without status"}`);
  }

  let ignoredText;
  try {
    ignoredText = new TextDecoder("utf-8", { fatal: true }).decode(
      result.stdout ?? Buffer.alloc(0),
    );
  } catch {
    throw new Error("git check-ignore returned a non-UTF-8 path");
  }
  return new Set(ignoredText.split("\0").filter(Boolean));
}

function inspectUntrackedDirectoryTree(root, rootRealPath, initialDirectories) {
  const queue = [...initialDirectories];
  for (let index = 0; index < queue.length; index += 1) {
    const directory = inspectInventoryEntry(
      root,
      rootRealPath,
      `${queue[index].rawGitPath}/`,
      "directory",
    );
    if (!directory) continue;

    let childNames;
    try {
      childNames = fs.readdirSync(directory.absolutePath, { encoding: "utf8" });
    } catch (error) {
      throw new Error(
        `cannot list ${directory.displayPath} (${safeErrorCode(error)})`,
      );
    }
    childNames.sort();
    const childPaths = childNames.map(
      (name) => `${directory.rawGitPath}/${name}`,
    );
    const ignoredPaths = readIgnoredPaths(root, childPaths);

    for (const childPath of childPaths) {
      if (ignoredPaths.has(childPath)) continue;
      const child = inspectInventoryEntry(root, rootRealPath, childPath, "path");
      if (child?.isDirectory) queue.push(child);
    }
  }
}

function collectCandidates(root) {
  let rootRealPath;
  try {
    rootRealPath = fs.realpathSync.native(root);
  } catch (error) {
    throw new Error(`cannot resolve root (${safeErrorCode(error)})`);
  }

  const untrackedDirectories = [];
  for (const inventoryPath of readGitInventory(root, true)) {
    const inspected = inspectInventoryEntry(
      root,
      rootRealPath,
      inventoryPath,
      inventoryPath.endsWith("/") ? "directory" : "path",
    );
    if (inventoryPath.endsWith("/") && inspected) {
      untrackedDirectories.push(inspected);
    }
  }
  inspectUntrackedDirectoryTree(root, rootRealPath, untrackedDirectories);

  const candidates = [];
  for (const inventoryPath of readGitInventory(root, false)) {
    if (!isTextCandidate(inventoryPath)) continue;
    const candidate = inspectInventoryEntry(
      root,
      rootRealPath,
      inventoryPath,
      "file",
    );
    if (candidate) candidates.push(candidate);
  }
  return candidates;
}

function inspectUtf8(root) {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const candidates = collectCandidates(root);
  const invalidFiles = [];

  for (const candidate of candidates) {
    let rawBuffer;
    try {
      rawBuffer = fs.readFileSync(candidate.absolutePath);
    } catch (error) {
      throw new Error(
        `cannot read ${candidate.displayPath} (${safeErrorCode(error)})`,
      );
    }

    try {
      decoder.decode(rawBuffer);
    } catch {
      invalidFiles.push(candidate.displayPath);
    }
  }

  return {
    totalFiles: candidates.length,
    utf8ValidFiles: candidates.length - invalidFiles.length,
    invalidFiles,
  };
}

function printResult(result) {
  console.log("--- UTF-8 Verification Result ---");
  console.log(`Total files checked: ${result.totalFiles}`);
  console.log(`Valid UTF-8 files: ${result.utf8ValidFiles}`);
  console.log(`Invalid files: ${result.invalidFiles.length}`);
  if (result.invalidFiles.length > 0) {
    console.log("Invalid files list:");
    for (const relativePath of result.invalidFiles) {
      console.log(`- ${relativePath}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log("All checked files are 100% valid UTF-8!");
}

function main() {
  const root = path.resolve(process.argv[2] ?? path.join(__dirname, ".."));
  try {
    const rootStat = fs.statSync(root);
    if (!rootStat.isDirectory()) throw new Error("root is not a directory");
    printResult(inspectUtf8(root));
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(`UTF-8 inventory failed: ${message}`);
    process.exitCode = 2;
  }
}

if (require.main === module) main();

module.exports = {
  inspectUtf8,
  isTextCandidate,
  resolveInventoryPath,
};
