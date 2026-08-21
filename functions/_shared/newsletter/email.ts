export interface ConfirmationEmailInput {
  apiKey: string;
  from: string;
  to: string;
  name: string;
  rawToken: string;
  tokenId: string;
  confirmationOrigin: string;
}

export type ConfirmationEmailErrorCode =
  | "configuration"
  | "timeout"
  | "network"
  | "rate_limited"
  | "provider_4xx"
  | "provider_5xx"
  | "idempotency_conflict"
  | "invalid_response";

export type ConfirmationEmailResult =
  | { ok: true; messageId: string; attempts: 1 | 2 }
  | {
      ok: false;
      errorCode: ConfirmationEmailErrorCode;
      providerStatus?: number;
      attempts: 1 | 2;
    };

const SUBJECT = "Confirme sua inscrição na newsletter Integra Ação";
const RESEND_EMAIL_URL = "https://api.resend.com/emails";
const ATTEMPT_TIMEOUT_MS = 8_000;
const RESPONSE_LIMIT_BYTES = 16_384;
const MAX_RETRY_DELAY_MS = 500;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]{2,}$/;
const CONTROL_PATTERN = /[\u0000-\u001f\u007f]/;
const PRODUCTION_HOST = "integrautomacao.com.br";
const PAGES_ROOT_HOST = "integrautomacao-com-br.pages.dev";
const PAGES_PREVIEW_SUFFIX = `.${PAGES_ROOT_HOST}`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function validMailbox(value: string, allowDisplayName: boolean): boolean {
  if (
    value.length === 0 ||
    value.length > 320 ||
    value !== value.trim() ||
    CONTROL_PATTERN.test(value)
  ) {
    return false;
  }

  if (EMAIL_PATTERN.test(value)) return true;
  if (!allowDisplayName) return false;

  const display = value.match(/^([^<>]{1,120})<([^<>]+)>$/);
  return Boolean(display && display[1]?.trim() && EMAIL_PATTERN.test(display[2]!));
}

function validConfirmationOrigin(value: string): boolean {
  let origin: URL;
  try {
    origin = new URL(value);
  } catch {
    return false;
  }

  const hostname = origin.hostname.toLowerCase();
  const allowedHostname =
    hostname === PRODUCTION_HOST ||
    (hostname !== PAGES_ROOT_HOST && hostname.endsWith(PAGES_PREVIEW_SUFFIX));

  const canonical =
    value === origin.origin || value === `${origin.origin}/`;

  return (
    canonical &&
    origin.protocol === "https:" &&
    origin.username === "" &&
    origin.password === "" &&
    origin.port === "" &&
    origin.pathname === "/" &&
    origin.search === "" &&
    origin.hash === "" &&
    allowedHostname
  );
}

function validInput(input: ConfirmationEmailInput): boolean {
  return (
    /^[^\s\u0000-\u001f\u007f]{1,512}$/.test(input.apiKey) &&
    validMailbox(input.from, true) &&
    validMailbox(input.to, false) &&
    input.name.length >= 1 &&
    input.name.length <= 120 &&
    !CONTROL_PATTERN.test(input.name) &&
    isConfirmationToken(input.rawToken) &&
    UUID_PATTERN.test(input.tokenId) &&
    validConfirmationOrigin(input.confirmationOrigin)
  );
}

function validProviderMessageId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= 128 &&
    value === value.trim() &&
    !CONTROL_PATTERN.test(value)
  );
}

function retryAfterMilliseconds(response: Response): number {
  const raw = response.headers.get("retry-after");
  if (!raw) return MAX_RETRY_DELAY_MS;

  const seconds = Number(raw);
  if (Number.isFinite(seconds)) {
    return Math.min(MAX_RETRY_DELAY_MS, Math.max(1, seconds * 1_000));
  }

  const at = Date.parse(raw);
  if (!Number.isFinite(at)) return MAX_RETRY_DELAY_MS;
  return Math.min(MAX_RETRY_DELAY_MS, Math.max(1, at - Date.now()));
}

async function boundedDelay(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function sendConfirmationEmail(
  input: ConfirmationEmailInput,
): Promise<ConfirmationEmailResult> {
  if (!validInput(input)) {
    return { ok: false, errorCode: "configuration", attempts: 1 };
  }

  const confirmationUrl = new URL(
    "/integra-acao/newsletter/confirmar/",
    input.confirmationOrigin,
  );
  confirmationUrl.hash = `token=${input.rawToken}`;
  const link = confirmationUrl.href;
  const body = JSON.stringify({
    from: input.from,
    to: input.to,
    subject: SUBJECT,
    html: `<p>Olá, ${escapeHtml(input.name)}.</p><p>Confirme sua inscrição: <a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>`,
    text: `Olá, ${input.name}.\n\nConfirme sua inscrição: ${link}`,
  });

  const requestInit: RequestInit = {
    method: "POST",
    redirect: "manual",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.tokenId,
      "User-Agent": "integrautomacao-newsletter/1.0",
    },
    body,
  };

  for (let attempt = 1 as 1 | 2; attempt <= 2; attempt += 1) {
    let response: Response;
    try {
      response = await fetchWithTimeout(
        RESEND_EMAIL_URL,
        requestInit,
        ATTEMPT_TIMEOUT_MS,
        RESPONSE_LIMIT_BYTES,
      );
    } catch (error) {
      const errorName =
        typeof error === "object" && error !== null && "name" in error
          ? String(error.name)
          : "";
      const errorCode: ConfirmationEmailErrorCode =
        errorName === "AbortError"
          ? "timeout"
          : errorName === "RangeError"
            ? "invalid_response"
            : "network";
      if (attempt === 1) {
        await boundedDelay(MAX_RETRY_DELAY_MS);
        continue;
      }
      return { ok: false, errorCode, attempts: 2 };
    }

    if (response.ok) {
      const decoded = await readResponseJsonLimited(
        response,
        RESPONSE_LIMIT_BYTES,
      );
      if (
        decoded.ok &&
        isRecord(decoded.value) &&
        validProviderMessageId(decoded.value.id)
      ) {
        return {
          ok: true,
          messageId: decoded.value.id,
          attempts: attempt,
        };
      }
      if (attempt === 1) {
        await boundedDelay(MAX_RETRY_DELAY_MS);
        continue;
      }
      return {
        ok: false,
        errorCode: "invalid_response",
        providerStatus: response.status,
        attempts: 2,
      };
    }

    if (response.status === 409) {
      const retryDelay = retryAfterMilliseconds(response);
      const decoded = await readResponseJsonLimited(
        response,
        RESPONSE_LIMIT_BYTES,
      );
      const providerName =
        decoded.ok && isRecord(decoded.value) &&
        typeof decoded.value.name === "string"
          ? decoded.value.name
          : "";

      if (providerName === "concurrent_idempotent_requests" && attempt === 1) {
        await boundedDelay(retryDelay);
        continue;
      }
      return {
        ok: false,
        errorCode:
          providerName === "invalid_idempotent_request" ||
          providerName === "concurrent_idempotent_requests"
            ? "idempotency_conflict"
            : "provider_4xx",
        providerStatus: response.status,
        attempts: attempt,
      };
    }

    const retryDelay = retryAfterMilliseconds(response);
    await drainResponseLimited(response, RESPONSE_LIMIT_BYTES);

    if ((response.status === 429 || response.status >= 500) && attempt === 1) {
      await boundedDelay(retryDelay);
      continue;
    }

    if (response.status === 429) {
      return {
        ok: false,
        errorCode: "rate_limited",
        providerStatus: response.status,
        attempts: attempt,
      };
    }
    if (response.status >= 500) {
      return {
        ok: false,
        errorCode: "provider_5xx",
        providerStatus: response.status,
        attempts: attempt,
      };
    }
    if (response.status >= 400) {
      return {
        ok: false,
        errorCode: "provider_4xx",
        providerStatus: response.status,
        attempts: attempt,
      };
    }
    return {
      ok: false,
      errorCode: "invalid_response",
      providerStatus: response.status,
      attempts: attempt,
    };
  }

  return { ok: false, errorCode: "network", attempts: 2 };
}
import {
  drainResponseLimited,
  fetchWithTimeout,
  isRecord,
  readResponseJsonLimited,
} from "../http";
import { isConfirmationToken } from "./crypto";
