// Items arriving on the workshop board in a real browser: one from storage, five at once (queued,
// each to its own cell), from the bag, from a crate, after zoom/pan in explore mode, the last free
// cell and a full board. Screenshots mid-flight and during the highlight.
//   LUMA_WEB_URL=http://localhost:8099 node --import ./scripts/ts-register.mjs scripts/verify-arrivals.mjs [outDir]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { newGame } from '../src/engine/state.ts';
import { encode, pickSlot } from '../src/persistence/save.ts';
import { QUESTS } from '../src/content/quests.ts';
import { isShopCell } from '../src/engine/workshopSlots.ts';

const out = process.argv[2] ?? 'e2e-out/arrivals';
mkdirSync(out, { recursive: true });
const { chromium } = createRequire(import.meta.url)('playwright-core');
const url = process.env.LUMA_WEB_URL ?? 'http://localhost:8099/';
const now = Date.now();
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
function fixture(fn) {
  const s = newGame(now, 42, -180);
  s.settings = { ...s.settings, lang: 'tr', music: false, sfx: false, reduceMotion: false };
  s.flags.introDone = true; s.flags.tutStarCoin = true; s.tutorial.skipped = true; s.quests.seen = QUESTS.map((q) => q.id);
  s.level = 6; for (const f of ['chicken', 'tomatoFarm']) s.flags[`newFamilySeen:${f}`] = true;
  fn(s); s.workshop.boards[0] = s.board; return s;
}
async function open(s, name) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((raw) => { if (!sessionStorage.getItem('fx')) { localStorage.clear(); localStorage.setItem('luma.save.a', raw); sessionStorage.setItem('fx', '1'); } }, encode(s, 1, now));
  await page.goto(url);
  await page.getByTestId('supply-button').waitFor({ timeout: 90000 });
  await page.waitForTimeout(800);
  page.errors = errors; page.name = name;
  return page;
}
const saved = (page) => page.evaluate(() => [localStorage.getItem('luma.save.a'), localStorage.getItem('luma.save.b')]).then(([a, b]) => pickSlot(a, b).state);
const report = {};

// 1 + 5 items from storage.
{
  const page = await open(fixture((s) => { s.rewardStorage = ['wood:1', 'wood:1', 'wood:1', 'cow:1', 'stone:1', 'wheatFarm:2']; }), 'storage');
  await page.getByRole('button', { name: 'Depo', exact: true }).click();
  await page.getByRole('button', { name: /Odun.*×3|×3/ }).first().click();
  await page.waitForTimeout(250); await page.screenshot({ path: `${out}/storage-one-flight.png` });
  await page.getByRole('button', { name: 'Tahtaya al' }).click();
  for (const ms of [150, 450, 900, 1600, 2600]) { await page.waitForTimeout(ms === 150 ? 150 : ms - [150, 450, 900, 1600, 2600][[150, 450, 900, 1600, 2600].indexOf(ms) - 1]); await page.screenshot({ path: `${out}/storage-five-${ms}.png` }); }
  await page.waitForTimeout(1500);
  const st = await saved(page);
  assert.equal(st.rewardStorage.length, 0);
  report.storage = st.board.filter((c) => c.t === 'i').length;
  assert.deepEqual(page.errors, []); await page.close();
}
// Bag and crate.
{
  const page = await open(fixture((s) => { s.inventory[0] = 'cow:2'; s.crate.charges = 5; }), 'bag');
  await page.getByRole('button', { name: /^Çanta 1$|^Bag 1$/ }).first().click().catch(async () => { await page.getByRole('button', { name: /Çanta/ }).nth(1).click(); });
  await page.waitForTimeout(250); await page.screenshot({ path: `${out}/bag-flight.png` });
  await page.waitForTimeout(700); await page.screenshot({ path: `${out}/bag-highlight.png` });
  const crate = page.getByRole('button', { name: /Tohum kutusu|kutu/i }).first();
  for (let i = 0; i < 4; i++) { await crate.click(); await page.waitForTimeout(60); }
  await page.waitForTimeout(300); await page.screenshot({ path: `${out}/crate-rapid.png` });
  await page.waitForTimeout(2500);
  const st = await saved(page);
  report.crates = 5 - st.crate.charges;
  assert.deepEqual(page.errors, []); await page.close();
}
// Last free cell, then a full board.
{
  const last = 30;
  const page = await open(fixture((s) => { s.board.forEach((c, i) => { if (i !== last && !isShopCell(i) && c.t !== 'x') s.board[i] = { t: 'i', k: 'stone:1' }; else if (i === last) s.board[i] = { t: 'e' }; }); s.rewardStorage = ['wood:1', 'wood:2']; }), 'last');
  await page.getByRole('button', { name: 'Depo', exact: true }).click();
  await page.getByRole('button', { name: 'Tahtaya al' }).click();
  await page.waitForTimeout(500); await page.screenshot({ path: `${out}/last-cell.png` });
  await page.waitForTimeout(1600);
  const st = await saved(page);
  assert.equal(st.board[last].k, 'wood:1'); assert.deepEqual(st.rewardStorage, ['wood:2']);
  report.lastCell = last;
  assert.deepEqual(page.errors, []); await page.close();
}
// After zoom and pan (explore mode): the camera glides back to the arriving cell.
{
  const page = await open(fixture((s) => { s.rewardStorage = ['wood:1']; }), 'zoom');
  await page.getByRole('button', { name: /Gezin|Explore/ }).first().click();
  await page.waitForTimeout(300);
  const board = await page.getByLabel(/^Atölye$/).first().boundingBox();
  await page.mouse.move(board.x + board.width * 0.5, board.y + board.height * 0.5);
  await page.mouse.down(); await page.mouse.move(board.x + board.width * 0.5 + 160, board.y + board.height * 0.5 + 200, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(300); await page.screenshot({ path: `${out}/zoom-before.png` });
  await page.getByRole('button', { name: 'Depo', exact: true }).click();
  await page.getByRole('button', { name: 'Tahtaya al' }).click();
  await page.waitForTimeout(700); await page.screenshot({ path: `${out}/zoom-arrival.png` });
  await page.waitForTimeout(1500);
  assert.deepEqual(page.errors, []); await page.close();
}
await browser.close();
console.log(JSON.stringify(report));
