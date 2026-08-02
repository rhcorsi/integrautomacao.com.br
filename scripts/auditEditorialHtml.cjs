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
const requiresGovernedReview = (route) =>
  (route.startsWith("/setores/") && route !== "/setores/") ||
  (route.startsWith("/tecnologias/") && route !== "/tecnologias/");
const files = walk(distDir);

for (const file of files) {
  const route = routeFor(file);
  const html = fs.readFileSync(file, "utf8");
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1] ?? "";
  const mainMatches = [...html.matchAll(/<main\b[^>]*>([\s\S]*?)<\/main\s*>/gi)];
  const main = mainMatches[0]?.[1] ?? "";
  const pageText = visibleText(html);
  const visibleTimeDates = new Set();

  for (const timeMatch of html.matchAll(/<time\b([^>]*)>([\s\S]*?)<\/time\s*>/gi)) {
    const tag = `<time${timeMatch[1]}>`;
    const dateTime = attribute(tag, "datetime");
    if (!dateTime || !/^\d{4}-\d{2}-\d{2}$/.test(dateTime)) continue;
    const instant = new Date(`${dateTime}T00:00:00Z`);
    if (Number.isNaN(instant.getTime())) {
      error(route, "time-datetime", `datetime invÃ¡lido: ${dateTime}`);
      continue;
    }
    visibleTimeDates.add(dateTime);
    const expected = new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(instant);
    const actual = visibleText(timeMatch[2]).replace(/^0(?=\d)/, "");
    if (actual !== expected) {
      error(
        route,
        "time-visible-date",
        `datetime ${dateTime} diverge do texto visÃ­vel â€œ${actual}â€; esperado â€œ${expected}â€`,
      );
    }
  }

  if (/abrir fonte prim[áa]ria/i.test(pageText)) {
    error(
      route,
      "source-label",
      "rótulo genérico afirma fonte primária sem distinguir documento citado de documentação relacionada",
    );
  }

  if (requiresGovernedReview(route)) {
    if (
      !/Revisado em\s+(?:<time\b[^>]*>)?\d{1,2}\s+de\s+\p{L}+\s+de\s+\d{4}(?:<\/time>)?\s+por\s+<a\b(?=[^>]*\bhref\s*=\s*["']\/equipe\/["'])[^>]*>[^<]+<\/a>/iu.test(
        main,
      )
    ) {
      error(
        route,
        "editorial-review",
        "página editorial governada sem data e responsável visivelmente vinculados a /equipe/",
      );
    }
  }

  let jsonLdNumber = 0;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const tag = `<script${match[1]}>`;
    const scriptType = (attribute(tag, "type") || "").toLowerCase();
    const scriptSrc = attribute(tag, "src");
    if (!scriptSrc && scriptType !== "application/ld+json" && scriptType !== "application/json") {
      error(
        route,
        "csp-inline-script",
        "script executável inline seria bloqueado pela CSP; gere um asset externo com src",
      );
    }
    if (scriptType !== "application/ld+json") continue;
    jsonLdNumber += 1;

    let data;
    try {
      data = JSON.parse(match[2]);
    } catch (parseError) {
      error(route, "json-ld", `bloco ${jsonLdNumber} contém JSON inválido: ${parseError.message}`);
      continue;
    }

    const pending = Array.isArray(data) ? [...data] : [data];
    while (pending.length > 0) {
      const node = pending.shift();
      if (!node || typeof node !== "object") continue;
      if (Array.isArray(node)) {
        pending.push(...node);
        continue;
      }

      const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
      const visibleSchemaDateFields = types.includes("Event")
        ? ["startDate", "endDate"]
        : types.includes("TechArticle")
          ? ["dateModified"]
          : types.includes("Article") || types.includes("BlogPosting")
            ? ["datePublished", "dateModified"]
            : [];
      for (const field of visibleSchemaDateFields) {
        if (typeof node[field] !== "string") continue;
        const isoDate = node[field].slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate) && !visibleTimeDates.has(isoDate)) {
          error(
            route,
            "schema-visible-date",
            `${field}=${isoDate} do JSON-LD nÃ£o possui <time datetime> visÃ­vel correspondente`,
          );
        }
      }
      if (types.includes("FAQPage") && Array.isArray(node.mainEntity)) {
        const normalizedPageText = pageText.normalize("NFKC").replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
        for (const question of node.mainEntity) {
          if (!question || typeof question.name !== "string") continue;
          const normalizedQuestion = question.name
            .normalize("NFKC")
            .replace(/\s+/g, " ")
            .trim()
            .toLocaleLowerCase("pt-BR");
          if (normalizedQuestion && !normalizedPageText.includes(normalizedQuestion)) {
            error(route, "faq-visible", `pergunta do FAQPage não está visível: “${question.name}”`);
          }

          const answer = question.acceptedAnswer;
          if (!answer || typeof answer !== "object" || typeof answer.text !== "string") {
            error(route, "faq-answer", `pergunta sem acceptedAnswer.text válido: “${question.name}”`);
            continue;
          }
          const normalizedAnswer = visibleText(answer.text)
            .normalize("NFKC")
            .replace(/\s+/g, " ")
            .trim()
            .toLocaleLowerCase("pt-BR");
          if (normalizedAnswer && !normalizedPageText.includes(normalizedAnswer)) {
            error(route, "faq-visible", `resposta do FAQPage não está visível: “${question.name}”`);
          }
        }
      }

      if (Array.isArray(node["@graph"])) pending.push(...node["@graph"]);
    }
  }

  let manualReferenceNumber = 0;
  for (const match of html.matchAll(
    /<figure\b[^>]*\bdata-manual-reference=["']true["'][^>]*>([\s\S]*?)<\/figure\s*>/gi,
  )) {
    manualReferenceNumber += 1;
    const referenceHtml = match[1];
    const sourceLinks = [...referenceHtml.matchAll(/<a\b[^>]*>/gi)].filter((link) => {
      const href = attribute(link[0], "href") || "";
      const target = attribute(link[0], "target");
      return href.startsWith("https://") && target === "_blank";
    });
    const referenceText = visibleText(referenceHtml);
    if (
      sourceLinks.length !== 1 ||
      !/(abrir documento citado|consultar documentação oficial relacionada)/i.test(referenceText)
    ) {
      error(
        route,
        "manual-source",
        `referência técnica ${manualReferenceNumber} sem vínculo público qualificado e inequívoco`,
      );
    }
  }

  if (mainMatches.length !== 1) {
    error(route, "main", `esperado 1 elemento <main>; encontrado(s): ${mainMatches.length}`);
  }
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
  } else if (description.length < 90 || description.length > 160) {
    warn(route, "description-length", `${description.length} caracteres (faixa editorial: 90–160)`);
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

if (structural.length > 0 || warnings.length > 0) {
  console.error(
    structural.length > 0
      ? "\nAuditoria reprovada por falhas estruturais ou avisos editoriais."
      : "\nAuditoria reprovada: avisos editoriais precisam ser resolvidos ou justificados no código.",
  );
  process.exitCode = 1;
} else {
  console.log("\nAuditoria aprovada sem ocorrências.");
}
