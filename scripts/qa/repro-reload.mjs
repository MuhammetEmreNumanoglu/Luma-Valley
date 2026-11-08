// Reload on the Workshop, then return to it from the Valley: the board must still draw.
import { createRequire } from 'node:module';
import { newGame } from '../../src/engine/state.ts';
import { encode } from '../../src/persistence/save.ts';
import { QUEST } from '../../src/content/quests.ts';
import { FAMILIES } from '../../src/content/families.ts';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const out = process.argv[2] ?? 'e2e-out';
const now = Date.now(), s = newGame(now, 2, 0);
s.flags = { introDone: true, tutMerge: true, tutProduce: true, tutFive: true };
s.settings.lang = 'en'; s.quests.seen = Object.keys(QUEST); s.tutorial.skipped = true;
// A varied board (many distinct sprites) like a real mid-game save.
if (process.env.VARIED) {
  const keys = FAMILIES.filter((f) => !['wood', 'stone', 'ceramic', 'shell', 'crystal'].includes(f.id)).flatMap((f) => [1, 2, 3, 4].map((l) => `${f.id}:${l}`));
  let k = 0;
  s.board = s.board.map((c) => (c.t === 'e' && k < keys.length ? { t: 'i', k: keys[k++] } : c));
}
const save = encode(s, 1, now);
const browser = await chromium.launch({ executablePath: process.env.E2E_CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
await page.addInitScript((data) => { if (!localStorage.getItem('luma.save.a') && !localStorage.getItem('luma.save.b')) localStorage.setItem('luma.save.a', data); }, save);
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:8099');
await page.getByText(/^Workshop$/).first().click({ timeout: 90000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/1-board.png` });
await page.reload();
// A reload returns to the tab that was open (the Workshop), not to the Valley.
await page.locator('[aria-label="Workshop"]').filter({ has: page.locator('canvas') }).first().waitFor({ timeout: 90000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/2-after-reload.png` });
await page.getByText(/^Valley$/).first().click();
await page.waitForTimeout(800);
await page.getByText(/^Workshop$/).first().click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/3-board-again.png` });
await page.getByText(/^Valley$/).first().click();
await page.waitForTimeout(800);
await page.getByText(/^Workshop$/).first().click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/4-board-third.png` });
// Resource delivery panel: locked kinds say which quest opens them.
await page.getByLabel(/^Resource Delivery/).click();
await page.getByText(/not by level/).first().waitFor();
await page.screenshot({ path: `${out}/5-supply.png` });
await browser.close();
console.log(errors.length ? errors.join('\n') : 'no errors');
