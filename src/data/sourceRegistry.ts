export interface PublicSourceReference {
  href: string;
  accessedAt: string;
  linkLabel: "abrir documento citado" | "consultar documentação oficial relacionada";
}

import type { TechnicalSource } from "./technicalClaimTypes";

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

// Fontes consultadas no lote técnico de 2026-09-04. Este cadastro é separado
// dos aliases editoriais legados acima: preserva as datas históricas e oferece
// IDs estáveis sem duplicar URLs dentro do novo registro.
export const technicalSources: TechnicalSource[] = [
  { id: "S01", title: "Rockwell SoftLogix 5800 v23 release note", canonicalUrl: "https://compatibility.rockwellautomation.com/GeneratedReleaseNote.aspx?v1=53278", documentRevision: "SoftLogix 5800 v23", manufacturer: "Rockwell Automation", accessedAt: "2026-09-04", status: "current" },
  { id: "S02", title: "Schneider FAQ000263116: licenças Control Expert S, L e XL", canonicalUrl: "https://www.se.com/it/it/faqs/FAQ000263116/", documentRevision: "FAQ atualizada em 2024-01-16", manufacturer: "Schneider Electric", accessedAt: "2026-09-04", status: "current" },
  { id: "S03", title: "Schneider FAQ000265412: M218 no Machine Expert", canonicalUrl: "https://www.se.com/us/en/faqs/FAQ000265412/", documentRevision: "FAQ atualizada em 2026-03-03", manufacturer: "Schneider Electric", accessedAt: "2026-09-04", status: "current" },
  { id: "S04", title: "Schneider FA233597: programação do M221", canonicalUrl: "https://www.se.com/us/en/faqs/FA233597/", documentRevision: "FAQ atualizada em 2026-05-21", manufacturer: "Schneider Electric", accessedAt: "2026-09-04", status: "current" },
  { id: "S05", title: "Telit deviceWISE EDGE / AWS", canonicalUrl: "https://docs.devicewise.com/Content/Products/GatewayDevelopersGuide/CloudConnectors/AWS/AWS.htm", documentRevision: "Página vigente em 2026-09-04", manufacturer: "Telit Cinterion", accessedAt: "2026-09-04", status: "current" },
  { id: "S06", title: "Telit Supported Enterprise transports", canonicalUrl: "https://docs.devicewise.com/Content/GettingStarted/Supported-Enterprise-transports.htm", documentRevision: "Página atualizada em 2024-08-02", manufacturer: "Telit Cinterion", accessedAt: "2026-09-04", status: "current" },
  { id: "S07", title: "Siemens PCS 7 V10.0 SP1 Readme", canonicalUrl: "https://support.industry.siemens.com/cs/attachments/109983446/SIMATIC_PCS7_V10_0_SP1_Readme.pdf", documentRevision: "PCS 7 V10.0 SP1; A5E54166065-AA", manufacturer: "Siemens", accessedAt: "2026-09-04", status: "current" },
  { id: "S08", title: "Siemens SIMATIC WinCC V8", canonicalUrl: "https://www.siemens.com/en-gb/products/simatic-wincc/v8/", documentRevision: "Página vigente em 2026-09-04", manufacturer: "Siemens", accessedAt: "2026-09-04", status: "current" },
  { id: "S09", title: "CISA StopRansomware Guide", canonicalUrl: "https://www.cisa.gov/sites/default/files/2023-10/StopRansomware-Guide-508C-v3_1.pdf", documentRevision: "Guia 2023; publicação revisada em 2023-10-19", manufacturer: "CISA", accessedAt: "2026-09-04", status: "current" },
  { id: "S10", title: "NIST SP 800-82 Rev.3", canonicalUrl: "https://csrc.nist.gov/pubs/sp/800/82/r3/final", documentRevision: "SP 800-82 Rev.3; setembro de 2023", manufacturer: "NIST", accessedAt: "2026-09-04", status: "current" },
  { id: "S11", title: "OPC Foundation Part 2: Session communication layer", canonicalUrl: "https://reference.opcfoundation.org/specs/OPC-10000-2/4.5.2.3", documentRevision: "Especificação online vigente em 2026-09-04", manufacturer: "OPC Foundation", accessedAt: "2026-09-04", status: "current" },
  { id: "S12", title: "OPC Foundation Part 6: OPC UA Secure Conversation", canonicalUrl: "https://reference.opcfoundation.org/specs/OPC-10000-6/6.7", documentRevision: "Especificação online vigente em 2026-09-04", manufacturer: "OPC Foundation", accessedAt: "2026-09-04", status: "current" },
  { id: "S13", title: "Modbus Organization: Modbus Security", canonicalUrl: "https://www.modbus.org/news/modbus-security-new-protocol-to-improve-control-system-security", documentRevision: "Publicação de 2018-10-29", manufacturer: "Modbus Organization", accessedAt: "2026-09-04", status: "current" },
  { id: "S14", title: "IEC 62443-2-4:2023", canonicalUrl: "https://webstore.iec.ch/en/publication/67631", documentRevision: "Edição 2.0; 2023-12-15", manufacturer: "IEC", accessedAt: "2026-09-04", status: "current" },
  { id: "S15", title: "ISA: Applying ISO/IEC 27001/2 and the 62443 Series", canonicalUrl: "https://www.isa.org/getmedia/12ce5956-3047-4820-899c-5158722039d9/ISAGCA_Applying-ISO-IEC-27001-2-and-the-62443-Series_White-Paper_2025.pdf", documentRevision: "White paper 2025", manufacturer: "ISA Global Cybersecurity Alliance", accessedAt: "2026-09-04", status: "current" },
  { id: "S16", title: "Rockwell PlantPAx Selection Guide", canonicalUrl: plantPaxSelectionGuide, documentRevision: "PROCES-SG001W-EN-P; abril de 2026; PlantPAx 5.50", manufacturer: "Rockwell Automation", accessedAt: "2026-09-04", status: "current" },
  { id: "S17", title: "Rockwell/Cisco CPwE DLR Design Guide", canonicalUrl: "https://literature.rockwellautomation.com/idc/groups/literature/documents/td/enet-td015_-en-p.pdf", documentRevision: "ENET-TD015G-EN-P", manufacturer: "Rockwell Automation e Cisco", accessedAt: "2026-09-04", status: "current" },
  { id: "S18", title: "Elipse Drivers 11 - Maio 2026", canonicalUrl: "https://www.elipse.com.br/drivers/elipse-drivers-11-maio-2026/", documentRevision: "2026-05-15; Siemens M-Prot v4.0.38", manufacturer: "Elipse Software", accessedAt: "2026-09-04", status: "current" },
  { id: "S19", title: "Elipse ABCIP: configuração CIP EtherNet/IP", canonicalUrl: "https://docs.elipse.com.br/documents/pt-br/driver/abcip/latest/abcip_config_extra_cip_ethernetip.html", documentRevision: "Documentação online latest em 2026-09-04", manufacturer: "Elipse Software", accessedAt: "2026-09-04", status: "current" },
  { id: "S20", title: "Siemens TIA Selection Tool", canonicalUrl: "https://www.siemens.com/en-us/products/tia/selection-tool/", documentRevision: "Página vigente em 2026-09-04", manufacturer: "Siemens", accessedAt: "2026-09-04", status: "current" },
];

const TECHNICAL_SOURCE_BY_ID = new Map(technicalSources.map((source) => [source.id, source]));

export function technicalSourceById(id: string): TechnicalSource | undefined {
  return TECHNICAL_SOURCE_BY_ID.get(id);
}
