# integrautomacao.com.br

Site institucional da **Integra Automação Industrial** — engenharia e
integração de sistemas industriais.

Stack: **Astro + Tailwind v4 + MDX + TypeScript estrito**, hospedado em
**Cloudflare Pages** (estático) com **Cloudflare Pages Functions** para os
formulários e para a normalização canônica de hosts, portas e URLs legadas.

> **Este README é a bíblia do site.** Ele documenta não só o "como rodar",
> mas o *porquê* de cada decisão de arquitetura, SEO, performance,
> acessibilidade e segurança. Ao mudar qualquer convenção aqui descrita,
> atualize este arquivo no mesmo commit.

O baseline funcional auditado, seus bindings, a migration D1 e os limites
operacionais estão registrados em
[`docs/PRODUCTION_STATUS.md`](./docs/PRODUCTION_STATUS.md).

**Escopo deste manual:** todos os módulos executáveis/configuráveis do
repositório são catalogados abaixo, incluindo o fluxo completo de build,
request, browser, Functions, D1, Resend, auditorias, testes, CI e deploy. Os
arquivos MDX são inventariados por collection/rota porque seu corpo é conteúdo
editorial, não uma segunda implementação de runtime; imagens/binários são
governados pelo inventário de direitos.

## Estado atual (agosto/2026)

| Indicador | Valor |
|---|---|
| Páginas geradas | 112 (inclui `/busca/` e confirmação da newsletter, ambas noindex) |
| Lighthouse mobile | 98 Performance · 100 A11y · 100 BP · 100 SEO |
| Lighthouse desktop | 100 em todas as categorias |
| Core Web Vitals (lab, mobile) | FCP 1,7s · LCP 2,1s · TBT 0 · CLS 0 |
| Busca interna | Pagefind — 111 páginas indexadas em pt-BR |
| Testes automatizados | 574/574: Workers 447 · Node 87 · UI 40 |
| Auditoria editorial (`audit:editorial`) | aprovada sem ocorrências |
| Conteúdo | 13 posts · 1 case · 11 eventos · 41 páginas de tecnologia · 9 setores · 7 soluções · 2 serviços |

## Pré-requisitos

- Node.js **22.23.2** (verifique com `node -v`; o repo tem `.nvmrc`)
- npm **10.9.8** (verifique com `npm --version`; o `package.json` recusa outra versão para desenvolvimento)

## Comandos

```bash
npm ci                   # instala exatamente o package-lock.json
npm run dev              # http://localhost:4321
npm run check            # astro check (TypeScript + content collections)
npm run build            # gera dist/
npm test                 # Workers → Node → UI (as três lanes, nessa ordem)
npm run test:workers     # Pages Functions no runtime Workers
npm run test:node        # políticas, output e scripts no runtime Node
npm run test:ui          # controladores DOM no happy-dom
npm run types:check      # valida os tipos gerados do ambiente Cloudflare
npm run preview          # serve dist/ localmente
npm run pages:dev        # serve dist/ + functions/ via wrangler
                         # (necessário para testar /api/contact e /api/newsletter local)
```

### Quality gates (rodam em sequência em `npm run audit:editorial`)

| Script | O que verifica |
|---|---|
| `audit:routes` | Toda referência interna do HTML gerado (28 mil+) aponta para página existente |
| `audit:redirects` | Regras de `_redirects` + `legacy-redirects.ts`: alvos existem, sem cadeias |
| `audit:terminology` | Terminologia técnica correta no texto visível (nomes de produto, normas) |
| `audit:prose` | Prosa: espaços duplos, capitalização do catálogo |
| `audit:utf8` | 100% dos arquivos com UTF-8 válido (sem mojibake/BOM quebrado) |
| `audit:faqs` | **Zero FAQ duplicada** no catálogo de 240+ perguntas |
| `audit:html` | Auditoria editorial do HTML: títulos 30–65 chars, datas do JSON-LD com `<time>` visível correspondente, FAQPage espelhando o conteúdo, etc. |

Gates complementares, executados separadamente:

```bash
npm run audit:seo            # contrato SEO do dist/ já gerado
npm run audit:deploy-policy  # política legacy-bridge/static-first
npm run audit:deps           # auditoria high + auditoria completa
npm run types:generate       # após alterar wrangler.jsonc ou bindings
```

### Geradores de assets e scripts utilitários (`scripts/`)

| Script | Para que serve | Quando rodar |
|---|---|---|
| `generateFavicons.mjs` | Gera `favicon.ico` (16/32/48) e `apple-touch-icon.png` (180×180) a partir do `favicon.svg` via sharp | `node scripts/generateFavicons.mjs` — só quando o símbolo da marca mudar |
| `generate_og_images.py` | Gera os cards sociais 1200×630 de `public/og/` (PIL/Pillow; fontes do Windows) | Ao criar post/case novo (convenção `blog-<slug>.png` / `case-<id>.png`) |
| `verifyRoutes.cjs` | Toda referência interna do `dist/` aponta para página existente | via `audit:editorial` |
| `verifyRedirects.cjs` | Alvos de `_redirects` + `legacy-redirects.ts` existem; sem cadeias | via `audit:editorial` |
| `verifyTechnicalTerminology.cjs` | Nomes de produtos/normas escritos corretamente no texto visível | via `audit:editorial` |
| `verifyAllProse.cjs` | Espaços duplos, capitalização do catálogo | via `audit:editorial` |
| `verifyUtf8.cjs` | UTF-8 válido em 100% dos arquivos | via `audit:editorial` |
| `checkTechCatalogFaqs.cjs` | Zero FAQ duplicada nas 240+ do catálogo | via `audit:editorial` |
| `auditEditorialHtml.cjs` | Títulos 30–65 chars, datas do schema com `<time>` visível, FAQ espelhada | via `audit:editorial` |
| `checkEncoding3.cjs`, `compareFaqs.cjs`, `listAllSolutionFaqs.cjs` | Utilitários pontuais de inspeção (não rodam no gate) | sob demanda |

> **Gotcha de encoding (Windows):** nunca editar arquivos do `src/` com
> `Get-Content`/`Set-Content` do PowerShell 5.1 — ele lê UTF-8 sem BOM como
> Windows-1252 e grava mojibake (incidente real de ago/2026 no
> `AnimatedPlantDiagram`). Usar a ferramenta de edição da IDE/agente ou .NET
> com `UTF8Encoding($false)`.

**Build de produção exige** `PUBLIC_TURNSTILE_SITE_KEY` no ambiente; sem ela
os formulários renderizam o estado de indisponibilidade (fail-closed por
design). Localmente, para validar o formulário completo no build:

```powershell
$env:PUBLIC_TURNSTILE_SITE_KEY = "0x4AAAAAADKRCm67kAoc7SHU"; npm run build
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
│   ├── _middleware.ts       # host/porta/protocolo canônicos + redirects legados + headers da API
│   ├── _shared/             # env/http/turnstile + domínio da newsletter
│   │   └── newsletter/      # crypto, e-mail, D1 store, provider e reconciliação
│   ├── types.d.ts           # bindings gerados por wrangler types
│   └── api/
│       ├── contact.ts       # POST /api/contact (Turnstile + Resend)
│       ├── newsletter.ts    # POST inicial: D1 pending + e-mail de confirmação
│       └── newsletter/
│           └── confirm.ts   # POST atômico da confirmação + reconciliação
├── migrations/
│   └── 0001_newsletter_consent.sql # schema D1, ledger, tokens, jobs e view
├── config/
│   └── deployment-phase.json # modo de roteamento auditado (legacy-bridge)
├── shared/
│   └── legacy-redirects.ts  # mapa de redirects legados (espelhar em public/_redirects)
├── src/
│   ├── assets/              # imagens otimizadas via astro:assets
│   ├── components/          # componentes reutilizáveis (ver inventário abaixo)
│   ├── content/             # blog, cases e eventos em .mdx
│   │   ├── blog/
│   │   ├── cases/
│   │   └── eventos/
│   ├── content.config.ts    # schemas zod das coleções
│   ├── data/                # authors.ts, techCatalog.ts, sourceRegistry.ts, caseRelations.ts
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
├── scripts/                 # quality gates (verify*.cjs) + geradores de assets
├── tests/                   # Vitest: Workers; tests/node; tests/ui (happy-dom)
├── astro.config.mjs
├── tsconfig.json
├── wrangler.jsonc           # configuração única do Cloudflare Pages
├── .npmrc                   # include=optional — SEM ele, npm ci no Linux do
│                            # Pages omite binários opcionais (lightningcss,
│                            # emnapi, pagefind) e o build quebra
├── .nvmrc                   # Node 22.23.2 (CI e Pages leem daqui)
└── package.json
```

## Inventário de rotas (112 páginas)

| Seção | Rotas | Origem |
|---|---|---|
| `/` home | 1 | estática |
| Páginas-pilar e institucionais | 12 | `automacao-industrial`, `ciberseguranca-ot`, `automacao-industrial-maringa`, `automacao-industrial-parana`, `integrador-rockwell`, `empresa`, `equipe/`, `certificacoes` (+`silver-system-integrator`), `contato`, `setores.astro` (índice), `404` |
| `/solucoes/` | 8 | índice + 7 estáticas (plantpax, factorytalk, redes-iec-62443, modernizacao-scada, migracao-plc, pi-system, data-centers) |
| `/servicos/` | 3 | índice + programacao-clp + comissionamento-industrial |
| `/setores/` | 9 | páginas estáticas por setor |
| `/tecnologias/` | 42 | índice + `[slug]` data-driven (41 entradas em `techCatalog.ts`) |
| `/blog/` | 14 | índice + 13 posts `.mdx` |
| `/cases/` | 2 | índice + projeto-moinho |
| `/eventos/` | 12 | índice + 11 eventos `.mdx` |
| `/integra-acao/` | 4 | índice + newsletter + confirmação + webinar (confirmação e webinar são **noindex**) |
| Legais | 4 | politica-privacidade, uso-de-cookies, politica-editorial, avisos-legais |
| Utilitárias | 2 | `/busca/` (noindex, fora do sitemap), `/404.html` (noindex, fora do sitemap) |
| Feeds/meta | — | `/rss.xml`, `/sitemap-index.xml`, `/llms.txt`, `/.well-known/security.txt` |

## Dados institucionais (fonte única: `src/utils/site.ts`)

Os valores abaixo alimentam header, footer, contato, JSON-LD e og — mudam
**somente** em `site.ts`:

| Campo | Valor |
|---|---|
| Razão social | Integra Automação Industrial Ltda - ME |
| CNPJ | 24.543.173/0001-14 |
| Fundação | 2016 · Maringá-PR |
| Endereço | Rua Topázio, 965 — Maringá-PR · CEP 87.083-050 |
| Geo | -23.4173, -51.9333 |
| E-mail comercial | comercial@integrautomacao.com.br |
| E-mail privacidade | lgpd@integrautomacao.com.br |
| Telefone comercial | (44) 3305-7147 (`PHONE_COMMERCIAL`) |
| WhatsApp | (44) 99952-3947 (`PHONE_WHATSAPP`) |
| LinkedIn | linkedin.com/company/integrautomacao |
| Credencial | Silver System Integrator (Rockwell PartnerNetwork) + PlantPAx DCS Certified |

## Design system

### Tokens (`src/styles/global.css`, bloco `@theme`)

- **Cores de marca:** `integra-red` (#e30613, +300/700/800), escala
  `integra-gray-50…950`, `integra-black`, `integra-white`.
- **Acento OT:** `integra-ot` (#003a5d) e `integra-ot-700` — usado SOMENTE em
  seções de cibersegurança/redes industriais e na ferramenta RFP.
- **Não existe `integra-blue/yellow/green`** — qualquer classe com esses
  prefixos simplesmente não é gerada pelo Tailwind v4 (bug histórico do
  RfpChecklist, corrigido em ago/2026). Antes de inventar cor, consulte o tema.
- **Tipografia:** Inter Variable (texto) + JetBrains Mono Variable (código,
  eyebrows, labels técnicos), auto-hospedadas com subsets latin/latin-ext —
  os imports completos do fontsource embutiam cirílico/grego/vietnamita sem
  uso; os blocos `@font-face` são copiados à mão e o subset latin da Inter
  tem `preload` no `<head>` (fonte do texto LCP).
- **Containers:** `container-narrow` (56rem, prosa), `container-default`
  (80rem), `container-wide` (96rem), `container-fluid` (120rem, seções amplas).

### Utilities customizadas

- `bg-premium-dark` / `bg-premium-dark-card` — gradientes escuros das seções
  premium e do CTA dark.
- `reveal` — scroll-reveal em **CSS puro** (scroll-driven animations,
  `animation-timeline: view()`), progressivo: sem suporte ou com
  `prefers-reduced-motion`, o conteúdo aparece estático. Sem JavaScript.

### Regras globais importantes

- `prefers-reduced-motion` zera animações/transições globalmente.
- `:focus-visible` global: outline vermelho 2px — não remover sem
  substituto visível igualmente forte (WCAG 2.4.7/2.4.11).
- `@media print`: esconde chrome (header/footer/skip-link) e evita quebra
  dentro de cards/fieldsets — beneficia artigos e a ferramenta RFP.
- `text-wrap: balance` em headings, `pretty` em parágrafos.

### Inventário de componentes (`src/components/`)

| Componente | Propósito | Notas de uso |
|---|---|---|
| `Header` | Nav sticky + mega-menus (desktop ≥1440px) + menu mobile + gatilho de busca | Mega-menus de Cases/Blog/Eventos são dinâmicos (via `collections.ts`); contexto de contato é capturado no clique pelo script do BaseLayout |
| `Footer` | 4 colunas de nav + faixa de contato + legal | Usa `PHONE_COMMERCIAL`/`PHONE_WHATSAPP` nomeados |
| `PageHero` | Cabeçalho padrão de páginas internas: textura de grid + breadcrumb visual + eyebrow por acento de seção | Slots: `title` (título com marcação), `aside` (coluna lateral), default (extras após a descrição). `isolate` é obrigatório para a textura -z-10 |
| `MetricStrip` | Faixa de fatos verificáveis em mono | Só números públicos/comprováveis — nunca vaidade nem dados de cliente |
| `HeroIntegridade` | Hero principal (light/dark) | A `section` tem `isolate` — **obrigatório** para as camadas decorativas `-z-10` renderizarem |
| `AnimatedPlantDiagram` | SVG animado do fluxo Purdue (home) | `role="img"` com title/desc; pulsos via `offset-path` (decisão aceita: CLS/TBT zero); `min-w` + scroll horizontal no mobile |
| `ArchitectureDiagram` | SVG estático Purdue/IDMZ | Usado em redes-iec-62443; hover esmaece as demais zonas (só `hover:hover`); legenda visível abaixo serve touch/keyboard |
| `ManualReference` | Figura técnica com fonte rastreável | Props `sizes`/`widths` devem refletir a coluna real (não aceitar o default 800px em grids); link de fonte tem `aria-label` único |
| `FeatureBlock` | Bloco feature alternado com imagem | `sizes` alinhado a ~600px de coluna |
| `SectionHeader` | Cabeçalho de seção (eyebrow/h2/desc) | H2 fixo — cards internos devem usar H3 |
| `ValueCard` | Card de valor com badge numérico | Badge é `aria-hidden`; usar dentro de `<ol>` quando houver ordem (ver `empresa.astro`) |
| `SolutionCard` | Card-link de solução | Transições escopadas (sem `transition-all`) |
| `CtaBlock` | CTA final (light/dark) | H2 fixo — usar apenas no fim da página |
| `CredentialStrip` | Faixa de parcerias com tipologia de vínculo | Transparência editorial |
| `LifecycleRail` | "Método Integra" em 5 fases | `<ol>` semântico; `id="metodo-integra"` único por página |
| `FAQAccordion` | Acordeão nativo `<details>` | Sem JS; fix Safari via `::-webkit-details-marker`; `set:html` somente com conteúdo local confiável |
| `TechnicalCallout` | Callout note/warning/ot | Mapeado como `aside` do MDX; `role="note"` |
| `Breadcrumbs` | Trilha visual sincronizada com o JSON-LD | Folha truncada tem `title` |
| `DeliverableList`, `StandardsBadges` | Listas de entregáveis/normas | H3 fixo |
| `RelatedSectors` | Grid de setores relacionados | Eyebrow repetido é `aria-hidden` |
| `RfpChecklist` | Ferramenta interativa de RFP (27 itens) | Data-driven; score com `aria-live` + `progressbar`; usa só tokens reais do tema |
| `ContactForm` / `NewsletterForm` | Formulários (ver seção própria) | |
| `EmailLink` | mailto com opt-out da ofuscação CF | Ver "Segurança" |
| `EventDate` | Data/intervalo de eventos | **Nunca colapsar ranges** — ver regra em "Auditoria editorial" |
| `CtaBlock`, `FeatureBlock`… | — | Botões primário/secundário seguem os mesmos tokens em todo o site |

## Fluxo completo de execução

Esta seção liga a entrada de cada fluxo ao último efeito observável. Ela é a
referência para descobrir **onde** alterar comportamento sem espalhar lógica
duplicada.

### 1. Build estático

1. `npm run build` executa `astro build` e depois `pagefind --site dist`.
2. `astro.config.mjs` fixa o site canônico, output estático, prefetch em
   `hover`, MDX, sitemap, ícones Lucide, Tailwind v4 e `assetsInlineLimit: 0`
   para não gerar JavaScript executável inline.
3. `src/content.config.ts` valida frontmatter de blog, cases e eventos. Os
   helpers de `src/utils/collections.ts` removem drafts e ordenam publicações.
4. Rotas estáticas e `getStaticPaths()` das rotas dinâmicas montam cada página.
5. `BaseLayout.astro` resolve canonical/noindex, metadados sociais, fontes,
   JSON-LD, Header/Footer e scripts globais. `serializeJsonLd()` escapa `<`.
6. `@astrojs/sitemap` chama `shouldIncludeInSitemap()`; APIs e rotas noindex
   nunca entram no sitemap.
7. O build copia `_headers`, `_redirects` e `_routes.json` para `dist/`.
8. Pagefind indexa o `<main data-pagefind-body>` das páginas que processa,
   respeita marcadores locais `data-pagefind-ignore` e gera `dist/pagefind/`.
   `noindex` de robôs e inclusão no Pagefind são políticas distintas.

### 2. GET de uma página pública

1. Cloudflare recebe host, protocolo, porta, path e query.
2. `public/_routes.json` deixa assets pesados fora de Functions, mas o modo
   `legacy-bridge` envia as demais rotas ao middleware.
3. `functions/_middleware.ts::onRequest()` valida host de produção, remove
   porta/protocolo alternativo e consulta `resolveLegacyRedirect()`.
4. Havendo redirect, responde em um salto para o apex HTTPS e preserva apenas
   a query permitida pelo contrato do alias.
5. Sem redirect, chama `context.next()`. Respostas `/api/` recebem hardening e
   `no-store`; páginas/arquivos recebem a política declarada em `_headers`.
6. O browser carrega assets Astro com hash e cache imutável; HTML permanece
   revalidável.

### 3. POST de contato

1. `ContactForm.astro` valida conveniência no cliente, coleta contexto do CTA e
   envia JSON para `/api/contact` com Turnstile e timeout de 20s.
2. `functions/api/contact.ts` exige método/origin válidos, limita bytes,
   normaliza campos e trata honeypot sem revelar a detecção.
3. `verifyTurnstile()` chama `siteverify` com deadline e resposta limitada.
4. Com validação aceita, a Function usa `RESEND_SEND_API_KEY`, remetente e
   destino dedicados. O provider tem timeout de 10s e até 3 tentativas para
   condições transitórias; retry mantém payload e idempotency key estáveis.
5. A resposta usa `jsonResponse()`, `no-store` e mensagem pública limitada;
   logs estruturados não contêm corpo, e-mail ou token.

### 4. POST inicial da newsletter

1. `NewsletterForm.astro` envia nome, e-mail, ciência de consentimento,
   Turnstile e origem contextual para `/api/newsletter`.
2. `functions/api/newsletter.ts::onRequestPost()` valida Content-Type, limite
   de 8.000 bytes, campos, Origin/Sec-Fetch-Site e coerência entre ambiente,
   request host e `NEWSLETTER_CONFIRMATION_ORIGIN`.
3. A Function gera 32 bytes aleatórios; somente o SHA-256 do token é gravado.
4. `createNewsletterStore().registerPending()` grava subscription, evidência,
   ledger `request_received` e token em uma transação D1 protegida contra
   colisão/rebind.
5. A resposta HTTP é sempre neutra (`202`) após armazenamento válido. Quando há e-mail novo a entregar,
   `sendConfirmationEmail()` roda em `waitUntil` com chave transacional e link
   cujo token fica no fragmento `#token=...`.
6. Entrega/falha atualiza o estado por CAS. Uma limpeza limitada de pendências
   antigas e um drain de reconciliação também podem rodar em `waitUntil`.

### 5. Confirmação da newsletter

1. `/integra-acao/newsletter/confirmar/` é estática, noindex e não faz POST
   automaticamente.
2. `createNewsletterConfirmationController()` lê o fragmento uma vez, remove-o
   cedo com `history.replaceState` e só habilita a ação explícita do usuário.
3. `postNewsletterConfirmation()` envia JSON para
   `/api/newsletter/confirm`, usa timeout de 12s, `redirect: "error"`, limita a
   resposta a 4 KiB e classifica status/body de forma fail-closed.
4. `functions/api/newsletter/confirm.ts` valida o token, calcula um único hash
   e chama `consumeConfirmation()`.
5. O D1 executa UPDATE condicional + trigger: consome token uma vez, move a
   subscription para `confirmed`, copia a evidência imutável, acrescenta
   `mailbox_confirmed` ao ledger e cria o job `resend_reconcile`.
6. Confirmação nova e replay legítimo retornam estados públicos seguros;
   expirado e inválido não revelam dados internos. O drain do provider roda em
   `waitUntil`.

### 6. Reconciliação Resend

1. `drainNewsletterJobs()` trabalha no máximo 2 jobs dentro de 25s.
2. O store reivindica o job com lease de 30s e usa `attempts` como fencing
   token: worker antigo não pode concluir depois de reclaim.
3. `createResendNewsletterProvider()` faz read/mutation/read-back de Contact,
   quatro properties, Segment e Topic com respostas limitadas e
   `redirect: "error"`.
4. Opt-out global prevalece sobre qualquer evidência local e bloqueia o job.
5. Sucesso inequívoco marca `provider_state=reconciled`; ambiguidade ou falha
   volta a `pending` com backoff 1, 5, 15, 60 e 360 minutos.
6. IDs de provider, chaves e endereços não entram em respostas públicas nem
   eventos estruturados. Broadcast continua bloqueado até read-back atual.

### 7. Navegação e overlays no browser

1. `Header.astro` entrega markup desktop/mobile e importa
   `initMobileNavigation()`.
2. O controller mede a altura real do header, abre/fecha o painel, contém Tab,
   devolve foco, fecha por Escape/link/click externo e encerra no breakpoint
   desktop.
3. `overlayLock.ts` mantém um conjunto de owners. O primeiro lock congela o
   overflow da raiz; somente o último release restaura o valor anterior.
4. Ambos são testados sem depender do Astro em `tests/ui/` com `happy-dom`.

## Catálogo completo de módulos

### Layout, configuração e conteúdo tipado

| Arquivo | Responsabilidade e contrato |
|---|---|
| `astro.config.mjs` | Configuração única do Astro: domínio canônico, output estático, MDX, sitemap filtrado, ícones, Tailwind, prefetch e assets JS externos. |
| `src/layouts/BaseLayout.astro` | Shell de toda página: `<head>`, canonical/noindex, OG/Twitter, JSON-LD, fontes, skip-link, Header, main, Footer e scripts globais. Props de SEO devem chegar aqui, não ser reimplementadas por página. |
| `src/content.config.ts` | Schemas das coleções `blog`, `cases` e `eventos`; falha o build quando frontmatter obrigatório ou tipos estão errados. |
| `src/styles/global.css` | Tailwind v4, tokens de marca, tipografia, containers, estados de foco, reduced-motion, impressão e utilities globais. |
| `tsconfig.json` | TypeScript estrito, aliases `~/` e `@/`, tipos Astro/Workers e exclusão de `dist`/`node_modules`. |
| `wrangler.jsonc` | Projeto Pages, compatibility date, vars públicas, origem de confirmação e bindings D1 separados por ambiente. Segredos nunca entram neste arquivo. |

### Utilitários de `src/utils/`

| Arquivo / export | Função |
|---|---|
| `site.ts` — `Phone`, `MegaMenuPromo`, `MegaMenuColumn`, `MegaMenu`, `SITE`, `COMPANY`, `PHONE_COMMERCIAL`, `PHONE_WHATSAPP`, `NAV`, `MEGA_MENUS` | Fonte única de identidade, contatos e navegação. Consumidores não devem inferir telefone pela posição do array. |
| `schema.ts` — `ORG_ID`, `serializeJsonLd`, `organizationSchema`, `websiteSchema`, `breadcrumbItems`, `breadcrumbSchema`, `articleSchema`, `serviceSchema`, `faqSchema`, `itemListSchema`, `eventSchema`, `techArticleSchema` | Constrói JSON-LD coerente e referências por `@id`; `serializeJsonLd` é obrigatório antes de `set:html`. |
| `collections.ts` — `getPublishedPosts`, `getPublishedCases`, `getPublishedEventos` | Busca as collections, exclui drafts e aplica ordenação estável usada em rotas e menus. |
| `eventDate.ts` — `isoEventDate`, `formatEventDate`, `formatEventDateRange` | Mantém ISO para máquina e texto pt-BR para UI sem deslocamento acidental de timezone. |
| `seo-policy.ts` — `NOINDEX_PATHS`, `normalizeSeoPath`, `shouldIncludeInSitemap`, `resolveCanonicalUrl` | Uma política compartilhada para canonical, noindex e sitemap; rejeita APIs e normaliza apenas a barra final duplicada. |
| `turnstile.ts` — `resolveTurnstileSiteKey` | Valida a site key pública no build e devolve vazio para ausente/placeholder, mantendo formulário fail-closed. |
| `webform.ts` — `FormStatusTone`, `TurnstileWindow`, `TURNSTILE_API_SRC`, `ensureTurnstileScript`, `turnstileRendered`, `watchTurnstileBlocked`, `setFormStatus`, `responseMessage`, `FORM_FETCH_TIMEOUT_MS`, `networkErrorMessage` | Primitivos browser dos formulários: script único, fallback de ad-blocker, status acessível, parsing defensivo e copy de erro. |

### Dados canônicos de `src/data/`

| Arquivo | Responsabilidade |
|---|---|
| `authors.ts` — `COLLECTIVE_AUTHOR`, `COMPANY_FOUNDING`, `TEAM_MEMBERS` | Autor coletivo, fundação e equipe; fornece IDs/URLs usados pelo schema editorial. |
| `caseRelations.ts` | `TechLink`, `CaseSolution`, `TECH_LINKS` e `CASE_SOLUTIONS`; relações contextuais explícitas, não inferidas por texto. |
| `sourceRegistry.ts` | `PublicSourceReference`, registry normalizado de fontes públicas e `publicSourceFor()`; distingue fonte citada de material apenas relacionado. |
| `techCatalog.ts` — `TechGroup`, `TechPage`, `GROUP_ORDER`, `CATALOG_PUBLISHED`, `CATALOG_REVIEWED_BY`, `techCatalog`, `TECH_REVIEW_DATES`, `techCatalogBySlug` e helpers | Tipos, 41 entradas do catálogo, grupos, FAQs, relações e `getTechReview`, `getTechBySlug`, `getTechByGroup`, `getRelatedTech`. Valida slugs/datas no carregamento. |

### Rotas Astro e sua origem

| Família | Arquivos / comportamento |
|---|---|
| Raiz e legais | `index.astro`; `404.astro`; `avisos-legais.astro`; `politica-editorial.astro`; `politica-privacidade.astro`; `uso-de-cookies.astro`. A 404 é noindex e sem canonical. |
| Empresa e contato | `empresa.astro`; `equipe/index.astro`; `contato.astro`; `integrador-rockwell.astro`; `certificacoes.astro`; `certificacoes/silver-system-integrator.astro`. |
| Automação regional | `automacao-industrial.astro`; `automacao-industrial-maringa.astro`; `automacao-industrial-parana.astro`. Cada URL possui intenção própria; não canonicalizar umas nas outras. |
| Serviços | `servicos/index.astro`; `servicos/programacao-clp.astro`; `servicos/comissionamento-industrial.astro`. |
| Soluções | `solucoes/index.astro` mais `plantpax`, `factorytalk`, `redes-iec-62443`, `modernizacao-scada`, `migracao-plc`, `pi-system` e `data-centers`. |
| Cibersegurança OT | `ciberseguranca-ot.astro`, página técnica própria com artigo/FAQ/glossário. |
| Setores | `setores.astro` mais 9 páginas em `setores/`: açúcar/etanol, alimentos/bebidas, armazenagem de grãos, etanol de milho, fábricas de ração, frigoríficos, papel/celulose, química/fertilizantes e saneamento. |
| Tecnologias | `tecnologias/index.astro` e `tecnologias/[slug].astro`; `getStaticPaths()` nasce das 41 entradas de `techCatalog`. |
| Blog | `blog/index.astro` e `blog/[...slug].astro`; lista/renderiza somente collection publicada, com schema e OG por slug/fallback. |
| Cases | `cases/index.astro` e `cases/[...slug].astro`; collection publicada, relações explícitas e imagens sanitizadas. |
| Eventos | `eventos/index.astro` e `eventos/[...slug].astro`; collection publicada, datas UTC-estáveis e `Event` JSON-LD. |
| Integra Ação | `integra-acao/index.astro`; `newsletter.astro`; `newsletter/confirmar.astro`; `webinar.astro`. Confirmação e webinar permanecem noindex. |
| Busca | `busca/index.astro`; shell noindex da UI Pagefind, índice criado apenas no build. |
| Feed | `rss.xml.ts::GET()`; gera RSS dos posts publicados e aponta para `rss.xsl`. |

### Controladores browser de `src/scripts/`

| Arquivo / export | Responsabilidade |
|---|---|
| `overlayLock.ts` — `acquireOverlayLock`, `releaseOverlayLock`, `clearOverlayLocks` | Lock reentrante por token para overlays; preserva/restaura o overflow inline original. |
| `mobileNavigation.ts` — `initMobileNavigation` | Estado do menu mobile, foco, Tab/Escape, ResizeObserver/fallback, breakpoint e teardown idempotente. Ignora controles disabled, ocultos ou com `tabIndex < 0`. |
| `newsletterConfirmation.ts` — `ConfirmationUiState`, `ConfirmationPostResult`, `ConfirmationHttpDependencies`, `NewsletterConfirmationDependencies`, `ConfirmationElementPort`, `ConfirmationButtonPort`, `ConfirmationRenderElements`, `CONFIRMATION_RESPONSE_MAX_BYTES`, `createNewsletterConfirmationController`, `classifyConfirmationHttpResponse`, `postNewsletterConfirmation`, `createNewsletterConfirmationRenderer` | Máquina de estados `idle/ready/submitting/confirmed/already-processed/expired/error`, transporte seguro do token e renderização acessível por portas testáveis. |

### Pages Functions e domínio server-side

| Arquivo / export | Responsabilidade |
|---|---|
| `functions/_middleware.ts::onRequest` | Canonicaliza host/protocolo/porta, aplica redirects legados, chama a próxima camada e endurece respostas API. |
| `functions/_shared/env.ts` — `ContactEnv`, `NewsletterEnv`, `NewsletterInitialEnv` | Tipos dos bindings públicos e encrypted de contato/newsletter; documenta nomes sem guardar valores. |
| `functions/_shared/http.ts` — `LimitedJsonResult`, `LimitedTextResult`, `isRecord`, `isJsonContentType`, `readRequestJsonLimited`, `readResponseJsonLimited`, `drainResponseLimited`, `fetchWithTimeout`, `jsonResponse`, `methodNotAllowed`, `logWorkerEvent` | Boundary HTTP compartilhada: limites reais de stream, JSON defensivo, timeout, cancelamento/drain e logs minimizados. |
| `functions/_shared/turnstile.ts` — `TurnstileResult`, `verifyTurnstile` | Verifica token no endpoint oficial com timeout de 10s, teto de 16 KiB e resultado trivalente `valid/invalid/unavailable`. |
| `functions/api/contact.ts` | `onRequestPost` implementa método/origin, honeypot, validação, Turnstile e e-mail Resend idempotente; `onRequestGet`, `onRequestPut`, `onRequestPatch` e `onRequestDelete` retornam 405. |
| `functions/api/newsletter.ts` | `onRequestPost` implementa anti-enumeração, coerência ambiente/origem, D1 pending, e-mail transacional, cleanup e drain; `onRequestGet`, `onRequestHead`, `onRequestPut`, `onRequestPatch`, `onRequestDelete` e `onRequestOptions` retornam 405. |
| `functions/api/newsletter/confirm.ts` | `parseConfirmationPayload` e `onRequestPost`: token de 43 chars, hash único, consumo atômico, cleanup e reconciliação; `onRequestGet`, `onRequestHead`, `onRequestPut`, `onRequestPatch`, `onRequestDelete` e `onRequestOptions` retornam 405. |
| `newsletter/types.ts` — política e limites | `CONSENT_POLICY_VERSION`, `CONSENT_TEXT`, `TOKEN_TTL_MS`, `UNDELIVERED_STALE_MS`, `PENDING_RETENTION_MS`, `RECONCILIATION_LEASE_MS`, `RECONCILIATION_DRAIN_BUDGET_MS`, `RECONCILIATION_MAX_JOBS`, `RECONCILIATION_D1_MARGIN_MS`, `RECONCILIATION_MAX_HTTP_MS`, `RECONCILIATION_MIN_CLAIM_BUDGET_MS`, `RECONCILIATION_MUTATION_RESERVE_MS`, `RECONCILIATION_RETRY_MINUTES`, `RESEND_PROVIDER_MAX_RESPONSE_BYTES`, `NEWSLETTER_INTERNAL_ID_MAX_CODE_UNITS`, `RESEND_OPAQUE_ID_MAX_CODE_UNITS` e `RESEND_CONTACTS_API_KEY_MAX_CODE_UNITS`. |
| `newsletter/types.ts` — contratos e funções | `ConfirmationToken`, `RegisterPendingInput`, `RegisterPendingResult`, `NewsletterPendingStore`, `ConsumeConfirmationInput`, `ConsumeConfirmationResult`, `NewsletterStore`, `ProviderConsentEvidence`, `ReconciliationClock`, `ReconciliationErrorCode`, `ReconciliationJob`, `ClaimReconciliationJobInput`, `ReconciliationTransitionInput`, `NewsletterReconciliationStore`, `assertNewsletterOpaqueValue` e `normalizeNewsletterEmail`. |
| `newsletter/crypto.ts` — `generateConfirmationToken`, `isConfirmationToken`, `hashConfirmationToken` | Geração Web Crypto, validação base64url e SHA-256 do token; raw token não é persistido. |
| `newsletter/email.ts` — `ConfirmationEmailErrorCode`, `ConfirmationEmailInput`, `ConfirmationEmailResult`, `sendConfirmationEmail` | Monta texto/HTML determinísticos, valida origem HTTPS, envia com idempotência e faz um retry limitado sem mudar bytes/key. |
| `newsletter/store.ts` — `reconciliationRetryDelayMinutes`, `createNewsletterStore` | Store D1: register, delivery CAS, cleanup, consume, claim, success/block/retry e transições append-only. |
| `newsletter/provider.ts` — `ProviderEvidenceState`, `ProviderMutationResult`, `NewsletterProvider`, `ResendNewsletterProviderConfig`, `ContactReference`, `ProviderSnapshot`, `BoundedProviderRequest`, `createResendNewsletterProvider` | Adapter Contacts/Properties/Segments/Topics, parsing limitado, opt-out global e read-back de mutações ambíguas. |
| `newsletter/reconcile.ts` — `ReconcileNewsletterJobInput`, `DrainNewsletterJobsInput`, `reconcileNewsletterJob`, `drainNewsletterJobs` | Orquestra provider/store dentro do orçamento, fencing e backoff persistido. |
| `functions/types.d.ts` | Tipos gerados por `wrangler types`; regenere, não edite manualmente. |

### Redirects, D1 e política de deploy

| Arquivo | Responsabilidade |
|---|---|
| `shared/legacy-redirects.ts` — `LEGACY_POST_REDIRECTS`, `LEGACY_PATH_REDIRECTS`, `resolveLegacyRedirect` | Mapas para query/path/prefixos WordPress; preserva apenas parâmetros permitidos e impede open redirect. |
| `public/_redirects` | Espelho path-based/fallback das rotas legadas; `audit:redirects` exige coerência com o mapa compartilhado. |
| `public/_routes.json` | Define quais requests atravessam Pages Functions no modo atual. |
| `public/_headers` | CSP, headers de segurança e cache por classe de recurso. APIs permanecem `no-store`. |
| `migrations/0001_newsletter_consent.sql` | Cria subscriptions, ledger, tokens, jobs, índices, triggers e a view de candidatos reconciliados. |
| `config/deployment-phase.json` | Desired state mínimo do roteamento; atualmente `legacy-bridge`. |
| `scripts/verifyDeploymentPolicy.mjs` | Parser fail-closed que correlaciona phase, routes, middleware e headers e rejeita combinações inseguras de legacy/static-first. |

### Scripts de build, auditoria e manutenção

| Script | Responsabilidade |
|---|---|
| `auditEditorialHtml.cjs` | Inspeciona todo HTML de `dist`: metadata, datas visíveis, FAQs e contrato estrutural. |
| `editorialMetadataPolicy.cjs` | Regra isolada de canonical/`og:url`, especialmente para 404. |
| `verifySeoOutput.mjs` — `inspectSeoOutput` | Cruza HTML, canonical, robots e sitemap com a política de SEO. |
| `verifyRoutes.cjs` | Verifica arquivos, links, fragments e IDs internos do output gerado. |
| `verifyRedirects.cjs` | Valida sintaxe, duplicatas, chains, destinos e paridade do mapa legado. |
| `verifyTechnicalTerminology.cjs` | Procura grafias proibidas de produtos/normas no texto visível. |
| `verifyAllProse.cjs` | Regras editoriais mecânicas no source. |
| `verifyUtf8.cjs` | Inventaria texto tracked/untracked sem seguir symlink/junction, valida UTF-8 estrito e falha fechada em erro de infraestrutura. |
| `checkTechCatalogFaqs.cjs` | Extrai perguntas do catálogo e falha em duplicatas; erro de leitura é fatal. |
| `checkEncoding3.cjs` | Diagnóstico pontual de encoding em `src/`; não pertence ao gate principal. |
| `compareFaqs.cjs` | Comparação manual de FAQs das soluções. |
| `listAllSolutionFaqs.cjs` | Lista FAQs de solução para revisão editorial. |
| `generateFavicons.mjs` | Gera ICO e apple-touch-icon a partir do SVG da marca. |
| `generate_og_images.py` | Gera cards OG 1200×630 para seções/conteúdo. |

### Suítes de teste

| Lane | Arquivos e contrato |
|---|---|
| Workers | `contact`, `http`, `middleware`, `newsletter`, `newsletter-email`, `newsletter-store`, `newsletter-confirm`, `newsletter-confirm-page`, `newsletter-reconcile`; roda com Miniflare/D1 e migrations reais. |
| Node | `seo-policy`, `editorial-metadata-policy`, `deployment-policy`, `newsletter-confirm-page-output`, `check-tech-catalog-faqs`, `verify-utf8`; prova scripts, políticas e build output sem usar o pool Workers. |
| UI | `overlayLock` e `mobileNavigation`; usa `happy-dom`, módulos isolados e DOM recriado por caso. |
| Harness | `tests/setup.ts` aplica migration no D1 de teste; `tests/helpers.ts` fornece env/context/fetch controlados. Fetch inesperado é bloqueado nos testes que interagem com provedores. |

Detalhamento por arquivo:

| Teste | O que prova |
|---|---|
| `tests/http.test.ts` | Contagem real de bytes UTF-8, JSON limitado, cancelamento e deadlines de upstream. |
| `tests/middleware.test.ts` | Host/porta/protocolo, aliases, pass-through e headers API. |
| `tests/contact.test.ts` | Método, body, Turnstile, honeypot, Resend, retry/idempotência e falhas de configuração/provedor. |
| `tests/newsletter.test.ts` | Origin/Sec-Fetch, resposta neutra, D1 pending, envio assíncrono, cleanup, isolamento e logs. |
| `tests/newsletter-email.test.ts` | Escape HTML, token somente no fragmento, origem, payload/key idênticos no retry e resposta limitada. |
| `tests/newsletter-store.test.ts` | Schema/triggers, concorrência, replay, expiração, CAS de entrega, retenção, lease/fencing e transições append-only. |
| `tests/newsletter-confirm.test.ts` | Gramática do token, método/body, confirmação/replay/expiração/inválido e scheduling. |
| `tests/newsletter-confirm-page.test.ts` | Controller, fragment removal, zero auto-POST, classificador HTTP, renderer e acessibilidade. |
| `tests/newsletter-reconcile.test.ts` | Adapter Resend, properties/Segment/Topic, read-back, opt-out, deadlines, muitos drains e retries duráveis. |
| `tests/node/seo-policy.test.ts` | Normalização, canonical/noindex/sitemap e inspeção do output. |
| `tests/node/editorial-metadata-policy.test.ts` | Canonical e `og:url` em rotas comuns e 404. |
| `tests/node/deployment-policy.test.ts` | Phase/routes/middleware/headers, correlação de código e escapes legacy/static-first. |
| `tests/node/newsletter-confirm-page-output.test.ts` | Build real da página de confirmação, metadata, assets e ausência de token no output. |
| `tests/node/check-tech-catalog-faqs.test.ts` | Saídas 0/1/2 do auditor e falha fatal de leitura. |
| `tests/node/verify-utf8.test.ts` | Inventário Git, UTF-8 inválido/válido, junctions, nomes extremos e códigos de saída. |
| `tests/ui/mobileNavigation.test.ts` | Foco, bordas de Tab, Escape, click externo, breakpoint, resize, teardown e storage/fetch ausentes. |
| `tests/ui/overlayLock.test.ts` | Owners múltiplos, duplicata/release desconhecido, ordem, overflow original e cleanup. |

### CI, dependências e arquivos de controle

| Arquivo | Responsabilidade |
|---|---|
| `package.json` / `package-lock.json` | Scripts, Node 22.23.2, npm 10.9.8, dependências exatas/revisadas e overrides de segurança. |
| `.nvmrc`, `.npmrc` | Runtime único e instalação de binários opcionais necessários no Linux do Pages. |
| `vitest.config.ts` | Lane Workers, D1 Miniflare e exclusão explícita de Node/UI. |
| `vitest.node.config.ts` | Lane Node pura. |
| `vitest.ui.config.ts` | Lane `happy-dom`. |
| `.github/workflows/ci.yml` | `npm ci`, Astro check, build, smoke e artifact de PR. |
| `.github/workflows/deploy.yml` | Fallback manual; não é o publicador automático e não substitui o cutover SHA-pinned planejado. |
| `.github/dependabot.yml` | Atualizações automatizadas de npm e Actions conforme a cadência registrada. |
| `.github/ISSUE_TEMPLATE/*` / `PULL_REQUEST_TEMPLATE.md` | Entrada padronizada de bug/conteúdo e checklist de revisão/publicação. |

## SEO técnico

### Canonical e hosts

- Canonical automático nas páginas normais (`BaseLayout`), sempre apex +
  https. A 404 passa `canonical={false}` e não emite canonical nem `og:url`.
- O middleware (abaixo) consolida host, porta, protocolo e aliases legados
  em **um único 301** — nunca criar cadeias de redirects.
- `trailingSlash: "ignore"` no Astro; URLs publicadas sempre com `/` final.

### OG images (cards sociais)

- Mapa por seção em `BaseLayout.astro` (`ogImageBySection`) com fallback em
  cascata para `/og/default.png`. Cards 1200×630 em `public/og/`.
- **Convenção blog:** `public/og/blog-<slug>.png`; **cases:**
  `public/og/case-<id>.png`. A página usa o card dedicado **somente se o
  arquivo existir** (checagem `existsSync` em build) — post novo sem arte
  cai no card da seção, nunca quebra. `ogImage` no frontmatter tem
  precedência máxima.
- `og:image:width/height` são sempre emitidos (1200×630 para cards; dimensões
  reais para fotos de eventos/cases/equipe).
- Cards são gerados por `scripts/generate_og_images.py` (PIL).

### JSON-LD (`src/utils/schema.ts`)

- Toda página emite `Organization` + `BreadcrumbList` (automático, exceto
  `noindex`) + schemas específicos: `Service`, `BlogPosting`/`Article`,
  `TechArticle`, `FAQPage`, `ItemList`, `Event`, `DefinedTermSet`, `WebSite`.
- **Sempre serializar com `serializeJsonLd`** (escapa `<` como `\u003c`):
  impede que qualquer string de conteúdo feche o `<script>` e injete markup.
- A entidade company é `LocalBusiness` com `@id` estável
  (`/#organization`); referências cruzadas por `{ "@id" }`.
- Telefones via `PHONE_COMMERCIAL`/`PHONE_WHATSAPP` — **nunca** `phones[0]`
  nem `find(p => p.whatsapp)` (dois telefones têm whatsapp:true; a ordem do
  array não é contrato).
- `author` editorial referencia `${COLLECTIVE_AUTHOR.href}#${schemaId}` —
  nunca hardcodar o fragmento `#editorial-team`.
- `eventSchema` suporta `online: true` (VirtualLocation + OnlineEventAttendanceMode).

### Breadcrumbs

- `breadcrumbItems()` compartilhado entre JSON-LD e componente visual.
- `SEGMENT_LABELS` rotula segmentos intermediários; páginas estáticas passam
  `breadcrumbLeaf` curto (18+ páginas o fazem) para o leaf não virar o
  título longo da página.

### Sitemap e RSS

- `@astrojs/sitemap` usa `shouldIncludeInSitemap()`: exclui `/api/*` e todo o
  conjunto `NOINDEX_PATHS` (404, busca, webinar e confirmação).
- `rss.xml.ts`: blog apenas, com `/rss.xsl`, `dc:creator` em CDATA;
  description do feed alinhada à página `/blog/`.
- A página 404 não declara canonical (noindex + canonical se contradizem).

### Desambiguação de intenções (não regredir!)

- **`/automacao-industrial-maringa/`** = página transacional local
  ("empresa de automação em Maringá"); detém o `serviceSchema` regional e o
  dado do Censo. **`/automacao-industrial-parana/`** = guia de escolha
  ("como escolher"), sem Service gêmeo, FAQs com ângulo próprio.
- **Uma estatística, uma página:** o dado do IBGE (34,4% frangos) vive no
  guia do Paraná; o Censo de Maringá (409.657 hab.) vive na página de
  Maringá. Não duplicar números entre páginas irmãs.
- **Uma pergunta de FAQ, um FAQPage:** "quanto custa um projeto de
  automação?" pertence ao guia-pilar; páginas regionais usam ângulos
  próprios (comparar propostas, validar credenciais).
- `integra-acao/webinar` é `noindex` enquanto for placeholder — remover o
  noindex quando a primeira sessão confirmada for publicada.

## Busca interna (Pagefind)

- Índice estático gerado pós-build: `"build": "astro build && pagefind --site
  dist"` — 111 páginas em pt-BR. Em `astro dev` o índice não existe e a
  página `/busca/` degrada com aviso (nunca quebra).
- **Indexação escopada:** `<main>` tem `data-pagefind-body`; Header/Footer
  têm `data-pagefind-ignore`. A UI de `/busca/` se autoexclui do índice.
- `/busca/` é **noindex** e fora do sitemap (página utilitária, não destino).
- UI customizada em `src/pages/busca/index.astro` (dynamic import com
  `@vite-ignore` de `/pagefind/pagefind.js`, debounce 220ms, deep-link
  `?q=`). Não usar o `pagefind-ui` padrão — a UI própria segue o design
  system.
- **CSP:** `script-src` inclui `'wasm-unsafe-eval'` — obrigatório para o
  WebAssembly do Pagefind. Não remover sem derrubar a busca em produção.

## Formulários (contato e newsletter)

Arquitetura client-side em `src/utils/webform.ts` (compartilhado):

- **Turnstile:** `ensureTurnstileScript()` injeta o `api.js` uma única vez
  por página (dedup por `src`) — tags `is:inline` em dois componentes NÃO
  são deduplicadas pelo Astro e fariam o widget renderizar em dobro. A
  injeção dinâmica respeita a CSP (script-src permite
  challenges.cloudflare.com).
- **Ad-blocker (dead-end histórico, corrigido):** `watchTurnstileBlocked()`
  detecta a ausência do iframe do widget em até 8s e revela o fallback
  `[data-turnstile-fallback]` com e-mail/telefone. No submit sem token, a
  mensagem distingue "desafio em andamento" (iframe presente) de "bloqueado"
  (sem iframe).
- **Timeout de rede:** `AbortSignal.timeout(20s)` — o botão nunca fica preso
  em "Enviando...".
- **Status acessível:** região viva FIXA (`role="status" aria-live="polite"`
  + `[data-form-status]`) — nunca trocar `role`/`aria-live` em runtime
  (leitores de tela registram o elemento com o role inicial).
- **E-mail de fallback** vem de `data-contact-email={COMPANY.email}` — não
  hardcodar em strings de script.
- **Honeypot** `website` com sucesso falso; validação client-side é só
  conveniência — o servidor revalida tudo.
- **LGPD:** o checkbox do contato é *ciência do tratamento*; o da newsletter
  é *opt-in de marketing*. São juridicamente distintos — não unificar.
- **Contexto de origem:** cliques em `/contato` gravam seção/CTA em
  sessionStorage (TTL 30 min, tolerância de clock skew); o formulário aplica
  em campos ocultos. Navegação nunca depende desse storage.
- **Sem JavaScript:** `<noscript>` com os canais diretos; a API aceita
  apenas JSON (submit nativo cairia em erro cru).
- **Deep-links `?assunto=`:** o mapa `subjectLabels` do ContactForm cobre
  propositalmente mais slugs do que as `<option>` — CTAs contextuais de
  várias páginas criam options dinâmicas com esses rótulos.

### Server-side (Pages Functions)

- `functions/api/contact.ts`: Turnstile + Resend com chave **Sending access**
  exclusiva do formulário de contato.
- `functions/api/newsletter.ts`: Turnstile, registro de consentimento
  **pendente** no D1 e envio do e-mail de confirmação com uma segunda chave
  **Sending access**, exclusiva da newsletter. A resposta pública é neutra e
  não revela se o endereço já existe.
- `functions/api/newsletter/confirm.ts`: consome o token por `POST`, uma única
  vez, e deixa a confirmação, o ledger e o job de reconciliação atômicos no
  D1. O token viaja no fragmento da URL e é removido do endereço antes do
  request, evitando vazamento em logs e referrers.
- `functions/_shared/newsletter/reconcile.ts`: depois da confirmação, reconcilia
  Contacts/Segment/Topic e as quatro propriedades de evidência no Resend. Um
  opt-out global nunca é revertido.
- `functions/_shared/newsletter/store.ts`: D1 como autoridade local, ledger
  append-only, tokens de uso único, limpeza limitada e outbox com lease/fencing.
- `functions/_shared/`: limites de body/resposta, deadlines, idempotência e
  logs estruturados sem PII, raw token ou e-mail.
- Rate limiting recomendado (Cloudflare Security → Rate Limiting): 3-5
  req/10s por IP em `/api/contact` e `/api/newsletter`, ação Block.

### Estado da newsletter

- Token de confirmação: 32 bytes aleatórios, TTL de 24 horas e somente o
  SHA-256 persistido.
- Pedido pendente sem confirmação: retenção máxima de 30 dias; limpeza em
  lotes limitados.
- D1 de preview e produção são separados. A migration inicial já foi aplicada
  nos dois; consulte [`docs/PRODUCTION_STATUS.md`](./docs/PRODUCTION_STATUS.md).
- **BROADCAST BLOQUEADO:** a view local só produz candidatos. Antes de enviar,
  é obrigatório fazer read-back atual no Resend e excluir opt-outs globais ou
  de Topic.

## Redirects e canonicalização (`functions/_middleware.ts`)

Ordem de decisão (um único salto 301):

1. **Host alternativo** (`www.`, `*.pages.dev`) → apex.
2. **Protocolo** http no apex → https.
3. **Porta não-padrão em host de produção** → apex sem porta. *Contexto: a
   Cloudflare faz proxy das portas 2082–2096; o site inteiro respondia em
   `:2096` (herança do cPanel) e o Google indexou páginas duplicadas — ver
   GSC ago/2026. Localhost/dev não é afetado (host fora da lista).*
4. **Legados** (`shared/legacy-redirects.ts`): `?p=N` conhecidos,
   `?page_id=640`, `?post_type=avia_framework_post`, paths exatos
   (`/company`, `/sobre`, `/tela-2|3|7`…), prefixos (`/category/`, `/tag/`,
   `/author/`, `/portfolio-item/`…) e **URLs datadas do WordPress** — com
   exceções semânticas: `projeto-moinho` → o case, `uso-de-cookie` → a
   página de cookies; o restante → `/blog/`.
5. `public/_redirects` é mantido **espelhado** com o mapa legado por
   segurança e documentação, mas saiba: a documentação da Cloudflare afirma
   que regras de `_redirects` **não se aplicam a requests servidos por Pages
   Functions** — e como `_routes.json` inclui `/*`, na prática **somente o
   middleware redireciona** hoje. O arquivo volta a ter efeito se um dia o
   escopo de `_routes.json` for reduzido. **Toda mudança de alias deve ser
   espelhada nos dois lugares.**
6. Open-redirect guard: o pathname do request nunca vira URL relativa
   (`//host` seria protocol-relative).

## Conteúdo

### Coleções (`src/content.config.ts`)

- **blog** (13): `title`, `description`, `pubDate`, `updatedDate`, `author`
  (default "Equipe técnica Integra"), `tags`, `heroImage`/`heroAlt`,
  `ogImage`, `draft`.
- **cases** (1): `summary`, `sector`, `tech[]`, `heroIllustrative` (marca
  imagem ilustrativa), `gallery[]`.
- **eventos** (11): `startDate`/`endDate` (com `superRefine` endDate ≥
  startDate), `eventStatus`, `location`, `organizer`, `coverImage` +
  `coverAlt` **obrigatórios** (alimentam og:image com dimensões reais),
  `gallery[]`.
- Acesso SEMPRE via `src/utils/collections.ts` (`getPublishedPosts`,
  `getPublishedCases`, `getPublishedEventos`) — filtro de draft + ordenação
  num único lugar; nunca reescrever a query inline.
- Relacionamentos case ↔ tecnologias/soluções: `src/data/caseRelations.ts`
  (não na rota).

### Catálogo técnico (`src/data/techCatalog.ts`, 41 páginas)

- `seoTitle` (opcional) sobrescreve `title` no `<title>`; `description` é
  **tripla**: meta description + parágrafo de intro visível + description do
  `serviceSchema` — precisa funcionar nos três contextos.
- Títulos ≤ ~55 chars (o layout anexa " | Integra"; o gate exige 30–65 no
  total). Incluir nomes legados buscados quando existirem (ex.: "ex-Unity
  Pro", "ex-SoMachine").
- FAQs do catálogo são verificadas por unicidade global (`audit:faqs`).

### Fontes públicas (`src/data/sourceRegistry.ts`)

- Registro de fontes primárias com distinção **"citado" vs "relacionado"**;
  não comprova licença (o gate jurídico é o `ASSET_RIGHTS_REVIEW.md`).
- O link da fonte no `ManualReference` leva `aria-label` único com o nome da
  fonte (vários cards na mesma página compartilham o linkLabel — Lighthouse
  reprova links idênticos com destinos diferentes).

### Auditoria editorial — regras que o build impõe (`audit:html`)

1. **Título de 30–65 caracteres** (incluindo o sufixo " | Integra").
2. **Toda data do JSON-LD precisa de `<time datetime>` visível
   correspondente**, cujo texto seja a data completa ("1 de outubro de
   2025"). Consequência: `EventDate` **não colapsa ranges** ("1–2 de
   outubro"); o formato colapsado (`formatEventDateRange`) só pode aparecer
   em contextos sem schema vinculado (cards, mega-menu).
3. FAQPage do JSON-LD precisa espelhar as perguntas visíveis.
4. FAQ duplicada entre páginas reprova `audit:faqs`.

## Performance

Orçamentos e decisões (Lighthouse mobile 98 / desktop 100 em ago/2026):

- **Imagens:** `astro:assets` com `widths`/`sizes` **fiéis ao tamanho real de
  exibição** — o default de 800px em grids de 2-3 colunas superfetou ~130
  KiB (achado Lighthouse, corrigido). Hero/LCP: `loading="eager"
  fetchpriority="high"`; demais: `lazy`.
- **CSS externo, não inline:** `assetsInlineLimit: 0` (CSP proíbe script
  inline; ver Segurança). O CSS bloqueante (~180 ms no 4G lento) é trade-off
  aceito — inlining total inflaria o HTML de 110 páginas e mataria o cache
  compartilhado de CSS entre navegações.
- **Prefetch `hover`** (não `viewport` — baixava centenas de links do
  mega-menu ao rolar).
- **JS mínimo:** ~6 KiB por página (menu, contexto de contato, forms). Sem
  framework de hidratação.
- **Fontes:** subsets latin apenas + preload do woff2 da Inter.
- **Cache:** `/_astro/*` 1 ano immutable; `/images/*` 30 dias; `/og/*` 1 dia;
  HTML sem cache de CDN (decisão documentada em `_headers`); `/api/*`
  no-store.
- **Animação dos pulsos do diagrama** usa `offset-path` (flag "não
  composta" do Lighthouse aceita: CLS 0, TBT 0 — é a identidade do hero).

## Acessibilidade

- Skip-link, `:focus-visible` global, `prefers-reduced-motion` em tudo.
- SVGs informativos com `role="img"` + `<title>`/`<desc>`; decorativos com
  `aria-hidden`.
- Mega-menu: `aria-expanded` sincronizado por hover E foco; `Escape` fecha o
  mobile e devolve o foco ao botão.
- Hierarquia de headings: SectionHeader é H2 — **cards internos são H3**
  (regra aplicada nas páginas-pilar e de serviços; não regredir).
- Live regions com role fixo; `role="progressbar"` e `aria-live` no score da
  ferramenta RFP; emojis nunca carregam significado sozinhos.
- Contraste verificado: vermelho `#e30613` com branco ≈ 4,85:1 (AA).

## Segurança

- **CSP sem `'unsafe-inline'` para scripts** (`_headers`): todo JS é asset
  externo. Por isso: nada de `<script>` inline executável (JSON-LD é data
  block, fora do script-src) e a ofuscação de e-mail da Cloudflare é
  desativada por `<!--email_off-->` no `EmailLink` (ela injetaria script
  inline que a CSP bloquearia).
- **Sem nonce propositalmente:** incompatível com o Speed Brain da
  Cloudflare (documentado em `_headers`).
- `X-Frame-Options: DENY` + `frame-ancestors 'none'`; COOP/CORP same-origin;
  `! Access-Control-Allow-Origin` remove o ACAO `*` do Pages.
- `frame-src` só permite challenges.cloudflare.com — **qualquer embed futuro
  (YouTube, mapa) exige ajustar a CSP.**
- HSTS `max-age=31536000` sem `includeSubDomains`/`preload` — ver backlog.
- Functions: limite de body em bytes (sem depender de Content-Length),
  respostas de provedor com teto, timeout, idempotência, logs sem PII,
  invocation logs/traces desativados.

## Decisões adiadas e trade-offs aceitos

| Tema | Decisão |
|---|---|
| Paginação do blog | Não existe — 13 posts; reavaliar quando o volume justificar (sem limite arbitrário) |
| Páginas de tag | Não existem; `tags` é só taxonomia de schema |
| `twitter:site` | Não declarado — a empresa não tem conta ativa no X |
| Animações `offset-path` | Mantidas (identidade visual; métricas zeradas) |
| CSS inline crítico | Rejeitado (ver Performance) |
| Trusted Types / CSP `strict-dynamic` | Não adotado — host allowlist documentado + superfície JS mínima |
| Versão `/en/` | No backlog (mirar multinacionais) |

## Convenções de código

- **Idioma:** código e comentários em pt-BR; commits seguem o histórico
  (título descritivo em inglês, corpo livre).
- **Slugs/URLs:** kebab-case, sempre com `/` final; âncoras em pt-BR.
- **Line endings:** LF (o Git no Windows avisa sobre CRLF — informativo,
  não é erro).
- **Imagens em conteúdo:** sempre via `astro:assets` (src/assets) com
  `widths`/`sizes` fiéis ao layout; `public/` só para o que não passa pelo
  pipeline (og cards, favicon, PDFs).
- **Comentários explicam o PORQUÊ**, não o quê — ver exemplos em
  `_headers`, `BaseLayout.astro` e `webform.ts`.
- **Nada de PowerShell para editar arquivos** (ver gotcha de encoding).
- **Tailwind:** somente tokens do `@theme` — classes `integra-*` inexistentes
  no tema NÃO geram CSS (silenciosamente).

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

3. Se houver páginas de tecnologia/solução relacionadas, registre em
   `src/data/caseRelations.ts` (`TECH_LINKS` por nome de tecnologia,
   `CASE_SOLUTIONS` por id do case).

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

### Nova página de tecnologia (catálogo)

1. Adicione a entrada em `src/data/techCatalog.ts` (41 existentes servem de
   modelo). Campos-chave:
   - `slug` (kebab-case, vira a rota), `group`, `type`
     (Software/Tecnologia/Serviço), `title`, `shortTitle`.
   - `seoTitle` (opcional): sobrescreve o `<title>` — pense na **query**,
     não no nome interno; ≤55 chars (" | Integra" é anexado; gate: 30–65).
   - `description`: **triplo uso** — meta description + intro visível +
     description do `serviceSchema`. Tem que funcionar nos três contextos.
   - `faq`: cada pergunta é única no site inteiro (`audit:faqs` reprova
     duplicata). Incluir nomes legados quando as pessoas buscam por eles
     (ex.: "ex-Unity Pro").
   - `relatedTech` / `relatedSolutions`: slugs de outras entradas/páginas.
2. Se usar imagem de manual público, registrar a fonte em
   `src/data/sourceRegistry.ts` — e verificar o gate jurídico
   (`ASSET_RIGHTS_REVIEW.md`) antes de publicar.

### Nova página de setor ou solução

São páginas `.astro` estáticas em `src/pages/setores/` ou `src/pages/solucoes/`.
Requisitos mínimos: `breadcrumbLeaf` curto, `PageHero` no cabeçalho, headings
de card em `<h3>` (SectionHeader é h2), `serviceSchema`/`itemListSchema`
conforme o padrão das irmãs, e entrada no Footer + mega-menu (`site.ts`).
**Só criar quando houver conteúdo próprio, fontes e evidências publicáveis**
(regra do backlog editorial).

### Novo redirect legado

1. Registre em `shared/legacy-redirects.ts` (path exato, prefixo ou query
   `?p=N` conhecido).
2. Espelhe em `public/_redirects` (estáticos antes dos splats) — inerte hoje
   (Functions servem `/*`), mas mantido por segurança/documentação.
3. `npm run audit:redirects` valida os alvos.

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

## Variáveis de ambiente (referência consolidada)

| Variável | Escopo | Visibilidade | Usada por |
|---|---|---|---|
| `PUBLIC_TURNSTILE_SITE_KEY` | **build** | pública (vai para o HTML) | `turnstile.ts` → widgets dos formulários |
| `TURNSTILE_SECRET_KEY` | runtime (Pages) | encrypted | `functions/_shared/turnstile.ts` (verificação server-side) |
| `RESEND_TRANSACTIONAL_API_KEY` | runtime | encrypted | `api/newsletter.ts` — e-mail de confirmação, somente POST /emails |
| `RESEND_SEND_API_KEY` | runtime | encrypted | `api/contact.ts` — envio do contato, somente POST /emails |
| `RESEND_CONTACTS_API_KEY` | runtime | encrypted | reconciliador da newsletter — Contacts/Segments/Topics |
| `RESEND_SEGMENT_ID` | runtime | encrypted | reconciliador — segmento Integra Ação |
| `RESEND_TOPIC_ID` | runtime | encrypted | reconciliador — preferência explícita após confirmar |
| `NEWSLETTER_CONFIRMATION_ORIGIN` | runtime | não secreta, específica por ambiente | origem HTTPS usada no link de confirmação; apex em produção, preview no ambiente de preview |
| `CONTACT_EMAIL_TO` | runtime | encrypted | destino do contato (comercial@) |
| `CONTACT_EMAIL_FROM` | runtime | encrypted | remetente (`noreply@forms.` — subdomínio dedicado do Resend) |
| `NODE_VERSION` | build | — | `22.23.2` no Pages/CI (ver `.nvmrc`: 22.23.2) |
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | CI (GitHub secrets) | secret | só na Opção B de deploy |

`NEWSLETTER_DB` é binding D1, não variável textual. Os nomes e IDs por ambiente
ficam em `wrangler.jsonc`; valores secretos ficam apenas no dashboard da
Cloudflare. `.env.example` e `.dev.vars.example` listam nomes, nunca valores
reais.

## Serviços de terceiros

| Serviço | Uso no site | Onde se configura |
|---|---|---|
| Cloudflare Pages | hosting estático + CDN | dashboard → Workers & Pages |
| Cloudflare Pages Functions | `/api/contact`, `/api/newsletter`, middleware canônico | `functions/` |
| Cloudflare Turnstile | anti-bot dos formulários | Turnstile → site key/secret |
| Cloudflare Web Analytics | beacon `static.cloudflareinsights.com` (injetado pela zona; está no CSP) | Web Analytics da zona |
| Cloudflare Speed Brain | prefetch especulativo da zona — **incompatível com CSP por nonce** (motivo da CSP sem nonce) | Speed → Settings |
| Resend | envio transacional (contato) + Contacts/Segments/Topics (newsletter) | painel Resend; domínio de envio `forms.` (DNS only) |
| Google Search Console | acompanhamento de cobertura/desempenho | propriedade verificada |

**Analytics:** somente Cloudflare Web Analytics (sem GA4, sem cookies de
rastreamento — ver `uso-de-cookies`). **Crawlers de IA:** liberados
deliberadamente no `robots.txt` (18 user-agents; decisão de 10/06/2026) e o
site publica `llms.txt`. Manter o "managed robots.txt" da Cloudflare
**desligado** no painel (comentários no `robots.txt` explicam o porquê).

**Arquivos públicos especiais:**

| Arquivo | Função | Manutenção |
|---|---|---|
| `llms.txt` | Resumo do site para agentes/LLMs | Atualizar ao mudar estrutura de seções ou posicionamento |
| `robots.txt` | Bloqueia superfície WP legada; libera 18 crawlers de IA | Comentários internos explicam a política |
| `rss.xsl` | Stylesheet do feed (RSS legível no browser) | — |
| `.well-known/security.txt` | RFC 9116 — contato de segurança | **Expira 2027-06-01** — renovar antes (contato lgpd@) |
| `favicon.ico` / `apple-touch-icon.png` | Ícones gerados do `favicon.svg` | `node scripts/generateFavicons.mjs` |
| `og/*.png` (35+) | Cards sociais 1200×630 | `scripts/generate_og_images.py` |
| `downloads/` | PDF do certificado Silver SI | Substituir quando a credencial for renovada |

## Deploy

O publicador ativo é a **conexão direta GitHub → Cloudflare Pages**. O
`deploy.yml` existe somente como fallback manual. Nunca use os dois ao mesmo
tempo.

Baseline funcional observado em 21/08/2026, antes desta atualização
documental. Um push posterior em `main` gera outro deployment; para identificar
o deployment mais recente, consulte a conexão Git no painel da Cloudflare.

| Item | Valor |
|---|---|
| Branch | `main` |
| Commit técnico auditado | `4049de9bfd1f6bd168dbf7beb7312313bfde5c14` |
| Deployment imutável auditado | `4cff75a6-7fae-41f3-b617-c7e7d087debe` |
| Modo de roteamento | `legacy-bridge` |
| D1 de produção | migration `0001_newsletter_consent.sql` aplicada |

Para evidência detalhada e limites conhecidos, consulte
[`docs/PRODUCTION_STATUS.md`](./docs/PRODUCTION_STATUS.md).

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
   NODE_VERSION              = 22.23.2
    PUBLIC_TURNSTILE_SITE_KEY = <site key>     # public — vai para o HTML
    TURNSTILE_SECRET_KEY      = <secret>       # encrypted
    RESEND_TRANSACTIONAL_API_KEY = <sending key> # encrypted; confirmação da newsletter
    RESEND_SEND_API_KEY       = <sending key>  # encrypted; contato
    RESEND_CONTACTS_API_KEY   = <full key>     # encrypted; reconciliação da newsletter
    RESEND_SEGMENT_ID         = <Segment ID>   # encrypted — newsletter Integra Ação
    RESEND_TOPIC_ID           = <Topic ID>     # encrypted — preferência explícita da newsletter
    NEWSLETTER_CONFIRMATION_ORIGIN = https://integrautomacao.com.br
    CONTACT_EMAIL_TO          = comercial@integrautomacao.com.br
    CONTACT_EMAIL_FROM        = noreply@forms.integrautomacao.com.br
   ```

   Marque todas as variáveis server-side como **Encrypted** para não vazarem nos logs:
   `TURNSTILE_SECRET_KEY`, `RESEND_TRANSACTIONAL_API_KEY`,
   `RESEND_SEND_API_KEY`, `RESEND_CONTACTS_API_KEY`,
   `RESEND_SEGMENT_ID`, `RESEND_TOPIC_ID`,
   `CONTACT_EMAIL_TO` e `CONTACT_EMAIL_FROM`.
   `PUBLIC_TURNSTILE_SITE_KEY` precisa existir no ambiente de build; se faltar,
   o formulário aparece como indisponível e não cai mais em `mailto:` automático.
   Não use placeholders como `<site key pública do Turnstile>`; a site key
   pública atual é `0x4AAAAAADKRCm67kAoc7SHU`.
   Crie três chaves distintas no Resend: uma **Sending access** restrita ao
   domínio de envio para `RESEND_TRANSACTIONAL_API_KEY`, outra **Sending
   access** para `RESEND_SEND_API_KEY`, e uma **Full access** para
   `RESEND_CONTACTS_API_KEY`. Não reutilize a chave full-access em endpoints de
   envio; registre owner, data de criação e rotação das três chaves.
   `RESEND_SEGMENT_ID` e `RESEND_TOPIC_ID` são obrigatórios e usam o modelo
   atual de Contacts + Segments + Topics do Resend. Crie o Topic com padrão
   `opt_out` e selecione esse Topic em todo Broadcast da Integra Ação. Crie
   também quatro Contact Properties do tipo texto: `newsletter_consent_at`,
   `newsletter_policy_version`, `newsletter_consent_source` e
   `newsletter_consent_text`. A API devolve indisponibilidade se Segment ou
   Topic não estiver configurado e nunca confirma inscrição não registrada.
   O estado `unsubscribed` do Resend é global: se um contato estiver em
   descadastro global, o reconciliador preserva essa escolha e bloqueia o job
   com estado `blocked_global_opt_out`. O POST inicial continua neutro e não
   enumera essa condição. A preferência da Integra Ação é controlada pelo
   Topic; não reative contatos manualmente sem confirmar o pedido pelo canal de
   privacidade.

   O binding `NEWSLETTER_DB` e os bancos separados de preview/produção estão
   declarados em `wrangler.jsonc`. A migration `0001_newsletter_consent.sql` já
   foi aplicada nos dois bancos do projeto atual. Em ambiente novo, aplique
   primeiro em preview e somente depois da aceitação em produção:

   ```bash
   npx wrangler d1 migrations apply NEWSLETTER_DB --env preview --remote
   npx wrangler d1 migrations apply NEWSLETTER_DB --env production --remote
   ```

   `NEWSLETTER_CONFIRMATION_ORIGIN` deve ser HTTPS, sem path/query/fragment e
   nunca pode apontar o preview para o banco/origem de produção.

5. Em **Custom domains**, mantenha/adicione apenas domínios que servem páginas:
   `integrautomacao.com.br`, `www.integrautomacao.com.br` e, se usados,
   `newsletter.integrautomacao.com.br`, `webinar.integrautomacao.com.br` e
   `eventos.integrautomacao.com.br`.

   **Não adicione `forms.integrautomacao.com.br` em Custom domains do Pages.**
   Esse subdomínio é dedicado ao Resend como domínio de envio transacional e
   deve existir apenas nos registros DNS exigidos pelo Resend.

### Opção B — fallback manual via GitHub Actions

O workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) está
limitado a `workflow_dispatch`. Os triggers de PR e push estão comentados, logo
ele **não** gera preview nem publica `main` automaticamente no estado atual.
Quando acionado manualmente, faz build e `wrangler pages deploy`; use apenas se
a integração direta estiver indisponível e não houver build concorrente.

**Secrets necessários** (Settings → Secrets and variables → Actions):

| Secret                       | Onde obter |
|------------------------------|-----|
| `CLOUDFLARE_API_TOKEN`       | https://dash.cloudflare.com/profile/api-tokens — escopo `Account: Cloudflare Pages: Edit` |
| `CLOUDFLARE_ACCOUNT_ID`      | Visível no dashboard CF, painel direito de qualquer página |
| `PUBLIC_TURNSTILE_SITE_KEY`  | Cloudflare → Turnstile → Site → Public site key |

Os secrets server-side (`TURNSTILE_SECRET_KEY`,
`RESEND_TRANSACTIONAL_API_KEY`, `RESEND_SEND_API_KEY`,
`RESEND_CONTACTS_API_KEY`,
`RESEND_SEGMENT_ID`, `RESEND_TOPIC_ID`, `CONTACT_EMAIL_*`) ficam **só no Cloudflare Pages**, não no GitHub —
porque eles são consumidos pela Pages Function em runtime, não pelo
build.

> **Escolha apenas um publicador.** Misturar Opção A (auto-build do CF
> com base no Git) com Opção B (deploy via Actions) gera deploys
> duplicados e disputa de CDN cache.
>
> Neste repositório a **Opção A está ativa** (CF Pages
> conectado ao GitHub fazendo build automático). O workflow
> `deploy.yml` está com triggers `push`/`pull_request` comentados e
> roda apenas via `workflow_dispatch` (Actions → Deploy → Run workflow)
> como fallback manual. Para trocar para Opção B, descomente os
> triggers nesse workflow e desconecte a integração direta no painel
> da Cloudflare.

## Branch protection (recomendado)

**Estado atual:** o repositório privado não tem ruleset/proteção obrigatória
para `main` no plano disponível. As regras abaixo são o desired state; até que
possam ser habilitadas, revisão, CI verde e proibição de force-push são
controles operacionais.

Settings → Branches → Add branch ruleset → Apply to **default branch**:

- Require a pull request before merging (1 approval mínima)
- Require status checks to pass before merging:
  - `Lint and build` (do workflow CI)
- Require conversation resolution before merging
- Require linear history (opcional, mantém histórico limpo)
- Restrict deletions
- Block force pushes

### CI (`.github/workflows/ci.yml`)

Roda em push/PR para `main` e via dispatch. Job **"Lint and build"**
(ubuntu, Node do `.nvmrc`, `npm ci`): `astro check` → `npm run build`
(que inclui o Pagefind) → smoke-test do `dist/`. É o status check exigido
pela branch protection sugerida acima. O workflow atual não roda `npm test`;
por isso as três lanes continuam parte obrigatória do gate local antes do
push.

### Remotes git

| Remote | Repositório | Papel |
|---|---|---|
| `origin` | `rhcorsi/integrautomacao.com.br` | **principal** — `main` rastreia este; dispara o deploy da Opção A |
| `dev-com` | `rhcorsi/integrautomacao.com` | espelho de desenvolvimento (push manual quando fizer sentido) |

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

`npm test` executa três lanes isoladas e em ordem fixa:

1. **Workers:** Pages Functions, D1, Turnstile, Resend, confirmação, store,
   reconciliação, HTTP e middleware.
2. **Node:** políticas de SEO/deploy, scripts editoriais, UTF-8 e inspeção do
   output gerado.
3. **UI:** controladores DOM de navegação/overlays no `happy-dom`.

A lane Workers cobre limites de body UTF-8, respostas neutras, retry
idempotente de e-mail, atomicidade D1, uso único do token, lease/fencing e
ambiguidades após mutação no Resend. O teste do middleware cobre
canonicalização de host + porta (`:2096`), redirects em um único salto e o
hardening das respostas `/api/`.

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

## Search Console — lições registradas (ago/2026)

- **Duplicados por porta:** páginas `https://integrautomacao.com.br:2096/...`
  foram indexadas (a Cloudflare faz proxy da porta 2096). Corrigido no
  middleware — qualquer porta não-padrão em host de produção recebe 301.
- **Consolidação `http://www.`:** entradas separadas no GSC são o índice
  antigo convergindo para o apex; o redirect já existia — apenas aguardar.
- **URLs legadas com impressões e zero cliques** (`/tela-N/`, datadas):
  receberam 301 cirúrgicos (home, case ou página de cookies conforme o
  equivalente semântico).
- **CTR:** as páginas de tecnologia com milhares de impressões e CTR < 0,5%
  tiveram `seoTitle`/`description` reescritos com nome legado do produto e
  proposta de valor ("guia em português"). Ao criar página de catálogo nova,
  pense na query, não no nome interno.
- **Query fantasma** ("44 wincc", 8 mil impressões): tráfego artificial —
  não otimizar para ela.

## Histórico de ondas (ago/2026)

Contexto para futuros mantenedores entenderem *por que* certas coisas são
como são:

1. **Onda de auditoria front-end** — 2 bugs críticos corrigidos (paleta
   fantasma no RfpChecklist; texturas do hero invisíveis por falta de
   `isolate`), formulários endurecidos (dead-end de ad-blocker, timeouts,
   noscript), JSON-LD com escape `\u003c`, helpers `collections.ts`/
   `webform.ts`, hierarquia h2→h3, limpeza de 2,2 MB de assets órfãos.
2. **Onda Search Console** — canonicalização de porta `:2096` (o Pages
   respondia duplicado na porta do cPanel), redirects cirúrgicos de URLs
   legadas (`tela-N`, datadas, `/download/`), títulos de CTR nas páginas de
   tecnologia com milhares de impressões.
3. **Onda PageSpeed** — `sizes`/`widths` fiéis ao layout (economia de ~131
   KiB no desktop), links de fonte com `aria-label` único, `favicon.ico` +
   `apple-touch-icon.png` gerados do SVG.
4. **Onda de design** — `PageHero` em 18 páginas (textura + breadcrumbs +
   acento de seção), busca Pagefind com UI própria, `MetricStrip`, seção de
   foto real na home, reveal escalonado, diagrama de arquitetura interativo.
5. **Correção de mojibake** — strings do `AnimatedPlantDiagram` corrompidas
   por edição em PowerShell Latin-1; restauradas e varredura geral limpa.
6. **Onda de segurança e consentimento** — double opt-in com D1 autoritativo,
   token curto de uso único, ledger append-only, reconciliação Resend com
   outbox/fencing, respostas anti-enumeração, confirmação no fragmento e três
   lanes de teste. Publicada em produção em 21/08/2026; evidência operacional em
   [`docs/PRODUCTION_STATUS.md`](./docs/PRODUCTION_STATUS.md).

## Backlog editorial e operacional

- [ ] **Observatory — Polish (Speed → Observatory):** ativar em modo
      **Lossless** (nunca Lossy: os diagramas/manuais têm texto pequeno e
      compressão com perda destrói a legibilidade). Beneficia os cards PNG de
      `/og/` e `/images/`; os WebP do `astro:assets` já são otimizados no
      build com `sizes` corretos. O gargalo de LCP do site é texto (h1), não
      imagem — Polish é ganho marginal, não prioridade.
- [ ] **Observatory — Health Check (Smart Shield → Health Checks):** criar o
      primeiro health check standalone para `https://integrautomacao.com.br/`
      com notificação por e-mail em respostas 5XX. Não apontar para
      `/api/*` (GET nelas responde 405 por design).
- [x] ~~**P0 antes do próximo deploy:** concluir o gate de direitos de todos os
      ativos de terceiros~~ — **ENCERRADO em 20/08/2026**: os 44 ativos em uso
      foram aprovados pelo titular (registro em
      [`ASSET_RIGHTS_REVIEW.md`](./ASSET_RIGHTS_REVIEW.md)). O gate permanece
      ativo para ativos NOVOS e para os 23 itens da biblioteca ainda fora de uso.
- [x] ~~**P0 implementar double opt-in da newsletter**~~ — **PUBLICADO em
      21/08/2026**: D1 autoritativo, link transacional, expiração, uso único,
      confirmação explícita e reconciliação pós-confirmação. Turnstile continua
      sendo apenas defesa anti-bot; a prova de caixa postal vem do link.
- [ ] **P0 antes de usar Broadcasts da newsletter:** executar read-back atual
      no Resend para cada candidato, excluir opt-out global/Topic, confirmar as
      quatro propriedades de evidência e registrar a autorização operacional.
      A view `newsletter_broadcast_recipients`, isoladamente, não autoriza envio.
- [ ] **CI:** falhar o build de produção se `PUBLIC_TURNSTILE_SITE_KEY` estiver
      ausente/placeholder — sem a key, os formulários renderizam o estado de
      indisponibilidade (fail-closed por design, mas silencioso).
- [ ] **CSP reporting:** avaliar endpoint de `report-to`/`report-uri` (ex.:
      um Pages Function gravando métrica estruturada) para tornar violações de
      CSP visíveis em produção — hoje elas são silenciosas.
- [x] ~~Definir orçamento e compensação da newsletter~~ — reconciliador com
      orçamento total de 25s, no máximo 2 jobs, lease de 30s, fencing, timeout
      HTTP de 4s e backoff persistido. O contato mantém timeout próprio de 20s.
- [ ] Adicionar páginas setoriais somente quando houver conteúdo próprio,
      fontes primárias e evidências publicáveis para o segmento.
- [ ] Publicar novos cases apenas com autorização, anonimização e distinção
      explícita entre imagem real e ilustração.
- [ ] Publicar artigos quando a revisão técnica e as fontes estiverem prontas;
      a qualidade editorial prevalece sobre uma cadência fixa.
- [ ] Avaliar busca interna quando o volume e os dados de navegação demonstrarem
      necessidade, sem adotar um limite arbitrário de itens. ~~Implementada com
      Pagefind em ago/2026 (ver "Busca interna").~~ Reavaliar somente se os
      dados de uso mostrarem lacunas (filtros, pesos por seção).
- [ ] Avaliar HSTS preload e DMARC `p=reject` após validar todos os subdomínios,
      remetentes e fluxos de recuperação envolvidos.
- [ ] Versão em inglês (`/en/`) se mirar multinacionais

## Troubleshooting operacional

| Sintoma | Causa provável | Ação |
|---|---|---|
| Formulário mostra "temporariamente indisponível" em produção | `PUBLIC_TURNSTILE_SITE_KEY` ausente/placeholder no build | Conferir env var no Pages e rebuildar |
| Newsletter responde indisponível antes de gravar | `NEWSLETTER_DB`, Turnstile ou origem de confirmação ausente/incoerente | Conferir bindings do ambiente; nunca apontar preview para produção |
| Pedido fica pendente sem e-mail | `RESEND_TRANSACTIONAL_API_KEY`/remetente ausente ou falha de entrega | Consultar eventos minimizados e o ledger D1; não reenviar manualmente alterando estado |
| Confirmação ocorreu, mas Resend não reconciliou | job `pending`/`leased`, configuração de Contacts/Segment/Topic ou read-back ambíguo | Conferir estados agregados no D1 e executar o drain por fluxo normal; manter Broadcast bloqueado |
| Busca mostra "índice gerado no build" | `astro dev` não tem `/pagefind/` | Normal em dev; testar com `npm run build` + `pages:dev` |
| Build falha na etapa Pagefind (CI/Pages) | binário linux ausente | Pagefind está em `dependencies` por isso; conferir `.npmrc` `include=optional` intacto |
| og:image quebrado no WhatsApp/LinkedIn | Card fora da convenção de nome | Verificar se o arquivo existe em `public/og/`; a convenção tem fallback automático |
| `audit:html` reclama de data sem `<time>` | Texto de data colapsado ou sem elemento `<time>` | Usar `EventDate` (nunca colapsar range em página com Event schema) |
| `audit:faqs` reprova | Pergunta repetida entre páginas | Reformular o ângulo da pergunta em uma delas |
| Novo embed de terceiro não carrega | CSP `frame-src` restrito | Adicionar a origem em `_headers` |
| Classe `integra-*` sem efeito visual | Cor inexistente no `@theme` (ex.: blue/yellow/green) | Usar somente tokens definidos em `global.css` |
| Texto com "Ã§/Ã©/Â·" no site | Arquivo editado via PowerShell (Latin-1) | Restaurar string com ferramenta UTF-8; ver gotcha de encoding |
| GSC mostra URLs estranhas (`:2096`, `tela-N`) | Legado já tratado no middleware | Aguardar reconsolidação do índice; novos padrões → `legacy-redirects.ts` + `_redirects` |

## Mais detalhes

O plano completo do projeto (contexto, decisões técnicas, direção de UX/UI
com benchmarks — Cybertrol, Brock, Rockwell, AVEVA — cronograma e roadmap
pós-lançamento) é mantido internamente, fora do repositório.

Documentos vivos no repositório:

- [`docs/PRODUCTION_STATUS.md`](./docs/PRODUCTION_STATUS.md) — release ativo,
  bindings, migration D1, provas públicas, limites e gate de Broadcast.
- [`SEO_ROADMAP.md`](./SEO_ROADMAP.md) — estratégia de SEO por cluster de
  intenção (o que já foi coberto e o que falta publicar).
- [`ASSET_RIGHTS_REVIEW.md`](./ASSET_RIGHTS_REVIEW.md) — registro de direitos
  dos ativos de terceiros. **Inventário em uso aprovado em 20/08/2026** (44/44);
  o gate segue ativo para novos ativos e para itens da biblioteca ainda não
  usados.

Fora do repositório (pastas irmãs no diretório de trabalho): `docs/` (guias
operacionais de Cloudflare/GSC), `Logomarca/` (identidade visual),
`_screens/` (capturas de QA), `Manuais e Docs*/` (fontes primárias dos
fabricantes) e o `Backup Baixado/` do WordPress legado.
