import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  normalizeSeoPath,
  resolveCanonicalUrl,
  shouldIncludeInSitemap,
} from "../../src/utils/seo-policy";
import { inspectSeoOutput } from "../../scripts/verifySeoOutput.mjs";

const SITE = "https://integrautomacao.com.br";

async function writeOutput(
  dist: string,
  relativePath: string,
  content: string,
) {
  const target = join(dist, relativePath);
  await mkdir(join(target, ".."), { recursive: true });
  await writeFile(target, content, "utf8");
}

describe("SEO policy", () => {
  it.each([
    "/404",
    "/404/",
    "/busca",
    "/busca/",
    "/integra-acao/webinar",
    "/integra-acao/webinar/",
    "/integra-acao/newsletter/confirmar",
    "/integra-acao/newsletter/confirmar/",
    "/api/contact",
    "/api/contact/?source=site",
  ])("excludes %s from the sitemap", (path) => {
    expect(shouldIncludeInSitemap(`${SITE}${path}`)).toBe(false);
  });

  it("normalizes only trailing slash variants without substring exclusions", () => {
    expect(normalizeSeoPath(`${SITE}/busca///?q=plc`)).toBe("/busca/");
    expect(shouldIncludeInSitemap(`${SITE}/empresa/`)).toBe(true);
    expect(shouldIncludeInSitemap(`${SITE}/apiaries/`)).toBe(true);
    expect(shouldIncludeInSitemap(`${SITE}/solucoes/api/contact/`)).toBe(true);
  });

  it("keeps indexable pages and supports an explicit absent canonical", () => {
    expect(resolveCanonicalUrl(false, "/404", SITE)).toBeNull();
    expect(resolveCanonicalUrl(undefined, "/empresa/", SITE)?.href).toBe(
      `${SITE}/empresa/`,
    );
    expect(resolveCanonicalUrl("/contato/", "/empresa/", SITE)?.href).toBe(
      `${SITE}/contato/`,
    );
  });

  it("reports contradictory rendered noindex pages in every sitemap", async () => {
    const dist = await mkdtemp(join(tmpdir(), "seo-policy-"));
    await writeOutput(
      dist,
      "404.html",
      '<meta name="robots" content="noindex,follow"><link rel="canonical" href="/404"><meta property="og:url" content="/404">',
    );
    await writeOutput(
      dist,
      "busca/index.html",
      `<meta name="robots" content="noindex,follow"><link rel="canonical" href="${SITE}/busca/">`,
    );
    await writeOutput(
      dist,
      "integra-acao/webinar/index.html",
      '<meta name="robots" content="noindex,nofollow">',
    );
    await writeOutput(
      dist,
      "future-utility/index.html",
      '<meta name="robots" content="noindex,follow">',
    );
    await writeOutput(
      dist,
      "sitemap-0.xml",
      [
        `<loc>${SITE}/404/</loc>`,
        `<loc>${SITE}/api/contact/?source=sitemap</loc>`,
        `<loc>${SITE}/integra-acao/webinar/</loc>`,
        `<loc>${SITE}/future-utility/</loc>`,
      ].join(""),
    );
    await writeOutput(
      dist,
      "sitemap-1.xml",
      `<loc>${SITE}/busca/</loc>`,
    );

    expect(await inspectSeoOutput(dist)).toEqual([
      "404.html: canonical must be absent",
      "404.html: og:url must be absent",
      `sitemap-0.xml: contains API URL ${SITE}/api/contact/?source=sitemap`,
      `sitemap-0.xml: contains noindex URL ${SITE}/404/`,
      `sitemap-0.xml: contains noindex URL ${SITE}/future-utility/`,
      `sitemap-0.xml: contains noindex URL ${SITE}/integra-acao/webinar/`,
      `sitemap-1.xml: contains noindex URL ${SITE}/busca/`,
    ]);
  });

  it("enforces the rendered robots and search canonical contracts", async () => {
    const dist = await mkdtemp(join(tmpdir(), "seo-policy-contract-"));
    await writeOutput(
      dist,
      "404.html",
      '<meta name="robots" content="noindex,nofollow">',
    );
    await writeOutput(
      dist,
      "busca/index.html",
      '<meta name="robots" content="noindex,nofollow"><link rel="canonical" href="https://integrautomacao.com.br/empresa/">',
    );
    await writeOutput(
      dist,
      "integra-acao/webinar/index.html",
      '<meta name="robots" content="noindex,follow">',
    );
    await writeOutput(
      dist,
      "integra-acao/newsletter/confirmar/index.html",
      '<meta name="robots" content="noindex,follow">',
    );

    expect(await inspectSeoOutput(dist)).toEqual([
      "404.html: robots must be noindex,follow",
      "busca/index.html: canonical must equal https://integrautomacao.com.br/busca/",
      "busca/index.html: robots must be noindex,follow",
      "integra-acao/newsletter/confirmar/index.html: robots must be noindex,nofollow",
      "integra-acao/webinar/index.html: robots must be noindex,nofollow",
    ]);
  });

  it("rejects explicit noindex sitemap routes even without rendered HTML", async () => {
    const dist = await mkdtemp(join(tmpdir(), "seo-policy-sitemap-only-"));
    await writeOutput(
      dist,
      "sitemap-0.xml",
      [
        `<loc>${SITE}/404/</loc>`,
        `<loc>${SITE}/busca/</loc>`,
        `<loc>${SITE}/integra-acao/webinar/</loc>`,
        `<loc>${SITE}/integra-acao/newsletter/confirmar/</loc>`,
      ].join(""),
    );

    expect(await inspectSeoOutput(dist)).toEqual([
      `sitemap-0.xml: contains excluded URL ${SITE}/404/`,
      `sitemap-0.xml: contains excluded URL ${SITE}/busca/`,
      `sitemap-0.xml: contains excluded URL ${SITE}/integra-acao/newsletter/confirmar/`,
      `sitemap-0.xml: contains excluded URL ${SITE}/integra-acao/webinar/`,
    ]);
  });
});
