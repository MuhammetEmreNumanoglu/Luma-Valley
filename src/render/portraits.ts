// Character portraits (100×100 box) with mood expressions.
import { Skia, type SkCanvas } from '@shopify/react-native-skia';

import { CHARACTER, type CharId, type Mood } from '../content/characters';
import { blob, blossom, body, curve, fill, glow, lin, line, ovalPath, poly, rad, shade, shine, sparkle, star5 } from './kit';

function eyes(c: SkCanvas, mood: Mood, y: number, dx = 11, cx = 50) {
  for (const s of [-1, 1]) {
    const x = cx + s * dx;
    if (mood === 'happy' || mood === 'proud') {
      c.drawPath(curve([[x - 4.5, y + 1], [x, y - 3.5], [x + 4.5, y + 1]]), line('#2B1A10', 2.4));
    } else if (mood === 'sad') {
      c.drawOval(Skia.XYWHRect(x - 3, y - 3, 6, 7), fill('#2B1A10'));
      c.drawLine(x - 5 * s, y - 8, x + 4 * s, y - 6, line('#2B1A10', 1.8));
    } else {
      const big = mood === 'surprised' ? 1.25 : 1;
      c.drawOval(Skia.XYWHRect(x - 3.4 * big, y - 4 * big, 6.8 * big, 8 * big), fill('#2B1A10'));
      c.drawCircle(x - 1.2, y - 1.6, 1.5 * big, fill('#FFFFFF'));
      if (mood === 'curious' && s > 0) c.drawLine(x - 4, y - 9, x + 4, y - 10, line('#2B1A10', 1.8));
    }
  }
}

function mouth(c: SkCanvas, mood: Mood, y: number, cx = 50) {
  switch (mood) {
    case 'happy':
      c.drawPath(curve([[cx - 7, y - 1], [cx, y + 6], [cx + 7, y - 1]]), line('#8E3A2E', 2.4));
      break;
    case 'proud':
      c.drawPath(curve([[cx - 6, y], [cx + 1, y + 3], [cx + 7, y - 2]]), line('#8E3A2E', 2.2));
      break;
    case 'sad':
      c.drawPath(curve([[cx - 5, y + 3], [cx, y], [cx + 5, y + 3]]), line('#8E3A2E', 2));
      break;
    case 'surprised':
      c.drawOval(Skia.XYWHRect(cx - 3.5, y - 2, 7, 8), fill('#8E3A2E'));
      break;
    case 'curious':
      c.drawPath(curve([[cx - 4, y + 1], [cx + 2, y + 2], [cx + 5, y]]), line('#8E3A2E', 2));
      break;
    default:
      c.drawPath(curve([[cx - 5, y], [cx, y + 2.5], [cx + 5, y]]), line('#8E3A2E', 2));
  }
}

function head(c: SkCanvas, skin: string, cx = 50, cy = 46, rx = 21, ry = 23) {
  c.drawPath(ovalPath(cx - rx + 1, cy + 2, 4, 6), fill(shade(skin, -0.1)));
  c.drawPath(ovalPath(cx + rx - 1, cy + 2, 4, 6), fill(shade(skin, -0.1)));
  c.drawOval(Skia.XYWHRect(cx - rx, cy - ry, rx * 2, ry * 2), rad(cx - 6, cy - 8, ry * 1.5, [shade(skin, 0.25), skin, shade(skin, -0.18)], [0, 0.55, 1]));
  for (const s of [-1, 1]) c.drawCircle(cx + s * 13, cy + 8, 4, fill('#F28A8A', 0.35));
}

function shoulders(c: SkCanvas, outfit: string, accent: string) {
  const p = blob([[14, 100], [18, 80], [36, 70], [64, 70], [82, 80], [86, 100]], 0.8);
  body(c, p, outfit, 70, 100, { rim: 1.4 });
  c.drawPath(poly([[42, 70], [50, 80], [58, 70]]), fill(accent));
}

type Painter = (c: SkCanvas, mood: Mood) => void;

const PAINT: Record<CharId, Painter> = {
  lumi: (c, mood) => {
    glow(c, 50, 52, 48, '#FFD27A', 0.6);
    const b = blob([[50, 14], [62, 30], [74, 52], [68, 78], [50, 86], [32, 78], [26, 52], [38, 30]], 1);
    c.drawPath(b, rad(44, 44, 46, ['#FFFDF0', '#FFE08A', '#F2A83E'], [0, 0.5, 1]));
    c.drawPath(blob([[50, 4], [58, 18], [50, 26], [42, 18]]), lin(0, 4, 0, 26, ['#FFFFFF', '#FFC95A']));
    eyes(c, mood, 54, 9);
    mouth(c, mood, 66);
    for (const s of [-1, 1]) c.drawCircle(50 + s * 15, 62, 4, fill('#F28A5A', 0.35));
    sparkle(c, 80, 26, 4, '#FFFFFF');
    sparkle(c, 20, 74, 3, '#FFFFFF');
  },
  mira: (c, mood) => {
    const ch = CHARACTER.mira;
    shoulders(c, ch.outfit, ch.accent);
    c.drawRect(Skia.XYWHRect(30, 82, 40, 18), fill('#8E5A2E', 0.85));
    c.drawPath(blob([[26, 52], [26, 26], [50, 16], [74, 26], [74, 52], [68, 40], [32, 40]]), fill(ch.hair));
    head(c, ch.skin);
    c.drawPath(blob([[27, 38], [30, 22], [50, 16], [70, 22], [73, 38], [50, 30]]), fill(ch.hair));
    c.drawPath(blob([[28, 30], [50, 22], [72, 30], [70, 36], [50, 30], [30, 36]]), lin(0, 22, 0, 36, [ch.accent, shade(ch.accent, -0.2)]));
    c.drawLine(64, 26, 80, 14, line('#E9C46A', 3));
    eyes(c, mood, 48);
    mouth(c, mood, 60);
  },
  ada: (c, mood) => {
    const ch = CHARACTER.ada;
    c.drawPath(blob([[22, 90], [24, 40], [50, 18], [76, 40], [78, 90]]), fill(ch.hair));
    shoulders(c, ch.outfit, ch.accent);
    head(c, ch.skin);
    c.drawPath(blob([[27, 44], [32, 22], [50, 16], [68, 22], [73, 44], [60, 30], [40, 28]]), fill(ch.hair));
    blossom(c, 70, 28, 7, 5, '#EE8FB0', '#F6C443');
    eyes(c, mood, 48);
    mouth(c, mood, 60);
  },
  bera: (c, mood) => {
    const ch = CHARACTER.bera;
    shoulders(c, ch.outfit, ch.accent);
    c.drawPath(blob([[30, 76], [50, 84], [70, 76], [66, 70], [34, 70]]), fill(ch.accent));
    head(c, ch.skin);
    for (const [x, y, r] of [[30, 34, 8], [38, 24, 9], [50, 20, 10], [62, 24, 9], [70, 34, 8]] as const) c.drawCircle(x, y, r, fill(ch.hair));
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(30, 26, 40, 9), 4, 4), fill('#8E5A2E'));
    for (const x of [40, 60]) {
      c.drawCircle(x, 30, 6, fill('#BFE6F2'));
      c.drawCircle(x, 30, 6, line('#C9923E', 2));
    }
    eyes(c, mood, 49);
    mouth(c, mood, 61);
  },
  niko: (c, mood) => {
    const ch = CHARACTER.niko;
    shoulders(c, ch.outfit, ch.accent);
    for (const y of [80, 90]) c.drawCircle(50, y, 2, fill('#C9C3B7'));
    head(c, ch.skin);
    for (const [x, y, r] of [[30, 40, 7], [70, 40, 7], [34, 30, 7], [66, 30, 7]] as const) c.drawCircle(x, y, r, fill(ch.hair));
    c.drawPath(blob([[30, 30], [32, 12], [42, 6], [50, 10], [58, 6], [68, 12], [70, 30]]), rad(46, 12, 30, ['#FFFFFF', '#F2EFE6', '#D6D0C4']));
    c.drawRect(Skia.XYWHRect(30, 26, 40, 8), fill('#E6E0D2'));
    c.drawPath(curve([[40, 58], [44, 55], [50, 57], [56, 55], [60, 58]]), line(ch.hair, 3.4));
    eyes(c, mood, 46);
    mouth(c, mood, 64);
  },
  deniz: (c, mood) => {
    const ch = CHARACTER.deniz;
    shoulders(c, ch.outfit, ch.accent);
    for (let y = 76; y < 100; y += 6) c.drawLine(20, y, 80, y, line('#F2EFE6', 2, 0.5));
    head(c, ch.skin);
    c.drawPath(blob([[30, 52], [34, 70], [50, 78], [66, 70], [70, 52], [60, 60], [40, 60]]), fill(ch.hair));
    c.drawPath(blob([[26, 32], [34, 16], [66, 16], [74, 32], [50, 28]]), lin(0, 16, 0, 32, ['#2F6E86', '#1E4E62']));
    c.drawRect(Skia.XYWHRect(26, 28, 48, 6), fill('#F2EFE6'));
    c.drawPath(star5(50, 22, 3.5), fill(ch.accent));
    eyes(c, mood, 46);
    mouth(c, mood, 63);
  },
  yaren: (c, mood) => {
    const ch = CHARACTER.yaren;
    c.drawPath(curve([[68, 50], [78, 70], [72, 92]]), line(ch.hair, 9));
    shoulders(c, ch.outfit, ch.accent);
    head(c, ch.skin);
    c.drawPath(blob([[24, 50], [26, 24], [50, 12], [74, 24], [76, 50], [70, 34], [30, 34]]), lin(0, 12, 0, 50, [ch.accent, shade(ch.accent, -0.25)]));
    for (let i = 0; i < 5; i++) c.drawCircle(30 + i * 10, 30, 2, fill('#8C6BB1'));
    c.drawPath(blob([[32, 40], [40, 34], [60, 34], [68, 40], [50, 38]]), fill(ch.hair));
    eyes(c, mood, 48);
    mouth(c, mood, 60);
  },
};

export function drawPortrait(c: SkCanvas, id: CharId, mood: Mood = 'calm'): void {
  PAINT[id]?.(c, mood);
  void shine;
}
