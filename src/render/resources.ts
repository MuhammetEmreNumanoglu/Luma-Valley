// Workshop resource obstacles, drawn into the shared 100×100 item box but bigger than an item (the
// board draws them at ~125% of a cell, centred on their own cell; touch stays one cell).
// Each kind wears down visibly: 3/3 whole → 2/3 cracked → 1/3 mostly broken. Three durability
// pips sit on a small plate at the bottom. Uses the project's licensed sprites plus a little
// procedural detail (cracks, pebbles, shards) so every stage keeps the same art style.
import { FilterMode, MipmapMode, Skia, type SkCanvas } from '@shopify/react-native-skia';

import { artImage } from '../art/art';
import type { ResourceKind } from '../content/resources';
import { hash01 } from '../core/rng';
import { fill, line, rad, shadow } from './kit';

/** Sprite `id` with its bottom-centre at (x, y), `w` box units wide. */
function sprite(c: SkCanvas, id: string, x: number, y: number, w: number, alpha = 1): boolean {
  const img = artImage(id);
  if (!img) return false;
  const k = w / img.width();
  const h = img.height() * k;
  const p = Skia.Paint();
  p.setAlphaf(alpha);
  c.drawImageRectOptions(img, Skia.XYWHRect(0, 0, img.width(), img.height()), Skia.XYWHRect(x - w / 2, y - h, w, h), FilterMode.Linear, MipmapMode.None, p);
  return true;
}

function cracks(c: SkCanvas, x: number, y: number, s: number, n: number, seed: number) {
  const dark = line('#3E352E', 2.2 * s, 0.8);
  const lit = line('#FFFFFF', 1.1 * s, 0.4);
  for (let i = 0; i < n; i++) {
    const ox = (hash01(seed, i) - 0.5) * 34 * s;
    const p = Skia.PathBuilder.Make();
    p.moveTo(x + ox, y - 38 * s);
    p.lineTo(x + ox + 6 * s, y - 27 * s);
    p.lineTo(x + ox - 3 * s, y - 17 * s);
    p.lineTo(x + ox + 5 * s, y - 8 * s);
    const path = p.detach();
    c.drawPath(path, dark);
    c.save();
    c.translate(1.3 * s, 0.6 * s);
    c.drawPath(path, lit);
    c.restore();
  }
}

function rubble(c: SkCanvas, x: number, y: number, s: number, seed: number, col: string, n = 7) {
  for (let i = 0; i < n; i++) {
    const px = x + (hash01(seed, i + 10) - 0.5) * 70 * s;
    const py = y - 2 + (hash01(seed, i + 20) - 0.5) * 10 * s;
    const r = (2.6 + hash01(seed, i + 30) * 3.4) * s;
    c.drawOval(Skia.XYWHRect(px - r, py - r * 0.65, r * 2, r * 1.3), rad(px - r * 0.3, py - r * 0.4, r * 1.5, ['#F4EFE6', col], [0, 1]));
  }
}

function pips(c: SkCanvas, left: number) {
  // Plate with three durability bars (filled = remaining).
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(27, 86, 46, 11), 5.5, 5.5), fill('#2F3F35', 0.78));
  for (let i = 0; i < 3; i++) {
    const on = i >= 3 - left;
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(31 + i * 13.5, 89, 11, 5), 2.5, 2.5), fill(on ? '#F7C65A' : '#FFFFFF', on ? 1 : 0.25));
  }
}

/** One resource obstacle at a given stage (0 = whole … 2 = mostly broken). */
export function drawResource(c: SkCanvas, kind: ResourceKind, stage: number): void {
  const left = 3 - stage;
  // Keep the same log pile artwork for the last two stages; only the durability pips change.
  if (kind === 'wood' && stage === 2) stage = 1;
  const x = 50;
  const y = 84;
  const seed = kind.length * 31 + stage;
  shadow(c, x, y, 36 - stage * 5, 8, 0.25);
  switch (kind) {
    case 'stone':
      if (stage === 0) sprite(c, 'prop_rock', x, y + 4, 96);
      else if (stage === 1) {
        sprite(c, 'prop_rock', x, y + 4, 86);
        cracks(c, x, y, 1.1, 2, seed);
        rubble(c, x, y, 1, seed, '#9C958A', 5);
      } else {
        sprite(c, 'prop_rock_small', x - 4, y + 4, 66);
        cracks(c, x - 4, y + 6, 0.8, 1, seed);
        rubble(c, x, y, 1.1, seed, '#9C958A', 9);
      }
      break;
    case 'wood':
      if (stage === 0) {
        sprite(c, 'prop_logs', x, y + 2, 92);
        sprite(c, 'item_wood_4', x + 8, y - 18, 46);
      } else if (stage === 1) {
        sprite(c, 'prop_logs', x, y + 2, 84);
        cracks(c, x + 6, y + 4, 0.7, 1, seed);
      } else {
        sprite(c, 'item_wood_3', x - 2, y + 2, 60);
        rubble(c, x, y, 1, seed, '#B98A58', 8);
      }
      break;
    case 'ceramic':
      if (stage === 0) {
        sprite(c, 'item_ceramic_6', x - 14, y, 52);
        sprite(c, 'item_ceramic_4', x + 16, y, 46);
        sprite(c, 'item_ceramic_5', x + 2, y - 18, 48);
      } else if (stage === 1) {
        sprite(c, 'item_ceramic_6', x - 12, y, 50);
        sprite(c, 'item_ceramic_4', x + 16, y, 44);
        rubble(c, x, y, 1, seed, '#D98B5F', 6);
      } else {
        sprite(c, 'item_ceramic_3', x, y, 50);
        rubble(c, x, y, 1.1, seed, '#D98B5F', 10);
      }
      break;
    case 'shell':
      c.drawOval(Skia.XYWHRect(x - 40, y - 12, 80, 20), rad(x, y - 2, 42, ['#F5E6C4', '#E6D2A6'], [0, 1], [1, 0.3]));
      if (stage === 0) {
        sprite(c, 'item_shell_6', x - 14, y, 50);
        sprite(c, 'item_shell_4', x + 18, y, 42);
        sprite(c, 'item_shell_5', x + 2, y - 20, 46);
      } else if (stage === 1) {
        sprite(c, 'item_shell_6', x - 10, y, 50);
        sprite(c, 'item_shell_3', x + 18, y, 38);
      } else {
        sprite(c, 'item_shell_4', x, y, 46);
        rubble(c, x, y, 0.9, seed, '#F2C9B8', 7);
      }
      break;
    case 'crystal':
      if (stage === 0) {
        sprite(c, 'prop_rock_small', x, y + 4, 80);
        sprite(c, 'item_crystal_6', x - 10, y - 10, 46);
        sprite(c, 'item_crystal_5', x + 14, y - 6, 40);
        sprite(c, 'item_crystal_4', x + 2, y - 26, 36);
      } else if (stage === 1) {
        sprite(c, 'prop_rock_small', x, y + 4, 74);
        sprite(c, 'item_crystal_6', x - 8, y - 10, 44);
        sprite(c, 'item_crystal_4', x + 14, y - 6, 34);
      } else {
        sprite(c, 'prop_rock_small', x, y + 4, 62);
        sprite(c, 'item_crystal_4', x, y - 10, 34);
        rubble(c, x, y, 1, seed, '#B9A3E3', 6);
      }
      c.drawCircle(x + 10, y - 44, 12, rad(x + 10, y - 44, 12, ['#FFFFFF', '#CDB9F2'], [0, 1], [0.6, 0]));
      break;
  }
  pips(c, left);
}
