import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { newGame } from '../src/engine/state.ts';
import { encode, pickSlot } from '../src/persistence/save.ts';
import { QUESTS } from '../src/content/quests.ts';

const { chromium } = createRequire(import.meta.url)('playwright-core');
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const pages = ['Luma Valley’e hoş geldin', 'Birleştirme', 'Kutular', 'Enerji', 'Para birimleri', 'İnek ve süt', 'Buğday', 'Hayvanlar', 'Depo', 'Üretim', 'Tüccarlar', 'Vadi görevleri', 'Işık Yolları', 'Battle Pass', 'Temalar ve kartlar'];
for (const uiTheme of ['dark', 'light']) {
  const now = Date.now(), state = newGame(now, 42, -180);
  state.settings = { ...state.settings, lang: 'tr', uiTheme, music: false, sfx: false, reduceMotion: true };
  state.flags.introDone = true; state.tutorial.skipped = true; state.quests.seen = QUESTS.map(q => q.id);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(raw => { localStorage.clear(); localStorage.setItem('luma.save.a', raw); }, encode(state, 1, now));
  await page.goto(process.env.LUMA_WEB_URL || 'http://localhost:19006/');
  await page.getByRole('button', { name: 'Ayarlar', exact: true }).click({ timeout: 90000 });
  await page.getByRole('button', { name: 'Nasıl oynanır?', exact: true }).click();
  for (let i = 0; i < pages.length; i++) {
    await page.getByText(pages[i], { exact: true }).last().waitFor();
    await page.getByText(`${i + 1} / 15`, { exact: true }).waitFor();
    if (i === 0) assert.equal(await page.getByRole('button', { name: 'Önceki' }).isDisabled(), true);
    if (i === 7) await page.screenshot({ path: `/tmp/luma-guide-${uiTheme}.png` });
    if (i < pages.length - 1) await page.getByRole('button', { name: 'Sonraki' }).click();
  }
  await page.getByRole('button', { name: 'Önceki' }).click();
  await page.getByText('14 / 15', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Sonraki' }).click();
  await page.getByRole('button', { name: 'Bitti' }).click();
  await page.getByRole('button', { name: 'Nasıl oynanır?', exact: true }).waitFor();
  const [a, b] = await page.evaluate(() => [localStorage.getItem('luma.save.a'), localStorage.getItem('luma.save.b')]);
  const saved = pickSlot(a, b).state;
  assert.equal(saved.level, state.level); assert.equal(saved.leaves, state.leaves); assert.equal(saved.settings.uiTheme, uiTheme);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ uiTheme, pages: pages.length, previous: true, savedProgress: true, errors }));
  await context.close();
}
await browser.close();
