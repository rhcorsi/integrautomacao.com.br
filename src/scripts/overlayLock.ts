const locks = new Set<string>();

let previousOverflow:
  | {
      value: string;
      priority: string;
    }
  | undefined;

function validateToken(token: string): void {
  if (token.length === 0 || /\s/u.test(token)) {
    throw new TypeError("Overlay lock token must be non-empty and contain no whitespace");
  }
}

function syncLockedRoot(): void {
  const root = document.documentElement;
  root.dataset.overlayLocks = [...locks].sort().join(" ");
  root.style.setProperty("overflow", "hidden");
}

function restoreRoot(): void {
  const root = document.documentElement;
  root.removeAttribute("data-overlay-locks");

  if (!previousOverflow || previousOverflow.value === "") {
    root.style.removeProperty("overflow");
  } else {
    root.style.setProperty(
      "overflow",
      previousOverflow.value,
      previousOverflow.priority,
    );
  }

  previousOverflow = undefined;
}

export function acquireOverlayLock(token: string): void {
  validateToken(token);

  if (locks.has(token)) return;

  if (locks.size === 0) {
    const rootStyle = document.documentElement.style;
    previousOverflow = {
      value: rootStyle.getPropertyValue("overflow"),
      priority: rootStyle.getPropertyPriority("overflow"),
    };
  }

  locks.add(token);
  syncLockedRoot();
}

export function releaseOverlayLock(token: string): void {
  validateToken(token);

  if (!locks.delete(token)) return;

  if (locks.size === 0) {
    restoreRoot();
  } else {
    syncLockedRoot();
  }
}

export function clearOverlayLocks(): void {
  if (locks.size === 0) return;

  locks.clear();
  restoreRoot();
}
