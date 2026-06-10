/**
 * Legacy redirect Worker — handles WordPress query-string URLs that
 * Cloudflare Pages `_redirects` cannot match (Pages _redirects ignores
 * query strings for source matching).
 *
 * Route: integrautomacao.com.br/*
 *
 * NOTA: functions/_middleware.ts já cobre estes redirects no próprio deploy
 * do Pages. Este Worker é redundante e só precisa existir se a rota estiver
 * ativa no painel; ambos importam o mesmo mapa de shared/legacy-redirects.ts,
 * então o comportamento é idêntico onde quer que a request caia primeiro.
 */
import { resolveLegacyRedirect } from "../shared/legacy-redirects";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    const target = resolveLegacyRedirect(url);
    if (target) {
      const targetUrl = new URL(target, url.origin);
      return Response.redirect(targetUrl.toString(), 301);
    }

    // Everything else: pass through to the origin (CF Pages serves the site)
    return fetch(request);
  },
};
