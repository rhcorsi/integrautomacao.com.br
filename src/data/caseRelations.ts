/**
 * Relacionamentos editoriais dos cases: quais páginas de tecnologia e de
 * solução aprofundam o que cada case demonstra.
 *
 * Vivia hardcoded na rota `pages/cases/[...slug].astro` — cada novo case
 * exigia editar a rota. Agora basta registrar aqui (ou em techLinks, se a
 * tecnologia ainda não tiver página mapeada).
 */

export interface TechLink {
  href: string;
  description: string;
}

/** Mapa global: nome da tecnologia (como aparece em `data.tech`) → página. */
export const TECH_LINKS: Record<string, TechLink> = {
  "FactoryTalk View SE": {
    href: "/tecnologias/factorytalk-view-se/",
    description: "Arquitetura distribuída, servidores HMI, alarmes e redundância.",
  },
  ControlLogix: {
    href: "/tecnologias/controllogix-compactlogix/",
    description: "Controladores Logix, redes, I/O e critérios de dimensionamento.",
  },
  "EtherNet/IP": {
    href: "/tecnologias/ethernet-ip-cpwe/",
    description: "Arquitetura de rede industrial, segmentação e disponibilidade.",
  },
};

export interface CaseSolution {
  href: string;
  label: string;
  description: string;
}

/** Mapa por case (chave = entry.id): soluções relacionadas ao escopo. */
export const CASE_SOLUTIONS: Record<string, CaseSolution[]> = {
  "projeto-moinho": [
    {
      href: "/solucoes/modernizacao-scada/",
      label: "Modernização de SCADA",
      description: "Método, fronteiras e entregáveis para modernizar supervisórios legados.",
    },
    {
      href: "/solucoes/factorytalk/",
      label: "FactoryTalk Suite",
      description: "Integração do View SE com o restante do ecossistema FactoryTalk.",
    },
  ],
};
