/**
 * Legacy redirect Worker — handles WordPress query-string URLs that
 * Cloudflare Pages `_redirects` cannot match (Pages _redirects ignores
 * query strings for source matching).
 *
 * Route: integrautomacao.com/*
 * Behavior: inspects the request URL; if it matches a known legacy
 * pattern (?p=N, ?page_id=N, ?post_type=...), returns a 301 redirect.
 * Otherwise falls through to the origin (Cloudflare Pages site).
 */

const POST_REDIRECTS: Record<string, string> = {
  "245": "/empresa",
  "577": "/blog",
  "637": "/cases/projeto-moinho",
  "699": "/",
  "700": "/",
  "701": "/",
  "911": "/uso-de-cookies",
  "956": "/",
};

function redirect(target: string, base: URL): Response {
  const url = new URL(target, base.origin);
  return Response.redirect(url.toString(), 301);
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // ?p=N — WordPress short URL for posts
    const p = url.searchParams.get("p");
    if (p && POST_REDIRECTS[p]) {
      return redirect(POST_REDIRECTS[p], url);
    }

    // ?page_id=N — WordPress page short URL (we only have one — Blog)
    if (url.searchParams.has("page_id")) {
      return redirect("/blog", url);
    }

    // ?post_type=avia_framework_post&p=N — Enfold internal layout drafts
    if (url.searchParams.has("post_type")) {
      return redirect("/", url);
    }

    // Everything else: pass through to the origin (CF Pages will serve the site)
    return fetch(request);
  },
};
