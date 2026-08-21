## Resumo

<!-- O que muda e por quê. Uma ou duas frases. -->

## Tipo de mudança

- [ ] Conteúdo (texto, post, case)
- [ ] Bug fix (correção de algo que estava quebrado)
- [ ] Feature (componente novo, página nova)
- [ ] Refactor (mudança interna sem alterar comportamento)
- [ ] Infra/Build (CI, deploy, dependências)
- [ ] Documentação

## Checklist

- [ ] `npm run check` passa sem erros
- [ ] `npm run build` passa sem erros
- [ ] `npm test` passa nas lanes Workers, Node e UI
- [ ] `npm run types:check` passa (obrigatório ao alterar bindings/Wrangler)
- [ ] Revisei o output afetado; se o preview tem bindings próprios, também revisei o `*.pages.dev`
- [ ] Sem secrets ou credenciais commitados
- [ ] Atualizei `README.md`/`docs/PRODUCTION_STATUS.md` se alterei arquitetura, deploy, bindings, rotas ou operação
- [ ] Conteúdo derivado de propostas internas foi sanitizado (sem cliente, valores, arquitetura específica)
- [ ] Links internos novos foram testados
- [ ] Imagens novas têm `alt` e estão otimizadas via `astro:assets`

## Notas para revisão

<!-- Algo que o revisor precisa olhar com atenção, decisões em aberto,
     trade-offs. -->
