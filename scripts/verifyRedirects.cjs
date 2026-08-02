const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const redirectsPath = path.join(root, "public", "_redirects");
const sharedPath = path.join(root, "shared", "legacy-redirects.ts");
const issues = [];

const rules = fs
  .readFileSync(redirectsPath, "utf8")
  .split(/\r?\n/)
  .map((line, index) => ({ index: index + 1, text: line.trim() }))
  .filter(({ text }) => text && !text.startsWith("#"))
  .map(({ index, text }) => {
    const [source, destination, status, ...extra] = text.split(/\s+/);
    if (!source || !destination || status !== "301" || extra.length) {
      issues.push(`linha ${index}: regra 301 malformada`);
    }
    return { destination, index, source };
  });

const seen = new Set();
let dynamicSeen = false;
for (const rule of rules) {
  if (seen.has(rule.source)) issues.push(`linha ${rule.index}: origem duplicada ${rule.source}`);
  seen.add(rule.source);
  const wildcardCount = (rule.source.match(/\*/g) || []).length;
  if (wildcardCount > 1) issues.push(`linha ${rule.index}: mais de uma splat em ${rule.source}`);
  const dynamic = wildcardCount > 0 || /:[A-Za-z][\w-]*/.test(rule.source);
  if (dynamic) dynamicSeen = true;
  else if (dynamicSeen) issues.push(`linha ${rule.index}: regra exata aparece depois de regra dinâmica`);
}

const shared = fs.readFileSync(sharedPath, "utf8");
const mapBody = shared.match(
  /export const LEGACY_PATH_REDIRECTS:[^{]+\{([\s\S]*?)\n\};/,
)?.[1];
if (!mapBody) {
  issues.push("não foi possível ler LEGACY_PATH_REDIRECTS");
} else {
  for (const match of mapBody.matchAll(/^\s*"([^"]+)":\s*"([^"]+)",?$/gm)) {
    const [, source, destination] = match;
    const mirrored = rules.some(
      (rule) =>
        (rule.source === source || rule.source === `${source}/`) &&
        rule.destination === destination,
    );
    if (!mirrored) issues.push(`alias compartilhado sem fallback equivalente: ${source} -> ${destination}`);
  }
}

console.log("\n--- Auditoria de redirects ---");
console.log(`Regras: ${rules.length}`);
console.log(`Problemas: ${issues.length}`);
for (const issue of issues) console.error(`  ${issue}`);
if (issues.length) process.exitCode = 1;
