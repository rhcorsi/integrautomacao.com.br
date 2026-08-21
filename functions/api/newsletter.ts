import type { NewsletterInitialEnv } from "../_shared/env";
import {
  isJsonContentType,
  isRecord,
  jsonResponse,
  logWorkerEvent,
  methodNotAllowed,
  readRequestJsonLimited,
} from "../_shared/http";
import { generateConfirmationToken } from "../_shared/newsletter/crypto";
import {
  type ConfirmationEmailErrorCode,
  sendConfirmationEmail,
} from "../_shared/newsletter/email";
import { drainNewsletterJobs } from "../_shared/newsletter/reconcile";
import { createNewsletterStore } from "../_shared/newsletter/store";
import {
  CONSENT_POLICY_VERSION,
  CONSENT_TEXT,
  normalizeNewsletterEmail,
} from "../_shared/newsletter/types";
import { verifyTurnstile } from "../_shared/turnstile";

interface NewsletterPayload {
  name: string;
  email: string;
  lgpd: string;
  website?: string;
  "cf-turnstile-response": string;
}

type RequestEnvironment = "loopback" | "preview" | "production";

const MAX_BODY_BYTES = 8_000;
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 180;
const MAX_TURNSTILE_TOKEN_LENGTH = 2_048;
const MAX_CONSENT_SOURCE_LENGTH = 200;
const CLEANUP_LIMIT = 20;
const PRODUCTION_CONFIRMATION_ORIGIN = "https://integrautomacao.com.br";
const PAGES_ROOT_HOST = "integrautomacao-com-br.pages.dev";
const PAGES_PREVIEW_SUFFIX = `.${PAGES_ROOT_HOST}`;
const PRODUCTION_REQUEST_HOSTS = new Set([
  "integrautomacao.com.br",
  "www.integrautomacao.com.br",
  "newsletter.integrautomacao.com.br",
  "webinar.integrautomacao.com.br",
  "eventos.integrautomacao.com.br",
  PAGES_ROOT_HOST,
]);
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const NEUTRAL_RESPONSE = {
  ok: true,
  message:
    "Se o endereço puder receber a newsletter, enviaremos as próximas instruções por e-mail.",
};

function parsePayload(value: unknown): NewsletterPayload | null {
  if (!isRecord(value)) return null;

  const name = value.name;
  const email = value.email;
  const lgpd = value.lgpd;
  const token = value["cf-turnstile-response"];
  const website = value.website;
  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof lgpd !== "string" ||
    typeof token !== "string" ||
    (website !== undefined && typeof website !== "string")
  ) {
    return null;
  }

  return {
    name,
    email,
    lgpd,
    website,
    "cf-turnstile-response": token,
  };
}

function normalizeName(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function validEmail(value: string): boolean {
  return value.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(value);
}

function classifyRequestUrl(url: URL): RequestEnvironment | null {
  const hostname = url.hostname.toLowerCase();
  if (PRODUCTION_REQUEST_HOSTS.has(hostname)) {
    return url.protocol === "https:" && url.port === ""
      ? "production"
      : null;
  }
  if (hostname !== PAGES_ROOT_HOST && hostname.endsWith(PAGES_PREVIEW_SUFFIX)) {
    return url.protocol === "https:" && url.port === "" ? "preview" : null;
  }
  if (LOOPBACK_HOSTS.has(hostname)) {
    return url.protocol === "http:" || url.protocol === "https:"
      ? "loopback"
      : null;
  }
  return null;
}

function validateRequestOrigin(
  request: Request,
): { kind: RequestEnvironment; url: URL } | null {
  const requestUrl = new URL(request.url);
  const kind = classifyRequestUrl(requestUrl);
  if (!kind) return null;

  const originHeader = request.headers.get("origin");
  if (!originHeader || originHeader === "null") return null;
  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(originHeader);
  } catch {
    return null;
  }
  if (
    originHeader !== parsedOrigin.origin ||
    parsedOrigin.origin !== requestUrl.origin
  ) {
    return null;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null && fetchSite !== "same-origin") return null;
  return { kind, url: requestUrl };
}

function validPreviewConfirmationOrigin(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  const hostname = url.hostname.toLowerCase();
  return (
    value === url.origin &&
    url.protocol === "https:" &&
    url.username === "" &&
    url.password === "" &&
    url.port === "" &&
    hostname !== PAGES_ROOT_HOST &&
    hostname.endsWith(PAGES_PREVIEW_SUFFIX)
  );
}

function coherentConfirmationOrigin(
  requestEnvironment: RequestEnvironment,
  confirmationOrigin: string | undefined,
): boolean {
  if (!confirmationOrigin) return false;
  if (requestEnvironment === "production") {
    return confirmationOrigin === PRODUCTION_CONFIRMATION_ORIGIN;
  }
  if (requestEnvironment === "preview") {
    return validPreviewConfirmationOrigin(confirmationOrigin);
  }
  return false;
}

function safeConsentSource(requestUrl: URL, referer: string | null): string {
  if (referer) {
    try {
      const source = new URL(referer);
      if (source.origin === requestUrl.origin) {
        return source.pathname.slice(0, MAX_CONSENT_SOURCE_LENGTH);
      }
    } catch {
      // Fall back to the endpoint path; no header content is persisted.
    }
  }
  return requestUrl.pathname.slice(0, MAX_CONSENT_SOURCE_LENGTH);
}

function hasD1Binding(value: unknown): value is D1Database {
  return (
    typeof value === "object" &&
    value !== null &&
    "prepare" in value &&
    typeof value.prepare === "function" &&
    "batch" in value &&
    typeof value.batch === "function"
  );
}

async function markDeliveryFailed(
  store: ReturnType<typeof createNewsletterStore>,
  tokenId: string,
  errorCode: ConfirmationEmailErrorCode,
  requestId: string,
  attempts: 1 | 2,
  providerStatus?: number,
): Promise<void> {
  try {
    const transitioned = await store.markConfirmationEmailFailed(
      tokenId,
      errorCode,
      new Date(),
    );
    logWorkerEvent(transitioned ? "warn" : "info", "newsletter_delivery_failed", {
      requestId,
      tokenId,
      state: transitioned ? "failed" : "cas_false",
      errorCode,
      attempts,
      providerStatus,
    });
  } catch {
    logWorkerEvent("error", "newsletter_delivery_failed_cas_exception", {
      requestId,
      tokenId,
      state: "cas_exception",
      errorCode,
      attempts,
      providerStatus,
    });
  }
}

export const onRequestPost: PagesFunction<NewsletterInitialEnv> = async (
  context,
) => {
  const { env, request } = context;
  const requestId = crypto.randomUUID();
  const respond = (data: unknown, status = 200) =>
    jsonResponse(data, status, requestId);
  const neutral = () => respond(NEUTRAL_RESPONSE, 202);

  const requestOrigin = validateRequestOrigin(request);
  if (!requestOrigin) {
    return respond({ ok: false, message: "Origem da requisição inválida." }, 400);
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
  if (payload.website) return neutral();
  if (payload.lgpd !== "1") {
    return respond(
      {
        ok: false,
        message: "É necessário concordar com a Política de Privacidade.",
      },
      400,
    );
  }

  const name = normalizeName(payload.name);
  const email = normalizeNewsletterEmail(payload.email);
  const turnstileToken = payload["cf-turnstile-response"].trim();
  if (name.length < 2 || name.length > MAX_NAME_LENGTH) {
    return respond({ ok: false, message: "Nome inválido." }, 400);
  }
  if (!validEmail(email)) {
    return respond({ ok: false, message: "E-mail inválido." }, 400);
  }
  if (
    !turnstileToken ||
    turnstileToken.length > MAX_TURNSTILE_TOKEN_LENGTH
  ) {
    return respond(
      { ok: false, message: "Verificação de segurança ausente." },
      403,
    );
  }

  if (!env.TURNSTILE_SECRET_KEY) {
    logWorkerEvent("error", "newsletter_configuration_missing", {
      requestId,
      binding: "TURNSTILE_SECRET_KEY",
    });
    return respond(
      { ok: false, message: "Configuração de inscrição indisponível." },
      503,
    );
  }
  if (!hasD1Binding(env.NEWSLETTER_DB)) {
    logWorkerEvent("error", "newsletter_configuration_missing", {
      requestId,
      binding: "NEWSLETTER_DB",
    });
    return respond(
      { ok: false, message: "Inscrição temporariamente indisponível." },
      503,
    );
  }

  const turnstile = await verifyTurnstile({
    action: "newsletter-form",
    expectedHostname: requestOrigin.url.hostname,
    ip: request.headers.get("CF-Connecting-IP") ?? undefined,
    secret: env.TURNSTILE_SECRET_KEY,
    token: turnstileToken,
  });
  if (turnstile === "unavailable") {
    logWorkerEvent("warn", "newsletter_turnstile_unavailable", { requestId });
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

  const registrationNow = new Date();
  const subscriptionId = crypto.randomUUID();
  const tokenId = crypto.randomUUID();
  const confirmationToken = await generateConfirmationToken();
  const consentSource = safeConsentSource(
    requestOrigin.url,
    request.headers.get("referer"),
  );
  const store = createNewsletterStore(env.NEWSLETTER_DB);

  let registration: Awaited<ReturnType<typeof store.registerPending>>;
  try {
    registration = await store.registerPending({
      subscriptionId,
      tokenId,
      tokenSha256: confirmationToken.sha256,
      name,
      email,
      policyVersion: CONSENT_POLICY_VERSION,
      consentText: CONSENT_TEXT,
      consentSource,
      requestId,
      now: registrationNow,
    });
  } catch (error) {
    logWorkerEvent("error", "newsletter_registration_store_exception", {
      requestId,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return respond(
      { ok: false, message: "Inscrição temporariamente indisponível." },
      503,
    );
  }

  if (registration.kind === "send") {
    const deliveryWork = (async () => {
      const transactionalApiKey = env.RESEND_TRANSACTIONAL_API_KEY;
      const emailFrom = env.CONTACT_EMAIL_FROM;
      const confirmationOrigin = env.NEWSLETTER_CONFIRMATION_ORIGIN;
      if (
        !transactionalApiKey ||
        !emailFrom ||
        !confirmationOrigin ||
        !coherentConfirmationOrigin(
          requestOrigin.kind,
          confirmationOrigin,
        )
      ) {
        await markDeliveryFailed(
          store,
          registration.tokenId,
          "configuration",
          requestId,
          1,
        );
        return;
      }

      const delivery = await sendConfirmationEmail({
        apiKey: transactionalApiKey,
        from: emailFrom,
        to: email,
        name,
        rawToken: confirmationToken.raw,
        tokenId: registration.tokenId,
        confirmationOrigin,
      });
      if (!delivery.ok) {
        await markDeliveryFailed(
          store,
          registration.tokenId,
          delivery.errorCode,
          requestId,
          delivery.attempts,
          delivery.providerStatus,
        );
        return;
      }

      try {
        const transitioned = await store.markConfirmationEmailSent(
          registration.tokenId,
          delivery.messageId,
          new Date(),
        );
        logWorkerEvent(transitioned ? "info" : "warn", "newsletter_delivery_sent", {
          requestId,
          tokenId: registration.tokenId,
          state: transitioned ? "sent" : "cas_false",
          attempts: delivery.attempts,
        });
      } catch {
        logWorkerEvent("error", "newsletter_delivery_sent_cas_exception", {
          requestId,
          tokenId: registration.tokenId,
          state: "cas_exception",
          attempts: delivery.attempts,
        });
      }
    })().catch(() => {
      logWorkerEvent("error", "newsletter_delivery_continuation_exception", {
        requestId,
        tokenId: registration.tokenId,
        state: "continuation_exception",
      });
    });
    context.waitUntil(deliveryWork);
  }

  const cleanupWork = store
    .purgeExpiredPending(registrationNow, CLEANUP_LIMIT)
    .then((purged) => {
      if (purged > 0) {
        logWorkerEvent("info", "newsletter_pending_cleanup", {
          requestId,
          state: "purged",
          purged,
        });
      }
    })
    .catch(() => {
      logWorkerEvent("error", "newsletter_pending_cleanup_exception", {
        requestId,
        state: "cleanup_exception",
      });
    });
  context.waitUntil(cleanupWork);

  const reconciliationWork = drainNewsletterJobs({ runtimeEnv: env }).catch(
    () => {
      logWorkerEvent("error", "newsletter_provider_reconciliation", {
        requestId,
        step: "initial_drain",
        result: "exception",
      });
    },
  );
  context.waitUntil(reconciliationWork);

  return neutral();
};

const onlyPost = () =>
  methodNotAllowed(
    "Endpoint disponível apenas via POST do formulário de inscrição.",
  );

export const onRequestGet: PagesFunction = onlyPost;
export const onRequestHead: PagesFunction = onlyPost;
export const onRequestPut: PagesFunction = onlyPost;
export const onRequestPatch: PagesFunction = onlyPost;
export const onRequestDelete: PagesFunction = onlyPost;
export const onRequestOptions: PagesFunction = onlyPost;
