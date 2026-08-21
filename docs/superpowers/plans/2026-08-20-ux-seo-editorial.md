# UX, SEO and Editorial Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver accessible mobile navigation, field-level form errors, faceted Pagefind search, stable editorial ToCs, accessible image zoom, validated contextual relations, centralized metadata, generated `llms.txt`, and evidence-gated public-reference repairs without inventing claims.

**Architecture:** Extract browser behavior from Astro components into focused TypeScript controllers tested in a `happy-dom` Vitest suite. Centralize route families, metadata rules and LLM-facing content in typed registries, then extend the existing build-time editorial audit so rendered HTML is the integration boundary. Keep canonical/sitemap ownership in `docs/superpowers/plans/2026-08-20-platform-integrity.md`; when both plans share a branch, execute Platform Integrity Task 1 before this plan's Tasks 4, 7 and 9, preserving its `canonical?: string | URL | false` contract.

**Tech Stack:** Astro 7.2.4, TypeScript 5.7 strict mode, Tailwind CSS 4, Pagefind 1.5.2, Vitest 4, happy-dom 20.11.6, Node.js 22.23.2, native HTML `<dialog>`.

**Spec:** `docs/superpowers/specs/2026-08-20-ux-seo-editorial-design.md`

**Cross-plan order:** `docs/superpowers/plans/2026-08-20-full-site-remediation.md` is authoritative for shared files. Platform Tasks 1–2 and Newsletter Tasks 1–7 precede these UI/content changes; Platform Task 3 validates the completed environment contract; Platform Task 6 owns the final workflow.

## Global Constraints

- Do not modify `astro.config.mjs` sitemap configuration, canonical behavior, `public/_redirects`, or `functions/_middleware.ts`; sitemap/canonical work belongs to `docs/superpowers/plans/2026-08-20-platform-integrity.md`.
- Do not add or strengthen claims in cases, events, image alternatives, captions, relations, credentials, outcomes, products, or positioning without recorded editorial/technical/business evidence.
- Treat HTTP 200/206 as availability only, never as proof of editorial equivalence.
- Treat HTTP 403, 429, timeout, connection reset, and TLS negotiation failure as `manual`, not `broken`; preserve the current URL until manual verification is recorded.
- Use explicit editorial IDs matching `^[a-z][a-z0-9-]*$`; never derive a public ToC contract from a mutable heading label.
- Pagefind result batches contain exactly 12 items; changing query or filter resets the visible count to 12.
- Desktop breakpoint reset uses exactly `matchMedia("(min-width: 1440px)")`, matching the existing Header classes.
- Preserve `SITE.locale = "pt-BR"`; expose Open Graph locale as `"pt_BR"` from the same site configuration.
- Use Node.js exactly `22.23.2` and pin the new DOM-only test dependency to `happy-dom@20.11.6`.
- Run TDD in RED/GREEN order for every task and do not combine the failing-test and implementation commits.
- `public/llms.txt` is generated output; editorial changes begin in `src/data/llmsContent.mjs`.
- A passing automated suite is documentary/software evidence, not approval of an unverified editorial claim.

---

### Task 1: Add a DOM-focused test lane and overlay lock primitive

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vitest.config.ts`
- Create: `vitest.ui.config.ts`
- Create: `src/scripts/overlayLock.ts`
- Create: `tests/ui/overlayLock.test.ts`

**Interfaces:**
- Consumes: browser `document.documentElement` and an overlay token string.
- Produces: `acquireOverlayLock(token: string): void`, `releaseOverlayLock(token: string): void`, `clearOverlayLocks(): void`; the root exposes `data-overlay-locks` and scroll is locked while at least one token remains.

- [ ] **Step 1: Install the DOM test environment and add the script**

Run: `npm install --save-dev --save-exact happy-dom@20.11.6`

Configure the scripts exactly as follows, so the aggregate runs each lane once
and in a deterministic order:

```json
"test": "npm run test:workers && npm run test:node && npm run test:ui",
"test:workers": "vitest run",
"test:node": "vitest run --config vitest.node.config.ts",
"test:ui": "vitest run --config vitest.ui.config.ts"
```

Configure `vitest.ui.config.ts` with `environment: "happy-dom"`,
`include: ["tests/ui/**/*.test.ts"]`, `restoreMocks: true`, and no Cloudflare
pool plugin. Preserve the Workers plugin/include/setup in `vitest.config.ts`,
but exclude both `tests/node/**/*.test.ts` and `tests/ui/**/*.test.ts` from that
pool. `vitest.node.config.ts` continues to include only
`tests/node/**/*.test.ts`.

- [ ] **Step 2: Write the failing overlay-lock tests**

```ts
import { afterEach, describe, expect, it } from "vitest";
import {
  acquireOverlayLock,
  clearOverlayLocks,
  releaseOverlayLock,
} from "../../src/scripts/overlayLock";

afterEach(clearOverlayLocks);

describe("overlayLock", () => {
  it("keeps scrolling locked until every owner releases", () => {
    acquireOverlayLock("mobile-menu");
    acquireOverlayLock("image-dialog");
    releaseOverlayLock("mobile-menu");
    expect(document.documentElement.dataset.overlayLocks).toBe("image-dialog");
    expect(document.documentElement.style.overflow).toBe("hidden");
    releaseOverlayLock("image-dialog");
    expect(document.documentElement.dataset.overlayLocks).toBeUndefined();
    expect(document.documentElement.style.overflow).toBe("");
  });
});
```

- [ ] **Step 3: Run the UI test and verify RED**

Run: `npm run test:ui -- tests/ui/overlayLock.test.ts`

Expected: FAIL because `src/scripts/overlayLock.ts` does not exist.

- [ ] **Step 4: Implement the minimal token-based lock**

Use a module-level `Set<string>`, serialize sorted tokens to `data-overlay-locks`, set `style.overflow = "hidden"` while non-empty, and remove both properties when empty. `clearOverlayLocks()` must empty the set and restore the root.

```ts
const locks = new Set<string>();

function syncRoot(): void {
  const root = document.documentElement;
  if (locks.size === 0) {
    delete root.dataset.overlayLocks;
    root.style.removeProperty("overflow");
    return;
  }
  root.dataset.overlayLocks = [...locks].sort().join(" ");
  root.style.overflow = "hidden";
}

export function acquireOverlayLock(token: string): void { locks.add(token); syncRoot(); }
export function releaseOverlayLock(token: string): void { locks.delete(token); syncRoot(); }
export function clearOverlayLocks(): void { locks.clear(); syncRoot(); }
```

- [ ] **Step 5: Run isolated lanes, aggregate tests and type-check GREEN**

Run:

```powershell
npm run test:ui -- tests/ui/overlayLock.test.ts
npm run test:workers
npm run test:node
npm run test:ui
npm test
npm run check
```

Expected: the focused UI tests pass; Workers collects neither `tests/node/**`
nor `tests/ui/**`; Node collects only `tests/node/**`; UI collects only
`tests/ui/**`; the aggregate executes all three exactly once; Astro reports
zero errors.

- [ ] **Step 6: Commit the test lane and primitive**

```bash
git add package.json package-lock.json vitest.config.ts vitest.ui.config.ts src/scripts/overlayLock.ts tests/ui/overlayLock.test.ts
git commit -m "test: add DOM interaction test lane"
```

### Task 2: Make mobile navigation viewport-safe and keyboard-complete

**Files:**
- Modify: `src/components/Header.astro:149-525`
- Modify: `src/styles/global.css`
- Create: `src/scripts/mobileNavigation.ts`
- Create: `tests/ui/mobileNavigation.test.ts`

**Interfaces:**
- Consumes: `acquireOverlayLock("mobile-menu")`, `releaseOverlayLock("mobile-menu")`; `[data-site-header]`, `[data-menu-toggle]`, `#mobile-nav`, icon hooks and `matchMedia("(min-width: 1440px)")`.
- Produces: `initMobileNavigation(root: Document = document): { destroy(): void }`; CSS variable `--site-header-height`; root state `data-mobile-menu-open="true"`.

- [ ] **Step 1: Write failing interaction tests**

Create a fixture with a header, toggle, menu, two links, a `<details open>` and an outside button. Assert: opening synchronizes `aria-expanded`/label/icons, sets `--site-header-height`, locks scroll and focuses the first menu link; `Tab`/`Shift+Tab` wrap; Escape and outside click close and return focus; menu-link click closes without forced focus; a mocked media-query change to `matches: true` closes, unlocks and removes `<details open>`.

```ts
const controller = initMobileNavigation(document);
toggle.click();
expect(toggle.getAttribute("aria-expanded")).toBe("true");
expect(document.activeElement).toBe(firstLink);
document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
expect(toggle.getAttribute("aria-expanded")).toBe("false");
expect(document.activeElement).toBe(toggle);
mediaQuery.matches = true;
mediaQuery.dispatchEvent(new Event("change"));
expect(details.open).toBe(false);
controller.destroy();
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test:ui -- tests/ui/mobileNavigation.test.ts`

Expected: FAIL with missing `initMobileNavigation`.

- [ ] **Step 3: Implement the controller**

Implement `open`, `close({ returnFocus })`, `setHeaderHeight`, focusable-element collection, Tab containment, document keydown/pointerdown, menu click, `ResizeObserver` with resize fallback, and media-query change handling. `destroy()` removes every listener/observer and releases only the `mobile-menu` token.

```ts
export function initMobileNavigation(root: Document = document) {
  const header = root.querySelector<HTMLElement>("[data-site-header]");
  const toggle = root.querySelector<HTMLButtonElement>("[data-menu-toggle]");
  const menu = root.getElementById("mobile-nav");
  if (!header || !toggle || !menu) return { destroy() {} };

  const desktop = window.matchMedia("(min-width: 1440px)");
  const close = ({ returnFocus = false } = {}) => {
    menu.classList.add("hidden");
    toggle.setAttribute("aria-expanded", "false");
    document.documentElement.removeAttribute("data-mobile-menu-open");
    releaseOverlayLock("mobile-menu");
    if (returnFocus) toggle.focus();
  };
  const open = () => {
    menu.classList.remove("hidden");
    toggle.setAttribute("aria-expanded", "true");
    document.documentElement.dataset.mobileMenuOpen = "true";
    acquireOverlayLock("mobile-menu");
    menu.querySelector<HTMLElement>('a,button,summary,[tabindex]:not([tabindex="-1"])')?.focus();
  };
  const onToggle = () => menu.classList.contains("hidden") ? open() : close({ returnFocus: true });
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && !menu.classList.contains("hidden")) close({ returnFocus: true });
    if (event.key === "Tab" && !menu.classList.contains("hidden")) containTab(event, toggle, menu);
  };
  const onPointerDown = (event: PointerEvent) => {
    if (event.target instanceof Node && !header.contains(event.target)) close({ returnFocus: true });
  };
  const onMenuClick = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest("a")) close();
  };
  const onDesktopChange = () => {
    if (!desktop.matches) return;
    close();
    menu.querySelectorAll("details[open]").forEach((item) => item.removeAttribute("open"));
  };
  const setHeaderHeight = () => document.documentElement.style.setProperty(
    "--site-header-height", `${header.getBoundingClientRect().height}px`,
  );
  const resizeObserver = new ResizeObserver(setHeaderHeight);
  toggle.addEventListener("click", onToggle);
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("pointerdown", onPointerDown);
  menu.addEventListener("click", onMenuClick);
  desktop.addEventListener("change", onDesktopChange);
  resizeObserver.observe(header);
  setHeaderHeight();
  return { destroy: () => {
    close();
    toggle.removeEventListener("click", onToggle);
    document.removeEventListener("keydown", onKeydown);
    document.removeEventListener("pointerdown", onPointerDown);
    menu.removeEventListener("click", onMenuClick);
    desktop.removeEventListener("change", onDesktopChange);
    resizeObserver.disconnect();
  } };
}
```

- [ ] **Step 4: Wire Header markup and viewport CSS**

Add `data-site-header` to `<header>`. Replace the mobile panel height utility with a semantic class that declares:

```css
.mobile-nav-panel {
  max-height: calc(100vh - var(--site-header-height, 5rem));
  max-height: calc(100dvh - var(--site-header-height, 5rem));
}
```

Keep `min-[1440px]:hidden`, `overflow-y-auto` and `overscroll-contain`. Replace the inline menu implementation with `initMobileNavigation()`; leave desktop mega-menu behavior intact.

- [ ] **Step 5: Run controller, full UI and Astro checks GREEN**

Run: `npm run test:ui -- tests/ui/mobileNavigation.test.ts && npm run test:ui && npm run check`

Expected: all UI tests pass and Astro reports zero errors.

- [ ] **Step 6: Commit mobile navigation**

```bash
git add src/components/Header.astro src/styles/global.css src/scripts/mobileNavigation.ts tests/ui/mobileNavigation.test.ts
git commit -m "fix: make mobile navigation accessible"
```

### Task 3: Add reusable field errors and a separate validation summary

**Files:**
- Create: `src/utils/formValidation.ts`
- Modify: `src/components/ContactForm.astro:15-557`
- Modify: `src/components/NewsletterForm.astro:1-304`
- Create: `tests/ui/formValidation.test.ts`

**Interfaces:**
- Consumes: a form with `[data-validation-summary]`, validatable controls carrying `data-field-label`, and existing `[data-form-status]` for network/success state.
- Produces: `attachAccessibleValidation(form: HTMLFormElement): { validate(): boolean; clear(): void; destroy(): void }`; per-control `${control.id}-error`; deterministic messages from `messageFor(control)`.

- [ ] **Step 1: Write failing validation tests**

Cover required empty text, invalid e-mail, minimum length, checkbox consent, composition of existing help ID with error ID, summary links, first-invalid focus, error removal on valid input, and `clear()` after reset. Assert that `[data-form-status]` is untouched by validation.

```ts
const validation = attachAccessibleValidation(form);
expect(validation.validate()).toBe(false);
expect(email.getAttribute("aria-invalid")).toBe("true");
expect(email.getAttribute("aria-describedby")).toBe("cf-email-help cf-email-error");
expect(summary.querySelector('a[href="#cf-email"]')?.textContent)
  .toContain("E-mail corporativo");
email.value = "engenharia@example.com";
email.dispatchEvent(new Event("input", { bubbles: true }));
expect(email.hasAttribute("aria-invalid")).toBe(false);
expect(status.textContent).toBe("estado operacional preservado");
validation.clear();
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test:ui -- tests/ui/formValidation.test.ts`

Expected: FAIL because `attachAccessibleValidation` is missing.

- [ ] **Step 3: Implement deterministic validation**

Implement messages in this precedence: `valueMissing`, `typeMismatch`, `tooShort`, `tooLong`, generic invalid. Preserve original `aria-describedby` tokens, append/remove only the helper-owned error ID, and build the summary with DOM methods and `<a href="#field-id">Campo: mensagem</a>`.

```ts
export function messageFor(control: ValidatableControl): string {
  const label = control.dataset.fieldLabel ?? "Campo";
  if (control.validity.valueMissing) return `${label}: preenchimento obrigatório.`;
  if (control.validity.typeMismatch) return `${label}: informe um formato válido.`;
  if (control.validity.tooShort) return `${label}: use ao menos ${control.minLength} caracteres.`;
  if (control.validity.tooLong) return `${label}: use no máximo ${control.maxLength} caracteres.`;
  return `${label}: revise o valor informado.`;
}

export function attachAccessibleValidation(form: HTMLFormElement) {
  const controls = [...form.elements].filter(isValidatableControl);
  const validate = () => {
    const invalid = controls.filter((control) => !control.validity.valid);
    for (const control of controls) renderFieldError(control, invalid.includes(control));
    renderSummary(form, invalid);
    invalid[0]?.focus();
    return invalid.length === 0;
  };
  return { validate, clear: () => clearErrors(controls, form), destroy: () => detach() };
}
```

- [ ] **Step 4: Wire both forms without changing API behavior**

Add a hidden summary immediately after each required-fields note. Give every validatable control `data-field-label` and a sibling error whose ID is `${control.id}-error` (for example, `<p id="cf-email-error" data-field-error hidden>`). Give consent checkboxes stable IDs. Replace `form.reportValidity()` and generic invalid listeners with `validation.validate()`; keep Turnstile/network errors in `[data-form-status]`. Call `validation.clear()` after every successful/honeypot reset and on native `reset`.

- [ ] **Step 5: Verify GREEN and regression suites**

Run: `npm run test:ui -- tests/ui/formValidation.test.ts && npm test && npm run check`

Expected: UI validation tests, existing Workers tests and Astro check pass.

- [ ] **Step 6: Commit form accessibility**

```bash
git add src/utils/formValidation.ts src/components/ContactForm.astro src/components/NewsletterForm.astro tests/ui/formValidation.test.ts
git commit -m "fix: expose accessible form field errors"
```

### Task 4: Centralize route families, active navigation and Pagefind sections

**Files:**
- Create: `src/data/navigation.ts`
- Modify: `src/utils/site.ts:72-111`
- Modify: `src/components/Header.astro:1-149`
- Modify: `src/layouts/BaseLayout.astro:9-168`
- Create: `tests/ui/navigation.test.ts`
- Modify: `scripts/auditEditorialHtml.cjs`

**Interfaces:**
- Consumes: `NAV` and a pathname.
- Produces: `NavHref`, `SearchSection`, `RouteRelation`, `normalizeRoutePath(pathname)`, `activeNavHref(pathname)`, `searchSectionFor(pathname)`; one `data-pagefind-filter="section:<value>"` marker per indexable page.

- [ ] **Step 1: Write the failing route-family matrix**

Test exact active destinations for `/solucoes/plantpax/`, `/servicos/programacao-clp/`, `/automacao-industrial/`, `/ciberseguranca-ot/`, `/integra-acao/newsletter/`, `/eventos/rok-technology-2026/`, `/equipe/`, `/certificacoes/silver-system-integrator/`, plus no active item for `/`, `/busca/`, `/contato/` and `/politica-privacidade/`. Assert one and only one relation matches every listed path.

```ts
expect(activeNavHref("/servicos/programacao-clp/")).toBe("/solucoes/");
expect(activeNavHref("/integra-acao/newsletter/")).toBe("/blog/");
expect(activeNavHref("/eventos/rok-technology-2026/")).toBe("/blog/");
expect(activeNavHref("/integrador-rockwell/")).toBe("/certificacoes/");
expect(activeNavHref("/contato/")).toBeUndefined();
expect(searchSectionFor("/servicos/programacao-clp/")).toBe("servicos");
```

- [ ] **Step 2: Run and verify RED**

Run: `npm run test:ui -- tests/ui/navigation.test.ts`

Expected: FAIL because the navigation registry does not exist.

- [ ] **Step 3: Implement the typed registry and replace Header-local prefix logic**

Define non-overlapping `RouteRelation[]`; validate duplicate prefixes at module load in development. `Header.astro` computes one `currentNavHref` and compares equality for desktop/mobile `aria-current` and active classes.

```ts
export const ROUTE_RELATIONS: readonly RouteRelation[] = [
  { navHref: "/solucoes/", searchSection: "servicos", prefixes: ["/servicos/"] },
  { navHref: "/solucoes/", searchSection: "solucoes", prefixes: ["/solucoes/", "/automacao-industrial/", "/ciberseguranca-ot/"] },
  { navHref: "/setores/", searchSection: "setores", prefixes: ["/setores/"] },
  { navHref: "/cases/", searchSection: "cases", prefixes: ["/cases/"] },
  { navHref: "/tecnologias/", searchSection: "tecnologias", prefixes: ["/tecnologias/"] },
  { navHref: "/blog/", searchSection: "blog", prefixes: ["/blog/", "/integra-acao/"] },
  { navHref: "/blog/", searchSection: "eventos", prefixes: ["/eventos/"] },
  { navHref: "/empresa/", searchSection: "institucional", prefixes: ["/empresa/", "/equipe/"] },
  { navHref: "/certificacoes/", searchSection: "institucional", prefixes: ["/certificacoes/", "/integrador-rockwell/"] },
] as const;

export function activeNavHref(pathname: string): NavHref | undefined {
  return relationFor(pathname)?.navHref;
}
```

- [ ] **Step 4: Add Pagefind section metadata without touching canonical/sitemap**

Add optional `searchSection?: SearchSection` to BaseLayout props. Render a visually hidden `<span data-pagefind-ignore data-pagefind-filter={`section:${searchSection ?? searchSectionFor(Astro.url.pathname)}`}></span>` inside `<main>` before the slot. Do not change `canonicalURL`, sitemap integration, redirects or middleware.

- [ ] **Step 5: Extend rendered-HTML audit**

For every indexable route, assert exactly one `section:*` Pagefind filter whose value is in the `SearchSection` vocabulary. Derive exemptions from the shared `NOINDEX_PATHS` policy rather than hardcoding only search; the current exempt rendered routes are `/busca/`, `/integra-acao/webinar/`, and `/integra-acao/newsletter/confirmar/` when present. The 404 is not a Pagefind content route.

- [ ] **Step 6: Verify GREEN**

Run: `npm run test:ui -- tests/ui/navigation.test.ts && npm run build && npm run audit:html && npm run check`

Expected: route matrix passes; build completes with Pagefind; editorial HTML audit and Astro check pass.

- [ ] **Step 7: Commit navigation registry**

```bash
git add src/data/navigation.ts src/utils/site.ts src/components/Header.astro src/layouts/BaseLayout.astro tests/ui/navigation.test.ts scripts/auditEditorialHtml.cjs
git commit -m "feat: centralize navigation route families"
```

### Task 5: Add Pagefind filters, counts, load-more and boilerplate exclusions

**Files:**
- Create: `src/scripts/siteSearch.ts`
- Modify: `src/pages/busca/index.astro:25-250`
- Modify: `src/components/Breadcrumbs.astro`
- Modify: `src/components/CtaBlock.astro`
- Modify: `src/pages/tecnologias/[slug].astro:185-234`
- Modify: `src/pages/cases/[...slug].astro:164-207`
- Create: `tests/ui/siteSearch.test.ts`
- Modify: `scripts/auditEditorialHtml.cjs`
- Modify: `README.md:319-332`

**Interfaces:**
- Consumes: Pagefind 1.5.2 `init()`, `filters()`, `search(query, { filters })`, `results`, `unfilteredResultCount`, `filters`, `totalFilters`; section vocabulary from `navigation.ts`.
- Produces: `initSiteSearch(root: Document = document, loadPagefind?: () => Promise<PagefindModule>): { destroy(): void }`; state `{ query, section, total, visible, pageSize: 12 }`; URL params `q` and `secao`.

- [ ] **Step 1: Write failing search-controller tests**

Use a fake Pagefind module with 29 results and section counts. Test a two-character minimum, `{ filters: {} }` for “Todos”, `{ filters: { section: "tecnologias" } }` for a chip, counts from response, exactly 12/24/29 rendered after two load-more clicks, load-more removal at 29, reset to 12 when the query/filter changes, stale-response suppression, safe internal URLs, `?q=`/`?secao=` synchronization and the build-index fallback message.

```ts
const controller = initSiteSearch(document, async () => fakePagefind);
input.value = "plantpax";
input.dispatchEvent(new Event("input", { bubbles: true }));
await vi.advanceTimersByTimeAsync(220);
expect(fakePagefind.search).toHaveBeenCalledWith("plantpax", { filters: {} });
expect(results.children).toHaveLength(12);
loadMore.click();
expect(results.children).toHaveLength(24);
technologyFilter.click();
expect(fakePagefind.search).toHaveBeenLastCalledWith("plantpax", {
  filters: { section: "tecnologias" },
});
controller.destroy();
```

- [ ] **Step 2: Run and verify RED**

Run: `npm run test:ui -- tests/ui/siteSearch.test.ts`

Expected: FAIL because `initSiteSearch` is missing.

- [ ] **Step 3: Implement the Pagefind adapter and renderer**

Move all interfaces and search behavior out of the Astro inline script. Call `filters()` once after init, use `textContent` for labels/titles/counts, permit `innerHTML` only for Pagefind `excerpt`, and guard old requests with a sequence number. Render results incrementally from the cached result handles.

```ts
const PAGE_SIZE = 12 as const;
let handles: PagefindSearchResult[] = [];
let visible = PAGE_SIZE;

async function search(query: string, section: SearchSectionFilter) {
  const seq = ++searchSequence;
  const response = await pagefind.search(query, {
    filters: section === "all" ? {} : { section },
  });
  if (seq !== searchSequence) return;
  handles = response.results;
  visible = PAGE_SIZE;
  await renderSlice(0, visible);
  renderCounts(response.filters.section ?? response.totalFilters.section ?? {});
}

async function loadMore() {
  const previous = visible;
  visible = Math.min(visible + PAGE_SIZE, handles.length);
  await renderSlice(previous, visible);
}
```

- [ ] **Step 4: Add accessible filter and load-more markup**

Add `<fieldset>`/`<legend>` with radio-like section controls, contextual counts, status text, result list and a hidden “Carregar mais” button. Use `aria-pressed` only if buttons are retained; do not mix radio and pressed-button semantics. Announce visible and total counts in the existing polite status region.

- [ ] **Step 5: Exclude repeated navigation content from the index**

Add `data-pagefind-ignore` to breadcrumbs, reusable CTA blocks and contextual-related grids. Keep H1, intros, main explanatory sections, case/event bodies and technical FAQs indexed. Extend `auditEditorialHtml.cjs` to assert that header, footer, breadcrumbs, CTA and relationship grids are ignored while `<main data-pagefind-body>` remains present.

- [ ] **Step 6: Verify GREEN against the real generated index**

Run: `npm run test:ui -- tests/ui/siteSearch.test.ts && npm run build && npm run audit:html && npm run check`

Then run: `npm run pages:dev`

Manual smoke at `http://localhost:8788/busca/?q=plantpax&secao=tecnologias`: confirm counts, filter change, batches of 12, keyboard focus and no repeated Header/Footer/CTA text in excerpts. Stop Wrangler with `Ctrl+C`.

- [ ] **Step 7: Commit search UX**

```bash
git add src/scripts/siteSearch.ts src/pages/busca/index.astro src/components/Breadcrumbs.astro src/components/CtaBlock.astro src/pages/tecnologias/[slug].astro src/pages/cases/[...slug].astro tests/ui/siteSearch.test.ts scripts/auditEditorialHtml.cjs README.md
git commit -m "feat: add faceted Pagefind search"
```

### Task 6: Add stable editorial ToCs to sectors, technologies and long guides

**Files:**
- Create: `src/components/TableOfContents.astro`
- Create: `src/scripts/tableOfContents.ts`
- Modify: `src/content.config.ts:5-20`
- Modify: `src/pages/tecnologias/[slug].astro`
- Modify: `src/pages/setores/acucar-e-etanol.astro`
- Modify: `src/pages/setores/alimentos-e-bebidas.astro`
- Modify: `src/pages/setores/armazenagem-de-graos.astro`
- Modify: `src/pages/setores/etanol-de-milho.astro`
- Modify: `src/pages/setores/fabricas-de-racao.astro`
- Modify: `src/pages/setores/frigorificos.astro`
- Modify: `src/pages/setores/papel-e-celulose.astro`
- Modify: `src/pages/setores/quimica-e-fertilizantes.astro`
- Modify: `src/pages/setores/saneamento.astro`
- Modify: `src/pages/automacao-industrial.astro`
- Modify: `src/pages/ciberseguranca-ot.astro`
- Modify: `src/content/blog/como-elaborar-rfp-automacao-industrial.mdx`
- Modify: `src/content/blog/migracao-plc5-controllogix-guia-completo.mdx`
- Modify: `src/pages/blog/[...slug].astro`
- Create: `tests/ui/tableOfContents.test.ts`
- Modify: `scripts/auditEditorialHtml.cjs`

**Interfaces:**
- Consumes: `TocItem { id: string; label: string; level: 2 | 3 }[]`; headings with explicit matching IDs.
- Produces: `validateTocItems(items: readonly TocItem[]): void`; `<nav aria-label="Nesta página" data-editorial-toc>`; `initTableOfContents(nav): { destroy(): void }`; current link carries `aria-current="location"`.

- [ ] **Step 1: Write failing ToC controller and validation tests**

Test first-visible heading activation with a mocked `IntersectionObserver`, hash-click behavior, no-JS-valid anchor markup, and audit fixtures for duplicate IDs, invalid IDs, missing targets and target headings absent from the ToC.

```ts
const controller = initTableOfContents(nav);
observerCallback([{ target: headingB, isIntersecting: true } as IntersectionObserverEntry]);
expect(linkA.hasAttribute("aria-current")).toBe(false);
expect(linkB.getAttribute("aria-current")).toBe("location");
expect(() => validateTocItems([
  { id: "metodo-integra", label: "Método Integra", level: 2 },
  { id: "metodo-integra", label: "Método repetido", level: 2 },
])).toThrow(/ID duplicado/);
controller.destroy();
```

- [ ] **Step 2: Run and verify RED**

Run: `npm run test:ui -- tests/ui/tableOfContents.test.ts`

Expected: FAIL because the ToC component/controller and audit rules do not exist.

- [ ] **Step 3: Implement the component and controller**

Validate IDs in component frontmatter with `/^[a-z][a-z0-9-]*$/`; render nested visual indentation from `level`; observe matching headings; update only `aria-current="location"`; disconnect in `destroy()`.

```astro
---
export interface TocItem { id: string; label: string; level: 2 | 3 }
interface Props { items: TocItem[] }
const { items } = Astro.props;
validateTocItems(items);
---
<nav aria-label="Nesta página" data-editorial-toc>
  <ol>{items.map((item) => <li data-level={item.level}><a href={`#${item.id}`}>{item.label}</a></li>)}</ol>
</nav>
```

- [ ] **Step 4: Add stable IDs and ToCs to generated technology pages**

Use exactly `onde-entra`, `metodo-integra`, `entregaveis-referencias` and `relacionados`. Place IDs on the section headings or owning sections and pass a static `TocItem[]`; omit `relacionados` when the section is absent.

- [ ] **Step 5: Add explicit ToC arrays to every detailed sector page and the two static guides**

For each file, define the array beside existing page constants, copy current visible heading labels verbatim, assign concise stable IDs, render `TableOfContents`, and add each ID to its current heading/section. Do not rewrite prose or labels in this mechanical step.

- [ ] **Step 6: Add governed ToCs to the two MDX guides**

Extend blog schema with:

```ts
toc: z.array(z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  label: z.string().min(1),
  level: z.union([z.literal(2), z.literal(3)]),
})).default([]),
```

Use these exact H2 mappings; H3 FAQ questions remain outside the initial ToC:

```yaml
# como-elaborar-rfp-automacao-industrial.mdx
toc:
  - { id: "o-que-e-rfp-automacao", label: "O que é uma RFP de automação industrial?", level: 2 }
  - { id: "conteudo-obrigatorio-rfp", label: "O que uma RFP de automação precisa conter?", level: 2 }
  - { id: "erros-rfp", label: "Quais erros tornam uma RFP de automação difícil de responder?", level: 2 }
  - { id: "comparar-propostas", label: "Como comparar propostas de automação além do preço?", level: 2 }
  - { id: "modelo-rfp-secao-a-secao", label: "Modelo de estrutura de RFP seção a seção", level: 2 }
  - { id: "perguntas-frequentes", label: "Perguntas frequentes", level: 2 }

# migracao-plc5-controllogix-guia-completo.mdx
toc:
  - { id: "o-que-e-migracao-plc5", label: "O que é a migração PLC-5 para ControlLogix?", level: 2 }
  - { id: "fim-de-linha-plc5-slc500", label: "Quando o PLC-5 e o SLC 500 saíram de linha?", level: 2 }
  - { id: "seis-fases-migracao", label: "Quais são as seis fases de uma migração PLC-5?", level: 2 }
  - { id: "fase-1-levantamento", label: "Fase 1 — Como levantar o sistema PLC-5 existente?", level: 2 }
  - { id: "fase-2-arquitetura", label: "Fase 2 — Como projetar a arquitetura ControlLogix de destino?", level: 2 }
  - { id: "fase-3-traducao", label: "Fase 3 — O que a ferramenta de tradução RSLogix 5 converte e o que precisa ser reescrito?", level: 2 }
  - { id: "fase-3-conversao-io", label: "Fase 3 (I/O) — Converter a fiação com Bulletin 1492 ou trocar o chassi?", level: 2 }
  - { id: "migrar-dhplus-ethernetip", label: "Como migrar a rede de DH+ para EtherNet/IP?", level: 2 }
  - { id: "fase-4-fat", label: "Fase 4 — Por que o FAT é a fase que mais reduz risco?", level: 2 }
  - { id: "fase-5-cutover", label: "Fase 5 — Como fazer o cutover com a planta rodando?", level: 2 }
  - { id: "fase-6-suporte", label: "Fase 6 — O que o suporte pós-energização precisa cobrir?", level: 2 }
  - { id: "riscos-e-mitigacoes", label: "Quais são os riscos típicos de uma migração PLC-5 e como mitigá-los?", level: 2 }
  - { id: "perguntas-frequentes", label: "Perguntas frequentes", level: 2 }
```

Replace each corresponding Markdown H2 with the same visible text and its mapped explicit ID; for example, use `<h2 id="o-que-e-rfp-automacao">O que é uma RFP de automação industrial?</h2>`. Render the ToC in the blog template when non-empty. Do not alter article claims.

- [ ] **Step 7: Extend rendered-HTML audit and verify GREEN**

Require exactly one target per ToC href, unique IDs, valid ID syntax and heading text equal to the configured label after whitespace normalization. Require a ToC on the routes listed by the spec and all `/setores/*` detail routes.

Run: `npm run test:ui -- tests/ui/tableOfContents.test.ts && npm run build && npm run audit:html && npm run audit:prose && npm run check`

Expected: all ToC routes pass structural and prose gates.

- [ ] **Step 8: Commit stable ToCs**

```bash
git add src/components/TableOfContents.astro src/scripts/tableOfContents.ts src/content.config.ts src/pages/tecnologias/[slug].astro src/pages/setores src/pages/automacao-industrial.astro src/pages/ciberseguranca-ot.astro src/content/blog/como-elaborar-rfp-automacao-industrial.mdx src/content/blog/migracao-plc5-controllogix-guia-completo.mdx src/pages/blog/[...slug].astro tests/ui/tableOfContents.test.ts scripts/auditEditorialHtml.cjs
git commit -m "feat: add stable editorial tables of contents"
```

### Task 7: Add an accessible image zoom dialog without inventing alternatives

**Files:**
- Create: `src/components/ImageZoomDialog.astro`
- Create: `src/scripts/imageZoomDialog.ts`
- Modify: `src/layouts/BaseLayout.astro:156-209`
- Modify: `src/components/ManualReference.astro:40-109`
- Modify: `src/pages/cases/[...slug].astro`
- Modify: `src/pages/eventos/[...slug].astro`
- Create: `tests/ui/imageZoomDialog.test.ts`
- Modify: `scripts/auditEditorialHtml.cjs`

**Interfaces:**
- Consumes: `[data-image-zoom]` buttons with `data-zoom-src`, `data-zoom-alt`, `data-zoom-title`; shared `acquireOverlayLock("image-dialog")`/`releaseOverlayLock("image-dialog")`.
- Produces: one `#image-zoom-dialog`; `initImageZoomDialog(dialog: HTMLDialogElement, root: Document = document): { destroy(): void }`.

- [ ] **Step 1: Write failing dialog tests**

Assert button activation copies src/alt/title, opens with `showModal()`, focuses Close, closes by button/Escape/backdrop, returns focus to the exact opener, and releases only its overlay token. Assert no synthesized description beyond fixture `data-zoom-alt`.

```ts
const controller = initImageZoomDialog(dialog, document);
trigger.click();
expect(dialog.open).toBe(true);
expect(dialogImage.src).toContain("/manual.png");
expect(dialogImage.alt).toBe("Arquitetura já aprovada");
expect(document.activeElement).toBe(closeButton);
closeButton.click();
expect(document.activeElement).toBe(trigger);
controller.destroy();
```

- [ ] **Step 2: Run and verify RED**

Run: `npm run test:ui -- tests/ui/imageZoomDialog.test.ts`

Expected: FAIL because dialog/controller do not exist.

- [ ] **Step 3: Implement dialog and delegated controller**

Render `aria-modal="true"` and `aria-labelledby="image-dialog-title"`. Use event delegation so galleries do not add one listener per image. Detect backdrop click by comparing pointer coordinates with `dialog.getBoundingClientRect()`. Let native Escape emit `cancel`, then close and restore focus.

```ts
export function initImageZoomDialog(dialog: HTMLDialogElement, root: Document = document) {
  let opener: HTMLButtonElement | null = null;
  const open = (button: HTMLButtonElement) => {
    opener = button;
    image.src = requiredData(button, "zoomSrc");
    image.alt = requiredData(button, "zoomAlt");
    title.textContent = requiredData(button, "zoomTitle");
    acquireOverlayLock("image-dialog");
    dialog.showModal();
    closeButton.focus();
  };
  const close = () => {
    dialog.close();
    releaseOverlayLock("image-dialog");
    opener?.focus();
  };
  const onRootClick = (event: MouseEvent) => {
    const trigger = event.target instanceof Element
      ? event.target.closest<HTMLButtonElement>("[data-image-zoom]")
      : null;
    if (trigger) open(trigger);
  };
  const onCancel = (event: Event) => { event.preventDefault(); close(); };
  const onDialogClick = (event: MouseEvent) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
  };
  root.addEventListener("click", onRootClick);
  closeButton.addEventListener("click", close);
  dialog.addEventListener("cancel", onCancel);
  dialog.addEventListener("click", onDialogClick);
  return { destroy: () => {
    if (dialog.open) close();
    root.removeEventListener("click", onRootClick);
    closeButton.removeEventListener("click", close);
    dialog.removeEventListener("cancel", onCancel);
    dialog.removeEventListener("click", onDialogClick);
  } };
}
```

- [ ] **Step 4: Wire existing approved text only**

Add the dialog once in `BaseLayout`. In `ManualReference`, use existing `alt` and `title`. In case/event cover and galleries, reuse current `heroAlt`/`coverAlt`; gallery items compute only the neutral string `` `Registro ${i + 1} de ${entry.data.gallery.length} — ${entry.data.title}` ``. Do not add visual descriptions, people, equipment, client, result or location claims.

- [ ] **Step 5: Add audit rules and editorial inventory note**

Require every zoom trigger to be a button, have non-empty source/alt/title and reference the single dialog. Add a comment in `content.config.ts` that migration from `ImageMetadata[]` to descriptive gallery objects requires technical/editorial review; do not change the schema in this task.

- [ ] **Step 6: Verify GREEN**

Run: `npm run test:ui -- tests/ui/imageZoomDialog.test.ts && npm run build && npm run audit:html && npm run check`

Expected: dialog tests and rendered-HTML audit pass with unchanged editorial alternatives.

- [ ] **Step 7: Commit accessible zoom**

```bash
git add src/components/ImageZoomDialog.astro src/scripts/imageZoomDialog.ts src/layouts/BaseLayout.astro src/components/ManualReference.astro src/pages/cases/[...slug].astro src/pages/eventos/[...slug].astro tests/ui/imageZoomDialog.test.ts scripts/auditEditorialHtml.cjs src/content.config.ts
git commit -m "feat: add accessible image zoom"
```

### Task 8: Validate contextual relations and protect case/event claims

**Files:**
- Modify: `src/data/caseRelations.ts`
- Modify: `src/data/techCatalog.ts`
- Create: `src/utils/contextRelations.ts`
- Modify: `src/pages/tecnologias/[slug].astro`
- Modify: `src/pages/cases/[...slug].astro`
- Create: `scripts/verifyContextRelations.cjs`
- Create: `tests/node/context-relations.test.ts`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: `TECH_LINKS`, `CASE_SOLUTIONS`, technology `relatedTech`, `relatedSolutions`, `relatedGuides`, `relatedCases`, built route inventory.
- Produces: `validateContextRelations(input: ContextRelationInput): string[]`; `assertContextRelations(input): void`; rendered `data-context-relation` markers; `npm run audit:relations` report with counts and failures for missing routes/slugs/cases or duplicate destinations.

- [ ] **Step 1: Write failing registry integrity tests**

Test exported pure functions with fixtures containing an unknown technology slug, missing internal route, duplicate relation and unknown case ID. Assert each produces a precise error containing source registry key and target.

```ts
const errors = validateContextRelations({
  technologySlugs: new Set(["plantpax-5x"]),
  caseIds: new Set(["projeto-moinho"]),
  builtRoutes: new Set(["/tecnologias/plantpax-5x/", "/cases/projeto-moinho/"]),
  relations: [
    { source: "projeto-moinho", target: "/tecnologias/inexistente/", kind: "technology" },
  ],
});
expect(errors).toEqual([
  "projeto-moinho -> /tecnologias/inexistente/: rota interna inexistente",
]);
```

- [ ] **Step 2: Run and verify RED**

Run: `npm run test:node -- tests/node/context-relations.test.ts`

Expected: FAIL because relation verification functions do not exist.

- [ ] **Step 3: Implement structural validation**

Implement `src/utils/contextRelations.ts` as pure validation over supplied registries and ID sets. Call `assertContextRelations()` from the technology `getStaticPaths()` with `new Set(techCatalog.map(({ slug }) => slug))`, and from the case `getStaticPaths()` with the published case IDs. Add markers using the exact serialization ``data-context-relation={`${sourceId}|${targetHref}`}``; for example, `projeto-moinho|/tecnologias/factorytalk-view-se/`. `scripts/verifyContextRelations.cjs` reads `dist/**/*.html`, validates those markers against the built-route set and rejects duplicate `(source,target)` pairs. Do not regex-evaluate TypeScript source. Return exit code 1 only for structural failures.

```ts
export interface ContextRelation {
  source: string;
  target: string;
  kind: "technology" | "solution" | "guide" | "case";
}

export interface ContextRelationInput {
  technologySlugs: ReadonlySet<string>;
  caseIds: ReadonlySet<string>;
  builtRoutes: ReadonlySet<string>;
  relations: readonly ContextRelation[];
}

export function assertContextRelations(input: ContextRelationInput): void {
  const errors = validateContextRelations(input);
  if (errors.length) throw new Error(errors.join("\n"));
}
```

- [ ] **Step 4: Add the audit command and claim boundary**

Add `"audit:relations": "node scripts/verifyContextRelations.cjs"` and include it after `audit:routes` in `audit:editorial`. Document that route validation does not approve the truth of a case/event relation; additions require review evidence in the pull request description.

- [ ] **Step 5: Verify GREEN without adding relations or claims**

Run: `npm run build && npm run test:node -- tests/node/context-relations.test.ts && npm run audit:relations && npm run audit:editorial`

Expected: all current relations resolve and no content text changes.

- [ ] **Step 6: Commit relation validation**

```bash
git add src/data/caseRelations.ts src/data/techCatalog.ts src/utils/contextRelations.ts src/pages/tecnologias/[slug].astro src/pages/cases/[...slug].astro scripts/verifyContextRelations.cjs tests/node/context-relations.test.ts package.json README.md
git commit -m "test: validate contextual content relations"
```

### Task 9: Centralize `seoTitle` composition and locale

**Files:**
- Modify: `src/utils/site.ts:5-15`
- Create: `src/utils/metadata.ts`
- Modify: `src/layouts/BaseLayout.astro:9-143`
- Modify: `src/content.config.ts`
- Modify: `src/pages/blog/[...slug].astro`
- Modify: `src/pages/cases/[...slug].astro`
- Modify: `src/pages/eventos/[...slug].astro`
- Modify: `src/pages/tecnologias/[slug].astro:50-66`
- Create: `tests/ui/metadata.test.ts`
- Modify: `scripts/auditEditorialHtml.cjs`

**Interfaces:**
- Consumes: `{ title?: string; seoTitle?: string }` and `SITE.shortName`.
- Produces: `resolveDocumentTitle(input): string`; `SITE.openGraphLocale = "pt_BR"`; BaseLayout prop `seoTitle?: string` while `title` remains editorial.

- [ ] **Step 1: Write failing metadata tests**

```ts
expect(resolveDocumentTitle({ title: "PlantPAx" })).toBe("PlantPAx | Integra");
expect(resolveDocumentTitle({ title: "PlantPAx", seoTitle: "PlantPAx 5.x: requisitos" }))
  .toBe("PlantPAx 5.x: requisitos | Integra");
expect(resolveDocumentTitle({ title: "Empresa | Integra" })).toBe("Empresa | Integra");
expect(resolveDocumentTitle({})).toBe(SITE.defaultTitle);
```

Also assert `SITE.locale === "pt-BR"` and `SITE.openGraphLocale === "pt_BR"`.

- [ ] **Step 2: Run and verify RED**

Run: `npm run test:ui -- tests/ui/metadata.test.ts`

Expected: FAIL because helper/openGraphLocale do not exist.

- [ ] **Step 3: Implement and wire the central metadata contract**

Use `lang={SITE.locale}`, `og:locale={SITE.openGraphLocale}` and `resolveDocumentTitle`. Add `seoTitle: z.string().min(1).max(65).optional()` to blog/case/event schemas. Templates pass both fields separately. Technology template changes from `title={item.seoTitle ?? item.title}` to `title={item.title} seoTitle={item.seoTitle}`.

```ts
export interface DocumentTitleInput { title?: string; seoTitle?: string }

export function resolveDocumentTitle({ title, seoTitle }: DocumentTitleInput): string {
  const base = (seoTitle ?? title)?.trim();
  if (!base) return SITE.defaultTitle;
  return base.endsWith(` | ${SITE.shortName}`)
    ? base
    : `${base} | ${SITE.shortName}`;
}
```

- [ ] **Step 4: Extend the HTML audit**

Assert one non-empty `<html lang="pt-BR">`, one `og:locale="pt_BR"`, no `| Integra | Integra`, and H1 text independent from a differing SEO title fixture.

- [ ] **Step 5: Verify GREEN**

Run: `npm run test:ui -- tests/ui/metadata.test.ts && npm run build && npm run audit:html && npm run check`

Expected: metadata tests, render audit and type-check pass with unchanged visible H1s.

- [ ] **Step 6: Commit metadata centralization**

```bash
git add src/utils/site.ts src/utils/metadata.ts src/layouts/BaseLayout.astro src/content.config.ts src/pages/blog/[...slug].astro src/pages/cases/[...slug].astro src/pages/eventos/[...slug].astro src/pages/tecnologias/[slug].astro tests/ui/metadata.test.ts scripts/auditEditorialHtml.cjs
git commit -m "refactor: centralize locale and SEO titles"
```

### Task 10: Generate and validate `llms.txt` from one canonical source

**Files:**
- Create: `src/data/llmsContent.mjs`
- Create: `scripts/generateLlmsTxt.mjs`
- Create: `scripts/verifyLlmsTxt.mjs`
- Create: `tests/node/llms-txt.test.ts`
- Modify: `public/llms.txt`
- Modify: `package.json`
- Modify: `README.md:694-705`

**Interfaces:**
- Consumes: `LLMS_CONTENT` with `{ reviewedAt, identity, positioning, groups: { heading, links: { label, path, description? }[] }[] }` and existing `SITE.url` value `https://integrautomacao.com.br`.
- Produces: `renderLlmsTxt(content): string`; `npm run generate:llms`; `npm run audit:llms`; deterministic UTF-8/LF `public/llms.txt`.

- [ ] **Step 1: Write failing generator tests**

Test deterministic final newline, no CRLF, one URL per route, duplicate-path rejection, external-origin rejection, empty-heading rejection, exact rendered snapshot for a two-link fixture, and drift detection between generated text and a supplied file string.

```ts
const rendered = renderLlmsTxt({
  siteUrl: "https://integrautomacao.com.br",
  reviewedAt: "2026-08-02",
  identity: "Integra Automação Industrial",
  positioning: "Engenharia com método e governança técnica.",
  groups: [{ heading: "Páginas principais", links: [
    { label: "Empresa", path: "/empresa/", description: "História e propósito." },
  ] }],
});
expect(rendered).toContain("[Empresa](https://integrautomacao.com.br/empresa/)");
expect(rendered.endsWith("\n")).toBe(true);
expect(rendered).not.toContain("\r");
```

- [ ] **Step 2: Run and verify RED**

Run: `npm run test:node -- tests/node/llms-txt.test.ts`

Expected: FAIL because generator/verifier modules do not exist.

- [ ] **Step 3: Implement canonical data and deterministic renderer**

Transcribe the current `public/llms.txt` claims and links into `LLMS_CONTENT` without rewriting them. `renderLlmsTxt` escapes line breaks in labels/descriptions, rejects invalid data and preserves the current section order. Do not update `reviewedAt` merely because the file became generated.

```js
function cleanInline(value, field) {
  const normalized = String(value).replace(/[\r\n]+/g, " ").trim();
  if (!normalized) throw new Error(`${field} não pode ser vazio`);
  return normalized;
}

function renderGroup(group, siteUrl) {
  const heading = cleanInline(group.heading, "group.heading");
  const links = group.links.map((link) => {
    const url = new URL(link.path, siteUrl);
    if (url.origin !== siteUrl) throw new Error(`origem externa: ${url}`);
    const description = link.description ? `: ${cleanInline(link.description, "link.description")}` : "";
    return `- [${cleanInline(link.label, "link.label")}](${url})${description}`;
  });
  return `## ${heading}\n\n${links.join("\n")}`;
}

export function renderLlmsTxt(content) {
  validateLlmsContent(content);
  const header = `# ${cleanInline(content.identity, "identity")}\n\n${cleanInline(content.positioning, "positioning")}\n\nÚltima atualização: ${content.reviewedAt}.`;
  const groups = content.groups.map((group) => renderGroup(group, content.siteUrl));
  return `${header}\n\n${groups.join("\n\n")}\n`;
}
```

- [ ] **Step 4: Add build-route and drift verification**

`verifyLlmsTxt.mjs` compares bytes to `public/llms.txt`, then checks every internal path against `dist` route files after build. Add `"generate:llms": "node scripts/generateLlmsTxt.mjs"` and `"audit:llms": "node scripts/verifyLlmsTxt.mjs"`; include `audit:llms` in `audit:editorial` after build.

- [ ] **Step 5: Generate and verify GREEN**

Run: `npm run generate:llms && npm run test:node -- tests/node/llms-txt.test.ts && npm run build && npm run audit:llms && npm run check`

Expected: `public/llms.txt` exactly matches generated output, every URL maps to a built route and all tests pass.

- [ ] **Step 6: Commit generated LLM metadata**

```bash
git add src/data/llmsContent.mjs scripts/generateLlmsTxt.mjs scripts/verifyLlmsTxt.mjs tests/node/llms-txt.test.ts public/llms.txt package.json README.md
git commit -m "build: generate llms metadata from canonical content"
```

### Task 11: Repair four 404 references behind an editorial-equivalence gate

**Files:**
- Create: `docs/editorial/reference-link-review-2026-08-20.md`
- Create: `scripts/verifyExternalReferences.mjs`
- Create: `tests/node/external-references.test.ts`
- Modify: `src/data/sourceRegistry.ts:112-176`
- Modify: `src/data/techCatalog.ts:147,379`
- Modify: `package.json`

**Interfaces:**
- Consumes: registered `PublicSourceReference.href` values and a review ledger row `{ label, oldUrl, candidateUrl, automatedStatus, verification, evidence }`.
- Produces: `classifyExternalResult({ status, error }): "ok" | "broken" | "manual"`; `npm run audit:external-references`; four evidence-backed replacements only.

- [ ] **Step 1: Write failing status-classification tests**

Assert 200/206/301/302 are `ok`; reproducible 404/410 are `broken`; 403/429/timeout/`ECONNRESET`/TLS failure are `manual`. Assert `manual` never causes the verifier to suggest removal and never exits non-zero by itself.

```ts
expect(classifyExternalResult({ status: 206 })).toBe("ok");
expect(classifyExternalResult({ status: 404, attempts: 2 })).toBe("broken");
expect(classifyExternalResult({ status: 403 })).toBe("manual");
expect(classifyExternalResult({ error: "ECONNRESET" })).toBe("manual");
expect(exitCodeFor([{ classification: "manual" }])).toBe(0);
```

- [ ] **Step 2: Run and verify RED**

Run: `npm run test:node -- tests/node/external-references.test.ts`

Expected: FAIL because the external-reference verifier does not exist.

- [ ] **Step 3: Create the evidence ledger with the four exact comparisons**

Record the current 404 and candidates from the spec. Run these exact candidate checks:

```powershell
curl.exe -L -sS -o NUL --connect-timeout 8 --max-time 20 -w "%{http_code}|%{url_effective}|%{errormsg}" --range "0-0" "https://www.rockwellautomation.com/en-us/products/software/factorytalk/datamosaix.html"
curl.exe -L -sS -o NUL --connect-timeout 8 --max-time 20 -w "%{http_code}|%{url_effective}|%{errormsg}" --range "0-0" "https://literature.rockwellautomation.com/idc/groups/literature/documents/sg/1756-sg002_-en-p.pdf"
curl.exe -L -sS -o NUL --connect-timeout 8 --max-time 20 -w "%{http_code}|%{url_effective}|%{errormsg}" --range "0-0" "https://www.rockwellautomation.com/en-us/support/documentation/technical/capabilities/optix-portfolio.html"
curl.exe -L -sS -o NUL --connect-timeout 8 --max-time 20 -w "%{http_code}|%{url_effective}|%{errormsg}" --range "0-0" "https://www.telit.com/iot-platforms-overview/"
```

Then manually compare official page title, product/publication identity and the local `source`/`caption`/image. For `1756-SG002`, open the PDF and verify the local ControlLogix/GuardLogix/ArmorControlLogix figure before approving the SG020-to-SG002 label correction. The ledger must contain a final `approved` or `rejected` decision; rejected candidates leave source code unchanged and fail this task's completion gate.

- [ ] **Step 4: Apply only the four approved replacements**

Use these candidates:

```text
https://www.rockwellautomation.com/en-us/products/software/factorytalk/datamosaix.html
https://literature.rockwellautomation.com/idc/groups/literature/documents/sg/1756-sg002_-en-p.pdf
https://www.rockwellautomation.com/en-us/support/documentation/technical/capabilities/optix-portfolio.html
https://www.telit.com/iot-platforms-overview/
```

For the ControlLogix entry, update the source constant and caption from `1756-SG020-EN-P` to `1756-SG002-EN-P` only when the ledger confirms figure equivalence. Keep DataMosaix, Optix and Telit links qualified as `related(...)`, not `cited(...)`.

- [ ] **Step 5: Implement the conservative verifier**

Issue two ranged GET attempts only for 404/410 confirmation. Report `manual` for Siemens 403 responses and all reset/timeout/TLS cases; never rewrite URLs. Add `"audit:external-references": "node scripts/verifyExternalReferences.mjs"` as a separately invoked network audit, not part of offline `audit:editorial`.

```js
export function classifyExternalResult({ status, error, attempts = 1 }) {
  if (error) return "manual";
  if ([403, 429].includes(status)) return "manual";
  if ([404, 410].includes(status)) return attempts >= 2 ? "broken" : "manual";
  if (status >= 200 && status < 400) return "ok";
  return "manual";
}
```

- [ ] **Step 6: Verify GREEN and manual preservation**

Run: `npm run test:node -- tests/node/external-references.test.ts && npm run audit:external-references && npm run build && npm run audit:html && npm run check`

Expected: four repaired URLs return 200/206; Siemens responses remain listed as `manual` if they still return 403; resets/timeouts remain `manual`; build and HTML audit pass.

- [ ] **Step 7: Commit reference repairs and evidence**

```bash
git add docs/editorial/reference-link-review-2026-08-20.md scripts/verifyExternalReferences.mjs tests/node/external-references.test.ts src/data/sourceRegistry.ts src/data/techCatalog.ts package.json
git commit -m "fix: repair verified editorial references"
```

### Task 12: Run the complete UX/editorial release gate

**Files:**
- Modify: `README.md`
- Modify: `SEO_ROADMAP.md`

**Interfaces:**
- Consumes: all tasks above.
- Produces: one documented release gate; no sitemap/canonical implementation and no unverified editorial claim.

- [ ] **Step 1: Run all automated checks from a clean process**

Run:

```powershell
npm run test:ui
npm test
npm run check
npm run audit:editorial
npm run audit:llms
npm run audit:relations
npm run audit:deps
```

Expected: every command exits 0; `audit:editorial` rebuilds `dist` and Pagefind before rendered checks. If `audit:deps` is non-zero, record `BLOCKED_BY_DEPENDENCY_ADVISORIES` with exact paths and do not claim release readiness or continue to deployment.

- [ ] **Step 2: Run the network audit separately**

Run: `npm run audit:external-references`

Expected: repaired references are available; 403/reset/timeout are reported as manual/inconclusive without being rewritten or counted as a software failure.

- [ ] **Step 3: Smoke-test production-like UI**

Run: `npm run pages:dev`

At `http://localhost:8788`, verify at widths 390, 1024, 1439 and 1440 px: menu open/close/focus/scroll/breakpoint; both form summaries and field links; search filters/counts/load-more; ToC anchors/back-forward; image zoom close paths/focus return. Verify no console errors. Stop with `Ctrl+C`.

- [ ] **Step 4: Run accessibility spot checks**

Keyboard-only traverse Header, Contact, Newsletter, Search, one sector ToC, one technology ToC, one long-guide ToC, one ManualReference, one case gallery and one event gallery. Confirm visible focus, logical order, meaningful control names, no keyboard trap outside active overlays and exact focus return.

- [ ] **Step 5: Review the content diff for claims**

Run:

```powershell
git diff --word-diff=porcelain -- src/content src/pages/cases src/pages/eventos src/data/techCatalog.ts src/data/caseRelations.ts src/data/llmsContent.mjs public/llms.txt
```

Expected: ToC/ID wiring, approved source-code correction and generated-format changes only. Any new performance, customer, equipment, event, credential, visual-description or relationship claim blocks completion until evidence is recorded.

- [ ] **Step 6: Confirm platform-plan boundary**

Run:

```powershell
git diff -- astro.config.mjs public/_redirects functions/_middleware.ts src/layouts/BaseLayout.astro
```

Expected: no UX-plan changes to sitemap filter or redirect/canonicalization rules. BaseLayout preserves Platform Integrity's `canonical?: string | URL | false` and conditional canonical/`og:url`; this plan adds only locale, SEO-title separation, Pagefind section metadata and the shared image dialog.

- [ ] **Step 7: Update operational documentation and commit the gate**

Document new scripts, Pagefind filter behavior, ToC ID immutability, overlay behavior, `llms.txt` generation and manual external-link statuses. Mark only completed roadmap items.

```bash
git add README.md SEO_ROADMAP.md
git commit -m "docs: record UX and editorial release gates"
```

- [ ] **Step 8: Final clean verification**

Run: `git status --short && npm run test:ui && npm test && npm run check && npm run audit:editorial`

Expected: only intentionally uncommitted files, if any, are listed; all checks exit 0. Report manual external-reference outcomes separately and do not describe them as automated passes.
