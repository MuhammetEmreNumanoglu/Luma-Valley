// Producers as little buildings on the board (100×100 box).
import { Skia, type SkCanvas } from '@shopify/react-native-skia';

import type { ProducerId } from '../content/producers';
import { apple, comb, ear, gem, lanternBody, logEnd, scallop } from './items';
import { ball, blob, blossom, body, curve, cylinder, fill, flame, glow, isoBox, leaf, lin, line, poly, rad, shade, shadow, shine } from './kit';

const GREEN = '#6FAE52';

function roof(c: SkCanvas, l: number, r: number, base: number, peak: number, hex: string) {
  const p = poly([[l, base], [(l + r) / 2, peak], [r, base]]);
  body(c, p, hex, peak, base);
  for (let y = peak + 8; y < base; y += 6) {
    const k = (y - peak) / (base - peak);
    c.drawLine((l + r) / 2 - ((r - l) / 2) * k, y, (l + r) / 2 + ((r - l) / 2) * k, y, line(shade(hex, -0.3), 1, 0.5));
  }
}

const DRAW: Record<ProducerId, (c: SkCanvas) => void> = {
  merchant: (c) => {
    shadow(c, 50, 92, 38);
    c.drawPath(poly([[12, 42], [50, 20], [88, 42]]), lin(0, 20, 0, 42, ['#E88C5B', '#B9503E']));
    c.drawRect(Skia.XYWHRect(17, 42, 66, 42), fill('#F6EEDC'));
    for (const [x, col] of [[22, '#E88C5B'], [38, '#FFF5D6'], [54, '#E88C5B'], [70, '#FFF5D6']] as const) c.drawRect(Skia.XYWHRect(x, 42, 8, 42), fill(col));
    c.drawCircle(50, 58, 12, fill('#F0B584'));
    c.drawPath(blob([[38, 55], [40, 42], [50, 38], [62, 45], [62, 55]]), fill('#5B3D2E'));
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(38, 68, 24, 16), 5, 5), fill('#5E8A6E'));
    c.drawCircle(76, 30, 12, fill('#FFF4BF'));
    c.drawCircle(76, 30, 9, line('#B57C1C', 2));
  },
  greenhouse: (c) => {
    shadow(c, 50, 90, 40);
    const glass = poly([[14, 50], [50, 20], [86, 50], [86, 88], [14, 88]]);
    c.drawPath(glass, lin(0, 20, 0, 88, ['#E6F6FA', '#B9E0EA']));
    c.save();
    c.clipPath(glass, 1, true);
    for (const [x, col] of [[26, '#EE8FB0'], [42, '#F6C443'], [58, '#B9A3E3'], [74, '#EE8FB0']] as const) {
      leaf(c, x, 86, 14, 4, -2.2, GREEN, false);
      leaf(c, x, 86, 14, 4, -0.9, GREEN, false);
      blossom(c, x, 70, 6, 5, col, '#F6C443');
    }
    c.restore();
    c.drawPath(glass, line('#5E8A6E', 2.4));
    for (const x of [32, 50, 68]) c.drawLine(x, x === 50 ? 20 : 20 + Math.abs(50 - x) * 0.83, x, 88, line('#5E8A6E', 1.6));
    c.drawLine(14, 64, 86, 64, line('#5E8A6E', 1.4));
    shine(c, 30, 46, 4, 10, 0.5);
  },
  workbench: (c) => {
    shadow(c, 50, 90, 40);
    for (const x of [20, 76]) c.drawRect(Skia.XYWHRect(x, 56, 6, 32), lin(x, 0, x + 6, 0, ['#B07A4A', '#7A5232']));
    isoBox(c, 50, 40, 80, 22, 8, '#D9A86E');
    logEnd(c, 30, 40, 8, 5);
    c.drawPath(poly([[50, 34], [72, 26], [74, 30], [52, 38]]), lin(0, 26, 0, 38, ['#E6E6E6', '#9AA3A8']));
    c.drawRect(Skia.XYWHRect(70, 22, 12, 6), fill('#7A5232'));
    for (let i = 0; i < 5; i++) c.drawCircle(30 + i * 7, 76, 1.6, fill('#D9A86E'));
  },
  quarry: (c) => {
    shadow(c, 50, 90, 42);
    c.drawPath(blob([[10, 88], [16, 60], [34, 40], [56, 34], [80, 46], [90, 88]]), lin(0, 34, 0, 88, ['#C9C3B7', '#8E877A']));
    c.drawPath(poly([[34, 58], [50, 50], [62, 60], [56, 76], [38, 74]]), lin(0, 50, 0, 76, ['#D6D0C4', '#A39C8E']));
    c.drawLine(36, 60, 54, 70, line('#7E776A', 1.4));
    c.save();
    c.rotate(-30, 70, 40);
    c.drawRect(Skia.XYWHRect(68, 24, 4, 36), fill('#8E5A2E'));
    c.drawPath(curve([[58, 26], [70, 20], [82, 26]]), line('#7E8A90', 4));
    c.restore();
    c.drawPath(blob([[16, 84], [26, 78], [30, 86]]), fill(GREEN));
  },
  orchard: (c) => {
    shadow(c, 50, 92, 30);
    c.drawPath(poly([[44, 92], [46, 54], [54, 54], [56, 92]]), lin(44, 0, 56, 0, ['#9A6438', '#6E4426']));
    c.drawPath(blob([[14, 50], [24, 24], [50, 10], [76, 24], [86, 50], [64, 64], [36, 64]]), rad(40, 26, 56, ['#9BD47A', GREEN, '#3E7A2E'], [0, 0.5, 1]));
    for (const [x, y] of [[30, 40], [50, 26], [68, 42], [44, 52], [60, 54]] as const) apple(c, x, y, 5.5);
  },
  lanternStone: (c) => {
    shadow(c, 50, 92, 36);
    c.drawPath(blob([[16, 92], [20, 70], [50, 62], [80, 70], [84, 92]]), lin(0, 62, 0, 92, ['#B7B0A3', '#7E776A']));
    c.drawPath(blob([[24, 74], [36, 70], [34, 80]]), fill(GREEN, 0.9));
    c.save();
    c.translate(50, 40);
    c.scale(0.62, 0.62);
    c.translate(-50, -50);
    lanternBody(c, 50, 14, 46, 76, '#8E5A2E', '#FFC95A');
    c.restore();
  },
  field: (c) => {
    shadow(c, 50, 90, 42);
    c.drawPath(poly([[8, 88], [24, 60], [76, 60], [92, 88]]), lin(0, 60, 0, 88, ['#9A6A44', '#6E4A30']));
    for (let row = 0; row < 3; row++) for (let i = 0; i < 5; i++) {
      const x = 22 + i * 14 + row * 2;
      ear(c, x, 66 + row * 9, 26, (i - 2) * 0.06);
    }
  },
  beehive: (c) => {
    shadow(c, 50, 92, 32);
    c.drawRect(Skia.XYWHRect(30, 80, 6, 12), fill('#7A5232'));
    c.drawRect(Skia.XYWHRect(64, 80, 6, 12), fill('#7A5232'));
    isoBox(c, 50, 50, 50, 18, 26, '#F2D27A');
    isoBox(c, 50, 30, 54, 20, 8, '#D9A86E');
    c.drawRect(Skia.XYWHRect(42, 80, 16, 4), fill('#5A3A1E'));
    comb(c, 66, 60, 4, 1, 2);
    for (const [x, y] of [[20, 30], [80, 22], [74, 44]] as const) {
      c.drawOval(Skia.XYWHRect(x - 3, y - 2, 6, 4), fill('#F2C14E'));
      c.drawLine(x, y - 2, x, y + 2, line('#3E2A1E', 1.4));
    }
  },
  loom: (c) => {
    shadow(c, 50, 92, 38);
    for (const x of [18, 78]) c.drawRect(Skia.XYWHRect(x, 20, 6, 70), lin(x, 0, x + 6, 0, ['#B07A4A', '#7A5232']));
    c.drawRect(Skia.XYWHRect(18, 20, 66, 6), fill('#9A6438'));
    c.drawRect(Skia.XYWHRect(18, 60, 66, 5), fill('#9A6438'));
    c.drawRect(Skia.XYWHRect(26, 26, 50, 34), lin(0, 26, 0, 60, ['#E8A06E', '#B8323C']));
    for (let x = 28; x < 76; x += 4) c.drawLine(x, 26, x, 60, line('#F6EEDC', 0.8, 0.6));
    for (const [y, col] of [[34, '#F2B544'], [44, '#2E5E88'], [52, '#F2B544']] as const) c.drawLine(26, y, 76, y, line(col, 3));
    cylinder(c, 50, 70, 8, 14, '#7FA7C9');
  },
  tidepool: (c) => {
    shadow(c, 50, 88, 42);
    c.drawPath(blob([[10, 70], [20, 50], [50, 42], [80, 50], [90, 70], [64, 86], [36, 86]]), lin(0, 42, 0, 86, ['#C9C3B7', '#8E877A']));
    c.drawPath(blob([[20, 68], [30, 54], [50, 50], [72, 56], [80, 68], [56, 78], [34, 78]]), rad(46, 60, 36, ['#BFF2EE', '#5FB3D3', '#2E6E86'], [0, 0.5, 1]));
    shine(c, 40, 58, 10, 3, 0.6);
    scallop(c, 70, 50, 6);
    scallop(c, 24, 56, 5, '#F7B7CC');
  },
  geode: (c) => {
    shadow(c, 50, 92, 42);
    c.drawPath(blob([[8, 92], [14, 50], [40, 24], [70, 26], [92, 56], [92, 92]]), lin(0, 24, 0, 92, ['#8E8478', '#5A5248']));
    const mouth = blob([[28, 92], [30, 64], [50, 50], [70, 64], [72, 92]]);
    c.drawPath(mouth, fill('#2E2638'));
    c.save();
    c.clipPath(mouth, 1, true);
    gem(c, 40, 92, 10, 26, '#8FD3E8', -12);
    gem(c, 52, 92, 12, 34, '#B98AE0');
    gem(c, 63, 92, 10, 24, '#8FD3E8', 14);
    c.restore();
    glow(c, 50, 74, 22, '#C8E8FF', 0.45);
  },
  oven: (c) => {
    shadow(c, 50, 92, 40);
    const dome = Skia.PathBuilder.Make();
    dome.moveTo(12, 88);
    dome.lineTo(12, 60);
    dome.cubicTo(12, 22, 88, 22, 88, 60);
    dome.lineTo(88, 88);
    dome.close();
    body(c, dome.detach(), '#C8784E', 26, 88);
    for (let y = 44; y < 88; y += 9) for (let x = 14 + ((y / 9) % 2) * 6; x < 86; x += 12) c.drawRRect(Skia.RRectXY(Skia.XYWHRect(x, y, 10, 7), 2, 2), line('#9A5232', 1, 0.5));
    const door = Skia.PathBuilder.Make();
    door.moveTo(34, 88);
    door.lineTo(34, 70);
    door.cubicTo(34, 54, 66, 54, 66, 70);
    door.lineTo(66, 88);
    door.close();
    const dp = door.detach();
    c.drawPath(dp, rad(50, 80, 22, ['#FFE08A', '#F28A3E', '#5A2A1E'], [0, 0.4, 1]));
    flame(c, 44, 84, 4);
    flame(c, 56, 84, 3.4);
    c.drawRect(Skia.XYWHRect(62, 14, 10, 18), lin(62, 0, 72, 0, ['#9A5232', '#6E3A22']));
  },
  kiln: (c) => {
    shadow(c, 50, 92, 36);
    cylinder(c, 50, 40, 32, 48, '#B8643E', '#D98B5F');
    c.drawRect(Skia.XYWHRect(44, 12, 12, 28), lin(44, 0, 56, 0, ['#9A5232', '#6E3A22']));
    c.drawPath(blob([[46, 12], [52, 4], [58, 8], [54, 14]]), fill('#E6E0D2', 0.7));
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(38, 60, 24, 22), 6, 6), rad(50, 72, 16, ['#FFE08A', '#F28A3E', '#5A2A1E'], [0, 0.45, 1]));
    for (const x of [26, 74]) ball(c, x, 76, 5, '#3E7CB8', 0.6);
  },
};

export function drawProducer(c: SkCanvas, id: ProducerId): void {
  DRAW[id]?.(c);
}

/** Small level pips under a producer (1–4). */
export function drawLevelPips(c: SkCanvas, level: number, max: number) {
  const w = max * 9;
  for (let i = 0; i < max; i++) {
    const x = 50 - w / 2 + i * 9 + 4.5;
    c.drawCircle(x, 95, 3.2, fill(i < level ? '#F2B544' : '#FFFFFF', i < level ? 1 : 0.55));
    c.drawCircle(x, 95, 3.2, line('#8E5A2E', 1, 0.5));
  }
}

