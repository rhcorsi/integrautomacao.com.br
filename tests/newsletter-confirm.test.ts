import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  onRequestDelete,
  onRequestGet,
  onRequestHead,
  onRequestOptions,
  onRequestPatch,
  onRequestPost,
  onRequestPut,
  parseConfirmationPayload,
} from "../functions/api/newsletter/confirm";
import { hashConfirmationToken } from "../functions/_shared/newsletter/crypto";
import { pagesContext } from "./helpers";

const RAW_TOKEN = "A".repeat(43);
const NETWORK_BLOCK_MESSAGE = "B4_CONFIRM_TEST_NETWORK_BLOCKED";
const CONFIRMED_BODY = JSON.stringify({
  ok: true,
  state: "confirmed",
  message:
    "Inscrição confirmada. A sincronização da lista pode levar alguns instantes.",
});
const REPLAY_BODY = JSON.stringify({
  ok: true,
  state: "already-processed",
  message: "Este link já foi processado.",
});
const EXPIRED_BODY = JSON.stringify({
  ok: false,
  state: "expired",
  message: "Este link expirou. Solicite uma nova confirmação pelo formulário.",
});
const INVALID_BODY = JSON.stringify({
  ok: false,
  state: "invalid",
  message: "Link de confirmação inválido.",
});
const ERROR_BODY = JSON.stringify({
  ok: false,
  state: "error",
  message: "Não foi possível processar a confirmação agora.",
});

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(
    new Error(NETWORK_BLOCK_MESSAGE),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

function request(options: {
  body?: unknown;
  contentType?: string;
  method?: string;
  rawBody?: string;
  url?: string;
} = {}): Request {
  const method = options.method ?? "POST";
  return new Request(
    options.url ?? "https://integrautomacao.com.br/api/newsletter/confirm",
    {
      method,
      headers: { "content-type": options.contentType ?? "application/json" },
      body:
        method === "GET" || method === "HEAD"
          ? undefined
          : (options.rawBody ??
            JSON.stringify(options.body ?? { token: RAW_TOKEN })),
    },
  );
}

function context(
  confirmationRequest: Request,
  waits: Promise<unknown>[] = [],
  database: D1Database = env.NEWSLETTER_DB,
  runtimeOverrides: Record<string, unknown> = {},
) {
  return pagesContext(
    confirmationRequest,
    { NEWSLETTER_DB: database, ...runtimeOverrides },
    undefined,
    waits,
  );
}

async function settle(waits: Promise<unknown>[]) {
  const settled = await Promise.allSettled(waits);
  expect(settled.every(({ status }) => status === "fulfilled")).toBe(true);
}

async function seedHttpToken(options: {
  deliveryState?: "dispatching" | "failed" | "sent";
  deliveredAt?: string | null;
  digest?: string;
  expiresAt?: string;
  rawToken?: string;
  revokedAt?: string | null;
  subscriptionId?: string;
  tokenId?: string;
} = {}) {
  const subscriptionId = options.subscriptionId ?? "http-subscription";
  const tokenId = options.tokenId ?? "http-token";
  const rawToken = options.rawToken ?? RAW_TOKEN;
  const digest = options.digest ?? (await hashConfirmationToken(rawToken));
  const deliveryState = options.deliveryState ?? "sent";
  const deliveredAt =
    options.deliveredAt !== undefined
      ? options.deliveredAt
      : deliveryState === "sent"
        ? new Date().toISOString()
        : null;
  const now = new Date().toISOString();

  await env.NEWSLETTER_DB.prepare(
    `INSERT INTO newsletter_subscriptions (
       id, email_normalized, name, consent_state, policy_version,
       consent_text, consent_source, requested_at, provider_state,
       created_at, updated_at
     ) VALUES (?, ?, 'Pessoa HTTP', 'pending', 'http-policy',
               'Consentimento HTTP', 'http_form', ?, 'not_started', ?, ?)`,
  )
    .bind(subscriptionId, `${subscriptionId}@example.com`, now, now, now)
    .run();
  const evidenceId = `request-${tokenId}`;
  await env.NEWSLETTER_DB.prepare(
    `INSERT INTO newsletter_consent_ledger (
       id, subscription_id, event_type, occurred_at, request_id,
       policy_version, consent_text, consent_source, metadata_json
     ) VALUES (?, ?, 'request_received', ?, 'seed-request', 'http-policy',
               'Consentimento HTTP', 'http_form', '{}')`,
  )
    .bind(evidenceId, subscriptionId, now)
    .run();
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
      now,
      options.expiresAt ?? new Date(Date.now() + 60_000).toISOString(),
      deliveryState,
      deliveredAt,
      options.revokedAt ?? null,
    )
    .run();
  return { digest, rawToken, subscriptionId, tokenId };
}

async function seedDueConfirmedJob(suffix: string) {
  const subscriptionId = `due-subscription-${suffix}`;
  const jobId = `due-job-${suffix}`;
  const now = new Date(Date.now() - 120_000).toISOString();
  await env.NEWSLETTER_DB.prepare(
    `INSERT INTO newsletter_subscriptions (
       id, email_normalized, name, consent_state, policy_version,
       consent_text, consent_source, requested_at, confirmed_at,
       provider_state, created_at, updated_at
     ) VALUES (?, ?, 'Due', 'confirmed', 'due-policy', 'Due consent',
               'due_form', ?, ?, 'pending', ?, ?)`,
  )
    .bind(subscriptionId, `${subscriptionId}@example.com`, now, now, now, now)
    .run();
  await env.NEWSLETTER_DB.prepare(
    `INSERT INTO newsletter_jobs (
       id, subscription_id, kind, dedupe_key, state, attempts,
       available_at, created_at
     ) VALUES (?, ?, 'resend_reconcile', ?, 'pending', 0, ?, ?)`,
  )
    .bind(jobId, subscriptionId, `resend_reconcile:${jobId}`, now, now)
    .run();
  return { jobId, subscriptionId };
}

async function tableCount(table: string): Promise<number> {
  const allowed = new Set([
    "newsletter_subscriptions",
    "newsletter_confirmation_tokens",
    "newsletter_consent_ledger",
    "newsletter_jobs",
  ]);
  if (!allowed.has(table)) throw new Error("invalid test table");
  const result = await env.NEWSLETTER_DB.prepare(
    `SELECT count(*) AS total FROM ${table}`,
  ).first<{ total: number }>();
  return result?.total ?? -1;
}

async function textCells() {
  const cells: Array<{ column: string; table: string; value: string }> = [];
  for (const table of [
    "newsletter_subscriptions",
    "newsletter_confirmation_tokens",
    "newsletter_consent_ledger",
    "newsletter_jobs",
  ]) {
    const columns = await env.NEWSLETTER_DB.prepare(
      `PRAGMA table_info(${table})`,
    ).all<{ name: string; type: string }>();
    for (const { name } of columns.results.filter(({ type }) => type === "TEXT")) {
      const values = await env.NEWSLETTER_DB.prepare(
        `SELECT [${name}] AS value FROM [${table}] WHERE [${name}] IS NOT NULL`,
      ).all<{ value: string }>();
      cells.push(
        ...values.results.map(({ value }) => ({ column: name, table, value })),
      );
    }
  }
  return cells;
}

function expectJsonResponse(
  response: Response,
  status: number,
  body: string,
): Promise<void> {
  expect(response.status).toBe(status);
  expect(response.headers.get("allow")).toBeNull();
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("content-type")).toBe(
    "application/json; charset=utf-8",
  );
  expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
  expect(response.headers.has("access-control-allow-origin")).toBe(false);
  return expect(response.text()).resolves.toBe(body) as Promise<void>;
}

describe("B4 confirmation network isolation", () => {
  it("fails closed for every unconfigured fetch", async () => {
    await expect(fetch("https://api.resend.com/emails")).rejects.toThrow(
      NETWORK_BLOCK_MESSAGE,
    );
  });
});

describe("parseConfirmationPayload", () => {
  it("accepts only one own token key with canonical base64url syntax", () => {
    expect(parseConfirmationPayload({ token: RAW_TOKEN })).toBe(RAW_TOKEN);
  });

  it.each([
    ["null", null],
    ["array", [{ token: RAW_TOKEN }]],
    ["missing", {}],
    ["extra", { token: RAW_TOKEN, extra: true }],
    ["non-string", { token: 123 }],
    ["padding", { token: `${"A".repeat(42)}=` }],
    ["short", { token: "A".repeat(42) }],
    ["long", { token: "A".repeat(44) }],
    ["alphabet", { token: `${"A".repeat(42)}+` }],
    ["inherited", Object.assign(Object.create({ token: RAW_TOKEN }), {})],
  ])("rejects %s before hashing", (_label, payload) => {
    expect(parseConfirmationPayload(payload)).toBeNull();
  });
});

describe("newsletter confirmation method and body policy", () => {
  it.each([
    ["GET", onRequestGet],
    ["HEAD", onRequestHead],
    ["PUT", onRequestPut],
    ["PATCH", onRequestPatch],
    ["DELETE", onRequestDelete],
    ["OPTIONS", onRequestOptions],
  ])("returns exact 405 policy for %s", async (method, handler) => {
    const response = await handler(context(request({ method })) as never);
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.has("access-control-allow-origin")).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each(["?token=secret", "?unrelated=1", "?"])(
    "rejects query syntax before consuming body: %s",
    async (query) => {
      const errorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      const confirmationRequest = request({
        url: `https://integrautomacao.com.br/api/newsletter/confirm${query}`,
      });
      const waits: Promise<unknown>[] = [];
      const response = await onRequestPost(
        context(confirmationRequest, waits),
      );

      expect(response.status).toBe(400);
      expect(confirmationRequest.bodyUsed).toBe(false);
      expect(waits).toHaveLength(0);
      expect(await tableCount("newsletter_subscriptions")).toBe(0);
      const logs = JSON.stringify(errorSpy.mock.calls);
      expect(logs).not.toContain(query);
      expect(logs).not.toContain("secret");
    },
  );

  it.each([
    ["media type", { contentType: "text/plain" }, 415],
    ["malformed JSON", { rawBody: "{" }, 400],
    ["oversized JSON", { body: { token: "A".repeat(2_100) } }, 413],
    ["missing key", { body: {} }, 400],
    ["extra key", { body: { token: RAW_TOKEN, extra: true } }, 400],
    ["non-string", { body: { token: 1 } }, 400],
    ["bad token", { body: { token: "A".repeat(42) } }, 400],
  ])(
    "rejects $0 before D1 and cleanup",
    async (_label, options, status) => {
      const waits: Promise<unknown>[] = [];
      const response = await onRequestPost(
        context(request(options), waits),
      );
      expect(response.status).toBe(status);
      expect(waits).toHaveLength(0);
      expect(await tableCount("newsletter_subscriptions")).toBe(0);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    },
  );
});

describe("newsletter confirmation HTTP states", () => {
  it("maps confirmed exactly, schedules cleanup plus preferred reconciliation, and stores no raw token", async () => {
    const seeded = await seedHttpToken();
    const waits: Promise<unknown>[] = [];
    const response = await onRequestPost(context(request(), waits));

    await expectJsonResponse(response, 200, CONFIRMED_BODY);
    expect(waits).toHaveLength(2);
    await settle(waits);
    expect(globalThis.fetch).not.toHaveBeenCalled();

    const cells = await textCells();
    expect(cells.some(({ value }) => value.includes(seeded.rawToken))).toBe(false);
    const digestCells = cells.filter(({ value }) => value.includes(seeded.digest));
    expect(digestCells).toEqual([
      {
        table: "newsletter_confirmation_tokens",
        column: "token_sha256",
        value: seeded.digest,
      },
    ]);
    const counts = await Promise.all([
      tableCount("newsletter_subscriptions"),
      tableCount("newsletter_confirmation_tokens"),
      tableCount("newsletter_jobs"),
    ]);
    expect(counts).toEqual([1, 1, 1]);
  });

  it("gives the newly confirmed subscription first-claim preference over an older due job", async () => {
    const older = await seedDueConfirmedJob("older");
    const seeded = await seedHttpToken({
      subscriptionId: "preferred-http-subscription",
      tokenId: "preferred-http-token",
    });
    const providerUrls: string[] = [];
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      providerUrls.push(typeof input === "string" ? input : String(input));
      return Response.json({ error: "busy" }, { status: 503 });
    });
    const waits: Promise<unknown>[] = [];
    const response = await onRequestPost(
      context(request(), waits, env.NEWSLETTER_DB, {
        RESEND_CONTACTS_API_KEY: "contacts-key",
        RESEND_SEGMENT_ID: "segment-id",
        RESEND_TOPIC_ID: "topic-id",
      }),
    );

    await expectJsonResponse(response, 200, CONFIRMED_BODY);
    await settle(waits);
    const attempts = await env.NEWSLETTER_DB.prepare(
      "SELECT subscription_id, attempts FROM newsletter_jobs ORDER BY subscription_id",
    ).all<{ subscription_id: string; attempts: number }>();
    expect(attempts.results).toEqual([
      { subscription_id: older.subscriptionId, attempts: 1 },
      { subscription_id: seeded.subscriptionId, attempts: 1 },
    ]);
    expect(providerUrls[0]).toContain(
      "preferred-http-subscription%40example.com",
    );
    expect(providerUrls[1]).toContain("due-subscription-older%40example.com");
  });

  it("maps replay exactly and schedules cleanup plus generic reconciliation", async () => {
    await seedHttpToken();
    const firstWaits: Promise<unknown>[] = [];
    const first = await onRequestPost(context(request(), firstWaits));
    await expectJsonResponse(first, 200, CONFIRMED_BODY);
    await settle(firstWaits);
    const due = await seedDueConfirmedJob("replay");

    const replayWaits: Promise<unknown>[] = [];
    const replay = await onRequestPost(context(request(), replayWaits));
    await expectJsonResponse(replay, 200, REPLAY_BODY);
    expect(replayWaits).toHaveLength(2);
    await settle(replayWaits);
    expect(await tableCount("newsletter_jobs")).toBe(2);
    expect(
      await env.NEWSLETTER_DB.prepare(
        "SELECT attempts FROM newsletter_jobs WHERE id = ?",
      )
        .bind(due.jobId)
        .first<{ attempts: number }>(),
    ).toEqual({ attempts: 1 });
  });

  it("maps expired exactly and schedules cleanup plus generic reconciliation", async () => {
    const due = await seedDueConfirmedJob("expired");
    await seedHttpToken({ expiresAt: new Date(Date.now() - 1).toISOString() });
    const waits: Promise<unknown>[] = [];
    const response = await onRequestPost(context(request(), waits));

    await expectJsonResponse(response, 410, EXPIRED_BODY);
    expect(waits).toHaveLength(2);
    await settle(waits);
    expect(await tableCount("newsletter_jobs")).toBe(1);
    expect(
      await env.NEWSLETTER_DB.prepare(
        "SELECT attempts FROM newsletter_jobs WHERE id = ?",
      )
        .bind(due.jobId)
        .first<{ attempts: number }>(),
    ).toEqual({ attempts: 1 });
  });

  it("maps unknown token exactly, schedules cleanup, and creates no row", async () => {
    const waits: Promise<unknown>[] = [];
    const response = await onRequestPost(context(request(), waits));

    await expectJsonResponse(response, 400, INVALID_BODY);
    expect(waits).toHaveLength(1);
    await settle(waits);
    expect(
      await Promise.all([
        tableCount("newsletter_subscriptions"),
        tableCount("newsletter_confirmation_tokens"),
        tableCount("newsletter_consent_ledger"),
        tableCount("newsletter_jobs"),
      ]),
    ).toEqual([0, 0, 0, 0]);
  });

  it("maps a consume D1 failure to generic 503 and still schedules cleanup", async () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const realDb = env.NEWSLETTER_DB;
    let batches = 0;
    const consumeFailingDb = {
      prepare: realDb.prepare.bind(realDb),
      async batch(statements: D1PreparedStatement[]) {
        batches += 1;
        if (batches === 1) throw new Error("consume unavailable");
        return realDb.batch(statements);
      },
    } as D1Database;
    const waits: Promise<unknown>[] = [];
    const response = await onRequestPost(
      context(request(), waits, consumeFailingDb),
    );

    await expectJsonResponse(response, 503, ERROR_BODY);
    expect(waits).toHaveLength(1);
    await settle(waits);
    expect(batches).toBe(2);
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(RAW_TOKEN);
  });

  it("contains cleanup rejection without changing a confirmed response", async () => {
    await seedHttpToken();
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const realDb = env.NEWSLETTER_DB;
    let batches = 0;
    const cleanupFailingDb = {
      prepare: realDb.prepare.bind(realDb),
      async batch(statements: D1PreparedStatement[]) {
        batches += 1;
        if (batches === 2) throw new Error("cleanup unavailable");
        return realDb.batch(statements);
      },
    } as D1Database;
    const waits: Promise<unknown>[] = [];
    const response = await onRequestPost(
      context(request(), waits, cleanupFailingDb),
    );

    await expectJsonResponse(response, 200, CONFIRMED_BODY);
    expect(waits).toHaveLength(2);
    await settle(waits);
    expect(batches).toBe(4);
    expect(errorSpy.mock.calls).toHaveLength(1);
    const entry = errorSpy.mock.calls[0]![0] as Record<string, unknown>;
    expect(Object.keys(entry).sort()).toEqual(["event", "requestId"]);
  });

  it("maps a trigger collision to 503 without leaking any secret or internal ID", async () => {
    const seeded = await seedHttpToken();
    await env.NEWSLETTER_DB.prepare(
      `INSERT INTO newsletter_jobs (
         id, subscription_id, kind, dedupe_key, state, available_at, created_at
       ) VALUES (?, ?, 'resend_reconcile', 'artificial-dedupe', 'pending', ?, ?)`,
    )
      .bind(`job-resend-${seeded.tokenId}`, seeded.subscriptionId, new Date().toISOString(), new Date().toISOString())
      .run();
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const waits: Promise<unknown>[] = [];
    const response = await onRequestPost(context(request(), waits));

    const responseText = await response.text();
    expect(response.status).toBe(503);
    expect(responseText).toBe(ERROR_BODY);
    expect(waits).toHaveLength(1);
    await settle(waits);
    const digest = seeded.digest;
    const forbidden = [
      seeded.rawToken,
      digest,
      seeded.subscriptionId,
      seeded.tokenId,
      `job-resend-${seeded.tokenId}`,
      `${seeded.subscriptionId}@example.com`,
      "Pessoa HTTP",
    ];
    const publicText = `${responseText}\n${JSON.stringify(errorSpy.mock.calls)}`;
    for (const value of forbidden) expect(publicText).not.toContain(value);

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
    expect(await tableCount("newsletter_jobs")).toBe(1);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
