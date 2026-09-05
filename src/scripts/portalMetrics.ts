export const PORTAL_METRIC_EVENT = "integra:portal-metric" as const;

export const PORTAL_METRIC_NAMES = [
  "search_executed",
  "search_result_opened",
  "source_opened",
  "cta_clicked",
  "form_started",
  "request_accepted",
  "request_failed",
] as const;

export type PortalMetricName = (typeof PORTAL_METRIC_NAMES)[number];
export type CountBucket = "0" | "1_5" | "6_12" | "13_25" | "26_50" | "51_plus";

const FIELD_VALUES = {
  result_count_bucket: ["0", "1_5", "6_12", "13_25", "26_50", "51_plus"],
  result_position_bucket: ["1_5", "6_12", "13_25", "26_50", "51_plus"],
  content_type: ["technology", "solution", "guide", "article", "sector", "case", "event", "other"],
  source_kind: ["manufacturer", "standard", "regulator", "technical_reference", "other"],
  cta_id: ["primary_contact", "header_contact", "plantpax_architecture", "contact_alternative", "search_result", "source_reference", "newsletter"],
  subject: ["triagem", "diagnostico", "portfolio", "plantpax", "factorytalk", "factorytalk-view-se", "redes-cyber", "migracao-plc", "migracao-slc500", "modernizacao-scada", "dados-industriais", "infraestrutura-ot", "pi-system", "data-centers-industriais", "acucar-e-etanol", "automacao-maringa", "automacao-parana", "servicos-automacao", "programacao-clp", "comissionamento-industrial", "catalogo-tecnico", "tecnologias-multivendor", "certificacoes", "case-similar", "blog", "greenfield", "integrador", "parceria", "conteudo", "outro", "unspecified"],
  channel: ["contact_form"],
  failure_code: ["validation", "turnstile_missing", "turnstile_expired", "turnstile_invalid", "timeout", "network", "server_rejected", "invalid_response", "unknown"],
} as const;

const EVENT_FIELDS = {
  search_executed: ["result_count_bucket"],
  search_result_opened: ["result_position_bucket", "content_type"],
  source_opened: ["source_kind"],
  cta_clicked: ["cta_id"],
  form_started: ["subject"],
  request_accepted: ["subject", "channel"],
  request_failed: ["failure_code"],
} as const;

type FieldName = keyof typeof FIELD_VALUES;
export type PortalMetricFields = Partial<Record<FieldName, string>>;

export interface PortalMetricDetail {
  version: 1;
  name: PortalMetricName;
  path: string;
  fields: Readonly<PortalMetricFields>;
}

interface EmitOptions {
  onceKey?: string;
  path?: string;
}

const emittedOnceKeys = new Set<string>();

export function metricSubject(value: string | null | undefined): string {
  if (!value) return "unspecified";
  const allowed = FIELD_VALUES.subject as readonly string[];
  return allowed.includes(value) ? value : "outro";
}

export function classifyRequestFailure(error: unknown): "timeout" | "network" {
  return error instanceof DOMException && error.name === "TimeoutError"
    ? "timeout"
    : "network";
}

export function isAcceptedResponse(responseOk: boolean, data: unknown): boolean {
  return (
    responseOk &&
    data !== null &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    "ok" in data &&
    data.ok === true
  );
}

export function bucketCount(count: number): CountBucket {
  if (!Number.isFinite(count) || count <= 0) return "0";
  if (count <= 5) return "1_5";
  if (count <= 12) return "6_12";
  if (count <= 25) return "13_25";
  if (count <= 50) return "26_50";
  return "51_plus";
}

function canonicalPath(candidate: string): string | null {
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return null;
  if (candidate.includes("?") || candidate.includes("#") || candidate.includes("\\")) return null;
  if (/[@\u0000-\u001f\u007f]/.test(candidate)) return null;
  try {
    const decoded = decodeURIComponent(candidate);
    if (decoded.includes("?") || decoded.includes("#") || decoded.includes("\\")) return null;
    if (/[@\u0000-\u001f\u007f]/.test(decoded)) return null;
  } catch {
    return null;
  }
  return candidate.replace(/\/{2,}/g, "/");
}

function validFields(name: PortalMetricName, fields: PortalMetricFields): boolean {
  const allowed = EVENT_FIELDS[name] as readonly FieldName[];
  const entries = Object.entries(fields);
  if (entries.length !== allowed.length) return false;
  if (entries.some(([key]) => !allowed.includes(key as FieldName))) return false;
  return entries.every(([key, value]) =>
    (FIELD_VALUES[key as FieldName] as readonly string[]).includes(value),
  );
}

export function emitPortalMetric(
  name: PortalMetricName,
  fields: PortalMetricFields,
  options: EmitOptions = {},
): boolean {
  if (!(PORTAL_METRIC_NAMES as readonly string[]).includes(name)) return false;
  if (!validFields(name, fields)) return false;
  const path = canonicalPath(options.path ?? window.location.pathname);
  if (!path) return false;

  const onceKey = options.onceKey ? `${name}:${options.onceKey}` : "";
  if (onceKey && emittedOnceKeys.has(onceKey)) return false;

  const detail: PortalMetricDetail = Object.freeze({
    version: 1,
    name,
    path,
    fields: Object.freeze({ ...fields }),
  });
  window.dispatchEvent(new CustomEvent<PortalMetricDetail>(PORTAL_METRIC_EVENT, { detail }));
  if (onceKey) emittedOnceKeys.add(onceKey);
  return true;
}

export function resetPortalMetricOnceKeysForTests(): void {
  emittedOnceKeys.clear();
}
