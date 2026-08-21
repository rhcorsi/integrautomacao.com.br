import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import {
  generateConfirmationToken,
  hashConfirmationToken,
  isConfirmationToken,
} from "../functions/_shared/newsletter/crypto";
import {
  createNewsletterStore,
  reconciliationRetryDelayMinutes,
} from "../functions/_shared/newsletter/store";
import {
  type ConsumeConfirmationInput,
  PENDING_RETENTION_MS,
  TOKEN_TTL_MS,
  type RegisterPendingInput,
  normalizeNewsletterEmail,
} from "../functions/_shared/newsletter/types";

const NOW = "2026-08-20T12:00:00.000Z";
const LATER = "2026-08-20T12:01:00.000Z";

interface SubscriptionOverrides {
  consentState?: string;
  email?: string;
  id?: string;
  providerState?: string;
}

async function insertSubscription(
  overrides: SubscriptionOverrides = {},
): Promise<void> {
  const id = overrides.id ?? "subscription-1";
  const email = overrides.email ?? `${id}@example.com`;

  await env.NEWSLETTER_DB.prepare(
    `INSERT INTO newsletter_subscriptions (
      id, email_normalized, name, consent_state, policy_version,
      consent_text, consent_source, requested_at, provider_state,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      email,
      "Pessoa Teste",
      overrides.consentState ?? "pending",
      "2026-07-13",
      "Consentimento de teste",
      "newsletter_form",
      NOW,
      overrides.providerState ?? "not_started",
      NOW,
      NOW,
    )
    .run();
}

async function insertToken(
  id: string,
  digestCharacter: string,
  subscriptionId = "subscription-1",
  consentLedgerId = "request-ledger-1",
): Promise<void> {
  await env.NEWSLETTER_DB.prepare(
    `INSERT INTO newsletter_confirmation_tokens (
      id, subscription_id, consent_ledger_id, token_sha256, created_at,
      expires_at, delivery_state, delivered_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'sent', ?)`,
  )
    .bind(
      id,
      subscriptionId,
      consentLedgerId,
      digestCharacter.repeat(64),
      NOW,
      "2026-08-21T12:00:00.000Z",
      NOW,
    )
    .run();
}

interface LedgerOverrides {
  consentSource?: string;
  consentText?: string;
  eventType?: string;
  id?: string;
  policyVersion?: string;
  subscriptionId?: string;
}

async function insertLedgerEvent(
  overrides: LedgerOverrides = {},
): Promise<void> {
  await env.NEWSLETTER_DB.prepare(
    `INSERT INTO newsletter_consent_ledger (
      id, subscription_id, event_type, occurred_at, request_id,
      policy_version, consent_text, consent_source, metadata_json
    ) VALUES (?, ?, ?, ?, 'request-1', ?, ?, ?, '{}')`,
  )
    .bind(
      overrides.id ?? "request-ledger-1",
      overrides.subscriptionId ?? "subscription-1",
      overrides.eventType ?? "request_received",
      NOW,
      overrides.policyVersion ?? "2026-07-13",
      overrides.consentText ?? "Consentimento de teste",
      overrides.consentSource ?? "newsletter_form",
    )
    .run();
}

describe("newsletter pending-domain primitives", () => {
  it("generates a 32-byte unpadded base64url token and its SHA-256 digest", async () => {
    const token = await generateConfirmationToken();
    const paddedBase64 = token.raw.replace(/-/g, "+").replace(/_/g, "/") + "=";
    const decoded = Uint8Array.from(atob(paddedBase64), (character) =>
      character.charCodeAt(0),
    );

    expect(token.raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(decoded).toHaveLength(32);
    expect(token.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(token.sha256).toBe(await hashConfirmationToken(token.raw));
  });

  it("hashes the known SHA-256 vector with lowercase hexadecimal output", async () => {
    expect(await hashConfirmationToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it.each([
    ["valid", "A".repeat(43), true],
    ["padding", `${"A".repeat(42)}=`, false],
    ["too short", "A".repeat(42), false],
    ["too long", "A".repeat(44), false],
    ["invalid alphabet", `${"A".repeat(42)}+`, false],
  ])("validates confirmation token %s", async (_case, value, expected) => {
    expect(isConfirmationToken(value)).toBe(expected);
  });

  it.each([
    ["outer whitespace and ASCII case", "  Person@Example.COM\t", "person@example.com"],
    [
      "NFKC full-width form",
      "  Ｔｅｓｔ＋Ｎｅｗ＠Ｅｘａｍｐｌｅ．ＣＯＭ  ",
      "test+new@example.com",
    ],
  ])("normalizes newsletter identity with %s", (_case, value, expected) => {
    expect(normalizeNewsletterEmail(value)).toBe(expected);
  });
});

function registrationInput(
  overrides: Partial<RegisterPendingInput> = {},
): RegisterPendingInput {
  return {
    subscriptionId: "subscription-pending-1",
    tokenId: "token-pending-1",
    tokenSha256: "1".repeat(64),
    name: "Pessoa Nova",
    email: "Pessoa@Example.com",
    policyVersion: "policy-2026-08",
    consentText: "Consentimento newsletter teste",
    consentSource: "footer_form",
    requestId: "request-pending-1",
    now: new Date(NOW),
    ...overrides,
  };
}

async function selectSubscription(email: string): Promise<Record<string, unknown> | null> {
  return env.NEWSLETTER_DB.prepare(
    "SELECT * FROM newsletter_subscriptions WHERE email_normalized = ?",
  )
    .bind(email)
    .first<Record<string, unknown>>();
}

async function newsletterTextCells(): Promise<
  Array<{ column: string; table: string; value: string }>
> {
  const tables = [
    "newsletter_subscriptions",
    "newsletter_consent_ledger",
    "newsletter_confirmation_tokens",
    "newsletter_jobs",
  ] as const;
  const cells: Array<{ column: string; table: string; value: string }> = [];

  for (const table of tables) {
    const columns = await env.NEWSLETTER_DB.prepare(
      `PRAGMA table_info(${table})`,
    ).all<{ name: string; type: string }>();

    for (const column of columns.results.filter(({ type }) => type === "TEXT")) {
      const values = await env.NEWSLETTER_DB.prepare(
        `SELECT [${column.name}] AS value FROM [${table}] WHERE [${column.name}] IS NOT NULL`,
      ).all<{ value: string }>();
      cells.push(
        ...values.results.map(({ value }) => ({
          column: column.name,
          table,
          value,
        })),
      );
    }
  }

  return cells;
}

const CONFIRM_NOW = "2026-08-20T13:00:00.000Z";
const CONFIRM_REQUEST_ID = "00000000-0000-4000-8000-000000000001";

interface ConfirmationSeed {
  consentSource?: string;
  consentText?: string;
  deliveredAt?: string | null;
  deliveryState?: "dispatching" | "failed" | "sent";
  digest?: string;
  evidenceId?: string;
  expiresAt?: string;
  policyVersion?: string;
  revokedAt?: string | null;
  subscriptionId?: string;
  tokenId?: string;
}

async function seedConfirmationToken(
  seed: ConfirmationSeed = {},
): Promise<{ digest: string; subscriptionId: string; tokenId: string }> {
  const subscriptionId = seed.subscriptionId ?? "consume-subscription";
  const tokenId = seed.tokenId ?? "consume-token";
  const evidenceId = seed.evidenceId ?? `request-${tokenId}`;
  const digest = seed.digest ?? "a".repeat(64);
  const deliveryState = seed.deliveryState ?? "sent";
  const deliveredAt =
    seed.deliveredAt !== undefined
      ? seed.deliveredAt
      : deliveryState === "sent"
        ? NOW
        : null;

  const existing = await env.NEWSLETTER_DB.prepare(
    "SELECT id FROM newsletter_subscriptions WHERE id = ?",
  )
    .bind(subscriptionId)
    .first<{ id: string }>();
  if (!existing) {
    await insertSubscription({ id: subscriptionId });
  }
  await insertLedgerEvent({
    id: evidenceId,
    subscriptionId,
    policyVersion: seed.policyVersion ?? "consume-policy",
    consentText: seed.consentText ?? "Consentimento imutável de consumo",
    consentSource: seed.consentSource ?? "consume_form",
  });
  await env.NEWSLETTER_DB.prepare(
    `INSERT INTO newsletter_confirmation_tokens (
       id, subscription_id, consent_ledger_id, token_sha256, created_at,
       expires_at, delivery_state, delivered_at, revoked_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      tokenId,
      subscriptionId,
      evidenceId,
      digest,
      NOW,
      seed.expiresAt ?? "2026-08-20T14:00:00.000Z",
      deliveryState,
      deliveredAt,
      seed.revokedAt ?? null,
    )
    .run();
  return { digest, subscriptionId, tokenId };
}

function consumeInput(
  overrides: Partial<ConsumeConfirmationInput> = {},
): ConsumeConfirmationInput {
  return {
    tokenSha256: "a".repeat(64),
    requestId: CONFIRM_REQUEST_ID,
    now: new Date(CONFIRM_NOW),
    ...overrides,
  };
}

async function confirmationCounts(subscriptionId: string) {
  const ledger = await env.NEWSLETTER_DB.prepare(
    `SELECT count(*) AS total FROM newsletter_consent_ledger
      WHERE subscription_id = ? AND event_type = 'mailbox_confirmed'`,
  )
    .bind(subscriptionId)
    .first<{ total: number }>();
  const jobs = await env.NEWSLETTER_DB.prepare(
    "SELECT count(*) AS total FROM newsletter_jobs WHERE subscription_id = ?",
  )
    .bind(subscriptionId)
    .first<{ total: number }>();
  return { ledger: ledger?.total ?? -1, jobs: jobs?.total ?? -1 };
}

describe("newsletter one-time confirmation consumption", () => {
  it.each(["sent", "dispatching"] as const)(
    "confirms one live %s token through one two-statement batch",
    async (deliveryState) => {
      const seeded = await seedConfirmationToken({
        deliveryState,
        deliveredAt: deliveryState === "sent" ? NOW : null,
      });
      const realDb = env.NEWSLETTER_DB;
      let prepareCalls = 0;
      let batchCalls = 0;
      let batchSize = 0;
      const observedDb = {
        prepare(query: string) {
          prepareCalls += 1;
          return realDb.prepare(query);
        },
        async batch(statements: D1PreparedStatement[]) {
          batchCalls += 1;
          batchSize = statements.length;
          return realDb.batch(statements);
        },
      } as D1Database;
      const store = createNewsletterStore(observedDb);

      await expect(
        store.consumeConfirmation(consumeInput()),
      ).resolves.toEqual({
        kind: "confirmed",
        subscriptionId: seeded.subscriptionId,
      });
      expect({ prepareCalls, batchCalls, batchSize }).toEqual({
        prepareCalls: 2,
        batchCalls: 1,
        batchSize: 2,
      });
      await expect(
        store.markConfirmationEmailSent(
          seeded.tokenId,
          "message-after-consume",
          new Date("2026-08-20T13:00:01.000Z"),
        ),
      ).resolves.toBe(false);
      await expect(
        store.markConfirmationEmailFailed(
          seeded.tokenId,
          "network",
          new Date("2026-08-20T13:00:01.000Z"),
        ),
      ).resolves.toBe(false);

      const token = await realDb.prepare(
        `SELECT consumed_at, consumption_request_id, delivery_state,
                delivered_at, revoked_at
           FROM newsletter_confirmation_tokens WHERE id = ?`,
      )
        .bind(seeded.tokenId)
        .first<Record<string, unknown>>();
      expect(token).toEqual({
        consumed_at: CONFIRM_NOW,
        consumption_request_id: CONFIRM_REQUEST_ID,
        delivery_state: deliveryState,
        delivered_at: deliveryState === "sent" ? NOW : null,
        revoked_at: null,
      });
      expect(await confirmationCounts(seeded.subscriptionId)).toEqual({
        ledger: 1,
        jobs: 1,
      });
    },
  );

  it("confirms one millisecond before expiry and expires at the exact instant", async () => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    const before = await seedConfirmationToken({
      tokenId: "before-expiry",
      digest: "b".repeat(64),
      expiresAt: CONFIRM_NOW,
    });
    await expect(
      store.consumeConfirmation(
        consumeInput({
          tokenSha256: before.digest,
          now: new Date("2026-08-20T12:59:59.999Z"),
        }),
      ),
    ).resolves.toMatchObject({ kind: "confirmed" });

    await insertSubscription({ id: "exact-expiry-subscription" });
    const exact = await seedConfirmationToken({
      subscriptionId: "exact-expiry-subscription",
      tokenId: "exact-expiry",
      digest: "c".repeat(64),
      expiresAt: CONFIRM_NOW,
    });
    await expect(
      store.consumeConfirmation(
        consumeInput({
          tokenSha256: exact.digest,
          requestId: "00000000-0000-4000-8000-000000000002",
        }),
      ),
    ).resolves.toEqual({ kind: "expired" });
    expect(await confirmationCounts(exact.subscriptionId)).toEqual({
      ledger: 0,
      jobs: 0,
    });
  });

  it("classifies revoked and B2-failed tokens as expired", async () => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    const revoked = await seedConfirmationToken({
      tokenId: "revoked-token",
      digest: "d".repeat(64),
      revokedAt: "2026-08-20T12:30:00.000Z",
    });
    await expect(
      store.consumeConfirmation(
        consumeInput({ tokenSha256: revoked.digest }),
      ),
    ).resolves.toEqual({ kind: "expired" });

    await insertSubscription({ id: "failed-subscription" });
    const failed = await seedConfirmationToken({
      subscriptionId: "failed-subscription",
      tokenId: "failed-token",
      digest: "e".repeat(64),
      deliveryState: "dispatching",
      deliveredAt: null,
    });
    await expect(
      store.markConfirmationEmailFailed(
        failed.tokenId,
        "network",
        new Date("2026-08-20T12:30:00.000Z"),
      ),
    ).resolves.toBe(true);
    await expect(
      store.consumeConfirmation(
        consumeInput({ tokenSha256: failed.digest }),
      ),
    ).resolves.toEqual({ kind: "expired" });
  });

  it.each([
    ["failed without revocation", "failed", null],
    ["sent without delivered_at", "sent", null],
  ] as const)(
    "rejects corrupt live state: %s",
    async (_label, deliveryState, deliveredAt) => {
      const seeded = await seedConfirmationToken({
        deliveryState,
        deliveredAt,
      });
      const store = createNewsletterStore(env.NEWSLETTER_DB);

      await expect(
        store.consumeConfirmation(consumeInput()),
      ).rejects.toThrow(/integrity/i);
      const token = await env.NEWSLETTER_DB.prepare(
        `SELECT consumed_at, consumption_request_id, revoked_at
           FROM newsletter_confirmation_tokens WHERE id = ?`,
      )
        .bind(seeded.tokenId)
        .first<Record<string, unknown>>();
      expect(token).toEqual({
        consumed_at: null,
        consumption_request_id: null,
        revoked_at: null,
      });
      expect(await confirmationCounts(seeded.subscriptionId)).toEqual({
        ledger: 0,
        jobs: 0,
      });
    },
  );

  it("returns invalid for an unknown digest", async () => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    await expect(
      store.consumeConfirmation(consumeInput()),
    ).resolves.toEqual({ kind: "invalid" });
  });

  it("returns replay before and after expiry without changing original evidence", async () => {
    const seeded = await seedConfirmationToken({
      expiresAt: "2026-08-20T13:00:01.000Z",
    });
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    await expect(
      store.consumeConfirmation(consumeInput()),
    ).resolves.toMatchObject({ kind: "confirmed" });
    await expect(
      store.consumeConfirmation(
        consumeInput({
          requestId: "00000000-0000-4000-8000-000000000002",
          now: new Date("2026-08-20T13:00:00.500Z"),
        }),
      ),
    ).resolves.toEqual({ kind: "already-consumed" });
    await expect(
      store.consumeConfirmation(
        consumeInput({
          requestId: "00000000-0000-4000-8000-000000000003",
          now: new Date("2026-08-20T13:00:02.000Z"),
        }),
      ),
    ).resolves.toEqual({ kind: "already-consumed" });

    const token = await env.NEWSLETTER_DB.prepare(
      `SELECT consumed_at, consumption_request_id
         FROM newsletter_confirmation_tokens WHERE id = ?`,
    )
      .bind(seeded.tokenId)
      .first<Record<string, unknown>>();
    expect(token).toEqual({
      consumed_at: CONFIRM_NOW,
      consumption_request_id: CONFIRM_REQUEST_ID,
    });
    expect(await confirmationCounts(seeded.subscriptionId)).toEqual({
      ledger: 1,
      jobs: 1,
    });
  });

  it("serializes concurrent replay to one confirmed and one already-consumed", async () => {
    const seeded = await seedConfirmationToken();
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    const results = await Promise.all([
      store.consumeConfirmation(consumeInput()),
      store.consumeConfirmation(
        consumeInput({
          requestId: "00000000-0000-4000-8000-000000000002",
        }),
      ),
    ]);

    expect(results.map(({ kind }) => kind).sort()).toEqual([
      "already-consumed",
      "confirmed",
    ]);
    expect(await confirmationCounts(seeded.subscriptionId)).toEqual({
      ledger: 1,
      jobs: 1,
    });
  });

  it("lets one of two sibling tokens win and restores the winner evidence", async () => {
    const first = await seedConfirmationToken({
      tokenId: "sibling-a",
      digest: "1".repeat(64),
      policyVersion: "policy-a",
      consentText: "Consentimento A",
      consentSource: "source-a",
    });
    const second = await seedConfirmationToken({
      tokenId: "sibling-b",
      digest: "2".repeat(64),
      evidenceId: "request-sibling-b",
      policyVersion: "policy-b",
      consentText: "Consentimento B",
      consentSource: "source-b",
    });
    await env.NEWSLETTER_DB.prepare(
      `UPDATE newsletter_subscriptions
          SET policy_version = 'mutated', consent_text = 'Mutated',
              consent_source = 'mutated'
        WHERE id = ?`,
    )
      .bind(first.subscriptionId)
      .run();
    const store = createNewsletterStore(env.NEWSLETTER_DB);

    const results = await Promise.all([
      store.consumeConfirmation(
        consumeInput({ tokenSha256: first.digest }),
      ),
      store.consumeConfirmation(
        consumeInput({
          tokenSha256: second.digest,
          requestId: "00000000-0000-4000-8000-000000000002",
        }),
      ),
    ]);
    expect(results.map(({ kind }) => kind).sort()).toEqual([
      "confirmed",
      "expired",
    ]);

    const consumed = await env.NEWSLETTER_DB.prepare(
      `SELECT token.id, evidence.policy_version, evidence.consent_text,
              evidence.consent_source
         FROM newsletter_confirmation_tokens AS token
         JOIN newsletter_consent_ledger AS evidence
           ON evidence.id = token.consent_ledger_id
        WHERE token.consumed_at IS NOT NULL`,
    ).first<Record<string, unknown>>();
    const subscription = await env.NEWSLETTER_DB.prepare(
      `SELECT policy_version, consent_text, consent_source
         FROM newsletter_subscriptions WHERE id = ?`,
    )
      .bind(first.subscriptionId)
      .first<Record<string, unknown>>();
    expect(subscription).toEqual({
      policy_version: consumed!.policy_version,
      consent_text: consumed!.consent_text,
      consent_source: consumed!.consent_source,
    });
    expect(await confirmationCounts(first.subscriptionId)).toEqual({
      ledger: 1,
      jobs: 1,
    });
  });

  it.each(["ledger-id", "job-id", "job-dedupe"] as const)(
    "rolls back every trigger effect on %s collision",
    async (collision) => {
      const seeded = await seedConfirmationToken({ tokenId: `collision-${collision}` });
      await seedConfirmationToken({
        tokenId: `collision-${collision}-sibling`,
        digest: "b".repeat(64),
        evidenceId: `request-collision-${collision}-sibling`,
      });
      if (collision === "ledger-id") {
        await insertLedgerEvent({
          id: `ledger-confirm-${seeded.tokenId}`,
          subscriptionId: seeded.subscriptionId,
          eventType: "artificial_collision",
        });
      } else {
        await env.NEWSLETTER_DB.prepare(
          `INSERT INTO newsletter_jobs (
             id, subscription_id, kind, dedupe_key, state,
             available_at, created_at
           ) VALUES (?, ?, 'resend_reconcile', ?, 'pending', ?, ?)`,
        )
          .bind(
            collision === "job-id"
              ? `job-resend-${seeded.tokenId}`
              : `artificial-job-${seeded.tokenId}`,
            seeded.subscriptionId,
            collision === "job-dedupe"
              ? `resend_reconcile:${seeded.tokenId}`
              : `artificial:${seeded.tokenId}`,
            NOW,
            NOW,
          )
          .run();
      }
      const store = createNewsletterStore(env.NEWSLETTER_DB);

      await expect(
        store.consumeConfirmation(consumeInput()),
      ).rejects.toThrow();
      const tokens = await env.NEWSLETTER_DB.prepare(
        `SELECT id, consumed_at, consumption_request_id, revoked_at
           FROM newsletter_confirmation_tokens ORDER BY id`,
      ).all<Record<string, unknown>>();
      expect(tokens.results).toEqual([
        {
          id: `collision-${collision}`,
          consumed_at: null,
          consumption_request_id: null,
          revoked_at: null,
        },
        {
          id: `collision-${collision}-sibling`,
          consumed_at: null,
          consumption_request_id: null,
          revoked_at: null,
        },
      ]);
      const subscription = await env.NEWSLETTER_DB.prepare(
        `SELECT consent_state, confirmed_at, provider_state
           FROM newsletter_subscriptions WHERE id = ?`,
      )
        .bind(seeded.subscriptionId)
        .first<Record<string, unknown>>();
      expect(subscription).toEqual({
        consent_state: "pending",
        confirmed_at: null,
        provider_state: "not_started",
      });
      expect(await confirmationCounts(seeded.subscriptionId)).toEqual({
        ledger: 0,
        jobs: collision === "ledger-id" ? 0 : 1,
      });
      const artificialLedger = await env.NEWSLETTER_DB.prepare(
        `SELECT count(*) AS total FROM newsletter_consent_ledger
          WHERE id = ? AND event_type = 'artificial_collision'`,
      )
        .bind(`ledger-confirm-${seeded.tokenId}`)
        .first<{ total: number }>();
      expect(artificialLedger?.total).toBe(collision === "ledger-id" ? 1 : 0);
    },
  );

  it.each([
    ["uppercase digest", { tokenSha256: "A".repeat(64) }],
    ["short digest", { tokenSha256: "a".repeat(63) }],
    ["invalid date", { now: new Date(Number.NaN) }],
    ["non-v4 request ID", { requestId: "00000000-0000-5000-8000-000000000001" }],
    ["uppercase request ID", { requestId: "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA" }],
  ])("rejects %s before touching D1", async (_label, overrides) => {
    let touched = false;
    const rejectingDb = {
      prepare() {
        touched = true;
        throw new Error("D1 must not be touched");
      },
      batch() {
        touched = true;
        throw new Error("D1 must not be touched");
      },
    } as unknown as D1Database;
    const store = createNewsletterStore(rejectingDb);

    await expect(
      store.consumeConfirmation(consumeInput(overrides)),
    ).rejects.toThrow(TypeError);
    expect(touched).toBe(false);
  });

  it("keeps confirmation versus cleanup in one coherent state", async () => {
    const requestedAt = new Date(
      new Date(CONFIRM_NOW).getTime() - PENDING_RETENTION_MS,
    ).toISOString();
    const seeded = await seedConfirmationToken();
    await env.NEWSLETTER_DB.prepare(
      "UPDATE newsletter_subscriptions SET requested_at = ? WHERE id = ?",
    )
      .bind(requestedAt, seeded.subscriptionId)
      .run();
    const store = createNewsletterStore(env.NEWSLETTER_DB);

    const [consume, purged] = await Promise.all([
      store.consumeConfirmation(consumeInput()),
      store.purgeExpiredPending(new Date(CONFIRM_NOW)),
    ]);
    expect([
      JSON.stringify([{ kind: "confirmed", subscriptionId: seeded.subscriptionId }, 0]),
      JSON.stringify([{ kind: "expired" }, 1]),
    ]).toContain(JSON.stringify([consume, purged]));
    const state = await env.NEWSLETTER_DB.prepare(
      `SELECT subscription.consent_state, subscription.purged_at,
              token.consumed_at, token.revoked_at
         FROM newsletter_subscriptions AS subscription
         JOIN newsletter_confirmation_tokens AS token
           ON token.subscription_id = subscription.id
        WHERE token.id = ?`,
    )
      .bind(seeded.tokenId)
      .first<Record<string, unknown>>();
    expect([
      {
        consent_state: "confirmed",
        purged_at: null,
        consumed_at: CONFIRM_NOW,
        revoked_at: null,
      },
      {
        consent_state: "expired",
        purged_at: CONFIRM_NOW,
        consumed_at: null,
        revoked_at: CONFIRM_NOW,
      },
    ]).toContainEqual(state);
  });

  it("keeps confirmation versus registration coherent", async () => {
    const seeded = await seedConfirmationToken();
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    const [consume, registration] = await Promise.all([
      store.consumeConfirmation(consumeInput()),
      store.registerPending(
        registrationInput({
          subscriptionId: "unused-registration-subscription",
          tokenId: "unused-registration-token",
          tokenSha256: "f".repeat(64),
          email: `${seeded.subscriptionId}@example.com`,
          now: new Date(CONFIRM_NOW),
        }),
      ),
    ]);
    expect(consume).toEqual({
      kind: "confirmed",
      subscriptionId: seeded.subscriptionId,
    });
    expect(registration).toEqual({ kind: "stored" });
    expect(await confirmationCounts(seeded.subscriptionId)).toEqual({
      ledger: 1,
      jobs: 1,
    });
  });

  it("keeps confirmation versus sent CAS coherent", async () => {
    const seeded = await seedConfirmationToken({
      deliveryState: "dispatching",
      deliveredAt: null,
    });
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    const [consume] = await Promise.all([
      store.consumeConfirmation(consumeInput()),
      store.markConfirmationEmailSent(
        seeded.tokenId,
        "message-race",
        new Date(CONFIRM_NOW),
      ),
    ]);
    expect(consume).toEqual({
      kind: "confirmed",
      subscriptionId: seeded.subscriptionId,
    });
    expect(await confirmationCounts(seeded.subscriptionId)).toEqual({
      ledger: 1,
      jobs: 1,
    });
  });

  it("keeps confirmation versus failed CAS coherent", async () => {
    const seeded = await seedConfirmationToken({
      deliveryState: "dispatching",
      deliveredAt: null,
    });
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    const [consume, failed] = await Promise.all([
      store.consumeConfirmation(consumeInput()),
      store.markConfirmationEmailFailed(
        seeded.tokenId,
        "network",
        new Date(CONFIRM_NOW),
      ),
    ]);
    expect([
      JSON.stringify([{ kind: "confirmed", subscriptionId: seeded.subscriptionId }, false]),
      JSON.stringify([{ kind: "expired" }, true]),
    ]).toContain(JSON.stringify([consume, failed]));
    expect(await confirmationCounts(seeded.subscriptionId)).toEqual({
      ledger: consume.kind === "confirmed" ? 1 : 0,
      jobs: consume.kind === "confirmed" ? 1 : 0,
    });
  });
});

describe("newsletter pending registration", () => {
  it("creates one pending subscription, exact evidence link, and dispatching digest", async () => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    const result = await store.registerPending(
      registrationInput({ email: "  PERSON@Example.COM\t" }),
    );

    expect(result).toEqual({
      kind: "send",
      subscriptionId: "subscription-pending-1",
      tokenId: "token-pending-1",
    });
    expect(await selectSubscription("person@example.com")).toEqual({
      id: "subscription-pending-1",
      email_normalized: "person@example.com",
      name: "Pessoa Nova",
      consent_state: "pending",
      policy_version: "policy-2026-08",
      consent_text: "Consentimento newsletter teste",
      consent_source: "footer_form",
      requested_at: NOW,
      confirmed_at: null,
      provider_state: "not_started",
      provider_contact_id: null,
      reconciled_at: null,
      purged_at: null,
      created_at: NOW,
      updated_at: NOW,
    });

    const token = await env.NEWSLETTER_DB.prepare(
      `SELECT id, subscription_id, consent_ledger_id, token_sha256,
              created_at, expires_at, delivery_state, delivered_at,
              consumed_at, consumption_request_id, revoked_at
         FROM newsletter_confirmation_tokens`,
    ).first<Record<string, unknown>>();
    expect(token).toEqual({
      id: "token-pending-1",
      subscription_id: "subscription-pending-1",
      consent_ledger_id: "ledger-request-token-pending-1",
      token_sha256: "1".repeat(64),
      created_at: NOW,
      expires_at: "2026-08-21T12:00:00.000Z",
      delivery_state: "dispatching",
      delivered_at: null,
      consumed_at: null,
      consumption_request_id: null,
      revoked_at: null,
    });

    const evidence = await env.NEWSLETTER_DB.prepare(
      `SELECT id, subscription_id, event_type, occurred_at, request_id,
              policy_version, consent_text, consent_source, metadata_json
         FROM newsletter_consent_ledger`,
    ).first<Record<string, unknown>>();
    expect(evidence).toEqual({
      id: "ledger-request-token-pending-1",
      subscription_id: "subscription-pending-1",
      event_type: "request_received",
      occurred_at: NOW,
      request_id: "request-pending-1",
      policy_version: "policy-2026-08",
      consent_text: "Consentimento newsletter teste",
      consent_source: "footer_form",
      metadata_json: '{"token_id":"token-pending-1"}',
    });
  });

  it("never persists the raw token and stores its digest only in token_sha256", async () => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    const confirmationToken = await generateConfirmationToken();
    await store.registerPending(
      registrationInput({ tokenSha256: confirmationToken.sha256 }),
    );

    const cells = await newsletterTextCells();
    expect(cells.filter(({ value }) => value.includes(confirmationToken.raw))).toEqual([]);
    expect(cells.filter(({ value }) => value === confirmationToken.sha256)).toEqual([
      {
        table: "newsletter_confirmation_tokens",
        column: "token_sha256",
        value: confirmationToken.sha256,
      },
    ]);
    const metadata = cells
      .filter(({ column }) => column === "metadata_json")
      .map(({ value }) => value);
    expect(metadata).toEqual(['{"token_id":"token-pending-1"}']);
    expect(metadata.join(" ")).not.toContain("Pessoa Nova");
    expect(metadata.join(" ")).not.toContain("pessoa@example.com");
  });

  it("rejects an invalid registration date before writing", async () => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    await expect(
      store.registerPending(registrationInput({ now: new Date(Number.NaN) })),
    ).rejects.toThrow(/valid date/i);
    expect(await selectSubscription("pessoa@example.com")).toBeNull();
  });

  it("rejects a non-lowercase or malformed token digest before writing", async () => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    await expect(
      store.registerPending(registrationInput({ tokenSha256: "A".repeat(64) })),
    ).rejects.toThrow(/sha-256 digest/i);
    expect(await selectSubscription("pessoa@example.com")).toBeNull();
  });

  it("rejects an empty normalized identity before writing", async () => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    await expect(
      store.registerPending(registrationInput({ email: "  \u3000\t" })),
    ).rejects.toThrow(/email/i);
    expect(
      await env.NEWSLETTER_DB.prepare(
        "SELECT count(*) AS total FROM newsletter_subscriptions",
      ).first<{ total: number }>(),
    ).toEqual({ total: 0 });
  });

  it("freezes a young dispatching snapshot and replaces it at exactly 15 minutes", async () => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    await store.registerPending(registrationInput());
    const frozen = await selectSubscription("pessoa@example.com");

    expect(
      await store.registerPending(
        registrationInput({
          tokenId: "token-young",
          tokenSha256: "2".repeat(64),
          name: "Nome que não pode vazar",
          policyVersion: "policy-young",
          consentText: "texto young",
          consentSource: "source-young",
          requestId: "request-young",
          now: new Date("2026-08-20T12:14:59.999Z"),
        }),
      ),
    ).toEqual({ kind: "stored" });
    expect(await selectSubscription("pessoa@example.com")).toEqual(frozen);

    expect(
      await store.registerPending(
        registrationInput({
          tokenId: "token-boundary",
          tokenSha256: "3".repeat(64),
          name: "Nome do limite",
          policyVersion: "policy-boundary",
          consentText: "texto boundary",
          consentSource: "source-boundary",
          requestId: "request-boundary",
          now: new Date("2026-08-20T12:15:00.000Z"),
        }),
      ),
    ).toEqual({
      kind: "send",
      subscriptionId: "subscription-pending-1",
      tokenId: "token-boundary",
    });

    const subscription = await selectSubscription("pessoa@example.com");
    expect(subscription).toEqual(
      expect.objectContaining({
        name: "Nome do limite",
        policy_version: "policy-boundary",
        consent_text: "texto boundary",
        consent_source: "source-boundary",
        requested_at: "2026-08-20T12:15:00.000Z",
        updated_at: "2026-08-20T12:15:00.000Z",
      }),
    );
    const tokens = await env.NEWSLETTER_DB.prepare(
      `SELECT id, revoked_at FROM newsletter_confirmation_tokens ORDER BY id`,
    ).all<{ id: string; revoked_at: string | null }>();
    expect(tokens.results).toEqual([
      { id: "token-boundary", revoked_at: null },
      { id: "token-pending-1", revoked_at: "2026-08-20T12:15:00.000Z" },
    ]);
  });

  it("freezes a sent snapshot until replacing it at exact expiry", async () => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    await store.registerPending(registrationInput());
    await env.NEWSLETTER_DB.prepare(
      `UPDATE newsletter_confirmation_tokens
          SET delivery_state = 'sent', delivered_at = ?
        WHERE id = 'token-pending-1'`,
    )
      .bind("2026-08-20T12:00:01.000Z")
      .run();
    const frozen = await selectSubscription("pessoa@example.com");

    expect(
      await store.registerPending(
        registrationInput({
          tokenId: "token-before-expiry",
          tokenSha256: "2".repeat(64),
          name: "Nome antes",
          now: new Date("2026-08-21T11:59:59.999Z"),
        }),
      ),
    ).toEqual({ kind: "stored" });
    expect(await selectSubscription("pessoa@example.com")).toEqual(frozen);

    expect(
      await store.registerPending(
        registrationInput({
          tokenId: "token-at-expiry",
          tokenSha256: "3".repeat(64),
          name: "Nome no vencimento",
          now: new Date(new Date(NOW).getTime() + TOKEN_TTL_MS),
        }),
      ),
    ).toEqual({
      kind: "send",
      subscriptionId: "subscription-pending-1",
      tokenId: "token-at-expiry",
    });
    expect(await selectSubscription("pessoa@example.com")).toEqual(
      expect.objectContaining({
        name: "Nome no vencimento",
        requested_at: "2026-08-21T12:00:00.000Z",
      }),
    );
  });

  it("treats a confirmed subscription as a complete no-op", async () => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    await store.registerPending(registrationInput());
    await env.NEWSLETTER_DB.prepare(
      `UPDATE newsletter_subscriptions
          SET consent_state = 'confirmed', confirmed_at = ?,
              provider_state = 'pending', updated_at = ?
        WHERE id = 'subscription-pending-1'`,
    )
      .bind(LATER, LATER)
      .run();
    const beforeSubscription = await selectSubscription("pessoa@example.com");
    const beforeCounts = await env.NEWSLETTER_DB.prepare(
      `SELECT
         (SELECT count(*) FROM newsletter_confirmation_tokens) AS tokens,
         (SELECT count(*) FROM newsletter_consent_ledger) AS events`,
    ).first<{ events: number; tokens: number }>();

    expect(
      await store.registerPending(
        registrationInput({
          subscriptionId: "should-not-exist",
          tokenId: "should-not-exist",
          tokenSha256: "2".repeat(64),
          name: "Nome alterado",
          now: new Date("2026-08-20T13:00:00.000Z"),
        }),
      ),
    ).toEqual({ kind: "stored" });
    expect(await selectSubscription("pessoa@example.com")).toEqual(beforeSubscription);
    expect(
      await env.NEWSLETTER_DB.prepare(
        `SELECT
           (SELECT count(*) FROM newsletter_confirmation_tokens) AS tokens,
           (SELECT count(*) FROM newsletter_consent_ledger) AS events`,
      ).first<{ events: number; tokens: number }>(),
    ).toEqual(beforeCounts);
  });

  it("serializes same-email registration to one send, one stored, and one evidence", async () => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    const results = await Promise.all([
      store.registerPending(
        registrationInput({
          subscriptionId: "subscription-race-a",
          tokenId: "token-race-a",
          tokenSha256: "a".repeat(64),
          email: "Race@Example.com",
        }),
      ),
      store.registerPending(
        registrationInput({
          subscriptionId: "subscription-race-b",
          tokenId: "token-race-b",
          tokenSha256: "b".repeat(64),
          email: " race@example.COM ",
        }),
      ),
    ]);

    expect(results.map(({ kind }) => kind).sort()).toEqual(["send", "stored"]);
    const rows = await env.NEWSLETTER_DB.prepare(
      `SELECT
         (SELECT count(*) FROM newsletter_subscriptions) AS subscriptions,
         (SELECT count(*) FROM newsletter_confirmation_tokens
           WHERE consumed_at IS NULL AND revoked_at IS NULL) AS active_tokens,
         (SELECT count(*) FROM newsletter_consent_ledger
           WHERE event_type = 'request_received') AS evidence`,
    ).first<{
      active_tokens: number;
      evidence: number;
      subscriptions: number;
    }>();
    expect(rows).toEqual({ subscriptions: 1, active_tokens: 1, evidence: 1 });
    const link = await env.NEWSLETTER_DB.prepare(
      `SELECT t.id AS token_id, t.consent_ledger_id, l.id AS ledger_id,
              t.subscription_id, l.subscription_id AS ledger_subscription_id
         FROM newsletter_confirmation_tokens t
         JOIN newsletter_consent_ledger l ON l.id = t.consent_ledger_id`,
    ).first<Record<string, unknown>>();
    expect(link).toEqual(
      expect.objectContaining({
        consent_ledger_id: link?.ledger_id,
        subscription_id: link?.ledger_subscription_id,
      }),
    );
  });

  it.each(["ledger", "token"])(
    "rolls back the whole registration on an adversarial %s collision",
    async (collision) => {
      const store = createNewsletterStore(env.NEWSLETTER_DB);
      await insertSubscription({ id: "preexisting" });
      await insertLedgerEvent({
        id: collision === "ledger" ? "ledger-request-collision" : "request-ledger-1",
        subscriptionId: "preexisting",
      });
      if (collision === "token") {
        await insertToken("collision", "c", "preexisting", "request-ledger-1");
      }

      await expect(
        store.registerPending(
          registrationInput({
            subscriptionId: "new-subscription",
            tokenId: "collision",
            tokenSha256: "d".repeat(64),
            email: "new@example.com",
          }),
        ),
      ).rejects.toThrow(collision === "ledger" ? /append-only/i : /retained/i);

      expect(await selectSubscription("new@example.com")).toBeNull();
      const leakedEvidence = await env.NEWSLETTER_DB.prepare(
        `SELECT count(*) AS total FROM newsletter_consent_ledger
          WHERE id = 'ledger-request-collision'
            AND subscription_id = 'new-subscription'`,
      ).first<{ total: number }>();
      expect(leakedEvidence).toEqual({ total: 0 });
    },
  );
});

async function registerDispatching(tokenId = "token-delivery"): Promise<void> {
  const store = createNewsletterStore(env.NEWSLETTER_DB);
  const result = await store.registerPending(
    registrationInput({
      subscriptionId: "subscription-delivery",
      tokenId,
      tokenSha256: tokenId === "token-delivery" ? "4".repeat(64) : "5".repeat(64),
      email: "delivery@example.com",
      name: "Pessoa Delivery",
    }),
  );
  expect(result).toEqual({
    kind: "send",
    subscriptionId: "subscription-delivery",
    tokenId,
  });
}

describe("newsletter confirmation-email delivery CAS", () => {
  it("marks dispatching as sent once and emits one minimized evidence event", async () => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    await registerDispatching();

    expect(
      await store.markConfirmationEmailSent(
        "token-delivery",
        "550e8400-e29b-41d4-a716-446655440000",
        new Date(LATER),
      ),
    ).toBe(true);
    expect(
      await store.markConfirmationEmailSent(
        "token-delivery",
        "replay-must-not-win",
        new Date("2026-08-20T12:02:00.000Z"),
      ),
    ).toBe(false);

    const token = await env.NEWSLETTER_DB.prepare(
      `SELECT delivery_state, delivered_at, consumed_at, revoked_at
         FROM newsletter_confirmation_tokens WHERE id = 'token-delivery'`,
    ).first<Record<string, unknown>>();
    expect(token).toEqual({
      delivery_state: "sent",
      delivered_at: LATER,
      consumed_at: null,
      revoked_at: null,
    });
    const events = await env.NEWSLETTER_DB.prepare(
      `SELECT id, event_type, occurred_at, request_id, policy_version,
              consent_text, consent_source, metadata_json
         FROM newsletter_consent_ledger
        WHERE event_type = 'confirmation_email_sent'`,
    ).all<Record<string, unknown>>();
    expect(events.results).toEqual([
      {
        id: "ledger-email-sent-token-delivery",
        event_type: "confirmation_email_sent",
        occurred_at: LATER,
        request_id: "delivery:token-delivery",
        policy_version: "policy-2026-08",
        consent_text: "Consentimento newsletter teste",
        consent_source: "footer_form",
        metadata_json:
          '{"token_id":"token-delivery","provider_message_id":"550e8400-e29b-41d4-a716-446655440000"}',
      },
    ]);
    expect(events.results[0]?.metadata_json).not.toContain("delivery@example.com");
    expect(events.results[0]?.metadata_json).not.toContain("4".repeat(64));
  });

  it.each([
    ["uppercase raw token after a prefix", `msg_${"A".repeat(43)}`],
    ["lowercase raw token before a suffix", `${"a".repeat(43)}_msg`],
    ["lowercase digest after a prefix", `msg_${"b".repeat(64)}`],
    ["uppercase digest before a suffix", `${"C".repeat(64)}_msg`],
  ])(
    "redacts a provider message ID containing an embedded %s",
    async (_case, unsafeProviderMessageId) => {
      const store = createNewsletterStore(env.NEWSLETTER_DB);
      await registerDispatching();

      expect(
        await store.markConfirmationEmailSent(
          "token-delivery",
          unsafeProviderMessageId,
          new Date(LATER),
        ),
      ).toBe(true);
      const event = await env.NEWSLETTER_DB.prepare(
        `SELECT metadata_json FROM newsletter_consent_ledger
          WHERE event_type = 'confirmation_email_sent'`,
      ).first<{ metadata_json: string }>();
      expect(event).toEqual({
        metadata_json:
          '{"token_id":"token-delivery","provider_message_id":"unknown"}',
      });
      expect(event?.metadata_json).not.toContain(unsafeProviderMessageId);
    },
  );

  it("marks dispatching as failed once and stores only a bounded safe error code", async () => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    await registerDispatching();

    expect(
      await store.markConfirmationEmailFailed(
        "token-delivery",
        "https://provider.invalid/person@example.com/" + "4".repeat(64),
        new Date(LATER),
      ),
    ).toBe(true);
    expect(
      await store.markConfirmationEmailFailed(
        "token-delivery",
        "provider_timeout",
        new Date("2026-08-20T12:02:00.000Z"),
      ),
    ).toBe(false);

    const token = await env.NEWSLETTER_DB.prepare(
      `SELECT delivery_state, delivered_at, consumed_at, revoked_at
         FROM newsletter_confirmation_tokens WHERE id = 'token-delivery'`,
    ).first<Record<string, unknown>>();
    expect(token).toEqual({
      delivery_state: "failed",
      delivered_at: null,
      consumed_at: null,
      revoked_at: LATER,
    });
    const events = await env.NEWSLETTER_DB.prepare(
      `SELECT id, event_type, occurred_at, request_id, policy_version,
              consent_text, consent_source, metadata_json
         FROM newsletter_consent_ledger
        WHERE event_type = 'confirmation_email_failed'`,
    ).all<Record<string, unknown>>();
    expect(events.results).toEqual([
      {
        id: "ledger-email-failed-token-delivery",
        event_type: "confirmation_email_failed",
        occurred_at: LATER,
        request_id: "delivery:token-delivery",
        policy_version: "policy-2026-08",
        consent_text: "Consentimento newsletter teste",
        consent_source: "footer_form",
        metadata_json: '{"token_id":"token-delivery","error_code":"unknown"}',
      },
    ]);
  });

  it("allows exactly one sent-versus-failed terminal transition and matching event", async () => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    await registerDispatching();

    const results = await Promise.all([
      store.markConfirmationEmailSent(
        "token-delivery",
        "resend-message-race",
        new Date(LATER),
      ),
      store.markConfirmationEmailFailed(
        "token-delivery",
        "provider_timeout",
        new Date(LATER),
      ),
    ]);
    expect(results.sort()).toEqual([false, true]);

    const token = await env.NEWSLETTER_DB.prepare(
      `SELECT delivery_state, delivered_at, revoked_at
         FROM newsletter_confirmation_tokens WHERE id = 'token-delivery'`,
    ).first<{
      delivered_at: string | null;
      delivery_state: string;
      revoked_at: string | null;
    }>();
    const events = await env.NEWSLETTER_DB.prepare(
      `SELECT event_type FROM newsletter_consent_ledger
        WHERE event_type IN ('confirmation_email_sent', 'confirmation_email_failed')`,
    ).all<{ event_type: string }>();
    expect(events.results).toHaveLength(1);
    expect(events.results[0]?.event_type).toBe(
      token?.delivery_state === "sent"
        ? "confirmation_email_sent"
        : "confirmation_email_failed",
    );
    expect(token).toEqual(
      token?.delivery_state === "sent"
        ? { delivery_state: "sent", delivered_at: LATER, revoked_at: null }
        : { delivery_state: "failed", delivered_at: null, revoked_at: LATER },
    );
  });

  it.each(["sent", "consumed", "revoked", "expired"])(
    "does not fail an already %s token",
    async (state) => {
      const store = createNewsletterStore(env.NEWSLETTER_DB);
      await registerDispatching();

      if (state === "sent") {
        expect(
          await store.markConfirmationEmailSent(
            "token-delivery",
            "resend-message-existing",
            new Date("2026-08-20T12:00:30.000Z"),
          ),
        ).toBe(true);
      } else if (state === "consumed") {
        await env.NEWSLETTER_DB.prepare(
          `UPDATE newsletter_confirmation_tokens
              SET consumed_at = ?, consumption_request_id = ?
            WHERE id = 'token-delivery'`,
        )
          .bind("2026-08-20T12:00:30.000Z", "consume-before-failure")
          .run();
      } else if (state === "revoked") {
        await env.NEWSLETTER_DB.prepare(
          `UPDATE newsletter_confirmation_tokens SET revoked_at = ?
            WHERE id = 'token-delivery'`,
        )
          .bind("2026-08-20T12:00:30.000Z")
          .run();
      }

      const transitionAt =
        state === "expired"
          ? new Date("2026-08-21T12:00:00.000Z")
          : new Date(LATER);
      expect(
        await store.markConfirmationEmailFailed(
          "token-delivery",
          "provider_timeout",
          transitionAt,
        ),
      ).toBe(false);
      const failedEvents = await env.NEWSLETTER_DB.prepare(
        `SELECT count(*) AS total FROM newsletter_consent_ledger
          WHERE event_type = 'confirmation_email_failed'`,
      ).first<{ total: number }>();
      expect(failedEvents).toEqual({ total: 0 });
    },
  );

  it.each(["failed", "consumed", "revoked", "expired"])(
    "does not send an already %s token",
    async (state) => {
      const store = createNewsletterStore(env.NEWSLETTER_DB);
      await registerDispatching();

      if (state === "failed") {
        expect(
          await store.markConfirmationEmailFailed(
            "token-delivery",
            "provider_timeout",
            new Date("2026-08-20T12:00:30.000Z"),
          ),
        ).toBe(true);
      } else if (state === "consumed") {
        await env.NEWSLETTER_DB.prepare(
          `UPDATE newsletter_confirmation_tokens
              SET consumed_at = ?, consumption_request_id = ?
            WHERE id = 'token-delivery'`,
        )
          .bind("2026-08-20T12:00:30.000Z", "consume-before-success")
          .run();
      } else if (state === "revoked") {
        await env.NEWSLETTER_DB.prepare(
          `UPDATE newsletter_confirmation_tokens SET revoked_at = ?
            WHERE id = 'token-delivery'`,
        )
          .bind("2026-08-20T12:00:30.000Z")
          .run();
      }

      const transitionAt =
        state === "expired"
          ? new Date("2026-08-21T12:00:00.000Z")
          : new Date(LATER);
      expect(
        await store.markConfirmationEmailSent(
          "token-delivery",
          "resend-message-late",
          transitionAt,
        ),
      ).toBe(false);
      const sentEvents = await env.NEWSLETTER_DB.prepare(
        `SELECT count(*) AS total FROM newsletter_consent_ledger
          WHERE event_type = 'confirmation_email_sent'`,
      ).first<{ total: number }>();
      expect(sentEvents).toEqual({ total: 0 });
    },
  );

  it.each(["sent", "failed"])(
    "rolls back the %s CAS when its deterministic ledger ID is pre-corrupted",
    async (transition) => {
      const store = createNewsletterStore(env.NEWSLETTER_DB);
      await registerDispatching();
      const deterministicId =
        transition === "sent"
          ? "ledger-email-sent-token-delivery"
          : "ledger-email-failed-token-delivery";
      await insertLedgerEvent({
        eventType: "preexisting_corruption",
        id: deterministicId,
        subscriptionId: "subscription-delivery",
      });

      const action =
        transition === "sent"
          ? store.markConfirmationEmailSent(
              "token-delivery",
              "resend-message-collision",
              new Date(LATER),
            )
          : store.markConfirmationEmailFailed(
              "token-delivery",
              "provider_timeout",
              new Date(LATER),
            );
      await expect(action).rejects.toThrow(/append-only/i);

      const token = await env.NEWSLETTER_DB.prepare(
        `SELECT delivery_state, delivered_at, revoked_at
           FROM newsletter_confirmation_tokens WHERE id = 'token-delivery'`,
      ).first<Record<string, unknown>>();
      expect(token).toEqual({
        delivery_state: "dispatching",
        delivered_at: null,
        revoked_at: null,
      });
      const corrupt = await env.NEWSLETTER_DB.prepare(
        `SELECT event_type FROM newsletter_consent_ledger WHERE id = ?`,
      )
        .bind(deterministicId)
        .first<{ event_type: string }>();
      expect(corrupt).toEqual({ event_type: "preexisting_corruption" });
    },
  );

  it("rejects invalid delivery instants before writing", async () => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    await registerDispatching();

    await expect(
      store.markConfirmationEmailSent(
        "token-delivery",
        "resend-message-invalid-date",
        new Date(Number.NaN),
      ),
    ).rejects.toThrow(/valid date/i);
    await expect(
      store.markConfirmationEmailFailed(
        "token-delivery",
        "provider_timeout",
        new Date(Number.NaN),
      ),
    ).rejects.toThrow(/valid date/i);
  });
});

interface RetentionCandidateInput {
  consentState?: "confirmed" | "pending";
  email?: string;
  id: string;
  name?: string;
  requestedAt: string;
}

async function insertRetentionCandidate({
  consentState = "pending",
  email,
  id,
  name,
  requestedAt,
}: RetentionCandidateInput): Promise<void> {
  const confirmedAt = consentState === "confirmed" ? requestedAt : null;
  const providerState = consentState === "confirmed" ? "pending" : "not_started";
  await env.NEWSLETTER_DB.prepare(
    `INSERT INTO newsletter_subscriptions (
       id, email_normalized, name, consent_state, policy_version,
       consent_text, consent_source, requested_at, confirmed_at,
       provider_state, created_at, updated_at
     ) VALUES (?, ?, ?, ?, 'retention-policy', 'retention consent',
               'retention-test', ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      email ?? `${id}@example.com`,
      name ?? `Original ${id}`,
      consentState,
      requestedAt,
      confirmedAt,
      providerState,
      requestedAt,
      requestedAt,
    )
    .run();
}

describe("newsletter pending-retention primitive", () => {
  it("purges at exactly 30 days but not one millisecond before the boundary", async () => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    const cleanupNow = new Date(NOW);
    const cutoff = cleanupNow.getTime() - PENDING_RETENTION_MS;
    await insertRetentionCandidate({
      id: "boundary-exact",
      requestedAt: new Date(cutoff).toISOString(),
    });
    await insertRetentionCandidate({
      id: "boundary-young",
      requestedAt: new Date(cutoff + 1).toISOString(),
    });

    expect(await store.purgeExpiredPending(cleanupNow)).toBe(1);
    const rows = await env.NEWSLETTER_DB.prepare(
      `SELECT id, consent_state, email_normalized, name, purged_at, updated_at
         FROM newsletter_subscriptions ORDER BY id`,
    ).all<Record<string, unknown>>();
    expect(rows.results).toEqual([
      {
        id: "boundary-exact",
        consent_state: "expired",
        email_normalized: "expired+boundary-exact@invalid.local",
        name: "",
        purged_at: NOW,
        updated_at: NOW,
      },
      {
        id: "boundary-young",
        consent_state: "pending",
        email_normalized: "boundary-young@example.com",
        name: "Original boundary-young",
        purged_at: null,
        updated_at: "2026-07-21T12:00:00.001Z",
      },
    ]);
    const event = await env.NEWSLETTER_DB.prepare(
      `SELECT id, subscription_id, event_type, occurred_at, request_id,
              policy_version, consent_text, consent_source, metadata_json
         FROM newsletter_consent_ledger WHERE event_type = 'pending_purged'`,
    ).first<Record<string, unknown>>();
    expect(event).toEqual({
      id: "ledger-purge-boundary-exact",
      subscription_id: "boundary-exact",
      event_type: "pending_purged",
      occurred_at: NOW,
      request_id: "retention:boundary-exact",
      policy_version: "retention-policy",
      consent_text: "retention consent",
      consent_source: "retention-test",
      metadata_json: '{"reason":"pending_retention_30d"}',
    });
    expect(event?.metadata_json).not.toContain("boundary-exact@example.com");
    expect(event?.metadata_json).not.toContain("Original boundary-exact");
  });

  it("drains 21 eligible rows as 20 then 1 and remains idempotent", async () => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    const requestedAt = new Date(
      new Date(NOW).getTime() - PENDING_RETENTION_MS,
    ).toISOString();
    for (let index = 0; index < 21; index += 1) {
      await insertRetentionCandidate({
        id: `bulk-${index.toString().padStart(2, "0")}`,
        requestedAt,
      });
    }
    await insertRetentionCandidate({
      id: "confirmed-untouched",
      requestedAt,
      consentState: "confirmed",
    });

    expect(await store.purgeExpiredPending(new Date(NOW))).toBe(20);
    expect(await store.purgeExpiredPending(new Date(NOW))).toBe(1);
    expect(await store.purgeExpiredPending(new Date(NOW))).toBe(0);

    const stateCounts = await env.NEWSLETTER_DB.prepare(
      `SELECT consent_state, count(*) AS total
         FROM newsletter_subscriptions GROUP BY consent_state ORDER BY consent_state`,
    ).all<{ consent_state: string; total: number }>();
    expect(stateCounts.results).toEqual([
      { consent_state: "confirmed", total: 1 },
      { consent_state: "expired", total: 21 },
    ]);
    const events = await env.NEWSLETTER_DB.prepare(
      `SELECT count(*) AS total, count(DISTINCT id) AS distinct_ids
         FROM newsletter_consent_ledger WHERE event_type = 'pending_purged'`,
    ).first<{ distinct_ids: number; total: number }>();
    expect(events).toEqual({ total: 21, distinct_ids: 21 });
    const unsafeExpired = await env.NEWSLETTER_DB.prepare(
      `SELECT count(*) AS total FROM newsletter_subscriptions
        WHERE consent_state = 'expired'
          AND (name <> '' OR email_normalized NOT LIKE 'expired+%@invalid.local')`,
    ).first<{ total: number }>();
    expect(unsafeExpired).toEqual({ total: 0 });
    expect(await selectSubscription("confirmed-untouched@example.com")).toEqual(
      expect.objectContaining({
        consent_state: "confirmed",
        name: "Original confirmed-untouched",
        purged_at: null,
      }),
    );
  });

  it.each([
    ["zero clamps to one", 0, 1],
    ["negative clamps to one", -8, 1],
    ["fraction truncates", 1.9, 1],
    ["large clamps to twenty", 99, 2],
  ])("applies the finite cleanup limit policy: %s", async (_case, limit, expected) => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    const requestedAt = new Date(
      new Date(NOW).getTime() - PENDING_RETENTION_MS,
    ).toISOString();
    await insertRetentionCandidate({ id: "limit-a", requestedAt });
    await insertRetentionCandidate({ id: "limit-b", requestedAt });

    expect(await store.purgeExpiredPending(new Date(NOW), limit)).toBe(expected);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects a non-finite cleanup limit %s before writing",
    async (limit) => {
      const store = createNewsletterStore(env.NEWSLETTER_DB);
      await insertRetentionCandidate({
        id: "invalid-limit",
        requestedAt: new Date(
          new Date(NOW).getTime() - PENDING_RETENTION_MS,
        ).toISOString(),
      });

      await expect(
        store.purgeExpiredPending(new Date(NOW), limit),
      ).rejects.toThrow(/finite/i);
      expect(await selectSubscription("invalid-limit@example.com")).toEqual(
        expect.objectContaining({ consent_state: "pending", purged_at: null }),
      );
    },
  );

  it("rejects an invalid cleanup instant before writing", async () => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    await expect(
      store.purgeExpiredPending(new Date(Number.NaN)),
    ).rejects.toThrow(/valid date/i);
  });

  it("uses one three-statement set-based batch and revokes only live candidate tokens", async () => {
    const preparedSql: string[] = [];
    const batchSizes: number[] = [];
    const instrumentedDb = new Proxy(env.NEWSLETTER_DB, {
      get(target, property) {
        if (property === "prepare") {
          return (query: string) => {
            preparedSql.push(query);
            return target.prepare(query);
          };
        }
        if (property === "batch") {
          return <T>(statements: D1PreparedStatement[]) => {
            batchSizes.push(statements.length);
            return target.batch<T>(statements);
          };
        }
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const store = createNewsletterStore(instrumentedDb);
    const requestedAt = new Date(
      new Date(NOW).getTime() - PENDING_RETENTION_MS,
    ).toISOString();
    await insertRetentionCandidate({ id: "set-based", requestedAt });
    await insertLedgerEvent({
      id: "set-based-evidence",
      subscriptionId: "set-based",
    });
    await insertToken("set-based-token", "6", "set-based", "set-based-evidence");

    expect(await store.purgeExpiredPending(new Date(NOW))).toBe(1);
    expect(batchSizes).toEqual([3]);
    expect(preparedSql).toHaveLength(3);
    for (const query of preparedSql) {
      expect(query).toMatch(/^WITH candidates AS/i);
      expect(query).toContain("ORDER BY requested_at, id");
      expect(query).toContain("LIMIT ?");
    }
    const token = await env.NEWSLETTER_DB.prepare(
      `SELECT consumed_at, revoked_at FROM newsletter_confirmation_tokens
        WHERE id = 'set-based-token'`,
    ).first<{ consumed_at: string | null; revoked_at: string | null }>();
    expect(token).toEqual({ consumed_at: null, revoked_at: NOW });
  });

  it("serializes concurrent cleanup calls without duplicate purge evidence", async () => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    const requestedAt = new Date(
      new Date(NOW).getTime() - PENDING_RETENTION_MS,
    ).toISOString();
    for (let index = 0; index < 5; index += 1) {
      await insertRetentionCandidate({ id: `concurrent-${index}`, requestedAt });
    }

    const results = await Promise.all([
      store.purgeExpiredPending(new Date(NOW)),
      store.purgeExpiredPending(new Date(NOW)),
    ]);
    expect(results.reduce((total, value) => total + value, 0)).toBe(5);
    const events = await env.NEWSLETTER_DB.prepare(
      `SELECT count(*) AS total, count(DISTINCT id) AS distinct_ids
         FROM newsletter_consent_ledger WHERE event_type = 'pending_purged'`,
    ).first<{ distinct_ids: number; total: number }>();
    expect(events).toEqual({ total: 5, distinct_ids: 5 });
  });

  it("keeps renewal-versus-cleanup in one coherent pre- or post-purge state", async () => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    const requestedAt = new Date(
      new Date(NOW).getTime() - PENDING_RETENTION_MS,
    ).toISOString();
    await insertRetentionCandidate({
      id: "renewal-original",
      email: "renewal@example.com",
      requestedAt,
    });

    const [registration, purged] = await Promise.all([
      store.registerPending(
        registrationInput({
          subscriptionId: "renewal-new",
          tokenId: "renewal-token",
          tokenSha256: "7".repeat(64),
          email: " renewal@EXAMPLE.com ",
          name: "Renewed Person",
          now: new Date(NOW),
        }),
      ),
      store.purgeExpiredPending(new Date(NOW)),
    ]);
    expect(registration.kind).toBe("send");
    expect([0, 1]).toContain(purged);

    const rows = await env.NEWSLETTER_DB.prepare(
      `SELECT id, consent_state, email_normalized, name, requested_at, purged_at
         FROM newsletter_subscriptions ORDER BY id`,
    ).all<Record<string, unknown>>();
    if (purged === 0) {
      expect(rows.results).toEqual([
        {
          id: "renewal-original",
          consent_state: "pending",
          email_normalized: "renewal@example.com",
          name: "Renewed Person",
          requested_at: NOW,
          purged_at: null,
        },
      ]);
    } else {
      expect(rows.results).toEqual([
        {
          id: "renewal-new",
          consent_state: "pending",
          email_normalized: "renewal@example.com",
          name: "Renewed Person",
          requested_at: NOW,
          purged_at: null,
        },
        {
          id: "renewal-original",
          consent_state: "expired",
          email_normalized: "expired+renewal-original@invalid.local",
          name: "",
          requested_at: requestedAt,
          purged_at: NOW,
        },
      ]);
    }
    const liveToken = await env.NEWSLETTER_DB.prepare(
      `SELECT token.subscription_id, subscription.consent_state,
              subscription.email_normalized
         FROM newsletter_confirmation_tokens AS token
         JOIN newsletter_subscriptions AS subscription
           ON subscription.id = token.subscription_id
        WHERE token.id = 'renewal-token'
          AND token.consumed_at IS NULL AND token.revoked_at IS NULL`,
    ).first<Record<string, unknown>>();
    expect(liveToken).toEqual(
      expect.objectContaining({
        consent_state: "pending",
        email_normalized: "renewal@example.com",
      }),
    );
  });

  it("keeps conditional confirmation-versus-cleanup atomic with no hybrid", async () => {
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    const requestedAt = new Date(
      new Date(NOW).getTime() - PENDING_RETENTION_MS,
    ).toISOString();
    await insertRetentionCandidate({ id: "confirm-race", requestedAt });
    await insertLedgerEvent({
      id: "confirm-race-evidence",
      subscriptionId: "confirm-race",
    });
    await insertToken(
      "confirm-race-token",
      "8",
      "confirm-race",
      "confirm-race-evidence",
    );

    const [purged, confirmation] = await Promise.all([
      store.purgeExpiredPending(new Date(NOW)),
      env.NEWSLETTER_DB.prepare(
        `UPDATE newsletter_confirmation_tokens
            SET consumed_at = ?, consumption_request_id = ?
          WHERE id = 'confirm-race-token'
            AND consumed_at IS NULL
            AND revoked_at IS NULL
            AND expires_at > ?
        RETURNING id`,
      )
        .bind(NOW, "confirmation-race-request", NOW)
        .first<{ id: string }>(),
    ]);

    const subscription = await env.NEWSLETTER_DB.prepare(
      `SELECT consent_state, email_normalized, name, confirmed_at, purged_at
         FROM newsletter_subscriptions WHERE id = 'confirm-race'`,
    ).first<Record<string, unknown>>();
    const token = await env.NEWSLETTER_DB.prepare(
      `SELECT consumed_at, revoked_at FROM newsletter_confirmation_tokens
        WHERE id = 'confirm-race-token'`,
    ).first<Record<string, unknown>>();
    if (confirmation) {
      expect(purged).toBe(0);
      expect(subscription).toEqual({
        consent_state: "confirmed",
        email_normalized: "confirm-race@example.com",
        name: "Original confirm-race",
        confirmed_at: NOW,
        purged_at: null,
      });
      expect(token).toEqual({ consumed_at: NOW, revoked_at: null });
    } else {
      expect(purged).toBe(1);
      expect(subscription).toEqual({
        consent_state: "expired",
        email_normalized: "expired+confirm-race@invalid.local",
        name: "",
        confirmed_at: null,
        purged_at: NOW,
      });
      expect(token).toEqual({ consumed_at: null, revoked_at: NOW });
    }
  });
});

describe("newsletter D1 schema", () => {
  it("creates the authoritative tables and broadcast view", async () => {
    const rows = await env.NEWSLETTER_DB.prepare(
      "SELECT name, type FROM sqlite_master WHERE name LIKE 'newsletter_%' ORDER BY name",
    ).all<{ name: string; type: string }>();

    expect(rows.results).toEqual(
      expect.arrayContaining([
        { name: "newsletter_broadcast_recipients", type: "view" },
        { name: "newsletter_confirmation_tokens", type: "table" },
        { name: "newsletter_consent_ledger", type: "table" },
        { name: "newsletter_jobs", type: "table" },
        { name: "newsletter_subscriptions", type: "table" },
      ]),
    );
  });

  it("creates the two operational indexes", async () => {
    const rows = await env.NEWSLETTER_DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'newsletter_%' ORDER BY name",
    ).all<{ name: string }>();

    expect(rows.results).toEqual([
      { name: "newsletter_due_jobs" },
      { name: "newsletter_live_tokens" },
    ]);
  });

  it("requires a non-null foreign key to the consent evidence", async () => {
    const columns = await env.NEWSLETTER_DB.prepare(
      "PRAGMA table_info(newsletter_confirmation_tokens)",
    ).all<{ name: string; notnull: number; type: string }>();
    expect(columns.results).toContainEqual(
      expect.objectContaining({
        name: "consent_ledger_id",
        notnull: 1,
        type: "TEXT",
      }),
    );

    const foreignKeys = await env.NEWSLETTER_DB.prepare(
      "PRAGMA foreign_key_list(newsletter_confirmation_tokens)",
    ).all<{ from: string; table: string; to: string }>();
    expect(foreignKeys.results).toContainEqual(
      expect.objectContaining({
        from: "consent_ledger_id",
        table: "newsletter_consent_ledger",
        to: "id",
      }),
    );
  });

  it.each([
    ["consent", "invalid", "not_started"],
    ["provider", "pending", "invalid"],
  ])("rejects an invalid %s state", async (_label, consentState, providerState) => {
    await expect(
      insertSubscription({ consentState, providerState }),
    ).rejects.toThrow(/constraint failed/i);
  });

  it("rejects an invalid SHA-256 digest", async () => {
    await insertSubscription();
    await insertLedgerEvent();

    await expect(insertToken("token-invalid", "g")).rejects.toThrow(
      /constraint failed/i,
    );
  });

  it("rejects an invalid reconciliation job state", async () => {
    await insertSubscription();

    await expect(
      env.NEWSLETTER_DB.prepare(
        `INSERT INTO newsletter_jobs (
          id, subscription_id, kind, dedupe_key, state,
          available_at, created_at
        ) VALUES (
          'job-invalid', 'subscription-1', 'resend_reconcile',
          'resend_reconcile:invalid', 'invalid', ?, ?
        )`,
      )
        .bind(NOW, NOW)
        .run(),
    ).rejects.toThrow(/constraint failed/i);
  });

  it("prevents every mutation of an existing consent-ledger row", async () => {
    await insertSubscription();
    await insertLedgerEvent({ id: "ledger-1" });

    await expect(
      env.NEWSLETTER_DB.prepare(
        "UPDATE newsletter_consent_ledger SET event_type = 'changed' WHERE id = 'ledger-1'",
      ).run(),
    ).rejects.toThrow("append-only");

    await expect(
      env.NEWSLETTER_DB.prepare(
        "DELETE FROM newsletter_consent_ledger WHERE id = 'ledger-1'",
      ).run(),
    ).rejects.toThrow("append-only");

    await expect(
      env.NEWSLETTER_DB.prepare(
        `INSERT OR REPLACE INTO newsletter_consent_ledger (
          id, subscription_id, event_type, occurred_at, request_id, metadata_json
        ) VALUES (
          'ledger-1', 'subscription-1', 'replaced', ?, 'request-2', '{}'
        )`,
      )
        .bind(LATER)
        .run(),
    ).rejects.toThrow("append-only");

    const row = await env.NEWSLETTER_DB.prepare(
      "SELECT event_type, request_id FROM newsletter_consent_ledger WHERE id = 'ledger-1'",
    ).first<{ event_type: string; request_id: string }>();
    expect(row).toEqual({
      event_type: "request_received",
      request_id: "request-1",
    });
  });

  it("rejects cross-subscription, wrong-event, and rebound token evidence", async () => {
    await insertSubscription();
    await insertLedgerEvent({ id: "request-ledger-a" });
    await insertLedgerEvent({ id: "request-ledger-a2" });
    await insertLedgerEvent({
      eventType: "delivery_started",
      id: "wrong-event-ledger",
    });
    await insertSubscription({ id: "subscription-2" });
    await insertLedgerEvent({
      id: "request-ledger-b",
      subscriptionId: "subscription-2",
    });

    await expect(
      insertToken(
        "token-cross-subscription",
        "c",
        "subscription-1",
        "request-ledger-b",
      ),
    ).rejects.toThrow("matching request_received evidence");

    await expect(
      insertToken(
        "token-wrong-event",
        "d",
        "subscription-1",
        "wrong-event-ledger",
      ),
    ).rejects.toThrow("matching request_received evidence");

    await insertToken("token-bound", "e", "subscription-1", "request-ledger-a");
    await expect(
      env.NEWSLETTER_DB.prepare(
        `UPDATE newsletter_confirmation_tokens
            SET consent_ledger_id = 'request-ledger-a2'
          WHERE id = 'token-bound'`,
      ).run(),
    ).rejects.toThrow("evidence binding is immutable");

    await expect(
      env.NEWSLETTER_DB.prepare(
        `UPDATE newsletter_confirmation_tokens
            SET subscription_id = 'subscription-2',
                consent_ledger_id = 'request-ledger-b'
          WHERE id = 'token-bound'`,
      ).run(),
    ).rejects.toThrow("evidence binding is immutable");

    const token = await env.NEWSLETTER_DB.prepare(
      `SELECT subscription_id, consent_ledger_id
         FROM newsletter_confirmation_tokens WHERE id = 'token-bound'`,
    ).first<{ consent_ledger_id: string; subscription_id: string }>();
    expect(token).toEqual({
      subscription_id: "subscription-1",
      consent_ledger_id: "request-ledger-a",
    });
  });

  it("retains token rows against replacement and deletion", async () => {
    await insertSubscription();
    await insertLedgerEvent();
    await insertToken("token-retained", "f");

    await expect(
      env.NEWSLETTER_DB.prepare(
        `INSERT OR REPLACE INTO newsletter_confirmation_tokens (
          id, subscription_id, consent_ledger_id, token_sha256, created_at,
          expires_at, delivery_state, delivered_at
        ) VALUES (
          'token-retained', 'subscription-1', 'request-ledger-1', ?, ?, ?,
          'sent', ?
        )`,
      )
        .bind(
          "0".repeat(64),
          LATER,
          "2026-08-21T12:01:00.000Z",
          LATER,
        )
        .run(),
    ).rejects.toThrow("confirmation token rows are retained");

    await expect(
      env.NEWSLETTER_DB.prepare(
        `INSERT OR REPLACE INTO newsletter_confirmation_tokens (
          id, subscription_id, consent_ledger_id, token_sha256, created_at,
          expires_at, delivery_state, delivered_at
        ) VALUES (
          'token-replacement', 'subscription-1', 'request-ledger-1', ?, ?, ?,
          'sent', ?
        )`,
      )
        .bind(
          "f".repeat(64),
          LATER,
          "2026-08-21T12:01:00.000Z",
          LATER,
        )
        .run(),
    ).rejects.toThrow("confirmation token rows are retained");

    await expect(
      env.NEWSLETTER_DB.prepare(
        "DELETE FROM newsletter_confirmation_tokens WHERE id = 'token-retained'",
      ).run(),
    ).rejects.toThrow("confirmation token rows are retained");

    const tokens = await env.NEWSLETTER_DB.prepare(
      `SELECT id, subscription_id, consent_ledger_id, token_sha256,
              created_at, consumed_at, revoked_at
         FROM newsletter_confirmation_tokens`,
    ).all<{
      consent_ledger_id: string;
      consumed_at: string | null;
      created_at: string;
      id: string;
      revoked_at: string | null;
      subscription_id: string;
      token_sha256: string;
    }>();
    expect(tokens.results).toEqual([
      {
        id: "token-retained",
        subscription_id: "subscription-1",
        consent_ledger_id: "request-ledger-1",
        token_sha256: "f".repeat(64),
        created_at: NOW,
        consumed_at: null,
        revoked_at: null,
      },
    ]);
  });

  it("rolls back confirmation when the reconciliation job ID collides", async () => {
    await insertSubscription();
    await insertLedgerEvent({ id: "request-ledger-a" });
    await insertToken(
      "token-collision",
      "c",
      "subscription-1",
      "request-ledger-a",
    );
    await insertToken(
      "token-collision-sibling",
      "d",
      "subscription-1",
      "request-ledger-a",
    );
    await insertSubscription({ id: "subscription-2" });

    await env.NEWSLETTER_DB.prepare(
      `INSERT INTO newsletter_jobs (
        id, subscription_id, kind, dedupe_key, state, available_at, created_at
      ) VALUES (
        'job-resend-token-collision', 'subscription-2', 'resend_reconcile',
        'resend_reconcile:preexisting', 'pending', ?, ?
      )`,
    )
      .bind(NOW, NOW)
      .run();

    await expect(
      env.NEWSLETTER_DB.prepare(
        `UPDATE newsletter_confirmation_tokens
            SET consumed_at = ?, consumption_request_id = ?
          WHERE id = 'token-collision'
            AND consumed_at IS NULL AND revoked_at IS NULL
        RETURNING id`,
      )
        .bind(LATER, "request-collision")
        .first<{ id: string }>(),
    ).rejects.toThrow(/unique constraint failed/i);

    const subscription = await env.NEWSLETTER_DB.prepare(
      `SELECT consent_state, confirmed_at, provider_state, updated_at
         FROM newsletter_subscriptions WHERE id = 'subscription-1'`,
    ).first<{
      confirmed_at: string | null;
      consent_state: string;
      provider_state: string;
      updated_at: string;
    }>();
    expect(subscription).toEqual({
      consent_state: "pending",
      confirmed_at: null,
      provider_state: "not_started",
      updated_at: NOW,
    });

    const tokens = await env.NEWSLETTER_DB.prepare(
      `SELECT id, consumed_at, consumption_request_id, revoked_at
         FROM newsletter_confirmation_tokens ORDER BY id`,
    ).all<{
      consumed_at: string | null;
      consumption_request_id: string | null;
      id: string;
      revoked_at: string | null;
    }>();
    expect(tokens.results).toEqual([
      {
        id: "token-collision",
        consumed_at: null,
        consumption_request_id: null,
        revoked_at: null,
      },
      {
        id: "token-collision-sibling",
        consumed_at: null,
        consumption_request_id: null,
        revoked_at: null,
      },
    ]);

    const ledger = await env.NEWSLETTER_DB.prepare(
      `SELECT id, event_type FROM newsletter_consent_ledger
        WHERE subscription_id = 'subscription-1' ORDER BY id`,
    ).all<{ event_type: string; id: string }>();
    expect(ledger.results).toEqual([
      { id: "request-ledger-a", event_type: "request_received" },
    ]);

    const jobs = await env.NEWSLETTER_DB.prepare(
      `SELECT id, subscription_id, dedupe_key
         FROM newsletter_jobs ORDER BY id`,
    ).all<{ dedupe_key: string; id: string; subscription_id: string }>();
    expect(jobs.results).toEqual([
      {
        id: "job-resend-token-collision",
        subscription_id: "subscription-2",
        dedupe_key: "resend_reconcile:preexisting",
      },
    ]);
  });

  it("atomically confirms one token and creates one reconciliation job", async () => {
    await insertSubscription();
    await insertLedgerEvent({
      consentSource: "source-a",
      consentText: "Consentimento A",
      id: "request-ledger-a",
      policyVersion: "policy-a",
    });
    await insertToken("token-primary", "a", "subscription-1", "request-ledger-a");
    await insertToken("token-sibling", "b", "subscription-1", "request-ledger-a");

    await env.NEWSLETTER_DB.prepare(
      `UPDATE newsletter_subscriptions
          SET policy_version = 'policy-b', consent_text = 'Consentimento B',
              consent_source = 'source-b', updated_at = ?
        WHERE id = 'subscription-1'`,
    )
      .bind("2026-08-20T12:00:30.000Z")
      .run();

    const consume = await env.NEWSLETTER_DB.prepare(
      `UPDATE newsletter_confirmation_tokens
          SET consumed_at = ?, consumption_request_id = ?
        WHERE id = 'token-primary'
          AND consumed_at IS NULL AND revoked_at IS NULL
      RETURNING id`,
    )
      .bind(LATER, "request-confirm-1")
      .first<{ id: string }>();
    expect(consume).toEqual({ id: "token-primary" });

    const replay = await env.NEWSLETTER_DB.prepare(
      `UPDATE newsletter_confirmation_tokens
          SET consumed_at = ?, consumption_request_id = ?
        WHERE id = 'token-primary'
          AND consumed_at IS NULL AND revoked_at IS NULL
      RETURNING id`,
    )
      .bind("2026-08-20T12:02:00.000Z", "request-replay")
      .first<{ id: string }>();
    expect(replay).toBeNull();

    const consumedToken = await env.NEWSLETTER_DB.prepare(
      `SELECT consumed_at, consumption_request_id
         FROM newsletter_confirmation_tokens WHERE id = 'token-primary'`,
    ).first<{
      consumed_at: string;
      consumption_request_id: string;
    }>();
    expect(consumedToken).toEqual({
      consumed_at: LATER,
      consumption_request_id: "request-confirm-1",
    });

    const subscription = await env.NEWSLETTER_DB.prepare(
      `SELECT consent_state, confirmed_at, provider_state, policy_version,
              consent_text, consent_source, updated_at
         FROM newsletter_subscriptions WHERE id = 'subscription-1'`,
    ).first<{
      confirmed_at: string;
      consent_source: string;
      consent_state: string;
      consent_text: string;
      policy_version: string;
      provider_state: string;
      updated_at: string;
    }>();
    expect(subscription).toEqual({
      consent_state: "confirmed",
      confirmed_at: LATER,
      provider_state: "pending",
      policy_version: "policy-a",
      consent_text: "Consentimento A",
      consent_source: "source-a",
      updated_at: LATER,
    });

    const sibling = await env.NEWSLETTER_DB.prepare(
      `SELECT consent_ledger_id, consumed_at, revoked_at
         FROM newsletter_confirmation_tokens WHERE id = 'token-sibling'`,
    ).first<{
      consent_ledger_id: string;
      consumed_at: string | null;
      revoked_at: string | null;
    }>();
    expect(sibling).toEqual({
      consent_ledger_id: "request-ledger-a",
      consumed_at: null,
      revoked_at: LATER,
    });

    const events = await env.NEWSLETTER_DB.prepare(
      `SELECT event_type, occurred_at, request_id, policy_version,
              consent_text, consent_source, metadata_json
         FROM newsletter_consent_ledger
        WHERE subscription_id = 'subscription-1'
          AND event_type = 'mailbox_confirmed'`,
    ).all<{
      consent_source: string;
      consent_text: string;
      event_type: string;
      metadata_json: string;
      occurred_at: string;
      policy_version: string;
      request_id: string;
    }>();
    expect(events.results).toEqual([
      {
        event_type: "mailbox_confirmed",
        occurred_at: LATER,
        request_id: "request-confirm-1",
        policy_version: "policy-a",
        consent_text: "Consentimento A",
        consent_source: "source-a",
        metadata_json:
          '{"token_id":"token-primary","consent_ledger_id":"request-ledger-a"}',
      },
    ]);

    const jobs = await env.NEWSLETTER_DB.prepare(
      `SELECT id, kind, dedupe_key, state, available_at, created_at
         FROM newsletter_jobs WHERE subscription_id = 'subscription-1'`,
    ).all<{
      available_at: string;
      created_at: string;
      dedupe_key: string;
      id: string;
      kind: string;
      state: string;
    }>();
    expect(jobs.results).toEqual([
      {
        id: "job-resend-token-primary",
        kind: "resend_reconcile",
        dedupe_key: "resend_reconcile:token-primary",
        state: "pending",
        available_at: LATER,
        created_at: LATER,
      },
    ]);
  });

  it("exposes only confirmed and reconciled subscriptions to broadcasts", async () => {
    await insertSubscription();

    const countRecipients = async (): Promise<number> => {
      const row = await env.NEWSLETTER_DB.prepare(
        "SELECT count(*) AS total FROM newsletter_broadcast_recipients",
      ).first<{ total: number }>();
      return row?.total ?? -1;
    };

    expect(await countRecipients()).toBe(0);

    await env.NEWSLETTER_DB.prepare(
      `UPDATE newsletter_subscriptions
          SET consent_state = 'confirmed', confirmed_at = ?,
              provider_state = 'pending', updated_at = ?
        WHERE id = 'subscription-1'`,
    )
      .bind(LATER, LATER)
      .run();
    expect(await countRecipients()).toBe(0);

    await env.NEWSLETTER_DB.prepare(
      `UPDATE newsletter_subscriptions
          SET provider_state = 'reconciled', reconciled_at = ?, updated_at = ?
        WHERE id = 'subscription-1'`,
    )
      .bind("2026-08-20T12:03:00.000Z", "2026-08-20T12:03:00.000Z")
      .run();

    const recipients = await env.NEWSLETTER_DB.prepare(
      `SELECT id, email_normalized, name, confirmed_at, reconciled_at
         FROM newsletter_broadcast_recipients`,
    ).all<{
      confirmed_at: string;
      email_normalized: string;
      id: string;
      name: string;
      reconciled_at: string;
    }>();
    expect(recipients.results).toEqual([
      {
        id: "subscription-1",
        email_normalized: "subscription-1@example.com",
        name: "Pessoa Teste",
        confirmed_at: LATER,
        reconciled_at: "2026-08-20T12:03:00.000Z",
      },
    ]);
  });
});

describe("newsletter D1 isolation", () => {
  it("stores a row in one test", async () => {
    await insertSubscription({ id: "isolation-marker" });
    const row = await env.NEWSLETTER_DB.prepare(
      "SELECT count(*) AS total FROM newsletter_subscriptions",
    ).first<{ total: number }>();
    expect(row?.total).toBe(1);
  });

  it("starts the following test with clean storage", async () => {
    const row = await env.NEWSLETTER_DB.prepare(
      "SELECT count(*) AS total FROM newsletter_subscriptions",
    ).first<{ total: number }>();
    expect(row?.total).toBe(0);
  });
});

const RECONCILIATION_NOW = "2026-08-20T14:00:00.000Z";
const RECONCILIATION_REQUEST_ID = "00000000-0000-4000-8000-000000000101";

interface ReconciliationSeed {
  attempts?: number;
  availableAt?: string;
  confirmedAt?: string | null;
  consentState?: "confirmed" | "expired" | "pending";
  createdAt?: string;
  email?: string;
  jobId?: string;
  leaseUntil?: string | null;
  providerContactId?: string | null;
  providerState?:
    | "blocked_global_opt_out"
    | "not_started"
    | "pending"
    | "reconciled"
    | "reconciling";
  state?: "blocked" | "completed" | "leased" | "pending";
  subscriptionId?: string;
}

async function seedReconciliationJob(
  options: ReconciliationSeed = {},
): Promise<{ jobId: string; subscriptionId: string }> {
  const subscriptionId = options.subscriptionId ?? "reconcile-subscription";
  const jobId = options.jobId ?? "reconcile-job";
  const consentState = options.consentState ?? "confirmed";
  const providerState = options.providerState ?? "pending";
  const confirmedAt =
    options.confirmedAt === undefined
      ? consentState === "confirmed"
        ? RECONCILIATION_NOW
        : null
      : options.confirmedAt;

  await env.NEWSLETTER_DB.prepare(
    `INSERT INTO newsletter_subscriptions (
       id, email_normalized, name, consent_state, policy_version,
       consent_text, consent_source, requested_at, confirmed_at,
       provider_state, provider_contact_id, created_at, updated_at
     ) VALUES (?, ?, 'Pessoa Reconcile', ?, 'policy-reconcile',
               'Consentimento reconcile', 'reconcile_form', ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      subscriptionId,
      options.email ?? `${subscriptionId}@example.com`,
      consentState,
      RECONCILIATION_NOW,
      confirmedAt,
      providerState,
      options.providerContactId ?? null,
      RECONCILIATION_NOW,
      RECONCILIATION_NOW,
    )
    .run();

  await env.NEWSLETTER_DB.prepare(
    `INSERT INTO newsletter_jobs (
       id, subscription_id, kind, dedupe_key, state, attempts,
       available_at, lease_until, created_at
     ) VALUES (?, ?, 'resend_reconcile', ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      jobId,
      subscriptionId,
      `resend_reconcile:${jobId}`,
      options.state ?? "pending",
      options.attempts ?? 0,
      options.availableAt ?? RECONCILIATION_NOW,
      options.leaseUntil ?? null,
      options.createdAt ?? RECONCILIATION_NOW,
    )
    .run();

  return { jobId, subscriptionId };
}

async function selectReconciliationState(
  subscriptionId = "reconcile-subscription",
): Promise<{
  job: Record<string, unknown> | null;
  ledger: Record<string, unknown>[];
  subscription: Record<string, unknown> | null;
}> {
  const subscription = await env.NEWSLETTER_DB.prepare(
    `SELECT consent_state, provider_state, provider_contact_id, reconciled_at,
            updated_at FROM newsletter_subscriptions WHERE id = ?`,
  )
    .bind(subscriptionId)
    .first<Record<string, unknown>>();
  const job = await env.NEWSLETTER_DB.prepare(
    `SELECT state, attempts, available_at, lease_until, last_error_code,
            completed_at FROM newsletter_jobs WHERE subscription_id = ?`,
  )
    .bind(subscriptionId)
    .first<Record<string, unknown>>();
  const ledger = await env.NEWSLETTER_DB.prepare(
    `SELECT id, event_type, occurred_at, request_id, policy_version,
            consent_text, consent_source, metadata_json
       FROM newsletter_consent_ledger WHERE subscription_id = ? ORDER BY id`,
  )
    .bind(subscriptionId)
    .all<Record<string, unknown>>();
  return { job, ledger: ledger.results, subscription };
}

describe("B5 reconciliation store leasing and fencing", () => {
  it.each([
    [1, 1],
    [2, 5],
    [3, 15],
    [4, 60],
    [5, 360],
    [6, 360],
  ])("derives attempt %i retry delay as %i minutes", (attempt, expected) => {
    expect(reconciliationRetryDelayMinutes(attempt)).toBe(expected);
  });

  it("claims one due job with an exact 30-second lease and immutable snapshot", async () => {
    await seedReconciliationJob({ providerContactId: "contact-existing" });
    const store = createNewsletterStore(env.NEWSLETTER_DB);

    const claimed = await store.claimReconciliationJob({
      now: new Date(RECONCILIATION_NOW),
    });

    expect(claimed).toEqual({
      id: "reconcile-job",
      subscriptionId: "reconcile-subscription",
      attempt: 1,
      leaseUntil: "2026-08-20T14:00:30.000Z",
      emailNormalized: "reconcile-subscription@example.com",
      confirmedAt: RECONCILIATION_NOW,
      policyVersion: "policy-reconcile",
      consentText: "Consentimento reconcile",
      consentSource: "reconcile_form",
      providerContactId: "contact-existing",
    });
    expect(claimed).not.toHaveProperty("name");
    const state = await selectReconciliationState();
    expect(state.subscription).toEqual(
      expect.objectContaining({ provider_state: "reconciling" }),
    );
    expect(state.job).toEqual(
      expect.objectContaining({
        attempts: 1,
        lease_until: "2026-08-20T14:00:30.000Z",
        state: "leased",
      }),
    );
  });

  it("serializes simultaneous claims so only one worker receives the job", async () => {
    await seedReconciliationJob();
    const first = createNewsletterStore(env.NEWSLETTER_DB);
    const second = createNewsletterStore(env.NEWSLETTER_DB);

    const claims = await Promise.all([
      first.claimReconciliationJob({ now: new Date(RECONCILIATION_NOW) }),
      second.claimReconciliationJob({ now: new Date(RECONCILIATION_NOW) }),
    ]);

    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(claims.filter((claim) => claim === null)).toHaveLength(1);
  });

  it("prefers only an eligible preferred subscription then orders by due time", async () => {
    await seedReconciliationJob({
      jobId: "job-oldest",
      subscriptionId: "subscription-oldest",
      availableAt: "2026-08-20T13:58:00.000Z",
      createdAt: "2026-08-20T13:58:00.000Z",
    });
    await seedReconciliationJob({
      jobId: "job-preferred",
      subscriptionId: "subscription-preferred",
      availableAt: "2026-08-20T13:59:00.000Z",
      createdAt: "2026-08-20T13:59:00.000Z",
    });
    const store = createNewsletterStore(env.NEWSLETTER_DB);

    expect(
      await store.claimReconciliationJob({
        now: new Date(RECONCILIATION_NOW),
        preferredSubscriptionId: "subscription-preferred",
      }),
    ).toEqual(expect.objectContaining({ id: "job-preferred" }));
    expect(
      await store.claimReconciliationJob({
        now: new Date(RECONCILIATION_NOW),
        preferredSubscriptionId: "subscription-preferred",
      }),
    ).toEqual(expect.objectContaining({ id: "job-oldest" }));
  });

  it("does not let a future or live-leased preferred job bypass the oldest due job", async () => {
    await seedReconciliationJob({
      jobId: "job-due",
      subscriptionId: "subscription-due",
      availableAt: "2026-08-20T13:59:00.000Z",
    });
    await seedReconciliationJob({
      jobId: "job-future",
      subscriptionId: "subscription-future",
      availableAt: "2026-08-20T14:00:00.001Z",
    });
    await seedReconciliationJob({
      attempts: 1,
      jobId: "job-live",
      leaseUntil: "2026-08-20T14:00:00.001Z",
      state: "leased",
      subscriptionId: "subscription-live",
    });
    const store = createNewsletterStore(env.NEWSLETTER_DB);

    const claim = await store.claimReconciliationJob({
      now: new Date(RECONCILIATION_NOW),
      preferredSubscriptionId: "subscription-future",
    });
    expect(claim).toEqual(expect.objectContaining({ id: "job-due" }));
  });

  it("orders due jobs by available_at, then created_at, then ID", async () => {
    await seedReconciliationJob({
      jobId: "job-id-b",
      subscriptionId: "subscription-id-b",
      availableAt: "2026-08-20T13:59:00.000Z",
      createdAt: "2026-08-20T13:58:00.000Z",
    });
    await seedReconciliationJob({
      jobId: "job-id-a",
      subscriptionId: "subscription-id-a",
      availableAt: "2026-08-20T13:59:00.000Z",
      createdAt: "2026-08-20T13:58:00.000Z",
    });
    await seedReconciliationJob({
      jobId: "job-created-first",
      subscriptionId: "subscription-created-first",
      availableAt: "2026-08-20T13:59:00.000Z",
      createdAt: "2026-08-20T13:57:00.000Z",
    });
    await seedReconciliationJob({
      jobId: "job-available-first",
      subscriptionId: "subscription-available-first",
      availableAt: "2026-08-20T13:58:59.999Z",
      createdAt: "2026-08-20T14:00:00.000Z",
    });
    const store = createNewsletterStore(env.NEWSLETTER_DB);

    const claimed: string[] = [];
    for (let index = 0; index < 4; index += 1) {
      claimed.push(
        (await store.claimReconciliationJob({
          now: new Date(RECONCILIATION_NOW),
        }))!.id,
      );
    }
    expect(claimed).toEqual([
      "job-available-first",
      "job-created-first",
      "job-id-a",
      "job-id-b",
    ]);
  });

  it("skips jobs whose subscription is not confirmed and pending or reconciling", async () => {
    await seedReconciliationJob({
      consentState: "pending",
      jobId: "job-unconfirmed",
      providerState: "not_started",
      subscriptionId: "subscription-unconfirmed",
    });
    await seedReconciliationJob({
      jobId: "job-reconciled",
      providerState: "reconciled",
      subscriptionId: "subscription-reconciled",
    });
    await seedReconciliationJob({
      jobId: "job-blocked",
      providerState: "blocked_global_opt_out",
      subscriptionId: "subscription-blocked",
    });
    await seedReconciliationJob({
      consentState: "expired",
      confirmedAt: null,
      jobId: "job-expired",
      providerState: "pending",
      subscriptionId: "subscription-expired",
    });
    const store = createNewsletterStore(env.NEWSLETTER_DB);

    expect(
      await store.claimReconciliationJob({ now: new Date(RECONCILIATION_NOW) }),
    ).toBeNull();
  });

  it("reclaims an expired lease and permanently fences the prior attempt", async () => {
    await seedReconciliationJob({
      attempts: 1,
      leaseUntil: RECONCILIATION_NOW,
      state: "leased",
    });
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    const reclaimed = await store.claimReconciliationJob({
      now: new Date(RECONCILIATION_NOW),
    });
    expect(reclaimed).toEqual(expect.objectContaining({ attempt: 2 }));

    expect(
      await store.markProviderReconciled({
        jobId: "reconcile-job",
        attempt: 1,
        requestId: RECONCILIATION_REQUEST_ID,
        now: new Date("2026-08-20T14:00:01.000Z"),
        providerContactId: "contact-stale",
      }),
    ).toBe(false);
    expect(
      await store.markProviderGlobalOptOut({
        jobId: "reconcile-job",
        attempt: 1,
        requestId: "00000000-0000-4000-8000-000000000105",
        now: new Date("2026-08-20T14:00:01.000Z"),
        providerContactId: "contact-stale",
      }),
    ).toBe(false);
    expect(
      await store.rescheduleReconciliation({
        jobId: "reconcile-job",
        attempt: 1,
        requestId: "00000000-0000-4000-8000-000000000106",
        now: new Date("2026-08-20T14:00:01.000Z"),
        errorCode: "timeout",
        observedContactId: "contact-stale-observed",
      }),
    ).toBe(false);
    expect((await selectReconciliationState()).subscription).toEqual(
      expect.objectContaining({
        provider_state: "reconciling",
        provider_contact_id: null,
      }),
    );
  });

  it("rejects every terminal CAS at the exact lease boundary", async () => {
    await seedReconciliationJob();
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    await store.claimReconciliationJob({ now: new Date(RECONCILIATION_NOW) });

    expect(
      await store.markProviderReconciled({
        jobId: "reconcile-job",
        attempt: 1,
        requestId: RECONCILIATION_REQUEST_ID,
        now: new Date("2026-08-20T14:00:30.000Z"),
        providerContactId: "contact-boundary",
      }),
    ).toBe(false);
    expect(
      await store.markProviderGlobalOptOut({
        jobId: "reconcile-job",
        attempt: 1,
        requestId: "00000000-0000-4000-8000-000000000107",
        now: new Date("2026-08-20T14:00:30.000Z"),
        providerContactId: "contact-boundary",
      }),
    ).toBe(false);
    expect(
      await store.rescheduleReconciliation({
        jobId: "reconcile-job",
        attempt: 1,
        requestId: "00000000-0000-4000-8000-000000000108",
        now: new Date("2026-08-20T14:00:30.000Z"),
        errorCode: "deadline",
        observedContactId: "contact-boundary",
      }),
    ).toBe(false);
  });

  it.each([
    [1, 1],
    [2, 5],
    [3, 15],
    [4, 60],
    [5, 360],
    [6, 360],
  ])(
    "persists attempt %i retry at exactly %i minutes in job and ledger",
    async (attempt, delayMinutes) => {
      await seedReconciliationJob({ attempts: attempt - 1 });
      const store = createNewsletterStore(env.NEWSLETTER_DB);
      expect(
        await store.claimReconciliationJob({
          now: new Date(RECONCILIATION_NOW),
        }),
      ).toEqual(expect.objectContaining({ attempt }));
      const requestId = `00000000-0000-4000-8000-${String(200 + attempt).padStart(12, "0")}`;

      expect(
        await store.rescheduleReconciliation({
          jobId: "reconcile-job",
          attempt,
          requestId,
          now: new Date(RECONCILIATION_NOW),
          errorCode: "timeout",
        }),
      ).toBe(true);
      const state = await selectReconciliationState();
      expect(state.job?.available_at).toBe(
        new Date(
          new Date(RECONCILIATION_NOW).getTime() + delayMinutes * 60_000,
        ).toISOString(),
      );
      expect(state.ledger).toEqual([
        expect.objectContaining({
          metadata_json: JSON.stringify({
            attempt,
            error_code: "timeout",
            delay_minutes: delayMinutes,
          }),
        }),
      ]);
    },
  );
});

describe("B5 strict reconciliation transitions", () => {
  it("atomically reconciles subscription, ledger, job and broadcast view", async () => {
    await seedReconciliationJob();
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    await store.claimReconciliationJob({ now: new Date(RECONCILIATION_NOW) });
    const transitionAt = new Date("2026-08-20T14:00:01.000Z");

    expect(
      await store.markProviderReconciled({
        jobId: "reconcile-job",
        attempt: 1,
        requestId: RECONCILIATION_REQUEST_ID,
        now: transitionAt,
        providerContactId: "contact-success",
      }),
    ).toBe(true);

    expect(await selectReconciliationState()).toEqual({
      subscription: {
        consent_state: "confirmed",
        provider_state: "reconciled",
        provider_contact_id: "contact-success",
        reconciled_at: transitionAt.toISOString(),
        updated_at: transitionAt.toISOString(),
      },
      job: {
        state: "completed",
        attempts: 1,
        available_at: RECONCILIATION_NOW,
        lease_until: null,
        last_error_code: null,
        completed_at: transitionAt.toISOString(),
      },
      ledger: [
        {
          id: `ledger-provider-reconciled-${RECONCILIATION_REQUEST_ID}`,
          event_type: "provider_reconciled",
          occurred_at: transitionAt.toISOString(),
          request_id: RECONCILIATION_REQUEST_ID,
          policy_version: "policy-reconcile",
          consent_text: "Consentimento reconcile",
          consent_source: "reconcile_form",
          metadata_json: '{"attempt":1}',
        },
      ],
    });
    const recipient = await env.NEWSLETTER_DB.prepare(
      "SELECT id FROM newsletter_broadcast_recipients",
    ).first<{ id: string }>();
    expect(recipient).toEqual({ id: "reconcile-subscription" });
  });

  it("atomically blocks a global opt-out without rolling back mailbox consent", async () => {
    await seedReconciliationJob();
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    await store.claimReconciliationJob({ now: new Date(RECONCILIATION_NOW) });
    const transitionAt = new Date("2026-08-20T14:00:02.000Z");

    expect(
      await store.markProviderGlobalOptOut({
        jobId: "reconcile-job",
        attempt: 1,
        requestId: RECONCILIATION_REQUEST_ID,
        now: transitionAt,
        providerContactId: "contact-blocked",
      }),
    ).toBe(true);
    const state = await selectReconciliationState();
    expect(state.subscription).toEqual({
      consent_state: "confirmed",
      provider_state: "blocked_global_opt_out",
      provider_contact_id: "contact-blocked",
      reconciled_at: null,
      updated_at: transitionAt.toISOString(),
    });
    expect(state.job).toEqual(expect.objectContaining({
      state: "blocked",
      lease_until: null,
      completed_at: transitionAt.toISOString(),
    }));
    expect(state.ledger).toEqual([
      expect.objectContaining({
        id: `ledger-provider-global-opt-out-${RECONCILIATION_REQUEST_ID}`,
        event_type: "provider_global_opt_out",
        metadata_json: '{"attempt":1}',
      }),
    ]);
    expect(
      await env.NEWSLETTER_DB.prepare(
        "SELECT count(*) AS total FROM newsletter_broadcast_recipients",
      ).first<{ total: number }>(),
    ).toEqual({ total: 0 });
  });

  it("derives retry availability and writes only minimized enum metadata", async () => {
    await seedReconciliationJob();
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    await store.claimReconciliationJob({ now: new Date(RECONCILIATION_NOW) });
    const transitionAt = new Date("2026-08-20T14:00:03.000Z");

    expect(
      await store.rescheduleReconciliation({
        jobId: "reconcile-job",
        attempt: 1,
        requestId: RECONCILIATION_REQUEST_ID,
        now: transitionAt,
        errorCode: "readback_mismatch",
        observedContactId: "contact-observed",
      }),
    ).toBe(true);
    const state = await selectReconciliationState();
    expect(state.subscription).toEqual(expect.objectContaining({
      provider_state: "pending",
      provider_contact_id: "contact-observed",
    }));
    expect(state.job).toEqual({
      state: "pending",
      attempts: 1,
      available_at: "2026-08-20T14:01:03.000Z",
      lease_until: null,
      last_error_code: "readback_mismatch",
      completed_at: null,
    });
    expect(state.ledger).toEqual([
      expect.objectContaining({
        id: `ledger-provider-retry-${RECONCILIATION_REQUEST_ID}`,
        event_type: "provider_retry_scheduled",
        metadata_json:
          '{"attempt":1,"error_code":"readback_mismatch","delay_minutes":1}',
      }),
    ]);
    const serializedLedger = JSON.stringify(state.ledger);
    expect(serializedLedger).not.toContain("reconcile-job");
    expect(serializedLedger).not.toContain("contact-observed");
  });

  it("makes repeated and racing terminal transitions choose one coherent winner", async () => {
    await seedReconciliationJob();
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    await store.claimReconciliationJob({ now: new Date(RECONCILIATION_NOW) });
    const now = new Date("2026-08-20T14:00:04.000Z");

    const results = await Promise.all([
      store.markProviderReconciled({
        jobId: "reconcile-job",
        attempt: 1,
        requestId: "00000000-0000-4000-8000-000000000102",
        now,
        providerContactId: "contact-race",
      }),
      store.rescheduleReconciliation({
        jobId: "reconcile-job",
        attempt: 1,
        requestId: "00000000-0000-4000-8000-000000000103",
        now,
        errorCode: "network",
      }),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    const state = await selectReconciliationState();
    expect(["completed", "pending"]).toContain(state.job?.state);
    expect(state.ledger).toHaveLength(1);

    const repeat = await store.markProviderReconciled({
      jobId: "reconcile-job",
      attempt: 1,
      requestId: "00000000-0000-4000-8000-000000000104",
      now,
      providerContactId: "contact-repeat",
    });
    expect(repeat).toBe(false);
    expect((await selectReconciliationState()).ledger).toHaveLength(1);
  });

  it("makes block-versus-success choose one coherent terminal winner", async () => {
    await seedReconciliationJob();
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    await store.claimReconciliationJob({ now: new Date(RECONCILIATION_NOW) });
    const now = new Date("2026-08-20T14:00:04.000Z");

    const results = await Promise.all([
      store.markProviderGlobalOptOut({
        jobId: "reconcile-job",
        attempt: 1,
        requestId: "00000000-0000-4000-8000-000000000109",
        now,
        providerContactId: "contact-race",
      }),
      store.markProviderReconciled({
        jobId: "reconcile-job",
        attempt: 1,
        requestId: "00000000-0000-4000-8000-000000000110",
        now,
        providerContactId: "contact-race",
      }),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    const state = await selectReconciliationState();
    expect(["blocked", "completed"]).toContain(state.job?.state);
    expect(["blocked_global_opt_out", "reconciled"]).toContain(
      state.subscription?.provider_state,
    );
    expect(state.ledger).toHaveLength(1);
  });

  it.each(["success", "block", "retry"] as const)(
    "rolls back every %s transition on deterministic ledger collision",
    async (transition) => {
      await seedReconciliationJob();
      const store = createNewsletterStore(env.NEWSLETTER_DB);
      await store.claimReconciliationJob({ now: new Date(RECONCILIATION_NOW) });
      const prefix =
        transition === "success"
          ? "ledger-provider-reconciled"
          : transition === "block"
            ? "ledger-provider-global-opt-out"
            : "ledger-provider-retry";
      const collisionId = `${prefix}-${RECONCILIATION_REQUEST_ID}`;
      await env.NEWSLETTER_DB.prepare(
        `INSERT INTO newsletter_consent_ledger (
           id, subscription_id, event_type, occurred_at, request_id,
           metadata_json
         ) VALUES (?, 'reconcile-subscription', 'artificial_seed', ?,
                   'artificial-request', '{"seed":true}')`,
      )
        .bind(collisionId, RECONCILIATION_NOW)
        .run();

      const input = {
        jobId: "reconcile-job",
        attempt: 1,
        requestId: RECONCILIATION_REQUEST_ID,
        now: new Date("2026-08-20T14:00:05.000Z"),
      };
      const action =
        transition === "success"
          ? store.markProviderReconciled({
              ...input,
              providerContactId: "contact-collision",
            })
          : transition === "block"
            ? store.markProviderGlobalOptOut({
                ...input,
                providerContactId: "contact-collision",
              })
            : store.rescheduleReconciliation({
                ...input,
                errorCode: "timeout",
              });
      await expect(action).rejects.toThrow(/append-only|constraint/i);

      const state = await selectReconciliationState();
      expect(state.subscription).toEqual(expect.objectContaining({
        provider_state: "reconciling",
        provider_contact_id: null,
      }));
      expect(state.job).toEqual(expect.objectContaining({
        state: "leased",
        lease_until: "2026-08-20T14:00:30.000Z",
      }));
      expect(state.ledger).toEqual([
        expect.objectContaining({
          id: collisionId,
          event_type: "artificial_seed",
          metadata_json: '{"seed":true}',
        }),
      ]);
    },
  );
});

describe("B5 reconciliation input validation", () => {
  it("accepts exact opaque ID bounds and rejects malformed values before D1", async () => {
    const prepareCalls: string[] = [];
    const database = new Proxy(env.NEWSLETTER_DB, {
      get(target, property) {
        if (property === "prepare") {
          return (query: string) => {
            prepareCalls.push(query);
            return target.prepare(query);
          };
        }
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const store = createNewsletterStore(database);
    const validBase = {
      jobId: "j".repeat(512),
      attempt: 1,
      requestId: RECONCILIATION_REQUEST_ID,
      now: new Date(RECONCILIATION_NOW),
      providerContactId: "c".repeat(512),
    };
    expect(await store.markProviderReconciled(validBase)).toBe(false);
    expect(prepareCalls.length).toBeGreaterThan(0);

    for (const invalid of ["", " padded", "padded ", "control\u0000", "x".repeat(513)]) {
      prepareCalls.length = 0;
      await expect(
        store.markProviderReconciled({ ...validBase, jobId: invalid }),
      ).rejects.toThrow(/identifier/i);
      expect(prepareCalls).toHaveLength(0);
    }
  });

  it("rejects invalid date, attempt, request UUID, contact ID and error code before D1", async () => {
    const prepareCalls: string[] = [];
    const database = new Proxy(env.NEWSLETTER_DB, {
      get(target, property) {
        if (property === "prepare") {
          return (query: string) => {
            prepareCalls.push(query);
            return target.prepare(query);
          };
        }
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const store = createNewsletterStore(database);
    const base = {
      jobId: "reconcile-job",
      attempt: 1,
      requestId: RECONCILIATION_REQUEST_ID,
      now: new Date(RECONCILIATION_NOW),
      providerContactId: "contact-valid",
    };
    const actions = [
      () => store.markProviderReconciled({ ...base, now: new Date(Number.NaN) }),
      () => store.markProviderReconciled({ ...base, attempt: 0 }),
      () => store.markProviderReconciled({ ...base, requestId: "not-a-uuid" }),
      () => store.markProviderReconciled({ ...base, providerContactId: "x".repeat(513) }),
      () =>
        store.rescheduleReconciliation({
          jobId: base.jobId,
          attempt: base.attempt,
          requestId: base.requestId,
          now: base.now,
          errorCode: "secret-provider-message" as never,
        }),
    ];

    for (const action of actions) {
      prepareCalls.length = 0;
      await expect(action()).rejects.toThrow();
      expect(prepareCalls).toHaveLength(0);
    }
  });
});
