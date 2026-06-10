import type { ImageMetadata } from "astro";

import batchReference from "@/assets/manuals/factorytalk-batch-operator-prompt.jpg";
import viewSeReference from "@/assets/manuals/factorytalk-view-se-distributed-small.jpg";
import historianReference from "@/assets/manuals/factorytalk-historian-logical-diagram.jpg";
import datamosaixReference from "@/assets/manuals/factorytalk-datamosaix-data-flow.jpg";
import cpweReference from "@/assets/manuals/cpwe-ot-it-bridging.jpg";
import controllogixReference from "@/assets/manuals/controllogix-dlr-converged.jpg";
import securityReference from "@/assets/manuals/factorytalk-security-system.jpg";
import elipseE3Reference from "@/assets/manuals/elipse-e3-architecture.jpg";
import schneiderControlReference from "@/assets/manuals/schneider-control-expert-topology.jpg";
import schneiderMachineReference from "@/assets/manuals/schneider-machine-expert-engineering.jpg";
import schneiderScadaReference from "@/assets/manuals/schneider-machine-scada-expert.jpg";

// New: dedicated diagrams sourced from Cisco/Rockwell CVDs and reference manuals
// to replace forced reuses (the same image appearing in 5-7 unrelated pages).
import cpweOtVsItComparison from "@/assets/manuals/cpwe-ot-vs-it-comparison.jpg";
import cpwePlantwideZoning from "@/assets/manuals/cpwe-plantwide-zoning-levels.jpg";
import adCaHierarchy from "@/assets/manuals/active-directory-ca-hierarchy.jpg";
import cpweSecurityFramework from "@/assets/manuals/cpwe-industrial-security-framework.jpg";
import industrialFirewalls from "@/assets/manuals/industrial-firewalls-deployment.jpg";
import prpRedundancy from "@/assets/manuals/prp-redundancy-operation.jpg";
import controllogixRedundancyDecision from "@/assets/manuals/controllogix-redundancy-decision.jpg";
import controllogixPrpNonConverged from "@/assets/manuals/controllogix-prp-non-converged.jpg";
import cpweDefenseInDepth from "@/assets/manuals/cpwe-defense-in-depth.jpg";
import factorytalkAnalyticsLogixai from "@/assets/manuals/factorytalk-analytics-logixai.jpg";
import simaticStep7Classic from "@/assets/manuals/simatic-step7-classic.jpg";

// V2 library (May 2026): premium diagrams curated from public CVDs and product pages.
// Other library entries (logix-direct-dlr-non-converged, factorytalk-optix-data-flow-detail,
// aveva-rcl-foods-sugar-case, aveva-production-dashboard, siemens-network-layer2-architecture,
// plantpax-redundant-prp-topology, plantpax-passc-small-1k-io) live in src/assets/manuals/
// and are catalogued in _img_extraction/library_catalog.json for blog/case-study reuse.
import idmzUntrustedTrusted from "@/assets/manuals/idmz-untrusted-trusted-zones.jpg";
import optixDesignDeployment from "@/assets/manuals/factorytalk-optix-design-deployment.jpg";
// V3 library images (May 2026): premium diagrams promoted from _library/
import plantpaxPasscAnnotated from "@/assets/manuals/plantpax-passc-annotated-1k-io.jpg";
import controllogixGuardlogixArmor from "@/assets/manuals/controllogix-guardlogix-armor-system-config.jpg";
import factorytalkServicesPlatform from "@/assets/manuals/factorytalk-services-platform-functions.jpg";
import factorytalkHistorianClientsV2 from "@/assets/manuals/factorytalk-historian-clients-collective.jpg";
import ftAnalyticsLogixaiPurdueClean from "@/assets/manuals/factorytalk-analytics-logixai-purdue-clean.jpg";
import controllogixPrpDetail from "@/assets/manuals/controllogix-prp-non-converged-detail.jpg";
import cpweIiotOtitBridging from "@/assets/manuals/cpwe-iiot-otit-bridging.jpg";
import cpweDefenseInDepthConcentric from "@/assets/manuals/cpwe-defense-in-depth-concentric.jpg";
// Round 4 swaps (May 2026): replace bad Siemens product-page chrome with real diagrams
import tiaSelectionTool from "@/assets/manuals/tia-selection-tool-portfolio.jpg";
import siemensNetworkUserView from "@/assets/manuals/siemens-network-user-view.jpg";
import plantpaxPasscSmall from "@/assets/manuals/plantpax-passc-small-1k-io.jpg";
import logixDirectDlr from "@/assets/manuals/logix-direct-dlr-non-converged.jpg";
// Round 5 (final architecture-only sweep): Logix SIS for safety, Mobile Remote Access, Medium PASS for plantpax-5x
import logixSisSafetyArchitecture from "@/assets/manuals/logix-sis-safety-architecture.jpg";
import mobileRemoteAccessArchitecture from "@/assets/manuals/mobile-remote-access-architecture.jpg";
import plantpaxMediumPass from "@/assets/manuals/plantpax-reference-medium-pass.jpg";


import devicewiseEletronorArchitecture from "@/assets/manuals/devicewise-eletronor-architecture.jpg";
import siemensNetworkLayer2 from "@/assets/manuals/siemens-network-layer2-architecture.jpg";


export type TechGroup =
  | "Controle e DCS"
  | "Supervisão e Operação"
  | "Dados Industriais e IIoT"
  | "Infraestrutura OT"
  | "Redes e Cibersegurança OT"
  | "Serviços de Engenharia";

export interface TechPage {
  slug: string;
  group: TechGroup;
  type: "Software" | "Tecnologia" | "Serviço";
  title: string;
  shortTitle: string;
  description: string;
  intro: string;
  image: ImageMetadata;
  imageAlt: string;
  imageTitle: string;
  imageSource: string;
  imageCaption: string;
  theme?: "light" | "dark" | "ot";
  useCases: string[];
  howIntegraActs: string[];
  deliverables: string[];
  standards: { code: string; description: string }[];
  faq: { q: string; a: string }[];
  relatedSolutions: { href: string; label: string }[];
  relatedTech: string[];
}

export const GROUP_ORDER: TechGroup[] = [
  "Controle e DCS",
  "Supervisão e Operação",
  "Dados Industriais e IIoT",
  "Infraestrutura OT",
  "Redes e Cibersegurança OT",
  "Serviços de Engenharia",
];

const batchSource = "Rockwell Automation - PlantPAx Batch Design Considerations";
const viewSeSource = "Rockwell Automation - FactoryTalk View SE Reference Architectures";
const historianSource = "Rockwell Automation - FactoryTalk Historian SE Reference Architectures";
const dataMosaixSource = "Rockwell Automation - FactoryTalk DataMosaix Reference Architectures";
const cpweSource = "Cisco + Rockwell Automation - CPwE Design and Implementation Guides";
const logixSource = "Rockwell Automation - ControlLogix High Availability Reference Architectures";
const securitySource = "Rockwell Automation - FactoryTalk Security System Design";
const elipseE3Source = "Elipse Software - Elipse E3";
const schneiderControlSource = "Schneider Electric - EcoStruxure Control Expert";
const schneiderMachineSource = "Schneider Electric - EcoStruxure Machine Expert";
const schneiderScadaSource = "Schneider Electric - EcoStruxure Machine SCADA Expert";

// Sources for the new dedicated diagrams
const cpweDeepDiveSource = "Cisco + Rockwell Automation - CPwE Deep Dive Architecture";
const identityMobilitySource = "Cisco + Rockwell Automation - Deploying Identity and Mobility Services within a Converged Plantwide Ethernet Architecture";
const cipSecuritySource = "Cisco + Rockwell Automation - Deploying CIP Security within a Converged Plantwide Ethernet Architecture";
const industrialFirewallsSource = "Cisco + Rockwell Automation - Deploying Industrial Firewalls within a Converged Plantwide Ethernet Architecture";
const cloudConnectivitySource = "Cisco + Rockwell Automation - Cloud Connectivity to a Converged Plantwide Ethernet Architecture";
const prpSource = "Rockwell Automation - Parallel Redundancy Protocol Reference Architectures";
const controllogixHaSource = "Rockwell Automation - ControlLogix High Availability Reference Architectures";
const ftAnalyticsSource = "Rockwell Automation - FactoryTalk Analytics LogixAI Reference Architectures";
const simaticStep7Source = "Siemens - SIMATIC Programmable Logic Controllers ST 70 Catalog";

// Sources for V2 library (only the ones currently wired into techCatalog entries).
// Additional source strings for library_catalog.json entries are tracked there.
const idmzFirepowerSource = "Cisco + Rockwell Automation - Securely Traversing IACS Data across the IDMZ (ENET-TD013A-EN-P)";
const ftOptixRefSource = "Rockwell Automation - FactoryTalk Optix Reference Architectures";
const telitEletronorSource = "Telit Cinterion + Eletronor - Eletroday (apresentação institucional)";
const siemensNetworkRefSource = "Siemens AG - Network Reference Architecture for Discrete Manufacturing (Article 109802750)";
const simaticSt70Source = "Siemens AG - SIMATIC ST 70 Catalog (2025)";
const siemensNetworkUserViewSource = "Siemens AG - Network Reference Architecture for Discrete Manufacturing (Article 109802750, V2.0)";
const plantpax520RefSource = "Rockwell Automation - PlantPAx 5.20 Reference Architectures";
const logixRedundancyRefSource = "Rockwell Automation - Logix Redundancy Systems Reference Architectures";
const logixSisSource = "Rockwell Automation - Logix Redundancy Systems Reference Architectures (Logix SIS Topologies)";
const cpweIdentityMobilitySource = "Cisco + Rockwell Automation - Deploying Identity and Mobility Services within a CPwE Architecture (ENET-TD008B-EN-P)";
const plantpaxMediumPassSource = "Rockwell Automation - PlantPAx 5.40 Reference Architectures";


// V3 library sources
const plantpax540RefSource = "Rockwell Automation - PlantPAx 5.40 Reference Architectures";
const controllogix5580SystemsSource = "Rockwell Automation - ControlLogix 5580 and ControlLogix 5570 Systems Selection Guide (1756-SG020-EN-P)";
const ftServicesRefSource = "Rockwell Automation - FactoryTalk Services Platform Reference Architectures";
const ftHistorianRefSource = "Rockwell Automation - FactoryTalk Historian Reference Architectures";
const ftAnalyticsRefSource = "Rockwell Automation - FactoryTalk Analytics LogixAI Reference Architectures";
const controllogixHaRefSource = "Rockwell Automation - ControlLogix High Availability Reference Architectures";
const cipSecurityCvdSource = "Cisco + Rockwell Automation - Deploying CIP Security within a Converged Plantwide Ethernet Architecture";


const plantpaxRelated = [
  { href: "/solucoes/plantpax", label: "Solução PlantPAx" },
  { href: "/solucoes/factorytalk", label: "FactoryTalk Suite" },
];

const factorytalkRelated = [
  { href: "/solucoes/factorytalk", label: "Solução FactoryTalk" },
  { href: "/solucoes/plantpax", label: "PlantPAx" },
];

const dataRelated = [
  { href: "/solucoes/pi-system", label: "Dados Industriais" },
  { href: "/solucoes/factorytalk", label: "FactoryTalk Suite" },
];

const infraRelated = [
  { href: "/solucoes/data-centers", label: "Data Centers Industriais" },
  { href: "/solucoes/redes-iec-62443", label: "Redes e IEC 62443" },
];

const cyberRelated = [
  { href: "/solucoes/redes-iec-62443", label: "Redes e IEC 62443" },
  { href: "/solucoes/data-centers", label: "Infraestrutura OT" },
];

const serviceRelated = [
  { href: "/solucoes", label: "Todas as soluções" },
  { href: "/contato", label: "Falar com especialista" },
];

const multiVendorRelated = [
  { href: "/tecnologias", label: "Catálogo técnico" },
  { href: "/contato?assunto=tecnologias-multivendor", label: "Avaliar stack existente" },
];

const commonEngineering = [
  "Diagnóstico técnico do ambiente atual e premissas de operação.",
  "Arquitetura alvo documentada antes da configuração.",
  "Padronização de nomenclaturas, telas, tags, acessos e critérios de aceite.",
  "Testes funcionais, handover e documentação para manutenção.",
];

export const techCatalog: TechPage[] = [
  {
    slug: "plantpax-5x",
    group: "Controle e DCS",
    type: "Tecnologia",
    title: "PlantPAx 5.x",
    shortTitle: "PlantPAx 5.x",
    description:
      "Arquitetura DCS moderna para controle plant-wide, com objetos de processo, servidores FactoryTalk e governança de ciclo de vida.",
    intro:
      "PlantPAx 5.x entra quando a planta precisa sair de automação por ilhas e operar com arquitetura de processo estruturada. O valor está na padronização: objetos, faceplates, alarmes, redes, servidores, historian e documentação falando a mesma língua técnica.",
    image: plantpaxMediumPass,
    imageAlt: "Reference Architecture - Medium: PASS, 5,000 I/O, 30 OWS clients - PlantPAx 5.x",
    imageTitle: "PlantPAx 5.x: arquitetura de referência Medium PASS",
    imageSource: plantpaxMediumPassSource,
    imageCaption: "Print público da Reference Architecture Medium PASS (PlantPAx 5.40): single PASS com 5.000 I/O e 30 OWS clients distribuídos por área de processo. Esta é a topologia DCS plant-wide moderna.",
    useCases: [
      "Implantação ou modernização de DCS para processo contínuo, batelada ou operações híbridas.",
      "Padronização de controle, supervisão e alarmes em plantas com múltiplas áreas.",
      "Integração de ControlLogix, FactoryTalk View SE, Historian, Batch, redes e segurança OT.",
      "Projetos que exigem documentação, governança e manutenção de longo prazo.",
    ],
    howIntegraActs: [
      ...commonEngineering,
      "Define arquitetura PASS, servidores, controladores, áreas, redes e dependências FactoryTalk.",
      "Modela objetos de processo com critérios claros de faceplate, permissivos, intertravamentos e alarmes.",
      "Planeja comissionamento, FAT/SAT e transferência de conhecimento para operação e manutenção.",
    ],
    deliverables: [
      "Arquitetura PlantPAx documentada com servidores, controladores, redes e estações.",
      "Padrão de objetos de processo, módulos, modos, permissivos, alarmes e faceplates.",
      "Matriz de áreas, equipamentos, tags e convenções de nomenclatura.",
      "Plano de testes FAT/SAT e critérios de aceite por área funcional.",
      "Documentação as-built e roteiro de suporte pós-startup.",
    ],
    standards: [
      { code: "PlantPAx", description: "DCS Rockwell Automation" },
      { code: "ControlLogix", description: "Controle de processo" },
      { code: "ISA-88", description: "Modelagem de bateladas" },
      { code: "ISA-18.2", description: "Gestão de alarmes" },
      { code: "IEC 62443", description: "Segurança OT por zona" },
      { code: "CPwE", description: "Rede industrial convergente" },
    ],
    faq: [
      {
        q: "PlantPAx substitui um SCADA comum?",
        a: "Não é apenas troca de tela. PlantPAx organiza controle, supervisão, alarmes, dados e manutenção como uma arquitetura DCS. O ganho vem da consistência entre as camadas.",
      },
      {
        q: "Dá para migrar por etapas?",
        a: "Sim. Normalmente avaliamos áreas críticas, dependências e janelas de parada para construir um roadmap faseado com rollback e critérios de aceite.",
      },
      {
        q: "Qual a diferença entre PlantPAx 4.x e 5.x na prática?",
        a: "PlantPAx 5.x exige controladores da série P (CompactLogix 5380P ou ControlLogix 5580P), tem nova arquitetura de servidores (PASS modernizado), biblioteca de objetos de processo atualizada e integração mais consistente com FactoryTalk View SE moderno. A migração de 4.x para 5.x não é apenas update de versão, envolve troca de hardware de controle e revisão da engenharia.",
      },
      {
        q: "O que define o cronograma de um projeto PlantPAx?",
        a: "Tamanho da arquitetura (PASS-C consolidado ou PASS distribuído, com servidores de aplicação dedicados e redundância opcional), contagem de I/O, número de áreas, integrações (Historian, Batch, MES) e janelas de parada disponíveis. O cronograma específico é construído após o diagnóstico, com fases de engenharia, FAT, comissionamento e SAT por área.",
      },
      {
        q: "PlantPAx funciona em planta híbrida (processo + discreto)?",
        a: "Sim. PlantPAx é projetado para operações híbridas, processo contínuo, batelada ISA-88 e controle discreto convivem na mesma arquitetura, com separação de áreas funcionais e governança consistente de alarmes.",
      },
      {
        q: "Quem mantém o sistema PlantPAx depois do startup?",
        a: "Sustentação fica com o cliente, mas a Integra documenta o sistema para que qualquer engenheiro qualificado possa atuar, não tem dependência exclusiva. Oferecemos contrato de suporte opcional para janelas críticas, análise de tendências e gestão de mudanças.",
      },
    ],
    relatedSolutions: plantpaxRelated,
    relatedTech: ["plantpax-library", "factorytalk-view-se", "factorytalk-historian", "ethernet-ip-cpwe"],
  },
  {
    slug: "plantpax-library",
    group: "Controle e DCS",
    type: "Tecnologia",
    title: "PlantPAx Library of Process Objects",
    shortTitle: "PlantPAx Library",
    description:
      "Biblioteca de objetos de processo para padronizar malhas, equipamentos, faceplates, alarmes, estados e diagnósticos.",
    intro:
      "A biblioteca PlantPAx evita que cada área da planta seja programada de um jeito. Ela cria uma base comum para controle, operação, diagnóstico e manutenção, reduzindo variação técnica e facilitando evolução futura.",
    image: plantpaxPasscAnnotated,
    imageAlt: "PASS-C Small Reference Architecture com 200 OI, 30 OE, 10 OA e 5 OE",
    imageTitle: "Como a biblioteca PlantPAx aterrissa em arquitetura PASS-C Small",
    imageSource: plantpax540RefSource,
    imageCaption: "Print público da Reference Architecture PASS-C: a biblioteca de objetos é a linguagem comum entre o controlador, a HMI e o data server consolidados num só servidor.",
    useCases: [
      "Padronização de válvulas, motores, inversores, malhas PID, equipamentos e fases.",
      "Redução de inconsistência entre telas, alarmes e lógica de controle.",
      "Reengenharia de aplicações antigas sem perder comportamento operacional necessário.",
      "Construção de templates para plantas com múltiplas linhas ou unidades similares.",
    ],
    howIntegraActs: [
      "Define biblioteca base, convenções de tags e padrões de faceplate antes do desenvolvimento.",
      "Configura objetos com permissivos, intertravamentos, modos, estados e diagnósticos coerentes.",
      "Valida alarmes e comandos com operação e manutenção para evitar excesso de eventos sem ação.",
      "Documenta desvios de padrão quando a realidade de campo exigir exceção técnica.",
    ],
    deliverables: [
      "Lista de objetos utilizados e critérios de aplicação por tipo de equipamento.",
      "Templates de lógica, telas, faceplates e alarmes.",
      "Padrão de nomenclatura e matriz de atributos relevantes para historian.",
      "Checklist de validação funcional por objeto.",
      "Manual de manutenção e orientação para expansão futura.",
    ],
    standards: [
      { code: "PlantPAx", description: "Process objects" },
      { code: "ISA-101", description: "HMI de alta performance" },
      { code: "ISA-18.2", description: "Alarmes" },
      { code: "ISA-88", description: "Equipamentos e fases" },
    ],
    faq: [
      {
        q: "Usar biblioteca limita customização?",
        a: "Limita improviso, não engenharia. Customizações continuam possíveis, mas precisam ser documentadas e justificadas para não quebrar manutenção futura.",
      },
      {
        q: "A biblioteca resolve alarmes sozinha?",
        a: "Não. Ela oferece base técnica, mas a governança de alarmes depende de racionalização, prioridades, causa, consequência e ação esperada.",
      },
      {
        q: "Posso usar a Library of Process Objects sem todo o PlantPAx?",
        a: "Sim, a biblioteca pode entrar em projetos ControlLogix sem todos os componentes PlantPAx. Mas o ganho de governança aparece quando alarmes, faceplates e padrões de tela seguem o mesmo modelo plant-wide.",
      },
      {
        q: "Qual versão da PlantPAx Library devo usar?",
        a: "A versão recomendada acompanha a release do PlantPAx (5.x → Library 5.x). Misturar versões de biblioteca e firmware Logix gera incompatibilidade silenciosa que aparece só em FAT. Por isso o sizing trava versões antes de qualquer linha de código.",
      },
      {
        q: "Preciso reescrever lógica antiga para entrar na PlantPAx Library?",
        a: "Não tudo. Avaliamos o que vale migrar (ganho de governança × custo de retest) e o que mantém em rotina existente. Migração gradual por área costuma ser mais segura que big-bang.",
      },
      {
        q: "A biblioteca cobre instrumentação multivariável (PID em cascata, split range, override)?",
        a: "Sim. Os blocos cobrem PID regulatório clássico, cascata, split range, modo manual/auto/cascata e override. O que muda é o detalhamento do faceplate e os intertravamentos específicos do processo, modelados pela engenharia.",
      },
    ],
    relatedSolutions: plantpaxRelated,
    relatedTech: ["plantpax-5x", "controle-regulatorio-pid", "intertravamentos-sequencias", "factorytalk-view-se"],
  },
  {
    slug: "controllogix-compactlogix",
    group: "Controle e DCS",
    type: "Software",
    title: "ControlLogix e CompactLogix",
    shortTitle: "ControlLogix / CompactLogix",
    description:
      "Controladores Logix para controle de processo, máquinas, utilidades e integração plant-wide com redes EtherNet/IP.",
    intro:
      "ControlLogix e CompactLogix sustentam desde skids e áreas menores até arquiteturas de processo distribuídas. A Integra trata o controlador como parte de uma arquitetura completa: I/O, rede, HMI, historian, segurança, testes e documentação.",
    image: controllogixGuardlogixArmor,
    imageAlt: "Configuração ControlLogix com PowerMonitor 1000, GuardLogix 5570/5580, Stratix, PanelView Plus 7 e PowerFlex 525",
    imageTitle: "Família Logix em arquitetura de exemplo - PASS, safety e drives integrados",
    imageSource: controllogix5580SystemsSource,
    imageCaption: "Print público do guia de seleção 1756-SG020-EN-P: ControlLogix, GuardLogix e ArmorControlLogix em uma mesma referência - mostra como a família Logix cobre painel, safety e ambiente IP67.",
    theme: "ot",
    useCases: [
      "Controle de processo com malhas PID, intertravamentos, sequenciamento e diagnósticos.",
      "Modernização de PLC5/SLC500 para arquitetura Logix.",
      "Integração com PlantPAx, FactoryTalk View SE, Batch e Historian.",
      "Aplicações com EtherNet/IP, I/O remoto e redes redundantes.",
    ],
    howIntegraActs: [
      "Define arquitetura de controlador, rack, I/O, rede, redundância e disponibilidade.",
      "Reestrutura lógica para padrões mantíveis, com comentários e organização por área/equipamento.",
      "Valida permissivos, intertravamentos, estados, falhas e comportamento de recuperação.",
      "Integra tags e diagnósticos com HMI, historian e documentação de manutenção.",
    ],
    deliverables: [
      "Projeto de arquitetura Logix e mapa de I/O.",
      "Código estruturado por área, equipamento e função.",
      "Matriz de intertravamentos, permissivos, alarmes e sequências.",
      "Plano FAT/SAT com simulações e critérios de aceite.",
      "Backup versionado, as-built e handover técnico.",
    ],
    standards: [
      { code: "ControlLogix", description: "Controle de médio/grande porte" },
      { code: "CompactLogix", description: "Controle compacto" },
      { code: "EtherNet/IP", description: "Rede de automação" },
      { code: "DLR", description: "Anel de dispositivo" },
      { code: "FAT/SAT", description: "Teste e aceite" },
    ],
    faq: [
      {
        q: "CompactLogix substitui ControlLogix?",
        a: "Depende de I/O, disponibilidade, criticidade, redundância e expansão. A escolha deve vir do sizing e do risco operacional, não apenas do custo inicial.",
      },
      {
        q: "Vocês reescrevem lógica antiga ou convertem automaticamente?",
        a: "Conversão automática pode ajudar, mas não substitui engenharia. Revisamos comportamento, dívidas técnicas e documentação antes de validar a versão final.",
      },
      {
        q: "Quando devo escolher CompactLogix em vez de ControlLogix?",
        a: "CompactLogix entra em máquinas, skids e áreas menores, com painel mais compacto. ControlLogix é a escolha em alta densidade de I/O, redundância de controlador, integração com PlantPAx ou requisitos de safety integrado (GuardLogix). A linha exata é definida no diagnóstico.",
      },
      {
        q: "ControlLogix 5580 substitui o 5570 sem retrabalho?",
        a: "Não diretamente, mas o hardware ajuda: o 5580 usa o mesmo chassi e backplane 1756 do 5570 e reaproveita os módulos de I/O 1756 existentes. O retrabalho está na conversão do projeto no Studio 5000, no firmware e na revalidação da comunicação. A migração é projeto, não troca de peça, envolve recompilar, retestar lógica e revalidar comunicação.",
      },
      {
        q: "Vale a pena migrar PLC-5/SLC500 para ControlLogix em planta legada?",
        a: "Sim quando há risco de spare obsoleto, integração nova ou requisito de cibersegurança. A migração protege a operação por 15+ anos e habilita FactoryTalk, OPC UA e arquitetura PlantPAx, coisas que PLC-5/SLC500 não suportam nativamente.",
      },
      {
        q: "ControlLogix tem alternativa para Safety Integrated?",
        a: "Sim. GuardLogix integra controle e safety SIL3 no mesmo controlador, com tasks lógicas separadas e validação por terceira parte. Para SIL2/3 sem safety integrado, ControlLogix conversa com sistemas de safety dedicados via CIP Safety.",
      },
    ],
    relatedSolutions: [
      { href: "/solucoes/migracao-plc", label: "Migração PLC5/SLC500" },
      { href: "/solucoes/plantpax", label: "PlantPAx" },
    ],
    relatedTech: ["migracao-plc5-slc500", "ethernet-ip-cpwe", "intertravamentos-sequencias"],
  },
  {
    slug: "controle-regulatorio-pid",
    group: "Controle e DCS",
    type: "Serviço",
    title: "Controle regulatório (PID e malhas)",
    shortTitle: "Controle regulatório",
    description:
      "Engenharia de malhas de controle contínuo: PID, cascata, split-range, feed-forward e diagnósticos para operação estável e mantível.",
    intro:
      "Malha PID estável é resultado de engenharia, não de tentativa em campo. A Integra organiza o controle regulatório com critério de sintonia, documentação de parâmetros e diagnósticos que permitem manutenção sustentável depois do startup.",
    image: plantpaxPasscSmall,
    imageAlt: "PASS-C Small Reference Architecture com até 1.000 pontos de I/O",
    imageTitle: "PASS-C Small: onde o controle regulatório vive em arquitetura entry-tier",
    imageSource: plantpax520RefSource,
    imageCaption: "Print público da PlantPAx 5.20 Reference Architecture: em projetos pequenos, o controle regulatório roda em PASS-C consolidado com HMI, dados, alarmes e batch num só servidor, ideal para áreas com até 1.000 pontos.",
    useCases: [
      "Malhas PID instáveis, sem documentação ou com sintonia herdada.",
      "Processos contínuos (vapor, vazão, pressão, temperatura) que precisam de controle robusto.",
      "Migração de instrumentação analógica para malhas digitais com a PlantPAx Library.",
      "Cascata, split-range e compensação em malhas multivariáveis.",
    ],
    howIntegraActs: [
      "Mapeia comportamento atual da malha, atuadores, sensores e limites operacionais.",
      "Define modos (manual / auto / cascata / override), set-point, ramping e proteções.",
      "Aplica critério de sintonia documentado e registra parâmetros como evidência.",
      "Configura diagnósticos para operação e manutenção entenderem comportamento e desvios.",
    ],
    deliverables: [
      "Descritivo funcional de cada malha com lógica de modos e proteções.",
      "Parâmetros de sintonia documentados e justificados.",
      "Faceplate padronizada com a biblioteca PlantPAx.",
      "Plano de teste funcional com critérios de aceite.",
      "Backup de configuração e procedimento de revisão de sintonia.",
    ],
    standards: [
      { code: "PID", description: "Controle regulatório clássico" },
      { code: "ISA-5.1", description: "Simbologia e nomenclatura de instrumentos" },
      { code: "PlantPAx Library", description: "Blocos de processo padronizados" },
      { code: "FAT/SAT", description: "Validação funcional" },
    ],
    faq: [
      {
        q: "Vocês fazem sintonia fina em campo?",
        a: "Sim, quando há condição operacional segura e critério acordado com a operação. A sintonia precisa respeitar processo, atuadores, sensores e limites definidos, não é experimentação cega em planta rodando.",
      },
      {
        q: "Como vocês validam ajuste de PID antes de subir em produção?",
        a: "Quando possível, em ambiente de teste com modelo simplificado de processo ou em planta com modo manual instrumentado. Usamos ferramentas de tuning Rockwell (Autotune, PIDe) e registramos parâmetros como evidência de aceite.",
      },
      {
        q: "PID em ladder ainda faz sentido em planta moderna?",
        a: "Para malhas simples e legado, sim. Em planta nova ou modernização, blocos PIDe/Routine via PlantPAx Library oferecem governança, faceplate padronizada e rastreabilidade, preferível ao PID embutido em rotina ladder não documentada.",
      },
      {
        q: "Quando vale a pena usar cascata ou split-range?",
        a: "Cascata quando há variável intermediária mais rápida que estabiliza a primária (ex.: vazão de vapor para temperatura). Split-range quando o atuador final é dividido em estágios (ex.: válvula de aquecimento e válvula de resfriamento). A escolha vem da análise do processo, não do gosto do programador.",
      },
    ],
    relatedSolutions: plantpaxRelated,
    relatedTech: ["plantpax-library", "controllogix-compactlogix", "intertravamentos-sequencias"],
  },
  {
    slug: "intertravamentos-sequencias",
    group: "Controle e DCS",
    type: "Serviço",
    title: "Intertravamentos e lógica sequencial",
    shortTitle: "Intertravamentos e sequências",
    description:
      "Engenharia de permissivos, intertravamentos operacionais, lógica sequencial e estados ISA-88 para automação previsível e auditável.",
    intro:
      "Intertravamentos compreensíveis e sequências recuperáveis são a diferença entre planta que opera com confiança e planta que depende de quem está em campo. A Integra estrutura essa camada com matriz causa-efeito, descritivos funcionais e diagnósticos de bloqueio claros.",
    image: logixSisSafetyArchitecture,
    imageAlt: "Logix SIS topology - controladores redundantes, DLR1/DLR2, switches Stratix, módulos de safety, drives PowerFlex e MCC",
    imageTitle: "Logix SIS: arquitetura de safety integrada ao controle",
    imageSource: logixSisSource,
    imageCaption: "Print público da Logix Redundancy Reference Architecture (Logix SIS Topologies): redundância plant-wide com controladores, anéis DLR, switches gerenciados, módulos safety, drives PowerFlex e IntelliCenter MCC. Intertravamentos críticos exigem essa fundação.",
    useCases: [
      "Permissivos e intertravamentos espalhados pela lógica, sem documentação central.",
      "Sequências de partida/parada de equipamento com passos informais e reinício difícil.",
      "Receitas e batelada que precisam de modelagem ISA-88 (estados, fases, equipamento).",
      "Áreas com classificação de safety (SIL/PLe) que precisam de controlador dedicado.",
    ],
    howIntegraActs: [
      "Mapeia permissivos, intertravamentos e estados de cada equipamento ou área.",
      "Organiza sequências por passo, condição de avanço, timeout, falha e recuperação.",
      "Separa explicitamente intertravamento operacional de SIF (safety) quando aplicável.",
      "Configura diagnósticos para operação e manutenção entenderem a causa do bloqueio.",
    ],
    deliverables: [
      "Matriz causa-efeito de permissivos e intertravamentos.",
      "Descritivo funcional de sequências e estados (modelado em ISA-88 quando aplicável).",
      "Lista de alarmes, mensagens e diagnósticos de operação.",
      "Plano de teste funcional com evidências de validação.",
      "Quando há SIF, separação documental e arquitetural entre BPCS e SIS.",
    ],
    standards: [
      { code: "ISA-88", description: "Modelagem de batelada e estados" },
      { code: "ISA-18.2", description: "Alarmes acionáveis" },
      { code: "IEC 61511", description: "Safety SIS / SIF" },
      { code: "ISA-84", description: "Safety Instrumented Functions" },
      { code: "FAT/SAT", description: "Validação funcional" },
    ],
    faq: [
      {
        q: "Por que documentar intertravamentos?",
        a: "Porque o intertravamento que ninguém entende vira risco de produção. Matriz causa-efeito documentada reduz dependência de memória individual, acelera diagnóstico e protege a planta de mudanças mal feitas.",
      },
      {
        q: "Quem documenta os intertravamentos do processo?",
        a: "A engenharia da Integra documenta a matriz causa-efeito, descritivos funcionais e narrativas de operação. O cliente valida com sua equipe de processo, sem essa validação, o intertravamento vira armadilha futura.",
      },
      {
        q: "Qual a diferença entre intertravamento operacional e safety SIL?",
        a: "Intertravamento operacional é proteção rotineira (impedir partida sem condição, parar equipamento em falha esperada). Safety SIL é Safety Instrumented Function classificada conforme IEC 61511, com independência funcional em relação ao BPCS (controlador safety certificado, dedicado ou integrado com tasks isoladas), proof tests periódicos e avaliação de segurança funcional com grau de independência crescente com o SIL. Os dois convivem na planta, com escopos e arquiteturas distintas.",
      },
      {
        q: "Sequenciamento de batelada cabe em ControlLogix puro ou exige FactoryTalk Batch?",
        a: "Cabe em ControlLogix com SFC/lógica estruturada para batelada simples e dedicada. Para receitas múltiplas, equipamento compartilhado, registro de batch e rastreabilidade ISA-88 completa, FactoryTalk Batch agrega valor estruturado.",
      },
      {
        q: "Posso ter BPCS e SIS no mesmo controlador?",
        a: "Tecnicamente sim em controladores com tasks separadas (GuardLogix integra controle e safety SIL3 com tasks isoladas e validadas). A decisão depende de análise de risco, classificação SIL alvo e exigências regulatórias do setor, não é apenas questão de hardware.",
      },
    ],
    relatedSolutions: plantpaxRelated,
    relatedTech: ["controle-regulatorio-pid", "controllogix-compactlogix", "factorytalk-batch"],
  },
  {
    slug: "factorytalk-view-se",
    group: "Supervisão e Operação",
    type: "Software",
    title: "FactoryTalk View SE",
    shortTitle: "FactoryTalk View SE",
    description:
      "SCADA distribuído para supervisão industrial crítica, com servidores HMI, data servers, redundância, alarmes e operação por área.",
    intro:
      "FactoryTalk View SE precisa ser projetado como sistema operacional de planta, não como conjunto de telas. A Integra estrutura servidores, áreas, navegação, alarmes, padrões visuais, acessos e integração com dados para que a operação tenha consistência.",
    image: viewSeReference,
    imageAlt: "Arquitetura FactoryTalk View SE Network Distributed Small",
    imageTitle: "Arquitetura distribuída FactoryTalk View SE",
    imageSource: viewSeSource,
    imageCaption:
      "Referência visual pública com arquitetura distribuída para explicar HMI Server, Data Server, clientes e serviços FactoryTalk.",
    useCases: [
      "Supervisão de áreas críticas com múltiplas estações de operação.",
      "Modernização de telas legadas sem governança visual.",
      "Padronização de navegação, alarmes, faceplates e telas por área.",
      "Integração com PlantPAx, Historian, AssetCentre, ThinManager e AD.",
    ],
    howIntegraActs: [
      "Define arquitetura Local, Network Station ou Distributed conforme criticidade.",
      "Cria style guide HMI, padrões de tela, navegação e estados operacionais.",
      "Racionaliza alarmes e organiza prioridades, filtros e mensagens acionáveis.",
      "Integra segurança, usuários, permissões e trilhas de auditoria.",
    ],
    deliverables: [
      "Arquitetura FactoryTalk View SE documentada.",
      "Padrão de telas e biblioteca visual de operação.",
      "Mapa de áreas, servidores, data servers, clientes e dependências.",
      "Governança de alarmes e eventos.",
      "Plano de backup, restauração e handover para manutenção.",
    ],
    standards: [
      { code: "FactoryTalk View SE", description: "SCADA distribuído" },
      { code: "ISA-101", description: "HMI de alta performance" },
      { code: "ISA-18.2", description: "Alarmes" },
      { code: "Active Directory", description: "Identidade industrial" },
    ],
    faq: [
      {
        q: "Quando View SE é melhor que uma HMI local?",
        a: "Quando há múltiplas áreas, usuários, redundância, historian, operação centralizada ou necessidade de governança. HMI local pode ser suficiente em sistemas menores.",
      },
      {
        q: "Dá para melhorar telas antigas sem refazer tudo?",
        a: "Sim. Muitas vezes começamos por padrão visual, navegação, alarmes e telas críticas, preservando partes estáveis do sistema atual.",
      },
      {
        q: "FactoryTalk View SE é o mesmo que FactoryTalk View ME?",
        a: "Não. ME (Machine Edition) é para PanelView e operação local de máquina. SE (Site Edition) é a plataforma SCADA distribuída para planta inteira, com servidores, clientes, alarmes governados e historian. SE é o que entra em projetos PlantPAx.",
      },
      {
        q: "Quantos clientes simultâneos View SE suporta por servidor?",
        a: "Depende do sizing, um servidor View SE Distributed dimensionado bem atende de 5 a 20 clientes em uso real. Acima disso, escalamos com servidores adicionais ou trocamos para arquitetura PlantPAx PASS.",
      },
      {
        q: "Posso ter View SE e View ME na mesma planta?",
        a: "Sim. View SE atende salas de controle e supervisão; View ME atende PanelViews em campo, com aplicação independente. A integração acontece via tags compartilhadas e comunicação CIP/EtherNet/IP.",
      },
      {
        q: "Como migro de View SE 10.x para 13.x sem parar a planta?",
        a: "Por etapas: instalamos versão nova em paralelo, importamos aplicação, validamos em homologação, ajustamos diferenças (gráficos, segurança, históricos) e fazemos cutover por servidor em janela planejada com plano de rollback.",
      },
    ],
    relatedSolutions: factorytalkRelated,
    relatedTech: ["factorytalk-optix", "thinmanager", "factorytalk-historian", "factorytalk-security"],
  },
  {
    slug: "factorytalk-optix",
    group: "Supervisão e Operação",
    type: "Software",
    title: "FactoryTalk Optix",
    shortTitle: "FactoryTalk Optix",
    description:
      "Plataforma moderna de visualização industrial, com arquitetura web, modelos de dados, interfaces flexíveis e integração com sistemas externos.",
    intro:
      "FactoryTalk Optix é útil quando o projeto pede visualização moderna, mobilidade controlada e integração mais aberta. A Integra avalia onde Optix faz sentido, como convive com View SE e quais limites de operação crítica precisam ser respeitados.",
    image: optixDesignDeployment,
    imageAlt: "FactoryTalk Optix Studio Standard vs Pro com Runtime, Hub e Remote Access Infrastructure",
    imageTitle: "Optix Studio Standard vs Pro: o desenho muda conforme o porte",
    imageSource: ftOptixRefSource,
    imageCaption:
      "Print público da Reference Architecture: Optix Standard atende projetos locais; Optix Pro habilita design em nuvem e deploy em frota via Remote Access. A escolha define infraestrutura, identidade e governança.",
    useCases: [
      "Dashboards operacionais e telas web para áreas específicas.",
      "Aplicações com integração de dados, web clients e visualização contextual.",
      "Complemento a View SE em projetos com interface moderna e acesso controlado.",
      "Separar operação crítica de visualização gerencial.",
    ],
    howIntegraActs: [
      "Define fronteira entre SCADA crítico, visualização web e dados corporativos.",
      "Modela telas, tags, permissões e comunicação com sistemas de controle.",
      "Valida performance, responsividade, segurança e operação em diferentes clientes.",
      "Documenta limites de uso para evitar que interface web vire atalho inseguro.",
    ],
    deliverables: [
      "Arquitetura de aplicação Optix e mapa de fontes de dados.",
      "Telas responsivas com navegação e estados padronizados.",
      "Modelo de usuários, permissões e publicação.",
      "Integração com dados industriais e serviços FactoryTalk quando aplicável.",
      "Plano de teste de acesso, performance e indisponibilidade.",
    ],
    standards: [
      { code: "FactoryTalk Optix", description: "Visualização moderna" },
      { code: "OPC UA", description: "Integração de dados" },
      { code: "IEC 62443", description: "Acesso e segmentação" },
      { code: "ISA-101", description: "Experiência de operação" },
    ],
    faq: [
      {
        q: "Optix e View SE podem coexistir na mesma arquitetura?",
        a: "Sim, e essa coexistência é muito comum. O View SE gerencia a operação de tempo real na sala de controle principal, enquanto o Optix atua publicando dashboards responsivos em HTML5 para visões móveis ou gerenciais na IDMZ.",
      },
      {
        q: "Pode acessar pelo celular?",
        a: "Tecnicamente pode, mas acesso móvel em OT precisa de política, autenticação, segmentação e limites claros para não criar risco operacional.",
      },
      {
        q: "Optix substitui View SE?",
        a: "Hoje, não. Optix é complementar, interface web moderna, mobilidade controlada, integração mais aberta. Para SCADA crítico de planta, View SE ou PlantPAx continuam padrão. A escolha depende do papel da aplicação na operação.",
      },
      {
        q: "Qual a diferença entre Optix Standard e Optix Pro?",
        a: "Standard executa runtime local em painel ou IPC; bom para máquinas e áreas isoladas. Pro habilita design em nuvem, deploy em frota e Remote Access, necessário quando há múltiplos sites ou OEMs gerenciando aplicações remotas.",
      },
      {
        q: "Optix exige cloud para funcionar?",
        a: "Não. Optix Standard roda 100% local. Optix Pro pode operar local com Remote Access ou via FactoryTalk Hub na nuvem; a operação online é opcional, dependendo da política de cibersegurança da planta.",
      },
      {
        q: "Posso versionar Optix em Git como código?",
        a: "Sim. Optix Pro suporta GitHub, GitLab, Bitbucket, Azure DevOps e Vault como provedores de versionamento. Isso muda a engenharia de SCADA, gestão de mudança real, branches, rollback e revisão por pares como em desenvolvimento de software.",
      },
    ],
    relatedSolutions: factorytalkRelated,
    relatedTech: ["factorytalk-view-se", "factorytalk-datamosaix", "thingworx-kepware"],
  },
  {
    slug: "factorytalk-batch",
    group: "Supervisão e Operação",
    type: "Software",
    title: "FactoryTalk Batch e ISA-88",
    shortTitle: "FactoryTalk Batch",
    description:
      "Controle e gestão de bateladas com receitas, áreas, células, unidades, fases, logs de execução e integração com sistemas de negócio.",
    intro:
      "FactoryTalk Batch organiza produção em bateladas com modelo ISA-88: receita, unidade, fase, equipamento, execução e registro. O ganho está em repetibilidade, rastreabilidade, redução de variação e capacidade de diagnosticar desvios de ciclo.",
    image: batchReference,
    imageAlt: "Diagrama de interação de operador em FactoryTalk Batch e PhaseManager",
    imageTitle: "FactoryTalk Batch, PhaseManager e interação de operador",
    imageSource: batchSource,
    imageCaption:
      "Referência visual pública sobre interação entre FactoryTalk Batch, PhaseManager e HMI. A Integra aplica o conceito com sanitização de escopo e documentação própria do projeto.",
    useCases: [
      "Processos por receita, campanha, fase, unidade e operação repetitiva.",
      "Necessidade de rastreabilidade de execução e diagnóstico de ciclo.",
      "Integração com MES, ERP ou SAP para ordens, receitas e dados de produção.",
      "Padronização de fases em ControlLogix PhaseManager e supervisão FactoryTalk.",
    ],
    howIntegraActs: [
      "Modela áreas, células, unidades, módulos de equipamento, fases e receitas.",
      "Define fronteira entre Batch Server, controladores, HMI, historian e sistemas corporativos.",
      "Configura logs, exceções, relatórios e pontos de integração sem expor operação crítica.",
      "Valida execução, retomada, abort, hold, restart e desvios operacionais.",
    ],
    deliverables: [
      "Modelo ISA-88 da área de batelada.",
      "Biblioteca de fases e módulos de equipamento.",
      "Estrutura de receitas, parâmetros e permissões.",
      "Logs de execução, eventos e critérios de rastreabilidade.",
      "Plano de teste de receitas, exceções e recuperação.",
    ],
    standards: [
      { code: "FactoryTalk Batch", description: "Execução de bateladas" },
      { code: "ISA-88", description: "Modelo de batelada" },
      { code: "PhaseManager", description: "Fases em ControlLogix" },
      { code: "MES/ERP", description: "Integração de ordens" },
    ],
    faq: [
      {
        q: "Batch é só para indústria farmacêutica?",
        a: "Não. Qualquer processo com receita, etapa, parâmetro e necessidade de repetibilidade pode se beneficiar, desde que o modelo seja bem desenhado.",
      },
      {
        q: "Dá para começar sem integrar MES?",
        a: "Sim. Muitas arquiteturas começam com execução e rastreabilidade local e evoluem para integração corporativa quando os dados já estão confiáveis.",
      },
      {
        q: "FactoryTalk Batch é obrigatório para batelada em PlantPAx?",
        a: "Não, mas é o caminho recomendado quando há receitas múltiplas, equipamento compartilhado, rastreabilidade lote a lote e exigência ISA-88. Para batelada simples e dedicada, ControlLogix com SFC pode bastar.",
      },
      {
        q: "Como Batch se integra com Historian e MES?",
        a: "Cada batch gera eventos, parâmetros e contextualização que vão ao Historian (PI ou FactoryTalk Historian). MES recebe os batch records via OPC UA, ODBC ou API, fechando rastreabilidade do produto até o lote produzido.",
      },
      {
        q: "Quanto tempo leva implantar Batch numa planta nova?",
        a: "Depende do número de receitas, do compartilhamento de equipamento e do nível de rastreabilidade exigido. Plantas com receitas dinâmicas e equipamento compartilhado exigem mais modelagem ISA-88. O cronograma específico vem após o diagnóstico.",
      },
      {
        q: "Batch substitui o ERP no controle de receita?",
        a: "Não. Batch executa receitas no chão de fábrica; ERP define formulação, custo e ordem de produção. A integração ERP→Batch leva o que produzir e quando; Batch retorna o que foi efetivamente feito, com evidências.",
      },
    ],
    relatedSolutions: factorytalkRelated,
    relatedTech: ["plantpax-5x", "controllogix-compactlogix", "factorytalk-historian"],
  },
  {
    slug: "thinmanager",
    group: "Supervisão e Operação",
    type: "Software",
    title: "ThinManager",
    shortTitle: "ThinManager",
    description:
      "Gestão centralizada de thin clients industriais, sessões, acesso por função, mobilidade controlada e padronização de estações de operação.",
    intro:
      "ThinManager reduz dependência de PCs industriais espalhados pela planta. A operação acessa sessões e aplicações de forma controlada, com perfis, localização, redundância e manutenção centralizada.",
    image: factorytalkServicesPlatform,
    imageAlt: "Funcionalidades do FactoryTalk Services Platform - Directory, Network Service, Live Data, Audit, RNA",
    imageTitle: "FactoryTalk Services Platform: a base que ThinManager autentica",
    imageSource: ftServicesRefSource,
    imageCaption: "Print público da Reference Architecture FTSP: ThinManager se apoia no FactoryTalk Directory para autenticação e auditoria centralizadas - é o que permite ter perfil de usuário voando entre clientes.",
    useCases: [
      "Substituição de PCs industriais por thin clients gerenciados.",
      "Operação por perfil, localização, linha, sala ou credencial.",
      "Redução de manutenção local em estações de operação.",
      "Ambientes com múltiplas aplicações FactoryTalk, acesso remoto controlado ou redundância.",
    ],
    howIntegraActs: [
      "Define arquitetura de servidores, sessões, perfis e aplicações publicadas.",
      "Configura acesso por usuário, estação, área e regra operacional.",
      "Documenta política de substituição, recuperação e manutenção de terminais.",
      "Testa failover, perda de rede, reinício e comportamento de reconexão.",
    ],
    deliverables: [
      "Mapa de estações, perfis e aplicações publicadas.",
      "Configuração ThinManager documentada.",
      "Política de acesso e rastreabilidade de sessão.",
      "Procedimento de troca rápida de terminal.",
      "Plano de teste de disponibilidade e reconexão.",
    ],
    standards: [
      { code: "ThinManager", description: "Thin clients industriais" },
      { code: "FactoryTalk", description: "Aplicações publicadas" },
      { code: "Active Directory", description: "Usuários e grupos" },
      { code: "IEC 62443", description: "Acesso controlado" },
    ],
    faq: [
      {
        q: "ThinManager melhora segurança?",
        a: "Melhora quando vem com perfis, autenticação, segmentação e política de sessão. Sozinho, ele não substitui arquitetura de segurança OT.",
      },
      {
        q: "Precisa trocar todas as estações de uma vez?",
        a: "Não. É comum migrar por área, começando por salas de controle ou postos com maior custo de manutenção.",
      },
      {
        q: "ThinManager é compatível com qualquer marca de thin client?",
        a: "Sim, desde que o terminal suporte PXE boot. A recomendação Rockwell é hardware ThinManager Ready, com firmware de fábrica (linha Allen-Bradley ASEM 6300, OnLogic, Advantech, Arista); thin clients genéricos de TI, como Dell Wyse e IGEL, entram como ThinManager Compatible via PXE, com validação caso a caso. Compatibilidade com clientes genéricos exige homologação caso a caso e pode quebrar em update de firmware.",
      },
      {
        q: "Posso usar ThinManager sem virtualização?",
        a: "Em arquiteturas grandes não faz sentido, o ganho de ThinManager está em centralizar imagens, perfis de usuário e failover de sessão sobre VMware/Hyper-V. Em planta pequena, é overkill se só houver 2-3 estações.",
      },
      {
        q: "Como ThinManager entrega failover de sessão?",
        a: "Cada thin client busca a próxima sessão num servidor RDS conforme regra de prioridade configurada. Se um servidor cai, a sessão é restabelecida no próximo automaticamente, mantendo aplicação View SE/PlantPAx ativa para operação.",
      },
      {
        q: "ThinManager exige Active Directory?",
        a: "Funciona com AD ou com base local própria, mas em planta industrial o AD com OU dedicada à OT é o padrão recomendado, facilita gestão de acesso, MFA, expiração e auditoria.",
      },
    ],
    relatedSolutions: factorytalkRelated,
    relatedTech: ["factorytalk-view-se", "virtualizacao-ot", "active-directory-ot"],
  },
  {
    slug: "factorytalk-assetcentre",
    group: "Supervisão e Operação",
    type: "Software",
    title: "FactoryTalk AssetCentre",
    shortTitle: "AssetCentre",
    description:
      "Gestão de ativos de automação, versionamento de projetos, auditoria de alterações, backup programado e controle de acesso técnico.",
    intro:
      "FactoryTalk AssetCentre ajuda a transformar manutenção OT em processo controlado. Projetos, versões, alterações, backups e acessos deixam de depender de pastas soltas e memória individual.",
    image: securityReference,
    imageAlt: "Arquitetura FactoryTalk Security com diretório e clientes",
    imageTitle: "Gestão de ativos depende de identidade e auditoria",
    imageSource: securitySource,
    imageCaption:
      "Referência visual pública FactoryTalk Security. AssetCentre se apoia em identidade, permissões e trilhas de mudança para governança de ativos.",
    useCases: [
      "Backup automático de projetos PLC, HMI e dispositivos compatíveis.",
      "Auditoria de quem alterou, quando alterou e onde alterou.",
      "Controle de acesso a ambientes de engenharia e aplicações FactoryTalk.",
      "Governança de mudanças em plantas com múltiplos mantenedores.",
    ],
    howIntegraActs: [
      "Mapeia ativos, projetos, dispositivos, usuários e permissões.",
      "Configura rotinas de backup, comparação, auditoria e relatórios.",
      "Integra usuários e grupos com AD ou política FactoryTalk existente.",
      "Documenta fluxo de mudança, aprovação e restauração.",
    ],
    deliverables: [
      "Inventário de ativos gerenciados.",
      "Rotinas de backup e comparação configuradas.",
      "Modelo de usuários, grupos e permissões.",
      "Relatórios de auditoria e procedimento de investigação.",
      "Procedimento de restauração e validação de projeto.",
    ],
    standards: [
      { code: "AssetCentre", description: "Gestão de ativos" },
      { code: "FactoryTalk Security", description: "Controle de acesso" },
      { code: "IEC 62443", description: "Gestão de mudanças" },
      { code: "Backup", description: "Recuperação validada" },
    ],
    faq: [
      {
        q: "AssetCentre substitui documentação?",
        a: "Não. Ele melhora versionamento e auditoria, mas ainda precisa de procedimento, owners e critérios de mudança documentados.",
      },
      {
        q: "Funciona em planta existente?",
        a: "Sim, mas exige inventário cuidadoso e saneamento de projetos, caminhos, permissões e versões antes de automatizar rotinas.",
      },
      {
        q: "AssetCentre substitui sistema de versionamento Git?",
        a: "Não. AssetCentre é especializado em ativos industriais (PLCs, HMIs, drives, switches), backup automatizado, comparação de programas, log de mudanças. É complemento técnico ao Git, que normalmente é usado para texto/IaC.",
      },
      {
        q: "Quais marcas AssetCentre cobre além de Rockwell?",
        a: "Roteia bem em ambientes Rockwell (Logix, FactoryTalk, drives PowerFlex). Para multi-vendor (Siemens, Schneider), há integração parcial via plugins, mas a profundidade fica nos ativos Rockwell.",
      },
      {
        q: "AssetCentre faz patch management automático?",
        a: "Não automatiza patch de SO; faz inventário, log de versão e comparação. Patch management de Windows fica com WSUS/SCCM; AssetCentre cuida da camada de aplicação industrial.",
      },
      {
        q: "Como o AssetCentre ajuda em auditoria IEC 62443?",
        a: "Gera trilha de auditoria de mudança em ativos OT, log de acesso e backup periódico, três controles que IEC 62443-2-4 exige documentar. Não substitui a auditoria, mas alimenta evidência.",
      },
    ],
    relatedSolutions: factorytalkRelated,
    relatedTech: ["backup-recuperacao-desastres", "factorytalk-security", "active-directory-ot"],
  },
  {
    slug: "factorytalk-historian",
    group: "Dados Industriais e IIoT",
    type: "Software",
    title: "FactoryTalk Historian",
    shortTitle: "FactoryTalk Historian",
    description:
      "Historiador industrial para coleta, compressão, retenção e consulta de dados de processo com integração ao ecossistema FactoryTalk.",
    intro:
      "Historian é infraestrutura de dados. Sem tag list bem definida, compressão correta, qualidade de dado e responsável técnico, a planta acumula pontos, mas não ganha inteligência. A Integra estrutura historian para operação, manutenção e evolução analítica.",
    image: factorytalkHistorianClientsV2,
    imageAlt: "FactoryTalk Historian SE - Information Presentation com VantagePoint, Vision, View SE, DataLink, PI Excel Add-in e Historian Tools",
    imageTitle: "Historian como infraestrutura: clientes, fontes e camadas",
    imageSource: ftHistorianRefSource,
    imageCaption: "Print público da Reference Architecture FT Historian SE: o servidor central recebe de PLC, FactoryTalk Live Data e fontes externas, e expõe via VantagePoint, Vision, DataLink e PI add-in.",
    useCases: [
      "Coleta de tags de processo, utilidades, alarmes, energia e equipamentos.",
      "Retenção histórica para diagnóstico, qualidade, produção e melhoria contínua.",
      "Base para dashboards, análises e integração com sistemas corporativos.",
      "Modernização de dados espalhados em SCADA, planilhas e bancos locais.",
    ],
    howIntegraActs: [
      "Dimensiona tags, amostragem, exceção, compressão, retenção e disponibilidade.",
      "Organiza nomenclatura, unidades, qualidade e responsabilidade técnica por tag.",
      "Integra fontes via FactoryTalk, OPC UA, interfaces e gateways quando aplicável.",
      "Valida consulta, performance, backup e recuperação.",
    ],
    deliverables: [
      "Inventário e classificação de tags.",
      "Estratégia de compressão, exceção e retenção.",
      "Arquitetura Historian e mapa de interfaces.",
      "Padrão de qualidade de dado e naming convention.",
      "Procedimentos de backup, restore e expansão.",
    ],
    standards: [
      { code: "Historian", description: "Dados históricos" },
      { code: "OPC UA", description: "Integração industrial" },
      { code: "ISA-95", description: "Contexto operacional" },
      { code: "PlantPAx", description: "Tags de processo" },
    ],
    faq: [
      {
        q: "Quantas tags devo historiar?",
        a: "Depende de objetivo, criticidade, taxa de mudança e uso futuro. Historiar tudo sem critério gera custo, ruído e dificuldade de manutenção.",
      },
      {
        q: "Historian é a mesma coisa que dashboard?",
        a: "Não. Historian coleta e preserva dados confiáveis. Dashboard é uma camada de uso. Sem historian bem definido, o dashboard fica frágil.",
      },
      {
        q: "FactoryTalk Historian é o mesmo que PI System?",
        a: "Não exatamente. O Historian SE é uma versão OEM (private label) do PI Server da OSIsoft/AVEVA: acompanha os releases do PI Server e usa os mesmos componentes (compressão swinging-door, PI DataLink), não evolui em separado. PI System / AVEVA tem foco em volume massivo de tags, AF Templates ricos e analytics multi-site. Para planta padrão Rockwell, Historian SE atende a maior parte dos cenários, a escolha depende do escopo.",
      },
      {
        q: "Quantas tags Historian SE suporta?",
        a: "A capacidade depende do hardware, da cadência de coleta e da arquitetura (servidor único, Site Tier ou Plant Tier). Volumes muito grandes ou ambientes multi-site frequentemente justificam migração para PI System / AVEVA. A matriz oficial Rockwell é referência para sizing.",
      },
      {
        q: "Posso ler Historian de fora da planta com segurança?",
        a: "Sim, via FactoryTalk View SE Reports, FactoryTalk Optix dashboard ou OPC UA Connector, tudo passando por IDMZ, autenticação forte e sem caminho direto enterprise→Historian.",
      },
      {
        q: "Quanto disco Historian consome por mês?",
        a: "Depende da quantidade de tags, da cadência de coleta, da política de compressão (swinging-door reduz volume sem perda significativa de fidelidade) e da retenção desejada. O dimensionamento é parte do projeto.",
      },
    ],
    relatedSolutions: dataRelated,
    relatedTech: ["factorytalk-datamosaix", "thingworx-kepware", "plantpax-5x"],
  },
  {
    slug: "thingworx-kepware",
    group: "Dados Industriais e IIoT",
    type: "Software",
    title: "ThingWorx e Kepware",
    shortTitle: "ThingWorx / Kepware",
    description:
      "Integração IIoT, conectividade multi-protocolo, modelos de ativos, mashups e exposição controlada de dados industriais.",
    intro:
      "ThingWorx e Kepware ajudam a conectar equipamentos, protocolos e aplicações de informação sem transformar a rede OT em uma coleção de atalhos. A Integra desenha conectividade, modelo de dados e segurança antes de publicar qualquer tela.",
    image: factorytalkAnalyticsLogixai,
    imageAlt: "Fluxo de dados Industrial Computer com FactoryTalk Analytics LogixAI conectando OT, Edge e Cloud",
    imageTitle: "Plataformas IIoT como ThingWorx vivem na fronteira OT-Edge-Cloud",
    imageSource: ftAnalyticsSource,
    imageCaption: "Print público de fluxo OT, Edge e Cloud: o mesmo padrão se aplica a ThingWorx, Kepware e equivalentes.",
    useCases: [
      "Coleta multi-protocolo com Kepware em equipamentos e sistemas heterogêneos.",
      "Modelagem de ativos, serviços e mashups no ThingWorx.",
      "Integração de dados industriais com aplicações corporativas ou cloud.",
      "Publicação controlada de indicadores sem acesso direto ao controle.",
    ],
    howIntegraActs: [
      "Define fontes, protocolos, tags, modelos e owners técnicos.",
      "Segmenta tráfego e posiciona gateways na zona correta da arquitetura.",
      "Configura conectividade, autenticação, logs e limites de exposição de dados.",
      "Valida qualidade, latência, disponibilidade e comportamento em falha.",
    ],
    deliverables: [
      "Mapa de fontes e protocolos industriais.",
      "Modelo de ativos, serviços e tags publicadas.",
      "Arquitetura de gateway e integração com zona OT/IDMZ.",
      "Dashboards ou mashups técnicos quando aplicável.",
      "Documentação de segurança, usuários e manutenção.",
    ],
    standards: [
      { code: "Kepware", description: "Conectividade industrial" },
      { code: "ThingWorx", description: "IIoT e mashups" },
      { code: "OPC UA", description: "Comunicação segura" },
      { code: "IEC 62443", description: "Zonas e conduítes" },
    ],
    faq: [
      {
        q: "Kepware resolve integração com qualquer equipamento?",
        a: "Ele amplia muito a conectividade, mas cada protocolo precisa de validação de tags, taxa de leitura, qualidade e impacto na rede.",
      },
      {
        q: "IIoT exige nuvem?",
        a: "Não necessariamente. Pode haver arquitetura local, edge, híbrida ou cloud. A decisão depende de segurança, latência, governança e uso do dado.",
      },
      {
        q: "ThingWorx é o mesmo que MES?",
        a: "Não. ThingWorx é uma plataforma IIoT (modelagem, conectividade, mashup, analytics, fluxo de dados). MES é uma camada acima focada em produção, OEE, rastreabilidade e gestão de ordens. ThingWorx pode ser blocos de construção para MES customizado, mas não é MES pronto.",
      },
      {
        q: "Por que precisar de Kepware se Rockwell já tem OPC UA?",
        a: "Kepware abrange mais de 150 drivers, multi-vendor (Siemens, Schneider, ABB, Yokogawa, Mitsubishi) e protocolos fora do ecossistema Rockwell (Modbus serial, DNP3, IEC 61850, SNMP). Em planta multi-marca, Kepware é a ponte que evita gateway específico por equipamento.",
      },
      {
        q: "Kepware exige licença por tag ou por servidor?",
        a: "Modelo é por servidor + drivers (avulsos ou em suítes) + plug-ins. A unidade de licença é o driver: tags, canais e devices não são licenciados (têm apenas limites técnicos que variam por driver). O cálculo depende do mix de marcas e protocolos da planta. O cálculo de licença depende do mix de marcas e do volume de canais.",
      },
      {
        q: "ThingWorx roda on-premises ou só nuvem?",
        a: "Suporta os dois. ThingWorx Foundation pode ser instalado on-prem em servidor industrial; ThingWorx pode ser SaaS via PTC. A escolha depende de política de dados, latência e cibersegurança da planta.",
      },
    ],
    relatedSolutions: dataRelated,
    relatedTech: ["edge-computing-industrial", "factorytalk-datamosaix", "protocolos-industriais"],
  },
  {
    slug: "factorytalk-datamosaix",
    group: "Dados Industriais e IIoT",
    type: "Software",
    title: "FactoryTalk DataMosaix",
    shortTitle: "DataMosaix",
    description:
      "Contextualização e governança de dados industriais em arquitetura moderna, conectando dados OT a aplicações analíticas e corporativas.",
    intro:
      "DataMosaix entra quando a empresa quer tratar dados industriais como produto governado, com contexto, qualidade e integração. A Integra posiciona essa camada sem comprometer a segurança da planta, conectando operação, historian, edge e sistemas corporativos.",
    image: datamosaixReference,
    imageAlt: "Fluxo de dados em arquitetura FactoryTalk DataMosaix",
    imageTitle: "DataMosaix como camada de contexto e governança de dados",
    imageSource: dataMosaixSource,
    imageCaption:
      "Referência visual pública com fluxo DataMosaix. O uso no site é conceitual e não representa arquitetura de cliente.",
    useCases: [
      "Contextualização de dados de historian, SCADA, produção e ativos.",
      "Governança de dados industriais para analytics, energia, manutenção e qualidade.",
      "Integração com arquiteturas CPwE, edge e aplicações corporativas.",
      "Preparação de dados para relatórios e modelos sem perder rastreabilidade.",
    ],
    howIntegraActs: [
      "Define fronteira OT/IT, fontes confiáveis, modelos e responsabilidades.",
      "Mapeia dados de controle, historian, eventos, ativos e sistemas externos.",
      "Valida fluxo de dados, segurança, qualidade, latência e retenção.",
      "Documenta arquitetura para evolução sem acoplamento perigoso com a planta.",
    ],
    deliverables: [
      "Mapa de dados industriais e fontes confiáveis.",
      "Modelo de contexto por ativos, áreas e eventos.",
      "Arquitetura de integração com edge, historian e sistemas corporativos.",
      "Critérios de qualidade, retenção e responsabilidade do dado.",
      "Roadmap de analytics com base técnica governada.",
    ],
    standards: [
      { code: "DataMosaix", description: "Contexto de dados" },
      { code: "ISA-95", description: "Integração empresa-controle" },
      { code: "CPwE", description: "Arquitetura OT/IT" },
      { code: "IEC 62443", description: "Segurança por zona" },
    ],
    faq: [
      {
        q: "Qual a diferença conceitual entre DataMosaix e Historian?",
        a: "Historian tem foco na coleta massiva e preservação de séries temporais cruas em alta fidelidade no chão de fábrica. O DataMosaix entra um nível acima, estruturando o contexto desses dados (transformando tags cruas em ativos alinhados ao modelo ISA-95), governando o acesso e servindo como hub para ferramentas IIoT e nuvem.",
      },
      {
        q: "Precisa estar tudo padronizado antes?",
        a: "Não, mas quanto melhor a base de tags, ativos e fontes, mais valor a camada de dados entrega. Normalmente fazemos saneamento gradual.",
      },
      {
        q: "DataMosaix pode substituir completamente o Historian local?",
        a: "Em algumas arquiteturas sim, em outras coexistem. DataMosaix é SaaS com armazenamento contextualizado, AF-like; Historian SE é on-prem. Para plantas que querem dados em nuvem com governança, DataMosaix é o caminho; para a operação de tempo real crítica da planta, ainda há enorme valor em manter o Historian local.",
      },
      {
        q: "DataMosaix integra com Power BI / Grafana?",
        a: "Sim, via REST API e conectores oficiais. A modelagem contextualizada do DataMosaix vai bem com camada de visualização externa, sem precisar replicar o modelo em cada ferramenta.",
      },
      {
        q: "Há risco de aprisionamento (vendor lock-in) com DataMosaix?",
        a: "Sim, como em qualquer SaaS de dados industriais. Mitigamos com saídas estruturadas (REST, OPC UA), backup periódico de modelo e exportação de dados crus para que migração seja viável caso necessário.",
      },
      {
        q: "Quanto custa DataMosaix?",
        a: "Modelo de assinatura por volume de dados, número de fontes e usuários. Não publicamos valores, é avaliado por proposta. O ROI vem da redução de servidor, governança de dados e habilitação de analytics em escala.",
      },
    ],
    relatedSolutions: dataRelated,
    relatedTech: ["factorytalk-historian", "edge-computing-industrial", "ethernet-ip-cpwe"],
  },
  {
    slug: "edge-computing-industrial",
    group: "Dados Industriais e IIoT",
    type: "Tecnologia",
    title: "Edge Computing Industrial",
    shortTitle: "Edge Industrial",
    description:
      "Gateways industriais, processamento local, buffer, coleta e publicação segura de dados entre OT, IDMZ e aplicações de informação.",
    intro:
      "Edge computing em planta industrial não é colocar um computador qualquer perto da máquina. É posicionar gateways, processamento, buffer e segurança no lugar certo, com critérios de disponibilidade e manutenção compatíveis com a operação.",
    image: ftAnalyticsLogixaiPurdueClean,
    imageAlt: "FactoryTalk Analytics LogixAI rodando em Industrial Computer com camadas Purdue OT (L0-3) + IDMZ + IT (L4-5) + Edge + Cloud",
    imageTitle: "Edge industrial atravessa Purdue: do controlador à nuvem",
    imageSource: ftAnalyticsRefSource,
    imageCaption: "Print público da Reference Architecture LogixAI: Industrial Computer hospeda o analytics no nível 3, conectado por EtherNet/IP no chão e por Edge/Cloud no topo - desenho típico de edge industrial.",
    theme: "ot",
    useCases: [
      "Coleta local com buffer para evitar perda de dados em falhas de comunicação.",
      "Pré-processamento de tags, eventos e indicadores antes de enviar para camada superior.",
      "Integração com FactoryTalk Edge Gateway, Kepware, ThingWorx ou DataMosaix.",
      "Separação entre controle crítico e aplicações de dados.",
    ],
    howIntegraActs: [
      "Define onde o gateway fica: célula, área, IDMZ ou camada de informação.",
      "Configura protocolos, tags, filtros, buffer, autenticação e logs.",
      "Valida perda de conexão, retomada, latência e comportamento em indisponibilidade.",
      "Documenta manutenção, atualização e responsabilidade do edge.",
    ],
    deliverables: [
      "Arquitetura de gateway e fluxos de dados.",
      "Lista de tags/eventos publicados e critérios de qualidade.",
      "Configuração de buffer, autenticação e segurança.",
      "Plano de teste de falha de comunicação e recuperação.",
      "Procedimento de backup e atualização do gateway.",
    ],
    standards: [
      { code: "Edge Gateway", description: "Publicação local" },
      { code: "OPC UA", description: "Integração segura" },
      { code: "IEC 62443", description: "Zonas e conduítes" },
      { code: "MQTT", description: "Mensageria quando aplicável" },
    ],
    faq: [
      {
        q: "Edge substitui PLC?",
        a: "Não. Controle crítico continua no controlador. Edge processa, contextualiza ou encaminha dados sem assumir funções de segurança ou controle determinístico.",
      },
      {
        q: "Posso enviar dados direto da rede de controle para a nuvem?",
        a: "Tecnicamente é possível, mas raramente é a arquitetura correta. Normalmente usamos zonas intermediárias, autenticação e publicação controlada.",
      },
      {
        q: "Edge computing industrial é o mesmo que IoT?",
        a: "Edge é uma camada arquitetural, processamento próximo do dado (PLC, gateway, IPC industrial). IoT é a categoria geral. Toda IIoT bem feita usa edge para reduzir latência, banda e dependência de cloud para operação crítica.",
      },
      {
        q: "Quando vale a pena trazer compute para a borda?",
        a: "Quando há latência crítica (reação <100ms), banda limitada (rural, planta isolada), volume de dados alto (visão, áudio, vibração) ou requisito de operação offline. Senão, processar central simplifica.",
      },
      {
        q: "Edge industrial precisa de hardening?",
        a: "Sim. Cada gateway/IPC industrial é uma superfície de ataque adicional, precisa de hardening (sem porta USB ativa, sem credenciais default, firmware atualizado, log centralizado, comunicação criptografada).",
      },
      {
        q: "Quais plataformas vocês trabalham para edge industrial?",
        a: "FactoryTalk Edge Manager (Rockwell), TC deviceWISE (Telit), ThingWorx Edge MicroServer (PTC), gateways Cisco IE/IR e IPCs industriais Beckhoff e Siemens. A escolha depende do ecossistema da planta.",
      },
    ],
    relatedSolutions: dataRelated,
    relatedTech: ["thingworx-kepware", "factorytalk-datamosaix", "iec-62443-nist-ot"],
  },
  {
    slug: "data-centers-industriais",
    group: "Infraestrutura OT",
    type: "Tecnologia",
    title: "Data Centers Industriais",
    shortTitle: "Data Centers OT",
    description:
      "Infraestrutura para servidores HMI, historian, Batch, AssetCentre, domínio industrial, thin clients e aplicações críticas de automação.",
    intro:
      "O data center industrial sustenta a operação 24/7. Ele precisa respeitar restrições de versão, licenciamento, latência, backup, recuperação e janelas de manutenção de OT. A Integra projeta essa infraestrutura como parte da engenharia de automação.",
    image: controllogixPrpNonConverged,
    imageAlt: "Arquitetura PRP não-convergente com VMware ESXi e racks de controle redundantes",
    imageTitle: "Arquitetura redundante com virtualização e PRP, referência de Industrial Data Center",
    imageSource: controllogixHaSource,
    imageCaption: "Print público mostrando como um Industrial Data Center se conecta com a planta sob arquitetura redundante.",
    useCases: [
      "Consolidação de servidores FactoryTalk, historian, AssetCentre e engenharia.",
      "Ambientes com alta disponibilidade, backup, restore e dependências críticas.",
      "Separação entre domínio industrial, TI corporativa e acesso remoto.",
      "Padronização de servidores, licenças, owners e ciclo de vida.",
    ],
    howIntegraActs: [
      "Levantamento de aplicações, versões, requisitos, dependências e criticidade.",
      "Desenho de hosts, storage, rede, backup, domínio, usuários e políticas.",
      "Validação de compatibilidade com FactoryTalk, Windows, licenças e drivers.",
      "Documentação de operação, manutenção, restauração e expansão.",
    ],
    deliverables: [
      "Arquitetura IDC/OT com servidores, rede, storage e aplicações.",
      "Matriz de dependências e criticidade por serviço.",
      "Plano de backup, restore, snapshots e disaster recovery.",
      "Política de acesso, usuários e documentação de credenciais.",
      "As-built de infraestrutura e handover para sustentação.",
    ],
    standards: [
      { code: "IDC OT", description: "Infraestrutura industrial" },
      { code: "IEC 62443", description: "Zonas e acesso" },
      { code: "Backup/DR", description: "Recuperação validada" },
      { code: "FactoryTalk", description: "Serviços críticos" },
    ],
    faq: [
      {
        q: "Servidor industrial é responsabilidade de TI ou automação?",
        a: "Dos dois, com fronteiras claras. A Integra ajuda a traduzir requisitos OT para infraestrutura que TI consegue sustentar sem quebrar operação.",
      },
      {
        q: "IDC industrial precisa ser grande?",
        a: "Não. Pode ser enxuto, desde que tenha arquitetura, backup, disponibilidade e documentação proporcionais à criticidade da planta.",
      },
      {
        q: "Por que não usar o data center corporativo para servir a OT?",
        a: "Latência, política de patch, janela de manutenção e governança IT/OT são incompatíveis. Aplicação industrial não pode reiniciar quando IT decidir; precisa de servidor dedicado, com regras de mudança alinhadas a parada de processo.",
      },
      {
        q: "Qual o RTO/RPO típico de um data center industrial?",
        a: "Depende da criticidade da planta. Para operação 24/7, RTO de 30 min a 4h é o alvo (com cluster ativo-passivo); RPO próximo de zero exige replicação síncrona. Plantas com janela de parada toleram RTO maior.",
      },
      {
        q: "Posso virtualizar HMI e SCADA sem perder performance?",
        a: "Sim, com sizing correto. VMware ESXi ou Hyper-V suportam aplicações FactoryTalk com performance equivalente a hardware bare-metal, desde que CPU, memória e I/O de disco sejam dimensionados conforme guia Rockwell.",
      },
      {
        q: "Como dimensionar um IDC industrial pequeno?",
        a: "O dimensionamento começa pela contagem de aplicações OT, requisitos de RTO/RPO, redundância desejada e crescimento previsto. Cada projeto recebe proposta específica após o diagnóstico, não publicamos faixas de investimento.",
      },
    ],
    relatedSolutions: infraRelated,
    relatedTech: ["virtualizacao-ot", "backup-recuperacao-desastres", "active-directory-ot"],
  },
  {
    slug: "virtualizacao-ot",
    group: "Infraestrutura OT",
    type: "Tecnologia",
    title: "Virtualização OT",
    shortTitle: "Virtualização OT",
    description:
      "Ambientes virtualizados para aplicações industriais críticas usando VMware, Hyper-V ou Nutanix AHV quando aplicável.",
    intro:
      "Virtualizar OT traz flexibilidade, snapshots, recuperação e melhor uso de hardware. Mas também cria dependências novas: storage, host, rede, licenças, compatibilidade de software industrial e disciplina de mudança.",
    image: controllogixPrpDetail,
    imageAlt: "PRP Non-Converged - dois pares de switches independentes (LAN A e LAN B) sustentam fault tolerance multi-LAN com BoxRedBox",
    imageTitle: "Virtualização OT vive em rede PRP: dois caminhos físicos, um sistema lógico",
    imageSource: controllogixHaRefSource,
    imageCaption: "Print público da Reference Architecture: virtualização OT precisa enxergar a rede física redundante por baixo - sem PRP/DLR consistente, hipervisor vira ponto único de falha.",
    useCases: [
      "Virtualização de servidores HMI, Data Server, Historian, Batch, AssetCentre e engenharia.",
      "Alta disponibilidade com hosts, storage e redes redundantes.",
      "Snapshots e rollback controlados para mudanças planejadas.",
      "Migração de servidores físicos antigos para plataforma sustentável.",
    ],
    howIntegraActs: [
      "Valida compatibilidade de versões FactoryTalk, drivers, Windows e licenças.",
      "Dimensiona CPU, memória, disco, IOPS, rede e crescimento.",
      "Define estratégia de snapshots, backup, replicação e failover.",
      "Testa performance, recuperação e janelas de manutenção.",
    ],
    deliverables: [
      "Sizing de VMs e hosts.",
      "Arquitetura de cluster, storage e rede OT.",
      "Plano de snapshots, backups e rollback.",
      "Matriz de compatibilidade de aplicações industriais.",
      "Procedimentos de operação e manutenção da plataforma.",
    ],
    standards: [
      { code: "VMware", description: "Virtualização" },
      { code: "Hyper-V", description: "Virtualização" },
      { code: "Nutanix AHV", description: "Virtualização" },
      { code: "HA", description: "Alta disponibilidade" },
    ],
    faq: [
      {
        q: "Snapshot substitui backup?",
        a: "Não. Snapshot ajuda rollback de curto prazo, mas backup e restore testado continuam obrigatórios para recuperação real.",
      },
      {
        q: "Toda aplicação FactoryTalk pode ser virtualizada?",
        a: "Muitas podem, mas cada versão e dependência precisa de validação. Licenciamento, drivers e requisitos de performance não podem ser assumidos.",
      },
      {
        q: "VMware ou Hyper-V para virtualização OT?",
        a: "Os dois funcionam. VMware é mais maduro em ambientes Rockwell (tradicional). Hyper-V cresce em plantas Microsoft-centric. Critério principal: equipe de TI confortável + suporte Rockwell explícito para a versão escolhida.",
      },
      {
        q: "Posso virtualizar controlador (SoftLogix)?",
        a: "SoftLogix existe e roda em VM, mas não recomendamos para controle crítico, tempo de scan e jitter de hipervisor não atendem requisitos de muitos processos. Para controle, ControlLogix físico continua padrão.",
      },
      {
        q: "Snapshot de VM substitui backup?",
        a: "Não. Snapshot ajuda em rollback de mudança (15-30 min), mas não substitui backup full e exportação de configuração de cada aplicação industrial. Snapshot + backup + restore testado é o trio mínimo.",
      },
      {
        q: "Como atualizar VMs FactoryTalk sem parar a planta?",
        a: "Cluster ativo-passivo com vMotion ou Live Migration permite mover VM entre hosts sem downtime. Para upgrade da própria aplicação, normalmente é janela planejada, atualizar SO/aplicação em VM espelho, validar, cutover.",
      },
    ],
    relatedSolutions: infraRelated,
    relatedTech: ["migracao-vms", "backup-recuperacao-desastres", "thinmanager"],
  },
  {
    slug: "migracao-vms",
    group: "Infraestrutura OT",
    type: "Serviço",
    title: "Migração de VMs Industriais",
    shortTitle: "Migração de VMs",
    description:
      "Migração controlada de máquinas virtuais industriais, com compatibilidade, backup, rollback, janela mínima e validação funcional.",
    intro:
      "Migrar VMs de OT sem entender dependências pode derrubar HMI, historian, licenças ou comunicação com controladores. A Integra conduz a migração com inventário, validação, backup, janela planejada e teste funcional pós-mudança.",
    image: controllogixRedundancyDecision,
    imageAlt: "Decisão de redundância: REP, OLR ou PRP em função de fault tolerance e tempo de recuperação",
    imageTitle: "Migração de VMs requer revisar redundância e fault tolerance",
    imageSource: controllogixHaSource,
    imageCaption: "Antes de migrar VMs, revisamos os critérios de fault tolerance e tempo de recuperação que justificam o desenho.",
    useCases: [
      "Troca de host, storage, cluster ou plataforma de virtualização.",
      "Atualização de sistema operacional compatível com aplicações industriais.",
      "Migração de servidores físicos para VMs.",
      "Redução de risco em ambiente sem backup e rollback documentados.",
    ],
    howIntegraActs: [
      "Inventaria VM, aplicações, serviços, IPs, licenças, drivers e dependências.",
      "Valida compatibilidade antes da janela de migração.",
      "Executa backup, snapshot, plano de rollback e migração faseada.",
      "Realiza testes funcionais com operação e manutenção após o cutover.",
    ],
    deliverables: [
      "Inventário técnico das VMs e dependências.",
      "Plano de migração e rollback.",
      "Checklist de validação funcional por aplicação.",
      "Registro de mudanças, backups e evidências de teste.",
      "Documentação final de ambiente e suporte.",
    ],
    standards: [
      { code: "VM Migration", description: "Migração controlada" },
      { code: "Backup", description: "Proteção antes do cutover" },
      { code: "Rollback", description: "Retorno planejado" },
      { code: "FAT/SAT", description: "Validação funcional" },
    ],
    faq: [
      {
        q: "Dá para migrar sem parada?",
        a: "Às vezes, com arquitetura adequada. Em OT, a decisão depende de aplicação, redundância, licenças, comunicação e risco de processo.",
      },
      {
        q: "Vocês validam a aplicação ou só movem a VM?",
        a: "Validamos a aplicação. Em automação, mover VM sem testar HMI, dados, licenças, comunicação e usuários não é entrega completa.",
      },
      {
        q: "Migrar VMs entre hipervisores quebra licença Rockwell?",
        a: "Não, mas exige cuidado: ativação por hardware ID muda quando o hipervisor muda. Reativamos as licenças (FactoryTalk, RSLogix) com o token correto após migração, parte do plano de cutover.",
      },
      {
        q: "Quanto tempo leva migrar 20 VMs industriais?",
        a: "O cronograma depende do número de VMs, do tamanho dos discos, da redundância exigida e das janelas de manutenção disponíveis. Toda migração inclui levantamento, migração faseada (host por host), validação e estabilização.",
      },
      {
        q: "V2V (virtual to virtual) ou P2V (physical to virtual)?",
        a: "P2V quando há servidor físico legado virando VM (típico em modernização). V2V entre hipervisores ou versões. As ferramentas variam: VMware Converter, MVMC, Veeam, Carbonite. A escolha depende dos volumes e SLA.",
      },
      {
        q: "E quando a aplicação industrial não suporta a versão alvo do SO?",
        a: "Mantemos VM com SO antigo isolado em rede segregada, com plano de upgrade em paralelo (instala versão nova em VM nova, valida, cutover). Forçar upgrade de SO sob aplicação não compatível é receita para retrabalho.",
      },
    ],
    relatedSolutions: infraRelated,
    relatedTech: ["virtualizacao-ot", "backup-recuperacao-desastres", "factorytalk-view-se"],
  },
  {
    slug: "active-directory-ot",
    group: "Infraestrutura OT",
    type: "Tecnologia",
    title: "Active Directory para OT",
    shortTitle: "AD Industrial",
    description:
      "Domínio industrial, grupos, políticas, controladores de domínio, autenticação e segregação de identidade para ambientes de automação.",
    intro:
      "Ambientes industriais críticos precisam de identidade governada. Active Directory em OT deve ser desenhado com grupos, políticas, redundância e separação adequada da TI corporativa, sempre respeitando operação e manutenção.",
    image: adCaHierarchy,
    imageAlt: "Modelos de implementação de hierarquia de Certificate Authority (CA) em Active Directory para OT",
    imageTitle: "Hierarquia de CA e modelos PKI para Active Directory em ambientes industriais",
    imageSource: identityMobilitySource,
    imageCaption: "Print público da CVD Cisco/Rockwell que mostra modelos de PKI para Active Directory dimensionados ao porte da planta.",
    useCases: [
      "Autenticação centralizada para FactoryTalk, ThinManager, servidores e estações.",
      "Segregação entre usuários de operação, manutenção, engenharia e suporte.",
      "Políticas de senha, bloqueio, sessão e acesso remoto em OT.",
      "Auditoria e rastreabilidade de ações em sistemas industriais.",
    ],
    howIntegraActs: [
      "Define modelo de domínio, grupos, políticas e redundância de controladores.",
      "Integra FactoryTalk Security, ThinManager e aplicações compatíveis.",
      "Alinha políticas com TI sem importar regras que possam quebrar operação.",
      "Documenta usuários, grupos, exceções e procedimento de emergência.",
    ],
    deliverables: [
      "Modelo de domínio industrial e grupos.",
      "Políticas de acesso por função.",
      "Integração com FactoryTalk Security e aplicações OT.",
      "Procedimentos para criação, remoção e revisão de usuários.",
      "Plano de contingência para indisponibilidade de domínio.",
    ],
    standards: [
      { code: "Active Directory", description: "Identidade" },
      { code: "GPO", description: "Políticas" },
      { code: "IEC 62443", description: "Controle de acesso" },
      { code: "FactoryTalk Security", description: "Autorização OT" },
    ],
    faq: [
      {
        q: "Posso usar o AD corporativo direto na planta?",
        a: "Pode ser possível, mas precisa análise de risco. Muitas plantas usam domínio industrial segregado ou relações controladas para evitar dependências perigosas.",
      },
      {
        q: "Política forte de senha pode atrapalhar operação?",
        a: "Sim, se aplicada sem contexto. Segurança OT precisa equilibrar rastreabilidade, emergência operacional e manutenção segura.",
      },
      {
        q: "Posso usar o AD corporativo para autenticar OT?",
        a: "Tecnicamente sim, mas o padrão recomendado é AD industrial dedicado, OU separada, GPOs específicas, controle de acesso enxuto. Mistura com AD corporativo aumenta blast radius em incidentes de segurança.",
      },
      {
        q: "Como integrar AD industrial com FactoryTalk Security?",
        a: "Via FactoryTalk Directory que delega autenticação ao AD. Grupos AD viram roles em FactoryTalk; usuários e permissões são gerenciados em um só ponto, com auditoria centralizada.",
      },
      {
        q: "MFA é viável em planta OT?",
        a: "Sim para acesso administrativo e remoto (engenheiros, manutenção). Para operadores em sala de controle, MFA frequentemente é substituído por estação fisicamente protegida + login com cartão. A política depende do nível de segurança SL-T.",
      },
      {
        q: "Posso ter Forest separado para OT?",
        a: "Sim, e em plantas grandes é recomendado. Forest separado isola governança, política de senha, ciclo de vida de conta e GPOs entre IT e OT, alinha com IEC 62443 zone separation.",
      },
    ],
    relatedSolutions: infraRelated,
    relatedTech: ["factorytalk-security", "thinmanager", "hardening-industrial"],
  },
  {
    slug: "backup-recuperacao-desastres",
    group: "Infraestrutura OT",
    type: "Serviço",
    title: "Backup e Recuperação de Desastres OT",
    shortTitle: "Backup / DR OT",
    description:
      "Política de backup, restore testado e recuperação de VMs, projetos PLC, telas, receitas, bancos históricos e configurações de rede.",
    intro:
      "Backup que nunca foi restaurado é esperança, não estratégia. A Integra estrutura backup e recuperação de OT considerando VMs, projetos de automação, receitas, historian, switches, servidores e documentação.",
    image: logixDirectDlr,
    imageAlt: "Direct DLR Non-converged com 1756-EN4TR redundantes e 5015 FLEXHA 5000",
    imageTitle: "Backup e DR começam pela camada física: redundância de rede e adaptadores",
    imageSource: logixRedundancyRefSource,
    imageCaption: "Print público da Logix Redundancy Reference Architecture: estratégia de backup e DR depende da camada física, adaptadores 1756-EN4TR redundantes, NIC teaming e topologia DLR são pré-requisitos para recuperação rápida e validável.",
    useCases: [
      "Ambientes sem restore testado ou com backups manuais dispersos.",
      "Proteção de projetos PLC/HMI, receitas, VMs, bancos e configs de rede.",
      "Definição de RTO/RPO para HMI, historian, Batch, AssetCentre e domínio.",
      "Preparação para incidentes, falhas de hardware ou erro humano.",
    ],
    howIntegraActs: [
      "Inventaria ativos digitais críticos e responsáveis por restauração.",
      "Define política de backup, retenção, mídia, frequência e testes.",
      "Valida restore em ambiente controlado e documenta evidências.",
      "Organiza plano de recuperação por cenário de falha.",
    ],
    deliverables: [
      "Inventário de ativos digitais críticos.",
      "Política de backup e retenção por tipo de ativo.",
      "Procedimentos de restore e evidências de teste.",
      "Matriz RTO/RPO por aplicação.",
      "Plano de recuperação e contatos de escalonamento.",
    ],
    standards: [
      { code: "Backup", description: "Cópia protegida" },
      { code: "DR", description: "Recuperação de desastre" },
      { code: "AssetCentre", description: "Backups de automação" },
      { code: "IEC 62443", description: "Resiliência operacional" },
    ],
    faq: [
      {
        q: "Backup de VM cobre projeto PLC?",
        a: "Ajuda, mas não substitui backup próprio do projeto, versões, exports, receitas, licenças e configurações específicas.",
      },
      {
        q: "Como proteger os backups industriais contra ransomware?",
        a: "Utilizamos a estratégia de backup 3-2-1 adaptada a ambientes industriais: 3 cópias dos dados, em 2 mídias diferentes, sendo pelo menos 1 cópia totalmente offline e isolada (air-gapped) ou imutável. Os repositórios de backup na IDMZ não devem compartilhar credenciais com o Active Directory corporativo, impedindo que uma infecção na rede de TI alcance e apague os backups de automação.",
      },
      {
        q: "Backup de aplicação industrial cabe em backup corporativo?",
        a: "Pode caber, mas com cuidado: aplicação industrial tem requisitos de captura (programa PLC, projeto FactoryTalk, configuração de drive, receitas Batch) que ferramenta TI genérica não conhece. AssetCentre + Veeam é combinação comum.",
      },
      {
        q: "Com que frequência testar o restore dos backups OT?",
        a: "Recomendamos um teste no mínimo trimestral para sistemas críticos e sempre após mudanças relevantes de arquitetura. Restore não testado é backup que não existe. Em plantas com janela de parada anual, testamos o restore em ambiente de laboratório/espelho durante o ano para validar o procedimento antes de precisar dele na prática.",
      },
      {
        q: "Plano de DR (Disaster Recovery) para OT precisa ser site offsite?",
        a: "Idealmente sim, com RTO/RPO compatível com criticidade. Em plantas onde site espelho não é viável, mantemos cold standby (servidores físicos prontos, backup recente) para recuperação em horas.",
      },
      {
        q: "Snapshot de VM substitui backup de programa PLC?",
        a: "Não. Programa PLC vive no controlador, não no servidor. AssetCentre faz backup periódico desse programa, com versionamento, comparação e restore, esse é o backup que importa quando perde um controlador.",
      },
    ],
    relatedSolutions: infraRelated,
    relatedTech: ["factorytalk-assetcentre", "migracao-vms", "manutencao-corretiva-preventiva"],
  },
  {
    slug: "factorytalk-security",
    group: "Infraestrutura OT",
    type: "Software",
    title: "FactoryTalk Security",
    shortTitle: "FactoryTalk Security",
    description:
      "Segurança, autenticação, autorização e políticas de acesso para aplicações FactoryTalk e ambientes industriais integrados.",
    intro:
      "FactoryTalk Security organiza quem pode ver, operar, configurar e alterar sistemas Rockwell. A Integra conecta essa camada a usuários, grupos, AD, estações e processos de mudança para criar rastreabilidade sem travar a operação.",
    image: cpweDefenseInDepthConcentric,
    imageAlt: "Defense-in-Depth - anéis concêntricos: Policies/Procedures, Physical, Network, Computer, Application, Device",
    imageTitle: "FactoryTalk Security é uma camada do defense-in-depth, não um produto isolado",
    imageSource: cipSecurityCvdSource,
    imageCaption: "Print público do CVD Cisco/Rockwell: defense-in-depth é estratégia em anéis (políticas → física → rede → computador → aplicação → dispositivo). FactoryTalk Security operacionaliza as camadas de aplicação e dispositivo.",
    useCases: [
      "Separação de permissões entre operação, manutenção, engenharia e administradores.",
      "Rastreabilidade de ações e alterações em sistemas FactoryTalk.",
      "Integração com Active Directory e políticas de acesso industrial.",
      "Redução de contas compartilhadas e permissões excessivas.",
    ],
    howIntegraActs: [
      "Mapeia perfis de usuário, ações permitidas e exceções operacionais.",
      "Configura grupos, políticas, permissões e integração com AD quando aplicável.",
      "Testa cenários de login, troca de turno, emergência e indisponibilidade.",
      "Documenta procedimento de manutenção e revisão periódica de acesso.",
    ],
    deliverables: [
      "Matriz de permissões por função.",
      "Configuração FactoryTalk Security documentada.",
      "Integração com AD e grupos industriais.",
      "Procedimentos de revisão de acesso.",
      "Evidências de teste por perfil de usuário.",
    ],
    standards: [
      { code: "FactoryTalk Security", description: "Autorização" },
      { code: "Active Directory", description: "Identidade" },
      { code: "IEC 62443", description: "Controle de acesso" },
      { code: "Audit Trail", description: "Rastreabilidade" },
    ],
    faq: [
      {
        q: "Posso manter usuário compartilhado na operação?",
        a: "Pode parecer prático, mas reduz rastreabilidade. Quando necessário, precisa ser exceção documentada, não padrão invisível.",
      },
      {
        q: "Segurança atrapalha startup?",
        a: "Atrapalha quando é deixada para o fim. Quando entra no projeto, os perfis e exceções são testados antes da partida.",
      },
      {
        q: "FactoryTalk Security é obrigatório?",
        a: "Não obrigatório por norma, mas é a forma estruturada de aplicar IEC 62443 dentro do ecossistema Rockwell. Sem FT Security, autorização vira improviso por aplicação, antipadrão de governança OT.",
      },
      {
        q: "Quantos usuários FactoryTalk Security suporta?",
        a: "Centenas de usuários e grupos sem problema; a limitação prática vem da gestão (revisar permissões, expiração, auditoria). Por isso integramos com AD industrial e usamos Roles em vez de usuário individual.",
      },
      {
        q: "FT Security registra log de quem fez o quê?",
        a: "Sim, via FactoryTalk Diagnostics e AssetCentre. Toda mudança de configuração, login, alarme, comando crítico fica logado com timestamp, usuário e estação. Esses logs alimentam SIEM corporativo quando integrado.",
      },
      {
        q: "Como migrar de modelo de senha compartilhada para FT Security?",
        a: "Por etapas: inventariar acessos atuais, definir matriz de roles, criar grupos AD, integrar FT Directory ao AD, treinar operação, e migrar aplicações por área. Cutover faseado evita resistência operacional e bloqueio acidental.",
      },
    ],
    relatedSolutions: infraRelated,
    relatedTech: ["active-directory-ot", "factorytalk-assetcentre", "hardening-industrial"],
  },
  {
    slug: "ethernet-ip-cpwe",
    group: "Redes e Cibersegurança OT",
    type: "Tecnologia",
    title: "EtherNet/IP e CPwE",
    shortTitle: "EtherNet/IP / CPwE",
    description:
      "Redes industriais convergentes com EtherNet/IP, topologias robustas, VLANs, QoS, DLR, PRP, Stratix, Cisco IE e segmentação por zonas.",
    intro:
      "EtherNet/IP só é confiável quando a rede é projetada. CPwE fornece referência para segmentação, disponibilidade, tráfego industrial e integração OT/IT. A Integra traduz esse modelo em topologia, configuração, documentação e teste de campo.",
    image: cpweReference,
    imageAlt: "Arquitetura CPwE mostrando integração OT e IT",
    imageTitle: "CPwE como referência para rede industrial convergente",
    imageSource: cpweSource,
    imageCaption:
      "Referência visual pública CPwE para explicar camadas, zonas, IDMZ e integração controlada entre OT e IT.",
    theme: "ot",
    useCases: [
      "Redes flat com broadcast, loops, baixa visibilidade e risco de parada.",
      "Modernização de switches não industriais para Stratix/Cisco IE.",
      "Segmentação de células, áreas, servidores, IDMZ e acesso remoto.",
      "Alta disponibilidade com DLR, PRP, uplinks redundantes ou anéis de fibra.",
    ],
    howIntegraActs: [
      "Mapeia tráfego, dispositivos, protocolos, criticidade e dependências.",
      "Desenha topologia com VLANs, QoS, trunks, ACLs, anéis e zonas.",
      "Configura switches, portas, redundância, segurança e monitoramento.",
      "Entrega diagramas, tabelas de IP/VLAN e plano de manutenção.",
    ],
    deliverables: [
      "Diagnóstico de rede industrial.",
      "Topologia CPwE com zonas, VLANs, switches e uplinks.",
      "Configuração documentada de Stratix/Cisco IE.",
      "Plano de endereçamento, QoS, segurança de porta e redundância.",
      "Teste de comunicação, failover e documentação as-built.",
    ],
    standards: [
      { code: "CPwE", description: "Converged Plantwide Ethernet" },
      { code: "EtherNet/IP", description: "Rede industrial" },
      { code: "Stratix", description: "Switches industriais" },
      { code: "Cisco IE", description: "Infraestrutura industrial" },
      { code: "DLR / PRP", description: "Disponibilidade" },
      { code: "IEC 62443", description: "Segmentação" },
    ],
    faq: [
      {
        q: "CPwE é produto?",
        a: "Não. É uma arquitetura de referência. O valor está em aplicar seus princípios à realidade da planta, com configuração e documentação corretas.",
      },
      {
        q: "VLAN resolve cibersegurança?",
        a: "Ajuda, mas não basta. Segurança OT exige zonas, regras de comunicação, hardening, acesso, monitoramento e disciplina de mudança.",
      },
      {
        q: "CPwE é norma ou referência?",
        a: "Referência conjunta Cisco + Rockwell, não é norma, mas implementa princípios de IEC 62443 e ISA-99 em arquitetura concreta. Usamos CPwE como linguagem comum para projetar e auditar redes industriais.",
      },
      {
        q: "Posso ter EtherNet/IP em fibra ótica?",
        a: "Sim. Anel de fibra com switches Stratix ou Cisco IE é padrão para distâncias longas e ambientes ruidosos. Latência de fibra é desprezível para EtherNet/IP.",
      },
      {
        q: "Qual a diferença entre DLR e PRP?",
        a: "DLR é anel com cura rápida (<3 ms em anel de 50 nós), tecnologia ODVA da especificação EtherNet/IP (origem Rockwell) para topologia de anel. PRP é redundância paralela (duas redes simultâneas com seleção do primeiro pacote), para tolerância a falha total de rede. Use cases distintos.",
      },
      {
        q: "CPwE exige hardware Cisco e Rockwell juntos?",
        a: "Não rigidamente, mas o desenho é otimizado para Stratix (Rockwell, baseado em Cisco IOS) + Cisco IE em camadas core/distribution. Mistura com switches genéricos compromete features de tempo real e visibilidade industrial.",
      },
    ],
    relatedSolutions: cyberRelated,
    relatedTech: ["iec-62443-nist-ot", "protocolos-industriais", "monitoramento-redes-industriais"],
  },
  {
    slug: "protocolos-industriais",
    group: "Redes e Cibersegurança OT",
    type: "Tecnologia",
    title: "Protocolos Industriais",
    shortTitle: "Protocolos Industriais",
    description:
      "Integração com EtherNet/IP, OPC UA, Modbus TCP/RTU, IEC 61850, Foundation Fieldbus, Profibus PA e HART.",
    intro:
      "Protocolo não é detalhe de comunicação. Ele define latência, diagnóstico, segurança, manutenção e qualidade de dado. A Integra avalia cada interface com critério de engenharia para evitar pontes frágeis e integrações sem dono.",
    image: prpRedundancy,
    imageAlt: "Operação do Parallel Redundancy Protocol (PRP) - duas LANs independentes",
    imageTitle: "PRP como referência de protocolo industrial determinístico e redundante",
    imageSource: prpSource,
    imageCaption: "Print público da Reference Architecture PRP - protocolos industriais não são apenas EtherNet/IP; envolvem redundância determinística.",
    theme: "ot",
    useCases: [
      "Integração de controladores, I/O remoto, inversores, IEDs, analisadores e sistemas de terceiros.",
      "Migração de redes legadas para comunicação Ethernet industrial.",
      "Coleta de dados via OPC UA, Modbus TCP/RTU ou gateways.",
      "Diagnóstico de instabilidade, timeouts, perda de pacote e latência.",
    ],
    howIntegraActs: [
      "Mapeia protocolo, endereço, taxa de leitura, owner e criticidade por interface.",
      "Define gateways, drivers, zonas e regras de comunicação.",
      "Valida comportamento de falha, reconexão, perda de dado e alarmes.",
      "Documenta matriz de comunicação e dependências por sistema.",
    ],
    deliverables: [
      "Matriz de comunicação entre sistemas.",
      "Lista de protocolos, endereços, tags e taxas.",
      "Configuração de gateways e drivers documentada.",
      "Teste de falha, reconexão e qualidade de dado.",
      "As-built de integração e suporte.",
    ],
    standards: [
      { code: "EtherNet/IP", description: "Controle industrial" },
      { code: "OPC UA", description: "Integração segura" },
      { code: "Modbus", description: "TCP e RTU" },
      { code: "IEC 61850", description: "Sistemas elétricos" },
      { code: "HART", description: "Instrumentação" },
      { code: "Profibus PA", description: "Processo" },
    ],
    faq: [
      {
        q: "OPC UA é sempre melhor?",
        a: "É uma excelente opção para integração segura e contextual, mas nem sempre substitui protocolo de controle ou redes existentes. O uso depende do requisito.",
      },
      {
        q: "Gateway resolve qualquer integração?",
        a: "Resolve parte da comunicação, mas o projeto precisa definir segurança, qualidade de dado, falha, documentação e manutenção.",
      },
      {
        q: "Modbus TCP é seguro em planta industrial?",
        a: "Não tem autenticação nem criptografia nativa, é protocolo dos anos 70 modernizado para Ethernet. Use somente em zonas seguras e com segmentação de VLAN. Para integração externa, prefira OPC UA.",
      },
      {
        q: "OPC UA é o substituto definitivo de OPC Classic?",
        a: "Sim. OPC Classic (DA, HDA, AE) depende de DCOM, é difícil de configurar e furado em segurança. OPC UA tem segurança nativa (TLS, X.509), modelagem de informação rica e roda multi-plataforma. Migração é caminho único.",
      },
      {
        q: "IEC 61850 cabe na planta de processo?",
        a: "Tipicamente é protocolo de subestações elétricas (SCADA elétrico, IEDs). Em planta de processo, entra na interface entre subestação interna e camada de automação, via gateway que traduz IEC 61850 para EtherNet/IP.",
      },
      {
        q: "Profibus PA continua sendo usado?",
        a: "Em planta nova, raramente. Em plantas existentes com instrumentação Profibus PA, mantemos via gateway até modernização. Foundation Fieldbus segue caminho parecido, base instalada substituível por EtherNet/IP + HART-IP em ciclos de modernização.",
      },
    ],
    relatedSolutions: cyberRelated,
    relatedTech: ["thingworx-kepware", "ethernet-ip-cpwe", "factorytalk-historian"],
  },
  {
    slug: "iec-62443-nist-ot",
    group: "Redes e Cibersegurança OT",
    type: "Tecnologia",
    title: "ISA/IEC 62443 e NIST SP 800-82",
    shortTitle: "IEC 62443 / NIST OT",
    description:
      "Diagnóstico, zonas e conduítes, gap analysis, roadmap e controles de cibersegurança OT alinhados a referências internacionais.",
    intro:
      "Cibersegurança OT não começa por ferramenta. Começa por entender processo, risco, zonas, conduítes, ativos, dependências e impacto operacional. A Integra aplica IEC 62443 e NIST SP 800-82 como método de engenharia, não como checklist genérico.",
    image: idmzUntrustedTrusted,
    imageAlt: "IDMZ entre Enterprise (Untrusted) e Industrial (Trusted) Security Zones com regra No Direct IACS Traffic",
    imageTitle: "Untrusted/Trusted: a fronteira que dá nome a IEC 62443 aplicada",
    imageSource: idmzFirepowerSource,
    imageCaption:
      "Print público do guia ENET-TD013A-EN-P (Cisco + Rockwell): a IDMZ replica serviços, registra logs, inspeciona e desconecta, é a implementação de referência do CPwE e do NIST SP 800-82 para os requisitos de zonas e conduítes da IEC 62443.",
    theme: "ot",
    useCases: [
      "Plantas com rede flat e acesso remoto pouco controlado.",
      "Auditorias corporativas, seguradoras ou clientes exigindo maturidade OT.",
      "Projetos novos que precisam nascer com cybersecurity by design.",
      "Criação de roadmap progressivo sem parar a operação.",
    ],
    howIntegraActs: [
      "Inventaria ativos, fluxos, riscos e dependências de operação.",
      "Define zonas, conduítes, regras de comunicação e níveis desejados.",
      "Prioriza controles por risco real e viabilidade operacional.",
      "Entrega roadmap técnico com ações, responsáveis e evidências.",
    ],
    deliverables: [
      "Diagnóstico de maturidade OT.",
      "Mapa de zonas, conduítes e fluxos críticos.",
      "Gap analysis contra IEC 62443 e NIST SP 800-82.",
      "Roadmap de controles por prioridade.",
      "Plano de documentação, revisão e evolução.",
    ],
    standards: [
      { code: "ISA/IEC 62443", description: "Cibersegurança OT" },
      { code: "NIST SP 800-82", description: "Guia ICS" },
      { code: "CPwE", description: "Referência de arquitetura" },
      { code: "Defense in Depth", description: "Camadas de controle" },
    ],
    faq: [
      {
        q: "IEC 62443 é obrigatória?",
        a: "Nem sempre por lei, mas é referência internacional e aparece em auditorias, seguros, clientes globais e governança corporativa.",
      },
      {
        q: "Precisa parar a planta para segmentar?",
        a: "Não necessariamente. O trabalho deve ser faseado, começando por diagnóstico e validação de tráfego antes de qualquer cutover.",
      },
      {
        q: "Diferença entre IEC 62443 e NIST SP 800-82?",
        a: "IEC 62443 é norma internacional ISA com framework de zonas, conduítes e níveis de segurança (SL). NIST SP 800-82 é guia americano com práticas e taxonomia de ICS. Eles são complementares, IEC 62443 estrutura, NIST detalha controles.",
      },
      {
        q: "Qual o nível SL recomendado para minha planta?",
        a: "Depende da criticidade. Para áreas comuns, SL-2 cobre maioria dos riscos. Para áreas críticas (safety, processo high-impact), SL-3. SL-4 é para infra crítica nacional. Definimos por análise de risco, não por checklist.",
      },
      {
        q: "IEC 62443 é exigida por seguradora?",
        a: "Crescentemente sim. Seguros industriais para grandes plantas começaram a exigir maturidade IEC 62443 ou equivalente como condição de cobertura cibernética. Em 5 anos, será exigência padrão.",
      },
      {
        q: "Quanto tempo leva certificar maturidade IEC 62443?",
        a: "Não há certificação plant-wide única, ela vem por componente (62443-4-1, 62443-4-2 para produto) ou por sistema integrado (62443-3-3 SL-x). Implementar maturidade prática é um roadmap progressivo, fasado por área crítica e em ciclos planejados de revisão.",
      },
    ],
    relatedSolutions: cyberRelated,
    relatedTech: ["hardening-industrial", "patch-management-ot", "ethernet-ip-cpwe"],
  },
  {
    slug: "hardening-industrial",
    group: "Redes e Cibersegurança OT",
    type: "Serviço",
    title: "Hardening Industrial",
    shortTitle: "Hardening OT",
    description:
      "Endurecimento de servidores FactoryTalk, estações de engenharia, HMIs, switches industriais e serviços OT sem comprometer operação.",
    intro:
      "Hardening em OT precisa ser cuidadoso. Desligar serviço errado ou aplicar política corporativa sem validação pode parar supervisão, licenças ou comunicação. A Integra aplica endurecimento com homologação, rollback e documentação.",
    image: cpweSecurityFramework,
    imageAlt: "CPwE Industrial Security Framework, defesa em profundidade plant-wide",
    imageTitle: "Hardening como parte de uma estratégia de defesa em camadas",
    imageSource: cipSecuritySource,
    imageCaption: "Print público do framework CPwE de cibersegurança industrial: hardening compõe múltiplas camadas, não é evento isolado.",
    theme: "ot",
    useCases: [
      "Servidores e estações com serviços desnecessários, contas compartilhadas ou permissões excessivas.",
      "Switches industriais sem proteção de porta, controle de loops ou backups de configuração.",
      "Aplicações FactoryTalk sem política clara de acesso e auditoria.",
      "Preparação para auditoria, seguro ou implantação de controles IEC 62443.",
    ],
    howIntegraActs: [
      "Inventaria serviços, usuários, portas, aplicações e dependências antes de alterar.",
      "Define baseline de hardening por tipo de ativo.",
      "Homologa mudanças em ambiente controlado quando possível.",
      "Documenta exceções e cria rollback para cada alteração crítica.",
    ],
    deliverables: [
      "Baseline de hardening OT.",
      "Lista de mudanças aplicadas e exceções justificadas.",
      "Configuração documentada de servidores, estações e switches.",
      "Plano de teste funcional pós-hardening.",
      "Recomendações de revisão periódica.",
    ],
    standards: [
      { code: "IEC 62443", description: "Hardening e acesso" },
      { code: "NIST SP 800-82", description: "Controles ICS" },
      { code: "FactoryTalk Security", description: "Permissões" },
      { code: "Switch Hardening", description: "Rede industrial" },
    ],
    faq: [
      {
        q: "Hardening pode quebrar aplicação industrial?",
        a: "Pode, se feito sem inventário e teste. Por isso tratamos como mudança de engenharia, com validação e rollback.",
      },
      {
        q: "Antivírus é hardening?",
        a: "É apenas uma parte possível. Hardening inclui usuários, serviços, portas, políticas, rede, logs, backup e procedimentos.",
      },
      {
        q: "Hardening industrial é o mesmo que hardening corporativo?",
        a: "Princípios são similares (mínimo privilégio, desabilitar serviços inúteis, atualizar). Mas cuidado: ferramentas de hardening corporativo podem desabilitar serviços que aplicação industrial usa. Sempre referencie o vendor e baselines reconhecidos: guias de hardening da Rockwell, Microsoft Security Baselines (Security Compliance Toolkit), STIGs da DISA e CIS Benchmarks.",
      },
      {
        q: "Posso aplicar GPO corporativa em estações OT?",
        a: "Não cegamente. GPO corporativa frequentemente desabilita SMB, RPC, DCOM ou serviços de rede que FactoryTalk usa. Criamos GPO dedicada à OU OT, validada com aplicação rodando.",
      },
      {
        q: "Hardening quebra performance de HMI?",
        a: "Bem feito, não. Mal feito (antivírus em modo agressivo, firewall com inspeção profunda em rede industrial), sim, pode adicionar latência e quebrar comunicação OPC. Por isso testamos em ambiente espelho antes de produção.",
      },
      {
        q: "Com que frequência revisar hardening?",
        a: "Anualmente para planta estável; a cada update major do FactoryTalk ou Windows; a cada incidente. Hardening não é projeto único, é ciclo de revisão alinhado com gestão de vulnerabilidades.",
      },
    ],
    relatedSolutions: cyberRelated,
    relatedTech: ["factorytalk-security", "active-directory-ot", "patch-management-ot"],
  },
  {
    slug: "patch-management-ot",
    group: "Redes e Cibersegurança OT",
    type: "Serviço",
    title: "Patch Management OT",
    shortTitle: "Patches OT",
    description:
      "Gestão de atualizações em servidores, estações, aplicações industriais e infraestrutura OT com validação, janela e documentação.",
    intro:
      "Atualizar OT não é clicar em update. Patches precisam ser avaliados por criticidade, compatibilidade, janela de manutenção, backup, teste e rollback. A Integra cria processo para reduzir risco sem congelar a planta no passado.",
    image: cpweDefenseInDepth,
    imageAlt: "Defesa em profundidade no CPwE com hardening de SO, patch e monitoramento",
    imageTitle: "Patch management dentro do programa de defesa em profundidade",
    imageSource: cloudConnectivitySource,
    imageCaption: "Print público da arquitetura CPwE de defesa em camadas: patching é parte de um programa estruturado de cibersegurança.",
    theme: "ot",
    useCases: [
      "Servidores Windows industriais com atualizações atrasadas.",
      "Ambientes FactoryTalk com compatibilidade sensível de versão.",
      "Plantas que precisam atender auditoria sem assumir risco de parada.",
      "Criação de rotina de atualização com homologação e evidência.",
    ],
    howIntegraActs: [
      "Inventaria versões, dependências, criticidade e janelas disponíveis.",
      "Classifica patches por risco, urgência e impacto operacional.",
      "Valida em homologação ou ambiente controlado quando possível.",
      "Executa janela com backup, checklist e rollback.",
    ],
    deliverables: [
      "Inventário de versões e pendências.",
      "Política de patching OT.",
      "Matriz de risco e prioridade de atualizações.",
      "Checklist de janela, backup e rollback.",
      "Relatório de evidências pós-atualização.",
    ],
    standards: [
      { code: "Patch Management", description: "Atualização controlada" },
      { code: "IEC 62443", description: "Gestão de vulnerabilidade" },
      { code: "NIST SP 800-82", description: "Operação segura" },
      { code: "FactoryTalk", description: "Compatibilidade" },
    ],
    faq: [
      {
        q: "É melhor não atualizar nada em OT?",
        a: "Não. O correto é atualizar com critério, teste e janela. Congelar indefinidamente aumenta risco de segurança e suporte.",
      },
      {
        q: "Atualização crítica deve ser imediata?",
        a: "Depende do risco e da exposição. Em OT, urgência precisa ser balanceada com impacto operacional e plano de rollback.",
      },
      {
        q: "Posso aplicar Windows Update direto em servidor OT?",
        a: "Não. Windows Update genérico instala patches sem critério, pode reiniciar máquina sem aviso. Em OT, o patch passa por homologação em ambiente espelho, agendamento de janela e plano de rollback.",
      },
      {
        q: "Qual frequência de patching ideal para OT?",
        a: "A frequência ideal depende da janela de manutenção da planta, do nível de risco e da política interna. Patches críticos (CVE com exploit público em produto exposto) entram em ciclo emergencial. O equilíbrio entre risco e impacto operacional é definido por área.",
      },
      {
        q: "Como saber se meu PLC tem firmware vulnerável?",
        a: "Inventário de firmware (AssetCentre coleta automaticamente em ambientes Rockwell) cruzado com base de CVE pública (NVD, ICS-CERT). Para planta multi-vendor, ferramenta de monitoramento OT (Claroty, Nozomi, Dragos) ajuda.",
      },
      {
        q: "Patching de PLC para CVE é reboot obrigatório?",
        a: "Maioria das CPUs Logix exige modo Program para flashar firmware, equivale a parada da área controlada. Daí a importância de janela planejada e roteiro de cutover, sem improvisar update em planta rodando.",
      },
    ],
    relatedSolutions: cyberRelated,
    relatedTech: ["hardening-industrial", "backup-recuperacao-desastres", "iec-62443-nist-ot"],
  },
  {
    slug: "monitoramento-redes-industriais",
    group: "Redes e Cibersegurança OT",
    type: "Serviço",
    title: "Diagnóstico de Redes Industriais",
    shortTitle: "Diagnóstico de Rede",
    description:
      "Análise de tráfego, loops, broadcast storms, saúde de rede, devices, uplinks, DLR e comportamento de comunicação em OT.",
    intro:
      "Muita instabilidade de automação parece problema de PLC ou HMI, mas nasce na rede. A Integra analisa tráfego, topologia, configuração e eventos para encontrar causa técnica sem trocar equipamento às cegas.",
    image: cpweIiotOtitBridging,
    imageAlt: "CPwE Industrial IoT / IT Bridging - Smart Endpoints, Segmentation, Managed Infrastructure, Resiliency, Time-critical Data, Wireless e Mobility",
    imageTitle: "CPwE traduz monitoramento OT em sete tenets aplicáveis",
    imageSource: cpweDeepDiveSource,
    imageCaption: "Print público do CPwE Deep Dive: os key tenets do CPwE (smart IIoT devices, segmentação por zonas, infraestrutura gerenciada, resiliência, dados time-critical, mobilidade wireless, holistic defense-in-depth e convergence-ready) são exatamente o que o monitoramento de rede industrial precisa entregar.",
    theme: "ot",
    useCases: [
      "Quedas intermitentes de HMI, PLC, I/O remoto, inversores ou historian.",
      "Loops, broadcast storms, erros de porta, duplex, perda de pacote e latência.",
      "Redes sem documentação ou com múltiplas expansões informais.",
      "Validação de saúde antes de implantação de PlantPAx, Batch ou historian.",
    ],
    howIntegraActs: [
      "Coleta topologia, configurações, estatísticas de porta e tráfego real.",
      "Analisa eventos, logs, erros, loops, broadcast e caminhos críticos.",
      "Prioriza correções por risco operacional e impacto.",
      "Entrega documentação e recomendações de arquitetura, não apenas diagnóstico pontual.",
    ],
    deliverables: [
      "Relatório de saúde de rede OT.",
      "Mapa de topologia e caminhos críticos.",
      "Lista de riscos, falhas e correções priorizadas.",
      "Configurações recomendadas de switches.",
      "Plano de monitoramento e documentação as-built.",
    ],
    standards: [
      { code: "CPwE", description: "Arquitetura de rede" },
      { code: "DLR", description: "Redundância em anel" },
      { code: "QoS", description: "Priorização de tráfego" },
      { code: "IEC 62443", description: "Segmentação" },
    ],
    faq: [
      {
        q: "Dá para diagnosticar sem parar a rede?",
        a: "Na maioria dos casos, sim, com coleta passiva, análise de configuração e uso de janelas apenas para testes específicos.",
      },
      {
        q: "Vocês instalam ferramenta de monitoramento contínuo?",
        a: "Podemos especificar e integrar quando faz sentido, mas começamos pelo diagnóstico e pela arquitetura para evitar ferramenta sobre rede mal projetada.",
      },
      {
        q: "Por que não usar SolarWinds ou Zabbix para monitorar rede industrial?",
        a: "Funciona para infra (SNMP, ping), mas não enxerga tráfego industrial (CIP, Modbus, OPC UA, EtherNet/IP). Ferramentas OT-aware (Claroty CTD, Nozomi Guardian, Dragos) entendem protocolo industrial e detectam anomalia operacional, não só de rede.",
      },
      {
        q: "Monitoramento OT detecta cyber attack?",
        a: "Detecta padrões anômalos, comando inesperado, comunicação fora de baseline, scan de rede. Não substitui SIEM corporativo, mas alimenta com contexto industrial que SIEM tradicional ignora.",
      },
      {
        q: "Tap ou SPAN port para coletar tráfego?",
        a: "Tap é preferido para análise contínua, passivo, sem perda, sem impacto na rede. SPAN serve para diagnóstico pontual, mas com risco de perder pacote sob carga. Para monitoramento permanente, sempre tap.",
      },
      {
        q: "O que entra no projeto de monitoramento OT?",
        a: "Diagnóstico de tráfego, definição de pontos de coleta (taps), escolha da plataforma de detecção (Claroty, Nozomi, Dragos ou equivalente), integração com SIEM corporativo, runbooks de resposta e treinamento. O dimensionamento e custo são apresentados em proposta específica após o diagnóstico.",
      },
    ],
    relatedSolutions: cyberRelated,
    relatedTech: ["ethernet-ip-cpwe", "protocolos-industriais", "suporte-remoto-presencial"],
  },
  {
    slug: "manutencao-corretiva-preventiva",
    group: "Serviços de Engenharia",
    type: "Serviço",
    title: "Manutenção Corretiva e Preventiva em Automação",
    shortTitle: "Manutenção OT",
    description:
      "Suporte técnico para PLCs, SCADA, redes, servidores, historian, aplicações FactoryTalk e infraestrutura OT crítica.",
    intro:
      "Manutenção OT precisa ir além de apagar incêndio. A Integra combina atendimento corretivo, rotina preventiva, documentação e análise de causa para reduzir reincidência e dependência de conhecimento informal.",
    image: industrialFirewalls,
    imageAlt: "Plant-wide industrial firewalls deployment - pontos de manutenção e proteção",
    imageTitle: "Manutenção em ambiente segmentado por firewalls industriais",
    imageSource: industrialFirewallsSource,
    imageCaption: "Print público da CVD Cisco/Rockwell ilustrando pontos onde a manutenção precisa atravessar firewalls industriais.",
    useCases: [
      "Falhas recorrentes em PLC, HMI, historian, rede, servidor ou comunicação.",
      "Sistemas críticos sem rotina de backup, atualização e validação.",
      "Dependência de poucos especialistas internos para manter a planta.",
      "Necessidade de contrato ou pacote técnico com SLA alinhado ao risco.",
    ],
    howIntegraActs: [
      "Atende incidentes com registro de causa, ação e evidência.",
      "Cria rotina preventiva por sistema, versão, backup e criticidade.",
      "Propõe correções estruturais quando o problema é arquitetura, não sintoma.",
      "Atualiza documentação e orienta manutenção interna após cada intervenção relevante.",
    ],
    deliverables: [
      "Registro técnico de atendimento.",
      "Análise de causa e recomendação de prevenção.",
      "Checklist preventivo por sistema.",
      "Atualização de backups e documentação quando aplicável.",
      "Plano de evolução para reduzir reincidência.",
    ],
    standards: [
      { code: "PLC/SCADA", description: "Suporte técnico" },
      { code: "Historian", description: "Dados" },
      { code: "Redes OT", description: "Comunicação" },
      { code: "Backup", description: "Recuperação" },
    ],
    faq: [
      {
        q: "Vocês atendem emergências?",
        a: "Sim, conforme disponibilidade e acordo comercial. O objetivo é resolver o incidente e transformar o aprendizado em prevenção.",
      },
      {
        q: "Manutenção preventiva vale para software?",
        a: "Vale muito. Backups, versões, logs, usuários, espaço em disco, rede e documentação precisam de rotina antes da falha aparecer.",
      },
      {
        q: "Preventiva manda em planta moderna?",
        a: "Híbrido. Manutenção baseada em condição (CBM) com sensoriamento substitui parte da preventiva tempo-base, especialmente em ativos rotativos. Mas safety, calibração de instrumento crítico e backup de programa continuam preventivos.",
      },
      {
        q: "Com que frequência fazer backup de programa PLC?",
        a: "Sempre que houver alteração + backup periódico (diário ou semanal) automatizado via AssetCentre. Para áreas críticas, backup de cada commit, com versionamento.",
      },
      {
        q: "Quem responde por manutenção preventiva: Integra ou cliente?",
        a: "Por padrão, cliente executa rotina; Integra atua em manutenção evolutiva, troubleshooting complexo, auditoria, modernização. Em contrato premium de suporte, podemos executar PMs específicos com janela agendada.",
      },
      {
        q: "Tem como prever falha de servidor industrial?",
        a: "Parcialmente. Telemetria de hardware (iDRAC, IPMI) + analytics de log identifica padrões precoces (disco com erros, memória com falha, ventoinha lenta). Não é certeza, mas reduz surpresa em planta crítica.",
      },
    ],
    relatedSolutions: serviceRelated,
    relatedTech: ["suporte-remoto-presencial", "backup-recuperacao-desastres", "monitoramento-redes-industriais"],
  },
  {
    slug: "suporte-remoto-presencial",
    group: "Serviços de Engenharia",
    type: "Serviço",
    title: "Suporte Remoto e Presencial",
    shortTitle: "Suporte Técnico",
    description:
      "Atendimento remoto e em campo para sistemas industriais, com acesso seguro, registro técnico, diagnóstico e escalonamento.",
    intro:
      "Suporte remoto em OT precisa de segurança, rastreabilidade e limites. A Integra atua com diagnóstico estruturado, acesso autorizado e, quando necessário, presença em campo para validar comunicação, painel, rede e processo.",
    image: mobileRemoteAccessArchitecture,
    imageAlt: "Mobile Analytics Use Case - Plant Personnel - acesso remoto através de IDMZ, Reverse Web Proxy, Cisco ISE, FactoryTalk VantagePoint e FactoryTalk Cloud",
    imageTitle: "Acesso remoto seguro: IDMZ, Reverse Web Proxy, identidade e cloud",
    imageSource: cpweIdentityMobilitySource,
    imageCaption: "Print público do CVD Identity and Mobility Services in CPwE (ENET-TD008B-EN-P, Figure 2-15): suporte remoto seguro atravessa IDMZ com Reverse Web Proxy, autenticação centralizada por Cisco ISE e FactoryTalk Cloud para analytics, sem acesso direto à zona industrial.",
    theme: "ot",
    useCases: [
      "Apoio rápido a falhas em PLC, HMI, servidores ou comunicação.",
      "Investigação que exige acesso seguro e registro de ações.",
      "Comissionamento, startup, ajustes e validação em campo.",
      "Treinamento e suporte de sustentação para manutenção interna.",
    ],
    howIntegraActs: [
      "Define canal de acesso remoto seguro e autorizado pela planta.",
      "Registra sintomas, ações, evidências e recomendações.",
      "Escalona para campo quando a causa depende de painel, rede física ou processo.",
      "Documenta alterações e orienta próximos passos.",
    ],
    deliverables: [
      "Registro de atendimento e evidências.",
      "Diagnóstico técnico e ações executadas.",
      "Recomendação de correção definitiva quando necessário.",
      "Atualização de documentação ou backup afetado.",
      "Plano de acompanhamento pós-intervenção.",
    ],
    standards: [
      { code: "Acesso Remoto", description: "Suporte seguro" },
      { code: "IEC 62443", description: "Controle de acesso" },
      { code: "Registro técnico", description: "Rastreabilidade" },
      { code: "SLA", description: "Acordo de suporte" },
    ],
    faq: [
      {
        q: "O suporte remoto fica sempre aberto?",
        a: "Não deveria. Acesso remoto em OT precisa ser controlado, aprovado, registrado e limitado ao necessário.",
      },
      {
        q: "Quando precisa ir a campo?",
        a: "Quando há evidência de falha física, rede, instrumentação, painel, processo ou necessidade de validação operacional local.",
      },
      {
        q: "Suporte remoto em planta crítica é seguro?",
        a: "Sim, se feito direito: VPN com MFA terminada em IDMZ, jump host registrado, gravação de sessão, autorização caso a caso, e nunca acesso direto a controlador de produção. Sem isso, é janela aberta.",
      },
      {
        q: "Quanto tempo de resposta para suporte presencial?",
        a: "Depende do contrato. SLAs específicos (tempo de resposta, plantão fora de horário, atendimento presencial) são definidos por escrito caso a caso. A localização da Integra (Maringá-PR) influencia o tempo de deslocamento para atendimento presencial.",
      },
      {
        q: "Posso ter suporte 24/7?",
        a: "Sim, em contrato dedicado para plantas que operam 24/7 com criticidade alta. Modelo é plantão telefônico/remoto + acionamento presencial conforme escala. Custo é proporcional à criticidade.",
      },
      {
        q: "Vocês mantêm peças sobressalentes no cliente?",
        a: "Não fornecemos hardware; recomendamos política de spare alinhada à análise de criticidade do ativo. Para clientes em manutenção, ajudamos a definir lista de spare e fornecedores.",
      },
    ],
    relatedSolutions: serviceRelated,
    relatedTech: ["iec-62443-nist-ot", "monitoramento-redes-industriais", "manutencao-corretiva-preventiva"],
  },
  {
    slug: "auditoria-conformidade",
    group: "Serviços de Engenharia",
    type: "Serviço",
    title: "Auditoria Técnica e Conformidade",
    shortTitle: "Auditoria Técnica",
    description:
      "Avaliação técnica de arquitetura, documentação, segurança, redes, aplicações, backup, governança e maturidade de automação.",
    intro:
      "Auditoria técnica ajuda a enxergar o que está funcionando por sorte, por conhecimento informal ou por arquitetura realmente robusta. A Integra entrega diagnóstico objetivo, riscos priorizados e plano de ação aplicável.",
    image: cpweOtVsItComparison,
    imageAlt: "Comparação Industrial OT vs Enterprise IT, tráfego, performance e segurança",
    imageTitle: "Auditar OT exige critérios diferentes dos critérios de TI corporativo",
    imageSource: cpweDeepDiveSource,
    imageCaption: "Tabela pública Cisco/Rockwell que mostra por que critérios OT exigem auditoria com escopo diferente da TI.",
    theme: "ot",
    useCases: [
      "Preparação para modernização, expansão, auditoria corporativa ou seguro.",
      "Avaliação de risco em redes, servidores, PLCs, SCADA e dados.",
      "Identificação de gaps de documentação, backup, acesso e ciclo de vida.",
      "Priorização de investimentos em automação sem achismo.",
    ],
    howIntegraActs: [
      "Coleta evidências, entrevistas, diagramas, configurações e inventário.",
      "Compara práticas atuais com referências técnicas e criticidade da planta.",
      "Classifica riscos por impacto, urgência e esforço de correção.",
      "Entrega roadmap pragmático, dividido em curto, médio e longo prazo.",
    ],
    deliverables: [
      "Relatório de diagnóstico técnico.",
      "Inventário de sistemas e riscos principais.",
      "Matriz de maturidade e gaps.",
      "Plano de ação priorizado.",
      "Recomendações de arquitetura, segurança e documentação.",
    ],
    standards: [
      { code: "IEC 62443", description: "Maturidade OT" },
      { code: "NIST SP 800-82", description: "Segurança ICS" },
      { code: "CPwE", description: "Arquitetura de rede" },
      { code: "Governança", description: "Ciclo de vida" },
    ],
    faq: [
      {
        q: "Auditoria é só checklist?",
        a: "Não. Checklist ajuda, mas o valor está em interpretar risco operacional e transformar achados em plano de ação executável.",
      },
      {
        q: "O relatório já inclui projeto executivo?",
        a: "Normalmente não. Ele aponta caminho, riscos e prioridade. Projeto executivo vem depois, com escopo e premissas definidos.",
      },
      {
        q: "Auditoria de OT é igual à de IT?",
        a: "Não. Critério é diferente, disponibilidade dominante sobre confidencialidade, ciclos de vida longos, normas distintas (IEC 62443 vs ISO 27001). Auditor IT puro frequentemente erra escopo OT por desconhecimento.",
      },
      {
        q: "Quem audita IEC 62443 no Brasil?",
        a: "Empresas como TÜV, Bureau Veritas, DNV oferecem certificação IEC 62443 (4-1, 4-2, 3-3). Para auditoria interna preparatória, integradores qualificados como Integra avaliam gap e roadmap.",
      },
      {
        q: "Quanto tempo dura uma auditoria de cibersegurança OT?",
        a: "Gap analysis envolve entrevistas, inventário e análise documental. Auditoria formal completa, com escopo amplo, demanda mais tempo. Remediação subsequente é projeto à parte, fasado por prioridade de risco.",
      },
      {
        q: "Auditoria gera plano de ação ou só relatório?",
        a: "Auditoria formal entrega relatório de conformidade. Diagnóstico Integra entrega relatório + roadmap priorizado por risco × custo × viabilidade operacional. A diferença está em traduzir achados em ações executáveis.",
      },
    ],
    relatedSolutions: serviceRelated,
    relatedTech: ["iec-62443-nist-ot", "backup-recuperacao-desastres", "data-centers-industriais"],
  },
  {
    slug: "otimizacao-performance",
    group: "Serviços de Engenharia",
    type: "Serviço",
    title: "Otimização de Performance e Estabilidade",
    shortTitle: "Otimização",
    description:
      "Análise e melhoria de desempenho em controle, HMI, historian, redes, servidores, bateladas, ciclos e diagnósticos operacionais.",
    intro:
      "Nem toda melhoria exige projeto novo. Muitas plantas têm ganhos em estabilidade, ciclo, diagnóstico, alarmes, rede e dados quando a engenharia revisa gargalos e remove causas recorrentes com método.",
    image: historianReference,
    imageAlt: "Diagrama lógico FactoryTalk Historian",
    imageTitle: "Performance depende de dados confiáveis e arquitetura estável",
    imageSource: historianSource,
    imageCaption:
      "Referência visual pública Historian para contextualizar análise de dados, tendências e eventos como base de melhoria operacional.",
    useCases: [
      "Malhas oscilando, ciclos longos, paradas recorrentes ou baixa visibilidade de causa.",
      "SCADA lento, historian pesado, servidores saturados ou rede instável.",
      "Bateladas com variação de tempo, desvios e retomadas difíceis.",
      "Alarmes excessivos e pouco acionáveis.",
    ],
    howIntegraActs: [
      "Analisa dados, logs, tendências, alarmes, rede e comportamento operacional.",
      "Identifica gargalos técnicos e separa sintoma de causa raiz.",
      "Propõe ajustes faseados, mensuráveis e com risco controlado.",
      "Documenta antes/depois e recomenda rotina de acompanhamento.",
    ],
    deliverables: [
      "Diagnóstico de performance por sistema.",
      "Lista priorizada de gargalos e causas prováveis.",
      "Ajustes de controle, HMI, rede, historian ou servidores quando aplicável.",
      "Indicadores de antes/depois.",
      "Plano de sustentação e monitoramento.",
    ],
    standards: [
      { code: "Historian", description: "Base de análise" },
      { code: "PID", description: "Controle regulatório" },
      { code: "ISA-18.2", description: "Alarmes" },
      { code: "Batch", description: "Ciclo e repetibilidade" },
    ],
    faq: [
      {
        q: "Vocês garantem ganho percentual?",
        a: "Não sem diagnóstico. Trabalhamos com evidência e metas técnicas realistas; promessas genéricas não combinam com operação crítica.",
      },
      {
        q: "Dá para otimizar sem parar?",
        a: "Muitas análises são passivas. Ajustes de controle e arquitetura, porém, precisam de janela, teste e validação com operação.",
      },
      {
        q: "Lentidão em SCADA é sempre rede?",
        a: "Frequentemente, mas não sempre. Pode ser tag scan ineficiente, query ao Historian, redraw de tela mal otimizado, falta de cache local, ou contenção de CPU no servidor. Diagnosticamos camada por camada.",
      },
      {
        q: "Otimização exige troca de hardware?",
        a: "Nem sempre. Muitas vezes ajuste de polling rate, configuração de driver, filtro de tags, indexação de banco e revisão de telas resolve. Hardware vem quando arquitetura está bem dimensionada e ainda há gargalo.",
      },
      {
        q: "Como medir performance de SCADA antes e depois?",
        a: "Métricas claras: tempo de carregamento de tela, latência de comando, taxa de update real vs configurada, uso de CPU/memória, latência de rede para PLCs. Antes/depois com mesma metodologia mostra ganho real.",
      },
      {
        q: "Vale otimizar SCADA legado ou substituir?",
        a: "Análise de TCO comparando custo de otimizar + manter vs custo de substituir + migrar. A decisão depende do horizonte da planta, da disponibilidade de spare e da viabilidade operacional do legado. O critério é financeiro e operacional, não emocional.",
      },
    ],
    relatedSolutions: serviceRelated,
    relatedTech: ["factorytalk-historian", "intertravamentos-sequencias", "factorytalk-batch"],
  },
  {
    slug: "documentacao-handover-treinamento",
    group: "Serviços de Engenharia",
    type: "Serviço",
    title: "Documentação, Handover e Treinamento",
    shortTitle: "Handover Técnico",
    description:
      "Data books, as-built, diagramas, descrições funcionais, manuais, padrões, treinamento e transferência real de conhecimento.",
    intro:
      "Projeto sem handover vira dependência. A Integra trata documentação e treinamento como parte da entrega técnica: o sistema precisa operar, ser mantido e evoluir sem depender exclusivamente de quem implantou.",
    image: cpwePlantwideZoning,
    imageAlt: "Plant-wide zoning em níveis 0-5: Cell/Area, Site Operations e Data Center",
    imageTitle: "Documentar handover exige enxergar a planta em zonas e níveis",
    imageSource: cpweDeepDiveSource,
    imageCaption: "A documentação que entregamos respeita a estrutura de zonas e níveis da planta para que qualquer engenheiro entenda o sistema.",
    useCases: [
      "Projetos novos que precisam nascer com data book e as-built.",
      "Sistemas antigos sem diagramas, comentários, matriz funcional ou backup confiável.",
      "Handover para manutenção, operação, engenharia e TI/OT.",
      "Treinamento técnico pós-startup para reduzir dependência externa.",
    ],
    howIntegraActs: [
      "Define índice de documentação desde o início do projeto.",
      "Mantém as-built, backups, listas e matrizes atualizadas durante execução.",
      "Prepara treinamento por perfil: operação, manutenção, engenharia e suporte.",
      "Entrega materiais práticos, ligados ao sistema real, não apresentações genéricas.",
    ],
    deliverables: [
      "Data book técnico do sistema.",
      "Diagramas de arquitetura, rede e interfaces.",
      "Descrição funcional, matrizes e listas de tags/equipamentos.",
      "Backups versionados e instruções de restauração.",
      "Treinamento e registro de handover por perfil.",
    ],
    standards: [
      { code: "As-built", description: "Documentação final" },
      { code: "Data book", description: "Pacote técnico" },
      { code: "Handover", description: "Transferência de conhecimento" },
      { code: "Governança", description: "Manutenção futura" },
    ],
    faq: [
      {
        q: "Documentação vem no final?",
        a: "Ela fecha no final, mas começa no início. Se for deixada para depois, nasce incompleta e desconectada da execução real.",
      },
      {
        q: "Treinamento é operacional ou técnico?",
        a: "Pode ser ambos. Normalmente separamos operação, manutenção e engenharia para que cada público receba o que realmente usa.",
      },
      {
        q: "O que entra num data book industrial?",
        a: "Memorial técnico, descritivos funcionais, narrativas de controle, matriz causa-efeito, lista de I/O, configuração de servidores e rede, plano de testes executado, certificados de aceite, procedimentos de operação e manutenção, lista de spare. Sem isso, o cliente vira refém do integrador.",
      },
      {
        q: "Quem treina os operadores: Integra ou fornecedor?",
        a: "Treinamento de operação (uso da HMI, navegação, alarmes) é da Integra como parte do handover. Treinamento de produto profundo (Rockwell, Schneider) é do fabricante via canal autorizado.",
      },
      {
        q: "Quanto dura um treinamento de operação?",
        a: "A duração depende da complexidade da aplicação e do perfil dos usuários. Treinamentos podem ser de poucas horas a vários dias, sempre com prática em ambiente espelho e material entregável (apresentação, manual e procedimentos de operação).",
      },
      {
        q: "Documentação fica em PDF ou em sistema vivo?",
        a: "Os dois. PDF para consulta offline e auditoria. Sistema vivo (Confluence, SharePoint, wiki) para evolução contínua sem versionar arquivo. Cada cliente decide a política; nós entregamos nos dois formatos.",
      },
    ],
    relatedSolutions: serviceRelated,
    relatedTech: ["auditoria-conformidade", "manutencao-corretiva-preventiva", "plantpax-5x"],
  },
  {
    slug: "migracao-plc5-slc500",
    group: "Serviços de Engenharia",
    type: "Serviço",
    title: "Migração PLC5/SLC500 para Logix",
    shortTitle: "Migração PLC5/SLC500",
    description:
      "Modernização de controladores legados para ControlLogix ou CompactLogix com inventário, simulação, FAT/SAT, cutover e rollback.",
    intro:
      "Migrar PLC legado não é trocar CPU. É entender campo, lógica, redes, HMI, alarmes, intertravamentos e risco operacional. A Integra conduz a modernização com engenharia e documentação, preservando comportamento necessário e removendo dívida técnica onde fizer sentido.",
    image: controllogixReference,
    imageAlt: "Arquitetura ControlLogix de alta disponibilidade",
    imageTitle: "Modernização para Logix precisa de arquitetura e cutover controlado",
    imageSource: logixSource,
    imageCaption:
      "Referência visual pública com referência Logix para contextualizar redes, controladores e disponibilidade em modernizações.",
    theme: "ot",
    useCases: [
      "PLC5, SLC500 ou redes antigas sustentando áreas críticas.",
      "Dificuldade de manutenção, peças, backup, diagnóstico e expansão.",
      "Modernização de painéis, I/O, HMI e comunicação industrial.",
      "Projetos com janelas curtas e necessidade de rollback.",
    ],
    howIntegraActs: [
      "Inventaria hardware, I/O, lógica, redes, telas, alarmes e dependências.",
      "Define estratégia de migração faseada e arquitetura alvo.",
      "Converte e reestrutura lógica para Logix com validação funcional.",
      "Executa FAT/SAT, cutover, acompanhamento de startup e handover.",
    ],
    deliverables: [
      "Inventário legado e matriz de risco.",
      "Arquitetura alvo ControlLogix/CompactLogix.",
      "Lógica migrada, comentada e estruturada.",
      "Plano de cutover, rollback, FAT e SAT.",
      "As-built, backups e treinamento de manutenção.",
    ],
    standards: [
      { code: "PLC5", description: "Legado" },
      { code: "SLC500", description: "Legado" },
      { code: "ControlLogix", description: "Arquitetura alvo" },
      { code: "FAT/SAT", description: "Teste e aceite" },
      { code: "Rollback", description: "Retorno seguro" },
    ],
    faq: [
      {
        q: "A migração sempre precisa trocar I/O?",
        a: "Não sempre. A decisão depende de obsolescência, risco, compatibilidade, estado dos painéis e estratégia de parada.",
      },
      {
        q: "Vocês mantêm a lógica igual?",
        a: "Preservamos o comportamento operacional necessário, mas aproveitamos a migração para estruturar, documentar e corrigir dívidas técnicas quando aprovado.",
      },
      {
        q: "PLC-5 ainda tem suporte em 2026?",
        a: "Linha foi descontinuada em 2017. Rockwell mantém serviço de troubleshooting limitado, mas peça nova ou firmware fix não há mais. Planta com PLC-5 em operação crítica está em risco de obsolescência ativa.",
      },
      {
        q: "Posso migrar PLC-5/SLC500 mantendo a lógica como está?",
        a: "ControlLogix tem ferramenta de tradução automática (Translation Tool), mas a saída é lógica funcional, não otimizada. Migração séria reescreve a lógica para padrão moderno, mantendo descritivos funcionais como referência.",
      },
      {
        q: "O que define o esforço de uma migração PLC-5/SLC500?",
        a: "Tamanho do programa, contagem de I/O, complexidade da lógica (intertravamentos, sequenciamento, controle regulatório), reaproveitamento da fiação de campo (1492 wiring system) e requisitos de cibersegurança e integração futura. O cliente recebe escopo, cronograma e proposta específica após o diagnóstico.",
      },
      {
        q: "Migração exige parada de planta?",
        a: "Em planta de processo contínuo, normalmente exige janela única de cutover com plano detalhado. Em planta com áreas independentes, fasamos por área para reduzir impacto operacional. Toda migração passa por ambiente espelho de homologação antes do cutover.",
      },
    ],
    relatedSolutions: [
      { href: "/solucoes/migracao-plc", label: "Solução Migração PLC" },
      { href: "/solucoes/redes-iec-62443", label: "Redes Industriais" },
    ],
    relatedTech: ["controllogix-compactlogix", "controle-regulatorio-pid", "factorytalk-view-se"],
  },
  {
    slug: "tc-devicewise",
    group: "Dados Industriais e IIoT",
    type: "Software",
    title: "TC deviceWISE",
    shortTitle: "TC deviceWISE",
    description:
      "Plataforma IIoT da Telit Cinterion para conectar ativos industriais, executar lógica no edge e integrar dados OT com sistemas de negócio.",
    intro:
      "TC deviceWISE entra quando a planta precisa transformar dados industriais em integração real: PLCs, sensores, gateways, bancos, APIs, MQTT, dashboards e sistemas corporativos trabalhando com rastreabilidade. A Integra aplica a plataforma como integradora de sistemas, conectando OT e TI sem tratar IoT como painel bonito.",
    image: devicewiseEletronorArchitecture,
    imageAlt: "Plataforma IIoT deviceWISE, dispositivos de produção, deviceWISE VIEW, dashboards em nuvem (Azure, GCP, AWS) e integração com sistemas empresariais (SAP, Oracle, MES, ERP)",
    imageTitle: "Arquitetura deviceWISE: do chão de fábrica aos sistemas empresariais",
    imageSource: telitEletronorSource,
    imageCaption:
      "Print público da apresentação Telit Cinterion + Eletronor (Eletroday): deviceWISE conecta dispositivos de produção a dashboards e sistemas empresariais, com integração nativa para nuvem e bancos de dados corporativos.",
    useCases: [
      "Coleta de dados de PLCs, sensores, equipamentos e sistemas multi-vendor.",
      "Gateway industrial para enviar dados a bancos, APIs, MQTT, sistemas corporativos ou nuvem.",
      "Triggers e fluxos no-code para eventos, alarmes, condições e integrações OT/IT.",
      "Projetos de retrofit onde a planta precisa evoluir dados sem reescrever toda a automação.",
    ],
    howIntegraActs: [
      "Mapeia ativos, protocolos, redes, tags, frequência de coleta e destino dos dados.",
      "Define arquitetura edge/cloud, gateways, drivers, segurança, usuários e retenção.",
      "Configura conectores, triggers, fluxos, dashboards e integrações com sistemas externos.",
      "Documenta tags, regras, endpoints, testes e rotina de sustentação para manutenção futura.",
    ],
    deliverables: [
      "Arquitetura deviceWISE com gateway, fontes de dados, destinos e premissas de segurança.",
      "Mapa de tags, drivers, protocolos e cadência de coleta.",
      "Fluxos, triggers e integrações com bancos, APIs, MQTT ou sistemas corporativos.",
      "Painéis iniciais e evidências de teste de comunicação.",
      "Runbook de operação, backup de configuração e handover técnico.",
    ],
    standards: [
      { code: "deviceWISE", description: "Plataforma IIoT" },
      { code: "MQTT", description: "Mensageria industrial" },
      { code: "OPC UA", description: "Interoperabilidade OT" },
      { code: "Modbus TCP", description: "Conectividade legado" },
      { code: "REST/API", description: "Integração TI" },
      { code: "Edge", description: "Processamento local" },
    ],
    faq: [
      {
        q: "deviceWISE substitui SCADA ou historian?",
        a: "Não necessariamente. Ele pode complementar SCADA, historian e MES ao organizar conectividade, eventos e integração OT/IT. A arquitetura define se ele coleta, transforma, publica ou apenas conecta dados.",
      },
      {
        q: "Dá para conectar equipamentos de fabricantes diferentes?",
        a: "Sim. Esse é um dos pontos fortes em projetos multi-vendor: avaliar protocolos, drivers e gateways para criar uma camada de integração sem depender de uma única família de PLC.",
      },
      {
        q: "deviceWISE compete com Kepware?",
        a: "Concorrentes em parte. Kepware é forte em conectividade multi-vendor; deviceWISE adiciona lógica edge (triggers, regras), modelagem de fluxo e integração nativa com sistemas de negócio. Para retrofit IIoT, deviceWISE é mais self-contained.",
      },
      {
        q: "deviceWISE roda em hardware industrial?",
        a: "Sim. Suporta gateways e IPCs industriais (Eurotech, Advantech, Dell Edge) e VMs Linux/Windows. Para planta com ambiente Linux industrial, é caminho natural.",
      },
      {
        q: "Quanto custa o deviceWISE?",
        a: "Modelo de assinatura por gateway + módulos. Custo varia conforme volume e features (cloud, on-prem, conectores específicos). Pay-as-you-grow permite começar pequeno e escalar conforme retorno aparece.",
      },
      {
        q: "Posso integrar deviceWISE com SAP / Oracle?",
        a: "Sim. Plataforma traz conectores para REST, SOAP, ODBC, MQTT, Kafka, OPC UA, AMQP. Integrar com SAP ECC, S/4HANA, Oracle ERP é caso comum em projetos de rastreabilidade.",
      },
    ],
    relatedSolutions: dataRelated,
    relatedTech: ["edge-computing-industrial", "thingworx-kepware", "factorytalk-datamosaix", "protocolos-industriais"],
  },
  {
    slug: "tia-portal",
    group: "Controle e DCS",
    type: "Software",
    title: "Siemens TIA Portal",
    shortTitle: "TIA Portal",
    description:
      "Ambiente Siemens para engenharia de PLCs, IHMs, redes PROFINET e drives em arquiteturas SIMATIC modernas.",
    intro:
      "TIA Portal concentra engenharia de controladores, IHMs, redes e acionamentos Siemens em um fluxo integrado. A Integra atende projetos com TIA Portal em versões antigas e atuais, principalmente quando a planta já possui base SIMATIC e precisa manter, expandir ou padronizar sistemas sem perder governança.",
    image: tiaSelectionTool,
    imageAlt: "TIA Selection Tool, interface de configuração rápida de portfólio Siemens com TIA Portal e SIMATIC",
    imageTitle: "TIA Selection Tool: a porta de entrada do TIA Portal",
    imageSource: simaticSt70Source,
    imageCaption: "Print público do catálogo SIMATIC ST 70 (2025): TIA Selection Tool é a ferramenta gratuita Siemens para configurar projetos no TIA Portal, com QR e versão desktop ou nuvem.",
    useCases: [
      "Programação e manutenção de PLCs SIMATIC S7-1200 e S7-1500.",
      "Expansão de sistemas existentes com IHMs, redes PROFINET e bibliotecas de projeto.",
      "Padronização de blocos, tags, telas, alarmes e critérios de diagnóstico.",
      "Migração gradual de projetos clássicos para ambientes Siemens mais atuais.",
    ],
    howIntegraActs: [
      "Analisa versão, hardware, licenças, rede, backups e dependências do projeto.",
      "Organiza blocos, tags, comentários, telas e diagnósticos com padrão de manutenção.",
      "Valida comunicação PROFINET, dispositivos, drives e integração com supervisórios.",
      "Entrega backups, documentação, evidências de teste e orientação de sustentação.",
    ],
    deliverables: [
      "Backup e baseline do projeto TIA Portal.",
      "Padrão de blocos, tags, comentários, alarmes e telas.",
      "Configuração e validação de PLC, IHM, rede e dispositivos associados.",
      "Plano de testes e evidências de comissionamento.",
      "Documentação as-built e handover para manutenção.",
    ],
    standards: [
      { code: "TIA Portal", description: "Engenharia integrada" },
      { code: "S7-1200", description: "PLC compacto" },
      { code: "S7-1500", description: "PLC modular" },
      { code: "PROFINET", description: "Rede industrial" },
      { code: "WinCC", description: "HMI/SCADA Siemens" },
      { code: "Startdrive", description: "Drives no TIA Portal" },
    ],
    faq: [
      {
        q: "A Integra é integradora certificada Siemens?",
        a: "Não tratamos Siemens como certificação formal no site. É uma família de tecnologias atendidas pela equipe, com experiência prática e treinamentos específicos.",
      },
      {
        q: "Vocês atendem versões antigas do TIA Portal?",
        a: "Sim. A primeira etapa é confirmar versão, hardware, firmware e licenças para evitar conversões arriscadas ou perda de compatibilidade.",
      },
      {
        q: "TIA Portal substitui o STEP 7 Classic?",
        a: "Para projetos novos, sim, Siemens descontinuou novo desenvolvimento em STEP 7 Classic. Base instalada com STEP 7 Classic continua suportada para manutenção, mas evolução exige migração para TIA Portal.",
      },
      {
        q: "TIA Portal é compatível com S7-300 e S7-400?",
        a: "Suporta S7-300/400 em modo legacy, mas a vantagem real está em S7-1500 (foco do TIA Portal). Migração de 300/400 para 1500 é projeto à parte, com retrabalho de hardware.",
      },
      {
        q: "Posso versionar projeto TIA Portal em Git?",
        a: "Indiretamente. TIA Portal salva projeto em formato proprietário; Git rastreia, mas diff/merge não funcionam bem. Para versionamento real, exporta blocos para SCL ou usa TIA Portal Multiuser Engineering.",
      },
      {
        q: "Como funciona o licenciamento TIA Portal?",
        a: "Modelo Siemens por engenheiro/instalação ou floating, com módulos contratados separadamente (STEP 7 Professional, WinCC Professional, Startdrive). A cotação é feita pela própria Siemens ou por canal autorizado, conforme volume e perfil de uso.",
      },
    ],
    relatedSolutions: multiVendorRelated,
    relatedTech: ["simatic-manager-step7", "siemens-wincc-pcs7", "siemens-redes-industriais"],
  },
  {
    slug: "simatic-manager-step7",
    group: "Controle e DCS",
    type: "Software",
    title: "SIMATIC Manager e STEP 7 Classic",
    shortTitle: "SIMATIC Manager / STEP 7",
    description:
      "Manutenção, diagnóstico e evolução de sistemas Siemens legados com STEP 7 Classic, S7-300, S7-400 e arquiteturas anteriores.",
    intro:
      "Muitas plantas ainda rodam em SIMATIC Manager, STEP 7 Classic, S7-300, S7-400 e redes industriais antigas. A Integra trata esses sistemas como ativos críticos: antes de mexer, entende backup, comunicação, símbolos, blocos, intertravamentos e impacto de parada.",
    image: simaticStep7Classic,
    imageAlt: "SIMATIC Programmable Logic Controllers ST 70 - engenheiro em painéis com tablet",
    imageTitle: "STEP 7 Classic continua presente em base instalada",
    imageSource: simaticStep7Source,
    imageCaption: "Imagem pública do catálogo Siemens ST 70: STEP 7 Classic ainda atende grande parte da base instalada.",
    useCases: [
      "Diagnóstico e manutenção de PLCs S7-300 e S7-400.",
      "Correções em lógicas legadas com blocos, símbolos e comentários incompletos.",
      "Backup, restauração, comparação de versões e documentação de programas existentes.",
      "Planejamento de migração para TIA Portal, S7-1500 ou nova arquitetura.",
    ],
    howIntegraActs: [
      "Levanta versão de software, firmware, cartões, redes, backups e senhas disponíveis.",
      "Cria baseline antes de qualquer intervenção e registra diferenças encontradas.",
      "Analisa blocos, DBs, intertravamentos, comunicação e interface com supervisório.",
      "Planeja alterações com janela, teste, rollback e documentação.",
    ],
    deliverables: [
      "Backup validado e inventário do sistema legado.",
      "Mapa de PLCs, redes, blocos, interfaces e pontos críticos.",
      "Relatório de riscos e recomendações de modernização.",
      "Alterações documentadas com evidências de teste.",
      "Plano de migração ou sustentação para ciclo de vida.",
    ],
    standards: [
      { code: "STEP 7", description: "Engenharia clássica" },
      { code: "S7-300", description: "PLC legado" },
      { code: "S7-400", description: "PLC legado" },
      { code: "PROFIBUS", description: "Rede industrial" },
      { code: "PROFINET", description: "Rede industrial" },
      { code: "Rollback", description: "Retorno controlado" },
    ],
    faq: [
      {
        q: "Vale migrar tudo de uma vez?",
        a: "Nem sempre. Sistemas legados precisam de matriz de risco, disponibilidade de peças, criticidade operacional e janela de parada antes de definir ritmo de migração.",
      },
      {
        q: "Vocês trabalham com projetos sem documentação?",
        a: "Sim, mas com cuidado maior. Primeiro preservamos evidências, backup e comportamento existente; depois propomos correção ou reestruturação.",
      },
      {
        q: "STEP 7 Classic ainda recebe updates?",
        a: "Apenas correções críticas. Siemens orienta migração para TIA Portal em projetos novos. Para base instalada com S7-300/400, STEP 7 Classic continua viável para manutenção por mais alguns anos.",
      },
      {
        q: "Posso ler projeto STEP 7 Classic no TIA Portal?",
        a: "Sim, via wizard de migração. A migração preserva lógica funcional, mas tags, comentários e estrutura de programa podem precisar ajuste manual. Para projetos grandes, prevemos retrabalho de 20-40%.",
      },
      {
        q: "Qual a diferença prática entre STL, LAD, FBD e SCL no STEP 7?",
        a: "STL é assembly Siemens, máxima performance, baixa legibilidade. LAD/FBD são gráficos, fáceis de manter. SCL é texto estruturado, equivalente a IEC 61131 ST. Cada equipe de manutenção tem preferência; escolhemos mantendo legibilidade.",
      },
      {
        q: "Migrar de STEP 7 Classic para TIA Portal é caro?",
        a: "O custo concentra-se em retrabalho de engenharia, não em licença. O esforço varia conforme volume de lógica STL/LAD, complexidade dos blocos, descritivos disponíveis e exigências de teste. Faseamos por área crítica.",
      },
    ],
    relatedSolutions: multiVendorRelated,
    relatedTech: ["tia-portal", "siemens-wincc-pcs7", "migracao-plc5-slc500"],
  },
  {
    slug: "siemens-wincc-pcs7",
    group: "Supervisão e Operação",
    type: "Software",
    title: "SIMATIC WinCC e PCS 7",
    shortTitle: "SIMATIC WinCC / PCS 7",
    description:
      "Sistemas Siemens de supervisão, operação e processo, incluindo WinCC clássico, WinCC 7.x, WinCC Unified e bases PCS 7 quando aplicável.",
    intro:
      "WinCC e PCS 7 aparecem em plantas que precisam operar processo, telas, alarmes, históricos e diagnósticos dentro do ecossistema Siemens. A Integra atende manutenção, evolução e integração desses ambientes, deixando claro que a atuação é técnica e não um selo formal de integrador Siemens.",
    image: siemensNetworkLayer2,
    imageAlt: "Arquitetura de rede Siemens em camadas para manufatura, WinCC e PCS 7 vivem na camada de supervisão sobre a infraestrutura industrial",
    imageTitle: "Onde WinCC e PCS 7 operam na arquitetura Siemens em camadas",
    imageSource: siemensNetworkRefSource,
    imageCaption:
      "Print público da Network Reference Architecture for Discrete Manufacturing (Siemens AG, Article 109802750): WinCC e PCS 7 ocupam a camada de supervisão sobre o controle SIMATIC. Projetos são avaliados conforme versão, licenças, arquitetura e ciclo de vida.",
    useCases: [
      "Manutenção e evolução de supervisórios Siemens existentes.",
      "Padronização de telas, alarmes, históricos, usuários e diagnósticos.",
      "Integração de WinCC com PLCs SIMATIC, redes e sistemas externos.",
      "Apoio técnico em ambientes PCS 7 quando há necessidade de diagnóstico e evolução controlada.",
    ],
    howIntegraActs: [
      "Levanta versão, arquitetura, servidores, clientes, licenças, tags e dependências.",
      "Organiza telas, alarmes, permissões, históricos e comunicação com PLCs.",
      "Planeja mudanças sem quebrar operação, com teste de navegação, comandos e alarmes.",
      "Documenta arquitetura, backups, parâmetros críticos e rotina de restauração.",
    ],
    deliverables: [
      "Inventário de arquitetura WinCC/PCS 7.",
      "Backup e baseline de aplicação.",
      "Padrões de telas, alarmes, tags, usuários e históricos.",
      "Plano de teste funcional e evidências de operação.",
      "Documentação as-built e orientação de suporte.",
    ],
    standards: [
      { code: "WinCC", description: "Supervisão Siemens" },
      { code: "PCS 7", description: "Process control system" },
      { code: "HMI", description: "Operação" },
      { code: "Alarmes", description: "Governança" },
      { code: "Historian", description: "Dados operacionais" },
    ],
    faq: [
      {
        q: "PCS 7 é foco principal da Integra?",
        a: "Não é o foco principal atual. A Integra possui treinamento e atende necessidades técnicas específicas, mas o posicionamento central continua em Rockwell/PlantPAx e integração multi-vendor.",
      },
      {
        q: "WinCC clássico ainda pode ser mantido?",
        a: "Sim, desde que versão, licenças, sistema operacional e backups sejam avaliados. Em alguns casos a recomendação será sustentação controlada; em outros, roadmap de modernização.",
      },
      {
        q: "WinCC é o mesmo que PCS 7?",
        a: "Não. WinCC é SCADA. PCS 7 é DCS Siemens, com WinCC como camada de operação por baixo, mais bibliotecas de processo, batch, alarmes e governança. PCS 7 é equivalente Siemens ao PlantPAx Rockwell.",
      },
      {
        q: "WinCC Unified substitui WinCC Classic?",
        a: "Para projetos novos, é a recomendação. WinCC Unified é arquitetura web/HTML5, escalável e moderna. WinCC Classic continua mantida para base instalada. Migração é projeto, não update.",
      },
      {
        q: "PCS 7 e PlantPAx convivem na mesma planta?",
        a: "Sim, em plantas com áreas Siemens e Rockwell. Integração via OPC UA na camada de informação, com governança plant-wide unificada (alarmes, KPI, historian). Não é raro em multi-fabricante.",
      },
      {
        q: "Quanto demora um upgrade de PCS 7?",
        a: "Upgrade de versão major (ex.: V8 → V9) é projeto de engenharia, com homologação, treinamento e cutover planejados. Versões minor (ex.: V9.0 → V9.1) costumam ser mais rápidas. O cronograma específico depende do escopo da planta e das integrações existentes.",
      },
    ],
    relatedSolutions: multiVendorRelated,
    relatedTech: ["tia-portal", "simatic-manager-step7", "elipse-e3", "factorytalk-view-se"],
  },
  {
    slug: "siemens-redes-industriais",
    group: "Redes e Cibersegurança OT",
    type: "Tecnologia",
    title: "Redes Siemens, PROFINET e Startdrive",
    shortTitle: "Siemens Redes / Startdrive",
    description:
      "Redes industriais Siemens, PROFINET, Industrial Ethernet, diagnóstico de comunicação e integração de drives via Startdrive.",
    intro:
      "Projetos Siemens dependem de rede bem estruturada: endereçamento, topologia, PROFINET, switches industriais, diagnóstico, drives e comunicação com supervisórios. A Integra aplica conhecimento de redes industriais e treinamento CPIN-Level para sustentar essa camada com método.",
    image: siemensNetworkUserView,
    imageAlt: "Visão de usuário Siemens, Enterprise network, Industrial network, Backbone, Aggregation e Cell zones",
    imageTitle: "Siemens em camadas: Enterprise, Industrial, Backbone, Aggregation, Cell",
    imageSource: siemensNetworkUserViewSource,
    imageCaption: "Print público da Network Reference Architecture for Discrete Manufacturing (Siemens AG, Article 109802750 V2.0): a arquitetura Siemens divide a planta em camadas claras desde Enterprise até Cell, base para projetar, segmentar e auditar redes industriais.",
    theme: "ot",
    useCases: [
      "Diagnóstico de falhas de comunicação PROFINET ou Industrial Ethernet.",
      "Comissionamento e ajuste de drives SINAMICS via Startdrive.",
      "Organização de topologia, endereçamento, nomes de dispositivo e diagnóstico.",
      "Integração de PLC, IHM, drives, switches e supervisório em projetos Siemens.",
    ],
    howIntegraActs: [
      "Mapeia topologia, dispositivos, nomes, IPs, firmware e sintomas de falha.",
      "Valida comunicação, diagnóstico, parametrização e dependências de rede.",
      "Documenta arquitetura, pontos críticos e critérios de manutenção.",
      "Recomenda melhorias de segmentação, disponibilidade e governança de acesso quando necessário.",
    ],
    deliverables: [
      "Mapa de rede e inventário de dispositivos Siemens.",
      "Checklist de comunicação, diagnóstico e parametrização.",
      "Configuração ou revisão de drives quando aplicável.",
      "Relatório de riscos e recomendações de segmentação.",
      "Backup e documentação de parâmetros relevantes.",
    ],
    standards: [
      { code: "PROFINET", description: "Rede Siemens" },
      { code: "Industrial Ethernet", description: "Camada OT" },
      { code: "Startdrive", description: "Drives" },
      { code: "SINAMICS", description: "Acionamentos" },
      { code: "CPIN", description: "Treinamento redes industriais" },
    ],
    faq: [
      {
        q: "Rede Siemens é só configurar IP?",
        a: "Não. PROFINET envolve nomes de dispositivo, topologia, diagnóstico, tempo de atualização, switches, firmware e dependência entre PLC, I/O, drives e supervisório.",
      },
      {
        q: "Vocês podem atuar junto com TI?",
        a: "Sim. O ponto é traduzir necessidades OT para uma arquitetura que TI consiga governar sem comprometer operação, disponibilidade e manutenção.",
      },
      {
        q: "Profinet é o mesmo que EtherNet/IP?",
        a: "Ambos rodam sobre Ethernet, mas pilhas são diferentes. EtherNet/IP usa CIP (padrão ODVA, origem Rockwell). Profinet é padrão aberto da PROFIBUS & PROFINET International (PI, origem Siemens), normalizado na IEC 61158/61784 e implementado por vários fabricantes. Não falam diretamente, para integração, usamos gateways CIP↔Profinet.",
      },
      {
        q: "SCALANCE substitui Stratix?",
        a: "São equivalentes em camada (switches industriais gerenciados), de fabricantes diferentes. Em planta Siemens-centric, SCALANCE é o natural; em planta Rockwell, Stratix. Mistura é viável com cuidado de configuração de portas.",
      },
      {
        q: "Profinet IRT é necessário para automação de máquina?",
        a: "Para sincronização precisa (motion, eixos coordenados), sim, IRT garante determinismo sub-microssegundo. Para automação de processo padrão, RT é suficiente. Custo de IRT em rede e dispositivos é maior.",
      },
      {
        q: "Posso ter rede Profinet com switches Cisco IE?",
        a: "Sim. Os switches Cisco IE (IE3x00, IE4000) são certificados Profinet Conformance Class B: suportam LLDP com extensões PNIO, DCP, GSDML e diagnóstico de topologia no TIA Portal. A limitação real frente ao SCALANCE é IRT (Conformance Class C), necessário para motion sincronizado; nesse caso, o caminho é SCALANCE ou switch com suporte a IRT.",
      },
    ],
    relatedSolutions: cyberRelated,
    relatedTech: ["tia-portal", "protocolos-industriais", "monitoramento-redes-industriais", "iec-62443-nist-ot"],
  },
  {
    slug: "elipse-e3",
    group: "Supervisão e Operação",
    type: "Software",
    title: "Elipse E3",
    shortTitle: "Elipse E3",
    description:
      "Supervisório brasileiro robusto para operação, alarmes, históricos e integração com múltiplas famílias de PLCs e sistemas industriais.",
    intro:
      "Elipse E3 é uma solução brasileira reconhecida em supervisão industrial, usada para conectar PLCs, servidores, clientes, históricos, alarmes e operação remota. A Integra desenvolve e mantém sistemas E3 em plantas multi-vendor, com foco em telas coerentes, comunicação confiável e documentação.",
    image: elipseE3Reference,
    imageAlt: "Diagrama de arquitetura Elipse E3 com PLCs, servidores, viewers e acesso remoto",
    imageTitle: "Elipse E3 como camada supervisória multi-vendor",
    imageSource: elipseE3Source,
    imageCaption:
      "Referência visual pública Elipse para explicar arquitetura de servidores, viewers, dispositivos e camadas de acesso.",
    useCases: [
      "Desenvolvimento de supervisórios para plantas com PLCs de diferentes fabricantes.",
      "Modernização de telas, alarmes, históricos, usuários e relatórios.",
      "Integração de operação local, clientes remotos, bancos de dados e dispositivos de campo.",
      "Sustentação de aplicações E3 existentes com documentação e backup.",
    ],
    howIntegraActs: [
      "Define arquitetura de servidores, viewers, drivers, bancos, tags e permissões.",
      "Padroniza telas, objetos, alarmes, históricos e navegação operacional.",
      "Configura comunicação com PLCs e valida perda/retorno de comunicação.",
      "Entrega backup, documentação e orientação de manutenção para evolução futura.",
    ],
    deliverables: [
      "Arquitetura Elipse E3 documentada.",
      "Lista de tags, drivers, telas, alarmes e históricos.",
      "Padrões de navegação, objetos e permissões.",
      "Plano de teste de comunicação, comandos e alarmes.",
      "Backup de aplicação e handover técnico.",
    ],
    standards: [
      { code: "Elipse E3", description: "SCADA/HMI" },
      { code: "OPC", description: "Integração" },
      { code: "SQL", description: "Históricos e relatórios" },
      { code: "Multi-vendor", description: "PLCs diversos" },
      { code: "Alarmes", description: "Operação" },
    ],
    faq: [
      {
        q: "Elipse E3 funciona com PLCs de vários fabricantes?",
        a: "Sim. A viabilidade depende de drivers, protocolos e arquitetura de rede. A Integra avalia cada comunicação antes de fechar escopo.",
      },
      {
        q: "Dá para modernizar uma aplicação existente sem refazer tudo?",
        a: "Em muitos casos, sim. O diagnóstico separa o que deve ser preservado do que precisa ser padronizado, documentado ou redesenhado.",
      },
      {
        q: "Elipse E3 está sendo descontinuado?",
        a: "Não. A Elipse mantém o E3 ativo, com atualizações e novas versões. O Elipse Plant Manager (EPM) não substitui o E3: é plataforma complementar de historiador e gestão de dados em tempo real (PIMS) que se integra ao E3. Para SCADA/HMI, o E3 segue sendo o produto da Elipse, em projeto novo e em base instalada.",
      },
      {
        q: "E3 lê PLC Rockwell e Siemens?",
        a: "Sim, via drivers nativos (ABCIP para Rockwell, S7 para Siemens) ou OPC, incluindo RSLinx atuando como servidor OPC. Em planta multi-vendor, E3 entra como camada de supervisão neutra que padroniza visualização sobre PLCs heterogêneos.",
      },
      {
        q: "Como funciona o licenciamento Elipse E3?",
        a: "Modelo por servidor e cliente, dimensionado por número de tags e quantidade de clientes simultâneos. A cotação é feita diretamente com a Elipse Software ou via canal autorizado.",
      },
      {
        q: "Quem dá suporte ao Elipse E3 em São Paulo?",
        a: "Elipse Software (Porto Alegre) tem rede de parceiros em todo o Brasil. Para suporte de engenharia (modelagem, telas, scripts, redes), integradores qualificados como Integra atuam em projetos e manutenção evolutiva.",
      },
    ],
    relatedSolutions: multiVendorRelated,
    relatedTech: ["factorytalk-view-se", "siemens-wincc-pcs7", "protocolos-industriais", "tc-devicewise"],
  },
  {
    slug: "schneider-control-expert",
    group: "Controle e DCS",
    type: "Software",
    title: "Schneider EcoStruxure Control Expert",
    shortTitle: "Schneider Control Expert",
    description:
      "Engenharia e manutenção de PLCs Schneider/Modicon em ambientes Control Expert, Unity Pro e arquiteturas de controle menores.",
    intro:
      "A Integra atende tecnologias Schneider em projetos de PLCs, IHMs, supervisórios e equipamentos de menor porte. O escopo não inclui posicionamento como integrador Foxboro DCS; aqui o foco é engenharia aplicada a Control Expert, Unity Pro, Modicon e sistemas de máquina/processo discreto.",
    image: schneiderControlReference,
    imageAlt: "Topologia Schneider EcoStruxure Control Expert",
    imageTitle: "Control Expert organiza engenharia de PLCs Modicon",
    imageSource: schneiderControlSource,
    imageCaption:
      "Referência visual pública Schneider Electric para PLCs, estações de engenharia, rede e diagnóstico no ecossistema EcoStruxure.",
    useCases: [
      "Manutenção e evolução de PLCs Modicon em Control Expert ou Unity Pro.",
      "Diagnóstico de comunicação, I/O, lógica, alarmes e integração com supervisório.",
      "Padronização de backups, comentários, blocos e documentação técnica.",
      "Modernização gradual de sistemas Schneider existentes.",
    ],
    howIntegraActs: [
      "Levanta hardware, versão de software, firmware, rede, backups e dependências.",
      "Analisa lógica, comunicação, I/O, tags e pontos críticos de manutenção.",
      "Executa alterações com teste, janela, rollback e registro técnico.",
      "Entrega documentação, backup e recomendações de sustentação.",
    ],
    deliverables: [
      "Inventário de PLCs Schneider, módulos, redes e versões.",
      "Backup validado e baseline de aplicação.",
      "Alterações documentadas em lógica, comunicação ou diagnóstico.",
      "Plano de teste funcional e evidências.",
      "Relatório de riscos e roadmap de modernização quando necessário.",
    ],
    standards: [
      { code: "Control Expert", description: "Engenharia Schneider" },
      { code: "Unity Pro", description: "Base instalada" },
      { code: "Modicon", description: "PLCs Schneider" },
      { code: "Ethernet", description: "Comunicação" },
      { code: "FAT/SAT", description: "Validação" },
    ],
    faq: [
      {
        q: "Vocês trabalham com Foxboro DCS?",
        a: "Não posicionamos Foxboro DCS como tecnologia atendida principal. O foco Schneider da Integra está em PLCs menores, IHMs, supervisórios e ferramentas EcoStruxure aplicadas à base instalada.",
      },
      {
        q: "Unity Pro e Control Expert são tratados juntos?",
        a: "Sim, dentro do cuidado de versão e compatibilidade. Antes de alterar, avaliamos software, firmware, backup e dependências do sistema.",
      },
      {
        q: "Control Expert substitui o Unity Pro?",
        a: "Sim. Control Expert é o nome novo do Unity Pro, dentro da estratégia EcoStruxure. Funcionalidade equivalente, com ganhos em integração e UX. Migração é update direto, não projeto.",
      },
      {
        q: "Control Expert programa M580 e M340?",
        a: "Sim, ambos. M580 (PLC ePAC moderno) é foco do produto. M340 e Quantum legado também são suportados, com bibliotecas correspondentes.",
      },
      {
        q: "Quanto custa licença Control Expert?",
        a: "Modelo Schneider por engenheiro/instalação. Existe versão Small (M340) e Large (todas as CPUs). Cotação via canal Schneider varia.",
      },
      {
        q: "Posso programar M580 sem Control Expert?",
        a: "Não diretamente, Control Expert é o ambiente oficial. Existem ferramentas paralelas para diagnóstico (EcoStruxure Operator Terminal Expert para HMI; Web Designer para web), mas a lógica é sempre Control Expert.",
      },
    ],
    relatedSolutions: multiVendorRelated,
    relatedTech: ["schneider-machine-expert", "schneider-machine-scada-expert", "protocolos-industriais"],
  },
  {
    slug: "schneider-machine-expert",
    group: "Controle e DCS",
    type: "Software",
    title: "Schneider EcoStruxure Machine Expert",
    shortTitle: "Schneider Machine Expert",
    description:
      "Programação e manutenção de PLCs de máquina Schneider, IHMs e dispositivos em ambientes Machine Expert e bases SoMachine.",
    intro:
      "Machine Expert aparece em máquinas, células e sistemas menores com PLCs Schneider. A Integra atua na manutenção, ajustes, expansão e documentação desses sistemas, conectando lógica, IHM, redes e diagnóstico para que a máquina continue sustentável.",
    image: schneiderMachineReference,
    imageAlt: "Material Schneider EcoStruxure Machine Expert",
    imageTitle: "Machine Expert para automação de máquinas e células",
    imageSource: schneiderMachineSource,
    imageCaption:
      "Referência visual pública Schneider Electric para contextualizar engenharia de máquinas, controladores menores, dispositivos e interface operacional.",
    useCases: [
      "Programação e ajustes em PLCs Schneider de máquinas e equipamentos.",
      "Manutenção de aplicações Machine Expert ou SoMachine.",
      "Integração com IHMs, inversores, sensores, redes e supervisórios.",
      "Padronização de backups, comentários e documentação para manutenção.",
    ],
    howIntegraActs: [
      "Identifica controlador, I/O, versão, firmware, bibliotecas, redes e backup disponível.",
      "Analisa lógica, telas, comunicação e comportamento operacional da máquina.",
      "Executa alterações com validação em campo e critério de rollback.",
      "Documenta parâmetros, versões, backups e pontos críticos.",
    ],
    deliverables: [
      "Backup e inventário de controladores e dispositivos.",
      "Alterações de lógica e IHM documentadas.",
      "Lista de parâmetros críticos e comunicação.",
      "Teste funcional com operação/manutenção.",
      "As-built e recomendações de sustentação.",
    ],
    standards: [
      { code: "Machine Expert", description: "Engenharia de máquina" },
      { code: "SoMachine", description: "Base instalada" },
      { code: "HMI", description: "Operação local" },
      { code: "Modbus TCP", description: "Comunicação" },
      { code: "Ethernet", description: "Rede" },
    ],
    faq: [
      {
        q: "Vocês atendem máquinas com Schneider antigo?",
        a: "Sim, quando há acesso a software, backup e condições de comunicação. O primeiro passo é preservar o estado atual antes de qualquer modificação.",
      },
      {
        q: "Machine Expert entra como solução principal do site?",
        a: "Não. Ele entra como tecnologia atendida dentro da capacidade multi-vendor da Integra, com prioridade menor que Rockwell e deviceWISE.",
      },
      {
        q: "Machine Expert substitui SoMachine?",
        a: "Sim. Machine Expert é o nome moderno e abrangente para programação de máquinas Schneider (Modicon M2xx, M241, M251, M262, M218). SoMachine continua suportado em base instalada, mas projetos novos vão para Machine Expert.",
      },
      {
        q: "Machine Expert programa servoacionamentos Lexium?",
        a: "Sim. Ambiente unificado para PLC Modicon + drives Lexium + I/O TM3/TM5. Bibliotecas PLCopen Motion para controle de eixo coordenado embarcadas.",
      },
      {
        q: "Posso usar Machine Expert para HMI?",
        a: "Para HMI Magelis básico, sim, via Vijeo Designer integrado. Para HMI Magelis Smart com OPC ou interfaces avançadas, Schneider tem EcoStruxure Operator Terminal Expert separadamente.",
      },
      {
        q: "Machine Expert exporta em IEC 61131-3 ST puro?",
        a: "Sim, suporta ST (Structured Text), LD, FBD, IL, SFC. Migração de outros ambientes IEC 61131 é viável, com ajuste de bibliotecas específicas.",
      },
    ],
    relatedSolutions: multiVendorRelated,
    relatedTech: ["schneider-control-expert", "schneider-machine-scada-expert", "protocolos-industriais"],
  },
  {
    slug: "schneider-machine-scada-expert",
    group: "Supervisão e Operação",
    type: "Software",
    title: "Schneider Machine SCADA Expert",
    shortTitle: "Schneider Machine SCADA",
    description:
      "Supervisão, telas, alarmes e comunicação para sistemas Schneider em Machine SCADA Expert e aplicações de operação de máquina.",
    intro:
      "Machine SCADA Expert apoia aplicações de supervisão em máquinas e sistemas de menor porte. A Integra atende esse tipo de ambiente quando a planta precisa manter, revisar ou integrar telas, alarmes, tags e comunicação com PLCs Schneider ou outros dispositivos.",
    image: schneiderScadaReference,
    imageAlt: "Tela de referência Schneider EcoStruxure Machine SCADA Expert",
    imageTitle: "Machine SCADA Expert para operação e supervisão de máquinas",
    imageSource: schneiderScadaSource,
    imageCaption:
      "Referência visual pública Schneider Electric de ambiente SCADA/HMI. A aplicação final depende do hardware, versão e arquitetura existente.",
    useCases: [
      "Manutenção de supervisórios Machine SCADA Expert existentes.",
      "Criação ou revisão de telas, alarmes, usuários, tags e relatórios.",
      "Integração com PLCs Schneider e dispositivos multi-vendor.",
      "Padronização de operação e documentação para manutenção local.",
    ],
    howIntegraActs: [
      "Levanta versão, licenças, tags, drivers, telas, alarmes e comunicação.",
      "Organiza objetos, navegação, permissões, históricos e diagnósticos.",
      "Valida comandos, alarmes, tendências e comportamento em falhas de comunicação.",
      "Entrega backup, documentação e roteiro de restauração.",
    ],
    deliverables: [
      "Inventário da aplicação Machine SCADA Expert.",
      "Padrão de telas, tags, alarmes, usuários e comunicação.",
      "Plano de teste de comandos, navegação, alarmes e históricos.",
      "Backup e documentação as-built.",
      "Recomendações de manutenção e evolução.",
    ],
    standards: [
      { code: "Machine SCADA", description: "Supervisão Schneider" },
      { code: "HMI", description: "Operação" },
      { code: "OPC", description: "Integração" },
      { code: "Modbus", description: "Comunicação" },
      { code: "Alarmes", description: "Governança" },
    ],
    faq: [
      {
        q: "Machine SCADA Expert substitui Elipse ou FactoryTalk?",
        a: "Depende do contexto. Para base Schneider e aplicações de máquina pode fazer sentido. Em plantas maiores, avaliamos arquitetura, licenças e ciclo de vida antes de recomendar caminho.",
      },
      {
        q: "Vocês desenvolvem telas do zero?",
        a: "Sim, quando o diagnóstico mostra que vale refazer. Em sistemas existentes, muitas vezes é melhor padronizar e documentar primeiro.",
      },
      {
        q: "Machine SCADA Expert é o mesmo que InTouch?",
        a: "Não. Machine SCADA Expert (ex-Vijeo XL) usa o mesmo motor do InduSoft Web Studio / AVEVA InTouch Machine Edition (hoje AVEVA Edge), voltado a máquina e área. Vijeo Citect e InTouch clássico evoluíram para AVEVA Plant SCADA e AVEVA InTouch HMI, orientados a planta. AVEVA System Platform cobre planta inteira; Machine SCADA Expert cobre máquina e células.",
      },
      {
        q: "Roda em IPC industrial Schneider?",
        a: "Sim, otimizado para Magelis Industrial PC e Harmony iPC. Funciona também em PC genérico Windows com licença correspondente.",
      },
      {
        q: "Suporta web client?",
        a: "Sim, via thin client web nativo. Útil para acesso de manutenção e supervisão em tablet, com autenticação e perfil de usuário próprios.",
      },
      {
        q: "Diferença prática para AVEVA System Platform?",
        a: "System Platform é orientado a planta (modelagem por templates ArchestrA / Automation Objects no Galaxy, multi-aplicação, histórico massivo). Machine SCADA Expert é orientado a máquina/área (rápido de montar, ideal para skids OEM e integradores de máquina).",
      },
    ],
    relatedSolutions: multiVendorRelated,
    relatedTech: ["schneider-control-expert", "schneider-machine-expert", "elipse-e3"],
  },
];

export const techCatalogBySlug = new Map(techCatalog.map((item) => [item.slug, item]));

export function getTechBySlug(slug: string) {
  return techCatalogBySlug.get(slug);
}

export function getTechByGroup(group: TechGroup) {
  return techCatalog.filter((item) => item.group === group);
}

export function getRelatedTech(items: string[]) {
  return items
    .map((slug) => techCatalogBySlug.get(slug))
    .filter((item): item is TechPage => Boolean(item));
}
