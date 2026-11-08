// Light Paths board: carved stone tiles with grooves; lit grooves glow amber or azure.
import { Skia, type SkCanvas } from '@shopify/react-native-skia';

import { drawArtBox } from '../art/art';
import { currentMask, E, N, S, W, type Puzzle, type Tile } from '../puzzles/lightpaths';
import { gem, lanternBody } from './items';
import { additive, ball, blob, fill, glow, lin, line, rad, shade, shine, sparkle } from './kit';

export const LIGHT = ['#FFC95A', '#5FD3E8'] as const;
const LIGHT_CORE = ['#FFF4C8', '#E6FFFF'] as const;

function grooves(c: SkCanvas, mask: number, s: number, hex: string, width: number, a = 1) {
  const m = s / 2;
  const p = line(hex, width, a);
  if (mask & N) c.drawLine(m, m, m, -1, p);
  if (mask & E) c.drawLine(m, m, s + 1, m, p);
  if (mask & S) c.drawLine(m, m, m, s + 1, p);
  if (mask & W) c.drawLine(m, m, -1, m, p);
  if (mask) c.drawCircle(m, m, width / 2, fill(hex, a));
}

/** Draw an art sprite into a square of `size` at (x, y). */
function artIn(c: SkCanvas, id: string, x: number, y: number, size: number): boolean {
  c.save();
  c.translate(x, y);
  c.scale(size / 100, size / 100);
  const ok = drawArtBox(c, id, 0);
  c.restore();
  return ok;
}

/** One tile in a cell of size s at the canvas origin. `mask` is the current (rotated) mask. */
export function drawTile(c: SkCanvas, t: Tile, mask: number, lit: number, s: number, opts: { hint?: boolean } = {}) {
  const r = s * 0.16;
  if (t.kind === 'empty') return;
  if (t.kind === 'rock') {
    if (artIn(c, 'prop_rock', s * 0.06, s * 0.04, s * 0.88)) return;
    c.drawPath(blob([[s * 0.18, s * 0.78], [s * 0.2, s * 0.4], [s * 0.45, s * 0.2], [s * 0.75, s * 0.3], [s * 0.84, s * 0.72], [s * 0.5, s * 0.86]]), lin(0, s * 0.2, 0, s * 0.86, ['#8E949A', '#4E5458']));
    return;
  }
  // Base slab: soft drop shadow, darker side face, lit top face with a bevel highlight.
  const top = t.fixed ? ['#6A7398', '#4A5278'] : ['#8A96C8', '#5A66A0'];
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(s * 0.05, s * 0.1, s * 0.9, s * 0.88), r, r), fill('#0E1226', 0.55));
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(s * 0.04, s * 0.05, s * 0.92, s * 0.9), r, r), fill(shade(top[1], -0.25)));
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(s * 0.04, s * 0.02, s * 0.92, s * 0.86), r, r), lin(0, 0, 0, s * 0.88, [top[0], top[1]]));
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(s * 0.06, s * 0.035, s * 0.88, s * 0.83), r * 0.85, r * 0.85), line('#FFFFFF', Math.max(1, s * 0.02), 0.22));
  if (opts.hint) c.drawRRect(Skia.RRectXY(Skia.XYWHRect(s * 0.04, s * 0.02, s * 0.92, s * 0.86), r, r), line('#FFE08A', 3));
  const w = s * 0.22;
  grooves(c, mask, s, '#1E2340', w * 1.08);
  grooves(c, mask, s, '#2E3560', w * 0.86);
  if (lit) {
    const col = lit === 3 ? '#FFFFFF' : LIGHT[lit === 2 ? 1 : 0];
    const core = lit === 3 ? '#FFFFFF' : LIGHT_CORE[lit === 2 ? 1 : 0];
    const g = line(col, w * 1.6, 0.35);
    g.setMaskFilter(Skia.MaskFilter.MakeBlur(0, w * 0.5, true));
    const m = s / 2;
    if (mask & N) c.drawLine(m, m, m, 0, g);
    if (mask & E) c.drawLine(m, m, s, m, g);
    if (mask & S) c.drawLine(m, m, m, s, g);
    if (mask & W) c.drawLine(m, m, 0, m, g);
    grooves(c, mask, s, col, w * 0.7);
    grooves(c, mask, s, core, w * 0.25, 0.9);
  } else grooves(c, mask, s, '#8C96C0', w * 0.3, 0.55);
  if (t.kind === 'filter') {
    const col = LIGHT[t.color];
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(s * 0.3, s * 0.3, s * 0.4, s * 0.4), s * 0.08, s * 0.08), fill(col, 0.55));
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(s * 0.3, s * 0.3, s * 0.4, s * 0.4), s * 0.08, s * 0.08), line(shade(col, 0.4), 2));
    // Shape mark so colour is not the only cue: amber = diamond, azure = circle.
    if (t.color === 0) {
      const b = Skia.PathBuilder.Make();
      b.moveTo(s / 2, s * 0.38);
      b.lineTo(s * 0.62, s / 2);
      b.lineTo(s / 2, s * 0.62);
      b.lineTo(s * 0.38, s / 2);
      b.close();
      c.drawPath(b.detach(), fill('#FFFFFF', 0.85));
    } else c.drawCircle(s / 2, s / 2, s * 0.09, fill('#FFFFFF', 0.85));
  }
  if (t.fixed && t.kind === 'path') {
    for (const [x, y] of [[0.16, 0.14], [0.84, 0.14], [0.16, 0.84], [0.84, 0.84]] as const) c.drawCircle(s * x, s * y, s * 0.035, fill('#C9CED8'));
  }
  if (t.kind === 'source') {
    const col = LIGHT[t.color];
    c.drawCircle(s / 2, s / 2, s * 0.42, additive(rad(s / 2, s / 2, s * 0.42, [col, col], [0, 1], [0.7, 0])));
    if (!artIn(c, t.color === 1 ? 'item_lantern_5' : 'item_lantern_4', s * 0.12, s * 0.06, s * 0.76)) {
      c.save();
      c.translate(s / 2, s / 2);
      c.scale(s / 160, s / 160);
      c.translate(-50, -54);
      lanternBody(c, 50, 14, 46, 76, '#8E5A2E', col);
      c.restore();
    }
    if (t.color === 1) c.drawCircle(s * 0.78, s * 0.22, s * 0.07, fill('#FFFFFF'));
  }
  if (t.kind === 'target') {
    const col = LIGHT[t.color];
    const ok = lit === 1 << t.color;
    const wrong = lit !== 0 && !ok;
    if (ok) c.drawCircle(s / 2, s / 2, s * 0.5, additive(rad(s / 2, s / 2, s * 0.5, [col, col], [0, 1], [0.8, 0])));
    c.drawCircle(s / 2, s / 2, s * 0.27, fill('#20263E'));
    c.drawCircle(s / 2, s / 2, s * 0.27, line(ok ? '#FFFFFF' : col, s * 0.06));
    if (!artIn(c, t.color === 1 ? 'item_crystal_1' : 'item_honey_2', s * 0.27, s * 0.25, s * 0.46)) {
      c.save();
      c.translate(s / 2 - s * 0.25 * 0.5, s / 2 + s * 0.18);
      gem(c, s * 0.125, 0, s * 0.18, s * 0.34, ok ? shade(col, 0.4) : shade(col, -0.35));
      c.restore();
    }
    if (t.color === 0) {
      // amber targets carry a diamond notch, azure a dot (colour-blind cue)
      c.drawRect(Skia.XYWHRect(s * 0.46, s * 0.12, s * 0.08, s * 0.08), fill(col));
    } else c.drawCircle(s / 2, s * 0.16, s * 0.045, fill(col));
    if (ok) sparkle(c, s * 0.72, s * 0.28, s * 0.08, '#FFFFFF');
    if (wrong) {
      c.drawLine(s * 0.3, s * 0.3, s * 0.7, s * 0.7, line('#E8644A', 3));
      c.drawLine(s * 0.7, s * 0.3, s * 0.3, s * 0.7, line('#E8644A', 3));
    }
  }
  shine(c, s * 0.25, s * 0.16, s * 0.12, s * 0.03, 0.25);
}

/** Whole board (cell size s). Skips `hidden` (the tile being animated). */
export function drawPuzzle(c: SkCanvas, p: Puzzle, lit: number[], s: number, hidden: number | null, hint: number | null) {
  const pad = s * 0.12;
  // Board: a carved night-stone tray with a lit rim.
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(-pad, -pad + s * 0.08, p.w * s + pad * 2, p.h * s + pad * 2), s * 0.3, s * 0.3), fill('#0A0D1E', 0.5));
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(-pad, -pad, p.w * s + pad * 2, p.h * s + pad * 2), s * 0.3, s * 0.3), lin(0, -pad, 0, p.h * s, ['#38406A', '#1E2440']));
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(-pad + 2, -pad + 2, p.w * s + pad * 2 - 4, p.h * s + pad * 2 - 4), s * 0.28, s * 0.28), line('#8C96C0', 1.5, 0.35));
  for (let i = 0; i < p.tiles.length; i++) {
    if (i === hidden) continue;
    const x = i % p.w;
    const y = (i - x) / p.w;
    c.save();
    c.translate(x * s, y * s);
    drawTile(c, p.tiles[i], currentMask(p.tiles[i]), lit[i], s, { hint: i === hint });
    c.restore();
  }
}

export { glow, ball };
