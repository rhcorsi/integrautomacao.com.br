import { describe, expect, it, vi } from "vitest";
import { onRequestPost } from "../functions/api/newsletter";
import {
  jsonRequest,
  newsletterEnv,
  pagesContext,
  turnstileResponse,
  validNewsletterPayload,
} from "./helpers";

type TopicState = "missing" | "opt_in" | "opt_out";

interface ProviderOptions {
  ambiguousCreate?: boolean;
  ambiguousSegment?: boolean;
  contactExists?: boolean;
  failTopicOptIn?: boolean;
  rollbackFailure?: boolean;
  segment?: boolean;
  topic?: TopicState;
  unsubscribed?: boolean;
}

interface ProviderState {
  contactExists: boolean;
  mutations: string[];
  segment: boolean;
  topic: TopicState;
  unsubscribed: boolean;
}

function installProvider(options: ProviderOptions = {}): ProviderState {
  const state: ProviderState = {
    contactExists: options.contactExists ?? true,
    mutations: [],
    segment: options.segment ?? false,
    topic: options.topic ?? "opt_out",
    unsubscribed: options.unsubscribed ?? false,
  };
  let ambiguousCreatePending = options.ambiguousCreate ?? false;
  let ambiguousSegmentPending = options.ambiguousSegment ?? false;

  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url);
    const method = request.method;

    if (url.hostname === "challenges.cloudflare.com") {
      return turnstileResponse("newsletter-form");
    }

    const path = url.pathname;
    if (method === "GET" && path.endsWith("/segments")) {
      return Response.json({
        data: state.segment ? [{ id: newsletterEnv.RESEND_SEGMENT_ID }] : [],
      });
    }
    if (method === "GET" && path.endsWith("/topics")) {
      return Response.json({
        data:
          state.topic === "missing"
            ? []
            : [
                {
                  id: newsletterEnv.RESEND_TOPIC_ID,
                  subscription: state.topic,
                },
              ],
      });
    }
    if (method === "GET" && path.startsWith("/contacts/")) {
      if (!state.contactExists) return new Response(null, { status: 404 });
      return Response.json({
        id: "contact-id",
        email: validNewsletterPayload.email,
        unsubscribed: state.unsubscribed,
      });
    }

    if (method === "POST" && path === "/contacts") {
      state.mutations.push("create");
      state.contactExists = true;
      state.segment = true;
      state.topic = "opt_in";
      state.unsubscribed = false;
      if (ambiguousCreatePending) {
        ambiguousCreatePending = false;
        throw new DOMException("response lost", "AbortError");
      }
      return Response.json({ id: "contact-id" });
    }
    if (method === "POST" && path.includes("/segments/")) {
      state.mutations.push("segment:add");
      state.segment = true;
      if (ambiguousSegmentPending) {
        ambiguousSegmentPending = false;
        throw new DOMException("response lost", "AbortError");
      }
      return new Response(null, { status: 204 });
    }
    if (method === "DELETE" && path.includes("/segments/")) {
      state.mutations.push("segment:remove");
      if (options.rollbackFailure) {
        return new Response("failure", { status: 503 });
      }
      state.segment = false;
      return new Response(null, { status: 204 });
    }
    if (method === "PATCH" && path.endsWith("/topics")) {
      const body = (await request.json()) as {
        topics?: Array<{ subscription?: string }>;
      };
      const subscription = body.topics?.[0]?.subscription;
      if (subscription === "opt_in") {
        state.mutations.push("topic:opt_in");
        if (options.failTopicOptIn) {
          return new Response("failure", { status: 503 });
        }
        state.topic = "opt_in";
        return new Response(null, { status: 204 });
      }
      if (subscription === "opt_out") {
        state.mutations.push("topic:opt_out");
        if (options.rollbackFailure) {
          return new Response("failure", { status: 503 });
        }
        state.topic = "opt_out";
        return new Response(null, { status: 204 });
      }
    }
    if (method === "PATCH" && path.startsWith("/contacts/")) {
      state.mutations.push("evidence:update");
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected provider request: ${method} ${url}`);
  });

  return state;
}

async function subscribe(): Promise<Response> {
  return onRequestPost(
    pagesContext(
      jsonRequest("/api/newsletter", validNewsletterPayload),
      newsletterEnv,
    ),
  );
}

describe("POST /api/newsletter", () => {
  it("rejects an oversized email instead of subscribing a truncated address", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await onRequestPost(
      pagesContext(
        jsonRequest("/api/newsletter", {
          ...validNewsletterPayload,
          email: `${"a".repeat(175)}@x.com`,
        }),
        newsletterEnv,
      ),
    );

    expect(response.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("preserves a global opt-out without any mutation", async () => {
    const state = installProvider({ unsubscribed: true });

    const response = await subscribe();

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "GLOBAL_OPT_OUT",
    });
    expect(state.mutations).toEqual([]);
  });

  it("compensates a new segment when the final Topic gate fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const state = installProvider({ failTopicOptIn: true });

    const response = await subscribe();

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ ok: false });
    expect(state.segment).toBe(false);
    expect(state.topic).toBe("opt_out");
    expect(state.mutations).toEqual([
      "segment:add",
      "evidence:update",
      "topic:opt_in",
      "topic:opt_out",
      "segment:remove",
    ]);
  });

  it("preserves a pre-existing Topic opt-in and segment", async () => {
    const state = installProvider({ segment: true, topic: "opt_in" });

    const response = await subscribe();

    expect(response.status).toBe(200);
    expect(state.segment).toBe(true);
    expect(state.topic).toBe("opt_in");
    expect(state.mutations).toEqual(["evidence:update"]);
  });

  it("never removes a segment that existed before the request", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const state = installProvider({
      failTopicOptIn: true,
      segment: true,
      topic: "opt_out",
    });

    const response = await subscribe();

    expect(response.status).toBe(502);
    expect(state.segment).toBe(true);
    expect(state.mutations).not.toContain("segment:remove");
  });

  it("logs failed compensation as critical and never reports success", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const state = installProvider({
      failTopicOptIn: true,
      rollbackFailure: true,
    });

    const response = await subscribe();

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ ok: false });
    expect(state.mutations.filter((entry) => entry === "topic:opt_out")).toHaveLength(2);
    expect(state.mutations.filter((entry) => entry === "segment:remove")).toHaveLength(2);
    expect(errorSpy.mock.calls.some(([entry]) => {
      return (
        typeof entry === "object" &&
        entry !== null &&
        "severity" in entry &&
        entry.severity === "critical"
      );
    })).toBe(true);
  });

  it("reads back and compensates an add-segment response lost after commit", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const state = installProvider({
      ambiguousSegment: true,
      failTopicOptIn: true,
    });

    const response = await subscribe();

    expect(response.status).toBe(502);
    expect(state.segment).toBe(false);
    expect(state.mutations).toContain("segment:remove");
  });

  it("confirms an ambiguous create instead of returning a false failure", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const state = installProvider({
      ambiguousCreate: true,
      contactExists: false,
      segment: false,
      topic: "missing",
    });

    const response = await subscribe();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
    expect(state.contactExists).toBe(true);
    expect(state.segment).toBe(true);
    expect(state.topic).toBe("opt_in");
    expect(state.mutations).toEqual(["create", "evidence:update"]);
  });
});
