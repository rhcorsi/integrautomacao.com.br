export interface PublicSourceReference {
  href: string;
  accessedAt: string;
}

const ACCESSED_AT = "12 jul. 2026";

/**
 * Resolve rótulos editoriais legados para uma fonte primária clicável.
 *
 * O registro não afirma licença de reprodução. Ele documenta a origem para
 * rastreabilidade técnica; a base de permissão de cada imagem continua sendo
 * uma verificação editorial separada.
 */
export function publicSourceFor(label: string): PublicSourceReference | undefined {
  const source = label.toLocaleLowerCase("pt-BR");
  const reference = (href: string): PublicSourceReference => ({
    href,
    accessedAt: ACCESSED_AT,
  });

  if (source.includes("proces-sg001") || source.includes("plantpax")) {
    return reference(
      "https://literature.rockwellautomation.com/idc/groups/literature/documents/sg/proces-sg001_-en-p.pdf",
    );
  }
  if (source.includes("enet-td013")) {
    return reference(
      "https://literature.rockwellautomation.com/idc/groups/literature/documents/td/enet-td013_-en-p.pdf",
    );
  }
  if (source.includes("enet-td008") || source.includes("identity and mobility")) {
    return reference(
      "https://www.rockwellautomation.com/en-us/capabilities/industrial-networks/design-guides.html",
    );
  }
  if (
    source.includes("cpwe") ||
    source.includes("cip security") ||
    source.includes("industrial firewalls") ||
    source.includes("cloud connectivity")
  ) {
    return reference(
      "https://literature.rockwellautomation.com/idc/groups/literature/documents/td/enet-td001_-en-p.pdf",
    );
  }
  if (
    source.includes("high availability") ||
    source.includes("redundancy systems") ||
    source.includes("parallel redundancy protocol")
  ) {
    return reference(
      "https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/highav-rm002_-en-p.pdf",
    );
  }
  if (source.includes("1756-sg020") || source.includes("5580 and controllogix 5570")) {
    return reference(
      "https://literature.rockwellautomation.com/idc/groups/literature/documents/sg/1756-sg020_-en-p.pdf",
    );
  }
  if (source.includes("factorytalk view se")) {
    return reference(
      "https://literature.rockwellautomation.com/idc/groups/literature/documents/um/viewse-um006_-en-e.pdf",
    );
  }
  if (source.includes("factorytalk historian")) {
    return reference(
      "https://literature.rockwellautomation.com/idc/groups/literature/documents/qr/hse-qr003_-en-e.pdf",
    );
  }
  if (source.includes("factorytalk optix")) {
    return reference(
      "https://www.rockwellautomation.com/en-us/docs/factorytalk-optix/current/technical-content/optix-at001.html",
    );
  }
  if (source.includes("factorytalk security")) {
    return reference(
      "https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/secure-rm001_-en-p.pdf",
    );
  }
  if (source.includes("datamosaix")) {
    return reference(
      "https://www.rockwellautomation.com/en-us/products/software/factorytalk/operationsuite/datamosaix.html",
    );
  }
  if (source.includes("telit") || source.includes("devicewise")) {
    return reference("https://www.telit.com/iot-platforms/devicewise/");
  }
  if (source.includes("109802750")) {
    return reference(
      "https://support.industry.siemens.com/cs/document/109802750/",
    );
  }
  if (source.includes("simatic") || source.includes("siemens")) {
    return reference("https://support.industry.siemens.com/");
  }
  if (source.includes("elipse e3")) {
    return reference("https://www.elipse.com.br/produto/elipse-e3/");
  }
  if (source.includes("schneider") || source.includes("ecostruxure")) {
    return reference(
      "https://www.se.com/ww/en/work/products/industrial-automation-control/",
    );
  }

  return undefined;
}
