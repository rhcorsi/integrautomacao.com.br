import {
  isJsonContentType,
  isRecord,
  jsonResponse,
  logWorkerEvent,
  methodNotAllowed,
  readRequestJsonLimited,
} from "../../_shared/http";
import {
  hashConfirmationToken,
  isConfirmationToken,
} from "../../_shared/newsletter/crypto";
import { drainNewsletterJobs } from "../../_shared/newsletter/reconcile";
import { createNewsletterStore } from "../../_shared/newsletter/store";
import type { ConsumeConfirmationResult } from "../../_shared/newsletter/types";

interface NewsletterConfirmationEnv {
  NEWSLETTER_DB: D1Database;
}

const MAX_BODY_BYTES = 2_048;
const CLEANUP_LIMIT = 20;

const CONFIRMED_RESPONSE = {
  ok: true,
  state: "confirmed",
  message:
    "Inscrição confirmada. A sincronização da lista pode levar alguns instantes.",
};
const ALREADY_PROCESSED_RESPONSE = {
  ok: true,
  state: "already-processed",
  message: "Este link já foi processado.",
};
const EXPIRED_RESPONSE = {
  ok: false,
  state: "expired",
  message: "Este link expirou. Solicite uma nova confirmação pelo formulário.",
};
const INVALID_RESPONSE = {
  ok: false,
  state: "invalid",
  message: "Link de confirmação inválido.",
};
const ERROR_RESPONSE = {
  ok: false,
  state: "error",
  message: "Não foi possível processar a confirmação agora.",
};

export function parseConfirmationPayload(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== 1 || keys[0] !== "token") return null;
  const token = value.token;
  return typeof token === "string" && isConfirmationToken(token) ? token : null;
}

function hasQuerySyntax(url: string): boolean {
  return url.split("#", 1)[0]!.includes("?");
}

function responseForResult(
  result: ConsumeConfirmationResult,
  requestId: string,
): Response {
  switch (result.kind) {
    case "confirmed":
      return jsonResponse(CONFIRMED_RESPONSE, 200, requestId);
    case "already-consumed":
      return jsonResponse(ALREADY_PROCESSED_RESPONSE, 200, requestId);
    case "expired":
      return jsonResponse(EXPIRED_RESPONSE, 410, requestId);
    case "invalid":
      return jsonResponse(INVALID_RESPONSE, 400, requestId);
  }
}

export const onRequestPost: PagesFunction<NewsletterConfirmationEnv> = async (
  context,
) => {
  const { env, request } = context;
  const requestId = crypto.randomUUID();
  const respond = (data: unknown, status: number) =>
    jsonResponse(data, status, requestId);

  if (hasQuerySyntax(request.url)) {
    return respond(INVALID_RESPONSE, 400);
  }
  if (!isJsonContentType(request.headers.get("content-type"))) {
    return respond(
      { ok: false, state: "invalid", message: "Tipo de conteúdo inválido." },
      415,
    );
  }

  const decoded = await readRequestJsonLimited(request, MAX_BODY_BYTES);
  if (!decoded.ok) {
    return decoded.reason === "too-large"
      ? respond(
          { ok: false, state: "invalid", message: "Payload muito grande." },
          413,
        )
      : respond(INVALID_RESPONSE, 400);
  }

  const rawToken = parseConfirmationPayload(decoded.value);
  if (rawToken === null) return respond(INVALID_RESPONSE, 400);

  const tokenSha256 = await hashConfirmationToken(rawToken);
  const now = new Date();
  const store = createNewsletterStore(env.NEWSLETTER_DB);
  let result: ConsumeConfirmationResult | null = null;
  try {
    result = await store.consumeConfirmation({
      tokenSha256,
      requestId,
      now,
    });
  } catch {
    logWorkerEvent("error", "newsletter_confirmation_store_exception", {
      requestId,
    });
  }

  const cleanupWork = store
    .purgeExpiredPending(now, CLEANUP_LIMIT)
    .catch(() => {
      logWorkerEvent("error", "newsletter_confirmation_cleanup_exception", {
        requestId,
      });
    });
  context.waitUntil(cleanupWork);

  if (
    result?.kind === "confirmed" ||
    result?.kind === "already-consumed" ||
    result?.kind === "expired"
  ) {
    const reconciliationWork = drainNewsletterJobs({
      runtimeEnv: env,
      ...(result.kind === "confirmed"
        ? { preferredSubscriptionId: result.subscriptionId }
        : {}),
    }).catch(() => {
      logWorkerEvent("error", "newsletter_provider_reconciliation", {
        requestId,
        step: "confirmation_drain",
        result: "exception",
      });
    });
    context.waitUntil(reconciliationWork);
  }

  return result === null
    ? respond(ERROR_RESPONSE, 503)
    : responseForResult(result, requestId);
};

const onlyPost = () =>
  methodNotAllowed("Endpoint de confirmação disponível apenas via POST.");

export const onRequestGet: PagesFunction = onlyPost;
export const onRequestHead: PagesFunction = onlyPost;
export const onRequestPut: PagesFunction = onlyPost;
export const onRequestPatch: PagesFunction = onlyPost;
export const onRequestDelete: PagesFunction = onlyPost;
export const onRequestOptions: PagesFunction = onlyPost;
