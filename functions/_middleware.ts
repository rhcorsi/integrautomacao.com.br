import { resolveLegacyRedirect } from "../shared/legacy-redirects";

const redirectTo = (requestUrl: string, targetPath: string): Response => {
  const targetUrl = new URL(targetPath, requestUrl);
  return Response.redirect(targetUrl.toString(), 301);
};

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);

  const target = resolveLegacyRedirect(url);
  if (target) {
    return redirectTo(context.request.url, target);
  }

  return context.next();
};
