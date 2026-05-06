const toggle = document.querySelector("[data-menu-toggle]");
const menu = document.getElementById("mobile-nav");
const iconOpen = document.querySelector("[data-icon-open]");
const iconClose = document.querySelector("[data-icon-close]");

if (toggle && menu && iconOpen && iconClose) {
  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("hidden") === false;

    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    iconOpen.classList.toggle("hidden", open);
    iconClose.classList.toggle("hidden", !open);
  });
}
