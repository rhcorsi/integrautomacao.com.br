import type { ConfirmationToken } from "./types";

const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function encodeBase64Url(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashConfirmationToken(rawToken: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(rawToken),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function isConfirmationToken(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}

export async function generateConfirmationToken(): Promise<ConfirmationToken> {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  const raw = encodeBase64Url(bytes);

  return { raw, sha256: await hashConfirmationToken(raw) };
}
