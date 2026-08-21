import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendConfirmationEmail } from "../functions/_shared/newsletter/email";
import { requestDetails } from "./helpers";

const RAW_TOKEN = "A".repeat(43);
const TOKEN_ID = "550e8400-e29b-41d4-a716-446655440000";
const NETWORK_BLOCK_MESSAGE = "B3_TEST_NETWORK_BLOCKED";

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(
    new Error(NETWORK_BLOCK_MESSAGE),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

function input(overrides: Record<string, string> = {}) {
  return {
    apiKey: "transactional-key",
    from: "Integra Ação <noreply@forms.integrautomacao.com.br>",
    to: "pessoa@example.com",
    name: 'Pessoa <script>alert("x")</script> & Cia',
    rawToken: RAW_TOKEN,
    tokenId: TOKEN_ID,
    confirmationOrigin: "https://integrautomacao.com.br",
    ...overrides,
  };
}

describe("B3 outbound-network isolation", () => {
  it("rejects every fetch that a test did not explicitly mock", async () => {
    await expect(
      fetch("https://api.resend.com/emails"),
    ).rejects.toThrow(NETWORK_BLOCK_MESSAGE);
  });
});

describe("sendConfirmationEmail", () => {
  it("escapes HTML and puts the raw token only in the confirmation URL fragment", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ id: "message-1" }, { status: 200 }),
    );

    const result = await sendConfirmationEmail(input());

    expect(result).toEqual({ ok: true, messageId: "message-1", attempts: 1 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const request = await requestDetails(
      fetchSpy.mock.calls[0]![0],
      fetchSpy.mock.calls[0]![1],
    );
    const body = JSON.parse(request.body) as {
      html: string;
      subject: string;
      text: string;
    };
    const expectedLink =
      "https://integrautomacao.com.br/integra-acao/newsletter/confirmar/#token=" +
      RAW_TOKEN;

    expect(request.url.href).toBe("https://api.resend.com/emails");
    expect(request.method).toBe("POST");
    expect(request.headers.get("user-agent")).toBe(
      "integrautomacao-newsletter/1.0",
    );
    expect(body.subject).toBe(
      "Confirme sua inscrição na newsletter Integra Ação",
    );
    expect(body.html).toContain(
      "Pessoa &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Cia",
    );
    expect(body.html).not.toContain("<script>");
    expect(body.html).toContain(expectedLink);
    expect(body.text).toContain(expectedLink);
    expect(body.html).not.toContain("?token=");
    expect(body.text).not.toContain("?token=");
  });

  it("uses an explicit non-root Pages preview origin", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ id: "message-preview" }, { status: 201 }),
    );

    await expect(
      sendConfirmationEmail(
        input({
          confirmationOrigin:
            "https://newsletter-preview.integrautomacao-com-br.pages.dev",
        }),
      ),
    ).resolves.toEqual({
      ok: true,
      messageId: "message-preview",
      attempts: 1,
    });

    const request = await requestDetails(
      fetchSpy.mock.calls[0]![0],
      fetchSpy.mock.calls[0]![1],
    );
    expect(request.body).toContain(
      "https://newsletter-preview.integrautomacao-com-br.pages.dev/integra-acao/newsletter/confirmar/#token=",
    );
  });

  it.each([
    "http://integrautomacao.com.br",
    "https://user:password@integrautomacao.com.br",
    "https://integrautomacao.com.br/path",
    "https://integrautomacao.com.br/?query=1",
    "https://integrautomacao.com.br/?",
    "https://integrautomacao.com.br/#fragment",
    "https://integrautomacao.com.br/#",
    "https://evil.example",
    "https://integrautomacao-com-br.pages.dev",
    "https://preview.integrautomacao-com-br.pages.dev:8443",
  ])("rejects invalid confirmation origin %s before fetch", async (origin) => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("unexpected outbound fetch"));

    await expect(
      sendConfirmationEmail(input({ confirmationOrigin: origin })),
    ).resolves.toEqual({
      ok: false,
      errorCode: "configuration",
      attempts: 1,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    ["apiKey", ""],
    ["from", "sender\r\nBcc: attacker@example.com"],
    ["to", "not-an-email"],
    ["rawToken", "too-short"],
    ["tokenId", "not-a-uuid"],
  ])("rejects invalid %s before fetch", async (field, value) => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("unexpected outbound fetch"));

    await expect(
      sendConfirmationEmail(input({ [field]: value })),
    ).resolves.toEqual({
      ok: false,
      errorCode: "configuration",
      attempts: 1,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: "429",
      first: new Response("limited", {
        status: 429,
        headers: { "retry-after": "0" },
      }),
      finalCode: "rate_limited",
    },
    {
      label: "5xx",
      first: new Response("unavailable", { status: 503 }),
      finalCode: "provider_5xx",
    },
    {
      label: "malformed success",
      first: new Response("not-json", { status: 200 }),
      finalCode: "invalid_response",
    },
    {
      label: "missing ID success",
      first: Response.json({}, { status: 200 }),
      finalCode: "invalid_response",
    },
    {
      label: "concurrent idempotency conflict",
      first: Response.json(
        {
          statusCode: 409,
          name: "concurrent_idempotent_requests",
          message: "request is still processing",
        },
        { status: 409 },
      ),
      finalCode: "idempotency_conflict",
    },
  ])(
    "retries $label once with byte-identical body and token-ID key",
    async ({ first, finalCode }) => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(first.clone());

      const result = await sendConfirmationEmail(input());

      expect(result).toEqual({
        ok: false,
        errorCode: finalCode,
        providerStatus: first.status,
        attempts: 2,
      });
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      const requests = await Promise.all(
        fetchSpy.mock.calls.map(([requestInput, init]) =>
          requestDetails(requestInput, init),
        ),
      );
      expect(requests[0]!.body).toBe(requests[1]!.body);
      expect(requests[0]!.headers.get("idempotency-key")).toBe(TOKEN_ID);
      expect(requests[1]!.headers.get("idempotency-key")).toBe(TOKEN_ID);
      expect(requests[0]!.headers.get("authorization")).toBe(
        "Bearer transactional-key",
      );
      expect(requests[1]!.headers.get("authorization")).toBe(
        "Bearer transactional-key",
      );
    },
  );

  it("returns the provider ID when the sole retry succeeds", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(
        Response.json({ id: "message-after-retry" }, { status: 200 }),
      );

    await expect(sendConfirmationEmail(input())).resolves.toEqual({
      ok: true,
      messageId: "message-after-retry",
      attempts: 2,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["network", () => Promise.reject(new TypeError("network lost"))],
    [
      "429",
      () =>
        Promise.resolve(
          new Response("limited", {
            status: 429,
            headers: { "retry-after": "30" },
          }),
        ),
    ],
    [
      "5xx",
      () =>
        Promise.resolve(
          new Response("unavailable", {
            status: 503,
            headers: { "retry-after": "30" },
          }),
        ),
    ],
    [
      "invalid 2xx",
      () => Promise.resolve(new Response("not-json", { status: 200 })),
    ],
    [
      "concurrent idempotency",
      () =>
        Promise.resolve(
          Response.json(
            { name: "concurrent_idempotent_requests" },
            { status: 409, headers: { "retry-after": "30" } },
          ),
        ),
    ],
  ])(
    "delays and caps the transition to retry for %s at 500 ms",
    async (_label, firstAttempt) => {
      vi.useFakeTimers();
      try {
        const fetchSpy = vi
          .spyOn(globalThis, "fetch")
          .mockImplementationOnce(firstAttempt)
          .mockResolvedValueOnce(Response.json({ id: "message-after-delay" }));

        const result = sendConfirmationEmail(input());
        await vi.advanceTimersByTimeAsync(0);
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(499);
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(1);
        await expect(result).resolves.toEqual({
          ok: true,
          messageId: "message-after-delay",
          attempts: 2,
        });
        expect(fetchSpy).toHaveBeenCalledTimes(2);
        const requests = await Promise.all(
          fetchSpy.mock.calls.map(([requestInput, init]) =>
            requestDetails(requestInput, init),
          ),
        );
        expect(requests[0]!.body).toBe(requests[1]!.body);
        expect(requests[0]!.headers.get("idempotency-key")).toBe(TOKEN_ID);
        expect(requests[1]!.headers.get("idempotency-key")).toBe(TOKEN_ID);
      } finally {
        vi.useRealTimers();
      }
    },
  );

  it.each(["", "x".repeat(129)])(
    "rejects an empty or oversized provider message ID",
    async (messageId) => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(Response.json({ id: messageId }, { status: 200 }));

      await expect(sendConfirmationEmail(input())).resolves.toEqual({
        ok: false,
        errorCode: "invalid_response",
        providerStatus: 200,
        attempts: 2,
      });
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    },
  );

  it.each([
    [400, { name: "validation_error" }, "provider_4xx"],
    [
      409,
      { name: "invalid_idempotent_request" },
      "idempotency_conflict",
    ],
  ])(
    "does not retry definitive provider status %i",
    async (status, responseBody, errorCode) => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(Response.json(responseBody, { status }));

      await expect(sendConfirmationEmail(input())).resolves.toEqual({
        ok: false,
        errorCode,
        providerStatus: status,
        attempts: 1,
      });
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    [new DOMException("deadline", "AbortError"), "timeout"],
    [new TypeError("network lost"), "network"],
  ])(
    "retries an ambiguous %s failure once",
    async (error, errorCode) => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error);

      await expect(sendConfirmationEmail(input())).resolves.toEqual({
        ok: false,
        errorCode,
        attempts: 2,
      });
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    },
  );

  it("bounds provider response parsing and retries an oversized success once", async () => {
    const oversized = new Response("x".repeat(20_000), {
      status: 200,
      headers: { "content-length": "20000" },
    });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(oversized)
      .mockResolvedValueOnce(oversized.clone());

    await expect(sendConfirmationEmail(input())).resolves.toEqual({
      ok: false,
      errorCode: "invalid_response",
      attempts: 2,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
