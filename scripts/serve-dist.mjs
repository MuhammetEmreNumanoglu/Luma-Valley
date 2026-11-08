// Minimal static server for the web export (E2E runs). Node handles the ~400 parallel sprite
// requests of the art preload without the connection resets of `python -m http.server`.
// Usage: node scripts/serve-dist.mjs [dir=dist] [port=8099]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const dir = process.argv[2] ?? 'dist';
const port = Number(process.argv[3] ?? 8099);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.css': 'text/css' };
createServer(async (req, res) => {
  const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  for (const p of [join(dir, path), join(dir, path, 'index.html'), join(dir, 'index.html')]) {
    try {
      const body = await readFile(p);
      res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' });
      res.end(body);
      return;
    } catch {}
  }
  res.writeHead(404).end();
}).listen(port, () => console.log(`serving ${dir} on http://localhost:${port}`));
