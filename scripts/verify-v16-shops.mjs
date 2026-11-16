// Shop badges on the workshop board (ready gear, hourglass, check, none) in light and dark theme.
//   LUMA_WEB_URL=http://localhost:8099 node --import ./scripts/ts-register.mjs scripts/verify-v16-shops.mjs [outDir]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { newGame } from '../src/engine/state.ts';
import { encode } from '../src/persistence/save.ts';
import { QUESTS } from '../src/content/quests.ts';
import { FARM_RECIPES } from '../src/content/farm.ts';

const out = process.argv[2] ?? 'e2e-out/v16';
mkdirSync(out, { recursive: true });
const { chromium } = createRequire(import.meta.url)('playwright-core');
const url = process.env.LUMA_WEB_URL ?? 'http://localhost:8099/';
const now = Date.now();
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
for (const theme of ['light', 'dark']) {
  const s = newGame(now, 42, -180);
  s.settings = { ...s.settings, lang: 'tr', music: false, sfx: false, uiTheme: theme };
  s.flags.introDone = true; s.flags.tutStarCoin = true; s.tutorial.skipped = true; s.quests.seen = QUESTS.map((q) => q.id);
  s.level = 9;
  for (const f of ['chicken', 'tomatoFarm', 'flower']) s.flags[`newFamilySeen:${f}`] = true;
  s.shopUnlocks[1].opened = true; s.shopUnlocks[2].opened = true; s.shopUnlocks[3].opened = true;
  const r = FARM_RECIPES.grocer[1];
  s.harvestStock = Object.fromEntries(r.inputs.map((x) => [x.item, x.count]));
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((raw) => { if (!sessionStorage.getItem('fx')) { localStorage.clear(); localStorage.setItem('luma.save.a', raw); sessionStorage.setItem('fx', '1'); } }, encode(s, 1, now));
  await page.goto(url);
  await page.getByTestId('supply-button').waitFor({ timeout: 90000 });
  await page.waitForTimeout(1200);
  const ready = page.getByLabel(/hazır, üretimi başlat/).first();
  assert.ok(await ready.isVisible(), 'a ready shop is announced');
  await page.screenshot({ path: `${out}/shops-${theme}.png` });
  assert.deepEqual(errors, []);
  await page.close();
}
await browser.close();
console.log('shop screenshots written to', out);
