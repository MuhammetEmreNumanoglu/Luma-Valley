// Which product families the seed crate offers, by player level. Shared by the crate, orders,
// shops and valley jobs (a valley building never makes a family before the player has opened it).
import { FARM_YIELD } from './farm';
import { parseItem, type FamilyId, type ItemKey } from './families';

// The crate is the early-game starter source: seeds, saplings and plots only. Natural materials
// (wood, stone, clay, crystal) never come out of it; they come from the valley.
export interface CrateEntry {
  family: FamilyId;
  level: number;
  weight: number;
}

// Player level opens crate families; each family's own merge chain (FAMILIES[].levels) is a
// separate axis, so a level-60 player still merges a 4-step cow chain. Two families at level 1
// (milk and wheat feed the first trader), eggs at 4, tomatoes at 6, then one new family every
// level or two until 15. Families added later only need an entry here (and art/i18n).
export const CRATE_POOL: readonly CrateEntry[] = [
  { family: 'cow', level: 1, weight: 1 },
  { family: 'wheatFarm', level: 1, weight: 1 },
  { family: 'chicken', level: 4, weight: 1 },
  { family: 'tomatoFarm', level: 6, weight: 1 },
  { family: 'flower', level: 8, weight: 1 },
  { family: 'fruit', level: 10, weight: 1 },
  { family: 'grain', level: 11, weight: 1 },
  { family: 'cornFarm', level: 12, weight: 1 },
  { family: 'grapeFarm', level: 13, weight: 1 },
  { family: 'pumpkinFarm', level: 14, weight: 1 },
  { family: 'melonFarm', level: 15, weight: 1 },
];

/** Opening levels before save v16. Families a player already had are kept unlocked (flag). */
export const LEGACY_CRATE_LEVELS: Readonly<Partial<Record<FamilyId, number>>> = {
  cow: 1, wheatFarm: 1, chicken: 3, tomatoFarm: 5, flower: 6, fruit: 8, grain: 10, cornFarm: 12, grapeFarm: 14, pumpkinFarm: 15, melonFarm: 18,
};


/**
 * Families that belong to a later valley region: its buildings make them as soon as the player
 * crosses the bridge (grain is the Old Mill Road's own product); the crate adds them at their level.
 */
export const REGION_NATIVE: readonly FamilyId[] = ['grain'];

/** Player level at which the family behind an item opens (harvest goods follow their source). */
export function familyOpenLevel(item: ItemKey, opts: { valley?: boolean } = {}): number {
  const { f } = parseItem(item);
  const source = CRATE_POOL.find((e) => e.family === f)
    ?? CRATE_POOL.find((e) => Object.entries(FARM_YIELD).some(([k, y]) => y.item === item && k.slice(0, k.indexOf(':')) === e.family));
  if (!source || (opts.valley && REGION_NATIVE.includes(source.family))) return 1;
  return source.level;
}
