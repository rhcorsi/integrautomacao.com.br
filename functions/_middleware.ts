import { resolveLegacyRedirect } from "../shared/legacy-redirects";

const redirectTo = (requestUrl: string, targetPath: string): Response => {
  const targetUrl = new URL(targetPath, requestUrl);
  return Response.redirect(targetUrl.toString(), 301);
};

// O _headers do Pages NÃO se aplica a respostas geradas por Functions, então
// o middleware é o único ponto onde dá para anexar headers de segurança às
// rotas /api/*. CSP/COOP/CORP são irrelevantes para JSON — só o essencial.
const API_SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "no-store",
};

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);

  // Consolidate every public production hostname on the canonical apex.
  // Keep path and query intact so backlinks and campaign parameters survive.
  if (
    url.hostname === "www.integrautomacao.com.br" ||
    url.hostname === "integrautomacao-com-br.pages.dev"
  ) {
    const canonicalUrl = new URL(`${url.pathname}${url.search}`, "https://integrautomacao.com.br");
    return Response.redirect(canonicalUrl.toString(), 301);
  }

  const target = resolveLegacyRedirect(url);
  if (target) {
    return redirectTo(context.request.url, target);
  }

  const response = await context.next();

  if (url.pathname.startsWith("/api/")) {
    const hardened = new Response(response.body, response);
    for (const [name, value] of Object.entries(API_SECURITY_HEADERS)) {
      hardened.headers.set(name, value);
    }
    return hardened;
  }

  return response;
};
