import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
const { hasUnambiguousManualSource } = createRequire(import.meta.url)("../../scripts/manualSourcePolicy.cjs");
const source = "https://manufacturer.example/manual";
const valid = { sourceHrefs: [source], captionHrefs: [source], captionText: "Fonte: fabricante · abrir documento citado" };
describe("qualified manual references", () => {
  it("accepts the existing single source caption", () => expect(hasUnambiguousManualSource(valid)).toBe(true));
  it("accepts the same source repeated in a zoom dialog", () => expect(hasUnambiguousManualSource({ ...valid, sourceHrefs: [source, source] })).toBe(true));
  it("rejects a conflicting source in the dialog", () => expect(hasUnambiguousManualSource({ ...valid, sourceHrefs: [source, "https://other.example/manual"] })).toBe(false));
  it("rejects a source available only inside the dialog", () => expect(hasUnambiguousManualSource({ ...valid, captionHrefs: [] })).toBe(false));
  it("rejects an unqualified source label", () => expect(hasUnambiguousManualSource({ ...valid, captionText: "Fonte: fabricante" })).toBe(false));
});
