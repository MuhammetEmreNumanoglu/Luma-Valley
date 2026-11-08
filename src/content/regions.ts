// Regions and the structures that can be restored in them. Map coordinates are in world units:
// the map is MAP_W wide and each region is REGION_H tall, stacked from the top.

export const MAP_W = 400;
export const REGION_H = 1100;

export type StructureType =
  | 'shrine'
  | 'garden'
  | 'cottage'
  | 'greenhouse'
  | 'well'
  | 'orchard'
  | 'waterwheel'
  | 'beemeadow'
  | 'bridge'
  | 'lamppost'
  | 'stonepath'
  | 'beacon'
  | 'windmill'
  | 'bakery'
  | 'square'
  | 'fountain'
  | 'house'
  | 'barn'
  | 'workshop'
  | 'clocktower'
  | 'gate'
  | 'lighthouse'
  | 'dock'
  | 'boat'
  | 'hut'
  | 'cave'
  | 'tower'
  | 'gazebo'
  | 'statue'
  | 'bigtree'
  | 'observatory'
  | 'greatlantern';

export interface StructureDef {
  id: string;
  region: number;
  type: StructureType;
  x: number;
  y: number;
  /** Drawing scale (1 = default footprint ~110 units wide). */
  s: number;
  /** Optional colour variant index used by the renderer (house roofs, etc.). */
  v?: number;
  /** Player can pick a decoration variant here once restored. */
  decor?: 'flowers' | 'fence' | 'roof';
}

export interface RegionDef {
  id: number;
  /** Ground / accent palette. */
  ground: [string, string];
  accent: string;
  water: string;
  /** 'meadow' | 'village' | ... drives scenery generation. */
  biome: 'meadow' | 'village' | 'harbor' | 'forest' | 'hills' | 'lake' | 'garden';
  structures: StructureDef[];
}

const S = (id: string, region: number, type: StructureType, x: number, y: number, s = 1, extra: Partial<StructureDef> = {}): StructureDef => ({
  id,
  region,
  type,
  x,
  y,
  s,
  ...extra,
});

export const REGIONS: readonly RegionDef[] = [
  {
    id: 1,
    ground: ['#B9D98A', '#8FBF6A'],
    accent: '#F2B544',
    water: '#7EC8E3',
    biome: 'meadow',
    structures: [
      S('r1_beacon', 1, 'beacon', 70, 170, 0.95),
      S('r1_cottage', 1, 'cottage', 125, 300, 1.1, { decor: 'roof', v: 0 }),
      S('r1_greenhouse', 1, 'greenhouse', 318, 215, 0.9),
      S('r1_garden', 1, 'garden', 270, 365, 1, { decor: 'flowers' }),
      S('r1_well', 1, 'well', 70, 485, 0.85),
      S('r1_shrine', 1, 'shrine', 210, 540, 1),
      S('r1_orchard', 1, 'orchard', 318, 625, 1),
      S('r1_waterwheel', 1, 'waterwheel', 82, 705, 0.95),
      S('r1_lamppost', 1, 'lamppost', 200, 735, 0.8),
      S('r1_beemeadow', 1, 'beemeadow', 322, 820, 0.9),
      S('r1_stonepath', 1, 'stonepath', 150, 880, 1, { decor: 'fence' }),
      S('r1_bridge', 1, 'bridge', 205, 1010, 1.15),
    ],
  },
  {
    id: 2,
    ground: ['#D8D98C', '#B6C46E'],
    accent: '#F0A72E',
    water: '#86CBE0',
    biome: 'village',
    structures: [
      S('r2_windmill', 2, 'windmill', 78, 180, 1.05),
      S('r2_bakery', 2, 'bakery', 215, 230, 1.1, { decor: 'roof', v: 1 }),
      S('r2_honeybarn', 2, 'barn', 330, 170, 0.95, { v: 1 }),
      S('r2_house_a', 2, 'house', 75, 400, 0.95, { v: 2 }),
      S('r2_fountain', 2, 'fountain', 300, 405, 0.9),
      S('r2_square', 2, 'square', 195, 505, 1.15, { decor: 'flowers' }),
      S('r2_house_b', 2, 'house', 335, 580, 0.95, { v: 3 }),
      S('r2_workshop', 2, 'workshop', 85, 630, 1),
      S('r2_clocktower', 2, 'clocktower', 210, 710, 1.1),
      S('r2_loomhouse', 2, 'house', 320, 790, 1, { v: 4 }),
      S('r2_kilnhouse', 2, 'workshop', 95, 850, 0.95, { v: 1 }),
      S('r2_gate', 2, 'gate', 205, 1010, 1.1),
    ],
  },
  {
    id: 3,
    ground: ['#E9D9A8', '#C9D69A'],
    accent: '#F2C14E',
    water: '#5FB3D3',
    biome: 'harbor',
    structures: [
      S('r3_lighthouse', 3, 'lighthouse', 330, 180, 1.1),
      S('r3_hut_a', 3, 'hut', 90, 220, 0.95),
      S('r3_dock', 3, 'dock', 250, 360, 1.1),
      S('r3_boat', 3, 'boat', 330, 440, 0.9),
      S('r3_hut_b', 3, 'hut', 85, 470, 0.95, { v: 1 }),
      S('r3_market', 3, 'square', 190, 590, 1, { decor: 'flowers' }),
      S('r3_cave', 3, 'cave', 320, 690, 1),
      S('r3_house', 3, 'house', 90, 740, 0.95, { v: 5 }),
      S('r3_lamppost', 3, 'lamppost', 220, 820, 0.8),
      S('r3_bridge', 3, 'bridge', 205, 1010, 1.15),
    ],
  },
  {
    id: 4,
    ground: ['#C9A46A', '#9C7B47'],
    accent: '#E0663A',
    water: '#6FB7C8',
    biome: 'forest',
    structures: [
      S('r4_bigtree', 4, 'bigtree', 200, 200, 1.2),
      S('r4_hut', 4, 'hut', 75, 330, 0.95, { v: 2 }),
      S('r4_shrine', 4, 'shrine', 320, 330, 0.95),
      S('r4_stonepath', 4, 'stonepath', 190, 460, 1, { decor: 'fence' }),
      S('r4_gazebo', 4, 'gazebo', 85, 590, 0.95),
      S('r4_well', 4, 'well', 320, 590, 0.85),
      S('r4_workshop', 4, 'workshop', 200, 700, 1, { v: 2 }),
      S('r4_statue', 4, 'statue', 80, 830, 0.85),
      S('r4_lamppost', 4, 'lamppost', 320, 830, 0.8),
      S('r4_gate', 4, 'gate', 205, 1010, 1.1),
    ],
  },
  {
    id: 5,
    ground: ['#B7C98F', '#8FA878'],
    accent: '#F4D35E',
    water: '#79B9D9',
    biome: 'hills',
    structures: [
      S('r5_tower', 5, 'tower', 315, 190, 1.1),
      S('r5_windmill_a', 5, 'windmill', 85, 230, 1),
      S('r5_hut', 5, 'hut', 210, 360, 0.95, { v: 3 }),
      S('r5_windmill_b', 5, 'windmill', 330, 470, 0.95),
      S('r5_statue', 5, 'statue', 90, 500, 0.9),
      S('r5_stonepath', 5, 'stonepath', 200, 600, 1, { decor: 'fence' }),
      S('r5_barn', 5, 'barn', 90, 740, 1, { v: 2 }),
      S('r5_gazebo', 5, 'gazebo', 315, 760, 0.9),
      S('r5_beacon', 5, 'beacon', 205, 860, 0.9),
      S('r5_bridge', 5, 'bridge', 205, 1010, 1.15),
    ],
  },
  {
    id: 6,
    ground: ['#6F7FB8', '#4E5E99'],
    accent: '#9FE6E0',
    water: '#3E6FA8',
    biome: 'lake',
    structures: [
      S('r6_observatory', 6, 'observatory', 200, 180, 1.1),
      S('r6_dock', 6, 'dock', 90, 330, 1),
      S('r6_boat', 6, 'boat', 300, 360, 0.9, { v: 1 }),
      S('r6_gazebo', 6, 'gazebo', 320, 520, 0.95),
      S('r6_greenhouse', 6, 'greenhouse', 90, 560, 0.95),
      S('r6_lamppost', 6, 'lamppost', 200, 640, 0.8),
      S('r6_statue', 6, 'statue', 320, 760, 0.9),
      S('r6_house', 6, 'house', 85, 790, 0.95, { v: 6 }),
      S('r6_fountain', 6, 'fountain', 205, 880, 0.9),
      S('r6_gate', 6, 'gate', 205, 1010, 1.1),
    ],
  },
  {
    id: 7,
    ground: ['#A9D6A0', '#7FB98A'],
    accent: '#E9A6E0',
    water: '#8ED6E0',
    biome: 'garden',
    structures: [
      S('r7_greatlantern', 7, 'greatlantern', 200, 220, 1.25),
      S('r7_garden_a', 7, 'garden', 80, 380, 1, { decor: 'flowers' }),
      S('r7_garden_b', 7, 'garden', 320, 380, 1),
      S('r7_gazebo', 7, 'gazebo', 200, 480, 1),
      S('r7_fountain', 7, 'fountain', 90, 610, 0.95),
      S('r7_greenhouse', 7, 'greenhouse', 320, 620, 1),
      S('r7_statue', 7, 'statue', 200, 700, 0.9),
      S('r7_bigtree', 7, 'bigtree', 85, 840, 1.05),
      S('r7_beacon', 7, 'beacon', 320, 850, 0.9),
      S('r7_arch', 7, 'gate', 205, 1000, 1.1),
    ],
  },
];

export const REGION_COUNT = REGIONS.length;

export const STRUCTURES: readonly StructureDef[] = REGIONS.flatMap((r) => r.structures);
export const STRUCTURE: Record<string, StructureDef> = Object.fromEntries(STRUCTURES.map((s) => [s.id, s]));
