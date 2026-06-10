/**
 * Helpers de JSON-LD (schema.org). Funções puras que retornam objetos prontos
 * para `JSON.stringify` em <script type="application/ld+json">.
 *
 * A entidade da empresa é emitida como `ProfessionalService` (subtipo de
 * LocalBusiness/Organization) com `@id` estável, para que Service, Article e
 * BreadcrumbList possam referenciá-la por `{ "@id": ORG_ID }`.
 */
import { SITE, COMPANY } from "@/utils/site";

export const ORG_ID = `${SITE.url}/#organization`;

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": ORG_ID,
    name: COMPANY.legalName,
    alternateName: SITE.name,
    url: SITE.url,
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
    sameAs: [COMPANY.social.linkedin].filter(Boolean),
    knowsAbout: [
      "PlantPAx",
      "FactoryTalk",
      "ControlLogix",
      "PI System",
      "Cibersegurança Industrial",
      "IEC 62443",
      "CPwE",
      "Automação Industrial",
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

/** Rótulos legíveis para os segmentos de path conhecidos (níveis intermediários). */
const SEGMENT_LABELS: Record<string, string> = {
  empresa: "Empresa",
  solucoes: "Soluções",
  tecnologias: "Tecnologias",
  setores: "Setores",
  certificacoes: "Certificações",
  cases: "Cases",
  blog: "Blog",
  contato: "Contato",
  "integra-acao": "Integra Ação",
  eventos: "Eventos",
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
  title: string;
  description: string;
  url: string;
  datePublished: Date;
  dateModified?: Date;
  author?: string;
  tags?: string[];
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${opts.url}#article`,
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    mainEntityOfPage: opts.url,
    datePublished: opts.datePublished.toISOString(),
    dateModified: (opts.dateModified ?? opts.datePublished).toISOString(),
    author: { "@type": "Organization", name: opts.author ?? SITE.name, "@id": ORG_ID },
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

/** Event para o registro de eventos e treinamentos em que a Integra participou. */
export function eventSchema(opts: {
  name: string;
  description: string;
  url: string;
  startDate: Date;
  location: string;
  organizer: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    startDate: opts.startDate.toISOString().slice(0, 10),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    // address como texto e valido em schema.org e evita o warning de
    // "location sem address" no Google Rich Results Test.
    location: { "@type": "Place", name: opts.location, address: opts.location },
    organizer: { "@type": "Organization", name: opts.organizer },
    performer: { "@id": ORG_ID },
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
    ...(opts.image ? { image: opts.image } : {}),
  };
}
