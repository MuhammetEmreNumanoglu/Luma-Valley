// Recolours one tonal band of a sprite (decor variants) into a cached image. Rendering code only:
// it reads the art and the chosen variant, never game state. The image is built once per
// (sprite, variant) on a CPU surface, so it works the same on web and device.
import { FilterMode, MipmapMode, Skia, TileMode, type SkImage } from '@shopify/react-native-skia';

import type { DecorStyle } from '../content/decor';

const SKSL = `
uniform shader image;
uniform float center;
uniform float width;
uniform float sat;
uniform float neutral;
uniform float3 ref;
uniform float3 tgt;

float3 rgb2hsv(float3 c) {
  float4 K = float4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  float4 p = mix(float4(c.bg, K.wz), float4(c.gb, K.xy), step(c.b, c.g));
  float4 q = mix(float4(p.xyw, c.r), float4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return float3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
}

float3 hsv2rgb(float3 c) {
  float4 K = float4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  float3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

half4 main(float2 xy) {
  half4 col = image.eval(xy);
  float a = col.a;
  if (a < 0.004) return col;
  float3 rgb = col.rgb / a;
  float3 hsv = rgb2hsv(rgb);
  float w;
  float s;
  if (neutral > 0.5) {
    w = clamp((sat - hsv.y) / 0.06, 0.0, 1.0) * clamp((hsv.z - 0.4) / 0.1, 0.0, 1.0);
    s = tgt.y;
  } else {
    float dist = abs(fract(hsv.x - center + 0.5) - 0.5);
    w = clamp((width - dist) / (width * 0.35), 0.0, 1.0) * clamp((hsv.y - sat) / 0.1, 0.0, 1.0);
    s = clamp(hsv.y * tgt.y / max(ref.y, 0.001), 0.0, 1.0);
  }
  float3 n = hsv2rgb(float3(tgt.x, s, clamp(hsv.z * tgt.z / max(ref.z, 0.001), 0.0, 1.0)));
  return half4(mix(rgb, n, w) * a, a);
}`;

let effect: ReturnType<typeof Skia.RuntimeEffect.Make> | undefined;
const cache = new Map<string, SkImage | null>();

function hsv(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [((h / 6) + 1) % 1, max ? d / max : 0, max];
}

/** `img` with the style's band moved to swatch `variant`; the original for variant 0 or on failure. */
export function recolored(key: string, img: SkImage, style: DecorStyle | undefined, variant: number): SkImage {
  if (!style || variant <= 0 || variant >= style.swatches.length) return img;
  const id = `${key}#${variant}`;
  const hit = cache.get(id);
  if (hit !== undefined) return hit ?? img;
  let out: SkImage | null = null;
  try {
    if (effect === undefined) effect = Skia.RuntimeEffect.Make(SKSL);
    const w = img.width(), h = img.height();
    const surface = effect ? Skia.Surface.Make(w, h) : null;
    if (effect && surface) {
      const ref = hsv(style.swatches[0]), tgt = hsv(style.swatches[variant]);
      const uniforms = [style.hue / 360, style.width / 360, style.minSat, style.neutral ? 1 : 0, ...ref, ...tgt];
      const paint = Skia.Paint();
      paint.setShader(effect.makeShaderWithChildren(uniforms, [img.makeShaderOptions(TileMode.Decal, TileMode.Decal, FilterMode.Nearest, MipmapMode.None)]));
      const c = surface.getCanvas();
      c.clear(Skia.Color('transparent'));
      c.drawRect(Skia.XYWHRect(0, 0, w, h), paint);
      surface.flush();
      out = surface.makeImageSnapshot();
      const nt = (out as unknown as { makeNonTextureImage?: () => SkImage }).makeNonTextureImage;
      if (nt) out = nt.call(out) ?? out;
    }
  } catch {
    out = null;
  }
  cache.set(id, out);
  return out ?? img;
}
