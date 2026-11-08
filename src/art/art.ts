// Loads the isometric art sprites once into SkImages (offline: they are bundled assets) and
// draws them with their ground anchors. If a sprite is missing or fails to decode, callers fall
// back to the procedural drawing, so the game never shows an empty cell.
import { FilterMode, loadData, MipmapMode, Skia, type SkCanvas, type SkImage, type SkPaint } from '@shopify/react-native-skia';

import { ART_BOUNDS } from './bounds.generated';
import { ART, type ArtSprite } from './registry.generated';

const IMG = new Map<string, SkImage>();
let loaded = false;
let failedIds: string[] = [];

export interface ArtLoadResult {
  loaded: number;
  failed: string[];
}

/** Decode every sprite. Resolves even if some fail (they are reported and skipped). */
export async function preloadArt(): Promise<ArtLoadResult> {
  if (loaded) return { loaded: IMG.size, failed: failedIds };
  const failed: string[] = [];
  await Promise.all(
    Object.entries(ART).map(async ([id, a]) => {
      try {
        const img = await loadData(a.src as never, (d) => Skia.Image.MakeImageFromEncoded(d));
        if (img) IMG.set(id, img);
        else failed.push(id);
      } catch {
        failed.push(id);
      }
    }),
  );
  loaded = true;
  failedIds = failed;
  if (failed.length) console.warn(`[art] ${failed.length} sprites failed to load: ${failed.slice(0, 5).join(', ')}`);
  return { loaded: IMG.size, failed };
}

export function artReady(): boolean {
  return loaded;
}

export function artImage(id: string): SkImage | null {
  return IMG.get(id) ?? null;
}

export function artMeta(id: string): ArtSprite | null {
  return ART[id] ?? null;
}

/** Draw a square sprite (items, producers) into the 100×100 box. Returns false if unavailable. */
export function drawArtBox(c: SkCanvas, id: string, inset = 2, paint?: SkPaint): boolean {
  const img = IMG.get(id);
  if (!img) return false;
  const p = paint ?? Skia.Paint();
  // Contain-fit, centred horizontally and resting near the bottom of the box.
  const box = 100 - inset * 2;
  const f = Math.min(box / img.width(), box / img.height());
  const w = img.width() * f, h = img.height() * f;
  const dst = Skia.XYWHRect(inset + (box - w) / 2, inset + (box - h) * 0.7, w, h);
  c.drawImageRectOptions(img, Skia.XYWHRect(0, 0, img.width(), img.height()), dst, FilterMode.Linear, MipmapMode.None, p);
  return true;
}

/**
 * Like drawArtBox, but crops the sprite's transparent margin first (ART_BOUNDS), so the art itself
 * fills the box. Used for board cells, where the margin made items look small.
 */
export function drawArtFit(c: SkCanvas, id: string, inset = 2, paint?: SkPaint): boolean {
  const img = IMG.get(id);
  if (!img) return false;
  const b = ART_BOUNDS[id];
  if (!b || img.width() !== ART[id]?.w) return drawArtBox(c, id, inset, paint);
  const [sx, sy, sw, sh] = b;
  const box = 100 - inset * 2;
  const f = Math.min(box / sw, box / sh);
  const w = sw * f, h = sh * f;
  const dst = Skia.XYWHRect(inset + (box - w) / 2, inset + (box - h) / 2, w, h);
  c.drawImageRectOptions(img, Skia.XYWHRect(sx, sy, sw, sh), dst, FilterMode.Linear, MipmapMode.None, paint ?? Skia.Paint());
  return true;
}

/** Placement of an anchored sprite: ground point (x, y) and map units per Kenney unit. */
export function anchoredRect(id: string, x: number, y: number, unitsPerKenney: number) {
  const a = ART[id];
  if (!a) return null;
  const k = unitsPerKenney / a.unit;
  return { x: x - a.ax * k, y: y - a.ay * k, w: a.w * k, h: a.h * k };
}

/** Draw an anchored sprite (structures, props). Returns false if unavailable. */
export function drawArtAnchored(c: SkCanvas, id: string, x: number, y: number, unitsPerKenney: number, paint?: SkPaint): boolean {
  const img = IMG.get(id);
  const r = anchoredRect(id, x, y, unitsPerKenney);
  if (!img || !r) return false;
  c.drawImageRectOptions(img, Skia.XYWHRect(0, 0, img.width(), img.height()), Skia.XYWHRect(r.x, r.y, r.w, r.h), FilterMode.Linear, MipmapMode.None, paint ?? Skia.Paint());
  return true;
}

const fadeCache = new Map<number, SkPaint>();
/** Paint that desaturates and lightens toward mist (0 = none, 1 = fully faded). */
export function fadePaint(amount: number): SkPaint | undefined {
  const a = Math.round(Math.max(0, Math.min(1, amount)) * 20) / 20;
  if (a <= 0) return undefined;
  const hit = fadeCache.get(a);
  if (hit) return hit;
  const s = 1 - a * 0.85;
  const lr = 0.3 * (1 - s), lg = 0.59 * (1 - s), lb = 0.11 * (1 - s);
  const lift = 0.1 * a;
  const p = Skia.Paint();
  p.setColorFilter(
    Skia.ColorFilter.MakeMatrix([
      lr + s, lg, lb, 0, lift,
      lr, lg + s, lb, 0, lift,
      lr, lg, lb + s, 0, lift + 0.02 * a,
      0, 0, 0, 1, 0,
    ]),
  );
  fadeCache.set(a, p);
  return p;
}
