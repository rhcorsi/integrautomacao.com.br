import { describe, expect, it } from "vitest";
import {
  validateTechnicalClaims,
  type ClaimPolicyInput,
} from "../../scripts/technicalClaimsPolicy";
import { technicalClaimPresentation } from "../../src/data/technicalClaimPresentation";

const validInput = (): ClaimPolicyInput => ({
  sources: [
    {
      id: "S01",
      title: "Manual oficial",
      canonicalUrl: "https://example.com/manual",
      documentRevision: "REV-A",
      manufacturer: "Fabricante",
      accessedAt: "2026-09-04",
      status: "current",
    },
  ],
  reviewers: [
    {
      id: "source-check-ai",
      displayName: "Revisão documental assistida por IA",
      kind: "ai",
    },
  ],
  claims: [
    {
      id: "T01",
      pagePaths: ["/tecnologias/exemplo/"],
      statement: "O suporte depende da revisão documentada.",
      decision: "Corrigir a generalização anterior.",
      priority: "P1",
      product: "Produto",
      applicableVersions: ["REV-A"],
      sourceIds: ["S01"],
      sourceLocator: "p. 8",
      evidenceKind: "documented-support",
      reviewedAt: "2026-09-04",
      reviewerId: "source-check-ai",
      reviewKind: "source-checked-ai",
      status: "pending-human",
    },
  ],
});

describe("technical claim policy", () => {
  it("rejects duplicate and malformed claim IDs", () => {
    const input = validInput();
    input.claims.push({ ...input.claims[0], id: "claim-one" });
    input.claims.push({ ...input.claims[0] });

    expect(validateTechnicalClaims(input).map((item) => item.code)).toEqual([
      "invalid-claim-id",
      "duplicate-claim-id",
    ]);
  });

  it("rejects missing and superseded sources used as current evidence", () => {
    const input = validInput();
    input.sources[0].status = "superseded";
    input.claims[0].sourceIds = ["S01", "S99"];

    expect(validateTechnicalClaims(input).map((item) => item.code)).toEqual([
      "superseded-source",
      "missing-source",
    ]);
  });

  it("rejects invalid review and source access dates", () => {
    const input = validInput();
    input.sources[0].accessedAt = "4 de setembro";
    input.claims[0].reviewedAt = "2026-02-30";

    expect(validateTechnicalClaims(input).map((item) => item.code)).toEqual([
      "invalid-source-date",
      "invalid-review-date",
    ]);
  });

  it("rejects a reviewer that is not registered", () => {
    const input = validInput();
    input.claims[0].reviewerId = "pessoa-inexistente";

    expect(validateTechnicalClaims(input).map((item) => item.code)).toEqual([
      "missing-reviewer",
    ]);
  });

  it("rejects approval attributed to AI or lacking a real human approval record", () => {
    const input = validInput();
    input.claims[0].status = "approved";

    expect(validateTechnicalClaims(input).map((item) => item.code)).toEqual([
      "unsupported-approval",
    ]);
  });

  it("allows source-checked pending claims in structural checks", () => {
    expect(validateTechnicalClaims(validInput())).toEqual([]);
  });

  it("blocks a known critical pending claim at the strict release gate", () => {
    expect(
      validateTechnicalClaims({ ...validInput(), strictRelease: true }).map(
        (item) => item.code,
      ),
    ).toEqual(["critical-pending-human"]);
  });

  it("rejects duplicate canonical source URLs", () => {
    const input = validInput();
    input.sources.push({ ...input.sources[0], id: "S02" });

    expect(validateTechnicalClaims(input).map((item) => item.code)).toEqual([
      "duplicate-source-url",
    ]);
  });

  it("rejects duplicate source and reviewer IDs before lookup", () => {
    const input = validInput();
    input.sources.push({
      ...input.sources[0],
      canonicalUrl: "https://example.com/outro-manual",
    });
    input.reviewers.push({ ...input.reviewers[0] });

    expect(validateTechnicalClaims(input).map((item) => item.code)).toEqual([
      "duplicate-source-id",
      "duplicate-reviewer-id",
    ]);
  });

  it("rejects a P0 claim without a source", () => {
    const input = validInput();
    input.claims[0].priority = "P0";
    input.claims[0].sourceIds = [];

    expect(validateTechnicalClaims(input).map((item) => item.code)).toEqual([
      "critical-without-source",
    ]);
  });

  it("accepts a complete human approval with a registered test reviewer", () => {
    const input = validInput();
    input.reviewers.push({ id: "test-human", displayName: "Revisor de teste", kind: "human" });
    input.claims[0] = {
      ...input.claims[0],
      reviewerId: "test-human",
      reviewKind: "human-reviewed",
      status: "approved",
      humanApproval: { approvedBy: "test-human", approvedAt: "2026-09-04" },
    };

    expect(validateTechnicalClaims(input)).toEqual([]);
  });

  it("describes internal evidence as unaudited rather than source checked", () => {
    const claim = {
      ...validInput().claims[0],
      sourceIds: [],
      evidenceKind: "internal-evidence-required" as const,
      reviewKind: "gap-recorded-ai" as const,
    };

    expect(technicalClaimPresentation(claim)).toEqual({
      evidenceLabel: "Evidência interna ainda não auditada",
      reviewLabel: "Pendência registrada em 04/09/2026; validação humana necessária",
    });
  });

  it("describes future valid human approval without a pending label", () => {
    const claim = {
      ...validInput().claims[0],
      reviewerId: "test-human",
      reviewKind: "human-reviewed" as const,
      status: "approved" as const,
      humanApproval: { approvedBy: "test-human", approvedAt: "2026-09-04" },
    };

    expect(technicalClaimPresentation(claim)).toEqual({
      evidenceLabel: "Suporte documentado",
      reviewLabel: "Validação humana aprovada em 04/09/2026",
    });
  });
});
