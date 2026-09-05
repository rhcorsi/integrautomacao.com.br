import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  fingerprintTechnicalClaim,
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

// SHA-256 of this fixture's substantive claim and referenced source metadata.
const fixtureFingerprint = "6f8a7fc370a55836e6581606769ad6f7f0b6eb43d644f9f0699ea29de09a3c46";
const documentedInput = (): ClaimPolicyInput => {
  const input = validInput();
  input.strictRelease = true;
  input.claims[0].status = "documented";
  input.claims[0].documentaryReview = {
    reviewerId: "source-check-ai",
    reviewedAt: "2026-09-04",
    evidencePath: "docs/reviews/test-review.md",
    fingerprint: fixtureFingerprint,
  };
  return input;
};

describe("documentary release policy", () => {
  it("accepts a P1 decision with a registered documentary review bound to its wording and sources", () => {
    expect(validateTechnicalClaims(documentedInput())).toEqual([]);
  });

  it("produces the independently calculated SHA-256 for the reviewed fixture", () => {
    const input = validInput();
    expect(fingerprintTechnicalClaim(input.claims[0], input.sources)).toBe(fixtureFingerprint);
  });

  it.each(["engineering-inference", "characterized", "editorial-process"] as const)(
    "accepts a correctly bound %s documentary review", (evidenceKind) => {
      const input = documentedInput();
      input.claims[0].evidenceKind = evidenceKind;
      if (evidenceKind === "editorial-process") input.claims[0].sourceIds = [];
      input.claims[0].documentaryReview!.fingerprint = fingerprintTechnicalClaim(input.claims[0], input.sources);
      expect(validateTechnicalClaims(input)).toEqual([]);
    },
  );

  it("does not invalidate technical text for a new access date or unrelated source", () => {
    const input = documentedInput();
    input.sources[0].accessedAt = "2026-09-05";
    input.sources.push({ ...input.sources[0], id: "S02", canonicalUrl: "https://example.com/other" });
    expect(validateTechnicalClaims(input)).toEqual([]);
  });

  it("rejects an unknown runtime status instead of allowing it to bypass release", () => {
    const input = validInput();
    input.strictRelease = true;
    input.claims[0].status = "published" as never;
    expect(validateTechnicalClaims(input).map((item) => item.code)).toContain("invalid-claim-status");
  });

  it("rejects an unknown priority instead of silently skipping strict release checks", () => {
    const input = validInput();
    input.strictRelease = true;
    input.claims[0].priority = "P9" as never;
    expect(validateTechnicalClaims(input).map((item) => item.code)).toContain("invalid-claim-priority");
  });

  it.each(["statement", "decision", "product", "sourceLocator"] as const)(
    "rejects a signed documentary claim with blank %s", (key) => {
      const input = documentedInput();
      input.claims[0][key] = " \t ";
      input.claims[0].documentaryReview!.fingerprint = fingerprintTechnicalClaim(input.claims[0], input.sources);
      expect(validateTechnicalClaims(input).map((item) => item.code)).toContain("incomplete-documentary-claim");
    },
  );

  it.each([
    [], [""], [" "], ["relative/path/"], ["//example.com/path/"], ["/path"],
    ["/../path/"], ["/path/?query=1"], ["/path/#section"], ["/path\\other/"], ["/path/ /"],
  ].map((pagePaths) => ({ pagePaths })))("rejects documentary scope without canonical absolute page paths: $pagePaths", ({ pagePaths }) => {
    const input = documentedInput();
    input.claims[0].pagePaths = pagePaths;
    input.claims[0].documentaryReview!.fingerprint = fingerprintTechnicalClaim(input.claims[0], input.sources);
    expect(validateTechnicalClaims(input).map((item) => item.code)).toContain("invalid-documentary-page-paths");
  });

  it.each([[], [""], [" \t "], ["REV-A", ""]].map((applicableVersions) => ({ applicableVersions })))(
    "rejects documentary scope without nonempty applicable versions: $applicableVersions", ({ applicableVersions }) => {
      const input = documentedInput();
      input.claims[0].applicableVersions = applicableVersions;
      input.claims[0].documentaryReview!.fingerprint = fingerprintTechnicalClaim(input.claims[0], input.sources);
      expect(validateTechnicalClaims(input).map((item) => item.code)).toContain("invalid-documentary-versions");
    },
  );

  it.each(["title", "manufacturer", "documentRevision", "canonicalUrl"] as const)(
    "rejects a current documentary source with blank %s", (key) => {
      const input = documentedInput();
      input.sources[0][key] = " \t ";
      input.claims[0].documentaryReview!.fingerprint = fingerprintTechnicalClaim(input.claims[0], input.sources);
      expect(validateTechnicalClaims(input).map((item) => item.code)).toContain("invalid-documentary-source");
    },
  );

  it.each([
    "not-a-url", "http://example.com/manual", "file:///manual", "https:example.com",
    "https://example.com/a b", "https://user:password@example.com/manual",
  ])("rejects a documentary source without a canonical HTTPS URL: %s", (canonicalUrl) => {
    const input = documentedInput();
    input.sources[0].canonicalUrl = canonicalUrl;
    input.claims[0].documentaryReview!.fingerprint = fingerprintTechnicalClaim(input.claims[0], input.sources);
    expect(validateTechnicalClaims(input).map((item) => item.code)).toContain("invalid-documentary-source");
  });

  it("requires human approval for P0 even when documentary proof is recorded", () => {
    const input = documentedInput();
    input.claims[0].priority = "P0";
    expect(validateTechnicalClaims(input).map((item) => item.code)).toContain("critical-human-required");
  });

  it("rejects documentary status without its evidence record", () => {
    const input = documentedInput();
    delete input.claims[0].documentaryReview;
    expect(validateTechnicalClaims(input).map((item) => item.code)).toContain("missing-documentary-review");
  });

  it.each([
    "https://example.com/review.md", "../docs/reviews/review.md", "docs/reviews/../review.md",
    "docs/reviews\\review.md", "C:/docs/reviews/review.md", "docs/reviews/review.txt",
  ])("rejects unsafe documentary evidence path %s", (evidencePath) => {
    const input = documentedInput();
    input.claims[0].documentaryReview!.evidencePath = evidencePath;
    expect(validateTechnicalClaims(input).map((item) => item.code)).toContain("invalid-documentary-path");
  });

  it.each(["lab", "field", "internal-evidence-required"] as const)(
    "does not treat %s evidence as completed documentary verification", (evidenceKind) => {
      const input = documentedInput();
      input.claims[0].evidenceKind = evidenceKind;
      expect(validateTechnicalClaims(input).map((item) => item.code)).toContain("ineligible-documentary-evidence");
    },
  );

  it("rejects a documentary review attributed to a human or an unregistered AI", () => {
    const input = documentedInput();
    input.reviewers[0].kind = "human";
    expect(validateTechnicalClaims(input).map((item) => item.code)).toContain("invalid-documentary-reviewer");
    input.reviewers = [];
    expect(validateTechnicalClaims(input).map((item) => item.code)).toContain("invalid-documentary-reviewer");
  });

  it("rejects a documentary reviewer or date that differs from the claim review", () => {
    const input = documentedInput();
    input.reviewers.push({ id: "other-ai", displayName: "Outra IA", kind: "ai" });
    input.claims[0].documentaryReview!.reviewerId = "other-ai";
    input.claims[0].documentaryReview!.reviewedAt = "2026-09-05";
    const codes = validateTechnicalClaims(input).map((item) => item.code);
    expect(codes).toContain("invalid-documentary-reviewer");
    expect(codes).toContain("invalid-documentary-date");
  });

  it("requires a real matching calendar date and source-checked AI review", () => {
    const input = documentedInput();
    input.claims[0].reviewedAt = "2026-02-30";
    input.claims[0].documentaryReview!.reviewedAt = "2026-02-30";
    input.claims[0].reviewKind = "gap-recorded-ai";
    const codes = validateTechnicalClaims(input).map((item) => item.code);
    expect(codes).toContain("invalid-documentary-date");
    expect(codes).toContain("invalid-documentary-reviewer");
  });

  it("rejects documentary support without a registered source", () => {
    const input = documentedInput();
    input.claims[0].sourceIds = [];
    expect(validateTechnicalClaims(input).map((item) => item.code)).toContain("documentary-without-source");
  });

  it.each(["statement", "decision", "sourceLocator"] as const)(
    "invalidates documentary proof after changing %s", (key) => {
      const input = documentedInput();
      input.claims[0][key] += " Alterado.";
      expect(validateTechnicalClaims(input).map((item) => item.code)).toContain("documentary-fingerprint-mismatch");
    },
  );

  it.each(["pagePaths", "applicableVersions", "sourceIds"] as const)(
    "invalidates documentary proof after changing %s scope", (key) => {
      const input = documentedInput();
      input.claims[0][key].push("new-scope");
      expect(validateTechnicalClaims(input).map((item) => item.code)).toContain("documentary-fingerprint-mismatch");
    },
  );

  it.each(["0".repeat(64), fixtureFingerprint.toUpperCase(), ""])(
    "rejects an invalid documentary digest %s", (fingerprint) => {
      const input = documentedInput();
      input.claims[0].documentaryReview!.fingerprint = fingerprint;
      expect(validateTechnicalClaims(input).map((item) => item.code)).toContain("documentary-fingerprint-mismatch");
    },
  );

  it.each(["canonicalUrl", "documentRevision", "status"] as const)(
    "invalidates documentary proof after changing source %s", (key) => {
      const input = documentedInput();
      if (key === "status") input.sources[0].status = "superseded";
      else input.sources[0][key] += "-changed";
      expect(validateTechnicalClaims(input).map((item) => item.code)).toContain("documentary-fingerprint-mismatch");
    },
  );

  it("does not promote AI review into a human attestation", () => {
    const input = documentedInput();
    input.claims[0].humanApproval = { approvedBy: "source-check-ai", approvedAt: "2026-09-04" };
    expect(validateTechnicalClaims(input).map((item) => item.code)).toContain("unexpected-human-approval");
  });

  it("continues allowing a P2 pending decision while blocking P1 pending", () => {
    const input = validInput();
    input.strictRelease = true;
    expect(validateTechnicalClaims(input).map((item) => item.code)).toContain("critical-pending-human");
    input.claims[0].priority = "P2";
    expect(validateTechnicalClaims(input)).toEqual([]);
  });

  it("rejects changing a critical pending claim to superseded to bypass release", () => {
    const input = validInput();
    input.strictRelease = true;
    input.claims[0].status = "superseded";
    expect(validateTechnicalClaims(input).map((item) => item.code)).toContain("critical-pending-human");
    input.claims[0].priority = "P0";
    expect(validateTechnicalClaims(input).map((item) => item.code)).toContain("critical-human-required");
  });

  it("labels documentary review as AI review with no registered human validation", () => {
    const presentation = technicalClaimPresentation(documentedInput().claims[0]);
    expect(presentation.reviewLabel).toContain("IA");
    expect(presentation.reviewLabel).toContain("validação humana não registrada");
    expect(presentation.reviewLabel).not.toContain("aprovada");
  });
});

describe("documentary evidence release CLI", () => {
  const fixtureRoots: string[] = [];
  afterEach(() => {
    for (const root of fixtureRoots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  function cliFixture() {
    const root = mkdtempSync(join(tmpdir(), "integra-claim-release-"));
    fixtureRoots.push(root);
    for (const directory of ["scripts", "src/data", "docs/reviews"]) mkdirSync(join(root, directory), { recursive: true });
    for (const name of ["verifyTechnicalClaims.mjs", "technicalClaimsPolicy.ts"]) {
      copyFileSync(resolve("scripts", name), join(root, "scripts", name));
    }
    const input = documentedInput();
    const claims = [input.claims[0], ...Array.from({ length: 21 }, (_, index) => ({
      ...validInput().claims[0], id: `T${String(index + 2).padStart(2, "0")}`, priority: "P2",
    }))];
    const sources = [input.sources[0], ...Array.from({ length: 24 }, (_, index) => ({
      ...input.sources[0], id: `S${String(index + 2).padStart(2, "0")}`,
      canonicalUrl: `https://example.com/another-manual-${index + 2}`,
    }))];
    writeFileSync(join(root, "src/data/technicalClaims.ts"),
      `export const technicalClaims = ${JSON.stringify(claims)};\nexport const technicalReviewers = ${JSON.stringify(input.reviewers)};\n`);
    writeFileSync(join(root, "src/data/sourceRegistry.ts"), `export const technicalSources = ${JSON.stringify(sources)};\n`);
    const evidencePath = join(root, "docs/reviews/test-review.md");
    return {
      root, evidencePath,
      run: (...args: string[]) => spawnSync(process.execPath, [join(root, "scripts/verifyTechnicalClaims.mjs"), ...args], {
        cwd: root, encoding: "utf8",
      }),
    };
  }

  it("releases the exact registered batch only when its documentary evidence exists", () => {
    const fixture = cliFixture();
    writeFileSync(fixture.evidencePath, `# Documentary review\n\nT01: ${fixtureFingerprint}\n`);
    const result = fixture.run("--strict-release");
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("25 fontes");
  });

  it("rejects a missing evidence file even in the structural CLI", () => {
    const result = cliFixture().run();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing-documentary-evidence");
  });

  it.each([
    `T02: ${fixtureFingerprint}`,
    "T01: " + "0".repeat(64),
    `T01 has been reviewed.\nT02: ${fixtureFingerprint}`,
  ])("rejects evidence not binding this claim ID to its fingerprint: %s", (evidence) => {
    const fixture = cliFixture();
    writeFileSync(fixture.evidencePath, evidence);
    const result = fixture.run("--strict-release");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("documentary-evidence-mismatch");
  });

  it("rejects evidence reached through a docs/reviews directory link outside the repository", () => {
    const fixture = cliFixture();
    const outside = mkdtempSync(join(tmpdir(), "integra-claim-evidence-"));
    fixtureRoots.push(outside);
    renameSync(join(fixture.root, "docs/reviews"), join(fixture.root, "docs/unused-reviews"));
    symlinkSync(outside, join(fixture.root, "docs/reviews"), process.platform === "win32" ? "junction" : "dir");
    writeFileSync(fixture.evidencePath, `T01: ${fixtureFingerprint}`);
    const result = fixture.run("--strict-release");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("unsafe-documentary-evidence");
  });

  it("rejects unknown CLI flags instead of accepting a documentary bypass", () => {
    const fixture = cliFixture();
    writeFileSync(fixture.evidencePath, `T01: ${fixtureFingerprint}`);
    const result = fixture.run("--strict-release", "--skip-documentary-evidence");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("unsupported-option");
  });
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
