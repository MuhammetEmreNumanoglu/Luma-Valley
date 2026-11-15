import type { RegionDef } from './regions';

/** Visual identity is independent of seasonal cosmetics and all persisted region/quest IDs. */
export type RegionPathStyle = 'daisy' | 'cobble' | 'flagstone' | 'boardwalk' | 'moss' | 'festival';
export interface RegionIdentity {
  id: number;
  key: string;
  biome: RegionDef['biome'];
  label: { tr: string; en: string };
  ground?: [string, string];
  water?: string;
  /** Path look: bed/mid/tread colours and the detail drawn along it. */
  path?: { colors: [string, string, string]; style: RegionPathStyle };
}
export const REGION_IDENTITIES: Readonly<Record<number, RegionIdentity>> = {
  1: { id: 1, key: 'quiet_valley', biome: 'meadow', path: { colors: ['#B8925E', '#E2C796', '#F1DEB4'], style: 'daisy' }, label: { tr: 'Sakin Vadi', en: 'Quiet Valley' } },
  2: { id: 2, key: 'old_mill_road', biome: 'village', path: { colors: ['#A39886', '#CFC5B4', '#E6DED0'], style: 'cobble' }, label: { tr: 'Eski Değirmen Yolu', en: 'Old Mill Road' } },
  3: { id: 3, key: 'flower_gardens', biome: 'garden', ground: ['#CFE2AD', '#9DC18D'], water: '#7DBDB8', path: { colors: ['#C9B8A8', '#F0E4DA', '#FBF4EE'], style: 'flagstone' }, label: { tr: 'Çiçekli Bahçeler', en: 'Flower Gardens' } },
  4: { id: 4, key: 'lakeside', biome: 'lake', ground: ['#C5D6B0', '#99B99A'], water: '#75B9C8', path: { colors: ['#9C7B57', '#C9A274', '#E3C79C'], style: 'boardwalk' }, label: { tr: 'Göl Kıyısı', en: 'Lakeside' } },
  5: { id: 5, key: 'lantern_woods', biome: 'forest', ground: ['#B8D0A4', '#83A57D'], water: '#80BBC0', path: { colors: ['#7E6448', '#A68660', '#C2A57C'], style: 'moss' }, label: { tr: 'Fenerli Orman', en: 'Lantern Woods' } },
  6: { id: 6, key: 'festival_square', biome: 'village', ground: ['#D3DDB0', '#ABC69A'], water: '#7CBCC1', path: { colors: ['#A8846A', '#E2C9A6', '#F4E6CC'], style: 'festival' }, label: { tr: 'Festival Meydanı', en: 'Festival Square' } },
};
export function regionalIdentity(region: RegionDef): RegionIdentity | undefined { return REGION_IDENTITIES[region.id]; }

/**
 * Restored-only landmark overrides. Regions 1-6 now use three-stage original sprites from
 * REGIONAL_STAGED_ART in art/ids.ts, which take precedence; this map stays for future one-off art.
 * Structure IDs and saves are unchanged.
 */
export const REGIONAL_LANDMARK_ART: Readonly<Record<string, string>> = {};
