// Run with: node --no-warnings --import ./scripts/ts-register.mjs scripts/verify-chest-opening.mjs [reduce]
// Buys a Winter card pack with earned tokens and films the chest opening: drop-in, shake, light burst,
// first card rising out of the chest, then every remaining card. Checks the rewards land once.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { newGame } from '../src/engine/state.ts';
import { encode, pickSlot } from '../src/persistence/save.ts';
import { QUESTS } from '../src/content/quests.ts';
const { chromium } = createRequire(import.meta.url)('playwright');
const reduce = process.argv[2] === 'reduce';
const out = process.env.OUT_DIR ?? '/tmp/chest-opening';
mkdirSync(out, { recursive: true });
const now = Date.now(), s = newGame(now, 42, -180);
s.settings = { ...s.settings, lang: 'tr', music: false, sfx: false, reduceMotion: reduce };
s.flags.introDone = true; s.flags.tutStarCoin = true; s.tutorial.skipped = true;
s.quests.seen = QUESTS.map((q) => q.id);
s.starTokens = 500;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
p.setDefaultTimeout(20000);
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.addInitScript((raw) => { if (!localStorage.getItem('chest-fixture')) { localStorage.clear(); localStorage.setItem('luma.save.a', raw); localStorage.setItem('chest-fixture', 'yes'); } }, encode(s, 1, now));
await p.goto(process.env.LUMA_WEB_URL ?? 'http://localhost:8099/');
await p.getByRole('tab', { name: 'Işık Mağazası', exact: true }).click({ timeout: 90000 });
await p.getByRole('tab', { name: 'Kart Paketleri', exact: true }).click();
const winter = p.getByText('Kış Kartı Paketi', { exact: true }).locator('..');
await winter.getByRole('button', { name: 'Satın Al' }).click();
await p.getByRole('button', { name: 'Paketi aç' }).click();
const tag = reduce ? 'reduce' : 'motion';
for (const ms of [60, 250, 900]) { await p.waitForTimeout(ms === 60 ? 60 : ms - 60); await p.screenshot({ path: `${out}/${tag}_a_drop_${ms}.png` }); }
await p.getByText('Sandığı açmak için dokun', { exact: true }).waitFor();
await p.getByRole('button', { name: 'Sandığı aç' }).click();
let t = 0;
for (const ms of [140, 330, 480, 650, 1300]) { await p.waitForTimeout(ms - t); t = ms; await p.screenshot({ path: `${out}/${tag}_b_open_${ms}.png` }); }
for (let remaining = 4; remaining > 0; remaining--) {
  await p.getByRole('button', { name: `Kartı aç, ${remaining} kaldı` }).click();
  await p.waitForTimeout(450);
  await p.screenshot({ path: `${out}/${tag}_c_card_${5 - remaining + 1}.png` });
}
await p.getByText('Tüm ödüller koleksiyonuna kaydedildi.', { exact: true }).waitFor();
await p.getByRole('button', { name: 'Mağazaya Dön' }).click();
const [a, b] = await p.evaluate(() => [localStorage.getItem('luma.save.a'), localStorage.getItem('luma.save.b')]);
const saved = pickSlot(a, b).state;
assert.equal(saved.themeCards.winter, 2);
assert.equal((saved.cardReveals ?? []).length, 0);
console.log(JSON.stringify({ reduce, winterCards: saved.themeCards.winter, starTokens: saved.starTokens, energy: saved.energy, errors }));
assert.deepEqual(errors, []);
await browser.close();
