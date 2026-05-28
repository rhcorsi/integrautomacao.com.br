const toggle = document.querySelector("[data-menu-toggle]");
const menu = document.getElementById("mobile-nav");
const iconOpen = document.querySelector("[data-icon-open]");
const iconClose = document.querySelector("[data-icon-close]");

if (toggle && menu && iconOpen && iconClose) {
  const setOpen = (open) => {
    menu.classList.toggle("hidden", !open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    iconOpen.classList.toggle("hidden", open);
    iconClose.classList.toggle("hidden", !open);
  };

  toggle.addEventListener("click", () => {
    setOpen(menu.classList.contains("hidden"));
  });

  // Esc fecha o menu e devolve o foco ao botão (teclado).
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.classList.contains("hidden")) {
      setOpen(false);
      toggle.focus();
    }
  });
}
