import type { RegionDef } from './regions';

/** Visual identity is independent of seasonal cosmetics and all persisted region/quest IDs. */
export interface RegionIdentity {
  id: number;
  key: string;
  biome: RegionDef['biome'];
  label: { tr: string; en: string };
  ground?: [string, string];
  water?: string;
}
export const REGION_IDENTITIES: Readonly<Record<number, RegionIdentity>> = {
  1: { id: 1, key: 'quiet_valley', biome: 'meadow', label: { tr: 'Sakin Vadi', en: 'Quiet Valley' } },
  2: { id: 2, key: 'old_mill_road', biome: 'village', label: { tr: 'Eski Değirmen Yolu', en: 'Old Mill Road' } },
  3: { id: 3, key: 'flower_gardens', biome: 'garden', ground: ['#CFE2AD', '#9DC18D'], water: '#7DBDB8', label: { tr: 'Çiçekli Bahçeler', en: 'Flower Gardens' } },
  4: { id: 4, key: 'lakeside', biome: 'lake', ground: ['#C5D6B0', '#99B99A'], water: '#75B9C8', label: { tr: 'Göl Kıyısı', en: 'Lakeside' } },
  5: { id: 5, key: 'lantern_woods', biome: 'forest', ground: ['#B8D0A4', '#83A57D'], water: '#80BBC0', label: { tr: 'Fenerli Orman', en: 'Lantern Woods' } },
  6: { id: 6, key: 'festival_square', biome: 'village', ground: ['#D3DDB0', '#ABC69A'], water: '#7CBCC1', label: { tr: 'Festival Meydanı', en: 'Festival Square' } },
};
export function regionalIdentity(region: RegionDef): RegionIdentity | undefined { return REGION_IDENTITIES[region.id]; }

/** Restored landmarks retain existing structure IDs and save progress. */
export const REGIONAL_LANDMARK_ART: Readonly<Record<string, string>> = {
  r2_windmill: 'regional_watermill_restored', r3_house: 'regional_greenhouse',
  r4_gazebo: 'regional_lakeside_dock', r5_hut: 'regional_forest_cabin', r6_house: 'regional_festival_cafe',
};
