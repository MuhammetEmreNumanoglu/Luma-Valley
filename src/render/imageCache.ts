// Rasterises vector drawings once into SkImages (GPU textures on device) so screens that redraw
// often (board drag, map scroll) blit images instead of re-running blurs and gradients.
import { Skia, type SkCanvas, type SkImage } from '@shopify/react-native-skia';
import { PixelRatio, Platform } from 'react-native';

const cache = new Map<string, SkImage | null>();

/**
 * Offscreen surface for one rasterisation. On web, `MakeOffscreen` opens a new WebGL context per
 * call; browsers keep only ~16 alive and drop the oldest, which can be the board's own canvas
 * (it then stays white). A CPU raster surface there avoids WebGL entirely.
 */
function offscreen(w: number, h: number) {
  return Platform.OS === 'web' ? Skia.Surface.Make(w, h) : Skia.Surface.MakeOffscreen(w, h);
}

export const DPR = Math.min(2.5, Math.max(1, PixelRatio.get()));

/** Image of a 100×100-unit drawing at `pt` points. */
export function boxImage(key: string, pt: number, draw: (c: SkCanvas) => void): SkImage | null {
  const px = Math.max(8, Math.round(pt * DPR));
  const id = `${key}@${px}`;
  if (cache.has(id)) return cache.get(id) ?? null;
  let img: SkImage | null = null;
  try {
    const surface = offscreen(px, px);
    if (surface) {
      const c = surface.getCanvas();
      c.clear(Skia.Color('transparent'));
      c.scale(px / 100, px / 100);
      draw(c);
      surface.flush();
      img = surface.makeImageSnapshot();
      // Make the snapshot independent of the surface where supported (CPU copy on web).
      const nt = (img as unknown as { makeNonTextureImage?: () => SkImage }).makeNonTextureImage;
      if (nt) img = nt.call(img) ?? img;
    }
  } catch {
    img = null;
  }
  cache.set(id, img);
  return img;
}

/** Image of an arbitrary w×h drawing (world units → pixels via scale). */
export function sceneImage(key: string, w: number, h: number, scale: number, draw: (c: SkCanvas) => void): SkImage | null {
  const pw = Math.round(w * scale);
  const ph = Math.round(h * scale);
  const id = `${key}@${pw}x${ph}`;
  if (cache.has(id)) return cache.get(id) ?? null;
  let img: SkImage | null = null;
  try {
    const surface = offscreen(pw, ph);
    if (surface) {
      const c = surface.getCanvas();
      c.clear(Skia.Color('transparent'));
      c.scale(scale, scale);
      draw(c);
      surface.flush();
      img = surface.makeImageSnapshot();
      const nt = (img as unknown as { makeNonTextureImage?: () => SkImage }).makeNonTextureImage;
      if (nt) img = nt.call(img) ?? img;
    }
  } catch {
    img = null;
  }
  cache.set(id, img);
  // Region images are large; keep only the most recent few.
  const sceneKeys = [...cache.keys()].filter((k) => k.startsWith('region'));
  while (sceneKeys.length > 6) {
    const k = sceneKeys.shift()!;
    cache.delete(k);
  }
  return img;
}
