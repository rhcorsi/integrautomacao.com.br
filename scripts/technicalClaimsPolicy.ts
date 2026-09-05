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
    if (strictRelease && (claim.priority === "P0" || claim.priority === "P1") && claim.status === "pending-human") {
      violations.push({ code: "critical-pending-human", subject: claim.id, message: "Gate estrito requer validação humana" });
    }
  }

  return violations;
}
