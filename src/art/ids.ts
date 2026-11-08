// Central sprite registry mapping: game ids (item keys, producer ids, structure types and
// restoration progress, map props) → art sprite ids in `registry.generated.ts`.
// Pure and Skia-free so tests can check that every game id has art.
import type { ItemKey } from '../content/families';
import type { ProducerId } from '../content/producers';
import type { RegionDef, StructureType } from '../content/regions';
import type { DecorKind } from '../content/decorations';

export function itemArtId(key: ItemKey): string {
  if (key.startsWith('starCoin:')) return 'item_crystal_1';
  const i = key.indexOf(':');
  return `item_${key.slice(0, i)}_${key.slice(i + 1)}`;
}

export function producerArtId(id: ProducerId): string {
  return `producer_${id}`;
}

/** Restoration stage sprite: 0 = ruin, 1 = under repair, 2 = restored. */
export function structureStage(k: number): 0 | 1 | 2 {
  if (k >= 1) return 2;
  if (k <= 0) return 0;
  return 1;
}

export function structureArtId(type: StructureType, k: number, v = 0): string {
  const t = type === 'house' ? `house${((v % 4) + 4) % 4}` : type;
  return `st_${t}_${structureStage(k)}`;
}

/** Map units per Kenney grid unit for each structure type (base footprint ≈ 110 map units). */
export const STRUCTURE_SCALE: Partial<Record<StructureType, number>> = {
  bridge: 44,
  boat: 50,
  dock: 50,
  bigtree: 46,
  lamppost: 44,
  beacon: 46,
  greatlantern: 50,
  stonepath: 54,
  garden: 48,
};
export const STRUCTURE_SCALE_DEFAULT = 46;

/** Trees per biome (prop sprite ids). */
export const BIOME_TREES: Record<RegionDef['biome'], string[]> = {
  meadow: ['prop_tree_round', 'prop_tree_oak', 'prop_tree_fat'],
  village: ['prop_tree_round', 'prop_tree_fat', 'prop_tree_tall'],
  harbor: ['prop_tree_palm', 'prop_tree_round'],
  forest: ['prop_tree_fall', 'prop_tree_fall2', 'prop_tree_pine', 'prop_tree_fall'],
  hills: ['prop_tree_pine', 'prop_tree_pine2', 'prop_tree_tall'],
  lake: ['prop_tree_lake', 'prop_tree_pine2', 'prop_tree_tall'],
  garden: ['prop_tree_blossom', 'prop_tree_blossom2', 'prop_tree_round'],
};
export const PROP_SMALL = { bush: 'prop_bush', bushFlower: 'prop_bush_flower', bushLarge: 'prop_bush_large', rock: 'prop_rock', rockSmall: 'prop_rock_small', flowers: 'prop_flowers', mushrooms: 'prop_mushrooms', stump: 'prop_stump', logs: 'prop_logs', grass: 'prop_grass' } as const;
/** Map units per Kenney unit for props. */
export const PROP_SCALE = 30;

export function decorationArtId(kind: DecorKind): string {
  return `prop_deco_${kind}`;
}

/** Old procedural sprite ids ('item.flower:3', 'producer.orchard') → art ids, for <Sprite>. */
export function artIdForSprite(id: string): string | null {
  // The leaf currency became coins (save v4): every coin amount shows the gold coin.
  if (id === 'icon.leaf' || id === 'icon.coin') return 'item_coin_1';
  if (id.startsWith('item.starCoin:')) return 'icon_token';
  if (id.startsWith('item.')) return itemArtId(id.slice(5));
  if (id.startsWith('producer.')) return `producer_${id.slice(9)}`;
  if (id.startsWith('icon.')) return `icon_${id.slice(5)}`;
  if (id.startsWith('deco.')) return `prop_deco_${id.slice(5)}`;
  if (id.startsWith('prop.')) return `prop_${id.slice(5)}`;
  if (id.startsWith('portrait.')) return `portrait_${id.slice(9).replace('.', '_')}`;
  return null;
}
