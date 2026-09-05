export type SourceStatus = "current" | "superseded";

export interface TechnicalSource {
  id: string;
  title: string;
  canonicalUrl: string;
  documentRevision: string;
  manufacturer: string;
  accessedAt: string;
  status: SourceStatus;
}

export interface TechnicalReviewer {
  id: string;
  displayName: string;
  kind: "human" | "ai";
}

export interface HumanApproval {
  approvedBy: string;
  approvedAt: string;
}

/** Source review records an AI documentary check, never human approval. */
export interface DocumentaryReview {
  reviewerId: string;
  reviewedAt: string;
  evidencePath: string;
  fingerprint: string;
}

export interface TechnicalClaim {
  id: string;
  pagePaths: string[];
  statement: string;
  decision: string;
  priority: "P0" | "P1" | "P2";
  product: string;
  applicableVersions: string[];
  sourceIds: string[];
  sourceLocator: string;
  evidenceKind:
    | "documented-support"
    | "characterized"
    | "lab"
    | "field"
    | "engineering-inference"
    | "internal-evidence-required"
    | "editorial-process";
  reviewedAt: string;
  reviewerId: string;
  reviewKind: "source-checked-ai" | "gap-recorded-ai" | "human-reviewed";
  status: "approved" | "documented" | "pending-human" | "superseded";
  humanApproval?: HumanApproval;
  documentaryReview?: DocumentaryReview;
}
