// DEV TEST level and region tools in a real browser.
//   Development export (tools visible):  LUMA_DEV_URL=http://localhost:8100
//   Production export (tools absent):    LUMA_WEB_URL=http://localhost:8099
//   node --import ./scripts/ts-register.mjs scripts/verify-dev-test-tools.mjs [outDir]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { newGame } from '../src/engine/state.ts';
import { encode, pickSlot } from '../src/persistence/save.ts';
import { QUESTS } from '../src/content/quests.ts';

const out = process.argv[2] ?? 'e2e-out/dev-tools';
mkdirSync(out, { recursive: true });
const { chromium } = createRequire(import.meta.url)('playwright-core');
const now = Date.now();
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const s = newGame(now, 42, -180);
s.settings = { ...s.settings, lang: 'tr', music: false, sfx: false };
s.flags.introDone = true; s.flags.tutStarCoin = true; s.tutorial.skipped = true; s.quests.seen = QUESTS.map((q) => q.id);
async function open(url) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.errors = errors;
  await page.addInitScript((raw) => { if (!sessionStorage.getItem('fx')) { localStorage.clear(); localStorage.setItem('luma.save.a', raw); sessionStorage.setItem('fx', '1'); } }, encode(s, 1, now));
  await page.goto(url);
  await page.getByRole('tab', { name: 'Işık Mağazası' }).click({ timeout: 120000 });
  await page.waitForTimeout(600);
  return page;
}
const saved = (page) => page.evaluate(() => [localStorage.getItem('luma.save.a'), localStorage.getItem('luma.save.b')]).then(([a, b]) => pickSlot(a, b).state);

// Production: no İşlemler tab, no DEV TEST tools.
{
  const page = await open(process.env.LUMA_WEB_URL ?? 'http://localhost:8099/');
  assert.equal(await page.getByRole('tab', { name: 'İşlemler' }).count(), 0, 'production has no İşlemler');
  assert.equal(await page.getByText('DEV TEST — GERÇEK OYUN DURUMU DEĞİŞİR').count(), 0);
  await page.close();
}
// Development: level and region tools change the real save.
if (process.env.LUMA_DEV_URL) {
  const page = await open(process.env.LUMA_DEV_URL);
  await page.getByRole('tab', { name: 'İşlemler' }).click();
  await page.getByTestId('dev-test-tools').waitFor({ timeout: 20000 });
  await page.screenshot({ path: `${out}/dev-tools-top.png` });
  await page.getByRole('button', { name: '+5 Level' }).click();
  await page.waitForTimeout(800);
  let st = await saved(page);
  assert.equal(st.level, 6); assert.equal(st.xp, 0);
  await page.getByLabel('Hedef seviye').fill('15');
  await page.getByRole('button', { name: "Level 15'e Git" }).click();
  await page.waitForTimeout(800);
  st = await saved(page); assert.equal(st.level, 15);
  const region = page.getByLabel(/Eski Değirmen Yolu · kilitli/);
  await region.getByRole('button', { name: 'Test İçin Aç' }).click();
  await page.waitForTimeout(800);
  st = await saved(page); assert.deepEqual(st.regions, [1, 2]);
  await page.getByLabel(/Eski Değirmen Yolu · açık/).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/dev-tools-regions.png` });
  await page.getByLabel(/Eski Değirmen Yolu · açık/).getByRole('button', { name: 'Tamamlanmış' }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/dev-preview-done.png` });
  st = await saved(page);
  assert.ok(!Object.keys(st.structures).some((k) => k.startsWith('r2_') && st.structures[k] > 0), 'preview does not restore anything');
  assert.deepEqual(page.errors, []);
  await page.close();
}
await browser.close();
console.log('dev test tools ok');
