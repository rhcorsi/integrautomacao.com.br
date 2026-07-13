export const COLLECTIVE_AUTHOR = {
  name: "Equipe técnica Integra",
  href: "/equipe/",
  schemaId: "editorial-team",
  description:
    "Assinatura coletiva usada quando não há autoria individual confirmada para o conteúdo.",
} as const;

export const COMPANY_FOUNDING = {
  year: 2016,
  description:
    "Rafhael Henrique Corsi Feitosa e Joldmar Oliveira fundaram juntos a Integra Automação Industrial.",
} as const;

export const TEAM_MEMBERS = [
  {
    id: "rafhael-henrique-corsi-feitosa",
    name: "Rafhael Henrique Corsi Feitosa",
    role: "Diretor e cofundador",
    summary:
      "Iniciou a atuação em automação industrial na Conapi em 2010 e cofundou a Integra com Joldmar Oliveira em 2016.",
    milestones: [
      {
        year: 2010,
        description: "Início da atuação em automação industrial na Conapi.",
      },
      {
        year: 2016,
        description: "Fundação conjunta da Integra Automação Industrial.",
      },
    ],
  },
  {
    id: "joldmar-oliveira",
    name: "Joldmar Oliveira",
    role: "Diretor e cofundador",
    summary:
      "Iniciou a carreira em automação industrial em uma usina de açúcar e etanol em 1996, passou a atuar na Conapi em 2010 e cofundou a Integra com Rafhael Henrique Corsi Feitosa em 2016.",
    milestones: [
      {
        year: 1996,
        description:
          "Início da carreira em automação industrial em uma usina de açúcar e etanol.",
      },
      {
        year: 2010,
        description: "Início da atuação na Conapi.",
      },
      {
        year: 2016,
        description: "Fundação conjunta da Integra Automação Industrial.",
      },
    ],
  },
] as const;
