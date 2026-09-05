# Contrato de mensuração do portal

## Estado atual

O portal expõe um gancho local por `CustomEvent`, mas não possui adaptador de coleta de eventos personalizados. Portanto, os indicadores históricos e atuais deste funil são **N/D**. Esta implementação não envia requisições, não grava cookies, não usa `localStorage` ou `sessionStorage` e não ativa fornecedor externo. O Cloudflare Web Analytics existente não deve ser interpretado como coleta deste funil.

O baseline de pesquisa orgânica do GSC é mantido na documentação privada da operação. Os totais de pesquisa não preenchem o baseline do funil e não representam leads, oportunidades ou receita. Exportações e indicadores privados do Search Console não devem ser versionados no repositório público.

O evento DOM é `integra:portal-metric`. Um adaptador autorizado pode escutá-lo com `window.addEventListener`, validar novamente o contrato e encaminhar apenas dados agregados. A ausência de listener é o comportamento normal e não causa erro.

## Eventos e campos permitidos

| Evento | Campos fechados | Interpretação permitida |
|---|---|---|
| `search_executed` | `result_count_bucket` | Uma busca foi concluída; a consulta não é coletada. |
| `search_result_opened` | `result_position_bucket`, `content_type` | Um resultado foi acessado. |
| `source_opened` | `source_kind` | Uma referência foi aberta; URL e título não são coletados. |
| `cta_clicked` | `cta_id` | Um CTA conhecido foi acionado; não equivale a lead. |
| `form_started` | `subject` | Primeira interação com o formulário, uma vez por carregamento. |
| `request_accepted` | `subject`, `channel=contact_form` | A API respondeu `2xx` com JSON `{ ok: true }`; não comprova entrega, atendimento ou qualificação. |
| `request_failed` | `failure_code` | Falha técnica em categoria controlada. |

Todo evento inclui apenas `version`, `name`, `path` e `fields`. `path` vem de `window.location.pathname`; query string, hash, URLs absolutas, host, referrer, `@` literal/codificado e caracteres de controle são rejeitados. Contagens e posições usam faixas, nunca valores exatos. Nomes, e-mails, telefones, empresa, texto do formulário, consulta de busca, exceção bruta, token Turnstile e outros campos livres são proibidos.

Essa guarda curta reduz vazamento acidental, mas um pathname arbitrário de página 404 ainda pode conter outro dado livre. Antes de qualquer coleta, o adaptador deve aceitar somente pathnames presentes no manifesto de rotas canônicas gerado no mesmo build; qualquer rota ausente desse conjunto deve ser descartada.

Os códigos de falha permitidos são `validation`, `turnstile_missing`, `turnstile_expired`, `turnstile_invalid`, `timeout`, `network`, `server_rejected`, `invalid_response` e `unknown`. Emitir um código não autoriza incluir a mensagem original.

## Requisitos para um adaptador futuro

Ativar um adaptador exige autorização, finalidade registrada, responsável operacional e revisão da Política de Privacidade. O adaptador deve:

1. aceitar somente a versão, os eventos, campos e valores definidos em `src/scripts/portalMetrics.ts`, em pathnames encontrados no manifesto de rotas canônicas do build;
2. descartar eventos em desenvolvimento, preview automatizado e testes (`localhost`, host de preview conhecido ou `navigator.webdriver`), além de tráfego interno conforme regra documentada;
3. não adicionar identificador persistente, fingerprint, URL completa, query, hash, referrer livre ou conteúdo de formulário;
4. agregar por período, evento, pathname canônico e campos permitidos, com denominadores explícitos;
5. registrar falhas do próprio adaptador sem anexar o payload do formulário;
6. ter retenção, acesso, exclusão e responsável definidos antes da ativação.

## Baseline e avaliação 30/60/90

O dia zero do funil é a primeira data em que um adaptador autorizado estiver ativo e validado. Sem 28 dias comparáveis do funil, esse baseline permanece N/D e a coleta começa sem reconstruir um “antes”. O GSC já possui o recorte orgânico de 28 dias descrito acima. Em cada leitura, registrar período, fuso, origem, filtros, cobertura, volume e exclusões.

- Dia 30: validar integridade, duplicidade, exclusão de testes e denominadores. Relatar `form_started → request_accepted`; conciliar uma amostra com solicitações reais, sem declarar lead qualificado a partir do evento.
- Dia 60: comparar períodos equivalentes e segmentos com volume suficiente. Cruzar temas e páginas de origem com atendimento humano deduplicado, excluindo spam e testes.
- Dia 90: repetir a comparação, registrar sazonalidade e só então propor metas. Lead qualificado exige necessidade aderente e próximo passo confirmado; oportunidade exige escopo potencial e responsável comercial registrados.

GSC, CrUX/RUM e registro comercial continuam fontes distintas. CTR só é calculado com impressões conhecidas. Clique em CTA, fonte ou WhatsApp não é lead; resposta aceita pela API não é entrega de e-mail, atendimento, qualificação ou receita.
