# Site da Pastri Usinagem

Site institucional de uma página só (Campo Limpo Paulista/SP). É um site **estático**: HTML, CSS e
JavaScript escritos à mão, sem framework e sem banco de dados. O `build` só monta a pasta `dist/`,
que é o que vai para o ar.

Mesma base dos sites da TAE e da Terto: a estrutura de pastas, o `build.js` e o `serve.js` são os
mesmos, com o conteúdo, as cores e a hero trocados para a Pastri.

## Rodar no seu computador

```bash
npm run dev       # abre em http://localhost:4181 (arquivos como estão, bom para editar)
npm run preview   # gera a dist/ e abre em http://localhost:4182 (igual ao que vai para o ar)
```

Não precisa instalar nada para isso: só o Node.

## Publicar na Vercel

O `vercel.json` já está pronto. Na Vercel:

- **Framework Preset**: `Other`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variable**: `SITE_URL` = o domínio real, por exemplo `https://www.pastriusinagem.com.br`

O `SITE_URL` troca o domínio em todo lugar que ele aparece (canonical, Open Graph, dados
estruturados, `sitemap.xml`, `robots.txt` e `llms.txt`). Sem ele, o site usa
`https://www.pastriusinagem.com.br` como padrão.

Depois de publicar, cadastre o site no **Google Search Console** e envie o
`https://SEUDOMINIO/sitemap.xml`. É o que faz o Google indexar mais rápido.

## Estrutura

```
index.html                 a página inteira (conteúdo, textos e dados estruturados)
404.html                   página de endereço não encontrado
robots.txt                 libera buscadores e robôs de IA
sitemap.xml                mapa do site
llms.txt                   resumo do site em texto, para ChatGPT, Gemini, Perplexity e Claude
vercel.json                cache, segurança e redirecionamentos de endereços antigos
build.js                   gera a dist/ (ver abaixo)
serve.js                   servidor local
assets/css/styles.css      todo o estilo, em seções numeradas
assets/js/main.js          menu, animações e o formulário que abre o WhatsApp
assets/fonts/              Inter (textos) e Poppins (títulos), hospedadas aqui
assets/img/                todas as imagens, geradas pelo script (não edite à mão)
fotos-origem/              as imagens originais + CREDITOS.txt (de onde veio cada uma)
scripts/gerar-imagens.cjs  gera assets/img/ a partir de fotos-origem/
```

## O que o `build.js` faz

1. **CSS crítico**: separa as seções do `styles.css` que aparecem na primeira tela (1 a 7 e a 18),
   minifica e coloca dentro do HTML. O resto vira `assets/css/rest.css` e carrega depois, sem
   travar a primeira pintura da página.
2. **Nome com hash**: cada arquivo de `assets/` ganha um código do próprio conteúdo no nome
   (`hero-pastri-1200.bf151efda3.avif`). Por isso a Vercel pode guardar tudo por um ano: se a
   foto mudar, o nome muda junto e o navegador baixa a nova.
3. Copia `robots.txt`, `sitemap.xml`, `llms.txt` e `404.html`, trocando o domínio.
4. Confere os dados estruturados e avisa se o FAQ do schema não bater com o FAQ que aparece na
   página. **Se aparecer "AVISO" no fim do build, leia: alguma coisa saiu do lugar.**

Os marcadores de seção do CSS (`/* ---------- N. Título ---------- */`) **não podem ser
renumerados** sem ajustar a lista `SECOES_CRITICAS` no `build.js`.

## A hero

A hero foi feita para ficar igual ao protótipo que você já apresentou ao cliente
(`fotos-origem/prototipo-hero.webp`). O que foi medido nele e virou variável no CSS:

- **Amarelo da marca**: `#f8c204` (`--am-500`). O arquivo do logo veio num amarelo mais escuro
  (`#e8a40a`); o `gerar-imagens.cjs` redesenha o logo neste tom para o site inteiro bater com o
  protótipo. Para voltar ao tom original do arquivo, mude a constante `AMARELO` no script.
- **Diagonal**: `--diag-top` / `--diag-bottom`. A passagem do painel preto para a foto é suave
  (um degradê), não um corte seco — como no protótipo.
- **Listra amarela** do canto inferior direito: `--listra-top` e `--listra-w`, na mesma inclinação.
- **Altura da hero**: 27% da largura da tela.

O amarelo só é legível sobre preto. Sobre fundo claro o site usa `--am-tinta` (`#8a6400`) para
texto e deixa o amarelo puro só para barras e ícones. **Não troque um pelo outro**: amarelo puro
sobre branco não passa no contraste mínimo.

## Trocar as fotos

**Todas as fotos do site são da própria Pastri.** Vieram do portfólio da empresa
(`2 - Portfolio_Pastri_Profissional.pptx`), mais a foto da fachada e o logotipo enviados antes.
Não há nenhuma foto de banco de imagens.

No portfólio, as fotos das máquinas estavam dentro de um quadro, por cima de uma versão desbotada
e com marca d'água da mesma foto. O que foi aproveitado é só o miolo desse quadro — sem marca
d'água e sem o véu branco. De onde veio cada imagem:
[`fotos-origem/CREDITOS.txt`](fotos-origem/CREDITOS.txt).

1. Salve a foto nova em `fotos-origem/`, com o mesmo nome do arquivo que você quer substituir.
   Pode ser do tamanho que for: o script corta sozinho.
2. Rode:

```bash
npm i --no-save sharp
npm run imagens
```

O script corta no formato certo, redimensiona e salva tudo em `assets/img/`, em WebP e AVIF, em
várias larguras (o navegador baixa só a que couber na tela). Ele também gera o logo com fundo
transparente, os favicons e a imagem de compartilhamento (`og-pastri.jpg`).

Depois de trocar uma foto, **confira o texto `alt` dela no `index.html`**: ele descreve o que
aparece na imagem, para quem usa leitor de tela e para o Google.

Três ajustes por foto, na lista `FOTOS` no começo do `scripts/gerar-imagens.cjs`:

- `foco` — se o assunto ficar cortado, um número de `0` (corta pelo topo) a `1` (corta pela base).
- `cinza` — quanto de cor sobra, de `0` (preto e branco) a `1` (cor original). A hero usa `0.10`
  para ficar como no protótipo e os três cards inclinados usam `0.6`; as fotos das peças e das
  máquinas ficam na cor natural (sem o campo).
- `recorte` — `[esquerda, topo, largura, altura]` em pixels, quando um pedaço exato da foto
  precisa ser usado (é o caso da fachada).

## Mudar textos e contatos

Tudo está no `index.html`, em português e com comentários marcando cada seção.

Se mudar o número do WhatsApp, troque em **três** lugares:

- `assets/js/main.js`, na linha `var WHATSAPP = "5511996513914";`
- todos os links `https://wa.me/5511996513914...` do `index.html`
- o telefone nos dados estruturados (o bloco `application/ld+json` no topo do `index.html`)

Ao mexer no FAQ, mude o texto **nos dois lugares**: no `<details>` visível e no bloco
`FAQPage` dos dados estruturados. O `build.js` avisa se os dois ficarem diferentes.

## O que ainda falta (informação que o cliente precisa mandar)

- **Horário de atendimento** — é a única informação de contato que falta; não está no site nem no
  schema. Com ela dá para preencher o `openingHoursSpecification` do `LocalBusiness`.
- **Coordenadas exatas da oficina** — o endereço completo está no site e no schema, mas o
  `geo` e as metatags `geo.position`/`ICBM` ainda usam o ponto central de Campo Limpo Paulista.
  Não foram inventadas coordenadas de rua. O Google consegue localizar pelo endereço; para
  colocar um mapa na página, pegue a latitude e a longitude no Google Maps.
- **Autorização para publicar os logos de clientes** — o slide 25 do portfólio tem os logotipos
  dos clientes e parceiros. Eles **não** foram publicados: usar a marca de outra empresa no site
  exige autorização dela. Com a autorização por escrito, dá para montar a seção.
- **Tempo de mercado, certificações e quantidade de funcionários**, se o cliente quiser — nada
  disso aparece no portfólio e nada foi inventado no texto.
- **Confirmar se o (11) 99651-3914 (Lucas) é o número do WhatsApp** — hoje o site usa esse número
  para WhatsApp e o (11) 97485-2637 (Denis) só para ligação.
