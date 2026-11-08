// Living-map motion drawn every frame on the UI thread: chimney smoke, turning sails and wheels,
// butterflies, bees, birds, fireflies, fountain spray, lighthouse beam. Each element is a
// procedural function of time (no state), so nothing here can affect the game.
import { BlendMode, PaintStyle, Skia, StrokeCap, type SkCanvas } from '@shopify/react-native-skia';

/** [kind, x, y, scale, seed] in world units. */
export type Ambient = [number, number, number, number, number];

export const AMB = { smoke: 0, sails: 1, wheel: 2, butterfly: 3, bee: 4, firefly: 5, birds: 6, beam: 7, spray: 8, sparkle: 9 } as const;

function paint(r: number, g: number, b: number, a: number) {
  'worklet';
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(Skia.Color(`rgba(${r},${g},${b},${a})`));
  return p;
}

function stroke(r: number, g: number, b: number, a: number, w: number) {
  'worklet';
  const p = paint(r, g, b, a);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(w);
  p.setStrokeCap(StrokeCap.Round);
  return p;
}

function smoke(c: SkCanvas, x: number, y: number, t: number, seed: number) {
  'worklet';
  for (let i = 0; i < 4; i++) {
    const k = ((t * 0.25 + i / 4 + seed * 0.13) % 1 + 1) % 1;
    const px = x + Math.sin(k * 5 + seed) * 6 + k * 10;
    const py = y - k * 46;
    c.drawCircle(px, py, 4 + k * 9, paint(235, 232, 228, 0.55 * (1 - k)));
  }
}

function sails(c: SkCanvas, x: number, y: number, s: number, t: number) {
  'worklet';
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.rotate(t * 40, 0, 0);
  for (let i = 0; i < 4; i++) {
    c.save();
    c.rotate(i * 90, 0, 0);
    c.drawRect(Skia.XYWHRect(-2.5, 0, 5, 46), paint(150, 105, 64, 1));
    c.drawRect(Skia.XYWHRect(3, 10, 12, 34), paint(246, 238, 220, 0.95));
    c.drawRect(Skia.XYWHRect(3, 10, 12, 34), stroke(150, 105, 64, 0.8, 1));
    c.restore();
  }
  c.drawCircle(0, 0, 4.5, paint(90, 58, 30, 1));
  c.restore();
}

function wheel(c: SkCanvas, x: number, y: number, s: number, t: number) {
  'worklet';
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.rotate(-t * 30, 0, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    c.drawLine(0, 0, Math.cos(a) * 22, Math.sin(a) * 22, stroke(154, 100, 56, 1, 2.6));
    c.drawRect(Skia.XYWHRect(Math.cos(a) * 22 - 3, Math.sin(a) * 22 - 3, 6, 6), paint(122, 82, 50, 1));
  }
  c.restore();
}

function butterfly(c: SkCanvas, x: number, y: number, t: number, seed: number) {
  'worklet';
  const px = x + Math.sin(t * 0.6 + seed) * 30 + Math.sin(t * 1.7 + seed * 2) * 8;
  const py = y + Math.cos(t * 0.5 + seed) * 18 - 20;
  const flap = Math.abs(Math.sin(t * 12 + seed)) * 0.8 + 0.2;
  const hue = seed % 3;
  const col = hue < 1 ? [238, 143, 176] : hue < 2 ? [246, 196, 67] : [185, 163, 227];
  c.drawOval(Skia.XYWHRect(px - 6 * flap, py - 4, 6 * flap, 7), paint(col[0], col[1], col[2], 0.95));
  c.drawOval(Skia.XYWHRect(px, py - 4, 6 * flap, 7), paint(col[0], col[1], col[2], 0.95));
  c.drawLine(px, py - 3, px, py + 3, stroke(62, 42, 30, 1, 1.2));
}

function bee(c: SkCanvas, x: number, y: number, t: number, seed: number) {
  'worklet';
  const a = t * 2 + seed;
  const px = x + Math.cos(a) * 26 + Math.sin(a * 2.3) * 6;
  const py = y - 18 + Math.sin(a * 1.4) * 10;
  c.drawOval(Skia.XYWHRect(px - 2, py - 5, 4, 3), paint(255, 255, 255, 0.8));
  c.drawOval(Skia.XYWHRect(px - 3, py - 2, 6, 4), paint(242, 193, 78, 1));
  c.drawLine(px, py - 2, px, py + 2, stroke(62, 42, 30, 1, 1));
}

function firefly(c: SkCanvas, x: number, y: number, t: number, seed: number) {
  'worklet';
  const px = x + Math.sin(t * 0.7 + seed * 3) * 34;
  const py = y - 30 + Math.cos(t * 0.9 + seed) * 22;
  const a = 0.35 + 0.65 * Math.max(0, Math.sin(t * 2.2 + seed * 5));
  const g = paint(255, 230, 140, a * 0.35);
  g.setBlendMode(BlendMode.Plus);
  c.drawCircle(px, py, 7, g);
  c.drawCircle(px, py, 1.8, paint(255, 248, 210, a));
}

function birds(c: SkCanvas, y: number, t: number, seed: number, w: number) {
  'worklet';
  const period = 26;
  const k = ((t + seed * 7) % period) / period;
  if (k > 0.5) return;
  const x = -40 + (k / 0.5) * (w + 80);
  for (let i = 0; i < 3; i++) {
    const bx = x - i * 16;
    const by = y + i * 7 + Math.sin(t * 3 + i) * 3;
    const f = Math.sin(t * 9 + i) * 3;
    const b = Skia.PathBuilder.Make();
    b.moveTo(bx - 6, by - f);
    b.quadTo(bx - 3, by - 3, bx, by);
    b.quadTo(bx + 3, by - 3, bx + 6, by - f);
    c.drawPath(b.detach(), stroke(70, 60, 60, 0.75, 1.6));
  }
}

function beam(c: SkCanvas, x: number, y: number, t: number) {
  'worklet';
  const a = (t * 0.8) % (Math.PI * 2);
  const len = 160;
  const b = Skia.PathBuilder.Make();
  b.moveTo(x, y);
  b.lineTo(x + Math.cos(a - 0.12) * len, y + Math.sin(a - 0.12) * len * 0.35);
  b.lineTo(x + Math.cos(a + 0.12) * len, y + Math.sin(a + 0.12) * len * 0.35);
  b.close();
  const p = paint(255, 240, 180, 0.22);
  p.setBlendMode(BlendMode.Plus);
  c.drawPath(b.detach(), p);
}

function spray(c: SkCanvas, x: number, y: number, t: number, seed: number) {
  'worklet';
  for (let i = 0; i < 8; i++) {
    const k = ((t * 0.9 + i / 8 + seed) % 1 + 1) % 1;
    const a = (i / 8) * Math.PI * 2;
    const px = x + Math.cos(a) * k * 16;
    const py = y - Math.sin(k * Math.PI) * 18 + k * 6;
    c.drawCircle(px, py, 1.8, paint(200, 236, 250, 0.9 * (1 - k)));
  }
}

function glint(c: SkCanvas, x: number, y: number, t: number, seed: number) {
  'worklet';
  const a = Math.max(0, Math.sin(t * 1.3 + seed * 4));
  if (a < 0.05) return;
  c.drawLine(x - 5 * a, y, x + 5 * a, y, stroke(255, 255, 255, 0.7 * a, 1.6));
}

/** Draws visible ambient elements. `top`/`bottom` are the visible world range. */
export function drawAmbient(c: SkCanvas, list: Ambient[], t: number, top: number, bottom: number, w: number) {
  'worklet';
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    const kind = e[0];
    const x = e[1];
    const y = e[2];
    if (y < top - 120 || y > bottom + 120) continue;
    if (kind === 0) smoke(c, x, y, t, e[4]);
    else if (kind === 1) sails(c, x, y, e[3], t);
    else if (kind === 2) wheel(c, x, y, e[3], t);
    else if (kind === 3) butterfly(c, x, y, t, e[4]);
    else if (kind === 4) bee(c, x, y, t, e[4]);
    else if (kind === 5) firefly(c, x, y, t, e[4]);
    else if (kind === 6) birds(c, y, t, e[4], w);
    else if (kind === 7) beam(c, x, y, t);
    else if (kind === 8) spray(c, x, y, t, e[4]);
    else if (kind === 9) glint(c, x, y, t, e[4]);
  }
}
