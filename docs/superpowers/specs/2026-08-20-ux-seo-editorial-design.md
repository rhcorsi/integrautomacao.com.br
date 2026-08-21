# UX, SEO e governança editorial — design aprovado

**Data:** 2026-08-20
**Status:** aprovado para planejamento; implementação ainda não iniciada
**Escopo:** experiência de navegação, formulários, busca, sumário editorial, ampliação de imagens, relações contextuais, metadados editoriais, `llms.txt` e referências públicas.

## 1. Objetivo e limites

O site deve oferecer navegação móvel previsível, formulários que expliquem cada erro sem depender da validação nativa do navegador, busca Pagefind filtrável e progressiva, sumários com âncoras estáveis e ampliação de imagens acessível. Ao mesmo tempo, SEO e conteúdo técnico devem continuar governados por fontes canônicas e por evidência verificável, sem transformar uma melhoria de interface em autorização para criar afirmações sobre projetos, eventos, clientes, equipamentos ou desempenho.

Este desenho não assume a propriedade de sitemap, redirects ou canonicals. Esses itens pertencem a `docs/superpowers/specs/2026-08-20-platform-integrity-design.md` e `docs/superpowers/plans/2026-08-20-platform-integrity.md`. A única integração permitida aqui é fornecer metadados consistentes que o layout e o índice Pagefind consomem, sem alterar a configuração `@astrojs/sitemap`, a política de canonical em `BaseLayout.astro`, `public/_redirects` ou `functions/_middleware.ts`. Se os dois planos forem executados na mesma branch, a Task 1 de Platform Integrity deve preceder as Tasks 4, 7 e 9 deste plano; o merge preserva `canonical?: string | URL | false` e o rendering condicional de canonical/`og:url` definido pela plataforma.

## 2. Princípios de decisão

1. **Mecânico antes de editorial.** Comportamento de menu, atributos ARIA, foco, filtros, paginação, IDs e validações automatizadas podem ser implementados e testados sem mudar afirmações públicas.
2. **Uma fonte canônica por conceito.** Locale e composição de título ficam em `src/utils/site.ts` e `src/utils/metadata.ts`; relações de navegação ficam em um registry tipado; o conteúdo de `llms.txt` nasce de um módulo canônico e é gerado, não mantido em duplicidade.
3. **Sem claims implícitos.** Rótulos, textos alternativos, legendas, relações de case e descrições de evento só mudam mediante fonte interna aprovada, evidência pública ou validação expressa do responsável técnico/editorial.
4. **Falha visível e recuperável.** Busca indisponível, erro de formulário, menu aberto em mudança de breakpoint e links externos inconclusivos precisam ter estado explícito e caminho de recuperação.
5. **Validação automática não é prova editorial.** HTTP 200/206 demonstra disponibilidade, não equivalência de conteúdo. HTTP 403 ou reset não demonstra link quebrado; esses resultados permanecem em verificação manual.

## 3. Arquitetura proposta

### 3.1 Navegação e relações de rota

`src/data/navigation.ts` será a fonte tipada das famílias de navegação. Ela exportará:

```ts
export type NavHref = (typeof NAV)[number]["href"];
export type SearchSection =
  | "solucoes"
  | "servicos"
  | "tecnologias"
  | "setores"
  | "cases"
  | "blog"
  | "eventos"
  | "institucional";

export interface RouteRelation {
  navHref?: NavHref;
  searchSection: SearchSection;
  prefixes: readonly string[];
}

export function normalizeRoutePath(pathname: string): string;
export function activeNavHref(pathname: string): NavHref | undefined;
export function searchSectionFor(pathname: string): SearchSection;
```

O registry tratará rotas que não compartilham prefixo com o item visual correspondente: `/servicos/`, `/automacao-industrial/`, `/automacao-industrial-parana/`, `/automacao-industrial-maringa/` e `/ciberseguranca-ot/` pertencem ao caminho comercial de Soluções; `/integra-acao/` e `/eventos/` pertencem a Conteúdo; `/equipe/` pertence a Empresa; `/integrador-rockwell/` pertence a Certificações. `/busca/`, `/contato/`, páginas legais e `404` não terão `aria-current` no menu principal.

Um validador de relações contextuais verificará também `TECH_LINKS`, `CASE_SOLUTIONS`, `relatedTech`, `relatedSolutions`, `relatedGuides` e `relatedCases`: todo destino interno precisa existir no conjunto de rotas construídas; slugs de tecnologia precisam existir em `techCatalog`; IDs de case precisam existir na collection publicada; e um registro não pode repetir o mesmo destino. O validador confirma integridade estrutural, não a veracidade comercial da relação. Inserir uma nova relação de case continua exigindo validação editorial.

### 3.2 Menu móvel

O menu continuará no `Header.astro`, mas o controlador de comportamento será extraído para `src/scripts/mobileNavigation.ts`, testável isoladamente. O header terá `data-site-header`; sua altura real alimentará `--site-header-height` em `document.documentElement`. O painel usará `max-height: calc(100dvh - var(--site-header-height))`, com fallback `100vh` antes da declaração `100dvh`.

Contrato de abertura:

- `aria-expanded`, rótulo do botão e ícones permanecem sincronizados;
- `document.documentElement` recebe `data-mobile-menu-open="true"` e perde rolagem enquanto o painel está aberto;
- `Escape`, clique fora do header e clique em qualquer link dentro do painel fecham o menu;
- ao fechar por `Escape` ou clique fora, o foco retorna ao botão; ao navegar, não se força foco antes da troca de página;
- o primeiro item focável do painel recebe foco ao abrir;
- a tecla `Tab` permanece contida entre o botão e os controles do painel enquanto o menu está aberto;
- ao cruzar `min-width: 1440px`, o controlador fecha o painel, remove scroll lock, restaura atributos/ícones, fecha os `<details>` móveis e não desloca foco;
- o listener de breakpoint usa `matchMedia("(min-width: 1440px)")`, igual ao breakpoint já usado nas classes Tailwind.

O controller aceitará dependências DOM explícitas e retornará `destroy()`, evitando listeners duplicados em navegação futura ou testes.

### 3.3 Erros acessíveis nos formulários

`src/utils/formValidation.ts` fornecerá mensagens determinísticas para `valueMissing`, `typeMismatch`, `tooShort` e `tooLong`, sem expor mensagens variáveis do browser. Cada controle validável terá um elemento de erro próprio, ID estável e oculto quando vazio. O helper preservará qualquer help text já existente e comporá `aria-describedby` com ajuda + erro, além de alternar `aria-invalid`.

A summary de validação será uma região separada do status de envio:

- summary: `role="alert"`, título “Revise os campos indicados” e lista de links para os campos inválidos;
- status de rede/sucesso: mantém `role="status"` e `aria-live="polite"` em `[data-form-status]`;
- primeiro submit inválido atualiza todos os erros, mostra a summary e foca o primeiro campo inválido;
- `input`/`change` removem o erro daquele campo quando ele se torna válido e reconciliam a summary;
- sucesso e `form.reset()` limpam erros, `aria-invalid` e summary;
- falha Turnstile continua no status operacional e não é falsamente atribuída a um campo comum.

Contato e newsletter usarão o mesmo helper e mensagens específicas por `name`. Nenhuma mudança será feita nos contratos `/api/contact` e `/api/newsletter` nesta frente.

### 3.4 Busca Pagefind

`BaseLayout.astro` receberá `searchSection?: SearchSection` e emitirá um marcador ignorado visualmente, mas lido pelo Pagefind: `data-pagefind-filter="section:<valor>"`. O valor padrão virá de `searchSectionFor(Astro.url.pathname)`. Header, Footer, breadcrumbs, chamadas repetidas, blocos de navegação relacionada e a própria UI de busca devem receber `data-pagefind-ignore` quando repetem conteúdo que não ajuda a encontrar o assunto principal. O `<main data-pagefind-body>` permanece; não se exclui o conteúdo editorial principal.

`src/scripts/siteSearch.ts` encapsulará o módulo dinâmico do Pagefind 1.5.2 com estes contratos:

```ts
export type SearchSectionFilter = "all" | SearchSection;

export interface PagefindSearchResponse {
  results: PagefindSearchResult[];
  unfilteredResultCount: number;
  filters: Record<string, Record<string, number>>;
  totalFilters: Record<string, Record<string, number>>;
}

export interface SearchViewState {
  query: string;
  section: SearchSectionFilter;
  total: number;
  visible: number;
  pageSize: 12;
}
```

O carregamento inicial chama `pagefind.filters()` para habilitar contagens. A busca usa `pagefind.search(query, { filters: section === "all" ? {} : { section } })`. Chips exibem contagem contextual; filtros zerados ficam desabilitados, exceto o filtro selecionado. “Carregar mais” acrescenta lotes de 12 a partir do array já retornado, sem nova consulta, preserva foco no botão e anuncia “12 de N resultados exibidos”. Ao trocar query ou filtro, o cursor volta a 12. Query e filtro são refletidos em `?q=` e `?secao=` com `history.replaceState`, sem navegação.

Resultados continuam aceitando `excerpt` do Pagefind em `innerHTML`, pois o Pagefind codifica entidades antes de inserir `<mark>`; título, seção e URL permanecem atribuídos por `textContent`/validação de URL interna.

### 3.5 Sumário editorial e IDs estáveis

`src/components/TableOfContents.astro` consumirá somente itens explícitos:

```ts
export interface TocItem {
  id: string;
  label: string;
  level: 2 | 3;
}
```

O `id` seguirá `^[a-z][a-z0-9-]*$`, será único por página e não será recalculado do título. Alterar um heading não altera seu ID. O sumário usa `<nav aria-label="Nesta página">`, links de âncora e estado visual `aria-current="location"` atualizado por `IntersectionObserver`; sem JavaScript, os links continuam funcionais.

Cobertura inicial obrigatória:

- todas as páginas detalhadas em `/setores/*`;
- o template `/tecnologias/[slug]/`, com IDs estáveis para `onde-entra`, `metodo-integra`, `entregaveis-referencias` e `relacionados`;
- `/automacao-industrial/` e `/ciberseguranca-ot/`;
- os guias longos `/blog/como-elaborar-rfp-automacao-industrial/` e `/blog/migracao-plc5-controllogix-guia-completo/`.

Nos MDX longos, o frontmatter receberá `toc` e os headings correspondentes serão escritos com ID explícito, por exemplo `<h2 id="o-que-e-rfp-automacao">O que é uma RFP de automação industrial?</h2>`. A auditoria do HTML construído verificará um-para-um: cada item do sumário aponta para exatamente um heading existente e nenhum ID se repete. Não se usa slug automático como contrato público.

### 3.6 Ampliação de imagens

`src/components/ImageZoomDialog.astro` definirá um único `<dialog>` por página e `src/scripts/imageZoomDialog.ts` fará a delegação de eventos para gatilhos `[data-image-zoom]`. `ManualReference.astro`, hero/galeria de cases e cover/galeria de eventos fornecerão os dados do asset já renderizado, o texto alternativo existente e um rótulo neutro do gatilho.

Requisitos:

- botão real sobre a imagem, com `aria-haspopup="dialog"` e rótulo “Ampliar: <título editorial já aprovado>”;
- `<dialog aria-modal="true" aria-labelledby="image-dialog-title">` com botão Fechar;
- fechar por botão, `Escape` nativo e clique no backdrop;
- foco inicial no botão Fechar e retorno ao gatilho que abriu o diálogo;
- scroll lock compartilhado por token, sem remover o lock do menu se outro overlay ainda estiver ativo;
- imagem ampliada reutiliza `alt` já aprovado; o título do diálogo pode ser o título/caption existente, sem descrição adicional automática.

Para galerias cujo schema atual contém apenas `ImageMetadata[]`, o zoom pode usar rótulos neutros como “Registro 2 de 6 — Eletroday Maringá 2025”. Descrições visuais novas não serão inferidas de pixels, nomes de arquivo ou texto do evento. A migração opcional para `{ image, alt, caption? }` só ocorre depois de revisão técnica/editorial de cada foto; até lá, o texto genérico existente é preservado e o item fica marcado no inventário editorial, não como falha mecânica.

### 3.7 Cases e eventos

Melhorias de estrutura podem reutilizar exatamente `title`, `summary`, `sector`, `tech`, `location`, `organizer`, datas e textos já publicados. Não se pode acrescentar números de produção, escopo instalado, resultados, cliente, certificação, presença de pessoas/equipamentos ou interpretação visual sem evidência.

Novas relações contextuais para cases exigem uma nota de evidência no review editorial. Eventos podem apontar para páginas de tecnologia somente quando o corpo ou material oficial do evento sustentar a relação. O validador de rotas confirma que o link existe; a aprovação humana confirma que o vínculo é verdadeiro.

### 3.8 `seoTitle` e locale

`SITE.locale` continua como `"pt-BR"` e será a única fonte de `<html lang>`. `SITE.openGraphLocale` será `"pt_BR"` e será a única fonte de `og:locale`. `BaseLayout.astro` ganhará prop `seoTitle?: string`; `title` será o título editorial/visível e `seoTitle` apenas a base opcional do `<title>`. A composição central será:

```ts
resolveDocumentTitle({ title, seoTitle }): string
// seoTitle ?? title -> acrescenta " | Integra" uma única vez;
// sem ambos -> SITE.defaultTitle.
```

Os schemas `blog`, `cases` e `eventos` aceitarão `seoTitle?: string`. O catálogo técnico mantém seu campo atual, mas `/tecnologias/[slug].astro` passará `title={item.title}` e `seoTitle={item.seoTitle}` em vez de sobrecarregar `title`. Nenhum H1 é alterado por uma otimização de `<title>`.

### 3.9 `llms.txt` gerado e validado

`src/data/llmsContent.mjs` será a fonte canônica, com JSDoc e dados explícitos para identidade, posicionamento, data de revisão, grupos e links públicos. `scripts/generateLlmsTxt.mjs` renderizará saída determinística UTF-8 com LF em `public/llms.txt`. `scripts/verifyLlmsTxt.mjs` gerará em memória e falhará se o arquivo divergir, se houver URL fora de `SITE.url`, rota interna inexistente no build, duplicata ou heading vazio.

O fluxo será:

```text
src/data/llmsContent.mjs -> scripts/generateLlmsTxt.mjs -> public/llms.txt
                              scripts/verifyLlmsTxt.mjs -> gate de drift/rotas
```

Claims do resumo institucional continuam exigindo fonte editorial. O gerador elimina drift, não aprova conteúdo. A data “Última atualização” vem do campo `reviewedAt` da fonte canônica e só muda quando a revisão realmente ocorrer.

### 3.10 Quatro referências públicas e estados inconclusivos

A checagem automatizada de 2026-08-20 encontrou quatro URLs do `sourceRegistry.ts` com HTTP 404. Há candidatos oficiais disponíveis, mas a troca só é aceita depois da comparação editorial descrita abaixo:

| Registro atual | URL 404 | Candidato oficial | Evidência mínima de equivalência |
|---|---|---|---|
| FactoryTalk DataMosaix Reference Architectures | `https://www.rockwellautomation.com/en-us/products/software/factorytalk/operationsuite/datamosaix.html` | `https://www.rockwellautomation.com/en-us/products/software/factorytalk/datamosaix.html` | Página oficial atual do mesmo produto; manter `linkLabel` como documentação relacionada, não como documento exato da imagem. |
| ControlLogix 5580/5570 Selection Guide `(1756-SG020-EN-P)` | `https://literature.rockwellautomation.com/idc/groups/literature/documents/sg/1756-sg020_-en-p.pdf` | `https://literature.rockwellautomation.com/idc/groups/literature/documents/sg/1756-sg002_-en-p.pdf` | Conferir título, famílias 5580/5570 e a figura local; atualizar também o código editorial de SG020 para SG002 somente se a página/figura for correspondente. |
| FactoryTalk Optix Reference Architectures | `https://www.rockwellautomation.com/en-us/docs/factorytalk-optix/current/technical-content/optix-at001.html` | `https://www.rockwellautomation.com/en-us/support/documentation/technical/capabilities/optix-portfolio.html` | Página oficial atual contém a seção “Reference Architectures” e o acesso ao `OPTIX-AT001`; manter a qualificação de documentação relacionada. |
| Telit deviceWISE | `https://www.telit.com/iot-platforms/devicewise/` | `https://www.telit.com/iot-platforms-overview/` | Página oficial atual identifica deviceWISE como plataforma IIoT; manter a distinção entre documentação relacionada e a apresentação Eletroday exibida. |

Antes da troca, o revisor registra URL antiga, status, URL candidata, status, título oficial, produto/publicação, comparação com `source`/`caption`/imagem e decisão. Os endpoints Siemens que responderem 403 e qualquer endpoint que resulte em reset/timeout ficam com `verification: "manual"`; não são removidos, substituídos nem classificados como quebrados por automação. A verificação manual deve abrir em navegador, confirmar domínio, título e pertinência e registrar data. Um teste de links pode falhar somente por 404/410 reproduzível em duas tentativas GET; 403, 429, timeout e reset geram relatório inconclusivo com exit code zero.

## 4. Separação entre trabalho mecânico e gates humanos

| Trabalho mecânico e automatizável | Exige evidência editorial/técnica/negócio |
|---|---|
| Estados do menu, `100dvh`, scroll lock, foco, breakpoint | Alterar rótulos comerciais do menu ou posição de oferta |
| Mensagens de validade derivadas das constraints já existentes | Mudar campos, bases legais, opt-in ou prazo de atendimento |
| Filtros, contagens, load-more e exclusão de boilerplate no Pagefind | Pesos/ranking baseados em conversão sem dados de uso |
| IDs explícitos e links de sumário | Renomear seções técnicas ou reescrever conteúdo |
| Dialog, foco, retorno e reutilização de `alt` existente | Criar novo `alt`/caption descritivo de foto ou diagrama |
| Validar que relações apontam para rotas existentes | Declarar que um case/evento demonstra tecnologia ou resultado |
| Centralizar locale e composição do `<title>` | Aprovar novo `seoTitle` com promessa comercial |
| Gerar `llms.txt` de dados aprovados e detectar drift | Alterar posicionamento, credenciais ou especialidades públicas |
| Medir HTTP e registrar status | Confirmar equivalência editorial de referência ou resolver 403/reset |

## 5. Critérios de aceitação

1. Menu móvel passa testes de abertura, foco, Escape, clique fora, navegação, scroll lock e reset em 1440 px; o painel usa fallback `100vh` seguido de `100dvh` com `--site-header-height` medido.
2. Contato e newsletter exibem erro por campo, `aria-invalid`, `aria-describedby` composto e summary separada do status de envio; reset/sucesso limpam o estado.
3. Pagefind retorna filtros por seção com contagens, carrega lotes de 12 e exclui conteúdo repetido sem perder o corpo editorial.
4. Setores detalhados, tecnologias e o conjunto de quatro páginas-guia definido — dois guias MDX e duas páginas estáticas de referência (`/automacao-industrial/` e `/ciberseguranca-ot/`) — têm sumário funcional com IDs explícitos, únicos e estáveis.
5. Zoom funciona por teclado e ponteiro, fecha por três caminhos, devolve foco e não cria texto alternativo não validado.
6. Active nav resolve todas as famílias mapeadas sem múltiplos ativos; relações contextuais inválidas, duplicadas ou órfãs falham no gate estrutural.
7. Nenhuma mudança em cases/eventos introduz claim ou descrição visual sem registro de evidência/aprovação.
8. `<html lang>`, `og:locale` e composição de `<title>` são centralizados; H1 e `seoTitle` permanecem conceitos distintos.
9. `public/llms.txt` é reproduzível byte a byte pela fonte canônica e o gate detecta drift, URL duplicada ou rota inexistente.
10. As quatro referências 404 só são trocadas após equivalência registrada; 403/reset/timeout permanecem como verificação manual inconclusiva.
11. `npm run check`, suites Vitest, build Pagefind e auditoria editorial passam. Alterações de sitemap/canonical são ausentes deste conjunto de commits, salvo consumo do metadata de seção estritamente necessário ao Pagefind.
