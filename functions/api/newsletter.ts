/**
 * Cloudflare Pages Function — POST /api/newsletter
 *
 * Validates the request, verifies the Turnstile token server-side, then
 * adds the contact to a Resend Audience for the Integra Ação newsletter.
 *
 * Required environment variables (set in Pages → Settings → Env vars):
 *   TURNSTILE_SECRET_KEY        — secret of the Turnstile site
 *   RESEND_API_KEY              — secret of the Resend account
 *   RESEND_AUDIENCE_ID          — id of the Resend Audience for Integra Ação
 *
 * Rate limiting is enforced upstream via a Cloudflare Rate Limiting Rule
 * on /api/newsletter (3-5 req/IP per 10s on the Free plan).
 *
 * Response:
 *   200 { ok: true }                          — subscribed (or already subscribed)
 *   400 { ok: false, message: string }        — payload/validation error
 *   403 { ok: false, message: string }        — Turnstile failed
 *   405 { ok: false, message: string }        — wrong method
 *   415 { ok: false, message: string }        — wrong content-type
 *   503 { ok: false, message: string }        — config missing
 *   502 { ok: false, message: string }        — upstream Resend error
 */

interface Env {
  TURNSTILE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  RESEND_AUDIENCE_ID: string;
}

interface NewsletterPayload {
  name: string;
  email: string;
  company?: string;
  role?: string;
  lgpd?: string;
  website?: string; // honeypot
  "cf-turnstile-response"?: string;
}

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const methodNotAllowed = (): Response =>
  new Response(
    JSON.stringify({
      ok: false,
      message: "Endpoint disponível apenas via POST do formulário de inscrição.",
    }),
    {
      status: 405,
      headers: {
        allow: "POST",
        "content-type": "application/json; charset=utf-8",
      },
    },
  );

const isEmail = (s: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim()) && s.length <= 180;

async function verifyTurnstile(
  token: string,
  secret: string,
  ip?: string,
): Promise<boolean> {
  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token);
    if (ip) body.set("remoteip", ip);

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body },
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch {
    return false;
  }
}

interface ResendCreateContactResponse {
  id?: string;
  object?: string;
  message?: string;
}

async function addToAudience(
  audienceId: string,
  apiKey: string,
  payload: { email: string; first_name?: string; last_name?: string; unsubscribed?: boolean; },
): Promise<{ ok: true; alreadyExists?: boolean } | { ok: false; status: number; message: string }> {
  try {
    const url = `https://api.resend.com/audiences/${encodeURIComponent(audienceId)}/contacts`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) return { ok: true };
    const errBody = (await res.json().catch(() => ({}))) as ResendCreateContactResponse;
    // Resend returns 422 if email is already in the audience.
    if (res.status === 422) return { ok: true, alreadyExists: true };
    return {
      ok: false,
      status: res.status,
      message: errBody.message ?? "Falha ao registrar inscrição.",
    };
  } catch (e) {
    return {
      ok: false,
      status: 502,
      message: "Não foi possível alcançar o serviço de e-mail no momento.",
    };
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.TURNSTILE_SECRET_KEY) {
    return json(
      { ok: false, message: "Configuração de segurança indisponível." },
      503,
    );
  }
  if (!env.RESEND_API_KEY || !env.RESEND_AUDIENCE_ID) {
    return json(
      { ok: false, message: "Configuração de inscrição indisponível." },
      503,
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return json({ ok: false, message: "Tipo de conteúdo inválido." }, 415);
  }

  let payload: NewsletterPayload;
  try {
    payload = (await request.json()) as NewsletterPayload;
  } catch {
    return json({ ok: false, message: "Payload inválido." }, 400);
  }

  // Honeypot — silent success
  if (payload.website && payload.website.length > 0) {
    return json({ ok: true });
  }

  // LGPD consent
  if (!payload.lgpd) {
    return json(
      {
        ok: false,
        message: "É necessário concordar com a Política de Privacidade.",
      },
      400,
    );
  }

  const name = (payload.name ?? "").trim();
  const email = (payload.email ?? "").trim();
  if (name.length < 2 || name.length > 120) {
    return json({ ok: false, message: "Nome inválido." }, 400);
  }
  if (!isEmail(email)) {
    return json({ ok: false, message: "E-mail inválido." }, 400);
  }

  // Turnstile
  const turnstileToken = payload["cf-turnstile-response"];
  if (!turnstileToken) {
    return json(
      { ok: false, message: "Verificação de segurança ausente." },
      403,
    );
  }
  const ip = request.headers.get("CF-Connecting-IP") ?? undefined;
  const valid = await verifyTurnstile(
    turnstileToken,
    env.TURNSTILE_SECRET_KEY,
    ip,
  );
  if (!valid) {
    return json(
      { ok: false, message: "Verificação de segurança falhou." },
      403,
    );
  }

  // Split name into first/last for Resend
  const parts = name.split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ").slice(0, 80);

  const result = await addToAudience(
    env.RESEND_AUDIENCE_ID,
    env.RESEND_API_KEY,
    {
      email,
      first_name: firstName.slice(0, 80),
      last_name: lastName,
      unsubscribed: false,
    },
  );

  if (!result.ok) {
    return json(
      { ok: false, message: result.message ?? "Erro ao registrar inscrição." },
      result.status >= 500 ? 502 : 400,
    );
  }

  return json({ ok: true, alreadyExists: result.alreadyExists ?? false });
};

export const onRequest: PagesFunction = async ({ request }) => {
  if (request.method === "POST") {
    // Should not reach here because onRequestPost handles POST specifically,
    // but keeping for safety with explicit method routing.
    return new Response(null, { status: 200 });
  }
  return methodNotAllowed();
};
