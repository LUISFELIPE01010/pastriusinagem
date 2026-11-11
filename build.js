#!/usr/bin/env node
/* ============================================================================
   build.js — gera a pasta dist/ que a Vercel publica (site da Pastri Usinagem).

   O que faz:
     1. CSS critico: pega as secoes do styles.css que aparecem na primeira tela
        (1-7 e 19), minifica e coloca DENTRO do HTML. O resto do CSS (secoes 8+)
        vira assets/css/rest.css e carrega sem bloquear a primeira renderizacao.
     2. Cache busting: todo arquivo de assets/ ganha um hash do conteudo no nome
        (hero-usinagem-640.a1b2c3d4e5.webp) e o HTML passa a apontar para ele.
        Por isso a Vercel pode guardar tudo por 1 ano (immutable): se a foto
        mudar, o nome muda.
     3. Copia robots.txt, sitemap.xml e llms.txt.
     4. Confere o JSON-LD e avisa se o FAQ do schema nao bate com o FAQ visivel.

   Os arquivos-fonte (index.html, assets/...) continuam editaveis normalmente.
   Nada aqui precisa ser instalado: so Node.

   Variavel opcional:
     SITE_URL=https://www.seudominio.com.br  -> troca o dominio de exemplo no
     canonical, og:image, schema, sitemap, robots e llms.txt.
   ============================================================================ */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');
const PLACEHOLDER = 'https://www.pastriusinagem.com.br';
const SITE = (process.env.SITE_URL || '').trim().replace(/\/+$/, '') || PLACEHOLDER;
const SECOES_CRITICAS = new Set([1, 2, 3, 4, 5, 6, 7, 17]);
const avisos = [];

const lerTexto = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const hash = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);
const kb = (n) => (n / 1024).toFixed(1) + ' kB';

function listar(dirRel) {
  const dir = path.join(ROOT, dirRel);
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = dirRel + '/' + e.name;
    if (e.isDirectory()) out.push(...listar(rel)); else out.push(rel);
  }
  return out;
}

/* ------------------------------------------------------------------ CSS ------------------------------------------------------------------ */
function separarCss(src) {
  const re = /\/\* -{10} (\d+)\. [^*]*\*\/\n/g;
  const marcas = [];
  let m;
  while ((m = re.exec(src))) marcas.push({ n: Number(m[1]), ini: m.index });
  if (!marcas.length) throw new Error('styles.css: nenhuma secao numerada ("/* ---------- N. Titulo ---------- */") encontrada');
  let critico = '', resto = '';
  marcas.forEach((mk, i) => {
    const fim = i + 1 < marcas.length ? marcas[i + 1].ini : src.length;
    const trecho = src.slice(mk.ini, fim);
    if (SECOES_CRITICAS.has(mk.n)) critico += trecho; else resto += trecho;
  });
  return { critico, resto };
}

// minificador conservador: tira comentarios e espacos; nao mexe em espacos dentro de calc() nem antes de ":"
function minificarCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

/* ---------------------------------------------------------------- montagem ---------------------------------------------------------------- */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const { critico, resto } = separarCss(lerTexto('assets/css/styles.css'));
const criticoMin = minificarCss(critico).split('../fonts/').join('assets/fonts/');
const restoMin = minificarCss(resto);
if (/url\(/.test(restoMin)) avisos.push('rest.css tem url(...): caminhos relativos podem quebrar depois do hash.');

// arquivos de assets (menos o CSS-fonte, que e substituido por rest.css, e a licenca da fonte)
const conteudos = new Map(); // caminho original -> Buffer
for (const rel of listar('assets')) {
  if (rel === 'assets/css/styles.css' || rel.endsWith('LICENSE.txt')) continue;
  conteudos.set(rel, fs.readFileSync(path.join(ROOT, rel)));
}
conteudos.set('assets/css/rest.css', Buffer.from(restoMin, 'utf8'));

const mapa = new Map(); // original -> com hash
for (const [rel, buf] of conteudos) {
  const ext = path.posix.extname(rel);
  mapa.set(rel, rel.slice(0, -ext.length) + '.' + hash(buf) + ext);
}
const naoEncontrados = new Set();
const reescrever = (texto) => texto.replace(/assets\/[A-Za-z0-9_\-./]+?\.(?:webp|avif|png|jpe?g|svg|woff2|css|js)(?![A-Za-z0-9_\-])/g, (m) => {
  if (mapa.has(m)) return mapa.get(m);
  naoEncontrados.add(m);
  return m;
});

for (const [rel, buf] of conteudos) {
  const destino = path.join(OUT, mapa.get(rel));
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, buf);
}
fs.mkdirSync(path.join(OUT, 'assets/fonts'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'assets/fonts/LICENSE.txt'), path.join(OUT, 'assets/fonts/LICENSE.txt'));

// HTML: CSS critico inline + resto assincrono
let html = lerTexto('index.html');
const linkOriginal = '<link rel="stylesheet" href="assets/css/styles.css">';
if (html.split(linkOriginal).length !== 2) throw new Error('index.html: o <link> do styles.css nao foi encontrado exatamente uma vez');
html = html.replace(linkOriginal, () =>
  '<style>' + criticoMin + '</style>\n' +
  '<link rel="preload" href="assets/css/rest.css" as="style" onload="this.onload=null;this.rel=\'stylesheet\'">\n' +
  '<noscript><link rel="stylesheet" href="assets/css/rest.css"></noscript>');
html = reescrever(html);
// JSON-LD compacto (no fonte fica indentado para leitura; no dist so importa o conteudo)
html = html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (todo, a, json, c) => {
  try { return a + JSON.stringify(JSON.parse(json)) + c; } catch (e) { return todo; }
});

/* ------------------------------------------------- dominio (SITE_URL) e arquivos de texto ------------------------------------------------- */
const trocaDominio = (t) => (SITE === PLACEHOLDER ? t : t.split(PLACEHOLDER).join(SITE));
html = trocaDominio(html);
fs.writeFileSync(path.join(OUT, 'index.html'), html);
for (const f of ['robots.txt', 'sitemap.xml', 'llms.txt', '404.html']) {
  // reescrever(): o sitemap cita a imagem com o nome ja com hash (senao daria 404)
  if (fs.existsSync(path.join(ROOT, f))) fs.writeFileSync(path.join(OUT, f), trocaDominio(reescrever(lerTexto(f))));
  else avisos.push(f + ' nao existe na raiz do projeto');
}

/* --------------------------------------------------------- conferencias (so avisam, nao travam) --------------------------------------------------------- */
const decodificar = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
try {
  const blocos = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((b) => JSON.parse(b[1]));
  const grafo = blocos.flatMap((b) => b['@graph'] || [b]);
  const faqLd = grafo.find((n) => n['@type'] === 'FAQPage');
  const faqHtml = [...html.matchAll(/<details class="faq__item"[^>]*>\s*<summary><h3>([\s\S]*?)<\/h3><\/summary>\s*<div class="faq__a">([\s\S]*?)<\/div>\s*<\/details>/g)]
    .map((d) => ({ q: decodificar(d[1]), a: decodificar([...d[2].matchAll(/<p>([\s\S]*?)<\/p>/g)].map((p) => p[1]).join(' ')) }));
  if (!faqLd) avisos.push('JSON-LD: FAQPage nao encontrado');
  else {
    const ld = faqLd.mainEntity.map((e) => ({ q: decodificar(e.name), a: decodificar(e.acceptedAnswer.text) }));
    if (ld.length !== faqHtml.length) avisos.push('FAQ: o schema tem ' + ld.length + ' perguntas e a pagina mostra ' + faqHtml.length);
    ld.forEach((e, i) => { if (faqHtml[i] && (faqHtml[i].q !== e.q || faqHtml[i].a !== e.a)) avisos.push('FAQ #' + (i + 1) + ': o texto do schema difere do texto visivel'); });
  }
  const tipos = grafo.map((n) => [].concat(n['@type']).join('+'));
  for (const t of ['Organization', 'LocalBusiness', 'FAQPage']) if (!tipos.includes(t)) avisos.push('JSON-LD: falta ' + t);
  if (tipos.filter((t) => t === 'Service').length !== 6) avisos.push('JSON-LD: esperados 6 Service, achei ' + tipos.filter((t) => t === 'Service').length);
} catch (e) {
  avisos.push('JSON-LD invalido: ' + e.message);
}
if (naoEncontrados.size) avisos.push('referencias a arquivos que nao existem em assets/: ' + [...naoEncontrados].join(', '));

/* --------------------------------------------------------------- relatorio --------------------------------------------------------------- */
console.log('build ok -> dist/');
console.log('  dominio no HTML ........ ' + SITE + (SITE === PLACEHOLDER ? '  (padrao: defina SITE_URL para trocar)' : ''));
console.log('  CSS critico (inline) ... ' + kb(Buffer.byteLength(criticoMin)) + '   | CSS restante: ' + kb(restoMin.length));
console.log('  HTML ................... ' + kb(Buffer.byteLength(html)));
console.log('  arquivos com hash ...... ' + mapa.size);
for (const a of avisos) console.warn('  AVISO: ' + a);
