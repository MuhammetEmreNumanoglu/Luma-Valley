// Light Paths result card in a real browser: opens once after the solve, stars fill one by one
// (~0.5 s) and the card then stays still; later taps neither re-open nor re-reward.
//   LUMA_WEB_URL=http://localhost:8099 node --import ./scripts/ts-register.mjs scripts/verify-v16-puzzle.mjs [outDir]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { newGame } from '../src/engine/state.ts';
import { encode } from '../src/persistence/save.ts';
import { QUESTS } from '../src/content/quests.ts';
import { nextTrailPuzzle } from '../src/engine/quests.ts';
import { getPuzzle } from '../src/puzzles/levels.ts';
import { canRotate } from '../src/puzzles/lightpaths.ts';

const out = process.argv[2] ?? 'e2e-out/v16';
mkdirSync(out, { recursive: true });
const { chromium } = createRequire(import.meta.url)('playwright-core');
const url = process.env.LUMA_WEB_URL ?? 'http://localhost:8099/';
const now = Date.now();
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
for (const theme of ['dark']) {
  const s = newGame(now, 42, -180);
  s.settings = { ...s.settings, lang: 'tr', music: false, sfx: false, uiTheme: theme };
  s.flags.introDone = true; s.flags.tutStarCoin = true; s.tutorial.skipped = true; s.quests.seen = QUESTS.map((q) => q.id);
  s.level = 6;
  for (const f of ['chicken', 'tomatoFarm']) s.flags[`newFamilySeen:${f}`] = true;
  const id = nextTrailPuzzle(s);
  assert.ok(id, 'a trail puzzle is open');
  const p = getPuzzle(id);
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((raw) => { if (!sessionStorage.getItem('fx')) { localStorage.clear(); localStorage.setItem('luma.save.a', raw); sessionStorage.setItem('fx', '1'); } }, encode(s, 1, now));
  await page.goto(url);
  await page.getByRole('tab', { name: /^Görevler/ }).first().waitFor({ timeout: 90000 });
  await page.getByRole('tab', { name: /^Görevler/ }).first().click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Çöz' }).first().click();
  const title = `Işık Yolları — Level ${Number(id.slice(2))}`;
  const board = await page.getByLabel(title).last();
  await board.waitFor();
  await page.waitForTimeout(400);
  const box = await board.boundingBox();
  const cell = box.width / p.w;
  const taps = [];
  p.tiles.forEach((t, i) => { if (canRotate(t)) for (let k = 0; k < ((p.solution[i] - t.rot + 4) & 3); k++) taps.push(i); });
  for (const i of taps) {
    await page.mouse.click(box.x + ((i % p.w) + 0.5) * cell, box.y + (Math.floor(i / p.w) + 0.5) * cell);
    await page.waitForTimeout(260);
  }
  const solved = page.getByText('Işık ulaştı!');
  await solved.waitFor({ timeout: 4000 });
  const shots = [];
  for (const ms of [0, 150, 300, 700, 1500, 2500]) {
    await page.waitForTimeout(ms - (shots.at(-1)?.ms ?? 0));
    const path = `${out}/puzzle-done-${ms}.png`;
    await page.screenshot({ path });
    const cardBox = await page.getByRole('button', { name: 'Devam' }).boundingBox();
    shots.push({ ms, y: Math.round(cardBox.y), h: Math.round(cardBox.height) });
  }
  // Still after the stars: the card does not move between 0.7 s and 2.5 s.
  const late = shots.filter((x) => x.ms >= 700);
  assert.ok(late.every((x) => x.y === late[0].y), `card moved ${JSON.stringify(shots)}`);
  // Taps on the board behind the card do nothing; the card exists once.
  await page.mouse.click(box.x + cell / 2, box.y + cell / 2);
  await page.waitForTimeout(400);
  assert.equal(await page.getByText('Işık ulaştı!').count(), 1);
  console.log(JSON.stringify({ id, taps: taps.length, shots }));
  assert.deepEqual(errors, []);
  await page.close();
}
await browser.close();
