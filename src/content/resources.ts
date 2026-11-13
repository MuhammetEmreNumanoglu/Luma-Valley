// Workshop resource obstacles: big rocks, log piles, ceramic heaps, shell clusters and crystal
// formations that sit on one board cell. Each is broken in three timed stages (energy + wall-clock
// time), pays its material each stage and frees the cell after the last one. Only these five
// material families work this way; ordinary items (animals, plants, food…) never do.
import type { FamilyId } from './families';

export type ResourceKind = 'wood' | 'stone' | 'ceramic' | 'shell' | 'crystal';

export interface ResourceStage {
  energy: number;
  seconds: number;
  /** Items of the obstacle's tier paid when the stage is collected. */
  yield: number;
}

export interface ResourceDef {
  kind: ResourceKind;
  family: FamilyId;
  /** Region that must be open before supplies of this kind arrive. */
  region: number;
  /** Stage 1 (3/3 → 2/3), stage 2 (2/3 → 1/3), stage 3 (1/3 → cleared). */
  stages: [ResourceStage, ResourceStage, ResourceStage];
}

const S = (energy: number, minutes: number, y: number): ResourceStage => ({ energy, seconds: minutes * 60, yield: y });

export const RESOURCES: Record<ResourceKind, ResourceDef> = {
  // The reference rock: 30 energy, 16 minutes, 25 stone, one freed cell.
  stone: { kind: 'stone', family: 'stone', region: 1, stages: [S(5, 1, 5), S(10, 5, 8), S(15, 10, 12)] },
  wood: { kind: 'wood', family: 'wood', region: 1, stages: [S(4, 1, 5), S(8, 4, 8), S(12, 8, 12)] },
  ceramic: { kind: 'ceramic', family: 'ceramic', region: 2, stages: [S(6, 2, 4), S(12, 6, 6), S(18, 12, 9)] },
  shell: { kind: 'shell', family: 'shell', region: 3, stages: [S(5, 2, 4), S(10, 6, 7), S(15, 12, 10)] },
  crystal: { kind: 'crystal', family: 'crystal', region: 4, stages: [S(8, 3, 3), S(14, 8, 5), S(20, 15, 8)] },
};

export const RESOURCE_KINDS: readonly ResourceKind[] = ['stone', 'wood', 'ceramic', 'shell', 'crystal'];

export function isResourceFamily(f: string): f is ResourceKind {
  return (RESOURCE_KINDS as readonly string[]).includes(f);
}

/**
 * Obstacle tier from the player level when it is placed: tier n pays `family:n` items, so late
 * quests that ask for high levels stay reachable. Energy grows with the tier.
 */
export function resourceTier(level: number): number {
  return level >= 26 ? 4 : level >= 18 ? 3 : level >= 10 ? 2 : 1;
}

/** Player level at which the next obstacle tier starts, or null at the top tier. */
export function nextTierLevel(level: number): number | null {
  return [10, 18, 26].find((l) => l > level) ?? null;
}

export function stageEnergy(kind: ResourceKind, stage: number, tier: number): number {
  return Math.round(RESOURCES[kind].stages[stage].energy * (1 + 0.5 * (tier - 1)));
}

/**
 * Supply: new obstacles are not dropped on the player's board automatically. A delivery charge
 * refills over time (and with each level); the player chooses when and which kind to place, and it
 * lands on a free edge cell. The cap keeps cleared space from being refilled behind their back.
 */
export const SUPPLY = {
  max: 3,
  /** ms per refilled delivery. */
  regenMs: 15 * 60_000,
  start: 1,
  /** Obstacles allowed on one board at a time (placed or original). */
  perBoard: 6,
};
