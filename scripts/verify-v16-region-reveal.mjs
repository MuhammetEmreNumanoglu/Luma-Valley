// Region opening in a real browser: a freshly opened region glides into view once, clouds part,
// the name and intro line appear, Skip ends it, and a reload does not replay it. Also shots of
// region identity under a cosmetic theme.
//   LUMA_WEB_URL=http://localhost:8099 node --import ./scripts/ts-register.mjs scripts/verify-v16-region-reveal.mjs [outDir]
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
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
function fixture(theme, regions, flagged) {
  const s = newGame(now, 42, -180);
  s.settings = { ...s.settings, lang: 'tr', music: false, sfx: false, uiTheme: 'light' };
  s.flags.introDone = true; s.flags.tutStarCoin = true; s.tutorial.skipped = true; s.quests.seen = QUESTS.map((q) => q.id);
  s.tutorial.done.push('crateMerge', 'valley', 'quest');
  s.level = 9; s.regions = regions;
  for (const f of ['chicken', 'tomatoFarm', 'flower']) s.flags[`newFamilySeen:${f}`] = true;
  for (const n of flagged) s.flags[`regionIntro:${n}`] = true;
  if (theme) { s.themes.owned.push(theme); s.themes.active = theme; }
  return s;
}
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript((raw) => { if (!sessionStorage.getItem('fx')) { localStorage.clear(); localStorage.setItem('luma.save.a', raw); sessionStorage.setItem('fx', '1'); } }, encode(fixture(null, [1, 2], []), 1, now));
await page.goto(url);
const skip = page.getByRole('button', { name: 'Geç' });
await skip.waitFor({ timeout: 90000 });
await page.screenshot({ path: `${out}/region-reveal-0.png` });
await page.waitForTimeout(700); await page.screenshot({ path: `${out}/region-reveal-700.png` });
await page.waitForTimeout(900); await page.screenshot({ path: `${out}/region-reveal-1600.png` });
assert.ok(await page.getByText('Değirmenin kanatları rüzgârı bekliyor.').isVisible(), 'intro line');
await skip.click();
await page.waitForTimeout(600);
assert.equal(await page.getByText('Değirmenin kanatları rüzgârı bekliyor.').count(), 0, 'closed');
await page.waitForTimeout(1500); // autosave
await page.reload();
await page.getByRole('tab', { name: /^Vadi/ }).first().waitFor({ timeout: 90000 });
await page.waitForTimeout(1500);
assert.equal(await page.getByRole('button', { name: 'Geç' }).count(), 0, 'not replayed after reload');
await page.close();
// Identity under cosmetic themes: region 4 (boardwalk) and 6 (festival paving) in winter and autumn.
for (const theme of ['winter', 'autumn', null]) {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => errors.push(e.message));
  await p.addInitScript((raw) => { if (!sessionStorage.getItem('fx')) { localStorage.clear(); localStorage.setItem('luma.save.a', raw); sessionStorage.setItem('fx', '1'); } }, encode(fixture(theme, [1, 2, 3, 4], [2, 3, 4]), 1, now));
  await p.goto(url);
  await p.getByRole('tab', { name: /^Vadi/ }).first().waitFor({ timeout: 90000 });
  await p.getByRole('tab', { name: /^Vadi/ }).first().click();
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/region-theme-${theme ?? 'classic'}.png` });
  await p.close();
}
assert.deepEqual(errors, []);
await browser.close();
console.log('region reveal ok');
