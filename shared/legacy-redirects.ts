/**
 * Regras compartilhadas pelo middleware para redirects de query string e
 * paths legados. O arquivo public/_redirects mantém o fallback path-based do
 * Pages; alterações de alias devem ser refletidas nos dois lugares.
 *
 * Critérios conservadores:
 * - `?p=N` redireciona somente IDs conhecidos;
 * - `?page_id=640` é a antiga página de blog;
 * - `?post_type=avia_framework_post` cobre rascunhos internos do tema Enfold.
 */

export const LEGACY_POST_REDIRECTS: Record<string, string> = {
  "245": "/empresa/",
  "577": "/blog/",
  "637": "/cases/projeto-moinho/",
  "699": "/",
  "700": "/",
  "701": "/",
  "911": "/uso-de-cookies/",
  "956": "/",
};

export const LEGACY_PATH_REDIRECTS: Record<string, string> = {
  "/tecnologias/pid-intertravamentos-sequenciamento": "/tecnologias/intertravamentos-sequencias/",
  "/integra-acao/eventos": "/eventos/",
  "/home-2": "/",
  "/sitemap.xml": "/sitemap-index.xml",
  "/wp-sitemap.xml": "/sitemap-index.xml",
  "/feed": "/rss.xml",
  "/comments/feed": "/rss.xml",
  "/company": "/empresa/",
  "/about": "/empresa/",
  "/about-us": "/empresa/",
  "/aboutus": "/empresa/",
  "/team": "/equipe/",
  "/services": "/servicos/",
  "/solutions": "/solucoes/",
  "/products": "/tecnologias/",
  "/technologies": "/tecnologias/",
  "/case-studies": "/cases/",
  "/news": "/blog/",
  "/security.txt": "/.well-known/security.txt",
  "/sobre": "/empresa/",
  "/sobre-nos": "/empresa/",
  "/quem-somos": "/empresa/",
  "/contact": "/contato/",
  "/contacto": "/contato/",
  "/clientes": "/cases/",
  "/projetos": "/cases/",
  "/portfolio": "/cases/",
  // Páginas "tela-N" do tema antigo (Enfold): sem equivalente semântico,
  // aparecem no Search Console com impressões e zero cliques — mandam para a home.
  "/tela-2": "/",
  "/tela-3": "/",
  "/tela-7": "/",
  // Página de downloads do site antigo (GSC: 404 rastreado em ago/2026):
  // o equivalente atual é a página de certificações, que oferece o
  // certificado Silver SI em PDF para download.
  "/download": "/certificacoes/",
};

const LEGACY_CONTROL_PARAMS = new Set(["p", "page_id", "post_type"]);

function withPreservedQuery(url: URL, destination: string): string {
  const target = new URL(destination, url.origin);
  for (const [name, value] of url.searchParams) {
    if (!LEGACY_CONTROL_PARAMS.has(name)) {
      target.searchParams.append(name, value);
    }
  }
  return `${target.pathname}${target.search}`;
}

function withAllQuery(url: URL, destination: string): string {
  const target = new URL(destination, url.origin);
  target.search = url.search;
  return `${target.pathname}${target.search}`;
}

function resolvePathRedirect(url: URL): string | null {
  const normalizedPath =
    url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "");
  const exact = LEGACY_PATH_REDIRECTS[normalizedPath];
  if (exact) return withAllQuery(url, exact);

  if (normalizedPath.startsWith("/integra-acao/eventos/")) {
    const suffix = normalizedPath.slice("/integra-acao/eventos/".length);
    return withAllQuery(url, `/eventos/${suffix}/`);
  }
  if (
    normalizedPath.startsWith("/category/") ||
    normalizedPath.startsWith("/tag/") ||
    normalizedPath.startsWith("/author/")
  ) {
    return withAllQuery(url, "/blog/");
  }
  if (/^\/20[^/]*\//.test(normalizedPath)) {
    // Posts datados do WordPress com equivalente semântico real vão para a
    // página certa em vez do índice do blog (vistos com impressões no GSC).
    if (normalizedPath.includes("projeto-moinho")) {
      return withAllQuery(url, "/cases/projeto-moinho/");
    }
    if (normalizedPath.includes("uso-de-cookie")) {
      return withAllQuery(url, "/uso-de-cookies/");
    }
    return withAllQuery(url, "/blog/");
  }
  if (
    normalizedPath.startsWith("/portfolio-item/") ||
    normalizedPath.startsWith("/portfolio/")
  ) {
    return withAllQuery(url, "/cases/");
  }
  if (normalizedPath.startsWith("/sobre/")) {
    return withAllQuery(url, "/empresa/");
  }
  if (normalizedPath.startsWith("/wp-sitemap-")) {
    return withAllQuery(url, "/sitemap-index.xml");
  }
  return null;
}

/**
 * Resolve a URL legada removendo apenas parâmetros de controle do WordPress.
 * Parâmetros independentes (UTM, gclid etc.) sobrevivem ao redirect.
 */
export function resolveLegacyRedirect(url: URL): string | null {
  const p = url.searchParams.get("p");
  if (p && LEGACY_POST_REDIRECTS[p]) {
    return withPreservedQuery(url, LEGACY_POST_REDIRECTS[p]);
  }

  if (url.searchParams.get("page_id") === "640") {
    return withPreservedQuery(url, "/blog/");
  }

  if (url.searchParams.get("post_type") === "avia_framework_post") {
    return withPreservedQuery(url, "/");
  }

  return resolvePathRedirect(url);
}
