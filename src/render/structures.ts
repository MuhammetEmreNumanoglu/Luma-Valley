// Restorable structures. Drawn at their ground point (0,0), ~110 units wide, growing upwards.
// `k` is restoration progress 0..1: 0 = ruin (faded, broken, no roof), in between = scaffolding
// and partial build, 1 = complete with warm lights. Ambient motion (smoke, sails, water) is in
// render/ambient.ts so this picture can stay static.
import { Skia, type SkCanvas } from '@shopify/react-native-skia';

import type { StructureDef } from '../content/regions';
import { colors } from '../ui/theme';
import { apple, comb, gem, lanternBody, scallop } from './items';
import { ball, blob, blossom, body, curve, cylinder, fade, fill, glow, isoBox, leaf, lin, line, poly, rad, rrectPath, shade, shadow, shine, sparkle, star5, type Pt } from './kit';

export interface Look {
  /** Restoration 0..1. */
  k: number;
  /** Decoration variant chosen by the player (0..3). */
  decor: number;
  /** Variant from content (roof colours). */
  v: number;
  region: number;
}

const ROOFS = ['#C8563A', '#5E86A8', '#6E9E6A', '#B8643E', '#8C6BB1', '#2F6E86', '#C8862E'];
const WALLS = ['#F2E3C8', '#F6EEDC', '#E9D9B8', '#F2D9C0', '#EAE2F0', '#E6EEF2', '#F6E9C8'];
const FLOWER_SETS = [
  ['#EE8FB0', '#F6C443', '#FFFFFF'],
  ['#B9A3E3', '#8E6ED0', '#FFFFFF'],
  ['#F2865A', '#F6C443', '#E8644A'],
  ['#7FA7C9', '#FFFFFF', '#B9E0EA'],
];

function T(L: Look) {
  const amount = L.k >= 1 ? 0 : 0.62 - L.k * 0.3;
  return (hex: string) => (amount > 0 ? fade(hex, amount) : hex);
}

function scaffold(c: SkCanvas, w: number, h: number) {
  const pole = line('#9A7A52', 3);
  for (const x of [-w / 2 - 6, w / 2 + 6]) c.drawLine(x, 0, x, -h, pole);
  for (let y = -h * 0.3; y > -h; y -= h * 0.3) c.drawLine(-w / 2 - 10, y, w / 2 + 10, y, line('#B08A5A', 3));
  c.drawLine(-w / 2 - 6, -h * 0.3, w / 2 + 6, -h * 0.6, line('#9A7A52', 2));
}

function debris(c: SkCanvas, w: number, t: (h: string) => string) {
  for (const [x, y, r] of [[-w * 0.45, -3, 0.4], [w * 0.4, -2, -0.3], [w * 0.1, 2, 0.1]] as const) {
    c.save();
    c.rotate(r * 57, x, y);
    c.drawRect(Skia.XYWHRect(x - 10, y - 2.5, 20, 5), fill(t('#9A7A52')));
    c.restore();
  }
  c.drawCircle(-w * 0.25, 0, 4, fill(t('#A7AFB4')));
  c.drawCircle(w * 0.3, 1, 3, fill(t('#A7AFB4')));
}

function flowerBox(c: SkCanvas, x: number, y: number, w: number, set: string[]) {
  c.drawRect(Skia.XYWHRect(x, y, w, 4), fill('#8E5A2E'));
  for (let i = 0; i < 4; i++) c.drawCircle(x + 3 + (i * (w - 6)) / 3, y - 1, 2.6, fill(set[i % set.length]));
}

/** Generic house body used by many types. */
function house(c: SkCanvas, L: Look, w: number, h: number, opts: { roof?: string; wall?: string; chimney?: boolean; roofH?: number; wide?: boolean; sign?: (c: SkCanvas) => void } = {}) {
  const t = T(L);
  const wall = t(opts.wall ?? WALLS[L.v % WALLS.length]);
  const roofHex = t(L.decor > 0 && opts.roof === undefined ? ROOFS[(L.v + L.decor) % ROOFS.length] : (opts.roof ?? ROOFS[L.v % ROOFS.length]));
  const roofH = opts.roofH ?? h * 0.75;
  shadow(c, 0, 0, w * 0.62, 7);
  if (L.k < 0.34) {
    // Ruin: broken walls, no roof.
    const p = poly([[-w / 2, 0], [-w / 2, -h * 0.85], [-w * 0.3, -h * 0.6], [-w * 0.1, -h * 0.75], [w * 0.15, -h * 0.45], [w * 0.35, -h * 0.65], [w / 2, -h * 0.4], [w / 2, 0]]);
    body(c, p, wall, -h, 0);
    c.drawPath(poly([[-w * 0.15, 0], [-w * 0.15, -h * 0.45], [w * 0.1, -h * 0.45], [w * 0.1, 0]]), fill(t('#5A4A3E')));
    c.drawPath(curve([[-w * 0.4, -h * 0.5], [-w * 0.3, -h * 0.3], [-w * 0.35, -h * 0.1]]), line(t('#8E7E66'), 1.4));
    debris(c, w, t);
    c.drawPath(blob([[-w / 2, 0], [-w * 0.4, -10], [-w * 0.28, 0]]), fill(t('#6FAE52')));
    return;
  }
  const full = L.k >= 1;
  body(c, poly([[-w / 2, 0], [-w / 2, -h], [w / 2, -h], [w / 2, 0]]), wall, -h, 0, { rim: 1.6 });
  // timber frame
  for (const x of [-w / 2 + 3, w / 2 - 3]) c.drawLine(x, 0, x, -h, line(t('#8E5A2E'), 3));
  c.drawLine(-w / 2, -h, w / 2, -h, line(t('#8E5A2E'), 3));
  if (opts.chimney) c.drawRect(Skia.XYWHRect(w * 0.2, -h - roofH * 0.85, 10, roofH * 0.6), lin(0, 0, 0, 1, [t('#9A5232'), t('#6E3A22')]));
  const roofPath = poly([[-w / 2 - 8, -h + 2], [0, -h - roofH], [w / 2 + 8, -h + 2]]);
  if (L.k < 0.67) {
    c.save();
    c.clipRect(Skia.XYWHRect(-w, -h - roofH - 5, w, roofH + 10), 1, true);
    body(c, roofPath, roofHex, -h - roofH, -h);
    c.restore();
    c.drawPath(poly([[0, -h - roofH], [w / 2 + 8, -h + 2]], false), line(t('#8E5A2E'), 2.4));
    for (let i = 1; i < 4; i++) c.drawLine(w * 0.12 * i, -h - roofH + (roofH * i) / 4.2, w * 0.12 * i, -h, line(t('#8E5A2E'), 1.8));
  } else {
    body(c, roofPath, roofHex, -h - roofH, -h);
    for (let i = 1; i < 4; i++) {
      const y = -h - roofH + (roofH * i) / 4;
      const half = ((w / 2 + 8) * i) / 4;
      c.drawLine(-half, y, half, y, line(shade(roofHex, -0.3), 1.4, 0.5));
    }
  }
  // door + windows
  const dw = opts.wide ? w * 0.4 : w * 0.22;
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(-dw / 2, -h * 0.55, dw, h * 0.55), 4, 4), fill(t(L.k >= 0.5 ? '#8E5A2E' : '#4A3A30')));
  for (const sx of [-1, 1]) {
    if (opts.wide && sx === 0) continue;
    const x = sx * w * 0.3;
    const win = Skia.XYWHRect(x - 7, -h * 0.78, 14, 13);
    c.drawRect(win, full ? rad(x, -h * 0.72, 12, ['#FFF2B8', '#FFC95A']) : fill(t('#5A6E7A')));
    c.drawRect(win, line(t('#8E5A2E'), 2));
    c.drawLine(x, -h * 0.78, x, -h * 0.78 + 13, line(t('#8E5A2E'), 1.4));
    if (full) {
      glow(c, x, -h * 0.72, 14, '#FFD27A', 0.35);
      flowerBox(c, x - 9, -h * 0.78 + 13, 18, FLOWER_SETS[L.decor % FLOWER_SETS.length]);
    }
  }
  opts.sign?.(c);
  if (L.k < 1) scaffold(c, w, h + roofH * 0.6);
}

type Painter = (c: SkCanvas, L: Look, s: StructureDef) => void;

const P: Record<StructureDef['type'], Painter> = {
  cottage: (c, L) => house(c, L, 70, 42, { chimney: true }),
  house: (c, L) => house(c, L, 62, 44, { chimney: L.v % 2 === 0 }),
  bakery: (c, L) =>
    house(c, L, 76, 46, {
      chimney: true,
      roof: '#B8643E',
      sign: (cc) => {
        cc.drawRRect(Skia.RRectXY(Skia.XYWHRect(-16, -62, 32, 14), 4, 4), fill(T(L)('#F6EEDC')));
        cc.drawPath(blob([[-8, -52], [-4, -59], [4, -59], [8, -52]]), fill(T(L)('#D9963E')));
      },
    }),
  workshop: (c, L) =>
    house(c, L, 80, 40, {
      wide: true,
      roof: '#6E7A80',
      sign: (cc) => {
        cc.drawLine(30, -48, 44, -60, line(T(L)('#7E8A90'), 3));
        cc.drawCircle(44, -60, 4, line(T(L)('#7E8A90'), 2));
      },
    }),
  barn: (c, L) => {
    const t = T(L);
    shadow(c, 0, 0, 52, 8);
    const red = t(L.v === 1 ? '#E0A030' : '#B8443A');
    if (L.k < 0.34) {
      body(c, poly([[-42, 0], [-42, -40], [-10, -30], [20, -46], [42, -30], [42, 0]]), red, -46, 0);
      debris(c, 84, t);
      return;
    }
    body(c, poly([[-42, 0], [-42, -44], [0, -72], [42, -44], [42, 0]]), red, -72, 0);
    c.drawPath(poly([[-46, -42], [0, -76], [46, -42]], false), line(t('#F6EEDC'), 4));
    c.drawRect(Skia.XYWHRect(-16, -36, 32, 36), fill(t('#6E3A22')));
    c.drawLine(-16, -36, 16, 0, line(t('#F6EEDC'), 2.4));
    c.drawLine(16, -36, -16, 0, line(t('#F6EEDC'), 2.4));
    if (L.v === 1) comb(c, 0, -54, 4, 1, 2);
    if (L.k < 1) scaffold(c, 84, 72);
  },
  shrine: (c, L) => {
    const t = T(L);
    shadow(c, 0, 0, 40, 8);
    c.drawPath(blob([[-38, 0], [-32, -18], [0, -24], [32, -18], [38, 0]]), lin(0, -24, 0, 0, [t('#C9C3B7'), t('#8E877A')]));
    c.drawPath(blob([[-24, -6], [-14, -12], [-10, -2]]), fill(t('#6FAE52')));
    c.save();
    c.translate(0, -62);
    c.scale(0.55, 0.55);
    c.translate(-50, -50);
    if (L.k >= 0.5) lanternBody(c, 50, 14, 46, 76, '#8E5A2E', L.k >= 1 ? '#FFC95A' : '#C9B98E');
    else {
      c.drawPath(poly([[30, 40], [70, 40], [64, 90], [36, 90]]), fill(t('#7E776A')));
      c.drawPath(curve([[40, 50], [50, 62], [46, 80]]), line(t('#5A544A'), 2));
    }
    c.restore();
    if (L.k >= 1) glow(c, 0, -60, 46, '#FFD27A', 0.45);
  },
  garden: (c, L) => {
    const t = T(L);
    const set = FLOWER_SETS[L.decor % FLOWER_SETS.length];
    c.drawPath(blob([[-56, 0], [-48, -26], [0, -34], [48, -26], [56, 0], [0, 8]]), lin(0, -34, 0, 8, [t('#8A5E3E'), t('#6E4A30')]));
    const n = Math.round(4 + L.k * 14);
    for (let i = 0; i < n; i++) {
      const a = (i * 2.4) % (Math.PI * 2);
      const r = 10 + ((i * 37) % 34);
      const x = Math.cos(a) * r * 1.2;
      const y = -14 + Math.sin(a) * r * 0.42;
      leaf(c, x, y + 4, 8, 3, -2.2, t('#6FAE52'), false);
      if (L.k > 0.2) blossom(c, x, y, 4 + L.k * 2, 5, t(set[i % set.length]), t('#F6C443'), i);
      else c.drawCircle(x, y, 2, fill(t('#8E877A')));
    }
    // Fence (decor 1 = white picket)
    const fence = t(L.decor === 1 ? '#F6EEDC' : '#B07A4A');
    for (let i = 0; i <= 10; i++) {
      const x = -58 + i * 11.6;
      if (L.k < 0.3 && i % 3 === 1) continue;
      c.drawRect(Skia.XYWHRect(x - 1.8, -10 + Math.abs(x) * 0.12, 3.6, 16), fill(fence));
    }
    c.drawLine(-58, -2, 58, -2, line(fence, 2.4));
  },
  greenhouse: (c, L) => {
    const t = T(L);
    shadow(c, 0, 0, 46, 8);
    const g = poly([[-40, 0], [-40, -36], [0, -64], [40, -36], [40, 0]]);
    c.drawPath(g, lin(0, -64, 0, 0, [t(L.k >= 1 ? '#E6F6FA' : '#C9CED0'), t(L.k >= 1 ? '#B9E0EA' : '#9EA6A8')]));
    if (L.k > 0.3) for (const x of [-26, -10, 8, 24]) blossom(c, x, -12, 5, 5, t('#EE8FB0'), t('#F6C443'));
    c.drawPath(g, line(t('#5E8A6E'), 2.4));
    for (const x of [-20, 0, 20]) c.drawLine(x, x === 0 ? -64 : -50, x, 0, line(t('#5E8A6E'), 1.6));
    if (L.k < 1) {
      c.drawPath(poly([[-30, -30], [-14, -40], [-20, -22]]), fill('#5A544A', 0.5));
      c.drawPath(poly([[12, -48], [26, -40], [20, -32]]), fill('#5A544A', 0.5));
    } else shine(c, -24, -36, 3, 9, 0.6);
  },
  well: (c, L) => {
    const t = T(L);
    shadow(c, 0, 0, 30, 7);
    cylinder(c, 0, -24, 22, 22, t('#B7B0A3'), t('#5A6E7A'));
    if (L.k >= 1) c.drawOval(Skia.XYWHRect(-16, -30, 32, 9), fill('#5FB3D3'));
    for (const x of [-20, 18]) c.drawRect(Skia.XYWHRect(x, -64, 4, 40), fill(t('#8E5A2E')));
    if (L.k >= 0.5) body(c, poly([[-30, -58], [0, -78], [30, -58]]), t('#C8563A'), -78, -58);
    c.drawLine(0, -62, 0, -38, line(t('#5A4A3E'), 1.2));
    c.drawRect(Skia.XYWHRect(-5, -40, 10, 8), fill(t('#9A6438')));
  },
  orchard: (c, L) => {
    const t = T(L);
    for (const [x, y, s] of [[-34, -6, 0.8], [30, -10, 0.9], [-2, 4, 1]] as const) {
      shadow(c, x, y, 18 * s, 5);
      c.drawRect(Skia.XYWHRect(x - 3, y - 26 * s, 6, 26 * s), fill(t('#7A5232')));
      c.drawPath(blob([[x - 22 * s, y - 30 * s], [x - 12 * s, y - 52 * s], [x + 12 * s, y - 52 * s], [x + 22 * s, y - 30 * s], [x, y - 20 * s]]), rad(x - 6, y - 46 * s, 30 * s, [t('#9BD47A'), t('#6FAE52'), t('#3E7A2E')], [0, 0.5, 1]));
      if (L.k >= 1) for (const [dx, dy] of [[-8, -36], [8, -40], [0, -30]] as const) apple(c, x + dx * s, y + dy * s, 3.6);
    }
    for (let i = 0; i < 8; i++) c.drawRect(Skia.XYWHRect(-52 + i * 15, 6, 3, 10), fill(t('#B07A4A')));
    c.drawLine(-52, 10, 56, 10, line(t('#B07A4A'), 2));
  },
  waterwheel: (c, L) => {
    const t = T(L);
    house(c, { ...L, v: 1 }, 50, 34, { roof: '#7A5232' });
    c.save();
    c.translate(-36, -20);
    c.drawCircle(0, 0, 22, line(t('#8E5A2E'), 4));
    if (L.k >= 0.5) for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.drawLine(0, 0, Math.cos(a) * 22, Math.sin(a) * 22, line(t('#9A6438'), 2.4));
    }
    c.drawCircle(0, 0, 4, fill(t('#5A3A1E')));
    c.restore();
  },
  beemeadow: (c, L) => {
    const t = T(L);
    for (let i = 0; i < 10; i++) {
      const x = -48 + ((i * 29) % 96);
      const y = -4 - ((i * 13) % 18);
      if (L.k > 0.3) blossom(c, x, y, 4, 5, t(FLOWER_SETS[0][i % 3]), t('#F6C443'), i);
    }
    for (const x of [-18, 18]) {
      shadow(c, x, 0, 14, 4);
      const h = blob([[x - 12, 0], [x - 13, -14], [x - 6, -26], [x + 6, -26], [x + 13, -14], [x + 12, 0]], 0.8);
      body(c, h, t('#E3B85C'), -26, 0);
      for (const y of [-8, -15, -21]) c.drawLine(x - 11, y, x + 11, y, line(t('#B88E3E'), 1.6));
      c.drawCircle(x, -6, 3, fill(t('#5A3A1E')));
    }
  },
  bridge: (c, L) => {
    const t = T(L);
    const w = 120;
    const arch = Skia.PathBuilder.Make();
    arch.moveTo(-w / 2, 6);
    arch.cubicTo(-w / 4, -26, w / 4, -26, w / 2, 6);
    arch.lineTo(w / 2, 14);
    arch.cubicTo(w / 4, -16, -w / 4, -16, -w / 2, 14);
    arch.close();
    const gapL = L.k >= 1 ? 99 : -w * 0.1 + L.k * w * 0.35;
    c.save();
    if (L.k < 1) c.clipRect(Skia.XYWHRect(-w, -60, w + gapL, 90), 1, true);
    body(c, arch.detach(), t('#B07A4A'), -26, 14);
    for (let i = 0; i <= 12; i++) {
      const x = -w / 2 + (i * w) / 12;
      const y = 6 - 26 * Math.sin((i / 12) * Math.PI) * 0.95;
      c.drawLine(x, y - 2, x, y - 22, line(t('#8E5A2E'), 2.6));
    }
    c.drawPath(curve([[-w / 2, -16], [0, -46], [w / 2, -16]]), line(t('#9A6438'), 3.4));
    c.restore();
    if (L.k < 1) {
      c.drawLine(gapL + 4, -10, gapL + 18, 8, line(t('#8E5A2E'), 3));
      c.save();
      c.clipRect(Skia.XYWHRect(w * 0.25, -60, w, 90), 1, true);
      body(c, poly([[w / 2, 6], [w * 0.3, -12], [w * 0.3, -4], [w / 2, 14]]), t('#B07A4A'), -12, 14);
      c.restore();
    }
    for (const x of [-w / 2 - 4, w / 2 + 4]) {
      c.drawRect(Skia.XYWHRect(x - 4, -36, 8, 44), fill(t('#7A5232')));
      if (L.k >= 0.66) {
        c.save();
        c.translate(x, -46);
        c.scale(0.22, 0.22);
        c.translate(-50, -50);
        lanternBody(c, 50, 20, 40, 70, '#8E5A2E', L.k >= 1 ? '#FFC95A' : '#C9B98E');
        c.restore();
      }
    }
  },
  lamppost: (c, L) => {
    const t = T(L);
    shadow(c, 0, 0, 12, 4);
    c.drawRect(Skia.XYWHRect(-3, -60, 6, 60), lin(-3, 0, 3, 0, [t('#5E5248'), t('#2E2620')]));
    c.save();
    c.translate(0, -70);
    c.scale(0.3, 0.3);
    c.translate(-50, -50);
    lanternBody(c, 50, 20, 40, 70, '#3E3630', L.k >= 1 ? '#FFC95A' : '#8E8A80');
    c.restore();
    if (L.k >= 1) glow(c, 0, -68, 34, '#FFD27A', 0.5);
  },
  stonepath: (c, L) => {
    const t = T(L);
    const n = Math.round(3 + L.k * 7);
    for (let i = 0; i < n; i++) {
      const x = -54 + i * 12;
      const y = Math.sin(i * 0.8) * 6;
      c.drawOval(Skia.XYWHRect(x - 7, y - 4, 14, 8), lin(0, y - 4, 0, y + 4, [t('#D6D0C4'), t('#9E978A')]));
    }
    if (L.k >= 1) {
      const fence = L.decor === 1 ? '#F6EEDC' : L.decor === 2 ? '#A7AFB4' : '#B07A4A';
      for (let i = 0; i < 9; i++) c.drawRect(Skia.XYWHRect(-56 + i * 14, -22, 3, 14), fill(fence));
      c.drawLine(-56, -18, 60, -18, line(fence, 2));
      for (let i = 0; i < 6; i++) blossom(c, -48 + i * 20, 14, 3.4, 5, FLOWER_SETS[L.decor % 4][i % 3], '#F6C443');
    }
  },
  beacon: (c, L) => {
    const t = T(L);
    shadow(c, 0, 0, 26, 6);
    body(c, poly([[-18, 0], [-12, -70], [12, -70], [18, 0]]), t('#B7B0A3'), -70, 0);
    for (let y = -10; y > -70; y -= 12) c.drawLine(-16 + (-y) * 0.08, y, 16 - (-y) * 0.08, y, line(t('#8E877A'), 1.2));
    c.drawRect(Skia.XYWHRect(-16, -78, 32, 8), fill(t('#7E776A')));
    if (L.k >= 1) {
      glow(c, 0, -90, 46, '#FFB347', 0.6);
      c.drawPath(blob([[-10, -78], [-6, -96], [0, -108], [6, -96], [10, -78]]), lin(0, -108, 0, -78, ['#FFF4B8', '#FFB23E', '#F2682A']));
    } else c.drawPath(blob([[-8, -78], [0, -84], [8, -78]]), fill(t('#5A4A3E')));
  },
  windmill: (c, L) => {
    const t = T(L);
    shadow(c, 0, 0, 30, 7);
    body(c, poly([[-22, 0], [-14, -70], [14, -70], [22, 0]]), t('#F2E3C8'), -70, 0);
    if (L.k >= 0.34) body(c, poly([[-18, -68], [0, -90], [18, -68]]), t('#B8643E'), -90, -68);
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(-7, -24, 14, 24), 6, 6), fill(t('#8E5A2E')));
    c.drawCircle(0, -48, 5, fill(t(L.k >= 1 ? '#FFD27A' : '#5A6E7A')));
    if (L.k < 1) {
      // Broken static sails (ambient draws turning sails once restored).
      for (const a of [0.3, 1.9]) {
        c.save();
        c.translate(0, -74);
        c.rotate((a * 180) / Math.PI, 0, 0);
        c.drawRect(Skia.XYWHRect(0, -3, L.k > 0.4 ? 44 : 26, 6), fill(t('#B07A4A')));
        c.drawRect(Skia.XYWHRect(10, -9, L.k > 0.4 ? 30 : 12, 7), fill(t('#E6D3B0'), 0.8));
        c.restore();
      }
      scaffold(c, 44, 70);
    }
    c.drawCircle(0, -74, 4, fill(t('#5A3A1E')));
  },
  square: (c, L) => {
    const t = T(L);
    c.drawOval(Skia.XYWHRect(-60, -24, 120, 44), lin(0, -24, 0, 20, [t('#E6DED0'), t('#B7AE9E')]));
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      c.drawCircle(Math.cos(a) * 46, -2 + Math.sin(a) * 16, 2.2, fill(t('#9E978A')));
    }
    if (L.k >= 0.5) {
      for (const [x, col] of [[-36, '#E8644A'], [36, '#5E86A8']] as const) {
        c.drawRect(Skia.XYWHRect(x - 14, -22, 28, 14), fill(t('#D9A86E')));
        for (let i = 0; i < 4; i++) c.drawPath(blob([[x - 16 + i * 8, -34], [x - 8 + i * 8, -34], [x - 8 + i * 8, -26], [x - 12 + i * 8, -23], [x - 16 + i * 8, -26]], 0.6), fill(t(i % 2 ? '#F6EEDC' : col)));
        if (L.k >= 1) {
          apple(c, x - 6, -24, 3.4);
          ball(c, x + 6, -24, 3.4, '#F2B544', 0.6);
        }
      }
    }
    if (L.k >= 1) for (let i = 0; i < 5; i++) blossom(c, -20 + i * 10, 10, 3.6, 5, FLOWER_SETS[L.decor % 4][i % 3], '#F6C443');
  },
  fountain: (c, L) => {
    const t = T(L);
    c.drawOval(Skia.XYWHRect(-40, -14, 80, 26), lin(0, -14, 0, 12, [t('#D6D0C4'), t('#9E978A')]));
    c.drawOval(Skia.XYWHRect(-34, -12, 68, 18), fill(t(L.k >= 1 ? '#7EC8E3' : '#7E8A8E')));
    c.drawRect(Skia.XYWHRect(-5, -44, 10, 34), fill(t('#C9C3B7')));
    c.drawOval(Skia.XYWHRect(-18, -50, 36, 10), lin(0, -50, 0, -40, [t('#E6E0D2'), t('#A39C8E')]));
    if (L.k < 0.5) c.drawPath(poly([[10, -48], [18, -42], [12, -40]]), fill('#5A544A', 0.6));
  },
  clocktower: (c, L) => {
    const t = T(L);
    shadow(c, 0, 0, 30, 7);
    const h = L.k < 0.25 ? 60 : 120;
    body(c, poly([[-20, 0], [-20, -h], [20, -h], [20, 0]]), t('#D6C8A8'), -h, 0);
    for (let y = -14; y > -h; y -= 14) c.drawLine(-20, y, 20, y, line(t('#A89A7A'), 1));
    if (L.k >= 0.25) {
      c.drawCircle(0, -h + 26, 15, fill(t('#F6EEDC')));
      c.drawCircle(0, -h + 26, 15, line(t('#8E6A3E'), 2.4));
      if (L.k >= 0.5) {
        const hr = L.k >= 1 ? -1.1 : -1.57;
        c.drawLine(0, -h + 26, Math.cos(hr) * 8, -h + 26 + Math.sin(hr) * 8, line('#3E2A1E', 2.4));
        c.drawLine(0, -h + 26, 0, -h + 15, line('#3E2A1E', 1.6));
      }
      body(c, poly([[-26, -h], [0, -h - 34], [26, -h]]), t('#5E86A8'), -h - 34, -h);
      if (L.k >= 1) {
        ball(c, 0, -h - 4, 6, '#F2B544', 1);
        glow(c, 0, -h + 26, 24, '#FFE9A8', 0.4);
      }
    }
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(-8, -26, 16, 26), 7, 7), fill(t('#8E5A2E')));
    if (L.k < 1) scaffold(c, 40, h);
  },
  gate: (c, L) => {
    const t = T(L);
    const wallCol = t(L.region === 7 ? '#7FB98A' : L.region === 6 ? '#B7BEC4' : '#C9B9A0');
    for (const s of [-1, 1]) c.drawRect(Skia.XYWHRect(s > 0 ? 34 : -200, -26, 166, 26), lin(0, -26, 0, 0, [shade(wallCol, 0.2), shade(wallCol, -0.2)]));
    const arch = Skia.PathBuilder.Make();
    arch.moveTo(-38, 0);
    arch.lineTo(-38, -60);
    arch.cubicTo(-38, -92, 38, -92, 38, -60);
    arch.lineTo(38, 0);
    arch.lineTo(26, 0);
    arch.lineTo(26, -58);
    arch.cubicTo(26, -80, -26, -80, -26, -58);
    arch.lineTo(-26, 0);
    arch.close();
    body(c, arch.detach(), wallCol, -92, 0);
    if (L.k < 1) {
      c.drawRect(Skia.XYWHRect(-26, -58, 52, 58), lin(-26, 0, 26, 0, [t('#8E5A2E'), t('#6E4426')]));
      c.drawLine(0, -58, 0, 0, line(t('#4A2E1E'), 2));
      for (const y of [-44, -16]) c.drawLine(-26, y, 26, y, line(t('#4A2E1E'), 3));
      if (L.k < 0.5) c.drawPath(curve([[-30, -20], [-10, -40], [20, -30], [30, -50]]), line(t('#6FAE52'), 4));
    } else {
      for (const s of [-1, 1]) c.drawPath(poly([[s * 26, 0], [s * 26, -58], [s * 40, -54], [s * 40, 4]]), fill('#8E5A2E'));
      glow(c, 0, -30, 30, '#FFE9A8', 0.35);
      blossom(c, -32, -70, 5, 5, '#EE8FB0', '#F6C443');
      blossom(c, 32, -70, 5, 5, '#B9A3E3', '#F6C443');
    }
  },
  lighthouse: (c, L) => {
    const t = T(L);
    shadow(c, 0, 0, 30, 7);
    const tower = poly([[-20, 0], [-13, -110], [13, -110], [20, 0]]);
    c.drawPath(tower, fill(t('#F6F3EC')));
    c.save();
    c.clipPath(tower, 1, true);
    for (let y = -14; y > -110; y -= 28) c.drawRect(Skia.XYWHRect(-30, y - 14, 60, 14), fill(t('#C8443A')));
    c.restore();
    c.drawPath(tower, line(t('#8E877A'), 1.6));
    c.drawRect(Skia.XYWHRect(-17, -116, 34, 6), fill(t('#3E4448')));
    c.drawRect(Skia.XYWHRect(-11, -134, 22, 18), fill(t(L.k >= 1 ? '#FFF2B8' : '#5A6E7A')));
    body(c, poly([[-15, -134], [0, -148], [15, -134]]), t('#C8443A'), -148, -134);
    if (L.k >= 1) glow(c, 0, -125, 40, '#FFE08A', 0.7);
    if (L.k < 1) scaffold(c, 40, 100);
  },
  dock: (c, L) => {
    const t = T(L);
    const len = 40 + L.k * 60;
    for (let x = -50; x < -50 + len; x += 16) c.drawRect(Skia.XYWHRect(x, -6, 4, 22), fill(t('#6E4426')));
    c.drawRect(Skia.XYWHRect(-54, -10, len + 8, 8), lin(0, -10, 0, -2, [t('#C99A6A'), t('#8E5A2E')]));
    for (let x = -50; x < -50 + len; x += 8) c.drawLine(x, -10, x, -2, line(t('#7A5232'), 1));
    if (L.k >= 1) {
      c.drawRect(Skia.XYWHRect(30, -24, 4, 14), fill('#6E4426'));
      c.save();
      c.translate(32, -32);
      c.scale(0.18, 0.18);
      c.translate(-50, -50);
      lanternBody(c, 50, 20, 40, 70, '#3E3630', '#FFC95A');
      c.restore();
    }
  },
  boat: (c, L) => {
    const t = T(L);
    const hull = blob([[-40, -10], [40, -10], [30, 6], [-30, 6]], 0.6);
    body(c, hull, t(L.v === 1 ? '#5E86A8' : '#E8644A'), -10, 6);
    c.drawLine(-36, -6, 36, -6, line(t('#F6EEDC'), 2));
    if (L.k >= 0.5) {
      c.drawLine(0, -10, 0, -66, line(t('#7A5232'), 3));
      c.drawPath(poly([[2, -64], [34, -16], [2, -16]]), lin(0, -64, 0, -16, [t('#FFFFFF'), t('#E6E0D2')]));
      if (L.k >= 1) c.drawPath(poly([[0, -66], [-14, -60], [0, -56]]), fill('#F2B544'));
    } else c.drawLine(-6, -10, 10, -30, line(t('#7A5232'), 3));
  },
  hut: (c, L) => {
    for (const x of [-26, 26]) c.drawRect(Skia.XYWHRect(x - 2, -10, 4, 12), fill(T(L)('#6E4426')));
    c.save();
    c.translate(0, -10);
    house(c, { ...L, v: L.v + 2 }, 52, 30, { roof: L.region === 4 ? '#C8563A' : '#8E7E66', wall: L.region === 3 ? '#E6D3B0' : undefined });
    c.restore();
  },
  cave: (c, L) => {
    const t = T(L);
    shadow(c, 0, 0, 52, 8);
    c.drawPath(blob([[-56, 0], [-48, -40], [-16, -64], [24, -62], [54, -34], [56, 0]]), lin(0, -64, 0, 0, [t('#A7AFB4'), t('#6E767A')]));
    const mouth = blob([[-22, 0], [-20, -30], [0, -40], [20, -30], [22, 0]]);
    c.drawPath(mouth, fill('#2E2638'));
    if (L.k >= 1) {
      c.save();
      c.clipPath(mouth, 1, true);
      gem(c, -8, 0, 8, 20, '#8FD3E8', -10);
      gem(c, 8, 0, 8, 16, '#B98AE0', 12);
      c.restore();
      glow(c, 0, -14, 26, '#C8E8FF', 0.5);
      scallop(c, 34, -4, 6);
    }
  },
  tower: (c, L) => {
    const t = T(L);
    shadow(c, 0, 0, 30, 7);
    const h = 40 + L.k * 90;
    cylinder(c, 0, -h, 22, h, t('#C9C3B7'), t('#B7B0A3'));
    for (let y = -16; y > -h; y -= 20) c.drawRect(Skia.XYWHRect(-4, y - 10, 8, 12), fill(t(L.k >= 1 ? '#FFE9A8' : '#4A4A50')));
    if (L.k >= 1) {
      body(c, poly([[-28, -h], [0, -h - 40], [28, -h]]), '#5E86A8', -h - 40, -h);
      c.drawLine(0, -h - 40, 0, -h - 56, line('#5E5248', 2));
      c.drawPath(poly([[0, -h - 56], [16, -h - 52], [0, -h - 48]]), fill('#E8644A'));
    } else scaffold(c, 44, h);
  },
  gazebo: (c, L) => {
    const t = T(L);
    shadow(c, 0, 0, 40, 8);
    c.drawOval(Skia.XYWHRect(-40, -8, 80, 16), fill(t('#D6D0C4')));
    for (const x of [-32, -12, 12, 32]) c.drawRect(Skia.XYWHRect(x - 2.5, -52, 5, 48), fill(t('#F6EEDC')));
    if (L.k >= 0.5) {
      body(c, blob([[-46, -50], [0, -84], [46, -50], [0, -44]], 0.7), t(L.region === 6 ? '#5E86A8' : '#6E9E6A'), -84, -44);
      ball(c, 0, -84, 4, '#F2B544', 0.5);
    }
    if (L.k >= 1) {
      for (const x of [-32, 32]) leaf(c, x, -20, 14, 4, -1.4, '#6FAE52', false);
      glow(c, 0, -30, 28, '#FFE9A8', 0.35);
    }
  },
  statue: (c, L) => {
    const t = T(L);
    shadow(c, 0, 0, 24, 6);
    isoBox(c, 0, -30, 40, 14, 22, t('#D6D0C4'));
    const col = t(L.k >= 1 ? '#D9D3C7' : '#9E978A');
    if (L.region === 4) {
      body(c, blob([[-14, -34], [-16, -50], [-4, -60], [14, -56], [16, -40], [10, -34]]), col, -60, -34);
      c.drawPath(curve([[-4, -60], [-12, -78], [-20, -82]]), line(col, 3));
      c.drawPath(curve([[2, -60], [8, -80], [16, -86]]), line(col, 3));
    } else if (L.region === 6) {
      body(c, blob([[-8, -34], [-10, -54], [0, -60], [8, -54], [6, -34]]), col, -60, -34);
      c.drawPath(curve([[2, -60], [6, -76], [0, -84]]), line(col, 4));
      c.drawPath(poly([[0, -84], [18, -80], [0, -78]]), fill(col));
      if (L.k >= 1) ball(c, 14, -80, 2.4, '#F2B544', 0.4);
    } else {
      body(c, blob([[-10, -34], [-14, -70], [-6, -86], [6, -86], [14, -70], [10, -34]]), col, -86, -34);
      c.drawCircle(0, -92, 7, fill(col));
      if (L.k >= 1) {
        c.save();
        c.translate(14, -72);
        c.scale(0.16, 0.16);
        c.translate(-50, -50);
        lanternBody(c, 50, 20, 40, 70, '#8E5A2E', '#FFC95A');
        c.restore();
      }
    }
  },
  bigtree: (c, L) => {
    const t = T(L);
    shadow(c, 0, 0, 56, 10);
    c.drawPath(blob([[-16, 0], [-12, -50], [-20, -70], [20, -70], [12, -50], [16, 0]], 0.7), lin(-16, 0, 16, 0, [t('#9A6438'), t('#6E4426')]));
    const leafCols = L.region === 4 ? ['#F2865A', '#E0663A', '#B8443A'] : L.region === 7 ? ['#C8F0B0', '#8FD47A', '#4E9A4E'] : ['#9BD47A', '#6FAE52', '#3E7A2E'];
    const crown = blob([[-62, -70], [-50, -118], [-10, -140], [36, -132], [64, -96], [52, -64], [0, -58]]);
    c.drawPath(crown, rad(-14, -116, 80, leafCols.map(t), [0, 0.5, 1]));
    if (L.k < 0.5) for (let i = 0; i < 6; i++) c.drawCircle(-40 + i * 16, -76 - (i % 2) * 20, 6, fill('#5A544A', 0.25));
    if (L.k >= 1) for (let i = 0; i < 7; i++) sparkle(c, -44 + i * 15, -88 - ((i * 17) % 40), 3, L.region === 7 ? '#FFF6D0' : '#FFE9A8');
  },
  observatory: (c, L) => {
    const t = T(L);
    shadow(c, 0, 0, 50, 8);
    body(c, poly([[-44, 0], [-44, -40], [44, -40], [44, 0]]), t('#E6EEF2'), -40, 0);
    const dome = Skia.PathBuilder.Make();
    dome.moveTo(-36, -40);
    dome.cubicTo(-36, -92, 36, -92, 36, -40);
    dome.close();
    body(c, dome.detach(), t(L.k >= 0.5 ? '#5E86A8' : '#8E979E'), -80, -40);
    if (L.k >= 1) {
      c.drawPath(poly([[-4, -78], [4, -78], [4, -44], [-4, -44]]), fill('#2A3458'));
      c.save();
      c.rotate(-35, 0, -60);
      c.drawRRect(Skia.RRectXY(Skia.XYWHRect(-6, -96, 12, 40), 4, 4), lin(-6, 0, 6, 0, ['#C9923E', '#8E5A2E']));
      c.restore();
      for (const [x, y] of [[-30, -100], [30, -110], [50, -80]] as const) sparkle(c, x, y, 3, '#FFFFFF');
    }
    for (const x of [-30, 30]) c.drawRect(Skia.XYWHRect(x - 6, -30, 12, 16), fill(t(L.k >= 1 ? '#FFE9A8' : '#4A4A50')));
    if (L.k < 1) scaffold(c, 88, 80);
  },
  greatlantern: (c, L) => {
    const t = T(L);
    shadow(c, 0, 0, 60, 10);
    isoBox(c, 0, -34, 90, 26, 30, t('#D6D0C4'));
    for (let i = 0; i < 3; i++) c.drawRect(Skia.XYWHRect(-36 + i * 24, -6, 20, 4), fill(t('#B7B0A3')));
    if (L.k >= 1) glow(c, 0, -110, 110, '#FFD27A', 0.7);
    c.save();
    c.translate(0, -112);
    c.scale(1.25, 1.25);
    c.translate(-50, -50);
    lanternBody(c, 50, 14, 46, 76, '#8E5A2E', L.k >= 1 ? '#FFC95A' : L.k >= 0.5 ? '#C9B98E' : '#7E8A90');
    c.restore();
    if (L.k < 0.5) {
      c.drawPath(poly([[-10, -120], [0, -100], [-6, -90], [4, -70]], false), line('#2B1A10', 2.4));
      c.drawPath(poly([[14, -126], [8, -110], [18, -96]], false), line('#2B1A10', 2));
    }
    if (L.k >= 1) for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      sparkle(c, Math.cos(a) * 70, -110 + Math.sin(a) * 60, 4, '#FFF6D0');
    }
  },
};

export function drawStructure(c: SkCanvas, s: StructureDef, L: Look): void {
  c.save();
  c.translate(s.x, s.y);
  c.scale(s.s, s.s);
  P[s.type]?.(c, L, s);
  c.restore();
}

/** Small "needs attention" marker over a structure that has an available quest. */
export function drawQuestMarker(c: SkCanvas, x: number, y: number, ready: boolean) {
  // A soft halo keeps the next interaction legible over dense scenery without a harsh UI badge.
  glow(c, x, y, 23, ready ? colors.sageSoft : colors.honeySoft, 0.42);
  shadow(c, x + 1, y + 5, 11, 3, 0.18);
  c.drawCircle(x, y, 14, fill(ready ? colors.sageEdge : colors.honeyEdge));
  c.drawCircle(x, y - 1, 12, rad(x - 4, y - 5, 18, ready ? [colors.sage, colors.sageDeep] : [colors.honeyRim, colors.honey], [0, 1]));
  c.drawCircle(x, y - 1, 12, line(colors.white, 2.2, 0.9));
  if (ready) c.drawPath(poly([[x - 6, y], [x - 1, y + 5], [x + 7, y - 5]], false), line(colors.white, 3));
  else {
    c.drawLine(x, y - 7, x, y + 2, line(colors.honeyInk, 3.4));
    c.drawCircle(x, y + 6.5, 2, fill(colors.honeyInk));
  }
}

void rrectPath;
void star5;
void isoBox;
export type { Pt };
