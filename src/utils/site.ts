/**
 * Single source of truth for site-wide constants used in metadata,
 * structured data, footer, and contact pages. Update here once.
 */
export const SITE = {
  name: "Integra Automação Industrial",
  shortName: "Integra",
  tagline: "Tecnologia e Engenharia de Sistemas Industriais",
  url: "https://integrautomacao.com",
  defaultTitle: "Integra Automação Industrial | Tecnologia e Engenharia de Sistemas Industriais",
  defaultDescription:
    "Engenharia e integração de sistemas industriais para plantas críticas: arquitetura, padronização, segurança operacional e governança técnica de longo prazo.",
  locale: "pt-BR",
  themeColor: "#E30613",
} as const;

export const CSP_JSON_LD_NONCE = "aW50ZWdyYS1qc29ubGQ=" as const;

export interface Phone {
  label: string;
  value: string;
  display: string;
  whatsapp?: boolean;
}

const PHONES: Phone[] = [
  { label: "Comercial", value: "+55 44 3305-7147", display: "(44) 3305-7147" },
  {
    label: "WhatsApp",
    value: "+55 44 99952-3947",
    display: "(44) 99952-3947",
    whatsapp: true,
  },
  {
    label: "Direto",
    value: "+55 44 99185-8899",
    display: "(44) 99185-8899",
    whatsapp: true,
  },
];

export const COMPANY = {
  legalName: "Integra Automação Industrial Ltda - ME",
  taxId: "24.543.173/0001-14",
  email: "comercial@integrautomacao.com.br",
  emailPrivacy: "lgpd@integrautomacao.com.br",
  phones: PHONES,
  address: {
    street: "Rua Topázio, 965",
    city: "Maringá",
    state: "PR",
    postalCode: "87.083-050",
    country: "BR",
  },
  geo: { latitude: -23.4173, longitude: -51.9333 },
  founded: 2016,
  social: {
    linkedin: "https://www.linkedin.com/company/integrautomacao",
  },
} as const;

/** Primary navigation. Order = display order in header. */
export const NAV = [
  { href: "/empresa", label: "Empresa" },
  { href: "/solucoes", label: "Soluções" },
  { href: "/tecnologias", label: "Tecnologias" },
  { href: "/setores", label: "Setores" },
  { href: "/certificacoes", label: "Certificações" },
  { href: "/cases", label: "Cases" },
  { href: "/blog", label: "Blog" },
  { href: "/contato", label: "Contato" },
] as const;

/**
 * Mega-menu structure for nav items that have sub-pages worth surfacing.
 * Items not listed here are simple direct links. Each mega-menu has up to 4
 * columns of links, plus an optional promotional card on the right.
 */
export interface MegaMenuColumn {
  title: string;
  links: { href: string; label: string; description?: string }[];
}

export interface MegaMenuPromo {
  eyebrow: string;
  title: string;
  description: string;
  cta: { href: string; label: string };
  /** Optional image src (relative to public/) — falls back to colored block. */
  imageSrc?: string;
}

export interface MegaMenu {
  /** Optional intro text shown above the columns */
  intro?: { title: string; href: string };
  columns: MegaMenuColumn[];
  promo?: MegaMenuPromo;
  /** Optional footer row of quick-access links */
  quickLinks?: { href: string; label: string }[];
}

export const MEGA_MENUS: Record<string, MegaMenu> = {
  "/solucoes": {
    intro: {
      title: "Conheça todas as soluções",
      href: "/solucoes",
    },
    columns: [
      {
        title: "Plataforma",
        links: [
          { href: "/solucoes/plantpax", label: "PlantPAx" },
          { href: "/solucoes/factorytalk", label: "FactoryTalk Suite" },
        ],
      },
      {
        title: "Redes & Segurança",
        links: [
          { href: "/solucoes/redes-iec-62443", label: "Redes Industriais e IEC 62443" },
        ],
      },
      {
        title: "Dados & Evolução",
        links: [
          { href: "/solucoes/pi-system", label: "PI System / AVEVA" },
          { href: "/solucoes/data-centers", label: "Data Centers Industriais" },
          { href: "/solucoes/migracao-plc", label: "Migração PLC5 / SLC500" },
        ],
      },
    ],
    promo: {
      eyebrow: "Método Integra",
      title: "Arquitetura → Engenharia → Implantação → Validação → Suporte",
      description:
        "Cada solução passa pelas mesmas cinco fases. Documentação completa, padronização e governança em cada entrega.",
      cta: { href: "/solucoes#metodo-integra", label: "Ver método Integra" },
    },
  },

  "/tecnologias": {
    intro: {
      title: "Ver catálogo técnico completo",
      href: "/tecnologias",
    },
    columns: [
      {
        title: "Controle & DCS",
        links: [
          { href: "/tecnologias/plantpax-5x", label: "PlantPAx 5.x" },
          { href: "/tecnologias/plantpax-library", label: "PlantPAx Library" },
          { href: "/tecnologias/controllogix-compactlogix", label: "ControlLogix / CompactLogix" },
          { href: "/tecnologias/controle-regulatorio-pid", label: "Controle regulatório (PID)" },
          { href: "/tecnologias/intertravamentos-sequencias", label: "Intertravamentos e sequências" },
          { href: "/tecnologias/tia-portal", label: "Siemens TIA Portal" },
          { href: "/tecnologias/simatic-manager-step7", label: "SIMATIC Manager / STEP 7" },
        ],
      },
      {
        title: "FactoryTalk & Dados",
        links: [
          { href: "/tecnologias/factorytalk-view-se", label: "FactoryTalk View SE" },
          { href: "/tecnologias/factorytalk-batch", label: "FactoryTalk Batch" },
          { href: "/tecnologias/factorytalk-historian", label: "FactoryTalk Historian" },
          { href: "/tecnologias/factorytalk-datamosaix", label: "DataMosaix" },
          { href: "/tecnologias/tc-devicewise", label: "TC deviceWISE" },
        ],
      },
      {
        title: "Multi-vendor",
        links: [
          { href: "/tecnologias/elipse-e3", label: "Elipse E3" },
          { href: "/tecnologias/siemens-wincc-pcs7", label: "SIMATIC WinCC / PCS 7" },
          { href: "/tecnologias/schneider-control-expert", label: "Schneider Control Expert" },
          { href: "/tecnologias/schneider-machine-expert", label: "Schneider Machine Expert" },
          { href: "/tecnologias/schneider-machine-scada-expert", label: "Schneider Machine SCADA" },
        ],
      },
      {
        title: "OT, Redes & Serviços",
        links: [
          { href: "/tecnologias/ethernet-ip-cpwe", label: "EtherNet/IP e CPwE" },
          { href: "/tecnologias/iec-62443-nist-ot", label: "IEC 62443 / NIST OT" },
          { href: "/tecnologias/siemens-redes-industriais", label: "Siemens Redes / Startdrive" },
          { href: "/tecnologias/data-centers-industriais", label: "Data Centers OT" },
          { href: "/tecnologias/backup-recuperacao-desastres", label: "Backup e DR OT" },
        ],
      },
    ],
    promo: {
      eyebrow: "Catálogo técnico",
      title: "Uma página para cada software, tecnologia e serviço",
      description:
        "O catálogo técnico aprofunda entregáveis, normas, referências visuais públicas e critérios de aplicação por tema.",
      cta: { href: "/tecnologias", label: "Abrir catálogo" },
    },
  },

  "/setores": {
    columns: [
      {
        title: "Agronegócio",
        links: [
          { href: "/setores", label: "Açúcar e Etanol" },
          { href: "/setores", label: "Etanol de Milho" },
          { href: "/setores", label: "Armazenagem de Grãos" },
        ],
      },
      {
        title: "Alimentos",
        links: [
          { href: "/setores", label: "Alimentos e Bebidas" },
          { href: "/setores", label: "Frigoríficos" },
          { href: "/setores", label: "Fábricas de Ração" },
        ],
      },
      {
        title: "Indústria de Processo",
        links: [
          { href: "/setores", label: "Química e Fertilizantes" },
          { href: "/setores", label: "Papel e Celulose" },
          { href: "/setores", label: "Saneamento" },
        ],
      },
    ],
    promo: {
      eyebrow: "Atuação nacional",
      title: "Indústrias de médio e grande porte com processos críticos",
      description:
        "B2B com foco em plantas que operam 24/7 e exigem padronização, segurança e documentação para auditoria.",
      cta: { href: "/setores", label: "Ver todos os setores" },
    },
  },

  "/certificacoes": {
    columns: [
      {
        title: "Parcerias formais",
        links: [
          {
            href: "/certificacoes/silver-system-integrator",
            label: "Silver System Integrator",
            description: "Rockwell Automation",
          },
          {
            href: "/certificacoes#plantpax-dcs",
            label: "PlantPAx DCS Partner",
            description: "Rockwell Automation",
          },
          {
            href: "/certificacoes#telit-devicewise",
            label: "TC deviceWISE Integrator",
            description: "Telit Cinterion",
          },
        ],
      },
      {
        title: "Capacitação e entidades",
        links: [
          {
            href: "/certificacoes#cisco",
            label: "Cisco Networking Academy",
            description: "Industrial IoT",
          },
          {
            href: "/certificacoes#siemens",
            label: "Siemens PCS 7 / CPIN",
            description: "Tecnologias atendidas",
          },
          {
            href: "/certificacoes#isa",
            label: "ISA Senior Member",
          },
        ],
      },
      {
        title: "Tecnologias atendidas",
        links: [
          { href: "/tecnologias/tia-portal", label: "Siemens TIA Portal" },
          { href: "/tecnologias/elipse-e3", label: "Elipse E3" },
          { href: "/tecnologias/schneider-control-expert", label: "Schneider Electric" },
        ],
      },
    ],
    promo: {
      eyebrow: "Integrador de sistemas",
      title: "Rockwell no centro, deviceWISE e multi-vendor ao redor",
      description:
        "A Integra diferencia parceria formal de tecnologia atendida e assume o papel de guiar o cliente entre fabricantes, redes, softwares e ciclo de vida.",
      cta: {
        href: "/certificacoes",
        label: "Ver credenciais",
      },
      imageSrc: "/images/rockwell-si-silver.png",
    },
  },
};
