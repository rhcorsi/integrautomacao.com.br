/**
 * Cloudflare Pages Function — POST /api/newsletter
 *
 * Valida a requisição e o Turnstile antes de registrar o contato no modelo
 * atual de Contacts + Segments + Topics do Resend. O endpoint registra
 * evidência individual do opt-in e nunca informa sucesso sem confirmar a
 * operação.
 */

interface Env {
  TURNSTILE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  RESEND_SEGMENT_ID?: string;
  RESEND_TOPIC_ID?: string;
}

interface NewsletterPayload {
  name: string;
  email: string;
  lgpd: string;
  website?: string;
  "cf-turnstile-response": string;
}

interface ResendContact {
  id?: string;
  email?: string;
  unsubscribed?: boolean;
}

interface ResendList<T> {
  data?: T[];
}

interface ConsentEvidence {
  newsletter_consent_at: string;
  newsletter_policy_version: string;
  newsletter_consent_source: string;
  newsletter_consent_text: string;
}

type ContactLookup = "exists" | "missing" | "error";

type Result =
  | {
      ok: true;
      alreadyExists?: boolean;
      mode: "contacts";
    }
  | { ok: false; status: number };

const MAX_BODY_LENGTH = 8_000;
const RESEND_TIMEOUT_MS = 10_000;
const CONSENT_POLICY_VERSION = "2026-07-12";
const CONSENT_TEXT =
  "Concordo em receber a newsletter Integra Ação e com o tratamento dos meus dados conforme a Política de Privacidade. Posso cancelar a inscrição a qualquer momento.";

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });

const methodNotAllowed = (): Response =>
  new Response(
    JSON.stringify({
      ok: false,
      message: "Endpoint disponível apenas via POST do formulário de inscrição.",
    }),
    {
      status: 405,
      headers: {
        allow: "POST",
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
      },
    },
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const singleLine = (value: string, max: number) =>
  value
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const isEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 180;

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs = RESEND_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function responseDetail(response: Response): Promise<string> {
  return (await response.text().catch(() => "")).slice(0, 1_000);
}

async function resendFetch(
  input: string,
  init: RequestInit,
): Promise<Response> {
  const first = await fetchWithTimeout(input, init);
  if (first.status !== 429) return first;

  const retryAfter = Number(first.headers.get("retry-after") ?? "1");
  const waitMs = Number.isFinite(retryAfter)
    ? Math.min(Math.max(retryAfter * 1_000, 250), 2_000)
    : 1_000;
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  return fetchWithTimeout(input, init);
}

function resendHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "User-Agent": "integrautomacao-newsletter/1.0",
  };
}

async function verifyTurnstile(
  token: string,
  secret: string,
  ip: string | undefined,
  expectedHostname: string,
): Promise<boolean> {
  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token);
    if (ip) body.set("remoteip", ip);

    const response = await fetchWithTimeout(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body },
    );
    if (!response.ok) return false;

    const data = (await response.json()) as {
      success?: boolean;
      action?: string;
      hostname?: string;
    };
    return (
      data.success === true &&
      data.action === "newsletter-form" &&
      data.hostname === expectedHostname
    );
  } catch {
    return false;
  }
}

async function lookupContact(
  email: string,
  apiKey: string,
): Promise<ContactLookup> {
  const response = await resendFetch(
    `https://api.resend.com/contacts/${encodeURIComponent(email)}`,
    { method: "GET", headers: resendHeaders(apiKey) },
  );
  if (response.ok) {
    const contact = (await response.json().catch(() => ({}))) as ResendContact;
    return contact.id || contact.email ? "exists" : "error";
  }
  if (response.status === 404) return "missing";
  console.error(
    "Resend contact lookup failed",
    response.status,
    await responseDetail(response),
  );
  return "error";
}

async function updateTopic(
  email: string,
  topicId: string,
  apiKey: string,
): Promise<boolean> {
  const topic = await resendFetch(
    `https://api.resend.com/contacts/${encodeURIComponent(email)}/topics`,
    {
      method: "PATCH",
      headers: resendHeaders(apiKey),
      body: JSON.stringify({
        topics: [{ id: topicId, subscription: "opt_in" }],
      }),
    },
  );
  if (!topic.ok) {
    console.error(
      "Resend topic opt-in failed",
      topic.status,
      await responseDetail(topic),
    );
    return false;
  }
  return true;
}

async function updateContact(
  email: string,
  apiKey: string,
  body: { unsubscribed?: boolean; properties?: ConsentEvidence },
  operation: string,
): Promise<boolean> {
  const response = await resendFetch(
    `https://api.resend.com/contacts/${encodeURIComponent(email)}`,
    {
      method: "PATCH",
      headers: resendHeaders(apiKey),
      body: JSON.stringify(body),
    },
  );
  if (response.ok) return true;
  console.error(
    `Resend contact ${operation} failed`,
    response.status,
    await responseDetail(response),
  );
  return false;
}

async function contactHasSegment(
  email: string,
  segmentId: string,
  apiKey: string,
): Promise<boolean> {
  const response = await resendFetch(
    `https://api.resend.com/contacts/${encodeURIComponent(email)}/segments`,
    { method: "GET", headers: resendHeaders(apiKey) },
  );
  if (!response.ok) {
    console.error(
      "Resend segment membership lookup failed",
      response.status,
      await responseDetail(response),
    );
    return false;
  }
  const list = (await response.json().catch(() => ({}))) as ResendList<{
    id?: string;
  }>;
  return Boolean(list.data?.some((segment) => segment.id === segmentId));
}

async function addExistingContactToSegment(
  email: string,
  segmentId: string,
  topicId: string,
  apiKey: string,
  evidence: ConsentEvidence,
): Promise<Result> {
  const add = await resendFetch(
    `https://api.resend.com/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(segmentId)}`,
    { method: "POST", headers: resendHeaders(apiKey) },
  );
  const membershipConfirmed =
    add.ok ||
    ((add.status === 409 || add.status === 422) &&
      (await contactHasSegment(email, segmentId, apiKey)));
  if (!membershipConfirmed) {
    console.error(
      "Resend add to segment failed",
      add.status,
      await responseDetail(add),
    );
    return { ok: false, status: add.status };
  }

  // O Topic tem default opt_out e todos os Broadcasts devem selecioná-lo.
  // Evidência e reativação global são confirmadas juntas na etapa final.
  if (
    !(await updateTopic(email, topicId, apiKey)) ||
    !(await updateContact(
      email,
      apiKey,
      { properties: evidence, unsubscribed: false },
      "consent evidence and resubscribe",
    ))
  ) {
    return { ok: false, status: 502 };
  }

  return { ok: true, alreadyExists: true, mode: "contacts" };
}

async function addToSegment(
  segmentId: string,
  topicId: string,
  apiKey: string,
  payload: { email: string; first_name: string; last_name: string },
  evidence: ConsentEvidence,
): Promise<Result> {
  try {
    const lookup = await lookupContact(payload.email, apiKey);
    if (lookup === "error") return { ok: false, status: 502 };
    if (lookup === "exists") {
      return await addExistingContactToSegment(
        payload.email,
        segmentId,
        topicId,
        apiKey,
        evidence,
      );
    }

    const create = await resendFetch("https://api.resend.com/contacts", {
      method: "POST",
      headers: resendHeaders(apiKey),
      body: JSON.stringify({
        ...payload,
        unsubscribed: false,
        segments: [{ id: segmentId }],
        topics: [{ id: topicId, subscription: "opt_in" }],
        properties: evidence,
      }),
    });

    if (create.ok) return { ok: true, mode: "contacts" };
    // Corrida rara: outro processo pode criar o contato após o GET. O caminho
    // existente é idempotente e ainda respeita os limites com retry de 429.
    if (create.status === 409 || create.status === 422) {
      return await addExistingContactToSegment(
        payload.email,
        segmentId,
        topicId,
        apiKey,
        evidence,
      );
    }

    console.error(
      "Resend create contact failed",
      create.status,
      await responseDetail(create),
    );
    return { ok: false, status: create.status };
  } catch (error) {
    console.error("Resend contacts exception", error);
    return { ok: false, status: 502 };
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.TURNSTILE_SECRET_KEY || !env.RESEND_API_KEY) {
    return json(
      { ok: false, message: "Configuração de inscrição indisponível." },
      503,
    );
  }
  if (!env.RESEND_SEGMENT_ID || !env.RESEND_TOPIC_ID) {
    return json(
      { ok: false, message: "Lista de inscrição temporariamente indisponível." },
      503,
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return json({ ok: false, message: "Tipo de conteúdo inválido." }, 415);
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_LENGTH) {
    return json({ ok: false, message: "Payload muito grande." }, 413);
  }

  let decoded: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_LENGTH) {
      return json({ ok: false, message: "Payload muito grande." }, 413);
    }
    decoded = JSON.parse(raw);
  } catch {
    return json({ ok: false, message: "Payload inválido." }, 400);
  }
  if (!isRecord(decoded)) {
    return json({ ok: false, message: "Payload inválido." }, 400);
  }

  const requiredStringFields = ["name", "email", "lgpd", "cf-turnstile-response"];
  if (
    requiredStringFields.some((field) => typeof decoded[field] !== "string") ||
    (decoded.website !== undefined && typeof decoded.website !== "string")
  ) {
    return json({ ok: false, message: "Campos inválidos." }, 400);
  }
  const payload = decoded as unknown as NewsletterPayload;

  if (payload.website) return json({ ok: true });
  if (payload.lgpd !== "1") {
    return json(
      { ok: false, message: "É necessário concordar com a Política de Privacidade." },
      400,
    );
  }

  const name = singleLine(payload.name, 120);
  const email = singleLine(payload.email, 180).toLowerCase();
  const token = singleLine(payload["cf-turnstile-response"], 2_048);
  if (name.length < 2) {
    return json({ ok: false, message: "Nome inválido." }, 400);
  }
  if (!isEmail(email)) {
    return json({ ok: false, message: "E-mail inválido." }, 400);
  }
  if (!token) {
    return json({ ok: false, message: "Verificação de segurança ausente." }, 403);
  }

  const requestHostname = new URL(request.url).hostname;
  const ip = request.headers.get("CF-Connecting-IP") ?? undefined;
  if (
    !(await verifyTurnstile(
      token,
      env.TURNSTILE_SECRET_KEY,
      ip,
      requestHostname,
    ))
  ) {
    return json({ ok: false, message: "Verificação de segurança falhou." }, 403);
  }

  const parts = name.split(/\s+/);
  const contact = {
    email,
    first_name: parts[0].slice(0, 80),
    last_name: parts.slice(1).join(" ").slice(0, 80),
  };
  let consentSource = new URL(request.url).pathname;
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const sourceUrl = new URL(referer);
      if (sourceUrl.hostname === requestHostname) consentSource = sourceUrl.pathname;
    } catch {
      // Cabeçalho inválido: conserva a origem segura derivada do endpoint.
    }
  }
  const evidence: ConsentEvidence = {
    newsletter_consent_at: new Date().toISOString(),
    newsletter_policy_version: CONSENT_POLICY_VERSION,
    newsletter_consent_source: consentSource.slice(0, 200),
    newsletter_consent_text: CONSENT_TEXT,
  };
  const result = await addToSegment(
    env.RESEND_SEGMENT_ID,
    env.RESEND_TOPIC_ID,
    env.RESEND_API_KEY,
    contact,
    evidence,
  );

  if (!result.ok) {
    return json(
      {
        ok: false,
        message: "Não foi possível registrar a inscrição agora. Tente novamente em instantes.",
      },
      502,
    );
  }

  return json({
    ok: true,
    alreadyExists: result.alreadyExists ?? false,
    mode: result.mode,
  });
};

export const onRequestGet: PagesFunction = async () => methodNotAllowed();
export const onRequestPut: PagesFunction = async () => methodNotAllowed();
export const onRequestPatch: PagesFunction = async () => methodNotAllowed();
export const onRequestDelete: PagesFunction = async () => methodNotAllowed();
