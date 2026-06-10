const newsletterForms = document.querySelectorAll("[data-newsletter-form]");

const setStatus = (status, message, tone = "info") => {
  if (!status) return;
  // Erro é anunciado de forma assertiva (interrompe o leitor de tela);
  // sucesso/info, de forma educada. Definir antes do texto.
  if (tone === "error") {
    status.setAttribute("role", "alert");
    status.setAttribute("aria-live", "assertive");
  } else {
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
  }
  status.textContent = message;
  status.classList.remove("text-integra-red-700", "text-emerald-700");
  if (tone === "error") status.classList.add("text-integra-red-700");
  if (tone === "success") status.classList.add("text-emerald-700");
};

for (const form of newsletterForms) {
  const status = form.querySelector('[role="status"]');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener(
    "invalid",
    () => {
      setStatus(status, "Preencha os campos obrigatórios antes de enviar.", "error");
    },
    true,
  );

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus(status, "Preencha os campos obrigatórios antes de enviar.", "error");
      return;
    }

    const formData = new FormData(form);

    // Honeypot
    if (formData.get("website")) {
      setStatus(status, "Inscrição registrada.", "success");
      form.reset();
      return;
    }

    const turnstileToken = formData.get("cf-turnstile-response");
    if (!turnstileToken) {
      if (!form.querySelector(".cf-turnstile")) {
        setStatus(
          status,
          "Inscrição temporariamente indisponível: a verificação de segurança não carregou. Use o e-mail comercial@integrautomacao.com.br.",
          "error",
        );
        return;
      }

      setStatus(
        status,
        "Aguarde a verificação de segurança e tente novamente.",
        "error",
      );
      return;
    }

    submitBtn?.setAttribute("disabled", "true");
    setStatus(status, "Processando…", "info");

    try {
      const payload = {};
      for (const [key, value] of formData.entries()) {
        if (typeof value === "string") payload[key] = value;
      }

      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setStatus(
          status,
          "Inscrição confirmada. A próxima edição chega em breve.",
          "success",
        );
        form.reset();
        window.turnstile?.reset();
        return;
      }

      const data = await response.json().catch(() => ({}));
      setStatus(
        status,
        data.message ??
          "Não foi possível inscrever agora. Tente novamente em instantes ou escreva para comercial@integrautomacao.com.br.",
        "error",
      );
    } catch (error) {
      console.error(error);
      setStatus(
        status,
        "Erro de rede. Tente novamente ou escreva para comercial@integrautomacao.com.br.",
        "error",
      );
    } finally {
      submitBtn?.removeAttribute("disabled");
    }
  });
}
