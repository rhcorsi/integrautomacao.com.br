document.addEventListener("click", (event) => {
  const link = event.target.closest?.('a[href^="/contato"]');
  if (!link) return;

  try {
    const nearestSection = link.closest("section, article, header, footer, nav");
    const heading = nearestSection?.querySelector("h1, h2, h3");
    const label = heading?.textContent?.trim() || document.title;
    const cta = link.textContent?.trim() || link.getAttribute("aria-label") || "Contato";

    sessionStorage.setItem(
      "integra:contact-context",
      JSON.stringify({
        page: `${window.location.pathname}${window.location.hash}`,
        label: label.slice(0, 160),
        cta: cta.slice(0, 160),
      }),
    );
  } catch {
    // Navigation must never depend on analytics context.
  }
});
