// Mock-up of the workshop board seen from a tilted camera (0°, 15°, 20°) with the real item
// sprites standing upright on their cells, at the in-game size (390 pt wide phone, 52 pt cells).
//   node --import ./scripts/ts-register.mjs scripts/qa/tilt-preview.ts <out.png>
import { readFileSync, writeFileSync } from 'node:fs';
import { Skia, type SkCanvas, type SkImage } from '@shopify/react-native-skia';

const out = process.argv[2] ?? 'tilt-preview.png';
const W = 7, H = 9, CELL = 52, SCALE = 2; // 2× pixels for a crisp image
const PHONE_W = 390, PHONE_H = 540;
const ANGLES = [0, 15, 20];

const img = (id: string): SkImage => Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(new Uint8Array(readFileSync(`assets/art/items/${id}.png`))))!;
// A typical mid-game board: locked edge cells (null = locked), empty cells ('') and items.
const L = null, E = '';
const BOARD: (string | null)[] = [
  L, L, L, L, L, L, L,
  L, 'item_flower_2', 'item_flower_2', E, 'item_wood_3', 'item_stone_2', L,
  'item_cow_2', 'item_cow_2', E, 'item_grapeFarm_3', E, 'item_wheatFarm_4', 'item_tomatoFarm_2',
  'item_fruit_3', E, 'item_pumpkinFarm_4', E, 'item_chicken_3', E, 'item_honey_2',
  E, 'item_melonFarm_2', E, 'item_flower_3', 'item_flower_3', E, 'item_cornFarm_3',
  L, 'item_grain_2', 'item_stone_3', E, 'item_wood_2', 'item_grapeCrop_1', L,
  L, E, 'item_fabric_2', 'item_lantern_2', E, E, L,
  L, L, E, 'item_melonCrop_1', E, L, L,
  L, L, L, L, L, L, L,
];

const F = 700;
const raw = (u: number, v: number, tilt: number) => {
  // Plane rotated about the horizontal axis through the board centre, pinhole camera.
  const t = (tilt * Math.PI) / 180;
  const x = u - (W * CELL) / 2, y = v - (H * CELL) / 2;
  const Y = y * Math.cos(t), Z = -y * Math.sin(t);
  const s = F / (F + Z);
  return { x: x * s, y: Y * s, s };
};
const project = (u: number, v: number, tilt: number) => {
  // Fit the near (widest) edge to the phone width, like the game sizes its board.
  const near = raw(W * CELL + 6, H * CELL + 6, tilt).x - raw(-6, H * CELL + 6, tilt).x;
  const fit = Math.min(1, (PHONE_W - 12) / near);
  const top = raw(0, -6, tilt).y, bottom = raw(0, H * CELL + 6, tilt).y;
  const r = raw(u, v, tilt);
  return { x: PHONE_W / 2 + r.x * fit, y: 34 + (r.y - top) * fit, s: r.s * fit, fit, height: (bottom - top) * fit };
};

function drawBoard(c: SkCanvas, tilt: number) {
  const quad = (u0: number, v0: number, u1: number, v1: number) => {
    const a = project(u0, v0, tilt), b = project(u1, v0, tilt), d = project(u1, v1, tilt), e = project(u0, v1, tilt);
    const p = Skia.PathBuilder.Make();
    p.moveTo(a.x, a.y); p.lineTo(b.x, b.y); p.lineTo(d.x, d.y); p.lineTo(e.x, e.y); p.close();
    return p.detach();
  };
  const paint = (hex: string, a = 1) => { const p = Skia.Paint(); p.setColor(Skia.Color(hex)); p.setAlphaf(a); p.setAntiAlias(true); return p; };
  // Tray (with a visible front edge when tilted).
  if (tilt) c.drawPath(quad(-6, H * CELL + 6, W * CELL + 6, H * CELL + 6 + tilt * 0.9), paint('#2F4D3E'));
  c.drawPath(quad(-6, -6, W * CELL + 6, H * CELL + 6), paint('#4F7A63'));
  c.drawPath(quad(-3, -3, W * CELL + 3, H * CELL + 3), paint('#86A88C'));
  for (let i = 0; i < W * H; i++) {
    const u = (i % W) * CELL, v = Math.floor(i / W) * CELL;
    const even = ((i % W) + Math.floor(i / W)) % 2 === 0;
    if (BOARD[i] === null) { c.drawPath(quad(u + 1.5, v + 1.5, u + CELL - 1.5, v + CELL - 1.5), paint(even ? '#A1B59D' : '#94AA93')); continue; }
    if (tilt) c.drawPath(quad(u + 1.5, v + CELL - 3, u + CELL - 1.5, v + CELL - 1), paint(even ? '#B7C9AF' : '#A9BCA2'));
    c.drawPath(quad(u + 1.5, v + 1.5, u + CELL - 1.5, v + CELL - 3), paint(even ? '#F9F7E8' : '#EDF3DF'));
  }
  // Items stand upright on their cells, drawn far to near.
  for (let i = 0; i < W * H; i++) {
    const id = BOARD[i];
    if (!id) continue;
    const u = (i % W) * CELL + CELL / 2, v = Math.floor(i / W) * CELL + CELL * (tilt ? 0.78 : 0.5);
    const p = project(u, v, tilt);
    const size = CELL * 0.86 * p.s;
    const im = img(id);
    if (tilt) {
      const sh = Skia.Paint(); sh.setColor(Skia.Color('#2F4D3E')); sh.setAlphaf(0.18); sh.setAntiAlias(true);
      c.drawOval(Skia.XYWHRect(p.x - size * 0.32, p.y - size * 0.07, size * 0.64, size * 0.14), sh);
    }
    const dst = tilt ? Skia.XYWHRect(p.x - size / 2, p.y - size * 0.92, size, size) : Skia.XYWHRect(p.x - size / 2, p.y - size / 2, size, size);
    c.drawImageRect(im, Skia.XYWHRect(0, 0, im.width(), im.height()), dst, Skia.Paint());
  }
}

const surface = Skia.Surface.MakeOffscreen(PHONE_W * ANGLES.length * SCALE + 40 * SCALE, (PHONE_H + 40) * SCALE)!;
const c = surface.getCanvas();
c.clear(Skia.Color('#FFFFFF'));
ANGLES.forEach((tilt, k) => {
  c.save();
  c.scale(SCALE, SCALE);
  c.translate(10 + k * (PHONE_W + 10), 10);
  const bg = Skia.Paint(); bg.setColor(Skia.Color('#EEF2E4'));
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(0, 0, PHONE_W, PHONE_H), 22, 22), bg);
  c.save();
  c.clipRRect(Skia.RRectXY(Skia.XYWHRect(0, 0, PHONE_W, PHONE_H), 22, 22), 1, true);
  drawBoard(c, tilt);
  c.restore();
  const label = Skia.Paint(); label.setColor(Skia.Color('#29473A'));
  const font = Skia.Font(undefined, 22);
  c.drawText(tilt ? `${tilt}°` : '0° (şimdiki)', 16, PHONE_H - 14, label, font);
  c.restore();
});
surface.flush();
writeFileSync(out, surface.makeImageSnapshot().encodeToBytes());
console.log('wrote', out);
