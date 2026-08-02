import { describe, expect, it, vi } from "vitest";
import {
  onRequestGet,
  onRequestPost,
} from "../functions/api/contact";
import {
  contactEnv,
  jsonRequest,
  pagesContext,
  turnstileResponse,
  validContactPayload,
} from "./helpers";

describe("POST /api/contact", () => {
  it("rejects unsupported methods", async () => {
    const response = await onRequestGet(
      pagesContext(
        new Request("https://integrautomacao.com.br/api/contact"),
        {},
      ),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
  });

  it("returns 413 for a streamed body over the byte limit", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const request = jsonRequest("/api/contact", {
      ...validContactPayload,
      message: "á".repeat(9_000),
    });
    expect(request.headers.get("content-length")).toBeNull();

    const response = await onRequestPost(pagesContext(request, contactEnv));

    expect(response.status).toBe(413);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects oversized primary fields instead of truncating them", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const oversizedEmail = `${"a".repeat(175)}@x.com`;

    const emailResponse = await onRequestPost(
      pagesContext(
        jsonRequest("/api/contact", {
          ...validContactPayload,
          email: oversizedEmail,
        }),
        contactEnv,
      ),
    );
    const messageResponse = await onRequestPost(
      pagesContext(
        jsonRequest("/api/contact", {
          ...validContactPayload,
          message: "x".repeat(4_001),
        }),
        contactEnv,
      ),
    );

    expect(emailResponse.status).toBe(400);
    expect(messageResponse.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("distinguishes an invalid Turnstile token from provider downtime", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      turnstileResponse("contact-form", { hostname: "attacker.example" }),
    );
    const invalid = await onRequestPost(
      pagesContext(
        jsonRequest("/api/contact", validContactPayload),
        contactEnv,
      ),
    );
    expect(invalid.status).toBe(403);

    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new TypeError("provider unavailable"),
    );
    const unavailable = await onRequestPost(
      pagesContext(
        jsonRequest("/api/contact", validContactPayload),
        contactEnv,
      ),
    );
    expect(unavailable.status).toBe(503);
  });

  it("retries Turnstile internal errors and reports provider unavailability", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ success: false, "error-codes": ["internal-error"] }),
    );

    const response = await onRequestPost(
      pagesContext(
        jsonRequest("/api/contact", validContactPayload),
        contactEnv,
      ),
    );

    expect(response.status).toBe(503);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const firstBody = String(fetchSpy.mock.calls[0]?.[1]?.body ?? "");
    const secondBody = String(fetchSpy.mock.calls[1]?.[1]?.body ?? "");
    expect(new URLSearchParams(firstBody).get("idempotency_key")).toBeTruthy();
    expect(secondBody).toBe(firstBody);
  });

  it("retries exactly once with the same Resend body and idempotency key", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const resendCalls: Array<{ body: string; idempotencyKey: string | null }> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.hostname === "challenges.cloudflare.com") {
        return turnstileResponse("contact-form");
      }

      resendCalls.push({
        body: String(init?.body ?? ""),
        idempotencyKey: new Headers(init?.headers).get("idempotency-key"),
      });
      if (resendCalls.length === 1) throw new DOMException("timeout", "AbortError");
      return Response.json({ id: "email-id" });
    });

    const response = await onRequestPost(
      pagesContext(
        jsonRequest("/api/contact", validContactPayload),
        contactEnv,
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
    expect(resendCalls).toHaveLength(2);
    expect(resendCalls[1]).toEqual(resendCalls[0]);
    expect(resendCalls[0]?.idempotencyKey).toMatch(/^contact-/);
  });

  it("retries a concurrent idempotent request with the same key", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const resendKeys: Array<string | null> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.hostname === "challenges.cloudflare.com") {
        return turnstileResponse("contact-form");
      }
      resendKeys.push(new Headers(init?.headers).get("idempotency-key"));
      return resendKeys.length === 1
        ? Response.json(
            { name: "concurrent_idempotent_requests" },
            { status: 409 },
          )
        : Response.json({ id: "email-id" });
    });

    const response = await onRequestPost(
      pagesContext(
        jsonRequest("/api/contact", validContactPayload),
        contactEnv,
      ),
    );

    expect(response.status).toBe(200);
    expect(resendKeys).toHaveLength(2);
    expect(resendKeys[1]).toBe(resendKeys[0]);
  });

  it("returns 502 after three Resend 5xx responses", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    let resendCalls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.hostname === "challenges.cloudflare.com") {
        return turnstileResponse("contact-form");
      }
      resendCalls += 1;
      return new Response("upstream", { status: 503 });
    });

    const response = await onRequestPost(
      pagesContext(
        jsonRequest("/api/contact", validContactPayload),
        contactEnv,
      ),
    );

    expect(response.status).toBe(502);
    expect(resendCalls).toBe(3);
  });
});
