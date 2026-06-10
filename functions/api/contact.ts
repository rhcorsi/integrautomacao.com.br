/**
 * Cloudflare Pages Function — POST /api/contact
 *
 * Validates the request, verifies the Turnstile token server-side, then
 * sends the message via Resend. Site stays 100% static; only this Function
 * runs on the edge.
 *
 * Required environment variables (set in Pages → Settings → Env vars):
 *   TURNSTILE_SECRET_KEY   — secret of the Turnstile site
 *   RESEND_API_KEY         — secret of the Resend account
 *   CONTACT_EMAIL_TO       — recipient (e.g. comercial@integrautomacao.com.br)
 *   CONTACT_EMAIL_FROM     — sender (e.g. noreply@forms.integrautomacao.com.br)
 *
 * Rate limiting is enforced upstream via a Cloudflare Rate Limiting Rule
 * on the path /api/contact (3-5 req/IP per 10s on the Free plan).
 */

interface Env {
  TURNSTILE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  CONTACT_EMAIL_TO: string;
  CONTACT_EMAIL_FROM: string;
}

interface ContactPayload {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject?: string;
  message: string;
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
      message: "Endpoint disponível apenas via POST do formulário de contato.",
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
      {
        method: "POST",
        body,
      },
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch {
    return false;
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.TURNSTILE_SECRET_KEY) {
    return json(
      { ok: false, message: "Configuração de segurança indisponível." },
      503,
    );
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_EMAIL_TO || !env.CONTACT_EMAIL_FROM) {
    return json(
      { ok: false, message: "Configuração de envio indisponível." },
      503,
    );
  }

  // Reject non-JSON content types early
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return json({ ok: false, message: "Tipo de conteúdo inválido." }, 415);
  }

  let payload: ContactPayload;
  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return json({ ok: false, message: "Payload inválido." }, 400);
  }

  // Honeypot — silent success to avoid telling bots
  if (payload.website && payload.website.length > 0) {
    return json({ ok: true });
  }

  // LGPD consent
  if (!payload.lgpd) {
    return json(
      { ok: false, message: "É necessário concordar com a Política de Privacidade." },
      400,
    );
  }

  // Field validation
  const name = (payload.name ?? "").trim();
  const email = (payload.email ?? "").trim();
  const message = (payload.message ?? "").trim();
  const phone = (payload.phone ?? "").trim().slice(0, 40);
  const company = (payload.company ?? "").trim().slice(0, 120);
  const subject = (payload.subject ?? "geral").trim().slice(0, 50);

  if (name.length < 2 || name.length > 120) {
    return json({ ok: false, message: "Nome inválido." }, 400);
  }
  if (!isEmail(email)) {
    return json({ ok: false, message: "E-mail inválido." }, 400);
  }
  if (message.length < 20 || message.length > 4000) {
    return json({ ok: false, message: "Mensagem precisa ter entre 20 e 4000 caracteres." }, 400);
  }

  // Turnstile server-side verification
  const turnstileToken = payload["cf-turnstile-response"];
  if (!turnstileToken) {
    return json({ ok: false, message: "Verificação de segurança ausente." }, 403);
  }

  const ip = request.headers.get("CF-Connecting-IP") ?? undefined;
  const turnstileOk = await verifyTurnstile(
    turnstileToken,
    env.TURNSTILE_SECRET_KEY,
    ip,
  );
  if (!turnstileOk) {
    return json({ ok: false, message: "Verificação de segurança falhou." }, 403);
  }

  // Build email
  const subjectLabel = `[Site] Novo contato — ${subject}`;
  const html = `
    <h2 style="margin:0 0 12px;font-family:sans-serif;color:#1a1a1a">Novo contato pelo site</h2>
    <table style="font-family:sans-serif;color:#2c2c2c;font-size:14px;line-height:1.6">
      <tr><td><strong>Nome:</strong></td><td>${escapeHtml(name)}</td></tr>
      <tr><td><strong>E-mail:</strong></td><td>${escapeHtml(email)}</td></tr>
      ${phone ? `<tr><td><strong>Telefone:</strong></td><td>${escapeHtml(phone)}</td></tr>` : ""}
      ${company ? `<tr><td><strong>Empresa:</strong></td><td>${escapeHtml(company)}</td></tr>` : ""}
      <tr><td><strong>Assunto:</strong></td><td>${escapeHtml(subject)}</td></tr>
      <tr><td valign="top"><strong>Mensagem:</strong></td><td>${escapeHtml(message).replace(/\n/g, "<br>")}</td></tr>
    </table>
    <hr style="border:0;border-top:1px solid #e4e4e4;margin:24px 0">
    <p style="font-family:monospace;font-size:11px;color:#7a7a7a">
      IP: ${escapeHtml(ip ?? "n/d")} · UA: ${escapeHtml(request.headers.get("user-agent") ?? "n/d")}
    </p>
  `;

  const text = [
    `Nome: ${name}`,
    `E-mail: ${email}`,
    phone && `Telefone: ${phone}`,
    company && `Empresa: ${company}`,
    `Assunto: ${subject}`,
    "",
    "Mensagem:",
    message,
  ]
    .filter(Boolean)
    .join("\n");

  // Send via Resend
  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.CONTACT_EMAIL_FROM,
        to: [env.CONTACT_EMAIL_TO],
        reply_to: email,
        subject: subjectLabel,
        html,
        text,
      }),
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text().catch(() => "");
      console.error("Resend failed", resendRes.status, detail);
      return json(
        { ok: false, message: "Não foi possível enviar agora. Tente novamente em instantes." },
        502,
      );
    }
  } catch (err) {
    console.error("Resend exception", err);
    return json(
      { ok: false, message: "Erro de rede. Tente novamente em instantes." },
      502,
    );
  }

  return json({ ok: true });
};

// Reject other methods explicitly with a clear JSON response.
export const onRequestGet: PagesFunction = async () => methodNotAllowed();
export const onRequestPut: PagesFunction = async () => methodNotAllowed();
export const onRequestPatch: PagesFunction = async () => methodNotAllowed();
export const onRequestDelete: PagesFunction = async () => methodNotAllowed();
