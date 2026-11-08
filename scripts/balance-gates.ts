// Region pacing over several seeds: median day each region gate (and the finale) is reached, and
// the requirements that most often held the story back. A balancing compass, not a promise.
//   node --import ./scripts/ts-register.mjs scripts/balance-gates.ts [minutesPerDay] [days] [seeds]
import { QUESTS } from '../src/content/quests';
import { apply, type Command } from '../src/engine/commands';
import { availableQuests, requirementProgress } from '../src/engine/quests';
import { newGame } from '../src/engine/state';
import type { GameState } from '../src/engine/types';
import { getPuzzle } from '../src/puzzles/levels';
import { autoplayStep } from './autoplay';

const DAY = 86_400_000;
const minutes = Number(process.argv[2] ?? 30);
const days = Number(process.argv[3] ?? 210);
const seeds = (process.argv[4] ?? '7,11,23').split(',').map(Number);
const GATES = ['r1_bridge3', 'r2_gate', 'r3_bridge', 'r4_gate', 'r5_bridge', 'r6_gate', 'r7_great2'];
const cost = (c: Command) => (c.type === 'tap' ? 1.2 : c.type === 'move' ? 2.2 : c.type === 'completeQuest' ? 12 : c.type === 'solvePuzzle' ? 25 + getPuzzle(c.id).par * 3.5 : 2);

const results: Record<string, number[]> = {};
const blockers = new Map<string, number>();
const levels: number[] = [];
const coins: number[] = [];
for (const seed of seeds) {
  let s: GameState = newGame(0, seed, 0);
  s.flags.introDone = true;
  let now = 0;
  const doneDay: Record<string, number> = {};
  for (let day = 1; day <= days; day++) {
    for (let ses = 0; ses < 3; ses++) {
      now = (day - 1) * DAY + (ses * DAY) / 3 + 8 * 3_600_000;
      s = apply(s, { type: 'tick' }, now).state;
      let used = 0, idle = 0;
      while (used < (minutes * 60) / 3) {
        const cmd = autoplayStep(s, now);
        if (cmd.type === 'tick') { if (++idle > 2) break; now += 30_000; s = apply(s, { type: 'tick' }, now).state; continue; }
        const r = apply(s, cmd, now);
        if (r.events.some((e) => e.type === 'denied')) { if (++idle > 2) break; now += 30_000; continue; }
        idle = 0; s = r.state; used += cost(cmd); now += cost(cmd) * 1000;
      }
    }
    for (const id of s.quests.done) if (doneDay[id] === undefined) doneDay[id] = day;
    for (const q of availableQuests(s)) if (q.kind !== 'side') for (const p of requirementProgress(s, q)) if (!p.met) {
      const key = `${q.id} ← ${p.req.kind === 'item' ? `${p.req.item} x${p.req.n}` : p.req.kind === 'leaves' ? `altın ${p.req.n}` : p.req.id}`;
      blockers.set(key, (blockers.get(key) ?? 0) + 1 / seeds.length);
    }
    if (GATES.every((g) => doneDay[g] !== undefined)) break;
  }
  for (const q of QUESTS) (results[q.id] ??= []).push(doneDay[q.id] ?? Infinity);
  levels.push(s.level);
  coins.push(s.leaves);
}
const med = (a: number[]) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
console.log(`${minutes} dk/gün, tohumlar ${seeds.join(',')}: bölge kapıları (medyan gün) ` + GATES.map((g, i) => `${i === 6 ? 'final' : `B${i + 2}`}=${med(results[g])}`).join(' '));
console.log(`  tüm görevler: ${QUESTS.filter((q) => med(results[q.id]) !== Infinity).length}/${QUESTS.length}, son seviye ${levels.join('/')}, eldeki altın ${coins.join('/')}`);
console.log('  en çok bekleten:');
for (const [k, n] of [...blockers.entries()].sort((a, b) => b[1] - a[1]).slice(0, Number(process.env.TOP ?? 12))) console.log(`    ${n.toFixed(0).padStart(3)}  ${k}`);
