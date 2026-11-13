// Valley buildings: renewable production restored through the story (greenhouse, orchard, barn,
// field, beehives, mill, loom, lantern stone). Pure data; rules are in engine/nodes.ts.
// The five natural materials (wood, stone, ceramic, shell, crystal) do NOT come from the valley:
// they are broken out of resource obstacles on the workshop board (content/resources.ts).
// The player picks a job whose level requirement is met; one job runs at a time; timers are
// wall-clock timestamps, so jobs keep running while the app is closed.
import { legacyHarvest } from './farm';
import type { ItemKey } from './families';
import type { ProducerId } from './producers';

export type NodeKind = 'greenhouse' | 'orchard' | 'field' | 'barn' | 'beehive' | 'shrine' | 'mill' | 'loom';

export interface Stack {
  item: ItemKey;
  n: number;
}

export interface NodeJob {
  id: string;
  energy: number;
  seconds: number;
  /** Items consumed when the job starts (processing buildings). */
  inputs?: Stack[];
  outputs: Stack[];
  /** Player level needed for this job (renewable buildings). */
  level?: number;
}

export interface NodeDef {
  id: string;
  kind: NodeKind;
  /** Kept for save compatibility; every valley source is a renewable building ('jobs'). */
  mode: 'stages' | 'jobs';
  region: number;
  /** Map position (region-local world units, ground point). */
  x: number;
  y: number;
  /** Map drawing scale. */
  s: number;
  /** Becomes usable when the player reaches this level… */
  level?: number;
  /** …and/or when this quest is completed. */
  quest?: string;
  /** Coins to build a renewable source once it is unlocked. */
  build?: number;
  /** Art: producer sprite for buildings (name and icon come from the same id). */
  producer?: ProducerId;
  jobs: NodeJob[];
}

const st = (item: ItemKey, n: number): Stack => ({ item, n });

/**
 * A renewable source's job ladder: each tier yields three-four items one level higher and costs
 * more energy and time. Higher tiers open with the player level, so late quests that ask for
 * level 8–10 items are reachable without the crate.
 */
function ladder(family: string, tiers: [level: number, energy: number, seconds: number, itemLevel: number, n: number][]): NodeJob[] {
  return tiers.map(([level, energy, seconds, l, n], i) => {
    // Flowers and fruit end at level 4: a higher tier pays their harvest goods instead.
    const capped = legacyHarvest(`${family}:${l}`);
    return { id: `t${i + 1}`, energy, seconds, level, outputs: [capped ? st(capped.item, n * 2 * (capped.level - 4)) : st(`${family}:${l}`, n)] };
  });
}

// [level, energy, seconds, item level, count]: short cheap work early, longer and pricier later.
const STD: [number, number, number, number, number][] = [
  [1, 5, 120, 1, 4],
  [8, 12, 600, 2, 4],
  [14, 22, 1200, 3, 4],
  [20, 35, 2400, 4, 4],
  [27, 50, 3600, 5, 3],
];

export const NODES: readonly NodeDef[] = [
  // ---- Region 1 · Güneş Çayırı ----------------------------------------------------------
  {
    id: 'r1_barn',
    kind: 'barn',
    mode: 'jobs',
    region: 1,
    x: 365,
    y: 300,
    s: 0.85,
    level: 5,
    build: 50,
    producer: 'field',
    jobs: [
      { id: 'chick', energy: 3, seconds: 120, outputs: [st('chicken:1', 2)] },
      { id: 'calf', energy: 5, seconds: 240, level: 7, outputs: [st('cow:1', 2)] },
      { id: 'pullet', energy: 9, seconds: 600, level: 10, outputs: [st('chicken:2', 2)] },
      { id: 'heifer', energy: 12, seconds: 900, level: 13, outputs: [st('cow:2', 2)] },
    ],
  },
  { id: 'r1_greenhouse', kind: 'greenhouse', mode: 'jobs', region: 1, x: 358, y: 160, s: 0.8, level: 2, build: 30, producer: 'greenhouse', jobs: ladder('flower', [[2, 4, 120, 1, 4], [8, 10, 600, 2, 4], [14, 18, 1200, 3, 4], [20, 28, 2400, 4, 4], [27, 40, 3600, 5, 3]]) },
  { id: 'r1_orchard', kind: 'orchard', mode: 'jobs', region: 1, x: 250, y: 680, s: 0.8, quest: 'r1_orchard', build: 80, producer: 'orchard', jobs: ladder('fruit', STD) },
  {
    id: 'r1_shrine',
    kind: 'shrine',
    mode: 'jobs',
    region: 1,
    x: 268,
    y: 500,
    s: 0.75,
    quest: 'r1_shrine',
    producer: 'lanternStone',
    jobs: [
      { id: 'glow', energy: 5, seconds: 150, outputs: [st('lantern:1', 3)] },
      { id: 'echo', energy: 6, seconds: 300, outputs: [st('memory:1', 3)] },
      { id: 'flame', energy: 12, seconds: 600, level: 10, outputs: [st('lantern:2', 3)] },
      { id: 'recall', energy: 14, seconds: 900, level: 14, outputs: [st('memory:2', 3)] },
      { id: 'blaze', energy: 24, seconds: 1800, level: 20, outputs: [st('lantern:3', 3)] },
      { id: 'keepsake', energy: 26, seconds: 2400, level: 26, outputs: [st('memory:3', 3)] },
      // Late tiers, like the other buildings' level-5 work: the finale asks for high lanterns and memories.
      { id: 'beacon', energy: 36, seconds: 3600, level: 30, outputs: [st('lantern:4', 3)] },
      { id: 'heirloom', energy: 40, seconds: 4200, level: 32, outputs: [st('memory:4', 3)] },
    ],
  },

  // ---- Region 2 · Bal Rüzgârı Köyü ------------------------------------------------------
  {
    id: 'r2_mill',
    kind: 'mill',
    mode: 'jobs',
    region: 2,
    x: 150,
    y: 150,
    s: 0.75,
    quest: 'r2_windmill1',
    producer: 'oven',
    jobs: [
      { id: 'flour', energy: 1, seconds: 180, inputs: [st('wheatCrop:1', 1)], outputs: [st('grain:2', 1)] },
      { id: 'sack', energy: 3, seconds: 600, level: 12, inputs: [st('wheatCrop:1', 2)], outputs: [st('grain:3', 1)] },
    ],
  },
  { id: 'r2_field', kind: 'field', mode: 'jobs', region: 2, x: 30, y: 300, s: 0.8, quest: 'r1_bridge3', build: 100, producer: 'field', jobs: ladder('grain', STD) },
  { id: 'r2_beehive', kind: 'beehive', mode: 'jobs', region: 2, x: 260, y: 125, s: 0.75, quest: 'r2_bees', build: 120, producer: 'beehive', jobs: ladder('honey', STD) },
  {
    id: 'r2_loom',
    kind: 'loom',
    mode: 'jobs',
    region: 2,
    x: 250,
    y: 790,
    s: 0.75,
    quest: 'r2_loom',
    producer: 'loom',
    jobs: [
      { id: 'thread', energy: 2, seconds: 150, inputs: [st('flower:2', 1)], outputs: [st('fabric:1', 2)] },
      { id: 'cloth', energy: 6, seconds: 600, level: 14, inputs: [st('flower:4', 1)], outputs: [st('fabric:3', 2)] },
      { id: 'bolt', energy: 12, seconds: 1800, level: 20, outputs: [st('fabric:3', 2)] },
      { id: 'tapestry', energy: 24, seconds: 3600, level: 26, outputs: [st('fabric:4', 3)] },
    ],
  },
];

/** Valley sources removed in save v5 (their materials moved to workshop obstacles). */
export const RETIRED_NODES: Record<string, { build: number }> = {
  r1_quarry: { build: 60 },
  r1_woodlot: { build: 40 },
  r2_claypit: { build: 120 },
  r3_tidepool: { build: 160 },
  r4_grotto: { build: 200 },
};

export const NODE: Record<string, NodeDef> = Object.fromEntries(NODES.map((n) => [n.id, n]));

/** Valley sources a quest unlocks (shown as the quest's reward). */
export function nodesUnlockedBy(questId: string): NodeDef[] {
  return NODES.filter((n) => n.quest === questId);
}

/** Item families a node can yield (used for "where does this come from?" and orders). */
export function nodeFamilies(n: NodeDef): string[] {
  const out = new Set<string>();
  for (const j of n.jobs) for (const o of j.outputs) out.add(o.item.slice(0, o.item.indexOf(':')));
  return [...out];
}
