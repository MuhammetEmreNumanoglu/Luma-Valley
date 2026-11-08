// Luma Valley brand mark: the keeper's lantern glowing over a valley at golden hour.
// Writes the app icon, splash mark, Android adaptive layers and favicon from the same drawing
// code the game uses. Run: node --import ./scripts/ts-register.mjs scripts/gen-brand.ts
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { Skia, type SkCanvas } from '@shopify/react-native-skia';

import { lanternBody } from '../src/render/items';
import { blob, fill, glow, lin, rad, sparkle } from '../src/render/kit';

const OUT = join(process.cwd(), 'assets');

function png(size: number, draw: (c: SkCanvas) => void, bg: string | null = null) {
  const s = Skia.Surface.MakeOffscreen(size, size)!;
  const c = s.getCanvas();
  c.clear(Skia.Color(bg ?? 'transparent'));
  c.scale(size / 100, size / 100);
  draw(c);
  s.flush();
  return s.makeImageSnapshot().encodeToBytes();
}

function background(c: SkCanvas) {
  c.drawRect(Skia.XYWHRect(0, 0, 100, 100), lin(0, 0, 0, 100, ['#F7C98A', '#F2A66E', '#B8789A'], [0, 0.55, 1]));
  c.drawCircle(50, 58, 46, rad(50, 58, 46, ['#FFF2C8', '#F7C98A'], [0, 1], [0.9, 0]));
  c.drawPath(blob([[-10, 80], [20, 62], [46, 70], [70, 58], [110, 72], [110, 110], [-10, 110]]), lin(0, 58, 0, 100, ['#9BC47A', '#5E8A4E']));
  c.drawPath(blob([[-10, 92], [30, 78], [66, 86], [110, 80], [110, 110], [-10, 110]]), lin(0, 78, 0, 100, ['#7FAE5A', '#4E7A3E']));
  c.drawPath(blob([[38, 110], [46, 88], [52, 80], [58, 88], [64, 110]]), fill('#E6CFA0', 0.85));
}

function mark(c: SkCanvas, scale = 1) {
  c.save();
  c.translate(50, 50);
  c.scale(scale, scale);
  c.translate(-50, -50);
  glow(c, 50, 52, 44, '#FFE08A', 0.75);
  c.save();
  c.translate(50, 50);
  c.scale(0.78, 0.78);
  c.translate(-50, -54);
  lanternBody(c, 50, 14, 46, 76, '#8E5A2E', '#FFC95A');
  c.restore();
  sparkle(c, 24, 30, 4, '#FFFFFF');
  sparkle(c, 78, 24, 3, '#FFFFFF');
  sparkle(c, 74, 70, 2.5, '#FFFFFF');
  c.restore();
}

writeFileSync(join(OUT, 'icon.png'), png(1024, (c) => {
  background(c);
  mark(c, 0.95);
}));
writeFileSync(join(OUT, 'splash-icon.png'), png(512, (c) => mark(c, 1)));
writeFileSync(join(OUT, 'android-icon-background.png'), png(512, background));
writeFileSync(join(OUT, 'android-icon-foreground.png'), png(512, (c) => mark(c, 0.62)));
writeFileSync(join(OUT, 'android-icon-monochrome.png'), png(512, (c) => {
  c.save();
  c.translate(50, 50);
  c.scale(0.62, 0.62);
  c.translate(-50, -50);
  const p = Skia.Paint();
  p.setColor(Skia.Color('#FFFFFF'));
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(32, 24, 36, 10), 3, 3), p);
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(30, 34, 40, 44), 6, 6), p);
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(28, 78, 44, 8), 3, 3), p);
  c.restore();
}));
writeFileSync(join(OUT, 'favicon.png'), png(48, (c) => {
  background(c);
  mark(c, 0.95);
}));
console.log('brand assets written');
