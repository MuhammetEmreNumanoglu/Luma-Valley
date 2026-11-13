// Achievements: a stat, a threshold and a token reward. Checked after every command.
import type { GameState } from '../engine/types';

export interface AchievementDef {
  id: string;
  /** Coin reward. */
  coins: number;
  value: (s: GameState) => number;
  target: number;
}

// The third column was a Light Token count before v5; rewards are now coins at the same value.
const A = (id: string, target: number, tokens: number, value: (s: GameState) => number): AchievementDef => ({ id, target, coins: tokens * 30, value });

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  A('merge10', 10, 1, (s) => s.stats.merges),
  A('merge100', 100, 3, (s) => s.stats.merges),
  A('merge500', 500, 5, (s) => s.stats.merges),
  A('merge2000', 2000, 10, (s) => s.stats.merges),
  A('five10', 3, 2, (s) => s.stats.cleared ?? 0),
  A('five100', 25, 5, (s) => s.stats.cleared ?? 0),
  A('discover20', 20, 2, (s) => s.discovered.length),
  A('discover50', 50, 5, (s) => s.discovered.length),
  A('discover100', 100, 10, (s) => s.discovered.length),
  A('puzzle1', 1, 1, (s) => s.stats.puzzles),
  A('puzzle10', 10, 3, (s) => s.stats.puzzles),
  A('puzzle40', 40, 6, (s) => s.stats.puzzles),
  A('puzzle80', 80, 12, (s) => s.stats.puzzles),
  A('stars25', 25, 4, (s) => s.stats.threeStars),
  A('bridge', 1, 2, (s) => (s.quests.done.includes('r1_bridge3') ? 1 : 0)),
  A('region1', 1, 3, (s) => (s.regions.includes(2) ? 1 : 0)),
  A('region3', 1, 4, (s) => (s.regions.includes(3) ? 1 : 0)),
  A('region5', 1, 6, (s) => (s.regions.includes(5) ? 1 : 0)),
  A('region7', 1, 8, (s) => (s.regions.includes(7) ? 1 : 0)),
  A('friends', 5, 3, (s) => ['lumi', 'mira', 'ada', 'bera', 'niko'].filter((c) => s.metChars.includes(c)).length),
  A('structures10', 10, 3, (s) => s.stats.structures),
  A('structures40', 40, 6, (s) => s.stats.structures),
  A('orders25', 25, 3, (s) => s.stats.orders),
  A('orders200', 200, 8, (s) => s.stats.orders),
  A('memories5', 5, 3, (s) => s.memories.length),
  A('secret', 1, 3, (s) => s.recipesFound.length),
  A('level10', 10, 4, (s) => s.level),
  A('level25', 25, 8, (s) => s.level),
  A('finale', 1, 15, (s) => (s.quests.done.includes('r7_great2') ? 1 : 0)),
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
