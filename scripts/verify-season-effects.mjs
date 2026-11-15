// Run with: node --no-warnings --import ./scripts/ts-register.mjs scripts/verify-season-effects.mjs
// Synthetic saves: each valley theme at high and low graphics quality, region 1 and region 3, for a
// visual density/quality audit of seasonal effects (petals, snow, leaves, moonlight). Also measures
// frame time while the ambient layer animates.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { newGame } from '../src/engine/state.ts';
import { encode } from '../src/persistence/save.ts';
import { QUESTS } from '../src/content/quests.ts';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.env.OUT_DIR ?? '/tmp/season-audit';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
for (const theme of ['classic', 'sakura', 'winter', 'autumn', 'moonlight']) for (const quality of ['high', 'low']) {
  const now = Date.now(), s = newGame(now, 42, -180);
  s.settings = { ...s.settings, lang: 'tr', music: false, sfx: false, quality };
  s.flags.introDone = true; s.flags.tutStarCoin = true; s.tutorial.skipped = true;
  s.quests.seen = QUESTS.map((q) => q.id); s.regions = [1, 2, 3];
  s.themes = { owned: ['classic', theme], active: theme };
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((raw) => { localStorage.clear(); localStorage.setItem('luma.save.a', raw); }, encode(s, 1, now));
  await page.goto(process.env.LUMA_WEB_URL ?? 'http://localhost:8099/');
  await page.getByRole('tab', { name: 'Vadi', exact: true }).click({ timeout: 90000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/${theme}_${quality}_a.png` });
  const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(Math.round(n / 2)); }; requestAnimationFrame(f); }));
  await page.screenshot({ path: `${out}/${theme}_${quality}_b.png` });
  results.push({ theme, quality, fps, errors: errors.length });
  await page.close();
}
console.log(JSON.stringify(results));
await browser.close();
