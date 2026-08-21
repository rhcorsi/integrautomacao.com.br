import { env as workerEnv } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  onRequestDelete,
  onRequestGet,
  onRequestHead,
  onRequestOptions,
  onRequestPatch,
  onRequestPost,
  onRequestPut,
} from "../functions/api/newsletter";
import {
  newsletterEnv,
  pagesContext,
  requestDetails,
  validNewsletterPayload,
} from "./helpers";

const NETWORK_BLOCK_MESSAGE = "B3_ENDPOINT_TEST_NETWORK_BLOCKED";
const NEUTRAL_BODY = JSON.stringify({
  ok: true,
  message:
    "Se o endereço puder receber a newsletter, enviaremos as próximas instruções por e-mail.",
});

interface CapturedRequest {
  body: string;
  headers: Headers;
  method: string;
  url: URL;
}

interface OutboundMock {
  requests: CapturedRequest[];
  resendRequests: CapturedRequest[];
}

interface OutboundOptions {
  requestHostname?: string;
  resend?: (request: CapturedRequest, attempt: number) => Promise<Response> | Response;
  turnstile?: Record<string, unknown>;
}

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(
    new Error(NETWORK_BLOCK_MESSAGE),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

function initialEnv(overrides: Record<string, unknown> = {}) {
  return {
    ...newsletterEnv,
    RESEND_TRANSACTIONAL_API_KEY: "transactional-only-key",
    NEWSLETTER_CONFIRMATION_ORIGIN: "https://integrautomacao.com.br",
    ...overrides,
  } as never;
}

function newsletterRequest(options: {
  contentType?: string;
  method?: string;
  origin?: string | null;
  payload?: unknown;
  referer?: string;
  secFetchSite?: string | null;
  url?: string;
} = {}): Request {
  const url = options.url ?? "https://integrautomacao.com.br/api/newsletter";
  const method = options.method ?? "POST";
  const headers = new Headers({
    "content-type": options.contentType ?? "application/json",
  });
  if (options.origin !== null) {
    headers.set("origin", options.origin ?? new URL(url).origin);
  }
  if (options.secFetchSite !== null) {
    headers.set("sec-fetch-site", options.secFetchSite ?? "same-origin");
  }
  if (options.referer) headers.set("referer", options.referer);

  return new Request(url, {
    method,
    headers,
    body:
      method === "GET" || method === "HEAD"
        ? undefined
        : JSON.stringify(options.payload ?? validNewsletterPayload),
  });
}

function installOutbound(options: OutboundOptions = {}): OutboundMock {
  const requests: CapturedRequest[] = [];
  const resendRequests: CapturedRequest[] = [];

  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const request = await requestDetails(input, init);
    requests.push(request);

    if (
      request.url.href ===
      "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    ) {
      return Response.json({
        success: true,
        action: "newsletter-form",
        hostname: options.requestHostname ?? "integrautomacao.com.br",
        ...options.turnstile,
      });
    }

    if (request.url.href === "https://api.resend.com/emails") {
      resendRequests.push(request);
      return (
        (await options.resend?.(request, resendRequests.length)) ??
        Response.json({ id: "message-1" })
      );
    }

    throw new Error(`${NETWORK_BLOCK_MESSAGE}: ${request.method} ${request.url.origin}`);
  });

  return { requests, resendRequests };
}

async function expectNeutral(response: Response): Promise<string> {
  expect(response.status).toBe(202);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("content-type")).toBe(
    "application/json; charset=utf-8",
  );
  expect(response.headers.get("x-request-id")).toMatch(
    /^[0-9a-f-]{36}$/i,
  );
  expect(response.headers.has("access-control-allow-origin")).toBe(false);
  const body = await response.text();
  expect(body).toBe(NEUTRAL_BODY);
  return body;
}

async function settleWaitUntil(promises: Promise<unknown>[]) {
  const settled = await Promise.allSettled(promises);
  expect(settled.every((result) => result.status === "fulfilled")).toBe(true);
  return settled;
}

async function countRows(table: string): Promise<number> {
  const allowed = new Set([
    "newsletter_subscriptions",
    "newsletter_consent_ledger",
    "newsletter_confirmation_tokens",
    "newsletter_jobs",
  ]);
  if (!allowed.has(table)) throw new Error("invalid test table");
  const row = await workerEnv.NEWSLETTER_DB.prepare(
    `SELECT count(*) AS total FROM ${table}`,
  ).first<{ total: number }>();
  return row?.total ?? -1;
}

async function seedConfirmedReconciliationJob() {
  const now = new Date(Date.now() - 60_000).toISOString();
  await workerEnv.NEWSLETTER_DB.prepare(
    `INSERT INTO newsletter_subscriptions (
       id, email_normalized, name, consent_state, policy_version,
       consent_text, consent_source, requested_at, confirmed_at,
       provider_state, created_at, updated_at
     ) VALUES ('existing-confirmed', 'existing-confirmed@example.com', 'Existing',
               'confirmed', 'policy-existing', 'Consentimento existing',
               'existing_form', ?, ?, 'pending', ?, ?)`,
  )
    .bind(now, now, now, now)
    .run();
  await workerEnv.NEWSLETTER_DB.prepare(
    `INSERT INTO newsletter_jobs (
       id, subscription_id, kind, dedupe_key, state, attempts,
       available_at, created_at
     ) VALUES ('job-existing-confirmed', 'existing-confirmed',
               'resend_reconcile', 'resend_reconcile:existing-confirmed',
               'pending', 0, ?, ?)`,
  )
    .bind(now, now)
    .run();
}

describe("B3 endpoint outbound-network isolation", () => {
  it("rejects every fetch that a test did not explicitly mock", async () => {
    await expect(
      fetch("https://api.resend.com/emails"),
    ).rejects.toThrow(NETWORK_BLOCK_MESSAGE);
  });
});

describe("newsletter method and request-origin policy", () => {
  it.each([
    ["GET", onRequestGet],
    ["HEAD", onRequestHead],
    ["PUT", onRequestPut],
    ["PATCH", onRequestPatch],
    ["DELETE", onRequestDelete],
    ["OPTIONS", onRequestOptions],
  ])("returns 405 without CORS for %s", async (method, handler) => {
    const response = await handler(
      pagesContext(
        newsletterRequest({ method }),
        initialEnv(),
      ) as never,
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    expect(response.headers.has("access-control-allow-origin")).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each([
    "https://integrautomacao.com.br",
    "https://www.integrautomacao.com.br",
    "https://newsletter.integrautomacao.com.br",
    "https://webinar.integrautomacao.com.br",
    "https://eventos.integrautomacao.com.br",
    "https://integrautomacao-com-br.pages.dev",
    "https://branch.integrautomacao-com-br.pages.dev",
    "http://localhost",
    "http://127.0.0.1",
    "http://[::1]",
  ])("accepts the exact host allowlist before honeypot handling: %s", async (origin) => {
    const waits: Promise<unknown>[] = [];
    const response = await onRequestPost(
      pagesContext(
        newsletterRequest({
          url: `${origin}/api/newsletter`,
          payload: { ...validNewsletterPayload, website: "filled" },
        }),
        initialEnv(),
        undefined,
        waits,
      ),
    );

    await expectNeutral(response);
    expect(waits).toHaveLength(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(await countRows("newsletter_subscriptions")).toBe(0);
  });

  it.each([
    "https://example.com",
    "https://integrautomacao.com.br.evil.example",
    "https://integrautomacao-com-br.pages.dev.evil.example",
    "https://pages.dev",
  ])("rejects arbitrary request host before Turnstile and D1: %s", async (origin) => {
    const response = await onRequestPost(
      pagesContext(
        newsletterRequest({ url: `${origin}/api/newsletter` }),
        initialEnv(),
      ),
    );

    expect(response.status).toBe(400);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(await countRows("newsletter_subscriptions")).toBe(0);
  });

  it.each([
    [null, "absent"],
    ["null", "null"],
    ["not a URL", "malformed"],
    ["https://example.com", "cross-origin"],
  ])("rejects $1 Origin before Turnstile and D1", async (origin, _label) => {
    const response = await onRequestPost(
      pagesContext(
        newsletterRequest({ origin }),
        initialEnv(),
      ),
    );

    expect(response.status).toBe(400);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(await countRows("newsletter_subscriptions")).toBe(0);
  });

  it("rejects a non-same-origin Sec-Fetch-Site before Turnstile and D1", async () => {
    const response = await onRequestPost(
      pagesContext(
        newsletterRequest({ secFetchSite: "cross-site" }),
        initialEnv(),
      ),
    );

    expect(response.status).toBe(400);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(await countRows("newsletter_subscriptions")).toBe(0);
  });
});

describe("newsletter validation and neutral durable response", () => {
  it.each([
    ["text/plain", validNewsletterPayload, 415],
    ["application/json", { ...validNewsletterPayload, lgpd: "0" }, 400],
    ["application/json", { ...validNewsletterPayload, name: "x" }, 400],
    ["application/json", { ...validNewsletterPayload, email: "invalid" }, 400],
  ])(
    "rejects invalid payload before Turnstile and D1",
    async (contentType, payload, status) => {
      const response = await onRequestPost(
        pagesContext(
          newsletterRequest({ contentType, payload }),
          initialEnv(),
        ),
      );

      expect(response.status).toBe(status);
      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(await countRows("newsletter_subscriptions")).toBe(0);
    },
  );

  it("preserves the 8 KiB request-body limit", async () => {
    const response = await onRequestPost(
      pagesContext(
        newsletterRequest({
          payload: { ...validNewsletterPayload, name: "x".repeat(8_100) },
        }),
        initialEnv(),
      ),
    );

    expect(response.status).toBe(413);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(await countRows("newsletter_subscriptions")).toBe(0);
  });

  it.each([
    [{ action: "contact-form" }, "wrong action"],
    [{ hostname: "example.com" }, "wrong hostname"],
  ])("rejects Turnstile with $1", async (turnstile, _label) => {
    const outbound = installOutbound({ turnstile });
    const response = await onRequestPost(
      pagesContext(newsletterRequest(), initialEnv()),
    );

    expect(response.status).toBe(403);
    expect(outbound.requests).toHaveLength(1);
    expect(outbound.resendRequests).toHaveLength(0);
    expect(await countRows("newsletter_subscriptions")).toBe(0);
  });

  it("returns immediately while Resend remains pending and settles three independent continuations later", async () => {
    let resolveResend!: (response: Response) => void;
    const pendingResend = new Promise<Response>((resolve) => {
      resolveResend = resolve;
    });
    const outbound = installOutbound({ resend: () => pendingResend });
    const waits: Promise<unknown>[] = [];

    const handler = onRequestPost(
      pagesContext(newsletterRequest(), initialEnv(), undefined, waits),
    );
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const response = await Promise.race([
      handler,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("handler awaited Resend")),
          250,
        );
      }),
    ]);
    if (timeout) clearTimeout(timeout);

    await expectNeutral(response);
    expect(outbound.resendRequests).toHaveLength(1);
    expect(waits).toHaveLength(3);
    resolveResend(Response.json({ id: "message-deferred" }));
    await settleWaitUntil(waits);

    const token = await workerEnv.NEWSLETTER_DB.prepare(
      "SELECT delivery_state FROM newsletter_confirmation_tokens",
    ).first<{ delivery_state: string }>();
    expect(token?.delivery_state).toBe("sent");
  });

  it("stores consent evidence, sends only /emails, and never persists the raw token", async () => {
    const outbound = installOutbound();
    const waits: Promise<unknown>[] = [];
    const response = await onRequestPost(
      pagesContext(
        newsletterRequest({
          referer: "https://integrautomacao.com.br/integra-acao/",
        }),
        initialEnv(),
        undefined,
        waits,
      ),
    );

    await expectNeutral(response);
    expect(waits).toHaveLength(3);
    await settleWaitUntil(waits);
    expect(outbound.resendRequests).toHaveLength(1);
    expect(
      outbound.requests.filter((request) => request.url.hostname === "api.resend.com"),
    ).toHaveLength(1);
    expect(outbound.resendRequests[0]!.url.pathname).toBe("/emails");
    expect(outbound.resendRequests[0]!.headers.get("authorization")).toBe(
      "Bearer transactional-only-key",
    );
    expect(outbound.resendRequests[0]!.url.search).toBe("");

    const providerBody = JSON.parse(outbound.resendRequests[0]!.body) as {
      html: string;
      text: string;
    };
    const rawToken = providerBody.text.match(/#token=([A-Za-z0-9_-]{43})/)?.[1];
    expect(rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(providerBody.text).not.toContain("?token=");

    const subscriptions = await workerEnv.NEWSLETTER_DB.prepare(
      "SELECT * FROM newsletter_subscriptions",
    ).all<Record<string, unknown>>();
    const ledger = await workerEnv.NEWSLETTER_DB.prepare(
      "SELECT * FROM newsletter_consent_ledger ORDER BY occurred_at, id",
    ).all<Record<string, unknown>>();
    const tokens = await workerEnv.NEWSLETTER_DB.prepare(
      "SELECT * FROM newsletter_confirmation_tokens",
    ).all<Record<string, unknown>>();
    const jobs = await workerEnv.NEWSLETTER_DB.prepare(
      "SELECT * FROM newsletter_jobs",
    ).all<Record<string, unknown>>();
    const storedText = JSON.stringify([
      subscriptions.results,
      ledger.results,
      tokens.results,
      jobs.results,
    ]);
    expect(storedText).not.toContain(rawToken!);

    const digest = String(tokens.results[0]!.token_sha256);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(subscriptions.results)).not.toContain(digest);
    expect(JSON.stringify(ledger.results)).not.toContain(digest);
    expect(JSON.stringify(jobs.results)).not.toContain(digest);
    expect(tokens.results[0]!.delivery_state).toBe("sent");

    const metadata = ledger.results.map((row) => String(row.metadata_json));
    expect(metadata.join("\n")).not.toContain(validNewsletterPayload.name);
    expect(metadata.join("\n")).not.toContain(validNewsletterPayload.email);
    expect(
      ledger.results.find((row) => row.event_type === "request_received")
        ?.consent_source,
    ).toBe("/integra-acao/");
    expect(
      ledger.results.filter(
        (row) => row.event_type === "confirmation_email_sent",
      ),
    ).toHaveLength(1);
  });

  it("keeps the new pending subscription out of Contacts while draining another confirmed job", async () => {
    await seedConfirmedReconciliationJob();
    installOutbound();
    const waits: Promise<unknown>[] = [];
    const response = await onRequestPost(
      pagesContext(newsletterRequest(), initialEnv(), undefined, waits),
    );

    await expectNeutral(response);
    expect(waits).toHaveLength(3);
    await settleWaitUntil(waits);
    const pending = await workerEnv.NEWSLETTER_DB.prepare(
      `SELECT consent_state, provider_state
         FROM newsletter_subscriptions WHERE email_normalized = ?`,
    )
      .bind(validNewsletterPayload.email)
      .first<Record<string, unknown>>();
    expect(pending).toEqual({
      consent_state: "pending",
      provider_state: "not_started",
    });
    const oldJob = await workerEnv.NEWSLETTER_DB.prepare(
      "SELECT state, attempts, last_error_code FROM newsletter_jobs WHERE id = 'job-existing-confirmed'",
    ).first<Record<string, unknown>>();
    expect(oldJob).toEqual({
      state: "pending",
      attempts: 1,
      last_error_code: "network",
    });
    const contacts = vi
      .mocked(globalThis.fetch)
      .mock.calls.map(([input]) => (typeof input === "string" ? input : ""))
      .filter((url) => url.startsWith("https://api.resend.com/contacts/"));
    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toContain("existing-confirmed%40example.com");
    expect(contacts[0]).not.toContain("pessoa%40example.com");
  });

  it("gives concurrent same-email requests two neutral responses but one email and token", async () => {
    const outbound = installOutbound();
    const waits: Promise<unknown>[] = [];
    const [first, second] = await Promise.all([
      onRequestPost(
        pagesContext(newsletterRequest(), initialEnv(), undefined, waits),
      ),
      onRequestPost(
        pagesContext(newsletterRequest(), initialEnv(), undefined, waits),
      ),
    ]);

    const bodies = await Promise.all([expectNeutral(first), expectNeutral(second)]);
    expect(bodies[0]).toBe(bodies[1]);
    await settleWaitUntil(waits);
    expect(outbound.resendRequests).toHaveLength(1);
    expect(await countRows("newsletter_confirmation_tokens")).toBe(1);
    const requestEvents = await workerEnv.NEWSLETTER_DB.prepare(
      "SELECT count(*) AS total FROM newsletter_consent_ledger WHERE event_type = 'request_received'",
    ).first<{ total: number }>();
    expect(requestEvents?.total).toBe(1);
  });

  it("returns the same neutral response for a live pending token and a confirmed subscription", async () => {
    let resolveResend!: (response: Response) => void;
    const pendingResend = new Promise<Response>((resolve) => {
      resolveResend = resolve;
    });
    const outbound = installOutbound({ resend: () => pendingResend });
    const waits: Promise<unknown>[] = [];

    const first = await onRequestPost(
      pagesContext(newsletterRequest(), initialEnv(), undefined, waits),
    );
    const liveToken = await onRequestPost(
      pagesContext(newsletterRequest(), initialEnv(), undefined, waits),
    );
    expect(await expectNeutral(first)).toBe(await expectNeutral(liveToken));
    expect(waits).toHaveLength(5);
    resolveResend(Response.json({ id: "message-live" }));
    await settleWaitUntil(waits);
    expect(outbound.resendRequests).toHaveLength(1);

    const token = await workerEnv.NEWSLETTER_DB.prepare(
      "SELECT id FROM newsletter_confirmation_tokens",
    ).first<{ id: string }>();
    await workerEnv.NEWSLETTER_DB.prepare(
      `UPDATE newsletter_confirmation_tokens
          SET consumed_at = ?, consumption_request_id = ?
        WHERE id = ?`,
    )
      .bind(new Date().toISOString(), crypto.randomUUID(), token!.id)
      .run();

    const confirmedWaits: Promise<unknown>[] = [];
    const confirmed = await onRequestPost(
      pagesContext(
        newsletterRequest(),
        initialEnv(),
        undefined,
        confirmedWaits,
      ),
    );
    expect(await expectNeutral(confirmed)).toBe(NEUTRAL_BODY);
    expect(confirmedWaits).toHaveLength(2);
    await settleWaitUntil(confirmedWaits);
    expect(outbound.resendRequests).toHaveLength(1);
  });
});

describe("newsletter delivery failure isolation", () => {
  it.each([
    ["provider_4xx", () => new Response("rejected", { status: 400 })],
    [
      "timeout",
      () => {
        throw new DOMException("deadline", "AbortError");
      },
    ],
  ])("keeps %s failure neutral and records one failed event", async (_label, responder) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const outbound = installOutbound({ resend: responder });
    const waits: Promise<unknown>[] = [];
    const response = await onRequestPost(
      pagesContext(newsletterRequest(), initialEnv(), undefined, waits),
    );

    await expectNeutral(response);
    await settleWaitUntil(waits);
    const token = await workerEnv.NEWSLETTER_DB.prepare(
      "SELECT delivery_state, revoked_at FROM newsletter_confirmation_tokens",
    ).first<{ delivery_state: string; revoked_at: string | null }>();
    expect(token?.delivery_state).toBe("failed");
    expect(token?.revoked_at).not.toBeNull();
    const failed = await workerEnv.NEWSLETTER_DB.prepare(
      "SELECT count(*) AS total FROM newsletter_consent_ledger WHERE event_type = 'confirmation_email_failed'",
    ).first<{ total: number }>();
    expect(failed?.total).toBe(1);
    expect(outbound.resendRequests.length).toBeGreaterThanOrEqual(1);
  });

  it("never uses legacy, send, or contacts credentials when transactional config is absent", async () => {
    const outbound = installOutbound();
    const waits: Promise<unknown>[] = [];
    const response = await onRequestPost(
      pagesContext(
        newsletterRequest(),
        initialEnv({
          RESEND_TRANSACTIONAL_API_KEY: undefined,
          RESEND_API_KEY: "legacy-key-must-not-send",
          RESEND_SEND_API_KEY: "send-key-must-not-send",
          RESEND_CONTACTS_API_KEY: "contacts-key-must-not-send",
        }),
        undefined,
        waits,
      ),
    );

    await expectNeutral(response);
    await settleWaitUntil(waits);
    expect(outbound.resendRequests).toHaveLength(0);
    const failed = await workerEnv.NEWSLETTER_DB.prepare(
      "SELECT metadata_json FROM newsletter_consent_ledger WHERE event_type = 'confirmation_email_failed'",
    ).first<{ metadata_json: string }>();
    expect(failed?.metadata_json).toContain('"error_code":"configuration"');
  });

  it.each([
    [
      "https://integrautomacao.com.br/api/newsletter",
      "https://preview.integrautomacao-com-br.pages.dev",
      "integrautomacao.com.br",
    ],
    [
      "https://branch.integrautomacao-com-br.pages.dev/api/newsletter",
      "https://integrautomacao.com.br",
      "branch.integrautomacao-com-br.pages.dev",
    ],
  ])(
    "blocks incoherent request and confirmation environments after storage",
    async (url, confirmationOrigin, requestHostname) => {
      const outbound = installOutbound({ requestHostname });
      const waits: Promise<unknown>[] = [];
      const response = await onRequestPost(
        pagesContext(
          newsletterRequest({ url }),
          initialEnv({ NEWSLETTER_CONFIRMATION_ORIGIN: confirmationOrigin }),
          undefined,
          waits,
        ),
      );

      await expectNeutral(response);
      await settleWaitUntil(waits);
      expect(outbound.resendRequests).toHaveLength(0);
      const failed = await workerEnv.NEWSLETTER_DB.prepare(
        "SELECT metadata_json FROM newsletter_consent_ledger WHERE event_type = 'confirmation_email_failed'",
      ).first<{ metadata_json: string }>();
      expect(failed?.metadata_json).toContain('"error_code":"configuration"');
    },
  );

  it.each([
    ["http://localhost/api/newsletter", "https://integrautomacao.com.br", "localhost"],
    [
      "http://127.0.0.1/api/newsletter",
      "https://preview.integrautomacao-com-br.pages.dev",
      "127.0.0.1",
    ],
  ])(
    "never sends a loopback registration to production or preview",
    async (url, confirmationOrigin, requestHostname) => {
      const outbound = installOutbound({ requestHostname });
      const waits: Promise<unknown>[] = [];
      const response = await onRequestPost(
        pagesContext(
          newsletterRequest({ url }),
          initialEnv({ NEWSLETTER_CONFIRMATION_ORIGIN: confirmationOrigin }),
          undefined,
          waits,
        ),
      );

      await expectNeutral(response);
      expect(waits).toHaveLength(3);
      await settleWaitUntil(waits);
      expect(outbound.resendRequests).toHaveLength(0);
      const failed = await workerEnv.NEWSLETTER_DB.prepare(
        "SELECT metadata_json FROM newsletter_consent_ledger WHERE event_type = 'confirmation_email_failed'",
      ).first<{ metadata_json: string }>();
      expect(failed?.metadata_json).toContain('"error_code":"configuration"');
    },
  );

  it.each([
    ["https://integrautomacao.com.br", 1],
    ["https://preview.integrautomacao-com-br.pages.dev", 0],
  ])(
    "treats the root Pages request host as production for confirmation origin %s",
    async (confirmationOrigin, expectedEmails) => {
      const outbound = installOutbound({
        requestHostname: "integrautomacao-com-br.pages.dev",
      });
      const waits: Promise<unknown>[] = [];
      const response = await onRequestPost(
        pagesContext(
          newsletterRequest({
            url: "https://integrautomacao-com-br.pages.dev/api/newsletter",
          }),
          initialEnv({ NEWSLETTER_CONFIRMATION_ORIGIN: confirmationOrigin }),
          undefined,
          waits,
        ),
      );

      await expectNeutral(response);
      await settleWaitUntil(waits);
      expect(outbound.resendRequests).toHaveLength(expectedEmails);
    },
  );

  it("returns 503 for a pre-storage D1 binding failure and never calls Resend", async () => {
    const outbound = installOutbound();
    const waits: Promise<unknown>[] = [];
    const response = await onRequestPost(
      pagesContext(
        newsletterRequest(),
        initialEnv({ NEWSLETTER_DB: undefined }),
        undefined,
        waits,
      ),
    );

    expect(response.status).toBe(503);
    expect(waits).toHaveLength(0);
    expect(outbound.resendRequests).toHaveLength(0);
  });

  it("keeps post-storage D1 failures neutral and never records a false failure", async () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const realDb = workerEnv.NEWSLETTER_DB;
    let batches = 0;
    const failingDb = {
      prepare: realDb.prepare.bind(realDb),
      batch: async (statements: D1PreparedStatement[]) => {
        batches += 1;
        if (batches > 1) throw new Error("post-storage D1 unavailable");
        return realDb.batch(statements);
      },
    };
    const outbound = installOutbound();
    const waits: Promise<unknown>[] = [];
    const response = await onRequestPost(
      pagesContext(
        newsletterRequest(),
        initialEnv({ NEWSLETTER_DB: failingDb }),
        undefined,
        waits,
      ),
    );

    await expectNeutral(response);
    await settleWaitUntil(waits);
    expect(outbound.resendRequests).toHaveLength(1);
    const token = await realDb.prepare(
      "SELECT delivery_state FROM newsletter_confirmation_tokens",
    ).first<{ delivery_state: string }>();
    expect(token?.delivery_state).toBe("dispatching");
    const failed = await realDb.prepare(
      "SELECT count(*) AS total FROM newsletter_consent_ledger WHERE event_type = 'confirmation_email_failed'",
    ).first<{ total: number }>();
    expect(failed?.total).toBe(0);
    const allowedLogFields = new Set([
      "event",
      "requestId",
      "tokenId",
      "state",
      "attempts",
      "providerStatus",
      "errorCode",
      "purged",
    ]);
    for (const [entry] of errorSpy.mock.calls) {
      expect(entry).toBeTypeOf("object");
      expect(
        Object.keys(entry as Record<string, unknown>).every((field) =>
          allowedLogFields.has(field),
        ),
      ).toBe(true);
    }
  });

  it("keeps cleanup rejection independent from successful delivery", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const realDb = workerEnv.NEWSLETTER_DB;
    let batches = 0;
    const cleanupFailingDb = {
      prepare: realDb.prepare.bind(realDb),
      batch: async (statements: D1PreparedStatement[]) => {
        batches += 1;
        if (batches === 2) throw new Error("cleanup unavailable");
        return realDb.batch(statements);
      },
    };
    let resolveResend!: (response: Response) => void;
    const pendingResend = new Promise<Response>((resolve) => {
      resolveResend = resolve;
    });
    const outbound = installOutbound({ resend: () => pendingResend });
    const waits: Promise<unknown>[] = [];
    const response = await onRequestPost(
      pagesContext(
        newsletterRequest(),
        initialEnv({ NEWSLETTER_DB: cleanupFailingDb }),
        undefined,
        waits,
      ),
    );

    await expectNeutral(response);
    resolveResend(Response.json({ id: "message-after-cleanup-failure" }));
    await settleWaitUntil(waits);
    expect(outbound.resendRequests).toHaveLength(1);
    const sent = await realDb.prepare(
      "SELECT count(*) AS total FROM newsletter_consent_ledger WHERE event_type = 'confirmation_email_sent'",
    ).first<{ total: number }>();
    expect(sent?.total).toBe(1);
  });

  it("schedules one independent cleanup for a stored result and contains its rejection", async () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const realDb = workerEnv.NEWSLETTER_DB;
    const outbound = installOutbound();
    const firstWaits: Promise<unknown>[] = [];
    const first = await onRequestPost(
      pagesContext(newsletterRequest(), initialEnv(), undefined, firstWaits),
    );
    await expectNeutral(first);
    await settleWaitUntil(firstWaits);
    expect(outbound.resendRequests).toHaveLength(1);

    let batches = 0;
    const storedCleanupFailingDb = {
      prepare: realDb.prepare.bind(realDb),
      batch: async (statements: D1PreparedStatement[]) => {
        batches += 1;
        if (batches === 2) throw new Error("stored cleanup unavailable");
        return realDb.batch(statements);
      },
    };
    const storedWaits: Promise<unknown>[] = [];
    const stored = await onRequestPost(
      pagesContext(
        newsletterRequest(),
        initialEnv({ NEWSLETTER_DB: storedCleanupFailingDb }),
        undefined,
        storedWaits,
      ),
    );

    await expectNeutral(stored);
    expect(storedWaits).toHaveLength(2);
    await settleWaitUntil(storedWaits);
    expect(outbound.resendRequests).toHaveLength(1);
    expect(batches).toBe(2);
    expect(
      errorSpy.mock.calls.some(
        ([entry]) =>
          typeof entry === "object" &&
          entry !== null &&
          "state" in entry &&
          entry.state === "cleanup_exception",
      ),
    ).toBe(true);
  });

  it("does not revoke a potentially delivered link when sent CAS returns false", async () => {
    let resolveResend!: (response: Response) => void;
    const pendingResend = new Promise<Response>((resolve) => {
      resolveResend = resolve;
    });
    const outbound = installOutbound({ resend: () => pendingResend });
    const waits: Promise<unknown>[] = [];
    const response = await onRequestPost(
      pagesContext(newsletterRequest(), initialEnv(), undefined, waits),
    );
    await expectNeutral(response);

    await workerEnv.NEWSLETTER_DB.prepare(
      "UPDATE newsletter_confirmation_tokens SET revoked_at = ?",
    )
      .bind(new Date().toISOString())
      .run();
    resolveResend(Response.json({ id: "message-cas-false" }));
    await settleWaitUntil(waits);

    expect(outbound.resendRequests).toHaveLength(1);
    const deliveryEvents = await workerEnv.NEWSLETTER_DB.prepare(
      `SELECT count(*) AS total FROM newsletter_consent_ledger
        WHERE event_type IN ('confirmation_email_sent', 'confirmation_email_failed')`,
    ).first<{ total: number }>();
    expect(deliveryEvents?.total).toBe(0);
  });

  it("logs only sanitized identifiers and enum state", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const providerSecret = "provider-body-must-not-be-logged";
    const outbound = installOutbound({
      resend: () => new Response(providerSecret, { status: 503 }),
    });
    const waits: Promise<unknown>[] = [];
    const response = await onRequestPost(
      pagesContext(newsletterRequest(), initialEnv(), undefined, waits),
    );
    await expectNeutral(response);
    await settleWaitUntil(waits);

    const providerBody = JSON.parse(outbound.resendRequests[0]!.body) as {
      text: string;
    };
    const rawToken = providerBody.text.match(/#token=([A-Za-z0-9_-]{43})/)?.[1];
    const token = await workerEnv.NEWSLETTER_DB.prepare(
      "SELECT token_sha256 FROM newsletter_confirmation_tokens",
    ).first<{ token_sha256: string }>();
    const logs = JSON.stringify([
      errorSpy.mock.calls,
      warnSpy.mock.calls,
      infoSpy.mock.calls,
    ]);
    for (const forbidden of [
      validNewsletterPayload.name,
      validNewsletterPayload.email,
      rawToken!,
      token!.token_sha256,
      "Bearer transactional-only-key",
      providerSecret,
      "https://api.resend.com/emails",
    ]) {
      expect(logs).not.toContain(forbidden);
    }
  });
});
