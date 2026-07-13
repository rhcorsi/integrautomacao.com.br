/**
 * Cloudflare Pages Function — POST /api/contact
 *
 * Valida o corpo, confirma o Turnstile no servidor e envia a mensagem pelo
 * Resend. O limite de requisições deve ser aplicado também no painel da
 * Cloudflare para /api/contact.
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
  message: string;
  lgpd: string;
  phone?: string;
  company?: string;
  subject?: string;
  sourcePage?: string;
  sourceLabel?: string;
  cta?: string;
  website?: string;
  "cf-turnstile-response": string;
}

const MAX_BODY_LENGTH = 16_000;
const FETCH_TIMEOUT_MS = 10_000;

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
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
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
      },
    },
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const singleLine = (value: string, max: number) =>
  value
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const multiline = (value: string, max: number) =>
  value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);

const isEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 180;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function verifyTurnstile(
  token: string,
  secret: string,
  ip: string | undefined,
  expectedHostname: string,
): Promise<boolean> {
  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token);
    if (ip) body.set("remoteip", ip);

    const response = await fetchWithTimeout(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body },
    );
    if (!response.ok) return false;

    const data = (await response.json()) as {
      success?: boolean;
      action?: string;
      hostname?: string;
    };
    return (
      data.success === true &&
      data.action === "contact-form" &&
      data.hostname === expectedHostname
    );
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

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return json({ ok: false, message: "Tipo de conteúdo inválido." }, 415);
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_LENGTH) {
    return json({ ok: false, message: "Payload muito grande." }, 413);
  }

  let decoded: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_LENGTH) {
      return json({ ok: false, message: "Payload muito grande." }, 413);
    }
    decoded = JSON.parse(raw);
  } catch {
    return json({ ok: false, message: "Payload inválido." }, 400);
  }
  if (!isRecord(decoded)) {
    return json({ ok: false, message: "Payload inválido." }, 400);
  }

  const required = [
    "name",
    "email",
    "message",
    "lgpd",
    "cf-turnstile-response",
  ];
  const optional = [
    "phone",
    "company",
    "subject",
    "sourcePage",
    "sourceLabel",
    "cta",
    "website",
  ];
  if (
    required.some((field) => typeof decoded[field] !== "string") ||
    optional.some(
      (field) => decoded[field] !== undefined && typeof decoded[field] !== "string",
    )
  ) {
    return json({ ok: false, message: "Campos inválidos." }, 400);
  }
  const payload = decoded as unknown as ContactPayload;

  // Honeypot: resposta silenciosa para não orientar robôs.
  if (payload.website) return json({ ok: true });
  if (payload.lgpd !== "1") {
    return json(
      {
        ok: false,
        message: "É necessário confirmar a leitura da Política de Privacidade.",
      },
      400,
    );
  }

  const name = singleLine(payload.name, 120);
  const email = singleLine(payload.email, 180).toLowerCase();
  const message = multiline(payload.message, 4_000);
  const phone = singleLine(payload.phone ?? "", 40);
  const company = singleLine(payload.company ?? "", 120);
  const subject =
    singleLine(payload.subject ?? "geral", 50)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "") || "geral";
  const sourcePage = singleLine(payload.sourcePage ?? "", 300);
  const sourceLabel = singleLine(payload.sourceLabel ?? "", 160);
  const cta = singleLine(payload.cta ?? "", 160);
  const token = singleLine(payload["cf-turnstile-response"], 2_048);

  if (name.length < 2) {
    return json({ ok: false, message: "Nome inválido." }, 400);
  }
  if (!isEmail(email)) {
    return json({ ok: false, message: "E-mail inválido." }, 400);
  }
  if (message.length < 20) {
    return json(
      { ok: false, message: "Mensagem precisa ter entre 20 e 4000 caracteres." },
      400,
    );
  }
  if (!token) {
    return json(
      { ok: false, message: "Verificação de segurança ausente." },
      403,
    );
  }

  const ip = request.headers.get("CF-Connecting-IP") ?? undefined;
  const requestHostname = new URL(request.url).hostname;
  if (
    !(await verifyTurnstile(
      token,
      env.TURNSTILE_SECRET_KEY,
      ip,
      requestHostname,
    ))
  ) {
    return json(
      { ok: false, message: "Verificação de segurança falhou." },
      403,
    );
  }

  const subjectLabel = `[Site] Novo contato — ${subject}`;
  const html = `
    <h2 style="margin:0 0 12px;font-family:sans-serif;color:#1a1a1a">Novo contato pelo site</h2>
    <table style="font-family:sans-serif;color:#2c2c2c;font-size:14px;line-height:1.6">
      <tr><td><strong>Nome:</strong></td><td>${escapeHtml(name)}</td></tr>
      <tr><td><strong>E-mail:</strong></td><td>${escapeHtml(email)}</td></tr>
      ${phone ? `<tr><td><strong>Telefone:</strong></td><td>${escapeHtml(phone)}</td></tr>` : ""}
      ${company ? `<tr><td><strong>Empresa:</strong></td><td>${escapeHtml(company)}</td></tr>` : ""}
      <tr><td><strong>Assunto:</strong></td><td>${escapeHtml(subject)}</td></tr>
      ${sourceLabel ? `<tr><td><strong>Origem:</strong></td><td>${escapeHtml(sourceLabel)}</td></tr>` : ""}
      ${sourcePage ? `<tr><td><strong>Página:</strong></td><td>${escapeHtml(sourcePage)}</td></tr>` : ""}
      ${cta ? `<tr><td><strong>CTA:</strong></td><td>${escapeHtml(cta)}</td></tr>` : ""}
      <tr><td valign="top"><strong>Mensagem:</strong></td><td>${escapeHtml(message).replace(/\n/g, "<br>")}</td></tr>
    </table>
  `;
  const text = [
    `Nome: ${name}`,
    `E-mail: ${email}`,
    phone && `Telefone: ${phone}`,
    company && `Empresa: ${company}`,
    `Assunto: ${subject}`,
    sourceLabel && `Origem: ${sourceLabel}`,
    sourcePage && `Página: ${sourcePage}`,
    cta && `CTA: ${cta}`,
    "",
    "Mensagem:",
    message,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await fetchWithTimeout("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
        "User-Agent": "integrautomacao-contact/1.0",
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
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 1_000);
      console.error("Resend failed", response.status, detail);
      return json(
        {
          ok: false,
          message: "Não foi possível enviar agora. Tente novamente em instantes.",
        },
        502,
      );
    }
  } catch (error) {
    console.error("Resend exception", error);
    return json(
      { ok: false, message: "Erro de rede. Tente novamente em instantes." },
      502,
    );
  }

  return json({ ok: true });
};

export const onRequestGet: PagesFunction = async () => methodNotAllowed();
export const onRequestPut: PagesFunction = async () => methodNotAllowed();
export const onRequestPatch: PagesFunction = async () => methodNotAllowed();
export const onRequestDelete: PagesFunction = async () => methodNotAllowed();
