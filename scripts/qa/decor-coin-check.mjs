// Star coin needs a second tap on "Collect"; shop corner icons; grain size; Mira's house colours.
import { createRequire } from 'node:module';
import { newGame } from '../../src/engine/state.ts';
import { encode } from '../../src/persistence/save.ts';
import { QUEST } from '../../src/content/quests.ts';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const out = process.argv[2] ?? 'e2e-out';
const now = Date.now(), s = newGame(now, 2, 0);
s.flags = { introDone: true, tutMerge: true, tutProduce: true, tutFive: true };
s.settings.lang = 'tr'; s.quests.seen = Object.keys(QUEST); s.tutorial.skipped = true;
const cells = s.board.map((c, i) => (c.t === 'e' ? i : -1)).filter((i) => i >= 0);
s.board[cells[3]] = { t: 'i', k: 'starCoin:1' };
s.board[cells[4]] = { t: 'i', k: 'grain:1' };
s.board[cells[5]] = { t: 'i', k: 'wheatFarm:1' };
s.harvestStock = { 'milk:1': 2, 'wheatCrop:1': 2 };
for (const q of ['r1_light', 'r1_garden1', 'r1_mira', 'r1_shrine', 'r1_cottage2', 'r1_cottage3']) s.quests.done.push(q);
s.structures.r1_cottage = 3; s.memories.push('r1_cottage');
const save = encode(s, 1, now);
const browser = await chromium.launch({ executablePath: process.env.E2E_CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'tr-TR' });
const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript((data) => { localStorage.clear(); localStorage.setItem('luma.save.a', data); }, save);
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:8099');
const board = page.locator('[aria-label="Atölye"]').filter({ has: page.locator('canvas') }).first();
await board.waitFor({ timeout: 90000 });
await page.waitForTimeout(1500);
const b = await board.boundingBox();
const cell = (b.width - 12) / 7;
const tap = (i) => page.mouse.click(b.x + 6 + cell * (i % 7 + 0.5), b.y + 6 + cell * (Math.floor(i / 7) + 0.5));
const tokens = async () => page.evaluate(() => { const sl = [localStorage.getItem('luma.save.a'), localStorage.getItem('luma.save.b')].filter(Boolean).map(JSON.parse).sort((a, b) => b.seq - a.seq); return JSON.parse(sl[0].data).starTokens; });
await tap(cells[3]); await page.waitForTimeout(900);
console.log('after one tap, star tokens =', await tokens());
await page.screenshot({ path: `${out}/coin-selected.png` });
// The Collect button sits above the coin (one row up, centred on the cell).
const ci = cells[3];
await page.mouse.click(b.x + 6 + cell * (ci % 7 + 0.5), b.y + 6 + cell * Math.floor(ci / 7) - 23); await page.waitForTimeout(900);
console.log('after Collect, star tokens =', await tokens());
await page.screenshot({ path: `${out}/board.png` });
await page.getByText(/^Vadi$/).first().click(); await page.waitForTimeout(1500);
await page.mouse.move(200, 250); await page.mouse.down(); for (let k = 1; k <= 10; k++) await page.mouse.move(200, 250 + k * 30); await page.mouse.up(); await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/map-scrolled.png` });
const cot = await page.evaluate(() => null);
void cot;
await page.screenshot({ path: `${out}/map.png` });
// Open Mira's house from the map and try every decoration colour.
await page.mouse.click(Number(process.env.HX ?? 120), Number(process.env.HY ?? 330));
await page.waitForTimeout(900);
for (let v = 1; v <= 3; v++) {
  const sw = page.getByLabel(new RegExp(`^Süsleme ${v + 1}$`));
  if (!(await sw.count())) { console.log('no swatch'); break; }
  await sw.click(); await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/decor-${v}.png` });
}
await page.getByText(/^Anıyı gör$/).click().catch(() => console.log('no memory button'));
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/memory.png` });
await browser.close();
console.log(errors.length ? errors.join('\n') : 'no errors');
