/**
 * Single source of truth for site-wide constants used in metadata,
 * structured data, footer, and contact pages. Update here once.
 */
export const SITE = {
  name: "Integra Automação Industrial",
  shortName: "Integra",
  tagline: "Engenharia em Automação Industrial",
  url: "https://integrautomacao.com.br",
  defaultTitle: "Integra — Engenharia em Automação Industrial",
  defaultDescription:
    "Engenharia e integração de sistemas industriais para plantas críticas: arquitetura, padronização, segurança operacional e governança técnica de longo prazo.",
  locale: "pt-BR",
  themeColor: "#E30613",
} as const;

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
    linkedin: "https://www.linkedin.com/company/integra-automacao-industrial",
  },
} as const;

/** Primary navigation. Order = display order in header. */
export const NAV = [
  { href: "/empresa", label: "Empresa" },
  { href: "/solucoes", label: "Soluções" },
  { href: "/setores", label: "Setores" },
  { href: "/cases", label: "Cases" },
  { href: "/blog", label: "Blog" },
  { href: "/certificacoes", label: "Certificações" },
  { href: "/contato", label: "Contato" },
] as const;
