import {
  NEWSLETTER_INTERNAL_ID_MAX_CODE_UNITS,
  PENDING_RETENTION_MS,
  RECONCILIATION_LEASE_MS,
  RECONCILIATION_RETRY_MINUTES,
  TOKEN_TTL_MS,
  UNDELIVERED_STALE_MS,
  assertNewsletterOpaqueValue,
  type ClaimReconciliationJobInput,
  type ConsumeConfirmationInput,
  type ConsumeConfirmationResult,
  type NewsletterReconciliationStore,
  type RegisterPendingInput,
  type RegisterPendingResult,
  type ReconciliationErrorCode,
  type ReconciliationJob,
  type ReconciliationTransitionInput,
  normalizeNewsletterEmail,
} from "./types";

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const RAW_TOKEN_SUBSTRING_PATTERN = /[A-Za-z0-9_-]{43}/;
const SHA256_SUBSTRING_PATTERN = /[0-9a-f]{64}/i;
const PROVIDER_MESSAGE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const ERROR_CODE_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const RECONCILIATION_ERROR_CODES = new Set<ReconciliationErrorCode>([
  "configuration",
  "deadline",
  "network",
  "timeout",
  "provider_rate_limited",
  "provider_4xx",
  "provider_5xx",
  "invalid_response",
  "readback_mismatch",
]);

function instantToIso(value: Date, label: string): { iso: string; milliseconds: number } {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new TypeError(`${label} must be a valid Date`);
  }

  return { iso: value.toISOString(), milliseconds: value.getTime() };
}

function millisecondsToIso(value: number, label: string): string {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be a valid Date`);
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new TypeError(`${label} must be a valid Date`);
  }

  return date.toISOString();
}

function sanitizeProviderMessageId(value: string): string {
  const normalized = value.normalize("NFKC").trim();
  if (
    !PROVIDER_MESSAGE_ID_PATTERN.test(normalized) ||
    RAW_TOKEN_SUBSTRING_PATTERN.test(normalized) ||
    SHA256_SUBSTRING_PATTERN.test(normalized)
  ) {
    return "unknown";
  }
  return normalized;
}

function sanitizeErrorCode(value: string): string {
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  return ERROR_CODE_PATTERN.test(normalized) ? normalized : "unknown";
}

export function reconciliationRetryDelayMinutes(attempt: number): number {
  if (!Number.isSafeInteger(attempt) || attempt < 1) {
    throw new TypeError("reconciliation attempt must be a positive integer");
  }
  return RECONCILIATION_RETRY_MINUTES[
    Math.min(attempt - 1, RECONCILIATION_RETRY_MINUTES.length - 1)
  ];
}

function validateReconciliationTransition(
  input: ReconciliationTransitionInput,
): { now: { iso: string; milliseconds: number } } {
  assertNewsletterOpaqueValue(
    input.jobId,
    NEWSLETTER_INTERNAL_ID_MAX_CODE_UNITS,
    "newsletter job identifier",
  );
  if (!Number.isSafeInteger(input.attempt) || input.attempt < 1) {
    throw new TypeError("reconciliation attempt must be a positive integer");
  }
  if (!UUID_V4_PATTERN.test(input.requestId)) {
    throw new TypeError(
      "reconciliation request ID must be a canonical lowercase UUID v4",
    );
  }
  return { now: instantToIso(input.now, "reconciliation now") };
}

export function createNewsletterStore(
  db: D1Database,
): NewsletterReconciliationStore {
  return {
    async registerPending(
      input: RegisterPendingInput,
    ): Promise<RegisterPendingResult> {
      const email = normalizeNewsletterEmail(input.email);
      if (email.length === 0) {
        throw new TypeError("newsletter email must not be empty");
      }
      if (!SHA256_PATTERN.test(input.tokenSha256)) {
        throw new TypeError(
          "newsletter token must be a lowercase 64-hex SHA-256 digest",
        );
      }

      const now = instantToIso(input.now, "registration now");
      const expiresAt = millisecondsToIso(
        now.milliseconds + TOKEN_TTL_MS,
        "registration expiry",
      );
      const staleCutoff = millisecondsToIso(
        now.milliseconds - UNDELIVERED_STALE_MS,
        "registration stale cutoff",
      );
      const ledgerId = `ledger-request-${input.tokenId}`;

      const statements = [
        db
          .prepare(
            `INSERT INTO newsletter_subscriptions (
               id, email_normalized, name, consent_state, policy_version,
               consent_text, consent_source, requested_at, provider_state,
               created_at, updated_at
             ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, 'not_started', ?, ?)
             ON CONFLICT(email_normalized) DO NOTHING`,
          )
          .bind(
            input.subscriptionId,
            email,
            input.name,
            input.policyVersion,
            input.consentText,
            input.consentSource,
            now.iso,
            now.iso,
            now.iso,
          ),
        db
          .prepare(
            `UPDATE newsletter_confirmation_tokens
                SET revoked_at = ?
              WHERE subscription_id = (
                      SELECT id FROM newsletter_subscriptions
                       WHERE email_normalized = ? AND consent_state = 'pending'
                    )
                AND consumed_at IS NULL
                AND revoked_at IS NULL
                AND (
                  expires_at <= ?
                  OR delivery_state = 'failed'
                  OR (delivery_state = 'dispatching' AND created_at <= ?)
                )`,
          )
          .bind(now.iso, email, now.iso, staleCutoff),
        db
          .prepare(
            `UPDATE newsletter_subscriptions AS subscription
                SET name = ?,
                    policy_version = ?,
                    consent_text = ?,
                    consent_source = ?,
                    requested_at = ?,
                    updated_at = ?
              WHERE email_normalized = ?
                AND consent_state = 'pending'
                AND NOT EXISTS (
                  SELECT 1
                    FROM newsletter_confirmation_tokens AS token
                   WHERE token.subscription_id = subscription.id
                     AND token.consumed_at IS NULL
                     AND token.revoked_at IS NULL
                     AND token.expires_at > ?
                )`,
          )
          .bind(
            input.name,
            input.policyVersion,
            input.consentText,
            input.consentSource,
            now.iso,
            now.iso,
            email,
            now.iso,
          ),
        db
          .prepare(
            `INSERT INTO newsletter_consent_ledger (
               id, subscription_id, event_type, occurred_at, request_id,
               policy_version, consent_text, consent_source, metadata_json
             )
             SELECT ?, subscription.id, 'request_received', ?, ?, ?, ?, ?,
                    json_object('token_id', ?)
               FROM newsletter_subscriptions AS subscription
              WHERE subscription.email_normalized = ?
                AND subscription.consent_state = 'pending'
                AND NOT EXISTS (
                  SELECT 1
                    FROM newsletter_confirmation_tokens AS token
                   WHERE token.subscription_id = subscription.id
                     AND token.consumed_at IS NULL
                     AND token.revoked_at IS NULL
                     AND token.expires_at > ?
                )`,
          )
          .bind(
            ledgerId,
            now.iso,
            input.requestId,
            input.policyVersion,
            input.consentText,
            input.consentSource,
            input.tokenId,
            email,
            now.iso,
          ),
        db
          .prepare(
            `INSERT INTO newsletter_confirmation_tokens (
               id, subscription_id, consent_ledger_id, token_sha256,
               created_at, expires_at, delivery_state
             )
             SELECT ?, subscription.id, ?, ?, ?, ?, 'dispatching'
               FROM newsletter_subscriptions AS subscription
              WHERE subscription.email_normalized = ?
                AND subscription.consent_state = 'pending'
                AND NOT EXISTS (
                  SELECT 1
                    FROM newsletter_confirmation_tokens AS token
                   WHERE token.subscription_id = subscription.id
                     AND token.consumed_at IS NULL
                     AND token.revoked_at IS NULL
                     AND token.expires_at > ?
                )
                AND EXISTS (
                  SELECT 1
                    FROM newsletter_consent_ledger AS evidence
                   WHERE evidence.id = ?
                     AND evidence.subscription_id = subscription.id
                     AND evidence.event_type = 'request_received'
                )
             RETURNING subscription_id`,
          )
          .bind(
            input.tokenId,
            ledgerId,
            input.tokenSha256,
            now.iso,
            expiresAt,
            email,
            now.iso,
            ledgerId,
          ),
      ];

      const results = await db.batch<{ subscription_id: string }>(statements);
      const inserted = results[4]?.results[0];

      return inserted
        ? {
            kind: "send",
            subscriptionId: inserted.subscription_id,
            tokenId: input.tokenId,
          }
        : { kind: "stored" };
    },

    async markConfirmationEmailSent(
      tokenId: string,
      providerMessageId: string,
      transitionAt: Date,
    ): Promise<boolean> {
      const now = instantToIso(transitionAt, "delivery now");
      const ledgerId = `ledger-email-sent-${tokenId}`;
      const safeProviderMessageId = sanitizeProviderMessageId(providerMessageId);
      const results = await db.batch([
        db
          .prepare(
            `UPDATE newsletter_confirmation_tokens
                SET delivery_state = 'sent', delivered_at = ?
              WHERE id = ?
                AND delivery_state = 'dispatching'
                AND delivered_at IS NULL
                AND consumed_at IS NULL
                AND revoked_at IS NULL
                AND expires_at > ?`,
          )
          .bind(now.iso, tokenId, now.iso),
        db
          .prepare(
            `INSERT INTO newsletter_consent_ledger (
               id, subscription_id, event_type, occurred_at, request_id,
               policy_version, consent_text, consent_source, metadata_json
             )
             SELECT ?, token.subscription_id, 'confirmation_email_sent', ?, ?,
                    evidence.policy_version, evidence.consent_text,
                    evidence.consent_source,
                    json_object(
                      'token_id', token.id,
                      'provider_message_id', ?
                    )
               FROM newsletter_confirmation_tokens AS token
               JOIN newsletter_consent_ledger AS evidence
                 ON evidence.id = token.consent_ledger_id
              WHERE token.id = ?
                AND changes() = 1
                AND token.delivery_state = 'sent'
                AND token.delivered_at = ?
                AND token.consumed_at IS NULL
                AND token.revoked_at IS NULL`,
          )
          .bind(
            ledgerId,
            now.iso,
            `delivery:${tokenId}`,
            safeProviderMessageId,
            tokenId,
            now.iso,
          ),
      ]);

      return results[0]?.meta.changes === 1;
    },

    async markConfirmationEmailFailed(
      tokenId: string,
      errorCode: string,
      transitionAt: Date,
    ): Promise<boolean> {
      const now = instantToIso(transitionAt, "delivery now");
      const ledgerId = `ledger-email-failed-${tokenId}`;
      const safeErrorCode = sanitizeErrorCode(errorCode);
      const results = await db.batch([
        db
          .prepare(
            `UPDATE newsletter_confirmation_tokens
                SET delivery_state = 'failed', revoked_at = ?
              WHERE id = ?
                AND delivery_state = 'dispatching'
                AND consumed_at IS NULL
                AND revoked_at IS NULL
                AND expires_at > ?`,
          )
          .bind(now.iso, tokenId, now.iso),
        db
          .prepare(
            `INSERT INTO newsletter_consent_ledger (
               id, subscription_id, event_type, occurred_at, request_id,
               policy_version, consent_text, consent_source, metadata_json
             )
             SELECT ?, token.subscription_id, 'confirmation_email_failed', ?, ?,
                    evidence.policy_version, evidence.consent_text,
                    evidence.consent_source,
                    json_object('token_id', token.id, 'error_code', ?)
               FROM newsletter_confirmation_tokens AS token
               JOIN newsletter_consent_ledger AS evidence
                 ON evidence.id = token.consent_ledger_id
              WHERE token.id = ?
                AND changes() = 1
                AND token.delivery_state = 'failed'
                AND token.revoked_at = ?
                AND token.consumed_at IS NULL`,
          )
          .bind(
            ledgerId,
            now.iso,
            `delivery:${tokenId}`,
            safeErrorCode,
            tokenId,
            now.iso,
          ),
      ]);

      return results[0]?.meta.changes === 1;
    },

    async consumeConfirmation(
      input: ConsumeConfirmationInput,
    ): Promise<ConsumeConfirmationResult> {
      if (!SHA256_PATTERN.test(input.tokenSha256)) {
        throw new TypeError(
          "newsletter token must be a lowercase 64-hex SHA-256 digest",
        );
      }
      if (!UUID_V4_PATTERN.test(input.requestId)) {
        throw new TypeError(
          "confirmation request ID must be a canonical lowercase UUID v4",
        );
      }
      const now = instantToIso(input.now, "confirmation now");

      interface ConfirmationClassificationRow {
        consumed_at: string | null;
        revoked_at: string | null;
        expires_at: string;
        delivery_state: string;
        delivered_at: string | null;
        consent_state: string;
        purged_at: string | null;
      }

      const results = await db.batch<
        { subscription_id: string } | ConfirmationClassificationRow
      >([
        db
          .prepare(
            `UPDATE newsletter_confirmation_tokens
                SET consumed_at = ?2,
                    consumption_request_id = ?3
              WHERE token_sha256 = ?1
                AND consumed_at IS NULL
                AND revoked_at IS NULL
                AND expires_at > ?2
                AND (
                  (delivery_state = 'dispatching' AND delivered_at IS NULL)
                  OR (delivery_state = 'sent' AND delivered_at IS NOT NULL)
                )
                AND EXISTS (
                  SELECT 1
                    FROM newsletter_subscriptions AS subscription
                   WHERE subscription.id =
                         newsletter_confirmation_tokens.subscription_id
                     AND subscription.consent_state = 'pending'
                     AND subscription.purged_at IS NULL
                )
             RETURNING subscription_id`,
          )
          .bind(input.tokenSha256, now.iso, input.requestId),
        db
          .prepare(
            `SELECT token.consumed_at,
                    token.revoked_at,
                    token.expires_at,
                    token.delivery_state,
                    token.delivered_at,
                    subscription.consent_state,
                    subscription.purged_at
               FROM newsletter_confirmation_tokens AS token
               JOIN newsletter_subscriptions AS subscription
                 ON subscription.id = token.subscription_id
              WHERE token.token_sha256 = ?1
              LIMIT 1`,
          )
          .bind(input.tokenSha256),
      ]);

      const winner = results[0]?.results[0] as
        | { subscription_id: string }
        | undefined;
      if (winner) {
        return {
          kind: "confirmed",
          subscriptionId: winner.subscription_id,
        };
      }

      const classification = results[1]?.results[0] as
        | ConfirmationClassificationRow
        | undefined;
      if (!classification) return { kind: "invalid" };
      if (classification.consumed_at !== null) {
        return { kind: "already-consumed" };
      }
      if (
        classification.revoked_at !== null ||
        classification.expires_at <= now.iso
      ) {
        return { kind: "expired" };
      }

      throw new Error("newsletter confirmation integrity violation");
    },

    async purgeExpiredPending(
      cleanupAt: Date,
      requestedLimit?: number,
    ): Promise<number> {
      if (requestedLimit !== undefined && !Number.isFinite(requestedLimit)) {
        throw new TypeError("cleanup limit must be finite");
      }
      const limit = Math.min(
        20,
        Math.max(1, Math.trunc(requestedLimit ?? 20)),
      );
      const now = instantToIso(cleanupAt, "cleanup now");
      const cutoff = millisecondsToIso(
        now.milliseconds - PENDING_RETENTION_MS,
        "cleanup cutoff",
      );

      const results = await db.batch([
        db
          .prepare(
            `WITH candidates AS (
               SELECT id, policy_version, consent_text, consent_source
                 FROM newsletter_subscriptions
                WHERE consent_state = 'pending'
                  AND purged_at IS NULL
                  AND requested_at <= ?
                ORDER BY requested_at, id
                LIMIT ?
             )
             INSERT INTO newsletter_consent_ledger (
               id, subscription_id, event_type, occurred_at, request_id,
               policy_version, consent_text, consent_source, metadata_json
             )
             SELECT 'ledger-purge-' || id, id, 'pending_purged', ?,
                    'retention:' || id, policy_version, consent_text,
                    consent_source,
                    json_object('reason', 'pending_retention_30d')
               FROM candidates`,
          )
          .bind(cutoff, limit, now.iso),
        db
          .prepare(
            `WITH candidates AS (
               SELECT id
                 FROM newsletter_subscriptions
                WHERE consent_state = 'pending'
                  AND purged_at IS NULL
                  AND requested_at <= ?
                ORDER BY requested_at, id
                LIMIT ?
             )
             UPDATE newsletter_confirmation_tokens
                SET revoked_at = ?
              WHERE subscription_id IN (SELECT id FROM candidates)
                AND consumed_at IS NULL
                AND revoked_at IS NULL`,
          )
          .bind(cutoff, limit, now.iso),
        db
          .prepare(
            `WITH candidates AS (
               SELECT id
                 FROM newsletter_subscriptions
                WHERE consent_state = 'pending'
                  AND purged_at IS NULL
                  AND requested_at <= ?
                ORDER BY requested_at, id
                LIMIT ?
             )
             UPDATE newsletter_subscriptions
                SET consent_state = 'expired',
                    email_normalized = 'expired+' || id || '@invalid.local',
                    name = '',
                    purged_at = ?,
                    updated_at = ?
              WHERE id IN (SELECT id FROM candidates)
                AND consent_state = 'pending'
                AND purged_at IS NULL
                AND requested_at <= ?
             RETURNING id`,
          )
          .bind(cutoff, limit, now.iso, now.iso, cutoff),
      ]);

      return results[2]?.results.length ?? 0;
    },

    async claimReconciliationJob(
      input: ClaimReconciliationJobInput,
    ): Promise<ReconciliationJob | null> {
      const now = instantToIso(input.now, "reconciliation claim now");
      if (input.preferredSubscriptionId !== undefined) {
        assertNewsletterOpaqueValue(
          input.preferredSubscriptionId,
          NEWSLETTER_INTERNAL_ID_MAX_CODE_UNITS,
          "newsletter subscription identifier",
        );
      }
      const leaseUntil = millisecondsToIso(
        now.milliseconds + RECONCILIATION_LEASE_MS,
        "reconciliation lease",
      );

      interface ClaimRow {
        id: string;
        subscription_id: string;
        attempts: number;
        lease_until: string;
      }

      const claim = await db
        .prepare(
          `UPDATE newsletter_jobs
              SET state = 'leased',
                  lease_until = ?2,
                  attempts = attempts + 1
            WHERE id = (
              SELECT job.id
                FROM newsletter_jobs AS job
                JOIN newsletter_subscriptions AS subscription
                  ON subscription.id = job.subscription_id
               WHERE job.kind = 'resend_reconcile'
                 AND job.available_at <= ?1
                 AND (
                   job.state = 'pending'
                   OR (
                     job.state = 'leased'
                     AND job.lease_until IS NOT NULL
                     AND job.lease_until <= ?1
                   )
                 )
                 AND subscription.consent_state = 'confirmed'
                 AND subscription.provider_state IN ('pending', 'reconciling')
               ORDER BY
                 CASE
                   WHEN ?3 IS NOT NULL AND job.subscription_id = ?3 THEN 0
                   ELSE 1
                 END,
                 job.available_at,
                 job.created_at,
                 job.id
               LIMIT 1
            )
          RETURNING id, subscription_id, attempts, lease_until`,
        )
        .bind(
          now.iso,
          leaseUntil,
          input.preferredSubscriptionId ?? null,
        )
        .first<ClaimRow>();

      if (!claim) return null;
      assertNewsletterOpaqueValue(
        claim.id,
        NEWSLETTER_INTERNAL_ID_MAX_CODE_UNITS,
        "newsletter job identifier",
      );
      assertNewsletterOpaqueValue(
        claim.subscription_id,
        NEWSLETTER_INTERNAL_ID_MAX_CODE_UNITS,
        "newsletter subscription identifier",
      );
      if (!Number.isSafeInteger(claim.attempts) || claim.attempts < 1) {
        throw new Error("newsletter reconciliation claim integrity violation");
      }
      if (claim.lease_until !== leaseUntil) {
        throw new Error("newsletter reconciliation claim integrity violation");
      }

      interface SnapshotRow {
        email_normalized: string;
        confirmed_at: string;
        policy_version: string;
        consent_text: string;
        consent_source: string;
        provider_contact_id: string | null;
      }

      const guarded = await db.batch<SnapshotRow>([
        db
          .prepare(
            `UPDATE newsletter_subscriptions
                SET provider_state = 'reconciling',
                    updated_at = ?
              WHERE id = ?
                AND consent_state = 'confirmed'
                AND confirmed_at IS NOT NULL
                AND provider_state IN ('pending', 'reconciling')
                AND EXISTS (
                  SELECT 1
                    FROM newsletter_jobs AS job
                   WHERE job.id = ?
                     AND job.subscription_id = newsletter_subscriptions.id
                     AND job.state = 'leased'
                     AND job.attempts = ?
                     AND job.lease_until IS NOT NULL
                     AND job.lease_until > ?
                )`,
          )
          .bind(
            now.iso,
            claim.subscription_id,
            claim.id,
            claim.attempts,
            now.iso,
          ),
        db
          .prepare(
            `SELECT subscription.email_normalized,
                    subscription.confirmed_at,
                    subscription.policy_version,
                    subscription.consent_text,
                    subscription.consent_source,
                    subscription.provider_contact_id
               FROM newsletter_subscriptions AS subscription
               JOIN newsletter_jobs AS job
                 ON job.subscription_id = subscription.id
              WHERE changes() = 1
                AND subscription.id = ?
                AND subscription.consent_state = 'confirmed'
                AND subscription.confirmed_at IS NOT NULL
                AND subscription.provider_state = 'reconciling'
                AND job.id = ?
                AND job.state = 'leased'
                AND job.attempts = ?
                AND job.lease_until IS NOT NULL
                AND job.lease_until > ?
              LIMIT 1`,
          )
          .bind(
            claim.subscription_id,
            claim.id,
            claim.attempts,
            now.iso,
          ),
      ]);
      const snapshot = guarded[1]?.results[0];
      if (guarded[0]?.meta.changes !== 1 || !snapshot) {
        throw new Error("newsletter reconciliation claim integrity violation");
      }
      for (const value of [
        snapshot.email_normalized,
        snapshot.confirmed_at,
        snapshot.policy_version,
        snapshot.consent_text,
        snapshot.consent_source,
      ]) {
        if (typeof value !== "string" || value.length === 0) {
          throw new Error("newsletter reconciliation snapshot integrity violation");
        }
      }
      if (snapshot.provider_contact_id !== null) {
        assertNewsletterOpaqueValue(
          snapshot.provider_contact_id,
          NEWSLETTER_INTERNAL_ID_MAX_CODE_UNITS,
          "provider contact identifier",
        );
      }

      return {
        id: claim.id,
        subscriptionId: claim.subscription_id,
        attempt: claim.attempts,
        leaseUntil,
        emailNormalized: snapshot.email_normalized,
        confirmedAt: snapshot.confirmed_at,
        policyVersion: snapshot.policy_version,
        consentText: snapshot.consent_text,
        consentSource: snapshot.consent_source,
        providerContactId: snapshot.provider_contact_id,
      };
    },

    async markProviderReconciled(input): Promise<boolean> {
      const { now } = validateReconciliationTransition(input);
      assertNewsletterOpaqueValue(
        input.providerContactId,
        NEWSLETTER_INTERNAL_ID_MAX_CODE_UNITS,
        "provider contact identifier",
      );
      const ledgerId = `ledger-provider-reconciled-${input.requestId}`;
      const results = await db.batch<{ id: string }>([
        db
          .prepare(
            `UPDATE newsletter_subscriptions
                SET provider_state = 'reconciled',
                    provider_contact_id = ?,
                    reconciled_at = ?,
                    updated_at = ?
              WHERE consent_state = 'confirmed'
                AND provider_state = 'reconciling'
                AND id = (
                  SELECT job.subscription_id
                    FROM newsletter_jobs AS job
                   WHERE job.id = ?
                     AND job.state = 'leased'
                     AND job.attempts = ?
                     AND job.lease_until IS NOT NULL
                     AND job.lease_until > ?
                )`,
          )
          .bind(
            input.providerContactId,
            now.iso,
            now.iso,
            input.jobId,
            input.attempt,
            now.iso,
          ),
        db
          .prepare(
            `INSERT INTO newsletter_consent_ledger (
               id, subscription_id, event_type, occurred_at, request_id,
               policy_version, consent_text, consent_source, metadata_json
             )
             SELECT ?, subscription.id, 'provider_reconciled', ?, ?,
                    subscription.policy_version, subscription.consent_text,
                    subscription.consent_source,
                    json_object('attempt', CAST(? AS INTEGER))
               FROM newsletter_subscriptions AS subscription
               JOIN newsletter_jobs AS job
                 ON job.subscription_id = subscription.id
              WHERE changes() = 1
                AND job.id = ?
                AND job.state = 'leased'
                AND job.attempts = ?
                AND job.lease_until IS NOT NULL
                AND job.lease_until > ?
                AND subscription.consent_state = 'confirmed'
                AND subscription.provider_state = 'reconciled'`,
          )
          .bind(
            ledgerId,
            now.iso,
            input.requestId,
            input.attempt,
            input.jobId,
            input.attempt,
            now.iso,
          ),
        db
          .prepare(
            `UPDATE newsletter_jobs
                SET state = 'completed',
                    lease_until = NULL,
                    last_error_code = NULL,
                    completed_at = ?
              WHERE changes() = 1
                AND id = ?
                AND state = 'leased'
                AND attempts = ?
                AND lease_until IS NOT NULL
                AND lease_until > ?
            RETURNING id`,
          )
          .bind(now.iso, input.jobId, input.attempt, now.iso),
      ]);
      return results[2]?.results.length === 1;
    },

    async markProviderGlobalOptOut(input): Promise<boolean> {
      const { now } = validateReconciliationTransition(input);
      assertNewsletterOpaqueValue(
        input.providerContactId,
        NEWSLETTER_INTERNAL_ID_MAX_CODE_UNITS,
        "provider contact identifier",
      );
      const ledgerId = `ledger-provider-global-opt-out-${input.requestId}`;
      const results = await db.batch<{ id: string }>([
        db
          .prepare(
            `UPDATE newsletter_subscriptions
                SET provider_state = 'blocked_global_opt_out',
                    provider_contact_id = ?,
                    updated_at = ?
              WHERE consent_state = 'confirmed'
                AND provider_state = 'reconciling'
                AND id = (
                  SELECT job.subscription_id
                    FROM newsletter_jobs AS job
                   WHERE job.id = ?
                     AND job.state = 'leased'
                     AND job.attempts = ?
                     AND job.lease_until IS NOT NULL
                     AND job.lease_until > ?
                )`,
          )
          .bind(
            input.providerContactId,
            now.iso,
            input.jobId,
            input.attempt,
            now.iso,
          ),
        db
          .prepare(
            `INSERT INTO newsletter_consent_ledger (
               id, subscription_id, event_type, occurred_at, request_id,
               policy_version, consent_text, consent_source, metadata_json
             )
             SELECT ?, subscription.id, 'provider_global_opt_out', ?, ?,
                    subscription.policy_version, subscription.consent_text,
                    subscription.consent_source,
                    json_object('attempt', CAST(? AS INTEGER))
               FROM newsletter_subscriptions AS subscription
               JOIN newsletter_jobs AS job
                 ON job.subscription_id = subscription.id
              WHERE changes() = 1
                AND job.id = ?
                AND job.state = 'leased'
                AND job.attempts = ?
                AND job.lease_until IS NOT NULL
                AND job.lease_until > ?
                AND subscription.consent_state = 'confirmed'
                AND subscription.provider_state = 'blocked_global_opt_out'`,
          )
          .bind(
            ledgerId,
            now.iso,
            input.requestId,
            input.attempt,
            input.jobId,
            input.attempt,
            now.iso,
          ),
        db
          .prepare(
            `UPDATE newsletter_jobs
                SET state = 'blocked',
                    lease_until = NULL,
                    last_error_code = NULL,
                    completed_at = ?
              WHERE changes() = 1
                AND id = ?
                AND state = 'leased'
                AND attempts = ?
                AND lease_until IS NOT NULL
                AND lease_until > ?
            RETURNING id`,
          )
          .bind(now.iso, input.jobId, input.attempt, now.iso),
      ]);
      return results[2]?.results.length === 1;
    },

    async rescheduleReconciliation(input): Promise<boolean> {
      const { now } = validateReconciliationTransition(input);
      if (!RECONCILIATION_ERROR_CODES.has(input.errorCode)) {
        throw new TypeError("reconciliation error code is invalid");
      }
      if (input.observedContactId !== undefined) {
        assertNewsletterOpaqueValue(
          input.observedContactId,
          NEWSLETTER_INTERNAL_ID_MAX_CODE_UNITS,
          "provider contact identifier",
        );
      }
      const delayMinutes = reconciliationRetryDelayMinutes(input.attempt);
      const availableAt = millisecondsToIso(
        now.milliseconds + delayMinutes * 60_000,
        "reconciliation retry availability",
      );
      const ledgerId = `ledger-provider-retry-${input.requestId}`;
      const results = await db.batch<{ id: string }>([
        db
          .prepare(
            `UPDATE newsletter_subscriptions
                SET provider_state = 'pending',
                    provider_contact_id = COALESCE(?, provider_contact_id),
                    updated_at = ?
              WHERE consent_state = 'confirmed'
                AND provider_state = 'reconciling'
                AND id = (
                  SELECT job.subscription_id
                    FROM newsletter_jobs AS job
                   WHERE job.id = ?
                     AND job.state = 'leased'
                     AND job.attempts = ?
                     AND job.lease_until IS NOT NULL
                     AND job.lease_until > ?
                )`,
          )
          .bind(
            input.observedContactId ?? null,
            now.iso,
            input.jobId,
            input.attempt,
            now.iso,
          ),
        db
          .prepare(
            `INSERT INTO newsletter_consent_ledger (
               id, subscription_id, event_type, occurred_at, request_id,
               policy_version, consent_text, consent_source, metadata_json
             )
             SELECT ?, subscription.id, 'provider_retry_scheduled', ?, ?,
                    subscription.policy_version, subscription.consent_text,
                    subscription.consent_source,
                    json_object(
                      'attempt', CAST(? AS INTEGER),
                      'error_code', ?,
                      'delay_minutes', CAST(? AS INTEGER)
                    )
               FROM newsletter_subscriptions AS subscription
               JOIN newsletter_jobs AS job
                 ON job.subscription_id = subscription.id
              WHERE changes() = 1
                AND job.id = ?
                AND job.state = 'leased'
                AND job.attempts = ?
                AND job.lease_until IS NOT NULL
                AND job.lease_until > ?
                AND subscription.consent_state = 'confirmed'
                AND subscription.provider_state = 'pending'`,
          )
          .bind(
            ledgerId,
            now.iso,
            input.requestId,
            input.attempt,
            input.errorCode,
            delayMinutes,
            input.jobId,
            input.attempt,
            now.iso,
          ),
        db
          .prepare(
            `UPDATE newsletter_jobs
                SET state = 'pending',
                    available_at = ?,
                    lease_until = NULL,
                    last_error_code = ?,
                    completed_at = NULL
              WHERE changes() = 1
                AND id = ?
                AND state = 'leased'
                AND attempts = ?
                AND lease_until IS NOT NULL
                AND lease_until > ?
            RETURNING id`,
          )
          .bind(
            availableAt,
            input.errorCode,
            input.jobId,
            input.attempt,
            now.iso,
          ),
      ]);
      return results[2]?.results.length === 1;
    },
  };
}
