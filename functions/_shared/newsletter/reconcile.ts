import { isRecord, logWorkerEvent } from "../http";
import {
  createResendNewsletterProvider,
  type ContactReference,
  type NewsletterProvider,
  type ProviderMutationResult,
  type ProviderSnapshot,
} from "./provider";
import { createNewsletterStore } from "./store";
import {
  RECONCILIATION_D1_MARGIN_MS,
  RECONCILIATION_DRAIN_BUDGET_MS,
  RECONCILIATION_MAX_JOBS,
  RECONCILIATION_MIN_CLAIM_BUDGET_MS,
  RECONCILIATION_MUTATION_RESERVE_MS,
  RESEND_CONTACTS_API_KEY_MAX_CODE_UNITS,
  RESEND_OPAQUE_ID_MAX_CODE_UNITS,
  assertNewsletterOpaqueValue,
  type NewsletterReconciliationStore,
  type ProviderConsentEvidence,
  type ReconciliationClock,
  type ReconciliationErrorCode,
  type ReconciliationJob,
} from "./types";

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const DEFAULT_CLOCK: ReconciliationClock = {
  wallNow: () => new Date(),
  monotonicNow: () => performance.now(),
};

export interface DrainNewsletterJobsInput {
  runtimeEnv: unknown;
  preferredSubscriptionId?: string;
  limit?: 1 | 2;
  clock?: ReconciliationClock;
}

export interface ReconcileNewsletterJobInput {
  job: ReconciliationJob;
  store: NewsletterReconciliationStore;
  provider: NewsletterProvider;
  requestId: string;
  clock: ReconciliationClock;
  deadlineMs: number;
}

export async function reconcileNewsletterJob(
  input: ReconcileNewsletterJobInput,
): Promise<void> {
  const leaseUntilMs = new Date(input.job.leaseUntil).getTime();
  if (!Number.isFinite(leaseUntilMs) || !UUID_V4_PATTERN.test(input.requestId)) {
    throw new TypeError("reconciliation attempt input is invalid");
  }
  const evidence: ProviderConsentEvidence = {
    newsletter_consent_at: input.job.confirmedAt,
    newsletter_policy_version: input.job.policyVersion,
    newsletter_consent_text: input.job.consentText,
    newsletter_consent_source: input.job.consentSource,
  };
  const reference: ContactReference = input.job.providerContactId
    ? { kind: "contact-id", value: input.job.providerContactId }
    : { kind: "email", value: input.job.emailNormalized };

  function remainingMs(): number {
    const current = input.clock.monotonicNow();
    if (!Number.isFinite(current)) return Number.NEGATIVE_INFINITY;
    return input.deadlineMs - current;
  }

  function transitionNow(): Date | null {
    const now = input.clock.wallNow();
    const milliseconds = now.getTime();
    return Number.isFinite(milliseconds) && milliseconds < leaseUntilMs
      ? now
      : null;
  }

  function safeLog(
    step: string,
    result: string,
    providerStatus?: number,
  ): void {
    logWorkerEvent("warn", "newsletter_provider_reconciliation", {
      requestId: input.requestId,
      attempt: input.job.attempt,
      step,
      result,
      ...(providerStatus === undefined ? {} : { providerStatus }),
    });
  }

  async function retry(
    code: ReconciliationErrorCode,
    observedContactId?: string,
    providerStatus?: number,
  ): Promise<void> {
    if (remainingMs() < RECONCILIATION_D1_MARGIN_MS) return;
    const now = transitionNow();
    if (!now) return;
    const changed = await input.store.rescheduleReconciliation({
      jobId: input.job.id,
      attempt: input.job.attempt,
      requestId: input.requestId,
      now,
      errorCode: code,
      ...(observedContactId === undefined ? {} : { observedContactId }),
    });
    if (!changed) safeLog("retry", "lease_lost", providerStatus);
  }

  async function block(snapshot: Extract<ProviderSnapshot, { kind: "exists" }>) {
    if (remainingMs() < RECONCILIATION_D1_MARGIN_MS) return;
    const now = transitionNow();
    if (!now) return;
    const changed = await input.store.markProviderGlobalOptOut({
      jobId: input.job.id,
      attempt: input.job.attempt,
      requestId: input.requestId,
      now,
      providerContactId: snapshot.contactId,
    });
    if (!changed) safeLog("global_opt_out", "lease_lost");
  }

  async function complete(snapshot: Extract<ProviderSnapshot, { kind: "exists" }>) {
    if (remainingMs() < RECONCILIATION_D1_MARGIN_MS) return;
    const now = transitionNow();
    if (!now) return;
    const changed = await input.store.markProviderReconciled({
      jobId: input.job.id,
      attempt: input.job.attempt,
      requestId: input.requestId,
      now,
      providerContactId: snapshot.contactId,
    });
    if (!changed) safeLog("complete", "lease_lost");
  }

  function canStartMutation(): boolean {
    return (
      remainingMs() >= RECONCILIATION_MUTATION_RESERVE_MS &&
      transitionNow() !== null
    );
  }

  async function read(
    nextReference: ContactReference,
  ): Promise<ProviderSnapshot> {
    if (
      remainingMs() <= RECONCILIATION_D1_MARGIN_MS ||
      transitionNow() === null
    ) {
      return { kind: "unavailable", code: "deadline" };
    }
    try {
      return await input.provider.read({
        reference: nextReference,
        expectedEmailNormalized: input.job.emailNormalized,
        expectedEvidence: evidence,
        deadlineMs: input.deadlineMs,
      });
    } catch {
      return { kind: "unavailable", code: "network" };
    }
  }

  async function mutate(
    operation: () => Promise<ProviderMutationResult>,
  ): Promise<ProviderMutationResult> {
    try {
      return await operation();
    } catch {
      return { kind: "ambiguous", code: "network" };
    }
  }

  async function stopOnDefinitiveFailure(
    result: ProviderMutationResult,
    observedContactId: string,
  ): Promise<boolean> {
    if (
      result.kind === "failed" &&
      (result.code === "provider_rate_limited" ||
        result.code === "provider_4xx" ||
        result.code === "deadline" ||
        result.code === "configuration" ||
        result.code === "invalid_response")
    ) {
      await retry(result.code, observedContactId, result.providerStatus);
      return true;
    }
    return false;
  }

  async function handleNonExisting(
    snapshot: ProviderSnapshot,
  ): Promise<boolean> {
    if (snapshot.kind === "unavailable") {
      await retry(
        snapshot.code,
        snapshot.observedContactId,
        snapshot.providerStatus,
      );
      return false;
    }
    if (snapshot.kind === "missing") {
      await retry("readback_mismatch");
      return false;
    }
    if (snapshot.globallyUnsubscribed) {
      await block(snapshot);
      return false;
    }
    return true;
  }

  let snapshot = await read(reference);
  let freshAfterMutation = false;
  if (snapshot.kind === "unavailable") {
    await retry(
      snapshot.code,
      snapshot.observedContactId,
      snapshot.providerStatus,
    );
    return;
  }
  if (snapshot.kind === "missing") {
    if (!canStartMutation()) {
      await retry("deadline");
      return;
    }
    await mutate(() =>
      input.provider.createConfirmedContact({
        emailNormalized: input.job.emailNormalized,
        evidence,
        deadlineMs: input.deadlineMs,
      }),
    );
    snapshot = await read({ kind: "email", value: input.job.emailNormalized });
    if (!(await handleNonExisting(snapshot))) return;
    if (snapshot.kind !== "exists") return;
    freshAfterMutation = true;
  }

  if (snapshot.globallyUnsubscribed) {
    await block(snapshot);
    return;
  }

  if (snapshot.evidence === "mismatch") {
    if (!canStartMutation()) {
      await retry("deadline", snapshot.contactId);
      return;
    }
    const contactId = snapshot.contactId;
    const mutation = await mutate(() =>
      input.provider.updateConsentEvidence({
        contactId,
        evidence,
        deadlineMs: input.deadlineMs,
      }),
    );
    if (await stopOnDefinitiveFailure(mutation, contactId)) return;
    snapshot = await read({ kind: "contact-id", value: contactId });
    if (!(await handleNonExisting(snapshot))) return;
    if (snapshot.kind !== "exists") return;
    if (snapshot.evidence !== "matches") {
      await retry("readback_mismatch", snapshot.contactId);
      return;
    }
    freshAfterMutation = true;
  }

  if (!snapshot.inSegment) {
    if (!canStartMutation()) {
      await retry("deadline", snapshot.contactId);
      return;
    }
    const contactId = snapshot.contactId;
    const mutation = await mutate(() =>
      input.provider.addConfiguredSegment({
        contactId,
        deadlineMs: input.deadlineMs,
      }),
    );
    if (await stopOnDefinitiveFailure(mutation, contactId)) return;
    snapshot = await read({ kind: "contact-id", value: contactId });
    if (!(await handleNonExisting(snapshot))) return;
    if (snapshot.kind !== "exists") return;
    if (snapshot.evidence !== "matches" || !snapshot.inSegment) {
      await retry("readback_mismatch", snapshot.contactId);
      return;
    }
    freshAfterMutation = true;
  }

  if (snapshot.topic !== "opt_in") {
    if (!freshAfterMutation) {
      snapshot = await read({ kind: "contact-id", value: snapshot.contactId });
      if (!(await handleNonExisting(snapshot))) return;
      if (snapshot.kind !== "exists") return;
      if (snapshot.evidence !== "matches" || !snapshot.inSegment) {
        await retry("readback_mismatch", snapshot.contactId);
        return;
      }
    }
    if (snapshot.topic !== "opt_in") {
      if (!canStartMutation()) {
        await retry("deadline", snapshot.contactId);
        return;
      }
      const contactId = snapshot.contactId;
      const mutation = await mutate(() =>
        input.provider.optIntoConfiguredTopic({
          contactId,
          deadlineMs: input.deadlineMs,
        }),
      );
      if (await stopOnDefinitiveFailure(mutation, contactId)) return;
      snapshot = await read({ kind: "contact-id", value: contactId });
      if (!(await handleNonExisting(snapshot))) return;
      if (snapshot.kind !== "exists") return;
    }
  }

  if (
    snapshot.evidence !== "matches" ||
    !snapshot.inSegment ||
    snapshot.topic !== "opt_in"
  ) {
    await retry("readback_mismatch", snapshot.contactId);
    return;
  }
  await complete(snapshot);
}

export async function drainNewsletterJobs(
  input: DrainNewsletterJobsInput,
): Promise<void> {
  const limit = input.limit ?? RECONCILIATION_MAX_JOBS;
  if (limit !== 1 && limit !== 2) {
    throw new TypeError("reconciliation drain limit must be 1 or 2");
  }
  const clock = input.clock ?? DEFAULT_CLOCK;
  const start = clock.monotonicNow();
  if (!Number.isFinite(start)) {
    throw new TypeError("reconciliation monotonic clock is invalid");
  }
  const deadlineMs = start + RECONCILIATION_DRAIN_BUDGET_MS;
  if (!isRecord(input.runtimeEnv)) return;
  const database = input.runtimeEnv.NEWSLETTER_DB;
  if (
    typeof database !== "object" ||
    database === null ||
    !("prepare" in database) ||
    typeof database.prepare !== "function" ||
    !("batch" in database) ||
    typeof database.batch !== "function"
  ) {
    return;
  }
  const store = createNewsletterStore(database as D1Database);

  function remainingMs(): number {
    const current = clock.monotonicNow();
    return Number.isFinite(current)
      ? deadlineMs - current
      : Number.NEGATIVE_INFINITY;
  }

  function wallNow(): Date | null {
    const now = clock.wallNow();
    return Number.isFinite(now.getTime()) ? now : null;
  }

  function safeLog(
    requestId: string,
    attempt: number,
    step: string,
    result: string,
  ): void {
    logWorkerEvent("warn", "newsletter_provider_reconciliation", {
      requestId,
      attempt,
      step,
      result,
    });
  }

  for (let index = 0; index < limit; index += 1) {
    if (remainingMs() < RECONCILIATION_MIN_CLAIM_BUDGET_MS) break;
    const claimAt = wallNow();
    if (!claimAt) break;
    let job: ReconciliationJob | null;
    try {
      job = await store.claimReconciliationJob({
        now: claimAt,
        ...(index === 0 && input.preferredSubscriptionId !== undefined
          ? { preferredSubscriptionId: input.preferredSubscriptionId }
          : {}),
      });
    } catch {
      return;
    }
    if (!job) break;

    const requestId = crypto.randomUUID();
    if (!UUID_V4_PATTERN.test(requestId)) return;
    let provider: NewsletterProvider;
    try {
      const contactsApiKey = input.runtimeEnv.RESEND_CONTACTS_API_KEY;
      const segmentId = input.runtimeEnv.RESEND_SEGMENT_ID;
      const topicId = input.runtimeEnv.RESEND_TOPIC_ID;
      assertNewsletterOpaqueValue(
        contactsApiKey,
        RESEND_CONTACTS_API_KEY_MAX_CODE_UNITS,
        "Resend Contacts API key",
      );
      assertNewsletterOpaqueValue(
        segmentId,
        RESEND_OPAQUE_ID_MAX_CODE_UNITS,
        "Resend Segment identifier",
      );
      assertNewsletterOpaqueValue(
        topicId,
        RESEND_OPAQUE_ID_MAX_CODE_UNITS,
        "Resend Topic identifier",
      );
      provider = createResendNewsletterProvider({
        contactsApiKey,
        segmentId,
        topicId,
        clock,
      });
    } catch {
      if (remainingMs() >= RECONCILIATION_D1_MARGIN_MS) {
        const retryAt = wallNow();
        if (retryAt && retryAt.getTime() < new Date(job.leaseUntil).getTime()) {
          const changed = await store.rescheduleReconciliation({
            jobId: job.id,
            attempt: job.attempt,
            requestId,
            now: retryAt,
            errorCode: "configuration",
          });
          if (!changed) safeLog(requestId, job.attempt, "configuration", "lease_lost");
        }
      }
      continue;
    }

    try {
      await reconcileNewsletterJob({
        job,
        store,
        provider,
        requestId,
        clock,
        deadlineMs,
      });
    } catch {
      safeLog(requestId, job.attempt, "reconcile", "exception");
    }
  }
}
