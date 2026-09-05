import { createHash } from "node:crypto";
import type {
  TechnicalClaim,
  TechnicalReviewer,
  TechnicalSource,
} from "../src/data/technicalClaimTypes";

export interface ClaimPolicyInput {
  claims: TechnicalClaim[];
  sources: TechnicalSource[];
  reviewers: TechnicalReviewer[];
  strictRelease?: boolean;
}

export interface ClaimPolicyViolation {
  code: string;
  subject: string;
  message: string;
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const isValidIsoDate = (value: string) => {
  if (!isoDate.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};

export const isSafeDocumentaryPath = (value: string): boolean =>
  typeof value === "string" && /^docs\/reviews\/[A-Za-z0-9][A-Za-z0-9_-]*\.md$/.test(value);

/**
 * Hash the exact substantive decision and referenced source metadata in a fixed
 * key order. Arrays retain order; unrelated sources cannot change this digest.
 * Review/access dates, reviewer identity and evidence paths are excluded: those
 * are provenance metadata validated separately, not the reviewed technical text.
 */
export function fingerprintTechnicalClaim(claim: TechnicalClaim, sources: TechnicalSource[]): string {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const content = {
    id: claim.id,
    pagePaths: claim.pagePaths,
    statement: claim.statement,
    decision: claim.decision,
    priority: claim.priority,
    product: claim.product,
    applicableVersions: claim.applicableVersions,
    sourceIds: claim.sourceIds,
    sourceLocator: claim.sourceLocator,
    evidenceKind: claim.evidenceKind,
    sources: claim.sourceIds.map((id) => {
      const source = sourceById.get(id);
      return source ? {
        id: source.id,
        canonicalUrl: source.canonicalUrl,
        documentRevision: source.documentRevision,
        status: source.status,
      } : { id, missing: true };
    }),
  };
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

const documentaryEvidenceKinds = new Set<TechnicalClaim["evidenceKind"]>([
  "documented-support", "engineering-inference", "characterized", "editorial-process",
]);

const hasText = (value: string): boolean => typeof value === "string" && value.trim().length > 0;
const isCanonicalSourceUrl = (value: string): boolean => {
  if (typeof value !== "string" || !/^https:\/\/\S+$/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
};

export function validateTechnicalClaims({
  claims,
  sources,
  reviewers,
  strictRelease = false,
}: ClaimPolicyInput): ClaimPolicyViolation[] {
  const violations: ClaimPolicyViolation[] = [];
  const seenSourceIds = new Set<string>();
  for (const source of sources) {
    if (seenSourceIds.has(source.id)) {
      violations.push({ code: "duplicate-source-id", subject: source.id, message: "ID de fonte duplicado" });
    }
    seenSourceIds.add(source.id);
  }
  const seenReviewerIds = new Set<string>();
  for (const reviewer of reviewers) {
    if (seenReviewerIds.has(reviewer.id)) {
      violations.push({ code: "duplicate-reviewer-id", subject: reviewer.id, message: "ID de revisor duplicado" });
    }
    seenReviewerIds.add(reviewer.id);
  }
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const reviewerById = new Map(reviewers.map((reviewer) => [reviewer.id, reviewer]));
  const seenUrls = new Set<string>();

  for (const source of sources) {
    if (!isValidIsoDate(source.accessedAt)) {
      violations.push({ code: "invalid-source-date", subject: source.id, message: "accessedAt deve ser uma data ISO real" });
    }
    const canonicalUrl = source.canonicalUrl.trim().replace(/\/$/, "").toLowerCase();
    if (seenUrls.has(canonicalUrl)) {
      violations.push({ code: "duplicate-source-url", subject: source.id, message: "URL canônica já cadastrada" });
    }
    seenUrls.add(canonicalUrl);
  }

  const seenClaimIds = new Set<string>();
  for (const claim of claims) {
    if (!/^T\d{2}$/.test(claim.id)) {
      violations.push({ code: "invalid-claim-id", subject: claim.id, message: "ID deve seguir TNN" });
    }
    if (seenClaimIds.has(claim.id)) {
      violations.push({ code: "duplicate-claim-id", subject: claim.id, message: "ID de afirmação duplicado" });
    }
    seenClaimIds.add(claim.id);

    if (!["approved", "documented", "pending-human", "superseded"].includes(claim.status)) {
      violations.push({ code: "invalid-claim-status", subject: claim.id, message: "Status de afirmação desconhecido" });
    }
    if (!["P0", "P1", "P2"].includes(claim.priority)) {
      violations.push({ code: "invalid-claim-priority", subject: claim.id, message: "Prioridade deve ser P0, P1 ou P2" });
    }

    for (const sourceId of claim.sourceIds) {
      const source = sourceById.get(sourceId);
      if (!source) {
        violations.push({ code: "missing-source", subject: claim.id, message: `Fonte ${sourceId} não cadastrada` });
      } else if (source.status === "superseded" && claim.status !== "superseded") {
        violations.push({ code: "superseded-source", subject: claim.id, message: `Fonte ${sourceId} está substituída` });
      }
    }
    if (claim.priority === "P0" && claim.sourceIds.length === 0) {
      violations.push({ code: "critical-without-source", subject: claim.id, message: "Afirmação P0 precisa de referência" });
    }
    if (!isValidIsoDate(claim.reviewedAt)) {
      violations.push({ code: "invalid-review-date", subject: claim.id, message: "reviewedAt deve ser uma data ISO real" });
    }
    const reviewer = reviewerById.get(claim.reviewerId);
    if (!reviewer) {
      violations.push({ code: "missing-reviewer", subject: claim.id, message: "Revisor não cadastrado" });
    }
    if (claim.status === "documented") {
      const review = claim.documentaryReview;
      if (![claim.statement, claim.decision, claim.product, claim.sourceLocator].every(hasText)) {
        violations.push({ code: "incomplete-documentary-claim", subject: claim.id, message: "Revisão documental exige afirmação, decisão, produto e localização da fonte preenchidos" });
      }
      if (!Array.isArray(claim.pagePaths) || claim.pagePaths.length === 0 ||
        !claim.pagePaths.every((path) => typeof path === "string" && /^\/(?:[a-z0-9_-]+\/)*$/.test(path))) {
        violations.push({ code: "invalid-documentary-page-paths", subject: claim.id, message: "Revisão documental exige caminhos canônicos absolutos do site, terminados em barra" });
      }
      if (!Array.isArray(claim.applicableVersions) || claim.applicableVersions.length === 0 || !claim.applicableVersions.every(hasText)) {
        violations.push({ code: "invalid-documentary-versions", subject: claim.id, message: "Revisão documental exige versões ou escopo de aplicabilidade preenchidos" });
      }
      for (const sourceId of claim.sourceIds) {
        const source = sourceById.get(sourceId);
        if (source && (source.status !== "current" || !isCanonicalSourceUrl(source.canonicalUrl) ||
          ![source.title, source.documentRevision, source.manufacturer].every(hasText))) {
          violations.push({ code: "invalid-documentary-source", subject: claim.id, message: `Fonte ${sourceId} deve ser vigente, ter URL HTTPS e identificação documental completa` });
        }
      }
      if (!documentaryEvidenceKinds.has(claim.evidenceKind)) {
        violations.push({ code: "ineligible-documentary-evidence", subject: claim.id, message: "Revisão documental não comprova evidência de laboratório, campo ou interna" });
      }
      if (claim.evidenceKind !== "editorial-process" && claim.sourceIds.length === 0) {
        violations.push({ code: "documentary-without-source", subject: claim.id, message: "Revisão documental exige fontes cadastradas" });
      }
      if (!review) {
        violations.push({ code: "missing-documentary-review", subject: claim.id, message: "Status documentado exige registro de revisão e evidência" });
      } else {
        const documentaryReviewer = reviewerById.get(review.reviewerId);
        if (claim.reviewKind !== "source-checked-ai" || reviewer?.kind !== "ai" ||
          documentaryReviewer?.kind !== "ai" || review.reviewerId !== claim.reviewerId) {
          violations.push({ code: "invalid-documentary-reviewer", subject: claim.id, message: "Revisão documental exige a mesma IA cadastrada e conferência de fontes" });
        }
        if (!isValidIsoDate(review.reviewedAt) || review.reviewedAt !== claim.reviewedAt) {
          violations.push({ code: "invalid-documentary-date", subject: claim.id, message: "Data documental deve ser real e corresponder à revisão da afirmação" });
        }
        if (!isSafeDocumentaryPath(review.evidencePath)) {
          violations.push({ code: "invalid-documentary-path", subject: claim.id, message: "Evidência deve ser um arquivo Markdown diretamente em docs/reviews" });
        }
        if (!/^[a-f0-9]{64}$/.test(review.fingerprint) || review.fingerprint !== fingerprintTechnicalClaim(claim, sources)) {
          violations.push({ code: "documentary-fingerprint-mismatch", subject: claim.id, message: "A revisão não corresponde ao texto e às fontes atuais" });
        }
      }
    }
    if (claim.status !== "approved" && claim.humanApproval) {
      violations.push({ code: "unexpected-human-approval", subject: claim.id, message: "Uma revisão não aprovada não pode declarar aprovação humana" });
    }
    if (claim.status === "approved") {
      const approver = claim.humanApproval
        ? reviewerById.get(claim.humanApproval.approvedBy)
        : undefined;
      if (
        claim.reviewKind !== "human-reviewed" ||
        reviewer?.kind !== "human" ||
        !claim.humanApproval ||
        approver?.kind !== "human" ||
        approver.id !== claim.reviewerId ||
        !isValidIsoDate(claim.humanApproval.approvedAt)
      ) {
        violations.push({ code: "unsupported-approval", subject: claim.id, message: "Aprovação exige revisor humano real e registro válido" });
      }
    }
    if (strictRelease && claim.priority === "P0" && claim.status !== "approved") {
      violations.push({ code: "critical-human-required", subject: claim.id, message: "Afirmação P0 exige aprovação humana registrada" });
    }
    if (strictRelease && claim.priority === "P1" && !["approved", "documented"].includes(claim.status)) {
      violations.push({ code: "critical-pending-human", subject: claim.id, message: "Afirmação P1 exige revisão documental rastreável ou aprovação humana registrada" });
    }
  }

  return violations;
}
