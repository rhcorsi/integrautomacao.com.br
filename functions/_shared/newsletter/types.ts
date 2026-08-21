export const CONSENT_POLICY_VERSION = "2026-07-13";

export const CONSENT_TEXT =
  "Concordo em receber a newsletter Integra Ação e com o tratamento dos meus dados conforme a Política de Privacidade. Posso cancelar a inscrição a qualquer momento.";

export const TOKEN_TTL_MS = 24 * 60 * 60 * 1_000;
export const UNDELIVERED_STALE_MS = 15 * 60 * 1_000;
export const PENDING_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;

export interface ConfirmationToken {
  raw: string;
  sha256: string;
}

export interface RegisterPendingInput {
  subscriptionId: string;
  tokenId: string;
  tokenSha256: string;
  name: string;
  email: string;
  policyVersion: string;
  consentText: string;
  consentSource: string;
  requestId: string;
  now: Date;
}

export type RegisterPendingResult =
  | { kind: "send"; subscriptionId: string; tokenId: string }
  | { kind: "stored" };

export interface NewsletterPendingStore {
  registerPending(input: RegisterPendingInput): Promise<RegisterPendingResult>;
  markConfirmationEmailSent(
    tokenId: string,
    providerMessageId: string,
    now: Date,
  ): Promise<boolean>;
  markConfirmationEmailFailed(
    tokenId: string,
    errorCode: string,
    now: Date,
  ): Promise<boolean>;
  purgeExpiredPending(now: Date, limit?: number): Promise<number>;
}

export interface ConsumeConfirmationInput {
  tokenSha256: string;
  requestId: string;
  now: Date;
}

export type ConsumeConfirmationResult =
  | { kind: "confirmed"; subscriptionId: string }
  | { kind: "already-consumed" }
  | { kind: "expired" }
  | { kind: "invalid" };

export interface NewsletterStore extends NewsletterPendingStore {
  consumeConfirmation(
    input: ConsumeConfirmationInput,
  ): Promise<ConsumeConfirmationResult>;
}

export const RECONCILIATION_LEASE_MS = 30_000;
export const RECONCILIATION_DRAIN_BUDGET_MS = 25_000;
export const RECONCILIATION_MAX_JOBS = 2;
export const RECONCILIATION_D1_MARGIN_MS = 2_000;
export const RECONCILIATION_MAX_HTTP_MS = 4_000;
export const RECONCILIATION_MIN_CLAIM_BUDGET_MS = 10_000;
export const RECONCILIATION_MUTATION_RESERVE_MS = 14_000;
export const RECONCILIATION_RETRY_MINUTES = [1, 5, 15, 60, 360] as const;
export const RESEND_PROVIDER_MAX_RESPONSE_BYTES = 32 * 1_024;
export const NEWSLETTER_INTERNAL_ID_MAX_CODE_UNITS = 512;
export const RESEND_OPAQUE_ID_MAX_CODE_UNITS = 512;
export const RESEND_CONTACTS_API_KEY_MAX_CODE_UNITS = 4_096;

const OPAQUE_CONTROL_PATTERN = /[\u0000-\u001f\u007f-\u009f]/;

export function assertNewsletterOpaqueValue(
  value: unknown,
  maximumCodeUnits: number,
  label = "newsletter identifier",
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maximumCodeUnits ||
    value !== value.trim() ||
    OPAQUE_CONTROL_PATTERN.test(value)
  ) {
    throw new TypeError(`${label} is invalid`);
  }
}

export interface ProviderConsentEvidence {
  newsletter_consent_at: string;
  newsletter_policy_version: string;
  newsletter_consent_text: string;
  newsletter_consent_source: string;
}

export interface ReconciliationClock {
  wallNow(): Date;
  monotonicNow(): number;
}

export type ReconciliationErrorCode =
  | "configuration"
  | "deadline"
  | "network"
  | "timeout"
  | "provider_rate_limited"
  | "provider_4xx"
  | "provider_5xx"
  | "invalid_response"
  | "readback_mismatch";

export interface ReconciliationJob {
  id: string;
  subscriptionId: string;
  attempt: number;
  leaseUntil: string;
  emailNormalized: string;
  confirmedAt: string;
  policyVersion: string;
  consentText: string;
  consentSource: string;
  providerContactId: string | null;
}

export interface ClaimReconciliationJobInput {
  now: Date;
  preferredSubscriptionId?: string;
}

export interface ReconciliationTransitionInput {
  jobId: string;
  attempt: number;
  requestId: string;
  now: Date;
}

export interface NewsletterReconciliationStore extends NewsletterStore {
  claimReconciliationJob(
    input: ClaimReconciliationJobInput,
  ): Promise<ReconciliationJob | null>;
  markProviderReconciled(
    input: ReconciliationTransitionInput & { providerContactId: string },
  ): Promise<boolean>;
  markProviderGlobalOptOut(
    input: ReconciliationTransitionInput & { providerContactId: string },
  ): Promise<boolean>;
  rescheduleReconciliation(
    input: ReconciliationTransitionInput & {
      errorCode: ReconciliationErrorCode;
      observedContactId?: string;
    },
  ): Promise<boolean>;
}

export function normalizeNewsletterEmail(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
}
