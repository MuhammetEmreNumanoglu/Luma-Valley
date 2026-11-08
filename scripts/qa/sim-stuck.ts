// Debug: play seed N at 30 min/day until day D, then print the board and the bot's next moves.
import { apply, type Command } from '../../src/engine/commands';
import { newGame } from '../../src/engine/state';
import { availableQuests, requirementProgress } from '../../src/engine/quests';
import { obstaclesOn } from '../../src/engine/resources';
import { autoplayStep } from '../autoplay';
const DAY = 86_400_000;
const seed = Number(process.argv[2] ?? 7), until = Number(process.argv[3] ?? 120);
let s = newGame(0, seed, 0); s.flags.introDone = true; let now = 0;
import { getPuzzle } from '../../src/puzzles/levels';
const cost = (c: Command) => (c.type === 'tap' ? 1.2 : c.type === 'move' ? 2.2 : c.type === 'completeQuest' ? 12 : c.type === 'solvePuzzle' ? 25 + getPuzzle(c.id).par * 3.5 : 2);
const SES = Number(process.env.SES ?? 3), SLOW = Number(process.env.SLOW ?? 1);
for (let day = 1; day <= until; day++) for (let ses = 0; ses < SES; ses++) {
  now = (day - 1) * DAY + (ses * DAY) / SES + 8 * 3_600_000;
  s = apply(s, { type: 'tick' }, now).state;
  let used = 0, idle = 0;
  const log: string[] = [];
  while (used < Number(process.env.SECS ?? 600)) {
    const cmd = autoplayStep(s, now, { puzzles: process.env.NOPUZ ? false : undefined });
    if (cmd.type === 'tick') { if (++idle > 2) break; now += 30_000; s = apply(s, { type: 'tick' }, now).state; continue; }
    const r = apply(s, cmd, now);
    const d = r.events.find((e) => e.type === 'denied');
    if (day === until) log.push(JSON.stringify(cmd) + (d ? ' DENIED ' + JSON.stringify(d) : ''));
    if (d) { if (++idle > 2) break; now += 30_000; continue; }
    idle = 0; s = r.state; used += cost(cmd) * SLOW; now += cost(cmd) * SLOW * 1000;
  }
  if (day === until) {
    console.log(`ses ${ses}: energy ${s.energy} supply ${s.supply.charges} obstacles ${obstaclesOn(s.board)} free ${s.board.filter((c) => c.t === 'e').length} workers ${s.workerCapacity}`);
    console.log('  log:', log.slice(0, 25).join('\n       '));
  }
}
console.log('quests:', availableQuests(s).map((q) => `${q.id}[${requirementProgress(s, q).map((p) => `${p.req.kind === 'item' ? p.req.item : p.req.kind}:${p.have}/${p.need}`).join(' ')}]`).join(' | '));
console.log('board:', s.board.map((c) => (c.t === 'i' ? c.k : c.t === 'r' ? `R(${c.r}${c.tier} s${c.stage}${c.readyAt ? '*' : ''})` : c.t)).join(' '));
console.log('stock:', JSON.stringify(s.harvestStock), 'storage', s.rewardStorage.length);
