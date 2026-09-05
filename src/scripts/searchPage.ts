export interface PagefindResultData {
  url: string;
  meta: { title?: string };
  excerpt: string;
  filters?: Record<string, string[]>;
}

export interface PagefindSearchResult {
  data: () => Promise<PagefindResultData>;
}

export interface PagefindModule {
  init: () => Promise<void> | void;
  search: (
    query: string,
    options?: { filters?: Record<string, string> },
  ) => Promise<{ results: PagefindSearchResult[] }>;
}

interface SearchPageOptions {
  loadPagefind?: () => Promise<PagefindModule>;
  debounceMs?: number;
}

const BATCH_SIZE = 12;
const SECTION_LABELS: Record<string, string> = {
  solucoes: "Soluções", servicos: "Serviços", tecnologias: "Tecnologias",
  setores: "Setores", cases: "Cases", blog: "Guia/artigo", eventos: "Eventos",
  "integra-acao": "Integra Ação", empresa: "Empresa", equipe: "Equipe",
  certificacoes: "Certificações", contato: "Contato",
};

const defaultLoader = async (): Promise<PagefindModule> => {
  const path = "/pagefind/pagefind.js";
  return await import(/* @vite-ignore */ path) as PagefindModule;
};

function safeInternalUrl(url: string): string {
  return url.startsWith("/") && !url.startsWith("//") ? url : "/";
}

function sectionOf(url: string): string {
  const first = url.split("/").filter(Boolean)[0] ?? "";
  return SECTION_LABELS[first] ?? "Site";
}

function metricContentType(value: string | undefined): string {
  const aliases: Record<string, string> = {
    tecnologia: "technology",
    tecnologias: "technology",
    solucao: "solution",
    solucoes: "solution",
    guia: "guide",
    artigo: "article",
    blog: "article",
    "guide-article": "article",
    setor: "sector",
    setores: "sector",
    cases: "case",
    eventos: "event",
  };
  const normalized = value?.toLowerCase() ?? "";
  if (aliases[normalized]) return aliases[normalized];
  if (["technology", "solution", "guide", "article", "sector", "case", "event"].includes(normalized)) {
    return normalized;
  }
  return "other";
}

export function initSearchPage(
  root: Document = document,
  { loadPagefind = defaultLoader, debounceMs = 220 }: SearchPageOptions = {},
): { search(query: string): Promise<void>; whenIdle(): Promise<void>; destroy(): void } {
  const input = root.getElementById("site-search");
  const kind = root.getElementById("search-kind");
  const status = root.getElementById("search-status");
  const list = root.getElementById("search-results");
  const more = root.getElementById("search-more");
  if (!(input instanceof HTMLInputElement) || !(kind instanceof HTMLSelectElement) ||
      !(status instanceof HTMLElement) || !(list instanceof HTMLOListElement) ||
      !(more instanceof HTMLButtonElement)) {
    return { search: async () => {}, whenIdle: async () => {}, destroy() {} };
  }

  let pagefind: PagefindModule | null = null;
  let loading: Promise<PagefindModule> | null = null;
  let failed = false;
  let sequence = 0;
  let timer = 0;
  let currentResults: PagefindSearchResult[] = [];
  let shown = 0;
  let activeQuery = "";
  let activeTask: Promise<void> = Promise.resolve();
  let batchSequence: number | null = null;

  const ensurePagefind = async () => {
    if (pagefind || failed) return pagefind;
    loading ??= loadPagefind().then(async (module) => {
      await module.init();
      pagefind = module;
      return module;
    });
    try { return await loading; }
    catch {
      failed = true;
      status.textContent = "Busca temporariamente indisponível. Consulte o catálogo técnico pelo menu ou entre em contato com a equipe.";
      return null;
    }
  };

  const clear = () => {
    list.replaceChildren();
    more.hidden = true;
    more.disabled = false;
    more.removeAttribute("aria-busy");
    batchSequence = null;
    currentResults = [];
    shown = 0;
  };

  const updateStatus = () => {
    const total = currentResults.length;
    status.textContent = `${shown} de ${total} resultado${total === 1 ? "" : "s"} exibido${shown === 1 ? "" : "s"} para “${activeQuery}”.`;
    more.hidden = shown >= total;
  };

  const appendBatch = async (seq: number) => {
    if (seq !== sequence || batchSequence === seq) return;
    batchSequence = seq;
    more.disabled = true;
    more.setAttribute("aria-busy", "true");
    try {
    const next = currentResults.slice(shown, shown + BATCH_SIZE);
    const data = await Promise.all(next.map((item) => item.data()));
    if (seq !== sequence) return;
    for (const [batchIndex, item] of data.entries()) {
      const li = root.createElement("li");
      li.className = "rounded-lg border border-integra-gray-200 bg-integra-white p-5 transition-colors hover:border-integra-gray-900";
      const link = root.createElement("a");
      link.href = safeInternalUrl(item.url);
      link.className = "group block";
      link.dataset.metricPosition = bucketCount(shown + batchIndex + 1);
      link.dataset.metricContentType = metricContentType(
        item.filters?.content_kind?.[0],
      );
      const section = root.createElement("p");
      section.className = "mb-1.5 font-mono text-[11px] uppercase tracking-widest text-integra-red-700";
      section.textContent = sectionOf(item.url);
      const title = root.createElement("p");
      title.className = "text-base font-semibold text-integra-gray-900 group-hover:text-integra-red-700 transition-colors";
      title.textContent = item.meta.title ?? item.url;
      const excerpt = root.createElement("p");
      excerpt.className = "mt-2 text-sm leading-relaxed text-integra-gray-700";
      excerpt.innerHTML = `…${item.excerpt}…`;
      link.appendChild(section);
      link.appendChild(title);
      link.appendChild(excerpt);
      li.appendChild(link);
      list.appendChild(li);
    }
    shown += data.length;
    updateStatus();
    } finally {
      if (seq === sequence) {
        batchSequence = null;
        more.disabled = false;
        more.removeAttribute("aria-busy");
      }
    }
  };

  const search = async (query: string) => {
    const seq = ++sequence;
    const trimmed = query.trim();
    activeQuery = trimmed;
    clear();
    if (trimmed.length < 2) {
      clear();
      status.textContent = trimmed ? "Digite ao menos 2 caracteres." : "Digite para buscar — o índice é carregado sob demanda.";
      return;
    }
    status.textContent = "Buscando…";
    try {
      const api = await ensurePagefind();
      if (!api || seq !== sequence) return;
      const options = kind.value ? { filters: { content_kind: kind.value } } : undefined;
      const response = await api.search(trimmed, options);
      if (seq !== sequence) return;
      clear();
      currentResults = response.results;
      emitPortalMetric("search_executed", {
        result_count_bucket: bucketCount(currentResults.length),
      });
      if (currentResults.length === 0) {
        status.textContent = `Nenhum resultado para “${trimmed}”.`;
        return;
      }
      await appendBatch(seq);
    } catch {
      if (seq !== sequence) return;
      clear();
      status.textContent = "Não foi possível concluir a busca. Tente novamente.";
    }
  };

  const scheduleSearch = () => {
    window.clearTimeout(timer);
    ++sequence;
    clear();
    status.textContent = "Buscando…";
    activeTask = new Promise<void>((resolve) => {
      timer = window.setTimeout(() => { activeTask = search(input.value); void activeTask.finally(resolve); }, debounceMs);
    });
  };
  const loadMore = () => {
    if (more.disabled || more.hidden || shown >= currentResults.length) return;
    const seq = sequence;
    activeTask = appendBatch(seq).catch(() => {
      if (seq !== sequence) return;
      status.textContent = `${shown} de ${currentResults.length} resultados exibidos. Não foi possível carregar os próximos. Tente novamente.`;
    });
  };
  const trackResultOpen = (event: Event) => {
    const target = event.target instanceof Element
      ? event.target.closest<HTMLAnchorElement>("a[data-metric-position]")
      : null;
    if (!target || !list.contains(target)) return;
    emitPortalMetric("search_result_opened", {
      result_position_bucket: target.dataset.metricPosition,
      content_type: target.dataset.metricContentType,
    });
  };
  input.addEventListener("input", scheduleSearch);
  kind.addEventListener("change", scheduleSearch);
  more.addEventListener("click", loadMore);
  list.addEventListener("click", trackResultOpen);

  const initial = new URL(root.defaultView?.location.href ?? window.location.href).searchParams.get("q");
  if (initial) { input.value = initial; activeTask = search(initial); }
  input.focus();

  return {
    search(query) { input.value = query; activeTask = search(query); return activeTask; },
    whenIdle() { return activeTask; },
    destroy() {
      ++sequence;
      window.clearTimeout(timer);
      input.removeEventListener("input", scheduleSearch);
      kind.removeEventListener("change", scheduleSearch);
      more.removeEventListener("click", loadMore);
      list.removeEventListener("click", trackResultOpen);
    },
  };
}
import { bucketCount, emitPortalMetric } from "./portalMetrics";
