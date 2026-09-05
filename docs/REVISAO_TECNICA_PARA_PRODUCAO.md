# Revisão técnica necessária para produção

As correções abaixo foram conferidas documentalmente com assistência de IA. Permanecem pendentes de revisão humana. O envio desta revisão ao GitHub foi autorizado e não altera esse estado.

O lote completo, as versões, as páginas afetadas e os localizadores estão no [registro de decisões](../src/data/technicalClaims.ts). As URLs e revisões dos fabricantes estão no [registro de fontes](../src/data/sourceRegistry.ts).

| ID | Decisão a revisar | Evidência |
|---|---|---|
| T01 | SoftLogix 5800 v23 não tem suporte à execução virtualizada; não extrapolar para outros produtos. | S01, requisitos de sistema |
| T02 | Control Expert S/L/XL cobrem conjuntos diferentes de CPUs; seleção exige matriz e opcionais. | S02, tabela por CPU |
| T03 | M221 usa Machine Expert Basic; M218 exige Machine Expert 2.1 ou anterior e verificação regional. | S03/S04, FAQs Schneider |
| T04 | deviceWISE EDGE pode usar licença perpétua ou assinatura; condições dependem do componente e proposta. | S05/S06, pricing e licenciamento |
| T05 | TIA Portal não substitui universalmente STEP 7 Classic; PCS 7 mantém combinações próprias. | S07, componentes de software, p. 83 |
| T07 | Isolamento de identidades não garante recuperação; combinar proteção, menor privilégio e restauração testada. | S09, backups, p. 5 |
| T08 | Exceções a MFA em OT exigem risco documentado, controles compensatórios, responsável e testes. | S10, interpretação de engenharia |
| T09 | OPC UA distingue UASC de TLS conforme o transporte; proteção depende da configuração. | S11/S12, Parts 2 e 6 |
| T13 | Mudanças em OT exigem fases, janelas e validação; não há promessa universal de continuidade. | S10, interpretação de engenharia |
| T17 | Revisão por IA e aprovação humana possuem registros e estados distintos. | Inspeção do processo editorial |

Para concluir, registrar o responsável humano real, a data, os IDs efetivamente revisados e o commit correspondente. Uma declaração única pode abranger os dez IDs. Registrar somente decisões explicitamente aprovadas; a assinatura não certifica uma instalação industrial, FAT/SAT ou resultado comercial.

Depois de registrar a revisão no cadastro, executar `npm run audit:claims:release`, revisar o diff e confirmar os checks da PR antes de integrar a `main`. O CI executa esse gate no último passo, após guardar o artifact de preview; enquanto houver P0/P1 pendente, o check obrigatório reprova e a proteção da branch impede o merge. A conexão direta do Cloudflare publica os commits integrados nessa branch.

As demais decisões P2 continuam disponíveis no mesmo registro para revisão editorial. Dossiês de clientes e credenciais dependem das evidências e permissões descritas em [CASE_EVIDENCE_BRIEFS.md](CASE_EVIDENCE_BRIEFS.md).
