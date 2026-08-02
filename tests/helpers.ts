import type { ContactEnv, NewsletterEnv } from "../functions/_shared/env";

export const contactEnv: ContactEnv = {
  NODE_VERSION: "22.12.0",
  CONTACT_EMAIL_FROM: "noreply@forms.integrautomacao.com.br",
  CONTACT_EMAIL_TO: "comercial@integrautomacao.com.br",
  PUBLIC_TURNSTILE_SITE_KEY: "0x4AAAAAADKRCm67kAoc7SHU",
  RESEND_SEND_API_KEY: "resend-send-key",
  TURNSTILE_SECRET_KEY: "turnstile-secret",
};

export const newsletterEnv: NewsletterEnv = {
  NODE_VERSION: "22.12.0",
  PUBLIC_TURNSTILE_SITE_KEY: "0x4AAAAAADKRCm67kAoc7SHU",
  RESEND_CONTACTS_API_KEY: "resend-contacts-key",
  RESEND_SEGMENT_ID: "segment-newsletter",
  RESEND_TOPIC_ID: "topic-newsletter",
  TURNSTILE_SECRET_KEY: "turnstile-secret",
};

export const validContactPayload = {
  name: "Pessoa Teste",
  email: "pessoa@example.com",
  message: "Esta é uma mensagem suficientemente longa para o teste.",
  lgpd: "1",
  website: "",
  "cf-turnstile-response": "valid-token",
};

export const validNewsletterPayload = {
  name: "Pessoa Teste",
  email: "pessoa@example.com",
  lgpd: "1",
  website: "",
  "cf-turnstile-response": "valid-token",
};

export function jsonRequest(
  path: string,
  body: unknown,
  method = "POST",
): Request {
  return new Request(`https://integrautomacao.com.br${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: method === "GET" || method === "HEAD" ? undefined : JSON.stringify(body),
  });
}

export function pagesContext<Env>(
  request: Request,
  env: Env,
  next: () => Promise<Response> = async () => new Response("next"),
): EventContext<Env, string, Record<string, unknown>> {
  return {
    request,
    functionPath: new URL(request.url).pathname,
    waitUntil: () => undefined,
    passThroughOnException: () => undefined,
    next,
    env: {
      ...env,
      ASSETS: { fetch },
    },
    params: {},
    data: {},
  } as unknown as EventContext<Env, string, Record<string, unknown>>;
}

export function turnstileResponse(
  action: "contact-form" | "newsletter-form",
  overrides: Record<string, unknown> = {},
): Response {
  return Response.json({
    success: true,
    action,
    hostname: "integrautomacao.com.br",
    ...overrides,
  });
}

export async function requestDetails(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{ body: string; headers: Headers; method: string; url: URL }> {
  const request = new Request(input, init);
  return {
    body: await request.text(),
    headers: request.headers,
    method: request.method,
    url: new URL(request.url),
  };
}
