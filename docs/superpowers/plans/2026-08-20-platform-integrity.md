# Platform Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one deterministic, policy-checked path from an exact `main` commit to a SHA-256-manifested Cloudflare Pages production deployment, while correcting SEO, routing, cache, environment, and dependency drift.

**Architecture:** Repository policy is executable: shared SEO/environment/deploy-policy modules are tested with Vitest, the build is produced once and carried through a verified artifact, and Pages Functions run only for `/api/*`. Cloudflare changes are represented as non-secret desired state and remain read-only until explicit production gates; Git automatic deployment is disabled only after Actions proves the exact artifact in production.

**Tech Stack:** Astro 7.2.4, TypeScript, Node.js 22.23.2, npm lockfile v3, Vitest with Cloudflare Workers pool, Cloudflare Pages/Functions/Wrangler, GitHub Actions, JSON/Markdown operational policy.

**Spec:** `docs/superpowers/specs/2026-08-20-platform-integrity-design.md`

**Cross-plan order:** `docs/superpowers/plans/2026-08-20-full-site-remediation.md` is authoritative when this plan shares files with Newsletter or UX. In particular: Platform Tasks 1–2 first; Newsletter storage/environment work next; Platform Task 3 after newsletter bindings; content/UI tasks after that; Platform Task 6 workflow replacement last among shared delivery surfaces.

## Global Constraints

- Read the spec completely before executing any task.
- Node is exactly `22.23.2` in local, npm, GitHub Actions, Wrangler, examples, and documentation contracts.
- Do not run `npm audit fix`, `npm audit fix --force`, or accept an unreviewed major dependency update.
- The only approved dependency targets are listed in Task 2; held major/compatibility updates stay held.
- Production deployment is only exact `refs/heads/main`, with no user-supplied branch input.
- Build `dist/` once in `verify`; deploy only the downloaded artifact whose manifest matches `${{ github.sha }}`.
- Every GitHub Action reference is a 40-character commit SHA with its reviewed major tag in a comment.
- Default GitHub permissions are `contents: read`; add no write permission unless a demonstrated step requires it.
- The deploy job uses GitHub environment `production` and repository variable `CLOUDFLARE_ACTIONS_DEPLOY_ENABLED`.
- Pages routing is static-first: Functions include exactly `/api/*`; static path redirects remain in `public/_redirects`.
- `immutable` is allowed only for fingerprinted `/_astro/*` assets.
- Static headers are owned by `public/_headers`; API headers are owned by `functions/_middleware.ts`; do not duplicate API policy in `_headers`.
- Secret values are read from environment/approved vaults only; never commit, echo, include in CLI arguments, manifests, artifacts, reports, or screenshots.
- Cloudflare `validate` is offline and `plan` is GET-only. Do not run `apply` or change a dashboard until Task 9's external gate is explicitly approved.
- Disabling Cloudflare Git automatic deploy is the final cutover action after Actions proof, never a preparatory action.
- Every implementation task follows red-green-refactor: write the focused failing test, observe the expected failure, make the smallest implementation, and rerun focused plus related tests.
- Commit steps below belong to the future implementation. They do not authorize commits while merely authoring/reviewing this plan.

---

## File map

### Create

- `src/utils/seo-policy.ts` — normalized sitemap and canonical decision functions.
- `scripts/verifySeoOutput.mjs` — built-output SEO audit.
- `tests/node/seo-policy.test.ts` — SEO unit and artifact tests.
- `config/environment-contract.json` — exact non-secret build/runtime binding inventory.
- `scripts/verifyEnvironmentContract.mjs` — environment/Node drift checker.
- `tests/node/environment-contract.test.ts` — environment-contract fixtures and drift tests.
- `scripts/verifyDeploymentPolicy.mjs` — routing/header/workflow/deploy policy checker.
- `tests/node/deployment-policy.test.ts` — policy parser tests.
- `scripts/artifactManifest.mjs` — deterministic SHA-256 manifest create/verify CLI.
- `tests/node/artifact-manifest.test.ts` — manifest determinism and tamper tests.
- `.github/workflows/platform.yml` — the only CI and production deploy workflow.
- `ops/cloudflare/production-desired-state.json` — non-secret desired state for redirects, TLS, WAF, cache, logs, and build controls.
- `scripts/cloudflareChange.mjs` — offline validation, GET-only plan, and gated apply entry point.
- `tests/node/cloudflare-change.test.ts` — fail-closed operator and redaction tests.
- `docs/operations/cloudflare-platform-cutover.md` — exact preparation, cutover, proof, and rollback runbook.

### Modify

- `astro.config.mjs` — consume `shouldIncludeInSitemap`.
- `src/layouts/BaseLayout.astro` — support `canonical={false}` and omit canonical/`og:url` together.
- `src/pages/404.astro` — explicitly disable canonical metadata.
- `package.json` — exact Node, dependency targets, and audit commands.
- `package-lock.json` — lock only the approved dependency changes.
- `.env.example` — exact Node and correct split Resend variables.
- `.dev.vars.example` — remain runtime-secret-only and match the contract.
- `wrangler.jsonc` — upgrade and remain aligned at Node 22.23.2.
- `functions/_shared/env.ts` — remain the typed runtime binding source.
- `public/_routes.json` — include only `/api/*`.
- `functions/_middleware.ts` — API hardening only.
- `tests/middleware.test.ts` — remove public-routing expectations; preserve API response tests.
- `public/_headers` — immutable only for `/_astro/*`; remove API and duplicated platform-owned headers.
- `README.md` — one Actions deploy path, exact Node/env contract, and external-gate boundary.
- `.github/dependabot.yml` — document SHA-pin review behavior for Actions updates.
- `.github/PULL_REQUEST_TEMPLATE.md` — list the complete local release gate.
- `.gitignore` — exclude generated Cloudflare evidence JSON from accidental commits.

### Delete

- `.github/workflows/ci.yml` — superseded by `platform.yml`.
- `.github/workflows/deploy.yml` — removes the independent rebuild and free branch input.

---

### Task 1: Enforce sitemap and 404 metadata policy

**Files:**

- Create: `src/utils/seo-policy.ts`
- Create: `scripts/verifySeoOutput.mjs`
- Create: `tests/node/seo-policy.test.ts`
- Create: `vitest.node.config.ts`
- Modify: `vitest.config.ts`
- Create: `scripts/editorialMetadataPolicy.cjs`
- Create: `tests/node/editorial-metadata-policy.test.ts`
- Modify: `scripts/auditEditorialHtml.cjs`
- Modify: `astro.config.mjs`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/pages/404.astro`
- Modify: `src/pages/integra-acao/webinar.astro`
- Modify: `package.json`

**Interfaces:**

- Produces: `normalizeSeoPath(input: string | URL): string`.
- Produces: `shouldIncludeInSitemap(page: string): boolean`.
- Produces: `resolveCanonicalUrl(canonical: string | URL | false | undefined, pathname: string, site: string): URL | null`.
- Produces: `inspectSeoOutput(distDir: string): Promise<string[]>`.
- Produces: `BaseLayout` robots policy where `noindex` defaults to `follow` and explicit `nofollow={true}` is reserved for utility/placeholders.
- Consumes: `SITE.url`, `Astro.url.pathname`, and every generated `dist/**/*.html`/`dist/sitemap-*.xml`.

- [ ] **Step 1: Write the failing SEO policy tests**

Create `tests/node/seo-policy.test.ts` with focused cases. The existing
Cloudflare pool cannot host filesystem/temp-directory tests, so create
`vitest.node.config.ts` for `tests/node/**/*.test.ts`, exclude that directory
from `vitest.config.ts`, and add `test:workers`, `test:node`, and aggregate
sequential `test` scripts without moving existing Workers tests:

```ts
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveCanonicalUrl,
  shouldIncludeInSitemap,
} from "../../src/utils/seo-policy";
import { inspectSeoOutput } from "../../scripts/verifySeoOutput.mjs";

describe("SEO policy", () => {
  it.each([
    "/404", "/404/", "/busca", "/busca/",
    "/integra-acao/webinar", "/integra-acao/webinar/",
    "/integra-acao/newsletter/confirmar", "/integra-acao/newsletter/confirmar/",
    "/api/contact",
  ])(
    "excludes %s from the sitemap",
    (path) => expect(shouldIncludeInSitemap(`https://integrautomacao.com.br${path}`)).toBe(false),
  );

  it("keeps indexable pages and supports an explicit absent canonical", () => {
    expect(shouldIncludeInSitemap("https://integrautomacao.com.br/empresa/")).toBe(true);
    expect(resolveCanonicalUrl(false, "/404", "https://integrautomacao.com.br")).toBeNull();
    expect(resolveCanonicalUrl(undefined, "/empresa/", "https://integrautomacao.com.br")?.href)
      .toBe("https://integrautomacao.com.br/empresa/");
  });

  it("reports contradictory rendered noindex and sitemap output", async () => {
    const dist = await mkdtemp(join(tmpdir(), "seo-policy-"));
    await mkdir(join(dist, "integra-acao", "webinar"), { recursive: true });
    await writeFile(join(dist, "404.html"), '<meta name="robots" content="noindex,follow"><link rel="canonical" href="/404">');
    await writeFile(join(dist, "integra-acao", "webinar", "index.html"), '<meta name="robots" content="noindex,nofollow">');
    await writeFile(join(dist, "sitemap-0.xml"), [
      "<loc>https://integrautomacao.com.br/404/</loc>",
      "<loc>https://integrautomacao.com.br/integra-acao/webinar/</loc>",
    ].join(""));
    expect(await inspectSeoOutput(dist)).toEqual(expect.arrayContaining([
      "404.html: canonical must be absent",
      "sitemap-0.xml: contains noindex URL https://integrautomacao.com.br/404/",
      "sitemap-0.xml: contains noindex URL https://integrautomacao.com.br/integra-acao/webinar/",
    ]));
  });
});
```

- [ ] **Step 2: Run the focused test and verify the expected import failure**

Run: `npm run test:node -- tests/node/seo-policy.test.ts`

Expected: FAIL because `src/utils/seo-policy.ts` and `scripts/verifySeoOutput.mjs` do not exist.

- [ ] **Step 3: Implement the shared SEO policy and artifact inspector**

Implement exactly the four interfaces. Normalize only duplicate trailing slashes; reject `/api/` by prefix and the exact noindex set. The artifact inspector derives a URL for every rendered HTML file and cross-checks every page marked `noindex` against every sitemap, so unknown future noindex pages fail closed. In `BaseLayout.astro`, change the prop to `canonical?: string | URL | false`, add `nofollow?: boolean = false`, render `noindex,follow` by default for noindex pages and `noindex,nofollow` only when explicitly requested, calculate the canonical with `resolveCanonicalUrl`, and conditionally render both canonical and `og:url`:

```astro
{canonicalURL && <link rel="canonical" href={canonicalURL.toString()} />}
{canonicalURL && <meta property="og:url" content={canonicalURL.toString()} />}
```

Pass `canonical={false}` from `src/pages/404.astro`. Keep search and 404 as `noindex,follow`; pass `nofollow={true}` on webinar and on the later newsletter confirmation utility. Extract a tiny testable `editorialMetadataPolicy.cjs` consumed by the legacy rendered-HTML auditor so `/404.html` forbids canonical/`og:url` while ordinary routes still require exactly one; do not leave contradictory audit rules. Import `shouldIncludeInSitemap` in `astro.config.mjs` and use `filter: shouldIncludeInSitemap`. Add:

```json
"audit:seo": "node scripts/verifySeoOutput.mjs dist"
```

The CLI prints `SEO output policy: PASS` on an empty violation list and exits `1` otherwise.

- [ ] **Step 4: Run focused and build-output tests**

Run:

```powershell
npm run test:node -- tests/node/seo-policy.test.ts
npm run build
npm run audit:seo
npm run audit:html
npm run audit:editorial
```

Expected: all commands exit `0`; `dist/404.html` contains `noindex` but neither canonical nor `og:url`; webinar contains `noindex,nofollow`; generated sitemaps contain no excluded or rendered noindex route. After the newsletter confirmation page exists, rerun this same gate and require its `noindex,nofollow` output to remain absent from the sitemap.

- [ ] **Step 5: Commit the SEO contract**

```powershell
git add src/utils/seo-policy.ts scripts/verifySeoOutput.mjs tests/node/seo-policy.test.ts vitest.node.config.ts vitest.config.ts astro.config.mjs src/layouts/BaseLayout.astro src/pages/404.astro src/pages/integra-acao/webinar.astro package.json
git commit -m "fix: align sitemap and 404 metadata policy"
```

---

### Task 2: Pin Node and apply only reviewed dependency updates

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `.nvmrc`
- Modify: `wrangler.jsonc`
- Modify (generated): `functions/types.d.ts`
- Modify: `tests/helpers.ts` exact `NODE_VERSION` fixtures only

**Interfaces:**

- Produces: exact Node contract `22.23.2` for Task 3 and the workflow.
- Produces: lockfile containing the reviewed direct target set.
- Consumes: npm registry metadata captured on 2026-08-20 and the current test/build suite.

- [ ] **Step 1: Add an exact Node assertion before changing package metadata**

Run this assertion and record the expected current failure caused by `engines.node` being broad:

```powershell
node -e "const p=require('./package.json'); if(p.engines.node!=='22.23.2') { console.error('expected package engines.node=22.23.2'); process.exit(1) }"
```

Expected: exit `1` with `expected package engines.node=22.23.2`.

- [ ] **Step 2: Pin Node everywhere**

Set `.nvmrc`, `package.json` `engines.node`, `.env.example` `NODE_VERSION`, and `wrangler.jsonc` `vars.NODE_VERSION` to `22.23.2`. Replace README references that say only `22` or `22.12.0` with `22.23.2`, including prerequisites, environment inventory, Cloudflare build values, and troubleshooting.

- [ ] **Step 3: Install the reviewed dependency targets by exact command**

Run:

```powershell
npm install @astrojs/mdx@7.0.7 @iconify-json/lucide@1.2.124 astro@7.2.4 astro-icon@1.2.0 --save-exact
npm install @cloudflare/vitest-pool-workers@0.20.3 @cloudflare/workers-types@5.20260820.1 vitest@4.1.11 wrangler@4.125.0 --save-dev --save-exact
```

The two commands preserve the existing dependency classification: runtime packages remain under `dependencies`; `@cloudflare/vitest-pool-workers`, `@cloudflare/workers-types`, `vitest`, and `wrangler` remain under `devDependencies`. Keep `@emnapi/wasi-threads` and TypeScript at their reviewed holds.

Add exact npm overrides in `package.json`:

```json
"overrides": {
  "fast-uri": "3.1.5",
  "js-yaml": "4.3.1",
  "nanoid": "3.3.18",
  "postcss": "8.5.23"
}
```

Regenerate the lock only through the exact install commands under Node
`22.23.2`; never hand-edit lockfile dependency nodes.

Add the named dependency CI gate:

```json
"audit:deps": "npm audit --audit-level=high"
```

- [ ] **Step 4: Verify lockfile scope and dependency policy**

Run:

```powershell
npm ls --depth=0
npm outdated --json
npm run audit:deps
npm audit
git diff -- package.json package-lock.json
```

Expected: approved packages and overrides have the exact targets;
`@cloudflare/vitest-pool-workers` is `0.20.3`; held packages remain
`@emnapi/wasi-threads@1.2.2` and installed TypeScript `5.9.3`; no unrelated
direct dependency changed. `npm outdated` may exit `1` for documented holds and
because pool `0.20.3` intentionally precedes `0.22.0`. Both
`npm run audit:deps` and full `npm audit` must exit `0`; if either does not,
record the exact paths as `BLOCKED_BY_DEPENDENCY_ADVISORIES`, make only another
evidence-backed compatible version decision, rerun the full suite, and do not
continue to any deployment gate while non-zero.

- [ ] **Step 5: Prove clean-install determinism and compatibility**

Run:

```powershell
npm ci
npm run check
npm run types:generate
npm run types:check
npm test
npm run audit:editorial
git diff --exit-code -- package-lock.json
```

Expected: every command exits `0`; clean install does not rewrite the lockfile.

- [ ] **Step 6: Commit runtime and dependency alignment**

```powershell
git add package.json package-lock.json .nvmrc wrangler.jsonc .env.example README.md
git commit -m "build: pin runtime and reviewed dependencies"
```

---

### Task 3: Make environment drift executable policy

**Files:**

- Create: `config/environment-contract.json`
- Create: `scripts/verifyEnvironmentContract.mjs`
- Create: `tests/node/environment-contract.test.ts`
- Modify: `.env.example`
- Modify: `.dev.vars.example`
- Verify: `functions/_shared/env.ts`
- Verify: `wrangler.jsonc`

**Interfaces:**

- Produces: `verifyEnvironmentContract(rootDir: string): Promise<string[]>`.
- Produces: npm command `audit:env`.
- Consumes: exact variable arrays in `config/environment-contract.json`.

- [ ] **Step 1: Write failing fixture-driven drift tests**

Create fixture directories inside each test's temporary directory and test these exact failures:

```ts
expect(await verifyEnvironmentContract(root)).toContain(
  ".env.example: obsolete variable RESEND_API_KEY",
);
expect(await verifyEnvironmentContract(root)).toContain(
  ".env.example: NODE_VERSION must equal 22.23.2",
);
expect(await verifyEnvironmentContract(root)).toContain(
  "wrangler.jsonc: runtime secret RESEND_SEND_API_KEY must not be committed",
);
```

Also create a complete fixture matching the design contract and assert `[]`.

- [ ] **Step 2: Run the focused tests and observe the missing-module failure**

Run: `npm run test:node -- tests/node/environment-contract.test.ts`

Expected: FAIL because the verifier and contract do not exist.

- [ ] **Step 3: Implement contract parsing and exact comparisons**

Create the JSON exactly as specified in the design. Parse dotenv examples by non-comment key, Wrangler as JSONC after removing comments with a deterministic local parser, `functions/_shared/env.ts` by declared binding names, and workflow text by referenced variable names. Return sorted, path-prefixed violations. Never inspect actual `.env` or `.dev.vars` files.

Correct `.env.example`: replace `RESEND_API_KEY` with separate empty
`RESEND_SEND_API_KEY`, `RESEND_TRANSACTIONAL_API_KEY`, and
`RESEND_CONTACTS_API_KEY`; add `NEWSLETTER_CONFIRMATION_ORIGIN`; keep exact Node
`22.23.2`. Keep `.dev.vars.example` runtime-only, with the resulting runtime
names and no build variables. Add:

```json
"audit:env": "node scripts/verifyEnvironmentContract.mjs ."
```

- [ ] **Step 4: Verify the contract against the repository**

Run:

```powershell
npm run test:node -- tests/node/environment-contract.test.ts
npm run audit:env
rg -n "RESEND_API_KEY|NODE_VERSION=22$|NODE_VERSION\s+=\s+22$" .env.example .dev.vars.example README.md wrangler.jsonc functions .github
```

Expected: focused tests and audit pass; the ripgrep command returns no obsolete/generic values.

- [ ] **Step 5: Commit environment governance**

```powershell
git add config/environment-contract.json scripts/verifyEnvironmentContract.mjs tests/node/environment-contract.test.ts .env.example .dev.vars.example package.json functions/_shared/env.ts wrangler.jsonc
git commit -m "build: enforce environment contract"
```

---

### Task 4: Move to static-first routing and single-owner cache headers

**Files:**

- Create: `scripts/verifyDeploymentPolicy.mjs`
- Create: `tests/node/deployment-policy.test.ts`
- Modify: `public/_routes.json`
- Modify: `functions/_middleware.ts`
- Modify: `tests/middleware.test.ts`
- Modify: `public/_headers`
- Modify: `package.json`
- Preserve: `public/_redirects`
- Preserve: `shared/legacy-redirects.ts` until external redirect equivalence is proven

**Interfaces:**

- Produces: `verifyDeploymentPolicy(rootDir: string): Promise<string[]>`.
- Produces: npm command `audit:deploy-policy`.
- Consumes: route JSON, header blocks, workflow YAML text, Node/env policy.

- [ ] **Step 1: Write failing route/header policy tests**

Create temporary fixtures and assert the exact behavior:

```ts
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

async function writeFixture(root: string, relativePath: string, content: string) {
  const target = join(root, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

async function createPolicyFixture() {
  const root = await mkdtemp(join(tmpdir(), "deploy-policy-"));
  await writeFixture(root, "public/_routes.json", '{"version":1,"include":["/api/*"],"exclude":[]}');
  await writeFixture(root, "public/_headers", "/_astro/*\n  Cache-Control: public, max-age=31536000, immutable\n");
  return root;
}

it("rejects catch-all Functions and immutable non-fingerprinted assets", async () => {
  const root = await createPolicyFixture();
  await writeFixture(root, "public/_routes.json", '{"version":1,"include":["/*"],"exclude":[]}');
  await writeFixture(root, "public/_headers", "/images/*\n  Cache-Control: public, immutable\n");
  expect(await verifyDeploymentPolicy(root)).toEqual([
    "public/_headers: immutable is allowed only in /_astro/*",
    "public/_routes.json: include must equal [\"/api/*\"]",
  ]);
});

it("rejects duplicate headers and API ownership in _headers", async () => {
  const root = await createPolicyFixture();
  await writeFixture(root, "public/_headers", "/api/*\n  Cache-Control: no-store\n  cache-control: max-age=0\n");
  expect(await verifyDeploymentPolicy(root)).toContain(
    "public/_headers /api/*: API headers belong to functions/_middleware.ts",
  );
});
```

At Task 4 the verifier checks routing and headers. Task 6 extends the same verifier and fixture with one SHA-pinned workflow, exact Node, and the environment contract before adding workflow-specific assertions.

- [ ] **Step 2: Run the focused test and observe the missing verifier**

Run: `npm run test:node -- tests/node/deployment-policy.test.ts`

Expected: FAIL because `scripts/verifyDeploymentPolicy.mjs` does not exist.

- [ ] **Step 3: Implement static-first routing and API-only middleware**

Set `public/_routes.json` to exact include `/api/*`, empty exclude. Remove `resolveLegacyRedirect`, host/origin sets, redirect helpers, and public redirect flow from `functions/_middleware.ts`. Keep `API_SECURITY_HEADERS`, call `context.next()`, clone the response, and set headers for the API Function response.

Replace public redirect tests in `tests/middleware.test.ts` with API ownership cases:

```ts
it("preserves the handler status/body and overwrites unsafe API cache headers", async () => {
  const response = await onRequest(pagesContext(
    new Request("https://integrautomacao.com.br/api/contact", { method: "POST" }),
    {},
    async () => new Response("invalid", { status: 422, headers: { "Cache-Control": "public" } }),
  ));
  expect(response.status).toBe(422);
  expect(await response.text()).toBe("invalid");
  expect(response.headers.get("cache-control")).toBe("no-store");
});
```

Do not alter `public/_redirects`; it becomes effective for static paths after `_routes.json` is deployed.

- [ ] **Step 4: Reduce cache/header policy to one owner**

In `public/_headers`, retain the sitewide static security block. Retain one cache block only:

```text
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

Remove `Vary: Accept-Encoding`, all other `immutable`/long `s-maxage` rules, and the `/api/*` block. Non-fingerprinted files use Pages defaults or explicit revalidation only when a documented freshness requirement exists; none receives `immutable`.

Implement header parsing case-insensitively and route validation in `verifyDeploymentPolicy`. Add:

```json
"audit:deploy-policy": "node scripts/verifyDeploymentPolicy.mjs ."
```

- [ ] **Step 5: Run focused routing/header verification**

Run:

```powershell
npm run test:node -- tests/node/deployment-policy.test.ts
npm run test:workers -- tests/middleware.test.ts tests/contact.test.ts tests/newsletter.test.ts
npm run audit:deploy-policy
npm run build
node -e "const r=require('./dist/_routes.json'); if(JSON.stringify(r.include)!=='[\"/api/*\"]') process.exit(1)"
```

Expected: all exit `0`; `dist/_routes.json` is API-only; `dist/_headers` contains `immutable` only under `/_astro/*`.

- [ ] **Step 6: Commit routing and cache ownership**

```powershell
git add scripts/verifyDeploymentPolicy.mjs tests/node/deployment-policy.test.ts public/_routes.json functions/_middleware.ts tests/middleware.test.ts public/_headers package.json
git commit -m "perf: make Pages routing static first"
```

---

### Task 5: Create and verify deterministic artifact manifests

**Files:**

- Create: `scripts/artifactManifest.mjs`
- Create: `tests/node/artifact-manifest.test.ts`

**Interfaces:**

- Produces: `createManifest(artifactDir: string, commitSha: string): Promise<ArtifactManifest>`.
- Produces: `verifyManifest(artifactDir: string, manifestPath: string, expectedCommit: string): Promise<string[]>`.
- Produces CLI: `node scripts/artifactManifest.mjs create dist artifact-manifest.json $sha` and `node scripts/artifactManifest.mjs verify dist artifact-manifest.json $sha` in PowerShell.

```ts
export interface ManifestEntry {
  path: string;
  sha256: string;
  bytes: number;
}

export interface ArtifactManifest {
  algorithm: "sha256";
  commit: string;
  files: ManifestEntry[];
}
```

- [ ] **Step 1: Write failing determinism and tamper tests**

Create two files in reverse creation order, then assert sorted normalized paths, SHA-256 hex length 64, exact byte counts, and commit retention. Add separate tests that mutate a byte, add a file, delete a file, and pass a different commit; each must return a path-specific violation.

```ts
expect(manifest.files.map(({ path }) => path)).toEqual(["a.txt", "nested/z.txt"]);
expect(manifest.files.every(({ sha256 }) => /^[0-9a-f]{64}$/.test(sha256))).toBe(true);
expect(await verifyManifest(dist, manifestPath, "b".repeat(40))).toContain(
  `manifest commit ${"a".repeat(40)} does not match expected ${"b".repeat(40)}`,
);
```

- [ ] **Step 2: Run the focused tests and observe the missing module**

Run: `npm run test:node -- tests/node/artifact-manifest.test.ts`

Expected: FAIL because `scripts/artifactManifest.mjs` does not exist.

- [ ] **Step 3: Implement streaming SHA-256 and stable JSON**

Use `createReadStream`, `createHash("sha256")`, `stat`, and recursive `readdir({ withFileTypes: true })`. Sort POSIX-style relative paths with ordinal comparison. Reject non-40-hex commit values and symlinks. Exclude the manifest path if it is inside the artifact directory. Write two-space JSON plus final newline. CLI exits `1` and lists every violation on verify failure.

The CLI requires artifact directory, manifest path, and commit in that order. It rejects an omitted or non-40-hex commit.

- [ ] **Step 4: Verify focused behavior against a real build**

Run:

```powershell
npm run test:node -- tests/node/artifact-manifest.test.ts
npm run build
$sha = (git rev-parse HEAD).Trim()
node scripts/artifactManifest.mjs create dist artifact-manifest.json $sha
node scripts/artifactManifest.mjs verify dist artifact-manifest.json $sha
```

Expected: all exit `0`; a one-byte mutation in a copied temp artifact causes verify to exit `1` without modifying the source artifact.

- [ ] **Step 5: Commit artifact integrity tooling**

```powershell
git add scripts/artifactManifest.mjs tests/node/artifact-manifest.test.ts
git commit -m "build: add deterministic artifact manifest"
```

---

### Task 6: Replace CI and deploy with one SHA-pinned workflow

**Files:**

- Create: `.github/workflows/platform.yml`
- Modify: `scripts/verifyDeploymentPolicy.mjs`
- Modify: `tests/node/deployment-policy.test.ts`
- Modify: `package.json`
- Modify: `.github/dependabot.yml`
- Modify: `.github/PULL_REQUEST_TEMPLATE.md`
- Delete: `.github/workflows/ci.yml`
- Delete: `.github/workflows/deploy.yml`

**Interfaces:**

- Consumes: all `audit:*` commands, `artifactManifest.mjs`, exact Node, and `dist/`.
- Produces: artifact `pages-dist-${{ github.sha }}` containing `dist/` and `artifact-manifest.json`.
- Produces: production deploy guard `github.ref == 'refs/heads/main' && vars.CLOUDFLARE_ACTIONS_DEPLOY_ENABLED == 'true'`.

- [ ] **Step 1: Extend policy tests for workflow invariants**

Add failing fixtures for two workflow files, mutable Action tags,
`workflow_dispatch.inputs.branch`, absent production environment, write
permissions, and a deploy command without exact branch/commit. Also add
package/workflow fixtures that reject removal of `test:ui` from the aggregate
`test` script, removal of `npm test` from `ci:verify`, removal of the workflow
test step, or more than one workflow invocation of `npm test`. Add one passing
fixture containing the five approved SHAs and the exact three-lane aggregate.

```ts
expect(violations).toContain(".github/workflows: exactly one workflow is required; found 2");
expect(violations).toContain("platform.yml: actions/checkout@v4 is not pinned to a 40-hex SHA");
expect(violations).toContain("platform.yml: workflow_dispatch must not accept branch input");
```

- [ ] **Step 2: Run the policy test and observe failure on current workflows**

Run: `npm run test:node -- tests/node/deployment-policy.test.ts && npm run audit:deploy-policy`

Expected: test fixtures pass after parser extension, but repository audit exits `1` because two workflows and mutable tags still exist.

- [ ] **Step 3: Add one aggregate local CI command**

Add this script without recursively invoking itself:

```json
"ci:verify": "npm run check && npm run types:check && npm test && npm run audit:editorial && npm run audit:seo && npm run audit:env && npm run audit:deploy-policy && npm run audit:deps"
```

`audit:editorial` owns the production build. No subsequent CI step rebuilds `dist`.

- [ ] **Step 4: Create the single workflow with exact structure**

Create `.github/workflows/platform.yml` with triggers `push`/`pull_request` on `main` and input-free `workflow_dispatch`. Use top-level `permissions: contents: read`. Use these exact Action pins:

```yaml
actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4
actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4
cloudflare/wrangler-action@9acf94ace14e7dc412b076f2c5c20b8ce93c79cd # v3
```

The `verify` job steps are: checkout; setup Node from `.nvmrc` with npm cache; assert `node --version` equals `v22.23.2`; `npm ci`; then separate UI-visible steps named `Check: Astro` (`npm run check`), `Types: Cloudflare` (`npm run types:check`), `Tests: Vitest (Workers + Node + UI)` (`npm test`), `Editorial: build and audit` (`npm run audit:editorial`), `SEO: built output` (`npm run audit:seo`), `Environment: contract` (`npm run audit:env`), `Deploy policy: repository` (`npm run audit:deploy-policy`), and `Dependencies: audit` (`npm run audit:deps`). Then smoke-check `dist/index.html`, `404.html`, sitemap, RSS, `_redirects`, `_headers`, `_routes.json`, and at least one `dist/_astro/*`; create/verify `artifact-manifest.json` with `${{ github.sha }}`; upload artifact with 14-day retention and `if-no-files-found: error`. `audit:editorial` is the only build step. The deployment-policy verifier must enforce the exact visible test-step name and exactly one aggregate `npm test` invocation.

The `deploy` job:

```yaml
needs: verify
if: >-
  github.ref == 'refs/heads/main' &&
  vars.CLOUDFLARE_ACTIONS_DEPLOY_ENABLED == 'true' &&
  (github.event_name == 'push' || github.event_name == 'workflow_dispatch')
environment: production
concurrency:
  group: cloudflare-pages-production
  cancel-in-progress: false
```

It checks out `${{ github.sha }}`, sets up Node from `.nvmrc`, downloads `pages-dist-${{ github.sha }}`, verifies the manifest, then runs:

```text
pages deploy dist --project-name=integrautomacao-com-br --branch=main --commit-hash=${{ github.sha }}
```

Pass only `apiToken` and `accountId` to Wrangler Action. Do not pass `gitHubToken`; do not grant deployment or PR write access.

- [ ] **Step 5: Delete legacy workflows and update governance text**

Delete both old workflow files. Update Dependabot comments: action PRs must replace the SHA and reviewed tag comment together. Update the PR template to require `npm run ci:verify` and a built-output review; remove language implying a Cloudflare Git preview is always created.

- [ ] **Step 6: Validate workflow syntax and policy locally**

Run:

```powershell
npm run test:node -- tests/node/deployment-policy.test.ts
npm run audit:deploy-policy
$workflowCount = @(Get-ChildItem -LiteralPath '.github/workflows' -File).Count; if ($workflowCount -ne 1) { throw "expected one workflow, got $workflowCount" }
rg -n "uses:\s+[^#\s]+@(v|main|master|latest)" .github/workflows
```

Expected: tests and policy pass; workflow count is `1`; ripgrep returns no mutable Action reference.

- [ ] **Step 7: Commit the single pipeline**

```powershell
git add .github/workflows/platform.yml .github/workflows/ci.yml .github/workflows/deploy.yml scripts/verifyDeploymentPolicy.mjs tests/node/deployment-policy.test.ts package.json .github/dependabot.yml .github/PULL_REQUEST_TEMPLATE.md
git commit -m "ci: unify verified Pages deployment"
```

---

### Task 7: Prepare fail-closed Cloudflare desired state and runbook

**Files:**

- Create: `ops/cloudflare/production-desired-state.json`
- Create: `scripts/cloudflareChange.mjs`
- Create: `tests/node/cloudflare-change.test.ts`
- Create: `docs/operations/cloudflare-platform-cutover.md`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `.gitignore`

**Interfaces:**

- Produces CLI commands `validate`, `plan --snapshot`, and gated `apply --snapshot --commit`.
- Produces: `validateDesiredState(input: unknown): string[]`.
- Produces: `redactCloudflarePayload(input: unknown): unknown`.
- Produces: `assertApplyGate(options, env, snapshot, proof, repoState): string[]`.
- Consumes: the exact desired state defined by the spec; Cloudflare GET/PATCH/POST APIs only through explicit command mode.

- [ ] **Step 1: Write failing fail-closed and redaction tests**

Test that default/no command performs no fetch; `validate` performs no fetch; `plan` permits only GET; `apply` rejects absent/mismatched approval SHA, stale snapshot, dirty worktree, missing proof, wrong zone/project, and tokens present in output. Inject `fetch`, clock, prompt, and git-state functions rather than using real services.

```ts
expect(assertApplyGate(validOptions, {}, snapshot, proof, cleanRepo)).toContain(
  "CLOUDFLARE_CHANGE_APPROVED must equal the requested commit",
);
expect(redactCloudflarePayload({ Authorization: "Bearer secret", token: "secret" }))
  .toEqual({ Authorization: "[REDACTED]", token: "[REDACTED]" });
```

- [ ] **Step 2: Run focused tests and observe the missing module**

Run: `npm run test:node -- tests/node/cloudflare-change.test.ts`

Expected: FAIL because `scripts/cloudflareChange.mjs` does not exist.

- [ ] **Step 3: Encode the exact non-secret desired state**

Create the manifest with schema version `1`, managed description prefix `managed-by=integra-platform-integrity`, zone/apex/project/branch identifiers, redirect classes and test matrix, TLS values, disabled WAF/rate-limit candidate values, cache ownership, log entitlement decision, and Pages build controls from the spec. Every rule has a stable repository ID, phase, precedence, exact expression/source, action/target, enabled flag, and rollback behavior. The proposed 5 requests/10 seconds and 60-second mitigation are hypotheses for observation, not an approved blocking threshold.

Known query redirect entries include `p=245,577,637,699,700,701,911,956`, `page_id=640`, and `post_type=avia_framework_post`; their targets match `shared/legacy-redirects.ts`. Preserve non-control query parameters. Bulk redirects cover `www` and `integrautomacao-com-br.pages.dev` with subpath/query preservation.

- [ ] **Step 4: Implement offline validation, GET-only planning, and gated apply**

Use native `fetch`; do not add an SDK dependency. Centralize HTTP calls in:

```ts
requestCloudflare(method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", path: string, body?: unknown)
```

`plan` invokes only `GET` and writes a redacted JSON snapshot with exact commit, account, zone, project, capture time, current rule IDs/order/settings, computed diff, and plan entitlement. `apply` must pass all spec gates and exact interactive phrase. Mutations are update/create by stable managed description; there is no broad delete. On failure, stop and emit the successfully applied operation IDs and exact rollback actions.

Add:

```json
"cloudflare:validate": "node scripts/cloudflareChange.mjs validate",
"cloudflare:plan": "node scripts/cloudflareChange.mjs plan"
```

Do not add an npm alias for `apply`; the explicit long command is intentional friction.

Add `ops/cloudflare/evidence/*.json` to `.gitignore`. The scripts create the directory when needed; evidence JSON remains local or in the approved operational evidence store.

- [ ] **Step 5: Write the operator runbook with separate local and external sections**

Document exact pre-change evidence, token scope, GitHub environment/repository variable setup, redirect-first/static-route-second ordering, TLS checks before HSTS, disabled rate-limit candidate creation, baseline traffic and false-positive review, the separate approval required to enable blocking, cache header probes, analytics versus Enterprise Logpush decision, Actions proof, Git auto-deploy retirement, monitoring for 60 minutes, and rollback.

The runbook states that execution-plan authorization covers repository implementation only. It requires a new explicit approval before any dashboard/API mutation.

- [ ] **Step 6: Test without external mutation**

Run:

```powershell
npm run test:node -- tests/node/cloudflare-change.test.ts
npm run cloudflare:validate
npm run ci:verify
rg -n -i "bearer\s+[a-z0-9]|api[_-]?token\s*[:=]\s*[^$]" ops/cloudflare docs/operations scripts/cloudflareChange.mjs
```

Expected: tests and validation pass; no network is used by `validate`; the secret-pattern scan finds no credential value.

- [ ] **Step 7: Commit prepared Cloudflare operations**

```powershell
git add ops/cloudflare/production-desired-state.json scripts/cloudflareChange.mjs tests/node/cloudflare-change.test.ts docs/operations/cloudflare-platform-cutover.md package.json README.md .gitignore
git commit -m "ops: prepare gated Cloudflare cutover"
```

---

### Task 8: Run the complete local release gate and self-review

**Files:**

- Modify if a discrepancy is found: only the file whose implementation violates this plan.
- Verify: every file listed in the file map.

**Interfaces:**

- Consumes: all prior tasks.
- Produces: a clean, evidence-backed candidate commit; no production mutation.

- [ ] **Step 1: Run the complete clean-install gate**

```powershell
npm ci
if ((node --version) -ne 'v22.23.2') { throw "Node drift: $(node --version)" }
npm run ci:verify
```

Expected: all exit `0` on Node `v22.23.2`.

- [ ] **Step 2: Verify the real artifact twice**

```powershell
$sha = (git rev-parse HEAD).Trim()
node scripts/artifactManifest.mjs create dist artifact-manifest.json $sha
node scripts/artifactManifest.mjs verify dist artifact-manifest.json $sha
npm run audit:seo
npm run audit:deploy-policy
npm run audit:env
```

Expected: all exit `0`; manifest commit equals `$sha`.

- [ ] **Step 3: Scan for forbidden policy patterns**

```powershell
rg -n "npm audit fix|audit --force|workflow_dispatch:[\s\S]*branch:|uses:\s+[^#\s]+@(v|main|master|latest)|include\"?:\s*\[\s*\"/\*\"|immutable" package.json package-lock.json .github public scripts docs README.md
```

Expected: no forced audit or mutable Action reference; no catch-all Functions route; `immutable` appears only in the design/plan, tests, verifier, and `/_astro/*` production header block.

- [ ] **Step 4: Reconcile plan/spec coverage**

Check each acceptance criterion in the spec against a test, script, workflow step, or runbook gate. Check all function names and CLI argument order against this plan. Search the implementation documents and code for unresolved markers or unbound parameter notation; replace every occurrence with an exact decision or documented external secret name.

- [ ] **Step 5: Inspect final repository diff and status**

```powershell
git diff --check
git status --short
git diff --stat
git log -8 --oneline
```

Expected: no whitespace errors, no generated `dist/`, manifest, secret, `.env`, `.dev.vars`, snapshot, or evidence export is staged; commits are task-scoped.

- [ ] **Step 6: Commit only corrective review changes, if present**

If Step 4 required corrections, stage only those named files and commit:

```powershell
git commit -m "chore: close platform integrity review gaps"
```

If there are no corrections, do not create an empty commit.

---

### Task 9: Execute the separately authorized production cutover

**Files:**

- Generate locally but do not commit secrets: `ops/cloudflare/evidence/pre-change.json`
- Generate after proof: `ops/cloudflare/evidence/actions-proof.json`
- Update after successful change with redacted values only: `docs/operations/cloudflare-platform-cutover.md`

**Interfaces:**

- Consumes: exact merged `main` commit, successful GitHub verify/artifact run, approved production window, environment secrets, and Cloudflare desired state.
- Produces: one proven Actions deployment, static-first live routing, external redirect/TLS/cache/log settings, disabled rate-limit candidate rules, disabled Git auto-deploy, and rollback evidence. Enabling a blocking rule is outside this gate and requires a later explicit approval backed by observed traffic.

- [ ] **Step 1: Stop unless external authorization is explicit and current**

Required evidence: operator, approver, UTC window, exact 40-hex `main` SHA, successful workflow URL, rollback owner, and permission to mutate GitHub/Cloudflare settings. If any item is absent, report `BLOCKED_BY_EXTERNAL_PRODUCTION_GATE` and perform no external action.

- [ ] **Step 2: Capture read-only Cloudflare state and computed plan**

```powershell
$sha = (git rev-parse origin/main).Trim()
node scripts/cloudflareChange.mjs plan --snapshot ops/cloudflare/evidence/pre-change.json --commit $sha
```

Expected: GET-only report, capture age under 60 minutes, matching account/zone/project, no secret material, exact ordered diff.

- [ ] **Step 3: Establish GitHub production protections without enabling deploy**

In GitHub Settings, create/verify environment `production`, required reviewers, deployment branch `main` only, and environment secrets `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_API_TOKEN`. Keep repository variable `CLOUDFLARE_ACTIONS_DEPLOY_ENABLED=false`. Record redacted screenshots/change IDs.

- [ ] **Step 4: Apply redirects/TLS/cache/log settings and create disabled WAF/rate-limit candidates while middleware remains active**

Set process environment values from the approved vault, including `$env:CLOUDFLARE_CHANGE_APPROVED = $sha`, then run the exact gated command:

```powershell
node scripts/cloudflareChange.mjs apply --snapshot ops/cloudflare/evidence/pre-change.json --commit $sha
```

Enter the exact confirmation phrase printed by the runbook. Verify all redirect matrix rows in one hop, unknown path 404, TLS 1.2 minimum/TLS 1.3, HSTS without subdomains/preload, that rate-limit candidates exist but are disabled, cache ownership, and available analytics/logging. On the first failure, execute recorded rollback and stop. Do not enable the blocking action in this task.

- [ ] **Step 5: Deploy static-first routing and prove the exact Actions artifact**

Freeze pushes to `main`; set `CLOUDFLARE_ACTIONS_DEPLOY_ENABLED=true`; dispatch `platform.yml` from `main`; approve environment `production`. Record the workflow run URL, artifact ID, manifest SHA-256, Pages deployment ID/URL, commit SHA, and UTC probe results in `actions-proof.json`. Confirm static requests no longer increment Functions invocations and `/api/*` still does.

- [ ] **Step 6: Disable Cloudflare Git automatic deployments only after proof**

Cloudflare Pages project `integrautomacao-com-br` → Build → Branch control: turn off **Enable automatic production branch deployments** and set Preview branch to **None**. Do not remove the GitHub integration. Record before/after evidence.

- [ ] **Step 7: Prove single-deployer behavior and monitor**

Use the approved canary/documentation commit, then verify exactly one production deployment, produced by Actions, at that commit. Monitor apex availability, 3xx/4xx/5xx, API errors, request volumes that would match the disabled rate-limit candidates, cache status, Functions invocations, and Pages deployment health for 60 minutes. Record likely false positives and keep candidates disabled. End the push freeze only after all checks pass.

- [ ] **Step 8: Close or roll back**

On success, append the redacted change record and evidence identifiers to the runbook and commit only the non-secret record. On failure, set `CLOUDFLARE_ACTIONS_DEPLOY_ENABLED=false`, re-enable Cloudflare production auto-deploy if it was disabled, restore the last known-good Pages deployment, disable only repository-managed new rules, rerun probes, and record the rollback outcome.

---

## Execution handoff

Repository Tasks 1-8 may be executed with the required implementation skill and normal review checkpoints. Task 9 is intentionally outside that authorization boundary: it requires a separate, explicit production approval after the exact `main` artifact exists and passes the local/GitHub gates.
