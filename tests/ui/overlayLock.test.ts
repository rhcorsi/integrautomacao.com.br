import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface OverlayLockModule {
  acquireOverlayLock(token: string): void;
  releaseOverlayLock(token: string): void;
  clearOverlayLocks(): void;
}

const root = document.documentElement;
let overlayLock: OverlayLockModule | undefined;

async function loadOverlayLock(): Promise<OverlayLockModule> {
  overlayLock = await import("../../src/scripts/overlayLock");
  return overlayLock;
}

beforeEach(() => {
  root.removeAttribute("data-overlay-locks");
  root.style.removeProperty("overflow");
  overlayLock = undefined;
  vi.resetModules();
});

afterEach(() => {
  overlayLock?.clearOverlayLocks();
  expect(root.hasAttribute("data-overlay-locks")).toBe(false);
  expect(root.style.getPropertyValue("overflow")).toBe("");
  root.removeAttribute("data-overlay-locks");
  root.style.removeProperty("overflow");
});

describe("overlayLock", () => {
  it("does not mutate the root when imported", async () => {
    root.dataset.overlayLocks = "existing-owner";
    root.style.overflow = "scroll";

    try {
      await loadOverlayLock();

      expect(root.dataset.overlayLocks).toBe("existing-owner");
      expect(root.style.overflow).toBe("scroll");
    } finally {
      root.removeAttribute("data-overlay-locks");
      root.style.removeProperty("overflow");
    }
  });

  it("locks for one owner and restores after the last release", async () => {
    const { acquireOverlayLock, releaseOverlayLock } = await loadOverlayLock();

    acquireOverlayLock("mobile-menu");
    expect(root.dataset.overlayLocks).toBe("mobile-menu");
    expect(root.style.overflow).toBe("hidden");

    releaseOverlayLock("mobile-menu");
    expect(root.hasAttribute("data-overlay-locks")).toBe(false);
    expect(root.style.getPropertyValue("overflow")).toBe("");
  });

  it("serializes unique owners lexically and keeps the remaining owner locked", async () => {
    const { acquireOverlayLock, releaseOverlayLock } = await loadOverlayLock();

    acquireOverlayLock("mobile-menu");
    acquireOverlayLock("image-dialog");
    expect(root.dataset.overlayLocks).toBe("image-dialog mobile-menu");

    releaseOverlayLock("mobile-menu");
    expect(root.dataset.overlayLocks).toBe("image-dialog");
    expect(root.style.overflow).toBe("hidden");

    releaseOverlayLock("image-dialog");
  });

  it("treats duplicate acquisition by the same owner as idempotent", async () => {
    const { acquireOverlayLock, releaseOverlayLock } = await loadOverlayLock();

    acquireOverlayLock("mobile-menu");
    acquireOverlayLock("mobile-menu");
    expect(root.dataset.overlayLocks).toBe("mobile-menu");

    releaseOverlayLock("mobile-menu");
    expect(root.hasAttribute("data-overlay-locks")).toBe(false);
    expect(root.style.getPropertyValue("overflow")).toBe("");
  });

  it("treats release by an unknown valid owner as a no-op", async () => {
    const { acquireOverlayLock, releaseOverlayLock } = await loadOverlayLock();

    acquireOverlayLock("mobile-menu");
    releaseOverlayLock("image-dialog");

    expect(root.dataset.overlayLocks).toBe("mobile-menu");
    expect(root.style.overflow).toBe("hidden");

    releaseOverlayLock("mobile-menu");
  });

  it("clearOverlayLocks releases every owner and restores the root", async () => {
    const { acquireOverlayLock, clearOverlayLocks } = await loadOverlayLock();

    acquireOverlayLock("mobile-menu");
    acquireOverlayLock("image-dialog");
    clearOverlayLocks();

    expect(root.hasAttribute("data-overlay-locks")).toBe(false);
    expect(root.style.getPropertyValue("overflow")).toBe("");
  });

  it("preserves and restores a pre-existing inline overflow value", async () => {
    const { acquireOverlayLock, releaseOverlayLock } = await loadOverlayLock();
    root.style.overflow = "scroll";

    acquireOverlayLock("mobile-menu");
    expect(root.style.overflow).toBe("hidden");

    releaseOverlayLock("mobile-menu");
    expect(root.style.overflow).toBe("scroll");

    root.style.removeProperty("overflow");
  });

  it.each(["", " ", "mobile menu", "mobile\tmenu", "mobile\nmenu"])(
    "rejects invalid acquire token %j without mutating root or owner state",
    async (token) => {
      const { acquireOverlayLock, releaseOverlayLock } = await loadOverlayLock();

      expect(() => acquireOverlayLock(token)).toThrow(TypeError);
      expect(root.hasAttribute("data-overlay-locks")).toBe(false);
      expect(root.style.getPropertyValue("overflow")).toBe("");

      acquireOverlayLock("mobile-menu");
      expect(root.dataset.overlayLocks).toBe("mobile-menu");
      releaseOverlayLock("mobile-menu");
    },
  );

  it.each(["", " ", "image dialog", "image\tdialog", "image\ndialog"])(
    "rejects invalid release token %j without mutating another owner",
    async (token) => {
      const { acquireOverlayLock, releaseOverlayLock } = await loadOverlayLock();
      acquireOverlayLock("mobile-menu");

      expect(() => releaseOverlayLock(token)).toThrow(TypeError);
      expect(root.dataset.overlayLocks).toBe("mobile-menu");
      expect(root.style.overflow).toBe("hidden");

      releaseOverlayLock("mobile-menu");
    },
  );

  it("allows teardown to clear an owner left unreleased by a case", async () => {
    const { acquireOverlayLock } = await loadOverlayLock();

    acquireOverlayLock("mobile-menu");
    expect(root.dataset.overlayLocks).toBe("mobile-menu");
    expect(root.style.overflow).toBe("hidden");
  });
});
