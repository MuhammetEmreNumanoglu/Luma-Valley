// Run with: node --no-warnings --import ./scripts/ts-register.mjs scripts/verify-dark-mode.mjs
// Synthetic save in dark UI theme; screenshots every tab and every header/overlay button for a visual audit.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { newGame } from '../src/engine/state.ts';
import { encode } from '../src/persistence/save.ts';
import { QUESTS } from '../src/content/quests.ts';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.env.OUT_DIR ?? '/tmp/dark-audit';
const themeName = process.env.UI_THEME ?? 'dark';
mkdirSync(out, { recursive: true });
const now = Date.now(), s = newGame(now, 42, -180);
s.settings = { ...s.settings, lang: 'tr', music: false, sfx: false, uiTheme: themeName };
s.flags.introDone = true; s.flags.tutStarCoin = true; s.tutorial.skipped = true;
s.quests.seen = QUESTS.map((q) => q.id); s.regions = [1, 2]; s.starTokens = 300; s.leaves = 2000;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript((raw) => { if (!localStorage.getItem('dark-fixture')) { localStorage.clear(); localStorage.setItem('luma.save.a', raw); localStorage.setItem('dark-fixture', 'yes'); } }, encode(s, 1, now));
await page.goto(process.env.LUMA_WEB_URL ?? 'http://localhost:8099/');
await page.getByRole('tab', { name: 'Atölye', exact: true }).waitFor({ timeout: 90000 });
const shots = [];
const shot = async (name) => { await page.waitForTimeout(600); await page.screenshot({ path: `${out}/${themeName}_${name}.png` }); shots.push(name); };
const close = async () => { for (let i = 0; i < 3; i++) { const b = page.getByRole('button', { name: /^(Kapat|Geri|Tamam)$/ }); if (await b.count()) await b.first().click().catch(() => {}); else await page.keyboard.press('Escape'); await page.waitForTimeout(250); } };
for (const tab of ['Atölye', 'Vadi', 'Görevler', 'Defter', 'Işık Mağazası']) {
  await page.getByRole('tab', { name: tab, exact: true }).click(); await shot(`tab_${tab}`);
  if (tab === 'Işık Mağazası') for (const sub of ['Temalar', 'Kartlar', 'Kolaylıklar', 'Sezon']) { const t = page.getByRole('tab', { name: sub, exact: true }); if (await t.count()) { await t.first().click(); await shot(`store_${sub}`); } }
  await close();
}
await page.getByRole('tab', { name: 'Atölye', exact: true }).click();
// Header pills and icon buttons
const labels = await page.getByRole('button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')).filter(Boolean));
const header = [...new Set(labels)].filter((l) => /Seviye|Altın|jeton|Enerji|Ayarlar|Depo|Profil|Rehber|Sezon/i.test(l)).slice(0, 10);
for (const l of header) {
  const b = page.getByRole('button', { name: l, exact: true });
  if (!(await b.count())) continue;
  await b.first().click().catch(() => {});
  await shot(`btn_${l.replace(/[^\wığüşöçİĞÜŞÖÇ]+/g, '_').slice(0, 30)}`);
  await close();
  await page.getByRole('tab', { name: 'Atölye', exact: true }).click().catch(() => {});
}
console.log(JSON.stringify({ shots, header, errors }));
await browser.close();
if (errors.length) process.exitCode = 1;
