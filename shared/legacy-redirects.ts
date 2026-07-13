/**
 * Fonte única de verdade para os redirects de query-string do WordPress
 * legado (?p=, ?page_id=, ?post_type=). Consumida por:
 *   - functions/_middleware.ts (Cloudflare Pages middleware, deploy automático)
 *   - workers/legacy-redirects.ts (Worker opcional de rota, deploy via wrangler)
 *
 * Critérios (deliberadamente conservadores):
 *   - ?p=N redireciona apenas IDs conhecidos do site antigo;
 *   - ?page_id apenas o valor 640 (única página real, o Blog);
 *   - ?post_type apenas avia_framework_post (drafts internos do tema Enfold).
 * Qualquer outra query passa adiante e recebe a página normal.
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

/** Resolve o destino de redirect para uma URL legada, ou null se não houver. */
export function resolveLegacyRedirect(url: URL): string | null {
  const p = url.searchParams.get("p");
  if (p && LEGACY_POST_REDIRECTS[p]) return LEGACY_POST_REDIRECTS[p];

  if (url.searchParams.get("page_id") === "640") return "/blog/";

  if (url.searchParams.get("post_type") === "avia_framework_post") return "/";

  return null;
}
