# Tipografia e ícones do piloto

O manual visual p.7 especifica Owners e Roboto. A coleção fornecida não contém os arquivos web nem a licença de Owners. Para esta versão local foi utilizada **Montserrat em títulos e Roboto na interface e no corpo**, combinação existente no PowerPoint fornecido. Esta escolha é provisória e deve ser confirmada na avaliação visual; não representa uma alteração aprovada do manual.

As fontes são auto-hospedadas. Foram instalados os pacotes `@fontsource-variable/roboto` e `@fontsource-variable/montserrat`, ambos versão 5.3.0, com licença SIL OFL 1.1 incluída em `licenses/`. Não há requisição a Google Fonts ou CDN em tempo de navegação. O CSS inclui apenas latin e latin-ext e utiliza `font-display: swap`. JetBrains Mono permanece em código e conteúdos monoespaçados específicos.

Os títulos utilizam o token `--font-display`; trocar a família no futuro não exige mudar os textos. A chegada de Owners exigirá arquivos autorizados para web e nova verificação de peso, quebra de títulos, menus, carregamento e responsividade. Não extrair a fonte embutida no PowerPoint como substituição de licença.

O manual visual p.42 apresenta Tabler Icons. O componente `BrandIcon.astro` traduz os 40 nomes semânticos já usados no conteúdo para ícones Tabler equivalentes durante o build. Os dados editoriais conservam seus nomes e os atributos acessíveis são encaminhados. Não há JavaScript adicional no navegador. Ícones de controle em SVG já existentes e símbolos dos diagramas técnicos foram preservados; a troca cobre a biblioteca antes renderizada pelo astro-icon.

Referências verificadas em 05/09/2026: [Roboto](https://fontsource.org/fonts/roboto/install), [Montserrat](https://fontsource.org/fonts/montserrat/install). Os arquivos LICENSE instalados são a evidência da licença específica incluída nesta versão.
