import { describe, expect, it, vi } from "vitest";
import { onRequest } from "../functions/_middleware";
import { pagesContext } from "./helpers";

describe("Pages middleware", () => {
  it("keeps double-slash paths on the canonical origin", async () => {
    const response = await onRequest(
      pagesContext(
        new Request("https://www.integrautomacao.com.br//evil.example/path?x=1"),
        {},
      ),
    );

    expect(response.status).toBe(301);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.origin).toBe("https://integrautomacao.com.br");
    expect(location.pathname).not.toBe("/path");
  });

  it("combines host canonicalization and a legacy URL in one hop", async () => {
    const next = vi.fn(async () => new Response("next"));
    const request = new Request(
      "https://www.integrautomacao.com.br/?p=245&utm_source=legacy&gclid=abc",
    );

    const response = await onRequest(pagesContext(request, {}, next));

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "https://integrautomacao.com.br/empresa/?utm_source=legacy&gclid=abc",
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("combines alternate host and path alias in one canonical redirect", async () => {
    const response = await onRequest(
      pagesContext(
        new Request("https://www.integrautomacao.com.br/company?utm_source=x"),
        {},
      ),
    );

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "https://integrautomacao.com.br/empresa/?utm_source=x",
    );
  });

  it("passes through unknown and non-navigation legacy requests", async () => {
    const nextUnknown = vi.fn(async () => new Response("unknown"));
    const unknown = await onRequest(
      pagesContext(
        new Request("https://integrautomacao.com.br/?p=999&utm_source=x"),
        {},
        nextUnknown,
      ),
    );
    expect(await unknown.text()).toBe("unknown");
    expect(nextUnknown).toHaveBeenCalledOnce();

    const nextPost = vi.fn(async () => new Response("post"));
    const post = await onRequest(
      pagesContext(
        new Request("https://integrautomacao.com.br/?p=245", {
          method: "POST",
          body: "payload",
        }),
        {},
        nextPost,
      ),
    );
    expect(await post.text()).toBe("post");
    expect(nextPost).toHaveBeenCalledOnce();
  });

  it("hardens every API response produced by a Pages Function", async () => {
    const response = await onRequest(
      pagesContext(
        new Request("https://integrautomacao.com.br/api/contact", {
          method: "POST",
        }),
        {},
        async () => Response.json({ ok: false }, { status: 400 }),
      ),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("permissions-policy")).toContain("camera=()");
    expect(response.headers.get("cross-origin-resource-policy")).toBe("same-origin");
  });
});
