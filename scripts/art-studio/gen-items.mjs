// Item → Kenney CC0 model compositions. Output: items.json (spec per sprite id).
import { writeFileSync } from 'node:fs';
const F = 'Food Kit', N = 'Nature Kit', S = 'Survival Kit', G = 'Graveyard Kit', D = 'Mini Dungeon', P = 'Platformer Kit',
  U = 'Furniture Kit', H = 'Holiday Kit', M = 'Mini Market', C = 'Cube Pets', R = 'Pirate Kit', X = 'Space Kit', T = 'Fantasy Town Kit';
const m = (kit, model, o = {}) => ({ kit, model, ...o });
const GOLD = '#F2C14E', TERRA = '#C9724A', CORAL = '#F08A76', BLUE = '#6E9ACB', LAV = '#B9A3E3', CREAM = '#F3E2C0', AMBER = '#E89A2A';

const I = {
  flower: [
    [m(N, 'crops_dirtSingle', { fit: 1 }), m(N, 'crops_leafsStageA', { fit: 0.35, on: 0, y: -0.05 })],
    [m(N, 'crops_leafsStageA', { fit: 1 })],
    [m(N, 'crops_leafsStageB', { fit: 1 })],
    [m(N, 'flower_redA', { fit: 1 })],
    [m(N, 'flower_redA', { fit: 1 }), m(N, 'flower_yellowA', { fit: 0.85, x: 0.3, z: 0.15 }), m(N, 'flower_purpleA', { fit: 0.9, x: -0.25, z: 0.2 })],
    [m(N, 'pot_small', { fit: 1 }), m(N, 'flower_redB', { fit: 0.7, on: 0, y: -0.15 }), m(N, 'flower_yellowB', { fit: 0.55, on: 0, x: 0.15, y: -0.2 })],
    [m(N, 'pot_large', { fit: 1 }), m(N, 'flower_redC', { fit: 0.7, on: 0, y: -0.2 }), m(N, 'flower_purpleC', { fit: 0.6, on: 0, x: 0.2, y: -0.2 }), m(N, 'flower_yellowC', { fit: 0.6, on: 0, x: -0.2, z: 0.1, y: -0.2 })],
    [m(H, 'wreath-decorated', { fit: 1, rx: 0 })],
    [m(G, 'urn-round', { fit: 1 }), m(N, 'flower_purpleB', { fit: 0.6, on: 0, y: -0.12 }), m(N, 'flower_redB', { fit: 0.5, on: 0, x: 0.12, y: -0.12 })],
    [m(N, 'plant_bushDetailed', { fit: 1, tint: '#7FC46A', tintK: 0.25 }), m(N, 'flower_redA', { fit: 0.55, x: 0.45, z: 0.35 }), m(N, 'flower_yellowA', { fit: 0.5, x: -0.45, z: 0.4 }), m(N, 'flower_purpleA', { fit: 0.5, x: 0.05, z: 0.55 })],
  ],
  wood: [
    [m(G, 'debris-wood', { fit: 1 })],
    [m(S, 'resource-wood', { fit: 1 })],
    [m(N, 'log', { fit: 1 })],
    [m(S, 'resource-planks', { fit: 1 })],
    [m(S, 'resource-planks', { fit: 1 }), m(S, 'resource-planks', { fit: 1, on: 0, ry: 90 }), m(S, 'resource-planks', { fit: 1, on: 1 })],
    [m(S, 'box', { fit: 1 })],
    [m(T, 'wall-wood-door', { fit: 1 })],
    [m(T, 'wall-wood-doorway-round', { fit: 1 })],
    [m(G, 'bench', { fit: 1 })],
    [m(T, 'pillar-wood', { fit: 1, sx: 1.7, sz: 1.7 }), m(N, 'statue_head', { fit: 0.42, on: 0, tint: '#9A6A3E', tintK: 0.85 })],
  ],
  stone: [
    [m(N, 'stone_smallFlatA', { fit: 1 })],
    [m(N, 'stone_smallC', { fit: 1 })],
    [m(N, 'stone_largeA', { fit: 1 })],
    [m(P, 'brick', { fit: 1, tint: '#B8B2A6', tintK: 0.6 })],
    [m(N, 'statue_block', { fit: 1 })],
    [m(S, 'resource-stone-large', { fit: 1 })],
    [m(N, 'statue_column', { fit: 1 })],
    [m(G, 'gravestone-decorative', { fit: 1, tint: '#9FB4C0', tintK: 0.3 })],
    [m(G, 'altar-stone', { fit: 1 })],
    [m(N, 'statue_obelisk', { fit: 1 })],
  ],
  fruit: [
    [m(F, 'cherries', { fit: 1 })],
    [m(F, 'apple', { fit: 1, tint: '#7A3E8E', tintK: 0.8 })],
    [m(F, 'apple', { fit: 1 })],
    [m(F, 'bowl', { fit: 1 }), m(F, 'apple', { fit: 0.45, on: 0, y: -0.2, x: -0.12 }), m(F, 'pear', { fit: 0.45, on: 0, y: -0.2, x: 0.14 }), m(F, 'grapes', { fit: 0.4, on: 0, y: -0.2, z: 0.15 })],
    [m(M, 'display-fruit', { fit: 1 })],
    [m(F, 'honey', { fit: 1, tint: '#C8324A', tintK: 0.7 })],
    [m(F, 'pie', { fit: 1, tint: '#D04A5A', tintK: 0.35 })],
    [m(S, 'box-open', { fit: 1 }), m(F, 'apple', { fit: 0.4, on: 0, y: -0.18, x: -0.15 }), m(F, 'pear', { fit: 0.42, on: 0, y: -0.18, x: 0.15 }), m(F, 'banana', { fit: 0.5, on: 0, y: -0.15, z: 0.12 }), m(F, 'grapes', { fit: 0.4, on: 0, y: -0.15, z: -0.12 })],
    [m(N, 'pot_large', { fit: 0.55, tint: TERRA, tintK: 0.5 }), m(N, 'tree_default', { fit: 0.85, on: 0, y: -0.1, tint: '#5FB44A', tintK: 0.45 }), m(F, 'apple', { fit: 0.14, x: 0.18, y: 0.75, z: 0.2, ground: false }), m(F, 'apple', { fit: 0.14, x: -0.16, y: 0.85, z: 0.18, ground: false })],
    [m(F, 'apple', { fit: 1, tint: GOLD, tintK: 0.9 })],
  ],
  lantern: [
    [m(P, 'star', { fit: 1, tint: '#FFD86A', tintK: 0.4 })],
    [m(G, 'candle', { fit: 1, tint: '#F6EBD0', tintK: 0.5 })],
    [m(G, 'candle-multiple', { fit: 1, tint: '#F6EBD0', tintK: 0.5 })],
    [m(G, 'lantern-glass', { fit: 1 })],
    [m(G, 'lantern-candle', { fit: 1, tint: '#D9A441', tintK: 0.4 })],
    [m(G, 'lightpost-single', { fit: 1 })],
    [m(T, 'lantern', { fit: 1 })],
    [m(P, 'heart', { fit: 1, tint: '#FFC94A', tintK: 0.75 })],
  ],
  grain: [
    [m(N, 'crops_wheatStageA', { fit: 1 })],
    [m(N, 'crops_wheatStageB', { fit: 1 })],
    [m(G, 'hay-bale-bundled', { fit: 1 })],
    [m(F, 'bag', { fit: 1, tint: CREAM, tintK: 0.6 })],
    [m(F, 'loaf-round', { fit: 1, tint: '#F5E6C8', tintK: 0.8 })],
    [m(F, 'loaf', { fit: 1 })],
    [m(S, 'box-open', { fit: 1, tint: '#C99A6A', tintK: 0.3 }), m(F, 'loaf', { fit: 0.5, on: 0, y: -0.2, x: -0.12 }), m(F, 'loaf-baguette', { fit: 0.6, on: 0, y: -0.15, x: 0.1, rz: 20 }), m(F, 'croissant', { fit: 0.35, on: 0, y: -0.12, z: 0.18 })],
    [m(F, 'cake', { fit: 1 })],
    [m(F, 'mincemeat-pie', { fit: 1 })],
    [m(U, 'tableCloth', { fit: 1 }), m(F, 'cake-birthday', { fit: 0.35, on: 0, y: -0.02, x: -0.15 }), m(F, 'pie', { fit: 0.3, on: 0, y: -0.02, x: 0.2, z: 0.05 }), m(F, 'loaf', { fit: 0.3, on: 0, y: -0.02, z: -0.15, x: 0.1 })],
  ],
  honey: [
    [m(N, 'flower_yellowC', { fit: 1 })],
    [m(P, 'jewel', { fit: 1, sy: 1.3, tint: '#FFB830', tintK: 0.9 })],
    [m(P, 'block-grass-low-hexagon', { fit: 1, tint: '#F0B43A', tintK: 0.9 })],
    [m(F, 'honey', { fit: 1 })],
    [m(S, 'barrel', { fit: 1, tint: AMBER, tintK: 0.35 })],
    [m(G, 'candle', { fit: 1, tint: '#F2D06B', tintK: 0.7 })],
    [m(P, 'block-grass-low-hexagon', { fit: 0.8, tint: '#F0B43A', tintK: 0.9 }), m(P, 'block-grass-low-hexagon', { fit: 0.8, on: 0, x: 0.2, tint: '#F5C24E', tintK: 0.9 }), m(C, 'animal-bee', { fit: 0.4, on: 1 })],
    [m(G, 'urn-round', { fit: 1, tint: GOLD, tintK: 0.75 }), m(C, 'animal-bee', { fit: 0.32, x: 0.4, y: 0.5, z: 0.3, ground: false })],
    [m(F, 'honey', { fit: 0.6 }), m(F, 'honey', { fit: 0.45, x: 0.45, z: 0.05 }), m(F, 'honey', { fit: 0.45, x: -0.4, z: 0.15 }), m(C, 'animal-bee', { fit: 0.3, y: 0.75, ground: false }), m(N, 'flower_yellowA', { fit: 0.4, x: 0.1, z: 0.45 })],
  ],
  fabric: [
    [m(F, 'whipped-cream', { fit: 1, tint: '#FFFFFF', tintK: 0.3 })],
    [m(F, 'donut', { fit: 1, tint: BLUE, tintK: 0.85 })],
    [m(F, 'can-small', { fit: 1, tint: BLUE, tintK: 0.7 })],
    [m(S, 'bedroll-packed', { fit: 1, tint: BLUE, tintK: 0.6 })],
    [m(S, 'box-open', { fit: 1, tint: '#C99A6A', tintK: 0.3 }), m(S, 'bedroll-packed', { fit: 0.55, on: 0, y: -0.2, tint: '#D97A8A', tintK: 0.6 }), m(F, 'donut', { fit: 0.35, on: 0, y: -0.15, x: 0.2, tint: BLUE, tintK: 0.8 })],
    [m(U, 'pillowBlue', { fit: 1 })],
    [m(S, 'bedroll', { fit: 1, tint: '#C96A7A', tintK: 0.5 })],
    [m(U, 'rugRectangle', { fit: 1, tint: '#C9584A', tintK: 0.45 })],
    [m(T, 'banner-red', { fit: 1 })],
  ],
  ceramic: [
    [m(N, 'stone_smallFlatB', { fit: 1, tint: TERRA, tintK: 0.85 })],
    [m(F, 'bowl', { fit: 1, tint: TERRA, tintK: 0.7 })],
    [m(F, 'cup-tea', { fit: 1 })],
    [m(D, 'pot', { fit: 1 })],
    [m(G, 'urn-square', { fit: 1, tint: TERRA, tintK: 0.6 })],
    [m(H, 'floor-stone', { fit: 1, tint: '#6FA6D8', tintK: 0.6 })],
    [m(F, 'plate-dinner', { fit: 1, tint: '#7FA7C9', tintK: 0.35 })],
    [m(G, 'lantern-candle', { fit: 1, tint: TERRA, tintK: 0.75 })],
    [m(N, 'pot_large', { fit: 1, tint: '#D98B5F', tintK: 0.6 })],
  ],
  shell: [
    [m(F, 'mussel', { fit: 1, tint: '#F7C2AE', tintK: 0.8 })],
    [m(F, 'mussel', { fit: 0.7, tint: '#F2B08A', tintK: 0.8 }), m(N, 'rock_smallA', { fit: 0.5, x: 0.4, z: -0.1 })],
    [m(P, 'star', { fit: 1, rx: -70, tint: CORAL, tintK: 0.85 })],
    [m(F, 'mussel-open', { fit: 1, tint: '#C9A0D8', tintK: 0.6 })],
    [m(F, 'mussel-open', { fit: 1, tint: '#F2D9CC', tintK: 0.4 }), m(R, 'cannon-ball', { fit: 0.3, on: 0, y: -0.15, tint: '#FFF6EE', tintK: 0.95 })],
    [m(N, 'statue_ring', { fit: 1, tint: '#F2C9B8', tintK: 0.7 }), m(F, 'mussel', { fit: 0.3, x: 0.35, z: 0.35 })],
    [m(N, 'cactus_tall', { fit: 1, tint: CORAL, tintK: 0.85 })],
    [m(D, 'chest', { fit: 1, tint: '#4FA3A8', tintK: 0.45 })],
    [m(R, 'chest', { fit: 1 }), m(R, 'cannon-ball', { fit: 0.25, x: 0.5, z: 0.35, tint: '#FFF6EE', tintK: 0.95 }), m(N, 'cactus_short', { fit: 0.45, x: -0.55, z: 0.25, tint: CORAL, tintK: 0.85 })],
  ],
  crystal: [
    [m(P, 'jewel', { fit: 1, sy: 1.6, tint: '#8FD3E8', tintK: 0.8 })],
    [m(P, 'jewel', { fit: 1, sy: 1.8, tint: '#F4F8FF', tintK: 0.85 }), m(P, 'jewel', { fit: 0.55, sy: 1.6, x: 0.35, z: 0.1, rz: -20, tint: '#E6F0FF', tintK: 0.85 })],
    [m(P, 'jewel', { fit: 1, sy: 1.8, tint: '#9A6ADB', tintK: 0.85 }), m(P, 'jewel', { fit: 0.6, sy: 1.6, x: 0.38, z: 0.1, rz: -22, tint: '#B48AEB', tintK: 0.85 })],
    [m(N, 'stone_smallFlatA', { fit: 1 }), m(P, 'jewel', { fit: 0.55, sy: 1.8, on: 0, y: -0.05, tint: '#7FD3F2', tintK: 0.85 }), m(P, 'jewel', { fit: 0.4, sy: 1.6, on: 0, x: 0.25, y: -0.05, rz: -25, tint: '#9FE6F0', tintK: 0.85 }), m(P, 'jewel', { fit: 0.38, sy: 1.6, on: 0, x: -0.25, z: 0.05, y: -0.05, rz: 25, tint: '#6AC3E8', tintK: 0.85 })],
    [m(P, 'jewel', { fit: 1, sy: 1.3, ry: 30, tint: '#DFF6FF', tintK: 0.6 })],
    [m(N, 'statue_ring', { fit: 1, tint: '#C9B07A', tintK: 0.5 }), m(P, 'jewel', { fit: 0.3, x: 0, y: 0.45, z: 0.05, ground: false, tint: '#9FE6F0', tintK: 0.85 })],
    [m(G, 'altar-stone', { fit: 0.9 }), m(R, 'cannon-ball', { fit: 0.42, on: 0, tint: '#8FE3F2', tintK: 0.95 })],
    [m(P, 'star', { fit: 1, tint: '#7FD3F2', tintK: 0.85 })],
    [m(N, 'stone_largeB', { fit: 1 }), m(P, 'jewel', { fit: 0.42, sy: 1.7, on: 0, y: -0.12, tint: '#E06AB8', tintK: 0.85 }), m(P, 'jewel', { fit: 0.38, sy: 1.6, x: 0.45, z: 0.35, rz: -20, tint: '#F2D24A', tintK: 0.85 }), m(P, 'jewel', { fit: 0.38, sy: 1.6, x: -0.45, z: 0.3, rz: 20, tint: '#6AD38A', tintK: 0.85 }), m(P, 'jewel', { fit: 0.3, sy: 1.6, x: 0.05, z: 0.55, tint: '#6AA8F2', tintK: 0.85 })],
  ],
  memory: [
    [m(P, 'jewel', { fit: 1, tint: LAV, tintK: 0.85 })],
    [m(F, 'cutting-board', { fit: 1, tint: '#F0E2C4', tintK: 0.85 })],
    [m(U, 'bathroomMirror', { fit: 1, tint: '#C9A87A', tintK: 0.4, desat: 0.3 })],
    [m(R, 'chest', { fit: 1, tint: LAV, tintK: 0.4 })],
    [m(U, 'books', { fit: 1, tint: '#9A7AC9', tintK: 0.35 })],
    [m(U, 'books', { fit: 1 }), m(U, 'books', { fit: 1, on: 0, ry: 25 })],
    [m(F, 'cutting-board', { fit: 1, tint: '#E9D3A0', tintK: 0.85 }), m(P, 'flag', { fit: 0.4, on: 0, y: -0.02, x: 0.2 })],
    [m(N, 'statue_obelisk', { fit: 1, tint: LAV, tintK: 0.7 }), m(P, 'jewel', { fit: 0.3, x: 0.4, z: 0.35, tint: '#F2E6FF', tintK: 0.8 })],
  ],
};

const GLOW = { lantern: '#FFE6A0', crystal: '#BDEFFF', memory: '#E4D8FF' };
const out = {};
for (const [fam, levels] of Object.entries(I)) {
  levels.forEach((items0, i) => {
    let items = items0;
    const WOODT = { tint: '#B98252', tintK: 0.45 };
    if (fam === 'wood' && i < 6) items = items.map((x) => ({ ...WOODT, ...x }));
    const spec = { size: 256, pad: 0.07, shadowOpacity: 0.24, items };
    if (fam === 'crystal' || fam === 'memory') spec.warm = false;
    if (GLOW[fam] && i >= 2) Object.assign(spec, { glow: GLOW[fam], glowA: 0.25 + i * 0.04 });
    out[`item_${fam}_${i + 1}`] = spec;
  });
}
writeFileSync(process.argv[2] ?? 'items.json', JSON.stringify(out, null, 0));
console.log(Object.keys(out).length);
