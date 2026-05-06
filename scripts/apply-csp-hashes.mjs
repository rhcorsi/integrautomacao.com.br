import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
const distDir = new URL("../dist/", import.meta.url);
const headersPath = new URL("../dist/_headers", import.meta.url);

async function listHtmlFiles(dirUrl) {
  const entries = await readdir(dirUrl, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const child = new URL(entry.name, dirUrl);
    if (entry.isDirectory()) {
      files.push(...(await listHtmlFiles(new URL(`${entry.name}/`, dirUrl))));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(child);
    }
  }

  return files;
}

function inlineScriptHashes(html) {
  const hashes = new Set();
  const scriptRegex = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(scriptRegex)) {
    const scriptBody = match[1];
    if (!scriptBody.trim()) continue;
    const hash = createHash("sha256").update(scriptBody).digest("base64");
    hashes.add(`'sha256-${hash}'`);
  }

  return hashes;
}

function mergeHashesIntoCsp(headers, hashes) {
  const cspLineRegex = /^(\s*Content-Security-Policy:\s*)(.*)$/m;
  const match = headers.match(cspLineRegex);
  if (!match) {
    throw new Error("Content-Security-Policy header not found in dist/_headers.");
  }

  const [, prefix, csp] = match;
  const directives = csp
    .split(";")
    .map((directive) => directive.trim())
    .filter(Boolean);

  const scriptIndex = directives.findIndex((directive) =>
    directive.startsWith("script-src "),
  );
  if (scriptIndex === -1) {
    throw new Error("script-src directive not found in CSP header.");
  }

  const scriptTokens = directives[scriptIndex]
    .split(/\s+/)
    .filter((token) => !token.startsWith("'sha256-"));
  directives[scriptIndex] = [...scriptTokens, ...[...hashes].sort()].join(" ");

  return headers.replace(cspLineRegex, `${prefix}${directives.join("; ")}`);
}

const htmlFiles = await listHtmlFiles(distDir);
const hashes = new Set();

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  for (const hash of inlineScriptHashes(html)) hashes.add(hash);
}

if (hashes.size > 0) {
  const headers = await readFile(headersPath, "utf8");
  await writeFile(headersPath, mergeHashesIntoCsp(headers, hashes), "utf8");
}

console.log(`CSP inline script hashes added: ${hashes.size}`);
