# integrautomacao.com

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
                         # (necessário para testar /api/contact e /api/newsletter local)
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
│   ├── contact.ts           # POST /api/contact (Turnstile + Resend)
│   └── newsletter.ts        # POST /api/newsletter (Turnstile + Resend Audience)
├── workers/
│   ├── legacy-redirects.ts  # Worker para ?p=N (deploy via wrangler)
│   └── wrangler.toml        # config do Worker (NÃO do Pages)
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

Existem **dois caminhos** de deploy. Use o que preferir — não os dois ao mesmo tempo.

### Opção A — Conexão direta GitHub ↔ Cloudflare Pages (mais simples)

1. Acesse https://dash.cloudflare.com/ → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. Autorize a Cloudflare a acessar o repositório `rhcorsi/integrautomacao.com`
3. Configure o build:
   - **Project name**: `integrautomacao`
   - **Production branch**: `main`
   - **Framework preset**: Astro
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Em **Settings → Environment Variables → Production**, adicione:

   ```
   NODE_VERSION              = 22
   PUBLIC_TURNSTILE_SITE_KEY = <site key>     # public — vai para o HTML
   TURNSTILE_SECRET_KEY      = <secret>       # encrypted
   RESEND_API_KEY            = <API key>      # encrypted
   RESEND_AUDIENCE_ID        = <Audience ID>  # encrypted — newsletter Integra Ação
   CONTACT_EMAIL_TO          = comercial@integrautomacao.com
   CONTACT_EMAIL_FROM        = noreply@forms.integrautomacao.com
   ```

   Marque todas as variáveis server-side como **Encrypted** para não vazarem nos logs:
   `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`,
   `CONTACT_EMAIL_TO` e `CONTACT_EMAIL_FROM`.
   `PUBLIC_TURNSTILE_SITE_KEY` precisa existir no ambiente de build; se faltar,
   o formulário aparece como indisponível e não cai mais em `mailto:` automático.
   Não use placeholders como `<site key pública do Turnstile>`; a site key
   pública atual é `0x4AAAAAADKRCm67kAoc7SHU`.
   `RESEND_AUDIENCE_ID` é o modo preferencial para a newsletter. Se ele ainda
   não estiver configurado, `/api/newsletter` faz fallback e envia a inscrição
   por e-mail para `CONTACT_EMAIL_TO`.

5. Em **Custom domains**, mantenha/adicione apenas domínios que servem páginas:
   `integrautomacao.com`, `www.integrautomacao.com` e, se usados,
   `newsletter.integrautomacao.com`, `webinar.integrautomacao.com` e
   `eventos.integrautomacao.com`.

   **Não adicione `forms.integrautomacao.com` em Custom domains do Pages.**
   Esse subdomínio é dedicado ao Resend como domínio de envio transacional e
   deve existir apenas nos registros DNS exigidos pelo Resend.

### Opção B — Deploy via GitHub Actions (uma fonte da verdade no CI)

O workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) faz
o build e o deploy via `wrangler pages deploy`. Em PRs gera preview com
URL postada como comentário. Em pushes para `main` deploya para produção.

**Secrets necessários** (Settings → Secrets and variables → Actions):

| Secret                       | Onde obter |
|------------------------------|-----|
| `CLOUDFLARE_API_TOKEN`       | https://dash.cloudflare.com/profile/api-tokens — escopo `Account: Cloudflare Pages: Edit` |
| `CLOUDFLARE_ACCOUNT_ID`      | Visível no dashboard CF, painel direito de qualquer página |
| `PUBLIC_TURNSTILE_SITE_KEY`  | Cloudflare → Turnstile → Site → Public site key |

Os secrets server-side (`TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`,
`RESEND_AUDIENCE_ID`, `CONTACT_EMAIL_*`) ficam **só no Cloudflare Pages**, não no GitHub —
porque eles são consumidos pela Pages Function em runtime, não pelo
build.

> **Escolha apenas uma das opções.** Misturar Opção A (auto-build do CF
> com base no Git) com Opção B (deploy via Actions) gera deploys
> duplicados e disputa de CDN cache.
>
> Por padrão neste repositório a **Opção A está ativa** (CF Pages
> conectado ao GitHub fazendo build automático). O workflow
> `deploy.yml` está com triggers `push`/`pull_request` comentados e
> roda apenas via `workflow_dispatch` (Actions → Deploy → Run workflow)
> como fallback manual. Para trocar para Opção B, descomente os
> triggers nesse workflow e desconecte a integração direta no painel
> da Cloudflare.

### Worker `legacy-redirects`

Roda **separado** do site Pages, em zone-level. Após o cutover de DNS:

```bash
cd workers
npx wrangler login                  # interativo, primeira vez
npx wrangler deploy                 # deploya o Worker (lê workers/wrangler.toml)
```

No painel: **Workers & Pages → integrautomacao-legacy-redirects → Triggers**
adicione a route `integrautomacao.com/*` (Zone:
integrautomacao.com).

> O `wrangler.toml` fica em `workers/`, não no root, para que o Cloudflare
> Pages não o leia como config de Pages durante o build.

## Branch protection (recomendado)

Settings → Branches → Add branch ruleset → Apply to **default branch**:

- Require a pull request before merging (1 approval mínima)
- Require status checks to pass before merging:
  - `Lint and build` (do workflow CI)
- Require conversation resolution before merging
- Require linear history (opcional, mantém histórico limpo)
- Restrict deletions
- Block force pushes

### Cloudflare Worker (legacy-redirects)

Roda **separado** do site. Deploy:

```bash
npx wrangler deploy
```

Depois, no painel da Cloudflare, configure a rota:
`integrautomacao.com/*` → Worker `integrautomacao-legacy-redirects`.

O Worker faz pass-through quando a URL não casa nenhum padrão legado, então
todas as URLs novas continuam servidas pelo CF Pages normalmente.

### Cloudflare Rate Limiting (proteção dos forms)

Configure uma regra de Rate Limiting (Account → Security → Rate Limiting)
para os paths `/api/contact` e `/api/newsletter`:

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

> `forms.integrautomacao.com` não deve apontar para Cloudflare Pages e não deve
> ficar como CNAME proxied. Use somente os registros TXT/MX/DKIM fornecidos pelo
> painel do Resend, todos como **DNS only**.

DMARC inicial (apenas após criar `dmarc@integrautomacao.com`):

```
_dmarc TXT "v=DMARC1; p=none; rua=mailto:dmarc@integrautomacao.com; fo=1"
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
