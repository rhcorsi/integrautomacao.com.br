# Revisão documental para publicação — 05/09/2026

Escopo: dez decisões P1 do lote de elevação do portal. A revisão de fabricantes e a revisão de segurança OT foram realizadas em paralelo por agentes de IA, com conferência das fontes primárias e do texto publicado. O processo editorial foi inspecionado no código. O resultado é revisão documental, sem assinatura técnica humana, FAT/SAT ou prova de campo.

A política de publicação aceita P1 documental com evidências válidas e preserva a exigência humana para P0. A autorização operacional de publicação e a aprovação técnica humana são registros distintos. Não houve inclusão de pessoa como revisora nem alteração das proteções do GitHub.

Cada fingerprint SHA-256 vincula os campos substantivos da decisão às URLs, revisões e estados das fontes. Uma mudança nesses campos invalida o registro. O hash prova correspondência do cadastro revisado; não certifica a veracidade do conteúdo por si só. Os testes, a inspeção de páginas e a conferência das fontes complementam essa rastreabilidade.

## T01 — SoftLogix 5800

A nota de versão exclui execução virtualizada. O FAQ mantém o recorte SoftLogix 5800 v23; não infere suporte de outro produto nem de release posterior.

Texto revisado: SoftLogix 5800 não é suportado em ambientes virtualizados nas notas oficiais da versão 23. Consulte lifecycle e requisitos da versão instalada; não use execução experimental como evidência de suporte.

Localizador: SoftLogix Version 23 System Requirements / Operating systems.

Revisão: documentary-vendor-ai; 2026-09-05; IA.

- [S01 — Rockwell SoftLogix 5800 v23 release note](https://compatibility.rockwellautomation.com/GeneratedReleaseNote.aspx?v1=53278) — SoftLogix 5800 v23.

`T01: 3a1ded8fb0522cc9a59a5cf74df5afb8d5d68580ce4d1c802a702ec20688dcd6`

## T02 — EcoStruxure Control Expert

A tabela oficial diferencia os conjuntos de CPU S/L/XL. A FAQ complementar confirma o opcional Safety no cenário tratado. Seleção permanece condicionada ao código da CPU e à licença vigente.

Texto revisado: As licenças S, L e XL cobrem conjuntos distintos de controladores e CPUs. A seleção depende do código exato da CPU, dos opcionais e da modalidade vigente, incluindo requisitos safety quando aplicáveis.

Localizador: FAQ000263116: tabela S/L/XL por CPU; FAQ000258027: Resolution (Safety add-on).

Revisão: documentary-vendor-ai; 2026-09-05; IA.

- [S02 — Schneider FAQ000263116: licenças Control Expert S, L e XL](https://www.se.com/it/it/faqs/FAQ000263116/) — FAQ atualizada em 2024-01-16.
- [S21 — Schneider FAQ000258027: complemento Safety do Control Expert](https://www.se.com/us/en/faqs/FAQ000258027/) — FAQ atualizada em 2025-05-06.

`T02: 30f8588268aa80c5c0fd1bdb072fb511381a0119fbbf9b879fe96a0fa8976014`

## T03 — EcoStruxure Machine Expert

A FAQ registra a remoção de M218 a partir de 2.2 e a necessidade de 2.1 ou anterior, com limitação regional. M221 utiliza Basic. O catálogo 2.2 lista M241, M251 e M262 e sustenta o FAQ publicado.

Texto revisado: Machine Expert e Machine Expert Basic atendem conjuntos diferentes de controladores. M221 usa Basic; M218 exige verificar versões anteriores e disponibilidade regional. Confirme controlador, release, firmware e caminho de migração.

Localizador: FAQ000265412: nota inicial; FA233597: Resolution; Machine Expert V2.2: Controllers.

Revisão: documentary-vendor-ai; 2026-09-05; IA.

- [S03 — Schneider FAQ000265412: M218 no Machine Expert](https://www.se.com/us/en/faqs/FAQ000265412/) — FAQ atualizada em 2026-03-03.
- [S04 — Schneider FA233597: programação do M221](https://www.se.com/us/en/faqs/FA233597/) — FAQ atualizada em 2026-05-21.
- [S22 — Schneider Machine Expert V2.2: Controllers](https://product-help.schneider-electric.com/Machine%20Expert/V2.2/LandingPages/en/VLP_Controllers/index.html) — Machine Expert V2.2; catálogo de controladores.

`T03: 0d37fa95276146333c97cb853eec2dd21d47bfbb3a6735dbc20fda3ddfb33ed5`

## T04 — Telit deviceWISE

A documentação de EDGE/AWS apresenta opções perpétua e assinatura; a matriz Enterprise condiciona recursos à licença e ao status do transporte. Corrigida a revisão de S06 para 03/08/2026, conforme a página.

Texto revisado: O licenciamento depende do componente, das conexões e dos recursos contratados. O deviceWISE EDGE pode ter opções perpétuas ou por assinatura; confirme módulos, suporte de atualização e condições na proposta vigente.

Localizador: S05: AWS Deployment Considerations / Telit Pricing; S06: License structure / Release Status.

Revisão: documentary-vendor-ai; 2026-09-05; IA.

- [S05 — Telit deviceWISE EDGE / AWS](https://docs.devicewise.com/Content/Products/GatewayDevelopersGuide/CloudConnectors/AWS/AWS.htm) — Página vigente em 2026-09-04.
- [S06 — Telit Supported Enterprise transports](https://docs.devicewise.com/Content/GettingStarted/Supported-Enterprise-transports.htm) — Página atualizada em 2026-08-03.

`T04: de60d2c14f5e7dd3145459f550ec5b257a8cb5dfd573a2561c55c6d30c6d868a`

## T05 — SIMATIC PCS 7 / STEP 7

O Readme PCS 7 V10.0 SP1 relaciona STEP 7 Basis V5.7 + SP3 + HF1 na página 83. Isso sustenta a coexistência e impede a generalização de substituição universal. O link do Readme foi atualizado para a cópia oficial acessível.

Texto revisado: TIA Portal é o ambiente de engenharia para diversas famílias SIMATIC atuais. STEP 7 Classic permanece relevante em arquiteturas compatíveis, inclusive PCS 7; evolução e migração dependem do produto e das versões.

Localizador: PCS 7 Readme: capítulo 6, p. 83, STEP 7 Basis; STEP 7 TIA Portal: introdução e FAQ.

Revisão: documentary-vendor-ai; 2026-09-05; IA.

- [S07 — Siemens PCS 7 V10.0 SP1 Readme](https://cache.industry.siemens.com/dl/files/446/109983446/att_1321395/v1/SIMATIC_PCS7_V10_0_SP1_Readme.pdf) — PCS 7 V10.0 SP1; Readme 2025-03; A5E54166065-AA.
- [S23 — Siemens SIMATIC STEP 7 no TIA Portal](https://www.siemens.com/en-us/products/tia-portal/step7/) — Página de produto consultada em 2026-09-05.

`T05: 5b535856e817ec5983c2091726b6f3eaa7dfbfc25e4c75b602045b8864f7866a`

## T07 — Backup e recuperação OT

O guia sustenta proteção e teste de backups, separação de contas, menor privilégio e segmentação. A síntese continua condicionada ao cenário de recuperação. Acrescentada criptografia. A versão HTML foi consultada; o PDF CISA v3_1 respondeu 403. O PDF corroborativo do coautor FBI/IC3 (https://www.ic3.gov/CSA/2023/230523.pdf, pp. 5-6, 9 e 15) não foi tratado como arquivo idêntico.

Texto revisado: Separar identidades e limitar caminhos de acesso reduz o risco de propagação. Combine cópias criptografadas e proteção por isolamento ou imutabilidade, menor privilégio, atualização, monitoramento e restauração testada para os cenários definidos.

Localizador: Part 1: Preparing for Ransomware and Data Extortion Incidents; Initial Access Vector: Compromised Credentials; General Best Practices and Hardening Guidance.

Revisão: documentary-ot-ai; 2026-09-05; IA.

- [S09 — CISA StopRansomware Guide](https://www.cisa.gov/stopransomware/ransomware-guide) — StopRansomware Guide; edição 2023, versão HTML consultada em 2026-09-05.

`T07: 13c883a16bad6d8bb14afc78e700958e23e8414986287ad26f28a9e93a1e9fa1`

## T08 — Active Directory em OT

O NIST recomenda MFA especialmente no acesso remoto e trata restrições operacionais e controles compensatórios. A redação sobre registro de risco, aprovação responsável e testes é identificada como interpretação de engenharia, não como citação normativa literal.

Texto revisado: MFA é uma boa prática para acesso remoto a OT. Defina autenticação por função e cenário operacional. Quando houver restrição técnica ou operacional a MFA, documente o risco, os controles compensatórios e a aprovação responsável, e teste acesso normal e emergencial.

Localizador: NIST SP 800-82r3: 6.2.1.4.4, p. 106; F.4, p. 224; IA-2, pp. 252-253; IA-5, p. 254.

Revisão: documentary-ot-ai; 2026-09-05; IA.

- [S10 — NIST SP 800-82 Rev.3](https://csrc.nist.gov/pubs/sp/800/82/r3/final) — SP 800-82 Rev.3; setembro de 2023.

`T08: 19eb98eac3e859abb1c47dff15e966196ecead085d237907c9e4489366055e83`

## T09 — OPC UA

Part 4 associa explicitamente o perfil UA-TCP/UA-SC/UA-Binary a UASC; Part 6 distingue o mapeamento HTTPS/TLS. O texto foi delimitado ao perfil e mantém certificados, confiança e configuração como condições.

Texto revisado: OPC UA oferece identidade de aplicações, políticas e modos de segurança. O mecanismo depende do mapeamento: UA-TCP/UA-SC/UA-Binary utiliza UASC; outros mapeamentos podem usar TLS. Avalie certificados, confiança, autorização e configuração antes de migrar.

Localizador: Part 2: 4.5.2.3; Part 6: 6.7.1 e 7.4.1; Part 4: 1 Scope.

Revisão: documentary-ot-ai; 2026-09-05; IA.

- [S11 — OPC Foundation Part 2: Session communication layer](https://reference.opcfoundation.org/specs/OPC-10000-2/4.5.2.3) — OPC UA Part 2, versão 1.05.06.
- [S12 — OPC Foundation Part 6: OPC UA Secure Conversation](https://reference.opcfoundation.org/specs/OPC-10000-6/6.7) — OPC UA Part 6, versão 1.05.07.
- [S24 — OPC Foundation Part 6: HTTPS overview](https://reference.opcfoundation.org/specs/OPC-10000-6/7.4.1) — OPC UA Part 6, versão 1.05.07; seção 7.4.1.
- [S25 — OPC Foundation Part 4: Services scope](https://reference.opcfoundation.org/specs/OPC-10000-4/1) — OPC UA Part 4, versão 1.05.07; seção 1.

`T09: 7475b7827bc8a5dcc2b07a019e935194fb0f491aa75a75b598162cee5eb0b718`

## T13 — Execução de cibersegurança OT

As seções sobre gestão de patches e controle de mudanças sustentam testes, impactos operacionais e janelas planejadas. A síntese é uma interpretação de engenharia e não promete continuidade universal da produção.

Texto revisado: A execução transforma o diagnóstico em mudanças de rede, servidores e controle, com fases, janelas e critérios de validação definidos pelo risco operacional.

Localizador: NIST SP 800-82r3: 5.2.5.2, pp. 77-78; 6.2.4.2, pp. 111-112.

Revisão: documentary-ot-ai; 2026-09-05; IA.

- [S10 — NIST SP 800-82 Rev.3](https://csrc.nist.gov/pubs/sp/800/82/r3/final) — SP 800-82 Rev.3; setembro de 2023.

`T13: d0de04c147de49653c707a8c053c012962532945482a99f4df7a8d0a7166c452`

## T17 — Processo editorial técnico

Inspeção do esquema, validador, apresentação e política: documented identifica revisão por IA; approved exige pessoa real. P0 continua exigindo aprovação humana. P1 documental exige referências, revisor IA, data, dossiê e fingerprint. Casos de laboratório, campo ou evidência interna não recebem liberação documental.

Texto revisado: O registro distingue revisão documental assistida por IA de aprovação técnica humana. A publicação documental exige fontes, escopo, data, responsável identificado como IA e evidência vinculada ao texto revisado; aprovação humana só é declarada com registro real.

Localizador: src/data/technicalClaimTypes.ts; scripts/technicalClaimsPolicy.ts; scripts/verifyTechnicalClaims.mjs; src/pages/politica-editorial.astro.

Revisão: documentary-editorial-ai; 2026-09-05; IA.


`T17: 95b4167500740d06178e81db7ffc39cbdd3cc112c6fa33232ba08e024fc1408a`

## Limites mantidos

As decisões P2 continuam com seu estado explícito. T18 e T19 dependem de evidências internas e não foram promovidas a revisão documental. Métricas de campo, conversão, entrega real de e-mail e resultados comerciais não são demonstrados por este dossiê.
