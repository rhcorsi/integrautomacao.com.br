const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "dist");
const detailLimit = Number.parseInt(process.env.AUDIT_EDITORIAL_MAX_DETAILS || "120", 10);

if (!fs.existsSync(distDir)) {
  console.error("dist/ não encontrado. Execute `npm run build` antes desta auditoria.");
  process.exit(2);
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(entryPath, files);
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(entryPath);
  }
  return files;
}

function routeFor(file) {
  const relative = path.relative(distDir, file).replace(/\\/g, "/");
  if (relative === "index.html") return "/";
  if (relative.endsWith("/index.html")) return `/${relative.slice(0, -"index.html".length)}`;
  return `/${relative}`;
}

function decodeEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    laquo: "«",
    ldquo: "“",
    lsquo: "‘",
    lt: "<",
    mdash: "—",
    nbsp: " ",
    ndash: "–",
    quot: '"',
    raquo: "»",
    rdquo: "”",
    rsquo: "’",
  };

  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (entity, key) => {
    if (key[0] === "#") {
      const hexadecimal = key[1].toLowerCase() === "x";
      const codePoint = Number.parseInt(key.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      if (Number.isFinite(codePoint)) {
        try {
          return String.fromCodePoint(codePoint);
        } catch {
          return entity;
        }
      }
    }
    return named[key.toLowerCase()] ?? entity;
  });
}

function visibleText(html) {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|template|svg)\b[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function attribute(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match ? decodeEntities(match[1] ?? match[2] ?? match[3] ?? "").trim() : null;
}

function metaContents(html, attributeName, attributeValue) {
  const contents = [];
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const actual = attribute(tag, attributeName);
    if (actual && actual.toLowerCase() === attributeValue.toLowerCase()) {
      contents.push(attribute(tag, "content"));
    }
  }
  return contents;
}

function canonicalHrefs(html) {
  const hrefs = [];
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = attribute(tag, "rel");
    if (rel && rel.toLowerCase().split(/\s+/).includes("canonical")) hrefs.push(attribute(tag, "href"));
  }
  return hrefs;
}

function wordCount(value) {
  const words = visibleText(value).match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu);
  return words ? words.length : 0;
}

const structural = [];
const warnings = [];

function error(route, rule, message) {
  structural.push({ route, rule, message });
}

function warn(route, rule, message) {
  warnings.push({ route, rule, message });
}

const requiredOpenGraph = ["og:title", "og:description", "og:type", "og:url", "og:image", "og:image:alt"];
const requiredTwitter = ["twitter:card", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt"];
const files = walk(distDir);

for (const file of files) {
  const route = routeFor(file);
  const html = fs.readFileSync(file, "utf8");
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1] ?? "";
  const mainMatches = [...html.matchAll(/<main\b[^>]*>([\s\S]*?)<\/main\s*>/gi)];

  if (mainMatches.length !== 1) {
    error(route, "main", `esperado 1 elemento <main>; encontrado(s): ${mainMatches.length}`);
  }
  const main = mainMatches[0]?.[1] ?? "";
  const h1Count = [...main.matchAll(/<h1\b[^>]*>/gi)].length;
  if (h1Count !== 1) error(route, "h1", `esperado exatamente 1 H1 dentro de <main>; encontrado(s): ${h1Count}`);

  const titleTags = [...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/gi)];
  const title = titleTags.length === 1 ? visibleText(titleTags[0][1]) : "";
  if (titleTags.length !== 1 || !title) {
    error(route, "title", `esperado 1 <title> não vazio; encontrado(s): ${titleTags.length}`);
  } else if (title.length < 30 || title.length > 65) {
    warn(route, "title-length", `${title.length} caracteres (faixa recomendada: 30–65): “${title}”`);
  }

  const descriptions = metaContents(head, "name", "description");
  const description = descriptions[0];
  if (descriptions.length !== 1 || !description) {
    error(route, "meta-description", `esperada 1 meta description não vazia; encontrada(s): ${descriptions.length}`);
  } else if (description.length < 90 || description.length > 170) {
    warn(route, "description-length", `${description.length} caracteres (faixa recomendada: 90–170)`);
  }

  const canonicals = canonicalHrefs(head);
  const canonical = canonicals[0];
  if (canonicals.length !== 1 || !canonical) {
    error(route, "canonical", `esperado 1 link canonical não vazio; encontrado(s): ${canonicals.length}`);
  } else {
    try {
      const url = new URL(canonical);
      if (url.protocol !== "https:") error(route, "canonical", `canonical deve usar HTTPS: ${canonical}`);
      if (url.origin !== "https://integrautomacao.com.br") {
        error(route, "canonical", `canonical aponta para origem inesperada: ${url.origin}`);
      }
    } catch {
      error(route, "canonical", `canonical inválido: ${canonical}`);
    }
  }

  for (const property of requiredOpenGraph) {
    const values = metaContents(head, "property", property);
    if (values.length !== 1 || !values[0]) {
      error(route, property, `esperada 1 meta ${property} não vazia; encontrada(s): ${values.length}`);
    }
  }
  for (const name of requiredTwitter) {
    const values = metaContents(head, "name", name);
    if (values.length !== 1 || !values[0]) {
      error(route, name, `esperada 1 meta ${name} não vazia; encontrada(s): ${values.length}`);
    }
  }

  let imageNumber = 0;
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    imageNumber += 1;
    const tag = match[0];
    if (attribute(tag, "alt") === null) {
      const src = attribute(tag, "src") || `(imagem ${imageNumber})`;
      error(route, "image-alt", `imagem sem atributo alt: ${src}`);
    }
  }

  const headings = [...main.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi)].map((match) => ({
    level: Number(match[1]),
    text: visibleText(match[2]) || "(sem texto)",
  }));
  for (let index = 1; index < headings.length; index += 1) {
    const previous = headings[index - 1];
    const current = headings[index];
    if (current.level > previous.level + 1) {
      warn(route, "heading-jump", `H${previous.level} “${previous.text}” → H${current.level} “${current.text}”`);
    }
  }

  let paragraphNumber = 0;
  for (const match of main.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi)) {
    paragraphNumber += 1;
    const count = wordCount(match[1]);
    if (count > 120) {
      const excerpt = visibleText(match[1]).slice(0, 90);
      warn(route, "long-paragraph", `parágrafo ${paragraphNumber} com ${count} palavras: “${excerpt}${excerpt.length === 90 ? "…" : ""}”`);
    }
  }
}

function countsByRule(items) {
  const counts = new Map();
  for (const item of items) counts.set(item.rule, (counts.get(item.rule) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function printItems(label, items) {
  if (items.length === 0) return;
  console.log(`\n${label}:`);
  const visible = items.slice(0, Number.isFinite(detailLimit) ? detailLimit : 120);
  for (const item of visible) console.log(`  ${item.route} [${item.rule}] ${item.message}`);
  if (items.length > visible.length) console.log(`  … ${items.length - visible.length} ocorrência(s) omitida(s).`);
}

console.log("--- Auditoria editorial e SEO do HTML gerado ---");
console.log(`Páginas HTML: ${files.length}`);
console.log(`Falhas estruturais: ${structural.length}`);
console.log(`Avisos editoriais: ${warnings.length}`);

for (const [rule, count] of countsByRule(structural)) console.log(`  ERRO ${rule}: ${count}`);
for (const [rule, count] of countsByRule(warnings)) console.log(`  AVISO ${rule}: ${count}`);

printItems("Falhas estruturais", structural);
printItems("Avisos editoriais", warnings);

if (structural.length > 0) {
  console.error("\nAuditoria reprovada por falhas estruturais.");
  process.exitCode = 1;
} else {
  console.log(warnings.length > 0 ? "\nEstrutura aprovada; avisos editoriais requerem revisão humana." : "\nAuditoria aprovada sem ocorrências.");
}
