/** The caption owns the source. A zoom dialog may repeat that same destination. */
function hasUnambiguousManualSource({ sourceHrefs, captionHrefs, captionText }) {
  return captionHrefs.length === 1 &&
    new Set(sourceHrefs).size === 1 &&
    sourceHrefs.includes(captionHrefs[0]) &&
    /(abrir documento citado|consultar documentação oficial relacionada)/i.test(captionText);
}
module.exports = { hasUnambiguousManualSource };
