import type { ImageMetadata } from "astro";

import plantpaxReference from "@/assets/manuals/plantpax-reference-medium-pass.jpg";
import batchReference from "@/assets/manuals/factorytalk-batch-operator-prompt.jpg";
import viewSeReference from "@/assets/manuals/factorytalk-view-se-distributed-small.jpg";
import historianReference from "@/assets/manuals/factorytalk-historian-logical-diagram.jpg";
import optixReference from "@/assets/manuals/factorytalk-optix-data-flow.jpg";
import datamosaixReference from "@/assets/manuals/factorytalk-datamosaix-data-flow.jpg";
import datamosaixCpweReference from "@/assets/manuals/factorytalk-datamosaix-cpwe-data.jpg";
import cpweReference from "@/assets/manuals/cpwe-ot-it-bridging.jpg";
import controllogixReference from "@/assets/manuals/controllogix-dlr-converged.jpg";
import securityReference from "@/assets/manuals/factorytalk-security-system.jpg";
import devicewiseReference from "@/assets/manuals/telit-devicewise-platform-introduction.jpg";
import siemensTiaReference from "@/assets/manuals/siemens-tia-portal-engineering.jpg";
import siemensWinccReference from "@/assets/manuals/siemens-wincc-unified-engineering.jpg";
import siemensStartdriveReference from "@/assets/manuals/siemens-startdrive-tia-portal.jpg";
import elipseE3Reference from "@/assets/manuals/elipse-e3-architecture.jpg";
import schneiderControlReference from "@/assets/manuals/schneider-control-expert-topology.jpg";
import schneiderMachineReference from "@/assets/manuals/schneider-machine-expert-engineering.jpg";
import schneiderScadaReference from "@/assets/manuals/schneider-machine-scada-expert.jpg";

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

const plantpaxSource = "Rockwell Automation - PlantPAx System Release 5.40 Reference Manual";
const batchSource = "Rockwell Automation - PlantPAx Batch Design Considerations";
const viewSeSource = "Rockwell Automation - FactoryTalk View SE Reference Architectures";
const historianSource = "Rockwell Automation - FactoryTalk Historian SE Reference Architectures";
const optixSource = "Rockwell Automation - FactoryTalk Optix Reference Architectures";
const dataMosaixSource = "Rockwell Automation - FactoryTalk DataMosaix Reference Architectures";
const cpweSource = "Cisco + Rockwell Automation - CPwE Design and Implementation Guides";
const logixSource = "Rockwell Automation - ControlLogix High Availability Reference Architectures";
const securitySource = "Rockwell Automation - FactoryTalk Security System Design";
const devicewiseSource = "Telit Cinterion - deviceWISE IoT Platform Introduction";
const siemensTiaSource = "Siemens - Totally Integrated Automation Portal";
const siemensWinccSource = "Siemens - SIMATIC WinCC Unified Engineering";
const siemensStartdriveSource = "Siemens - SINAMICS Startdrive / TIA Portal";
const elipseE3Source = "Elipse Software - Elipse E3";
const schneiderControlSource = "Schneider Electric - EcoStruxure Control Expert";
const schneiderMachineSource = "Schneider Electric - EcoStruxure Machine Expert";
const schneiderScadaSource = "Schneider Electric - EcoStruxure Machine SCADA Expert";

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
    image: plantpaxReference,
    imageAlt: "Arquitetura de referência PlantPAx com PASS, servidores e controladores",
    imageTitle: "Arquitetura PlantPAx como referência de engenharia",
    imageSource: plantpaxSource,
    imageCaption:
      "Print de manual público usado como referência visual para explicar camadas PlantPAx. A arquitetura final de cada cliente é definida por diagnóstico e validação técnica.",
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
    image: plantpaxReference,
    imageAlt: "Referência PlantPAx com camadas de controle e supervisão",
    imageTitle: "Objetos de processo conectam controle, HMI e diagnóstico",
    imageSource: plantpaxSource,
    imageCaption:
      "A biblioteca é aplicada dentro de uma arquitetura PlantPAx maior. O print mostra como os objetos se relacionam com controladores, servidores e supervisão.",
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
    ],
    relatedSolutions: plantpaxRelated,
    relatedTech: ["plantpax-5x", "pid-intertravamentos-sequenciamento", "factorytalk-view-se"],
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
    image: controllogixReference,
    imageAlt: "Arquitetura de referência ControlLogix com rede DLR convergente",
    imageTitle: "Controladores Logix dentro de uma rede industrial projetada",
    imageSource: logixSource,
    imageCaption:
      "Print de manual público com exemplo de arquitetura Logix e DLR. Usado para explicar disponibilidade e desenho de rede, não como diagrama final de projeto.",
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
    ],
    relatedSolutions: [
      { href: "/solucoes/migracao-plc", label: "Migração PLC5/SLC500" },
      { href: "/solucoes/plantpax", label: "PlantPAx" },
    ],
    relatedTech: ["migracao-plc5-slc500", "ethernet-ip-cpwe", "pid-intertravamentos-sequenciamento"],
  },
  {
    slug: "pid-intertravamentos-sequenciamento",
    group: "Controle e DCS",
    type: "Serviço",
    title: "PID, intertravamentos e sequenciamento",
    shortTitle: "PID e sequências",
    description:
      "Engenharia de malhas, permissivos, intertravamentos, sequências operacionais e diagnósticos embarcados em controladores industriais.",
    intro:
      "Boa automação aparece nos detalhes: malhas estáveis, intertravamentos compreensíveis, sequências recuperáveis e diagnósticos que ajudam manutenção. Esse serviço organiza a lógica de controle para operar com segurança e ser mantida depois do startup.",
    image: plantpaxReference,
    imageAlt: "Arquitetura PlantPAx usada como referência para controle de processo",
    imageTitle: "Controle regulatório e sequências dentro da arquitetura de processo",
    imageSource: plantpaxSource,
    imageCaption:
      "A imagem ajuda a contextualizar onde malhas, permissivos e sequências vivem dentro de uma arquitetura de processo completa.",
    useCases: [
      "Malhas PID instáveis, sem documentação ou com sintonia herdada.",
      "Sequências com passos informais, reinício difícil ou falhas mal diagnosticadas.",
      "Intertravamentos espalhados pela lógica e pouco claros para manutenção.",
      "Startups e expansões que precisam de teste funcional rigoroso.",
    ],
    howIntegraActs: [
      "Mapeia estados, permissivos, intertravamentos, comandos, falhas e ações esperadas.",
      "Organiza sequências por passo, condição de avanço, timeout, falha e recuperação.",
      "Configura diagnósticos para operação e manutenção entenderem a causa do bloqueio.",
      "Documenta critérios de teste e comportamento esperado antes do comissionamento.",
    ],
    deliverables: [
      "Matriz de permissivos e intertravamentos.",
      "Descrição funcional de sequências e estados.",
      "Critérios de sintonia e parâmetros relevantes de malhas PID.",
      "Lista de alarmes, mensagens e diagnósticos de operação.",
      "Plano de teste funcional com evidências de validação.",
    ],
    standards: [
      { code: "PID", description: "Controle regulatório" },
      { code: "ISA-88", description: "Estados e fases" },
      { code: "ISA-18.2", description: "Alarmes acionáveis" },
      { code: "FAT/SAT", description: "Validação funcional" },
    ],
    faq: [
      {
        q: "Por que documentar intertravamentos?",
        a: "Porque o intertravamento que ninguém entende vira risco de produção. A documentação reduz dependência de memória individual e acelera diagnóstico.",
      },
      {
        q: "Vocês fazem sintonia fina em campo?",
        a: "Sim, quando há condição operacional e critério de segurança. A sintonia precisa respeitar processo, atuadores, sensores e limites definidos pela operação.",
      },
    ],
    relatedSolutions: plantpaxRelated,
    relatedTech: ["plantpax-library", "controllogix-compactlogix", "factorytalk-view-se"],
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
      "Print de manual público com arquitetura distribuída. Usado para explicar HMI Server, Data Server, clientes e serviços FactoryTalk.",
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
    image: optixReference,
    imageAlt: "Fluxo de dados em arquitetura FactoryTalk Optix",
    imageTitle: "FactoryTalk Optix como camada moderna de visualização",
    imageSource: optixSource,
    imageCaption:
      "Print de manual público com fluxo de dados e componentes Optix. A aplicação final depende do risco operacional e do padrão de acesso definido para a planta.",
    useCases: [
      "Dashboards operacionais e telas web para áreas específicas.",
      "Aplicações com integração de dados, web clients e visualização contextual.",
      "Complemento a View SE em projetos com interface moderna e acesso controlado.",
      "Projetos que precisam separar operação crítica de visualização gerencial.",
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
        q: "Optix substitui View SE?",
        a: "Em alguns casos, sim; em outros, complementa. A decisão depende de criticidade, arquitetura existente, requisitos de redundância, operação e suporte.",
      },
      {
        q: "Pode acessar pelo celular?",
        a: "Tecnicamente pode, mas acesso móvel em OT precisa de política, autenticação, segmentação e limites claros para não criar risco operacional.",
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
      "Print de manual público sobre interação entre FactoryTalk Batch, PhaseManager e HMI. A Integra aplica o conceito com sanitização de escopo e documentação própria do projeto.",
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
    image: viewSeReference,
    imageAlt: "Arquitetura FactoryTalk View SE com clientes e servidores",
    imageTitle: "Thin clients fazem sentido quando a arquitetura de supervisão é bem definida",
    imageSource: viewSeSource,
    imageCaption:
      "O print de arquitetura FactoryTalk View SE ajuda a contextualizar onde clientes industriais, servidores e sessões se conectam.",
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
      "FactoryTalk AssetCentre ajuda a transformar manutenção de automação em processo controlado. Projetos, versões, alterações, backups e acessos deixam de depender de pastas soltas e memória individual.",
    image: securityReference,
    imageAlt: "Arquitetura FactoryTalk Security com diretório e clientes",
    imageTitle: "Gestão de ativos depende de identidade e auditoria",
    imageSource: securitySource,
    imageCaption:
      "Print público de referência FactoryTalk Security. AssetCentre se apoia em identidade, permissões e trilhas de mudança para governança de ativos.",
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
      "Historian é infraestrutura de dados. Sem tag list bem definida, compressão correta, qualidade de dado e owner técnico, a planta acumula pontos, mas não ganha inteligência. A Integra estrutura historian para operação, manutenção e evolução analítica.",
    image: historianReference,
    imageAlt: "Diagrama lógico de arquitetura FactoryTalk Historian",
    imageTitle: "Historian como camada confiável de dados industriais",
    imageSource: historianSource,
    imageCaption:
      "Print de manual público com arquitetura lógica Historian. O desenho final depende de volume de tags, criticidade, retenção e integrações.",
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
    image: optixReference,
    imageAlt: "Fluxo de dados industrial em referência de arquitetura FactoryTalk Optix",
    imageTitle: "Conectividade e visualização precisam de fronteira OT bem definida",
    imageSource: optixSource,
    imageCaption:
      "Print público de arquitetura de dados e visualização. Usado para explicar o fluxo entre camada industrial e aplicações modernas.",
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
      "Print de manual público com fluxo DataMosaix. O uso no site é conceitual e não representa arquitetura de cliente.",
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
        q: "DataMosaix substitui historian?",
        a: "Não. Ele complementa a estratégia de dados. Historian preserva séries temporais; DataMosaix ajuda a contextualizar, governar e disponibilizar dados.",
      },
      {
        q: "Precisa estar tudo padronizado antes?",
        a: "Não, mas quanto melhor a base de tags, ativos e fontes, mais valor a camada de dados entrega. Normalmente fazemos saneamento gradual.",
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
    image: datamosaixCpweReference,
    imageAlt: "Arquitetura DataMosaix em contexto CPwE com fluxos de dados",
    imageTitle: "Edge como ponte controlada entre OT e dados corporativos",
    imageSource: dataMosaixSource,
    imageCaption:
      "Print público mostrando fluxos de dados em arquitetura industrial moderna. A Integra usa esse tipo de referência para discutir zonas, gateways e governança.",
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
    image: securityReference,
    imageAlt: "Arquitetura FactoryTalk Security com servidores e clientes",
    imageTitle: "Infraestrutura OT precisa de identidade, servidores e governança",
    imageSource: securitySource,
    imageCaption:
      "Print público usado para explicar dependências entre servidores, clientes, diretório e aplicações FactoryTalk em ambientes industriais.",
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
    image: securityReference,
    imageAlt: "Arquitetura FactoryTalk Security com servidores e clientes",
    imageTitle: "Virtualização OT precisa respeitar aplicações industriais",
    imageSource: securitySource,
    imageCaption:
      "A referência visual mostra a importância dos serviços centrais. Em ambiente virtual, essas dependências ficam ainda mais críticas.",
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
    image: securityReference,
    imageAlt: "Referência de sistema FactoryTalk com clientes e servidores",
    imageTitle: "Migração de VMs precisa preservar serviços industriais",
    imageSource: securitySource,
    imageCaption:
      "A referência visual reforça que aplicações industriais dependem de serviços centrais, diretórios e clientes que precisam ser preservados na migração.",
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
    image: securityReference,
    imageAlt: "Arquitetura FactoryTalk Security com domínio e clientes",
    imageTitle: "Identidade industrial como base de segurança e auditoria",
    imageSource: securitySource,
    imageCaption:
      "Print público de referência FactoryTalk Security. O desenho ajuda a mostrar relação entre identidade, clientes, servidores e políticas de acesso.",
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
    image: securityReference,
    imageAlt: "Arquitetura FactoryTalk Security com serviços industriais",
    imageTitle: "Recuperação depende de saber o que sustenta a planta",
    imageSource: securitySource,
    imageCaption:
      "A referência mostra a quantidade de serviços interdependentes em automação. Backup precisa cobrir o conjunto, não apenas arquivos soltos.",
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
        q: "Com que frequência testar restore?",
        a: "Depende da criticidade. Sistemas críticos deveriam ter testes periódicos e sempre após mudanças relevantes de arquitetura.",
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
    image: securityReference,
    imageAlt: "Arquitetura de referência FactoryTalk Security",
    imageTitle: "FactoryTalk Security como camada de autorização industrial",
    imageSource: securitySource,
    imageCaption:
      "Print de manual público que mostra componentes típicos de segurança FactoryTalk. Usado para explicar autenticação e autorização em contexto industrial.",
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
      "Print de manual público CPwE. Usado para explicar camadas, zonas, IDMZ e integração controlada entre OT e IT.",
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
    image: controllogixReference,
    imageAlt: "Arquitetura ControlLogix com rede industrial convergente",
    imageTitle: "Protocolos precisam de topologia e responsabilidade técnica",
    imageSource: logixSource,
    imageCaption:
      "Print público de arquitetura Logix com rede industrial. Usado para contextualizar dispositivos, comunicação e disponibilidade.",
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
    image: cpweReference,
    imageAlt: "Arquitetura CPwE com camadas OT e IT",
    imageTitle: "Zonas, conduítes e integração OT/IT com referência CPwE",
    imageSource: cpweSource,
    imageCaption:
      "Print público CPwE usado para explicar segmentação e defesa em profundidade aplicada a ambientes industriais.",
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
    image: securityReference,
    imageAlt: "Arquitetura FactoryTalk Security",
    imageTitle: "Hardening precisa respeitar serviços industriais",
    imageSource: securitySource,
    imageCaption:
      "Print público FactoryTalk Security usado para mostrar dependências entre servidores, diretórios, clientes e permissões.",
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
    image: securityReference,
    imageAlt: "Arquitetura de referência FactoryTalk Security",
    imageTitle: "Atualizações em OT dependem de compatibilidade e janela",
    imageSource: securitySource,
    imageCaption:
      "A referência ajuda a lembrar que uma atualização pode afetar múltiplos serviços industriais interdependentes.",
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
    ],
    relatedSolutions: cyberRelated,
    relatedTech: ["hardening-industrial", "backup-recuperacao-desastres", "iec-62443-nist-ot"],
  },
  {
    slug: "monitoramento-redes-industriais",
    group: "Redes e Cibersegurança OT",
    type: "Serviço",
    title: "Monitoramento e Diagnóstico de Redes Industriais",
    shortTitle: "Diagnóstico de Rede",
    description:
      "Análise de tráfego, loops, broadcast storms, saúde de rede, devices, uplinks, DLR e comportamento de comunicação em OT.",
    intro:
      "Muita instabilidade de automação parece problema de PLC ou HMI, mas nasce na rede. A Integra analisa tráfego, topologia, configuração e eventos para encontrar causa técnica sem trocar equipamento às cegas.",
    image: cpweReference,
    imageAlt: "Arquitetura CPwE para integração OT e IT",
    imageTitle: "Diagnóstico de rede começa por arquitetura e tráfego real",
    imageSource: cpweSource,
    imageCaption:
      "Print público CPwE usado para discutir camadas, tráfego e fronteiras entre ambientes industriais e corporativos.",
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
    ],
    relatedSolutions: cyberRelated,
    relatedTech: ["ethernet-ip-cpwe", "protocolos-industriais", "suporte-remoto-presencial"],
  },
  {
    slug: "manutencao-corretiva-preventiva",
    group: "Serviços de Engenharia",
    type: "Serviço",
    title: "Manutenção Corretiva e Preventiva em Automação",
    shortTitle: "Manutenção de Automação",
    description:
      "Suporte técnico para PLCs, SCADA, redes, servidores, historian, aplicações FactoryTalk e infraestrutura OT crítica.",
    intro:
      "Manutenção de automação precisa ir além de apagar incêndio. A Integra combina atendimento corretivo, rotina preventiva, documentação e análise de causa para reduzir reincidência e dependência de conhecimento informal.",
    image: viewSeReference,
    imageAlt: "Arquitetura FactoryTalk View SE usada como referência de sistemas industriais",
    imageTitle: "Manutenção precisa entender a arquitetura inteira",
    imageSource: viewSeSource,
    imageCaption:
      "A referência mostra que falhas de operação podem envolver servidores, clientes, controladores, dados e rede. O suporte precisa enxergar o conjunto.",
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
    image: cpweReference,
    imageAlt: "Arquitetura CPwE usada para explicar acesso controlado em OT",
    imageTitle: "Suporte remoto precisa passar por arquitetura segura",
    imageSource: cpweSource,
    imageCaption:
      "Print público CPwE usado para explicar por que acesso remoto deve respeitar zonas, IDMZ e regras de comunicação.",
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
    image: cpweReference,
    imageAlt: "Arquitetura CPwE usada como referência de auditoria OT",
    imageTitle: "Auditoria compara a realidade da planta com arquitetura desejada",
    imageSource: cpweSource,
    imageCaption:
      "Referências públicas como CPwE, IEC 62443 e NIST ajudam a organizar uma leitura técnica sem depender de opinião solta.",
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
      "Print público Historian usado para contextualizar análise de dados, tendências e eventos como base de melhoria operacional.",
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
    ],
    relatedSolutions: serviceRelated,
    relatedTech: ["factorytalk-historian", "pid-intertravamentos-sequenciamento", "factorytalk-batch"],
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
    image: plantpaxReference,
    imageAlt: "Arquitetura PlantPAx usada como referência de documentação técnica",
    imageTitle: "Documentação conecta arquitetura, operação e manutenção",
    imageSource: plantpaxSource,
    imageCaption:
      "A arquitetura de referência ajuda a ilustrar o tipo de sistema que precisa de documentação coerente: controladores, servidores, rede, HMI e dados.",
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
      "Print de manual público com referência Logix. Usado para contextualizar redes, controladores e disponibilidade em modernizações.",
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
    ],
    relatedSolutions: [
      { href: "/solucoes/migracao-plc", label: "Solução Migração PLC" },
      { href: "/solucoes/redes-iec-62443", label: "Redes Industriais" },
    ],
    relatedTech: ["controllogix-compactlogix", "pid-intertravamentos-sequenciamento", "factorytalk-view-se"],
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
    image: devicewiseReference,
    imageAlt: "Diagrama da plataforma deviceWISE com camadas Connect, Manage e Integrate",
    imageTitle: "deviceWISE organiza conectividade, gestão e integração IIoT",
    imageSource: devicewiseSource,
    imageCaption:
      "Print de material público Telit Cinterion usado para explicar a lógica da plataforma: conectar dispositivos, gerenciar dados e integrar sistemas de negócio.",
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
    image: siemensTiaReference,
    imageAlt: "Material Siemens sobre Totally Integrated Automation Portal",
    imageTitle: "TIA Portal como ambiente integrado de engenharia Siemens",
    imageSource: siemensTiaSource,
    imageCaption:
      "Print de material público Siemens usado como referência visual. A Integra trabalha com ferramentas Siemens como tecnologia atendida, sem afirmar programa formal de integrador Siemens.",
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
    image: siemensTiaReference,
    imageAlt: "Referência Siemens de engenharia SIMATIC",
    imageTitle: "Legado Siemens exige leitura cuidadosa de versão e arquitetura",
    imageSource: siemensTiaSource,
    imageCaption:
      "Material Siemens usado como referência institucional. Em sistemas STEP 7 Classic, a abordagem prioriza backup, compatibilidade e redução de risco antes de qualquer alteração.",
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
    image: siemensWinccReference,
    imageAlt: "Material Siemens sobre SIMATIC WinCC Unified Engineering",
    imageTitle: "WinCC organiza operação, telas, alarmes e engenharia de supervisão",
    imageSource: siemensWinccSource,
    imageCaption:
      "Print público Siemens usado como referência visual. Projetos com WinCC clássico, WinCC 7.x, Unified ou PCS 7 são avaliados conforme versão, licenças, arquitetura e ciclo de vida.",
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
    image: siemensStartdriveReference,
    imageAlt: "Material Siemens SINAMICS Startdrive integrado ao TIA Portal",
    imageTitle: "Redes, drives e engenharia Siemens precisam caminhar juntos",
    imageSource: siemensStartdriveSource,
    imageCaption:
      "Print público Siemens usado para contextualizar o comissionamento de drives no TIA Portal e a importância de rede industrial estável.",
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
      "Print de material público Elipse usado para explicar arquitetura de servidores, viewers, dispositivos e camadas de acesso.",
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
      "Print público Schneider Electric usado como referência visual para PLCs, estações de engenharia, rede e diagnóstico no ecossistema EcoStruxure.",
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
      "Print público Schneider Electric usado para contextualizar engenharia de máquinas, controladores menores, dispositivos e interface operacional.",
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
    ],
    relatedSolutions: multiVendorRelated,
    relatedTech: ["schneider-control-expert", "schneider-machine-scada-expert", "protocolos-industriais"],
  },
  {
    slug: "schneider-machine-scada-expert",
    group: "Supervisão e Operação",
    type: "Software",
    title: "Schneider EcoStruxure Machine SCADA Expert",
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
      "Print público Schneider Electric usado como referência visual de ambiente SCADA/HMI. A aplicação final depende do hardware, versão e arquitetura existente.",
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
