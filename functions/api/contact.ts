/**
 * Cloudflare Pages Function — POST /api/contact
 *
 * Limits and decodes JSON incrementally, validates Turnstile server-side and
 * sends the message through Resend. Edge rate limiting remains a dashboard
 * control and is documented in README.md.
 */

import type { ContactEnv } from "../_shared/env";
import {
  drainResponseLimited,
  fetchWithTimeout,
  isJsonContentType,
  isRecord,
  jsonResponse,
  logWorkerEvent,
  methodNotAllowed,
  readRequestJsonLimited,
} from "../_shared/http";
import { verifyTurnstile } from "../_shared/turnstile";

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

const MAX_BODY_BYTES = 16_000;
const RESEND_TIMEOUT_MS = 10_000;

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

function parsePayload(value: unknown): ContactPayload | null {
  if (!isRecord(value)) return null;

  const name = value.name;
  const email = value.email;
  const message = value.message;
  const lgpd = value.lgpd;
  const token = value["cf-turnstile-response"];
  const phone = value.phone;
  const company = value.company;
  const subject = value.subject;
  const sourcePage = value.sourcePage;
  const sourceLabel = value.sourceLabel;
  const cta = value.cta;
  const website = value.website;

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof message !== "string" ||
    typeof lgpd !== "string" ||
    typeof token !== "string" ||
    (phone !== undefined && typeof phone !== "string") ||
    (company !== undefined && typeof company !== "string") ||
    (subject !== undefined && typeof subject !== "string") ||
    (sourcePage !== undefined && typeof sourcePage !== "string") ||
    (sourceLabel !== undefined && typeof sourceLabel !== "string") ||
    (cta !== undefined && typeof cta !== "string") ||
    (website !== undefined && typeof website !== "string")
  ) {
    return null;
  }

  return {
    name,
    email,
    message,
    lgpd,
    "cf-turnstile-response": token,
    phone,
    company,
    subject,
    sourcePage,
    sourceLabel,
    cta,
    website,
  };
}

async function sendContactEmail(
  init: RequestInit,
  requestId: string,
): Promise<boolean> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        "https://api.resend.com/emails",
        init,
        RESEND_TIMEOUT_MS,
      );
      await drainResponseLimited(response);
      if (response.ok) return true;

      const retryable =
        response.status === 409 || response.status === 429 || response.status >= 500;
      if (!retryable || attempt === maxAttempts) {
        logWorkerEvent("error", "contact_resend_failed", {
          requestId,
          providerStatus: response.status,
          attempt,
        });
        return false;
      }
      logWorkerEvent("warn", "contact_resend_retry", {
        requestId,
        providerStatus: response.status,
        attempt,
      });
      const retryAfter = Number(response.headers.get("retry-after") ?? "0");
      const waitMs = response.status === 429 && Number.isFinite(retryAfter)
        ? Math.min(Math.max(retryAfter * 1_000, 250), 1_000)
        : Math.min(attempt * 250, 750);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      logWorkerEvent("warn", "contact_resend_retry", {
        requestId,
        errorType: error instanceof Error ? error.name : "UnknownError",
        attempt,
      });
      await new Promise((resolve) => setTimeout(resolve, Math.min(attempt * 250, 750)));
    }
  }
  return false;
}

export const onRequestPost: PagesFunction<ContactEnv> = async ({
  request,
  env,
}) => {
  const requestId = crypto.randomUUID();
  const respond = (data: unknown, status = 200) =>
    jsonResponse(data, status, requestId);

  if (!env.TURNSTILE_SECRET_KEY) {
    logWorkerEvent("error", "contact_configuration_missing", {
      requestId,
      binding: "TURNSTILE_SECRET_KEY",
    });
    return respond(
      { ok: false, message: "Configuração de segurança indisponível." },
      503,
    );
  }
  if (!env.RESEND_SEND_API_KEY || !env.CONTACT_EMAIL_TO || !env.CONTACT_EMAIL_FROM) {
    logWorkerEvent("error", "contact_configuration_missing", {
      requestId,
      binding: "RESEND_OR_EMAIL_BINDING",
    });
    return respond(
      { ok: false, message: "Configuração de envio indisponível." },
      503,
    );
  }

  if (!isJsonContentType(request.headers.get("content-type"))) {
    return respond({ ok: false, message: "Tipo de conteúdo inválido." }, 415);
  }

  const decoded = await readRequestJsonLimited(request, MAX_BODY_BYTES);
  if (!decoded.ok) {
    return decoded.reason === "too-large"
      ? respond({ ok: false, message: "Payload muito grande." }, 413)
      : respond({ ok: false, message: "Payload inválido." }, 400);
  }

  const payload = parsePayload(decoded.value);
  if (!payload) {
    return respond({ ok: false, message: "Campos inválidos." }, 400);
  }

  // Honeypot: resposta silenciosa para não orientar robôs.
  if (payload.website) return respond({ ok: true });
  if (payload.lgpd !== "1") {
    return respond(
      {
        ok: false,
        message: "É necessário confirmar a leitura da Política de Privacidade.",
      },
      400,
    );
  }

  // Leia um caractere além do limite para rejeitar excesso em vez de alterar
  // silenciosamente dados primários enviados pelo titular.
  const name = singleLine(payload.name, 121);
  const email = singleLine(payload.email, 181).toLowerCase();
  const message = multiline(payload.message, 4_001);
  const phone = singleLine(payload.phone ?? "", 41);
  const company = singleLine(payload.company ?? "", 121);
  const subject =
    singleLine(payload.subject ?? "geral", 50)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "") || "geral";
  const sourcePage = singleLine(payload.sourcePage ?? "", 300);
  const sourceLabel = singleLine(payload.sourceLabel ?? "", 160);
  const cta = singleLine(payload.cta ?? "", 160);
  const token = payload["cf-turnstile-response"].trim();

  if (name.length < 2 || name.length > 120) {
    return respond({ ok: false, message: "Nome inválido." }, 400);
  }
  if (!isEmail(email)) {
    return respond({ ok: false, message: "E-mail inválido." }, 400);
  }
  if (message.length < 20 || message.length > 4_000) {
    return respond(
      { ok: false, message: "Mensagem precisa ter entre 20 e 4000 caracteres." },
      400,
    );
  }
  if (phone.length > 40 || company.length > 120) {
    return respond({ ok: false, message: "Campos inválidos." }, 400);
  }
  if (!token || token.length > 2_048) {
    return respond(
      { ok: false, message: "Verificação de segurança ausente." },
      403,
    );
  }

  const requestHostname = new URL(request.url).hostname;
  const turnstile = await verifyTurnstile({
    action: "contact-form",
    expectedHostname: requestHostname,
    ip: request.headers.get("CF-Connecting-IP") ?? undefined,
    secret: env.TURNSTILE_SECRET_KEY,
    token,
  });
  if (turnstile === "unavailable") {
    logWorkerEvent("warn", "contact_turnstile_unavailable", { requestId });
    return respond(
      {
        ok: false,
        message: "Verificação de segurança indisponível. Tente novamente.",
      },
      503,
    );
  }
  if (turnstile === "invalid") {
    return respond(
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

  const resendInit: RequestInit = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_SEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `contact-${requestId}`,
      "User-Agent": "integrautomacao-contact/2.0",
    },
    body: JSON.stringify({
      from: env.CONTACT_EMAIL_FROM,
      to: [env.CONTACT_EMAIL_TO],
      reply_to: email,
      subject: subjectLabel,
      html,
      text,
    }),
  };

  try {
    if (!(await sendContactEmail(resendInit, requestId))) {
      return respond(
        {
          ok: false,
          message: "Não foi possível enviar agora. Tente novamente em instantes.",
        },
        502,
      );
    }
  } catch (error) {
    logWorkerEvent("error", "contact_resend_exception", {
      requestId,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return respond(
      { ok: false, message: "Erro de rede. Tente novamente em instantes." },
      502,
    );
  }

  logWorkerEvent("info", "contact_message_accepted", { requestId });
  return respond({ ok: true });
};

const onlyPost = () =>
  methodNotAllowed(
    "Endpoint disponível apenas via POST do formulário de contato.",
  );

export const onRequestGet: PagesFunction = onlyPost;
export const onRequestPut: PagesFunction = onlyPost;
export const onRequestPatch: PagesFunction = onlyPost;
export const onRequestDelete: PagesFunction = onlyPost;
