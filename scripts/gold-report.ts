// Gold flow report: plays the real engine with the autoplay bot for 15/30/60/90 minutes a day and
// attributes every gold change to the command that caused it (sales, orders, shops, collection,
// achievements, quests, level-ups, tasks, Battle Pass … and the sinks). A balancing compass, not a
// promise: the bot is a lower bound for an engaged player.
//   node --no-warnings --import ./scripts/ts-register.mjs scripts/gold-report.ts [days] [seeds] [--json]
import { apply, type Command } from '../src/engine/commands';
import { newGame } from '../src/engine/state';
import type { GameState } from '../src/engine/types';
import { getPuzzle } from '../src/puzzles/levels';
import { freeSeasonLevel, seasonTasks } from '../src/premium/season';
import { SEASON_XP_PER_LEVEL } from '../src/premium/catalog';
import { autoplayStep } from './autoplay';
import { levelReward } from '../src/content/progression';

const DAY = 86_400_000;
const days = Number(process.argv[2] ?? 90);
const seeds = (process.argv[3] ?? '7,11,23').split(',').map(Number);
const asJson = process.argv.includes('--json');
const CHECKPOINTS = [1, 7, 15, 30, 60, 90].filter((d) => d <= days);
const PROFILES = [
  { minutes: 15, sessions: 2 },
  { minutes: 30, sessions: 3 },
  { minutes: 60, sessions: 3 },
  { minutes: 90, sessions: 5 },
];
const cost = (c: Command) => (c.type === 'tap' ? 1.2 : c.type === 'move' ? 2.2 : c.type === 'completeQuest' ? 12 : c.type === 'solvePuzzle' ? 25 + getPuzzle(c.id).par * 3.5 : 2);

/** Gold source label for a command (level-up gold is split out from the XP that caused it). */
function bucket(cmd: Command): string {
  switch (cmd.type) {
    case 'sell': return 'satış';
    case 'deliverOrder': return 'sipariş';
    case 'claimFarmReward': return 'dükkân';
    case 'claimCollection': return 'koleksiyon';
    case 'claimAchievement': return 'başarım';
    case 'completeQuest': return 'görev';
    case 'claimTask': case 'claimDailyBonus': return 'günlük görev';
    case 'claimSeasonReward': case 'claimSeasonTask': return 'battle pass';
    case 'solvePuzzle': return 'bulmaca';
    case 'tap': return 'altın ürünü / hasat';
    default: return cmd.type;
  }
}

type Row = { day: number; level: number; region: number; gold: number; earned: Record<string, number>; spent: Record<string, number>; crates: number; energy: number; bp: number; levelGold: number };
const out: { minutes: number; seed: number; rows: Row[] }[] = [];
for (const prof of PROFILES) for (const seed of seeds) {
  let s: GameState = newGame(0, seed, 0);
  s.flags.introDone = true;
  const earned: Record<string, number> = {}, spent: Record<string, number> = {};
  let levelGold = 0;
  const rows: Row[] = [];
  for (let day = 1; day <= days; day++) {
    for (let ses = 0; ses < prof.sessions; ses++) {
      let now = (day - 1) * DAY + (ses * DAY) / prof.sessions + 8 * 3_600_000;
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
        const lvGold = r.events.reduce((n, e) => n + (e.type === 'levelUp' ? levelReward(e.level).coins : 0), 0);
        levelGold += lvGold;
        if (lvGold) earned['seviye atlama'] = (earned['seviye atlama'] ?? 0) + lvGold;
        const delta = r.state.leaves - s.leaves - lvGold;
        const k = bucket(cmd);
        if (delta > 0) earned[k] = (earned[k] ?? 0) + delta; else if (delta < 0) spent[k] = (spent[k] ?? 0) - delta;
        s = r.state; used += cost(cmd); now += cost(cmd) * 1000;
      }
    }
    if (CHECKPOINTS.includes(day)) rows.push({ day, level: s.level, region: Math.max(...s.regions), gold: s.leaves, earned: { ...earned }, spent: { ...spent }, crates: s.crate.charges, energy: s.energy, bp: Math.floor(s.freeSeason.xp / SEASON_XP_PER_LEVEL), levelGold });
  }
  out.push({ minutes: prof.minutes, seed, rows });
}

if (asJson) console.log(JSON.stringify(out));
else for (const prof of PROFILES) {
  console.log(`\n== ${prof.minutes} dk/gün (tohumlar ${seeds.join(',')}; medyan) ==`);
  const runs = out.filter((o) => o.minutes === prof.minutes);
  const med = (xs: number[]) => { const b = [...xs].sort((a, c) => a - c); return b[Math.floor(b.length / 2)]; };
  for (const day of CHECKPOINTS) {
    const r = runs.map((o) => o.rows.find((x) => x.day === day)!).filter(Boolean);
    if (!r.length) continue;
    const keys = [...new Set(r.flatMap((x) => Object.keys(x.earned)))];
    const skeys = [...new Set(r.flatMap((x) => Object.keys(x.spent)))];
    const totalE = med(r.map((x) => Object.values(x.earned).reduce((a, b) => a + b, 0)));
    const totalS = med(r.map((x) => Object.values(x.spent).reduce((a, b) => a + b, 0)));
    console.log(`gün ${String(day).padStart(2)}: sv ${med(r.map((x) => x.level))}, bölge ${med(r.map((x) => x.region))}, BP ${med(r.map((x) => x.bp))}, eldeki altın ${med(r.map((x) => x.gold))}, kazanılan ${totalE}, harcanan ${totalS}, kutu ${med(r.map((x) => x.crates))}, enerji ${med(r.map((x) => x.energy))}`);
    console.log(`        gelir: ${keys.map((k) => `${k} ${med(r.map((x) => x.earned[k] ?? 0))}`).join(', ')}`);
    console.log(`        gider: ${skeys.map((k) => `${k} ${med(r.map((x) => x.spent[k] ?? 0))}`).join(', ')}`);
  }
}
