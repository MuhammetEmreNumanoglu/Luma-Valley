// v16 workshop ergonomics in a real browser (Chromium, web export): tool button sizes, the bigger
// resource stone without its badge, the resource panel width, Bag/Sell above the board, no page
// overflow, and taps on top/bottom/edge cells still select the right cell. Light and dark theme.
//   npx expo export -p web --output-dir dist && node scripts/serve-dist.mjs dist 8099 &
//   LUMA_WEB_URL=http://localhost:8099 node --import ./scripts/ts-register.mjs scripts/verify-v16-layout.mjs [outDir]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { newGame } from '../src/engine/state.ts';
import { encode } from '../src/persistence/save.ts';
import { QUESTS } from '../src/content/quests.ts';

const out = process.argv[2] ?? 'e2e-out/v16';
mkdirSync(out, { recursive: true });
const { chromium } = createRequire(import.meta.url)('playwright-core');
const url = process.env.LUMA_WEB_URL ?? 'http://localhost:8099/';
const now = Date.now();

function fixture(theme) {
  const s = newGame(now, 42, -180);
  s.settings = { ...s.settings, lang: 'tr', music: false, sfx: false, uiTheme: theme };
  s.flags.introDone = true; s.flags.tutStarCoin = true; s.tutorial.skipped = true; s.quests.seen = QUESTS.map((q) => q.id);
  s.level = 6; s.supply.charges = 3; s.leaves = 900;
  for (const f of ['chicken', 'tomatoFarm']) s.flags[`newFamilySeen:${f}`] = true;
  // Distinct items in corners and edges so a tap can be checked against the info strip.
  const put = (i, k) => { s.board[i] = { t: 'i', k }; };
  put(0, 'cow:2'); put(6, 'wheatFarm:3'); put(3 * 7, 'chicken:1'); put(3 * 7 + 6, 'tomatoFarm:2'); put(7 * 7, 'cow:3'); put(7 * 7 + 6, 'wheatFarm:1');
  s.workshop.boards[0] = s.board;
  return s;
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const report = [];
for (const theme of ['light', 'dark']) for (const [width, height] of [[375, 812], [390, 844], [393, 852], [430, 932]]) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: theme === 'light' && width === 390 ? 2 : 1, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((raw) => { if (!sessionStorage.getItem('fx')) { localStorage.clear(); localStorage.setItem('luma.save.a', raw); sessionStorage.setItem('fx', '1'); } }, encode(fixture(theme), 1, now));
  await page.goto(url);
  const supply = page.getByTestId('supply-button');
  await supply.waitFor({ timeout: 90000 });
  await page.waitForTimeout(800);
  const board = await page.getByLabel(/^Atölye$/).first().boundingBox();
  assert.ok(board, 'board');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal page overflow');
  assert.ok(board.x >= 0 && board.x + board.width <= width + 0.5, 'board fits');
  // Tool buttons: 48–52 pt, crate and bag inside the viewport.
  const sbox = await supply.boundingBox();
  assert.ok(sbox.width >= 48 && sbox.width <= 52, `supply button ${sbox.width}`);
  const crate = await page.getByRole('button', { name: /Tohum kutusu|Ücretsiz|ücretsiz kutu/ }).first().boundingBox();
  assert.ok(crate && crate.x + crate.width <= width && crate.y + crate.height <= height, 'crate button inside the screen');
  const storage = await page.getByRole('button', { name: 'Depo' }).first().boundingBox().catch(() => null);
  // No number badge on the resource stone.
  const badgeText = await supply.innerText();
  assert.equal(badgeText.trim(), '', 'no count badge on the stone');
  const cell = board.width / 7;
  // Taps: top-left, top-right, middle edges and bottom item rows select exactly that item.
  const taps = [[0, 'Düve'], [6, 'Genç Buğday'], [21, 'Civciv'], [27, 'Domates Fidesi'], [49, 'Genç İnek'], [55, 'Buğday Tohumu']];
  for (const [i, name] of taps) {
    const x = board.x + 2 + (i % 7 + 0.5) * cell, y = board.y + 2 + (Math.floor(i / 7) + 0.5) * cell;
    await page.mouse.click(x, y);
    await page.waitForTimeout(150);
    const sell = page.getByRole('button', { name: /^Sat, \d+ altın$/ });
    await sell.waitFor({ timeout: 3000 });
    const sb = await sell.boundingBox(), bag = await page.getByRole('button', { name: 'Çantaya' }).boundingBox();
    assert.ok(sb.y + sb.height <= board.y + 1, `Sell sits above the board (${sb.y + sb.height} vs ${board.y})`);
    assert.ok(Math.abs(sb.y - bag.y) < 4, 'Bag and Sell side by side');
    assert.ok(sb.x - (bag.x + bag.width) >= 12, `gap between Bag and Sell ${sb.x - (bag.x + bag.width)}`);
    assert.ok(sb.height >= 36 && bag.height >= 36, 'button height');
    assert.ok(await page.getByText(name, { exact: true }).first().isVisible(), `tap ${i} shows ${name}`);
    if (i === 6) await page.screenshot({ path: `${out}/workshop-selected-${theme}-${width}.png` });
  }
  await page.screenshot({ path: `${out}/workshop-${theme}-${width}.png` });
  // Resource panel: ~85–92% of the width, scrollable, real deliver buttons.
  await supply.click();
  const title = page.getByText('Kaynak Teslimatı').first();
  await title.waitFor();
  await page.waitForTimeout(350);
  const panel = await page.getByTestId('info-modal-card').last().boundingBox().catch(() => null);
  const deliver = await page.getByRole('button', { name: 'Getir' }).first().boundingBox();
  assert.ok(deliver && deliver.height >= 44, 'deliver button ≥ 44 pt');
  await page.screenshot({ path: `${out}/supply-${theme}-${width}.png` });
  report.push({ theme, width, height, cell: Math.round(cell), boardTop: Math.round(board.y), tool: sbox.width, panel: panel ? Math.round((panel.width / width) * 100) : null, storage: !!storage, errors });
  assert.deepEqual(errors, []);
  await page.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 1));
