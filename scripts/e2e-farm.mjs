// Focused browser check of an existing save, harvesting, production and a second area.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { newGame } from '../src/engine/state.ts';
import { encode } from '../src/persistence/save.ts';
import { QUEST } from '../src/content/quests.ts';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const now = Date.now();
const state = newGame(now, 2, 0);
state.flags = { introDone: true, tutMerge: true, tutProduce: true, tutFive: true };
state.settings.lang = 'en';
state.quests.seen = Object.keys(QUEST);
state.board = state.board.map(() => ({ t: 'e' }));
state.board[0] = { t: 'i', k: 'cow:4' };
state.workshop.gold = 100;
const save = encode(state, 1, now);
mkdirSync('e2e-farm-verified', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.E2E_CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.addInitScript((value) => { if (!localStorage.getItem('luma.save.a') && !localStorage.getItem('luma.save.b')) localStorage.setItem('luma.save.a', value); }, save);
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:8097');
await page.getByText(/^Workshop$/).first().click({ timeout: 90000 });
const board = page.locator('[aria-label="Workshop"]').filter({ has: page.locator('canvas') }).first();
await board.waitFor();
const b = await board.boundingBox();
if (!b) throw new Error('Missing workshop board');
const cell = (b.width - 12) / 7;
// Horizontal movement should expose part of a neighbouring board without snapping.
const px = b.x + b.width * 0.75, py = b.y + b.height * 0.4;
await page.mouse.move(px, py); await page.mouse.down();
for (let step = 1; step <= 10; step++) { await page.mouse.move(px - b.width * 0.45 * step / 10, py); await page.waitForTimeout(25); }
await page.mouse.up(); await page.waitForTimeout(250);
const moved = await board.evaluate((el) => new DOMMatrix(getComputedStyle(el.firstElementChild).transform).m41);
if (moved >= -b.width - 20) throw new Error(`Horizontal map did not move: ${moved}`);
await page.screenshot({ path: 'e2e-farm-verified/horizontal-pan.png' });
await page.getByLabel('Return to center').click(); await page.waitForTimeout(500);
await page.mouse.click(b.x + 6 + cell / 2, b.y + 6 + cell / 2);
await page.waitForTimeout(500);
await page.screenshot({ path: 'e2e-farm-verified/after-harvest.png' });
await page.getByText(/Farm/).first().click();
await page.getByText('Dairy', { exact: true }).waitFor();
await page.screenshot({ path: 'e2e-farm-verified/production.png' });
await page.getByText('Produce', { exact: true }).first().click();
await page.getByText(/Preparing/).first().waitFor();
await page.getByText('Close', { exact: true }).first().click();
await page.waitForTimeout(500);
// Drag empty ground down: the northern neighbour scrolls into view continuously.
const startX = b.x + b.width * 0.67, startY = b.y + b.height * 0.15;
await page.mouse.move(startX, startY);
await page.mouse.down();
for (let step = 1; step <= 10; step++) {
  await page.mouse.move(startX, startY + b.height * 0.72 * step / 10);
  await page.waitForTimeout(30);
}
await page.mouse.up();
await page.waitForTimeout(400);
await page.screenshot({ path: 'e2e-farm-verified/pan.png' });
// The unlock card is in the world, not in a page-switching bar.
const unlock = page.getByText('New area', { exact: true });
const cards = await unlock.count();
let target = null;
for (let i = 0; i < cards; i++) {
  const box = await unlock.nth(i).boundingBox();
  if (box && box.x >= b.x && box.x < b.x + b.width && box.y >= b.y && box.y < b.y + b.height) { target = box; break; }
}
if (!target) throw new Error('Neighbouring area did not scroll into the viewport');
await page.mouse.click(target.x + target.width / 2, target.y + target.height / 2);
await page.waitForTimeout(400);
await page.screenshot({ path: 'e2e-farm-verified/area2.png' });
await page.reload();
await page.getByText(/^Workshop$/).first().click({ timeout: 90000 });
if (!(await page.getByText(/Preparing/).count())) {
  await page.getByText(/Farm/).first().click();
  await page.getByText(/Preparing/).first().waitFor();
}
await browser.close();
if (errors.length) throw new Error(errors.join('\n'));
console.log('Farm harvesting, recipe, area unlock and reload passed');
