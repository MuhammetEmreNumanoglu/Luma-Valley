// Living-map motion drawn every frame on the UI thread: chimney smoke, turning sails and wheels,
// butterflies, bees, birds, fireflies, fountain spray, lighthouse beam. Each element is a
// procedural function of time (no state), so nothing here can affect the game.
import { BlendMode, PaintStyle, Skia, StrokeCap, type SkCanvas } from '@shopify/react-native-skia';

/** [kind, x, y, scale, seed] in world units. */
export type Ambient = [number, number, number, number, number];

export const AMB = { smoke: 0, sails: 1, wheel: 2, butterfly: 3, bee: 4, firefly: 5, birds: 6, beam: 7, spray: 8, sparkle: 9, sakura: 10, snow: 11, autumn: 12, moon: 13, duck: 14, reeds: 15, flag: 16, festivalLights: 17 } as const;

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

// Paths are created once, then reused by every frame and every visible particle.
const petalPath = Skia.Path.MakeFromSVGString('M0 -5 C5 -7 7 -3 4 2 Q2 5 0 6 Q-2 5 -4 2 C-7 -3 -5 -7 0 -5 Z')!;
const leafPath = Skia.Path.MakeFromSVGString('M0 -7 C5 -5 6 0 0 7 C-6 3 -6 -3 0 -7 Z')!;

/** A few small world-space particles; all motion is deterministic and allocation-light. */
function seasonal(c: SkCanvas, kind: number, x: number, y: number, scale: number, t: number, seed: number) {
  'worklet';
  const phase = ((t * (kind === 11 ? 0.055 : 0.035) + seed * 0.173) % 1 + 1) % 1;
  const px = x + Math.sin(t * 0.7 + seed) * (kind === 11 ? 7 : 14);
  const py = y + (phase - 0.5) * 90;
  if (kind === 13) {
    const a = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.3 + seed));
    const yy = y + Math.sin(t * 0.6 + seed) * 9;
    c.drawCircle(px, yy, 5 * scale, paint(131, 184, 219, a * 0.16));
    c.drawCircle(px, yy, 1.7 * scale, paint(182, 233, 238, a));
  } else if (kind === 11) {
    if (seed % 3 === 0) c.drawCircle(px, py, 1.6 * scale, paint(239, 250, 255, 0.8));
    else {
      c.save(); c.translate(px, py); c.rotate(t * 8 + seed, 0, 0);
      const p = stroke(239, 250, 255, 0.82, 0.8 * scale), r = 3.5 * scale;
      for (let j = 0; j < 3; j++) { const a = j * Math.PI / 3; c.drawLine(-Math.cos(a)*r, -Math.sin(a)*r, Math.cos(a)*r, Math.sin(a)*r, p); }
      c.restore();
    }
  } else {
    c.save(); c.translate(px, py); c.rotate(Math.sin(t * 1.1 + seed) * 85, 0, 0); c.scale(scale, scale);
    if (kind === 10) c.drawPath(petalPath, paint(250, 183 + seed % 30, 204, 0.82));
    else { c.drawPath(leafPath, seed % 3 === 0 ? paint(172, 98, 46, 0.82) : seed % 3 === 1 ? paint(222, 153, 68, 0.82) : paint(230, 177, 65, 0.82)); c.drawLine(0, -5, 0, 5, stroke(126, 83, 41, 0.6, 0.55)); }
    c.restore();
  }
}

/** Small local details share the existing world-space clock and never receive touch events. */
function duck(c: SkCanvas, x: number, y: number, scale: number, t: number, seed: number) {
  'worklet';
  const dx = Math.sin(t * 0.32 + seed) * 8, dy = Math.sin(t * 1.2 + seed) * 1.4;
  c.save(); c.translate(x + dx, y + dy); c.scale(scale, scale);
  c.drawOval(Skia.XYWHRect(-10, 2, 20, 4), stroke(213, 242, 237, 0.42, 0.8));
  c.drawOval(Skia.XYWHRect(-7, -4, 14, 8), paint(247, 238, 201, 0.96));
  c.drawCircle(4, -5, 3.2, paint(255, 248, 220, 1));
  c.drawLine(7, -5, 10, -4, stroke(219, 153, 57, 0.95, 1.5));
  c.drawCircle(5, -5.5, 0.6, paint(69, 72, 62, 1));
  c.restore();
}
function reeds(c: SkCanvas, x: number, y: number, scale: number, t: number, seed: number) {
  'worklet';
  const wind = Math.sin(t * 0.8 + seed) * 2.5;
  for (let i = 0; i < 3; i++) {
    const px = x + (i - 1) * 4 * scale, h = (12 + i * 3) * scale;
    c.drawLine(px, y, px + wind * scale, y - h, stroke(92, 123, 70, 0.85, 1.5 * scale));
    c.drawOval(Skia.XYWHRect(px + wind * scale - scale, y - h - 3 * scale, 2.4 * scale, 6 * scale), paint(127, 84, 54, 0.9));
  }
}
const flagPath = Skia.Path.MakeFromSVGString('M0 0 L14 3 L0 9 Z')!;
function flag(c: SkCanvas, x: number, y: number, scale: number, t: number, seed: number) {
  'worklet';
  c.save(); c.translate(x, y); c.scale(scale, scale);
  c.drawLine(0, 0, 0, -25, stroke(112, 79, 53, 0.95, 1.6));
  c.translate(0, -24); c.scale(0.86 + 0.14 * Math.sin(t * 1.7 + seed), 1);
  c.drawPath(flagPath, seed % 2 ? paint(220, 105, 97, 0.9) : paint(225, 173, 87, 0.9)); c.restore();
}
function festivalLights(c: SkCanvas, x: number, y: number, t: number, seed: number) {
  'worklet';
  for (let i = 0; i < 5; i++) {
    const x0 = x + i * 17, y0 = y + Math.sin(i * Math.PI / 5) * 6;
    const x1 = x + (i + 1) * 17, y1 = y + Math.sin((i + 1) * Math.PI / 5) * 6;
    c.drawLine(x0, y0, x1, y1, stroke(102, 83, 72, 0.75, 0.8));
    const a = 0.5 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.6 + seed + i));
    c.drawCircle(x0, y0 + 2, 2.3, paint(255, 215 + (i % 2) * 20, 137, a));
  }
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
    else if (kind >= 10 && kind <= 13) seasonal(c, kind, x, y, e[3], t, e[4]);
    else if (kind === 14) duck(c, x, y, e[3], t, e[4]);
    else if (kind === 15) reeds(c, x, y, e[3], t, e[4]);
    else if (kind === 16) flag(c, x, y, e[3], t, e[4]);
    else if (kind === 17) festivalLights(c, x, y, t, e[4]);
  }
}
