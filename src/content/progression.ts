// Progression data shared by the engine and the UI (level modal, collection book, crate info),
// so what the player is promised is exactly what the engine grants.
import { BALANCE } from './balance';
import { FAMILIES, parseItem, type FamilyId, type ItemKey } from './families';
import { resourceTier } from './resources';
import { NODES } from './valley';

// ---- Seed crate ------------------------------------------------------------------------------
// The table lives in ./cratePool (valley jobs read it too, without an import cycle).
import { CRATE_POOL, type CrateEntry } from './cratePool';
export { CRATE_POOL, LEGACY_CRATE_LEVELS, familyOpenLevel, type CrateEntry } from './cratePool';

/** Flag that keeps a family in the crate even if its opening level moved up later. */
export const crateFamilyFlag = (family: FamilyId) => `crateFamily:${family}`;
/** Flag set once the "new product unlocked" card for a family has been shown. */
export const newFamilySeenFlag = (family: FamilyId) => `newFamilySeen:${family}`;

export function cratePool(level: number, flags?: Readonly<Record<string, boolean>>): CrateEntry[] {
  return CRATE_POOL.filter((e) => e.level <= level || !!flags?.[crateFamilyFlag(e.family)]);
}

/** Crate families for a save (level plus families kept from older saves). */
export function cratePoolFor(s: { level: number; flags: Readonly<Record<string, boolean>> }): CrateEntry[] {
  return cratePool(s.level, s.flags);
}

/** Exact base odds per family for the crate (equal weights; shown in tests and the UI). */
export function crateOdds(pool: readonly CrateEntry[]): { family: FamilyId; p: number }[] {
  const total = pool.reduce((n, e) => n + e.weight, 0);
  return pool.map((e) => ({ family: e.family, p: total ? e.weight / total : 0 }));
}

/** Families whose first unlock card has not been shown yet (level-1 starters never show one). */
export function unseenNewFamilies(s: { level: number; flags: Readonly<Record<string, boolean>> }): FamilyId[] {
  return cratePoolFor(s).filter((e) => e.level > 1 && !s.flags[newFamilySeenFlag(e.family)]).map((e) => e.family);
}

// ---- Collection ------------------------------------------------------------------------------
/** Families that are currency, not collectibles. */
export const NOT_COLLECTIBLE: readonly FamilyId[] = ['coin', 'starCoin', 'energyOrb'];

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic';

/** First-discovery gold: grows ×1.85 per merge level (a level-n item costs ~2.3^(n−1) level-one
 * items with combo merges), plus a fixed bonus for rarity. Never below the pre-v16 reward. */
export const COLLECTION_CURVE = { base: 10, growth: 1.85, rarityBonus: { common: 0, uncommon: 10, rare: 40, epic: 100 } } as const;

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
  const { base, growth, rarityBonus } = COLLECTION_CURVE;
  return { coins: Math.round(base * Math.pow(growth, Math.max(0, l - 1))) + rarityBonus[rarityOf(key)] };
}

/** Reward before save v16 (kept for the comparison table and tests). */
export function legacyCollectionReward(key: ItemKey): number {
  const COIN_BY_LEVEL = [5, 8, 12, 20, 30, 45, 70, 110, 160, 250];
  const { l } = parseItem(key);
  const r = rarityOf(key);
  return 2 * (COIN_BY_LEVEL[Math.max(0, Math.min(COIN_BY_LEVEL.length - 1, l - 1))] + (r === 'rare' ? 15 : r === 'epic' ? 40 : 0));
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
    energy: BALANCE.energy.levelUpRefill(level),
    crates: BALANCE.crate.levelUpBonus(level),
    supplies: 1,
  };
}

export type Unlock =
  | { kind: 'crate'; family: FamilyId }
  | { kind: 'node'; node: string }
  | { kind: 'job'; node: string; job: string; item: ItemKey }
  /** Workshop resources placed from this level pay this material tier. */
  | { kind: 'tier'; tier: number };

/** Content that becomes available exactly at `level` (not counting quest unlocks). */
export function levelUnlocks(level: number): Unlock[] {
  const out: Unlock[] = [];
  for (const e of CRATE_POOL) if (e.level === level && level > 1) out.push({ kind: 'crate', family: e.family });
  for (const n of NODES) {
    if (n.level === level && level > 1 && !n.quest) out.push({ kind: 'node', node: n.id });
    // A building that itself opens at this level is listed once, not again for its first job.
    if (n.mode === 'jobs' && n.level !== level) for (const j of n.jobs) if (j.level === level && level > 1) out.push({ kind: 'job', node: n.id, job: j.id, item: j.outputs[0].item });
  }
  if (level > 1 && resourceTier(level) > resourceTier(level - 1)) out.push({ kind: 'tier', tier: resourceTier(level) });
  return out;
}

/** The first level above `level` that unlocks something, so "what's next" is never empty. */
export function nextUnlockLevel(level: number, limit = 60): number | null {
  for (let l = level + 1; l <= limit; l++) if (levelUnlocks(l).length) return l;
  return null;
}
