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
  /** Three-stage sprites (ruin, repairing, restored): landmark and crossing structure ids. */
  art?: { landmark: string; crossing: string };
  /** Region-specific life (animals, lights, flags), region-local, drawn by render/ambient.ts. */
  life?: readonly RegionLife[];
}
/** Ambient kinds a region can use for its own life (keys of render/ambient.ts AMB). */
export type RegionLifeKind = 'butterfly' | 'bee' | 'firefly' | 'birds' | 'duck' | 'reeds' | 'flag' | 'festivalLights' | 'sparkle';
/** One ambient spot; `rich` spots are only drawn at high quality. */
export interface RegionLife { kind: RegionLifeKind; x: number; y: number; scale?: number; seed: number; rich?: boolean }
export const REGION_IDENTITIES: Readonly<Record<number, RegionIdentity>> = {
  1: { id: 1, key: 'quiet_valley', biome: 'meadow', path: { colors: ['#B8925E', '#E2C796', '#F1DEB4'], style: 'daisy' }, label: { tr: 'Sakin Vadi', en: 'Quiet Valley' }, art: { landmark: 'r1_cottage', crossing: 'r1_bridge' }, life: [{ kind: 'butterfly', x: 95, y: 300, seed: 11 }, { kind: 'bee', x: 300, y: 430, seed: 12, rich: true }] },
  2: { id: 2, key: 'old_mill_road', biome: 'village', path: { colors: ['#A39886', '#CFC5B4', '#E6DED0'], style: 'cobble' }, label: { tr: 'Eski Değirmen Yolu', en: 'Old Mill Road' }, art: { landmark: 'r2_windmill', crossing: 'r2_gate' }, life: [{ kind: 'birds', x: 0, y: 260, seed: 21 }, { kind: 'bee', x: 70, y: 520, seed: 22, rich: true }] },
  3: { id: 3, key: 'flower_gardens', biome: 'garden', ground: ['#CFE2AD', '#9DC18D'], water: '#7DBDB8', path: { colors: ['#C9B8A8', '#F0E4DA', '#FBF4EE'], style: 'flagstone' }, label: { tr: 'Çiçekli Bahçeler', en: 'Flower Gardens' }, art: { landmark: 'r3_house', crossing: 'r3_bridge' }, life: [{ kind: 'butterfly', x: 280, y: 520, seed: 6 }, { kind: 'butterfly', x: 70, y: 640, seed: 32 }, { kind: 'bee', x: 120, y: 380, seed: 31, rich: true }] },
  4: { id: 4, key: 'lakeside', biome: 'lake', ground: ['#C5D6B0', '#99B99A'], water: '#75B9C8', path: { colors: ['#9C7B57', '#C9A274', '#E3C79C'], style: 'boardwalk' }, label: { tr: 'Göl Kıyısı', en: 'Lakeside' }, art: { landmark: 'r4_gazebo', crossing: 'r4_gate' }, life: [{ kind: 'reeds', x: 127, y: 390, seed: 5 }, { kind: 'duck', x: 155, y: 425, scale: 0.72, seed: 4, rich: true }, { kind: 'reeds', x: 286, y: 360, scale: 0.8, seed: 7, rich: true }] },
  5: { id: 5, key: 'lantern_woods', biome: 'forest', ground: ['#B8D0A4', '#83A57D'], water: '#80BBC0', path: { colors: ['#7E6448', '#A68660', '#C2A57C'], style: 'moss' }, label: { tr: 'Fenerli Orman', en: 'Lantern Woods' }, art: { landmark: 'r5_hut', crossing: 'r5_bridge' }, life: [{ kind: 'firefly', x: 40, y: 480, seed: 13 }, { kind: 'firefly', x: 365, y: 730, seed: 17 }] },
  6: { id: 6, key: 'festival_square', biome: 'village', ground: ['#D3DDB0', '#ABC69A'], water: '#7CBCC1', path: { colors: ['#A8846A', '#E2C9A6', '#F4E6CC'], style: 'festival' }, label: { tr: 'Festival Meydanı', en: 'Festival Square' }, art: { landmark: 'r6_house', crossing: 'r6_gate' }, life: [{ kind: 'flag', x: 22, y: 465, seed: 1 }, { kind: 'flag', x: 376, y: 690, seed: 2 }, { kind: 'festivalLights', x: 155, y: 95, seed: 9 }, { kind: 'festivalLights', x: 25, y: 720, seed: 5, rich: true }] },
};
export function regionalIdentity(region: Pick<RegionDef, 'id'>): RegionIdentity | undefined { return REGION_IDENTITIES[region.id]; }

/**
 * A new region is a data entry: add it to REGIONS (structures), here (look, life), its name, description and intro line
 * (`region.N`, `region.N.desc`, `region.N.intro`) to i18n/content.ts, and its
 * sprites to the art registry. Regions without an entry keep the biome defaults, so the table can
 * grow to ~100 regions without code changes.
 */
export function regionLife(id: number, rich: boolean): RegionLife[] { return (REGION_IDENTITIES[id]?.life ?? []).filter((l) => rich || !l.rich); }

/** Region-opening intro: shown once per region (flag), never for the starting region. */
export const regionIntroFlag = (id: number) => `regionIntro:${id}`;
export function pendingRegionIntro(s: { regions: readonly number[]; flags: Readonly<Record<string, boolean>> }): number | null {
  for (const id of [...s.regions].sort((a, b) => a - b)) if (id > 1 && !s.flags[regionIntroFlag(id)]) return id;
  return null;
}

/**
 * Restored-only landmark overrides. Regions 1-6 now use three-stage original sprites from
 * REGIONAL_STAGED_ART in art/ids.ts, which take precedence; this map stays for future one-off art.
 * Structure IDs and saves are unchanged.
 */
export const REGIONAL_LANDMARK_ART: Readonly<Record<string, string>> = {};
