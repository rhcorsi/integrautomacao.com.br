/**
 * Helpers client-side compartilhados pelos formulários (contato e newsletter).
 * Roda apenas no browser — importado pelos <script> processados dos
 * componentes, que o Astro empacota como assets externos (compatível com a
 * CSP, que não permite scripts executáveis inline).
 */

export interface TurnstileWindow extends Window {
  turnstile?: { reset: (container?: string | HTMLElement) => void };
}

export const TURNSTILE_API_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js";

/**
 * Injeta o api.js do Turnstile uma única vez por página. Tags
 * `<script is:inline src>` em dois componentes diferentes NÃO são
 * deduplicadas pelo Astro e fariam os widgets renderizar em dobro;
 * a injeção dinâmica com checagem de src resolve e respeita a CSP
 * (script-src permite challenges.cloudflare.com).
 */
export function ensureTurnstileScript(): void {
  if (document.querySelector(`script[src="${TURNSTILE_API_SRC}"]`)) return;
  const script = document.createElement("script");
  script.src = TURNSTILE_API_SRC;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

/**
 * O widget renderizou (iframe presente no container)?
 * Ad-blockers impedem o api.js de carregar; sem iframe, não haverá token.
 */
export function turnstileRendered(form: HTMLFormElement): boolean {
  return form.querySelector(".cf-turnstile iframe") !== null;
}

/**
 * Detecta bloqueio do Turnstile (uBlock, Brave, extensões de privacidade
 * bloqueiam challenges.cloudflare.com). Se após `timeoutMs` não houver
 * iframe no widget, chama `onBlocked` — o formulário NUNCA deve deixar o
 * usuário num dead-end de "aguarde a verificação".
 */
export function watchTurnstileBlocked(
  form: HTMLFormElement,
  onBlocked: () => void,
  timeoutMs = 8_000,
): void {
  const container = form.querySelector<HTMLElement>(".cf-turnstile");
  if (!container) return;

  const startedAt = Date.now();
  const timer = window.setInterval(() => {
    if (turnstileRendered(form)) {
      window.clearInterval(timer);
      return;
    }
    if (Date.now() - startedAt >= timeoutMs) {
      window.clearInterval(timer);
      onBlocked();
    }
  }, 500);
}

export type FormStatusTone = "error" | "info" | "success";

const STATUS_TONE_CLASSES = [
  "text-integra-red-700",
  "text-emerald-700",
  "text-integra-gray-700",
] as const;

/**
 * Escreve mensagem de status numa região viva FIXA (role="status",
 * aria-live="polite" declarados no markup). Não trocar role/aria-live em
 * runtime — leitores de tela registram o elemento na árvore de
 * acessibilidade com o role inicial e anunciam trocas de forma
 * inconsistente.
 */
export function setFormStatus(
  status: HTMLElement | null,
  message: string,
  tone: FormStatusTone = "info",
): void {
  if (!status) return;
  status.classList.remove(...STATUS_TONE_CLASSES);
  status.classList.add(
    tone === "error"
      ? "text-integra-red-700"
      : tone === "success"
        ? "text-emerald-700"
        : "text-integra-gray-700",
  );
  status.textContent = message;
}

/** Extrai `message` de um payload JSON de erro da API, se existir. */
export function responseMessage(value: unknown): string | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    !("message" in value) ||
    typeof value.message !== "string"
  ) {
    return undefined;
  }
  return value.message;
}

/** Timeout de rede dos submits — nunca deixar o botão "Enviando..." preso. */
export const FORM_FETCH_TIMEOUT_MS = 20_000;

/** Mensagem de erro para timeout/offline, com fallback por e-mail. */
export function networkErrorMessage(email: string): string {
  return `Não foi possível concluir agora (tempo esgotado ou rede instável). Tente novamente ou escreva para ${email}.`;
}
