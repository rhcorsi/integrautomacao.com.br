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

CREATE TABLE newsletter_confirmation_tokens (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES newsletter_subscriptions(id),
  consent_ledger_id TEXT NOT NULL REFERENCES newsletter_consent_ledger(id),
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

CREATE TRIGGER newsletter_ledger_no_duplicate_id
BEFORE INSERT ON newsletter_consent_ledger
WHEN EXISTS (
  SELECT 1 FROM newsletter_consent_ledger WHERE id = NEW.id
)
BEGIN
  SELECT RAISE(ABORT, 'newsletter consent ledger is append-only');
END;

CREATE TRIGGER newsletter_ledger_no_update
BEFORE UPDATE ON newsletter_consent_ledger
BEGIN
  SELECT RAISE(ABORT, 'newsletter consent ledger is append-only');
END;

CREATE TRIGGER newsletter_ledger_no_delete
BEFORE DELETE ON newsletter_consent_ledger
BEGIN
  SELECT RAISE(ABORT, 'newsletter consent ledger is append-only');
END;

CREATE TRIGGER newsletter_token_evidence_valid_insert
BEFORE INSERT ON newsletter_confirmation_tokens
WHEN NOT EXISTS (
  SELECT 1
    FROM newsletter_consent_ledger
   WHERE id = NEW.consent_ledger_id
     AND subscription_id = NEW.subscription_id
     AND event_type = 'request_received'
     AND policy_version IS NOT NULL
     AND consent_text IS NOT NULL
     AND consent_source IS NOT NULL
)
BEGIN
  SELECT RAISE(
    ABORT,
    'newsletter token must reference matching request_received evidence'
  );
END;

CREATE TRIGGER newsletter_token_evidence_no_rebind
BEFORE UPDATE OF subscription_id, consent_ledger_id
ON newsletter_confirmation_tokens
WHEN OLD.subscription_id <> NEW.subscription_id
  OR OLD.consent_ledger_id <> NEW.consent_ledger_id
BEGIN
  SELECT RAISE(ABORT, 'newsletter token evidence binding is immutable');
END;

CREATE TRIGGER newsletter_token_no_replace
BEFORE INSERT ON newsletter_confirmation_tokens
WHEN EXISTS (
  SELECT 1
    FROM newsletter_confirmation_tokens
   WHERE id = NEW.id OR token_sha256 = NEW.token_sha256
)
BEGIN
  SELECT RAISE(ABORT, 'newsletter confirmation token rows are retained');
END;

CREATE TRIGGER newsletter_token_no_delete
BEFORE DELETE ON newsletter_confirmation_tokens
BEGIN
  SELECT RAISE(ABORT, 'newsletter confirmation token rows are retained');
END;

CREATE TRIGGER newsletter_confirmation_consumed
AFTER UPDATE OF consumed_at ON newsletter_confirmation_tokens
WHEN OLD.consumed_at IS NULL AND NEW.consumed_at IS NOT NULL
BEGIN
  UPDATE newsletter_subscriptions
     SET consent_state = 'confirmed',
         confirmed_at = NEW.consumed_at,
         provider_state = 'pending',
         policy_version = (
           SELECT policy_version
             FROM newsletter_consent_ledger
            WHERE id = NEW.consent_ledger_id
         ),
         consent_text = (
           SELECT consent_text
             FROM newsletter_consent_ledger
            WHERE id = NEW.consent_ledger_id
         ),
         consent_source = (
           SELECT consent_source
             FROM newsletter_consent_ledger
            WHERE id = NEW.consent_ledger_id
         ),
         updated_at = NEW.consumed_at
   WHERE id = NEW.subscription_id;

  UPDATE newsletter_confirmation_tokens
     SET revoked_at = NEW.consumed_at
   WHERE subscription_id = NEW.subscription_id
     AND id <> NEW.id
     AND consumed_at IS NULL
     AND revoked_at IS NULL;

  INSERT INTO newsletter_consent_ledger
    (id, subscription_id, event_type, occurred_at, request_id,
     policy_version, consent_text, consent_source, metadata_json)
  SELECT 'ledger-confirm-' || NEW.id,
         NEW.subscription_id,
         'mailbox_confirmed',
         NEW.consumed_at,
         NEW.consumption_request_id,
         policy_version,
         consent_text,
         consent_source,
         json_object(
           'token_id', NEW.id,
           'consent_ledger_id', NEW.consent_ledger_id
         )
    FROM newsletter_consent_ledger
   WHERE id = NEW.consent_ledger_id;

  INSERT INTO newsletter_jobs
    (id, subscription_id, kind, dedupe_key, state, available_at, created_at)
  VALUES
    ('job-resend-' || NEW.id, NEW.subscription_id, 'resend_reconcile',
     'resend_reconcile:' || NEW.id, 'pending', NEW.consumed_at,
     NEW.consumed_at);
END;

CREATE VIEW newsletter_broadcast_recipients AS
SELECT id, email_normalized, name, confirmed_at, reconciled_at
  FROM newsletter_subscriptions
 WHERE consent_state = 'confirmed'
   AND provider_state = 'reconciled';
