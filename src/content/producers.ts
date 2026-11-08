// Producers live on the board. Generators turn energy into items; converters turn an item that is
// dropped on them into better items. All numbers per level are data.
import type { FamilyId, ItemKey } from './families';

export type ProducerId =
  | 'merchant'
  | 'greenhouse'
  | 'workbench'
  | 'quarry'
  | 'orchard'
  | 'lanternStone'
  | 'field'
  | 'beehive'
  | 'loom'
  | 'tidepool'
  | 'geode'
  | 'oven'
  | 'kiln';

export interface OutputEntry {
  value: ItemKey;
  weight: number;
}

export interface ProducerLevel {
  /** Uses before it needs to recharge. */
  charges: number;
  /** ms per recharged use. */
  rechargeMs: number;
  /** Generators: weighted outputs. */
  outputs?: OutputEntry[];
  /** Leaves to upgrade to the next level (absent on the last level). */
  upgradeLeaves?: number;
}

export interface Recipe {
  input: ItemKey;
  output: ItemKey;
  count: number;
  /** Hidden until found; Journal shows a hint for it. */
  secret?: boolean;
}

export interface ProducerDef {
  id: ProducerId;
  kind: 'generator' | 'converter' | 'merchant';
  family: FamilyId;
  energyCost: number;
  levels: ProducerLevel[];
  recipes?: Recipe[];
}

const gen = (f: FamilyId, w1: number, w2: number, w3 = 0, w4 = 0): OutputEntry[] =>
  [
    { value: `${f}:1`, weight: w1 },
    { value: `${f}:2`, weight: w2 },
    { value: `${f}:3`, weight: w3 },
    { value: `${f}:4`, weight: w4 },
  ].filter((e) => e.weight > 0);

/** The standard 4-level generator curve; each upgrade shifts odds to higher levels and adds uses. */
function generator(id: ProducerId, family: FamilyId, upgradeBase: number): ProducerDef {
  return {
    id,
    kind: 'generator',
    family,
    energyCost: 1,
    levels: [
      { charges: 14, rechargeMs: 60_000, outputs: gen(family, 85, 15), upgradeLeaves: upgradeBase },
      { charges: 18, rechargeMs: 50_000, outputs: gen(family, 70, 26, 4), upgradeLeaves: upgradeBase * 3 },
      { charges: 22, rechargeMs: 42_000, outputs: gen(family, 58, 32, 9, 1), upgradeLeaves: upgradeBase * 8 },
      { charges: 28, rechargeMs: 35_000, outputs: gen(family, 48, 36, 13, 3) },
    ],
  };
}

export const PRODUCERS: readonly ProducerDef[] = [
  generator('greenhouse', 'flower', 60),
  generator('workbench', 'wood', 70),
  generator('quarry', 'stone', 70),
  generator('orchard', 'fruit', 90),
  {
    id: 'lanternStone',
    kind: 'generator',
    family: 'lantern',
    energyCost: 2,
    levels: [
      {
        charges: 10,
        rechargeMs: 90_000,
        outputs: [
          { value: 'lantern:1', weight: 80 },
          { value: 'memory:1', weight: 20 },
        ],
        upgradeLeaves: 150,
      },
      {
        charges: 14,
        rechargeMs: 75_000,
        outputs: [
          { value: 'lantern:1', weight: 64 },
          { value: 'lantern:2', weight: 16 },
          { value: 'memory:1', weight: 20 },
        ],
        upgradeLeaves: 500,
      },
      {
        charges: 18,
        rechargeMs: 60_000,
        outputs: [
          { value: 'lantern:1', weight: 50 },
          { value: 'lantern:2', weight: 25 },
          { value: 'memory:1', weight: 18 },
          { value: 'memory:2', weight: 7 },
        ],
      },
    ],
  },
  generator('field', 'grain', 90),
  generator('beehive', 'honey', 110),
  generator('loom', 'fabric', 120),
  generator('tidepool', 'shell', 150),
  generator('geode', 'crystal', 180),
  {
    id: 'oven',
    kind: 'converter',
    family: 'grain',
    energyCost: 1,
    levels: [
      { charges: 6, rechargeMs: 90_000, upgradeLeaves: 200 },
      { charges: 9, rechargeMs: 70_000, upgradeLeaves: 600 },
      { charges: 12, rechargeMs: 55_000 },
    ],
    recipes: [
      { input: 'grain:4', output: 'grain:5', count: 2 },
      { input: 'fruit:4', output: 'fruitCrop:1', count: 2 },
      { input: 'honey:4', output: 'grain:6', count: 1, secret: true },
    ],
  },
  {
    id: 'kiln',
    kind: 'converter',
    family: 'ceramic',
    energyCost: 1,
    levels: [
      { charges: 6, rechargeMs: 90_000, upgradeLeaves: 220 },
      { charges: 9, rechargeMs: 70_000, upgradeLeaves: 650 },
      { charges: 12, rechargeMs: 55_000 },
    ],
    recipes: [
      { input: 'stone:2', output: 'ceramic:1', count: 2 },
      { input: 'stone:4', output: 'ceramic:3', count: 2 },
      { input: 'crystal:2', output: 'ceramic:5', count: 1, secret: true },
      { input: 'shell:3', output: 'ceramic:4', count: 1, secret: true },
    ],
  },
];

export const PRODUCER: Record<ProducerId, ProducerDef> = Object.fromEntries(PRODUCERS.map((p) => [p.id, p])) as Record<
  ProducerId,
  ProducerDef
>;

// The merchant uses the established board-cell/render pipeline, but is neither owned nor
// upgradeable. It does not generate items; its work is handled by content/farm.ts.
PRODUCER.merchant = { id: 'merchant', kind: 'merchant', family: 'flower', energyCost: 0, levels: [{ charges: 0, rechargeMs: 0 }] };

export function producerLevel(id: ProducerId, level: number): ProducerLevel {
  const def = PRODUCER[id];
  return def.levels[Math.max(0, Math.min(def.levels.length - 1, level - 1))];
}

export function findRecipe(id: ProducerId, input: ItemKey): Recipe | undefined {
  return PRODUCER[id].recipes?.find((r) => r.input === input);
}
