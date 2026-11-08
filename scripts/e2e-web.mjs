// End-to-end run of the web build in headless Chrome (v5 flow):
// nav order → intro → tutorial merge (drop ON a seed) → no merge when only placed beside →
// crate tutorial → merging crate seeds → workshop rock: break stage 1 (5 energy, 1 min) →
// first quest → level modal → journal collection reward → merchant panel → explore mode →
// energy for coins → reload (timers, coins and collection survive).
// Saves screenshots and fails on console errors.
// Usage: serve a web export (npx expo export -p web) and run:
//   E2E_URL=http://localhost:8099 node scripts/e2e-web.mjs e2e-out
//   (E2E_CHROME=/path/to/chrome to use an installed browser; E2E_W/E2E_H for the viewport)
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('playwright-core'));
}

const URL = process.env.E2E_URL ?? 'http://localhost:8081';
const OUT = process.argv[2] ?? 'e2e-out';
const W = Number(process.env.E2E_W ?? 390);
const H = Number(process.env.E2E_H ?? 844);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.E2E_CHROME || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, locale: process.env.E2E_LOCALE ?? 'tr-TR' });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});
page.on('requestfailed', (r) => errors.push(`request failed: ${r.url()} ${r.failure()?.errorText ?? ''}`));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;
const shot = async (name) => {
  n += 1;
  await page.screenshot({ path: join(OUT, `${String(n).padStart(2, '0')}-${name}.png`) });
};
const log = (...a) => console.log('[e2e]', ...a);
const visible = async (re) => page.getByText(re).first().isVisible().catch(() => false);
const tapText = async (re) => {
  const el = page.getByText(re).first();
  await el.waitFor({ timeout: 15000 });
  await el.click();
};
const tapLabel = async (re) => {
  const el = page.getByLabel(re).first();
  await el.waitFor({ timeout: 15000 });
  await el.click();
};
const finishDialogue = async () => {
  for (let i = 0; i < 10; i++) {
    if (!(await visible(/^Geç$|^Skip$/))) return;
    await page.mouse.click(W / 2, H * 0.25);
    await sleep(450);
  }
};
/** Reads the newest save slot (AsyncStorage on web = localStorage). */
const save = async () =>
  page.evaluate(() => {
    const slots = ['luma.save.a', 'luma.save.b'].map((k) => localStorage.getItem(k)).filter(Boolean).map((r) => JSON.parse(r));
    slots.sort((a, b) => b.seq - a.seq);
    return slots[0] ? JSON.parse(slots[0].data) : null;
  });
const expect = (cond, msg) => {
  if (!cond) throw new Error(`expectation failed: ${msg}`);
  log('ok:', msg);
};

await page.goto(URL);
// Navigation order (left → right) is checked once the shell is up (after the intro).
await page.getByText('Luma Valley').first().waitFor({ timeout: 90000 });
await sleep(1000);
await shot('intro');
for (let i = 0; i < 4; i++) {
  await page.mouse.click(W / 2, H * 0.45);
  await sleep(450);
}
await sleep(1200);
await finishDialogue();
await shot('board-start');

const board = page.getByLabel(/^Atölye$|^Workshop$/).first();
const bb = await board.boundingBox();
if (!bb) throw new Error('board not found');
const pad = 6;
const cell = (bb.width - pad * 2) / 7;
const cellXY = (i) => [bb.x + pad + cell * ((i % 7) + 0.5), bb.y + pad + cell * (Math.floor(i / 7) + 0.5)];
log('board', JSON.stringify(bb), 'cell', cell.toFixed(1));
const drag = async (from, to) => {
  const [fx, fy] = cellXY(from);
  const [tx, ty] = cellXY(to);
  await page.mouse.move(fx, fy);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) {
    await page.mouse.move(fx + ((tx - fx) * k) / 12, fy + ((ty - fy + cell * 0.25) * k) / 12);
    await sleep(20);
  }
  await page.mouse.up();
  await sleep(700);
};
/** A move that completes a group of three (from the saved board). */
const mergeMove = (b) => {
  const nb = (i) => [i - 7, (i % 7) < 6 ? i + 1 : -1, i + 7, (i % 7) > 0 ? i - 1 : -1].filter((x) => x >= 0 && x < 63);
  const group = (bd, s) => {
    const k = bd[s]?.k;
    if (!k) return 0;
    const seen = new Set([s]);
    const q = [s];
    while (q.length) for (const x of nb(q.pop())) if (!seen.has(x) && bd[x]?.t === 'i' && bd[x].k === k) { seen.add(x); q.push(x); }
    return seen.size;
  };
  // v5 rule: drop item a ONTO an identical item t that has another identical neighbour.
  for (let a = 0; a < 63; a++) {
    if (b[a].t !== 'i') continue;
    for (let t = 0; t < 63; t++) {
      if (t === a || b[t].t !== 'i' || b[t].k !== b[a].k) continue;
      const sim = b.slice();
      sim[a] = { t: 'e' };
      if (group(sim, t) >= 2) return [a, t];
    }
  }
  return null;
};

const tabs = async () => {
  const names = ['Atölye|Workshop', 'Vadi|Valley', 'Görevler|Quests', 'Defter|Journal', 'Pazar|Market'];
  const xs = [];
  for (const n of names) xs.push((await page.getByRole('tab', { name: new RegExp(`^(${n})$`) }).first().boundingBox()).x);
  return xs;
};
const xs = await tabs();
expect(xs.every((x, i) => i === 0 || x > xs[i - 1]), `bottom nav order Workshop, Valley, Quests, Journal, Market (${xs.map(Math.round).join(', ')})`);
let s0 = await save();
expect(s0.board.filter((c) => c.t === 'r').length === 4, 'four resource obstacles on the starting board, one cell each');

// 1. Placing the lone seed BESIDE the pair does not merge.
await drag(3 + 6 * 7, 4 + 4 * 7);
s0 = await save();
expect(s0.board.filter((c) => c.t === 'i' && c.k === 'flower:1').length === 3 && s0.stats.merges === 0, 'no automatic merge when placed beside');
// Dropping it ON one of the pair merges the three.
await drag(4 + 4 * 7, 3 + 4 * 7);
await sleep(500);
await shot('crate-tutorial');
expect(await visible(/bu kutuya dokun|Tap this crate/), 'crate hint appears right after the first merge');

// 2. The crate gives real items.
let s = await save();
const before = s.board.filter((c) => c.t === 'i').length;
await tapLabel(/^Tohum kutusu|^Seed crate/);
await sleep(700);
s = await save();
expect(s.board.filter((c) => c.t === 'i').length === before + 1, 'a crate tap puts a real item on the board');
await shot('crate-opened');
for (let i = 0; i < 5; i++) {
  await tapLabel(/^Tohum kutusu|^Seed crate/);
  await sleep(300);
}
await sleep(500);
s = await save();
const mv = mergeMove(s.board);
expect(!!mv, 'crate items can be merged');
await drag(mv[0], mv[1]);
await sleep(800);
await finishDialogue();
await sleep(600);
await shot('after-crate-merge');

// 2b. Workshop rock: tutorial points at it; break stage 1.
s = await save();
const rock = s.board.findIndex((c) => c.t === 'r' && c.r === 'stone');
const e0 = s.energy;
await page.mouse.click(...cellXY(rock));
await sleep(700);
await shot('rock-sheet');
await tapText(/^Kır · 5$|^Break · 5$/);
await sleep(600);
s = await save();
expect(s.board[rock].t === 'r' && s.board[rock].readyAt > 0 && s.energy === e0 - 5, 'rock break 1 costs exactly 5 energy and the rock stays on its cell');
expect(Math.abs(s.board[rock].readyAt - Date.now() - 60_000) < 5_000, 'stage 1 takes one minute');
await shot('rock-breaking');
await page.mouse.click(W / 2, 140);
await sleep(400);

// 3. Level modal from the top-left level badge.
await tapLabel(/^Seviye \d+|^Level \d+/);
await sleep(600);
await shot('level-modal');
expect(await visible(/XP/), 'level modal shows XP');
await tapText(/^Tamam$|^OK$/);
await sleep(400);

// 4. First quest → one restoration moment.
await tapLabel(/^Görevler$|^Quests$/);
await sleep(700);
await shot('quests');
await tapText(/^Tamamla$|^Complete$/);
await sleep(900);
await finishDialogue();
await sleep(600);
await shot('moment');
if (await visible(/^Harika$|^Wonderful$/)) await tapText(/^Harika$|^Wonderful$/);
await sleep(700);
await finishDialogue();

// 5. Journal: red dot, one-time collection rewards.
await tapLabel(/^Defter$|^Journal$/);
await sleep(700);
await shot('journal');
s = await save();
const coins0 = s.leaves;
const unclaimed = s.discovered.filter((k) => !k.startsWith('coin:') && !s.collected.includes(k)).length;
expect(unclaimed > 0, `there are ${unclaimed} unclaimed discoveries`);
await tapText(/^Hepsini topla$|^Collect all$/);
await sleep(800);
s = await save();
expect(s.leaves > coins0 && s.collected.length >= unclaimed, 'collect all pays coins once and marks items collected');
await shot('journal-collected');

// 6. Valley: story map.
await tapLabel(/^Vadi$|^Valley$/);
await sleep(2200);
await shot('map');

// 7. Workshop: merchant panel and explore mode.
await tapLabel(/^Atölye$|^Workshop$/);
await sleep(900);
await page.mouse.click(...cellXY(3 + 3 * 7));
await sleep(800);
await shot('merchant');
await page.mouse.click(W / 2, 140);
await sleep(500);
await tapLabel(/^Gezin$|^Explore$/);
await sleep(500);
await shot('explore');
await tapText(/^Bitti$|^Done$/);
await sleep(500);
// Energy is bought directly with coins.
await tapLabel(/^Enerji:|^Energy:/);
await sleep(600);
await shot('energy-modal');
s = await save();
await page.evaluate(() => 0);
if (s.energy < 100 && s.leaves >= 60) {
  const before = s;
  await tapLabel(/^60$/);
  await sleep(600);
  s = await save();
  expect(s.leaves === before.leaves - 60 && s.energy > before.energy, 'energy bought with 60 coins');
}
await page.mouse.click(W / 2, 100);
await sleep(400);

// 8. Reload: progress and claimed rewards survive; claims cannot repeat.
const beforeReload = await save();
await page.reload();
await page.getByLabel(/^Seviye \d+|^Level \d+/).first().waitFor({ timeout: 60000 });
await sleep(1500);
const after = await save();
expect(after.leaves === beforeReload.leaves && after.collected.length === beforeReload.collected.length, 'coins and collection survive a reload');
expect(after.board[rock]?.readyAt === beforeReload.board[rock]?.readyAt && after.board[rock]?.readyAt > 0, 'the running rock timer survives a reload');
expect(!JSON.stringify(after).includes('"tokens"') && !('sparks' in after), 'no Light Token or spark balance in the save');
await shot('reloaded');

await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
log('done, no console errors');
