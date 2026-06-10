/**
 * Cloudflare Pages Function - POST /api/newsletter
 *
 * Validates the request, verifies the Turnstile token server-side, then adds
 * the contact to a Resend Audience for the Integra Acao newsletter.
 * If the Audience is not configured yet, falls back to an internal email
 * notification so the subscription is not lost.
 *
 * Required environment variables (set in Pages -> Settings -> Env vars):
 *   TURNSTILE_SECRET_KEY - secret of the Turnstile site
 *   RESEND_API_KEY       - secret of the Resend account
 *
 * Preferred:
 *   RESEND_AUDIENCE_ID   - id of the Resend Audience for Integra Acao
 *
 * Fallback when RESEND_AUDIENCE_ID is not configured:
 *   CONTACT_EMAIL_TO     - internal recipient
 *   CONTACT_EMAIL_FROM   - verified Resend sender
 *
 * Rate limiting is enforced upstream via a Cloudflare Rate Limiting Rule
 * on /api/newsletter (3-5 req/IP per 10s on the Free plan).
 */

interface Env {
  TURNSTILE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  RESEND_AUDIENCE_ID?: string;
  CONTACT_EMAIL_TO?: string;
  CONTACT_EMAIL_FROM?: string;
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

interface ResendCreateContactResponse {
  id?: string;
  object?: string;
  message?: string;
}

interface NewsletterLead {
  name: string;
  email: string;
  company: string;
  role: string;
  ip?: string;
  userAgent?: string;
}

type Result =
  | { ok: true; alreadyExists?: boolean; mode?: "audience" | "email-fallback" }
  | { ok: false; status: number; message: string };

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

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

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

async function addToAudience(
  audienceId: string,
  apiKey: string,
  payload: {
    email: string;
    first_name?: string;
    last_name?: string;
    unsubscribed?: boolean;
  },
): Promise<Result> {
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
    if (res.ok) return { ok: true, mode: "audience" };

    const errBody = (await res.json().catch(() => ({}))) as ResendCreateContactResponse;
    // Resend returns 422 if email is already in the audience.
    if (res.status === 422) {
      return { ok: true, alreadyExists: true, mode: "audience" };
    }

    return {
      ok: false,
      status: res.status,
      message: errBody.message ?? "Falha ao registrar inscrição.",
    };
  } catch {
    return {
      ok: false,
      status: 502,
      message: "Não foi possível alcançar o serviço de e-mail no momento.",
    };
  }
}

async function sendSubscriptionEmail(
  apiKey: string,
  from: string | undefined,
  to: string | undefined,
  lead: NewsletterLead,
): Promise<Result> {
  if (!from || !to) {
    return {
      ok: false,
      status: 503,
      message: "Configuração de inscrição indisponível.",
    };
  }

  const subject = `[Newsletter] Nova inscrição Integra Ação - ${lead.name}`;
  const html = `
    <h2 style="margin:0 0 12px;font-family:sans-serif;color:#1a1a1a">Nova inscrição na newsletter Integra Ação</h2>
    <table style="font-family:sans-serif;color:#2c2c2c;font-size:14px;line-height:1.6">
      <tr><td><strong>Nome:</strong></td><td>${escapeHtml(lead.name)}</td></tr>
      <tr><td><strong>E-mail:</strong></td><td>${escapeHtml(lead.email)}</td></tr>
      ${lead.company ? `<tr><td><strong>Empresa:</strong></td><td>${escapeHtml(lead.company)}</td></tr>` : ""}
      ${lead.role ? `<tr><td><strong>Atuação:</strong></td><td>${escapeHtml(lead.role)}</td></tr>` : ""}
    </table>
    <hr style="border:0;border-top:1px solid #e4e4e4;margin:24px 0">
    <p style="font-family:monospace;font-size:11px;color:#7a7a7a">
      Fallback usado porque RESEND_AUDIENCE_ID não está configurado no Cloudflare Pages.
      IP: ${escapeHtml(lead.ip ?? "n/d")} · UA: ${escapeHtml(lead.userAgent ?? "n/d")}
    </p>
  `;
  const text = [
    "Nova inscrição na newsletter Integra Ação",
    "",
    `Nome: ${lead.name}`,
    `E-mail: ${lead.email}`,
    lead.company && `Empresa: ${lead.company}`,
    lead.role && `Atuação: ${lead.role}`,
    "",
    "Fallback usado porque RESEND_AUDIENCE_ID não está configurado no Cloudflare Pages.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: lead.email,
        subject,
        html,
        text,
      }),
    });

    if (res.ok) return { ok: true, mode: "email-fallback" };

    const detail = await res.text().catch(() => "");
    console.error("Newsletter fallback email failed", res.status, detail);
    return {
      ok: false,
      status: res.status,
      message: "Não foi possível registrar a inscrição no momento.",
    };
  } catch (error) {
    console.error("Newsletter fallback email exception", error);
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

  // Honeypot - silent success.
  if (payload.website && payload.website.length > 0) {
    return json({ ok: true });
  }

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
  const company = (payload.company ?? "").trim().slice(0, 120);
  const role = (payload.role ?? "").trim().slice(0, 80);

  if (name.length < 2 || name.length > 120) {
    return json({ ok: false, message: "Nome inválido." }, 400);
  }
  if (!isEmail(email)) {
    return json({ ok: false, message: "E-mail inválido." }, 400);
  }

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

  if (!env.RESEND_API_KEY) {
    return json(
      { ok: false, message: "Configuração de inscrição indisponível." },
      503,
    );
  }

  const parts = name.split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ").slice(0, 80);

  const result = env.RESEND_AUDIENCE_ID
    ? await addToAudience(env.RESEND_AUDIENCE_ID, env.RESEND_API_KEY, {
        email,
        first_name: firstName.slice(0, 80),
        last_name: lastName,
        unsubscribed: false,
      })
    : await sendSubscriptionEmail(
        env.RESEND_API_KEY,
        env.CONTACT_EMAIL_FROM,
        env.CONTACT_EMAIL_TO,
        {
          name,
          email,
          company,
          role,
          ip,
          userAgent: request.headers.get("user-agent") ?? undefined,
        },
      );

  if (!result.ok) {
    return json(
      { ok: false, message: result.message ?? "Erro ao registrar inscrição." },
      result.status >= 500 ? 502 : 400,
    );
  }

  return json({
    ok: true,
    alreadyExists: result.alreadyExists ?? false,
    mode: result.mode,
  });
};

// Métodos não suportados respondem 405 explicitamente (mesmo padrão do
// contact.ts). POST é tratado exclusivamente por onRequestPost acima.
export const onRequestGet: PagesFunction = async () => methodNotAllowed();
export const onRequestPut: PagesFunction = async () => methodNotAllowed();
export const onRequestPatch: PagesFunction = async () => methodNotAllowed();
export const onRequestDelete: PagesFunction = async () => methodNotAllowed();
