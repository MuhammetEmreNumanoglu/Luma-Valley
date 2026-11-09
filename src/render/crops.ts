// Grape, pumpkin and watermelon: four growth stages each and their harvest, drawn in a 100×100
// box. Each family reads at a glance by colour (purple / orange / green-and-red) and by shape
// (clusters / ribbed globe / striped oval), even at small board sizes.
import { Skia, type SkCanvas } from '@shopify/react-native-skia';

import { ball, blob, blur, body, curve, fill, leaf, lin, line, ovalPath, poly, rad, shade, shadow, shine, type Pt } from './kit';

type Drawer = (c: SkCanvas) => void;

const SOIL = '#6B4527';
const LEAF = '#4E9A3A';
const GRAPE = '#7A3E9D';
const PUMPKIN = '#F2861E';
const RIND = '#2F7D32';
const FLESH = '#E8414B';

// ---- shared pieces -----------------------------------------------------------------------

/** Rounded mound of tilled soil the plant grows from (like the other plot chains). */
function mound(c: SkCanvas, cx = 50, y = 84, w = 50, h = 1) {
  shadow(c, cx, y + 4, w * 0.62, w * 0.12, 0.28);
  const p = blob([
    [cx - w / 2, y + 2],
    [cx - w * 0.36, y - 8 * h],
    [cx - w * 0.1, y - 13 * h],
    [cx + w * 0.18, y - 12 * h],
    [cx + w * 0.42, y - 6 * h],
    [cx + w / 2, y + 2],
    [cx, y + 7],
  ]);
  c.drawPath(p, lin(0, y - 13 * h, 0, y + 7, [shade(SOIL, 0.25), SOIL, shade(SOIL, -0.35)]));
  c.drawPath(p, line(shade(SOIL, -0.5), 1.2, 0.5));
  for (const [x, yy, r] of [[cx - 12, y - 4, 1.6], [cx + 6, y - 7, 1.2], [cx + 16, y - 2, 1.4], [cx - 3, y + 1, 1]] as const) {
    c.drawCircle(x, yy, r, fill(shade(SOIL, 0.45), 0.8));
  }
}

/** Stem from (x0, y0) up through the given points. */
function stem(c: SkCanvas, pts: Pt[], width = 3, hex = '#5C8F2E') {
  const p = curve(pts);
  c.drawPath(p, line(shade(hex, -0.35), width + 1.4));
  c.drawPath(p, line(hex, width));
  c.drawPath(p, line(shade(hex, 0.35), width * 0.35, 0.7));
}

/** Curly tendril ending in a small spiral. */
function tendril(c: SkCanvas, x: number, y: number, s: number, dir = 1) {
  const pts: Pt[] = [];
  for (let i = 0; i <= 22; i++) {
    const t = i / 22;
    const r = s * (1 - t * 0.75);
    const a = t * Math.PI * 3.2;
    pts.push([x + dir * (t * s * 0.9 + Math.sin(a) * r * 0.35), y - t * s * 0.6 - Math.cos(a) * r * 0.35 + r * 0.35]);
  }
  c.drawPath(curve(pts), line('#6FA83A', 1.3));
}

/** Palmate leaf with `lobes` points (grape: 5 sharp, pumpkin: 5 round, melon: 7 deep). */
function lobedLeaf(c: SkCanvas, x: number, y: number, r: number, ang: number, hex: string, lobes: number, depth: number, round = false) {
  c.save();
  c.translate(x, y);
  c.rotate(ang, 0, 0);
  const pts: Pt[] = [];
  const n = lobes * 2;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 0.55 + (i / (n - 1)) * Math.PI * 1.9;
    const k = i % 2 === 0 ? 1 : 1 - depth;
    pts.push([Math.cos(a) * r * k, Math.sin(a) * r * k - r * 0.15]);
  }
  pts.push([0, r * 0.25]);
  const p = round ? blob(pts, 0.9) : poly(pts);
  c.drawPath(p, rad(-r * 0.3, -r * 0.5, r * 1.6, [shade(hex, 0.38), hex, shade(hex, -0.3)], [0, 0.5, 1]));
  c.drawPath(p, line(shade(hex, -0.45), 1.1, 0.6));
  for (let i = 0; i < lobes; i++) {
    const a = Math.PI * 0.55 + ((i * 2) / (n - 1)) * Math.PI * 1.9;
    c.drawLine(0, r * 0.15, Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78 - r * 0.15, line(shade(hex, -0.3), 0.9, 0.55));
  }
  c.restore();
}

/** A grape: glossy sphere with a tiny highlight. */
function grape(c: SkCanvas, x: number, y: number, r: number, hex = GRAPE) {
  ball(c, x, y, r, hex, 0.9);
  c.drawCircle(x - r * 0.35, y - r * 0.38, r * 0.28, fill('#FFFFFF', 0.55));
}

/** Triangular bunch of grapes hanging from (x, y). */
function bunch(c: SkCanvas, x: number, y: number, r: number, rows: number, hex = GRAPE) {
  c.drawLine(x, y - r * 1.6, x, y, line('#6B4B2A', 1.6));
  for (let row = 0; row < rows; row++) {
    const count = rows - row;
    for (let i = 0; i < count; i++) {
      const gx = x + (i - (count - 1) / 2) * r * 1.65;
      const gy = y + row * r * 1.45;
      grape(c, gx, gy, r, row % 2 ? shade(hex, -0.06) : hex);
    }
  }
}

/** Ribbed pumpkin centred at (x, y). */
function pumpkin(c: SkCanvas, x: number, y: number, w: number, h: number, hex = PUMPKIN) {
  shadow(c, x, y + h * 0.48, w * 0.55, h * 0.12, 0.25);
  const ribs = [-0.36, 0.36, -0.18, 0.18, 0];
  for (const k of ribs) {
    const rw = w * (k === 0 ? 0.42 : Math.abs(k) > 0.3 ? 0.36 : 0.4);
    const p = ovalPath(x + k * w, y, rw, h / 2);
    const tone = k === 0 ? 0.05 : Math.abs(k) > 0.3 ? -0.12 : 0;
    c.drawPath(p, rad(x + k * w - rw * 0.3, y - h * 0.3, h * 0.9, [shade(hex, 0.45 + tone), shade(hex, tone), shade(hex, -0.35 + tone)], [0, 0.5, 1]));
    c.drawPath(p, line(shade(hex, -0.45), 1, 0.45));
  }
  // Grooves between the ribs.
  for (const k of [-0.27, -0.09, 0.09, 0.27]) {
    const gx = x + k * w * 1.05;
    const sag = Math.sign(k) * w * 0.04;
    c.drawPath(curve([[gx - sag * 0.5, y - h * 0.44], [gx + sag, y], [gx - sag * 0.5, y + h * 0.44]]), line(shade(hex, -0.5), Math.max(1, w * 0.025), 0.5));
  }
  shine(c, x - w * 0.12, y - h * 0.22, w * 0.1, h * 0.12, 0.5);
  // Stem.
  const s = poly([
    [x - 3, y - h * 0.42],
    [x + 2, y - h * 0.42],
    [x + 5, y - h * 0.62],
    [x + 1, y - h * 0.64],
  ]);
  body(c, s, '#6E7A2E', y - h * 0.64, y - h * 0.4, { rim: 1 });
}

/** Oval watermelon with dark wavy stripes. */
function melon(c: SkCanvas, x: number, y: number, w: number, h: number) {
  shadow(c, x, y + h * 0.45, w * 0.55, h * 0.13, 0.25);
  const p = ovalPath(x, y, w / 2, h / 2);
  c.drawPath(p, rad(x - w * 0.2, y - h * 0.3, w * 0.75, [shade(RIND, 0.55), shade(RIND, 0.2), shade(RIND, -0.25)], [0, 0.5, 1]));
  c.save();
  c.clipPath(p, 1, true);
  for (let i = -3; i <= 3; i++) {
    const sx = x + i * w * 0.15;
    const pts: Pt[] = [];
    for (let j = 0; j <= 8; j++) {
      const t = j / 8;
      pts.push([sx + Math.sin(t * Math.PI * 3 + i) * w * 0.025 + (t - 0.5) * i * w * 0.05, y - h * 0.55 + t * h * 1.1]);
    }
    c.drawPath(curve(pts), line(shade(RIND, -0.42), w * 0.055, 0.85));
  }
  c.restore();
  c.drawPath(p, line(shade(RIND, -0.55), 1.2, 0.6));
  shine(c, x - w * 0.18, y - h * 0.24, w * 0.14, h * 0.1, 0.45);
}

/** Five-petal trumpet flower (pumpkin / melon blossoms). */
function trumpet(c: SkCanvas, x: number, y: number, r: number, hex: string) {
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    const p = ovalPath(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, r * 0.5);
    c.drawPath(p, rad(x, y, r * 1.2, [shade(hex, 0.4), hex, shade(hex, -0.2)], [0, 0.6, 1]));
  }
  ball(c, x, y, r * 0.3, shade(hex, -0.25), 0);
}

/** Seed shaped like a teardrop. */
function seed(c: SkCanvas, x: number, y: number, w: number, h: number, ang: number, hex: string, shiny = 0.45) {
  c.save();
  c.translate(x, y);
  c.rotate(ang, 0, 0);
  const p = blob([
    [0, -h / 2],
    [w / 2, h * 0.1],
    [0, h / 2],
    [-w / 2, h * 0.1],
  ], 1);
  c.drawPath(p, lin(0, -h / 2, 0, h / 2, [shade(hex, 0.35), hex, shade(hex, -0.3)]));
  c.drawPath(p, line(shade(hex, -0.5), 0.9, 0.6));
  c.drawOval(Skia.XYWHRect(-w * 0.2, -h * 0.25, w * 0.18, h * 0.3), blur(fill('#FFFFFF', shiny), 0.6));
  c.restore();
}

/** Round seed leaf pair at the top of a sprout. */
function cotyledons(c: SkCanvas, x: number, y: number, s: number, hex = '#6DB043') {
  leaf(c, x, y, s, s * 0.42, -Math.PI * 0.92, hex, false);
  leaf(c, x, y, s, s * 0.42, -Math.PI * 0.08, hex, false);
}

/** Small wooden stake. */
function stake(c: SkCanvas, x: number, top: number, bottom: number) {
  const p = poly([
    [x - 2, top],
    [x + 2, top],
    [x + 2.2, bottom],
    [x - 2.2, bottom],
  ]);
  body(c, p, '#A97A4A', top, bottom, { rim: 0.9 });
}

// ---- grape ---------------------------------------------------------------------------------

const grapeChain: Drawer[] = [
  (c) => {
    mound(c, 50, 80, 76, 2.1);
    seed(c, 36, 58, 9, 14, -20, '#9A6A3A');
    seed(c, 50, 54, 9, 14, 15, '#9A6A3A');
    grape(c, 64, 58, 9);
    grape(c, 56, 66, 7.5, shade(GRAPE, -0.1));
  },
  (c) => {
    mound(c, 50, 86, 64, 1.4);
    stem(c, [[50, 78], [48, 56], [52, 34]], 3.4, '#7A6A3A');
    lobedLeaf(c, 36, 46, 17, -35, LEAF, 5, 0.32);
    lobedLeaf(c, 64, 34, 18, 25, shade(LEAF, 0.08), 5, 0.32);
    tendril(c, 52, 34, 14, 1);
  },
  (c) => {
    mound(c, 50, 86, 52);
    stake(c, 62, 22, 82);
    stem(c, [[48, 82], [52, 66], [58, 52], [61, 36], [60, 26]], 3, '#7A6A3A');
    lobedLeaf(c, 40, 58, 13, -40, LEAF, 5, 0.32);
    lobedLeaf(c, 70, 46, 13, 30, shade(LEAF, 0.08), 5, 0.32);
    lobedLeaf(c, 50, 34, 12, -15, shade(LEAF, -0.05), 5, 0.32);
    bunch(c, 54, 52, 3.4, 3, '#9BC45A');
    tendril(c, 61, 28, 9, -1);
  },
  (c) => {
    mound(c, 50, 88, 60);
    stake(c, 28, 20, 84);
    stake(c, 72, 20, 84);
    c.drawPath(poly([[24, 22], [76, 22], [76, 26], [24, 26]]), lin(0, 22, 0, 26, ['#C4925A', '#8A5E34']));
    stem(c, [[50, 84], [46, 64], [40, 44], [34, 28], [50, 24], [66, 26]], 3.2, '#7A5A34');
    lobedLeaf(c, 30, 30, 12, -20, LEAF, 5, 0.32);
    lobedLeaf(c, 64, 30, 13, 20, shade(LEAF, 0.08), 5, 0.32);
    lobedLeaf(c, 48, 56, 12, -30, shade(LEAF, -0.06), 5, 0.32);
    bunch(c, 40, 38, 4, 4);
    bunch(c, 62, 40, 4, 4, shade(GRAPE, -0.08));
  },
];

const grapeHarvest: Drawer = (c) => {
  shadow(c, 50, 88, 26, 5, 0.3);
  lobedLeaf(c, 64, 22, 15, 30, LEAF, 5, 0.32);
  tendril(c, 48, 18, 10, -1);
  bunch(c, 48, 30, 6.2, 5);
  shine(c, 38, 34, 3, 2, 0.4);
};

// ---- pumpkin -------------------------------------------------------------------------------

const pumpkinChain: Drawer[] = [
  (c) => {
    mound(c, 50, 80, 76, 2.1);
    seed(c, 34, 58, 14, 20, -30, '#F4EAD0', 0.6);
    seed(c, 51, 52, 14, 20, 10, '#F4EAD0', 0.6);
    seed(c, 66, 60, 14, 20, 45, '#F4EAD0', 0.6);
  },
  (c) => {
    mound(c, 50, 86, 64, 1.4);
    stem(c, [[50, 78], [50, 58], [50, 42]], 3.6);
    cotyledons(c, 50, 46, 24);
    lobedLeaf(c, 50, 30, 14, 0, shade(LEAF, 0.05), 5, 0.12, true);
  },
  (c) => {
    mound(c, 50, 86, 54);
    stem(c, [[44, 82], [40, 66], [50, 52], [62, 46]], 3);
    lobedLeaf(c, 34, 54, 16, -25, LEAF, 5, 0.14, true);
    lobedLeaf(c, 64, 40, 15, 20, shade(LEAF, 0.08), 5, 0.14, true);
    trumpet(c, 52, 36, 8, '#F7B21C');
    pumpkin(c, 62, 72, 14, 11, '#8DBF3E');
  },
  (c) => {
    mound(c, 50, 88, 62);
    lobedLeaf(c, 24, 58, 15, -35, LEAF, 5, 0.14, true);
    lobedLeaf(c, 76, 56, 15, 35, shade(LEAF, 0.08), 5, 0.14, true);
    tendril(c, 70, 44, 11, 1);
    pumpkin(c, 50, 64, 44, 32);
  },
];

const pumpkinHarvest: Drawer = (c) => {
  lobedLeaf(c, 64, 22, 12, 30, LEAF, 5, 0.14, true);
  pumpkin(c, 50, 58, 62, 46);
};

// ---- watermelon ----------------------------------------------------------------------------

const melonChain: Drawer[] = [
  (c) => {
    mound(c, 50, 80, 76, 2.1);
    seed(c, 34, 58, 9, 15, -25, '#2A2320', 0.7);
    seed(c, 48, 52, 9, 15, 5, '#2A2320', 0.7);
    seed(c, 60, 60, 9, 15, 30, '#2A2320', 0.7);
    seed(c, 68, 52, 8, 13, 60, '#2A2320', 0.7);
  },
  (c) => {
    mound(c, 50, 86, 64, 1.4);
    stem(c, [[50, 78], [50, 58], [50, 44]], 3.4);
    cotyledons(c, 50, 48, 22, '#79B84A');
    lobedLeaf(c, 50, 31, 15, 0, shade(LEAF, -0.05), 7, 0.45);
  },
  (c) => {
    mound(c, 50, 86, 54);
    stem(c, [[46, 82], [40, 66], [48, 50], [62, 42]], 2.8);
    lobedLeaf(c, 32, 56, 14, -30, LEAF, 7, 0.45);
    lobedLeaf(c, 66, 38, 13, 25, shade(LEAF, 0.06), 7, 0.45);
    trumpet(c, 48, 40, 6, '#F6D23A');
    melon(c, 60, 72, 18, 12);
  },
  (c) => {
    mound(c, 50, 88, 62);
    lobedLeaf(c, 24, 54, 14, -35, LEAF, 7, 0.45);
    lobedLeaf(c, 76, 52, 14, 35, shade(LEAF, 0.06), 7, 0.45);
    tendril(c, 26, 42, 10, -1);
    melon(c, 50, 66, 52, 32);
  },
];

const melonHarvest: Drawer = (c) => {
  melon(c, 42, 48, 60, 46);
  // A wedge in front, point down: green rind on top, pale band, red flesh with black seeds.
  const cx = 68, top = 62;
  const wedge = (inset: number) => poly([[cx - 20 + inset, top + inset * 0.6], [cx + 20 - inset, top + inset * 0.6], [cx, top + 30 - inset * 1.6]]);
  shadow(c, cx, top + 31, 16, 3.5, 0.25);
  c.drawPath(wedge(0), fill(shade(RIND, -0.05)));
  c.drawPath(wedge(2.6), fill('#E9F3D4'));
  c.drawPath(wedge(4.2), lin(0, top, 0, top + 26, [shade(FLESH, 0.3), FLESH, shade(FLESH, -0.15)]));
  for (const [x, y] of [[cx - 7, top + 8], [cx + 6, top + 9], [cx, top + 15], [cx - 3, top + 21]] as const) seed(c, x, y, 2.6, 4, 0, '#2A2320', 0.6);
  c.drawPath(wedge(0), line(shade(RIND, -0.55), 1, 0.6));
  shine(c, cx - 8, top + 6, 3, 1.6, 0.35);
};

export const CROP_DRAWERS: Record<'grapeFarm' | 'pumpkinFarm' | 'melonFarm' | 'grapeCrop' | 'pumpkinCrop' | 'melonCrop', Drawer[]> = {
  grapeFarm: grapeChain,
  pumpkinFarm: pumpkinChain,
  melonFarm: melonChain,
  grapeCrop: [grapeHarvest],
  pumpkinCrop: [pumpkinHarvest],
  melonCrop: [melonHarvest],
};
