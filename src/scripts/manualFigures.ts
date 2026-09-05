import { acquireOverlayLock, releaseOverlayLock } from "./overlayLock";

const initialized = new WeakSet<HTMLElement>();
let serial = 0;

export function initManualFigures(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-manual-reference]").forEach((figure) => {
    if (initialized.has(figure)) return;
    const trigger = figure.querySelector<HTMLAnchorElement>("[data-figure-open]");
    const dialog = figure.querySelector<HTMLDialogElement>("dialog");
    const close = dialog?.querySelector<HTMLButtonElement>("[data-figure-close]");
    if (!trigger || !dialog || !close || typeof dialog.showModal !== "function") return;
    initialized.add(figure);
    const token = `manual-figure-${++serial}`;
    trigger.addEventListener("click", (event) => {
      // Modified clicks retain normal link behavior and the full-image fallback.
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      dialog.showModal();
      acquireOverlayLock(token);
      close.focus();
    });
    close.addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => {
      releaseOverlayLock(token);
      trigger.focus({ preventScroll: true });
    });
  });
}
