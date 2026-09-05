import { beforeEach, describe, expect, it, vi } from "vitest";
import { initSearchPage, type PagefindModule } from "../../src/scripts/searchPage";
import { PORTAL_METRIC_EVENT } from "../../src/scripts/portalMetrics";

function result(index: number, kind = "technology") {
  return {
    data: vi.fn(async () => ({
      url: `/resultado-${index}/`,
      meta: { title: `Resultado ${index}` },
      excerpt: `Trecho ${index}`,
      filters: { content_kind: [kind] },
    })),
  };
}

function fixture() {
  document.body.innerHTML = `
    <input id="site-search" />
    <select id="search-kind"><option value="">Todos</option><option value="technology">Tecnologia</option><option value="case">Case</option></select>
    <p id="search-status"></p>
    <ol id="search-results"></ol>
    <button id="search-more" hidden>Carregar mais</button>`;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => fixture());

describe("initSearchPage", () => {
  it("serializes rapid load-more clicks so every result appears exactly once", async () => {
    const batch = deferred<void>();
    const results = Array.from({ length: 25 }, (_, index) => ({ data: async () => {
      if (index >= 12) await batch.promise;
      return { url: `/result-${index}/`, meta: { title: `R ${index}` }, excerpt: "Trecho" };
    } }));
    const controller = initSearchPage(document, { loadPagefind: async () => ({ init() {}, search: async () => ({ results }) }) });
    await controller.search("PlantPAx");
    document.getElementById("search-more")!.click();
    document.getElementById("search-more")!.click();
    batch.resolve(); await controller.whenIdle();
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("#search-results a"));
    expect(links).toHaveLength(24);
    expect(new Set(links.map((link) => link.href)).size).toBe(24);
    expect(document.getElementById("search-status")!.textContent).toContain("24 de 25");
    controller.destroy();
  });

  it("clears the old batch immediately when another query starts", async () => {
    const next = deferred<{ results: ReturnType<typeof result>[] }>();
    const controller = initSearchPage(document, { loadPagefind: async () => ({ init() {}, search: async (q) => q === "nova" ? next.promise : { results: Array.from({ length: 25 }, (_, i) => result(i)) } }) });
    await controller.search("antiga");
    const pending = controller.search("nova");
    document.getElementById("search-more")!.click();
    expect(document.querySelectorAll("#search-results li")).toHaveLength(0);
    next.resolve({ results: [result(99)] }); await pending;
    expect(document.querySelectorAll("#search-results li")).toHaveLength(1);
    expect(document.querySelector("#search-results")!.textContent).toContain("Resultado 99");
    controller.destroy();
  });

  it("keeps existing results and offers retry when loading the next batch fails", async () => {
    const results = Array.from({ length: 13 }, (_, i) => result(i));
    results[12].data.mockRejectedValueOnce(new Error("offline"));
    const controller = initSearchPage(document, { loadPagefind: async () => ({ init() {}, search: async () => ({ results }) }) });
    await controller.search("PlantPAx");
    document.getElementById("search-more")!.click(); await controller.whenIdle();
    expect(document.querySelectorAll("#search-results li")).toHaveLength(12);
    expect(document.getElementById("search-status")!.textContent).toContain("Tente novamente");
    document.getElementById("search-more")!.click(); await controller.whenIdle();
    expect(document.querySelectorAll("#search-results li")).toHaveLength(13);
    controller.destroy();
  });
  it("emits privacy-safe search completion and delegated result-open events", async () => {
    const events: CustomEvent[] = [];
    const listener = (event: Event) => events.push(event as CustomEvent);
    window.addEventListener(PORTAL_METRIC_EVENT, listener);
    const pagefind: PagefindModule = {
      init: vi.fn(),
      search: vi.fn(async () => ({ results: [result(1, "technology")] })),
    };
    const controller = initSearchPage(document, { loadPagefind: async () => pagefind, debounceMs: 0 });

    await controller.search("email@example.com projeto secreto");
    (document.querySelector("#search-results a") as HTMLAnchorElement).click();

    expect(events.map((event) => event.detail)).toEqual([
      expect.objectContaining({ name: "search_executed", fields: { result_count_bucket: "1_5" } }),
      expect.objectContaining({ name: "search_result_opened", fields: { result_position_bucket: "1_5", content_type: "technology" } }),
    ]);
    expect(JSON.stringify(events.map((event) => event.detail))).not.toContain("projeto secreto");
    controller.destroy();
    window.removeEventListener(PORTAL_METRIC_EVENT, listener);
  });

  it("shows 12 results first and loads every remaining result in batches", async () => {
    const results = Array.from({ length: 25 }, (_, index) => result(index + 1));
    const pagefind: PagefindModule = { init: vi.fn(), search: vi.fn(async () => ({ results })) };
    const controller = initSearchPage(document, { loadPagefind: async () => pagefind, debounceMs: 0 });

    await controller.search("PlantPAx");
    expect(document.querySelectorAll("#search-results > li")).toHaveLength(12);
    expect(document.getElementById("search-status")?.textContent).toContain("12 de 25");

    document.getElementById("search-more")?.click();
    await controller.whenIdle();
    expect(document.querySelectorAll("#search-results > li")).toHaveLength(24);
    document.getElementById("search-more")?.click();
    await controller.whenIdle();

    expect(document.querySelectorAll("#search-results > li")).toHaveLength(25);
    expect(document.getElementById("search-status")?.textContent).toContain("25 de 25");
    expect((document.getElementById("search-more") as HTMLButtonElement).hidden).toBe(true);
  });

  it("discards a slower query after a newer query has rendered", async () => {
    const oldSearch = deferred<{ results: ReturnType<typeof result>[] }>();
    const pagefind: PagefindModule = {
      init: vi.fn(),
      search: vi.fn((query) => query === "antiga" ? oldSearch.promise : Promise.resolve({ results: [result(2)] })),
    };
    const controller = initSearchPage(document, { loadPagefind: async () => pagefind, debounceMs: 0 });

    const oldRun = controller.search("antiga");
    await controller.search("nova");
    oldSearch.resolve({ results: [result(1)] });
    await oldRun;

    expect(document.querySelector("#search-results")?.textContent).toContain("Resultado 2");
    expect(document.querySelector("#search-results")?.textContent).not.toContain("Resultado 1");
  });

  it("sends the selected content kind to Pagefind and resets pagination", async () => {
    const search = vi.fn(async (_query: string, options?: { filters?: Record<string, string> }) => ({
      results: Array.from({ length: 14 }, (_, index) => result(index + 1, options?.filters?.content_kind)),
    }));
    const pagefind: PagefindModule = { init: vi.fn(), search };
    const controller = initSearchPage(document, { loadPagefind: async () => pagefind, debounceMs: 0 });

    await controller.search("rede");
    document.getElementById("search-more")?.click();
    await controller.whenIdle();
    expect(document.querySelectorAll("#search-results > li")).toHaveLength(14);

    const select = document.getElementById("search-kind") as unknown as {
      value: string;
      dispatchEvent(event: Event): boolean;
    };
    select.value = "case";
    select.dispatchEvent(new Event("change"));
    await controller.whenIdle();

    expect(search).toHaveBeenLastCalledWith("rede", { filters: { content_kind: "case" } });
    expect(document.querySelectorAll("#search-results > li")).toHaveLength(12);
  });
});
