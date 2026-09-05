import { technicalClaims, technicalReviewers } from "../src/data/technicalClaims.ts";
import { technicalSources } from "../src/data/sourceRegistry.ts";
import { validateTechnicalClaims } from "./technicalClaimsPolicy.ts";

const strictRelease = process.argv.includes("--strict-release");
const violations = validateTechnicalClaims({
  claims: technicalClaims,
  sources: technicalSources,
  reviewers: technicalReviewers,
  strictRelease,
});

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

const expectedSourceIds = Array.from({ length: 20 }, (_, index) =>
  `S${String(index + 1).padStart(2, "0")}`,
);
const actualSourceIds = technicalSources.map((source) => source.id).sort();
if (JSON.stringify(actualSourceIds) !== JSON.stringify(expectedSourceIds)) {
  violations.push({
    code: "incomplete-source-register",
    subject: "technicalSources",
    message: "O lote deve representar exatamente as fontes S01-S20 do registro auditado",
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
