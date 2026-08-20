import { resolveLegacyRedirect } from "../shared/legacy-redirects";

const CANONICAL_ORIGIN = "https://integrautomacao.com.br";
const ALTERNATE_PRODUCTION_HOSTS = new Set([
  "www.integrautomacao.com.br",
  "integrautomacao-com-br.pages.dev",
]);
const PRODUCTION_HOSTNAMES = new Set([
  "integrautomacao.com.br",
  ...ALTERNATE_PRODUCTION_HOSTS,
]);

const API_SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Cache-Control": "no-store",
};

const isNavigationMethod = (method: string): boolean =>
  method === "GET" || method === "HEAD";

function resolvePublicRedirect(request: Request, url: URL): URL | null {
  if (!isNavigationMethod(request.method)) return null;

  const alternateHost = ALTERNATE_PRODUCTION_HOSTS.has(url.hostname);
  const insecureCanonical =
    url.hostname === "integrautomacao.com.br" && url.protocol !== "https:";
  // A Cloudflare faz proxy de portas alternativas (2082…2096): sem este
  // redirect, o site inteiro responde duplicado em :2096 (herança do cPanel)
  // e o Google indexa a mesma página em duas "origens".
  const nonDefaultPort =
    PRODUCTION_HOSTNAMES.has(url.hostname) && url.port !== "";
  const legacyTarget = resolveLegacyRedirect(url);
  if (!alternateHost && !insecureCanonical && !nonDefaultPort && !legacyTarget)
    return null;

  if (legacyTarget) return new URL(legacyTarget, CANONICAL_ORIGIN);

  // Nunca passe um pathname controlado pelo request como URL relativa:
  // `//host` seria interpretado como origem protocol-relative (open redirect).
  const canonical = new URL(CANONICAL_ORIGIN);
  canonical.pathname = url.pathname;
  canonical.search = url.search;
  return canonical;
}

function permanentRedirect(target: URL): Response {
  return new Response(null, {
    status: 301,
    headers: {
      "Cache-Control": "public, max-age=3600",
      Location: target.toString(),
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Strict-Transport-Security": "max-age=31536000",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const target = resolvePublicRedirect(context.request, url);
  if (target) return permanentRedirect(target);

  const response = await context.next();

  // `_headers` applies only to static asset responses. Pages Functions need
  // the equivalent API baseline here, including handler-generated errors.
  if (url.pathname.startsWith("/api/")) {
    const hardened = new Response(response.body, response);
    for (const [name, value] of Object.entries(API_SECURITY_HEADERS)) {
      hardened.headers.set(name, value);
    }
    return hardened;
  }

  return response;
};
