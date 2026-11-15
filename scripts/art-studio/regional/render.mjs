import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [specFile, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const specs = JSON.parse(readFileSync(specFile, 'utf8'));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('console', m.text()); });
await page.goto('http://localhost:8096/studio.html');
await page.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
const meta = {}; let n = 0;
for (const [name, spec] of Object.entries(specs)) {
  try { const r = await page.evaluate((s) => window.renderSpec(s), spec); writeFileSync(`${out}/${name}.png`, Buffer.from(r.url.split(',')[1], 'base64')); meta[name] = { anchor: r.anchor, unitPx: r.unitPx }; n++; }
  catch (e) { console.error('FAIL', name, String(e).slice(0, 300)); }
}
await browser.close();
writeFileSync(`${out}/_meta.json`, JSON.stringify(meta));
console.log('rendered', n);
