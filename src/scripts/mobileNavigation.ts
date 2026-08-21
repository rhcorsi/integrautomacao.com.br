import {
  acquireOverlayLock,
  releaseOverlayLock,
} from "./overlayLock";

const DESKTOP_QUERY = "(min-width: 1440px)";
const MOBILE_MENU_OVERLAY = "mobile-menu";
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

interface CloseOptions {
  returnFocus?: boolean;
}

function isVisibleControl(element: HTMLElement): boolean {
  if (
    element.hidden ||
    element.closest("[hidden], [inert]") ||
    element.closest(".hidden") ||
    element.getAttribute("aria-hidden") === "true"
  ) {
    return false;
  }

  if (element instanceof HTMLInputElement && element.type === "hidden") {
    return false;
  }

  if (element.tabIndex < 0) return false;
  if (element.matches(":disabled")) return false;

  const closedDetails = element.closest("details:not([open])");
  if (closedDetails && element.tagName !== "SUMMARY") return false;

  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden";
}

function panelControls(menu: HTMLElement): HTMLElement[] {
  return [...menu.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    isVisibleControl,
  );
}

function containTab(
  event: KeyboardEvent,
  toggle: HTMLButtonElement,
  menu: HTMLElement,
): void {
  const controls = panelControls(menu);
  const first = controls[0];
  const last = controls.at(-1);
  if (!first || !last) return;

  const active = document.activeElement;
  let destination: HTMLElement | undefined;

  if (event.shiftKey) {
    if (active === first) destination = toggle;
    else if (active === toggle) destination = last;
  } else if (active === last) {
    destination = toggle;
  } else if (active === toggle) {
    destination = first;
  }

  if (!destination) return;
  event.preventDefault();
  destination.focus();
}

export function initMobileNavigation(
  root: Document = document,
): { destroy(): void } {
  const header = root.querySelector<HTMLElement>("[data-site-header]");
  const toggle = root.querySelector<HTMLButtonElement>("[data-menu-toggle]");
  const menu = root.getElementById("mobile-nav");
  const iconOpen = toggle?.querySelector<HTMLElement>("[data-icon-open]");
  const iconClose = toggle?.querySelector<HTMLElement>("[data-icon-close]");

  if (!header || !toggle || !menu || !iconOpen || !iconClose) {
    return { destroy() {} };
  }

  const view = root.defaultView ?? window;
  const rootElement = root.documentElement;
  let destroyed = false;

  const setHeaderHeight = () => {
    rootElement.style.setProperty(
      "--site-header-height",
      `${header.getBoundingClientRect().height}px`,
    );
  };

  const syncClosedState = () => {
    menu.classList.add("hidden");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menu");
    iconOpen.classList.remove("hidden");
    iconClose.classList.add("hidden");
    delete rootElement.dataset.mobileMenuOpen;
    releaseOverlayLock(MOBILE_MENU_OVERLAY);
  };

  const close = ({ returnFocus = false }: CloseOptions = {}) => {
    const wasOpen = !menu.classList.contains("hidden");
    syncClosedState();
    if (returnFocus && wasOpen) toggle.focus();
  };

  const open = () => {
    menu.classList.remove("hidden");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Fechar menu");
    iconOpen.classList.add("hidden");
    iconClose.classList.remove("hidden");
    rootElement.dataset.mobileMenuOpen = "true";
    acquireOverlayLock(MOBILE_MENU_OVERLAY);
    panelControls(menu)[0]?.focus();
  };

  const onToggle = () => {
    if (menu.classList.contains("hidden")) open();
    else close({ returnFocus: true });
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (menu.classList.contains("hidden")) return;

    if (event.key === "Escape") {
      event.preventDefault();
      close({ returnFocus: true });
    } else if (event.key === "Tab") {
      containTab(event, toggle, menu);
    }
  };

  const onDocumentClick = (event: MouseEvent) => {
    if (
      menu.classList.contains("hidden") ||
      !(event.target instanceof Node) ||
      header.contains(event.target)
    ) {
      return;
    }

    close({ returnFocus: true });
  };

  const onMenuClick = (event: MouseEvent) => {
    if (
      !menu.classList.contains("hidden") &&
      event.target instanceof Element &&
      event.target.closest("a")
    ) {
      close();
    }
  };

  const desktop = view.matchMedia(DESKTOP_QUERY);
  const onDesktopChange = () => {
    if (!desktop.matches) return;
    close();
    for (const details of menu.querySelectorAll("details[open]")) {
      details.removeAttribute("open");
    }
  };

  setHeaderHeight();
  syncClosedState();

  toggle.addEventListener("click", onToggle);
  root.addEventListener("keydown", onKeydown);
  root.addEventListener("click", onDocumentClick);
  menu.addEventListener("click", onMenuClick);
  desktop.addEventListener("change", onDesktopChange);

  let resizeObserver: ResizeObserver | undefined;
  let usesResizeFallback = false;
  if (typeof ResizeObserver === "function") {
    resizeObserver = new ResizeObserver(setHeaderHeight);
    resizeObserver.observe(header);
  } else {
    usesResizeFallback = true;
    view.addEventListener("resize", setHeaderHeight);
  }

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;

      toggle.removeEventListener("click", onToggle);
      root.removeEventListener("keydown", onKeydown);
      root.removeEventListener("click", onDocumentClick);
      menu.removeEventListener("click", onMenuClick);
      desktop.removeEventListener("change", onDesktopChange);
      resizeObserver?.disconnect();
      if (usesResizeFallback) {
        view.removeEventListener("resize", setHeaderHeight);
      }

      close();
      rootElement.style.removeProperty("--site-header-height");
    },
  };
}
