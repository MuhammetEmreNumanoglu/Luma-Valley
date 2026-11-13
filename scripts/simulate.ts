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
import { MockPurchaseProvider, newDemo } from '../src/premium/mock';
import { seasonTasks } from '../src/premium/season';

interface Profile {
  name: string;
  minutesPerDay: number;
  sessionsPerDay: number;
  /** Hypothetical tokens added every 30 days (0 = never pays); no real purchase. */
  boughtTokensPer30d: number;
  spendEarned?: boolean;
  mock?: boolean;
  /** Human time multiplier (a first-time merge player is slower and less efficient). */
  slow?: number;
  questsOnly?: boolean;
  puzzles?: boolean;
}

const ONLY = process.env.SIM_PROFILE;
const ALL: Profile[] = [
  { name: 'İlk kez merge oynayan (20 dk/gün, yavaş, bulmacadan kaçınır)', minutesPerDay: 20, sessionsPerDay: 2, boughtTokensPer30d: 0, slow: 1.8, puzzles: false },
  { name: '15 dk/gün ücretsiz', minutesPerDay: 15, sessionsPerDay: 2, boughtTokensPer30d: 0 },
  { name: '60 dk/gün ücretsiz', minutesPerDay: 60, sessionsPerDay: 3, boughtTokensPer30d: 0 },
  { name: '60 dk/gün jeton harcayan', minutesPerDay: 60, sessionsPerDay: 3, boughtTokensPer30d: 0, spendEarned: true },
  { name: '60 dk/gün bağımsız mock', minutesPerDay: 60, sessionsPerDay: 3, boughtTokensPer30d: 300, mock: true },
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
  let waiting = 0, lowEnergy = 0, noBotAction = 0, deniedEarly = 0, boosts = 0;
  let demo = newDemo(0, { merges: 0, orders: 0, produced: 0 });
  const demoProvider = new MockPurchaseProvider(true);
  for (let day = 1; day <= days; day++) {
    if (prof.boughtTokensPer30d && day % 30 === 1) {
      // Mock receipts and funds stay in the independent demo profile.
      const result = demoProvider.purchase(demo, 'light.300', `sim-${day}`, 'success');
      if (result.ok) { demo = result.state; tokensBought += 300; }
    }
    const perSession = (prof.minutesPerDay * 60) / prof.sessionsPerDay;
    for (let ses = 0; ses < prof.sessionsPerDay; ses++) {
      now = (day - 1) * DAY + (ses * DAY) / prof.sessionsPerDay + 8 * 3_600_000;
      s = apply(s, { type: 'tick' }, now).state; // the app ticks on open
      let used = 0;
      let idle = 0;
      let endedByDenied = false;
      while (used < perSession) {
      if (prof.spendEarned && s.starTokens >= 35) {
        const i = s.board.findIndex(c => c.t === 'r' && c.readyAt > now + 60000);
        const cell = s.board[i];
        const running = Object.entries(s.nodes).find(([, n]) => n.readyAt > now + 60000);
        const target = i >= 0 && cell?.t === 'r' ? { id: `resource:${s.workshop.active}:${i}`, expectedReadyAt: cell.readyAt } : running ? { id: running[0], expectedReadyAt: running[1].readyAt } : null;
        if (target) { const r = apply(s, { type: 'buyConvenience', id: 'speed15', requestId: `sim-${day}-${ses}`, target }, now); if (!r.events.some(e => e.type === 'denied')) { s = r.state; boosts++; } }
      }

        const readyTask = seasonTasks(s.freeSeason).find(t => !s.freeSeason.claimedTasks.includes(t.id) && s.freeSeason.progress[t.id] >= t.target && now < s.freeSeason.start + 30 * DAY);
        const reward = Array.from({ length: Math.min(30, Math.floor(s.freeSeason.xp / 100)) }, (_, i) => i + 1).find(n => !s.freeSeason.claimedRewards.includes(n) && !(n % 3 === 2 && s.energy > 984));
        const cmd: Command = readyTask ? { type: 'claimSeasonTask', id: readyTask.id } : reward ? { type: 'claimSeasonReward', level: reward } : autoplayStep(s, now, { questsOnly: prof.questsOnly, puzzles: prof.puzzles });
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
          // The bot asked for something impossible; distinguish this from waiting.
          endedByDenied = true; idle++;
          if (process.env.SIM_DEBUG) console.log('denied', JSON.stringify(cmd), JSON.stringify(r.events), JSON.stringify({ level: s.level, regions: s.regions, node: cmd.type === 'startNode' ? s.nodes[cmd.id] : undefined }));
          if (idle > 2) break;
          now += 30_000;
          continue;
        }
        idle = 0; endedByDenied = false;
        energySpent += Math.max(0, s.energy - r.state.energy);
        s = r.state;
        const c = cost(cmd) * (prof.slow ?? 1);
        used += c;
        now += c * 1000;
      }
      if (used < perSession * 0.5) {
        stuckSessions++;
        if (endedByDenied) deniedEarly++;
        else if (s.energy < 5) lowEnergy++;
        else if (s.board.some(c => c.t === 'r' && c.readyAt > now) || Object.values(s.nodes).some(n => n.readyAt > now) || Object.values(s.farmFactories).some(n => n.readyAt > now)) waiting++;
        else noBotAction++;
      }
      if (s.board.filter((c) => c.t === 'e').length <= 1) fullBoardSessions++;
    }
    for (const r of s.regions) if (regionDay[r] === undefined) regionDay[r] = day;
    if (checkpoints.includes(day)) {
      rows.push(
        `  gün ${String(day).padStart(3)}: bölge ${Math.max(...s.regions)}  görev ${String(s.quests.done.length).padStart(2)}/${totalQuests}  bulmaca ${String(Object.keys(s.puzzles).filter((k) => k.startsWith('lp')).length).padStart(2)}/80  sv ${String(s.level).padStart(2)}  keşif ${String(s.discovered.length).padStart(3)}/${collectibleKeys().length}  altın ${String(s.leaves).padStart(5)}  temizlenen-kaynak ${s.stats.cleared}  kaynak-işi ${Object.values(s.nodes).reduce((a, n) => a + n.stage, 0)}  enerji-harcanan ${energySpent}`,
      );
    }
  }
  console.log(`\n${prof.name}${prof.boughtTokensPer30d ? ` (ayrı mock cüzdana eklenen jeton: ${tokensBought})` : ''}`);
  console.log(rows.join('\n'));
  console.log(`  bölge açılış günleri: ${Object.entries(regionDay).map(([r, d]) => `B${r}=${d}`).join(' ')}`);
  console.log(`  erken biten oturum (yapacak iş kalmadı): ${stuckSessions}`);
  console.log(`  tahtanın dolu olduğu oturum: ${fullBoardSessions}`);
  console.log(`  erken bitiş nedenleri (öncelikli sınıflama): bekleyen işler ${waiting}, düşük enerji ${lowEnergy}, reddedilen bot hamlesi ${deniedEarly}, bot eylemi yok ${noBotAction}`);
  console.log(`  kullanılan oyun içi hızlandırıcı: ${boosts}; mock cüzdandaki ayrı jeton: ${demo.tokens}`);
  console.log('  Bölge satın alma stratejisi: uygulanmadı; güvenli bölge satışı henüz yok.');
}
