export type ConfirmationUiState =
  | { state: "invalid" }
  | { state: "ready" }
  | { state: "submitting" }
  | {
      state:
        | "confirmed"
        | "already-processed"
        | "expired"
        | "error";
    };

export interface NewsletterConfirmationDependencies {
  readFragment(): string;
  currentPath(): string;
  replaceUrl(path: string): void;
  postConfirmation(token: string): Promise<{ state: string }>;
  render(state: ConfirmationUiState): void;
}

export type ConfirmationPostResult = {
  state:
    | "confirmed"
    | "already-processed"
    | "expired"
    | "invalid"
    | "error";
};

export interface ConfirmationHttpDependencies {
  request(input: string, init: RequestInit): Promise<Response>;
  timeoutSignal(timeoutMs: number): AbortSignal;
}

export interface ConfirmationElementPort {
  textContent: string | null;
  hidden: boolean;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

export interface ConfirmationButtonPort extends ConfirmationElementPort {
  disabled: boolean;
}

export interface ConfirmationRenderElements {
  status: ConfirmationElementPort;
  button: ConfirmationButtonPort;
  recovery: ConfirmationElementPort;
}

export const CONFIRMATION_RESPONSE_MAX_BYTES = 4 * 1_024;

const CONFIRMATION_FRAGMENT_PATTERN = /^#token=([A-Za-z0-9_-]{43})$/;
const CONFIRMATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const CONFIRMATION_ENDPOINT = "/api/newsletter/confirm";

const RENDER_COPY: Record<ConfirmationUiState["state"], string> = {
  ready:
    "Para concluir, selecione Confirmar inscrição. Abrir este link não confirma sua inscrição.",
  submitting: "Confirmando sua inscrição…",
  confirmed:
    "Inscrição confirmada. A sincronização da lista pode levar alguns instantes.",
  "already-processed": "Este link já foi processado.",
  expired:
    "Este link expirou. Solicite uma nova confirmação pelo formulário.",
  invalid:
    "Link de confirmação inválido. Solicite uma nova confirmação pelo formulário.",
  error:
    "Não foi possível processar a confirmação agora. Retorne ao formulário e tente novamente.",
};

const KNOWN_CONTROLLER_RESULTS = new Set([
  "confirmed",
  "already-processed",
  "expired",
  "invalid",
]);

function renderWithoutThrowing(
  render: NewsletterConfirmationDependencies["render"],
  state: ConfirmationUiState,
) {
  try {
    render(state);
  } catch {
    // The controller remains terminal if the visual layer is unavailable.
  }
}

export function createNewsletterConfirmationController(
  dependencies: NewsletterConfirmationDependencies,
): {
  initialize(): void;
  confirm(): Promise<void>;
} {
  let initialized = false;
  let initializing = false;
  let confirmationStarted = false;
  let token: string | null = null;

  const initialize = () => {
    if (initialized || initializing) return;
    initialized = true;
    initializing = true;

    try {
      const fragment = dependencies.readFragment();
      const match = CONFIRMATION_FRAGMENT_PATTERN.exec(fragment);
      const path = dependencies.currentPath();
      dependencies.replaceUrl(path);

      token = match?.[1] ?? null;
      try {
        dependencies.render({ state: token === null ? "invalid" : "ready" });
      } catch {
        token = null;
        confirmationStarted = true;
      }
    } catch {
      token = null;
      confirmationStarted = true;
      renderWithoutThrowing(dependencies.render, { state: "error" });
    } finally {
      initializing = false;
    }
  };

  const confirm = async () => {
    if (
      !initialized ||
      initializing ||
      confirmationStarted ||
      token === null
    ) {
      return;
    }

    confirmationStarted = true;
    const capturedToken = token;
    token = null;

    try {
      dependencies.render({ state: "submitting" });
      const result = await dependencies.postConfirmation(capturedToken);
      const state = KNOWN_CONTROLLER_RESULTS.has(result.state)
        ? (result.state as ConfirmationUiState["state"])
        : "error";
      renderWithoutThrowing(dependencies.render, { state });
    } catch {
      renderWithoutThrowing(dependencies.render, { state: "error" });
    }
  };

  return { confirm, initialize };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function classifyConfirmationHttpResponse(
  status: number,
  body: unknown,
): ConfirmationPostResult {
  if (!Number.isInteger(status) || !isPlainObject(body)) {
    return { state: "error" };
  }

  if (status === 200 && body.ok === true && body.state === "confirmed") {
    return { state: "confirmed" };
  }
  if (
    status === 200 &&
    body.ok === true &&
    body.state === "already-processed"
  ) {
    return { state: "already-processed" };
  }
  if (status === 410 && body.ok === false && body.state === "expired") {
    return { state: "expired" };
  }
  if (status === 400 && body.ok === false && body.state === "invalid") {
    return { state: "invalid" };
  }
  return { state: "error" };
}

async function cancelResponseBody(body: ReadableStream<Uint8Array> | null) {
  if (body === null) return;
  try {
    await body.cancel();
  } catch {
    // Cancellation is best effort and never changes the local error result.
  }
}

async function readResponseBodyLimited(
  body: ReadableStream<Uint8Array>,
): Promise<Uint8Array | null> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const result = await reader.read();
    if (result.done) break;
    if (!(result.value instanceof Uint8Array)) {
      try {
        await reader.cancel();
      } catch {
        // Cancellation is best effort.
      }
      return null;
    }

    totalBytes += result.value.byteLength;
    if (totalBytes > CONFIRMATION_RESPONSE_MAX_BYTES) {
      try {
        await reader.cancel();
      } catch {
        // Cancellation is best effort.
      }
      return null;
    }
    chunks.push(result.value);
  }

  if (totalBytes === 0) return null;
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function isJsonContentType(value: string | null) {
  if (value === null) return false;
  return value.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

export async function postNewsletterConfirmation(
  token: string,
  dependencies: ConfirmationHttpDependencies,
): Promise<ConfirmationPostResult> {
  if (!CONFIRMATION_TOKEN_PATTERN.test(token)) return { state: "error" };

  try {
    const response = await dependencies.request(CONFIRMATION_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
      signal: dependencies.timeoutSignal(12_000),
      redirect: "error",
    });
    const responseBody = response.body;

    if (!isJsonContentType(response.headers.get("Content-Type"))) {
      await cancelResponseBody(responseBody);
      return { state: "error" };
    }

    const contentLength = response.headers.get("Content-Length");
    if (contentLength !== null) {
      if (!/^\d+$/.test(contentLength)) {
        await cancelResponseBody(responseBody);
        return { state: "error" };
      }
      if (BigInt(contentLength) > BigInt(CONFIRMATION_RESPONSE_MAX_BYTES)) {
        await cancelResponseBody(responseBody);
        return { state: "error" };
      }
    }

    if (responseBody === null) return { state: "error" };
    const bytes = await readResponseBodyLimited(responseBody);
    if (bytes === null) return { state: "error" };

    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const parsed: unknown = JSON.parse(decoded);
    return classifyConfirmationHttpResponse(response.status, parsed);
  } catch {
    return { state: "error" };
  }
}

export function createNewsletterConfirmationRenderer(
  elements: ConfirmationRenderElements,
): (state: ConfirmationUiState) => void {
  return (state) => {
    elements.status.setAttribute("role", "status");
    elements.status.setAttribute("aria-live", "polite");
    elements.status.setAttribute("aria-atomic", "true");
    if (state.state === "submitting") {
      elements.status.setAttribute("aria-busy", "true");
    } else {
      elements.status.removeAttribute("aria-busy");
    }

    elements.status.textContent = RENDER_COPY[state.state];
    elements.button.disabled = state.state !== "ready";
    elements.button.hidden = false;
    elements.recovery.hidden = ![
      "expired",
      "invalid",
      "error",
    ].includes(state.state);
  };
}
