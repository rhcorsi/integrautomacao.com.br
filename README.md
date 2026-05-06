# integrautomacao.com.br

Site institucional da **Integra Automação Industrial** — engenharia e
integração de sistemas industriais.

Stack: **Astro + Tailwind v4 + MDX + TypeScript estrito**, hospedado em
**Cloudflare Pages** (estático) com **Cloudflare Pages Function** para o
formulário de contato e **Cloudflare Worker** para redirects legados de
query string.

## Pré-requisitos

- Node.js **22 LTS** (verifique com `node -v`; o repo tem `.nvmrc`)
- npm 10+

## Comandos

```bash
npm install              # instala dependências
npm run dev              # http://localhost:4321
npm run check            # astro check (TypeScript + content collections)
npm run build            # gera dist/
npm run preview          # serve dist/ localmente
npm run pages:dev        # serve dist/ + functions/ via wrangler
                         # (necessário para testar /api/contact local)
```

## Estrutura

```
site/
├── public/                  # arquivos servidos como-são
│   ├── _redirects           # redirects path-based (não query string)
│   ├── _headers             # CSP, HSTS e cache headers
│   ├── favicon.svg          # SimboloColorido (vetorial)
│   ├── logo.png             # logo principal para JSON-LD
│   └── robots.txt
├── functions/api/           # Cloudflare Pages Functions
│   └── contact.ts           # POST /api/contact (Turnstile + Resend)
├── workers/
│   └── legacy-redirects.ts  # Worker para ?p=N (deploy via wrangler)
├── src/
│   ├── assets/              # imagens otimizadas via astro:assets
│   ├── components/          # componentes reutilizáveis
│   ├── content/             # cases e posts em .mdx
│   │   ├── blog/
│   │   ├── cases/
│   │   └── config.ts        # schemas zod
│   ├── layouts/
│   │   └── BaseLayout.astro # head, JSON-LD, Header, Footer
│   ├── pages/               # rotas
│   ├── styles/global.css    # Tailwind v4 + tokens @theme
│   └── utils/site.ts        # constantes de empresa (CNPJ, endereço, etc.)
├── astro.config.mjs
├── tsconfig.json
├── wrangler.toml            # config do Worker legacy-redirects
└── package.json
```

## Como adicionar conteúdo

### Novo post no blog

1. Crie `src/content/blog/<slug>.mdx`
2. Frontmatter mínimo:

   ```yaml
   ---
   title: "Título"
   description: "Resumo (aparece em cards e meta description)"
   pubDate: 2026-05-10
   tags: ["PlantPAx", "Arquitetura"]
   draft: false
   ---
   ```

3. Conteúdo em Markdown ou MDX. Para callouts técnicos:

   ```mdx
   import TechnicalCallout from "@/components/TechnicalCallout.astro";

   <TechnicalCallout variant="note" title="Boa prática">
     Texto do callout.
   </TechnicalCallout>
   ```

   Variants disponíveis: `note`, `warning`, `ot`.

### Novo case

1. Crie `src/content/cases/<slug>.mdx`
2. Frontmatter:

   ```yaml
   ---
   title: "Nome do case (sem nome de cliente)"
   summary: "Descrição curta — aparece em cards"
   pubDate: 2026-05-10
   sector: "Açúcar e Etanol"
   tech: ["FactoryTalk View SE", "ControlLogix"]
   draft: false
   ---
   ```

   Para incluir imagem hero:

   ```yaml
   heroImage: "../../assets/cases/<slug>/hero.jpg"
   heroAlt: "Descrição da imagem"
   ```

### Sanitização de conteúdo (regra inegociável)

Antes de publicar qualquer case/post derivado de propostas internas:

- ❌ **Nunca** citar nome de cliente
- ❌ **Nunca** citar valores monetários, horas, durações ou marcos
- ❌ **Nunca** reproduzir arquitetura, descritivos funcionais ou matrizes
  causa-efeito específicas
- ❌ **Nunca** reproduzir cláusulas comerciais
- ✅ OK reutilizar vocabulário técnico genérico (PlantPAx, FactoryTalk,
  ControlLogix, IEC 62443, etc.)
- ✅ OK reutilizar declarações institucionais (manifesto, valores)

## Deploy

### Cloudflare Pages

1. Conecte o repositório GitHub a Cloudflare Pages
2. Configure o build:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/site` (se o repo for o monorepo do projeto)
   - Environment variables (em **Settings → Environment Variables**):

     ```
     NODE_VERSION=22
     PUBLIC_TURNSTILE_SITE_KEY=<site key do Turnstile>
     TURNSTILE_SECRET_KEY=<secret do Turnstile>
     RESEND_API_KEY=<API key do Resend>
     CONTACT_EMAIL_TO=comercial@integrautomacao.com.br
     CONTACT_EMAIL_FROM=noreply@forms.integrautomacao.com.br
     ```

3. Adicione um **custom domain** apontando para `integrautomacao.com.br`
   (apenas após cutover de DNS planejado)

### Cloudflare Worker (legacy-redirects)

Roda **separado** do site. Deploy:

```bash
npx wrangler deploy
```

Depois, no painel da Cloudflare, configure a rota:
`integrautomacao.com.br/*` → Worker `integrautomacao-legacy-redirects`.

O Worker faz pass-through quando a URL não casa nenhum padrão legado, então
todas as URLs novas continuam servidas pelo CF Pages normalmente.

### Cloudflare Rate Limiting (proteção do form)

Configure uma regra de Rate Limiting (Account → Security → Rate Limiting)
para o path `/api/contact`:

- Janela: 10 segundos (limite do Free plan)
- Threshold: 3-5 requests por IP
- Ação: Block (HTTP 429)

## Configuração de DNS (Cloudflare)

Padrão de proxy seletivo para o cutover:

| Subdomínio                      | Tipo  | Proxy        |
|---------------------------------|-------|--------------|
| `@` (apex)                      | A     | **Proxied**  |
| `www`                           | CNAME | **Proxied**  |
| `mail`, `webmail`, `webdisk`    | A     | DNS only     |
| `cpanel`, `whm`                 | A     | DNS only     |
| `autoconfig`, `autodiscover`    | A     | DNS only     |
| `forms` (subdomínio do Resend)  | TXT/MX| DNS only     |

DMARC inicial (apenas após criar `dmarc@integrautomacao.com.br`):

```
_dmarc TXT "v=DMARC1; p=none; rua=mailto:dmarc@integrautomacao.com.br; fo=1"
```

## Tarefas pendentes (Fase 2 — pós-launch)

- [ ] Adicionar páginas individuais para cada setor (`/setores/[slug]`)
      — quando houver conteúdo único de ≥800 palavras com normas e cases
      específicos por setor
- [ ] Solução: PI System / AVEVA, Data Centers Industriais, Migração PLC
- [ ] Página `/equipe` com bios e fotos profissionais
- [ ] Mais cases (1-2/mês), todos sanitizados
- [ ] Mais posts no blog (1-2/mês)
- [ ] Pagefind quando volume de blog/cases ≥ 20-30 itens
- [ ] HSTS preload + DMARC `p=reject` após 6 meses estáveis
- [ ] Versão em inglês (`/en/`) se mirar multinacionais

## Mais detalhes

O plano completo do projeto está em
`C:\Users\rafha\.claude\plans\baixei-o-backup-e-mellow-cosmos.md`.
Inclui contexto, decisões técnicas, direção de UX/UI com benchmarks
(Cybertrol, Brock, Rockwell, AVEVA), cronograma e roadmap pós-lançamento.
