export const NOINDEX_PATHS: ReadonlySet<string> = new Set([
  "/404",
  "/404/",
  "/busca",
  "/busca/",
  "/integra-acao/webinar",
  "/integra-acao/webinar/",
  "/integra-acao/newsletter/confirmar",
  "/integra-acao/newsletter/confirmar/",
]);

function asUrl(input: string | URL): URL {
  return input instanceof URL
    ? input
    : new URL(input, "https://integrautomacao.com.br");
}

export function normalizeSeoPath(input: string | URL): string {
  return asUrl(input).pathname.replace(/\/{2,}$/u, "/");
}

export function shouldIncludeInSitemap(page: string): boolean {
  const pathname = normalizeSeoPath(page);
  return !pathname.startsWith("/api/") && !NOINDEX_PATHS.has(pathname);
}

export function resolveCanonicalUrl(
  canonical: string | URL | false | undefined,
  pathname: string,
  site: string,
): URL | null {
  if (canonical === false) return null;
  return new URL(canonical ?? pathname, site);
}
