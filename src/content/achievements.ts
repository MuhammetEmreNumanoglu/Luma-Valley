// Achievements: a stat, a threshold and a token reward. Checked after every command.
import type { GameState } from '../engine/types';

export interface AchievementDef {
  id: string;
  /** Coin reward. */
  coins: number;
  value: (s: GameState) => number;
  target: number;
}

// Gold per achievement follows effort, not a flat token count: a few merges or a first puzzle pay
// a token amount, long goals (2,000 merges, 80 puzzles, the finale) pay several sessions' income.
// Bronze/silver/gold stages pay ×1/×2/×4 of this base (ACHIEVEMENT_STAGES). Stage ids are the
// ledger ids, so stages claimed before this change are never paid again (no retroactive top-up).
const A = (id: string, target: number, coins: number, value: (s: GameState) => number): AchievementDef => ({ id, target, coins, value });

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  A('merge10', 10, 10, (s) => s.stats.merges),
  A('merge100', 100, 60, (s) => s.stats.merges),
  A('merge500', 500, 200, (s) => s.stats.merges),
  A('merge2000', 2000, 600, (s) => s.stats.merges),
  A('five10', 3, 20, (s) => s.stats.cleared ?? 0),
  A('five100', 25, 120, (s) => s.stats.cleared ?? 0),
  A('discover20', 20, 30, (s) => s.discovered.length),
  A('discover50', 50, 120, (s) => s.discovered.length),
  A('discover100', 100, 400, (s) => s.discovered.length),
  A('puzzle1', 1, 10, (s) => s.stats.puzzles),
  A('puzzle10', 10, 50, (s) => s.stats.puzzles),
  A('puzzle40', 40, 200, (s) => s.stats.puzzles),
  A('puzzle80', 80, 500, (s) => s.stats.puzzles),
  A('stars25', 25, 150, (s) => s.stats.threeStars),
  A('bridge', 1, 60, (s) => (s.quests.done.includes('r1_bridge3') ? 1 : 0)),
  A('region1', 1, 100, (s) => (s.regions.includes(2) ? 1 : 0)),
  A('region3', 1, 200, (s) => (s.regions.includes(3) ? 1 : 0)),
  A('region5', 1, 400, (s) => (s.regions.includes(5) ? 1 : 0)),
  A('region7', 1, 700, (s) => (s.regions.includes(7) ? 1 : 0)),
  A('friends', 5, 60, (s) => ['lumi', 'mira', 'ada', 'bera', 'niko'].filter((c) => s.metChars.includes(c)).length),
  A('structures10', 10, 60, (s) => s.stats.structures),
  A('structures40', 40, 250, (s) => s.stats.structures),
  A('orders25', 25, 100, (s) => s.stats.orders),
  A('orders200', 200, 500, (s) => s.stats.orders),
  A('memories5', 5, 80, (s) => s.memories.length),
  A('secret', 1, 60, (s) => s.recipesFound.length),
  A('level10', 10, 100, (s) => s.level),
  A('level25', 25, 400, (s) => s.level),
  A('finale', 1, 1200, (s) => (s.quests.done.includes('r7_great2') ? 1 : 0)),
];

/** Existing achievement IDs remain the gold marker so old saves never pay again. */
export function achievementProgress(a: AchievementDef, s: GameState): { value: number; targets: [number, number, number] } {
  if (a.id === 'bridge' || a.id === 'region1') {
    const value = ['r1_bridge1', 'r1_bridge2', 'r1_bridge3'].filter(id => s.quests.done.includes(id)).length;
    return { value, targets: [1, 2, 3] };
  }
  if (a.id.startsWith('region')) {
    const end = Number(a.id.slice(6));
    const region = Math.max(...s.regions);
    return { value: region, targets: [Math.max(2, end - 2), Math.max(2, end - 1), end] };
  }
  if (a.id === 'finale') return { value: ['r7_statue', 'r7_great1', 'r7_great2'].filter(id => s.quests.done.includes(id)).length, targets: [1, 2, 3] };
  if (a.id === 'secret') return { value: s.recipesFound.length, targets: [1, 2, 3] };
  return { value: a.value(s), targets: [Math.max(1, Math.ceil(a.target / 3)), Math.max(2, Math.ceil(a.target * 2 / 3)), Math.max(3, a.target)] };
}

export const ACHIEVEMENT_STAGES = [
  { key: 'bronze', multiplier: 1, stars: 1 },
  { key: 'silver', multiplier: 2, stars: 3 },
  { key: 'gold', multiplier: 4, stars: 9 },
] as const;
export function achievementStageId(id: string, stage: number): string {
  return `${id}:${ACHIEVEMENT_STAGES[stage].key}`;
}
