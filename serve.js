/* Servidor local de desenvolvimento.
   node serve.js          -> serve o projeto como esta (porta 4173)
   node serve.js dist     -> serve a pasta gerada por "node build.js" (porta 4175), com Brotli/gzip e cache como na Vercel */
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, process.argv[2] || '.');
const PORT = Number(process.argv[3]) || Number(process.env.PORT) || (process.argv[2] ? 4175 : 4173);
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};
const COMPRIMIVEL = new Set(['.html', '.css', '.js', '.json', '.xml', '.txt', '.svg']);

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }

  const ext = path.extname(f).toLowerCase();
  const comHash = /\.[0-9a-f]{10}\./.test(path.basename(f));
  const cab = { 'Content-Type': TIPOS[ext] || 'application/octet-stream', 'Cache-Control': comHash ? 'public, max-age=31536000, immutable' : 'no-store' };
  const aceita = String(req.headers['accept-encoding'] || '');
  const leitura = fs.createReadStream(f);

  if (process.argv[2] && COMPRIMIVEL.has(ext) && /\bbr\b/.test(aceita)) {
    res.writeHead(200, { ...cab, 'Content-Encoding': 'br', Vary: 'Accept-Encoding' });
    leitura.pipe(zlib.createBrotliCompress()).pipe(res);
  } else if (process.argv[2] && COMPRIMIVEL.has(ext) && /\bgzip\b/.test(aceita)) {
    res.writeHead(200, { ...cab, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' });
    leitura.pipe(zlib.createGzip()).pipe(res);
  } else {
    res.writeHead(200, cab);
    leitura.pipe(res);
  }
}).listen(PORT, () => console.log('Pastri em http://localhost:' + PORT + '  (' + ROOT + ')'));
