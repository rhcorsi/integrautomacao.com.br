# Mapa de preservação de conteúdo da home

Base: `d89ea474f7dfa8d52e6a81eaa167f0280d151fef`. Implementação local de 04/09/2026. Todos os blocos originais continuam no HTML; houve reordenação, ajuste de hierarquia e revisão de redação.

| Bloco original | Destino na nova home |
|---|---|
| Hero + arquitetura | Abertura compacta com CTA vermelho e busca; diagrama identificado como ilustrativo, movimento inicial limitado |
| Rockwell Silver, CredentialStrip e MetricStrip | Credenciais após abertura; vínculos e referências continuam distintos |
| Novas entradas | Três intenções: resolver desafio, consultar conteúdo, avaliar experiência |
| Novos atalhos de solução | Modernização SCADA, PlantPAx, redes OT e dados industriais |
| Case Projeto Moinho | Antecipado para depois dos atalhos; leva ao relato existente, sem inventar prova ou métricas |
| LifecycleRail | Antecipado para depois do case; método antes do aprofundamento |
| Integrador multivendor + deviceWISE | Após método; inclui ligações editoriais para empresa e atendimento no Paraná |
| Seis fundamentos de engenharia | Mantidos com arquitetura, padrão, segurança, dados, batch e handover |
| Três referências PlantPAx/View SE/CPwE | Mantidas em disclosure nativo; todos os textos e figuras permanecem no HTML e são ampliáveis |
| FeatureBlocks PlantPAx/FactoryTalk/redes | Mantidos como aprofundamento; textos, listas, imagens e CTAs preservados |
| Dados industriais + Historian | Mantido após plataformas |
| Três valores | Mantidos após aprofundamento técnico |
| Equipe e eventos | Mantido; participação em eventos não é descrita como validação formal de releases |
| Manifesto e contato final | Mantidos no encerramento |

Os diagramas públicos continuam referências de fabricante, sem serem apresentados como arquitetura executada pela Integra. Conteúdo factual existente não recebe automaticamente aprovação humana porque seu layout foi atualizado.

## Expansão por componente

`PageHero` oferece variantes compacta/editorial/solução. `ManualReference` amplia figuras mantendo fonte e fallback sem JavaScript. `TechnicalToc` usa âncoras explícitas em solução/tecnologia e headings reais do MDX em artigo/case. O catálogo de 41 tecnologias recebe o novo template; artigos e cases usam seus templates compartilhados. Páginas que já utilizam `PageHero` e `ManualReference` recebem as melhorias comuns. A solução PlantPAx é o piloto de página comercial específica; demais composições específicas permanecem para revisão visual futura, sem substituir seu conteúdo às cegas.
