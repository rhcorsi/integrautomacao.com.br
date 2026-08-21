# Newsletter Mailbox Consent Design

**Status:** Approved for implementation

**Date:** 2026-08-20

## Context

The current `POST /api/newsletter` workflow writes a contact, segment membership,
consent properties, and Topic opt-in directly to Resend after Turnstile succeeds.
That proves a browser interaction but not control of the submitted mailbox. The
newsletter must therefore move to double opt-in before any Broadcast is allowed.

Cloudflare D1 is the authority for the consent lifecycle. Resend is a downstream
delivery provider whose state is derived from a confirmed D1 record and can lag
without changing the legal meaning of the D1 ledger.

## Goals

- Require an explicit mailbox confirmation before any Resend Contacts, Segment,
  or Topic mutation.
- Keep the raw confirmation token out of D1, logs, query strings, browser storage,
  and application telemetry.
- Make token consumption and all authoritative confirmation side effects atomic
  and one-time under replay and concurrent requests.
- Preserve an append-only consent ledger in D1.
- Return a neutral `202 Accepted` for every valid initial request whose email is
  already represented by a stored state, so the endpoint does not disclose
  whether the address is pending, confirmed, or blocked at the provider.
- Reconcile confirmed D1 state forward into Resend with an outbox/job model and
  provider read-back after ambiguous responses.
- Keep preview and production data in separate D1 databases.
- Block Broadcast use until every intended recipient is confirmed and reconciled.

## Non-goals

- Sending Broadcasts from this repository.
- Replacing Resend, Turnstile, Astro, Cloudflare Pages, or Vitest.
- Introducing an ORM, queue service, framework, SDK, or required npm dependency.
- Treating a Resend contact, segment, Topic, or global subscription field as the
  source of truth for mailbox consent.
- Automatically reversing a Resend global opt-out.

## Global constraints

- Runtime: Cloudflare Pages Functions with compatibility date `2026-07-13` and
  exact Node.js build version `22.23.2`.
- Database binding name: `NEWSLETTER_DB`.
- Production database name: `integrautomacao-newsletter-production`.
- Preview database name: `integrautomacao-newsletter-preview`.
- Both remote databases are created with primary location hint `enam` and read
  replication disabled. Cloudflare currently offers no South America D1 primary
  location; the hint is a latency preference, not a residency guarantee. No
  jurisdiction restriction is asserted by this design.
- Local Pages development uses a local D1 database through the same
  `NEWSLETTER_DB` binding.
- Runtime integrations use three deliberately separate credentials:
  `RESEND_SEND_API_KEY` remains exclusive to the contact form,
  `RESEND_TRANSACTIONAL_API_KEY` sends newsletter confirmation messages, and
  `RESEND_CONTACTS_API_KEY` reconciles confirmed contacts. Newsletter also uses
  `TURNSTILE_SECRET_KEY`, `RESEND_SEGMENT_ID`, `RESEND_TOPIC_ID`,
  `CONTACT_EMAIL_FROM`, and an explicit `NEWSLETTER_CONFIRMATION_ORIGIN` whose
  preview value never points at production. No legacy or cross-purpose fallback
  is allowed.
- No new mandatory npm package or external service is introduced.
- Confirmation tokens contain 32 bytes from `crypto.getRandomValues`, are encoded
  as unpadded base64url, expire after 24 hours, and are stored only as lowercase
  SHA-256 hex digests.
- The canonical confirmation page is
  `/integra-acao/newsletter/confirmar/`.
- The confirmation page is a utility route with `noindex,nofollow`; it is absent
  from every sitemap and has a self-canonical only for URL consistency.
- The confirmation API is `POST /api/newsletter/confirm` and never accepts a
  token in a URL or query string.
- The consent policy version remains `2026-07-13` until the privacy copy itself
  receives a separately reviewed version change.

## Authority and state model

`newsletter_subscriptions` is the current authoritative state. It contains one
row per active normalized email and has three consent states:

- `pending`: a valid request and consent statement were recorded, but mailbox
  control has not been confirmed.
- `confirmed`: a live, unexpired token was consumed through the explicit
  confirmation POST.
- `expired`: the mailbox was never confirmed and the 30-day pending-retention
  window elapsed; name and email were pseudonymized and all tokens revoked.

Provider delivery is orthogonal and uses these states:

- `not_started`: mailbox consent is not confirmed.
- `pending`: a `resend_reconcile` job exists or is retryable.
- `reconciling`: a worker has a bounded lease on the job.
- `reconciled`: Resend read-back proves the contact is not globally unsubscribed,
  belongs to the configured Segment, and has the configured Topic at `opt_in`.
- `blocked_global_opt_out`: Resend reported a global opt-out; no provider mutation
  is attempted and the D1 mailbox confirmation remains intact.

Only `confirmed` plus `reconciled` is broadcast-eligible. The migration exposes
that rule as the `newsletter_broadcast_recipients` view. Provider failures never
roll back or falsify mailbox confirmation.

## Data model

### `newsletter_subscriptions`

One row per active normalized email. It stores the current name, normalized email,
consent state, exact accepted policy version/text/source, request timestamp,
confirmation timestamp, provider state, provider contact ID, reconciliation
timestamp, purge timestamp, and created/updated timestamps. The email column is
unique with case-insensitive comparison. A purged pending row replaces name with
an empty string and email with a non-routable tombstone derived only from the row
ID; this breaks lookup by the original address without deleting the minimal
append-only evidence.

### `newsletter_confirmation_tokens`

Stores token ID, subscription ID, SHA-256 digest, creation/expiry timestamps,
delivery state, delivery timestamp, consumption timestamp, consumption request
ID, and revocation timestamp. The raw token is never inserted. Token digest is
unique. A partial index supports lookup of live, unconsumed tokens.

### `newsletter_consent_ledger`

Records immutable events including `pending_created`, `request_received`,
`confirmation_email_sent`, `confirmation_email_failed`, `mailbox_confirmed`,
`provider_reconciled`, `provider_global_opt_out`, and `provider_retry_scheduled`.
It also records `pending_purged` when the 30-day minimization rule runs.
Rows contain subscription ID, event timestamp, request ID, policy evidence where
applicable, and minimized structured metadata. Database triggers abort every
`UPDATE` and `DELETE`, making the table append-only at the database boundary.

### `newsletter_jobs`

Stores durable `resend_reconcile` jobs with a unique deduplication key, state,
attempt count, availability time, lease timestamp, last minimized error code,
and completion timestamp. It contains no raw token. Atomic `UPDATE ... RETURNING`
claims one available job and prevents concurrent workers from owning the same
lease.

### Atomic confirmation trigger

An `AFTER UPDATE OF consumed_at` trigger on
`newsletter_confirmation_tokens`, guarded by `OLD.consumed_at IS NULL` and
`NEW.consumed_at IS NOT NULL`, performs all authoritative effects in the same
SQLite statement:

1. sets the subscription to `confirmed` and provider state to `pending`;
2. revokes every other unconsumed token for the subscription;
3. appends exactly one `mailbox_confirmed` ledger event; and
4. inserts exactly one deduplicated `resend_reconcile` job.

The application consumes with one conditional `UPDATE ... RETURNING` requiring
matching digest, `consumed_at IS NULL`, `revoked_at IS NULL`, and
`expires_at > now`. This is the race boundary. Replay, expiry, and two concurrent
POSTs cannot produce a second ledger event or job.

## Initial request flow

`POST /api/newsletter` retains the existing content-type, body-size, honeypot,
LGPD checkbox, name/email, same-origin source, and Turnstile checks.

After validation:

1. Normalize the email and prepare the exact consent evidence.
2. Generate one raw token and its SHA-256 digest in memory.
3. Insert the subscription when absent and append `request_received`.
4. Insert a token only when no delivered, live, unconsumed token exists. A stale
   undelivered token older than 15 minutes is revoked before replacement.
5. If this request inserted a token, schedule one bounded transactional
   confirmation-email continuation through `POST /emails` using only
   `RESEND_TRANSACTIONAL_API_KEY`, `CONTACT_EMAIL_FROM`, and the explicitly
   configured `NEWSLETTER_CONFIRMATION_ORIGIN`. The `Idempotency-Key` is exactly
   the token ID and therefore is stable across the one permitted retry while
   revealing no token. The identical serialized body and key are reused.
6. On confirmed delivery, record `confirmation_email_sent`. On a definitive or
   still-ambiguous failure after the bounded retry, revoke the token and record
   `confirmation_email_failed`; a later initial request can create a fresh token.
7. Return the same status and body for newly pending, already pending, already
   confirmed, provider-blocked, and email-delivery-failed stored states:

   ```json
   {
     "ok": true,
     "message": "Se o endereço puder receber a newsletter, enviaremos as próximas instruções por e-mail."
   }
   ```

   The status is always `202` for these stored states. Validation, Turnstile,
   unsupported media type, body limit, and D1 availability errors retain distinct
   non-enumerating `4xx` or `503` responses.

No initial-request code path calls the Resend Contacts, Segments, or Topics APIs.

## Confirmation email and fragment transport

The email subject is `Confirme sua inscrição na newsletter Integra Ação`. Its
primary link uses the environment-specific, validated confirmation origin;
production resolves to:

`https://integrautomacao.com.br/integra-acao/newsletter/confirmar/#token={raw-token}`

The raw token is present only in the email body, the browser fragment, and the
in-memory JavaScript closure. URL fragments are not sent in HTTP requests. The
landing script reads the fragment, immediately calls `history.replaceState` to
remove it from the visible URL, and never writes it to cookies, `localStorage`,
`sessionStorage`, DOM attributes, analytics, or logs.

Opening the link does not confirm anything. The page shows the mailbox-confirmation
explanation and an enabled `Confirmar inscrição` button only when a syntactically
valid token was captured. A user click performs the explicit POST.

## Confirmation API flow

`POST /api/newsletter/confirm` accepts JSON `{ "token": string }`, rejects other
methods, limits the body to 2 KiB, and applies `Cache-Control: no-store`. It hashes
the token and calls the atomic store operation.

- First valid consumption returns `200` with
  `{"ok":true,"state":"confirmed","message":"Inscrição confirmada. A sincronização da lista pode levar alguns instantes."}`.
- Replay of the consumed token returns `200` with
  `{"ok":true,"state":"already-processed","message":"Este link já foi processado."}`
  and creates no new side effect.
- An expired or revoked token returns `410` with
  `{"ok":false,"state":"expired","message":"Este link expirou. Solicite uma nova confirmação pelo formulário."}`.
- An unknown well-formed token returns `400` with
  `{"ok":false,"state":"invalid","message":"Link de confirmação inválido."}`.

After first consumption, `context.waitUntil` starts a bounded reconciliation
drain. The response does not wait for Resend and never claims provider
reconciliation is complete.

## Forward reconciliation

`functions/_shared/newsletter/provider.ts` owns raw Resend HTTP calls and
read-back. `functions/_shared/newsletter/reconcile.ts` owns job leasing and the
state machine. Every initial or confirmation request opportunistically drains at
most two due jobs with bounded deadlines; confirmation prioritizes the newly
created job. This provides retry progress without adding Cloudflare Queues,
Workflows, or a scheduler.

For a confirmed subscription, reconciliation:

1. looks up the Resend contact;
2. if globally unsubscribed, records `blocked_global_opt_out`, completes the job,
   and performs no mutation;
3. otherwise creates or updates the contact with the immutable consent evidence;
4. ensures Segment membership;
5. applies Topic `opt_in` only after mailbox confirmation;
6. reads contact, Segment, and Topic back; and
7. marks D1 `reconciled` only when all three provider gates are proven.

A thrown request or `5xx` after a possible provider mutation is ambiguous. The
provider adapter reads state back before classifying the step. If read-back proves
the target state, the job advances; otherwise it schedules forward retry with
bounded exponential delays of 1, 5, 15, 60, and 360 minutes. It never compensates
backward by removing a confirmed contact or revoking D1 consent.

## Pending-data retention and minimization

An unconfirmed request becomes eligible for mandatory pseudonymization exactly
30 days after its most recent request timestamp. We do not claim a hard
30-day maximum that opportunistic serverless execution cannot prove. The
operational target is to drain every eligible row within 24 hours, backed by a
daily repository-owned maintenance run, overdue-count monitoring, and the same
cleanup on normal request traffic. A bounded cleanup operation selects at most
20 overdue `pending` rows per batch, revokes their tokens, changes the
subscription state to `expired`, replaces the email with
`expired+{subscription-id}@invalid.local`, clears the name, sets `purged_at`, and
appends one `pending_purged` ledger event. It never touches confirmed records or
provider-reconciled state.

Every initial and confirmation request schedules this cleanup opportunistically
with `context.waitUntil`; the runbook and consolidated workflow also include a
daily bounded drain plus an overdue aggregate alert so the 24-hour operational
target does not depend solely on public traffic. A non-zero overdue count after
the scheduled drain blocks the privacy gate until investigated.
Tests prove the boundary at 29/30 days, idempotence, the 20-row bound, token
revocation, PII removal, and confirmed-row preservation. This is an operational
data-minimization rule, not a claim that D1 is located in Brazil or that it alone
completes legal review.

## Broadcast gate

Broadcasts remain operationally blocked until all of these are true:

- the D1 migrations are applied to production;
- every intended recipient appears in `newsletter_broadcast_recipients`;
- no `pending` or `reconciling` job exists for the intended audience;
- no intended recipient has `blocked_global_opt_out`;
- Resend read-back reconciliation is current; and
- the Broadcast is configured with both `RESEND_SEGMENT_ID` and
  `RESEND_TOPIC_ID`.

The repository README carries exact D1 audit queries and makes this a release
gate. A successful unit test, build, or migration does not authorize a Broadcast.

## Preview, production, and migrations

Wrangler config is the source of truth for remote bindings. `env.preview` binds
`NEWSLETTER_DB` to `integrautomacao-newsletter-preview`, while `env.production`
binds it to `integrautomacao-newsletter-production`. Local Pages development and
Vitest create local storage under the same binding name. The real remote database
UUIDs are returned by the Cloudflare API after preflight confirms each exact name
is absent, then written to Wrangler configuration; no fabricated UUID is
committed. Creation uses `primary_location_hint: "enam"` and
`read_replication: {"mode":"disabled"}` for both environments. Because D1 has no
South America primary location hint, this records an explicit limitation rather
than implying Brazilian data residency.

Migration `migrations/0001_newsletter_consent.sql` is applied locally in Vitest,
then remotely to preview, smoke-tested, and only then remotely to production.
Vitest loads the migration through `readD1Migrations` and applies it from a setup
file before each storage-isolated test.

Cloudflare documents D1 Pages bindings and environment overrides in
[Pages Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/),
and its Vitest integration exposes `readD1Migrations` plus
`applyD1Migrations` in the
[D1 test APIs](https://developers.cloudflare.com/workers/testing/vitest-integration/test-apis/).
Resend documents 24-hour idempotency for `POST /emails` in
[Idempotency Keys](https://resend.com/docs/dashboard/emails/idempotency-keys).

## UI and privacy copy

The form success copy changes from immediate confirmation to a neutral mailbox
instruction. The newsletter page explains that subscription becomes active only
after the explicit confirmation button. The static confirmation page has four
accessible states: ready, submitting, confirmed/already processed, and
expired/invalid/error, with a link back to the form.

The privacy policy states that D1 holds pending requests, confirmation evidence,
the immutable consent ledger, and provider reconciliation state; that Resend is
mutated only after mailbox confirmation; that raw tokens are not retained; that
unconfirmed name/email data is pseudonymized after 30 days; that D1 is not claimed
to reside in Brazil; and that global opt-outs are preserved.

## Security and privacy properties

- At least 256 bits of token entropy and constant-format SHA-256 lookup.
- No token in an HTTP query string, server access log, D1 row, browser storage,
  or custom event.
- Explicit user POST rather than confirmation on link-prefetching GET.
- One-time, expiry-aware, race-safe consumption at the SQL write boundary.
- Enumeration resistance on the initial endpoint through a fixed `202` response.
- Append-only evidence enforced by triggers rather than application convention.
- Provider global opt-out is fail-closed and never automatically reversed.
- Provider work is retry-forward and idempotent/read-back verified.
- Logs contain request IDs, token IDs, job IDs, state names, attempt counts, and
  provider statuses, but never email addresses, raw tokens, token hashes, or
  provider URLs containing email addresses.

## Required verification

Automated tests must prove token replay, token expiry, concurrent confirmation,
neutral initial responses across stored states, append-only ledger enforcement,
no Resend Contacts mutation before confirmation, provider ambiguity read-back,
global opt-out preservation, job lease exclusivity, pending-data cleanup, and
broadcast view gating. Built-output tests must prove the confirmation utility is
`noindex,nofollow` and absent from every sitemap.

Operational verification must separately prove preview/production binding
separation, remote migration state, confirmation-email receipt, fragment removal,
explicit-click behavior, Resend read-back, and the Broadcast block. Production
delivery is not proven by local Vitest or build results.
