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

## Estado atual (agosto/2026)

| Indicador | Valor |
|---|---|
| Páginas geradas | 110 |
| Lighthouse mobile | 98 Performance · 100 A11y · 100 BP · 100 SEO |
| Lighthouse desktop | 100 em todas as categorias |
| Core Web Vitals (lab, mobile) | FCP 1,7s · LCP 2,1s · TBT 0 · CLS 0 |
| Testes das Functions | 25/25 passando |
| Auditoria editorial (`audit:editorial`) | aprovada sem ocorrências |
| Conteúdo | 13 posts · 1 case · 11 eventos · 41 páginas de tecnologia · 9 setores · 7 soluções · 2 serviços |

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
│   ├── _shared/             # env.ts, http.ts (limites de body/resposta), turnstile.ts
│   ├── types.d.ts           # bindings gerados por wrangler types
│   └── api/
│       ├── contact.ts       # POST /api/contact (Turnstile + Resend)
│       └── newsletter.ts    # POST /api/newsletter (Contacts/Segments/Topics)
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
├── tests/                   # vitest no runtime Workers (contact, newsletter, http, middleware)
├── astro.config.mjs
├── tsconfig.json
├── wrangler.jsonc           # configuração única do Cloudflare Pages
└── package.json
```

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

## SEO técnico

### Canonical e hosts

- Canonical automático em toda página (`BaseLayout`), sempre apex + https.
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

- `@astrojs/sitemap` com filtro: exclui `/api/` **e `/404`** (noindex não
  entra no sitemap — sinais contraditórios).
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

### Busca interna (Pagefind)

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

- `functions/api/contact.ts`: Turnstile + Resend (chave Sending access).
- `functions/api/newsletter.ts`: Contacts/Segments/Topics (chave Full
  access); `409 GLOBAL_OPT_OUT` preserva descadastro global.
- `functions/_shared/`: limites de body/resposta, timeout, idempotência,
  logs estruturados sem PII.
- Rate limiting recomendado (Cloudflare Security → Rate Limiting): 3-5
  req/10s por IP em `/api/contact` e `/api/newsletter`, ação Block.

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
newsletter, incluindo respostas perdidas após uma mutação no Resend. O teste do
middleware cobre canonicalização de host + porta (`:2096`), combinação de
redirects em um único salto e o hardening de headers das respostas `/api/`.

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
- [ ] **P0 antes do próximo deploy:** concluir o gate de direitos de todos os
      ativos de terceiros em [`ASSET_RIGHTS_REVIEW.md`](./ASSET_RIGHTS_REVIEW.md),
      anexando comprovante interno ou substituindo/removendo o item.
- [ ] **P0 antes de usar Broadcasts da newsletter:** decidir e implementar
      double opt-in (link transacional assinado, expiração e Topic em `opt_out`
      até a confirmação) ou registrar decisão formal de produto/privacidade.
      Turnstile prova uma interação, não o controle da caixa postal; o aceite
      atual do formulário, isoladamente, não autentica o titular do e-mail.
- [ ] **CI:** falhar o build de produção se `PUBLIC_TURNSTILE_SITE_KEY` estiver
      ausente/placeholder — sem a key, os formulários renderizam o estado de
      indisponibilidade (fail-closed por design, mas silencioso).
- [ ] **CSP reporting:** avaliar endpoint de `report-to`/`report-uri` (ex.:
      um Pages Function gravando métrica estruturada) para tornar violações de
      CSP visíveis em produção — hoje elas são silenciosas.
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
| og:image quebrado no WhatsApp/LinkedIn | Card fora da convenção de nome | Verificar se o arquivo existe em `public/og/`; a convenção tem fallback automático |
| `audit:html` reclama de data sem `<time>` | Texto de data colapsado ou sem elemento `<time>` | Usar `EventDate` (nunca colapsar range em página com Event schema) |
| `audit:faqs` reprova | Pergunta repetida entre páginas | Reformular o ângulo da pergunta em uma delas |
| Novo embed de terceiro não carrega | CSP `frame-src` restrito | Adicionar a origem em `_headers` |
| GSC mostra URLs estranhas (`:2096`, `tela-N`) | Legado já tratado no middleware | Aguardar reconsolidação do índice; novos padrões → `legacy-redirects.ts` + `_redirects` |

## Mais detalhes

O plano completo do projeto está em
`C:\Users\rafha\.claude\plans\baixei-o-backup-e-mellow-cosmos.md`.
Inclui contexto, decisões técnicas, direção de UX/UI com benchmarks
(Cybertrol, Brock, Rockwell, AVEVA), cronograma e roadmap pós-lançamento.
