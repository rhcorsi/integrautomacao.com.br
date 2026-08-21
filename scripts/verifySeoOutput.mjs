import { readdir, readFile } from "node:fs/promises";
import { basename, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { shouldIncludeInSitemap } from "../src/utils/seo-policy.ts";

const SITE = "https://integrautomacao.com.br";

async function findFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(current, entry.name);
    if (entry.isDirectory()) files.push(...(await findFiles(root, path)));
    if (entry.isFile()) files.push(relative(root, path).replaceAll("\\", "/"));
  }
  return files.sort();
}

function outputUrl(relativePath) {
  if (relativePath === "index.html") return new URL("/", SITE);
  if (relativePath.endsWith("/index.html")) {
    return new URL(`/${relativePath.slice(0, -"index.html".length)}`, SITE);
  }
  return new URL(`/${relativePath.slice(0, -".html".length)}`, SITE);
}

function attribute(tag, name) {
  const match = tag.match(
    new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "iu"),
  );
  return match?.[2] ?? null;
}

function metaContent(html, name, value) {
  for (const tag of html.matchAll(/<meta\b[^>]*>/giu)) {
    if (attribute(tag[0], name)?.toLowerCase() === value) {
      return attribute(tag[0], "content");
    }
  }
  return null;
}

function canonicalHref(html) {
  for (const tag of html.matchAll(/<link\b[^>]*>/giu)) {
    if (attribute(tag[0], "rel")?.toLowerCase() === "canonical") {
      return attribute(tag[0], "href");
    }
  }
  return null;
}

function canonicalPathname(url) {
  const pathname = new URL(url, SITE).pathname.replace(/\/{2,}$/u, "/");
  return pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
}

function sitemapLocations(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/giu)].map((match) => match[1]);
}

export async function inspectSeoOutput(distDir) {
  const root = resolve(distDir);
  const files = await findFiles(root);
  const htmlFiles = files.filter((file) => file.endsWith(".html"));
  const sitemapFiles = files.filter(
    (file) => /^sitemap-.*\.xml$/u.test(basename(file)),
  );
  const violations = [];
  const noindexUrls = new Set();

  for (const file of htmlFiles) {
    const html = await readFile(resolve(root, file), "utf8");
    const robots = metaContent(html, "name", "robots");
    const url = outputUrl(file);
    if (robots?.toLowerCase().includes("noindex")) {
      noindexUrls.add(canonicalPathname(url));
    }

    if (file === "404.html") {
      if (robots?.toLowerCase() !== "noindex,follow") {
        violations.push("404.html: robots must be noindex,follow");
      }
      if (canonicalHref(html) !== null) {
        violations.push("404.html: canonical must be absent");
      }
      if (metaContent(html, "property", "og:url") !== null) {
        violations.push("404.html: og:url must be absent");
      }
    }

    if (file === "busca/index.html") {
      if (robots?.toLowerCase() !== "noindex,follow") {
        violations.push("busca/index.html: robots must be noindex,follow");
      }
      if (canonicalHref(html) !== `${SITE}/busca/`) {
        violations.push(
          "busca/index.html: canonical must equal https://integrautomacao.com.br/busca/",
        );
      }
    }

    if (
      file === "integra-acao/webinar/index.html" &&
      robots?.toLowerCase() !== "noindex,nofollow"
    ) {
      violations.push(
        "integra-acao/webinar/index.html: robots must be noindex,nofollow",
      );
    }

    if (
      file === "integra-acao/newsletter/confirmar/index.html" &&
      robots?.toLowerCase() !== "noindex,nofollow"
    ) {
      violations.push(
        "integra-acao/newsletter/confirmar/index.html: robots must be noindex,nofollow",
      );
    }
  }

  for (const sitemapFile of sitemapFiles) {
    const xml = await readFile(resolve(root, sitemapFile), "utf8");
    for (const location of sitemapLocations(xml)) {
      const allowedInSitemap = shouldIncludeInSitemap(location);
      const apiPath = canonicalPathname(location).startsWith("/api/");
      if (!allowedInSitemap && apiPath) {
        violations.push(`${sitemapFile}: contains API URL ${location}`);
      } else if (noindexUrls.has(canonicalPathname(location))) {
        violations.push(`${sitemapFile}: contains noindex URL ${location}`);
      } else if (!allowedInSitemap) {
        violations.push(`${sitemapFile}: contains excluded URL ${location}`);
      }
    }
  }

  return violations.sort();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const distDir = process.argv[2];
  if (!distDir) {
    console.error("Usage: node scripts/verifySeoOutput.mjs <distDir>");
    process.exitCode = 1;
  } else {
    const violations = await inspectSeoOutput(distDir);
    if (violations.length === 0) {
      console.log("SEO output policy: PASS");
    } else {
      for (const violation of violations) console.error(violation);
      process.exitCode = 1;
    }
  }
}
