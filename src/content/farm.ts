import type { ItemKey } from './families';

/**
 * Only level 4 animals and plots can be harvested; harvesting consumes the item.
 */
export interface FarmYield {
  item: ItemKey;
  n: number;
  seconds: number;
}

const pair = (family: string, crop: ItemKey, _slow: number, fast: number): [string, FarmYield][] => [
  [`${family}:4`, { item: crop, n: 2, seconds: fast }],
];

export const FARM_YIELD: Record<string, FarmYield> = Object.fromEntries([
  ...pair('cow', 'milk:1', 240, 180),
  ...pair('chicken', 'egg:1', 180, 150),
  ...pair('wheatFarm', 'wheatCrop:1', 200, 150),
  ...pair('tomatoFarm', 'tomatoCrop:1', 200, 150),
  ...pair('cornFarm', 'cornCrop:1', 220, 160),
  ...pair('beanFarm', 'beanCrop:1', 220, 160),
  ...pair('barleyFarm', 'barleyCrop:1', 220, 160),
  ...pair('lentilFarm', 'lentilCrop:1', 220, 160),
  ...pair('flower', 'flowerCrop:1', 200, 150),
  ...pair('fruit', 'fruitCrop:1', 200, 150),
]);

/**
 * Flowers and fruit end at level 4 (save v6). A former higher level L is worth 2 × (L − 4) harvest
 * goods in quest requirements and valley jobs, and 2 × (L − 3) when an old item is converted
 * (it also stands for the level-4 harvest it would have given).
 */
export const CAPPED_HARVEST: Readonly<Record<string, ItemKey>> = { flower: 'flowerCrop:1', fruit: 'fruitCrop:1' };
export const CAP_LEVEL = 4;

/** The capped-family good for an old item key, or null when the key is still valid as is. */
export function legacyHarvest(key: string): { item: ItemKey; level: number } | null {
  const i = key.indexOf(':');
  const crop = CAPPED_HARVEST[key.slice(0, i)];
  const level = Number(key.slice(i + 1));
  return crop && Number.isInteger(level) && level > CAP_LEVEL ? { item: crop, level } : null;
}

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
  grocer: [
    { inputs: [{ item: 'flowerCrop:1', count: 2 }, { item: 'fruitCrop:1', count: 2 }], seconds: 180, gold: 90, xp: 12, tr: 'Çiçekli meyve sepeti', en: 'Flower and fruit basket' },
  ],
};

/** The trader accepts only harvested goods from the barn. */
export const TRADER_RECIPE = { inputs: [{ item: 'milk:1', count: 2 }, { item: 'wheatCrop:1', count: 2 }], seconds: 120 } as const;
