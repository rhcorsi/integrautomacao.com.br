const contactForms = document.querySelectorAll("[data-contact-form]");

const setStatus = (status, message, tone = "info") => {
  if (!status) return;
  status.textContent = message;
  status.classList.remove("text-integra-red", "text-emerald-700");
  if (tone === "error") status.classList.add("text-integra-red");
  if (tone === "success") status.classList.add("text-emerald-700");
};

for (const form of contactForms) {
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

    // Honeypot: bots fill this hidden field; humans do not.
    if (formData.get("website")) {
      setStatus(status, "Mensagem enviada.", "success");
      form.reset();
      return;
    }

    const turnstileToken = formData.get("cf-turnstile-response");
    if (!turnstileToken) {
      setStatus(
        status,
        "Aguarde a verificação de segurança e tente novamente.",
        "error",
      );
      return;
    }

    submitBtn?.setAttribute("disabled", "true");
    setStatus(status, "Enviando...", "info");

    try {
      const payload = {};
      for (const [key, value] of formData.entries()) {
        if (typeof value === "string") payload[key] = value;
      }

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setStatus(status, "Mensagem recebida. Retornamos em até 1 dia útil.", "success");
        form.reset();
        window.turnstile?.reset();
        return;
      }

      const data = await response.json().catch(() => ({}));
      setStatus(
        status,
        data.message ??
          "Não foi possível enviar agora. Tente novamente em instantes ou escreva para comercial@integrautomacao.com.br.",
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
