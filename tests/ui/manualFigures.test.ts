import { afterEach, describe, expect, it, vi } from "vitest";
import { initManualFigures } from "../../src/scripts/manualFigures";
import { clearOverlayLocks } from "../../src/scripts/overlayLock";

afterEach(() => { clearOverlayLocks(); document.body.innerHTML = ""; });
describe("manual figure dialog", () => {
  it("opens the requested figure, isolates scroll and returns focus on close", () => {
    document.body.innerHTML = '<figure data-manual-reference><a data-figure-open href="/figure.jpg">Ampliar</a><dialog><button data-figure-close>Fechar</button></dialog></figure>';
    const dialog = document.querySelector("dialog")!;
    const link = document.querySelector("a")!;
    dialog.showModal = vi.fn(() => dialog.setAttribute("open", ""));
    dialog.close = vi.fn(() => { dialog.removeAttribute("open"); dialog.dispatchEvent(new Event("close")); });
    initManualFigures(document);
    initManualFigures(document);
    link.focus(); link.click();
    expect(dialog.showModal).toHaveBeenCalledTimes(1);
    expect(document.documentElement.style.overflow).toBe("hidden");
    document.querySelector("button")!.click();
    expect(dialog.open).toBe(false);
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.activeElement).toBe(link);
  });
  it("restores focus after the native Escape/cancel close path", () => {
    document.body.innerHTML = '<figure data-manual-reference><a data-figure-open href="/figure.jpg">Ampliar</a><dialog><button data-figure-close>Fechar</button></dialog></figure>';
    const dialog = document.querySelector("dialog")!;
    dialog.showModal = () => dialog.setAttribute("open", "");
    initManualFigures(document);
    const link = document.querySelector("a")!;
    link.click();
    dialog.removeAttribute("open"); dialog.dispatchEvent(new Event("close"));
    expect(document.activeElement).toBe(link);
    expect(document.documentElement.dataset.overlayLocks).toBeUndefined();
  });
});
