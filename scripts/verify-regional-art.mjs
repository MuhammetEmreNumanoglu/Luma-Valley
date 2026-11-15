// Run with: node --no-warnings --import ./scripts/ts-register.mjs scripts/verify-regional-art.mjs [ruin|repair|done]
// Synthetic save in its own browser context: regions 1-5 unlocked, every structure at one restoration stage.
// Screenshots the valley top to bottom so the original regional art (structures, bridges, trees, paths) can be checked.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { newGame } from '../src/engine/state.ts';
import { encode } from '../src/persistence/save.ts';
import { REGIONS } from '../src/content/regions.ts';
import { QUESTS, STRUCTURE_STAGES } from '../src/content/quests.ts';
const { chromium } = createRequire(import.meta.url)('playwright');
const mode = process.argv[2] ?? 'done';
const out = process.env.OUT_DIR ?? '/tmp/regional-art';
mkdirSync(out, { recursive: true });
const now = Date.now(), s = newGame(now, 42, -180);
s.settings = { ...s.settings, lang: 'tr', music: false, sfx: false, ...(process.env.DARK ? { theme: 'dark' } : {}) };
s.flags.introDone = true; s.flags.tutStarCoin = true; s.tutorial.skipped = true;
s.quests.seen = QUESTS.map((q) => q.id);
s.regions = [1, 2, 3, 4, 5];
for (const r of REGIONS.slice(0, 5)) for (const st of r.structures) {
  const total = STRUCTURE_STAGES[st.id] ?? 1;
  s.structures[st.id] = mode === 'ruin' ? 0 : mode === 'repair' ? Math.max(1, Math.floor(total / 2)) : total;
  if (mode === 'repair' && total === 1) s.structures[st.id] = 0;
}
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript((raw) => { if (!localStorage.getItem('art-fixture')) { localStorage.clear(); localStorage.setItem('luma.save.a', raw); localStorage.setItem('art-fixture', 'yes'); } }, encode(s, 1, now));
await page.goto(process.env.LUMA_WEB_URL ?? 'http://localhost:8099/');
await page.getByRole('tab', { name: 'Vadi', exact: true }).click({ timeout: 90000 });
await page.waitForTimeout(1500);
// Scroll to the top of the valley first.
for (let i = 0; i < 40; i++) { await page.mouse.move(195, 250); await page.mouse.down(); await page.mouse.move(195, 750, { steps: 6 }); await page.mouse.up(); }
await page.waitForTimeout(600);
for (let i = 0; i < 22; i++) {
  await page.screenshot({ path: `${out}/${mode}_${String(i).padStart(2, '0')}.png` });
  await page.mouse.move(195, 600); await page.mouse.down(); await page.mouse.move(195, 480, { steps: 12 }); await page.waitForTimeout(250); await page.mouse.up();
  await page.waitForTimeout(700);
}
console.log(JSON.stringify({ mode, errors }));
await browser.close();
if (errors.length) process.exitCode = 1;
