// Economy simulation: plays the real engine with the autoplay bot under different daily habits
// and reports how far each profile gets over time. The bot is a reasonable player, not a
// perfect one; real players will differ, so treat the numbers as a balancing compass.
//   node --import ./scripts/ts-register.mjs scripts/simulate.ts [days]
import { BALANCE } from '../src/content/balance';
import { QUESTS } from '../src/content/quests';
import { apply, type Command } from '../src/engine/commands';
import { newGame } from '../src/engine/state';
import type { GameState } from '../src/engine/types';
import { getPuzzle } from '../src/puzzles/levels';
import { autoplayStep } from './autoplay';
import { collectibleKeys } from '../src/content/progression';

interface Profile {
  name: string;
  minutesPerDay: number;
  sessionsPerDay: number;
  /** Tokens bought per 30 days (0 = never pays). Spent on energy refills. */
  boughtTokensPer30d: number;
  /** Human time multiplier (a first-time merge player is slower and less efficient). */
  slow?: number;
  questsOnly?: boolean;
  puzzles?: boolean;
}

const ONLY = process.env.SIM_PROFILE;
const ALL: Profile[] = [
  { name: 'İlk kez merge oynayan (20 dk/gün, yavaş, bulmacadan kaçınır)', minutesPerDay: 20, sessionsPerDay: 2, boughtTokensPer30d: 0, slow: 1.8, puzzles: false },
  { name: '10 dk/gün', minutesPerDay: 10, sessionsPerDay: 2, boughtTokensPer30d: 0 },
  { name: '30 dk/gün', minutesPerDay: 30, sessionsPerDay: 3, boughtTokensPer30d: 0 },
  { name: 'Uzun süre aktif (90 dk/gün, 5 oturum)', minutesPerDay: 90, sessionsPerDay: 5, boughtTokensPer30d: 0 },
  { name: 'Yalnızca görev takip eden (30 dk/gün)', minutesPerDay: 30, sessionsPerDay: 3, boughtTokensPer30d: 0, questsOnly: true },
];
const PROFILES = ONLY ? ALL.filter((p) => p.name.startsWith(ONLY)) : ALL;

/** Seconds of real attention a command costs a human. */
function cost(cmd: Command): number {
  switch (cmd.type) {
    case 'tap':
      return 1.2;
    case 'move':
      return 2.2;
    case 'solvePuzzle': {
      const p = getPuzzle(cmd.id);
      return 25 + p.par * 3.5 + p.w * p.h * 0.8;
    }
    case 'completeQuest':
      return 12; // dialogue + celebration
    case 'deliverOrder':
    case 'claimTask':
      return 3;
    default:
      return 2;
  }
}

const DAY = 86_400_000;
const days = Number(process.argv[2] ?? 210);
const checkpoints = [1, 2, 3, 7, 14, 30, 60, 90, 120, 180, 210].filter((d) => d <= days);
const totalQuests = QUESTS.length;

for (const prof of PROFILES) {
  let s: GameState = newGame(0, 7, 0);
  s.flags.introDone = true;
  let now = 0;
  const regionDay: Record<number, number> = { 1: 0 };
  const rows: string[] = [];
  let tokensBought = 0;
  let stuckSessions = 0;
  let energySpent = 0;
  let fullBoardSessions = 0;
  for (let day = 1; day <= days; day++) {
    if (prof.boughtTokensPer30d && day % 30 === 1) {
      s = apply(s, { type: 'grantPurchase', transactionId: `sim-${day}`, coins: prof.boughtTokensPer30d }, now).state;
      tokensBought += prof.boughtTokensPer30d;
    }
    const perSession = (prof.minutesPerDay * 60) / prof.sessionsPerDay;
    for (let ses = 0; ses < prof.sessionsPerDay; ses++) {
      now = (day - 1) * DAY + (ses * DAY) / prof.sessionsPerDay + 8 * 3_600_000;
      s = apply(s, { type: 'tick' }, now).state; // the app ticks on open
      let used = 0;
      let idle = 0;
      while (used < perSession) {
        let cmd = autoplayStep(s, now, { questsOnly: prof.questsOnly, puzzles: prof.puzzles });
        if (cmd.type === 'tick') {
          {
            idle++;
            if (idle > 2) break; // nothing useful to do: the player closes the app
            now += 30_000;
            s = apply(s, { type: 'tick' }, now).state;
            continue;
          }
        }
        const r = apply(s, cmd, now);
        if (r.events.some((e) => e.type === 'denied')) {
          // The bot asked for something impossible; treat like having nothing to do.
          idle++;
          if (process.env.SIM_DEBUG) console.log('denied', JSON.stringify(cmd), JSON.stringify(r.events));
          if (idle > 2) break;
          now += 30_000;
          continue;
        }
        idle = 0;
        energySpent += Math.max(0, s.energy - r.state.energy);
        s = r.state;
        const c = cost(cmd) * (prof.slow ?? 1);
        used += c;
        now += c * 1000;
      }
      if (used < perSession * 0.5) stuckSessions++;
      if (s.board.filter((c) => c.t === 'e').length <= 1) fullBoardSessions++;
    }
    for (const r of s.regions) if (regionDay[r] === undefined) regionDay[r] = day;
    if (checkpoints.includes(day)) {
      rows.push(
        `  gün ${String(day).padStart(3)}: bölge ${Math.max(...s.regions)}  görev ${String(s.quests.done.length).padStart(2)}/${totalQuests}  bulmaca ${String(Object.keys(s.puzzles).filter((k) => k.startsWith('lp')).length).padStart(2)}/80  sv ${String(s.level).padStart(2)}  keşif ${String(s.discovered.length).padStart(3)}/${collectibleKeys().length}  altın ${String(s.leaves).padStart(5)}  temizlenen-kaynak ${s.stats.cleared}  kaynak-işi ${Object.values(s.nodes).reduce((a, n) => a + n.stage, 0)}  enerji-harcanan ${energySpent}`,
      );
    }
  }
  console.log(`\n${prof.name}${prof.boughtTokensPer30d ? ` (satın alınan jeton: ${tokensBought})` : ''}`);
  console.log(rows.join('\n'));
  console.log(`  bölge açılış günleri: ${Object.entries(regionDay).map(([r, d]) => `B${r}=${d}`).join(' ')}`);
  console.log(`  erken biten oturum (yapacak iş kalmadı): ${stuckSessions}`);
  console.log(`  tahtanın dolu olduğu oturum: ${fullBoardSessions}`);
}
