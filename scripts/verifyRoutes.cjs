const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "dist");

if (!fs.existsSync(distDir)) {
  console.error("dist/ não encontrado. Execute `npm run build` antes desta auditoria.");
  process.exit(2);
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(entryPath, files);
    else files.push(entryPath);
  }
  return files;
}

function publicPath(file) {
  return `/${path.relative(distDir, file).replace(/\\/g, "/")}`;
}

function routeForHtml(file) {
  const filePath = publicPath(file);
  if (filePath === "/index.html") return "/";
  if (filePath.endsWith("/index.html")) return filePath.slice(0, -"index.html".length);
  return filePath;
}

const files = walk(distDir);
const filePaths = new Set(files.map(publicPath));
const htmlByRoute = new Map(
  files
    .filter((file) => file.endsWith(".html"))
    .map((file) => [routeForHtml(file), file]),
);

function normalizeRoute(pathname) {
  if (pathname === "/") return "/";
  if (pathname.endsWith("/")) return pathname;
  if (htmlByRoute.has(`${pathname}/`)) return `${pathname}/`;
  return pathname;
}

function targetExists(pathname) {
  const route = normalizeRoute(pathname);
  if (htmlByRoute.has(route)) return true;
  if (filePaths.has(pathname)) return true;
  if (filePaths.has(`${pathname}/index.html`)) return true;
  const htmlFallback = `${pathname.replace(/\/$/, "")}.html`;
  if (filePaths.has(htmlFallback)) return true;
  return pathname.startsWith("/api/");
}

function idsIn(file) {
  const html = fs.readFileSync(file, "utf8");
  const ids = new Set();
  const regex = /\bid=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(html)) !== null) ids.add(match[1]);
  return ids;
}

function decodeHtmlAttribute(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");
}

const idCache = new Map();
const problems = [];
let checked = 0;

for (const [pageRoute, file] of htmlByRoute) {
  const html = fs.readFileSync(file, "utf8");
  const linkRegex = /\b(?:href|src)=["']([^"']+)["']/g;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const raw = decodeHtmlAttribute(match[1].trim());
    if (
      !raw ||
      raw.startsWith("mailto:") ||
      raw.startsWith("tel:") ||
      raw.startsWith("data:") ||
      raw.startsWith("javascript:") ||
      raw.startsWith("//")
    ) {
      continue;
    }

    let target;
    try {
      target = new URL(raw, `https://integrautomacao.com.br${pageRoute}`);
    } catch {
      problems.push({ pageRoute, raw, reason: "URL inválida" });
      continue;
    }
    if (target.origin !== "https://integrautomacao.com.br") continue;

    checked += 1;
    let pathname;
    try {
      pathname = decodeURI(target.pathname);
    } catch {
      problems.push({ pageRoute, raw, reason: "caminho com encoding inválido" });
      continue;
    }

    if (!targetExists(pathname)) {
      problems.push({ pageRoute, raw, reason: `destino ausente (${pathname})` });
      continue;
    }

    if (target.hash) {
      const targetRoute = normalizeRoute(pathname);
      const targetFile = htmlByRoute.get(targetRoute);
      if (!targetFile) continue;
      if (!idCache.has(targetFile)) idCache.set(targetFile, idsIn(targetFile));
      const id = decodeURIComponent(target.hash.slice(1));
      if (id && !idCache.get(targetFile).has(id)) {
        problems.push({ pageRoute, raw, reason: `fragmento #${id} ausente` });
      }
    }
  }
}

console.log("--- Auditoria de rotas no HTML gerado ---");
console.log(`Páginas HTML: ${htmlByRoute.size}`);
console.log(`Referências internas verificadas: ${checked}`);
console.log(`Problemas: ${problems.length}`);

for (const problem of problems) {
  console.log(`  ${problem.pageRoute} → ${problem.raw}: ${problem.reason}`);
}

if (problems.length > 0) process.exitCode = 1;
