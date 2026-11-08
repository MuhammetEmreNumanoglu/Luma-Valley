// UI icons in the same painted style (100×100 box). Baked to PNG by scripts/gen-sprites.ts.
import { Skia, type SkCanvas } from '@shopify/react-native-skia';

import { comb } from './items';
import { ball, blob, blossom, body, curve, fill, glow, hexagon, isoBox, leaf, lin, line, poly, rad, shade, shadow, shine, sparkle, star5 } from './kit';

export type IconId =
  | 'leaf'
  | 'token'
  | 'energy'
  | 'star'
  | 'map'
  | 'board'
  | 'quests'
  | 'journal'
  | 'shop'
  | 'settings'
  | 'puzzle'
  | 'lock'
  | 'hint'
  | 'undo'
  | 'reset'
  | 'bag'
  | 'check'
  | 'gift'
  | 'calendar'
  | 'trophy'
  | 'upgrade';

const ICONS: Record<IconId, (c: SkCanvas) => void> = {
  leaf: (c) => {
    leaf(c, 18, 78, 76, 26, -0.75, '#7DBE5C');
    c.drawPath(curve([[14, 86], [20, 80], [26, 74]]), line('#4E8A3C', 5));
  },
  token: (c) => {
    glow(c, 50, 50, 50, '#FFD27A', 0.5);
    ball(c, 50, 50, 36, '#F2B544', 2.4);
    c.drawCircle(50, 50, 27, line('#C8862E', 3, 0.8));
    const p = blob([[50, 26], [60, 44], [56, 62], [50, 70], [44, 62], [40, 44]], 0.9);
    c.drawPath(p, lin(0, 26, 0, 70, ['#FFFFFF', '#FFE9A8']));
    shine(c, 36, 34, 8, 5, 0.6);
  },
  energy: (c) => {
    glow(c, 50, 50, 46, '#9FE6E0', 0.45);
    const p = poly([[58, 6], [24, 56], [48, 56], [40, 94], [78, 40], [54, 40], [64, 6]]);
    c.drawPath(p, lin(0, 6, 0, 94, ['#E6FFFB', '#5FD3C8', '#2E9E98']));
    c.drawPath(p, line('#1E6E6A', 3, 0.7));
  },
  star: (c) => {
    const p = star5(50, 54, 44, 0.5);
    c.drawPath(p, rad(40, 40, 52, ['#FFF6D0', '#F2B544', '#D9862E']));
    c.drawPath(p, line('#B8641A', 3, 0.7));
  },
  map: (c) => {
    shadow(c, 50, 88, 40);
    const p = poly([[12, 24], [36, 16], [64, 24], [88, 16], [88, 78], [64, 86], [36, 78], [12, 86]]);
    c.drawPath(p, lin(0, 16, 0, 86, ['#F6E9C8', '#E3CF9E']));
    c.drawPath(poly([[36, 16], [64, 24], [64, 86], [36, 78]]), fill('#D6C08E', 0.6));
    c.drawPath(p, line('#9E8458', 3));
    c.drawPath(curve([[20, 70], [32, 50], [50, 56], [66, 40], [78, 30]]), line('#C8323C', 3.4));
    c.drawCircle(78, 30, 5, fill('#C8323C'));
    c.drawPath(blob([[18, 34], [30, 28], [32, 40], [22, 44]]), fill('#7DBE5C'));
  },
  board: (c) => {
    shadow(c, 50, 90, 40);
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(12, 16, 76, 72), 12, 12), lin(0, 16, 0, 88, ['#E6D3A8', '#C9AE7A']));
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) c.drawRRect(Skia.RRectXY(Skia.XYWHRect(18 + x * 22, 22 + y * 21, 19, 18), 5, 5), fill('#FFF6E2', 0.8));
    blossom(c, 50, 52, 9, 5, '#EE8FB0', '#F6C443');
    leaf(c, 24, 36, 12, 4, -0.5, '#6FAE52', false);
    ball(c, 72, 74, 6, '#E8644A', 1);
  },
  quests: (c) => {
    shadow(c, 50, 90, 34);
    c.drawRect(Skia.XYWHRect(22, 18, 56, 66), lin(0, 18, 0, 84, ['#FBF2DC', '#EAD7AE']));
    for (const y of [14, 84]) {
      c.drawRRect(Skia.RRectXY(Skia.XYWHRect(16, y - 6, 68, 12), 6, 6), lin(0, y - 6, 0, y + 6, ['#D9A86E', '#9A6438']));
    }
    for (const y of [32, 44, 56, 68]) c.drawLine(30, y, y === 68 ? 56 : 70, y, line('#9E8458', 3, 0.6));
    c.drawPath(poly([[60, 60], [66, 68], [80, 50]], false), line('#4E8A3C', 5));
  },
  journal: (c) => {
    shadow(c, 50, 90, 36);
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(16, 14, 64, 74), 6, 6), lin(0, 14, 0, 88, ['#8E6ED0', '#5A3A88']));
    c.drawRect(Skia.XYWHRect(76, 18, 8, 66), fill('#F6EEDC'));
    c.drawRect(Skia.XYWHRect(16, 14, 10, 74), fill('#4A2E70'));
    c.drawCircle(52, 46, 14, line('#E9C46A', 3));
    c.drawPath(star5(52, 46, 8), fill('#E9C46A'));
    c.drawPath(poly([[62, 14], [70, 14], [70, 96], [66, 90], [62, 96]]), fill('#C8323C'));
  },
  shop: (c) => {
    shadow(c, 50, 92, 40);
    c.drawRect(Skia.XYWHRect(18, 46, 64, 42), lin(0, 46, 0, 88, ['#D9A86E', '#9A6438']));
    c.drawRect(Skia.XYWHRect(30, 58, 40, 30), fill('#6E4426'));
    for (let i = 0; i < 5; i++) {
      const x = 12 + i * 15.2;
      c.drawPath(blob([[x, 28], [x + 15, 28], [x + 15, 44], [x + 7.5, 50], [x, 44]], 0.6), fill(i % 2 ? '#F6EEDC' : '#E8644A'));
    }
    c.drawRect(Skia.XYWHRect(12, 22, 76, 8), fill('#B8323C'));
    ball(c, 42, 72, 6, '#F2B544', 1);
    ball(c, 58, 74, 5, '#7DBE5C', 1);
  },
  settings: (c) => {
    const teeth: [number, number][] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = i % 2 ? 34 : 42;
      teeth.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r]);
    }
    const p = poly(teeth);
    body(c, p, '#A7AFB4', 8, 92, { rim: 2.4 });
    c.drawCircle(50, 50, 14, fill('#5E676C'));
    c.drawCircle(50, 50, 14, line('#3E4448', 2));
    shine(c, 36, 34, 8, 5, 0.4);
  },
  puzzle: (c) => {
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(10, 10, 80, 80), 14, 14), lin(0, 10, 0, 90, ['#3E4E7A', '#2A3458']));
    glow(c, 50, 50, 40, '#FFD27A', 0.4);
    c.drawPath(poly([[22, 50], [50, 50], [50, 26], [78, 26]], false), line('#FFE08A', 8));
    c.drawPath(poly([[50, 50], [50, 74], [78, 74]], false), line('#9FE6E0', 8));
    ball(c, 22, 50, 9, '#FFE08A', 0);
    ball(c, 78, 26, 7, '#F2B544', 1);
    ball(c, 78, 74, 7, '#5FD3C8', 1);
  },
  lock: (c) => {
    shadow(c, 50, 90, 26);
    c.drawPath(curve([[32, 46], [32, 18], [68, 18], [68, 46]]), line('#8E979E', 9));
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(22, 42, 56, 44), 10, 10), lin(0, 42, 0, 86, ['#F2C46E', '#C8862E']));
    c.drawCircle(50, 60, 6, fill('#5A3A1E'));
    c.drawRect(Skia.XYWHRect(47, 62, 6, 12), fill('#5A3A1E'));
  },
  hint: (c) => {
    glow(c, 50, 42, 46, '#FFE08A', 0.6);
    ball(c, 50, 40, 26, '#FFE9A8', 2);
    c.drawPath(curve([[42, 50], [46, 40], [50, 48], [54, 40], [58, 50]]), line('#C8862E', 2.6));
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(38, 64, 24, 18), 5, 5), lin(0, 64, 0, 82, ['#B7BEC4', '#7E8A90']));
    c.drawLine(38, 70, 62, 70, line('#5E676C', 2));
    c.drawLine(38, 76, 62, 76, line('#5E676C', 2));
  },
  undo: (c) => {
    c.drawPath(curve([[30, 40], [54, 30], [76, 44], [74, 66], [52, 76]]), line('#5E86A8', 11));
    c.drawPath(poly([[14, 40], [38, 22], [40, 56]]), fill('#5E86A8'));
  },
  reset: (c) => {
    c.drawArc(Skia.XYWHRect(20, 20, 60, 60), -60, 300, false, line('#C8862E', 10));
    c.drawPath(poly([[60, 8], [84, 26], [58, 36]]), fill('#C8862E'));
  },
  bag: (c) => {
    shadow(c, 50, 90, 32);
    c.drawPath(curve([[36, 34], [38, 12], [62, 12], [64, 34]]), line('#8E5A2E', 6));
    const p = blob([[22, 36], [78, 36], [84, 70], [76, 88], [24, 88], [16, 70]], 0.8);
    body(c, p, '#C98E4E', 36, 88);
    c.drawRect(Skia.XYWHRect(22, 44, 56, 8), fill('#8E5A2E', 0.6));
    ball(c, 50, 48, 5, '#F2B544', 1);
  },
  check: (c) => {
    ball(c, 50, 50, 40, '#6FAE52', 2);
    c.drawPath(poly([[30, 52], [44, 66], [72, 36]], false), line('#FFFFFF', 10));
  },
  gift: (c) => {
    shadow(c, 50, 90, 34);
    isoBox(c, 50, 40, 64, 22, 34, '#E8644A');
    c.drawLine(50, 40, 50, 96, line('#F2B544', 7));
    c.drawLine(18, 51, 50, 62, line('#F2B544', 5));
    c.drawPath(blob([[50, 40], [34, 22], [44, 18], [50, 32], [56, 18], [66, 22]]), fill('#F2B544'));
  },
  calendar: (c) => {
    shadow(c, 50, 90, 34);
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(16, 20, 68, 66), 10, 10), fill('#FBF2DC'));
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(16, 20, 68, 20), 10, 10), fill('#E8644A'));
    c.drawRect(Skia.XYWHRect(16, 32, 68, 8), fill('#E8644A'));
    for (const x of [32, 68]) c.drawRRect(Skia.RRectXY(Skia.XYWHRect(x - 3, 12, 6, 16), 3, 3), fill('#5E676C'));
    for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) c.drawRRect(Skia.RRectXY(Skia.XYWHRect(23 + x * 14, 46 + y * 12, 10, 8), 2, 2), fill(x === 2 && y === 1 ? '#F2B544' : '#E6D3A8'));
  },
  trophy: (c) => {
    shadow(c, 50, 92, 28);
    c.drawPath(curve([[28, 26], [12, 30], [18, 48], [34, 52]]), line('#C8862E', 5));
    c.drawPath(curve([[72, 26], [88, 30], [82, 48], [66, 52]]), line('#C8862E', 5));
    const cup = blob([[26, 18], [74, 18], [70, 48], [50, 62], [30, 48]], 0.8);
    body(c, cup, '#F2B544', 18, 62);
    c.drawRect(Skia.XYWHRect(45, 60, 10, 16), fill('#C8862E'));
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(30, 76, 40, 12), 3, 3), lin(0, 76, 0, 88, ['#9A6438', '#6E4426']));
    sparkle(c, 40, 32, 5, '#FFFFFF');
  },
  upgrade: (c) => {
    ball(c, 50, 50, 40, '#5FA8D3', 2);
    c.drawPath(poly([[50, 22], [74, 50], [58, 50], [58, 76], [42, 76], [42, 50], [26, 50]]), fill('#FFFFFF'));
  },
};

export const ICON_IDS = Object.keys(ICONS) as IconId[];

export function drawIcon(c: SkCanvas, id: IconId): void {
  ICONS[id]?.(c);
}

void comb;
void hexagon;
void shade;
