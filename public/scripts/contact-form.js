const contactForms = document.querySelectorAll("[data-contact-form]");

const subjectLabels = new Map([
  ["triagem", "Triagem técnica inicial"],
  ["diagnostico", "Diagnóstico de engenharia"],
  ["portfolio", "Portfólio técnico sob NDA"],
  ["plantpax", "PlantPAx"],
  ["factorytalk", "FactoryTalk"],
  ["factorytalk-view-se", "FactoryTalk View SE"],
  ["redes-cyber", "Redes Industriais / IEC 62443"],
  ["migracao-plc", "Migração de PLC legado"],
  ["migracao-slc500", "Migração de SLC 500"],
  ["modernizacao-scada", "Modernização de SCADA"],
  ["pi-system", "PI System / dados industriais"],
  ["data-centers-industriais", "Data Centers Industriais"],
  ["acucar-e-etanol", "Automação para Açúcar e Etanol"],
  ["automacao-maringa", "Automação Industrial em Maringá"],
  ["automacao-parana", "Automação Industrial no Paraná"],
  ["catalogo-tecnico", "Catálogo técnico"],
  ["tecnologias-multivendor", "Tecnologias multivendor"],
  ["certificacoes", "Certificações e parcerias"],
  ["case-similar", "Case técnico similar"],
  ["blog", "Sugestão de conteúdo técnico"],
  ["greenfield", "Projeto greenfield"],
  ["integrador", "Integração de sistemas"],
  ["parceria", "Parceria / fornecedor"],
  ["conteudo", "Conteúdo técnico / evento"],
  ["outro", "Outro"],
]);

const limit = (value, max) => (value ?? "").trim().slice(0, max);

const labelFromSlug = (value) =>
  value
    .replace(/^\/+|\/+$/g, "")
    .split(/[\/-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const referrerContext = () => {
  if (!document.referrer) return { page: "", label: "Acesso direto" };

  try {
    const referrer = new URL(document.referrer);
    if (referrer.origin === window.location.origin) {
      return {
        page: `${referrer.pathname}${referrer.hash}`,
        label: referrer.pathname === "/" ? "Página inicial" : labelFromSlug(referrer.pathname),
      };
    }

    return {
      page: referrer.hostname,
      label: `Referência externa: ${referrer.hostname}`,
    };
  } catch {
    return { page: "", label: "Acesso direto" };
  }
};

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

for (const form of contactForms) {
  const status = form.querySelector('[role="status"]');
  const submitBtn = form.querySelector('button[type="submit"]');
  const subjectSelect = form.querySelector("[data-contact-subject]");
  const sourcePageInput = form.querySelector("[data-contact-source-page]");
  const sourceLabelInput = form.querySelector("[data-contact-source-label]");
  const ctaInput = form.querySelector("[data-contact-cta]");

  const applyContactContext = () => {
    const params = new URL(window.location.href).searchParams;
    const referrer = referrerContext();
    const requestedSubject = limit(params.get("assunto"), 50)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");

    if (requestedSubject && subjectSelect) {
      let option = Array.from(subjectSelect.options).find(
        (candidate) => candidate.value === requestedSubject,
      );

      if (!option) {
        option = document.createElement("option");
        option.value = requestedSubject;
        option.textContent =
          subjectLabels.get(requestedSubject) ?? `Tema técnico: ${labelFromSlug(requestedSubject)}`;
        subjectSelect.append(option);
      }

      subjectSelect.value = requestedSubject;
    }

    if (sourcePageInput) {
      sourcePageInput.value = limit(params.get("sourcePage") || referrer.page, 300);
    }
    if (sourceLabelInput) {
      sourceLabelInput.value = limit(params.get("sourceLabel") || referrer.label, 160);
    }
    if (ctaInput) {
      ctaInput.value = limit(params.get("cta"), 160);
    }
  };

  applyContactContext();

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
      applyContactContext();
      return;
    }

    const turnstileToken = formData.get("cf-turnstile-response");
    if (!turnstileToken) {
      if (!form.querySelector(".cf-turnstile")) {
        setStatus(
          status,
          "Formulário temporariamente indisponível: a verificação de segurança não carregou. Use o e-mail comercial@integrautomacao.com.br.",
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
        setStatus(status, "Contexto recebido. Nosso prazo-alvo de retorno inicial é de 1 dia útil.", "success");
        form.reset();
        applyContactContext();
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
      // O Siteverify invalida o token mesmo quando o envio posterior falha.
      // Sempre exija uma nova verificação antes de uma nova tentativa.
      window.turnstile?.reset();
    }
  });
}
