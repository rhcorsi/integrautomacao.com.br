# Newsletter Mailbox Consent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a D1-authoritative double-opt-in newsletter workflow that proves mailbox control before Resend mutation and blocks Broadcast eligibility until forward reconciliation succeeds.

**Architecture:** The initial Pages Function stores a pending request and a SHA-256 token digest in D1, then sends a transactional email whose token travels only in the URL fragment. A static landing performs an explicit confirmation POST; one conditional D1 update plus a database trigger atomically consumes the token, confirms consent, appends the ledger, and creates a Resend reconciliation job. Request-driven outbox processing reconciles forward and read-backs ambiguous provider mutations.

**Tech Stack:** Astro 7, TypeScript 5.7, Cloudflare Pages Functions, Cloudflare D1/SQLite migrations, Web Crypto, Resend HTTP APIs, Vitest 4 with `@cloudflare/vitest-pool-workers` 0.19.1.

**Spec:** `docs/superpowers/specs/2026-08-20-newsletter-consent-design.md`

**Cross-plan order:** `docs/superpowers/plans/2026-08-20-full-site-remediation.md` is authoritative for shared files. Platform Tasks 1–2 precede this plan; Newsletter binding/environment tasks precede Platform Task 3; newsletter copy precedes UX form-error work; Platform Task 6 owns the final workflow.

## Global Constraints

- Runtime: Cloudflare Pages Functions with compatibility date `2026-07-13` and exact Node.js build version `22.23.2`.
- Database binding name: `NEWSLETTER_DB`.
- Production database name: `integrautomacao-newsletter-production`.
- Preview database name: `integrautomacao-newsletter-preview`.
- Create both remote databases with primary location hint `enam` and read replication disabled; Cloudflare offers no South America D1 primary location, so this is a preference rather than a residency guarantee.
- Local Pages development uses a local D1 database through the same `NEWSLETTER_DB` binding.
- Keep `RESEND_SEND_API_KEY` exclusive to contact, use
  `RESEND_TRANSACTIONAL_API_KEY` exclusively for newsletter confirmation, and
  reserve `RESEND_CONTACTS_API_KEY` for post-confirmation reconciliation. Also
  use `TURNSTILE_SECRET_KEY`, `RESEND_SEGMENT_ID`, `RESEND_TOPIC_ID`,
  `CONTACT_EMAIL_FROM`, and environment-specific
  `NEWSLETTER_CONFIRMATION_ORIGIN`; never fall back across credentials or to
  legacy `RESEND_API_KEY`.
- Add no mandatory npm package or external service.
- Generate 32 random token bytes, encode as unpadded base64url, expire after 24 hours, and persist only a lowercase SHA-256 hex digest.
- Use `/integra-acao/newsletter/confirmar/` as the static landing and `POST /api/newsletter/confirm` as the only confirmation mutation.
- Mark the confirmation utility `noindex,nofollow` and exclude it from every sitemap.
- Pseudonymize name/email on unconfirmed requests after 30 days while preserving only minimized append-only evidence.
- Keep consent policy version `2026-07-13`.
- Do not call Resend Contacts, Segments, or Topics before atomic mailbox confirmation.
- Return the same `202 Accepted` body for every valid initial request that reaches a stored state.
- Treat `confirmed` plus `reconciled` as the only broadcast-eligible state.

---

## File map

- `migrations/0001_newsletter_consent.sql`: D1 schema, indexes, immutable-ledger guards, atomic confirmation trigger, and broadcast view.
- `vitest.config.ts`: D1 test binding and migration loading.
- `tests/setup.ts`: per-test D1 migration application.
- `functions/types.d.ts`: generated `NEWSLETTER_DB` binding type.
- `functions/_shared/env.ts`: complete newsletter runtime binding type.
- `functions/_shared/newsletter/types.ts`: shared domain unions, input/output records, job/provider contracts, and constants.
- `functions/_shared/newsletter/crypto.ts`: token generation, base64url validation, and SHA-256 hashing.
- `functions/_shared/newsletter/store.ts`: all D1 statements and state transitions.
- `functions/_shared/newsletter/email.ts`: transactional confirmation-email HTML/text and bounded Resend send/retry.
- `functions/_shared/newsletter/provider.ts`: Resend Contacts/Segments/Topics adapter and mutation read-back.
- `functions/_shared/newsletter/reconcile.ts`: job claim, forward reconciliation, retry schedule, and D1 finalization.
- `functions/api/newsletter.ts`: validated pending-registration endpoint only.
- `functions/api/newsletter/confirm.ts`: explicit token-consumption endpoint and reconciliation kick.
- `src/scripts/newsletterConfirmation.ts`: dependency-injected fragment/explicit-click controller with no storage dependency.
- `src/pages/integra-acao/newsletter/confirmar.astro`: static, accessible fragment-to-POST confirmation UI.
- `src/components/NewsletterForm.astro`: neutral `202` form behavior and mailbox-instruction copy.
- `src/pages/integra-acao/newsletter.astro`: double-opt-in explanation and FAQ copy.
- `src/pages/politica-privacidade.astro`: authoritative-store, retention, token, and provider-processing disclosure.
- `.dev.vars.example`: existing binding inventory and safe local setup comments.
- `README.md`: D1 creation/migration/runbook, environment separation, reconciliation audit, and Broadcast release gate.
- `tests/newsletter-store.test.ts`: schema, token, atomicity, race, expiry, retention cleanup, ledger, lease, and view tests.
- `tests/newsletter-email.test.ts`: fragment link, raw-token non-persistence boundary, retry, and ambiguity tests.
- `tests/newsletter.test.ts`: initial endpoint validation, neutral response, and no-preconfirmation provider mutation tests.
- `tests/newsletter-confirm.test.ts`: confirmation API replay/expiry/race response tests.
- `tests/newsletter-reconcile.test.ts`: provider read-back, global opt-out, retry, and broadcast-gate tests.
- `tests/newsletter-confirm-page.test.ts`: pure controller behavior and client safety contract tests.
- `tests/node/newsletter-confirm-page-output.test.ts`: fresh Astro output, landing copy and noindex contract tests.
- `tests/node/newsletter-governance.test.ts`: source/output truth gate for the approved policy version, lifecycle and runbook.
- `tests/helpers.ts`: typed D1 env and common request builders.

### Task 1: D1 binding, migration, and Vitest storage harness

**Files:**
- Create: `migrations/0001_newsletter_consent.sql`
- Create: `tests/setup.ts`
- Create: `tests/newsletter-store.test.ts`
- Modify: `wrangler.jsonc`
- Modify: `vitest.config.ts`
- Modify: `functions/types.d.ts`
- Modify: `functions/_shared/env.ts`
- Modify: `tests/helpers.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Wrangler `NEWSLETTER_DB` D1 binding and Cloudflare test APIs `readD1Migrations()` and `applyD1Migrations()`.
- Produces: `NewsletterEnv["NEWSLETTER_DB"]: D1Database`, `TEST_MIGRATIONS: D1Migration[]`, four tables, immutable-ledger triggers, `newsletter_confirmation_consumed`, and `newsletter_broadcast_recipients`.

- [ ] **Step 1: Write the failing schema contract test**

```ts
// tests/newsletter-store.test.ts
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("newsletter D1 schema", () => {
  it("creates the authoritative tables and broadcast view", async () => {
    const rows = await env.NEWSLETTER_DB.prepare(
      "SELECT name, type FROM sqlite_master WHERE name LIKE 'newsletter_%' ORDER BY name",
    ).all<{ name: string; type: string }>();

    expect(rows.results).toEqual(expect.arrayContaining([
      { name: "newsletter_broadcast_recipients", type: "view" },
      { name: "newsletter_confirmation_tokens", type: "table" },
      { name: "newsletter_consent_ledger", type: "table" },
      { name: "newsletter_jobs", type: "table" },
      { name: "newsletter_subscriptions", type: "table" },
    ]));
  });
});
```

- [ ] **Step 2: Run the schema test to verify RED**

Run: `npm run test:workers -- tests/newsletter-store.test.ts`

Expected: FAIL because `env.NEWSLETTER_DB` and the migration setup do not exist.

- [ ] **Step 3: Add the binding, migration loader, generated types, and schema**

Before any create call, list the account databases and stop on an exact-name
collision. Create only missing exact names through the current Cloudflare API
using `primary_location_hint: "enam"` and
`read_replication: {"mode":"disabled"}`; capture the returned UUIDs and write
those real values into the matching Pages environments. Do not type, infer, or
invent UUIDs. The controller performs this explicitly authorized external step;
an implementation worker must not repeat it:

```powershell
# Controller preflight/API intent (not a shell command):
# GET  /accounts/{account_id}/d1/database
# POST /accounts/{account_id}/d1/database
# { name, primary_location_hint: "enam", read_replication: { mode: "disabled" } }
```

Add the returned database IDs to explicit `env.preview.d1_databases` and
`env.production.d1_databases` blocks in `wrangler.jsonc`. Bind local Pages
development explicitly to local storage under the same name and generate types
from the preview binding by changing the scripts to:

```json
{
  "pages:dev": "wrangler pages dev dist --d1 NEWSLETTER_DB=NEWSLETTER_DB",
  "types:generate": "wrangler types --env preview functions/types.d.ts --include-runtime=false",
  "types:check": "wrangler types --env preview functions/types.d.ts --include-runtime=false --check"
}
```

Configure Vitest and the setup file:

```ts
// vitest.config.ts additions
import path from "node:path";
import { readD1Migrations } from "@cloudflare/vitest-pool-workers/config";

cloudflareTest(async () => ({
  wrangler: { configPath: "./wrangler.jsonc" },
  miniflare: {
    d1Databases: ["NEWSLETTER_DB"],
    bindings: {
      TEST_MIGRATIONS: await readD1Migrations(path.join(__dirname, "migrations")),
    },
  },
}));

// test config addition
setupFiles: ["./tests/setup.ts"]
```

```ts
// tests/setup.ts
import { applyD1Migrations, env } from "cloudflare:test";
import { beforeEach } from "vitest";

beforeEach(async () => {
  await applyD1Migrations(env.NEWSLETTER_DB, env.TEST_MIGRATIONS);
});
```

Create `migrations/0001_newsletter_consent.sql` with these exact constraints
and trigger effects:

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE newsletter_subscriptions (
  id TEXT PRIMARY KEY,
  email_normalized TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  consent_state TEXT NOT NULL CHECK (consent_state IN ('pending', 'confirmed', 'expired')),
  policy_version TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  consent_source TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  confirmed_at TEXT,
  provider_state TEXT NOT NULL CHECK (provider_state IN
    ('not_started', 'pending', 'reconciling', 'reconciled', 'blocked_global_opt_out')),
  provider_contact_id TEXT,
  reconciled_at TEXT,
  purged_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE newsletter_confirmation_tokens (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES newsletter_subscriptions(id),
  token_sha256 TEXT NOT NULL UNIQUE CHECK
    (length(token_sha256) = 64 AND token_sha256 NOT GLOB '*[^0-9a-f]*'),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  delivery_state TEXT NOT NULL CHECK
    (delivery_state IN ('dispatching', 'sent', 'failed')),
  delivered_at TEXT,
  consumed_at TEXT,
  consumption_request_id TEXT,
  revoked_at TEXT
);

CREATE INDEX newsletter_live_tokens
  ON newsletter_confirmation_tokens(subscription_id, expires_at)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;

CREATE TABLE newsletter_consent_ledger (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES newsletter_subscriptions(id),
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  request_id TEXT NOT NULL,
  policy_version TEXT,
  consent_text TEXT,
  consent_source TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(metadata_json))
);

CREATE TABLE newsletter_jobs (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES newsletter_subscriptions(id),
  kind TEXT NOT NULL CHECK (kind = 'resend_reconcile'),
  dedupe_key TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK (state IN ('pending', 'leased', 'completed', 'blocked')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at TEXT NOT NULL,
  lease_until TEXT,
  last_error_code TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX newsletter_due_jobs
  ON newsletter_jobs(state, available_at, lease_until);

CREATE TRIGGER newsletter_ledger_no_update
BEFORE UPDATE ON newsletter_consent_ledger
BEGIN SELECT RAISE(ABORT, 'newsletter consent ledger is append-only'); END;

CREATE TRIGGER newsletter_ledger_no_delete
BEFORE DELETE ON newsletter_consent_ledger
BEGIN SELECT RAISE(ABORT, 'newsletter consent ledger is append-only'); END;

CREATE TRIGGER newsletter_confirmation_consumed
AFTER UPDATE OF consumed_at ON newsletter_confirmation_tokens
WHEN OLD.consumed_at IS NULL AND NEW.consumed_at IS NOT NULL
BEGIN
  UPDATE newsletter_subscriptions
     SET consent_state = 'confirmed', confirmed_at = NEW.consumed_at,
         provider_state = 'pending', updated_at = NEW.consumed_at
   WHERE id = NEW.subscription_id;
  UPDATE newsletter_confirmation_tokens
     SET revoked_at = NEW.consumed_at
   WHERE subscription_id = NEW.subscription_id AND id <> NEW.id
     AND consumed_at IS NULL AND revoked_at IS NULL;
  INSERT INTO newsletter_consent_ledger
    (id, subscription_id, event_type, occurred_at, request_id, metadata_json)
  VALUES
    ('ledger-confirm-' || NEW.id, NEW.subscription_id, 'mailbox_confirmed',
     NEW.consumed_at, NEW.consumption_request_id, json_object('token_id', NEW.id));
  INSERT OR IGNORE INTO newsletter_jobs
    (id, subscription_id, kind, dedupe_key, state, available_at, created_at)
  VALUES
    ('job-resend-' || NEW.id, NEW.subscription_id, 'resend_reconcile',
     'resend_reconcile:' || NEW.id, 'pending', NEW.consumed_at, NEW.consumed_at);
END;

CREATE VIEW newsletter_broadcast_recipients AS
SELECT id, email_normalized, name, confirmed_at, reconciled_at
  FROM newsletter_subscriptions
 WHERE consent_state = 'confirmed' AND provider_state = 'reconciled';
```

Regenerate `functions/types.d.ts`, extend `NewsletterEnv` with all reused secrets,
and add this test-only declaration to `tests/helpers.ts`:

```ts
declare module "cloudflare:test" {
  interface ProvidedEnv extends NewsletterEnv {
    TEST_MIGRATIONS: D1Migration[];
  }
}
```

- [ ] **Step 4: Run schema and type tests to verify GREEN**

Run: `npm run test:workers -- tests/newsletter-store.test.ts && npm run types:check`

Expected: PASS; generated types include `NEWSLETTER_DB: D1Database`.

- [ ] **Step 5: Commit the storage foundation**

```bash
git add migrations/0001_newsletter_consent.sql wrangler.jsonc vitest.config.ts tests/setup.ts tests/newsletter-store.test.ts functions/types.d.ts functions/_shared/env.ts tests/helpers.ts package.json
git commit -m "feat: add newsletter consent storage"
```

### Task 2: Token cryptography and pending-registration store

**Files:**
- Create: `functions/_shared/newsletter/types.ts`
- Create: `functions/_shared/newsletter/crypto.ts`
- Create: `functions/_shared/newsletter/store.ts`
- Modify: `tests/newsletter-store.test.ts`

**Interfaces:**
- Consumes: `D1Database`, Web Crypto, and the Task 1 schema.
- Produces: `generateConfirmationToken(): Promise<ConfirmationToken>`, `hashConfirmationToken(rawToken: string): Promise<string>`, `isConfirmationToken(value: string): boolean`, `createNewsletterStore(db: D1Database): NewsletterStore`, and the exact `NewsletterStore` methods shown below.

- [ ] **Step 1: Write failing crypto, registration, neutral-state, expiry, and append-only tests**

```ts
it("generates a 32-byte base64url token and persists only its digest", async () => {
  const token = await generateConfirmationToken();
  const store = createNewsletterStore(env.NEWSLETTER_DB);
  const result = await store.registerPending(pendingInput(token));
  expect(result).toMatchObject({ kind: "send", tokenId: expect.any(String) });
  const row = await env.NEWSLETTER_DB.prepare(
    "SELECT token_sha256 FROM newsletter_confirmation_tokens",
  ).first<{ token_sha256: string }>();
  expect(token.raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(row?.token_sha256).toBe(token.sha256);
  expect(JSON.stringify(row)).not.toContain(token.raw);
});

it("reuses a live delivered pending state without creating another token", async () => {
  const store = createNewsletterStore(env.NEWSLETTER_DB);
  const first = await store.registerPending(pendingInput(await generateConfirmationToken()));
  await store.markConfirmationEmailSent(assertSend(first).tokenId, "email-1", NOW);
  const second = await store.registerPending(pendingInput(await generateConfirmationToken()));
  expect(second).toEqual({ kind: "stored" });
});

it("rejects ledger updates and deletes", async () => {
  const store = createNewsletterStore(env.NEWSLETTER_DB);
  await store.registerPending(pendingInput(await generateConfirmationToken()));
  await expect(env.NEWSLETTER_DB.prepare(
    "UPDATE newsletter_consent_ledger SET event_type = 'changed'",
  ).run()).rejects.toThrow("append-only");
  await expect(env.NEWSLETTER_DB.prepare(
    "DELETE FROM newsletter_consent_ledger",
  ).run()).rejects.toThrow("append-only");
});
```

Add a clock-controlled test proving that an undelivered token younger than 15
minutes suppresses duplication, while one at least 15 minutes old is revoked and
replaced. Add a confirmed-row test proving the result is still `{kind:"stored"}`.
Add cleanup tests proving a row at 29 days remains intact, a row at 30 days is
changed to `expired`, its email becomes `expired+{id}@invalid.local`, its name is
empty, `purged_at` is set, all tokens are revoked, and exactly one
`pending_purged` event exists. Prove a second cleanup is idempotent, confirmed
rows are untouched, and one call affects at most 20 rows.

- [ ] **Step 2: Run focused tests to verify RED**

Run: `npm run test:workers -- tests/newsletter-store.test.ts -t "token|pending|ledger"`

Expected: FAIL because crypto and store modules are absent.

- [ ] **Step 3: Define exact domain types and token implementation**

```ts
// functions/_shared/newsletter/types.ts
export const CONSENT_POLICY_VERSION = "2026-07-13";
export const CONSENT_TEXT = "Concordo em receber a newsletter Integra Ação e com o tratamento dos meus dados conforme a Política de Privacidade. Posso cancelar a inscrição a qualquer momento.";
export const TOKEN_TTL_MS = 24 * 60 * 60 * 1_000;
export const UNDELIVERED_STALE_MS = 15 * 60 * 1_000;
export const PENDING_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;

export interface ConfirmationToken { raw: string; sha256: string }
export interface RegisterPendingInput {
  id: string; tokenId: string; tokenSha256: string; name: string;
  emailNormalized: string; policyVersion: string; consentText: string;
  consentSource: string; requestId: string; now: string; expiresAt: string;
}
export type RegisterPendingResult =
  | { kind: "send"; subscriptionId: string; tokenId: string }
  | { kind: "stored" };
export type ConsumeTokenResult =
  | { kind: "confirmed"; subscriptionId: string }
  | { kind: "already-consumed" }
  | { kind: "expired" }
  | { kind: "invalid" };
export interface ReconciliationJob {
  id: string; subscriptionId: string; attempts: number;
  emailNormalized: string; name: string; policyVersion: string;
  consentText: string; consentSource: string; confirmedAt: string;
}
```

```ts
// functions/_shared/newsletter/crypto.ts
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const bytesToBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export async function hashConfirmationToken(rawToken: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawToken));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const isConfirmationToken = (value: string): boolean => TOKEN_PATTERN.test(value);

export async function generateConfirmationToken(): Promise<ConfirmationToken> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = bytesToBase64Url(bytes);
  return { raw, sha256: await hashConfirmationToken(raw) };
}
```

- [ ] **Step 4: Implement the D1 store with explicit statements**

Define this exact public interface:

```ts
export interface NewsletterStore {
  registerPending(input: RegisterPendingInput): Promise<RegisterPendingResult>;
  markConfirmationEmailSent(tokenId: string, providerMessageId: string, now: string): Promise<void>;
  markConfirmationEmailFailed(tokenId: string, errorCode: string, now: string): Promise<void>;
  consumeConfirmation(tokenSha256: string, requestId: string, now: string): Promise<ConsumeTokenResult>;
  claimReconciliationJob(now: string, leaseUntil: string, preferredSubscriptionId?: string): Promise<ReconciliationJob | null>;
  completeReconciliation(jobId: string, subscriptionId: string, providerContactId: string, now: string): Promise<void>;
  blockGlobalOptOut(jobId: string, subscriptionId: string, now: string): Promise<void>;
  retryReconciliation(jobId: string, subscriptionId: string, errorCode: string, availableAt: string, now: string): Promise<void>;
  purgeExpiredPending(now: string, limit?: number): Promise<number>;
}
```

Use `db.batch()` for pending subscription upsert, request ledger insertion, stale
token revocation, and conditional token insertion. The final token insert must be:

```sql
INSERT INTO newsletter_confirmation_tokens
  (id, subscription_id, token_sha256, created_at, expires_at, delivery_state)
SELECT ?1, id, ?2, ?3, ?4, 'dispatching'
  FROM newsletter_subscriptions
 WHERE email_normalized = ?5 AND consent_state = 'pending'
   AND NOT EXISTS (
     SELECT 1 FROM newsletter_confirmation_tokens
      WHERE subscription_id = newsletter_subscriptions.id
        AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at > ?3
   )
RETURNING subscription_id
```

`markConfirmationEmailFailed` must set `delivery_state='failed'` and
`revoked_at=now` before appending `confirmation_email_failed`. Store only the
minimized error code, never email, URL, raw token, or digest, in ledger metadata.

`purgeExpiredPending(now, limit = 20)` clamps the limit to `1..20`, identifies
rows whose `requested_at` is at least 30 days old and whose consent state is
still `pending`, then uses one `db.batch()` per bounded candidate set to revoke
tokens, replace email/name, set `expired`/`purged_at`, and insert a deterministic
`pending_purged` ledger event. The conditional update includes
`consent_state='pending' AND purged_at IS NULL`; only successfully updated IDs get
an event. The tombstone uses the subscription UUID only and never hashes or
embeds the original email.

- [ ] **Step 5: Run all store tests to verify GREEN**

Run: `npm run test:workers -- tests/newsletter-store.test.ts`

Expected: PASS including token format, stale replacement, confirmed neutrality,
30-day PII minimization, the 20-row bound, and database-enforced append-only behavior.

- [ ] **Step 6: Commit crypto and store**

```bash
git add functions/_shared/newsletter/types.ts functions/_shared/newsletter/crypto.ts functions/_shared/newsletter/store.ts tests/newsletter-store.test.ts
git commit -m "feat: store pending newsletter consent"
```

### Task 3: Confirmation email and neutral initial endpoint

**Files:**
- Create: `functions/_shared/newsletter/email.ts`
- Create: `tests/newsletter-email.test.ts`
- Modify: `functions/api/newsletter.ts`
- Modify: `functions/_shared/env.ts`
- Modify: `.dev.vars.example`
- Modify: `.env.example`
- Modify: `tests/newsletter.test.ts`
- Modify: `tests/helpers.ts`

**Interfaces:**
- Consumes: `NewsletterPendingStore.registerPending`, `markConfirmationEmailSent`,
  `markConfirmationEmailFailed`, `purgeExpiredPending`, existing HTTP/Turnstile
  helpers, `RESEND_TRANSACTIONAL_API_KEY`, `CONTACT_EMAIL_FROM`, and the explicit
  environment-specific `NEWSLETTER_CONFIRMATION_ORIGIN`.
- Produces: `sendConfirmationEmail(input: ConfirmationEmailInput): Promise<ConfirmationEmailResult>` and `POST /api/newsletter -> 202` without Contacts API mutation.

- [ ] **Step 1: Replace provider-mutation tests with failing pending-flow tests**

```ts
it.each(["pending", "confirmed", "blocked_global_opt_out"])(
  "returns the same neutral 202 for stored state %s",
  async (storedState) => {
    await seedStoredSubscription(env.NEWSLETTER_DB, storedState);
    installTurnstileAndEmailProvider();
    const response = await subscribe();
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      message: "Se o endereço puder receber a newsletter, enviaremos as próximas instruções por e-mail.",
    });
  },
);

it("does not call Resend Contacts, Segments, or Topics before confirmation", async () => {
  const requests = installTurnstileAndEmailProvider();
  expect((await subscribe()).status).toBe(202);
  expect(requests.filter((request) => {
    const url = new URL(request.url);
    return url.hostname === "api.resend.com" && url.pathname !== "/emails";
  })).toEqual([]);
});
```

Add email tests asserting the HTML and text contain
`/integra-acao/newsletter/confirmar/#token=${rawToken}`, no `?token=`, an
`Idempotency-Key` equal to token ID, and one retry with the same key/body after
`429`, timeout, or response-loss ambiguity.
Add an endpoint test proving the successful stored path schedules one bounded
pending-data cleanup with `context.waitUntil` and that a cleanup rejection is
captured without changing the neutral response or logging PII.

- [ ] **Step 2: Run endpoint and email tests to verify RED**

Run: `npm run test:workers -- tests/newsletter.test.ts tests/newsletter-email.test.ts`

Expected: FAIL because the endpoint still mutates Resend Contacts and reports
immediate subscription success.

- [ ] **Step 3: Implement the email adapter**

```ts
export interface ConfirmationEmailInput {
  apiKey: string; from: string; to: string; name: string;
  rawToken: string; tokenId: string; confirmationOrigin: string;
}
export type ConfirmationEmailResult =
  | { ok: true; messageId: string; attempts: 1 | 2 }
  | {
      ok: false;
      errorCode:
        | "configuration"
        | "timeout"
        | "network"
        | "rate_limited"
        | "provider_4xx"
        | "provider_5xx"
        | "idempotency_conflict"
        | "invalid_response";
      providerStatus?: number;
      attempts: 1 | 2;
    };
```

Build both text and escaped HTML in the module. Send `POST https://api.resend.com/emails`
with `Authorization: Bearer`, `Content-Type: application/json`, and
`Idempotency-Key: ${tokenId}`. Serialize once. Use the existing
`fetchWithTimeout`/bounded-response helpers and retry once with the exact same
body bytes and key for `429`, `5xx`, timeout/network loss, invalid/ambiguous 2xx,
or `409 concurrent_idempotent_requests`; do not retry
`409 invalid_idempotent_request` or other definitive `4xx`. Accept success only
when the bounded JSON response has a non-empty bounded string `id`. Bound each
attempt to at most 8 seconds, the retry delay to 500 ms, and the adapter's total
deadline below 20 seconds so the shared 30-second `waitUntil` budget retains
margin for the D1 CAS.

- [ ] **Step 4: Reduce `POST /api/newsletter` to pending storage plus email delivery**

Preserve the existing parsing, size limits, normalization, same-origin source,
and Turnstile behavior. Replace `subscribeContact()` with:

```ts
const confirmationToken = await generateConfirmationToken();
const now = new Date();
const pending = await createNewsletterStore(env.NEWSLETTER_DB).registerPending({
  subscriptionId: crypto.randomUUID(),
  tokenId: crypto.randomUUID(),
  tokenSha256: confirmationToken.sha256,
  name,
  email,
  policyVersion: CONSENT_POLICY_VERSION,
  consentText: CONSENT_TEXT,
  consentSource,
  requestId,
  now,
});
```

Only when `pending.kind === "send"`, pass a bounded delivery continuation to
`context.waitUntil`, with the raw token retained only in that in-memory closure.
The continuation validates the dedicated secret, sender and confirmation origin,
calls `sendConfirmationEmail`, then compare-and-sets sent or failed. Missing or
invalid delivery configuration and every post-storage provider/CAS error remain
neutral and must not change the response. Never convert a provider success into
`failed` merely because the sent-state CAS throws. Every successful D1 stored
state ends immediately with exactly:

```ts
return respond({
  ok: true,
  message: "Se o endereço puder receber a newsletter, enviaremos as próximas instruções por e-mail.",
}, 202);
```

Catch pre-storage D1 exceptions, emit a PII-free
`newsletter_storage_unavailable` event, and return `503`. Delete all initial-path
Resend Contacts/Segments/Topics code. After a stored state is durable, schedule
`store.purgeExpiredPending(now, 20)` separately through `context.waitUntil` with
a PII-free rejection handler; never make the neutral `202` depend on email or
opportunistic cleanup completion. Require same-origin request metadata and emit
no permissive CORS headers.

- [ ] **Step 5: Run endpoint and email tests to verify GREEN**

Run: `npm run test:workers -- tests/newsletter.test.ts tests/newsletter-email.test.ts`

Expected: PASS, including identical response bodies and absence of all provider
contact mutations.

- [ ] **Step 6: Commit the pending endpoint**

```bash
git add functions/_shared/newsletter/email.ts functions/api/newsletter.ts tests/newsletter.test.ts tests/newsletter-email.test.ts tests/helpers.ts
git commit -m "feat: send newsletter confirmation email"
```

### Task 4: Atomic confirmation API

**Files:**
- Create: `functions/api/newsletter/confirm.ts`
- Create: `tests/newsletter-confirm.test.ts`
- Modify: `functions/_shared/newsletter/store.ts`
- Modify: `tests/newsletter-store.test.ts`

**Interfaces:**
- Consumes: `isConfirmationToken`, `hashConfirmationToken`, `NewsletterStore.consumeConfirmation`, and D1 trigger `newsletter_confirmation_consumed`.
- Produces: `POST /api/newsletter/confirm` with `confirmed`, `already-processed`, `expired`, and `invalid` response states; exactly one ledger row and one reconciliation job.

- [ ] **Step 1: Write failing replay, expiry, and race tests**

```ts
it("consumes a live token once and makes replay side-effect free", async () => {
  const seeded = await seedDeliveredToken(env.NEWSLETTER_DB);
  expect((await confirm(seeded.rawToken)).status).toBe(200);
  expect((await confirm(seeded.rawToken)).status).toBe(200);
  expect(await scalar("SELECT count(*) FROM newsletter_consent_ledger WHERE event_type='mailbox_confirmed'"))
    .toBe(1);
  expect(await scalar("SELECT count(*) FROM newsletter_jobs WHERE kind='resend_reconcile'"))
    .toBe(1);
});

it("allows only one winner under concurrent confirmation", async () => {
  const seeded = await seedDeliveredToken(env.NEWSLETTER_DB);
  const responses = await Promise.all([confirm(seeded.rawToken), confirm(seeded.rawToken)]);
  const states = await Promise.all(responses.map((response) => response.json()));
  expect(states.map((body) => body.state).sort()).toEqual(["already-processed", "confirmed"]);
  expect(await scalar("SELECT count(*) FROM newsletter_jobs")).toBe(1);
});

it("does not consume an expired token", async () => {
  const seeded = await seedDeliveredToken(env.NEWSLETTER_DB, { expiresAt: "2026-08-19T00:00:00.000Z" });
  const response = await confirm(seeded.rawToken, "2026-08-20T00:00:00.000Z");
  expect(response.status).toBe(410);
  expect(await scalar("SELECT count(*) FROM newsletter_jobs")).toBe(0);
});
```

- [ ] **Step 2: Run confirmation tests to verify RED**

Run: `npm run test:workers -- tests/newsletter-confirm.test.ts tests/newsletter-store.test.ts -t "consume|replay|expired|concurrent"`

Expected: FAIL because the endpoint and store consumption method are absent.

- [ ] **Step 3: Implement the single-statement consume boundary**

Use this exact write in `consumeConfirmation`:

```sql
UPDATE newsletter_confirmation_tokens
   SET consumed_at = ?2, consumption_request_id = ?3
 WHERE token_sha256 = ?1 AND consumed_at IS NULL AND revoked_at IS NULL
   AND expires_at > ?2
RETURNING subscription_id
```

If it returns a row, return `{kind:"confirmed", subscriptionId}`. Otherwise query
the digest once: consumed means `{kind:"already-consumed"}`; present but
expired/revoked means `{kind:"expired"}`; absent means `{kind:"invalid"}`. Do not
add application-side ledger or job writes because the trigger is the atomic owner.

- [ ] **Step 4: Implement the confirmation handler and method guards**

Limit JSON to 2 KiB, require exactly a valid token string, hash it, and map results
to the exact bodies in the design. Export `onRequestPost`, plus GET/PUT/PATCH/DELETE
handlers returning `405` with `Allow: POST`. The handler retains the
`subscriptionId` returned by the confirmed result so Task 5 can prioritize that
subscription without another token or email lookup.
It schedules the same bounded `purgeExpiredPending(now, 20)` operation with
`context.waitUntil` for every syntactically valid token request, including an
unknown-token lookup, without delaying or altering the confirmation response.
Tests prove that this invalid-but-well-formed probe path schedules cleanup while
creating no subscription, ledger confirmation event, or reconciliation job.

- [ ] **Step 5: Run confirmation tests to verify GREEN**

Run: `npm run test:workers -- tests/newsletter-confirm.test.ts tests/newsletter-store.test.ts`

Expected: PASS with one winner, one ledger event, one job, replay safety, and
expiry safety.

- [ ] **Step 6: Commit atomic confirmation**

```bash
git add functions/api/newsletter/confirm.ts functions/_shared/newsletter/store.ts tests/newsletter-confirm.test.ts tests/newsletter-store.test.ts
git commit -m "feat: confirm newsletter consent atomically"
```

### Task 5: Resend provider adapter and forward reconciliation jobs

**Files:**
- Create: `functions/_shared/newsletter/provider.ts`
- Create: `functions/_shared/newsletter/reconcile.ts`
- Create: `tests/newsletter-reconcile.test.ts`
- Modify: `functions/_shared/newsletter/store.ts`
- Modify: `functions/_shared/newsletter/types.ts`
- Modify: `functions/api/newsletter.ts`
- Modify: `functions/api/newsletter/confirm.ts`

**Interfaces:**
- Consumes: `NewsletterStore.claimReconciliationJob`, existing bounded HTTP helpers, and Resend Contacts/Segments/Topics bindings.
- Produces: `createResendNewsletterProvider(config): NewsletterProvider`, `reconcileNewsletterJob(input): Promise<void>`, and `drainNewsletterJobs(input): Promise<void>`.

- [ ] **Step 1: Write failing lease, global-opt-out, ambiguity, retry, and gate tests**

```ts
it("leases a due job to only one concurrent worker", async () => {
  await seedConfirmedJob(env.NEWSLETTER_DB);
  const store = createNewsletterStore(env.NEWSLETTER_DB);
  const claims = await Promise.all([
    store.claimReconciliationJob(NOW, LEASE_UNTIL),
    store.claimReconciliationJob(NOW, LEASE_UNTIL),
  ]);
  expect(claims.filter(Boolean)).toHaveLength(1);
});

it("preserves a provider global opt-out without mutation", async () => {
  const requests = installResendProvider({ contactExists: true, unsubscribed: true });
  await drainNewsletterJobs({ env: newsletterEnvWithDb(), limit: 2 });
  expect(requests.filter((request) => request.method !== "GET")).toEqual([]);
  expect(await providerState()).toBe("blocked_global_opt_out");
  expect(await broadcastRecipientCount()).toBe(0);
});

it("reads back a segment mutation whose response was lost", async () => {
  const provider = installResendProvider({ ambiguousSegmentCommit: true });
  await drainNewsletterJobs({ env: newsletterEnvWithDb(), limit: 2 });
  expect(provider.segment).toBe(true);
  expect(provider.topic).toBe("opt_in");
  expect(await providerState()).toBe("reconciled");
  expect(await broadcastRecipientCount()).toBe(1);
});
```

Add equivalent ambiguous contact-create and Topic-opt-in cases, a failed read-back
case that leaves one `pending` job with `available_at` advanced, and a test proving
an unconfirmed subscription can never appear in the broadcast view.

- [ ] **Step 2: Run reconciliation tests to verify RED**

Run: `npm run test:workers -- tests/newsletter-reconcile.test.ts`

Expected: FAIL because provider and job-drain implementations do not exist.

- [ ] **Step 3: Implement the provider contract with mandatory read-back**

```ts
export type ProviderSnapshot =
  | { kind: "missing" }
  | { kind: "exists"; contactId: string; unsubscribed: boolean; inSegment: boolean; topic: "missing" | "opt_in" | "opt_out" }
  | { kind: "unavailable"; code: string };

export interface NewsletterProvider {
  read(emailOrContactId: string): Promise<ProviderSnapshot>;
  createConfirmedContact(job: ReconciliationJob): Promise<"applied" | "ambiguous" | "failed">;
  updateEvidence(contactId: string, job: ReconciliationJob): Promise<"applied" | "ambiguous" | "failed">;
  addSegment(contactId: string): Promise<"applied" | "ambiguous" | "failed">;
  optInTopic(contactId: string): Promise<"applied" | "ambiguous" | "failed">;
}
```

Reuse the current Resend endpoints and bounded parser. Never log the URL because
lookup may contain email. After every `ambiguous` result, call `read()` and accept
the step only when the target state is visible. Preserve `unsubscribed: true`
without PATCH/POST. For a missing contact, create it with consent properties,
Segment membership, and Topic `opt_in` only because this module is called from a
confirmed job.

- [ ] **Step 4: Implement atomic job claiming and retry-forward orchestration**

Claim with this single statement, binding the optional preferred subscription to
`?3`, then the oldest due job. A lease is eligible when `state='pending'` or when
`state='leased' AND lease_until <= now`. Use a 30-second lease.

```sql
UPDATE newsletter_jobs
   SET state = 'leased', lease_until = ?2, attempts = attempts + 1
 WHERE id = (
   SELECT id FROM newsletter_jobs
    WHERE kind = 'resend_reconcile'
      AND available_at <= ?1
      AND (state = 'pending' OR (state = 'leased' AND lease_until <= ?1))
    ORDER BY CASE WHEN subscription_id = ?3 THEN 0 ELSE 1 END,
             available_at, created_at
    LIMIT 1
 )
RETURNING id, subscription_id, attempts
```

Join the returned `subscription_id` to `newsletter_subscriptions` in the same
store method and return the exact `ReconciliationJob` fields defined in Task 2.
Implement delays exactly as `[1, 5, 15, 60, 360]` minutes, indexed by the claimed
attempt count and capped at 360 minutes.

```ts
export interface DrainNewsletterJobsInput {
  env: NewsletterEnv;
  preferredSubscriptionId?: string;
  limit: 2;
}

export async function drainNewsletterJobs(input: DrainNewsletterJobsInput): Promise<void> {
  const store = createNewsletterStore(input.env.NEWSLETTER_DB);
  for (let index = 0; index < input.limit; index += 1) {
    const now = new Date();
    const job = await store.claimReconciliationJob(
      now.toISOString(),
      new Date(now.getTime() + 30_000).toISOString(),
      index === 0 ? input.preferredSubscriptionId : undefined,
    );
    if (!job) return;
    await reconcileNewsletterJob({ env: input.env, job, store, now });
  }
}
```

On proven provider state, mark D1 `reconciled`, complete the job, and append
`provider_reconciled` in one `db.batch`. On global opt-out, mark
`blocked_global_opt_out`, block the job, and append `provider_global_opt_out`.
On unresolved ambiguity or provider failure, return the job to `pending`, append
`provider_retry_scheduled`, and store only an enum error code.

Call `context.waitUntil(drainNewsletterJobs({env, limit: 2}))` after every stored
initial request. Add this call after a newly confirmed result in the confirmation
endpoint:

```ts
context.waitUntil(drainNewsletterJobs({
  env,
  preferredSubscriptionId: result.subscriptionId,
  limit: 2,
}));
```

- [ ] **Step 5: Run reconciliation and confirmation tests to verify GREEN**

Run: `npm run test:workers -- tests/newsletter-reconcile.test.ts tests/newsletter-confirm.test.ts tests/newsletter.test.ts`

Expected: PASS for lease exclusivity, read-back ambiguity, global opt-out,
retry-forward scheduling, and broadcast view exclusion.

- [ ] **Step 6: Commit reconciliation**

```bash
git add functions/_shared/newsletter/provider.ts functions/_shared/newsletter/reconcile.ts functions/_shared/newsletter/store.ts functions/_shared/newsletter/types.ts functions/api/newsletter.ts functions/api/newsletter/confirm.ts tests/newsletter-reconcile.test.ts
git commit -m "feat: reconcile confirmed newsletter contacts"
```

### Task 6: Static confirmation landing and double-opt-in form copy

**Files:**
- Create: `src/scripts/newsletterConfirmation.ts`
- Create: `src/pages/integra-acao/newsletter/confirmar.astro`
- Create: `tests/newsletter-confirm-page.test.ts`
- Create: `tests/node/newsletter-confirm-page-output.test.ts`
- Modify: `src/components/NewsletterForm.astro`
- Modify: `src/pages/integra-acao/newsletter.astro`

**Interfaces:**
- Consumes: injected fragment reader, URL replacer, POST adapter, renderer, and `POST /api/newsletter/confirm` response states.
- Produces: `createNewsletterConfirmationController(dependencies)` with synchronous `initialize()` and explicit asynchronous `confirm()` methods, plus an Astro-prerendered `noindex,nofollow` landing with ready/submitting/success/error states and neutral initial-form messaging.

- [ ] **Step 1: Write failing controller behavior and built-page contract tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { createNewsletterConfirmationController } from "../src/scripts/newsletterConfirmation";

it("strips a valid fragment during initialization without confirming", () => {
  const postConfirmation = vi.fn();
  const replaceUrl = vi.fn();
  const render = vi.fn();
  const controller = createNewsletterConfirmationController({
    readFragment: () => `#token=${"a".repeat(43)}`,
    currentPath: () => "/integra-acao/newsletter/confirmar/",
    replaceUrl,
    postConfirmation,
    render,
  });
  controller.initialize();
  expect(replaceUrl).toHaveBeenCalledOnce();
  expect(postConfirmation).not.toHaveBeenCalled();
  expect(render).toHaveBeenLastCalledWith({ state: "ready" });
});

it("posts once only after explicit confirmation and clears the in-memory token", async () => {
  const postConfirmation = vi.fn().mockResolvedValue({ state: "confirmed" });
  const controller = makeController(postConfirmation);
  controller.initialize();
  await controller.confirm();
  await controller.confirm();
  expect(postConfirmation).toHaveBeenCalledTimes(1);
  expect(postConfirmation).toHaveBeenCalledWith("a".repeat(43));
});
```

Add tests for malformed/missing fragments, network failure, every server state,
and a `postConfirmation` promise that inspects controller state before resolving
to prove the token was cleared before awaiting I/O. Install throwing getters for
`localStorage`, `sessionStorage`, and `document.cookie` in the DOM test; controller
initialization and confirmation must still succeed because storage is not part of
its dependency surface. After building, parse the rendered HTML to assert exact
neutral form message, `noindex,nofollow`, the expired-link recovery target,
`aria-live`, and an explicit confirmation button.

- [ ] **Step 2: Run the page test to verify RED**

Run:

```powershell
npm run test:workers -- tests/newsletter-confirm-page.test.ts
npm run test:node -- tests/node/newsletter-confirm-page-output.test.ts
```

Expected: FAIL because the controller and landing page do not exist and current
form copy claims immediate confirmation.

- [ ] **Step 3: Build the static landing with explicit-click client logic**

Implement a pure controller with this exact public surface:

```ts
export type ConfirmationUiState =
  | { state: "invalid" }
  | { state: "ready" }
  | { state: "submitting" }
  | { state: "confirmed" | "already-processed" | "expired" | "error" };

export interface NewsletterConfirmationDependencies {
  readFragment(): string;
  currentPath(): string;
  replaceUrl(path: string): void;
  postConfirmation(token: string): Promise<{ state: string }>;
  render(state: ConfirmationUiState): void;
}

export function createNewsletterConfirmationController(
  dependencies: NewsletterConfirmationDependencies,
): { initialize(): void; confirm(): Promise<void> };
```

`initialize()` reads and validates `#token=` into a private closure, immediately
calls `replaceUrl(currentPath())`, and renders without network I/O. `confirm()` is
the only method that may call `postConfirmation`; it copies the token to a local
constant and clears the closure before invoking the dependency so retry/double
click cannot replay it.

Create an Astro page using `BaseLayout` with `noindex={true}` and
`nofollow={true}`, and existing
design tokens. Its thin adapter passes `window.location.hash`,
`history.replaceState`, text-only DOM rendering, and this POST-only function to
the controller:

```ts
const response = await fetch("/api/newsletter/confirm", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ token }),
  signal: AbortSignal.timeout(12_000),
});
```

The controller is the sole owner of clearing the closure token before it invokes
the adapter. The adapter must not keep or mutate another token copy beyond its
function argument. Use `textContent`, not `innerHTML`, for response copy. Show confirmed and
already-processed as success; show expired with a link to
`/integra-acao/newsletter/`; show invalid/network states without disclosing data.

- [ ] **Step 4: Update form and newsletter-page copy**

Replace the form success string with:

`Se o endereço puder receber a newsletter, enviaremos as próximas instruções por e-mail.`

Add directly below the checkbox:

`A inscrição só fica ativa depois que você abre o e-mail e confirma explicitamente o endereço.`

Update the FAQ to say no Resend list/Topic activation occurs before mailbox
confirmation and that expired links require a new form submission.

- [ ] **Step 5: Run page tests and build to verify GREEN**

Run:

```powershell
npm run test:workers -- tests/newsletter-confirm-page.test.ts
npm run test:node -- tests/node/newsletter-confirm-page-output.test.ts
npm run check
npm run build
```

Expected: PASS; build output contains
`dist/integra-acao/newsletter/confirmar/index.html` with `noindex,nofollow`, the
SEO output audit proves it is absent from all sitemaps, and there are no client
compile errors.

- [ ] **Step 6: Commit the confirmation UI**

```bash
git add src/scripts/newsletterConfirmation.ts src/pages/integra-acao/newsletter/confirmar.astro src/components/NewsletterForm.astro src/pages/integra-acao/newsletter.astro tests/newsletter-confirm-page.test.ts tests/node/newsletter-confirm-page-output.test.ts
git commit -m "feat: add explicit newsletter confirmation page"
```

### Task 7: Privacy, environment, operations, and Broadcast gate documentation

**Files:**
- Modify: `src/pages/politica-privacidade.astro`
- Modify: `.dev.vars.example`
- Modify: `README.md`
- Create: `tests/node/newsletter-governance.test.ts`

**Interfaces:**
- Consumes: approved design invariants, D1 database names, migration path, and `newsletter_broadcast_recipients`.
- Produces: deploy/runbook instructions that keep preview/production isolated and Broadcasts blocked until reconciliation.

- [ ] **Step 1: Write failing documentation assertions**

Create `tests/node/newsletter-governance.test.ts` with assertions for:

```ts
it("documents D1 authority and the broadcast gate", async () => {
  const [privacy, readme] = await Promise.all([
    readFile("src/pages/politica-privacidade.astro", "utf8"),
    readFile("README.md", "utf8"),
  ]);
  expect(privacy).toContain("Cloudflare D1");
  expect(privacy).toContain("não armazenamos o token de confirmação em formato legível");
  expect(privacy).toContain("30 dias");
  expect(privacy).toContain("não possui região primária na América do Sul");
  expect(readme).toContain("newsletter_broadcast_recipients");
  expect(readme).toContain("BROADCAST BLOQUEADO");
  expect(readme).toContain("integrautomacao-newsletter-preview");
  expect(readme).toContain("integrautomacao-newsletter-production");
});
```

- [ ] **Step 2: Run documentation assertions to verify RED**

Run: `npm run test:node -- tests/node/newsletter-governance.test.ts`

Expected: FAIL because the current privacy policy and README describe direct
Resend registration.

- [ ] **Step 3: Update privacy and environment documentation**

State that D1 stores pending and confirmed state, exact consent evidence,
append-only history, and reconciliation status; Resend receives data only after
mailbox confirmation; raw confirmation tokens are not retained in readable form;
links expire after 24 hours; unconfirmed name/email fields are pseudonymized after
30 days; the chosen `enam` hint is not Brazilian residency because D1 has no South
America primary location; and global Resend opt-outs are preserved.

Keep the existing `.dev.vars.example` names and add comments that both Resend keys
and `CONTACT_EMAIL_FROM` are reused. Do not add a token-signing secret or database
credential; `NEWSLETTER_DB` is a Pages binding, not an environment variable.

- [ ] **Step 4: Replace the README workflow and add exact migration gates**

Document these commands in this order:

```powershell
npx wrangler d1 migrations apply NEWSLETTER_DB --local
npx wrangler d1 migrations apply NEWSLETTER_DB --env preview --remote
npx wrangler d1 migrations list NEWSLETTER_DB --env preview --remote
npx wrangler d1 migrations apply NEWSLETTER_DB --env production --remote
npx wrangler d1 migrations list NEWSLETTER_DB --env production --remote
```

Document these pre-Broadcast audit queries:

```powershell
npx wrangler d1 execute NEWSLETTER_DB --env production --remote --command "SELECT consent_state, provider_state, count(*) AS total FROM newsletter_subscriptions GROUP BY consent_state, provider_state ORDER BY consent_state, provider_state"
npx wrangler d1 execute NEWSLETTER_DB --env production --remote --command "SELECT state, count(*) AS total FROM newsletter_jobs WHERE state <> 'completed' GROUP BY state ORDER BY state"
npx wrangler d1 execute NEWSLETTER_DB --env production --remote --command "SELECT count(*) AS eligible FROM newsletter_broadcast_recipients"
```

Document a daily, bounded pending-retention drain with a 24-hour operational
target; do not claim an unprovable hard 30-day maximum. The normal application
path also performs the tested cleanup opportunistically. The operator first
queries only an aggregate count, then—when non-zero—POSTs a freshly generated
syntactically valid probe token to `/api/newsletter/confirm`; the expected
`invalid` response schedules the same repository-owned bounded cleanup without
creating a subscription. Query again and repeat bounded batches until the count
is zero or the run limit is reached. The consolidated workflow later automates
this daily probe and treats a remaining overdue count as a failed privacy gate.
Do not use ad hoc PII updates and record only aggregate counts and timestamps:

```powershell
npx wrangler d1 execute NEWSLETTER_DB --env production --remote --command "SELECT count(*) AS overdue_pending FROM newsletter_subscriptions WHERE consent_state='pending' AND requested_at <= datetime('now','-30 days')"
$probe = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).TrimEnd('=').Replace('+','-').Replace('/','_')
Invoke-RestMethod -Method Post -Uri 'https://integrautomacao.com.br/api/newsletter/confirm' -ContentType 'application/json' -Body (@{token=$probe} | ConvertTo-Json -Compress)
```

If the aggregate is non-zero after the daily bounded drain, mark the
privacy gate `BLOCKED_BY_PENDING_RETENTION` and investigate; never export email or
name columns as evidence.

Place `BROADCAST BLOQUEADO` before the checklist and allow removal of that gate
only when intended-recipient counts reconcile, no due/leased job remains, no
intended recipient is provider-blocked, Resend read-back is current, and the
Broadcast selects both configured Segment and Topic.

- [ ] **Step 5: Run documentation, prose, and UTF-8 checks to verify GREEN**

Run: `npm run test:node -- tests/node/newsletter-governance.test.ts && npm run audit:prose && npm run audit:utf8`

Expected: PASS with no encoding regressions and all operational, 30-day
retention, data-location limitation, and Broadcast-gate strings present.

- [ ] **Step 6: Commit privacy and operations documentation**

```bash
git add src/pages/politica-privacidade.astro .dev.vars.example README.md tests/node/newsletter-governance.test.ts
git commit -m "docs: govern newsletter double opt-in"
```

### Task 8: Full regression and remote preview acceptance gate

**Files:**
- Modify: `README.md` only if an executed verification command differs from the documented runbook.

**Interfaces:**
- Consumes: all prior tasks and the preview D1/Pages environment.
- Produces: an evidence-backed local pass and a preview acceptance record; it does not authorize production Broadcasts.

- [ ] **Step 1: Run the complete local automated suite**

```powershell
npm test
npm run types:check
npm run check
npm run build
npm run audit:routes
npm run audit:redirects
npm run audit:prose
npm run audit:utf8
npm run audit:deps
```

Expected: every command exits `0`; Vitest includes replay, expiry, concurrent
consumption, neutral stored-state responses, append-only enforcement, provider
ambiguity, global opt-out, lease exclusivity, 30-day pending-data pseudonymization,
confirmation-page `noindex,nofollow`, and broadcast-view gating.
If `npm run audit:deps` is non-zero, record
`BLOCKED_BY_DEPENDENCY_ADVISORIES` with exact paths and do not proceed to remote
preview or production gates.

- [ ] **Step 2: Apply and inspect the preview migration**

```powershell
npx wrangler d1 migrations apply NEWSLETTER_DB --env preview --remote
npx wrangler d1 migrations list NEWSLETTER_DB --env preview --remote
npx wrangler d1 execute NEWSLETTER_DB --env preview --remote --command "SELECT name, type FROM sqlite_master WHERE name LIKE 'newsletter_%' ORDER BY name"
```

Expected: migration `0001_newsletter_consent.sql` is applied and all four tables
plus `newsletter_broadcast_recipients` are listed only in preview.
Read-only Cloudflare state must also show the preview database uses the captured
UUID, `enam` placement preference where reported, and read replication disabled;
if the control-plane response cannot report a hint after creation, retain the
redacted create response as the creation-time evidence.

- [ ] **Step 3: Perform the preview mailbox acceptance test**

Deploy a preview, submit one controlled mailbox, and verify in browser DevTools:

1. initial response is the neutral `202` body;
2. no Contacts/Segments/Topics request occurs before confirmation;
3. received link carries the token after `#token=` and no query token;
4. opening the page removes the fragment without a confirmation request;
5. clicking `Confirmar inscrição` sends one JSON POST;
6. a second click/replay is side-effect free; and
7. D1 moves from `pending/not_started` to `confirmed`, then to `reconciled` only
   after Resend read-back.

Also confirm the page source response and built artifact contain
`noindex,nofollow`, the URL is absent from the sitemap, and no request is sent on
fragment removal before the explicit button click.

Record only request IDs, token IDs, job IDs, timestamps, and state names. Do not
copy the mailbox, raw token, digest, or provider URL into the acceptance notes.

- [ ] **Step 4: Verify the production migration boundary without applying it early**

Run: `npx wrangler d1 migrations list NEWSLETTER_DB --env production --remote`

Expected before the approved production change window: preview and production
report independently, and production remains unchanged. During the approved
window, apply with
`npx wrangler d1 migrations apply NEWSLETTER_DB --env production --remote`, then
rerun the list command and the three documented audit queries.

- [ ] **Step 5: Keep Broadcasts blocked and commit any runbook correction**

Do not send a Broadcast as a test. If and only if an exact command required a
runbook correction, make that correction, rerun the affected command, then:

```bash
git add README.md
git commit -m "docs: correct newsletter acceptance runbook"
```

If no correction was required, create no commit for this task.

---

## Self-review checklist

- [ ] Spec coverage: D1 authority, pending-first flow, fragment token, explicit POST, atomic one-time consumption, append-only ledger, neutral `202`, post-confirmation-only Resend mutation, forward outbox reconciliation, environment separation, and Broadcast gate each map to a task.
- [ ] Security coverage: raw-token exclusion, expiry, replay, concurrent race, provider global opt-out, minimized logs, provider ambiguity, and 30-day PII minimization each have an automated test.
- [ ] Type consistency: `NewsletterEnv`, `ConfirmationToken`, `RegisterPendingInput`, `RegisterPendingResult`, `ConsumeTokenResult`, `ReconciliationJob`, `NewsletterStore`, `NewsletterProvider`, and `DrainNewsletterJobsInput` names and fields match every consuming task.
- [ ] Command consistency: all test commands use existing npm scripts or the installed Wrangler CLI; migration commands identify `NEWSLETTER_DB` and an explicit local/preview/production target.
- [ ] Documentation boundary: automated and preview checks do not claim production delivery or authorize a Broadcast.
