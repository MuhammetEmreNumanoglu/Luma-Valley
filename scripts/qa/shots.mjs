// QA screenshots from a prepared save: map (several scroll positions), board, quests, journal tabs,
// shop and a dialogue. Usage: node scripts/qa/shots.mjs URL SAVEFILE OUTDIR [W H LOCALE]
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/home/claude/.npm-global/lib/node_modules/playwright'); }
const [url, saveFile, out, Ws = '390', Hs = '844', locale = 'en-US'] = process.argv.slice(2);
const W = Number(Ws), H = Number(Hs);
mkdirSync(out, { recursive: true });
const save = readFileSync(saveFile, 'utf8');
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, locale, hasTouch: false });
await ctx.addInitScript((sv) => { if (!localStorage.getItem('qa.done')) { localStorage.setItem('luma.save.a', sv); localStorage.setItem('qa.done', '1'); } }, save);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;
const shot = async (name) => { if (!name.includes('dialogue')) await skipAll(); return page.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` }); };
const skipAll = async () => {
  for (let i = 0; i < 10; i++) {
    const skip = page.getByText(/^Geç$|^Skip$/).first();
    if (!(await skip.isVisible().catch(() => false))) return;
    await skip.click().catch(() => {});
    await sleep(500);
  }
};
const tap = async (re) => { await skipAll(); await page.getByText(re).first().click().catch(() => {}); await sleep(1200); await skipAll(); };
await page.goto(url);
await sleep(7000);
// one dialogue screenshot if a story quest introduces itself
if (await page.getByText(/^Geç$|^Skip$/).first().isVisible().catch(() => false)) await shot('dialogue');
await skipAll();
for (const ok of [/^Harika$|^Wonderful$/, /^Devam$|^Continue$/]) { const b = page.getByText(ok).first(); if (await b.isVisible().catch(() => false)) await b.click(); }
await tap(/^Vadi$|^Valley$/);
await sleep(2500);
await shot('map');
const drag = async (dy) => {
  await page.mouse.move(W / 2, H * 0.5);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) { await page.mouse.move(W / 2, H * 0.5 + (dy * k) / 12); await sleep(16); }
  await page.mouse.up();
  await sleep(1500);
};
for (let i = 0; i < 4; i++) { await drag(260); await shot(`map-up${i + 1}`); }
await tap(/^Atölye$|^Workshop$/); await sleep(800); await shot('board');
await tap(/^Görevler$|^Quests$/); await shot('quests');
await tap(/^Defter$|^Journal$/); await shot('journal');
await tap(/^Karakterler$|^Characters$/); await shot('characters');
await tap(/^Başarılar$|^Achievements$/); await shot('achievements');
await tap(/^Pazar$|^Market$/); await shot('shop');
await page.mouse.wheel(0, 800); await sleep(600); await shot('shop-2');
console.log(JSON.stringify({ shots: n, errors }));
await browser.close();
