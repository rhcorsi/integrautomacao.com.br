const legacyPostRedirects: Record<string, string> = {
  "245": "/empresa",
  "577": "/blog",
  "637": "/cases/projeto-moinho",
  "699": "/",
  "700": "/",
  "701": "/",
  "911": "/uso-de-cookies",
  "956": "/",
};

const redirectTo = (requestUrl: string, targetPath: string): Response => {
  const targetUrl = new URL(targetPath, requestUrl);
  return Response.redirect(targetUrl.toString(), 301);
};

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);

  const legacyPostId = url.searchParams.get("p");
  if (legacyPostId && legacyPostRedirects[legacyPostId]) {
    return redirectTo(context.request.url, legacyPostRedirects[legacyPostId]);
  }

  if (url.searchParams.get("page_id") === "640") {
    return redirectTo(context.request.url, "/blog");
  }

  if (url.searchParams.get("post_type") === "avia_framework_post") {
    return redirectTo(context.request.url, "/");
  }

  return context.next();
};
