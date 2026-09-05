export function initDesktopNavigation(root: Document = document): { destroy(): void } {
  const cleanups: Array<() => void> = [];
  for (const wrapper of root.querySelectorAll<HTMLElement>("[data-desktop-mega]")) {
    const trigger = wrapper.querySelector<HTMLElement>("[data-mega-trigger]");
    if (!trigger) continue;
    let pointerInside = false;
    let dismissedWhileFocused = false;

    const setOpen = (open: boolean) => {
      wrapper.dataset.megaState = open ? "open" : "closed";
      trigger.setAttribute("aria-expanded", String(open));
    };
    const onEnter = () => { pointerInside = true; dismissedWhileFocused = false; setOpen(true); };
    const onLeave = () => { pointerInside = false; if (!wrapper.contains(root.activeElement)) setOpen(false); };
    const onFocusIn = () => { if (!dismissedWhileFocused) setOpen(true); };
    const onFocusOut = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && wrapper.contains(event.relatedTarget)) return;
      dismissedWhileFocused = false;
      if (!pointerInside) setOpen(false);
    };
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || wrapper.dataset.megaState !== "open") return;
      event.preventDefault();
      dismissedWhileFocused = true;
      setOpen(false);
      // A trigger keeps focus; a link in the now-hidden panel returns to it.
      if (root.activeElement !== trigger && wrapper.contains(root.activeElement)) {
        trigger.focus({ preventScroll: true });
      }
    };
    setOpen(false);
    wrapper.addEventListener("mouseenter", onEnter);
    wrapper.addEventListener("mouseleave", onLeave);
    wrapper.addEventListener("focusin", onFocusIn);
    wrapper.addEventListener("focusout", onFocusOut);
    wrapper.addEventListener("keydown", onKeydown);
    cleanups.push(() => {
      wrapper.removeEventListener("mouseenter", onEnter);
      wrapper.removeEventListener("mouseleave", onLeave);
      wrapper.removeEventListener("focusin", onFocusIn);
      wrapper.removeEventListener("focusout", onFocusOut);
      wrapper.removeEventListener("keydown", onKeydown);
    });
  }
  return { destroy() { for (const cleanup of cleanups.splice(0)) cleanup(); } };
}
