# Estado de produção

Atualizado em **21 de agosto de 2026**. Este documento registra o baseline
operacional observado no último release funcional auditado antes desta
atualização documental. Arquitetura e comandos permanentes continuam
documentados no [`README.md`](../README.md); os documentos em
`docs/superpowers/` são especificações e planos históricos.

## Baseline funcional auditado

| Item | Estado |
|---|---|
| Repositório | `rhcorsi/integrautomacao.com.br` |
| Branch de produção | `main` |
| Commit técnico auditado | `4049de9bfd1f6bd168dbf7beb7312313bfde5c14` |
| Pull request da remediação | `#15` (merge concluído) |
| Projeto Cloudflare Pages | `integrautomacao-com-br` |
| Deployment imutável auditado | `4cff75a6-7fae-41f3-b617-c7e7d087debe` |
| URL pública | <https://integrautomacao.com.br/> |
| URL imutável | <https://4cff75a6.integrautomacao-com-br.pages.dev/> |
| Publicador ativo | integração direta GitHub → Cloudflare Pages |
| Workflow `deploy.yml` | fallback manual por `workflow_dispatch`; não publica automaticamente |

Um push em `main` dispara o build da integração direta da Cloudflare. Não
execute o fallback manual durante um build automático, pois isso cria dois
deployments concorrentes do mesmo projeto. Como cada push recebe um novo ID,
o deployment mais recente deve ser identificado pela conexão Git no painel da
Cloudflare; os IDs acima preservam a evidência do baseline testado.

## Runtime publicado

- Astro gera o site estático e o Pagefind no build.
- Pages Functions atende `/api/contact`, `/api/newsletter` e
  `/api/newsletter/confirm`.
- O middleware mantém a canonicalização de host, protocolo, porta e URLs
  legadas. O modo registrado em `config/deployment-phase.json` continua
  `legacy-bridge`; o cutover `static-first` descrito nos planos ainda não foi
  executado.
- O formulário de contato usa Turnstile e uma chave Resend limitada a envio.
- A newsletter usa double opt-in: pedido neutro → consentimento pendente no D1
  → e-mail transacional → confirmação explícita → reconciliação assíncrona com
  Resend Contacts/Segment/Topic.

## Bindings e segredos

Valores públicos e IDs de D1 ficam em `wrangler.jsonc`. Segredos permanecem
somente no Cloudflare Pages e nunca devem ser copiados para o repositório.

Produção exige estes nomes:

- `TURNSTILE_SECRET_KEY`
- `RESEND_TRANSACTIONAL_API_KEY`
- `RESEND_SEND_API_KEY`
- `RESEND_CONTACTS_API_KEY`
- `RESEND_SEGMENT_ID`
- `RESEND_TOPIC_ID`
- `CONTACT_EMAIL_TO`
- `CONTACT_EMAIL_FROM`
- `NEWSLETTER_CONFIRMATION_ORIGIN=https://integrautomacao.com.br`
- binding D1 `NEWSLETTER_DB`

As três chaves Resend novas foram validadas no release: as duas chaves de
envio aceitaram uma chamada transacional controlada e a chave de Contacts
aceitou leitura da API de Segments. Os valores não são armazenados aqui.

O ambiente `preview` tem banco e origem próprios, mas não recebeu cópia dos
segredos de produção. Até configurar credenciais específicas de preview, os
formulários desse ambiente devem permanecer fail-closed.

## D1 da newsletter

A migration `migrations/0001_newsletter_consent.sql` foi aplicada aos bancos
de preview e produção. Em produção, o release verificou:

- 4 tabelas da newsletter;
- 2 índices;
- 8 triggers de integridade/imutabilidade;
- 1 view `newsletter_broadcast_recipients`;
- 1 registro em `d1_migrations`.

Os bancos continuam separados:

- preview: `integrautomacao-newsletter-preview`;
- produção: `integrautomacao-newsletter-production`.

Para conferir migrations sem alterá-las:

```bash
npx wrangler d1 migrations list NEWSLETTER_DB --env preview --remote
npx wrangler d1 migrations list NEWSLETTER_DB --env production --remote
```

Para um ambiente novo, capture primeiro um bookmark do Time Travel e só então
aplique a migration no ambiente explicitamente escolhido:

```bash
npx wrangler d1 time-travel info NEWSLETTER_DB --env preview --json
npx wrangler d1 migrations apply NEWSLETTER_DB --env preview --remote
```

Nunca aplique migration remota omitindo `--env` e `--remote`.

## Gate de Broadcast

**BROADCAST BLOQUEADO por padrão.** Uma view local ou uma contagem no D1 não é
autorização suficiente. Antes de qualquer Broadcast da Integra Ação:

1. confirme que não existem jobs `pending` ou `leased` vencidos;
2. faça read-back atual no Resend para cada destinatário;
3. exclua qualquer contato com opt-out global ou Topic desabilitado;
4. confirme Segment, Topic e as quatro propriedades de evidência;
5. registre operador, data, critério e resultado da verificação.

Consultas agregadas podem ser usadas para triagem sem exportar e-mails:

```sql
SELECT consent_state, provider_state, count(*) AS total
FROM newsletter_subscriptions
GROUP BY consent_state, provider_state;

SELECT state, count(*) AS total
FROM newsletter_jobs
GROUP BY state;

SELECT count(*) AS candidatos_locais
FROM newsletter_broadcast_recipients;
```

## Provas do release

Na publicação de 21/08/2026:

- home, newsletter, confirmação, busca, `robots.txt` e sitemap responderam
  `200`;
- uma rota sintética inexistente respondeu `404`;
- `GET /api/contact` e `GET /api/newsletter` responderam `405` com
  `Allow: POST`;
- APIs mantiveram `Cache-Control: no-store`, HSTS, `nosniff` e
  `X-Frame-Options: DENY`;
- POSTs sintéticos com Turnstile inválido responderam `403` e não alteraram o
  D1 nem enviaram mensagens reais;
- o worktree terminou limpo e o commit local coincidiu com `origin/main`.

Não foi criada uma inscrição real nem resolvido um Turnstile com uma caixa
postal humana durante o release. Isso evita produzir consentimento ou contato
real apenas para teste e deve permanecer explícito em qualquer relatório.

## Limites conhecidos que não bloqueiam o site público

- O preview continua fail-closed até receber segredos próprios.
- A chave Resend legada e o binding `RESEND_API_KEY` antigo ainda podem existir
  nos painéis, mas o código atual não os usa; a revogação é uma operação
  destrutiva separada.
- `/404.html` é normalizado pela plataforma para `/404`; uma URL realmente
  inexistente responde `404`, mas a rota normalizada pode terminar em `200`.
- `noindex` não exclui automaticamente uma página do Pagefind; a auditoria de
  busca deve comparar URLs do índice com a política SEO antes de afirmar
  paridade completa.
- `main` não possui proteção obrigatória no plano atual do repositório privado;
  CI e revisão continuam disciplina operacional, não enforcement de ruleset.

## Gate local antes de publicar

Execute uma única sequência, sem escolher apenas a lane conveniente:

```bash
npm ci
npm run types:check
npm test
npm run check
npm run audit:editorial
npm run audit:seo
npm run audit:deploy-policy
npm run audit:deps
git diff --check
```

`audit:seo` requer `dist/`; `audit:editorial` já executa um build antes das
auditorias de conteúdo.
