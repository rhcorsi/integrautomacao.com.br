# Retorno à versão anterior ao rebranding

Referência congelada em 05/09/2026: **70314f5a340393f5fd8356397aeaca55b06e6fe4**.

- [Commit já existente no GitHub](https://github.com/rhcorsi/integrautomacao.com.br/commit/70314f5a340393f5fd8356397aeaca55b06e6fe4).
- Tag anotada de proteção: `backup/pre-rebranding-2026-09-05`, incluída no push autorizado do rebranding. Ela aponta exclusivamente ao commit anterior indicado acima e deve ser preservada no GitHub.
- Branch de trabalho: `codex/rebranding-2026-09-05`. O checkout `site` continua em `main` na referência acima.
- Backup independente do código e histórico Git: `pre-rebranding-2026-09-05.bundle`; cópia ZIP: `codigo-pre-rebranding-2026-09-05.zip`. Ambos na pasta local `_analysis/rebranding-2026-09-05/execucao`, fora do site publicável.
- Produção identificada na análise: Cloudflare Pages `integrautomacao-com-br`, deployment `7bdccb93-2c2e-4795-bc94-842fd137cda6`, associado ao mesmo commit. Conferir novamente antes de uma publicação futura.

## Durante a revisão local

A versão anterior continua disponível em `site`. Basta encerrar o preview novo e usar o checkout original. Não é necessário resetar a branch, apagar trabalho ou alterar a produção. O rebranding permanece no worktree `.worktrees/rebranding-2026-09-05` para comparação e revisão.

## Depois de uma publicação futura

Há duas ações complementares:

1. **Restaurar o site servido:** no projeto Cloudflare Pages, abrir Deployments, localizar a implantação de produção acima e escolher **Rollback to this deployment**. Confirmar a identificação e executar a volta quando autorizada. A Cloudflare aceita implantações de produção concluídas com sucesso como destino; previews não são destinos de rollback. [Documentação oficial](https://developers.cloudflare.com/pages/configuration/rollbacks/).
2. **Alinhar o GitHub:** abrir uma PR que reverta somente a PR do rebranding e seguir os mesmos testes e revisão antes do merge. Isso conserva o histórico e evita que o próximo deploy reintroduza a versão rejeitada. Se outros trabalhos tiverem sido mesclados depois, revisar conflitos e preservar essas alterações. Não fazer force-push ou reset destrutivo da `main`.

Não basta selecionar um commit antigo no GitHub para alterar o site servido. A implantação e o código precisam voltar de forma coordenada. Registrar as duas revisões e conferir home, página técnica, busca, redirects, canonical e contato após a reversão.

## Recuperação sem acesso ao GitHub

O bundle contém o histórico alcançável pela tag. Em um diretório novo, pode-se validar e clonar o backup:

```powershell
git bundle verify 'CAMINHO-DO-BACKUP/pre-rebranding-2026-09-05.bundle'
git clone --branch backup/pre-rebranding-2026-09-05 'CAMINHO-DO-BACKUP/pre-rebranding-2026-09-05.bundle' 'NOVO-DIRETORIO'
git -C 'NOVO-DIRETORIO' rev-parse HEAD
```

O HEAD esperado é o commit informado no início. A tag anotada tem um identificador próprio; comparar o commit resolvido (`tag^{commit}`), e não o objeto da tag, com o HEAD.

## Escopo da proteção

Este backup cobre código e arquivos versionados. Não é uma cópia de banco de dados, segredos, caixas de e-mail ou configurações externas. O rebranding não altera esses recursos. Não apagar a implantação antiga nem os backups durante a revisão. Nenhum rollback de produção foi executado como teste.
