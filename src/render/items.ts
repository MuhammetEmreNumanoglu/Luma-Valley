// Every merge item, drawn procedurally in a 100×100 box. Each level is its own composition
// (not a recolour or a rescale), so a chain reads as an object growing up.
import { Skia, type SkCanvas } from '@shopify/react-native-skia';

import { parseItem, type FamilyId, type ItemKey } from '../content/families';
import { CROP_DRAWERS } from './crops';
import {
  ball,
  basket,
  blob,
  blossom,
  body,
  curve,
  cylinder,
  fill,
  flame,
  glow,
  hexagon,
  isoBox,
  jar,
  leaf,
  lin,
  line,
  ovalPath,
  poly,
  rad,
  rrectPath,
  shade,
  shadow,
  shine,
  sparkle,
  star5,
  type Pt,
} from './kit';

type Drawer = (c: SkCanvas) => void;

const GREEN = '#6FAE52';
const DGREEN = '#4E8A3C';
const PINK = '#EE8FB0';
const GOLD = '#F2B544';

// ---------------------------------------------------------------------------------------------
// Flowers
// ---------------------------------------------------------------------------------------------

function stem(c: SkCanvas, x: number, y0: number, y1: number, bend = 0) {
  c.drawPath(curve([[x, y0], [x + bend, (y0 + y1) / 2], [x, y1]]), line(DGREEN, 3));
}

function pot(c: SkCanvas, cx: number, top: number, w: number, h: number, hex = '#D47B4E') {
  const p = poly([
    [cx - w / 2, top],
    [cx + w / 2, top],
    [cx + w * 0.38, top + h],
    [cx - w * 0.38, top + h],
  ]);
  body(c, p, hex, top, top + h);
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(cx - w / 2 - 3, top - 4, w + 6, 9), 3, 3), lin(0, top - 4, 0, top + 5, [shade(hex, 0.3), shade(hex, -0.15)]));
}

const flower: Drawer[] = [
  (c) => {
    shadow(c, 50, 74, 18);
    const p = blob([[50, 36], [64, 52], [60, 70], [40, 70], [36, 52]]);
    body(c, p, '#A8784A', 36, 72);
    c.drawPath(curve([[50, 40], [53, 55], [50, 68]]), line('#7A5232', 2, 0.6));
    shine(c, 44, 48, 3.5, 7);
    leaf(c, 50, 36, 12, 4, -1.9, GREEN, false);
  },
  (c) => {
    shadow(c, 50, 80, 24);
    c.drawPath(blob([[28, 80], [36, 68], [64, 68], [72, 80], [50, 84]]), lin(0, 66, 0, 84, ['#9A6A44', '#6E4A30']));
    stem(c, 50, 70, 46, 2);
    leaf(c, 50, 52, 22, 8, -2.6, GREEN);
    leaf(c, 50, 48, 22, 8, -0.5, '#7DBE5C');
  },
  (c) => {
    shadow(c, 50, 88, 22);
    pot(c, 50, 62, 36, 26);
    c.drawOval(Skia.XYWHRect(34, 58, 32, 9), fill('#6E4A30'));
    stem(c, 50, 62, 34);
    leaf(c, 50, 54, 22, 7, -2.7, GREEN);
    leaf(c, 50, 50, 22, 7, -0.45, '#7DBE5C');
    leaf(c, 50, 42, 18, 6, -2.2, '#7DBE5C');
    leaf(c, 50, 38, 16, 6, -0.9, GREEN);
  },
  (c) => {
    shadow(c, 50, 88, 16);
    stem(c, 50, 88, 40, -4);
    leaf(c, 49, 70, 20, 7, -2.6, GREEN);
    leaf(c, 50, 62, 20, 7, -0.4, '#7DBE5C');
    blossom(c, 50, 34, 22, 6, PINK, '#F6C443', 0.3);
    shine(c, 43, 27, 4, 2.5, 0.4);
  },
  (c) => {
    shadow(c, 50, 88, 18);
    for (const [x, b] of [[40, -6], [50, 0], [60, 6]] as const) stem(c, 50, 84, 36, b + (x - 50) * 0.4);
    leaf(c, 46, 54, 18, 6, -2.5, GREEN);
    leaf(c, 54, 54, 18, 6, -0.6, '#7DBE5C');
    blossom(c, 36, 36, 15, 5, '#F7B7CC', '#F6C443', 0.5);
    blossom(c, 64, 36, 15, 5, '#B9A3E3', '#F6C443', 0.1);
    blossom(c, 50, 26, 17, 6, PINK, '#F6C443', 0.3);
    c.drawPath(poly([[42, 62], [58, 62], [60, 70], [40, 70]]), lin(0, 62, 0, 70, ['#F7D27A', '#E2A93E']));
    c.drawPath(blob([[50, 66], [40, 78], [46, 79], [50, 70], [54, 79], [60, 78]]), fill('#E2A93E'));
  },
  (c) => {
    shadow(c, 50, 90, 30);
    blossom(c, 32, 46, 14, 5, '#F7B7CC', '#F6C443');
    blossom(c, 68, 46, 14, 5, '#B9A3E3', '#F6C443', 0.4);
    leaf(c, 30, 54, 18, 6, -2.8, GREEN);
    leaf(c, 70, 54, 18, 6, -0.3, GREEN);
    blossom(c, 50, 40, 16, 6, PINK, '#F6C443', 0.2);
    blossom(c, 42, 54, 11, 5, '#FFFFFF', '#F6C443');
    blossom(c, 60, 54, 11, 5, '#FFD27A', '#E07A3E');
    basket(c, 22, 58, 56, 28);
    c.drawPath(curve([[24, 58], [50, 18], [76, 58]]), line('#A8723E', 3.5));
  },
  (c) => {
    shadow(c, 50, 92, 20);
    const v = blob([[38, 62], [62, 62], [66, 78], [58, 92], [42, 92], [34, 78]]);
    body(c, v, '#7FA7C9', 60, 92);
    shine(c, 41, 72, 3, 8, 0.5);
    for (const [a, l] of [[-2.4, 30], [-2.0, 34], [-1.2, 34], [-0.8, 30], [-1.6, 38]] as const) leaf(c, 50, 62, l, 6, a, l > 33 ? DGREEN : GREEN);
    blossom(c, 32, 34, 12, 5, '#F7B7CC', '#F6C443');
    blossom(c, 68, 34, 12, 5, '#FFFFFF', '#F6C443');
    blossom(c, 50, 20, 15, 6, PINK, '#F6C443');
    blossom(c, 40, 46, 11, 5, '#B9A3E3', '#F6C443');
    blossom(c, 60, 46, 11, 5, '#FFD27A', '#E07A3E');
  },
  (c) => {
    shadow(c, 50, 86, 26);
    glow(c, 50, 52, 40, '#FFE9A8', 0.35);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      leaf(c, 50 + Math.cos(a) * 24, 52 + Math.sin(a) * 24, 16, 5, a + Math.PI / 2, i % 2 ? GREEN : DGREEN);
    }
    const cols = [PINK, '#FFFFFF', '#B9A3E3', '#FFD27A', '#F7B7CC', '#FFFFFF'];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      blossom(c, 50 + Math.cos(a) * 26, 52 + Math.sin(a) * 26, 10, 5, cols[i], '#F6C443', a);
    }
    sparkle(c, 50, 52, 7);
    sparkle(c, 78, 26, 4);
    sparkle(c, 22, 80, 3.5);
  },
  (c) => {
    shadow(c, 50, 92, 26);
    const urn = blob([[30, 54], [70, 54], [66, 70], [58, 80], [62, 90], [38, 90], [42, 80], [34, 70]]);
    body(c, urn, '#B9B3A6', 52, 92);
    c.drawPath(curve([[34, 64], [50, 68], [66, 64]]), line('#8E877A', 2));
    for (let i = 0; i < 5; i++) c.drawCircle(38 + i * 6, 72, 1.6, fill('#8E877A'));
    c.drawPath(blob([[36, 76], [44, 74], [42, 82]]), fill('#7FAE5A', 0.8));
    for (const [a, l] of [[-2.6, 26], [-0.5, 26], [-2.0, 30], [-1.1, 30]] as const) leaf(c, 50, 54, l, 6, a, GREEN);
    blossom(c, 34, 44, 11, 5, '#F7B7CC', '#F6C443');
    blossom(c, 66, 44, 11, 5, '#B9A3E3', '#F6C443');
    blossom(c, 50, 34, 14, 6, PINK, '#F6C443');
    c.drawPath(curve([[30, 56], [24, 66], [28, 76]]), line(GREEN, 2.2));
    leaf(c, 27, 70, 10, 4, 2.4, '#7DBE5C');
  },
  (c) => {
    glow(c, 50, 46, 48, '#FFE4F0', 0.6);
    shadow(c, 50, 90, 20);
    stem(c, 50, 90, 52);
    leaf(c, 50, 76, 26, 8, -2.7, GREEN);
    leaf(c, 50, 70, 26, 8, -0.4, '#7DBE5C');
    blossom(c, 50, 44, 34, 8, '#F7B7CC', '#FFFFFF', 0.2);
    blossom(c, 50, 44, 24, 7, PINK, '#FFFFFF', 0.6);
    blossom(c, 50, 44, 14, 6, '#FFD6E6', '#F6C443', 0.1);
    sparkle(c, 50, 44, 6, '#FFFFFF');
    sparkle(c, 20, 22, 5);
    sparkle(c, 82, 30, 4);
    sparkle(c, 76, 70, 3);
  },
];

// ---------------------------------------------------------------------------------------------
// Wood
// ---------------------------------------------------------------------------------------------

const WOOD = '#B07A4A';
const LWOOD = '#D9A86E';

function plank(c: SkCanvas, x: number, y: number, w: number, h: number, hex = LWOOD) {
  const p = rrectPath(x, y, w, h, 3);
  body(c, p, hex, y, y + h, { rim: 1.6 });
  for (let i = 1; i < 3; i++) c.drawLine(x + 4, y + (h * i) / 3, x + w - 4, y + (h * i) / 3 + (i % 2 ? 1 : -1), line(shade(hex, -0.3), 1, 0.45));
  c.drawCircle(x + w * 0.7, y + h * 0.5, Math.min(2.2, h * 0.15), line(shade(hex, -0.35), 1, 0.5));
}

function logEnd(c: SkCanvas, cx: number, cy: number, rx: number, ry: number) {
  c.drawOval(Skia.XYWHRect(cx - rx, cy - ry, rx * 2, ry * 2), rad(cx, cy, rx, ['#F2D3A0', '#D9A86E', '#B07A4A'], [0, 0.7, 1]));
  for (const k of [0.3, 0.55, 0.8]) c.drawOval(Skia.XYWHRect(cx - rx * k, cy - ry * k, rx * 2 * k, ry * 2 * k), line('#B07A4A', 1, 0.6));
  c.drawOval(Skia.XYWHRect(cx - rx, cy - ry, rx * 2, ry * 2), line('#6E4A30', 1.4, 0.6));
}

const wood: Drawer[] = [
  (c) => {
    shadow(c, 50, 74, 26);
    c.drawPath(curve([[24, 70], [44, 60], [76, 42]]), line(WOOD, 6));
    c.drawPath(curve([[24, 70], [44, 60], [76, 42]]), line(shade(WOOD, 0.3), 2, 0.6));
    c.drawPath(curve([[52, 56], [58, 44], [56, 36]]), line(WOOD, 4));
    leaf(c, 56, 36, 14, 5, -1.2, GREEN);
  },
  (c) => {
    shadow(c, 50, 78, 26);
    for (const [y, r] of [[60, -0.15], [54, 0.12], [48, -0.05]] as const) {
      c.save();
      c.rotate(r * 57, 50, y);
      c.drawRRect(Skia.RRectXY(Skia.XYWHRect(24, y - 4, 52, 8), 4, 4), lin(0, y - 4, 0, y + 4, [shade(WOOD, 0.3), shade(WOOD, -0.2)]));
      c.drawRRect(Skia.RRectXY(Skia.XYWHRect(24, y - 4, 52, 8), 4, 4), line(shade(WOOD, -0.45), 1.2, 0.5));
      c.restore();
    }
    c.drawRect(Skia.XYWHRect(46, 42, 8, 24), fill('#C9A26A'));
    c.drawLine(46, 46, 54, 50, line('#8E6A3E', 1.2));
    c.drawLine(46, 56, 54, 60, line('#8E6A3E', 1.2));
  },
  (c) => {
    shadow(c, 50, 78, 32);
    const b = Skia.PathBuilder.Make();
    b.moveTo(24, 40);
    b.lineTo(72, 40);
    b.lineTo(72, 72);
    b.lineTo(24, 72);
    b.close();
    c.drawPath(b.detach(), lin(0, 40, 0, 72, [shade(WOOD, 0.25), WOOD, shade(WOOD, -0.35)]));
    for (const y of [48, 58, 66]) c.drawLine(28, y, 68, y + 1, line(shade(WOOD, -0.4), 1.2, 0.5));
    logEnd(c, 72, 56, 10, 16);
    c.drawOval(Skia.XYWHRect(16, 40, 16, 32), lin(16, 0, 32, 0, [shade(WOOD, -0.2), shade(WOOD, -0.4)]));
    leaf(c, 40, 40, 10, 4, -2.2, GREEN, false);
  },
  (c) => {
    shadow(c, 50, 78, 34);
    c.save();
    c.rotate(-18, 50, 55);
    plank(c, 14, 46, 72, 18);
    c.restore();
  },
  (c) => {
    shadow(c, 50, 84, 36);
    plank(c, 16, 62, 68, 14, shade(LWOOD, -0.1));
    plank(c, 20, 48, 64, 14);
    plank(c, 14, 34, 66, 14, shade(LWOOD, 0.08));
    c.drawRect(Skia.XYWHRect(46, 32, 6, 46), fill('#8E6A3E', 0.85));
  },
  (c) => {
    shadow(c, 50, 88, 34);
    isoBox(c, 50, 30, 60, 30, 34, LWOOD);
    c.drawLine(32, 45, 50, 54, line('#8E6A3E', 1.6, 0.8));
    c.drawLine(50, 54, 68, 45, line('#8E6A3E', 1.6, 0.8));
    for (const y of [60, 72]) {
      c.drawLine(20, y - 15 + 15 * 0, 50, y, line('#8E6A3E', 1.2, 0.6));
      c.drawLine(50, y, 80, y - 15, line('#7A5232', 1.2, 0.6));
    }
    c.drawLine(22, 47, 48, 86, line('#8E6A3E', 2, 0.55));
  },
  (c) => {
    shadow(c, 50, 92, 26);
    const d = Skia.PathBuilder.Make();
    d.moveTo(28, 90);
    d.lineTo(28, 36);
    d.cubicTo(28, 14, 72, 14, 72, 36);
    d.lineTo(72, 90);
    d.close();
    const door = d.detach();
    body(c, door, '#9A6438', 18, 90, { rim: 2.2 });
    for (const x of [40, 50, 60]) c.drawLine(x, 26, x, 88, line('#6E4426', 1.4, 0.55));
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(34, 40, 32, 14), 4, 4), line('#E9C46A', 1.8, 0.8));
    blossom(c, 50, 47, 6, 5, '#E9C46A', '#B5835A');
    ball(c, 64, 62, 3.6, GOLD, 0.6);
  },
  (c) => {
    shadow(c, 50, 90, 36);
    const a = Skia.PathBuilder.Make();
    a.moveTo(16, 90);
    a.lineTo(16, 50);
    a.cubicTo(16, 16, 84, 16, 84, 50);
    a.lineTo(84, 90);
    a.lineTo(70, 90);
    a.lineTo(70, 52);
    a.cubicTo(70, 32, 30, 32, 30, 52);
    a.lineTo(30, 90);
    a.close();
    body(c, a.detach(), LWOOD, 18, 90, { rim: 2 });
    for (const x of [23, 77]) for (const y of [60, 72, 84]) c.drawLine(x - 6, y, x + 6, y, line('#8E6A3E', 1.2, 0.6));
    leaf(c, 30, 30, 16, 5, -2.5, GREEN);
    blossom(c, 34, 28, 6, 5, PINK, '#F6C443');
    leaf(c, 70, 30, 16, 5, -0.6, GREEN);
  },
  (c) => {
    shadow(c, 50, 90, 38);
    for (const x of [22, 74]) c.drawRect(Skia.XYWHRect(x, 56, 6, 32), lin(x, 0, x + 6, 0, [shade(WOOD, 0.1), shade(WOOD, -0.3)]));
    isoBox(c, 50, 38, 74, 22, 8, LWOOD);
    c.drawPath(poly([[24, 40], [44, 34], [48, 38], [28, 44]]), lin(0, 34, 0, 44, ['#D9D9D9', '#8E8E8E']));
    c.drawRect(Skia.XYWHRect(52, 34, 18, 4), fill('#7A5232'));
    c.drawRect(Skia.XYWHRect(66, 30, 4, 12), fill('#9AA3A8'));
    c.drawCircle(38, 74, 4, line('#8E6A3E', 2));
    c.drawLine(26, 70, 74, 70, line('#8E6A3E', 3));
  },
  (c) => {
    glow(c, 50, 40, 40, '#FFE3A8', 0.45);
    shadow(c, 50, 92, 20);
    const t = rrectPath(34, 20, 32, 72, 8);
    body(c, t, '#9A6438', 20, 92);
    c.drawPath(blob([[34, 22], [50, 10], [66, 22], [50, 28]]), lin(0, 10, 0, 28, ['#7DBE5C', DGREEN]));
    for (const y of [40, 64]) {
      c.drawCircle(43, y, 3.4, fill('#2B1A10'));
      c.drawCircle(57, y, 3.4, fill('#2B1A10'));
      c.drawCircle(44, y - 1, 1.2, fill('#FFE9A8'));
      c.drawCircle(58, y - 1, 1.2, fill('#FFE9A8'));
      c.drawPath(curve([[44, y + 8], [50, y + 11], [56, y + 8]]), line('#2B1A10', 2));
    }
    c.drawLine(34, 52, 66, 52, line('#6E4426', 2));
    leaf(c, 34, 50, 14, 5, Math.PI + 0.3, GREEN);
    leaf(c, 66, 50, 14, 5, -0.3, GREEN);
    sparkle(c, 74, 24, 4);
    sparkle(c, 24, 70, 3);
  },
];

// ---------------------------------------------------------------------------------------------
// Stone
// ---------------------------------------------------------------------------------------------

const STONE = '#A7AFB4';

const stone: Drawer[] = [
  (c) => {
    shadow(c, 50, 70, 16);
    const p = blob([[36, 60], [44, 48], [60, 48], [66, 60], [56, 68], [42, 68]]);
    body(c, p, STONE, 46, 68);
    shine(c, 46, 53, 5, 2.5);
  },
  (c) => {
    shadow(c, 50, 78, 26);
    const p = blob([[24, 72], [28, 50], [46, 36], [68, 42], [76, 66], [60, 78], [36, 78]]);
    body(c, p, shade(STONE, -0.05), 36, 78);
    c.drawPath(curve([[46, 40], [50, 54], [62, 60]]), line(shade(STONE, -0.4), 1.2, 0.5));
    shine(c, 42, 48, 7, 3.5);
    c.drawPath(blob([[56, 74], [64, 70], [68, 74]]), fill('#7FAE5A', 0.8));
  },
  (c) => {
    shadow(c, 50, 80, 28);
    const top: Pt[] = [[30, 44], [50, 32], [72, 42], [62, 52], [40, 54]];
    c.drawPath(poly(top), lin(0, 32, 0, 54, [shade(STONE, 0.45), shade(STONE, 0.15)]));
    c.drawPath(poly([[30, 44], [40, 54], [38, 78], [26, 66]]), fill(shade(STONE, -0.1)));
    c.drawPath(poly([[40, 54], [62, 52], [64, 78], [38, 78]]), fill(shade(STONE, -0.22)));
    c.drawPath(poly([[62, 52], [72, 42], [76, 64], [64, 78]]), fill(shade(STONE, -0.38)));
    c.drawPath(poly([[30, 44], [50, 32], [72, 42], [76, 64], [64, 78], [38, 78], [26, 66]]), line(shade(STONE, -0.55), 1.4, 0.5));
  },
  (c) => {
    shadow(c, 50, 84, 34);
    isoBox(c, 50, 40, 66, 26, 20, '#C9B9A0');
    c.drawLine(28, 57, 28, 74, line('#8E7E66', 1, 0.5));
    c.drawLine(64, 64, 64, 80, line('#7A6A52', 1, 0.5));
  },
  (c) => {
    shadow(c, 50, 88, 32);
    isoBox(c, 50, 24, 56, 30, 40, '#B7B0A3');
    c.drawPath(curve([[30, 52], [36, 60], [34, 70]]), line('#7E776A', 1, 0.5));
    c.drawPath(blob([[60, 80], [70, 76], [74, 82], [64, 84]]), fill('#7FAE5A', 0.85));
  },
  (c) => {
    shadow(c, 50, 88, 30);
    const p = poly([[22, 30], [78, 30], [66, 86], [34, 86]]);
    body(c, p, '#C9B9A0', 30, 86);
    c.drawPath(poly([[22, 30], [78, 30], [74, 38], [26, 38]]), fill(shade('#C9B9A0', 0.35)));
    c.drawCircle(50, 58, 12, line('#8E7E66', 2));
    c.drawPath(star5(50, 58, 8), fill(GOLD));
  },
  (c) => {
    shadow(c, 50, 92, 26);
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(26, 82, 48, 10), 2, 2), lin(0, 82, 0, 92, ['#D6D0C4', '#9E978A']));
    cylinder(c, 50, 26, 16, 56, '#D6D0C4');
    for (const x of [40, 46, 54, 60]) c.drawLine(x, 30, x, 80, line('#A39C8E', 1.2, 0.6));
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(26, 14, 48, 12), 2, 2), lin(0, 14, 0, 26, ['#ECE6DA', '#B5AE9F']));
    c.drawPath(curve([[30, 26], [26, 30], [30, 32]]), line('#A39C8E', 2));
    c.drawPath(curve([[70, 26], [74, 30], [70, 32]]), line('#A39C8E', 2));
  },
  (c) => {
    shadow(c, 50, 90, 36);
    const frame = rrectPath(16, 18, 68, 68, 6);
    body(c, frame, '#B7B0A3', 18, 86);
    const cols = ['#5FA8D3', '#F2B544', '#E8644A', '#6FAE52', '#F2EFE6', '#B9A3E3'];
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) {
      const d = Math.abs(x - 2.5) + Math.abs(y - 2.5);
      const col = cols[Math.floor(d) % cols.length];
      c.drawRRect(Skia.RRectXY(Skia.XYWHRect(22 + x * 9.5, 24 + y * 9.5, 8.5, 8.5), 1.5, 1.5), fill(col));
    }
    shine(c, 30, 30, 8, 3, 0.35);
  },
  (c) => {
    shadow(c, 50, 92, 32);
    isoBox(c, 50, 56, 52, 20, 24, '#D6D0C4');
    c.drawLine(36, 74, 64, 74, line('#A39C8E', 1));
    const bird = blob([[36, 48], [44, 34], [56, 30], [66, 38], [60, 52], [44, 56]]);
    body(c, bird, '#C9C3B7', 28, 58);
    c.drawPath(poly([[64, 36], [74, 38], [64, 42]]), fill('#A39C8E'));
    c.drawCircle(58, 37, 1.6, fill('#5A544A'));
    c.drawPath(curve([[42, 44], [50, 40], [56, 46]]), line('#A39C8E', 1.6));
  },
  (c) => {
    glow(c, 50, 50, 46, '#9FE6E0', 0.35);
    shadow(c, 50, 92, 26);
    const p = blob([[34, 90], [30, 50], [38, 16], [58, 10], [68, 36], [70, 90]], 0.8);
    body(c, p, '#8E949A', 10, 90);
    const rune = line('#9FE6E0', 2.2);
    c.drawPath(poly([[44, 30], [50, 24], [56, 30], [50, 36]]), rune);
    c.drawLine(50, 42, 50, 58, rune);
    c.drawPath(curve([[42, 62], [50, 70], [58, 62]]), rune);
    glow(c, 50, 46, 16, '#9FE6E0', 0.5);
    c.drawPath(blob([[34, 82], [44, 76], [50, 84], [40, 90]]), fill('#7FAE5A', 0.9));
    sparkle(c, 76, 22, 4, '#DFFBF8');
  },
];

// ---------------------------------------------------------------------------------------------
// Fruit
// ---------------------------------------------------------------------------------------------

function apple(c: SkCanvas, x: number, y: number, r: number, hex = '#E8644A') {
  const p = blob([[x, y - r * 0.7], [x + r * 0.9, y - r * 0.8], [x + r, y + r * 0.2], [x + r * 0.5, y + r * 0.95], [x - r * 0.5, y + r * 0.95], [x - r, y + r * 0.2], [x - r * 0.9, y - r * 0.8]]);
  c.drawPath(p, rad(x - r * 0.35, y - r * 0.35, r * 1.6, [shade(hex, 0.45), hex, shade(hex, -0.35)], [0, 0.45, 1]));
  c.drawPath(p, line(shade(hex, -0.5), 1.2, 0.45));
  c.drawLine(x, y - r * 0.7, x + r * 0.15, y - r * 1.15, line('#6E4A30', Math.max(1.2, r * 0.12)));
  leaf(c, x + r * 0.1, y - r * 1.0, r * 0.7, r * 0.25, -0.5, GREEN, false);
  shine(c, x - r * 0.4, y - r * 0.25, r * 0.18, r * 0.3, 0.6);
}

function plum(c: SkCanvas, x: number, y: number, r: number) {
  c.drawOval(Skia.XYWHRect(x - r * 0.85, y - r, r * 1.7, r * 2), rad(x - r * 0.3, y - r * 0.4, r * 1.6, ['#C9A0E8', '#7A4EA8', '#3E2460'], [0, 0.45, 1]));
  c.drawPath(curve([[x, y - r * 0.9], [x - r * 0.2, y], [x, y + r * 0.9]]), line('#3E2460', 1, 0.4));
  shine(c, x - r * 0.35, y - r * 0.3, r * 0.15, r * 0.28, 0.55);
}

function berry(c: SkCanvas, x: number, y: number, r: number) {
  const pts: Pt[] = [[0, 0], [-0.5, -0.4], [0.5, -0.4], [-0.6, 0.35], [0.6, 0.35], [0, 0.7], [0, -0.75]];
  for (const [dx, dy] of pts) ball(c, x + dx * r, y + dy * r, r * 0.42, '#5A2E6E', 0.6);
  leaf(c, x, y - r * 0.9, r * 0.8, r * 0.3, -2.4, GREEN, false);
  leaf(c, x, y - r * 0.9, r * 0.8, r * 0.3, -0.7, GREEN, false);
}

function bowl(c: SkCanvas, cx: number, top: number, w: number, h: number, hex: string) {
  const b = Skia.PathBuilder.Make();
  b.moveTo(cx - w / 2, top);
  b.cubicTo(cx - w / 2, top + h * 1.2, cx + w / 2, top + h * 1.2, cx + w / 2, top);
  b.close();
  body(c, b.detach(), hex, top, top + h);
  c.drawOval(Skia.XYWHRect(cx - w / 2, top - 3, w, 6), lin(0, top - 3, 0, top + 3, [shade(hex, 0.4), shade(hex, 0.1)]));
}

const fruit: Drawer[] = [
  (c) => {
    shadow(c, 50, 74, 16);
    berry(c, 50, 54, 16);
  },
  (c) => {
    shadow(c, 50, 80, 18);
    plum(c, 50, 56, 22);
    leaf(c, 50, 34, 16, 5, -0.6, GREEN);
  },
  (c) => {
    shadow(c, 50, 84, 24);
    apple(c, 50, 56, 26);
  },
  (c) => {
    shadow(c, 50, 86, 30);
    apple(c, 38, 46, 13);
    plum(c, 62, 46, 11);
    berry(c, 50, 52, 9);
    bowl(c, 50, 56, 60, 26, '#E6D3B0');
  },
  (c) => {
    shadow(c, 50, 90, 32);
    apple(c, 34, 42, 12, '#E8644A');
    apple(c, 66, 42, 12, '#9BC34A');
    plum(c, 50, 38, 11);
    berry(c, 42, 52, 7);
    berry(c, 58, 52, 7);
    basket(c, 22, 54, 56, 32, '#C98E4E');
    c.drawPath(curve([[24, 54], [50, 14], [76, 54]]), line('#A8723E', 3.5));
  },
  (c) => {
    shadow(c, 50, 90, 22);
    jar(c, 30, 34, 40, 54, '#C8323C', 0.85, '#E9C46A');
    c.drawPath(blob([[26, 30], [74, 30], [70, 40], [50, 36], [30, 40]]), lin(0, 28, 0, 40, ['#F6E3B4', '#E9C46A']));
    c.drawLine(28, 36, 72, 36, line('#C8323C', 2));
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(38, 56, 24, 16), 3, 3), fill('#F6EEDC'));
    berry(c, 50, 64, 5);
  },
  (c) => {
    shadow(c, 50, 82, 36);
    c.drawOval(Skia.XYWHRect(14, 60, 72, 20), lin(0, 60, 0, 80, ['#E7B26A', '#B57A3E']));
    c.drawOval(Skia.XYWHRect(18, 54, 64, 18), fill('#F6E3B4'));
    for (let i = 0; i < 12; i++) c.drawCircle(18 + i * 5.8, 62, 3, fill('#D99A50'));
    const pos: [number, number][] = [[34, 58], [46, 56], [58, 58], [40, 64], [54, 64], [66, 62]];
    pos.forEach(([x, y], i) => (i % 2 ? ball(c, x, y, 5, '#C8323C', 0.6) : ball(c, x, y, 5, '#5A2E6E', 0.6)));
    leaf(c, 50, 54, 10, 3.5, -1.4, GREEN, false);
  },
  (c) => {
    shadow(c, 50, 92, 38);
    c.drawPath(poly([[18, 38], [82, 38], [78, 22], [22, 22]]), lin(0, 22, 0, 38, ['#D9A86E', '#B07A4A']));
    apple(c, 30, 40, 11);
    apple(c, 50, 36, 12, '#F2B544');
    plum(c, 68, 40, 10);
    c.drawPath(blob([[20, 44], [44, 40], [36, 56]]), fill('#F6EEDC'));
    isoBox(c, 50, 42, 72, 16, 34, '#C98E4E');
    c.drawLine(22, 58, 78, 58, line('#8E5A2E', 1.4, 0.6));
    c.drawLine(18, 70, 50, 84, line('#8E5A2E', 1.2, 0.5));
  },
  (c) => {
    shadow(c, 50, 92, 30);
    c.drawPath(blob([[30, 74], [70, 74], [74, 90], [26, 90]]), lin(0, 72, 0, 90, ['#C9A26A', '#8E6A3E']));
    c.drawLine(32, 80, 68, 80, line('#7A5232', 1.4));
    c.drawLine(50, 74, 50, 48, line('#7A5232', 5));
    c.drawPath(blob([[22, 46], [32, 22], [50, 14], [70, 22], [80, 46], [62, 56], [38, 56]]), rad(42, 26, 50, ['#9BD47A', GREEN, DGREEN], [0, 0.5, 1]));
    for (const [x, y] of [[36, 34], [58, 28], [66, 44], [44, 46]] as const) apple(c, x, y, 5);
  },
  (c) => {
    glow(c, 50, 54, 46, '#FFE08A', 0.65);
    shadow(c, 50, 90, 24);
    apple(c, 50, 56, 28, '#F2B544');
    sparkle(c, 28, 26, 5);
    sparkle(c, 76, 34, 4);
    sparkle(c, 70, 78, 3);
  },
];

// ---------------------------------------------------------------------------------------------
// Lantern parts
// ---------------------------------------------------------------------------------------------

function candle(c: SkCanvas, cx: number, top: number, w: number, h: number, hex = '#F6EEDC') {
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(cx - w / 2, top, w, h), 3, 3), lin(cx - w / 2, 0, cx + w / 2, 0, [shade(hex, -0.1), shade(hex, 0.2), shade(hex, -0.25)]));
  c.drawPath(blob([[cx - w / 2, top + 2], [cx - w * 0.2, top + 8], [cx - w * 0.35, top + 4]]), fill(shade(hex, 0.3)));
  c.drawLine(cx, top, cx, top - 4, line('#3E2A1E', 1.4));
  flame(c, cx, top - 4, Math.max(3, w * 0.38));
}

function lanternBody(c: SkCanvas, cx: number, top: number, w: number, h: number, metal: string, glowCol = '#FFD27A') {
  glow(c, cx, top + h * 0.55, w * 1.1, glowCol, 0.5);
  c.drawPath(poly([[cx - w * 0.35, top], [cx + w * 0.35, top], [cx + w * 0.55, top + h * 0.18], [cx - w * 0.55, top + h * 0.18]]), lin(0, top, 0, top + h * 0.18, [shade(metal, 0.35), shade(metal, -0.2)]));
  const glass = rrectPath(cx - w / 2, top + h * 0.18, w, h * 0.64, 4);
  c.drawPath(glass, rad(cx, top + h * 0.5, w * 0.7, ['#FFF6D0', glowCol, shade(glowCol, -0.2)], [0, 0.5, 1]));
  candle(c, cx, top + h * 0.45, w * 0.28, h * 0.32);
  c.drawPath(glass, line(metal, 2.2));
  c.drawLine(cx, top + h * 0.18, cx, top + h * 0.82, line(metal, 1.4, 0.7));
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(cx - w * 0.58, top + h * 0.82, w * 1.16, h * 0.12), 2, 2), lin(0, top + h * 0.82, 0, top + h * 0.94, [shade(metal, 0.3), shade(metal, -0.3)]));
  c.drawPath(curve([[cx - w * 0.25, top], [cx, top - h * 0.18], [cx + w * 0.25, top]]), line(metal, 2.4));
  shine(c, cx - w * 0.3, top + h * 0.4, w * 0.06, h * 0.15, 0.6);
}

const lantern: Drawer[] = [
  (c) => {
    glow(c, 50, 50, 34, '#FFD27A', 0.7);
    ball(c, 50, 50, 9, '#FFE9A8', 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.drawLine(50 + Math.cos(a) * 13, 50 + Math.sin(a) * 13, 50 + Math.cos(a) * (i % 2 ? 19 : 24), 50 + Math.sin(a) * (i % 2 ? 19 : 24), line('#FFE08A', 2.2, 0.85));
    }
    sparkle(c, 50, 50, 6, '#FFFFFF');
  },
  (c) => {
    shadow(c, 50, 78, 20);
    c.drawPath(curve([[30, 70], [40, 56], [56, 64], [62, 50], [50, 38], [58, 28]]), line('#F2EFE6', 4));
    c.drawPath(curve([[30, 70], [40, 56], [56, 64], [62, 50], [50, 38], [58, 28]]), line('#C9C3B7', 1.2, 0.8));
    c.drawCircle(58, 26, 3.2, fill('#3E2A1E'));
    glow(c, 58, 24, 8, '#FFB347', 0.5);
  },
  (c) => {
    shadow(c, 50, 86, 20);
    c.drawOval(Skia.XYWHRect(32, 80, 36, 8), lin(0, 80, 0, 88, ['#E9C46A', '#B5835A']));
    candle(c, 50, 42, 18, 40);
  },
  (c) => {
    shadow(c, 50, 90, 22);
    lanternBody(c, 50, 28, 34, 62, '#7E8A90');
  },
  (c) => {
    shadow(c, 50, 92, 24);
    lanternBody(c, 50, 22, 40, 70, '#C9923E', '#FFC95A');
    for (const x of [34, 66]) c.drawCircle(x, 36, 2.4, fill('#E9C46A'));
  },
  (c) => {
    shadow(c, 50, 94, 18);
    c.drawRect(Skia.XYWHRect(47, 54, 6, 40), lin(47, 0, 53, 0, ['#5E5248', '#2E2620']));
    c.drawPath(curve([[50, 56], [62, 50], [64, 40]]), line('#3E3630', 2.4));
    c.save();
    c.scale(0.62, 0.62);
    c.translate(50 / 0.62 - 50 + 12, 0);
    lanternBody(c, 52, 22, 40, 70, '#C9923E', '#FFC95A');
    c.restore();
    leaf(c, 50, 80, 12, 4, -2.6, GREEN);
  },
  (c) => {
    shadow(c, 50, 94, 26);
    lanternBody(c, 50, 24, 48, 70, '#8E5A2E', '#FFC95A');
    c.drawPath(star5(50, 18, 6), fill(GOLD));
    for (const x of [26, 74]) c.drawLine(x, 40, x, 76, line('#C9923E', 2.2));
    sparkle(c, 80, 30, 4);
  },
  (c) => {
    glow(c, 50, 50, 50, '#FFD27A', 0.75);
    const h = Skia.PathBuilder.Make();
    h.moveTo(50, 80);
    h.cubicTo(20, 60, 18, 34, 34, 28);
    h.cubicTo(44, 24, 50, 32, 50, 38);
    h.cubicTo(50, 32, 56, 24, 66, 28);
    h.cubicTo(82, 34, 80, 60, 50, 80);
    h.close();
    const heart = h.detach();
    c.drawPath(heart, rad(42, 40, 40, ['#FFFFFF', '#FFE08A', '#F2B544'], [0, 0.4, 1]));
    c.drawPath(heart, line('#E09A2E', 1.6, 0.6));
    c.drawPath(poly([[40, 34], [50, 46], [60, 34]], false), line('#FFFFFF', 1.4, 0.7));
    sparkle(c, 44, 40, 5, '#FFFFFF');
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + ((i - 2.5) / 6) * 2.2;
      c.drawLine(50 + Math.cos(a) * 36, 52 + Math.sin(a) * 36, 50 + Math.cos(a) * 44, 52 + Math.sin(a) * 44, line('#FFE08A', 2, 0.8));
    }
  },
];

// ---------------------------------------------------------------------------------------------
// Grain
// ---------------------------------------------------------------------------------------------

const WHEAT = '#E3B85C';

function ear(c: SkCanvas, x: number, y: number, len: number, ang: number) {
  c.save();
  c.translate(x, y);
  c.rotate((ang * 180) / Math.PI, 0, 0);
  c.drawLine(0, 0, 0, len, line('#B88E3E', 1.8));
  for (let i = 0; i < 5; i++) {
    const yy = -i * len * 0.11;
    for (const s of [-1, 1]) {
      c.save();
      c.translate(s * 3, yy);
      c.rotate(s * 25, 0, 0);
      c.drawOval(Skia.XYWHRect(-2.6, -5, 5.2, 10), lin(0, -5, 0, 5, [shade(WHEAT, 0.3), shade(WHEAT, -0.2)]));
      c.restore();
    }
  }
  c.drawOval(Skia.XYWHRect(-2.4, -len * 0.55 - 5, 4.8, 9), fill(shade(WHEAT, 0.2)));
  c.restore();
}

function sack(c: SkCanvas, cx: number, top: number, w: number, h: number) {
  const p = blob([[cx - w * 0.3, top], [cx + w * 0.3, top], [cx + w * 0.5, top + h * 0.6], [cx + w * 0.42, top + h], [cx - w * 0.42, top + h], [cx - w * 0.5, top + h * 0.6]]);
  body(c, p, '#E6D3B0', top, top + h);
  c.drawPath(blob([[cx - w * 0.3, top], [cx, top - h * 0.18], [cx + w * 0.3, top], [cx, top + h * 0.06]]), fill('#F6EEDC'));
  c.drawLine(cx - w * 0.3, top + h * 0.06, cx + w * 0.3, top + h * 0.06, line('#B5835A', 2.2));
}

const grain: Drawer[] = [
  (c) => {
    shadow(c, 50, 70, 18);
    for (const [x, y, r] of [[42, 58, -0.4], [56, 56, 0.3], [50, 46, 0]] as const) {
      c.save();
      c.rotate(r * 57, x, y);
      c.drawOval(Skia.XYWHRect(x - 5, y - 8, 10, 16), rad(x - 2, y - 3, 10, [shade(WHEAT, 0.4), WHEAT, shade(WHEAT, -0.3)]));
      c.drawLine(x, y - 6, x, y + 6, line(shade(WHEAT, -0.35), 1, 0.5));
      c.restore();
    }
  },
  (c) => {
    shadow(c, 50, 86, 12);
    ear(c, 50, 86, 70, 0.1);
  },
  (c) => {
    shadow(c, 50, 88, 22);
    for (const a of [-0.35, -0.15, 0.05, 0.25, 0.4]) ear(c, 50, 88, 70, a * 0.8);
    c.drawRect(Skia.XYWHRect(42, 64, 16, 6), fill('#C8323C'));
  },
  (c) => {
    shadow(c, 50, 90, 30);
    sack(c, 50, 34, 56, 56);
    ear(c, 50, 74, 22, 0.25);
    ear(c, 50, 74, 22, -0.25);
  },
  (c) => {
    shadow(c, 50, 84, 34);
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(14, 66, 72, 14), 5, 5), lin(0, 66, 0, 80, [LWOOD, shade(LWOOD, -0.3)]));
    const d = blob([[26, 68], [30, 50], [50, 42], [70, 50], [74, 68]]);
    c.drawPath(d, rad(42, 48, 40, ['#FFF6E2', '#F2DDB4', '#D9BE8E'], [0, 0.6, 1]));
    c.drawPath(d, line('#B9996A', 1.2, 0.5));
    for (const [x, y] of [[20, 62], [80, 64], [74, 58]] as const) c.drawCircle(x, y, 1.8, fill('#FFFFFF', 0.8));
  },
  (c) => {
    shadow(c, 50, 84, 34);
    const p = blob([[16, 70], [22, 48], [50, 38], [78, 48], [84, 70], [50, 78]]);
    body(c, p, '#D9963E', 38, 78);
    for (const x of [34, 50, 66]) c.drawPath(curve([[x - 6, 52], [x, 46], [x + 6, 52]]), line('#F6D9A0', 3));
    shine(c, 36, 48, 10, 3, 0.35);
  },
  (c) => {
    shadow(c, 50, 90, 34);
    c.save();
    c.rotate(-15, 40, 40);
    c.drawPath(blob([[22, 46], [28, 34], [50, 30], [58, 40], [48, 50]]), lin(0, 30, 0, 50, ['#E8A84E', '#B8742E']));
    c.restore();
    c.drawPath(blob([[46, 46], [58, 30], [72, 34], [70, 50]]), lin(0, 30, 0, 50, ['#F2C46E', '#C8843E']));
    c.drawCircle(60, 40, 1.4, fill('#FFF6E2'));
    basket(c, 20, 50, 60, 34, '#C98E4E');
    c.drawPath(blob([[24, 50], [76, 50], [70, 58], [30, 58]]), fill('#F6EEDC'));
  },
  (c) => {
    shadow(c, 50, 90, 32);
    cylinder(c, 50, 58, 30, 26, '#F6D9E4', '#FFF6F9');
    cylinder(c, 50, 38, 22, 20, '#F7B7CC', '#FFF6F9');
    c.drawPath(curve([[28, 40], [36, 46], [44, 40], [52, 46], [60, 40], [68, 46], [72, 40]]), line('#FFFFFF', 3));
    ball(c, 50, 30, 6, '#C8323C', 0.8);
    leaf(c, 50, 25, 8, 3, -0.8, GREEN, false);
  },
  (c) => {
    shadow(c, 50, 86, 38);
    c.drawOval(Skia.XYWHRect(12, 52, 76, 30), lin(0, 52, 0, 82, ['#E7B26A', '#A86A2E']));
    c.drawOval(Skia.XYWHRect(16, 48, 68, 26), fill('#B8323C'));
    c.save();
    c.clipPath(ovalPath(50, 61, 34, 13), 1, true);
    for (let i = -4; i <= 4; i++) {
      c.drawLine(50 + i * 9 - 14, 48, 50 + i * 9 + 14, 74, line('#F2C46E', 4));
      c.drawLine(50 + i * 9 + 14, 48, 50 + i * 9 - 14, 74, line('#E7B26A', 4));
    }
    c.restore();
    for (let i = 0; i < 14; i++) c.drawCircle(50 + Math.cos((i / 14) * Math.PI * 2) * 36, 64 + Math.sin((i / 14) * Math.PI * 2) * 14, 3.2, fill('#D99A50'));
  },
  (c) => {
    shadow(c, 50, 92, 40);
    isoBox(c, 50, 36, 80, 30, 6, '#B07A4A');
    for (const x of [22, 78]) c.drawRect(Skia.XYWHRect(x - 2, 58, 4, 30), fill('#8E5A2E'));
    c.drawOval(Skia.XYWHRect(20, 42, 26, 10), fill('#F6EEDC'));
    c.drawOval(Skia.XYWHRect(54, 42, 26, 10), fill('#F6EEDC'));
    c.drawPath(blob([[24, 46], [30, 36], [42, 36], [44, 46]]), lin(0, 36, 0, 46, ['#E8A84E', '#B8742E']));
    apple(c, 62, 40, 6);
    plum(c, 72, 42, 5);
    cylinder(c, 50, 34, 8, 12, '#F7B7CC', '#FFF6F9');
    candle(c, 38, 22, 5, 14);
    candle(c, 62, 22, 5, 14);
  },
];

// ---------------------------------------------------------------------------------------------
// Honey
// ---------------------------------------------------------------------------------------------

const HONEY = '#F0A72E';

function comb(c: SkCanvas, cx: number, cy: number, r: number, rows = 2, cols = 3) {
  const w = r * Math.sqrt(3);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const px = cx + (x - (cols - 1) / 2) * w + (y % 2 ? w / 2 : 0) - w / 4;
    const py = cy + (y - (rows - 1) / 2) * r * 1.5;
    const h = hexagon(px, py, r * 0.96);
    c.drawPath(h, rad(px - r * 0.3, py - r * 0.3, r * 1.4, ['#FFE08A', HONEY, '#C8761E']));
    c.drawPath(h, line('#B8641A', 1.4, 0.7));
    shine(c, px - r * 0.3, py - r * 0.3, r * 0.18, r * 0.12, 0.6);
  }
}

function bee(c: SkCanvas, x: number, y: number, s: number) {
  c.drawOval(Skia.XYWHRect(x - s * 0.4, y - s * 0.9, s * 0.8, s * 0.7), fill('#FFFFFF', 0.75));
  c.drawOval(Skia.XYWHRect(x - s, y - s * 0.55, s * 2, s * 1.1), fill('#F2C14E'));
  c.drawLine(x - s * 0.2, y - s * 0.5, x - s * 0.2, y + s * 0.5, line('#3E2A1E', s * 0.3));
  c.drawLine(x + s * 0.35, y - s * 0.45, x + s * 0.35, y + s * 0.45, line('#3E2A1E', s * 0.3));
}

const honey: Drawer[] = [
  (c) => {
    shadow(c, 50, 70, 16);
    for (const [x, y, r] of [[44, 54, 7], [56, 52, 6], [50, 44, 6], [42, 44, 4], [58, 60, 4]] as const) {
      ball(c, x, y, r, '#F6D04E', 0.5);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        c.drawCircle(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.2, fill('#E0A82E'));
      }
    }
  },
  (c) => {
    shadow(c, 50, 80, 16);
    const d = blob([[50, 26], [62, 52], [64, 66], [50, 78], [36, 66], [38, 52]], 0.9);
    c.drawPath(d, rad(44, 52, 34, ['#FFF2B8', '#F6B93E', '#C8761E'], [0, 0.45, 1]));
    c.drawPath(d, line('#B8641A', 1.2, 0.5));
    shine(c, 44, 56, 3, 7, 0.75);
  },
  (c) => {
    shadow(c, 50, 82, 30);
    comb(c, 50, 54, 12, 2, 3);
    c.drawPath(blob([[56, 66], [60, 74], [56, 80], [52, 74]]), fill(HONEY));
  },
  (c) => {
    shadow(c, 50, 90, 24);
    jar(c, 30, 36, 40, 52, HONEY, 0.8, '#C98E4E');
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(37, 58, 26, 16), 3, 3), fill('#F6EEDC'));
    c.drawPath(hexagon(50, 66, 5), fill(HONEY));
    c.save();
    c.rotate(25, 70, 30);
    c.drawRect(Skia.XYWHRect(68, 6, 4, 34), fill('#B07A4A'));
    c.drawOval(Skia.XYWHRect(63, 34, 14, 16), lin(0, 34, 0, 50, ['#D9A86E', '#8E5A2E']));
    c.restore();
  },
  (c) => {
    shadow(c, 50, 92, 30);
    const b = blob([[28, 26], [72, 26], [78, 56], [72, 88], [28, 88], [22, 56]], 0.8);
    body(c, b, '#B07A4A', 26, 88);
    for (const y of [34, 56, 80]) c.drawPath(curve([[24, y], [50, y + 4], [76, y]]), line('#7E8A90', 3.2));
    c.drawOval(Skia.XYWHRect(30, 22, 40, 10), lin(0, 22, 0, 32, ['#D9A86E', '#8E5A2E']));
    c.drawPath(blob([[58, 26], [64, 36], [60, 46], [56, 36]]), fill(HONEY));
    c.drawPath(hexagon(50, 66, 7), fill('#F6EEDC'));
    c.drawPath(hexagon(50, 66, 4.5), fill(HONEY));
  },
  (c) => {
    shadow(c, 50, 92, 22);
    c.drawOval(Skia.XYWHRect(28, 84, 44, 10), lin(0, 84, 0, 94, ['#E9C46A', '#B5835A']));
    const p = rrectPath(36, 34, 28, 52, 4);
    c.drawPath(p, lin(36, 0, 64, 0, ['#E0A82E', '#FFD27A', '#C8761E']));
    c.save();
    c.clipPath(p, 1, true);
    for (let y = 0; y < 7; y++) for (let x = 0; x < 4; x++) c.drawPath(hexagon(38 + x * 8 + (y % 2) * 4, 38 + y * 7, 4), line('#B8641A', 0.9, 0.6));
    c.restore();
    c.drawLine(50, 34, 50, 28, line('#3E2A1E', 1.4));
    flame(c, 50, 28, 6);
  },
  (c) => {
    shadow(c, 50, 88, 30);
    comb(c, 50, 60, 11, 3, 3);
    c.drawPath(poly([[30, 34], [38, 22], [44, 32], [50, 18], [56, 32], [62, 22], [70, 34]]), lin(0, 18, 0, 34, ['#FFE9A8', GOLD]));
    c.drawPath(poly([[30, 34], [38, 22], [44, 32], [50, 18], [56, 32], [62, 22], [70, 34]]), line('#C8761E', 1.4));
    for (const x of [38, 50, 62]) ball(c, x, x === 50 ? 18 : 22, 2.6, '#C8323C', 0.4);
  },
  (c) => {
    glow(c, 50, 54, 44, '#FFD27A', 0.5);
    shadow(c, 50, 92, 30);
    const h = blob([[30, 88], [24, 64], [30, 40], [50, 24], [70, 40], [76, 64], [70, 88]], 0.8);
    body(c, h, '#F2C14E', 24, 88);
    for (const y of [44, 56, 68, 80]) c.drawPath(curve([[26, y], [50, y + 5], [74, y]]), line('#C8862E', 2.4));
    c.drawOval(Skia.XYWHRect(42, 70, 16, 14), fill('#5A3A1E'));
    bee(c, 78, 30, 5);
    bee(c, 22, 44, 4);
    sparkle(c, 64, 22, 4);
  },
  (c) => {
    glow(c, 50, 50, 46, '#FFE08A', 0.55);
    shadow(c, 50, 84, 34);
    const crown = poly([[18, 74], [18, 40], [32, 54], [42, 30], [50, 46], [58, 30], [68, 54], [82, 40], [82, 74]]);
    c.drawPath(crown, lin(0, 30, 0, 74, ['#FFE9A8', GOLD, '#C8862E']));
    c.drawPath(crown, line('#B8641A', 1.6));
    c.save();
    c.clipPath(crown, 1, true);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) c.drawPath(hexagon(20 + x * 9 + (y % 2) * 4.5, 52 + y * 7.5, 4.6), line('#C8862E', 1, 0.6));
    c.restore();
    for (const [x, y, col] of [[18, 40, PINK], [42, 30, '#FFFFFF'], [58, 30, '#B9A3E3'], [82, 40, PINK]] as const) blossom(c, x, y, 7, 5, col, '#F6C443');
    bee(c, 50, 20, 4);
  },
];

// ---------------------------------------------------------------------------------------------
// Fabric
// ---------------------------------------------------------------------------------------------

const BLUE = '#7FA7C9';

function yarnBall(c: SkCanvas, x: number, y: number, r: number, hex: string) {
  ball(c, x, y, r, hex, 1);
  for (let i = 0; i < 4; i++) c.drawPath(curve([[x - r * 0.9, y - r * 0.3 + i * r * 0.3], [x, y - r * 0.6 + i * r * 0.45], [x + r * 0.9, y - r * 0.2 + i * r * 0.3]]), line(shade(hex, -0.3), 1, 0.6));
}

const fabric: Drawer[] = [
  (c) => {
    shadow(c, 50, 74, 22);
    c.drawPath(blob([[28, 62], [26, 48], [38, 38], [54, 36], [70, 44], [74, 60], [60, 68], [40, 68]]), rad(42, 44, 40, ['#FFFFFF', '#F2EFE6', '#C9C3B7'], [0, 0.6, 1]));
    for (const [x, y] of [[38, 48], [52, 46], [62, 56], [44, 58]] as const) c.drawPath(curve([[x - 5, y], [x, y - 4], [x + 5, y]]), line('#C9C3B7', 1.4));
  },
  (c) => {
    shadow(c, 50, 78, 22);
    c.drawPath(curve([[24, 68], [30, 40], [50, 56], [66, 36], [74, 58], [58, 70], [44, 62]]), line('#C8323C', 3));
    c.drawLine(70, 22, 80, 64, line('#B7BEC4', 2.4));
    c.drawOval(Skia.XYWHRect(68, 22, 5, 9), line('#8E979E', 1.4));
  },
  (c) => {
    shadow(c, 50, 86, 22);
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(30, 26, 40, 8), 3, 3), lin(0, 26, 0, 34, [LWOOD, WOOD]));
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(30, 76, 40, 8), 3, 3), lin(0, 76, 0, 84, [LWOOD, WOOD]));
    c.drawRect(Skia.XYWHRect(34, 34, 32, 42), lin(34, 0, 66, 0, ['#5E86A8', '#A8C8E3', '#4E7898']));
    for (let y = 36; y < 76; y += 3) c.drawLine(34, y, 66, y + 1, line('#3E6888', 0.8, 0.5));
    c.drawPath(curve([[66, 60], [76, 66], [72, 80]]), line('#5E86A8', 1.6));
  },
  (c) => {
    shadow(c, 50, 84, 36);
    c.drawRect(Skia.XYWHRect(22, 44, 56, 32), lin(0, 44, 0, 76, [shade(BLUE, 0.2), BLUE, shade(BLUE, -0.3)]));
    for (let x = 26; x < 76; x += 8) c.drawLine(x, 44, x, 76, line('#F2EFE6', 2, 0.6));
    c.drawOval(Skia.XYWHRect(70, 44, 16, 32), rad(78, 60, 14, ['#C8DCEC', BLUE]));
    c.drawOval(Skia.XYWHRect(14, 44, 16, 32), lin(14, 0, 30, 0, [shade(BLUE, -0.2), shade(BLUE, -0.4)]));
    c.drawPath(curve([[22, 76], [40, 84], [56, 80], [70, 86]]), line(shade(BLUE, -0.2), 4));
  },
  (c) => {
    shadow(c, 50, 90, 32);
    yarnBall(c, 36, 48, 11, '#C8323C');
    yarnBall(c, 60, 46, 12, '#7FA7C9');
    yarnBall(c, 48, 38, 9, '#F2B544');
    basket(c, 20, 54, 60, 32, '#B9915A');
    c.drawLine(64, 30, 80, 22, line('#B7BEC4', 2));
  },
  (c) => {
    shadow(c, 50, 86, 34);
    const p = blob([[18, 34], [50, 28], [82, 34], [80, 68], [50, 74], [20, 68]], 0.9);
    c.drawPath(p, rad(44, 44, 44, ['#FFE9C8', '#E8A06E', '#B8643E'], [0, 0.55, 1]));
    c.drawPath(p, line('#8E4A2E', 1.4, 0.5));
    c.drawPath(curve([[30, 50], [50, 46], [70, 50]]), line('#F6EEDC', 2, 0.7));
    c.drawPath(star5(50, 51, 8, 0.5), fill('#F6EEDC', 0.85));
    for (const [x, y] of [[18, 34], [82, 34], [80, 68], [20, 68]] as const) c.drawPath(poly([[x, y], [x - 4, y + 8], [x + 4, y + 8]]), fill('#F2B544'));
  },
  (c) => {
    shadow(c, 50, 86, 36);
    for (const [y, col] of [[64, '#6FAE52'], [52, '#F2B544'], [40, '#C8323C']] as const) {
      const p = rrectPath(16, y, 68, 14, 6);
      c.drawPath(p, lin(0, y, 0, y + 14, [shade(col, 0.25), shade(col, -0.2)]));
      for (let x = 22; x < 80; x += 8) c.drawPath(poly([[x, y + 3], [x + 4, y + 7], [x, y + 11], [x - 4, y + 7]]), fill('#F6EEDC', 0.75));
      c.drawPath(p, line(shade(col, -0.45), 1.2, 0.5));
    }
  },
  (c) => {
    shadow(c, 50, 88, 38);
    c.save();
    c.translate(50, 56);
    c.skew(-0.25, 0);
    c.translate(-50, -56);
    const p = rrectPath(20, 30, 60, 52, 3);
    c.drawPath(p, fill('#B8323C'));
    c.drawRect(Skia.XYWHRect(24, 34, 52, 44), line('#F2B544', 2.4));
    for (const [x, y] of [[50, 56], [36, 44], [64, 44], [36, 68], [64, 68]] as const) {
      c.drawPath(poly([[x, y - 7], [x + 7, y], [x, y + 7], [x - 7, y]]), fill(x === 50 ? '#F2B544' : '#2E5E88'));
      c.drawPath(poly([[x, y - 3], [x + 3, y], [x, y + 3], [x - 3, y]]), fill('#F6EEDC'));
    }
    c.restore();
    for (let i = 0; i < 9; i++) c.drawLine(28 + i * 6, 82, 28 + i * 6, 88, line('#F2B544', 1.4));
  },
  (c) => {
    shadow(c, 50, 94, 30);
    c.drawRect(Skia.XYWHRect(16, 16, 68, 4), lin(0, 16, 0, 20, [LWOOD, WOOD]));
    const p = poly([[20, 20], [80, 20], [80, 82], [74, 88], [68, 82], [62, 88], [56, 82], [50, 88], [44, 82], [38, 88], [32, 82], [26, 88], [20, 82]]);
    c.drawPath(p, lin(0, 20, 0, 88, ['#A8D0E8', '#F2E3C8']));
    c.save();
    c.clipPath(p, 1, true);
    c.drawPath(blob([[10, 70], [36, 50], [56, 62], [80, 46], [96, 70], [96, 100], [10, 100]]), fill('#8FBF6A'));
    c.drawPath(blob([[10, 82], [44, 66], [90, 78], [96, 100], [10, 100]]), fill('#6FAE52'));
    c.drawPath(curve([[30, 90], [48, 74], [58, 62]]), line('#7EC8E3', 4));
    c.drawCircle(66, 34, 7, fill('#FFE08A'));
    c.restore();
    c.drawPath(p, line('#8E5A2E', 1.6));
    sparkle(c, 66, 34, 4);
  },
];

// ---------------------------------------------------------------------------------------------
// Ceramics
// ---------------------------------------------------------------------------------------------

const CLAY = '#D98B5F';
const GLAZE = '#3E7CB8';

function vase(c: SkCanvas, cx: number, top: number, w: number, h: number, hex: string, pattern = true) {
  const p = blob([[cx - w * 0.18, top], [cx + w * 0.18, top], [cx + w * 0.14, top + h * 0.18], [cx + w * 0.5, top + h * 0.55], [cx + w * 0.3, top + h], [cx - w * 0.3, top + h], [cx - w * 0.5, top + h * 0.55], [cx - w * 0.14, top + h * 0.18]], 0.85);
  body(c, p, hex, top, top + h);
  if (pattern) {
    c.save();
    c.clipPath(p, 1, true);
    c.drawLine(cx - w, top + h * 0.45, cx + w, top + h * 0.45, line('#F6EEDC', 2.4));
    for (let i = -3; i <= 3; i++) blossom(c, cx + i * w * 0.18, top + h * 0.62, w * 0.06, 5, '#F6EEDC', GLAZE);
    c.restore();
  }
  shine(c, cx - w * 0.25, top + h * 0.5, w * 0.05, h * 0.14, 0.6);
}

const ceramic: Drawer[] = [
  (c) => {
    shadow(c, 50, 74, 22);
    const p = blob([[30, 66], [32, 50], [46, 42], [64, 46], [70, 60], [60, 70], [40, 70]]);
    body(c, p, '#C2704A', 42, 70);
    c.drawPath(curve([[40, 52], [48, 56], [56, 52]]), line('#9A5232', 1.4, 0.6));
    c.drawCircle(58, 60, 2, fill('#9A5232', 0.6));
  },
  (c) => {
    shadow(c, 50, 78, 28);
    bowl(c, 50, 50, 56, 26, CLAY);
    c.drawOval(Skia.XYWHRect(26, 48, 48, 6), fill('#8E4A2E', 0.6));
  },
  (c) => {
    shadow(c, 50, 82, 30);
    c.drawOval(Skia.XYWHRect(20, 70, 60, 12), lin(0, 70, 0, 82, ['#F6EEDC', '#C9C3B7']));
    const cup = Skia.PathBuilder.Make();
    cup.moveTo(32, 40);
    cup.lineTo(68, 40);
    cup.cubicTo(68, 66, 62, 74, 50, 74);
    cup.cubicTo(38, 74, 32, 66, 32, 40);
    cup.close();
    body(c, cup.detach(), '#F2EFE6', 40, 74);
    c.drawCircle(70, 54, 8, line('#E6E0D2', 4));
    c.drawLine(34, 50, 66, 50, line(GLAZE, 3));
    c.drawOval(Skia.XYWHRect(32, 37, 36, 7), fill('#6E3A1E'));
    c.drawPath(curve([[46, 30], [42, 24], [48, 16]]), line('#FFFFFF', 1.6, 0.5));
  },
  (c) => {
    shadow(c, 50, 90, 26);
    const j = blob([[40, 26], [58, 26], [56, 36], [70, 56], [64, 88], [36, 88], [30, 56], [42, 36]]);
    body(c, j, CLAY, 26, 88);
    c.drawPath(poly([[40, 26], [32, 22], [38, 30]]), fill(CLAY));
    c.drawPath(curve([[58, 32], [76, 36], [66, 60]]), line(shade(CLAY, -0.2), 5));
    c.drawLine(32, 62, 68, 62, line('#F6EEDC', 2.4));
  },
  (c) => {
    shadow(c, 50, 92, 24);
    vase(c, 50, 16, 52, 76, GLAZE);
  },
  (c) => {
    shadow(c, 50, 88, 34);
    const t = rrectPath(18, 18, 64, 64, 6);
    body(c, t, '#F6F3EC', 18, 82, { light: 0.1, dark: -0.1 });
    c.drawPath(rrectPath(22, 22, 56, 56, 4), line(GLAZE, 2.4));
    blossom(c, 50, 50, 14, 8, GLAZE, '#C8323C');
    for (const [x, y] of [[26, 26], [74, 26], [26, 74], [74, 74]] as const) {
      leaf(c, x, y, 10, 3.5, Math.atan2(50 - y, 50 - x), '#3E8E7E', false);
    }
    c.drawPath(curve([[30, 50], [36, 40], [42, 46]]), line('#3E8E7E', 1.6));
    c.drawPath(curve([[70, 50], [64, 60], [58, 54]]), line('#3E8E7E', 1.6));
    shine(c, 30, 28, 8, 3, 0.4);
  },
  (c) => {
    shadow(c, 50, 86, 38);
    c.drawOval(Skia.XYWHRect(12, 22, 76, 64), rad(44, 46, 46, ['#FFFFFF', '#F2EFE6', '#C9C3B7'], [0, 0.6, 1]));
    c.drawOval(Skia.XYWHRect(22, 30, 56, 48), line(GLAZE, 3));
    c.drawOval(Skia.XYWHRect(30, 36, 40, 36), fill('#EAF2F8'));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      blossom(c, 50 + Math.cos(a) * 26, 54 + Math.sin(a) * 21, 4.5, 5, i % 2 ? GLAZE : '#C8323C', '#F2B544');
    }
    blossom(c, 50, 54, 10, 6, GLAZE, '#F2B544');
  },
  (c) => {
    shadow(c, 50, 92, 26);
    glow(c, 50, 56, 40, '#FFD27A', 0.45);
    const p = blob([[38, 24], [62, 24], [74, 54], [66, 86], [34, 86], [26, 54]], 0.85);
    body(c, p, CLAY, 24, 86);
    c.save();
    c.clipPath(p, 1, true);
    for (const [x, y] of [[40, 44], [50, 40], [60, 44], [36, 58], [50, 56], [64, 58], [42, 72], [58, 72]] as const) {
      glow(c, x, y, 6, '#FFD27A', 0.8);
      c.drawPath(star5(x, y, 3.4), fill('#FFF2B8'));
    }
    c.restore();
    c.drawPath(curve([[40, 24], [50, 8], [60, 24]]), line('#8E4A2E', 3));
  },
  (c) => {
    shadow(c, 50, 94, 30);
    const p = blob([[34, 10], [66, 10], [62, 22], [82, 50], [70, 84], [30, 84], [18, 50], [38, 22]], 0.8);
    body(c, p, '#2E6EA8', 10, 86);
    c.save();
    c.clipPath(p, 1, true);
    c.drawRect(Skia.XYWHRect(0, 40, 100, 26), fill('#F6F3EC'));
    for (let i = 0; i < 6; i++) blossom(c, 20 + i * 12, 53, 5, 6, '#2E6EA8', '#C8323C');
    c.drawLine(0, 40, 100, 40, line('#F2B544', 2.4));
    c.drawLine(0, 66, 100, 66, line('#F2B544', 2.4));
    c.restore();
    for (const s of [-1, 1]) c.drawPath(curve([[50 + s * 14, 24], [50 + s * 34, 20], [50 + s * 28, 44]]), line('#F2B544', 3));
    c.drawRect(Skia.XYWHRect(30, 84, 40, 8), lin(0, 84, 0, 92, ['#2E6EA8', '#1E4E78']));
    sparkle(c, 70, 30, 3.5);
  },
];

// ---------------------------------------------------------------------------------------------
// Shells
// ---------------------------------------------------------------------------------------------

const SHELL = '#F2C9B8';

function scallop(c: SkCanvas, cx: number, cy: number, r: number, hex = SHELL) {
  const b = Skia.PathBuilder.Make();
  b.moveTo(cx, cy + r * 0.7);
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r * 0.9;
    b.lineTo(x, y);
  }
  b.close();
  const p = b.detach();
  c.drawPath(p, rad(cx, cy - r * 0.3, r * 1.3, [shade(hex, 0.45), hex, shade(hex, -0.3)]));
  for (let i = 1; i < 6; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    c.drawLine(cx, cy + r * 0.7, cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.85, line(shade(hex, -0.3), 1, 0.6));
  }
  c.drawPath(p, line(shade(hex, -0.45), 1.2, 0.6));
  c.drawPath(poly([[cx - r * 0.25, cy + r * 0.6], [cx + r * 0.25, cy + r * 0.6], [cx + r * 0.15, cy + r * 0.85], [cx - r * 0.15, cy + r * 0.85]]), fill(shade(hex, -0.15)));
}

const shell: Drawer[] = [
  (c) => {
    shadow(c, 50, 72, 16);
    scallop(c, 50, 56, 16);
  },
  (c) => {
    shadow(c, 50, 78, 22);
    const p = blob([[30, 74], [32, 56], [46, 40], [64, 44], [72, 60], [68, 74]]);
    body(c, p, '#E6C2A0', 40, 76);
    c.drawPath(curve([[52, 60], [58, 54], [62, 60], [56, 68], [46, 66], [44, 54], [54, 46], [66, 50]]), line('#B8835A', 2));
    c.drawPath(blob([[22, 76], [30, 70], [40, 76], [32, 80]]), fill('#C9A0A0'));
  },
  (c) => {
    shadow(c, 50, 80, 26);
    const p = star5(50, 54, 28, 0.42);
    c.drawPath(p, rad(46, 48, 34, ['#FFC9A0', '#F2865A', '#C8563A']));
    c.drawPath(p, line('#A8462E', 1.4, 0.6));
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      for (let k = 1; k <= 3; k++) c.drawCircle(50 + Math.cos(a) * k * 6.5, 54 + Math.sin(a) * k * 6.5, 1.4, fill('#FFE3C8'));
    }
  },
  (c) => {
    shadow(c, 50, 80, 28);
    c.drawPath(blob([[24, 66], [34, 52], [66, 52], [76, 66], [50, 78]]), lin(0, 52, 0, 78, ['#B7B0A3', '#7E776A']));
    c.drawPath(blob([[28, 62], [50, 54], [72, 62], [50, 70]]), rad(50, 60, 24, ['#F6EEF2', '#E3D3DC']));
    c.drawPath(blob([[26, 56], [34, 30], [66, 30], [74, 56], [50, 52]]), lin(0, 30, 0, 56, ['#C9C3B7', '#8E877A']));
    for (const y of [36, 42, 48]) c.drawPath(curve([[32, y], [50, y - 3], [68, y]]), line('#6E675A', 1, 0.5));
  },
  (c) => {
    glow(c, 50, 60, 30, '#FFFFFF', 0.4);
    shadow(c, 50, 80, 28);
    c.drawPath(blob([[24, 66], [34, 52], [66, 52], [76, 66], [50, 78]]), lin(0, 52, 0, 78, ['#B7B0A3', '#7E776A']));
    c.drawPath(blob([[28, 62], [50, 54], [72, 62], [50, 70]]), rad(50, 60, 24, ['#F6EEF2', '#E3D3DC']));
    ball(c, 50, 58, 9, '#F6F0F4', 0.6);
    shine(c, 47, 55, 2.5, 2, 0.9);
    c.drawPath(blob([[26, 54], [34, 28], [66, 28], [74, 54], [50, 48]]), lin(0, 28, 0, 54, ['#C9C3B7', '#8E877A']));
  },
  (c) => {
    shadow(c, 50, 84, 30);
    c.drawPath(curve([[18, 26], [24, 60], [50, 72], [76, 60], [82, 26]]), line('#B8835A', 1.6));
    const pts: Pt[] = [[24, 46], [32, 58], [42, 66], [58, 66], [68, 58], [76, 46]];
    pts.forEach(([x, y], i) => (i % 2 ? ball(c, x, y, 3.4, '#F6F0F4', 0.5) : scallop(c, x, y, 6, i % 4 ? '#F2C9B8' : '#F6E0C8')));
    scallop(c, 50, 76, 10, '#F7B7CC');
  },
  (c) => {
    shadow(c, 50, 90, 24);
    c.drawPath(blob([[32, 90], [68, 90], [64, 82], [36, 82]]), fill('#B7B0A3'));
    const br = (pts: Pt[], w: number) => c.drawPath(curve(pts), line('#F26A5A', w));
    br([[50, 84], [48, 60], [50, 36], [54, 18]], 7);
    br([[49, 64], [36, 50], [30, 32]], 5);
    br([[50, 54], [64, 42], [68, 26]], 5);
    br([[36, 48], [26, 42], [22, 30]], 3.5);
    br([[62, 44], [74, 46], [80, 34]], 3.5);
    for (const [x, y] of [[54, 18], [30, 32], [68, 26], [22, 30], [80, 34]] as const) c.drawCircle(x, y, 3, fill('#FF9A8A'));
  },
  (c) => {
    shadow(c, 50, 90, 36);
    const lid = Skia.PathBuilder.Make();
    lid.moveTo(16, 50);
    lid.cubicTo(16, 24, 84, 24, 84, 50);
    lid.close();
    body(c, lid.detach(), '#5A9AA8', 28, 50);
    c.drawRect(Skia.XYWHRect(16, 50, 68, 36), lin(0, 50, 0, 86, ['#5A9AA8', '#2E6E7E']));
    c.drawRect(Skia.XYWHRect(16, 50, 68, 36), line('#1E4E5A', 1.6, 0.6));
    for (const x of [24, 76]) c.drawRect(Skia.XYWHRect(x - 3, 36, 6, 50), fill('#E9C46A'));
    c.drawRect(Skia.XYWHRect(44, 48, 12, 14), fill('#E9C46A'));
    c.drawCircle(50, 55, 2, fill('#5A3A1E'));
    scallop(c, 36, 74, 6);
    scallop(c, 64, 74, 6, '#F7B7CC');
  },
  (c) => {
    glow(c, 50, 54, 46, '#BFF2EE', 0.55);
    shadow(c, 50, 88, 32);
    const p = blob([[18, 64], [24, 40], [44, 26], [72, 26], [84, 44], [74, 68], [50, 80], [30, 78]]);
    body(c, p, '#F6D9C8', 24, 80);
    c.drawPath(curve([[30, 70], [44, 50], [62, 40], [80, 36]]), line('#D99A80', 2.4));
    c.drawPath(curve([[34, 60], [48, 44], [66, 34]]), line('#D99A80', 1.6, 0.6));
    c.drawPath(blob([[60, 52], [76, 46], [80, 58], [66, 64]]), rad(70, 54, 12, ['#FFE3EA', '#F2A8B8']));
    sparkle(c, 22, 30, 5, '#DFFBF8');
    sparkle(c, 82, 72, 3.5, '#DFFBF8');
  },
];

// ---------------------------------------------------------------------------------------------
// Crystals
// ---------------------------------------------------------------------------------------------

function gem(c: SkCanvas, x: number, base: number, w: number, h: number, hex: string, tilt = 0) {
  c.save();
  c.rotate(tilt, x, base);
  const top = base - h;
  const left = poly([[x - w / 2, base], [x - w / 2, top + w * 0.6], [x, top], [x, base]]);
  const right = poly([[x, base], [x, top], [x + w / 2, top + w * 0.6], [x + w / 2, base]]);
  c.drawPath(left, lin(x - w / 2, 0, x, 0, [shade(hex, 0.45), shade(hex, 0.1)]));
  c.drawPath(right, lin(x, 0, x + w / 2, 0, [shade(hex, -0.05), shade(hex, -0.35)]));
  c.drawPath(poly([[x - w / 2, base], [x - w / 2, top + w * 0.6], [x, top], [x + w / 2, top + w * 0.6], [x + w / 2, base]]), line(shade(hex, -0.5), 1.2, 0.55));
  c.drawLine(x - w * 0.25, base - 4, x - w * 0.25, top + w * 0.8, line('#FFFFFF', 1.2, 0.55));
  c.restore();
}

const crystal: Drawer[] = [
  (c) => {
    shadow(c, 50, 74, 14);
    gem(c, 50, 74, 14, 34, '#8FD3E8', 10);
  },
  (c) => {
    shadow(c, 50, 80, 24);
    gem(c, 40, 80, 12, 30, '#E8F6FA', -18);
    gem(c, 60, 80, 12, 28, '#E8F6FA', 16);
    gem(c, 50, 80, 16, 44, '#F6FCFE');
  },
  (c) => {
    shadow(c, 50, 84, 28);
    c.drawPath(blob([[24, 84], [30, 70], [70, 70], [76, 84]]), lin(0, 70, 0, 84, ['#9AA3A8', '#6E767A']));
    gem(c, 36, 78, 13, 30, '#B98AE0', -22);
    gem(c, 64, 78, 13, 32, '#B98AE0', 20);
    gem(c, 50, 78, 17, 48, '#A06ED0');
    glow(c, 50, 50, 18, '#E8D0FF', 0.4);
  },
  (c) => {
    shadow(c, 50, 88, 34);
    c.drawPath(blob([[18, 88], [24, 72], [76, 72], [82, 88]]), lin(0, 72, 0, 88, ['#9AA3A8', '#6E767A']));
    gem(c, 28, 82, 12, 28, '#8FD3E8', -30);
    gem(c, 72, 82, 12, 30, '#F2A8D0', 28);
    gem(c, 40, 82, 14, 40, '#B98AE0', -12);
    gem(c, 60, 82, 14, 44, '#8FD3E8', 12);
    gem(c, 50, 82, 16, 56, '#E8F6FA');
    sparkle(c, 50, 30, 4);
  },
  (c) => {
    shadow(c, 50, 84, 30);
    const p = poly([[50, 18], [80, 76], [20, 76]]);
    c.drawPath(p, lin(20, 18, 80, 76, ['#FFFFFF', '#D6F0F8', '#9AD0E3']));
    c.drawPath(poly([[50, 18], [62, 76], [80, 76]]), fill('#7EB8CC', 0.45));
    c.drawPath(p, line('#5E98AC', 1.6));
    const cols = ['#E8644A', '#F2B544', '#F6E05A', '#6FAE52', '#5FA8D3', '#9A6ED0'];
    cols.forEach((col, i) => c.drawPath(poly([[64, 52], [96, 40 + i * 6], [96, 46 + i * 6]]), fill(col, 0.8)));
    c.drawLine(4, 58, 40, 52, line('#FFFFFF', 3, 0.8));
  },
  (c) => {
    shadow(c, 50, 86, 26);
    c.drawLine(50, 74, 50, 86, line('#8E5A2E', 4));
    c.drawCircle(50, 48, 26, line('#C9923E', 7));
    c.drawCircle(50, 48, 22, rad(42, 40, 30, ['#FFFFFF', '#D6F0F8', '#8FC8DC'], [0, 0.5, 1], [0.9, 0.7, 0.8]));
    c.drawCircle(50, 48, 26, line('#8E5A2E', 1.4, 0.6));
    shine(c, 41, 40, 5, 8, 0.8);
    glow(c, 56, 54, 14, '#FFF6D0', 0.5);
  },
  (c) => {
    shadow(c, 50, 90, 26);
    c.drawPath(poly([[34, 90], [66, 90], [58, 72], [42, 72]]), lin(0, 72, 0, 90, ['#C9923E', '#8E5A2E']));
    glow(c, 50, 46, 36, '#C8E8FF', 0.5);
    c.drawCircle(50, 46, 26, rad(40, 36, 40, ['#FFFFFF', '#C8E8FF', '#6E9ED0'], [0, 0.45, 1], [0.95, 0.75, 0.9]));
    c.drawPath(curve([[34, 52], [44, 40], [58, 48], [66, 38]]), line('#FFFFFF', 2, 0.5));
    for (const [x, y] of [[44, 46], [56, 40], [52, 56]] as const) sparkle(c, x, y, 3);
    shine(c, 40, 34, 6, 4, 0.8);
  },
  (c) => {
    glow(c, 50, 50, 44, '#FFF6D0', 0.55);
    shadow(c, 50, 86, 24);
    const p = star5(50, 50, 32, 0.48);
    c.drawPath(p, rad(44, 42, 40, ['#FFFFFF', '#FFE9A8', '#F2B544']));
    c.drawPath(star5(50, 50, 18, 0.48), fill('#FFF6D0', 0.8));
    c.drawPath(p, line('#C8862E', 1.6, 0.7));
    sparkle(c, 50, 50, 6, '#FFFFFF');
  },
  (c) => {
    shadow(c, 50, 86, 36);
    const outer = blob([[14, 66], [20, 36], [44, 22], [70, 26], [86, 48], [80, 74], [52, 84], [26, 80]]);
    body(c, outer, '#8E8478', 22, 84);
    const inner = blob([[24, 62], [28, 42], [46, 32], [66, 34], [76, 50], [70, 68], [50, 74], [32, 72]]);
    c.drawPath(inner, fill('#3E3248'));
    c.save();
    c.clipPath(inner, 1, true);
    const cols = ['#E8644A', '#F2B544', '#6FAE52', '#5FA8D3', '#9A6ED0', '#F2A8D0'];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      gem(c, 50 + Math.cos(a) * 18, 53 + Math.sin(a) * 14, 8, 16, cols[i % cols.length], (a * 180) / Math.PI + 90);
    }
    c.restore();
    glow(c, 50, 53, 20, '#FFFFFF', 0.45);
    sparkle(c, 50, 53, 5, '#FFFFFF');
  },
];

// ---------------------------------------------------------------------------------------------
// Old memories
// ---------------------------------------------------------------------------------------------

const LILAC = '#B9A3E3';
const PAPER = '#F6EEDC';

function envelope(c: SkCanvas, x: number, y: number, w: number, h: number, seal = '#C8323C') {
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), 3, 3), lin(0, y, 0, y + h, [shade(PAPER, 0.2), shade(PAPER, -0.12)]));
  c.drawPath(poly([[x, y], [x + w / 2, y + h * 0.55], [x + w, y]], false), line('#C9B996', 1.6));
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), 3, 3), line('#B9A57E', 1.2, 0.7));
  ball(c, x + w / 2, y + h * 0.55, h * 0.16, seal, 0.6);
}

const memory: Drawer[] = [
  (c) => {
    shadow(c, 50, 74, 14, 4, 0.12);
    glow(c, 50, 50, 26, '#9A7AD8', 0.35);
    ball(c, 50, 50, 10, '#B9A3E3', 0);
    c.drawCircle(50, 50, 10, line('#7E5AB8', 1.2, 0.6));
    shine(c, 46, 46, 3, 2.4, 0.8);
    for (const [x, y, r] of [[34, 62, 4.5], [66, 36, 5], [64, 64, 3.5], [36, 36, 3]] as const) sparkle(c, x, y, r, '#8E6ED0');
  },
  (c) => {
    shadow(c, 50, 78, 30);
    c.save();
    c.rotate(-8, 50, 56);
    envelope(c, 20, 36, 60, 40);
    c.restore();
  },
  (c) => {
    shadow(c, 50, 84, 28);
    c.save();
    c.rotate(6, 50, 52);
    c.drawRect(Skia.XYWHRect(24, 20, 52, 62), fill('#FBF7EE'));
    c.drawRect(Skia.XYWHRect(24, 20, 52, 62), line('#D9CDB4', 1.2));
    c.drawRect(Skia.XYWHRect(29, 25, 42, 40), lin(0, 25, 0, 65, ['#C9B8A0', '#A8957A']));
    c.save();
    c.clipRect(Skia.XYWHRect(29, 25, 42, 40), 1, true);
    c.drawPath(blob([[20, 60], [40, 46], [60, 54], [80, 44], [80, 70], [20, 70]]), fill('#8E7E66'));
    c.drawPath(poly([[40, 56], [40, 44], [48, 38], [56, 44], [56, 56]]), fill('#6E5E48'));
    c.drawCircle(62, 34, 4, fill('#E3D3B8'));
    c.restore();
    c.restore();
  },
  (c) => {
    shadow(c, 50, 88, 34);
    isoBox(c, 50, 44, 64, 24, 26, '#9A5A3E');
    c.drawPath(poly([[18, 56], [50, 44], [50, 30], [18, 42]]), lin(0, 30, 0, 56, ['#C98E6A', '#9A5A3E']));
    c.drawPath(poly([[18, 42], [50, 30], [50, 34], [18, 46]]), fill('#E9C46A'));
    c.drawCircle(50, 66, 3, fill('#E9C46A'));
    c.drawLine(82, 58, 90, 54, line('#C9923E', 2.4));
    c.drawCircle(90, 54, 2.6, fill('#C9923E'));
    for (const [x, y] of [[30, 24], [40, 18], [36, 12]] as const) {
      c.drawCircle(x, y, 2, fill('#5A3A6E'));
      c.drawLine(x + 2, y, x + 2, y - 7, line('#5A3A6E', 1.2));
    }
  },
  (c) => {
    shadow(c, 50, 86, 30);
    c.save();
    c.rotate(-6, 50, 56);
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(22, 26, 56, 60), 4, 4), lin(0, 26, 0, 86, ['#7E5AA8', '#5A3A88']));
    c.drawRect(Skia.XYWHRect(74, 28, 6, 56), fill(PAPER));
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(32, 38, 36, 22), 3, 3), line('#E9C46A', 1.6));
    blossom(c, 50, 49, 6, 5, '#E9C46A', '#C8323C');
    c.drawPath(poly([[60, 26], [66, 26], [66, 96], [63, 92], [60, 96]]), fill('#C8323C'));
    c.restore();
  },
  (c) => {
    shadow(c, 50, 88, 36);
    for (const [dy, col] of [[8, '#5A6E3E'], [4, '#7A8E52'], [0, '#8E5A2E']] as const) {
      c.drawRRect(Skia.RRectXY(Skia.XYWHRect(16, 30 + dy, 68, 50), 4, 4), lin(0, 30, 0, 80, [shade(col, 0.2), shade(col, -0.2)]));
    }
    c.drawRect(Skia.XYWHRect(20, 82, 60, 6), fill(PAPER));
    c.drawRect(Skia.XYWHRect(30, 40, 40, 28), fill('#FBF7EE'));
    c.drawRect(Skia.XYWHRect(33, 43, 34, 22), lin(0, 43, 0, 65, ['#A8C8E3', '#8FBF6A']));
    for (const x of [40, 50, 60]) c.drawCircle(x, 58, 3, fill('#5A3A2E'));
    c.drawRect(Skia.XYWHRect(16, 30, 6, 50), fill('#6E4426'));
  },
  (c) => {
    shadow(c, 50, 86, 36);
    c.drawRect(Skia.XYWHRect(24, 34, 52, 44), lin(0, 34, 0, 78, ['#F6E9C8', '#E6D3A8']));
    c.save();
    c.clipRect(Skia.XYWHRect(24, 34, 52, 44), 1, true);
    c.drawPath(curve([[24, 60], [40, 50], [56, 62], [76, 52]]), line('#7EC8E3', 3));
    for (const [x, y] of [[34, 44], [48, 46], [62, 42], [40, 68], [66, 66]] as const) c.drawPath(poly([[x, y - 4], [x + 4, y + 3], [x - 4, y + 3]]), fill('#6FAE52'));
    c.drawPath(curve([[30, 72], [44, 62], [60, 70], [70, 56]]), line('#C8323C', 1.6, 0.8));
    c.drawCircle(70, 56, 3, line('#C8323C', 1.6));
    c.restore();
    cylinder(c, 22, 30, 5, 52, '#E6D3A8', '#F6E9C8');
    cylinder(c, 78, 30, 5, 52, '#E6D3A8', '#F6E9C8');
  },
  (c) => {
    glow(c, 50, 54, 46, '#FFE6B0', 0.6);
    shadow(c, 50, 84, 30);
    envelope(c, 20, 34, 60, 40, '#E9A83E');
    c.drawPath(curve([[30, 28], [50, 18], [70, 28]]), line(LILAC, 2, 0.8));
    c.save();
    c.translate(50, 56);
    c.scale(0.22, 0.22);
    c.translate(-50, -50);
    lanternBody(c, 50, 20, 40, 70, '#8E5A2E', '#FFC95A');
    c.restore();
    sparkle(c, 24, 24, 4.5);
    sparkle(c, 80, 30, 3.5);
    sparkle(c, 74, 80, 3);
  },
];

/** Compact illustrated crop chains: seed, sprout, leafy plant, mature harvest. */
const DRAWERS: Partial<Record<FamilyId, Drawer[]>> = { flower, wood, stone, fruit, lantern, grain, honey, fabric, ceramic, shell, crystal, memory, ...CROP_DRAWERS };

export function hasDrawer(key: ItemKey): boolean {
  const { f, l } = parseItem(key);
  return !!DRAWERS[f]?.[l - 1];
}

/** Draws an item into a 100×100 box at the canvas origin. */
export function drawItem(c: SkCanvas, key: ItemKey): void {
  const { f, l } = parseItem(key);
  const d = DRAWERS[f]?.[l - 1];
  if (d) d(c);
}

export { candle, lanternBody, apple, ear, sack, comb, bee, yarnBall, vase, scallop, gem, plank, logEnd, berry, plum, envelope, pot, stem, bowl };
