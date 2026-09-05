# Operação do GitHub e publicação

Contrato do repositório em 05/09/2026. A confirmação de configurações remotas e
do deployment deve acompanhar o registro de cada release; este arquivo descreve
os controles versionados e a política operacional.

## CI obrigatório

O workflow `CI` preserva o job/check **`Lint and build`**, usado pela proteção de
`main`. Executa em pull request, push para `main` e dispatch manual, com Node
exato de `.nvmrc`, npm de `packageManager`, instalação pelo lockfile e token com
permissão somente de leitura do conteúdo. As etapas são:

1. `npm ci`, `npm run check`, `npm run types:check` e `npm test` completo.
2. Políticas de deploy e claims estruturais, UTF-8, prosa, FAQs e dependências
   em todas as severidades (`npm run audit:deps`).
3. Um `npm run build`, incluindo Pagefind, seguido das auditorias de rotas,
   redirects, terminologia, HTML e SEO sobre o mesmo `dist/`.
4. Smoke dos arquivos essenciais, assets e Pagefind; artifact de PR por 7 dias.
5. Gate estrito `audit:claims:release`, depois de guardar o artifact para revisão.
   P1 exige revisão documental comprovada ou aprovação humana real; P0 exige
   aprovação humana. Registros pendentes e provas inválidas impedem merge.

`audit:editorial` não é chamado no CI porque ele faria outro build. O teste
Node da confirmação de newsletter cria um build temporário próprio para provar
o contrato de privacidade e output; ele não substitui nem modifica o `dist/`
da entrega. O timeout do job é de 20 minutos para comportar essa verificação.

Os testes Workers usam Miniflare/D1 local, migrations do repositório e mocks de
rede. Node e UI usam configurações Vitest separadas; a UI roda em `happy-dom`.
Os caminhos dos testes usam APIs de Node e o link temporário distingue Windows
de Linux. `.npmrc` preserva dependências opcionais, incluindo os binários Linux.
Uma execução local Windows não prova o resultado do runner Ubuntu: a execução
do GitHub no SHA do PR precisa concluir antes do merge.

## Proteção de main

Proteção clássica de `main` aplicada e confirmada pela API em 05/09/2026:

- exigir pull request antes do merge;
- exigir `Lint and build` aprovado e branch atualizada com `main`;
- exigir resolução das conversas;
- bloquear force-push e exclusão de `main`;
- aplicar as exigências também a administradores, sem bypass;
- manter o número mínimo de aprovações de PR em zero para o mantenedor único.

O número zero evita depender de autoaprovação de PR. A revisão editorial
abaixo continua independente. O check obrigatório está vinculado ao
aplicativo GitHub Actions (ID 15368). Conferir novamente a configuração em
cada release; manter o nome do check evita invalidar essa regra.

## Claims e autorização editorial

`npm run audit:claims` confere a integridade do cadastro de decisões e fontes;
**não concede aprovação técnica humana**. `npm run audit:claims:release` é o
gate de publicação e exige os registros de revisão efetivos.

A política de 05/09/2026 distingue `documented` (revisão documental por IA) de
`approved` (aprovação técnica humana real). As dez decisões P1 do redesign
foram conferidas com fontes primárias e receberam dossiê de evidências,
localizadores, revisor identificado como IA, data e fingerprint SHA-256.
O [dossiê](reviews/2026-09-05-technical-release.md) registra o resultado por ID.

P1 documental só passa com fonte vigente, tipo de evidência elegível e prova
correspondente ao conteúdo revisado. Alterar texto, escopo ou fonte invalida
o fingerprint. O arquivo de prova deve existir em `docs/reviews/` e conter
o par ID/fingerprint; ausências, caminhos fora desse diretório e provas
incompatíveis reprovam. A checagem não concede certificação factual automática.

P0 continua exigindo aprovação humana; evidências de laboratório, campo e
documentos internos não recebem liberação documental por IA. Permissão de
publicação não é registrada como aprovação técnica humana. O check obrigatório
permanece ativo, sem `continue-on-error` ou desvio da proteção da branch.

## Publicador automático e fallback

A integração GitHub → Cloudflare Pages permanece o publicador automático de
`main`. O workflow `deploy.yml` só aceita `workflow_dispatch`; não há input de
branch nem triggers automáticos. A escolha de branch ainda presente na interface
de dispatch não autoriza outro destino: o job executa apenas em `refs/heads/main`.
[Referência GitHub sobre dispatch](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).

O fallback exige CI de push aprovado no mesmo SHA, faz checkout desse SHA,
rejeita chave pública Turnstile ausente ou placeholder, reconstrói o site e
confere novamente o head de `main` antes de publicar. O comando
Wrangler fixa `--branch=main`, `--commit-hash` do evento e `--commit-dirty=false`.
O job usa o ambiente `production`, configurado e confirmado pela API em
05/09/2026 para aceitar somente a branch `main`. A serialização `deploy-production` alcança apenas dispatches Actions,
não os builds da integração Git da Cloudflare.
[Referência dos parâmetros Pages](https://developers.cloudflare.com/workers/wrangler/commands/pages/).

Procedimento do fallback:

1. Confirmar que a integração direta está indisponível e que não há build ou
   deployment automático em andamento; suspender novos pushes durante o envio.
2. Confirmar gates técnicos e editoriais aplicáveis e registrar o SHA de `main`.
3. Executar o workflow manualmente em `main` depois do CI aprovado desse SHA.
4. Conferir no Pages o SHA, deployment ID, URL imutável e URL pública; verificar
   as páginas e endpoints alterados antes de encerrar a publicação.

O fallback reconstrói o código verificado; ele não entrega o artifact do CI e
não implementa a migração histórica para artefato único. Não habilitar triggers
automáticos nele enquanto a integração Git continuar ativa. Uma troca de
publicador exige implementação e validação do fluxo por artefato, seguida de
cutover específico. A Cloudflare documenta o controle dos builds automáticos em
[Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/).
