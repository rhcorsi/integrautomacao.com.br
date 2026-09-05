# Dossiês para conteúdo de experiência — preparação local

Data: 04/09/2026. Estes briefs organizam coleta e validação; não são três projetos novos nem três cases prontos para publicação. Não incluir documentos privados em `public/`, `src/` ou no bundle do portal.

| Frente | Material disponível neste checkout | Intenção e destino | Condição para avançar |
|---|---|---|---|
| Modernização SCADA | Relato já publicado de Projeto Moinho, imagens declaradas ilustrativas, referências públicas | Fortalecer `/cases/projeto-moinho/`; não criar duplicata | Conferir dossiê privado de projeto, datas, FAT/SAT, cutover, rollback e autorização do recorte |
| Migração de PLC legado | Conteúdo técnico e páginas comerciais; sem dossiê de cliente auditado nesta execução | Atualizar o cluster existente de migração; case novo só se houver experiência específica comprovável | Selecionar um projeto real; confirmar plataforma/versão, restrição de parada, matriz de teste e aceite |
| Redes e infraestrutura OT | Guias e referências de arquitetura; sem dossiê de cliente auditado nesta execução | Apoiar decisões sobre rede, acesso, recuperação e critérios de teste | Selecionar experiência real e aprovada; sanitizar topologias, endereços, nomes, ativos e controles |

## Ficha obrigatória de cada projeto

1. Responsável real pelo relato, cliente/titular e autorização: evidência restrita, data, escopo público permitido, restrições de NDA e quem aprovou. Não preencher com suposições.
2. Problema e restrição: processo, criticidade, base instalada, requisito contratual e janela. Registrar a fonte exata de cada afirmação.
3. Decisão: alternativas avaliadas, critério de escolha, produto/release/firmware/licença e premissas de compatibilidade. Separar caracterização de fabricante de teste realizado no projeto.
4. Entrega: arquitetura, configuração, revisão, plano de teste, resultados e exceções. O termo FAT/SAT exige registro efetivo, não apenas plano.
5. Aceite: responsável, data, critério, desvio aceito e evidência. Não publicar nomes ou arquivos privados por padrão.
6. Resultado: valor, unidade, baseline, período, método e fonte. Sem série mensurada, manter descrição qualitativa atribuída ao relato, sem estimar ganho, redução de parada ou ROI.
7. Material visual: ativo próprio ou licença/permissão documentada; diagrama sanitizado revisado por engenharia. Imagem ilustrativa sempre identificada.
8. Revisão pública: checar texto, imagem, alt, metadados e JSON-LD contra o recorte aprovado. Separar autorização do cliente da revisão factual e da publicação.

## Modelo da página resultante

Resposta executiva → contexto e restrição → decisão de engenharia → entregáveis e aceite → resultado com limites → lições aplicáveis → fontes/tecnologias → contato contextual. O formato é comum; o conteúdo deve vir de cada projeto real.

## Conteúdo de decisão sem duplicar URLs

- Migração PLC: aprofundar critérios de aceite e reversão no guia existente, vinculados à solução e à página técnica. Não reutilizar resultados de Moinho como prova de migração PLC.
- PlantPAx/SCADA: usar a comparação 4.x/5.x já revisada para explicar como confrontar release, biblioteca e matriz de compatibilidade.
- Redes OT: manter SL-T vinculado à análise de risco e ao escopo, e RTO/RPO vinculados à estratégia de recuperação. Exemplos devem ser identificados como conceituais até haver evidência de projeto.

Pendências: aprovação humana do conteúdo, disponibilidade dos dossiês e autorização para publicação. A preparação destes briefs não encerra essas pendências.
