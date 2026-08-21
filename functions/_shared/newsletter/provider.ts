import {
  fetchWithTimeout,
  isRecord,
  readResponseJsonLimited,
} from "../http";
import {
  RECONCILIATION_D1_MARGIN_MS,
  RECONCILIATION_MAX_HTTP_MS,
  RESEND_CONTACTS_API_KEY_MAX_CODE_UNITS,
  RESEND_OPAQUE_ID_MAX_CODE_UNITS,
  RESEND_PROVIDER_MAX_RESPONSE_BYTES,
  assertNewsletterOpaqueValue,
  normalizeNewsletterEmail,
  type ProviderConsentEvidence,
  type ReconciliationClock,
  type ReconciliationErrorCode,
} from "./types";

const RESEND_API_ORIGIN = "https://api.resend.com";
const RESEND_USER_AGENT = "integrautomacao-newsletter/1.0";
const EVIDENCE_KEYS = [
  "newsletter_consent_at",
  "newsletter_policy_version",
  "newsletter_consent_text",
  "newsletter_consent_source",
] as const;

export type ContactReference =
  | { kind: "email"; value: string }
  | { kind: "contact-id"; value: string };

export type ProviderEvidenceState = "matches" | "mismatch";

export type ProviderSnapshot =
  | { kind: "missing" }
  | {
      kind: "exists";
      contactId: string;
      globallyUnsubscribed: boolean;
      inSegment: boolean;
      topic: "missing" | "opt_in" | "opt_out";
      evidence: ProviderEvidenceState;
    }
  | {
      kind: "unavailable";
      code: ReconciliationErrorCode;
      providerStatus?: number;
      observedContactId?: string;
    };

export type ProviderMutationResult =
  | { kind: "applied"; providerStatus: number }
  | {
      kind: "ambiguous" | "failed";
      code: ReconciliationErrorCode;
      providerStatus?: number;
    };

export interface NewsletterProvider {
  read(input: {
    reference: ContactReference;
    expectedEmailNormalized: string;
    expectedEvidence: ProviderConsentEvidence;
    deadlineMs: number;
  }): Promise<ProviderSnapshot>;
  createConfirmedContact(input: {
    emailNormalized: string;
    evidence: ProviderConsentEvidence;
    deadlineMs: number;
  }): Promise<ProviderMutationResult>;
  updateConsentEvidence(input: {
    contactId: string;
    evidence: ProviderConsentEvidence;
    deadlineMs: number;
  }): Promise<ProviderMutationResult>;
  addConfiguredSegment(input: {
    contactId: string;
    deadlineMs: number;
  }): Promise<ProviderMutationResult>;
  optIntoConfiguredTopic(input: {
    contactId: string;
    deadlineMs: number;
  }): Promise<ProviderMutationResult>;
}

export type BoundedProviderRequest = (
  input: string,
  init: RequestInit,
  timeoutMs: number,
  maxResponseBytes: number,
) => Promise<Response>;

export interface ResendNewsletterProviderConfig {
  contactsApiKey: string;
  segmentId: string;
  topicId: string;
  clock: ReconciliationClock;
  request?: BoundedProviderRequest;
}

interface ValidatedConfig {
  contactsApiKey: string;
  segmentId: string;
  topicId: string;
}

type RequestOutcome =
  | { kind: "response"; response: Response }
  | { kind: "error"; code: "deadline" | "invalid_response" | "network" | "timeout" };

type ContactRead =
  | { kind: "contact"; value: Record<string, unknown>; status: number }
  | { kind: "missing" }
  | Extract<ProviderSnapshot, { kind: "unavailable" }>;

function validateEvidence(value: ProviderConsentEvidence): void {
  if (!isRecord(value)) {
    throw new TypeError("provider consent evidence is invalid");
  }
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== EVIDENCE_KEYS.length ||
    ownKeys.some(
      (key) => typeof key !== "string" || !EVIDENCE_KEYS.includes(key as never),
    )
  ) {
    throw new TypeError("provider consent evidence has invalid keys");
  }
  for (const key of EVIDENCE_KEYS) {
    if (typeof value[key] !== "string" || value[key].length === 0) {
      throw new TypeError("provider consent evidence is invalid");
    }
  }
}

function validateEmail(value: string): void {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > RESEND_OPAQUE_ID_MAX_CODE_UNITS ||
    normalizeNewsletterEmail(value) !== value
  ) {
    throw new TypeError("provider normalized email is invalid");
  }
}

function unavailable(
  code: ReconciliationErrorCode,
  providerStatus?: number,
  observedContactId?: string,
): Extract<ProviderSnapshot, { kind: "unavailable" }> {
  return {
    kind: "unavailable",
    code,
    ...(providerStatus === undefined ? {} : { providerStatus }),
    ...(observedContactId === undefined ? {} : { observedContactId }),
  };
}

function statusError(status: number): ReconciliationErrorCode {
  if (status === 429) return "provider_rate_limited";
  if (status >= 500 && status <= 599) return "provider_5xx";
  if (status >= 400 && status <= 499) return "provider_4xx";
  return "invalid_response";
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

function evidenceState(
  properties: unknown,
  expected: ProviderConsentEvidence,
): ProviderEvidenceState | "invalid" {
  if (!isRecord(properties)) return "invalid";
  let result: ProviderEvidenceState = "matches";
  for (const key of Object.keys(expected) as (keyof ProviderConsentEvidence)[]) {
    if (!(key in properties)) {
      result = "mismatch";
      continue;
    }
    const property = properties[key];
    if (
      !isRecord(property) ||
      property.type !== "string" ||
      typeof property.value !== "string"
    ) {
      return "invalid";
    }
    if (property.value !== expected[key]) result = "mismatch";
  }
  return result;
}

async function parseBoundedObject(response: Response) {
  const parsed = await readResponseJsonLimited(
    response,
    RESEND_PROVIDER_MAX_RESPONSE_BYTES,
  );
  return parsed.ok && isRecord(parsed.value) ? parsed.value : null;
}

export function createResendNewsletterProvider(
  config: ResendNewsletterProviderConfig,
): NewsletterProvider {
  const request = config.request ?? fetchWithTimeout;

  function validatedConfig(): ValidatedConfig {
    assertNewsletterOpaqueValue(
      config.contactsApiKey,
      RESEND_CONTACTS_API_KEY_MAX_CODE_UNITS,
      "Resend Contacts API key",
    );
    assertNewsletterOpaqueValue(
      config.segmentId,
      RESEND_OPAQUE_ID_MAX_CODE_UNITS,
      "Resend Segment identifier",
    );
    assertNewsletterOpaqueValue(
      config.topicId,
      RESEND_OPAQUE_ID_MAX_CODE_UNITS,
      "Resend Topic identifier",
    );
    return {
      contactsApiKey: config.contactsApiKey,
      segmentId: config.segmentId,
      topicId: config.topicId,
    };
  }

  async function send(
    path: string,
    init: RequestInit,
    deadlineMs: number,
  ): Promise<RequestOutcome> {
    const current = config.clock.monotonicNow();
    if (!Number.isFinite(current) || !Number.isFinite(deadlineMs)) {
      return { kind: "error", code: "deadline" };
    }
    const remainingMs = deadlineMs - current;
    if (remainingMs <= RECONCILIATION_D1_MARGIN_MS) {
      return { kind: "error", code: "deadline" };
    }
    const timeoutMs = Math.min(
      RECONCILIATION_MAX_HTTP_MS,
      remainingMs - RECONCILIATION_D1_MARGIN_MS,
    );
    try {
      return {
        kind: "response",
        response: await request(
          `${RESEND_API_ORIGIN}${path}`,
          { ...init, redirect: "error" },
          timeoutMs,
          RESEND_PROVIDER_MAX_RESPONSE_BYTES,
        ),
      };
    } catch (error) {
      if (isAbortError(error)) return { kind: "error", code: "timeout" };
      if (error instanceof RangeError) {
        return { kind: "error", code: "invalid_response" };
      }
      return { kind: "error", code: "network" };
    }
  }

  function headers(
    values: ValidatedConfig,
    withJsonBody = false,
  ): Headers {
    const result = new Headers({
      Accept: "application/json",
      Authorization: `Bearer ${values.contactsApiKey}`,
      "User-Agent": RESEND_USER_AGENT,
    });
    if (withJsonBody) result.set("Content-Type", "application/json");
    return result;
  }

  async function readContact(
    reference: ContactReference,
    deadlineMs: number,
    values: ValidatedConfig,
  ): Promise<ContactRead> {
    const outcome = await send(
      `/contacts/${encodeURIComponent(reference.value)}`,
      { method: "GET", headers: headers(values) },
      deadlineMs,
    );
    if (outcome.kind === "error") return unavailable(outcome.code);
    const { response } = outcome;
    const body = await parseBoundedObject(response);
    if (!body) return unavailable("invalid_response");
    if (!response.ok) {
      if (response.status === 404) return { kind: "missing" };
      return unavailable(statusError(response.status), response.status);
    }
    return { kind: "contact", value: body, status: response.status };
  }

  async function readList(
    path: string,
    deadlineMs: number,
    values: ValidatedConfig,
  ): Promise<
    | { kind: "list"; data: unknown[] }
    | Extract<ProviderSnapshot, { kind: "unavailable" }>
  > {
    const outcome = await send(
      path,
      { method: "GET", headers: headers(values) },
      deadlineMs,
    );
    if (outcome.kind === "error") return unavailable(outcome.code);
    const body = await parseBoundedObject(outcome.response);
    if (!body) return unavailable("invalid_response");
    if (!outcome.response.ok) {
      return unavailable(
        statusError(outcome.response.status),
        outcome.response.status,
      );
    }
    if (
      body.object !== "list" ||
      body.has_more !== false ||
      !Array.isArray(body.data)
    ) {
      return unavailable("invalid_response");
    }
    return { kind: "list", data: body.data };
  }

  async function mutate(
    path: string,
    method: "PATCH" | "POST",
    deadlineMs: number,
    values: ValidatedConfig,
    body: unknown | undefined,
    validateSuccess: (value: Record<string, unknown>) => boolean,
  ): Promise<ProviderMutationResult> {
    const outcome = await send(
      path,
      {
        method,
        headers: headers(values, body !== undefined),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
      deadlineMs,
    );
    if (outcome.kind === "error") {
      if (outcome.code === "network" || outcome.code === "timeout") {
        return { kind: "ambiguous", code: outcome.code };
      }
      return { kind: "failed", code: outcome.code };
    }
    const status = outcome.response.status;
    const parsed = await parseBoundedObject(outcome.response);
    if (!parsed) {
      return outcome.response.ok
        ? {
            kind: "ambiguous",
            code: "invalid_response",
            providerStatus: status,
          }
        : { kind: "failed", code: "invalid_response" };
    }
    if (!outcome.response.ok) {
      const code = statusError(status);
      if (status === 409 || status === 422 || status >= 500) {
        return { kind: "ambiguous", code, providerStatus: status };
      }
      return { kind: "failed", code, providerStatus: status };
    }
    if (!validateSuccess(parsed)) {
      return {
        kind: "ambiguous",
        code: "invalid_response",
        providerStatus: status,
      };
    }
    return { kind: "applied", providerStatus: status };
  }

  return {
    async read(input): Promise<ProviderSnapshot> {
      const values = validatedConfig();
      validateEmail(input.expectedEmailNormalized);
      validateEvidence(input.expectedEvidence);
      if (input.reference.kind === "email") {
        validateEmail(input.reference.value);
      } else {
        assertNewsletterOpaqueValue(
          input.reference.value,
          RESEND_OPAQUE_ID_MAX_CODE_UNITS,
          "Resend Contact identifier",
        );
      }

      let contactResult = await readContact(
        input.reference,
        input.deadlineMs,
        values,
      );
      if (
        contactResult.kind === "missing" &&
        input.reference.kind === "contact-id"
      ) {
        contactResult = await readContact(
          { kind: "email", value: input.expectedEmailNormalized },
          input.deadlineMs,
          values,
        );
      }
      if (contactResult.kind !== "contact") return contactResult;
      const body = contactResult.value;
      if (
        typeof body.id !== "string" ||
        typeof body.email !== "string" ||
        typeof body.unsubscribed !== "boolean"
      ) {
        return unavailable("invalid_response");
      }
      try {
        assertNewsletterOpaqueValue(
          body.id,
          RESEND_OPAQUE_ID_MAX_CODE_UNITS,
          "Resend Contact identifier",
        );
      } catch {
        return unavailable("invalid_response");
      }
      if (normalizeNewsletterEmail(body.email) !== input.expectedEmailNormalized) {
        return unavailable("readback_mismatch");
      }
      if (body.unsubscribed) {
        return {
          kind: "exists",
          contactId: body.id,
          globallyUnsubscribed: true,
          inSegment: false,
          topic: "missing",
          evidence: "mismatch",
        };
      }
      const evidence = evidenceState(body.properties, input.expectedEvidence);
      if (evidence === "invalid") return unavailable("invalid_response");

      const [segmentResult, topicResult] = await Promise.all([
        readList(
          `/contacts/${encodeURIComponent(body.id)}/segments`,
          input.deadlineMs,
          values,
        ),
        readList(
          `/contacts/${encodeURIComponent(body.id)}/topics`,
          input.deadlineMs,
          values,
        ),
      ]);
      if (segmentResult.kind === "unavailable") {
        return { ...segmentResult, observedContactId: body.id };
      }
      if (topicResult.kind === "unavailable") {
        return { ...topicResult, observedContactId: body.id };
      }

      let inSegment = false;
      for (const item of segmentResult.data) {
        if (!isRecord(item) || typeof item.id !== "string") {
          return unavailable("invalid_response", undefined, body.id);
        }
        try {
          assertNewsletterOpaqueValue(
            item.id,
            RESEND_OPAQUE_ID_MAX_CODE_UNITS,
            "Resend Segment identifier",
          );
        } catch {
          return unavailable("invalid_response", undefined, body.id);
        }
        if (item.id === values.segmentId) inSegment = true;
      }

      let topic: "missing" | "opt_in" | "opt_out" = "missing";
      for (const item of topicResult.data) {
        if (
          !isRecord(item) ||
          typeof item.id !== "string" ||
          (item.subscription !== "opt_in" && item.subscription !== "opt_out")
        ) {
          return unavailable("invalid_response", undefined, body.id);
        }
        try {
          assertNewsletterOpaqueValue(
            item.id,
            RESEND_OPAQUE_ID_MAX_CODE_UNITS,
            "Resend Topic identifier",
          );
        } catch {
          return unavailable("invalid_response", undefined, body.id);
        }
        if (item.id === values.topicId) topic = item.subscription;
      }

      return {
        kind: "exists",
        contactId: body.id,
        globallyUnsubscribed: false,
        inSegment,
        topic,
        evidence,
      };
    },

    async createConfirmedContact(input): Promise<ProviderMutationResult> {
      const values = validatedConfig();
      validateEmail(input.emailNormalized);
      validateEvidence(input.evidence);
      return mutate(
        "/contacts",
        "POST",
        input.deadlineMs,
        values,
        {
          email: input.emailNormalized,
          properties: input.evidence,
          segments: [{ id: values.segmentId }],
          topics: [{ id: values.topicId, subscription: "opt_in" }],
        },
        (value) => {
          if (value.object !== "contact" || typeof value.id !== "string") {
            return false;
          }
          try {
            assertNewsletterOpaqueValue(
              value.id,
              RESEND_OPAQUE_ID_MAX_CODE_UNITS,
              "Resend Contact identifier",
            );
            return true;
          } catch {
            return false;
          }
        },
      );
    },

    async updateConsentEvidence(input): Promise<ProviderMutationResult> {
      const values = validatedConfig();
      assertNewsletterOpaqueValue(
        input.contactId,
        RESEND_OPAQUE_ID_MAX_CODE_UNITS,
        "Resend Contact identifier",
      );
      validateEvidence(input.evidence);
      return mutate(
        `/contacts/${encodeURIComponent(input.contactId)}`,
        "PATCH",
        input.deadlineMs,
        values,
        { properties: input.evidence },
        (value) => value.object === "contact" && typeof value.id === "string",
      );
    },

    async addConfiguredSegment(input): Promise<ProviderMutationResult> {
      const values = validatedConfig();
      assertNewsletterOpaqueValue(
        input.contactId,
        RESEND_OPAQUE_ID_MAX_CODE_UNITS,
        "Resend Contact identifier",
      );
      return mutate(
        `/contacts/${encodeURIComponent(input.contactId)}/segments/${encodeURIComponent(values.segmentId)}`,
        "POST",
        input.deadlineMs,
        values,
        undefined,
        (value) => typeof value.id === "string",
      );
    },

    async optIntoConfiguredTopic(input): Promise<ProviderMutationResult> {
      const values = validatedConfig();
      assertNewsletterOpaqueValue(
        input.contactId,
        RESEND_OPAQUE_ID_MAX_CODE_UNITS,
        "Resend Contact identifier",
      );
      return mutate(
        `/contacts/${encodeURIComponent(input.contactId)}/topics`,
        "PATCH",
        input.deadlineMs,
        values,
        [{ id: values.topicId, subscription: "opt_in" }],
        (value) =>
          value.object === "contact_topics" && typeof value.id === "string",
      );
    },
  };
}
