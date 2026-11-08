// Debug helper: plays N days at 30 min/day and prints why sessions end early.
import { apply } from '../src/engine/commands';
import { newGame } from '../src/engine/state';
import { availableQuests, requirementProgress } from '../src/engine/quests';
import { autoplayStep } from './autoplay';
const DAY = 86_400_000;
let s = newGame(0, 7, 0); s.flags.introDone = true;
let now = 0;
for (let day = 1; day <= Number(process.argv[2] ?? 8); day++) {
  for (let ses = 0; ses < 3; ses++) {
    now = (day - 1) * DAY + (ses * DAY) / 3 + 8 * 3_600_000;
    s = apply(s, { type: 'tick' }, now).state;
    let used = 0, idle = 0;
    const counts: Record<string, number> = {};
    while (used < 600) {
      const cmd = autoplayStep(s, now);
      if (cmd.type === 'tick') { idle++; if (idle > 2) break; now += 30_000; s = apply(s, { type: 'tick' }, now).state; continue; }
      const r = apply(s, cmd, now);
      if (r.events.some((e) => e.type === 'denied')) { idle++; counts['DENY ' + cmd.type + ' ' + JSON.stringify(r.events.find((e) => e.type === 'denied'))] = 1; if (idle > 2) break; now += 30_000; continue; }
      idle = 0; s = r.state; counts[cmd.type] = (counts[cmd.type] ?? 0) + 1; used += 2; now += 2000;
    }
    if (day >= Number(process.argv[3] ?? 5)) {
      const q = availableQuests(s).map((q) => `${q.id}[${requirementProgress(s, q).map((p) => `${p.req.kind === 'item' ? p.req.item : p.req.kind}:${p.have}/${p.need}`).join(' ')}]`);
      console.log(`d${day}s${ses} used=${used}s E=${s.energy} crate=${s.crate.charges} coins=${s.leaves} supply=${s.supply.charges} free=${s.board.filter((c) => c.t === 'e').length} lvl=${s.level}`);
      console.log('   ', JSON.stringify(counts));
      console.log('   quests:', q.join(' | '));
      console.log('   nodes:', Object.entries(s.nodes).map(([k, v]) => `${k}:${v.stage}${v.readyAt ? '*' : ''}${v.built ? 'B' : ''}`).join(' '));
      console.log('   board:', s.board.filter((c) => c.t === 'i').map((c) => (c as { k: string }).k).sort().join(','));
    }
  }
}
