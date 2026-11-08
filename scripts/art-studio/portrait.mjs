// usage: node render.mjs specs.json outDir
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
const [specFile, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const specs = JSON.parse(readFileSync(specFile, 'utf8'));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('console', m.text()); });
await page.goto('http://localhost:8095/portrait.html');
await page.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
let n = 0;
const meta = {};
for (const [name, spec] of Object.entries(specs)) {
  try {
    const r = await page.evaluate((s) => window.renderPortrait(s), spec);
    writeFileSync(`${out}/${name}.png`, Buffer.from(r.url.split(',')[1], 'base64'));
    meta[name] = { eyes: r.eyes, blocks: r.blocks };
    n++;
  } catch (e) { console.error('FAIL', name, String(e).slice(0, 200)); }
}
await browser.close();
writeFileSync(`${out}/_meta.json`, JSON.stringify(meta));
console.log('rendered', n);
