# integrautomacao.com.br

Site institucional da **Integra Automação Industrial** — engenharia e
integração de sistemas industriais.

Stack: **Astro + Tailwind v4 + MDX + TypeScript estrito**, hospedado em
**Cloudflare Pages** (estático) com **Cloudflare Pages Functions** para os
formulários e para a normalização canônica de hosts e URLs legadas.

## Pré-requisitos

- Node.js **22 LTS** (verifique com `node -v`; o repo tem `.nvmrc`)
- npm 10+

## Comandos

```bash
npm install              # instala dependências
npm run dev              # http://localhost:4321
npm run check            # astro check (TypeScript + content collections)
npm run build            # gera dist/
npm test                 # testes isolados das Pages Functions no runtime Workers
npm run types:check      # valida os tipos gerados do ambiente Cloudflare
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
│   ├── _routes.json         # escopo do middleware de Functions
│   ├── favicon.svg          # SimboloColorido (vetorial)
│   ├── favicon.ico          # 16/32/48 gerado do SVG (scripts/generateFavicons.mjs)
│   ├── apple-touch-icon.png # 180×180 gerado do SVG (idem)
│   ├── logo.png             # logo principal para JSON-LD
│   ├── robots.txt
│   ├── llms.txt             # resumo do site para agentes/LLMs
│   ├── rss.xsl              # stylesheet do feed RSS
│   ├── og/                  # cards sociais 1200×630 (seções + blog + cases)
│   ├── images/              # imagens públicas fora do pipeline astro:assets
│   ├── downloads/           # PDFs públicos (certificado Silver SI)
│   └── .well-known/         # security.txt
├── functions/               # Cloudflare Pages Functions e middleware
│   ├── _middleware.ts       # host canônico, redirects legados e headers da API
│   ├── _shared/             # limites de body/resposta, logs e Turnstile
│   ├── types.d.ts           # bindings gerados por wrangler types
│   └── api/
│       ├── contact.ts       # POST /api/contact (Turnstile + Resend)
│       └── newsletter.ts    # POST /api/newsletter (Contacts/Segments/Topics)
├── src/
│   ├── assets/              # imagens otimizadas via astro:assets
│   ├── components/          # componentes reutilizáveis
│   ├── content/             # blog, cases e eventos em .mdx
│   │   ├── blog/
│   │   ├── cases/
│   │   └── eventos/
│   ├── content.config.ts    # schemas zod das coleções
│   ├── data/                # autores, catálogo técnico, fontes, relações de cases
│   ├── layouts/
│   │   └── BaseLayout.astro # head, JSON-LD, Header, Footer
│   ├── pages/               # rotas
│   ├── styles/global.css    # Tailwind v4 + tokens @theme
│   └── utils/
│       ├── site.ts          # constantes de empresa (CNPJ, endereço, telefones)
│       ├── schema.ts        # geradores de JSON-LD (+ serializeJsonLd)
│       ├── collections.ts   # acesso centralizado às coleções (draft+sort)
│       ├── webform.ts       # helpers client-side dos formulários (Turnstile, status)
│       ├── turnstile.ts     # resolução da site key (build time)
│       └── eventDate.ts     # datas de eventos em pt-BR (partes UTC)
├── scripts/
│   └── generateFavicons.mjs # gera favicon.ico + apple-touch-icon.png do SVG
├── astro.config.mjs
├── tsconfig.json
├── wrangler.jsonc           # configuração única do Cloudflare Pages
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

3. **Imagem social (og:image):** a convenção é um card 1200×630 em
   `public/og/blog-<slug>.png`. A página usa essa arte automaticamente **se o
   arquivo existir**; sem ela, cai no card padrão da seção (`/og/blog.png`) —
   nunca quebra. Para arte diferente sem seguir a convenção, use `ogImage` no
   frontmatter.
4. Conteúdo em Markdown ou MDX. Para callouts técnicos:

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

### Novo evento

1. Crie `src/content/eventos/<slug>.mdx`
2. Frontmatter mínimo:

   ```yaml
   ---
   title: "Nome do evento"
   summary: "Resumo de uma linha — aparece em cards e meta description"
   startDate: 2026-05-10
   endDate: 2026-05-11        # opcional; não pode ser anterior a startDate
   eventStatus: completed     # scheduled | completed | cancelled | postponed
   location: "Belo Horizonte, MG · Centro de Convenções"
   organizer: "Nome do organizador"
   tags: ["PlantPAx"]
   coverImage: "../../assets/eventos/<slug>/foto-01.jpg"
   coverAlt: "Descrição da foto de capa"
   draft: false
   ---
   ```

   `coverImage` e `coverAlt` são **obrigatórios** (a capa alimenta o og:image
   da página, com dimensões reais passadas ao `og:image:width/height`).

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
2. Autorize a Cloudflare a acessar o repositório `rhcorsi/integrautomacao.com.br`
3. Configure o build:
   - **Project name**: `integrautomacao-com-br`
   - **Production branch**: `main`
   - **Framework preset**: Astro
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Em **Settings → Environment Variables → Production**, adicione:

   ```
   NODE_VERSION              = 22
   PUBLIC_TURNSTILE_SITE_KEY = <site key>     # public — vai para o HTML
   TURNSTILE_SECRET_KEY      = <secret>       # encrypted
   RESEND_SEND_API_KEY       = <sending key>  # encrypted; somente POST /emails
   RESEND_CONTACTS_API_KEY   = <full key>     # encrypted; somente newsletter
   RESEND_SEGMENT_ID         = <Segment ID>   # encrypted — newsletter Integra Ação
   RESEND_TOPIC_ID           = <Topic ID>     # encrypted — preferência explícita da newsletter
   CONTACT_EMAIL_TO          = comercial@integrautomacao.com.br
   CONTACT_EMAIL_FROM        = noreply@forms.integrautomacao.com.br
   ```

   Marque todas as variáveis server-side como **Encrypted** para não vazarem nos logs:
   `TURNSTILE_SECRET_KEY`, `RESEND_SEND_API_KEY`, `RESEND_CONTACTS_API_KEY`,
   `RESEND_SEGMENT_ID`, `RESEND_TOPIC_ID`,
   `CONTACT_EMAIL_TO` e `CONTACT_EMAIL_FROM`.
   `PUBLIC_TURNSTILE_SITE_KEY` precisa existir no ambiente de build; se faltar,
   o formulário aparece como indisponível e não cai mais em `mailto:` automático.
   Não use placeholders como `<site key pública do Turnstile>`; a site key
   pública atual é `0x4AAAAAADKRCm67kAoc7SHU`.
   Crie duas chaves distintas no Resend: uma chave **Sending access** restrita
   ao domínio de envio para `RESEND_SEND_API_KEY`, usada só pelo contato, e uma
   chave **Full access** para `RESEND_CONTACTS_API_KEY`, usada pelo workflow de
   Contacts/Segments/Topics. Não reutilize a chave full-access no endpoint de
   contato; registre owner, data de criação e rotação das duas chaves.
   `RESEND_SEGMENT_ID` e `RESEND_TOPIC_ID` são obrigatórios e usam o modelo
   atual de Contacts + Segments + Topics do Resend. Crie o Topic com padrão
   `opt_out` e selecione esse Topic em todo Broadcast da Integra Ação. Crie
   também quatro Contact Properties do tipo texto: `newsletter_consent_at`,
   `newsletter_policy_version`, `newsletter_consent_source` e
   `newsletter_consent_text`. A API devolve indisponibilidade se Segment ou
   Topic não estiver configurado e nunca confirma inscrição não registrada.
   O estado `unsubscribed` do Resend é global: se um contato já estiver em
   descadastro global, a Function preserva essa escolha e responde `409`
   (`GLOBAL_OPT_OUT`). A preferência da Integra Ação é controlada pelo Topic;
   não reative contatos manualmente sem confirmar o pedido pelo canal de
   privacidade.

5. Em **Custom domains**, mantenha/adicione apenas domínios que servem páginas:
   `integrautomacao.com.br`, `www.integrautomacao.com.br` e, se usados,
   `newsletter.integrautomacao.com.br`, `webinar.integrautomacao.com.br` e
   `eventos.integrautomacao.com.br`.

   **Não adicione `forms.integrautomacao.com.br` em Custom domains do Pages.**
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

Os secrets server-side (`TURNSTILE_SECRET_KEY`, `RESEND_SEND_API_KEY`,
`RESEND_CONTACTS_API_KEY`,
`RESEND_SEGMENT_ID`, `RESEND_TOPIC_ID`, `CONTACT_EMAIL_*`) ficam **só no Cloudflare Pages**, não no GitHub —
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

## Branch protection (recomendado)

Settings → Branches → Add branch ruleset → Apply to **default branch**:

- Require a pull request before merging (1 approval mínima)
- Require status checks to pass before merging:
  - `Lint and build` (do workflow CI)
- Require conversation resolution before merging
- Require linear history (opcional, mantém histórico limpo)
- Restrict deletions
- Block force pushes

### Migração do antigo Worker de redirects

O middleware de Pages em `functions/_middleware.ts`, apoiado por
`shared/legacy-redirects.ts`, consolida host, query string e aliases conhecidos
em um único salto; `public/_redirects` permanece como fallback path-based do
Pages. Se o Worker
`integrautomacao-legacy-redirects` ou sua route de zona já tiverem sido
publicados, remova a route e depois o Worker no dashboard da Cloudflare. Essa
limpeza é externa ao repositório e deve acompanhar o primeiro deploy desta
versão para evitar duas camadas tomando decisões sobre a mesma URL.

### Cloudflare Rate Limiting (proteção dos forms)

Configure uma regra de Rate Limiting (Account → Security → Rate Limiting)
para os paths `/api/contact` e `/api/newsletter`:

- Janela: 10 segundos (limite do Free plan)
- Threshold: 3-5 requests por IP
- Ação: Block (HTTP 429)

O código também limita o corpo JSON por bytes mesmo quando não há
`Content-Length`, restringe o tamanho das respostas dos provedores, usa timeout
e idempotência nas operações compatíveis e não grava PII nos eventos
personalizados. O código emite apenas eventos estruturados minimizados;
invocation logs e traces automáticos permanecem desativados para evitar que URL,
User-Agent ou identificadores presentes em chamadas de provedor sejam retidos
por padrão. Ajuste acesso e retenção no dashboard conforme a política interna.

## Testes das Functions

Os testes usam o runtime Workers com Vitest. Eles cobrem limites de body UTF-8,
validação Turnstile, retry idempotente de e-mail e os cenários de compensação da
newsletter, incluindo respostas perdidas após uma mutação no Resend.

```bash
npm test
npm run types:check
npm run check
npm run build
```

Após alterar bindings ou `wrangler.jsonc`, regenere e versione os tipos:

```bash
npm run types:generate
```

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

> `forms.integrautomacao.com.br` não deve apontar para Cloudflare Pages e não deve
> ficar como CNAME proxied. Use somente os registros TXT/MX/DKIM fornecidos pelo
> painel do Resend, todos como **DNS only**.

DMARC inicial (apenas após criar `dmarc@integrautomacao.com.br`):

```
_dmarc TXT "v=DMARC1; p=none; rua=mailto:dmarc@integrautomacao.com.br; fo=1"
```

## Backlog editorial e operacional

- [ ] **P0 antes do próximo deploy:** concluir o gate de direitos de todos os
      ativos de terceiros em [`ASSET_RIGHTS_REVIEW.md`](./ASSET_RIGHTS_REVIEW.md),
      anexando comprovante interno ou substituindo/removendo o item.
- [ ] **CI:** falhar o build de produção se `PUBLIC_TURNSTILE_SITE_KEY` estiver
      ausente/placeholder — sem a key, os formulários renderizam o estado de
      indisponibilidade (fail-closed por design, mas silencioso).
- [ ] **CSP reporting:** avaliar endpoint de `report-to`/`report-uri` (ex.:
      um Pages Function gravando métrica estruturada) para tornar violações de
      CSP visíveis em produção — hoje elas são silenciosas.
- [ ] **P0 antes de usar Broadcasts da newsletter:** decidir e implementar
      double opt-in (link transacional assinado, expiração e Topic em `opt_out`
      até a confirmação) ou registrar decisão formal de produto/privacidade.
      Turnstile prova uma interação, não o controle da caixa postal; o aceite
      atual do formulário, isoladamente, não autentica o titular do e-mail.
- [ ] Definir orçamento global de tempo para os workflows de contato e
      newsletter e, para mutações da newsletter, uma via de compensação
      independente (por exemplo, Queue/Workflow). Cada chamada já tem deadline,
      mas tentativas sequenciais podem somar latência maior durante
      indisponibilidade prolongada do provedor.
- [ ] Adicionar páginas setoriais somente quando houver conteúdo próprio,
      fontes primárias e evidências publicáveis para o segmento.
- [ ] Publicar novos cases apenas com autorização, anonimização e distinção
      explícita entre imagem real e ilustração.
- [ ] Publicar artigos quando a revisão técnica e as fontes estiverem prontas;
      a qualidade editorial prevalece sobre uma cadência fixa.
- [ ] Avaliar busca interna quando o volume e os dados de navegação demonstrarem
      necessidade, sem adotar um limite arbitrário de itens.
- [ ] Avaliar HSTS preload e DMARC `p=reject` após validar todos os subdomínios,
      remetentes e fluxos de recuperação envolvidos.
- [ ] Versão em inglês (`/en/`) se mirar multinacionais

## Mais detalhes

O plano completo do projeto está em
`C:\Users\rafha\.claude\plans\baixei-o-backup-e-mellow-cosmos.md`.
Inclui contexto, decisões técnicas, direção de UX/UI com benchmarks
(Cybertrol, Brock, Rockwell, AVEVA), cronograma e roadmap pós-lançamento.
