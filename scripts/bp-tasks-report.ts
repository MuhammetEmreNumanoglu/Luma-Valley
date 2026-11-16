// Battle Pass task pace: plays the real engine with the autoplay bot for 15/30/45/60/90 minutes a
// day and reports, at days 1/3/4/7/10/15/20/30, how many daily, weekly and season tasks were
// claimed, BP XP and BP level. The bot is a lower bound for an engaged player.
//   node --no-warnings --import ./scripts/ts-register.mjs scripts/bp-tasks-report.ts [days] [seeds] [--json]
import { apply, type Command } from '../src/engine/commands';
import { newGame } from '../src/engine/state';
import type { GameState } from '../src/engine/types';
import { getPuzzle } from '../src/puzzles/levels';
import { freeSeasonLevel, seasonTasks } from '../src/premium/season';
import { autoplayStep } from './autoplay';

const DAY = 86_400_000;
const days = Number(process.argv[2] ?? 30);
const seeds = (process.argv[3] ?? '7,11,23').split(',').map(Number);
const asJson = process.argv.includes('--json');
const CHECKPOINTS = [1, 3, 4, 7, 10, 15, 20, 30].filter((d) => d <= days);
const PROFILES = [15, 30, 45, 60, 90].map((minutes) => ({ minutes, sessions: minutes <= 15 ? 2 : minutes >= 90 ? 5 : 3 }));
const cost = (c: Command) => (c.type === 'tap' ? 1.2 : c.type === 'move' ? 2.2 : c.type === 'completeQuest' ? 12 : c.type === 'solvePuzzle' ? 25 + getPuzzle(c.id).par * 3.5 : 2);

type Row = { day: number; daily: number; weekly: number; season: number; seasonOf: number; xp: number; level: number };
const out: { minutes: number; seed: number; rows: Row[] }[] = [];
for (const prof of PROFILES) for (const seed of seeds) {
  let s: GameState = newGame(0, seed, 0);
  s.flags.introDone = true;
  const done = { daily: 0, weekly: 0, season: 0 };
  const rows: Row[] = [];
  const count = (id: string) => { const p = id.match(/(daily|weekly|season):/)?.[1] as keyof typeof done | undefined; if (p) done[p]++; };
  for (let day = 1; day <= days; day++) {
    for (let ses = 0; ses < prof.sessions; ses++) {
      let now = (day - 1) * DAY + (ses * DAY) / prof.sessions / 1.6 + 8 * 3_600_000;
      s = apply(s, { type: 'tick' }, now).state;
      let used = 0, idle = 0;
      while (used < (prof.minutes * 60) / prof.sessions) {
        const ready = seasonTasks(s.freeSeason).find((t) => !s.freeSeason.claimedTasks.includes(t.id) && s.freeSeason.progress[t.id] >= t.target);
        const pend = s.freeSeason.pendingTasks[0];
        const reward = Array.from({ length: freeSeasonLevel(s.freeSeason) }, (_, i) => i + 1).find((n) => !s.freeSeason.claimedRewards.includes(n) && !(n % 3 === 2 && s.energy > 984));
        const cmd: Command = pend ? { type: 'claimSeasonTask', id: pend.key } : ready ? { type: 'claimSeasonTask', id: ready.id } : reward ? { type: 'claimSeasonReward', level: reward } : autoplayStep(s, now);
        if (cmd.type === 'tick') { if (++idle > 2) break; now += 30_000; s = apply(s, cmd, now).state; continue; }
        const r = apply(s, cmd, now);
        if (r.events.some((e) => e.type === 'denied')) { if (++idle > 2) break; now += 30_000; continue; }
        idle = 0;
        if (cmd.type === 'claimSeasonTask') count(cmd.id);
        s = r.state; used += cost(cmd); now += cost(cmd) * 1000;
      }
    }
    if (CHECKPOINTS.includes(day)) rows.push({ day, ...done, seasonOf: seasonTasks(s.freeSeason).filter((t) => t.id.startsWith('season:') && t.id !== 'season:purchase').length, xp: s.freeSeason.xp, level: freeSeasonLevel(s.freeSeason) });
  }
  out.push({ minutes: prof.minutes, seed, rows });
}

if (asJson) console.log(JSON.stringify(out));
else {
  const med = (xs: number[]) => { const b = [...xs].sort((a, c) => a - c); return b[Math.floor(b.length / 2)]; };
  console.log(`medyan, tohumlar ${seeds.join(',')} (sezon görevleri: satın alma hariç)`);
  console.log('dk/gün | gün | günlük | haftalık | sezonluk | BP XP | BP sv');
  for (const prof of PROFILES) for (const day of CHECKPOINTS) {
    const r = out.filter((o) => o.minutes === prof.minutes).map((o) => o.rows.find((x) => x.day === day)!);
    console.log(`${prof.minutes} | ${day} | ${med(r.map((x) => x.daily))} | ${med(r.map((x) => x.weekly))} | ${med(r.map((x) => x.season))}/${r[0].seasonOf} | ${med(r.map((x) => x.xp))} | ${med(r.map((x) => x.level))}`);
  }
}
