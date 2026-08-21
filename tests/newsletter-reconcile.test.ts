import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createResendNewsletterProvider,
  type BoundedProviderRequest,
  type NewsletterProvider,
  type ProviderSnapshot,
} from "../functions/_shared/newsletter/provider";
import {
  drainNewsletterJobs,
  reconcileNewsletterJob,
} from "../functions/_shared/newsletter/reconcile";
import { createNewsletterStore } from "../functions/_shared/newsletter/store";
import {
  RESEND_PROVIDER_MAX_RESPONSE_BYTES,
  type NewsletterReconciliationStore,
  type ProviderConsentEvidence,
  type ReconciliationClock,
  type ReconciliationJob,
} from "../functions/_shared/newsletter/types";

const NOW = "2026-08-20T14:00:00.000Z";
const REQUEST_ID = "00000000-0000-4000-8000-000000000201";
const NETWORK_BLOCK_MESSAGE = "B5_UNEXPECTED_PROVIDER_TRAFFIC";
const EVIDENCE: ProviderConsentEvidence = {
  newsletter_consent_at: NOW,
  newsletter_policy_version: "policy-b5",
  newsletter_consent_text: "Consentimento B5",
  newsletter_consent_source: "newsletter_form",
};

interface ProviderCall {
  body: string;
  headers: Headers;
  method: string;
  redirect: RequestRedirect | undefined;
  timeoutMs: number;
  url: URL;
}

class MutableClock implements ReconciliationClock {
  wall = new Date(NOW);
  monotonic = 0;

  wallNow(): Date {
    return new Date(this.wall);
  }

  monotonicNow(): number {
    return this.monotonic;
  }
}

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status });
}

function contact(options: {
  evidence?: ProviderConsentEvidence;
  email?: string;
  id?: string;
  unsubscribed?: boolean;
} = {}) {
  const evidence = options.evidence ?? EVIDENCE;
  return {
    object: "contact",
    id: options.id ?? "contact-1",
    email: options.email ?? "person+tag@example.com",
    unsubscribed: options.unsubscribed ?? false,
    properties: Object.fromEntries(
      Object.entries(evidence).map(([key, value]) => [
        key,
        { value, type: "string" },
      ]),
    ),
  };
}

function requestScript(responses: Response[]) {
  const calls: ProviderCall[] = [];
  const request: BoundedProviderRequest = vi.fn(
    async (input, init, timeoutMs, maxResponseBytes) => {
      expect(maxResponseBytes).toBe(RESEND_PROVIDER_MAX_RESPONSE_BYTES);
      const headers = new Headers(init.headers);
      calls.push({
        body: typeof init.body === "string" ? init.body : "",
        headers,
        method: init.method ?? "GET",
        redirect: init.redirect,
        timeoutMs,
        url: new URL(input),
      });
      const response = responses.shift();
      if (!response) throw new Error(NETWORK_BLOCK_MESSAGE);
      return response;
    },
  );
  return { calls, request, responses };
}

function providerWith(
  responses: Response[],
  overrides: Partial<{
    contactsApiKey: string;
    segmentId: string;
    topicId: string;
  }> = {},
) {
  const clock = new MutableClock();
  const script = requestScript(responses);
  const provider = createResendNewsletterProvider({
    contactsApiKey: overrides.contactsApiKey ?? "contacts-key",
    segmentId: overrides.segmentId ?? "segment/primary",
    topicId: overrides.topicId ?? "topic primary",
    clock,
    request: script.request,
  });
  return { clock, provider, ...script };
}

function completeReadResponses(options: {
  contact?: Record<string, unknown>;
  segmentData?: unknown;
  segmentHasMore?: unknown;
  topicData?: unknown;
  topicHasMore?: unknown;
} = {}): Response[] {
  const segmentHasMore = Object.prototype.hasOwnProperty.call(
    options,
    "segmentHasMore",
  )
    ? options.segmentHasMore
    : false;
  const topicHasMore = Object.prototype.hasOwnProperty.call(
    options,
    "topicHasMore",
  )
    ? options.topicHasMore
    : false;
  return [
    json(options.contact ?? contact()),
    json({
      object: "list",
      data: options.segmentData ?? [{ id: "segment/primary" }],
      has_more: segmentHasMore,
    }),
    json({
      object: "list",
      data:
        options.topicData ?? [{ id: "topic primary", subscription: "opt_in" }],
      has_more: topicHasMore,
    }),
  ];
}

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(
    new Error(NETWORK_BLOCK_MESSAGE),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("B5 Resend Contacts adapter", () => {
  it("reads exact Contact, Segment, Topic and typed evidence with official headers", async () => {
    const { provider, calls, responses } = providerWith(completeReadResponses());

    await expect(
      provider.read({
        reference: { kind: "email", value: "person+tag@example.com" },
        expectedEmailNormalized: "person+tag@example.com",
        expectedEvidence: EVIDENCE,
        deadlineMs: 25_000,
      }),
    ).resolves.toEqual({
      kind: "exists",
      contactId: "contact-1",
      globallyUnsubscribed: false,
      inSegment: true,
      topic: "opt_in",
      evidence: "matches",
    });
    expect(responses).toHaveLength(0);
    expect(calls.map(({ method, url }) => [method, url.href])).toEqual([
      ["GET", "https://api.resend.com/contacts/person%2Btag%40example.com"],
      ["GET", "https://api.resend.com/contacts/contact-1/segments"],
      ["GET", "https://api.resend.com/contacts/contact-1/topics"],
    ]);
    for (const call of calls) {
      expect(call.headers.get("authorization")).toBe("Bearer contacts-key");
      expect(call.headers.get("user-agent")).toBe(
        "integrautomacao-newsletter/1.0",
      );
      expect(call.headers.get("accept")).toBe("application/json");
      expect(call.headers.has("idempotency-key")).toBe(false);
      expect(call.url.search).toBe("");
      expect(call.timeoutMs).toBe(4_000);
      expect(call.redirect).toBe("error");
    }
  });

  it("sets redirect:error on mutations so Bearer and JSON cannot follow 307/308", async () => {
    const request = vi.fn<BoundedProviderRequest>(async (_input, init) => {
      if (init.redirect !== "error") {
        throw new Error("MOCK_WOULD_FORWARD_AUTHORIZATION_TO_REDIRECT");
      }
      return json({ object: "contact", id: "contact-1" });
    });
    const provider = createResendNewsletterProvider({
      contactsApiKey: "contacts-key",
      segmentId: "segment-id",
      topicId: "topic-id",
      clock: new MutableClock(),
      request,
    });
    await expect(
      provider.createConfirmedContact({
        emailNormalized: "person@example.com",
        evidence: EVIDENCE,
        deadlineMs: 25_000,
      }),
    ).resolves.toEqual({ kind: "applied", providerStatus: 200 });
    expect(request).toHaveBeenCalledOnce();
  });

  it.each(["create", "patch"] as const)(
    "rejects extra enumerable, symbol and non-enumerable evidence keys before %s",
    async (operation) => {
      for (const decorate of [
        (value: Record<PropertyKey, unknown>) => {
          value.extra = "forbidden";
        },
        (value: Record<PropertyKey, unknown>) => {
          value[Symbol("forbidden")] = "forbidden";
        },
        (value: Record<PropertyKey, unknown>) => {
          Object.defineProperty(value, "hidden", { value: "forbidden" });
        },
      ]) {
        const setup = providerWith([]);
        const evidence = { ...EVIDENCE } as Record<PropertyKey, unknown>;
        decorate(evidence);
        const action =
          operation === "create"
            ? setup.provider.createConfirmedContact({
                emailNormalized: "person@example.com",
                evidence: evidence as unknown as ProviderConsentEvidence,
                deadlineMs: 25_000,
              })
            : setup.provider.updateConsentEvidence({
                contactId: "contact-1",
                evidence: evidence as unknown as ProviderConsentEvidence,
                deadlineMs: 25_000,
              });
        await expect(action).rejects.toThrow(/evidence/i);
        expect(setup.calls).toHaveLength(0);
      }
    },
  );

  it("does not start membership reads for mismatched contact identity", async () => {
    const { provider, calls } = providerWith([
      json(contact({ email: "different@example.com" })),
    ]);
    await expect(
      provider.read({
        reference: { kind: "contact-id", value: "saved/contact" },
        expectedEmailNormalized: "person+tag@example.com",
        expectedEvidence: EVIDENCE,
        deadlineMs: 25_000,
      }),
    ).resolves.toEqual({ kind: "unavailable", code: "readback_mismatch" });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url.href).toBe(
      "https://api.resend.com/contacts/saved%2Fcontact",
    );
  });

  it("falls back once from a saved-ID 404 to the expected normalized email", async () => {
    const { provider, calls } = providerWith([
      json({ error: "not-found" }, 404),
      ...completeReadResponses(),
    ]);
    await expect(
      provider.read({
        reference: { kind: "contact-id", value: "missing-id" },
        expectedEmailNormalized: "person+tag@example.com",
        expectedEvidence: EVIDENCE,
        deadlineMs: 25_000,
      }),
    ).resolves.toEqual(expect.objectContaining({ kind: "exists" }));
    expect(calls.slice(0, 2).map(({ url }) => url.href)).toEqual([
      "https://api.resend.com/contacts/missing-id",
      "https://api.resend.com/contacts/person%2Btag%40example.com",
    ]);
  });

  it.each([
    ["missing unsubscribed", { ...contact(), unsubscribed: undefined }, false],
    ["malformed evidence", { ...contact(), properties: [] }, false],
    ["segment has_more true", contact(), true],
    ["segment missing has_more", contact(), undefined],
  ])("fails closed on %s", async (_name, contactBody, hasMore) => {
    const responses =
      hasMore === false
        ? [json(contactBody)]
        : completeReadResponses({
            contact: contactBody,
            segmentHasMore: hasMore,
          });
    const { provider } = providerWith(responses);
    await expect(
      provider.read({
        reference: { kind: "email", value: "person+tag@example.com" },
        expectedEmailNormalized: "person+tag@example.com",
        expectedEvidence: EVIDENCE,
        deadlineMs: 25_000,
      }),
    ).resolves.toEqual(
      expect.objectContaining({ kind: "unavailable", code: "invalid_response" }),
    );
  });

  it.each([
    [
      "malformed Segment data",
      completeReadResponses({ segmentData: { id: "segment/primary" } }),
    ],
    [
      "missing Topic has_more",
      completeReadResponses({ topicHasMore: undefined }),
    ],
    [
      "Topic has_more true",
      completeReadResponses({ topicHasMore: true }),
    ],
    [
      "malformed Topic data",
      completeReadResponses({ topicData: [{ id: 1, subscription: "opt_in" }] }),
    ],
    ["missing contact ID", [json({ ...contact(), id: undefined })]],
    ["non-string contact email", [json({ ...contact(), email: 1 })]],
    [
      "wrong property type",
      [
        json({
          ...contact(),
          properties: {
            ...contact().properties,
            newsletter_consent_at: { value: NOW, type: "date" },
          },
        }),
      ],
    ],
  ])("returns invalid_response for %s", async (_label, responses) => {
    const { provider } = providerWith(responses);
    await expect(
      provider.read({
        reference: { kind: "email", value: "person+tag@example.com" },
        expectedEmailNormalized: "person+tag@example.com",
        expectedEvidence: EVIDENCE,
        deadlineMs: 25_000,
      }),
    ).resolves.toEqual(
      expect.objectContaining({ kind: "unavailable", code: "invalid_response" }),
    );
  });

  it.each([
    ["missing property", undefined],
    ["different property value", "different"],
  ])("classifies a well-formed %s as evidence mismatch", async (_label, value) => {
    const properties = { ...contact().properties } as Record<string, unknown>;
    if (value === undefined) delete properties.newsletter_consent_at;
    else properties.newsletter_consent_at = { value, type: "string" };
    const { provider } = providerWith(
      completeReadResponses({ contact: { ...contact(), properties } }),
    );
    await expect(
      provider.read({
        reference: { kind: "email", value: "person+tag@example.com" },
        expectedEmailNormalized: "person+tag@example.com",
        expectedEvidence: EVIDENCE,
        deadlineMs: 25_000,
      }),
    ).resolves.toEqual(expect.objectContaining({ evidence: "mismatch" }));
  });

  it("returns a validated observed contact ID when a later list is unavailable", async () => {
    const { provider } = providerWith([
      json(contact({ id: "validated-contact" })),
      json({ error: "busy" }, 503),
      json({ object: "list", data: [], has_more: false }),
    ]);
    await expect(
      provider.read({
        reference: { kind: "email", value: "person+tag@example.com" },
        expectedEmailNormalized: "person+tag@example.com",
        expectedEvidence: EVIDENCE,
        deadlineMs: 25_000,
      }),
    ).resolves.toEqual({
      kind: "unavailable",
      code: "provider_5xx",
      providerStatus: 503,
      observedContactId: "validated-contact",
    });
  });

  it("uses the exact create body without name, unsubscribed or idempotency", async () => {
    const { provider, calls } = providerWith([json({ object: "contact", id: "c" })]);
    await expect(
      provider.createConfirmedContact({
        emailNormalized: "person+tag@example.com",
        evidence: EVIDENCE,
        deadlineMs: 25_000,
      }),
    ).resolves.toEqual({ kind: "applied", providerStatus: 200 });
    expect(calls[0]).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "person+tag@example.com",
          properties: EVIDENCE,
          segments: [{ id: "segment/primary" }],
          topics: [{ id: "topic primary", subscription: "opt_in" }],
        }),
      }),
    );
    expect(calls[0]?.url.href).toBe("https://api.resend.com/contacts");
    expect(calls[0]?.headers.get("content-type")).toBe("application/json");
    expect(calls[0]?.headers.has("idempotency-key")).toBe(false);
    expect(calls[0]?.body).not.toMatch(/name|unsubscribed/i);
  });

  it("uses exact evidence, Segment and root-array Topic mutation wires", async () => {
    const { provider, calls } = providerWith([
      json({ object: "contact", id: "contact/1" }),
      json({ id: "segment/primary" }),
      json({ object: "contact_topics", id: "contact/1" }),
    ]);
    await provider.updateConsentEvidence({
      contactId: "contact/1",
      evidence: EVIDENCE,
      deadlineMs: 25_000,
    });
    await provider.addConfiguredSegment({
      contactId: "contact/1",
      deadlineMs: 25_000,
    });
    await provider.optIntoConfiguredTopic({
      contactId: "contact/1",
      deadlineMs: 25_000,
    });
    expect(calls.map(({ method, url, body }) => [method, url.href, body])).toEqual([
      [
        "PATCH",
        "https://api.resend.com/contacts/contact%2F1",
        JSON.stringify({ properties: EVIDENCE }),
      ],
      [
        "POST",
        "https://api.resend.com/contacts/contact%2F1/segments/segment%2Fprimary",
        "",
      ],
      [
        "PATCH",
        "https://api.resend.com/contacts/contact%2F1/topics",
        JSON.stringify([{ id: "topic primary", subscription: "opt_in" }]),
      ],
    ]);
  });

  it("reads Segment and Topic in parallel after a saved-ID identity check", async () => {
    let resolveSegment!: (value: Response) => void;
    let resolveTopic!: (value: Response) => void;
    const segment = new Promise<Response>((resolve) => {
      resolveSegment = resolve;
    });
    const topic = new Promise<Response>((resolve) => {
      resolveTopic = resolve;
    });
    const calls: string[] = [];
    const request: BoundedProviderRequest = vi.fn(async (input) => {
      calls.push(input);
      if (input.endsWith("/contacts/contact-1")) return json(contact());
      if (input.endsWith("/segments")) return segment;
      if (input.endsWith("/topics")) return topic;
      throw new Error(NETWORK_BLOCK_MESSAGE);
    });
    const provider = createResendNewsletterProvider({
      contactsApiKey: "contacts-key",
      segmentId: "segment/primary",
      topicId: "topic primary",
      clock: new MutableClock(),
      request,
    });
    const pending = provider.read({
      reference: { kind: "contact-id", value: "contact-1" },
      expectedEmailNormalized: "person+tag@example.com",
      expectedEvidence: EVIDENCE,
      deadlineMs: 25_000,
    });
    await vi.waitFor(() => expect(calls).toHaveLength(3));
    resolveSegment(
      json({ object: "list", data: [{ id: "segment/primary" }], has_more: false }),
    );
    resolveTopic(
      json({
        object: "list",
        data: [{ id: "topic primary", subscription: "opt_in" }],
        has_more: false,
      }),
    );
    await expect(pending).resolves.toEqual(expect.objectContaining({ kind: "exists" }));
  });

  it("short-circuits an initial global opt-out after the Contact GET", async () => {
    const { provider, calls } = providerWith([
      json(contact({ unsubscribed: true })),
    ]);
    await expect(
      provider.read({
        reference: { kind: "email", value: "person+tag@example.com" },
        expectedEmailNormalized: "person+tag@example.com",
        expectedEvidence: EVIDENCE,
        deadlineMs: 25_000,
      }),
    ).resolves.toEqual(
      expect.objectContaining({ kind: "exists", globallyUnsubscribed: true }),
    );
    expect(calls).toHaveLength(1);
  });

  it.each([
    ["missing", {}],
    ["malformed", []],
    [
      "mismatching",
      {
        ...contact().properties,
        newsletter_consent_at: { value: "different", type: "string" },
      },
    ],
  ])("lets global opt-out win over %s consent properties", async (_label, properties) => {
    const { provider, calls } = providerWith([
      json({ ...contact({ unsubscribed: true }), properties }),
    ]);
    await expect(
      provider.read({
        reference: { kind: "email", value: "person+tag@example.com" },
        expectedEmailNormalized: "person+tag@example.com",
        expectedEvidence: EVIDENCE,
        deadlineMs: 25_000,
      }),
    ).resolves.toEqual(
      expect.objectContaining({ kind: "exists", globallyUnsubscribed: true }),
    );
    expect(calls).toHaveLength(1);
  });

  it("computes a one-millisecond timeout at the exact 2,001-ms GET boundary", async () => {
    const setup = providerWith(completeReadResponses());
    setup.clock.monotonic = 22_999;
    await setup.provider.read({
      reference: { kind: "email", value: "person+tag@example.com" },
      expectedEmailNormalized: "person+tag@example.com",
      expectedEvidence: EVIDENCE,
      deadlineMs: 25_000,
    });
    expect(setup.calls.map(({ timeoutMs }) => timeoutMs)).toEqual([1, 1, 1]);
  });

  it.each([
    ["timeout", new DOMException("deadline", "AbortError")],
    ["network", new TypeError("socket closed")],
  ])("does not retry a %s mutation inline", async (code, rejection) => {
    const request = vi.fn<BoundedProviderRequest>().mockRejectedValue(rejection);
    const provider = createResendNewsletterProvider({
      contactsApiKey: "contacts-key",
      segmentId: "segment/primary",
      topicId: "topic primary",
      clock: new MutableClock(),
      request,
    });
    await expect(
      provider.optIntoConfiguredTopic({
        contactId: "contact-1",
        deadlineMs: 25_000,
      }),
    ).resolves.toEqual({ kind: "ambiguous", code });
    expect(request).toHaveBeenCalledOnce();
  });

  it.each([
    [409, "ambiguous", "provider_4xx"],
    [422, "ambiguous", "provider_4xx"],
    [429, "failed", "provider_rate_limited"],
    [503, "ambiguous", "provider_5xx"],
  ] as const)(
    "maps mutation status %i to %s/%s without an inline retry",
    async (status, kind, code) => {
      const { provider, calls } = providerWith([json({ error: "bounded" }, status)]);
      await expect(
        provider.addConfiguredSegment({
          contactId: "contact-1",
          deadlineMs: 25_000,
        }),
      ).resolves.toEqual({ kind, code, providerStatus: status });
      expect(calls).toHaveLength(1);
    },
  );

  it("fails closed on malformed and oversized non-2xx bodies", async () => {
    const malformed = new Response("not-json", { status: 429 });
    const oversized = new Response("x".repeat(32_769), { status: 503 });
    for (const response of [malformed, oversized]) {
      const { provider } = providerWith([response]);
      await expect(
        provider.addConfiguredSegment({
          contactId: "contact-1",
          deadlineMs: 25_000,
        }),
      ).resolves.toEqual({ kind: "failed", code: "invalid_response" });
    }
  });

  it("fails closed on malformed successful mutation acknowledgements", async () => {
    const { provider } = providerWith([json({ object: "wrong", id: 1 })]);
    await expect(
      provider.updateConsentEvidence({
        contactId: "contact-1",
        evidence: EVIDENCE,
        deadlineMs: 25_000,
      }),
    ).resolves.toEqual({
      kind: "ambiguous",
      code: "invalid_response",
      providerStatus: 200,
    });
  });

  it("validates exact opaque/key bounds before any provider request", async () => {
    const valid = providerWith([], {
      contactsApiKey: "k".repeat(4_096),
      segmentId: "s".repeat(512),
      topicId: "t".repeat(512),
    });
    await expect(
      valid.provider.addConfiguredSegment({
        contactId: "c".repeat(512),
        deadlineMs: 25_000,
      }),
    ).resolves.toEqual({ kind: "ambiguous", code: "network" });
    expect(valid.calls).toHaveLength(1);

    for (const overrides of [
      { contactsApiKey: "k".repeat(4_097) },
      { segmentId: "s".repeat(513) },
      { topicId: " control\u0000" },
    ]) {
      const invalid = providerWith([], overrides);
      await expect(
        invalid.provider.addConfiguredSegment({
          contactId: "contact-1",
          deadlineMs: 25_000,
        }),
      ).rejects.toThrow();
      expect(invalid.calls).toHaveLength(0);
    }
  });
});

const JOB: ReconciliationJob = {
  id: "job-internal",
  subscriptionId: "subscription-internal",
  attempt: 1,
  leaseUntil: "2026-08-20T14:00:30.000Z",
  emailNormalized: "person+tag@example.com",
  confirmedAt: NOW,
  policyVersion: "policy-b5",
  consentText: "Consentimento B5",
  consentSource: "newsletter_form",
  providerContactId: null,
};

function providerMock(reads: ProviderSnapshot[]) {
  const read = vi.fn<NewsletterProvider["read"]>(async () => {
    const next = reads.shift();
    if (!next) throw new Error("UNEXPECTED_PROVIDER_READ");
    return next;
  });
  return {
    read,
    createConfirmedContact: vi.fn<NewsletterProvider["createConfirmedContact"]>(async () => ({
      kind: "applied" as const,
      providerStatus: 200,
    })),
    updateConsentEvidence: vi.fn<NewsletterProvider["updateConsentEvidence"]>(async () => ({
      kind: "applied" as const,
      providerStatus: 200,
    })),
    addConfiguredSegment: vi.fn<NewsletterProvider["addConfiguredSegment"]>(async () => ({
      kind: "applied" as const,
      providerStatus: 200,
    })),
    optIntoConfiguredTopic: vi.fn<NewsletterProvider["optIntoConfiguredTopic"]>(async () => ({
      kind: "applied" as const,
      providerStatus: 200,
    })),
  } satisfies NewsletterProvider;
}

function storeMock() {
  return {
    markProviderReconciled: vi.fn(async () => true),
    markProviderGlobalOptOut: vi.fn(async () => true),
    rescheduleReconciliation: vi.fn(async () => true),
  } as unknown as NewsletterReconciliationStore;
}

function exists(
  overrides: Partial<Extract<ProviderSnapshot, { kind: "exists" }>> = {},
): Extract<ProviderSnapshot, { kind: "exists" }> {
  return {
    kind: "exists",
    contactId: "contact-1",
    globallyUnsubscribed: false,
    inSegment: true,
    topic: "opt_in",
    evidence: "matches",
    ...overrides,
  };
}

describe("B5 reconciliation state machine", () => {
  it("blocks global opt-out immediately without any provider mutation", async () => {
    const provider = providerMock([exists({ globallyUnsubscribed: true })]);
    const store = storeMock();
    const clock = new MutableClock();
    await reconcileNewsletterJob({
      job: JOB,
      store,
      provider,
      requestId: REQUEST_ID,
      clock,
      deadlineMs: 25_000,
    });
    expect(store.markProviderGlobalOptOut).toHaveBeenCalledOnce();
    expect(provider.createConfirmedContact).not.toHaveBeenCalled();
    expect(provider.updateConsentEvidence).not.toHaveBeenCalled();
    expect(provider.addConfiguredSegment).not.toHaveBeenCalled();
    expect(provider.optIntoConfiguredTopic).not.toHaveBeenCalled();
  });

  it("creates a missing contact and requires full final read-back", async () => {
    const provider = providerMock([{ kind: "missing" }, exists()]);
    const store = storeMock();
    await reconcileNewsletterJob({
      job: JOB,
      store,
      provider,
      requestId: REQUEST_ID,
      clock: new MutableClock(),
      deadlineMs: 25_000,
    });
    expect(provider.createConfirmedContact).toHaveBeenCalledOnce();
    expect(provider.read).toHaveBeenCalledTimes(2);
    expect(store.markProviderReconciled).toHaveBeenCalledWith(
      expect.objectContaining({ providerContactId: "contact-1" }),
    );
  });

  it.each([
    ["2xx", { kind: "applied" as const, providerStatus: 200 }],
    [
      "malformed 2xx",
      {
        kind: "ambiguous" as const,
        code: "invalid_response" as const,
        providerStatus: 200,
      },
    ],
    [
      "409",
      {
        kind: "ambiguous" as const,
        code: "provider_4xx" as const,
        providerStatus: 409,
      },
    ],
    [
      "422",
      {
        kind: "ambiguous" as const,
        code: "provider_4xx" as const,
        providerStatus: 422,
      },
    ],
    ["timeout", { kind: "ambiguous" as const, code: "timeout" as const }],
    [
      "network",
      { kind: "ambiguous" as const, code: "network" as const },
    ],
    [
      "5xx",
      {
        kind: "ambiguous" as const,
        code: "provider_5xx" as const,
        providerStatus: 503,
      },
    ],
  ])("accepts ambiguous create %s only when read-back proves commit", async (_label, result) => {
    const provider = providerMock([{ kind: "missing" }, exists()]);
    provider.createConfirmedContact.mockResolvedValueOnce(result);
    const store = storeMock();
    await reconcileNewsletterJob({
      job: JOB,
      store,
      provider,
      requestId: REQUEST_ID,
      clock: new MutableClock(),
      deadlineMs: 25_000,
    });
    expect(provider.createConfirmedContact).toHaveBeenCalledOnce();
    expect(store.markProviderReconciled).toHaveBeenCalledOnce();
  });

  it("retries an ambiguous create whose mandatory read-back remains missing", async () => {
    const provider = providerMock([{ kind: "missing" }, { kind: "missing" }]);
    provider.createConfirmedContact.mockResolvedValueOnce({
      kind: "ambiguous",
      code: "timeout",
    });
    const store = storeMock();
    await reconcileNewsletterJob({
      job: JOB,
      store,
      provider,
      requestId: REQUEST_ID,
      clock: new MutableClock(),
      deadlineMs: 25_000,
    });
    expect(store.markProviderReconciled).not.toHaveBeenCalled();
    expect(store.rescheduleReconciliation).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: "readback_mismatch" }),
    );
  });

  it("updates mismatched evidence then accepts only matching read-back", async () => {
    const provider = providerMock([
      exists({ evidence: "mismatch" }),
      exists({ evidence: "matches" }),
    ]);
    const store = storeMock();
    await reconcileNewsletterJob({
      job: JOB,
      store,
      provider,
      requestId: REQUEST_ID,
      clock: new MutableClock(),
      deadlineMs: 25_000,
    });
    expect(provider.updateConsentEvidence).toHaveBeenCalledOnce();
    expect(provider.read).toHaveBeenCalledTimes(2);
    expect(store.markProviderReconciled).toHaveBeenCalledOnce();
  });

  it.each([
    [
      "malformed 2xx",
      {
        kind: "ambiguous" as const,
        code: "invalid_response" as const,
        providerStatus: 200,
      },
    ],
    ["2xx", { kind: "applied" as const, providerStatus: 200 }],
    [
      "409",
      {
        kind: "ambiguous" as const,
        code: "provider_4xx" as const,
        providerStatus: 409,
      },
    ],
    ["timeout", { kind: "ambiguous" as const, code: "timeout" as const }],
    [
      "network",
      { kind: "ambiguous" as const, code: "network" as const },
    ],
    [
      "5xx",
      { kind: "ambiguous" as const, code: "provider_5xx" as const },
    ],
  ])("requires exact evidence read-back after %s mutation", async (_label, result) => {
    const provider = providerMock([
      exists({ evidence: "mismatch" }),
      exists({ evidence: "matches" }),
    ]);
    provider.updateConsentEvidence.mockResolvedValueOnce(result);
    const store = storeMock();
    await reconcileNewsletterJob({
      job: JOB,
      store,
      provider,
      requestId: REQUEST_ID,
      clock: new MutableClock(),
      deadlineMs: 25_000,
    });
    expect(store.markProviderReconciled).toHaveBeenCalledOnce();
  });

  it.each([
    ["mismatch", exists({ evidence: "mismatch" })],
    [
      "unavailable",
      { kind: "unavailable" as const, code: "invalid_response" as const },
    ],
  ])("never reconciles after evidence read-back is %s", async (_label, readback) => {
    const provider = providerMock([exists({ evidence: "mismatch" }), readback]);
    const store = storeMock();
    await reconcileNewsletterJob({
      job: JOB,
      store,
      provider,
      requestId: REQUEST_ID,
      clock: new MutableClock(),
      deadlineMs: 25_000,
    });
    expect(store.markProviderReconciled).not.toHaveBeenCalled();
    expect(store.rescheduleReconciliation).toHaveBeenCalledOnce();
  });

  it.each([
    [
      "evidence 429",
      "evidence" as const,
      "provider_rate_limited" as const,
      429,
    ],
    ["Segment 400", "segment" as const, "provider_4xx" as const, 400],
    ["Topic 429", "topic" as const, "provider_rate_limited" as const, 429],
    ["evidence malformed non-2xx", "evidence" as const, "invalid_response" as const, undefined],
    ["Segment malformed non-2xx", "segment" as const, "invalid_response" as const, undefined],
    ["Topic malformed non-2xx", "topic" as const, "invalid_response" as const, undefined],
  ])(
    "durably preserves definitive %s code without unnecessary read-back",
    async (_label, step, code, providerStatus) => {
      const reads =
        step === "evidence"
          ? [exists({ evidence: "mismatch" })]
          : step === "segment"
            ? [exists({ inSegment: false })]
            : [exists({ topic: "missing" }), exists({ topic: "missing" })];
      const provider = providerMock(reads);
      const failure = {
        kind: "failed" as const,
        code,
        providerStatus,
      };
      if (step === "evidence") {
        provider.updateConsentEvidence.mockResolvedValueOnce(failure);
      } else if (step === "segment") {
        provider.addConfiguredSegment.mockResolvedValueOnce(failure);
      } else {
        provider.optIntoConfiguredTopic.mockResolvedValueOnce(failure);
      }
      const store = storeMock();
      await reconcileNewsletterJob({
        job: JOB,
        store,
        provider,
        requestId: REQUEST_ID,
        clock: new MutableClock(),
        deadlineMs: 25_000,
      });
      expect(store.rescheduleReconciliation).toHaveBeenCalledWith(
        expect.objectContaining({ errorCode: code }),
      );
      expect(store.markProviderReconciled).not.toHaveBeenCalled();
      expect(provider.read).toHaveBeenCalledTimes(step === "topic" ? 2 : 1);
    },
  );

  it("adds Segment, rereads global state, opts into Topic and performs final read", async () => {
    const provider = providerMock([
      exists({ inSegment: false, topic: "missing" }),
      exists({ inSegment: true, topic: "missing" }),
      exists(),
    ]);
    const store = storeMock();
    await reconcileNewsletterJob({
      job: JOB,
      store,
      provider,
      requestId: REQUEST_ID,
      clock: new MutableClock(),
      deadlineMs: 25_000,
    });
    expect(provider.addConfiguredSegment).toHaveBeenCalledOnce();
    expect(provider.optIntoConfiguredTopic).toHaveBeenCalledOnce();
    expect(provider.read).toHaveBeenCalledTimes(3);
    expect(store.markProviderReconciled).toHaveBeenCalledOnce();
  });

  it.each([
    [
      "Segment malformed 2xx",
      "segment" as const,
      {
        kind: "ambiguous" as const,
        code: "invalid_response" as const,
        providerStatus: 200,
      },
    ],
    [
      "Segment 409",
      "segment" as const,
      {
        kind: "ambiguous" as const,
        code: "provider_4xx" as const,
        providerStatus: 409,
      },
    ],
    [
      "Segment timeout",
      "segment" as const,
      { kind: "ambiguous" as const, code: "timeout" as const },
    ],
    [
      "Topic 422",
      "topic" as const,
      {
        kind: "ambiguous" as const,
        code: "provider_4xx" as const,
        providerStatus: 422,
      },
    ],
    [
      "Topic malformed 2xx",
      "topic" as const,
      {
        kind: "ambiguous" as const,
        code: "invalid_response" as const,
        providerStatus: 200,
      },
    ],
    [
      "Topic 5xx",
      "topic" as const,
      { kind: "ambiguous" as const, code: "provider_5xx" as const },
    ],
  ])("accepts %s only when a fresh read proves target", async (_label, step, result) => {
    const reads =
      step === "segment"
        ? [exists({ inSegment: false }), exists()]
        : [
            exists({ topic: "missing" }),
            exists({ topic: "missing" }),
            exists(),
          ];
    const provider = providerMock(reads);
    if (step === "segment") provider.addConfiguredSegment.mockResolvedValueOnce(result);
    else provider.optIntoConfiguredTopic.mockResolvedValueOnce(result);
    const store = storeMock();
    await reconcileNewsletterJob({
      job: JOB,
      store,
      provider,
      requestId: REQUEST_ID,
      clock: new MutableClock(),
      deadlineMs: 25_000,
    });
    expect(store.markProviderReconciled).toHaveBeenCalledOnce();
  });

  it("blocks when global opt-out appears in the fresh read before Topic", async () => {
    const provider = providerMock([
      exists({ topic: "missing" }),
      exists({ globallyUnsubscribed: true, topic: "missing" }),
    ]);
    const store = storeMock();
    await reconcileNewsletterJob({
      job: JOB,
      store,
      provider,
      requestId: REQUEST_ID,
      clock: new MutableClock(),
      deadlineMs: 25_000,
    });
    expect(provider.optIntoConfiguredTopic).not.toHaveBeenCalled();
    expect(store.markProviderGlobalOptOut).toHaveBeenCalledOnce();
    expect(store.markProviderReconciled).not.toHaveBeenCalled();
  });

  it("blocks when global opt-out appears in the final Topic read-back", async () => {
    const provider = providerMock([
      exists({ topic: "missing" }),
      exists({ topic: "missing" }),
      exists({ globallyUnsubscribed: true }),
    ]);
    const store = storeMock();
    await reconcileNewsletterJob({
      job: JOB,
      store,
      provider,
      requestId: REQUEST_ID,
      clock: new MutableClock(),
      deadlineMs: 25_000,
    });
    expect(provider.optIntoConfiguredTopic).toHaveBeenCalledOnce();
    expect(store.markProviderGlobalOptOut).toHaveBeenCalledOnce();
    expect(store.markProviderReconciled).not.toHaveBeenCalled();
  });

  it.each([
    ["mismatching", exists({ topic: "missing" })],
    [
      "unavailable",
      { kind: "unavailable" as const, code: "provider_5xx" as const },
    ],
  ])("never reconciles a %s final read after Topic mutation", async (_label, finalRead) => {
    const provider = providerMock([
      exists({ topic: "missing" }),
      exists({ topic: "missing" }),
      finalRead,
    ]);
    const store = storeMock();
    await reconcileNewsletterJob({
      job: JOB,
      store,
      provider,
      requestId: REQUEST_ID,
      clock: new MutableClock(),
      deadlineMs: 25_000,
    });
    expect(store.markProviderReconciled).not.toHaveBeenCalled();
    expect(store.rescheduleReconciliation).toHaveBeenCalledOnce();
  });

  it("persists only validated observed ID on an unavailable read", async () => {
    const provider = providerMock([
      {
        kind: "unavailable",
        code: "provider_5xx",
        providerStatus: 503,
        observedContactId: "observed-contact",
      },
    ]);
    const store = storeMock();
    await reconcileNewsletterJob({
      job: JOB,
      store,
      provider,
      requestId: REQUEST_ID,
      clock: new MutableClock(),
      deadlineMs: 25_000,
    });
    expect(store.rescheduleReconciliation).toHaveBeenCalledWith({
      jobId: JOB.id,
      attempt: 1,
      requestId: REQUEST_ID,
      now: new Date(NOW),
      errorCode: "provider_5xx",
      observedContactId: "observed-contact",
    });
  });

  it.each([
    [13_999, false],
    [14_000, true],
  ])("enforces exact mutation reserve %i ms", async (remaining, mutates) => {
    const clock = new MutableClock();
    const provider = providerMock([exists({ evidence: "mismatch" })]);
    provider.read.mockImplementationOnce(async () => {
      clock.monotonic = 25_000 - remaining;
      return exists({ evidence: "mismatch" });
    });
    const store = storeMock();
    await reconcileNewsletterJob({
      job: JOB,
      store,
      provider,
      requestId: REQUEST_ID,
      clock,
      deadlineMs: 25_000,
    });
    expect(provider.updateConsentEvidence).toHaveBeenCalledTimes(mutates ? 1 : 0);
    if (!mutates) {
      expect(store.rescheduleReconciliation).toHaveBeenCalledWith(
        expect.objectContaining({ errorCode: "deadline" }),
      );
    }
  });

  it("starts no mutation or D1 transition at the wall-clock lease boundary", async () => {
    const clock = new MutableClock();
    const provider = providerMock([exists({ evidence: "mismatch" })]);
    provider.read.mockImplementationOnce(async () => {
      clock.wall = new Date(JOB.leaseUntil);
      return exists({ evidence: "mismatch" });
    });
    const store = storeMock();
    await reconcileNewsletterJob({
      job: JOB,
      store,
      provider,
      requestId: REQUEST_ID,
      clock,
      deadlineMs: 25_000,
    });
    expect(provider.updateConsentEvidence).not.toHaveBeenCalled();
    expect(store.rescheduleReconciliation).not.toHaveBeenCalled();
  });

  it.each([
    [1_999, 0],
    [2_000, 1],
  ])("enforces final D1 margin at %i ms", async (remaining, expectedCas) => {
    const clock = new MutableClock();
    const provider = providerMock([]);
    provider.read.mockImplementationOnce(async () => {
      clock.monotonic = 25_000 - remaining;
      return { kind: "unavailable", code: "timeout" };
    });
    const store = storeMock();
    await reconcileNewsletterJob({
      job: JOB,
      store,
      provider,
      requestId: REQUEST_ID,
      clock,
      deadlineMs: 25_000,
    });
    expect(store.rescheduleReconciliation).toHaveBeenCalledTimes(expectedCas);
  });
});

async function seedDrainJob(id: string, subscriptionId: string) {
  await env.NEWSLETTER_DB.prepare(
    `INSERT INTO newsletter_subscriptions (
       id, email_normalized, name, consent_state, policy_version,
       consent_text, consent_source, requested_at, confirmed_at,
       provider_state, created_at, updated_at
     ) VALUES (?, ?, 'B5', 'confirmed', 'policy-b5', 'Consentimento B5',
               'newsletter_form', ?, ?, 'pending', ?, ?)`,
  )
    .bind(
      subscriptionId,
      `${subscriptionId}@example.com`,
      NOW,
      NOW,
      NOW,
      NOW,
    )
    .run();
  await env.NEWSLETTER_DB.prepare(
    `INSERT INTO newsletter_jobs (
       id, subscription_id, kind, dedupe_key, state, attempts,
       available_at, created_at
     ) VALUES (?, ?, 'resend_reconcile', ?, 'pending', 0, ?, ?)`,
  )
    .bind(id, subscriptionId, `resend_reconcile:${id}`, NOW, NOW)
    .run();
}

describe("B5 drain admission and configuration", () => {
  it("does nothing without a valid D1 binding", async () => {
    await expect(
      drainNewsletterJobs({ runtimeEnv: {}, clock: new MutableClock() }),
    ).resolves.toBeUndefined();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("claims then durably reschedules configuration failure without HTTP", async () => {
    await seedDrainJob("job-drain-config", "subscription-drain-config");
    const clock = new MutableClock();
    await drainNewsletterJobs({
      runtimeEnv: { NEWSLETTER_DB: env.NEWSLETTER_DB },
      clock,
      limit: 1,
    });
    const job = await env.NEWSLETTER_DB.prepare(
      `SELECT state, attempts, available_at, lease_until, last_error_code
         FROM newsletter_jobs WHERE id = 'job-drain-config'`,
    ).first<Record<string, unknown>>();
    expect(job).toEqual({
      state: "pending",
      attempts: 1,
      available_at: "2026-08-20T14:01:00.000Z",
      lease_until: null,
      last_error_code: "configuration",
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("keeps configuration-failure logs free of bindings and internal identifiers", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await seedDrainJob("job-private", "subscription-private");
    await drainNewsletterJobs({
      runtimeEnv: { NEWSLETTER_DB: env.NEWSLETTER_DB },
      clock: new MutableClock(),
      limit: 1,
    });
    const logs = JSON.stringify([...warn.mock.calls, ...error.mock.calls]);
    for (const forbidden of [
      "job-private",
      "subscription-private",
      "subscription-private@example.com",
      "RESEND_CONTACTS_API_KEY",
      "RESEND_SEGMENT_ID",
      "RESEND_TOPIC_ID",
    ]) {
      expect(logs).not.toContain(forbidden);
    }
  });

  it.each([
    [9_999, 0],
    [10_000, 1],
  ])("enforces exact claim budget %i ms", async (remaining, attempts) => {
    const suffix = String(remaining);
    const id = `job-drain-${suffix}`;
    await seedDrainJob(id, `subscription-drain-${suffix}`);
    const clock = new MutableClock();
    let monotonicCalls = 0;
    clock.monotonicNow = () => {
      monotonicCalls += 1;
      return monotonicCalls === 1 ? 0 : 25_000 - remaining;
    };
    await drainNewsletterJobs({
      runtimeEnv: { NEWSLETTER_DB: env.NEWSLETTER_DB },
      clock,
      limit: 1,
    });
    const job = await env.NEWSLETTER_DB.prepare(
      "SELECT attempts FROM newsletter_jobs WHERE id = ?",
    )
      .bind(id)
      .first<{ attempts: number }>();
    expect(job?.attempts).toBe(attempts);
  });

  it("rejects invalid drain limits before D1 or HTTP", async () => {
    await expect(
      drainNewsletterJobs({
        runtimeEnv: { NEWSLETTER_DB: env.NEWSLETTER_DB },
        limit: 3 as never,
      }),
    ).rejects.toThrow(/limit/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("claims at most two jobs sequentially and applies preference only to the first", async () => {
    await seedDrainJob("job-a", "subscription-a");
    await seedDrainJob("job-b", "subscription-b");
    await seedDrainJob("job-c", "subscription-c");
    await drainNewsletterJobs({
      runtimeEnv: { NEWSLETTER_DB: env.NEWSLETTER_DB },
      preferredSubscriptionId: "subscription-c",
      clock: new MutableClock(),
    });
    const jobs = await env.NEWSLETTER_DB.prepare(
      "SELECT id, attempts FROM newsletter_jobs ORDER BY id",
    ).all<{ id: string; attempts: number }>();
    expect(jobs.results).toEqual([
      { id: "job-a", attempts: 1 },
      { id: "job-b", attempts: 0 },
      { id: "job-c", attempts: 1 },
    ]);
  });

  it("does not reset the shared deadline or claim a second job after useful budget is exhausted", async () => {
    await seedDrainJob("job-budget-a", "subscription-budget-a");
    await seedDrainJob("job-budget-b", "subscription-budget-b");
    const clock = new MutableClock();
    let reads = 0;
    clock.monotonicNow = () => {
      reads += 1;
      return reads >= 4 ? 15_001 : 0;
    };
    await drainNewsletterJobs({
      runtimeEnv: { NEWSLETTER_DB: env.NEWSLETTER_DB },
      clock,
    });
    const attempts = await env.NEWSLETTER_DB.prepare(
      "SELECT attempts FROM newsletter_jobs ORDER BY id",
    ).all<{ attempts: number }>();
    expect(attempts.results.map(({ attempts: value }) => value)).toEqual([1, 0]);
  });

  it("allows a second failed job only while the original shared budget remains", async () => {
    await seedDrainJob("job-failure-a", "subscription-failure-a");
    await seedDrainJob("job-failure-b", "subscription-failure-b");
    await drainNewsletterJobs({
      runtimeEnv: { NEWSLETTER_DB: env.NEWSLETTER_DB },
      clock: new MutableClock(),
    });
    const attempts = await env.NEWSLETTER_DB.prepare(
      "SELECT attempts FROM newsletter_jobs ORDER BY id",
    ).all<{ attempts: number }>();
    expect(attempts.results.map(({ attempts: value }) => value)).toEqual([1, 1]);
  });

  it("aborts a deliberately pending GET at its shared deadline and durably retries", async () => {
    await seedDrainJob("job-pending-fetch", "subscription-pending-fetch");
    vi.mocked(globalThis.fetch).mockImplementation((_input, init) => {
      const signal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener(
          "abort",
          () => reject(new DOMException("aborted", "AbortError")),
          { once: true },
        );
      });
    });
    const clock = new MutableClock();
    let monotonicReads = 0;
    clock.monotonicNow = () => {
      monotonicReads += 1;
      if (monotonicReads === 1) return 0;
      if (monotonicReads === 2) return 15_000;
      return monotonicReads <= 4 ? 22_999 : 23_000;
    };
    await drainNewsletterJobs({
      runtimeEnv: {
        NEWSLETTER_DB: env.NEWSLETTER_DB,
        RESEND_CONTACTS_API_KEY: "contacts-key",
        RESEND_SEGMENT_ID: "segment-id",
        RESEND_TOPIC_ID: "topic-id",
      },
      clock,
      limit: 1,
    });
    const job = await env.NEWSLETTER_DB.prepare(
      "SELECT state, attempts, last_error_code FROM newsletter_jobs WHERE id = 'job-pending-fetch'",
    ).first<Record<string, unknown>>();
    expect(job).toEqual({ state: "pending", attempts: 1, last_error_code: "timeout" });
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it("many concurrent drains never double-lease one due job", async () => {
    await seedDrainJob("job-concurrent-drain", "subscription-concurrent-drain");
    await Promise.all(
      Array.from({ length: 8 }, () =>
        drainNewsletterJobs({
          runtimeEnv: { NEWSLETTER_DB: env.NEWSLETTER_DB },
          clock: new MutableClock(),
          limit: 1,
        }),
      ),
    );
    const job = await env.NEWSLETTER_DB.prepare(
      "SELECT state, attempts FROM newsletter_jobs WHERE id = 'job-concurrent-drain'",
    ).first<Record<string, unknown>>();
    expect(job).toEqual({ state: "pending", attempts: 1 });
  });

  it("fences provider success after lease loss, then lets the reclaimer complete exactly once", async () => {
    await seedDrainJob("job-lease-loss", "subscription-lease-loss");
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    const attemptOne = await store.claimReconciliationJob({ now: new Date(NOW) });
    expect(attemptOne?.attempt).toBe(1);
    let attemptTwo: ReconciliationJob | null = null;
    const staleProvider = providerMock([]);
    staleProvider.read.mockImplementationOnce(async () => {
      await env.NEWSLETTER_DB.prepare(
        "UPDATE newsletter_jobs SET lease_until = ? WHERE id = 'job-lease-loss'",
      )
        .bind(NOW)
        .run();
      attemptTwo = await store.claimReconciliationJob({ now: new Date(NOW) });
      return exists({ contactId: "contact-lease-loss" });
    });
    await reconcileNewsletterJob({
      job: attemptOne!,
      store,
      provider: staleProvider,
      requestId: "00000000-0000-4000-8000-000000000211",
      clock: new MutableClock(),
      deadlineMs: 25_000,
    });
    expect(attemptTwo).toEqual(expect.objectContaining({ attempt: 2 }));
    expect(
      await env.NEWSLETTER_DB.prepare(
        "SELECT count(*) AS total FROM newsletter_consent_ledger WHERE event_type = 'provider_reconciled'",
      ).first<{ total: number }>(),
    ).toEqual({ total: 0 });

    await reconcileNewsletterJob({
      job: attemptTwo!,
      store,
      provider: providerMock([exists({ contactId: "contact-lease-loss" })]),
      requestId: "00000000-0000-4000-8000-000000000212",
      clock: new MutableClock(),
      deadlineMs: 25_000,
    });
    const state = await env.NEWSLETTER_DB.prepare(
      "SELECT state, attempts FROM newsletter_jobs WHERE id = 'job-lease-loss'",
    ).first<Record<string, unknown>>();
    expect(state).toEqual({ state: "completed", attempts: 2 });
    expect(
      await env.NEWSLETTER_DB.prepare(
        "SELECT count(*) AS total FROM newsletter_consent_ledger WHERE event_type = 'provider_reconciled'",
      ).first<{ total: number }>(),
    ).toEqual({ total: 1 });
  });

  it("keeps the Broadcast view gated until the strict final transition", async () => {
    await seedDrainJob("job-view", "subscription-view");
    expect(
      await env.NEWSLETTER_DB.prepare(
        "SELECT count(*) AS total FROM newsletter_broadcast_recipients",
      ).first<{ total: number }>(),
    ).toEqual({ total: 0 });
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    await store.claimReconciliationJob({ now: new Date(NOW) });
    await store.markProviderReconciled({
      jobId: "job-view",
      attempt: 1,
      requestId: REQUEST_ID,
      now: new Date("2026-08-20T14:00:01.000Z"),
      providerContactId: "contact-view",
    });
    expect(
      await env.NEWSLETTER_DB.prepare(
        "SELECT id FROM newsletter_broadcast_recipients",
      ).first<{ id: string }>(),
    ).toEqual({ id: "subscription-view" });
  });

  it("demonstrates why a later provider opt-out leaves local Broadcast authorization blocked", async () => {
    await seedDrainJob("job-stale-view", "subscription-stale-view");
    const store = createNewsletterStore(env.NEWSLETTER_DB);
    await store.claimReconciliationJob({ now: new Date(NOW) });
    await store.markProviderReconciled({
      jobId: "job-stale-view",
      attempt: 1,
      requestId: "00000000-0000-4000-8000-000000000213",
      now: new Date("2026-08-20T14:00:01.000Z"),
      providerContactId: "contact-stale-view",
    });
    const laterProviderState = exists({ globallyUnsubscribed: true });
    expect(laterProviderState.globallyUnsubscribed).toBe(true);
    expect(
      await env.NEWSLETTER_DB.prepare(
        "SELECT id FROM newsletter_broadcast_recipients",
      ).first<{ id: string }>(),
    ).toEqual({ id: "subscription-stale-view" });
    expect("BLOCKED_BY_EXTERNAL_CURRENT_READBACK").toBe(
      "BLOCKED_BY_EXTERNAL_CURRENT_READBACK",
    );
  });
});
