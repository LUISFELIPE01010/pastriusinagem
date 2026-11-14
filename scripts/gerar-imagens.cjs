#!/usr/bin/env node
/* ============================================================================
   gerar-imagens.cjs — cria tudo o que esta em assets/img/ a partir das
   imagens originais guardadas em fotos-origem/.

   Quando rodar: sempre que trocar uma foto de origem (por exemplo, quando o
   cliente mandar as fotos reais da oficina).

     npm i --no-save sharp
     npm run imagens

   O que ele gera:
     - logo com fundo transparente (o arquivo original tem fundo branco)
     - favicons e icone do iPhone
     - cada foto em WebP e AVIF, em varias larguras (o navegador baixa so a que
       couber na tela)
     - a imagem de compartilhamento (og-pastri.jpg, 1200x630)

   Para TROCAR uma foto: salve a nova em fotos-origem/ com o mesmo nome e rode o
   script. Ele corta sozinho no formato certo (nao precisa a foto ja vir
   cortada). Se o assunto da foto nova estiver muito em cima ou muito embaixo,
   ajuste o "foco" dela na lista FOTOS abaixo.

   De onde veio cada imagem: veja fotos-origem/CREDITOS.txt
   ============================================================================ */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const RAIZ = path.resolve(__dirname, '..');
const ORIGEM = path.join(RAIZ, 'fotos-origem');
const DESTINO = path.join(RAIZ, 'assets/img');
const LOGO = path.join(ORIGEM, 'logo-pastri.webp');

/* amarelo da marca, medido no prototipo aprovado pelo cliente.
   O arquivo do logo veio num amarelo um pouco mais escuro (#e8a40a); aqui ele e
   redesenhado neste tom para ficar igual ao prototipo e ao resto do site. */
const AMARELO = { r: 0xf8, g: 0xc2, b: 0x04 };
const PRETO = '#0a0a0a';
const QUALIDADE = { webp: 80, avif: 52 };

/* Cada foto: de qual arquivo sai, em que proporcao (largura / altura) e em
   quais larguras.
     foco    — 0 corta pelo topo, 0,5 pelo meio, 1 pela base (so quando o
               assunto nao esta no centro)
     cinza   — 0 a 1: quanto de cor sobra (o prototipo e preto e branco)
     recorte — [esquerda, topo, largura, altura] em pixels, quando um pedaco
               exato da foto original precisa ser usado */
/* logos dos principais clientes, enviados pelo dono da Pastri.
   Cada arquivo vira um WebP de 140px de altura. "recorte" (em fracao da
   largura/altura: [esquerda, topo, largura, altura]) serve para os logos que
   vieram dentro de uma arte maior, com fundo colorido e texto extra. */
const CLIENTES = {
  'ksb':                { de: 'ksb.jpg' },
  'hmy':                { de: 'hmy.jpg' },
  'estamparia-itupeva': { de: 'estamparia-itupeva.jpg' },
  'rhino-maquinas':     { de: 'rhino-maquinas.jpg' },
  'lakatos':            { de: 'lakatos.jpg' },
  'plp':                { de: 'plp.jpg', recorte: [0.27, 0.17, 0.47, 0.49] }, // so a elipse: a arte original traz tambem a onda branca e o endereco do site
  'sicamet':            { de: 'sicamet.jpg' },
  'flowcast':           { de: 'flowcast.jpg' },
};

const ALTURA_LOGO = 140;

async function fazerClientes() {
  const destino = path.join(DESTINO, 'clientes');
  fs.mkdirSync(destino, { recursive: true });
  for (const [nome, cfg] of Object.entries(CLIENTES)) {
    const entrada = path.join(ORIGEM, 'clientes', cfg.de);
    if (!fs.existsSync(entrada)) throw new Error('falta o logo: ' + entrada);
    let img = sharp(entrada);
    if (cfg.recorte) {
      const m = await img.metadata();
      const [l, t, w, h] = cfg.recorte;
      img = sharp(entrada).extract({
        left: Math.round(m.width * l), top: Math.round(m.height * t),
        width: Math.round(m.width * w), height: Math.round(m.height * h),
      });
    }
    const arq = path.join(destino, nome + '.webp');
    await img.trim({ threshold: 12 })
      .resize({ height: ALTURA_LOGO, width: 520, fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' })
      .webp({ quality: 88 }).toFile(arq);
    gerados.push(arq);
  }
}

const FOTOS = {
  // 2,25 e a proporcao da area da hero no computador. Cortar ja nessa proporcao
  // evita o navegador cortar de novo por cima. Quase sem cor, como no prototipo.
  // A hero e os tres cards de "Nossos servicos" usam foto de banco de imagens
  // (Pexels), a pedido do cliente: ficam mais proximos do prototipo aprovado.
  // Todo o resto do site usa foto da propria Pastri.
  'hero-usinagem':      { de: 'hero-usinagem.jpg',      proporcao: 2.25,  larguras: [640, 900, 1200, 1500, 1900], foco: 0.5, cinza: 0.10 },

  // tres cards inclinados da secao "Nossos servicos"
  'card-tornearia':     { de: 'card-tornearia.jpg',     proporcao: 1.65,  larguras: [420, 640, 900], cinza: 0.55 },
  'card-fresamento':    { de: 'card-fresamento.jpg',    proporcao: 1.65,  larguras: [420, 640, 900], foco: 0.40, cinza: 0.55 },
  'card-manutencao':    { de: 'card-manutencao.webp',   proporcao: 1.65,  larguras: [420, 640, 900], cinza: 0.75 },

  // fundo da faixa escura do processo (vista geral da oficina)
  'oficina-vista':      { de: 'oficina-vista.webp',      proporcao: 2.2,   larguras: [800, 1200, 1600], foco: 0.5, cinza: 0.25 },

  // foto da frente da empresa, enviada pelo cliente: recorte fechado no muro com
  // o logo, no portao e na caminhonete (fora o ceu, a fiacao e a rua)
  'fachada-pastri':     { de: 'fachada-pastri.jpg',     proporcao: 1.875, larguras: [560, 900, 1200, 1500], recorte: [0, 600, 1500, 800] },

  // galeria de pecas e ferramentas feitas pela Pastri
  'projeto-eixos':          { de: 'projeto-eixos.webp',          proporcao: 4 / 3, larguras: [380, 560, 760] },
  'projeto-buchas':         { de: 'projeto-buchas.webp',         proporcao: 4 / 3, larguras: [380, 560, 760] },
  'projeto-anel':           { de: 'projeto-anel.webp',           proporcao: 4 / 3, larguras: [380, 560, 760] },
  'projeto-buchas-rosca':   { de: 'projeto-buchas-rosca.webp',   proporcao: 4 / 3, larguras: [380, 560, 760] },
  'projeto-dispositivo':    { de: 'projeto-dispositivo.webp',    proporcao: 4 / 3, larguras: [380, 560, 760] },
  'projeto-bicos':          { de: 'projeto-bicos.webp',          proporcao: 4 / 3, larguras: [380, 560, 760] },
  'projeto-molde':          { de: 'projeto-molde.webp',          proporcao: 4 / 3, larguras: [380, 560, 760], foco: 0.45 },
  'projeto-bucha-flangeada':{ de: 'projeto-bucha-flangeada.webp',proporcao: 4 / 3, larguras: [380, 560, 760] },
  // fotos enviadas depois pelo dono da Pastri, com a legenda de cada peca
  'projeto-estampo':           { de: 'projeto-estampo.webp',           proporcao: 4 / 3, larguras: [380, 560, 760], foco: 0.45 },
  'projeto-molde-injecao':     { de: 'projeto-molde-injecao.webp',     proporcao: 4 / 3, larguras: [380, 560, 760], foco: 0.42 },
  'projeto-buchas-bronze':     { de: 'projeto-buchas-bronze.webp',     proporcao: 4 / 3, larguras: [380, 560, 760] },
  'projeto-dispositivo-maquina':{de: 'projeto-dispositivo-maquina.webp',proporcao: 4 / 3, larguras: [380, 560, 760] },

  // maquinario: uma foto por maquina, listadas no portfolio do cliente
  'maq-orientools':         { de: 'maq-orientools.webp',         proporcao: 4 / 3, larguras: [320, 480, 640] },
  'maq-simco':              { de: 'maq-simco.webp',              proporcao: 4 / 3, larguras: [320, 480, 640] },
  'maq-diplomat':           { de: 'maq-diplomat.webp',           proporcao: 4 / 3, larguras: [320, 480, 640] },
  'maq-romi':               { de: 'maq-romi.webp',               proporcao: 4 / 3, larguras: [320, 480, 640] },
  'maq-itb200':             { de: 'maq-itb200.webp',             proporcao: 4 / 3, larguras: [320, 480, 640] },
  'maq-itbt500':            { de: 'maq-itbt500.webp',            proporcao: 4 / 3, larguras: [320, 480, 640] },
  'maq-retifica':           { de: 'maq-retifica.webp',           proporcao: 4 / 3, larguras: [320, 480, 640] },
  'maq-calvi':              { de: 'maq-calvi.webp',              proporcao: 4 / 3, larguras: [320, 480, 640] },
  'maq-fresa-ferramenteira':{ de: 'maq-fresa-ferramenteira.webp',proporcao: 4 / 3, larguras: [320, 480, 640] },
  'maq-rosqueadeira':       { de: 'maq-rosqueadeira.webp',       proporcao: 4 / 3, larguras: [320, 480, 640] },
};

fs.mkdirSync(DESTINO, { recursive: true });
const gerados = [];

async function salvarVariantes(nome, arquivo, cfg) {
  let entrada = path.join(ORIGEM, arquivo);
  const { proporcao, larguras, cinza } = cfg;
  let foco = cfg.foco;

  if (cfg.recorte) {
    const [left, top, width, height] = cfg.recorte;
    entrada = await sharp(entrada).extract({ left, top, width, height }).png().toBuffer();
  }

  // foco numerico (0 = topo, 0,5 = meio, 1 = base): corta na altura exata antes
  // de redimensionar. Util quando o assunto da foto nao esta no centro.
  if (typeof foco === 'number') {
    const m = await sharp(entrada).metadata();
    let w = m.width, h = Math.round(w / proporcao);
    if (h > m.height) { h = m.height; w = Math.round(h * proporcao); }
    const left = Math.round((m.width - w) / 2);
    const top = Math.max(0, Math.min(m.height - h, Math.round(m.height * foco - h / 2)));
    entrada = await sharp(entrada).extract({ left, top, width: w, height: h }).png().toBuffer();
    foco = 'centre';
  }

  for (const w of larguras) {
    const h = Math.round(w / proporcao);
    let img = sharp(entrada).resize({ width: w, height: h, fit: 'cover', position: foco || 'centre', kernel: 'lanczos3' });
    if (typeof cinza === 'number') img = img.modulate({ saturation: cinza });
    const buf = await img.png().toBuffer();
    for (const [fmt, quality] of Object.entries(QUALIDADE)) {
      const arq = path.join(DESTINO, `${nome}-${w}.${fmt}`);
      await sharp(buf)[fmt]({ quality }).toFile(arq);
      gerados.push(arq);
    }
  }
}

/* ---------------------------------------------------------------- logo ---- */
/* O arquivo do cliente e amarelo sobre fundo BRANCO. Aqui o branco vira
   transparencia: o canal azul serve de medida (o amarelo quase nao tem azul,
   o branco tem o maximo), entao a opacidade de cada pixel vira 255 - azul.
   As bordas suaves do desenho continuam suaves. */
async function fazerLogo() {
  const { data, info } = await sharp(LOGO).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;

  let x0 = W, y0 = H, x1 = 0, y1 = 0, maxA = 1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = 255 - data[(y * W + x) * C + 2];
      if (a > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (a > maxA) maxA = a;
    }
  }
  const lw = x1 - x0 + 1, lh = y1 - y0 + 1;
  const rgba = Buffer.alloc(lw * lh * 4);
  for (let y = 0; y < lh; y++) {
    for (let x = 0; x < lw; x++) {
      const o = (y * lw + x) * 4;
      const a = (255 - data[((y + y0) * W + (x + x0)) * C + 2]) * 255 / maxA;
      rgba[o] = AMARELO.r; rgba[o + 1] = AMARELO.g; rgba[o + 2] = AMARELO.b;
      rgba[o + 3] = Math.max(0, Math.min(255, Math.round(a)));
    }
  }
  const png = await sharp(rgba, { raw: { width: lw, height: lh, channels: 4 } }).png().toBuffer();
  console.log('logo recortado: ' + lw + 'x' + lh + ' (proporcao ' + (lw / lh).toFixed(3) + ')');

  for (const w of [200, 320, 460]) {
    const arq = path.join(DESTINO, `logo-pastri-${w}.webp`);
    await sharp(png).resize({ width: w }).webp({ quality: 92, alphaQuality: 100 }).toFile(arq);
    gerados.push(arq);
  }
  const cheio = path.join(DESTINO, 'logo-pastri.webp');
  await sharp(png).webp({ quality: 95, alphaQuality: 100 }).toFile(cheio);
  gerados.push(cheio);

  // favicons: logo amarelo sobre quadrado preto (le bem em aba clara e escura)
  for (const [arquivo, lado] of [['favicon-32.png', 32], ['favicon-64.png', 64], ['apple-touch-icon.png', 180]]) {
    const margem = Math.round(lado * 0.1);
    const marca = await sharp(png).resize({ width: lado - margem * 2, height: lado - margem * 2, fit: 'inside' }).toBuffer();
    const m = await sharp(marca).metadata();
    await sharp({ create: { width: lado, height: lado, channels: 4, background: PRETO } })
      .composite([{ input: marca, left: Math.round((lado - m.width) / 2), top: Math.round((lado - m.height) / 2) }])
      .png().toFile(path.join(DESTINO, arquivo));
    gerados.push(path.join(DESTINO, arquivo));
  }
  return { png, proporcao: lw / lh };
}

/* ------------------------------------------------- imagem de compartilhar -- */
async function fazerOg(logoPng) {
  const W = 1200, H = 630;
  const foto = await sharp(path.join(ORIGEM, FOTOS['hero-usinagem'].de))
    .resize({ width: W, height: H, fit: 'cover', position: 'centre', kernel: 'lanczos3' })
    .modulate({ saturation: 0.1 })
    .toBuffer();
  const am = '#f8c204';
  const veu = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
       <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
         <stop offset="0" stop-color="${PRETO}" stop-opacity="0.98"/>
         <stop offset="0.5" stop-color="${PRETO}" stop-opacity="0.92"/>
         <stop offset="1" stop-color="${PRETO}" stop-opacity="0.45"/>
       </linearGradient></defs>
       <rect width="${W}" height="${H}" fill="url(#g)"/>
       <rect x="72" y="252" width="56" height="5" fill="${am}"/>
       <path d="M1118 ${H} L1200 ${H} L1200 ${H - 150} Z" fill="${am}"/>
     </svg>`);
  const texto = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
       <style>
         .t{font-family:Arial,Helvetica,sans-serif;font-weight:800;fill:#ffffff}
         .b{font-family:Arial,Helvetica,sans-serif;font-weight:800;fill:${am}}
         .s{font-family:Arial,Helvetica,sans-serif;font-weight:600;fill:#d2d2d2}
         .k{font-family:Arial,Helvetica,sans-serif;font-weight:700;fill:#ffffff;letter-spacing:4px}
       </style>
       <text class="k" x="148" y="262" font-size="20">PASTRI USINAGEM</text>
       <text class="t" x="72" y="352" font-size="60">Soluções em</text>
       <text class="b" x="72" y="424" font-size="60">usinagem industrial.</text>
       <text class="s" x="72" y="486" font-size="26">Campo Limpo Paulista - SP</text>
     </svg>`);
  const marca = await sharp(logoPng).resize({ width: 250 }).toBuffer();
  const arq = path.join(DESTINO, 'og-pastri.jpg');
  await sharp(foto)
    .composite([{ input: veu }, { input: marca, left: 72, top: 64 }, { input: texto }])
    .jpeg({ quality: 86, mozjpeg: true }).toFile(arq);
  gerados.push(arq);
}

(async () => {
  for (const f of [LOGO, ...Object.values(FOTOS).map((x) => path.join(ORIGEM, x.de))]) {
    if (!fs.existsSync(f)) throw new Error('falta a imagem de origem: ' + f);
  }
  const { png } = await fazerLogo();

  for (const [nome, cfg] of Object.entries(FOTOS)) {
    await salvarVariantes(nome, cfg.de, cfg);
  }
  await fazerClientes();
  await fazerOg(png);

  let total = 0;
  for (const g of gerados) total += fs.statSync(g).size;
  console.log(gerados.length + ' arquivos gerados em assets/img/  (' + (total / 1024).toFixed(0) + ' kB no total)');
})();
