import { describe, expect, it } from "vitest";
import { metadataPolicyViolations } from "../../scripts/editorialMetadataPolicy.cjs";

describe("editorial metadata policy", () => {
  it("forbids canonical and og:url on the generated 404 route", () => {
    expect(
      metadataPolicyViolations("/404.html", {
        canonicals: ["https://integrautomacao.com.br/404.html"],
        ogUrls: ["https://integrautomacao.com.br/404.html"],
      }),
    ).toEqual([
      {
        rule: "canonical",
        message: "404 não deve conter link canonical",
      },
      {
        rule: "og:url",
        message: "404 não deve conter meta og:url",
      },
    ]);
  });

  it("requires exactly one canonical and og:url on ordinary routes", () => {
    expect(
      metadataPolicyViolations("/empresa/", {
        canonicals: [],
        ogUrls: [],
      }),
    ).toEqual([
      {
        rule: "canonical",
        message: "esperado 1 link canonical não vazio; encontrado(s): 0",
      },
      {
        rule: "og:url",
        message: "esperada 1 meta og:url não vazia; encontrada(s): 0",
      },
    ]);
  });
});
