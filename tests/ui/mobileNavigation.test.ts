import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initMobileNavigation } from "../../src/scripts/mobileNavigation";
import {
  acquireOverlayLock,
  clearOverlayLocks,
  releaseOverlayLock,
} from "../../src/scripts/overlayLock";

const DESKTOP_QUERY = "(min-width: 1440px)";

interface ControllableMediaQueryList extends MediaQueryList {
  setMatches(matches: boolean): void;
}

interface Fixture {
  header: HTMLElement;
  toggle: HTMLButtonElement;
  iconOpen: HTMLElement;
  iconClose: HTMLElement;
  menu: HTMLElement;
  firstLink: HTMLAnchorElement;
  middleButton: HTMLButtonElement;
  summary: HTMLElement;
  lastLink: HTMLAnchorElement;
  details: HTMLDetailsElement;
  outside: HTMLButtonElement;
  setHeaderHeight(height: number): void;
}

class ResizeObserverMock implements ResizeObserver {
  static instances: ResizeObserverMock[] = [];

  readonly observe = vi.fn<(target: Element) => void>();
  readonly unobserve = vi.fn<(target: Element) => void>();
  readonly disconnect = vi.fn<() => void>();

  constructor(private readonly callback: ResizeObserverCallback) {
    ResizeObserverMock.instances.push(this);
  }

  trigger(): void {
    this.callback([], this);
  }
}

function createMediaQueryList(): ControllableMediaQueryList {
  const mediaQuery = new EventTarget() as ControllableMediaQueryList;
  let matches = false;

  Object.defineProperties(mediaQuery, {
    matches: { get: () => matches },
    media: { value: DESKTOP_QUERY },
    onchange: { value: null, writable: true },
  });

  mediaQuery.setMatches = (nextMatches: boolean) => {
    matches = nextMatches;
    mediaQuery.dispatchEvent(new Event("change"));
  };
  return mediaQuery;
}

function createFixture(): Fixture {
  document.body.innerHTML = `
    <header data-site-header>
      <button
        type="button"
        aria-controls="mobile-nav"
        aria-expanded="true"
        aria-label="Fechar menu"
        data-menu-toggle
      >
        <span class="hidden" data-icon-open>abrir</span>
        <span data-icon-close>fechar</span>
      </button>
      <nav id="mobile-nav" class="hidden fixture-panel" aria-label="Principal (mobile)">
        <a id="first-link" href="/busca/">Buscar no site</a>
        <button id="middle-button" type="button">Ação intermediária</button>
        <button type="button" disabled>Desabilitado</button>
        <a href="/oculto/" hidden>Oculto por atributo</a>
        <a href="/oculto-classe/" class="hidden">Oculto por classe</a>
        <details open>
          <summary id="details-summary">Soluções</summary>
          <a id="last-link" href="/solucoes/">Último link</a>
        </details>
        <button type="button" disabled tabindex="0">
          Desabilitado mesmo com tabindex explícito
        </button>
        <a href="/ignorado/" tabindex="-1">Ignorado por tabindex</a>
      </nav>
    </header>
    <button id="outside" type="button">Fora do cabeçalho</button>
  `;

  const header = document.querySelector<HTMLElement>("[data-site-header]")!;
  const toggle = document.querySelector<HTMLButtonElement>("[data-menu-toggle]")!;
  const iconOpen = toggle.querySelector<HTMLElement>("[data-icon-open]")!;
  const iconClose = toggle.querySelector<HTMLElement>("[data-icon-close]")!;
  const menu = document.getElementById("mobile-nav")!;
  const firstLink = document.getElementById("first-link") as HTMLAnchorElement;
  const middleButton = document.getElementById("middle-button") as HTMLButtonElement;
  const summary = document.getElementById("details-summary")!;
  const lastLink = document.getElementById("last-link") as HTMLAnchorElement;
  const details = document.querySelector("details")!;
  const outside = document.getElementById("outside") as HTMLButtonElement;
  let height = 80;

  vi.spyOn(header, "getBoundingClientRect").mockImplementation(
    () =>
      ({
        x: 0,
        y: 0,
        top: 0,
        right: 1200,
        bottom: height,
        left: 0,
        width: 1200,
        height,
        toJSON: () => ({}),
      }) as DOMRect,
  );

  return {
    header,
    toggle,
    iconOpen,
    iconClose,
    menu,
    firstLink,
    middleButton,
    summary,
    lastLink,
    details,
    outside,
    setHeaderHeight(nextHeight: number) {
      height = nextHeight;
    },
  };
}

function dispatchTab(shiftKey = false): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key: "Tab",
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  return event;
}

function dispatchEscape(): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  return event;
}

let fixture: Fixture;
let mediaQuery: ControllableMediaQueryList;
let controllers: Array<{ destroy(): void }>;

function initialize(): { destroy(): void } {
  const controller = initMobileNavigation(document);
  controllers.push(controller);
  return controller;
}

beforeEach(() => {
  clearOverlayLocks();
  document.documentElement.removeAttribute("data-mobile-menu-open");
  document.documentElement.style.removeProperty("--site-header-height");
  document.body.innerHTML = "";
  ResizeObserverMock.instances = [];
  controllers = [];
  fixture = createFixture();
  mediaQuery = createMediaQueryList();
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  vi.spyOn(window, "matchMedia").mockImplementation((query) => {
    expect(query).toBe(DESKTOP_QUERY);
    return mediaQuery;
  });
});

afterEach(() => {
  for (const controller of controllers.reverse()) controller.destroy();
  clearOverlayLocks();
  document.documentElement.removeAttribute("data-mobile-menu-open");
  document.documentElement.style.removeProperty("--site-header-height");
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("initMobileNavigation", () => {
  it("measures immediately and normalizes the initially closed controls without moving focus", () => {
    fixture.outside.focus();

    initialize();

    expect(fixture.header.getBoundingClientRect).toHaveBeenCalledTimes(1);
    expect(document.documentElement.style.getPropertyValue("--site-header-height"))
      .toBe("80px");
    expect(fixture.menu.classList.contains("hidden")).toBe(true);
    expect(fixture.toggle.getAttribute("aria-expanded")).toBe("false");
    expect(fixture.toggle.getAttribute("aria-label")).toBe("Abrir menu");
    expect(fixture.iconOpen.classList.contains("hidden")).toBe(false);
    expect(fixture.iconClose.classList.contains("hidden")).toBe(true);
    expect(document.documentElement.hasAttribute("data-mobile-menu-open")).toBe(false);
    expect(document.activeElement).toBe(fixture.outside);
    expect(window.matchMedia).toHaveBeenCalledWith(DESKTOP_QUERY);
    expect(ResizeObserverMock.instances).toHaveLength(1);
    expect(ResizeObserverMock.instances[0]?.observe).toHaveBeenCalledWith(fixture.header);
  });

  it("opens by changing only the panel visibility class, acquires only its lock, and focuses the first control", () => {
    acquireOverlayLock("image-dialog");
    initialize();

    fixture.toggle.click();

    expect(fixture.menu.className).toBe("fixture-panel");
    expect(fixture.toggle.getAttribute("aria-expanded")).toBe("true");
    expect(fixture.toggle.getAttribute("aria-label")).toBe("Fechar menu");
    expect(fixture.iconOpen.classList.contains("hidden")).toBe(true);
    expect(fixture.iconClose.classList.contains("hidden")).toBe(false);
    expect(document.documentElement.dataset.mobileMenuOpen).toBe("true");
    expect(document.documentElement.dataset.overlayLocks).toBe("image-dialog mobile-menu");
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.activeElement).toBe(fixture.firstLink);

    releaseOverlayLock("image-dialog");
  });

  it("closes from the toggle, restores its normalized state, and returns focus", () => {
    initialize();
    fixture.toggle.click();

    fixture.toggle.click();

    expect(fixture.menu.classList.contains("hidden")).toBe(true);
    expect(fixture.toggle.getAttribute("aria-expanded")).toBe("false");
    expect(fixture.toggle.getAttribute("aria-label")).toBe("Abrir menu");
    expect(fixture.iconOpen.classList.contains("hidden")).toBe(false);
    expect(fixture.iconClose.classList.contains("hidden")).toBe(true);
    expect(document.documentElement.hasAttribute("data-mobile-menu-open")).toBe(false);
    expect(document.documentElement.hasAttribute("data-overlay-locks")).toBe(false);
    expect(document.activeElement).toBe(fixture.toggle);
  });

  it.each([
    {
      label: "Tab from the last panel control to the toggle",
      start: () => fixture.lastLink,
      shiftKey: false,
      expected: () => fixture.toggle,
    },
    {
      label: "Tab from the toggle to the first panel control",
      start: () => fixture.toggle,
      shiftKey: false,
      expected: () => fixture.firstLink,
    },
    {
      label: "Shift+Tab from the first panel control to the toggle",
      start: () => fixture.firstLink,
      shiftKey: true,
      expected: () => fixture.toggle,
    },
    {
      label: "Shift+Tab from the toggle to the last panel control",
      start: () => fixture.toggle,
      shiftKey: true,
      expected: () => fixture.lastLink,
    },
  ])("contains $label while open", ({ start, shiftKey, expected }) => {
    initialize();
    fixture.toggle.click();
    start().focus();

    const event = dispatchTab(shiftKey);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(expected());
  });

  it("does not intercept Tab while closed", () => {
    initialize();
    fixture.outside.focus();

    const event = dispatchTab();

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(fixture.outside);
  });

  it("closes on Escape and returns focus to the toggle", () => {
    initialize();
    fixture.toggle.click();
    fixture.middleButton.focus();

    const event = dispatchEscape();

    expect(event.defaultPrevented).toBe(true);
    expect(fixture.menu.classList.contains("hidden")).toBe(true);
    expect(document.activeElement).toBe(fixture.toggle);
  });

  it("waits for an outside click rather than pointerdown, then closes and returns focus", () => {
    initialize();
    fixture.toggle.click();
    fixture.outside.focus();

    fixture.outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(fixture.menu.classList.contains("hidden")).toBe(false);
    expect(document.documentElement.dataset.overlayLocks).toBe("mobile-menu");

    fixture.outside.click();

    expect(fixture.menu.classList.contains("hidden")).toBe(true);
    expect(document.documentElement.hasAttribute("data-overlay-locks")).toBe(false);
    expect(document.activeElement).toBe(fixture.toggle);
  });

  it("closes after a delegated internal link click without forcing focus to the toggle", () => {
    initialize();
    fixture.toggle.click();
    const toggleFocus = vi.spyOn(fixture.toggle, "focus");

    fixture.firstLink.click();

    expect(fixture.menu.classList.contains("hidden")).toBe(true);
    expect(toggleFocus).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(fixture.toggle);
  });

  it("does not steal focus for an outside click while already closed", () => {
    initialize();
    fixture.outside.focus();
    const toggleFocus = vi.spyOn(fixture.toggle, "focus");

    fixture.outside.click();

    expect(fixture.menu.classList.contains("hidden")).toBe(true);
    expect(toggleFocus).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(fixture.outside);
  });

  it("resets on the desktop breakpoint without moving focus or releasing another overlay", () => {
    acquireOverlayLock("image-dialog");
    initialize();
    fixture.toggle.click();
    fixture.outside.focus();
    fixture.details.open = true;

    mediaQuery.setMatches(true);

    expect(fixture.menu.classList.contains("hidden")).toBe(true);
    expect(fixture.toggle.getAttribute("aria-expanded")).toBe("false");
    expect(fixture.toggle.getAttribute("aria-label")).toBe("Abrir menu");
    expect(fixture.iconOpen.classList.contains("hidden")).toBe(false);
    expect(fixture.iconClose.classList.contains("hidden")).toBe(true);
    expect(document.documentElement.hasAttribute("data-mobile-menu-open")).toBe(false);
    expect(document.documentElement.dataset.overlayLocks).toBe("image-dialog");
    expect(fixture.details.open).toBe(false);
    expect(document.activeElement).toBe(fixture.outside);

    releaseOverlayLock("image-dialog");
  });

  it("updates height through ResizeObserver and disconnects it during destroy", () => {
    const controller = initialize();
    const observer = ResizeObserverMock.instances[0]!;
    fixture.setHeaderHeight(96.5);

    observer.trigger();

    expect(document.documentElement.style.getPropertyValue("--site-header-height"))
      .toBe("96.5px");

    controller.destroy();

    expect(observer.disconnect).toHaveBeenCalledTimes(1);
    expect(document.documentElement.style.getPropertyValue("--site-header-height"))
      .toBe("");
  });

  it("uses one window resize listener as a fallback and removes it during destroy", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const controller = initialize();
    fixture.setHeaderHeight(104);

    window.dispatchEvent(new Event("resize"));

    expect(document.documentElement.style.getPropertyValue("--site-header-height"))
      .toBe("104px");
    expect(addEventListener.mock.calls.filter(([type]) => String(type) === "resize"))
      .toHaveLength(1);

    controller.destroy();
    fixture.setHeaderHeight(120);
    window.dispatchEvent(new Event("resize"));

    expect(removeEventListener.mock.calls.filter(([type]) => String(type) === "resize"))
      .toHaveLength(1);
    expect(document.documentElement.style.getPropertyValue("--site-header-height"))
      .toBe("");
  });

  it("destroys idempotently, releases only mobile-menu, and removes all behavior", () => {
    acquireOverlayLock("image-dialog");
    const controller = initialize();
    fixture.toggle.click();

    controller.destroy();
    controller.destroy();

    expect(fixture.menu.classList.contains("hidden")).toBe(true);
    expect(fixture.toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.documentElement.dataset.overlayLocks).toBe("image-dialog");
    expect(document.documentElement.style.getPropertyValue("--site-header-height"))
      .toBe("");
    expect(ResizeObserverMock.instances[0]?.disconnect).toHaveBeenCalledTimes(1);

    fixture.toggle.click();
    dispatchEscape();
    fixture.outside.click();
    mediaQuery.setMatches(true);

    expect(fixture.menu.classList.contains("hidden")).toBe(true);
    expect(document.documentElement.dataset.overlayLocks).toBe("image-dialog");

    releaseOverlayLock("image-dialog");
  });

  it.each([
    "[data-site-header]",
    "[data-menu-toggle]",
    "#mobile-nav",
    "[data-icon-open]",
    "[data-icon-close]",
  ])("is a complete no-op when required markup %s is missing", (selector) => {
    document.querySelector(selector)?.remove();
    fixture.outside.focus();
    const controller = initialize();
    const remainingToggle = document.querySelector<HTMLButtonElement>("[data-menu-toggle]");

    remainingToggle?.click();
    fixture.outside.click();
    dispatchEscape();
    controller.destroy();

    expect(document.documentElement.hasAttribute("data-overlay-locks")).toBe(false);
    expect(document.documentElement.hasAttribute("data-mobile-menu-open")).toBe(false);
    expect(document.documentElement.style.getPropertyValue("--site-header-height"))
      .toBe("");
    expect(document.activeElement).toBe(fixture.outside);
    expect(ResizeObserverMock.instances).toHaveLength(0);
    expect(window.matchMedia).not.toHaveBeenCalled();
  });

  it("does not use fetch, storage, cookies, or console output", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const localStorageGet = vi.spyOn(window.localStorage, "getItem");
    const localStorageSet = vi.spyOn(window.localStorage, "setItem");
    const localStorageRemove = vi.spyOn(window.localStorage, "removeItem");
    const sessionStorageGet = vi.spyOn(window.sessionStorage, "getItem");
    const sessionStorageSet = vi.spyOn(window.sessionStorage, "setItem");
    const sessionStorageRemove = vi.spyOn(window.sessionStorage, "removeItem");
    const cookieSetter = vi.spyOn(document, "cookie", "set");
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const controller = initialize();
    fixture.toggle.click();
    fixture.firstLink.click();
    controller.destroy();

    expect(fetch).not.toHaveBeenCalled();
    expect(localStorageGet).not.toHaveBeenCalled();
    expect(localStorageSet).not.toHaveBeenCalled();
    expect(localStorageRemove).not.toHaveBeenCalled();
    expect(sessionStorageGet).not.toHaveBeenCalled();
    expect(sessionStorageSet).not.toHaveBeenCalled();
    expect(sessionStorageRemove).not.toHaveBeenCalled();
    expect(cookieSetter).not.toHaveBeenCalled();
    expect(consoleLog).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
