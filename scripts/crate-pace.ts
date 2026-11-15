// Crate balance during the first minutes of play (start 50 = 40 normal + 10 daily): wallet total
// after 10/20/30/60 active minutes, per seed, with the greedy bot.
//   node --no-warnings --import ./scripts/ts-register.mjs scripts/crate-pace.ts [seeds]
import { apply, type Command } from '../src/engine/commands';
import { newGame } from '../src/engine/state';
import { autoplayStep } from './autoplay';
import { BALANCE } from '../src/content/balance';
if (process.env.COMBO_GIFT) BALANCE.crate.comboGift = Number(process.env.COMBO_GIFT);
if (process.env.ENERGY_PACK === '0') BALANCE.crate.energyPack.charges = 0;
const seeds = (process.argv[2] ?? '7,11,23,31,47').split(',').map(Number);
const cost = (c: Command) => (c.type === 'tap' ? 1.2 : c.type === 'move' ? 2.2 : c.type === 'completeQuest' ? 12 : c.type === 'solvePuzzle' ? 45 : 2);
for (const seed of seeds) {
  let s = newGame(0, seed, 0); s.flags.introDone = true;
  let now = 8 * 3600000; const start = now; const marks = [10, 20, 30, 60]; const out: Record<string, unknown> = { seed, start: s.crate.charges };
  let earned = 0, idle = 0;
  while (marks.length) {
    const cmd = autoplayStep(s, now);
    const before = s.crate.charges;
    const r = apply(s, cmd.type === 'tick' ? { type: 'tick' } : cmd, now);
    if (cmd.type === 'tick' || r.events.some(e => e.type === 'denied')) { now += 30000; if (cmd.type === 'tick') s = r.state; idle++; }
    else { s = r.state; now += cost(cmd) * 1000; idle = 0; }
    if (s.crate.charges > before) earned += s.crate.charges - before;
    if (now - start >= marks[0] * 60000) { out[`${marks.shift()}m`] = { crates: s.crate.charges, earned, wallet: { ...s.crate.wallet }, opened: s.crate.opens, level: s.level, energy: s.energy }; }
  }
  console.log(JSON.stringify(out));
}
