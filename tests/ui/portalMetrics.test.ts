import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  PORTAL_METRIC_EVENT,
  bucketCount,
  classifyRequestFailure,
  emitPortalMetric,
  isAcceptedResponse,
  metricSubject,
  resetPortalMetricOnceKeysForTests,
} from "../../src/scripts/portalMetrics";

describe("portal metrics contract", () => {
  beforeEach(() => {
    history.replaceState({}, "", "/busca/?q=segredo#resultado");
    resetPortalMetricOnceKeysForTests();
  });

  it("emits an allowlisted event with pathname only and bucketed counts", () => {
    const listener = vi.fn();
    window.addEventListener(PORTAL_METRIC_EVENT, listener);

    expect(
      emitPortalMetric("search_executed", {
        result_count_bucket: bucketCount(55),
      }),
    ).toBe(true);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]?.[0]).toMatchObject({
      detail: {
        version: 1,
        name: "search_executed",
        path: "/busca/",
        fields: { result_count_bucket: "51_plus" },
      },
    });

    window.removeEventListener(PORTAL_METRIC_EVENT, listener);
  });

  it("rejects unknown names, fields and free text values", () => {
    const listener = vi.fn();
    window.addEventListener(PORTAL_METRIC_EVENT, listener);

    expect(emitPortalMetric("lead_qualified" as never, {} as never)).toBe(false);
    expect(emitPortalMetric("source_opened", {})).toBe(false);
    expect(
      emitPortalMetric("cta_clicked", { cta_id: "Mensagem livre" } as never),
    ).toBe(false);
    expect(
      emitPortalMetric("request_failed", {
        failure_code: "timeout",
        email: "pessoa@example.com",
      } as never),
    ).toBe(false);
    expect(listener).not.toHaveBeenCalled();

    window.removeEventListener(PORTAL_METRIC_EVENT, listener);
  });

  it("emits once for an explicit in-memory once key", () => {
    const listener = vi.fn();
    window.addEventListener(PORTAL_METRIC_EVENT, listener);

    expect(
      emitPortalMetric(
        "form_started",
        { subject: "plantpax" },
        { onceKey: "contact-form" },
      ),
    ).toBe(true);
    expect(
      emitPortalMetric(
        "form_started",
        { subject: "plantpax" },
        { onceKey: "contact-form" },
      ),
    ).toBe(false);
    expect(listener).toHaveBeenCalledOnce();

    window.removeEventListener(PORTAL_METRIC_EVENT, listener);
  });

  it("rejects an untrusted path override", () => {
    expect(
      emitPortalMetric(
        "source_opened",
        { source_kind: "manufacturer" },
        { path: "https://evil.example/private?q=secret" },
      ),
    ).toBe(false);
    expect(
      emitPortalMetric("source_opened", { source_kind: "manufacturer" }, { path: "/contato/pessoa@example.com/" }),
    ).toBe(false);
    expect(
      emitPortalMetric("source_opened", { source_kind: "manufacturer" }, { path: "/contato/pessoa%40example.com/" }),
    ).toBe(false);
    expect(
      emitPortalMetric("source_opened", { source_kind: "manufacturer" }, { path: "/contato/%0Asegredo/" }),
    ).toBe(false);
  });
});

describe("bucketCount", () => {
  it.each([
    [0, "0"],
    [1, "1_5"],
    [6, "6_12"],
    [13, "13_25"],
    [26, "26_50"],
    [51, "51_plus"],
  ])("buckets %i without exposing an exact count", (count, expected) => {
    expect(bucketCount(count)).toBe(expected);
  });
});

describe("metricSubject", () => {
  it("keeps a controlled contact subject and collapses arbitrary context", () => {
    expect(metricSubject("plantpax")).toBe("plantpax");
    expect(metricSubject("cliente-secreto-projeto-x")).toBe("outro");
    expect(metricSubject("")).toBe("unspecified");
  });

  it("accepts every subject option declared by ContactForm", () => {
    const source = readFileSync(join(process.cwd(), "src/components/ContactForm.astro"), "utf8");
    const values = [...source.matchAll(/<option value="([^"]+)"/g)]
      .map((match) => match[1])
      .filter(Boolean);

    expect(values).toContain("dados-industriais");
    expect(values).toContain("infraestrutura-ot");
    expect(values.map((value) => metricSubject(value))).toEqual(values);
    expect(metricSubject("contexto-livre")).toBe("outro");
  });
});

describe("classifyRequestFailure", () => {
  it("distinguishes timeout from other network failures without serializing errors", () => {
    expect(classifyRequestFailure(new DOMException("private detail", "TimeoutError"))).toBe("timeout");
    expect(classifyRequestFailure(new Error("person@example.com"))).toBe("network");
  });
});

describe("isAcceptedResponse", () => {
  it("requires both a successful HTTP response and an explicit backend acknowledgement", () => {
    expect(isAcceptedResponse(true, { ok: true })).toBe(true);
    expect(isAcceptedResponse(true, null)).toBe(false);
    expect(isAcceptedResponse(true, { ok: false })).toBe(false);
    expect(isAcceptedResponse(false, { ok: true })).toBe(false);
  });
});
