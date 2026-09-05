import type { TechnicalClaim } from "./technicalClaimTypes";

const formatDate = (value: string) => {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const evidenceLabels: Record<TechnicalClaim["evidenceKind"], string> = {
  "documented-support": "Suporte documentado",
  characterized: "Desempenho caracterizado em condições específicas",
  lab: "Evidência de laboratório",
  field: "Evidência de campo",
  "engineering-inference": "Interpretação de engenharia baseada nas fontes",
  "internal-evidence-required": "Evidência interna ainda não auditada",
  "editorial-process": "Registro do processo editorial",
};

export function technicalClaimPresentation(claim: TechnicalClaim) {
  let reviewLabel: string;
  if (claim.status === "approved" && claim.humanApproval) {
    reviewLabel = `Validação humana aprovada em ${formatDate(claim.humanApproval.approvedAt)}`;
  } else if (claim.status === "documented") {
    reviewLabel = `Fontes revisadas com IA em ${formatDate(claim.reviewedAt)}; validação humana não registrada`;
  } else if (claim.status === "superseded") {
    reviewLabel = "Registro substituído; não usar como evidência vigente";
  } else if (claim.reviewKind === "gap-recorded-ai") {
    reviewLabel = `Pendência registrada em ${formatDate(claim.reviewedAt)}; validação humana necessária`;
  } else {
    reviewLabel = `Fontes conferidas em ${formatDate(claim.reviewedAt)}; validação humana pendente`;
  }

  return { evidenceLabel: evidenceLabels[claim.evidenceKind], reviewLabel };
}
