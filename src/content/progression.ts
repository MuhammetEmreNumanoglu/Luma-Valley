// Progression data shared by the engine and the UI (level modal, collection book, crate info),
// so what the player is promised is exactly what the engine grants.
import { BALANCE } from './balance';
import { FAMILIES, parseItem, type FamilyId, type ItemKey } from './families';
import { NODES } from './valley';

// ---- Seed crate ------------------------------------------------------------------------------
// The crate is the early-game starter source: seeds, saplings and plots only. Natural materials
// (wood, stone, clay, crystal) never come out of it; they come from the valley.
export interface CrateEntry {
  family: FamilyId;
  level: number;
  weight: number;
}

export const CRATE_POOL: readonly CrateEntry[] = [
  { family: 'flower', level: 1, weight: 3 },
  { family: 'wheatFarm', level: 2, weight: 2 },
  { family: 'chicken', level: 2, weight: 2 },
  { family: 'cow', level: 3, weight: 2 },
  { family: 'fruit', level: 3, weight: 2 },
  { family: 'tomatoFarm', level: 4, weight: 2 },
  { family: 'grain', level: 5, weight: 2 },
  { family: 'cornFarm', level: 6, weight: 2 },
  { family: 'beanFarm', level: 8, weight: 1 },
  { family: 'barleyFarm', level: 9, weight: 1 },
  { family: 'lentilFarm', level: 10, weight: 1 },
];

export function cratePool(level: number): CrateEntry[] {
  return CRATE_POOL.filter((e) => e.level <= level);
}

// ---- Collection ------------------------------------------------------------------------------
/** Families that are currency, not collectibles. */
export const NOT_COLLECTIBLE: readonly FamilyId[] = ['coin', 'starCoin'];

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic';

const COIN_BY_LEVEL = [5, 8, 12, 20, 30, 45, 70, 110, 160, 250];

export function isCollectible(key: ItemKey): boolean {
  return !NOT_COLLECTIBLE.includes(parseItem(key).f);
}

export function rarityOf(key: ItemKey): Rarity {
  const { f, l } = parseItem(key);
  const fam = FAMILIES.find((x) => x.id === f);
  // Short chains (animals, plots: 4 levels) reach "rare" at their top.
  const rel = fam && fam.levels <= 4 ? l * 2 : l;
  return rel >= 8 ? 'epic' : rel >= 6 ? 'rare' : rel >= 4 ? 'uncommon' : 'common';
}

/** One-time reward for the first discovery of an item (paid when the player taps Collect). */
export function collectionReward(key: ItemKey): { coins: number } {
  const { l } = parseItem(key);
  const r = rarityOf(key);
  return { coins: COIN_BY_LEVEL[Math.max(0, Math.min(COIN_BY_LEVEL.length - 1, l - 1))] + (r === 'rare' ? 15 : r === 'epic' ? 40 : 0) };
}

export function collectibleKeys(): ItemKey[] {
  const out: ItemKey[] = [];
  for (const f of FAMILIES) {
    if (NOT_COLLECTIBLE.includes(f.id)) continue;
    for (let l = 1; l <= f.levels; l++) out.push(`${f.id}:${l}`);
  }
  return out;
}

// ---- Levels ----------------------------------------------------------------------------------
export interface LevelReward {
  coins: number;
  energy: number;
  crates: number;
  /** Resource deliveries (workshop obstacles) added. */
  supplies: number;
}

/** What reaching `level` grants (single source for engine/state.addXp and the level modal). */
export function levelReward(level: number): LevelReward {
  return {
    coins: BALANCE.levelUpLeaves(level),
    energy: BALANCE.energy.levelUpRefill,
    crates: BALANCE.crate.levelUpBonus,
    supplies: 1,
  };
}

export type Unlock =
  | { kind: 'crate'; family: FamilyId }
  | { kind: 'node'; node: string }
  | { kind: 'job'; node: string; job: string; item: ItemKey };

/** Content that becomes available exactly at `level` (not counting quest unlocks). */
export function levelUnlocks(level: number): Unlock[] {
  const out: Unlock[] = [];
  for (const e of CRATE_POOL) if (e.level === level && level > 1) out.push({ kind: 'crate', family: e.family });
  for (const n of NODES) {
    if (n.level === level && level > 1 && !n.quest) out.push({ kind: 'node', node: n.id });
    // A building that itself opens at this level is listed once, not again for its first job.
    if (n.mode === 'jobs' && n.level !== level) for (const j of n.jobs) if (j.level === level && level > 1) out.push({ kind: 'job', node: n.id, job: j.id, item: j.outputs[0].item });
  }
  return out;
}
