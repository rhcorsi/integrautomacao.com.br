import { beforeEach, describe, expect, it } from "vitest";
import { initDesktopNavigation } from "../../src/scripts/desktopNavigation";

beforeEach(() => {
  document.body.innerHTML = `
    <div data-desktop-mega>
      <a href="/solucoes/" aria-expanded="false" data-mega-trigger>Soluções</a>
      <div data-mega-panel><a href="/solucoes/scada/">SCADA</a></div>
    </div>
    <button id="outside">Fora</button>`;
});

describe("initDesktopNavigation", () => {
  it("returns focus from a closing submenu to its trigger without reopening", () => {
    const controller = initDesktopNavigation(document);
    const trigger = document.querySelector<HTMLElement>("[data-mega-trigger]")!;
    const child = document.querySelector<HTMLElement>("[data-mega-panel] a")!;
    trigger.focus(); child.focus();
    child.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    controller.destroy();
  });
  it("closes with Escape while retaining focus and does not reopen immediately", () => {
    const controller = initDesktopNavigation(document);
    const wrapper = document.querySelector<HTMLElement>("[data-desktop-mega]")!;
    const trigger = document.querySelector<HTMLElement>("[data-mega-trigger]")!;
    trigger.focus();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(wrapper.dataset.megaState).toBe("closed");

    trigger.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    controller.destroy();
  });

  it("reopens after focus leaves and later returns, and keeps pointer aria state accurate", () => {
    const controller = initDesktopNavigation(document);
    const wrapper = document.querySelector<HTMLElement>("[data-desktop-mega]")!;
    const trigger = document.querySelector<HTMLElement>("[data-mega-trigger]")!;
    const outside = document.getElementById("outside")!;

    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    outside.focus();
    trigger.focus();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    wrapper.dispatchEvent(new MouseEvent("mouseleave", { bubbles: false }));
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    outside.focus();
    wrapper.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false }));
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    wrapper.dispatchEvent(new MouseEvent("mouseleave", { bubbles: false }));
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    controller.destroy();
  });
});
