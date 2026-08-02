export interface PublicSourceReference {
  href: string;
  accessedAt: string;
  linkLabel: "abrir documento citado" | "consultar documentação oficial relacionada";
}

// Este registro qualifica a fonte editorial exibida ao leitor. Ele não declara
// licença, permissão ou outra base jurídica para republicar o arquivo local;
// esse gate documental está em ASSET_RIGHTS_REVIEW.md.

const ACCESSED_AT = "12 jul. 2026";

const normalizeSourceLabel = (label: string) =>
  label.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");

const cited = (href: string): PublicSourceReference => ({
  href,
  accessedAt: ACCESSED_AT,
  linkLabel: "abrir documento citado",
});

const related = (href: string): PublicSourceReference => ({
  href,
  accessedAt: ACCESSED_AT,
  linkLabel: "consultar documentação oficial relacionada",
});

const entries: Array<[string, PublicSourceReference]> = [];
const register = (labels: string[], reference: PublicSourceReference) => {
  for (const label of labels) entries.push([normalizeSourceLabel(label), reference]);
};

const plantPaxSelectionGuide =
  "https://literature.rockwellautomation.com/idc/groups/literature/documents/sg/proces-sg001_-en-p.pdf";
register(
  ["Rockwell Automation · PlantPAx System Release 5.50 (PROCES-SG001W-EN-P)"],
  cited(plantPaxSelectionGuide),
);
const plantPaxDocumentation =
  "https://www.rockwellautomation.com/en-us/support/documentation/technical/capabilities/plantpax-process-solutions.html";
register(
  [
    "Rockwell Automation - PlantPAx DCS Selection Guide (PROCES-SG001), arquiteturas de referência da release 5.40",
  ],
  related(plantPaxDocumentation),
);
register(
  [
    "Rockwell Automation · PlantPAx 5.40 Reference Architectures",
    "Rockwell Automation · PlantPAx 5.20 Reference Architectures",
    "Rockwell Automation - PlantPAx 5.40 Reference Architectures",
    "Rockwell Automation - PlantPAx 5.20 Reference Architectures",
    "Rockwell Automation - PlantPAx Batch Design Considerations",
  ],
  related(plantPaxDocumentation),
);
register(
  [
    "Rockwell Automation · PlantPAx Reference Architecture (Small PASS-C, 1k I/O)",
    "Rockwell Automation - PlantPAx Reference Architecture (Small PASS-C, 1k I/O)",
    "Rockwell Automation - PlantPAx Reference Architecture (Large, multiple PASS, 10k I/O)",
  ],
  related(plantPaxDocumentation),
);

register(
  [
    "Cisco + Rockwell Automation · Securely Traversing IACS Data across the IDMZ (ENET-TD013A-EN-P)",
    "Cisco + Rockwell Automation - Securely Traversing IACS Data across the IDMZ (ENET-TD013A-EN-P)",
  ],
  cited(
    "https://literature.rockwellautomation.com/idc/groups/literature/documents/td/enet-td013_-en-p.pdf",
  ),
);
register(
  [
    "Cisco + Rockwell Automation - Deploying Identity and Mobility Services within a CPwE Architecture (ENET-TD008B-EN-P)",
  ],
  cited(
    "https://literature.rockwellautomation.com/idc/groups/literature/documents/td/enet-td008_-en-p.pdf",
  ),
);

const cpweDesignGuides =
  "https://www.rockwellautomation.com/en-us/capabilities/industrial-networks/design-guides.html";
register(
  [
    "Cisco + Rockwell Automation - CPwE Design and Implementation Guides",
    "Cisco + Rockwell Automation - CPwE Deep Dive",
    "Cisco + Rockwell Automation - CPwE Deep Dive Architecture",
    "Cisco + Rockwell Automation · CPwE Deep Dive",
    "Cisco + Rockwell Automation - Deploying Identity and Mobility Services within a Converged Plantwide Ethernet Architecture",
    "Cisco + Rockwell Automation - Deploying CIP Security within a Converged Plantwide Ethernet Architecture",
    "Cisco + Rockwell Automation - Deploying Industrial Firewalls within a Converged Plantwide Ethernet Architecture",
    "Cisco + Rockwell Automation - Cloud Connectivity to a Converged Plantwide Ethernet Architecture",
  ],
  related(cpweDesignGuides),
);

const highAvailabilityManual =
  "https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/highav-rm002_-en-p.pdf";
register(
  [
    "Rockwell Automation - ControlLogix High Availability Reference Architectures",
    "Rockwell Automation · ControlLogix High Availability Reference Architectures",
    "Rockwell Automation - Logix Redundancy Systems Reference Architectures",
    "Rockwell Automation - Logix Redundancy Systems Reference Architectures (Logix SIS Topologies)",
    "Rockwell Automation - Parallel Redundancy Protocol Reference Architectures",
  ],
  related(highAvailabilityManual),
);
register(
  [
    "Rockwell Automation - ControlLogix 5580 and ControlLogix 5570 Systems Selection Guide (1756-SG020-EN-P)",
  ],
  cited(
    "https://literature.rockwellautomation.com/idc/groups/literature/documents/sg/1756-sg020_-en-p.pdf",
  ),
);

register(
  [
    "Rockwell Automation - FactoryTalk View SE Reference Architectures",
    "Rockwell Automation · FactoryTalk View SE Reference Architectures",
  ],
  related(
    "https://literature.rockwellautomation.com/idc/groups/literature/documents/um/viewse-um006_-en-e.pdf",
  ),
);
register(
  [
    "Rockwell Automation - FactoryTalk Historian SE Reference Architectures",
    "Rockwell Automation - FactoryTalk Historian Reference Architectures",
    "Rockwell Automation · FactoryTalk Historian Reference Architectures",
  ],
  related(
    "https://literature.rockwellautomation.com/idc/groups/literature/documents/qr/hse-qr003_-en-e.pdf",
  ),
);
register(
  ["Rockwell Automation - FactoryTalk Optix Reference Architectures"],
  related(
    "https://www.rockwellautomation.com/en-us/docs/factorytalk-optix/current/technical-content/optix-at001.html",
  ),
);
register(
  ["Rockwell Automation - FactoryTalk Services Platform Reference Architectures"],
  related(
    "https://www.rockwellautomation.com/en-us/support/documentation/technical/factorytalk-software/services.html",
  ),
);
register(
  ["Rockwell Automation - FactoryTalk Analytics LogixAI Reference Architectures"],
  related(
    "https://www.rockwellautomation.com/en-us/support/documentation/technical/factorytalk-software/analytics-and-data.html",
  ),
);
register(
  ["Rockwell Automation - FactoryTalk Security System Design"],
  related(
    "https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/secure-rm001_-en-p.pdf",
  ),
);
register(
  ["Rockwell Automation - FactoryTalk DataMosaix Reference Architectures"],
  related(
    "https://www.rockwellautomation.com/en-us/products/software/factorytalk/operationsuite/datamosaix.html",
  ),
);

register(
  [
    "Telit Cinterion + Eletronor - Eletroday (apresentação institucional)",
    "Telit Cinterion + Eletronor · Eletroday (apresentação institucional)",
  ],
  related("https://www.telit.com/iot-platforms/devicewise/"),
);
register(
  [
    "Siemens AG - Network Reference Architecture for Discrete Manufacturing (Article 109802750)",
    "Siemens AG - Network Reference Architecture for Discrete Manufacturing (Article 109802750, V2.0)",
  ],
  cited("https://support.industry.siemens.com/cs/document/109802750/"),
);
register(
  [
    "Siemens - SIMATIC Programmable Logic Controllers ST 70 Catalog",
    "Siemens AG - SIMATIC ST 70 Catalog (2025)",
  ],
  related("https://support.industry.siemens.com/"),
);
register(
  ["Elipse Software - Elipse E3"],
  related("https://www.elipse.com.br/produto/elipse-e3/"),
);
register(
  [
    "Schneider Electric - EcoStruxure Control Expert",
    "Schneider Electric - EcoStruxure Machine Expert",
    "Schneider Electric - EcoStruxure Machine SCADA Expert",
  ],
  related("https://www.se.com/ww/en/work/products/industrial-automation-control/"),
);

const SOURCE_REFERENCES = new Map(entries);

/**
 * Resolve somente rótulos editoriais explicitamente cadastrados.
 *
 * Um link marcado como "relacionado" leva à documentação oficial útil para
 * conferência, mas não é apresentado como a origem exata da imagem. Isso evita
 * que uma correspondência parcial transforme uma página genérica em "fonte
 * primária" do material exibido.
 */
export function publicSourceFor(label: string): PublicSourceReference | undefined {
  return SOURCE_REFERENCES.get(normalizeSourceLabel(label));
}
