# Platform Integrity Design

**Status:** Approved for implementation planning on 2026-08-20

**Scope:** SEO output integrity, Node and dependency determinism, CI/CD, Cloudflare Pages routing, cache/header ownership, environment-variable drift, and gated Cloudflare production changes.

## Context

The repository already has useful controls, but they do not form one end-to-end integrity chain:

- `.nvmrc` and `wrangler.jsonc` name the stale Node `22.12.0`, while `package.json`, `.env.example`, and `README.md` permit or describe broader values; the repaired contract upgrades every surface to the reviewed current Node 22 LTS patch `22.23.2`.
- `src/pages/404.astro` says that the 404 must not emit a canonical URL, but `src/layouts/BaseLayout.astro` always emits both `rel="canonical"` and `og:url`.
- `astro.config.mjs` filters known noindex routes from the sitemap with substring tests instead of one reusable SEO policy.
- `.github/workflows/ci.yml` builds an artifact and `.github/workflows/deploy.yml` can independently rebuild and deploy a freely supplied branch. Cloudflare Git integration is also the current automatic production deployer.
- GitHub Actions are referenced by mutable major tags rather than immutable commit SHAs.
- `public/_routes.json` invokes `functions/_middleware.ts` for all paths. Static pages therefore consume Functions routing and `public/_redirects` cannot own their redirects.
- `public/_headers` gives long-lived cache policy to public files that do not carry content fingerprints and repeats response policy that should have one owner per response class.
- `.env.example` still documents `RESEND_API_KEY`, but the repaired runtime
  contract separates contact send, newsletter transactional send, and Contacts
  reconciliation credentials and adds an environment-specific newsletter
  confirmation origin; the old file also gives `NODE_VERSION=22` instead of the
  exact reviewed runtime `22.23.2`.

The target is a single, reproducible chain:

```text
source commit on exact main
  -> verify on Node 22.23.2
  -> build dist once
  -> deterministic SHA-256 manifest
  -> immutable GitHub artifact
  -> verify the downloaded artifact
  -> deploy that exact dist to Cloudflare Pages production
```

## Goals

1. Make the generated sitemap and 404 metadata agree with the noindex policy.
2. Use exactly Node `22.23.2` in every local, CI, Pages, and documentary contract.
3. Update direct dependencies only to the reviewed 2026-08-20 target set, without `npm audit fix --force` and without unreviewed major upgrades.
4. Replace the two GitHub workflows with one workflow that verifies, manifests, uploads, re-verifies, and deploys one build.
5. Run the full CI contract: Astro check, generated Cloudflare types check, Vitest, editorial audit, deployment-policy audit, dependency policy, and build-output smoke checks.
6. Restrict production deployment to the exact `main` ref, use the GitHub `production` environment, minimal permissions, and SHA-pinned Actions.
7. Make Pages static-first: only `/api/*` invokes Functions; Pages `_redirects` owns static path redirects; zone/Bulk Redirects own host, protocol, port, and `pages.dev` canonicalization.
8. Apply `immutable` only to Astro fingerprinted assets and give each response class one header owner.
9. Make environment-variable drift machine-detectable.
10. Prepare Cloudflare redirect, TLS, WAF/rate-limit, cache, and logging changes, while preventing any external mutation before an explicit production gate.
11. Disable Cloudflare Git automatic deployments only after the GitHub Actions path has deployed and passed live proof.

## Non-goals

- No production or dashboard mutation is part of the local implementation phase.
- No secret value is committed, printed, embedded in an artifact, or copied from Cloudflare into repository files.
- No framework major upgrade, TypeScript 7 upgrade, `@cloudflare/vitest-pool-workers` 0.22 upgrade, or `@emnapi/wasi-threads` 2 upgrade is included.
- No `npm audit fix`, `npm audit fix --force`, global package installation, new package manager, or lockfile regeneration unrelated to the reviewed direct dependencies is allowed.
- No cache-everything policy for HTML, XML, JSON, APIs, images, OG cards, favicons, or downloads is introduced.
- No HSTS `includeSubDomains` or preload activation is allowed in this change because all subdomains and recovery paths have not been proven HTTPS-safe.
- No claim of production correctness may be based only on local tests or a successful upload.

## Repository and production boundaries

### Local, version-controlled changes

The implementation may change source, tests, scripts, workflows, `public` policy files, examples, and operational documentation. Local commands may read package registries and build into ignored directories. They must not call a mutating Cloudflare endpoint.

The local implementation produces:

- SEO policy and built-output validation;
- exact runtime and dependency policy;
- static-first Pages routing;
- deterministic artifact manifest generation and verification;
- a single GitHub workflow;
- a non-secret Cloudflare desired-state manifest;
- a read-only Cloudflare preflight/report command;
- an operator runbook with gates, evidence, and rollback.

### Dashboard/API production changes

Cloudflare and GitHub settings are external changes. They require all of the following before execution:

1. named operator and approver;
2. UTC change-window start and end;
3. exported/screenshot evidence of current settings and rule order;
4. successful local release gate at the exact commit;
5. successful GitHub `verify` and `artifact` jobs for the exact commit;
6. a rollback owner and rollback commands/steps;
7. `CLOUDFLARE_CHANGE_APPROVED` equal to the exact commit SHA for any mutating helper;
8. explicit confirmation that the zone/account plan supports each proposed feature.

The automation must default to `plan` mode. `apply` must fail closed if any gate is absent. Tokens are read only from process environment and are never accepted as CLI arguments.

## Architecture

### 1. SEO output contract

Create `src/utils/seo-policy.ts` as the single reusable policy with these interfaces:

```ts
export const NOINDEX_PATHS: ReadonlySet<string>;

export function normalizeSeoPath(input: string | URL): string;

export function shouldIncludeInSitemap(page: string): boolean;

export function resolveCanonicalUrl(
  canonical: string | URL | false | undefined,
  pathname: string,
  site: string,
): URL | null;
```

`NOINDEX_PATHS` contains exactly `/404`, `/404/`, `/busca`, `/busca/`, `/integra-acao/webinar`, `/integra-acao/webinar/`, `/integra-acao/newsletter/confirmar`, and `/integra-acao/newsletter/confirmar/`. `shouldIncludeInSitemap` also rejects any pathname beginning `/api/`. It parses a URL and compares normalized pathnames; it does not use broad substring matching.

`BaseLayout.astro` changes `canonical?: string` to `canonical?: string | URL | false` and adds `nofollow?: boolean` alongside the existing `noindex?: boolean`. The default remains a self-canonical. `false` returns `null` and suppresses both `<link rel="canonical">` and `<meta property="og:url">`. `src/pages/404.astro` passes `canonical={false}`. Search and 404 use `noindex,follow`; webinar and newsletter confirmation pass `nofollow={true}` and use `noindex,nofollow`. Search retains a self-canonical because it is a real route; the 404 is the special non-resource response.

`scripts/verifySeoOutput.mjs` validates the built artifact and exports:

```ts
export function inspectSeoOutput(distDir: string): Promise<string[]>;
```

It derives the rendered URL for every HTML file, finds all pages whose robots directive contains `noindex`, and reports a violation if any such URL appears in any `sitemap-*.xml`. It also enforces the explicit policy: 404 and search use `noindex,follow`; webinar and the newsletter confirmation utility use `noindex,nofollow`; 404 contains neither a canonical nor `og:url`; and search keeps its exact self-canonical. It rejects `/api/`, including normalized nested or query-string variants, prints every deterministic relative path and violation, and exits `1` unless the violation array is empty. The rendered-output cross-check is authoritative so a future noindex page cannot enter the sitemap merely because a hardcoded list drifted.

### 2. Exact Node and controlled dependency set

Node is exactly `22.23.2` in:

- `.nvmrc`;
- `package.json` at `engines.node` using `"22.23.2"`;
- `wrangler.jsonc` at `vars.NODE_VERSION`;
- `.env.example` at `NODE_VERSION`;
- `README.md` prerequisites, environment table, and Cloudflare build instructions;
- the GitHub workflow through `actions/setup-node` with `node-version-file: .nvmrc` plus an explicit `node --version` equality check.

The approved direct dependency update set, captured from `npm outdated --json` on 2026-08-20, is:

| Package | From | To | Decision |
|---|---:|---:|---|
| `@astrojs/mdx` | 7.0.5 | 7.0.7 | update |
| `@cloudflare/workers-types` | 5.20260801.1 installed | 5.20260820.1 | update |
| `@iconify-json/lucide` | 1.2.120 | 1.2.124 | update |
| `astro` | 7.1.6 | 7.2.4 | update |
| `astro-icon` | 1.1.5 | 1.2.0 | update |
| `vitest` | 4.1.10 | 4.1.11 | update |
| `wrangler` | 4.116.0 | 4.125.0 | update |
| `@cloudflare/vitest-pool-workers` | 0.19.1 | 0.20.3 | update: smallest registry-verified release outside the vulnerable range; retains Vitest `^4.1.0` compatibility and moves its exact Wrangler/Miniflare/Undici subtree to fixed versions |
| `@emnapi/wasi-threads` | 1.2.2 | 2.0.1 | hold: major |
| `typescript` | 5.9.3 | 7.0.2 | hold: major |

The controlled transitive patch set uses npm `overrides` for
`fast-uri@3.1.5`, `js-yaml@4.3.1`, `nanoid@3.3.18`, and `postcss@8.5.23`.
Each override is the smallest patched version outside the exact advisory range
reported by the npm registry on 2026-08-20 and remains inside the consumers'
existing compatible range. No broad or floating override is allowed.

The update command names every approved direct package and version; overrides
name every approved transitive patch. The resulting `package.json` and
`package-lock.json` are reviewed together. `npm ci`, the full CI contract, and a
second clean `npm ci` validate lock determinism. `npm audit --audit-level=high`
and a full `npm audit` are gates; remediation is an explicit version/override
change followed by the full suite, never a forced audit rewrite.

### 3. Environment contract

Create `config/environment-contract.json` with this non-secret schema:

```json
{
  "nodeVersion": "22.23.2",
  "build": ["NODE_VERSION", "PUBLIC_TURNSTILE_SITE_KEY"],
  "runtime": [
    "TURNSTILE_SECRET_KEY",
    "RESEND_SEND_API_KEY",
    "RESEND_TRANSACTIONAL_API_KEY",
    "RESEND_CONTACTS_API_KEY",
    "RESEND_SEGMENT_ID",
    "RESEND_TOPIC_ID",
    "CONTACT_EMAIL_TO",
    "CONTACT_EMAIL_FROM",
    "NEWSLETTER_CONFIRMATION_ORIGIN"
  ]
}
```

`scripts/verifyEnvironmentContract.mjs` exports:

```ts
export function verifyEnvironmentContract(rootDir: string): Promise<string[]>;
```

It compares exact names across the contract, `.env.example`, `.dev.vars.example`, `wrangler.jsonc`, `functions/_shared/env.ts`, and the GitHub workflow. `.env.example` documents both groups; `.dev.vars.example` and `functions/_shared/env.ts` contain the runtime group; Wrangler and the workflow contain only required public/build names. Runtime application secrets must be absent from Wrangler and GitHub Actions because Pages Functions read them directly from Cloudflare at runtime. `NEWSLETTER_CONFIRMATION_ORIGIN` is not secret but remains runtime- and environment-specific so preview can never point at production. The workflow's `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are deployment credentials outside the application binding contract. The verifier rejects `RESEND_API_KEY`, missing names, unexpected application-secret names, cross-purpose Resend fallbacks, and any Node value other than `22.23.2`. The example files retain empty secret values and the existing non-secret contact addresses.

### 4. Static-first routing and redirect ownership

`public/_routes.json` becomes:

```json
{
  "version": 1,
  "include": ["/api/*"],
  "exclude": []
}
```

Cloudflare documents that `_routes.json` controls which requests invoke Functions and that exclusions take priority. Restricting inclusion to `/api/*` means static pages are delivered without a Function invocation. Cloudflare also documents that `_redirects` is ignored for Function-served requests; static-first routing therefore restores `public/_redirects` as the owner of static path redirects. See [Pages Functions routing](https://developers.cloudflare.com/pages/functions/routing/) and [Pages redirects](https://developers.cloudflare.com/pages/configuration/redirects/).

`functions/_middleware.ts` becomes API-only. It no longer imports `resolveLegacyRedirect`, knows public hostnames, or emits public redirects. It continues to apply API security/no-store headers to every Function response, including errors. `tests/middleware.test.ts` retains only API hardening behavior.

Redirect ownership is explicit:

| Redirect class | Owner after cutover | Activation gate |
|---|---|---|
| old static paths and splats | `public/_redirects` | successful preview/static route tests |
| apex HTTP to HTTPS | Cloudflare Always Use HTTPS | TLS preflight |
| `www` to apex, preserving path/query | zone Bulk Redirect | one-hop live probe |
| `integrautomacao-com-br.pages.dev` to apex | account Bulk Redirect | custom domain confirmed and one-hop live probe |
| non-default production ports to apex | zone Single Redirect | Cloudflare Trace plus live probes |
| known WordPress query IDs | zone Single Redirect rules | live equivalence matrix before middleware removal |

The `pages.dev` redirect follows Cloudflare's documented Bulk Redirect pattern with preserve query, subpath matching, preserve path suffix, and include subdomains. See [Redirecting `*.pages.dev` to a custom domain](https://developers.cloudflare.com/pages/how-to/redirect-to-custom-domain/).

Migration order prevents a gap:

1. deploy the desired-state manifest, read-only preflight, and probes while the middleware still owns canonical redirects;
2. configure external redirects in disabled/draft form where supported;
3. enable external redirects during the approved window;
4. prove every redirect in one hop and prove unknown URLs remain 404;
5. deploy `_routes.json` and the API-only middleware;
6. repeat the redirect matrix and API/static routing probes;
7. roll back the Pages deployment immediately if any canonical class fails.

### 5. Cache and header ownership

`public/_headers` remains the owner for static responses. `functions/_middleware.ts` remains the owner for API Function responses. Because Cloudflare states that `_headers` does not apply to Function-generated responses, the `/api/*` block is removed from `_headers`; API policy exists only in code. See [Pages custom headers](https://developers.cloudflare.com/pages/configuration/headers/).

Only `/_astro/*` receives:

```text
Cache-Control: public, max-age=31536000, immutable
```

No other rule may contain `immutable` or an `s-maxage` greater than zero. HTML, sitemap, RSS, images, OG images, favicons, downloads, and other public files either omit `Cache-Control` and accept Pages defaults or use revalidation/no-store without `immutable`. `Vary: Accept-Encoding` is removed from `_headers`; compression variance is platform-owned.

The Cloudflare zone Browser Cache TTL is set to **Respect Existing Headers**, and no Cache Rule overrides HTML/API/public-file browser TTL. Cloudflare notes that long browser TTL cannot be purged from visitors' browsers, which is why immutable caching is limited to fingerprinted assets. See [Edge and Browser Cache TTL](https://developers.cloudflare.com/cache/how-to/edge-browser-cache-ttl/).

`scripts/verifyDeploymentPolicy.mjs` rejects:

- any `_routes.json` include other than exactly `/api/*`;
- `immutable` outside the `/_astro/*` block;
- duplicate case-insensitive header names within a `_headers` block;
- `/api/*` in `_headers`;
- mutable `uses: owner/action@tag` references;
- more than one workflow file;
- deploy commands without `--branch=main` and `--commit-hash=${{ github.sha }}`;
- a workflow dispatch branch input;
- missing `environment: production`, minimal permissions, or exact-main guards;
- Node drift and environment-contract drift.

It exports:

```ts
export function verifyDeploymentPolicy(rootDir: string): Promise<string[]>;
```

### 6. Artifact integrity and the single workflow

Create `scripts/artifactManifest.mjs` with:

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

export function createManifest(
  artifactDir: string,
  commitSha: string,
): Promise<ArtifactManifest>;

export function verifyManifest(
  artifactDir: string,
  manifestPath: string,
  expectedCommit: string,
): Promise<string[]>;
```

Paths use `/`, are sorted by ordinal byte order, and exclude the manifest file itself. The JSON file is UTF-8 with a final newline. Verification rejects a commit mismatch, missing/extra files, size mismatch, or digest mismatch.

Delete `.github/workflows/ci.yml` and `.github/workflows/deploy.yml`; create `.github/workflows/platform.yml`. The only workflow has two jobs, with an explicit artifact stage at the end of verification:

1. `verify`: checkout exact event commit, verify Node `22.23.2`, `npm ci`, run check/types/tests/editorial/deployment-policy/dependency gates, build once, smoke-test output, create `artifact-manifest.json`, and upload `dist/` plus the manifest under `pages-dist-${{ github.sha }}`. The workflow/UI step names are `Artifact: create SHA-256 manifest`, `Artifact: verify manifest`, and `Artifact: upload verified dist`.
2. `deploy`: only for `push` or `workflow_dispatch` on `refs/heads/main` and only when repository variable `CLOUDFLARE_ACTIONS_DEPLOY_ENABLED` equals `true`; enter GitHub environment `production`; checkout the exact commit for Functions/config, download the exact named artifact, verify its manifest against `${{ github.sha }}`, and deploy `dist` with `--project-name=integrautomacao-com-br --branch=main --commit-hash=${{ github.sha }}`.

There is no branch input. Pull requests verify and upload artifacts but never deploy. Workflow permissions default to `contents: read`; the deploy does not receive `pull-requests: write` or `deployments: write` because it does not comment or create a GitHub Deployment. Cloudflare credentials are environment secrets scoped to `production`.

Every Action is pinned to the SHA resolved for its major tag on 2026-08-20:

```yaml
actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4
actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4
cloudflare/wrangler-action@9acf94ace14e7dc412b076f2c5c20b8ce93c79cd # v3
```

Dependabot may propose action updates, but a human reviews the upstream release and commit before changing a SHA/comment pair.

Cloudflare documents Wrangler upload of prebuilt Pages assets and the required account token/ID. See [Direct Upload with continuous integration](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/).

### 7. Cloudflare desired state and fail-closed operator

Create `ops/cloudflare/production-desired-state.json` containing only non-secret identifiers, expressions, and values:

- zone hostname `integrautomacao.com.br`;
- Pages project `integrautomacao-com-br` and production branch `main`;
- Bulk Redirects for `www` and `integrautomacao-com-br.pages.dev` to the apex with query/path preservation;
- Single Redirects for non-default ports and known legacy query redirects;
- TLS: Full (strict), Always Use HTTPS on, TLS 1.3 on, minimum TLS 1.2, HSTS max-age 31,536,000 without subdomains/preload;
- WAF/rate-limit candidate rules for `POST /api/contact`, `POST /api/newsletter`, and `POST /api/newsletter/confirm` are encoded but initially disabled. The proposed starting threshold is 5 requests per 10 seconds per IP with a 60-second mitigation and 429 response; it is not an approved production threshold until observed traffic and false-positive evidence are reviewed;
- cache: Browser TTL respects origin; no cache-everything rule for HTML/API; immutable only from `/_astro/*` origin headers;
- logs: retain minimized application logs, review HTTP/Security/Workers analytics, and record whether plan entitlement supports Logpush before creating a job;
- Pages Git build controls: production automatic deployments off and preview automatic deployments off, but only after Actions proof.

The WAF phase and ordering follow Cloudflare's Rulesets model; rate-limit candidates remain disabled at the end of the `http_ratelimit` entry-point ruleset. The runbook first captures baseline traffic and likely false positives, then requires a separate explicit approval before enabling a blocking action. See [rate limiting via API](https://developers.cloudflare.com/waf/rate-limiting-rules/create-api/) and [custom WAF rules](https://developers.cloudflare.com/waf/custom-rules/).

TLS settings are verified before HSTS. HSTS remains without subdomains/preload because Cloudflare warns that incompatible HTTPS/DNS changes can make hosts inaccessible for the max-age duration. See [Always Use HTTPS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/) and [HSTS requirements](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/).

Logpush is not assumed available. Cloudflare documents HTTP-request Logpush as Enterprise-only; lower plans use zone HTTP/Security/Performance and Workers & Pages analytics. See [Zone Analytics](https://developers.cloudflare.com/analytics/account-and-zone-analytics/zone-analytics/) and [Logpush availability](https://developers.cloudflare.com/logs/logpush/).

Create `scripts/cloudflareChange.mjs` with commands:

```text
node scripts/cloudflareChange.mjs validate
node scripts/cloudflareChange.mjs plan --snapshot ops/cloudflare/evidence/pre-change.json --commit $sha
node scripts/cloudflareChange.mjs apply --snapshot ops/cloudflare/evidence/pre-change.json --commit $sha
```

`validate` is offline. `plan` performs authenticated GETs only and writes a redacted snapshot/report. `apply` is mutating and must additionally require:

- `CLOUDFLARE_CHANGE_APPROVED` exactly equal to `--commit`;
- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID`, and `CLOUDFLARE_API_TOKEN` in the environment;
- a clean worktree at the named commit;
- a snapshot whose `commit`, zone, account, project, and `capturedAt` (not older than 60 minutes) match;
- `ops/cloudflare/evidence/actions-proof.json` showing the exact commit, successful Actions run URL, Cloudflare deployment ID/URL, live-probe timestamp, and pass result;
- interactive phrase formed as `APPLY integrautomacao.com.br ` followed by the exact approved 40-hex commit; CI is explicitly disallowed from calling `apply`.

The script prints a redacted operation summary before mutation, stops on the first failed Cloudflare response, and writes applied rule IDs plus rollback data. It never deletes a rule it did not create or identify by the repository-managed description prefix `managed-by=integra-platform-integrity`.

### 8. Production cutover and Git auto-deploy retirement

The `production` GitHub environment is created with required reviewer(s), deployment branch limited to `main`, and secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`. The token has only Account / Cloudflare Pages / Edit for the target account.

Cutover sequence:

1. merge the local implementation while `CLOUDFLARE_ACTIONS_DEPLOY_ENABLED=false`; existing Cloudflare Git integration remains the deployer;
2. prove GitHub verification/artifact for the exact merged commit;
3. freeze pushes to `main` for the cutover window;
4. set `CLOUDFLARE_ACTIONS_DEPLOY_ENABLED=true`;
5. dispatch `.github/workflows/platform.yml` from exact `main` and approve the `production` environment;
6. record run URL, artifact ID, manifest digest, Pages deployment ID, and live probe results in `actions-proof.json`;
7. only after that proof, turn off Cloudflare **Enable automatic production branch deployments** and set preview branches to **None**;
8. run a no-content documentation commit or approved canary commit and prove exactly one Pages deployment originates from Actions;
9. end the push freeze.

Cloudflare explicitly supports disabling automatic production and preview branch deployments while continuing Wrangler uploads to an existing Git-integrated Pages project. See [Git integration: disable automatic deployments](https://developers.cloudflare.com/pages/configuration/git-integration/).

Rollback before Git auto-deploy is disabled: set `CLOUDFLARE_ACTIONS_DEPLOY_ENABLED=false` and keep the Git integration active. Rollback after it is disabled: disable the repository variable, re-enable production automatic deployments, redeploy the last known-good Pages deployment from the dashboard, and re-run live probes. Redirect/routing rollback restores the prior Pages deployment before disabling newly managed external redirect rules.

## Acceptance criteria

### Local/repository acceptance

- `npm ci` succeeds on Node `22.23.2`.
- `npm run check`, `npm run types:check`, `npm test`, `npm run audit:editorial`, `npm run audit:seo`, `npm run audit:deploy-policy`, `npm run audit:env`, and `npm run audit:deps` pass.
- `npm audit --audit-level=high` passes without forced remediation; if a high-severity advisory remains after reviewed direct dependency updates, the release is explicitly `BLOCKED_BY_DEPENDENCY_ADVISORIES` with the exact dependency paths and no deployment claim.
- A clean second `npm ci` leaves `package-lock.json` unchanged.
- Built `404.html` has `noindex` and has neither canonical nor `og:url`.
- No sitemap contains `/404`, `/busca`, `/integra-acao/webinar`, `/integra-acao/newsletter/confirmar`, `/api/`, or any other rendered URL marked `noindex`.
- `dist/_routes.json` invokes Functions only for `/api/*`.
- `immutable` appears only in the `/_astro/*` header block.
- No `_headers` block repeats a header name case-insensitively and no API headers exist in `_headers`.
- Exactly one workflow exists; every `uses:` is a 40-hex SHA; workflow dispatch has no branch input.
- Manifest verification detects content mutation, file addition/removal, and commit mismatch.
- Cloudflare `validate` and read-only `plan` produce no secret material and perform no mutation.

### Production acceptance

- The exact `main` commit has a successful GitHub run, manifest, and Pages deployment ID.
- Apex HTTPS returns 200; HTTP, `www`, `pages.dev`, alternate port, and every legacy query case converge to apex in one 301 hop.
- Unknown paths return a real 404 with no canonical; API GET remains 405 by handler design; API POST errors retain security/no-store headers.
- Static HTML requests do not increment Pages Functions invocation counts; `/api/*` does.
- Fingerprinted `/_astro/*` assets return one immutable cache policy; HTML/API/public non-fingerprinted files do not.
- TLS minimum, Always Use HTTPS, HSTS scope, cache, and analytics/log availability match the approved desired-state report; rate-limit candidates remain disabled until a separate enable approval follows traffic and false-positive review.
- After auto-deploy retirement, one canary commit produces exactly one production deployment, from GitHub Actions.

## Evidence retention

Repository evidence is committed only when it contains no secrets or personal data. External evidence records UTC timestamps, commit SHA, workflow run URL, artifact ID, manifest digest, Pages deployment ID, rule IDs, redacted before/after values, live probe results, operator, approver, and rollback outcome. Screenshots are referenced from the change record; sensitive exports remain in the approved operational evidence store and are not committed.
