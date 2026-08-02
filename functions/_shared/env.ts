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
  RESEND_SEND_API_KEY?: string;
  RESEND_CONTACTS_API_KEY?: string;
  RESEND_SEGMENT_ID?: string;
  RESEND_TOPIC_ID?: string;
  CONTACT_EMAIL_TO?: string;
  CONTACT_EMAIL_FROM?: string;
}

export type ContactEnv = Env &
  Pick<
    EncryptedPagesBindings,
    | "TURNSTILE_SECRET_KEY"
    | "RESEND_SEND_API_KEY"
    | "CONTACT_EMAIL_TO"
    | "CONTACT_EMAIL_FROM"
  >;

export type NewsletterEnv = Env &
  Pick<
    EncryptedPagesBindings,
    | "TURNSTILE_SECRET_KEY"
    | "RESEND_CONTACTS_API_KEY"
    | "RESEND_SEGMENT_ID"
    | "RESEND_TOPIC_ID"
  >;
