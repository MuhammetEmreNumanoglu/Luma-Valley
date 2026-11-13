import type { ItemKey } from './families';

/**
 * Only level 4 animals and plots can be harvested; harvesting consumes the item.
 */
export interface FarmYield {
  item: ItemKey;
  n: number;
  seconds: number;
}

// Harvest of one level-4 item: enough for about two shop deliveries, so a grown animal or plot
// pays off without daily chores.
const pair = (family: string, crop: ItemKey, n: number, seconds: number): [string, FarmYield][] => [
  [`${family}:4`, { item: crop, n, seconds }],
];

export const FARM_YIELD: Record<string, FarmYield> = Object.fromEntries([
  ...pair('grain', 'flour:1', 5, 150),
  ...pair('cow', 'milk:1', 6, 180),
  ...pair('chicken', 'egg:1', 5, 150),
  ...pair('wheatFarm', 'wheatCrop:1', 5, 150),
  ...pair('tomatoFarm', 'tomatoCrop:1', 5, 150),
  ...pair('cornFarm', 'cornCrop:1', 5, 160),
  ...pair('grapeFarm', 'grapeCrop:1', 5, 160),
  ...pair('pumpkinFarm', 'pumpkinCrop:1', 5, 160),
  ...pair('melonFarm', 'melonCrop:1', 5, 160),
  ...pair('flower', 'flowerCrop:1', 5, 150),
  ...pair('fruit', 'fruitCrop:1', 5, 150),
]);

/**
 * Flowers and fruit end at level 4 (save v6). A former higher level L is worth 2 × (L − 4) harvest
 * goods in quest requirements and valley jobs, and 2 × (L − 3) when an old item is converted
 * (it also stands for the level-4 harvest it would have given).
 */
export const CAPPED_HARVEST: Readonly<Record<string, ItemKey>> = { flower: 'flowerCrop:1', fruit: 'fruitCrop:1', grain: 'flour:1' };
export const CAP_LEVEL = 4;

/** The capped-family good for an old item key, or null when the key is still valid as is. */
export function legacyHarvest(key: string): { item: ItemKey; level: number } | null {
  const i = key.indexOf(':');
  const crop = CAPPED_HARVEST[key.slice(0, i)];
  const level = Number(key.slice(i + 1));
  return crop && Number.isInteger(level) && level > CAP_LEVEL ? { item: crop, level } : null;
}

/** Families whose level-4 item is harvested (they merge with the higher combo chance). */
export const HARVEST_FAMILIES: ReadonlySet<string> = new Set(Object.keys(FARM_YIELD).map((k) => k.slice(0, k.indexOf(':'))));

/** Harvest goods (single-level items kept in the barn stock, not on the board). */
export const HARVEST_ITEMS: readonly ItemKey[] = [...new Set(Object.values(FARM_YIELD).map((y) => y.item))];

/** Legacy name kept for the board renderer: producer key → its product. */
export const FARM_OUTPUTS: Record<string, ItemKey> = Object.fromEntries(Object.entries(FARM_YIELD).map(([k, y]) => [k, y.item]));

/** The board merchant: a rotating list of jobs that turn farm goods into coins. */
export type FarmFactoryId = 'merchant' | 'grocer';
export interface FarmRecipe { inputs: { item: ItemKey; count: number }[]; seconds: number; gold: number; xp: number; tr: string; en: string }
export const FARM_RECIPES: Record<FarmFactoryId, FarmRecipe[]> = {
  merchant: [
    { inputs: [{ item: 'flower:2', count: 2 }], seconds: 45, gold: 30, xp: 4, tr: 'Kır çiçekleri', en: 'Wildflowers' },
    { inputs: [{ item: 'egg:1', count: 2 }], seconds: 60, gold: 40, xp: 5, tr: 'Taze yumurta', en: 'Fresh eggs' },
    { inputs: [{ item: 'milk:1', count: 2 }], seconds: 90, gold: 60, xp: 6, tr: 'Taze süt', en: 'Fresh milk' },
    { inputs: [{ item: 'egg:1', count: 2 }, { item: 'flower:1', count: 2 }], seconds: 180, gold: 120, xp: 10, tr: 'Köy sepeti', en: 'Village basket' },
    { inputs: [{ item: 'wheatCrop:1', count: 2 }, { item: 'milk:1', count: 1 }], seconds: 300, gold: 180, xp: 14, tr: 'Sütlü ekmek', en: 'Milk bread' },
  ],
  // The grocer turns harvested bouquets and fruit baskets into a gift basket it sells for coins.
  // The grocer's offers: the player picks one. Every harvest good has a buyer here, so no crate
  // starter (tomato, corn, grapes, pumpkins, watermelons, eggs) is a dead end.
  grocer: [
    { inputs: [{ item: 'flowerCrop:1', count: 2 }, { item: 'fruitCrop:1', count: 2 }], seconds: 180, gold: 110, xp: 14, tr: 'Çiçekli meyve sepeti', en: 'Flower and fruit basket' },
    { inputs: [{ item: 'egg:1', count: 2 }, { item: 'tomatoCrop:1', count: 2 }], seconds: 150, gold: 90, xp: 12, tr: 'Kahvaltı sepeti', en: 'Breakfast basket' },
    { inputs: [{ item: 'cornCrop:1', count: 2 }, { item: 'milk:1', count: 1 }], seconds: 180, gold: 95, xp: 12, tr: 'Mısır çorbası', en: 'Corn chowder' },
    { inputs: [{ item: 'grapeCrop:1', count: 2 }, { item: 'melonCrop:1', count: 1 }], seconds: 240, gold: 120, xp: 16, tr: 'Yaz meyvesi kasası', en: 'Summer fruit crate' },
    { inputs: [{ item: 'pumpkinCrop:1', count: 2 }, { item: 'flour:1', count: 2 }], seconds: 240, gold: 115, xp: 15, tr: 'Balkabağı turtası', en: 'Pumpkin pie' },
  ],
};

/** The trader accepts only harvested goods from the barn. */
export const TRADER_RECIPE = { inputs: [{ item: 'milk:1', count: 2 }, { item: 'wheatCrop:1', count: 2 }], seconds: 45 } as const;

/** Early trader starts with accessible flowers; wheat and milk become available at level 3. */
export const EARLY_TRADER_RECIPE = { inputs: [{ item: 'flowerCrop:1', count: 2 }], seconds: 45 } as const;
export const TRADER_LADDER = [
  { level: 1, ...EARLY_TRADER_RECIPE, xp: 0, tr: 'Çiçek siparişi', en: 'Flower order' },
  { level: 3, ...TRADER_RECIPE, xp: 0, tr: 'Süt ve buğday siparişi', en: 'Milk and wheat order' },
  { level: 9, inputs: [{ item: 'flowerCrop:1', count: 2 }, { item: 'fruitCrop:1', count: 2 }], seconds: 60, xp: 2, tr: 'Çiçek ve meyve', en: 'Flowers and fruit' },
  { level: 12, inputs: [{ item: 'egg:1', count: 2 }, { item: 'tomatoCrop:1', count: 2 }], seconds: 75, xp: 4, tr: 'Kahvaltı sepeti', en: 'Breakfast basket' },
  { level: 19, inputs: [{ item: 'cornCrop:1', count: 2 }, { item: 'grapeCrop:1', count: 2 }], seconds: 90, xp: 6, tr: 'Mısır ve üzüm', en: 'Corn and grapes' },
  { level: 25, inputs: [{ item: 'pumpkinCrop:1', count: 2 }, { item: 'melonCrop:1', count: 2 }], seconds: 120, xp: 10, tr: 'Bahçe hasadı', en: 'Garden harvest' },
] as const;
export function traderRecipeIndex(level: number): number { return TRADER_LADDER.reduce((best, tier, i) => level >= tier.level ? i : best, 0); }
export function traderRecipe(level: number) { return TRADER_LADDER[traderRecipeIndex(level)]; }
