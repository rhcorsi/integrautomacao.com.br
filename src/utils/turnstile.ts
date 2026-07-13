const PLACEHOLDER_PATTERNS = [
  "<site key",
  "site key pública",
  "site key publica",
  "<public",
  "<turnstile",
];

export function resolveTurnstileSiteKey(configuredKey: string | undefined): string {
  const candidate = (configuredKey ?? "").trim();
  const looksLikePlaceholder = PLACEHOLDER_PATTERNS.some((pattern) =>
    candidate.toLowerCase().includes(pattern),
  );

  return candidate && !looksLikePlaceholder ? candidate : "";
}
