function metadataPolicyViolations(route, { canonicals, ogUrls }) {
  if (route === "/404.html") {
    const violations = [];
    if (canonicals.length > 0) {
      violations.push({
        rule: "canonical",
        message: "404 não deve conter link canonical",
      });
    }
    if (ogUrls.length > 0) {
      violations.push({
        rule: "og:url",
        message: "404 não deve conter meta og:url",
      });
    }
    return violations;
  }

  const violations = [];
  if (canonicals.length !== 1 || !canonicals[0]) {
    violations.push({
      rule: "canonical",
      message: `esperado 1 link canonical não vazio; encontrado(s): ${canonicals.length}`,
    });
  }
  if (ogUrls.length !== 1 || !ogUrls[0]) {
    violations.push({
      rule: "og:url",
      message: `esperada 1 meta og:url não vazia; encontrada(s): ${ogUrls.length}`,
    });
  }
  return violations;
}

module.exports = { metadataPolicyViolations };
