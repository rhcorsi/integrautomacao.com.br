# Ativos oficiais do rebranding

Data da preparação: 5 de setembro de 2026.

## Fonte e método

A única fonte de identidade usada nesta entrega foi a coleção local
`PADRÃO DE DESIGN E COMUNICAÇÃO INTEGRA AUTOMAÇÃO INDUSTRIAL/LOGO/`.
Os 54 arquivos da coleção original continuam presentes e os 54 SHA-256 do
inventário de referência foram reconferidos sem divergência.

Os SVGs web foram exportados deterministicamente dos PDFs RGB vetoriais da
pasta `PDF (PNG)`. Apesar do nome da pasta, esses PDFs contêm desenho vetorial,
sem imagens incorporadas. A exportação preserva a página, os contornos e as
cores; o lettering INTEGRA continua sendo arte vetorial e não foi reconstruído
com fonte. Os SVGs resultantes não contêm `script`, `image`, `text`, fonte nem
referência externa. Os WebPs são cópias byte a byte das exportações oficiais.

## Interfaces recomendadas

| Uso | Caminho público | Fundo esperado |
|---|---|---|
| Cabeçalho ou superfície clara | `/images/brand/integra-logo-light.svg` | claro ou branco |
| Rodapé ou superfície grafite | `/images/brand/integra-logo-dark.svg` | `#282828` |
| Símbolo compacto | `/images/brand/integra-symbol.svg` | claro ou branco |

As três interfaces acima também têm versão `.webp`. Elas são aliases dos
arquivos semânticos correspondentes e preservam os mesmos bytes.

## Biblioteca de doze variantes

As dimensões abaixo são as dimensões dos PNGs oficiais usados para conferir a
exportação. `on-light`, `on-dark` e `on-red` descrevem a superfície de uso, não
um fundo incorporado: os arquivos continuam transparentes.

| Arquivo base em `/images/brand/` | Fonte oficial | Dimensão | SHA-256 PDF fonte | SHA-256 WebP oficial | SHA-256 SVG web |
|---|---|---:|---|---|---|
| `integra-logo-horizontal-on-light` | `LOGO-horizontal-1` | 1581x614 | `bc5d83ad58676f78dcda778b9c81897cb4f498ed81bbed6a9a23a4308c51d7da` | `27c67d5f462bd3a762b33131b1efa053520c61a75b51fd42bf6c02f479dfa38c` | `1dcf92971c09411113e692ba0b84560e43927480e8011d36952d674aa869d8d2` |
| `integra-logo-horizontal-on-dark` | `LOGO-horizontal-2` | 1582x614 | `544b70b14ffcde483c52f5c1ed9d02052114268afc500e6d346ebde9886d9c47` | `5f2cba04ae0386b6b48fe46492bdc816364ba1967f8a12e6d59515866e39cd01` | `0d621fd576123d74ac6049e7a6d1199dd51b4c182bfaa91b831e0969a97791bd` |
| `integra-logo-horizontal-on-red` | `LOGO-horizontal-3` | 1582x614 | `b9b043faee022457e138080c734a9c7621f86fd8fa8f0bebe192c999e3689ced` | `6beb339558bcb5d155e5529214b3c3b398ae563c29615bf15f25b60a89b2f008` | `fe3fac8ff89ac3e5bbda26a1c09f5047353b0f4cf13a8bed9681c4c726fcf610` |
| `integra-logo-compact-on-light` | `LOGO-horizontal-segmento-respiro copia` | 1620x660 | `08a2cb7fc32c58bb5f4fc95cd4cd7ddbbbeb837a45d85a0cbacf74699fa4eb61` | `5f69c0ecd1517552746cfdf6f5d33d00b92b14c9e5e8336147a1ebee06aee6a7` | `a71a5f9ad8aa5e3a8607f429bad7f3c8079187188fc705b1a148c250a0a3c54c` |
| `integra-logo-compact-on-dark` | `LOGO-horizontal-segmento-respiro copia 2` | 1620x660 | `75ffaf693fd7c43fb6a13b172d48417af3666b41a7098b6dd4780688c3990f91` | `799dff8046d2a882cf29db208231bf80f06e82bbd4c7f055a8268df910be1e84` | `cc9c55dc495a0518e8da7479fe261aaeae6423a3a36c6666bb8b129176882f46` |
| `integra-logo-compact-on-red` | `LOGO-horizontal-segmento-respiro copia 3` | 1620x660 | `637f4cbaf25297e485b9a54668bc27ff9276e80c2054cd6451cf0122c9dbd1b2` | `138539d14c36955844234e8bda50950b7bd4fe14b6a40339bd9c9697fbcbfb75` | `29b7e29b8e8f2e58b5455d7335bbf6229afa768cf33e1afadcfd77653781694f` |
| `integra-symbol-on-light` | `LOGO-icone-1` | 600x601 | `dfdb147df8f9ec808f144b86b7fe69256882d44aad96b9081ad6f76a14a48ea3` | `e9a5c358637b6479620919dc01064b99fd96cd8cfad6cfd265bf38f70b6c3696` | `f0391144406fa55da376eae8302290a518261c1f661c5008b9f33200b6d09060` |
| `integra-symbol-on-dark` | `LOGO-icone-2` | 600x601 | `f100057504694fabe5ec9b8045f476913f128c1f19831eb16646e7af7ba0f39d` | `b83bee2d0c6b836c4100c15b079a845bbbf5066261aba24b184bd5e22286cff1` | `ce70a3ac2b2c13264dc4d67317433b7f47fe420fdfff683f9cbc2bd337698d9d` |
| `integra-symbol-on-red` | `LOGO-icone-3` | 600x601 | `c7143d0b97deb78c17232b145aa01d6150f97a467e897774bddc334cd1aa79af` | `ad00d5f766941b90d0ab35df9a1b450acf72ffd87df1106aff9bd3f18e88b7c4` | `bb0057a2ee7c57997d45e67c403aff145cf4bae71247b5a60618bceb695f31f4` |
| `integra-logo-vertical-on-light` | `LOGO-vertical-1` | 1200x1201 | `cd472062e9afdd0d59ebaa61dc73cc83f2cf68d7f1d1f574d0eceb3b03ad7ed2` | `9e43b14d5e29f7af66d80fa0d4115475624a5a87040e6677256742180f72bcbb` | `5666ac2c74795aba15df6f385d2171594c82131dd8b227b584c8194ca613518d` |
| `integra-logo-vertical-on-dark` | `LOGO-vertical-2` | 1200x1201 | `923ed9b9f976e9d2c5f3c2cba9b51ae3da044ae6e88540c5a119291e53a1fc5d` | `7f5438b817b12563bc825f93f0434b54dd7bb89353ff03ff48aeefb0508542c0` | `b3c6903ed635a882fa269d097a7738668978beb025b5201cd2e82fa7b67d1148` |
| `integra-logo-vertical-on-red` | `LOGO-vertical-3` | 1200x1201 | `75a3a99e6d5c1fc35048ac299a067f0460872bd238fcf862b674af062463f4c2` | `b50baf39c4fa339c6e202fe2b79b5d9a2fd9abb2a077266cdc46ebb0e371b8c0` | `4b40309556cf7e4be7c8643df43995de3538d9b1fc2790ab9c5529b16743b57d` |

## Entradas legadas atualizadas

| Arquivo | Origem ou transformação | Dimensão | SHA-256 entregue |
|---|---|---:|---|
| `/logo.png` | copia exata de `PNG/LOGO-horizontal-1.png` | 1581x614 | `e9ea05893c443300c0427424feeba8e828d19c2ec714fca5d6b7129a34067438` |
| `/favicon.svg` | mesmos paths de `LOGO-icone-1.pdf`; somente o `viewBox` foi recortado para legibilidade | 460x460 | `ac8bf14af71267bb2dbff8690cf23b613d80fc2ab93353133ff65845f2675966` |
| `/favicon.png` | raster transparente do favicon oficial | 512x512 | `3eb8b41fa984ce46acd318484d276e6b0b0304818982a6e9bfa350f508f2565a` |
| `/favicon.ico` | PNGs 16, 32 e 48 px no contêiner ICO | multirresolução | `8a4252b5210fd31f15f0558d81b17c1c5d1892f47b6f513f1141768f0f0b7ccf` |
| `/apple-touch-icon.png` | símbolo oficial centralizado em superfície branca | 180x180 | `cde71f8b8d68961cb4a1aa832498a99bc89a3c7f7bf5009869ed2c31a6fedf17` |

O recorte do favicon não altera os paths do símbolo. Ele reduz apenas o espaço
transparente do canvas de 600x600 para um `viewBox` de `70 70 460 460`, dando ao
símbolo cerca de 80% da altura disponível e mantendo margem segura.

## Imagens de compartilhamento

Foram atualizados 21 cards 1200x630 que continham o lockup antigo:
`blog`, `cases`, `certificacoes-silver`, `certificacoes`, `contato`, `default`,
`empresa`, `eventos`, `integra-acao-newsletter`, `integra-acao-webinar`,
`integra-acao`, `setores`, `solucoes-data-centers`, `solucoes-factorytalk`,
`solucoes-migracao-plc`, `solucoes-modernizacao-scada`, `solucoes-pi-system`,
`solucoes-plantpax`, `solucoes-redes-iec-62443`, `solucoes` e `tecnologias`.

Somente a região do logo mudou. Uma comparação de pixels contra `HEAD`
encontrou zero pixel alterado fora dessa região nos 21 arquivos; títulos,
descrições, grades, fotografias, diagramas e marcas de fabricantes foram
preservados. Os 14 cards escuros de artigos e case, que não continham o lockup
visual antigo na área principal, não foram alterados.

## Verificações

- 12/12 WebPs entregues têm o mesmo SHA-256 das fontes oficiais.
- 12/12 SVGs são path-only, sem raster, texto, fonte, script ou href externo.
- Os 12 SVGs renderizados mantiveram as mesmas caixas alfa dos PNGs oficiais,
  com variação máxima de um pixel nas bordas e sobreposição de máscara entre
  96,472% e 99,639% devido ao antialiasing dos renderizadores.
- As quatro famílias e as três variantes por fundo foram inspecionadas na folha
  de contato; os SVGs claro, escuro e símbolo também foram renderizados em
  resolução original e conferidos visualmente.
- A biblioteca `/images/brand/` contém 30 arquivos, 209.402 bytes: 24 arquivos
  das 12 variantes em SVG+WebP e seis aliases de integração. As cinco entradas
  legadas somam 40.135 bytes. Os 21 OGs atualizados somam 855.239 bytes.

Não houve geração de imagem nem reconstrução do logo por IA.
