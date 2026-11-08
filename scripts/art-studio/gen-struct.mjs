// Structures (32 types × 3 restoration stages), producers (12) and map props from Kenney CC0 kits.
// Stage 0 = ruin (faded, broken, no roof), 1 = under repair (scaffold), 2 = restored (full colour, details).
import { writeFileSync } from 'node:fs';
const F = 'Food Kit', N = 'Nature Kit', S = 'Survival Kit', G = 'Graveyard Kit', D = 'Mini Dungeon', P = 'Platformer Kit',
  U = 'Furniture Kit', H = 'Holiday Kit', M = 'Mini Market', C = 'Cube Pets', R = 'Pirate Kit', K = 'Castle Kit', X = 'Space Kit', T = 'Fantasy Town Kit', W = 'Watercraft Pack';
const m = (kit, model, o = {}) => ({ kit, model, ...o });

// Wall side → rotation. Camera looks from +x/+z, so +x (0) and +z (270) faces are visible.
const SIDES = { px: [1, 0, 0], nz: [0, -1, 90], nx: [-1, 0, 180], pz: [0, 1, 270] };

/** Box house over grid cells [cx, cz]; walls on outer edges, optional upper floors. */
function house(st, o) {
  const { cells = [[0, 0]], floors = 1, mat = 'wood', door = 'pz', roof = 'roof-gable', roofRy = 0, roofTint, wallTint, chimney = false, y0 = 0 } = o;
  const out = [];
  const has = (x, z) => cells.some(([a, b]) => a === x && b === z);
  const pre = mat === 'wood' ? 'wall-wood' : 'wall';
  cells.forEach(([cx, cz], ci) => {
    for (let fl = 0; fl < floors; fl++) {
      for (const [side, [dx, dz, ry]] of Object.entries(SIDES)) {
        if (has(cx + dx, cz + dz)) continue;
        const front = side === 'px' || side === 'pz';
        let model = pre;
        if (fl === 0 && side === door && ci === 0) model = `${pre}-door`;
        else if (front && (fl > 0 || (cx + cz + fl) % 2 === 0)) model = `${pre}-window-shutters`;
        else if (front) model = `${pre}-window-glass`;
        if (st === 0) {
          // Ruin: upper floors gone, every other wall broken or missing.
          if (fl > 0) continue;
          const h = (cx * 3 + cz * 5 + ry / 90 + 1) % 3;
          if (h === 0) continue;
          if (h === 1) model = `${pre}-broken`;
        }
        out.push(m(T, model, { x: cx, z: cz, y: y0 + fl, ry, ground: false, tint: wallTint, tintK: wallTint ? 0.35 : 0 }));
      }
    }
    if (st >= 2 || (st === 1 && false)) {
      out.push(m(T, roof, { x: cx, z: cz, y: y0 + floors, ry: roofRy, ground: false, tint: roofTint, tintK: roofTint ? 0.55 : 0 }));
    }
  });
  if (st >= 2 && chimney) out.push(m(T, 'chimney', { x: cells[0][0], z: cells[0][1], y: y0 + floors, ground: false }));
  if (st === 1) {
    // Scaffold around the outside + roof frame of planks.
    const xs = cells.map((c) => c[0]), zs = cells.map((c) => c[1]);
    const mx = Math.max(...xs), mz = Math.max(...zs);
    for (let fl = 0; fl < floors; fl++) {
      out.push(m(T, 'poles', { x: mx + 0.12, z: cells[0][1], y: y0 + fl, ground: false }));
      out.push(m(T, 'poles', { x: cells[0][0], z: mz + 0.12, y: y0 + fl, ry: 270, ground: false }));
    }
    out.push(m(T, 'planks-half', { x: cells[0][0], z: cells[0][1], y: y0 + floors, ground: false }));
    out.push(m(S, 'resource-planks', { x: mx + 0.9, z: mz + 0.6, s: 0.8 }));
  }
  if (st === 0) out.push(...rubble(cells[0][0] + 0.7, cells[0][1] + 0.8));
  return out;
}

function rubble(x, z) {
  return [m(G, 'debris', { x, z, s: 0.9 }), m(G, 'debris-wood', { x: x - 0.7, z: z + 0.25, s: 0.8, ry: 40 }), m(N, 'grass_large', { x: x + 0.3, z: z - 0.9 })];
}
function flowersAt(pts) {
  const fl = ['flower_redA', 'flower_yellowA', 'flower_purpleA', 'flower_redB', 'flower_yellowB'];
  return pts.map(([x, z], i) => m(N, fl[i % fl.length], { x, z, s: 1.3 }));
}
function bushAt(x, z, s = 1) {
  return m(N, 'plant_bushSmall', { x, z, s });
}
const done = (st, arr) => (st >= 2 ? arr : []);
const atLeast = (st, n, arr) => (st >= n ? arr : []);
const lamp = (x, z, ry = 0) => m(G, 'lightpost-single', { x, z, ry, s: 0.9 });

const STRUCT = {
  shrine: (st) => [
    m(G, 'altar-stone', { s: 1.3 }),
    m(N, st === 0 ? 'statue_columnDamaged' : 'statue_column', { x: -0.6, z: -0.3 }),
    m(N, st === 0 ? 'statue_columnDamaged' : 'statue_column', { x: 0.3, z: -0.6 }),
    ...atLeast(st, 1, [m(G, 'candle-multiple', { y: 0.45, ground: false, s: 0.8 })]),
    ...done(st, [m(G, 'lantern-candle', { x: 0.6, z: 0.5, s: 0.9 }), ...flowersAt([[-0.6, 0.4], [-0.3, 0.7], [0.75, -0.1]])]),
    ...(st === 0 ? [m(N, 'grass_large', { x: 0.5, z: 0.5 }), m(N, 'stone_smallC', { x: -0.5, z: 0.6 })] : []),
  ],
  garden: (st) => [
    m(N, 'crops_dirtRow', { x: -0.3, z: 0 }),
    m(N, 'crops_dirtRow', { x: 0.5, z: 0 }),
    ...(st === 0 ? [m(N, 'grass_leafsLarge', { x: -0.3 }), m(N, 'grass_large', { x: 0.5, z: 0.2 }), m(N, 'fence_planks', { x: 0, z: 0.9, rz: 8 })] : []),
    ...atLeast(st, 1, [m(N, 'crops_leafsStageA', { x: -0.3, z: -0.25 }), m(N, 'crops_leafsStageA', { x: 0.5, z: 0.25 }), m(N, 'fence_simple', { x: 0, z: 0.9 }), m(N, 'fence_simple', { x: 1.0, z: 0.9 })]),
    ...done(st, [...flowersAt([[-0.3, -0.2], [-0.3, 0.2], [0.5, -0.2], [0.5, 0.2], [-0.3, 0.45], [0.5, 0.45]]), m(G, 'bench', { x: -1.2, z: 0.3, ry: 90 }), m(N, 'plant_bush', { x: 1.3, z: -0.4 })]),
  ],
  cottage: (st) => [...house(st, { cells: [[0, 0]], mat: 'wood', roof: 'roof-gable', roofTint: '#C9584A', chimney: true }), ...done(st, [...flowersAt([[0.75, 0.2], [0.75, -0.25], [0.3, 0.75]]), bushAt(-0.2, 0.8)])],
  greenhouse: (st) => [
    ...house(st, { cells: [[0, 0], [1, 0]], mat: 'wood', door: 'pz', roof: 'roof-high-window', roofTint: '#8FD3C0' }).map((x) => (x.model?.startsWith('wall-wood-window-shutters') ? { ...x, model: 'wall-wood-window-glass' } : x)),
    ...done(st, [m(N, 'pot_small', { x: 1.75, z: 0.6 }), ...flowersAt([[1.75, 0.6], [-0.2, 0.75], [0.3, 0.8], [1.2, 0.8]])]),
  ],
  well: (st) => [
    m(T, 'fountain-round', { s: 0.45 }),
    ...atLeast(st, 1, [m(T, 'pillar-wood', { x: -0.3, z: 0 }), m(T, 'pillar-wood', { x: 0.3, z: 0 })]),
    ...done(st, [m(T, 'roof-point', { y: 1.0, ground: false, s: 0.7, tint: '#C9584A', tintK: 0.5 }), m(S, 'bucket', { x: 0.5, z: 0.4, s: 0.8 }), ...flowersAt([[-0.5, 0.45]])]),
    ...(st === 0 ? [m(N, 'grass_large', { x: 0.4, z: 0.4 }), m(G, 'debris-wood', { x: -0.4, z: 0.5, s: 0.6 })] : []),
  ],
  orchard: (st) => {
    const tr = st === 0 ? 'stump_old' : 'tree_fat';
    return [
      m(N, tr, { x: -0.6, z: -0.4, s: st === 0 ? 1.3 : 1.3 }),
      m(N, st === 0 ? 'stump_round' : 'tree_default', { x: 0.6, z: -0.5, s: 1.3 }),
      m(N, st === 0 ? 'grass_large' : st === 1 ? 'tree_small' : 'tree_fat', { x: 0, z: 0.5, s: 1.2 }),
      ...done(st, [m(S, 'box-open', { x: 0.8, z: 0.6, s: 0.7 }), m(F, 'apple', { x: 0.8, z: 0.6, y: 0.3, s: 0.6, ground: false }), m(F, 'apple', { x: 0.6, z: 0.9, s: 0.5 })]),
      ...atLeast(st, 1, [m(N, 'fence_simple', { x: -0.4, z: 1.1 }), m(N, 'fence_simple', { x: 0.6, z: 1.1 })]),
    ];
  },
  waterwheel: (st) => [
    ...house(st, { cells: [[0, 0]], mat: 'stone', door: 'pz', roof: 'roof-gable', roofTint: '#8E6A4A' }),
    ...atLeast(st, 1, [m(T, 'watermill', { x: 0.75, y: 0.55, ground: false, s: 0.9, desat: st === 1 ? 0.3 : 0 })]),
    ...(st === 0 ? [m(T, 'wheel', { x: 0.9, z: 0.6, rz: 80, s: 0.8 })] : []),
  ],
  beemeadow: (st) => {
    const hive = (x, z) => { const a = m(S, 'box', { x, z, fit: 0.55, tint: '#F2D06B', tintK: 0.45 }); return [a, m(S, 'box', { x, z, fit: 0.5, y: 0.5, ground: false, tint: '#F7E0A0', tintK: 0.45 }), m(T, 'roof-flat', { x, z, y: 0.95, s: 0.6, ground: false, tint: '#B07A4A', tintK: 0.4 })]; };
    return [
      ...(st === 0 ? [m(S, 'box-open', { x: -0.3, s: 0.7, desat: 0.6 }), m(N, 'grass_large', { x: 0.4, z: 0.3 }), m(N, 'grass_leafsLarge', { x: -0.6, z: 0.6 })] : hive(-0.3, 0)),
      ...atLeast(st, 1, hive(0.5, -0.3)),
      ...done(st, [m(C, 'animal-bee', { x: 0.2, y: 1.0, z: 0.3, s: 0.35, ground: false }), m(C, 'animal-bee', { x: -0.6, y: 1.1, z: -0.2, s: 0.3, ground: false, ry: 60 }), ...flowersAt([[-0.8, 0.5], [-0.5, 0.8], [0, 0.7], [0.4, 0.9], [0.9, 0.4], [0.9, 0.0], [-0.9, 0.1]])]),
    ];
  },
  bridge: (st) => [m(N, st === 0 ? 'bridge_wood' : 'bridge_woodRound', { s: 1.6, ry: 90, desat: st === 0 ? 0.3 : 0 }), ...(st === 0 ? [m(G, 'debris-wood', { x: 0.5, z: 0.9, s: 0.7 })] : []), ...done(st, [lamp(-0.9, 0.8), lamp(0.9, 0.8)])],
  lamppost: (st) => [m(G, 'lightpost-single', { s: 1.4, rz: st === 0 ? 12 : 0 }), ...done(st, flowersAt([[0.25, 0.25], [-0.2, 0.3]])), ...(st === 0 ? [m(N, 'grass_large', { x: 0.3, z: 0.3 })] : [])],
  stonepath: (st) => [
    m(N, 'path_stone', { x: -0.6, z: 0.2 }),
    ...atLeast(st, 1, [m(N, 'path_stone', { x: 0, z: -0.1 })]),
    ...done(st, [m(N, 'path_stone', { x: 0.6, z: -0.4 }), ...flowersAt([[-0.6, 0.6], [0.2, 0.4], [0.7, 0.1]])]),
    ...(st === 0 ? [m(N, 'grass_large', { x: 0.2, z: 0 }), m(N, 'stone_smallA', { x: 0.6, z: -0.3 })] : []),
  ],
  beacon: (st) => [m(G, 'pillar-obelisk', { s: 1.6 }), ...atLeast(st, 1, [m(G, 'fire-basket', { x: 0.5, z: 0.4, s: 0.9 })]), ...done(st, [m(G, 'lantern-candle', { x: -0.45, z: 0.45 }), ...flowersAt([[0.2, 0.6]])])],
  windmill: (st) => [
    ...house(st, { cells: [[0, 0]], floors: 2, mat: 'stone', roof: 'roof-point', roofTint: '#B05A3A' }),
    ...(st >= 1 ? [m(T, 'windmill', { x: 0.75, y: 1.6, ground: false, s: 1.1, rx: 20, desat: st === 1 ? 0.3 : 0 })] : [m(T, 'blade', { x: 0.9, z: 0.7, s: 0.8, rz: 85 })]),
  ],
  bakery: (st) => [...house(st, { cells: [[0, 0], [0, 1]], mat: 'stone', door: 'px', roof: 'roof-gable', roofRy: 90, roofTint: '#D9844A', chimney: true }), ...done(st, [m(T, 'stall-red', { x: 1.3, z: 0.9, s: 0.7, ry: 270 }), m(F, 'loaf', { x: 1.2, z: 0.4, s: 1.2 })])],
  square: (st) => [
    m(N, 'path_stoneCircle', { s: 1.6 }),
    ...atLeast(st, 1, [m(T, 'fountain-round', { s: 0.5 })]),
    ...done(st, [m(T, 'fountain-center', { s: 0.5, y: 0.1, ground: false }), m(G, 'bench', { x: 1.0, z: 0, ry: 90, s: 0.9 }), m(G, 'bench', { x: 0, z: 1.0, s: 0.9 }), lamp(-0.9, 0.9), ...flowersAt([[0.9, 0.8], [-1, -0.2]])]),
    ...(st === 0 ? [m(G, 'debris', { x: 0.4, z: 0.4 }), m(N, 'grass_large', { x: -0.5, z: 0.2 })] : []),
  ],
  fountain: (st) => [m(T, st === 0 ? 'fountain-round' : 'fountain-round-detail', { s: 0.7, desat: st === 0 ? 0.3 : 0 }), ...atLeast(st, 1, [m(T, 'fountain-center', { s: 0.7, y: 0.12, ground: false })]), ...done(st, flowersAt([[0.9, 0.5], [0.5, 0.9], [-0.9, 0.5]])), ...(st === 0 ? [m(G, 'debris', { x: 0.3, z: 0.2, s: 0.6 })] : [])],
  house: (st, v = 0) => [...house(st, { cells: [[0, 0], [1, 0]], floors: 2, mat: v % 2 ? 'stone' : 'wood', roof: 'roof-high-gable', roofTint: ['#C9584A', '#4E86B8', '#6FAE52', '#D9A441'][v % 4], chimney: true }), ...done(st, [...flowersAt([[1.7, 0.2], [0.3, 0.8], [1.2, 0.8]]), bushAt(1.75, -0.4)])],
  barn: (st) => [...house(st, { cells: [[0, 0], [1, 0]], mat: 'wood', door: 'px', roof: 'roof-high-gable', wallTint: '#B8443A', roofTint: '#8E6A4A' }), ...done(st, [m(G, 'hay-bale', { x: 2.0, z: 0.5, s: 0.9 }), m(G, 'hay-bale-bundled', { x: 0.2, z: 1.0, s: 0.8 })])],
  workshop: (st) => [...house(st, { cells: [[0, 0]], mat: 'wood', door: 'pz', roof: 'roof-gable', roofTint: '#8E6A4A' }), ...done(st, [m(T, 'overhang', { s: 1 }), m(S, 'workbench', { x: 1.1, z: 0.4, s: 0.8, ry: 270 })]), ...atLeast(st, 1, [m(S, 'resource-planks', { x: 0.4, z: 1.1, s: 0.8 })])],
  clocktower: (st) => [
    ...house(st, { cells: [[0, 0]], floors: 3, mat: 'stone', door: 'pz', roof: 'roof-high-point', roofTint: '#4E86B8' }),
    ...atLeast(st, 1, [{ custom: 'clockface', x: 0, y: st >= 2 ? 2.45 : 1.45, z: 0.53, s: 0.9, ground: false }]),
  ],
  gate: (st) => [
    m(K, 'tower-square-base', { x: -0.9, s: 0.8, tint: '#B8B2A6', tintK: 0.75, desat: st === 0 ? 0.5 : 0 }),
    m(K, 'tower-square-base', { x: 0.9, s: 0.8, tint: '#B8B2A6', tintK: 0.75, desat: st === 0 ? 0.5 : 0 }),
    ...atLeast(st, 1, [m(K, 'gate', { s: 1.4, ry: 90 })]),
    ...done(st, [m(K, 'tower-square-top', { x: -0.9, y: 0.81, s: 0.8, ground: false, tint: '#9AA3A8', tintK: 0.7 }), m(K, 'tower-square-top', { x: 0.9, y: 0.81, s: 0.8, ground: false, tint: '#9AA3A8', tintK: 0.7 }), m(K, 'flag-banner-short', { x: -0.9, y: 1.1, s: 0.8, ground: false })]),
  ],
  lighthouse: (st) => [
    m(K, 'tower-hexagon-base', { s: 1.1, tint: '#F4F0E8', tintK: 0.85, desat: st === 0 ? 0.5 : 0 }),
    ...atLeast(st, 1, [m(K, 'tower-hexagon-mid', { y: 1.44, s: 1.1, ground: false, tint: '#D9443A', tintK: 0.85 }), m(K, 'tower-hexagon-mid', { y: 1.95, s: 1.1, ground: false, tint: '#F4F0E8', tintK: 0.85 })]),
    ...done(st, [m(K, 'tower-hexagon-mid', { y: 2.46, s: 1.1, ground: false, tint: '#D9443A', tintK: 0.85 }), m(K, 'tower-hexagon-top', { y: 2.97, s: 1.1, ground: false, tint: '#3E4A5A', tintK: 0.6 }), { custom: 'lanternroom', y: 3.1, ground: false, s: 1.0 }]),
    ...(st === 0 ? rubble(0.6, 0.6) : []),
  ],
  dock: (st) => [m(R, st === 0 ? 'structure-platform-small' : 'structure-platform-dock', { s: 0.8, desat: st === 0 ? 0.4 : 0 }), ...done(st, [m(R, 'barrel', { x: 0.6, z: 0.5, y: 1.05, ground: false, s: 0.6 }), m(R, 'crate', { x: 0.1, z: 0.6, y: 1.05, ground: false, s: 0.6 })])],
  boat: (st) => [m(st === 0 ? R : W, st === 0 ? 'ship-wreck' : st === 1 ? 'boat-row-large' : 'boat-sail-a', { fit: st === 2 ? 2.4 : 1.9, ry: 30, desat: st === 0 ? 0.3 : 0 })],
  hut: (st) => [...house(st, { cells: [[0, 0]], mat: 'wood', roof: 'roof-point', roofTint: '#8E6A4A', wallTint: '#8E5A3A' }), ...done(st, [m(N, 'campfire_logs', { x: 0.9, z: 0.8, s: 0.9 }), m(N, 'log_stack', { x: -0.4, z: 0.9 })])],
  cave: (st) => [
    m(N, 'stone_largeD', { x: -0.4, z: -0.3, s: 1.8 }),
    m(N, 'stone_largeF', { x: 0.5, z: -0.4, s: 1.6 }),
    m(D, 'wall-opening', { x: 0, z: 0.1, s: 0.45, desat: 0.2 }),
    ...(st === 0 ? [m(N, 'stone_largeA', { x: 0, z: 0.5, s: 1.2 })] : []),
    ...atLeast(st, 1, [m(G, 'lantern-candle', { x: 0.6, z: 0.6, s: 0.8 })]),
    ...done(st, [m(P, 'jewel', { x: -0.7, z: 0.5, s: 0.5, sy: 1.6, tint: '#8FD3E8', tintK: 0.85, warm: false }), m(P, 'jewel', { x: -0.5, z: 0.7, s: 0.35, sy: 1.6, tint: '#B48AEB', tintK: 0.85, warm: false })]),
  ],
  tower: (st) => [...house(st, { cells: [[0, 0]], floors: 2, mat: 'stone', roof: 'roof-high-point', roofTint: '#6A5AA8' }), ...done(st, [m(K, 'flag-pennant', { x: 0, y: 3.0, ground: false, s: 0.7 })])],
  gazebo: (st) => [
    m(N, 'platform_stone', { s: 0.9 }),
    ...atLeast(st, 1, [-0.4, 0.4].flatMap((x) => [-0.4, 0.4].map((z) => m(T, 'pillar-wood', { x, z, y: 0.2, ground: false })))),
    ...done(st, [m(T, 'roof-point', { y: 1.2, s: 1.0, ground: false, tint: '#F2EEE6', tintK: 0.5 }), ...flowersAt([[0.75, 0.6], [0.6, 0.8], [-0.7, 0.7]])]),
    ...(st === 0 ? [m(G, 'debris-wood', { x: 0.3, z: 0.4, s: 0.7 })] : []),
  ],
  statue: (st) => [m(N, 'statue_block', { s: 1.2 }), ...atLeast(st, 1, [m(N, 'statue_head', { y: 0.5, s: 1.1, ground: false, rz: st === 1 ? 8 : 0 })]), ...done(st, flowersAt([[0.55, 0.3], [0.3, 0.6], [-0.5, 0.5]])), ...(st === 0 ? [m(N, 'statue_head', { x: 0.6, z: 0.5, rz: 80, s: 0.9 })] : [])],
  bigtree: (st) => [m(N, st === 0 ? 'tree_thin_fall' : st === 1 ? 'tree_default' : 'tree_oak', { s: st === 0 ? 2.4 : 2.8, desat: st === 0 ? 0.5 : 0 }), ...done(st, [m(G, 'bench', { x: 0.8, z: 0.5, s: 0.8, ry: 60 }), ...flowersAt([[-0.5, 0.6], [0.3, 0.8]]), m(H, 'lantern-hanging', { x: 0.45, y: 1.6, z: 0.3, s: 0.6, ground: false })])],
  observatory: (st) => [
    m(K, 'tower-hexagon-base', { s: 1.3, tint: '#D8D2C4', tintK: 0.8, desat: st === 0 ? 0.5 : 0 }),
    ...atLeast(st, 1, [m(K, 'tower-hexagon-mid', { y: 1.7, s: 1.3, ground: false, tint: '#C9C3B7', tintK: 0.8 })]),
    ...done(st, [{ custom: 'dome', y: 2.3, s: 1.15, ground: false, warm: false }, m(X, 'satelliteDish', { x: 0.7, z: 0.5, s: 0.25 })]),
    ...(st === 0 ? rubble(0.7, 0.7) : []),
    ...(st === 1 ? [m(T, 'poles', { x: 0.2, y: 0.6, ground: false }), m(T, 'poles', { z: 0.2, y: 0.6, ry: 270, ground: false })] : []),
  ],
  greatlantern: (st) => [
    m(N, 'platform_stone', { s: 1.1 }),
    m(G, 'pillar-large', { y: 0.25, s: 2.0, ground: false, desat: st === 0 ? 0.4 : 0 }),
    ...atLeast(st, 1, [m(G, 'lantern-glass', { y: 2.5, s: 1.3, ground: false })]),
    ...done(st, [m(G, 'lantern-candle', { x: 0.6, z: 0.6, y: 0.25, ground: false }), m(G, 'lantern-candle', { x: -0.6, z: 0.6, y: 0.25, ground: false }), ...flowersAt([[0.6, -0.3], [-0.6, -0.3]])]),
  ],
};

const PROD = {
  greenhouse: [...STRUCT.greenhouse(2)],
  workbench: [m(S, 'workbench'), m(S, 'tool-hammer', { x: 0.1, y: 0.55, ground: false, rx: 90, s: 0.7 }), m(S, 'resource-planks', { x: 0.7, z: 0.5, s: 0.7 })],
  quarry: [m(N, 'stone_largeC', { s: 1.3 }), m(S, 'resource-stone', { x: 0.6, z: 0.5 }), m(S, 'tool-pickaxe', { x: -0.4, z: 0.6, rx: 90, ry: 30 })],
  orchard: [m(N, 'tree_fat', { s: 1.3 }), m(F, 'apple', { x: 0.25, y: 0.7, z: 0.3, s: 0.6, ground: false }), m(F, 'apple', { x: -0.2, y: 0.9, z: 0.3, s: 0.6, ground: false }), m(S, 'box-open', { x: 0.55, z: 0.55, s: 0.6 })],
  lanternStone: [m(N, 'statue_block', { s: 0.9 }), m(G, 'lantern-candle', { on: 0, s: 1.1 })],
  field: [m(N, 'crops_dirtDoubleRow'), m(N, 'crops_wheatStageB', { x: 0, z: 0.15 }), m(N, 'crops_wheatStageA', { x: 0, z: -0.25 }), m(G, 'hay-bale', { x: 0.75, z: 0.5, s: 0.6 })],
  beehive: [m(S, 'box', { tint: '#F2D06B', tintK: 0.45 }), m(S, 'box', { on: 0, tint: '#F7E0A0', tintK: 0.45 }), m(C, 'animal-bee', { x: 0.45, y: 1.1, z: 0.3, s: 0.45, ground: false }), ...flowersAt([[0.5, 0.5], [-0.4, 0.6], [0.1, 0.7]])],
  loom: [m(T, 'stall-green', { s: 0.9 }), m(S, 'bedroll-packed', { x: 0.25, z: 0.55, s: 0.7, tint: '#6E9ACB', tintK: 0.6 }), m(S, 'bedroll-packed', { x: -0.25, z: 0.6, s: 0.7, tint: '#D97A8A', tintK: 0.6 })],
  tidepool: [m(N, 'platform_beach', { s: 1.0 }), m(N, 'lily_large', { x: 0, z: 0, y: 0.18, ground: false }), m(F, 'mussel', { x: 0.4, z: 0.4, y: 0.2, s: 1.2, ground: false, tint: '#F7C2AE', tintK: 0.8 }), m(P, 'star', { x: -0.35, z: 0.45, y: 0.2, s: 0.35, rx: -70, ground: false, tint: '#F08A76', tintK: 0.85 }), m(N, 'stone_smallB', { x: -0.4, z: -0.3, y: 0.15, ground: false })],
  geode: [m(N, 'stone_largeD', { s: 1.3 }), m(P, 'jewel', { x: 0.35, z: 0.45, s: 0.7, sy: 1.7, tint: '#8FD3E8', tintK: 0.85, warm: false }), m(P, 'jewel', { x: -0.3, z: 0.5, s: 0.55, sy: 1.6, rz: 20, tint: '#B48AEB', tintK: 0.85, warm: false }), m(P, 'jewel', { x: 0.05, z: 0.6, s: 0.4, sy: 1.5, rz: -15, tint: '#9FE6F0', tintK: 0.85, warm: false })],
  oven: [m(T, 'chimney-base', { s: 1.8, x: -0.5 }), m(N, 'campfire_bricks', { x: 0.2, z: 0.2 }), m(F, 'loaf', { x: 0.55, z: 0.6, s: 1.3 })],
  kiln: [m(T, 'fountain-round', { s: 0.42, tint: '#B07A5A', tintK: 0.5 }), m(N, 'campfire_stones', { y: 0.12, ground: false, s: 0.9 }), m(G, 'urn-round', { x: 0.6, z: 0.5, s: 0.9, tint: '#C9724A', tintK: 0.6 })],
};

const PROPS = {
  tree_round: [m(N, 'tree_default', { s: 1.6 })],
  tree_oak: [m(N, 'tree_oak', { s: 1.6 })],
  tree_fat: [m(N, 'tree_fat', { s: 1.5 })],
  tree_pine: [m(N, 'tree_pineRoundA', { s: 1.5 })],
  tree_pine2: [m(N, 'tree_pineTallA_detailed', { s: 1.5 })],
  tree_tall: [m(N, 'tree_tall', { s: 1.5 })],
  tree_fall: [m(N, 'tree_default_fall', { s: 1.6 })],
  tree_fall2: [m(N, 'tree_oak_fall', { s: 1.6 })],
  tree_blossom: [m(N, 'tree_default', { s: 1.6, tint: '#F2A8C8', tintK: 0.75 })],
  tree_blossom2: [m(N, 'tree_fat', { s: 1.5, tint: '#F7C9DC', tintK: 0.7 })],
  tree_lake: [m(N, 'tree_cone', { s: 1.5 })],
  tree_palm: [m(N, 'tree_palmTall', { s: 1.4 })],
  bush: [m(N, 'plant_bush', { s: 1.4 })],
  bush_large: [m(N, 'plant_bushLarge', { s: 1.2 })],
  bush_flower: [m(N, 'plant_bushDetailed', { s: 1.3 }), ...flowersAt([[0.15, 0.2], [-0.15, 0.25]])],
  rock: [m(N, 'stone_largeB', { s: 0.9 })],
  rock_small: [m(N, 'stone_smallD', { s: 1.4 })],
  flowers: flowersAt([[0, 0], [0.18, 0.08], [-0.15, 0.12], [0.05, 0.25]]),
  mushrooms: [m(N, 'mushroom_redGroup', { s: 1.6 })],
  stump: [m(N, 'stump_oldTall', { s: 1.3 })],
  logs: [m(N, 'log_stack', { s: 1.2 })],
  grass: [m(N, 'grass_large', { s: 1.6 })],
  // decorations
  deco_bench: [m(G, 'bench', { s: 1.0 })],
  deco_lamp: [m(G, 'lightpost-single', { s: 1.1 })],
  deco_planter: [m(N, 'pot_large', { s: 1.2 }), m(N, 'flower_redB', { y: 0.25, ground: false, s: 1.3 }), m(N, 'flower_yellowB', { x: 0.12, y: 0.25, ground: false, s: 1.1 })],
  deco_banner: [m(T, 'banner-green', { s: 1.0, ry: 300 })],
  deco_pond: [m(N, 'lily_large', { s: 1.4 }), m(N, 'lily_small', { x: 0.3, z: 0.2, s: 1.4 }), ...[0, 1, 2, 3, 4, 5].map((i) => m(N, 'stone_smallFlatA', { x: Math.cos(i) * 0.6, z: Math.sin(i) * 0.45, s: 0.9 }))],
};

const out = {};
for (const [type, fn] of Object.entries(STRUCT)) {
  const variants = type === 'house' ? 4 : 1;
  for (let v = 0; v < variants; v++) for (let st = 0; st < 3; st++) {
    out[`st_${type}${variants > 1 ? v : ''}_${st}`] = { size: 384, pad: 0.04, shadowOpacity: 0.26, desat: st === 0 ? 0.62 : st === 1 ? 0.18 : 0, items: fn(st, v) };
  }
}
for (const [id, items] of Object.entries(PROD)) out[`producer_${id}`] = { size: 256, pad: 0.06, shadowOpacity: 0.24, items };
for (const [id, items] of Object.entries(PROPS)) out[`prop_${id}`] = { size: 192, pad: 0.04, shadowOpacity: 0.22, items };
writeFileSync(process.argv[2] ?? 'struct.json', JSON.stringify(out));
console.log(Object.keys(out).length);
