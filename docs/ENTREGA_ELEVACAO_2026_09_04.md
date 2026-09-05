# Elevação do portal Integra — revisão para integração

Implementação de 04/09/2026, baseada no plano aprovado e no commit `d89ea474f7dfa8d52e6a81eaa167f0280d151fef`.

**Estado:** código implementado e validado localmente, preparado na branch `codex/elevacao-2026-09-04` para revisão no GitHub. O envio foi autorizado pelo titular. A integração em produção continua condicionada à revisão técnica humana registrada, conforme [decisões para liberação](REVISAO_TECNICA_PARA_PRODUCAO.md). Autorização de envio não é registrada como aprovação factual das afirmações técnicas.

## Resultado implementado

| Frente | Entrega |
|---|---|
| Design | Home com busca, três entradas por intenção, atalhos de solução, case e método antecipados; identidade e profundidade preservadas |
| Consulta técnica | Sumários na solução PlantPAx, nas 41 tecnologias e nos templates de artigos/cases; figuras ampliáveis com fonte, Escape e retorno de foco |
| Contato | Introdução compacta e formulário antes das modalidades; assunto PlantPAx preservado; telefone e empresa continuam opcionais |
| Busca | Lotes de 12, contagem, todos os resultados acessíveis, filtros por conteúdo, proteção contra consultas antigas/cliques repetidos e recuperação de erro |
| Conteúdo | Correções de suporte/versão/licenciamento, protocolos e recomendações absolutas; 22 decisões e 20 fontes registradas; conferência documental não apresentada como aprovação humana |
| SEO | URLs e política de indexação preservadas; quatro conexões contextuais adicionadas; expectativa obsoleta de FAQ rich result removida |
| Evidência comercial | Três briefs de coleta preparados; relato existente de Moinho preservado como qualitativo; imagem ilustrativa deixou de preceder o conteúdo do case |
| Medição | Contrato de eventos local sem envio externo; baseline real de 28 dias no GSC; cliques, solicitações aceitas e leads qualificados permanecem conceitos distintos |

## Evidência de validação

- **618 testes:** 447 de backend/Workers, 105 de políticas/Node e 66 de interface, todos aprovados. Falhas de paginação e foco encontradas na revisão foram reproduzidas com testes antes da correção.
- **Astro check:** 164 arquivos, zero erro, aviso ou hint. Ambiente: Node 22.23.2 e npm 10.9.8.
- **Build aprovado:** 112 páginas HTML; índice Pagefind com 110 páginas e filtro de conteúdo. A página de busca mantém `noindex,follow` e não indexa sua própria interface.
- **Dez auditorias aprovadas:** rotas, redirects, política de implantação, SEO, terminologia, prosa, UTF-8, FAQs, HTML editorial e estrutura do registro de afirmações.
- **29.590 referências internas** verificadas sem problema; **64 regras de redirect** sem problema. HTML editorial: zero falha e zero aviso. UTF-8: 233/233 arquivos válidos.
- **45 verificações responsivas:** cinco pilotos × 320, 390, 768, 1024, 1280, 1439, 1440, 1441 e 1920 px, sem transbordamento horizontal da página.
- Contato a 390 × 844: primeiro campo em **660 px**, ante **1.639 px** na auditoria. O formulário começa na primeira tela.
- Busca PlantPAx no índice final: **54/54 resultados acessíveis e únicos**. Filtro Tecnologia: 14 resultados. Consulta inexistente apresenta estado vazio correto.
- Ampliação abre imagem completa com rolagem interna; Escape fecha e devolve foco ao link. Escape no submenu devolve foco ao gatilho quando necessário; sumário posiciona a seção abaixo do cabeçalho.
- CTA principal: contraste calculado de **4,88:1** entre texto branco e fundo vermelho renderizados. Movimento inicial termina em até 4,8 segundos; CSS respeita preferência por movimento reduzido. Isso não representa auditoria integral WCAG nem mensuração de Core Web Vitals.
- Revisões independentes de implementação e governança encerradas sem achado material aberto no escopo revisado. O verificador de fontes passou a aceitar repetição do mesmo destino no diálogo, mantendo a exigência de fonte qualificada na legenda e rejeitando destinos conflitantes; cinco testes cobrem esse contrato.

## Base comercial e SEO disponível

O baseline do Search Console foi conferido e permanece na documentação privada da operação. Os dados de pesquisa incluem buscas de marca e não representam leads, receita ou efeito do redesign, que ainda não foi publicado.

[Contrato de mensuração](MEASUREMENT.md) · [Briefs dos dossiês](CASE_EVIDENCE_BRIEFS.md) · [Mapa de preservação da home](HOME_CONTENT_MAP_2026_09_04.md).

## Pendências para produção e próximos ciclos

1. **Revisão humana real:** `npm run audit:claims:release` permanece deliberadamente reprovado em dez decisões P1 — T01/T02/T03/T04/T05/T07/T08/T09/T13/T17. As correções estão documentadas, mas não foi inventada assinatura humana. O gate normal verifica integridade do cadastro; não concede essa aprovação. Também há decisões P2 pendentes de revisão.
2. **Dossiês e credenciais:** não foi feita inspeção privada dos registros de FAT/SAT, cutover, rollback e autorizações do cliente; credenciais existentes precisam de confirmação do titular/emissor para nova liberação. Nenhum case, resultado ou credencial foi inventado.
3. **Validação externa de uso:** não foram inventados participantes para o teste formativo com cinco pessoas previsto no plano. Os testes automatizados e a navegação assistida não o substituem.
4. **Operação do contato:** os testes locais verificam regras e estados; não foi enviado contato real nem comprovada entrega de e-mail em produção. O envio completo em homologação com Turnstile e o recebimento devem integrar o aceite operacional.
5. **Funil, performance e evolução:** não há adaptador externo para os novos eventos; métricas comerciais e Core Web Vitals de campo permanecem N/D. Coleta e leituras de 30/60/90 dias dependem de ativação autorizada, dados e tempo transcorrido.
6. **Publicação:** o envio ao GitHub está autorizado; a PR de evolução aguarda a aprovação técnica do lote antes de integrar a `main`, que dispara a produção. Depois, conferir URLs canônicas, classes de redirect, sitemap, busca e contato na revisão efetivamente publicada.

A exigência editorial é encerrar erros conhecidos com evidência e revisão. Testes de software e fontes consultadas não permitem prometer ausência absoluta de erro em todo o conhecimento de engenharia.

## Evidências de trabalho

As capturas, registros de execução e relatórios de revisão permanecem na coleção local de evidências, fora do repositório público. Os resultados acima descrevem as verificações realizadas e não substituem o aceite humano ou dados de produção.
