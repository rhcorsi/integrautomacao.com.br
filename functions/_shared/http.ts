const DEFAULT_RESPONSE_LIMIT = 32_768;

export type LimitedTextResult =
  | { ok: true; value: string }
  | { ok: false; reason: "invalid" | "too-large" };

export type LimitedJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: "invalid" | "too-large" };

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isJsonContentType = (value: string | null): boolean => {
  if (!value) return false;
  return value.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
};

const declaredBodyIsTooLarge = (
  headers: Headers,
  maxBytes: number,
): boolean => {
  const value = headers.get("content-length");
  if (value === null || !/^\d+$/.test(value)) return false;
  const length = Number(value);
  return Number.isSafeInteger(length) && length > maxBytes;
};

async function readStreamTextLimited(
  stream: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<LimitedTextResult> {
  if (!stream) return { ok: true, value: "" };

  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytesRead = 0;
  let value = "";

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytesRead += chunk.value.byteLength;
      if (bytesRead > maxBytes) {
        await reader.cancel("body limit exceeded").catch(() => undefined);
        return { ok: false, reason: "too-large" };
      }
      value += decoder.decode(chunk.value, { stream: true });
    }
    value += decoder.decode();
    return { ok: true, value };
  } catch {
    await reader.cancel("invalid body stream").catch(() => undefined);
    return { ok: false, reason: "invalid" };
  } finally {
    reader.releaseLock();
  }
}

export async function readRequestJsonLimited(
  request: Request,
  maxBytes: number,
): Promise<LimitedJsonResult> {
  if (declaredBodyIsTooLarge(request.headers, maxBytes)) {
    await request.body?.cancel("body limit exceeded").catch(() => undefined);
    return { ok: false, reason: "too-large" };
  }

  const text = await readStreamTextLimited(request.body, maxBytes);
  if (!text.ok) return text;

  try {
    return { ok: true, value: JSON.parse(text.value) as unknown };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

export async function readResponseJsonLimited(
  response: Response,
  maxBytes = DEFAULT_RESPONSE_LIMIT,
): Promise<LimitedJsonResult> {
  if (declaredBodyIsTooLarge(response.headers, maxBytes)) {
    await response.body?.cancel("response limit exceeded").catch(() => undefined);
    return { ok: false, reason: "too-large" };
  }

  const text = await readStreamTextLimited(response.body, maxBytes);
  if (!text.ok) return text;

  try {
    return { ok: true, value: JSON.parse(text.value) as unknown };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

export async function drainResponseLimited(
  response: Response,
  maxBytes = DEFAULT_RESPONSE_LIMIT,
): Promise<void> {
  await readStreamTextLimited(response.body, maxBytes);
}

const abortError = () => {
  const error = new Error("upstream request deadline exceeded");
  error.name = "AbortError";
  return error;
};

async function bufferResponseWithinDeadline(
  response: Response,
  maxBytes: number,
  signal: AbortSignal,
): Promise<Response> {
  if (declaredBodyIsTooLarge(response.headers, maxBytes)) {
    void response.body?.cancel("response limit exceeded").catch(() => undefined);
    throw new RangeError("upstream response limit exceeded");
  }
  if (!response.body) return response;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;
  let rejectOnAbort: ((reason: Error) => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    rejectOnAbort = reject;
  });
  const onAbort = () => rejectOnAbort?.(abortError());
  signal.addEventListener("abort", onAbort, { once: true });
  if (signal.aborted) onAbort();

  try {
    while (true) {
      const chunk = await Promise.race([reader.read(), aborted]);
      if (chunk.done) break;
      bytesRead += chunk.value.byteLength;
      if (bytesRead > maxBytes) {
        throw new RangeError("upstream response limit exceeded");
      }
      chunks.push(chunk.value);
    }
  } catch (error) {
    void reader.cancel("upstream response interrupted").catch(() => undefined);
    throw error;
  } finally {
    signal.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }

  const body = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new Response(body, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
  maxResponseBytes = DEFAULT_RESPONSE_LIMIT,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    return await bufferResponseWithinDeadline(
      response,
      maxResponseBytes,
      controller.signal,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export const jsonResponse = (
  data: unknown,
  status = 200,
  requestId?: string,
): Response => {
  const headers = new Headers({
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  });
  if (requestId) headers.set("x-request-id", requestId);
  return new Response(JSON.stringify(data), { status, headers });
};

export const methodNotAllowed = (message: string): Response =>
  new Response(JSON.stringify({ ok: false, message }), {
    status: 405,
    headers: {
      allow: "POST",
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });

type LogFields = Record<string, boolean | number | string | undefined>;

export function logWorkerEvent(
  level: "error" | "info" | "warn",
  event: string,
  fields: LogFields = {},
): void {
  const entry = { event, ...fields };
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}
