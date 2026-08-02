import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchWithTimeout,
  readRequestJsonLimited,
} from "../functions/_shared/http";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("bounded JSON reader", () => {
  it("counts UTF-8 bytes without relying on Content-Length", async () => {
    const body = JSON.stringify({ value: "á".repeat(12) });
    const request = new Request("https://example.test/api", {
      method: "POST",
      body,
    });

    expect(request.headers.get("content-length")).toBeNull();
    expect(body.length).toBeLessThan(35);
    expect(new TextEncoder().encode(body).byteLength).toBeGreaterThan(35);
    await expect(readRequestJsonLimited(request, 35)).resolves.toEqual({
      ok: false,
      reason: "too-large",
    });
  });

  it("accepts valid multibyte JSON below the byte limit", async () => {
    const body = JSON.stringify({ value: "ação" });
    const request = new Request("https://example.test/api", {
      method: "POST",
      body,
    });

    await expect(readRequestJsonLimited(request, 64)).resolves.toEqual({
      ok: true,
      value: { value: "ação" },
    });
  });

  it("applies the upstream deadline through response-body consumption", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('{"partial":'));
            },
          }),
          { headers: { "content-type": "application/json" } },
        )),
    );

    const startedAt = Date.now();
    await expect(
      fetchWithTimeout("https://provider.test/stalled", {}, 25),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(Date.now() - startedAt).toBeLessThan(500);
  });
});
