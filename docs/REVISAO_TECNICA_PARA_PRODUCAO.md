# Revisão documental e critérios de publicação

Atualização de 05/09/2026. As dez decisões P1 do lote foram conferidas com fontes primárias e inspeção do conteúdo. A revisão foi realizada por IA e é registrada como `documented`, sem assinatura humana inventada.

O [dossiê por decisão](reviews/2026-09-05-technical-release.md) contém as conclusões, fontes, localizadores e fingerprints de T01/T02/T03/T04/T05/T07/T08/T09/T13/T17. O [registro de decisões](../src/data/technicalClaims.ts) e o [registro de fontes](../src/data/sourceRegistry.ts) alimentam o site e o CI.

## Critério vigente

- P1 admite publicação documental após conferência de fontes, escopo e versões, com revisor identificado como IA, data e evidência vinculada ao texto.
- P0 exige aprovação técnica humana real. Registros pendentes continuam bloqueados.
- `approved` é reservado à aprovação humana. `documented` não declara essa aprovação.
- Evidências de laboratório, campo e documentos internos não são liberadas por uma revisão documental por IA.
- O gate verifica fontes e fingerprint, existência e localização do dossiê e correspondência de ID/fingerprint. Alterar texto ou fonte exige nova revisão.

O critério anterior que exigia assinatura humana de todo P1 foi substituído por essa distinção explícita entre publicação documental e aprovação humana. A autorização operacional para concluir a publicação não foi usada como prova de revisão técnica pessoal. A proteção da branch permanece exigindo CI aprovado.

## Verificação antes de integrar

Executar `npm run audit:claims:release`, os testes, o build e as auditorias do CI. Integrar somente o commit verificado. A conexão direta do Cloudflare publica `main`; confirmar o SHA do deployment e as URLs públicas após o merge.

As decisões P2 e os [briefs de evidência interna](CASE_EVIDENCE_BRIEFS.md) mantêm seus limites. Uma revisão documental não certifica instalação industrial, FAT/SAT, credencial de terceiro ou resultado comercial.
