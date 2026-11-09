// Workshop areas as one column built upward: explore mode, scroll up from the home area.
import { createRequire } from 'node:module';
import { newGame } from '../../src/engine/state.ts';
import { encode } from '../../src/persistence/save.ts';
import { QUEST } from '../../src/content/quests.ts';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const out = process.argv[2] ?? 'e2e-out';
const now = Date.now(), s = newGame(now, 2, 0);
s.flags = { introDone: true, tutMerge: true, tutProduce: true, tutFive: true, tutStarCoin: true };
s.settings.lang = 'tr'; s.quests.seen = Object.keys(QUEST); s.tutorial.skipped = true;
s.workshop.unlocked = [0, 1];
s.workshop.boards[1] = s.board.map((c, i) => (i % 3 === 0 ? { t: 'i', k: 'cow:2' } : { t: 'e' }));
s.leaves = 500; s.starTokens = 20;
const save = encode(s, 1, now);
const browser = await chromium.launch({ executablePath: process.env.E2E_CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'tr-TR' });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript((data) => { localStorage.clear(); localStorage.setItem('luma.save.a', data); }, save);
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:8099');
const board = page.locator('[aria-label="Atölye"]').filter({ has: page.locator('canvas') }).first();
await board.waitFor({ timeout: 90000 });
await page.waitForTimeout(1200);
await page.getByLabel(/Gezin/).first().click();
await page.waitForTimeout(500);
const b = await board.boundingBox();
// Drag down to look at the areas above the home one.
for (const shot of ['up1', 'up2']) {
  await page.mouse.move(b.x + b.width / 2, b.y + 60); await page.mouse.down();
  for (let k = 1; k <= 14; k++) { await page.mouse.move(b.x + b.width / 2, b.y + 60 + k * 26); await page.waitForTimeout(16); }
  await page.mouse.up(); await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${shot}.png` });
}
// Tap the locked area in view → confirmation with the star-token price.
await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/confirm.png` });
await browser.close();
console.log(errors.length ? errors.join('\n') : 'no errors');
