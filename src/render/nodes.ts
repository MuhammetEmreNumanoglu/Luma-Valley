// Valley buildings on the map (greenhouse, orchard, barn…), drawn with the same isometric
// sprites as the rest of the world. Pure drawing from a small view; never touches game state.
import { FilterMode, MipmapMode, Skia, type SkCanvas, type SkPaint } from '@shopify/react-native-skia';

import { artImage, fadePaint } from '../art/art';
import type { NodeDef } from '../content/valley';
import { hash01 } from '../core/rng';
import { blob, blossom, fill, lin, line, rad, shadow } from './kit';

export type NodeLook = 'locked' | 'unbuilt' | 'idle' | 'running' | 'ready' | 'depleted';

export interface NodeView {
  def: NodeDef;
  look: NodeLook;
}

/** Draws sprite `id` with its bottom-centre at (x, y), `w` map units wide. */
function sprite(c: SkCanvas, id: string, x: number, y: number, w: number, paint?: SkPaint, sink = 0.08): boolean {
  const img = artImage(id);
  if (!img) return false;
  const k = w / img.width();
  const h = img.height() * k;
  c.drawImageRectOptions(img, Skia.XYWHRect(0, 0, img.width(), img.height()), Skia.XYWHRect(x - w / 2, y - h * (1 - sink), w, h), FilterMode.Linear, MipmapMode.None, paint ?? Skia.Paint());
  return true;
}

function lockBadge(c: SkCanvas, x: number, y: number) {
  c.drawCircle(x, y, 13, fill('#FFFFFF', 0.92));
  c.drawCircle(x, y, 13, line('#C9B9A0', 1.5));
  if (!sprite(c, 'icon_lock', x, y + 9, 18, undefined, 0)) c.drawRect(Skia.XYWHRect(x - 5, y - 4, 10, 8), fill('#8E7E66'));
}

/** Map footprint used by taps and scenery avoidance (region-local map units). */
export function nodeBox(def: NodeDef): { x: number; y: number; w: number; h: number } {
  const w = 78 * def.s;
  const h = 76 * def.s;
  return { x: def.x - w / 2, y: def.y - h, w, h: h + 10 };
}

export function drawNode(c: SkCanvas, v: NodeView): void {
  const { def } = v;
  const { x, y, s } = def;
  const faded = v.look === 'locked' ? fadePaint(0.7) : v.look === 'unbuilt' ? fadePaint(0.45) : undefined;
  shadow(c, x, y + 2, 36 * s, 9 * s, 0.22);
  c.drawOval(Skia.XYWHRect(x - 44 * s, y - 12 * s, 88 * s, 24 * s), rad(x, y, 46 * s, ['#E2CC9C', '#E2CC9C'], [0, 1], [0.8, 0]));
  // Retired farm imagery is changed only on the map; node IDs and outputs remain intact.
  const displayProducer = def.kind === 'barn' || def.kind === 'field' ? 'greenhouse' : def.producer ?? 'field';
  sprite(c, `producer_${displayProducer}`, x, y + 6 * s, 84 * s, faded, 0.14);
  if (v.look === 'locked') lockBadge(c, x + 26 * s, y - 62 * s);
}
