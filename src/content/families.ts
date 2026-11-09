// Production families (merge chains). Pure data: adding a family needs no engine change, only
// an entry here, names in src/i18n/content.ts and a drawer in src/render/items/.

export type FamilyId =
  | 'flower'
  | 'wood'
  | 'stone'
  | 'grain'
  | 'fruit'
  | 'honey'
  | 'fabric'
  | 'ceramic'
  | 'lantern'
  | 'shell'
  | 'crystal'
  | 'memory' | 'cow' | 'chicken' | 'wheatFarm' | 'tomatoFarm' | 'cornFarm' | 'grapeFarm' | 'pumpkinFarm' | 'melonFarm' | 'grapeCrop' | 'pumpkinCrop' | 'melonCrop' | 'milk' | 'egg' | 'wheatCrop' | 'tomatoCrop' | 'cornCrop' | 'flowerCrop' | 'fruitCrop' | 'coin' | 'starCoin';

export interface FamilyDef {
  id: FamilyId;
  /** Number of levels in the chain (8–12). */
  levels: number;
  /** Base colour used by UI chips and particles. */
  color: string;
  /** Region where the family first appears (1-based). */
  region: number;
}

export const FAMILIES: readonly FamilyDef[] = [
  // Flowers and fruit stop at level 4 and are harvested there (content/farm.ts), like animals.
  { id: 'flower', levels: 4, color: '#E98AA8', region: 1 },
  { id: 'wood', levels: 10, color: '#B07A4A', region: 1 },
  { id: 'stone', levels: 10, color: '#9AA3A8', region: 1 },
  { id: 'fruit', levels: 4, color: '#E8644A', region: 1 },
  { id: 'lantern', levels: 8, color: '#F2B544', region: 1 },
  { id: 'grain', levels: 10, color: '#E3B85C', region: 2 },
  { id: 'honey', levels: 9, color: '#F0A72E', region: 2 },
  { id: 'fabric', levels: 9, color: '#7FA7C9', region: 2 },
  { id: 'ceramic', levels: 9, color: '#D98B5F', region: 2 },
  { id: 'shell', levels: 9, color: '#F2C9B8', region: 3 },
  { id: 'crystal', levels: 9, color: '#8FD3E8', region: 4 },
  { id: 'memory', levels: 8, color: '#B9A3E3', region: 1 },
  { id: 'cow', levels: 4, color: '#A76F49', region: 1 },
  { id: 'chicken', levels: 4, color: '#E7B44C', region: 1 },
  { id: 'wheatFarm', levels: 4, color: '#D8B25D', region: 1 },
  { id: 'tomatoFarm', levels: 4, color: '#D66B54', region: 1 },
  { id: 'cornFarm', levels: 4, color: '#D7B64C', region: 1 },
  // Grape (purple clusters), pumpkin (orange ribbed globe), watermelon (green striped oval):
  // distinct at a glance by colour and shape. Save v7 renamed beans, barley and lentils to these.
  { id: 'grapeFarm', levels: 4, color: '#7A3E9D', region: 1 },
  { id: 'pumpkinFarm', levels: 4, color: '#F2861E', region: 1 },
  { id: 'melonFarm', levels: 4, color: '#2F7D32', region: 1 },
  { id: 'grapeCrop', levels: 1, color: '#7A3E9D', region: 1 },
  { id: 'pumpkinCrop', levels: 1, color: '#F2861E', region: 1 },
  { id: 'melonCrop', levels: 1, color: '#2F7D32', region: 1 },
  { id: 'milk', levels: 1, color: '#D9ECEA', region: 1 },
  { id: 'egg', levels: 1, color: '#F2E4C8', region: 1 },
  { id: 'wheatCrop', levels: 1, color: '#E3B85C', region: 1 },
  { id: 'tomatoCrop', levels: 1, color: '#D66B54', region: 1 },
  { id: 'cornCrop', levels: 1, color: '#D7B64C', region: 1 },
  { id: 'flowerCrop', levels: 1, color: '#E98AA8', region: 1 },
  { id: 'fruitCrop', levels: 1, color: '#E8644A', region: 1 },
  { id: 'starCoin', levels: 4, color: '#8FD3E8', region: 1 },
  { id: 'coin', levels: 8, color: '#E6AD37', region: 1 },
];

export const FAMILY: Record<FamilyId, FamilyDef> = Object.fromEntries(FAMILIES.map((f) => [f.id, f])) as Record<FamilyId, FamilyDef>;

/** Item key "family:level", e.g. "flower:3". Compact, stable and readable in saves. */
export type ItemKey = string;

export function itemKey(f: FamilyId, l: number): ItemKey {
  return `${f}:${l}`;
}

export function parseItem(key: ItemKey): { f: FamilyId; l: number } {
  const i = key.indexOf(':');
  return { f: key.slice(0, i) as FamilyId, l: Number(key.slice(i + 1)) };
}

export function isValidItem(key: ItemKey): boolean {
  const { f, l } = parseItem(key);
  const fam = FAMILY[f];
  return !!fam && Number.isInteger(l) && l >= 1 && l <= fam.levels;
}

export function isMaxLevel(key: ItemKey): boolean {
  const { f, l } = parseItem(key);
  return l >= FAMILY[f].levels;
}

export function allItemKeys(): ItemKey[] {
  const out: ItemKey[] = [];
  for (const f of FAMILIES) for (let l = 1; l <= f.levels; l++) out.push(itemKey(f.id, l));
  return out;
}
