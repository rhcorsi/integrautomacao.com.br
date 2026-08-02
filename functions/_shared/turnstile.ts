import {
  drainResponseLimited,
  fetchWithTimeout,
  isRecord,
  readResponseJsonLimited,
} from "./http";

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const SITEVERIFY_TIMEOUT_MS = 10_000;
const MAX_TURNSTILE_RESPONSE_BYTES = 16_384;

export type TurnstileResult = "invalid" | "unavailable" | "valid";

interface VerifyTurnstileOptions {
  action: string;
  expectedHostname: string;
  ip?: string;
  secret: string;
  token: string;
}

export async function verifyTurnstile({
  action,
  expectedHostname,
  ip,
  secret,
  token,
}: VerifyTurnstileOptions): Promise<TurnstileResult> {
  if (!token || token.length > 2_048) return "invalid";

  const idempotencyKey = crypto.randomUUID();
  const body = new URLSearchParams({
    idempotency_key: idempotencyKey,
    response: token,
    secret,
  });
  if (ip) body.set("remoteip", ip);

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        SITEVERIFY_URL,
        { method: "POST", body },
        SITEVERIFY_TIMEOUT_MS,
        MAX_TURNSTILE_RESPONSE_BYTES,
      );
      if (!response.ok) {
        await drainResponseLimited(response, MAX_TURNSTILE_RESPONSE_BYTES);
        if (response.status >= 500 && attempt === 1) continue;
        return "unavailable";
      }

      const decoded = await readResponseJsonLimited(
        response,
        MAX_TURNSTILE_RESPONSE_BYTES,
      );
      if (!decoded.ok || !isRecord(decoded.value)) return "unavailable";

      if (decoded.value.success === true) {
        return decoded.value.action === action &&
          decoded.value.hostname === expectedHostname
          ? "valid"
          : "invalid";
      }

      const codes = Array.isArray(decoded.value["error-codes"])
        ? decoded.value["error-codes"].filter(
            (code): code is string => typeof code === "string",
          )
        : [];
      if (codes.includes("internal-error")) {
        if (attempt === 1) continue;
        return "unavailable";
      }
      if (
        codes.includes("invalid-input-response") ||
        codes.includes("missing-input-response") ||
        codes.includes("timeout-or-duplicate")
      ) {
        return "invalid";
      }

      // Secret/configuration failures and unknown provider errors are not
      // attributed to the visitor.
      return "unavailable";
    } catch {
      if (attempt === 1) continue;
      return "unavailable";
    }
  }

  return "unavailable";
}
