/**
 * Bindings generated from wrangler.jsonc live in functions/types.d.ts.
 *
 * Cloudflare Pages encrypted variables are configured in the dashboard and
 * are intentionally absent from wrangler.jsonc. This small extension records
 * only their names and optional runtime presence; no secret value is kept in
 * the repository.
 */
interface EncryptedPagesBindings {
  TURNSTILE_SECRET_KEY?: string;
  RESEND_TRANSACTIONAL_API_KEY?: string;
  RESEND_SEND_API_KEY?: string;
  RESEND_CONTACTS_API_KEY?: string;
  RESEND_SEGMENT_ID?: string;
  RESEND_TOPIC_ID?: string;
  CONTACT_EMAIL_TO?: string;
  CONTACT_EMAIL_FROM?: string;
  NEWSLETTER_CONFIRMATION_ORIGIN?: string;
}

type PublicPagesBindings = Pick<
  Env,
  "NODE_VERSION" | "PUBLIC_TURNSTILE_SITE_KEY"
>;

export type ContactEnv = PublicPagesBindings &
  Pick<
    EncryptedPagesBindings,
    | "TURNSTILE_SECRET_KEY"
    | "RESEND_SEND_API_KEY"
    | "CONTACT_EMAIL_TO"
    | "CONTACT_EMAIL_FROM"
  >;

export type NewsletterInitialEnv = PublicPagesBindings &
  Pick<Env, "NEWSLETTER_DB"> &
  Pick<
    EncryptedPagesBindings,
    | "TURNSTILE_SECRET_KEY"
    | "RESEND_TRANSACTIONAL_API_KEY"
    | "CONTACT_EMAIL_FROM"
    | "NEWSLETTER_CONFIRMATION_ORIGIN"
  >;

export type NewsletterEnv = NewsletterInitialEnv &
  Pick<
    EncryptedPagesBindings,
    | "RESEND_CONTACTS_API_KEY"
    | "RESEND_SEGMENT_ID"
    | "RESEND_TOPIC_ID"
    | "RESEND_SEND_API_KEY"
  >;
