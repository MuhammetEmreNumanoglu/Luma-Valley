// Journal (Defter) readability in light and dark theme: collection reward chips, locked
// silhouettes, hints and achievement stages. Screenshots only; contrast numbers are unit-tested
// (tests/ui-contrast.test.ts).
//   LUMA_WEB_URL=http://localhost:8099 node --import ./scripts/ts-register.mjs scripts/verify-v16-journal.mjs [outDir]
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
for (const theme of ['dark', 'light']) {
  const s = newGame(now, 42, -180);
  s.settings = { ...s.settings, lang: 'tr', music: false, sfx: false, uiTheme: theme };
  s.flags.introDone = true; s.flags.tutStarCoin = true; s.tutorial.skipped = true; s.quests.seen = QUESTS.map((q) => q.id);
  s.level = 9;
  for (const f of ['chicken', 'tomatoFarm', 'flower']) s.flags[`newFamilySeen:${f}`] = true;
  s.discovered.push('cow:1', 'cow:2', 'wheatFarm:1', 'wheatFarm:2', 'wheatFarm:3', 'wood:1', 'wood:2', 'wood:3', 'wood:4', 'wood:5', 'stone:1', 'chicken:1');
  s.collected.push('cow:1', 'wheatFarm:1', 'wood:1');
  s.stats.merges = 120;
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((raw) => { if (!sessionStorage.getItem('fx')) { localStorage.clear(); localStorage.setItem('luma.save.a', raw); sessionStorage.setItem('fx', '1'); } }, encode(s, 1, now));
  await page.goto(url);
  await page.getByRole('tab', { name: /^Defter/ }).first().waitFor({ timeout: 90000 });
  await page.getByRole('tab', { name: /^Defter/ }).first().click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/journal-collection-${theme}.png` });
  await page.mouse.wheel(0, 900); await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/journal-collection-wood-${theme}.png` });
  const ach = page.getByText(/^Başarı/).first();
  if (await ach.isVisible().catch(() => false)) { await ach.click(); await page.waitForTimeout(500); await page.screenshot({ path: `${out}/journal-achievements-${theme}.png` }); }
  assert.deepEqual(errors, []);
  await page.close();
}
await browser.close();
console.log('journal screenshots written to', out);
