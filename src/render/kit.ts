// Drawing toolkit for the hand-painted look: soft gradients, rim light, contact shadows,
// leaves, petals, sparkles. Plain functions on an SkCanvas, used both live (board, map,
// puzzle) and by scripts/gen-sprites.ts to bake PNG icons.
import { BlendMode, BlurStyle, PaintStyle, Skia, StrokeCap, StrokeJoin, TileMode, type SkCanvas, type SkPaint, type SkPath } from '@shopify/react-native-skia';

// ---- colour ----------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** k > 0 lightens towards white, k < 0 darkens towards a warm brown-black. */
export function shade(hex: string, k: number): string {
  const [r, g, b] = hexToRgb(hex);
  if (k >= 0) return rgbToHex(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k);
  const t: [number, number, number] = [40, 24, 20];
  const a = -k;
  return rgbToHex(r + (t[0] - r) * a, g + (t[1] - g) * a, b + (t[2] - b) * a);
}

export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

/** Desaturates towards grey by k (0..1). Used for faded, unrestored scenery. */
export function fade(hex: string, k: number): string {
  const [r, g, b] = hexToRgb(hex);
  const y = r * 0.3 + g * 0.59 + b * 0.11;
  const grey: [number, number, number] = [y * 0.92 + 18, y * 0.92 + 16, y * 0.92 + 20];
  return rgbToHex(r + (grey[0] - r) * k, g + (grey[1] - g) * k, b + (grey[2] - b) * k);
}

export function color(hex: string, a = 1) {
  const c = Skia.Color(hex);
  if (a < 1) c[3] = Math.max(0, a);
  return c;
}

// ---- paints ----------------------------------------------------------------------------

export function fill(hex: string, a = 1): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(color(hex, a));
  return p;
}

export function line(hex: string, width: number, a = 1): SkPaint {
  const p = fill(hex, a);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(width);
  p.setStrokeCap(StrokeCap.Round);
  p.setStrokeJoin(StrokeJoin.Round);
  return p;
}

export function lin(x0: number, y0: number, x1: number, y1: number, cols: string[], pos: number[] | null = null, a = 1): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(Skia.Shader.MakeLinearGradient(Skia.Point(x0, y0), Skia.Point(x1, y1), cols.map((h) => color(h, a)), pos, TileMode.Clamp));
  return p;
}

export function rad(cx: number, cy: number, r: number, cols: string[], pos: number[] | null = null, alphas: number[] | null = null): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(Skia.Shader.MakeRadialGradient(Skia.Point(cx, cy), Math.max(0.1, r), cols.map((h, i) => color(h, alphas ? alphas[i] : 1)), pos, TileMode.Clamp));
  return p;
}

export function blur(p: SkPaint, sigma: number): SkPaint {
  p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, sigma, true));
  return p;
}

export function additive(p: SkPaint): SkPaint {
  p.setBlendMode(BlendMode.Plus);
  return p;
}

// ---- paths -----------------------------------------------------------------------------

export type Pt = [number, number];

export function poly(pts: Pt[], close = true): SkPath {
  const b = Skia.PathBuilder.Make();
  b.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) b.lineTo(pts[i][0], pts[i][1]);
  if (close) b.close();
  return b.detach();
}

/** Smooth closed blob through points (Catmull-Rom → cubic). */
export function blob(pts: Pt[], tension = 1): SkPath {
  const b = Skia.PathBuilder.Make();
  const n = pts.length;
  b.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const k = tension / 6;
    b.cubicTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
  }
  b.close();
  return b.detach();
}

/** Open smooth curve through points. */
export function curve(pts: Pt[]): SkPath {
  const b = Skia.PathBuilder.Make();
  b.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    b.cubicTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  return b.detach();
}

export function circlePath(cx: number, cy: number, r: number): SkPath {
  const b = Skia.PathBuilder.Make();
  b.addCircle(cx, cy, r);
  return b.detach();
}

export function ovalPath(cx: number, cy: number, rx: number, ry: number): SkPath {
  const b = Skia.PathBuilder.Make();
  b.addOval(Skia.XYWHRect(cx - rx, cy - ry, rx * 2, ry * 2));
  return b.detach();
}

export function rrectPath(x: number, y: number, w: number, h: number, r: number): SkPath {
  const b = Skia.PathBuilder.Make();
  b.addRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), r, r));
  return b.detach();
}

// ---- painted primitives ------------------------------------------------------------------

/** Soft contact shadow under an object. */
export function shadow(c: SkCanvas, cx: number, cy: number, rx: number, ry = rx * 0.28, a = 0.22) {
  c.drawOval(Skia.XYWHRect(cx - rx, cy - ry, rx * 2, ry * 2), blur(fill('#3B2A1E', a), Math.max(1, rx * 0.18)));
}

/** Fills a path with a top-lit vertical gradient and a darker rim. */
export function body(c: SkCanvas, p: SkPath, base: string, top: number, bottom: number, opts: { rim?: number; light?: number; dark?: number } = {}) {
  const light = opts.light ?? 0.32;
  const dark = opts.dark ?? -0.28;
  c.drawPath(p, lin(0, top, 0, bottom, [shade(base, light), base, shade(base, dark)], [0, 0.45, 1]));
  const rim = opts.rim ?? 2;
  if (rim > 0) c.drawPath(p, line(shade(base, -0.45), rim, 0.55));
}

/** Shaded sphere. */
export function ball(c: SkCanvas, cx: number, cy: number, r: number, base: string, rim = 1.6) {
  c.drawCircle(cx, cy, r, rad(cx - r * 0.35, cy - r * 0.4, r * 1.45, [shade(base, 0.55), base, shade(base, -0.38)], [0, 0.45, 1]));
  if (rim > 0) c.drawCircle(cx, cy, r, line(shade(base, -0.5), rim, 0.45));
}

/** Glossy highlight. */
export function shine(c: SkCanvas, x: number, y: number, rx: number, ry: number, a = 0.55) {
  c.drawOval(Skia.XYWHRect(x - rx, y - ry, rx * 2, ry * 2), blur(fill('#FFFFFF', a), Math.max(0.6, Math.min(rx, ry) * 0.45)));
}

/** Additive radial glow. */
export function glow(c: SkCanvas, x: number, y: number, r: number, hex: string, a = 0.6) {
  c.drawCircle(x, y, r, additive(rad(x, y, r, [hex, hex, hex], [0, 0.35, 1], [a, a * 0.35, 0])));
}

/** Four-point sparkle star. */
export function sparkle(c: SkCanvas, x: number, y: number, r: number, hex = '#FFF6D0', a = 1) {
  const k = r * 0.22;
  const p = poly([
    [x, y - r],
    [x + k, y - k],
    [x + r, y],
    [x + k, y + k],
    [x, y + r],
    [x - k, y + k],
    [x - r, y],
    [x - k, y - k],
  ]);
  c.drawPath(p, fill(hex, a));
  glow(c, x, y, r * 1.6, hex, 0.35 * a);
}

/** Leaf with a midrib; angle in radians, base at (x, y). */
export function leaf(c: SkCanvas, x: number, y: number, len: number, w: number, ang: number, hex: string, rib = true) {
  c.save();
  c.translate(x, y);
  c.rotate((ang * 180) / Math.PI, 0, 0);
  const b = Skia.PathBuilder.Make();
  b.moveTo(0, 0);
  b.cubicTo(len * 0.3, -w, len * 0.75, -w * 0.9, len, 0);
  b.cubicTo(len * 0.75, w * 0.9, len * 0.3, w, 0, 0);
  b.close();
  const p = b.detach();
  c.drawPath(p, lin(0, -w, 0, w, [shade(hex, 0.3), hex, shade(hex, -0.3)]));
  c.drawPath(p, line(shade(hex, -0.45), 1.1, 0.5));
  if (rib) c.drawLine(len * 0.08, 0, len * 0.86, 0, line(shade(hex, -0.35), 1, 0.6));
  c.restore();
}

/** Simple flower head: n petals around a centre. */
export function blossom(c: SkCanvas, x: number, y: number, r: number, petals: number, petal: string, center: string, rot = 0) {
  for (let i = 0; i < petals; i++) {
    const a = rot + (i / petals) * Math.PI * 2;
    const px = x + Math.cos(a) * r * 0.55;
    const py = y + Math.sin(a) * r * 0.55;
    c.save();
    c.translate(px, py);
    c.rotate((a * 180) / Math.PI, 0, 0);
    const p = ovalPath(0, 0, r * 0.55, r * 0.36);
    c.drawPath(p, rad(-r * 0.2, -r * 0.1, r * 0.7, [shade(petal, 0.45), petal, shade(petal, -0.25)], [0, 0.5, 1]));
    c.drawPath(p, line(shade(petal, -0.4), 0.9, 0.45));
    c.restore();
  }
  ball(c, x, y, r * 0.32, center, 0.8);
}

/** Wicker basket body: a tapered tub with weave lines. */
export function basket(c: SkCanvas, x: number, y: number, w: number, h: number, hex = '#C98E4E') {
  const p = poly([
    [x, y],
    [x + w, y],
    [x + w * 0.88, y + h],
    [x + w * 0.12, y + h],
  ]);
  body(c, p, hex, y, y + h);
  c.save();
  c.clipPath(p, 1, true);
  for (let i = 1; i < 4; i++) c.drawLine(x, y + (h * i) / 4, x + w, y + (h * i) / 4, line(shade(hex, -0.35), 1.4, 0.6));
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    c.drawLine(x + w * t, y, x + w * (0.12 + t * 0.76), y + h, line(shade(hex, 0.25), 1.2, 0.5));
  }
  c.restore();
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(x - 2, y - 3, w + 4, 6), 3, 3), lin(0, y - 3, 0, y + 3, [shade(hex, 0.3), shade(hex, -0.2)]));
}

/** Glass jar with a liquid/solid fill level. */
export function jar(c: SkCanvas, x: number, y: number, w: number, h: number, content: string, level = 0.7, lid = '#B5835A') {
  const p = rrectPath(x, y, w, h, w * 0.22);
  c.drawPath(p, fill('#EAF6FA', 0.35));
  c.save();
  c.clipPath(p, 1, true);
  c.drawRect(Skia.XYWHRect(x, y + h * (1 - level), w, h * level), lin(0, y + h * (1 - level), 0, y + h, [shade(content, 0.2), shade(content, -0.25)]));
  c.restore();
  c.drawPath(p, line('#6E8A94', 1.6, 0.55));
  shine(c, x + w * 0.25, y + h * 0.45, w * 0.08, h * 0.28, 0.6);
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(x - 1, y - h * 0.12, w + 2, h * 0.16), 3, 3), lin(0, y - h * 0.12, 0, y + h * 0.04, [shade(lid, 0.3), shade(lid, -0.25)]));
}

/** Isometric box: top, left and right faces. */
export function isoBox(c: SkCanvas, cx: number, top: number, w: number, d: number, h: number, hex: string) {
  const hw = w / 2;
  const hd = d / 2;
  const T: Pt = [cx, top];
  const R: Pt = [cx + hw, top + hd];
  const B: Pt = [cx, top + d];
  const Lp: Pt = [cx - hw, top + hd];
  c.drawPath(poly([Lp, B, [B[0], B[1] + h], [Lp[0], Lp[1] + h]]), lin(Lp[0], 0, B[0], 0, [shade(hex, -0.05), shade(hex, -0.2)]));
  c.drawPath(poly([B, R, [R[0], R[1] + h], [B[0], B[1] + h]]), lin(B[0], 0, R[0], 0, [shade(hex, -0.3), shade(hex, -0.42)]));
  c.drawPath(poly([T, R, B, Lp]), lin(0, T[1], 0, B[1], [shade(hex, 0.35), shade(hex, 0.12)]));
  const edge = line(shade(hex, -0.55), 1.2, 0.45);
  c.drawPath(poly([T, R, [R[0], R[1] + h], [B[0], B[1] + h], [Lp[0], Lp[1] + h], Lp]), edge);
  c.drawLine(B[0], B[1], B[0], B[1] + h, edge);
  c.drawLine(Lp[0], Lp[1], B[0], B[1], edge);
  c.drawLine(B[0], B[1], R[0], R[1], edge);
}

/** Cylinder seen slightly from above. */
export function cylinder(c: SkCanvas, cx: number, top: number, rx: number, h: number, hex: string, topHex?: string) {
  const ry = rx * 0.32;
  const b = Skia.PathBuilder.Make();
  b.moveTo(cx - rx, top);
  b.lineTo(cx - rx, top + h);
  b.arcToOval(Skia.XYWHRect(cx - rx, top + h - ry, rx * 2, ry * 2), 180, -180, false);
  b.lineTo(cx + rx, top);
  b.close();
  c.drawPath(b.detach(), lin(cx - rx, 0, cx + rx, 0, [shade(hex, -0.15), shade(hex, 0.25), hex, shade(hex, -0.35)], [0, 0.3, 0.6, 1]));
  c.drawOval(Skia.XYWHRect(cx - rx, top - ry, rx * 2, ry * 2), lin(0, top - ry, 0, top + ry, [shade(topHex ?? hex, 0.4), shade(topHex ?? hex, 0.05)]));
  c.drawOval(Skia.XYWHRect(cx - rx, top - ry, rx * 2, ry * 2), line(shade(hex, -0.5), 1.2, 0.45));
}

export function star5(cx: number, cy: number, r: number, inner = 0.45, rot = -Math.PI / 2): SkPath {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * inner;
    const a = rot + (i * Math.PI) / 5;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return poly(pts);
}

export function hexagon(cx: number, cy: number, r: number): SkPath {
  const pts: Pt[] = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return poly(pts);
}

/** Small flame. */
export function flame(c: SkCanvas, x: number, y: number, s: number) {
  glow(c, x, y - s * 0.5, s * 2.4, '#FFB347', 0.55);
  const outer = blob([
    [x, y - s * 1.5],
    [x + s * 0.55, y - s * 0.4],
    [x + s * 0.35, y + s * 0.2],
    [x - s * 0.35, y + s * 0.2],
    [x - s * 0.55, y - s * 0.4],
  ]);
  c.drawPath(outer, lin(0, y - s * 1.5, 0, y + s * 0.2, ['#FFF4B8', '#FFB23E', '#F2682A']));
  c.drawPath(
    blob([
      [x, y - s * 0.9],
      [x + s * 0.25, y - s * 0.2],
      [x, y + s * 0.1],
      [x - s * 0.25, y - s * 0.2],
    ]),
    fill('#FFFDE8', 0.9),
  );
}
