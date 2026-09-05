import { readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { technicalClaims, technicalReviewers } from "../src/data/technicalClaims.ts";
import { technicalSources } from "../src/data/sourceRegistry.ts";
import { isSafeDocumentaryPath, validateTechnicalClaims } from "./technicalClaimsPolicy.ts";

const strictRelease = process.argv.includes("--strict-release");
const violations = validateTechnicalClaims({
  claims: technicalClaims,
  sources: technicalSources,
  reviewers: technicalReviewers,
  strictRelease,
});

for (const option of process.argv.slice(2)) {
  if (option !== "--strict-release") {
    violations.push({ code: "unsupported-option", subject: option, message: "Opção desconhecida; não há bypass de evidência documental" });
  }
}

const repositoryRoot = realpathSync(fileURLToPath(new URL("../", import.meta.url)));
const reviewDirectory = resolve(repositoryRoot, "docs/reviews");
for (const claim of technicalClaims) {
  const review = claim.documentaryReview;
  if (claim.status !== "documented" || !review || !isSafeDocumentaryPath(review.evidencePath)) continue;
  // Policy reports malformed identifiers and digests; never interpolate them into
  // the evidence matcher before checking their restricted formats here.
  if (!/^T\d{2}$/.test(claim.id) || !/^[a-f0-9]{64}$/.test(review.fingerprint)) continue;
  try {
    const actualPath = realpathSync(resolve(repositoryRoot, review.evidencePath));
    const withinReviews = relative(reviewDirectory, actualPath);
    if (!withinReviews || isAbsolute(withinReviews) || withinReviews === ".." || withinReviews.startsWith(`..${sep}`) || !statSync(actualPath).isFile()) {
      violations.push({ code: "unsafe-documentary-evidence", subject: claim.id, message: "O arquivo real de evidência deve estar dentro de docs/reviews" });
      continue;
    }
    const evidence = readFileSync(actualPath, "utf8");
    const binding = new RegExp(`^\\s*\x60?${claim.id}: ${review.fingerprint}\x60?\\s*$`, "m");
    if (!binding.test(evidence)) {
      violations.push({ code: "documentary-evidence-mismatch", subject: claim.id, message: "Evidência deve registrar o par exato ID: fingerprint da revisão atual" });
    }
  } catch {
    violations.push({ code: "missing-documentary-evidence", subject: claim.id, message: "Arquivo de revisão documental ausente ou ilegível" });
  }
}

const expectedClaimIds = Array.from({ length: 22 }, (_, index) =>
  `T${String(index + 1).padStart(2, "0")}`,
);
const actualClaimIds = technicalClaims.map((claim) => claim.id).sort();
if (JSON.stringify(actualClaimIds) !== JSON.stringify(expectedClaimIds)) {
  violations.push({
    code: "incomplete-audit-matrix",
    subject: "technicalClaims",
    message: "O lote deve representar exatamente as decisões T01-T22 da matriz auditada",
  });
}

const expectedSourceIds = Array.from({ length: 25 }, (_, index) =>
  `S${String(index + 1).padStart(2, "0")}`,
);
const actualSourceIds = technicalSources.map((source) => source.id).sort();
if (JSON.stringify(actualSourceIds) !== JSON.stringify(expectedSourceIds)) {
  violations.push({
    code: "incomplete-source-register",
    subject: "technicalSources",
    message: "O lote deve representar exatamente as fontes S01-S25 do registro auditado",
  });
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(`[${violation.code}] ${violation.subject}: ${violation.message}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Technical claims: OK (${technicalClaims.length} decisões, ${technicalSources.length} fontes, gate ${strictRelease ? "estrito" : "estrutural"}).`,
  );
}
