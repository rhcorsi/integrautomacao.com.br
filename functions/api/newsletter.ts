/**
 * Cloudflare Pages Function — POST /api/newsletter
 *
 * Registers explicit consent in Resend Contacts + Segments + Topics. A Topic
 * opt-in is the final sending gate. Existing global opt-outs are never reset
 * automatically and no partially completed workflow is reported as success.
 */

import type { NewsletterEnv } from "../_shared/env";
import {
  drainResponseLimited,
  fetchWithTimeout,
  isJsonContentType,
  isRecord,
  jsonResponse,
  logWorkerEvent,
  methodNotAllowed,
  readRequestJsonLimited,
  readResponseJsonLimited,
} from "../_shared/http";
import { verifyTurnstile } from "../_shared/turnstile";

interface NewsletterPayload {
  name: string;
  email: string;
  lgpd: string;
  website?: string;
  "cf-turnstile-response": string;
}

interface ConsentEvidence {
  newsletter_consent_at: string;
  newsletter_policy_version: string;
  newsletter_consent_source: string;
  newsletter_consent_text: string;
}

interface ResendContact {
  id: string;
  email: string;
  unsubscribed: boolean;
}

type TopicSubscription = "missing" | "opt_in" | "opt_out";

type ContactLookup =
  | { kind: "error" }
  | { kind: "exists"; contact: ResendContact }
  | { kind: "missing" };

type SubscriptionResult =
  | { ok: true; alreadyExists?: boolean; mode: "contacts" }
  | { ok: false; kind: "global-opt-out" | "provider"; status: number };

const MAX_BODY_BYTES = 8_000;
const RESEND_TIMEOUT_MS = 10_000;
const RESEND_RESPONSE_BYTES = 32_768;
const CONSENT_POLICY_VERSION = "2026-07-13";
const CONSENT_TEXT =
  "Concordo em receber a newsletter Integra Ação e com o tratamento dos meus dados conforme a Política de Privacidade. Posso cancelar a inscrição a qualquer momento.";

const singleLine = (value: string, max: number) =>
  value
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const isEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 180;

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
    "cf-turnstile-response": token,
    website,
  };
}

function resendHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "User-Agent": "integrautomacao-newsletter/2.0",
  };
}

async function resendFetch(
  input: string,
  init: RequestInit,
): Promise<Response> {
  const first = await fetchWithTimeout(input, init, RESEND_TIMEOUT_MS);
  if (first.status !== 429) return first;

  const retryAfter = Number(first.headers.get("retry-after") ?? "1");
  const waitMs = Number.isFinite(retryAfter)
    ? Math.min(Math.max(retryAfter * 1_000, 250), 2_000)
    : 1_000;
  await drainResponseLimited(first, RESEND_RESPONSE_BYTES);
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  return fetchWithTimeout(input, init, RESEND_TIMEOUT_MS);
}

async function parseResendRecord(
  response: Response,
): Promise<Record<string, unknown> | null> {
  const decoded = await readResponseJsonLimited(response, RESEND_RESPONSE_BYTES);
  return decoded.ok && isRecord(decoded.value) ? decoded.value : null;
}

async function lookupContact(
  email: string,
  apiKey: string,
  requestId: string,
): Promise<ContactLookup> {
  const response = await resendFetch(
    `https://api.resend.com/contacts/${encodeURIComponent(email)}`,
    { method: "GET", headers: resendHeaders(apiKey) },
  );
  if (response.status === 404) {
    await drainResponseLimited(response, RESEND_RESPONSE_BYTES);
    return { kind: "missing" };
  }
  if (!response.ok) {
    await drainResponseLimited(response, RESEND_RESPONSE_BYTES);
    logWorkerEvent("error", "newsletter_contact_lookup_failed", {
      requestId,
      providerStatus: response.status,
    });
    return { kind: "error" };
  }

  const contact = await parseResendRecord(response);
  if (
    !contact ||
    typeof contact.id !== "string" ||
    typeof contact.email !== "string" ||
    typeof contact.unsubscribed !== "boolean"
  ) {
    logWorkerEvent("error", "newsletter_contact_lookup_invalid_response", {
      requestId,
    });
    return { kind: "error" };
  }

  return {
    kind: "exists",
    contact: {
      id: contact.id,
      email: contact.email,
      unsubscribed: contact.unsubscribed,
    },
  };
}

async function listContainsId(
  endpoint: string,
  targetId: string,
  apiKey: string,
  requestId: string,
  event: string,
): Promise<boolean | null> {
  const response = await resendFetch(endpoint, {
    method: "GET",
    headers: resendHeaders(apiKey),
  });
  if (!response.ok) {
    await drainResponseLimited(response, RESEND_RESPONSE_BYTES);
    logWorkerEvent("error", event, {
      requestId,
      providerStatus: response.status,
    });
    return null;
  }

  const decoded = await parseResendRecord(response);
  if (!decoded || !Array.isArray(decoded.data)) {
    logWorkerEvent("error", `${event}_invalid_response`, { requestId });
    return null;
  }
  return decoded.data.some(
    (entry) => isRecord(entry) && entry.id === targetId,
  );
}

async function contactHasSegment(
  email: string,
  segmentId: string,
  apiKey: string,
  requestId: string,
): Promise<boolean | null> {
  return listContainsId(
    `https://api.resend.com/contacts/${encodeURIComponent(email)}/segments`,
    segmentId,
    apiKey,
    requestId,
    "newsletter_segment_lookup_failed",
  );
}

async function getTopicSubscription(
  email: string,
  topicId: string,
  apiKey: string,
  requestId: string,
): Promise<TopicSubscription | null> {
  const response = await resendFetch(
    `https://api.resend.com/contacts/${encodeURIComponent(email)}/topics`,
    { method: "GET", headers: resendHeaders(apiKey) },
  );
  if (!response.ok) {
    await drainResponseLimited(response, RESEND_RESPONSE_BYTES);
    logWorkerEvent("error", "newsletter_topic_lookup_failed", {
      requestId,
      providerStatus: response.status,
    });
    return null;
  }

  const decoded = await parseResendRecord(response);
  if (!decoded || !Array.isArray(decoded.data)) {
    logWorkerEvent("error", "newsletter_topic_lookup_invalid_response", {
      requestId,
    });
    return null;
  }

  const topic = decoded.data.find(
    (entry) =>
      isRecord(entry) &&
      entry.id === topicId &&
      (entry.subscription === "opt_in" || entry.subscription === "opt_out"),
  );
  if (!isRecord(topic)) return "missing";
  return topic.subscription === "opt_in" ? "opt_in" : "opt_out";
}

async function updateContactEvidence(
  email: string,
  apiKey: string,
  evidence: ConsentEvidence,
  requestId: string,
): Promise<boolean> {
  const response = await resendFetch(
    `https://api.resend.com/contacts/${encodeURIComponent(email)}`,
    {
      method: "PATCH",
      headers: resendHeaders(apiKey),
      body: JSON.stringify({ properties: evidence }),
    },
  );
  await drainResponseLimited(response, RESEND_RESPONSE_BYTES);
  if (response.ok) return true;
  logWorkerEvent("error", "newsletter_evidence_update_failed", {
    requestId,
    providerStatus: response.status,
  });
  return false;
}

async function addContactToSegment(
  email: string,
  segmentId: string,
  apiKey: string,
  requestId: string,
): Promise<{ added: boolean; ok: boolean }> {
  try {
    const response = await resendFetch(
      `https://api.resend.com/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(segmentId)}`,
      { method: "POST", headers: resendHeaders(apiKey) },
    );
    await drainResponseLimited(response, RESEND_RESPONSE_BYTES);
    if (response.ok) return { added: true, ok: true };
    if (response.status === 409 || response.status === 422) {
      const confirmed = await contactHasSegment(
        email,
        segmentId,
        apiKey,
        requestId,
      );
      return { added: false, ok: confirmed === true };
    }
    if (response.status >= 500) {
      const confirmed = await contactHasSegment(
        email,
        segmentId,
        apiKey,
        requestId,
      );
      if (confirmed === true) {
        logWorkerEvent("warn", "newsletter_segment_add_ambiguity_confirmed", {
          requestId,
          providerStatus: response.status,
        });
        return { added: true, ok: true };
      }
    }
    logWorkerEvent("error", "newsletter_segment_add_failed", {
      requestId,
      providerStatus: response.status,
    });
    return { added: false, ok: false };
  } catch (error) {
    // The provider may have committed the membership before the response was
    // lost. Read it back and classify it as ours so a later failure compensates
    // it; this function is called only after the initial snapshot was absent.
    const confirmed = await contactHasSegment(
      email,
      segmentId,
      apiKey,
      requestId,
    ).catch(() => null);
    if (confirmed === true) {
      logWorkerEvent("warn", "newsletter_segment_add_ambiguity_confirmed", {
        requestId,
      });
      return { added: true, ok: true };
    }
    logWorkerEvent("error", "newsletter_segment_add_exception", {
      requestId,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return { added: false, ok: false };
  }
}

async function removeContactFromSegment(
  email: string,
  segmentId: string,
  apiKey: string,
  requestId: string,
): Promise<boolean> {
  const endpoint =
    `https://api.resend.com/contacts/${encodeURIComponent(email)}` +
    `/segments/${encodeURIComponent(segmentId)}`;

  let providerStatus: number | undefined;
  let errorType: string | undefined;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await resendFetch(endpoint, {
        method: "DELETE",
        headers: resendHeaders(apiKey),
      });
      providerStatus = response.status;
      await drainResponseLimited(response, RESEND_RESPONSE_BYTES);
      if (response.ok || response.status === 404) return true;
    } catch (error) {
      errorType = error instanceof Error ? error.name : "UnknownError";
    }
  }
  logWorkerEvent("error", "newsletter_segment_rollback_failed", {
    requestId,
    severity: "critical",
    providerStatus,
    errorType,
  });
  return false;
}

async function optInTopic(
  email: string,
  topicId: string,
  apiKey: string,
  requestId: string,
): Promise<boolean> {
  const response = await resendFetch(
    `https://api.resend.com/contacts/${encodeURIComponent(email)}/topics`,
    {
      method: "PATCH",
      headers: resendHeaders(apiKey),
      body: JSON.stringify({
        topics: [{ id: topicId, subscription: "opt_in" }],
      }),
    },
  );
  await drainResponseLimited(response, RESEND_RESPONSE_BYTES);
  if (response.ok) return true;

  logWorkerEvent("error", "newsletter_topic_opt_in_failed", {
    requestId,
    providerStatus: response.status,
  });
  return false;
}

async function restoreTopicOptOut(
  email: string,
  topicId: string,
  apiKey: string,
  requestId: string,
): Promise<boolean> {
  const endpoint =
    `https://api.resend.com/contacts/${encodeURIComponent(email)}/topics`;

  let providerStatus: number | undefined;
  let errorType: string | undefined;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await resendFetch(endpoint, {
        method: "PATCH",
        headers: resendHeaders(apiKey),
        body: JSON.stringify({
          topics: [{ id: topicId, subscription: "opt_out" }],
        }),
      });
      providerStatus = response.status;
      await drainResponseLimited(response, RESEND_RESPONSE_BYTES);
      if (response.ok) return true;
    } catch (error) {
      errorType = error instanceof Error ? error.name : "UnknownError";
    }
  }
  logWorkerEvent("error", "newsletter_topic_rollback_failed", {
    requestId,
    severity: "critical",
    providerStatus,
    errorType,
  });
  return false;
}

async function subscribeExistingContact(
  contact: ResendContact,
  segmentId: string,
  topicId: string,
  apiKey: string,
  evidence: ConsentEvidence,
  requestId: string,
): Promise<SubscriptionResult> {
  if (contact.unsubscribed) {
    logWorkerEvent("info", "newsletter_global_opt_out_preserved", { requestId });
    return { ok: false, kind: "global-opt-out", status: 409 };
  }

  // Depois do lookup inevitável por e-mail, use o ID opaco do provedor em
  // todas as URLs subsequentes para minimizar PII em infraestrutura.
  const contactRef = contact.id;

  const [hasSegment, topicSubscription] = await Promise.all([
    contactHasSegment(contactRef, segmentId, apiKey, requestId),
    getTopicSubscription(contactRef, topicId, apiKey, requestId),
  ]);
  if (hasSegment === null || topicSubscription === null) {
    return { ok: false, kind: "provider", status: 502 };
  }

  let segmentAdded = false;
  try {
    if (!hasSegment) {
      const segment = await addContactToSegment(
        contactRef,
        segmentId,
        apiKey,
        requestId,
      );
      if (!segment.ok) {
        return { ok: false, kind: "provider", status: 502 };
      }
      segmentAdded = segment.added;
    }

    // Evidence is stored before the Topic sending gate. It remains a truthful
    // record of the submitted consent even if a later provider operation fails.
    if (
      !(await updateContactEvidence(
        contactRef,
        apiKey,
        evidence,
        requestId,
      ))
    ) {
      if (segmentAdded) {
        await removeContactFromSegment(
          contactRef,
          segmentId,
          apiKey,
          requestId,
        );
      }
      return { ok: false, kind: "provider", status: 502 };
    }

    if (
      topicSubscription !== "opt_in" &&
      !(await optInTopic(contactRef, topicId, apiKey, requestId))
    ) {
      // A provider can apply a mutation and still lose the HTTP response. Read
      // back the sending gate before deciding whether the workflow succeeded.
      const confirmed = await getTopicSubscription(
        contactRef,
        topicId,
        apiKey,
        requestId,
      );
      if (confirmed === "opt_in") {
        return { ok: true, alreadyExists: true, mode: "contacts" };
      }

      // Both "missing" and the documented opt_out state are non-sending. A
      // conservative opt_out compensates an ambiguous failed PATCH.
      await restoreTopicOptOut(
        contactRef,
        topicId,
        apiKey,
        requestId,
      );
      if (segmentAdded) {
        await removeContactFromSegment(
          contactRef,
          segmentId,
          apiKey,
          requestId,
        );
      }
      return { ok: false, kind: "provider", status: 502 };
    }

    return { ok: true, alreadyExists: true, mode: "contacts" };
  } catch (error) {
    // A request failure after a segment mutation must not leave a newly added
    // audience membership behind. Topic was the final gate, so restoring
    // opt_out is always conservative when its outcome is unknown.
    if (topicSubscription !== "opt_in") {
      await restoreTopicOptOut(
        contactRef,
        topicId,
        apiKey,
        requestId,
      ).catch(() => false);
    }
    if (segmentAdded) {
      await removeContactFromSegment(
        contactRef,
        segmentId,
        apiKey,
        requestId,
      ).catch(() => false);
    }
    logWorkerEvent("error", "newsletter_existing_workflow_exception", {
      requestId,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return { ok: false, kind: "provider", status: 502 };
  }
}

async function subscribeContact(
  segmentId: string,
  topicId: string,
  apiKey: string,
  contact: { email: string; first_name: string; last_name: string },
  evidence: ConsentEvidence,
  requestId: string,
): Promise<SubscriptionResult> {
  try {
    const lookup = await lookupContact(contact.email, apiKey, requestId);
    if (lookup.kind === "error") {
      return { ok: false, kind: "provider", status: 502 };
    }
    if (lookup.kind === "exists") {
      return subscribeExistingContact(
        lookup.contact,
        segmentId,
        topicId,
        apiKey,
        evidence,
        requestId,
      );
    }

    // For a brand-new contact, this single create request records the explicit
    // newsletter consent and establishes global + Topic subscription together.
    const createInit: RequestInit = {
      method: "POST",
      headers: {
        ...resendHeaders(apiKey),
        "Idempotency-Key": `newsletter-${requestId}`,
      },
      body: JSON.stringify({
        ...contact,
        unsubscribed: false,
        segments: [{ id: segmentId }],
        topics: [{ id: topicId, subscription: "opt_in" }],
        properties: evidence,
      }),
    };

    let create: Response;
    try {
      create = await resendFetch("https://api.resend.com/contacts", createInit);
    } catch (error) {
      // A create can commit and then lose its response. Confirm the resulting
      // global state before returning an error or performing any further write.
      const applied = await lookupContact(
        contact.email,
        apiKey,
        requestId,
      ).catch((): ContactLookup => ({ kind: "error" }));
      if (applied.kind === "exists") {
        logWorkerEvent("warn", "newsletter_create_ambiguity_confirmed", {
          requestId,
        });
        return subscribeExistingContact(
          applied.contact,
          segmentId,
          topicId,
          apiKey,
          evidence,
          requestId,
        );
      }
      logWorkerEvent("error", "newsletter_contact_create_exception", {
        requestId,
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      return { ok: false, kind: "provider", status: 502 };
    }
    await drainResponseLimited(create, RESEND_RESPONSE_BYTES);
    if (create.ok) return { ok: true, mode: "contacts" };

    // Race: another request may create the contact after our lookup. Re-read
    // the complete contact state before deciding whether mutation is allowed.
    if (
      create.status === 409 ||
      create.status === 422 ||
      create.status >= 500
    ) {
      const raced = await lookupContact(contact.email, apiKey, requestId);
      if (raced.kind === "exists") {
        return subscribeExistingContact(
          raced.contact,
          segmentId,
          topicId,
          apiKey,
          evidence,
          requestId,
        );
      }
    }

    logWorkerEvent("error", "newsletter_contact_create_failed", {
      requestId,
      providerStatus: create.status,
    });
    return { ok: false, kind: "provider", status: 502 };
  } catch (error) {
    logWorkerEvent("error", "newsletter_resend_exception", {
      requestId,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return { ok: false, kind: "provider", status: 502 };
  }
}

export const onRequestPost: PagesFunction<NewsletterEnv> = async ({
  request,
  env,
}) => {
  const requestId = crypto.randomUUID();
  const respond = (data: unknown, status = 200) =>
    jsonResponse(data, status, requestId);

  if (!env.TURNSTILE_SECRET_KEY || !env.RESEND_CONTACTS_API_KEY) {
    logWorkerEvent("error", "newsletter_configuration_missing", {
      requestId,
      binding: "TURNSTILE_OR_RESEND_KEY",
    });
    return respond(
      { ok: false, message: "Configuração de inscrição indisponível." },
      503,
    );
  }
  if (!env.RESEND_SEGMENT_ID || !env.RESEND_TOPIC_ID) {
    logWorkerEvent("error", "newsletter_configuration_missing", {
      requestId,
      binding: "RESEND_SEGMENT_OR_TOPIC_ID",
    });
    return respond(
      { ok: false, message: "Lista de inscrição temporariamente indisponível." },
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

  if (payload.website) return respond({ ok: true });
  if (payload.lgpd !== "1") {
    return respond(
      { ok: false, message: "É necessário concordar com a Política de Privacidade." },
      400,
    );
  }

  const name = singleLine(payload.name, 121);
  const email = singleLine(payload.email, 181).toLowerCase();
  const token = payload["cf-turnstile-response"].trim();
  if (name.length < 2 || name.length > 120) {
    return respond({ ok: false, message: "Nome inválido." }, 400);
  }
  if (!isEmail(email)) {
    return respond({ ok: false, message: "E-mail inválido." }, 400);
  }
  if (!token || token.length > 2_048) {
    return respond(
      { ok: false, message: "Verificação de segurança ausente." },
      403,
    );
  }

  const requestHostname = new URL(request.url).hostname;
  const turnstile = await verifyTurnstile({
    action: "newsletter-form",
    expectedHostname: requestHostname,
    ip: request.headers.get("CF-Connecting-IP") ?? undefined,
    secret: env.TURNSTILE_SECRET_KEY,
    token,
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

  const parts = name.split(/\s+/);
  const contact = {
    email,
    first_name: parts[0]?.slice(0, 80) ?? "",
    last_name: parts.slice(1).join(" ").slice(0, 80),
  };
  let consentSource = new URL(request.url).pathname;
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const sourceUrl = new URL(referer);
      if (sourceUrl.hostname === requestHostname) {
        consentSource = sourceUrl.pathname;
      }
    } catch {
      // Invalid header: preserve the safe source derived from the endpoint.
    }
  }
  const evidence: ConsentEvidence = {
    newsletter_consent_at: new Date().toISOString(),
    newsletter_policy_version: CONSENT_POLICY_VERSION,
    newsletter_consent_source: consentSource.slice(0, 200),
    newsletter_consent_text: CONSENT_TEXT,
  };

  const result = await subscribeContact(
    env.RESEND_SEGMENT_ID,
    env.RESEND_TOPIC_ID,
    env.RESEND_CONTACTS_API_KEY,
    contact,
    evidence,
    requestId,
  );

  if (!result.ok && result.kind === "global-opt-out") {
    return respond(
      {
        ok: false,
        code: "GLOBAL_OPT_OUT",
        message:
          "Este e-mail possui um descadastro global. Para proteger sua preferência, não o reativamos automaticamente. Escreva para privacidade@integrautomacao.com.br para solicitar a reinscrição.",
      },
      409,
    );
  }
  if (!result.ok) {
    return respond(
      {
        ok: false,
        message:
          "Não foi possível registrar a inscrição agora. Tente novamente em instantes.",
      },
      502,
    );
  }

  logWorkerEvent("info", "newsletter_subscription_confirmed", {
    requestId,
    existingContact: result.alreadyExists ?? false,
  });
  return respond({
    ok: true,
    alreadyExists: result.alreadyExists ?? false,
    mode: result.mode,
  });
};

const onlyPost = () =>
  methodNotAllowed(
    "Endpoint disponível apenas via POST do formulário de inscrição.",
  );

export const onRequestGet: PagesFunction = onlyPost;
export const onRequestPut: PagesFunction = onlyPost;
export const onRequestPatch: PagesFunction = onlyPost;
export const onRequestDelete: PagesFunction = onlyPost;
