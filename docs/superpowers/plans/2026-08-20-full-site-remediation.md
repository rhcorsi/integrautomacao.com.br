# Full-Site Remediation Orchestration Plan

> **Execution mode:** Superpowers subagent-driven development, one implementation task at a time, test-first, with controller review after every task. The three detailed plans remain authoritative for task-level steps.

**Goal:** Resolve the approved design, SEO, architecture, editorial, accessibility, Cloudflare, CI/CD, dependency, and newsletter-consent findings without losing traceability or conflating local proof with preview/production proof.

**Detailed plans:**

- `docs/superpowers/plans/2026-08-20-platform-integrity.md`
- `docs/superpowers/plans/2026-08-20-newsletter-consent.md`
- `docs/superpowers/plans/2026-08-20-ux-seo-editorial.md`

## Controller invariants

- Work only in `D:\ClaudeCode\integrautomacao.com.br\.worktrees\resolve-all-audit` on `codex/resolve-all-audit`.
- Do not edit the original checkout.
- Do not commit until the user explicitly authorizes local commits for this remediation. Until then, each task is reviewed by its explicit file list and pre/post diff evidence.
- Never push, open or merge a PR, deploy Pages, apply a production migration, change Cloudflare production settings, enable rate limiting, disable Git auto-deploy, or send a Broadcast without a separate explicit external-production authorization.
- The user authorized creating the named preview and production D1 databases and configuring their bindings. They now exist in the intended account: preview `987465e5-0637-4d68-b2df-f5691b066a6c`, production `ba88ce95-3964-42ae-9a6d-371eb6f3b17e`; both use the `Eastern North America` (`enam`) location hint and have read replication disabled. Use only these verified UUIDs. Schema migration, binding configuration, preview deployment, and production cutover remain separate steps under their stated gates.
- Rate-limit candidates are repository-defined but disabled. Enabling blocking requires a later traffic/false-positive review and explicit approval.
- Production remains blocked while `npm audit --audit-level=high` is non-zero, required Cloudflare/Resend secrets are absent, D1 IDs/migrations are incomplete, or any validation gate fails.
- Every feature/fix begins with a focused failing test, observes the expected RED cause, implements the minimum repair, observes GREEN, then runs proportional regression.
- Preserve user changes and stage only explicit paths if commit authorization arrives.

## Shared-file ownership and conflict rulings

| Surface | First owner | Later consumer | Ruling |
| --- | --- | --- | --- |
| `package.json`, lockfile, `.nvmrc` | Platform Task 2 | all plans | Pin Node `22.23.2` and reviewed dependencies before later tasks add scripts/dev test support. |
| `astro.config.mjs`, `BaseLayout.astro` | Platform Task 1 | UX Tasks 4/9; newsletter Task 6 | SEO policy lands first; later tasks extend it without replacing canonical/noindex logic. |
| `wrangler.jsonc`, generated Worker types | Newsletter Task 1, after Platform Task 2 | Platform Tasks 3/6 | Real D1 UUIDs only; environment policy validates the resulting binding contract. |
| `.env.example`, `.dev.vars.example`, `functions/_shared/env.ts` | Newsletter Tasks 1/3/7 | Platform Task 3 | Newsletter establishes separate contact, transactional-send and Contacts credentials plus environment-specific confirmation origin; platform then makes drift executable policy. No legacy or cross-purpose fallback. |
| `README.md` | Newsletter Task 7 | Platform Task 7 | Newsletter writes consent/migration gates; platform appends deployment/runbook controls and preserves them. |
| `src/components/NewsletterForm.astro` | Newsletter Task 6 | UX Task 3 | Double-opt-in copy lands first; UX later adds accessible validation without changing neutral response semantics. |
| sitemap/noindex policy | Platform Task 1 | Newsletter Task 6 and final gates | Exclude 404, search, webinar, confirmation utility, `/api/*`, and every rendered `noindex` URL. Webinar and confirmation use `noindex,nofollow`. |
| Cloudflare mutations | Controller only | production cutover | D1 creation is the only already-authorized external mutation. All other mutations remain behind a new gate. |

## Ordered task ledger

### Phase A — Foundational integrity

1. Platform Task 1 — sitemap, rendered-noindex, canonical, 404, webinar policy.
2. Platform Task 2 — Node `22.23.2`, reviewed dependencies, lock determinism, dependency advisory gate.

### Phase B — D1-authoritative newsletter

3. Newsletter Task 1 — D1 binding/schema/test harness; local work may use a local D1 while remote UUIDs remain blocked.
4. Newsletter Task 2 — cryptography, pending store, append-only ledger, 30-day bounded pseudonymization.
5. Newsletter Task 3 — transactional confirmation email and neutral initial endpoint.
6. Newsletter Task 4 — atomic explicit confirmation API and replay/race safety.
7. Newsletter Task 5 — Resend forward reconciliation and Broadcast view gate.
8. Newsletter Task 6 — testable fragment controller, `noindex,nofollow` confirmation page, form copy.
9. Newsletter Task 7 — privacy, location limitation, retention and operations documentation.
10. Platform Task 3 — executable environment contract against the completed newsletter bindings.

### Phase C — UX, accessibility, search, SEO and editorial

11. UX Tasks 1–3 — DOM test lane, overlay lock, mobile navigation and form errors.
12. UX Tasks 4–5 — route families, active navigation, Pagefind filters/counts/load-more/boilerplate exclusions.
13. UX Tasks 6–7 — stable editorial ToCs and accessible image dialog.
14. UX Tasks 8–11 — contextual relations, claims gate, SEO title/locale, generated `llms.txt`, source repair gate.

### Phase D — delivery architecture

15. Platform Task 4 — static-first Functions routing and single-owner cache headers.
16. Platform Task 5 — deterministic artifact manifest and tamper verification.
17. Platform Task 6 — one SHA-pinned CI/deploy workflow, production disabled by default, plus a daily bounded pending-retention probe whose non-zero remainder fails the privacy gate.
18. Platform Task 7 — fail-closed desired-state tooling and runbook, no external mutation.

### Phase E — verification and external gates

19. Platform Task 8 — complete local release gate.
20. Newsletter Task 8 local portion — full regression and local D1 evidence.
21. UX Task 12 — full UX/editorial release gate, browser viewport/keyboard/manual review.
22. Codex Security validation/rescan — prove all four original findings no longer reproduce and produce `fix_report.md`.
23. Independent final code review — inspect the cumulative diff, tests, security boundaries, and unresolved external dependencies.
24. Remote preview acceptance — only after D1 creation/bindings and required preview secrets are available; migrate preview, deploy preview, execute controlled mailbox flow, and record redacted evidence.
25. Production cutover — Platform Task 9 and production D1 migration remain `BLOCKED_BY_EXTERNAL_PRODUCTION_GATE` until a new explicit approval names the exact commit/window/actions.

## Task review protocol

For each numbered item:

1. Write a scoped task brief naming plan section, allowed files, RED command, GREEN/regression commands, forbidden actions, and report path.
2. Dispatch exactly one implementer; the implementer may not spawn subagents.
3. Controller confirms the expected failing test before accepting production code.
4. Implementer writes a report with files, test output, risks and deviations.
5. Controller creates a review package containing the brief, report and explicit-path diff.
6. Dispatch a reviewer. Any substantive finding resumes the same implementer for correction and another review round.
7. Update the progress ledger with command outcomes and external blockers.

## Completion contract

Local completion requires fresh evidence for clean install, type generation/check,
Astro check, all Vitest lanes, production build, route/redirect/prose/UTF-8/editorial/
SEO/environment/deployment/dependency audits, artifact tamper tests, and a full
Codex Security validation pass. Preview and production claims are separate. A
local pass cannot be reported as D1 remote migration, mailbox delivery, Resend
reconciliation, Cloudflare cutover, or production success.
