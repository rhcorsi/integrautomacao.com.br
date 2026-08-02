/**
 * Helpers de JSON-LD (schema.org). Funções puras que retornam objetos prontos
 * para `JSON.stringify` em <script type="application/ld+json">.
 *
 * A entidade da empresa é emitida como `LocalBusiness` com `@id` estável,
 * para que Service, Article e BreadcrumbList possam referenciá-la por
 * `{ "@id": ORG_ID }`.
 */
import { SITE, COMPANY } from "@/utils/site";
import { COLLECTIVE_AUTHOR } from "@/data/authors";

export const ORG_ID = `${SITE.url}/#organization`;

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": ORG_ID,
    name: SITE.name,
    legalName: COMPANY.legalName,
    alternateName: SITE.shortName,
    url: `${SITE.url}/`,
    logo: `${SITE.url}/logo.png`,
    image: `${SITE.url}/og/default.png`,
    taxID: COMPANY.taxId,
    email: COMPANY.email,
    telephone: COMPANY.phones[0].value,
    address: {
      "@type": "PostalAddress",
      streetAddress: COMPANY.address.street,
      addressLocality: COMPANY.address.city,
      addressRegion: COMPANY.address.state,
      postalCode: COMPANY.address.postalCode,
      addressCountry: COMPANY.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: COMPANY.geo.latitude,
      longitude: COMPANY.geo.longitude,
    },
    areaServed: { "@type": "Country", name: "Brasil" },
    foundingDate: String(COMPANY.founded),
    description: SITE.defaultDescription,
    slogan: SITE.tagline,
    sameAs: [COMPANY.social.linkedin].filter(Boolean),
    memberOf: {
      "@type": "Organization",
      name: "Rockwell Automation PartnerNetwork — System Integrator Program",
      url: "https://www.rockwellautomation.com/en-us/company/partnernetwork.html",
    },
    award: "System Integrator Partner, nível Silver no Rockwell Automation PartnerNetwork",
    // A capacidade é declarada com sua fonte e categoria; o vínculo Silver é
    // representado separadamente como participação no programa, não como curso.
    hasCredential: [
      {
        "@type": "EducationalOccupationalCredential",
        name: "PlantPAx DCS Certified — Rockwell Automation",
        credentialCategory: "Capacidade do programa de integradores",
        recognizedBy: {
          "@type": "Organization",
          name: "Rockwell Automation",
          url: "https://www.rockwellautomation.com/",
        },
        url: `${SITE.url}/certificacoes/`,
      },
    ],
    knowsAbout: [
      "Automação Industrial",
      "Integração de Sistemas de Automação",
      "PlantPAx",
      "FactoryTalk",
      "ControlLogix",
      "Studio 5000",
      "Migração de PLC-5 e SLC-500 para ControlLogix",
      "SCADA",
      "Siemens TIA Portal",
      "PI System",
      "Cibersegurança Industrial",
      "IEC 62443",
      "CPwE",
      "Virtualização OT",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: COMPANY.phones[0].value,
      email: COMPANY.email,
      contactType: "sales",
      areaServed: "BR",
      availableLanguage: ["Portuguese"],
    },
  };
}

/** Entidade WebSite da home, sem SearchAction porque o site não possui busca. */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    url: `${SITE.url}/`,
    name: SITE.name,
    alternateName: SITE.shortName,
    inLanguage: "pt-BR",
    publisher: { "@id": ORG_ID },
  };
}

/** Rótulos legíveis para os segmentos de path conhecidos (níveis intermediários). */
const SEGMENT_LABELS: Record<string, string> = {
  empresa: "Empresa",
  solucoes: "Soluções",
  servicos: "Serviços",
  tecnologias: "Tecnologias",
  setores: "Setores",
  "integrador-rockwell": "Integrador Rockwell",
  "automacao-industrial-maringa": "Automação Industrial em Maringá",
  "automacao-industrial-parana": "Automação Industrial no Paraná",
  "automacao-industrial": "Guia de Automação Industrial",
  "ciberseguranca-ot": "Cibersegurança OT",
  "programacao-clp": "Programação de CLP",
  "comissionamento-industrial": "Comissionamento Industrial",
  "acucar-e-etanol": "Açúcar e Etanol",
  certificacoes: "Certificações",
  cases: "Cases",
  blog: "Blog",
  contato: "Contato",
  "integra-acao": "Integra Ação",
  eventos: "Eventos",
  equipe: "Equipe",
  "politica-editorial": "Política editorial",
  "politica-privacidade": "Política de Privacidade",
  "uso-de-cookies": "Uso de Cookies",
};

function humanize(seg: string): string {
  return seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Itens de breadcrumb a partir do pathname (compartilhado entre o JSON-LD e o
 * componente visual Breadcrumbs.astro). URLs com barra final, alinhadas ao
 * canonical/sitemap do site. Retorna [] para a home.
 */
export function breadcrumbItems(
  pathname: string,
  leafName?: string,
): { name: string; url: string }[] {
  const segments = pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  if (segments.length === 0) return [];

  const items: { name: string; url: string }[] = [
    { name: "Início", url: `${SITE.url}/` },
  ];
  let acc = "";
  segments.forEach((seg, i) => {
    acc += `/${seg}`;
    const isLeaf = i === segments.length - 1;
    const name = isLeaf
      ? leafName ?? SEGMENT_LABELS[seg] ?? humanize(seg)
      : SEGMENT_LABELS[seg] ?? humanize(seg);
    items.push({ name, url: new URL(`${acc}/`, SITE.url).toString() });
  });
  return items;
}

/**
 * BreadcrumbList a partir do pathname. O nó-folha (página atual) usa `leafName`
 * (normalmente o título da página). Retorna `null` para a home / profundidade 0.
 */
export function breadcrumbSchema(pathname: string, leafName?: string) {
  const items = breadcrumbItems(pathname, leafName);
  if (items.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

/** BlogPosting para posts do blog. */
export function articleSchema(opts: {
  type?: "Article" | "BlogPosting";
  title: string;
  description: string;
  url: string;
  datePublished: Date;
  dateModified?: Date;
  tags?: string[];
  image?: string;
}) {
  const editorialTeamUrl = new URL(COLLECTIVE_AUTHOR.href, SITE.url).toString();

  return {
    "@context": "https://schema.org",
    "@type": opts.type ?? "BlogPosting",
    "@id": `${opts.url}#article`,
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    mainEntityOfPage: opts.url,
    datePublished: opts.datePublished.toISOString(),
    ...(opts.dateModified
      ? { dateModified: opts.dateModified.toISOString() }
      : {}),
    author: {
      "@type": "Organization",
      "@id": `${editorialTeamUrl}#${COLLECTIVE_AUTHOR.schemaId}`,
      name: COLLECTIVE_AUTHOR.name,
      url: editorialTeamUrl,
      parentOrganization: { "@id": ORG_ID },
    },
    publisher: { "@id": ORG_ID },
    image: opts.image ?? `${SITE.url}/og/default.png`,
    inLanguage: "pt-BR",
    ...(opts.tags && opts.tags.length ? { keywords: opts.tags.join(", ") } : {}),
  };
}

/** Service para páginas de solução. */
export function serviceSchema(opts: {
  name: string;
  description: string;
  url: string;
  serviceType?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    serviceType: opts.serviceType ?? "Engenharia e integração de automação industrial",
    provider: { "@id": ORG_ID },
    areaServed: { "@type": "Country", name: "Brasil" },
  };
}

/** FAQPage para páginas que renderizam listas reais de perguntas e respostas. */
export function faqSchema(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

/** ItemList para hubs que organizam rotas editoriais ou comerciais reais. */
export function itemListSchema(opts: {
  name: string;
  url: string;
  items: { name: string; url: string; description?: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: opts.name,
    url: opts.url,
    numberOfItems: opts.items.length,
    itemListElement: opts.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url,
      ...(item.description ? { description: item.description } : {}),
    })),
  };
}

/** Event para o registro de eventos e treinamentos em que a Integra participou. */
export function eventSchema(opts: {
  name: string;
  description: string;
  url: string;
  startDate: Date;
  endDate?: Date;
  status?: "scheduled" | "completed" | "cancelled" | "postponed";
  location: string;
  organizer: string;
  image?: string;
}) {
  const statusMap = {
    scheduled: "https://schema.org/EventScheduled",
    cancelled: "https://schema.org/EventCancelled",
    postponed: "https://schema.org/EventPostponed",
  } as const;

  const [localityPart, venuePart] = opts.location
    .split("·")
    .map((part) => part.trim());
  const cityState = localityPart?.match(/^(.+?),\s*([A-Z]{2})$/);
  const address = cityState
    ? {
        "@type": "PostalAddress",
        addressLocality: cityState[1],
        addressRegion: cityState[2],
        addressCountry: "BR",
      }
    : localityPart === "Brasil"
      ? { "@type": "PostalAddress", addressCountry: "BR" }
      : { "@type": "PostalAddress", name: opts.location };
  const eventStatus =
    opts.status && opts.status !== "completed" ? statusMap[opts.status] : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    startDate: opts.startDate.toISOString().slice(0, 10),
    ...(opts.endDate ? { endDate: opts.endDate.toISOString().slice(0, 10) } : {}),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(eventStatus ? { eventStatus } : {}),
    location: {
      "@type": "Place",
      name: venuePart && cityState ? venuePart : opts.location,
      address,
    },
    organizer: { "@type": "Organization", name: opts.organizer },
    ...(opts.image ? { image: opts.image } : {}),
    inLanguage: "pt-BR",
  };
}

/** TechArticle para páginas de tecnologia/software do catálogo técnico. */
export function techArticleSchema(opts: {
  title: string;
  description: string;
  url: string;
  image?: string;
  /** Datas ISO (YYYY-MM-DD), alteradas somente após revisão substantiva. */
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
  authorUrl?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "@id": `${opts.url}#techarticle`,
    headline: opts.title,
    name: opts.title,
    description: opts.description,
    url: opts.url,
    mainEntityOfPage: opts.url,
    inLanguage: "pt-BR",
    publisher: { "@id": ORG_ID },
    author: {
      "@type": "Organization",
      name: opts.authorName ?? SITE.name,
      ...(opts.authorUrl
        ? { "@id": `${opts.authorUrl}#editorial-team`, url: opts.authorUrl }
        : { "@id": ORG_ID }),
    },
    ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
    ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
    ...(opts.image ? { image: opts.image } : {}),
  };
}
