// The valley map: layered ground, water, paths, scattered nature and the structures, per
// region. Pure function of a small "view" of the save, recorded to a picture (and rasterised)
// only when that view changes. Faded colours come back as the region is restored.
import { DECOR_STYLE } from '../content/decor';
import { Skia, TileMode, type SkCanvas } from '@shopify/react-native-skia';

import type { DecorationDef } from '../content/decorations';
import { MAP_W, REGION_H, type RegionDef, type StructureDef } from '../content/regions';
import { hash01 } from '../core/rng';
import { blob, blossom, ball, color, curve, fade, fill, glow, leaf, lin, line, rad, shade, shadow, sparkle, type Pt } from './kit';
import { anchoredRect, drawArtAnchored, fadePaint } from '../art/art';
import { BIOME_TREES, decorationArtId, PROP_SCALE, PROP_SMALL, structureArtId, STRUCTURE_SCALE, STRUCTURE_SCALE_DEFAULT } from '../art/ids';
import { drawNode, nodeBox, type NodeView } from './nodes';
import { drawQuestMarker, drawStructure } from './structures';

export interface RegionView {
  unlocked: boolean;
  vitality: number;
  stages: Record<string, number>;
  totals: Record<string, number>;
  decor: Record<string, number>;
  /** Structures with an available quest: true = can complete now. */
  markers: Record<string, boolean>;
  quality: 'high' | 'low';
  /** Owned decorations in this region. */
  decorations?: DecorationDef[];
  /** Valley sources (rocks, trees, clay beds, veins, buildings). */
  nodes?: NodeView[];
}

const W = MAP_W;
const H = REGION_H;

function f(hex: string, v: number) {
  return fade(hex, Math.max(0, 0.42 * (1 - v)));
}

function tree(c: SkCanvas, x: number, y: number, s: number, cols: [string, string, string], v: number, kind: 'round' | 'pine' | 'tall') {
  shadow(c, x, y, 16 * s, 5 * s, 0.18);
  c.drawRect(Skia.XYWHRect(x - 2.5 * s, y - 16 * s, 5 * s, 16 * s), fill(f('#7A5232', v)));
  if (kind === 'pine') {
    for (let i = 0; i < 3; i++) {
      const top = y - 22 * s - i * 11 * s;
      c.drawPath(blob([[x - (16 - i * 4) * s, top + 12 * s], [x, top - 12 * s], [x + (16 - i * 4) * s, top + 12 * s]], 0.4), lin(0, top - 12 * s, 0, top + 12 * s, [f(cols[0], v), f(cols[2], v)]));
    }
    return;
  }
  const rx = (kind === 'tall' ? 11 : 16) * s;
  const ry = (kind === 'tall' ? 24 : 16) * s;
  const cy = y - 16 * s - ry * 0.8;
  c.drawPath(
    blob([[x - rx, cy + ry * 0.3], [x - rx * 0.8, cy - ry * 0.6], [x, cy - ry], [x + rx * 0.8, cy - ry * 0.6], [x + rx, cy + ry * 0.3], [x, cy + ry * 0.75]]),
    rad(x - rx * 0.35, cy - ry * 0.4, rx * 1.8, [f(cols[0], v), f(cols[1], v), f(cols[2], v)], [0, 0.5, 1]),
  );
}

/**
 * A tiny, deliberately inexpensive material pass. It breaks up the perfectly flat
 * procedurally generated ground without turning the cached map into a texture-heavy
 * scene. The dots are seeded, so a saved valley always has the same character.
 */
function meadowTexture(c: SkCanvas, seed: number, vitality: number, quality: RegionView['quality']) {
  const count = quality === 'high' ? 74 : 28;
  for (let i = 0; i < count; i++) {
    const x = hash01(seed + i, 81) * W;
    const y = hash01(seed + i, 82) * H;
    const r = 5 + hash01(seed + i, 83) * 12;
    const warm = i % 3 === 0;
    c.drawOval(
      Skia.XYWHRect(x - r, y - r * 0.28, r * 2, r * 0.56),
      rad(x - r * 0.3, y - r * 0.12, r * 1.25, [warm ? '#FFF8D7' : '#D9F0B5', warm ? '#F4D89B' : '#94C878'], [0, 1], [0.09 * vitality, 0]),
    );
  }
}

/** Warm, upper-left key light and a restrained lower vignette give every biome the same 2.5D lens. */
function cinematicLight(c: SkCanvas, vitality: number) {
  c.drawCircle(74, 110, 270, rad(74, 110, 270, ['#FFF8D6', '#FFF8D6'], [0, 1], [0.22 * vitality, 0]));
  const veil = Skia.Paint();
  veil.setShader(Skia.Shader.MakeLinearGradient(Skia.Point(0, H * 0.68), Skia.Point(0, H), [color('#36513D', 0), color('#36513D', 0.09 * vitality)], [0, 1], TileMode.Clamp));
  c.drawRect(Skia.XYWHRect(0, H * 0.68, W, H * 0.32), veil);
}

function bush(c: SkCanvas, x: number, y: number, s: number, hex: string, v: number, flowers: string | null) {
  c.drawPath(blob([[x - 12 * s, y], [x - 9 * s, y - 9 * s], [x, y - 12 * s], [x + 9 * s, y - 9 * s], [x + 12 * s, y]]), lin(0, y - 12 * s, 0, y, [f(shade(hex, 0.25), v), f(shade(hex, -0.2), v)]));
  if (flowers && v > 0.25) for (let i = 0; i < 3; i++) c.drawCircle(x - 6 * s + i * 6 * s, y - 7 * s - (i % 2) * 3 * s, 2 * s, fill(flowers));
}

function rock(c: SkCanvas, x: number, y: number, s: number, v: number) {
  c.drawPath(blob([[x - 10 * s, y], [x - 7 * s, y - 7 * s], [x + 4 * s, y - 9 * s], [x + 10 * s, y - 2 * s], [x + 6 * s, y + 2 * s]]), lin(0, y - 9 * s, 0, y + 2 * s, [f('#C9C3B7', v), f('#8E877A', v)]));
}

/** Small decorations bought in the Market (drawn at their ground point). */
export function drawDecoration(c: SkCanvas, d: DecorationDef) {
  const { x, y } = d;
  if (d.kind === 'pond') {
    c.drawOval(Skia.XYWHRect(x - 26, y - 10, 52, 20), lin(0, y - 10, 0, y + 10, ['#B7B0A3', '#8E877A']));
    c.drawOval(Skia.XYWHRect(x - 22, y - 8, 44, 15), rad(x, y, 24, ['#BFF2EE', '#5FB3D3'], [0, 1]));
  }
  if (drawArtAnchored(c, decorationArtId(d.kind), x, y, d.kind === 'pond' ? 26 : PROP_SCALE)) return;
  switch (d.kind) {
    case 'bench':
      shadow(c, x, y, 20, 4);
      c.drawRRect(Skia.RRectXY(Skia.XYWHRect(x - 18, y - 12, 36, 5), 2, 2), lin(0, y - 12, 0, y - 7, ['#C99A62', '#8E5A2E']));
      c.drawRRect(Skia.RRectXY(Skia.XYWHRect(x - 18, y - 22, 36, 4), 2, 2), fill('#B07A4A'));
      for (const dx of [-14, 12]) c.drawRect(Skia.XYWHRect(x + dx, y - 22, 3, 22), fill('#5E4A3E'));
      break;
    case 'lamp':
      shadow(c, x, y, 8, 3);
      c.drawRect(Skia.XYWHRect(x - 2, y - 44, 4, 44), fill('#3E3630'));
      glow(c, x, y - 48, 22, '#FFD27A', 0.6);
      ball(c, x, y - 48, 6, '#FFE9A8', 0);
      break;
    case 'planter':
      shadow(c, x, y, 16, 4);
      c.drawRRect(Skia.RRectXY(Skia.XYWHRect(x - 14, y - 14, 28, 14), 3, 3), lin(0, y - 14, 0, y, ['#D47B4E', '#9A5232']));
      for (let i = 0; i < 5; i++) blossom(c, x - 10 + i * 5, y - 17 - (i % 2) * 4, 3, 5, ['#EE8FB0', '#F6C443', '#B9A3E3'][i % 3], '#F6C443', i);
      break;
    case 'banner':
      shadow(c, x, y, 14, 3);
      for (const dx of [-14, 14]) c.drawRect(Skia.XYWHRect(x + dx - 1.5, y - 50, 3, 50), fill('#7A5232'));
      c.drawPath(curve([[x - 14, y - 46], [x, y - 40], [x + 14, y - 46]]), line('#8E5A2E', 1.5));
      for (let i = 0; i < 5; i++) {
        const fx = x - 11 + i * 5.5;
        const b = Skia.PathBuilder.Make();
        b.moveTo(fx - 2.5, y - 45 + Math.abs(i - 2) * -1.2);
        b.lineTo(fx + 2.5, y - 45 + Math.abs(i - 2) * -1.2);
        b.lineTo(fx, y - 38);
        b.close();
        c.drawPath(b.detach(), fill(['#E8644A', '#F2B544', '#7FA7C9', '#6FAE52', '#EE8FB0'][i]));
      }
      break;
    case 'pond':
      c.drawOval(Skia.XYWHRect(x - 26, y - 10, 52, 20), lin(0, y - 10, 0, y + 10, ['#B7B0A3', '#8E877A']));
      c.drawOval(Skia.XYWHRect(x - 22, y - 8, 44, 15), rad(x, y, 24, ['#BFF2EE', '#5FB3D3'], [0, 1]));
      c.drawOval(Skia.XYWHRect(x - 6, y - 4, 10, 4), fill('#5E9A6E'));
      blossom(c, x + 8, y - 1, 3, 5, '#F7C9DC', '#F6C443');
      break;
  }
}

interface Drawable {
  y: number;
  draw: () => void;
}

const BIOME = {
  meadow: { trees: [['#9BD47A', '#6FAE52', '#3E7A2E']], kinds: ['round', 'round', 'tall'], density: 26, bush: '#6FAE52', flower: '#EE8FB0' },
  village: { trees: [['#B5D97A', '#8FB85A', '#5A8A3E'], ['#9BD47A', '#6FAE52', '#3E7A2E']], kinds: ['round', 'tall'], density: 18, bush: '#7FA85A', flower: '#F6C443' },
  harbor: { trees: [['#A8D08A', '#7FAE6A', '#4E7A4A']], kinds: ['tall', 'round'], density: 12, bush: '#8FAE6A', flower: '#F2C9B8' },
  forest: { trees: [['#F6A86E', '#E0663A', '#A8382E'], ['#F2C46E', '#E09A3E', '#A8642E'], ['#9BD47A', '#6FAE52', '#3E7A2E']], kinds: ['round', 'pine', 'tall'], density: 46, bush: '#C8783E', flower: '#F2B544' },
  hills: { trees: [['#A8C88A', '#7FA86A', '#4E7A4A']], kinds: ['pine', 'round'], density: 10, bush: '#8FA878', flower: '#B9A3E3' },
  lake: { trees: [['#6E9EC8', '#4E7AA8', '#2E4E7A'], ['#7EA88E', '#4E7A6E', '#2E4E4A']], kinds: ['tall', 'pine'], density: 16, bush: '#4E7A6E', flower: '#9FE6E0' },
  garden: { trees: [['#F7C9DC', '#E98AA8', '#B85A7A'], ['#C8F0B0', '#8FD47A', '#4E9A4E']], kinds: ['round', 'tall'], density: 24, bush: '#7FB98A', flower: '#E9A6E0' },
} as const;

/** Main path through the region (structure order top → bottom). */
function pathPoints(r: RegionDef): Pt[] {
  const pts: Pt[] = [[W / 2, 0]];
  const sorted = [...r.structures].sort((a, b) => a.y - b.y);
  sorted.forEach((s, i) => pts.push([W / 2 + (s.x - W / 2) * 0.35 + (i % 2 ? 18 : -18), s.y + 30]));
  pts.push([W / 2, H]);
  return pts;
}

/** Points every `step` units along the polyline through `pts` (cheap path sampling for decor). */
function sampleCurve(pts: Pt[], step: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    for (let d = 0; d < len; d += step) out.push([x0 + ((x1 - x0) * d) / len, y0 + ((y1 - y0) * d) / len]);
  }
  return out;
}

export function drawRegion(c: SkCanvas, r: RegionDef, v: RegionView, time = 0): void {
  const vit = v.unlocked ? v.vitality : 0;
  const biome = BIOME[r.biome];
  const seed = r.id * 1000;
  // Ground
  c.drawRect(Skia.XYWHRect(0, 0, W, H), lin(0, 0, 0, H, [f(r.ground[0], vit), f(r.ground[1], vit), f(shade(r.ground[1], -0.08), vit)], [0, 0.6, 1]));
  // Soft light pools
  for (let i = 0; i < 5; i++) {
    const x = hash01(seed + i, 1) * W;
    const y = hash01(seed + i, 2) * H;
    c.drawCircle(x, y, 120, rad(x, y, 120, [shade(r.ground[0], 0.25), r.ground[0]], [0, 1], [0.35 * (0.4 + vit * 0.6), 0]));
  }
  // Ground variation: large soft patches of lighter/darker turf, then biome-specific floor detail.
  const patches = v.quality === 'high' ? 34 : 16;
  for (let i = 0; i < patches; i++) {
    const x = hash01(seed + i, 41) * W;
    const y = hash01(seed + i, 42) * H;
    const rr = 40 + hash01(seed + i, 43) * 70;
    const dark = i % 3 === 0;
    const col = f(shade(r.ground[1], dark ? -0.16 : 0.12), vit);
    c.drawOval(Skia.XYWHRect(x - rr, y - rr * 0.55, rr * 2, rr * 1.1), rad(x, y, rr, [col, col], [0, 1], [dark ? 0.35 : 0.3, 0]));
  }
  meadowTexture(c, seed, vit, v.quality);
  const floor = r.biome === 'forest' ? ['#D9844A', '#C9583A', '#E0A63E'] : r.biome === 'garden' ? ['#F2A8C8', '#FFFFFF', '#E9A6E0'] : r.biome === 'hills' ? ['#B8B2A6', '#9AA3A8'] : r.biome === 'harbor' ? ['#F2E3B8', '#E9D3A0'] : ['#F6E27A', '#FFFFFF', '#EE8FB0'];
  const specks = v.quality === 'high' ? 260 : 110;
  for (let i = 0; i < specks; i++) {
    const x = hash01(seed + i, 51) * W;
    const y = hash01(seed + i, 52) * H;
    const k = hash01(seed + i, 53);
    if (k < 0.62) {
      // grass tuft: three blades with a light tip
      const g = f(shade(r.ground[1], -0.22), vit);
      const lt = f(shade(r.ground[0], 0.18), vit);
      c.drawLine(x, y, x - 2.6, y - 6.5, line(g, 1.6, 0.7));
      c.drawLine(x, y, x + 0.2, y - 8, line(g, 1.6, 0.7));
      c.drawLine(x, y, x + 2.8, y - 6, line(g, 1.6, 0.7));
      c.drawLine(x + 0.2, y - 6, x + 0.2, y - 8, line(lt, 1.2, 0.6));
    } else if (k < 0.8) {
      const col = f(floor[i % floor.length], vit);
      c.drawCircle(x, y, 1.6 + k, fill(col, 0.55 + vit * 0.35));
    } else {
      c.drawOval(Skia.XYWHRect(x - 3, y - 1.5, 6, 3), fill(f('#8E877A', vit), 0.35));
    }
  }
  // Water features
  if (r.biome === 'harbor') {
    const sea = blob([[290, 170], [W + 40, 120], [W + 40, 960], [330, 920], [290, 700], [270, 470]], 0.8);
    c.drawPath(blob([[275, 160], [W + 40, 110], [W + 40, 975], [318, 935], [276, 700], [256, 470]], 0.8), fill(f('#F2E3B8', vit)));
    c.drawPath(sea, lin(270, 0, W, 0, [f(shade(r.water, 0.25), vit), f(r.water, vit), f(shade(r.water, -0.25), vit)]));
    for (let i = 0; i < 18; i++) {
      const y = 200 + i * 42;
      c.drawPath(curve([[310, y], [325, y - 4], [340, y]]), line('#FFFFFF', 1.6, 0.4));
    }
  }
  if (r.biome === 'lake') {
    const lake = blob([[150, 250], [250, 230], [300, 300], [270, 450], [180, 480], [120, 400]]);
    c.drawPath(blob([[140, 238], [255, 216], [314, 296], [282, 464], [178, 496], [106, 404]]), fill(f('#E6D3A8', vit)));
    c.drawPath(blob([[145, 244], [252, 223], [307, 298], [276, 457], [179, 488], [113, 402]]), fill(f('#B8A47E', vit), 0.7));
    c.drawPath(lake, rad(210, 350, 160, [f('#5E8FC8', vit), f(r.water, vit), f('#24406E', vit)], [0, 0.6, 1]));
    for (let i = 0; i < 7; i++) {
      const x = 150 + hash01(i, 77) * 130;
      const y = 280 + hash01(i, 78) * 160;
      c.drawOval(Skia.XYWHRect(x - 8, y - 3, 16, 6), fill(f('#5E9A6E', vit)));
      if (vit > 0.3) c.drawCircle(x + 3, y - 2, 2.4, fill('#F7C9DC'));
    }
  }
  if (r.biome === 'meadow' || r.biome === 'village') {
    // Stream from the hills to the river
    const pts: Pt[] = r.biome === 'meadow' ? [[-10, 640], [60, 660], [70, 720], [130, 790], [170, 880], [140, 960], [120, 1010]] : [[W + 10, 300], [360, 340], [380, 420], [W + 10, 470]];
    c.drawPath(curve(pts), line(f('#E6D3A8', vit), 30, 0.9));
    c.drawPath(curve(pts), line(f('#B8A47E', vit), 23, 0.6));
    c.drawPath(curve(pts), line(f(shade(r.water, -0.15), vit), 20));
    c.drawPath(curve(pts), line(f(r.water, vit), 14));
    c.drawPath(curve(pts), line(f(shade(r.water, 0.25), vit), 6, 0.6));
    c.drawPath(curve(pts), line('#FFFFFF', 2, 0.35));
  }
  // River / wall at the bottom edge (bridge or gate sits on it)
  const bottomType = r.structures.find((s) => s.y > 980)?.type;
  if (bottomType === 'bridge') {
    c.drawRect(Skia.XYWHRect(0, 990, W, 50), lin(0, 990, 0, 1040, [f(shade(r.water, 0.15), vit), f(shade(r.water, -0.2), vit)]));
    c.drawPath(curve([[0, 988], [W / 2, 984], [W, 990]]), line(f('#8E7E5A', vit), 4, 0.5));
    for (let i = 0; i < 10; i++) c.drawPath(curve([[i * 44, 1012], [i * 44 + 14, 1008], [i * 44 + 28, 1012]]), line('#FFFFFF', 1.6, 0.45));
  }
  // Paths: soft verge, packed-earth bed, lighter tread, then pebbles / cobbles by biome.
  const pp = pathPoints(r);
  const cobble = r.biome === 'village' || r.biome === 'hills' || r.biome === 'garden';
  c.drawPath(curve(pp), line(f(shade(r.ground[1], -0.2), vit), 30, 0.35));
  c.drawPath(curve(pp), line(f(cobble ? '#B5AA98' : '#B8925E', vit), 24, 0.95));
  c.drawPath(curve(pp), line(f(cobble ? '#D8CFC0' : '#E2C796', vit), 17, 0.95));
  c.drawPath(curve(pp), line(f(cobble ? '#E8E1D4' : '#EED9AE', vit), 7, 0.6));
  {
    const pts = sampleCurve(pp, 7);
    pts.forEach(([x, y], i) => {
      const k = hash01(seed + i, 61);
      const dx = (k - 0.5) * 14, dy = (hash01(seed + i, 62) - 0.5) * 6;
      if (cobble) {
        const w = 7 + k * 4;
        c.drawRRect(Skia.RRectXY(Skia.XYWHRect(x + dx - w / 2, y + dy - 2.5, w, 5), 2.5, 2.5), fill(f('#A89C88', vit), 0.55));
        c.drawRRect(Skia.RRectXY(Skia.XYWHRect(x + dx - w / 2, y + dy - 3, w, 4), 2, 2), fill(f('#EEE7DA', vit), 0.7));
      } else if (k > 0.55) c.drawOval(Skia.XYWHRect(x + dx - 2, y + dy - 1.2, 4, 2.4), fill(f('#9A7A50', vit), 0.5));
    });
  }
  // Ground pads under structures: trodden earth / paving, plus a soft contact shadow.
  for (const st of r.structures) {
    const total = v.totals[st.id] ?? 1;
    const kk = Math.min(1, (v.stages[st.id] ?? 0) / total);
    const rc = structureRect(st, kk);
    const rx = Math.min(80, (rc ? rc.w * 0.45 : 50 * st.s));
    if (st.type === 'bridge' || st.type === 'boat' || st.type === 'dock') continue;
    const padCol = kk >= 1 ? (cobble ? '#D9D0C0' : '#E2CC9C') : '#C9B48E';
    c.drawOval(Skia.XYWHRect(st.x - rx * 1.15, st.y - rx * 0.42, rx * 2.3, rx * 0.84), rad(st.x, st.y, rx * 1.15, [f(padCol, vit), f(padCol, vit)], [0, 1], [0.85, 0]));
    shadow(c, st.x + rx * 0.08, st.y + 2, rx * 0.95, rx * 0.26, 0.2);
  }
  // Shared upper-left sunlight makes the separate biomes read as one cohesive 2.5D world.
  cinematicLight(c, vit);
  // Nature + structures, depth sorted
  const items: Drawable[] = [];
  const fade = fadePaint(0.75 * (1 - vit));
  const near = (x: number, y: number) =>
    r.structures.some((s) => Math.abs(s.x - x) < 70 * s.s && y > s.y - 120 * s.s && y < s.y + 30) ||
    (v.nodes ?? []).some((nv) => { const b = nodeBox(nv.def); return x > b.x - 26 && x < b.x + b.w + 26 && y > b.y - 10 && y < b.y + b.h + 90; }) ||
    pp.some(([px, py]) => Math.abs(px - x) < 22 && Math.abs(py - y) < 60) ||
    (r.biome === 'harbor' && x > 260 && y > 140 && y < 980) ||
    (r.biome === 'lake' && x > 110 && x < 310 && y > 220 && y < 490) ||
    y > 960;
  const n = v.quality === 'high' ? biome.density : Math.ceil(biome.density * 0.6);
  for (let i = 0; i < n * 3 && items.length < n; i++) {
    const x = 10 + hash01(seed + i, 11) * (W - 20);
    const y = 30 + hash01(seed + i, 12) * (H - 60);
    if (near(x, y)) continue;
    const s = 0.8 + hash01(seed + i, 13) * 0.6;
    const cols = biome.trees[i % biome.trees.length] as unknown as [string, string, string];
    const kind = biome.kinds[i % biome.kinds.length] as 'round' | 'pine' | 'tall';
    const tid = BIOME_TREES[r.biome][i % BIOME_TREES[r.biome].length];
    items.push({ y, draw: () => drawArtAnchored(c, tid, x, y, PROP_SCALE * s, fade) || tree(c, x, y, s, cols, vit, kind) });
  }
  for (let i = 0; i < n * 2; i++) {
    const x = hash01(seed + i, 21) * W;
    const y = 20 + hash01(seed + i, 22) * (H - 40);
    if (near(x, y)) continue;
    const kind = hash01(seed + i, 23);
    const sk = 0.7 + kind * 0.5;
    if (kind < 0.45) {
      const pid = kind < 0.2 ? (vit > 0.3 ? PROP_SMALL.bushFlower : PROP_SMALL.bush) : kind < 0.32 ? PROP_SMALL.bushLarge : r.biome === 'forest' && kind < 0.4 ? PROP_SMALL.mushrooms : PROP_SMALL.bush;
      items.push({ y, draw: () => drawArtAnchored(c, pid, x, y, PROP_SCALE * sk, fade) || bush(c, x, y, 0.8 + kind, biome.bush, vit, kind < 0.25 ? biome.flower : null) });
    } else if (kind < 0.6) {
      const pid = kind < 0.5 ? PROP_SMALL.rockSmall : kind < 0.55 ? PROP_SMALL.rock : r.biome === 'forest' || r.biome === 'hills' ? PROP_SMALL.stump : PROP_SMALL.grass;
      items.push({ y, draw: () => drawArtAnchored(c, pid, x, y, PROP_SCALE * sk * 0.8, fade) || rock(c, x, y, 0.7 + kind * 0.6, vit) });
    } else if (vit > 0.15) {
      const cnt = Math.round(vit * 4);
      items.push({ y, draw: () => drawArtAnchored(c, PROP_SMALL.flowers, x, y, PROP_SCALE * (0.6 + vit * 0.4)) || (() => { for (let k = 0; k < cnt; k++) blossom(c, x + k * 7, y - (k % 2) * 4, 2.6, 5, biome.flower, '#F6C443', k); })() });
    } else {
      items.push({ y, draw: () => drawArtAnchored(c, PROP_SMALL.grass, x, y, PROP_SCALE * 0.7, fade) });
    }
  }
  for (const s of r.structures) {
    const total = v.totals[s.id] ?? 1;
    const k = Math.min(1, (v.stages[s.id] ?? 0) / total);
    // Keep the saved structure and quest IDs, while presenting old barns as garden cottages.
    const display = s.type === 'barn' ? { ...s, type: 'cottage' as const } : s;
    const decor = s.decor ? { style: DECOR_STYLE[display.type], variant: v.decor[s.id] ?? 0 } : undefined;
    items.push({ y: s.y, draw: () => drawArtAnchored(c, structureArtId(display.type, k, display.v ?? 0), display.x, display.y, structureUnits(display), undefined, decor) || drawStructure(c, display, { k, decor: v.decor[s.id] ?? 0, v: display.v ?? 0, region: r.id }) });
  }
  for (const d of v.decorations ?? []) items.push({ y: d.y, draw: () => drawDecoration(c, d) });
  for (const nv of v.nodes ?? []) items.push({ y: nv.def.y, draw: () => drawNode(c, nv) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
  // Mist over a faded region
  if (vit < 1) c.drawRect(Skia.XYWHRect(0, 0, W, H), fill('#E9DFF2', 0.08 * (1 - vit)));
  // Quest markers on top
  for (const s of r.structures) {
    if (!(s.id in v.markers)) continue;
    const b = structureRect(s, Math.min(1, (v.stages[s.id] ?? 0) / (v.totals[s.id] ?? 1)));
    drawQuestMarker(c, s.x, Math.max(16, (b ? b.y + 6 : s.y - 100 * s.s) - 8), v.markers[s.id]);
  }
  void time;
}

function structureUnits(s: StructureDef): number {
  return (STRUCTURE_SCALE[s.type] ?? STRUCTURE_SCALE_DEFAULT) * s.s;
}

/** Screen-space box of a structure's sprite (map units, region-local) for markers and taps. */
export function structureRect(s: StructureDef, k: number): { x: number; y: number; w: number; h: number } | null {
  return anchoredRect(structureArtId(s.type, k, s.v ?? 0), s.x, s.y, structureUnits(s));
}

/** Cloud fog for a region that is not yet unlocked. */
export function drawFog(c: SkCanvas, regionId: number): void {
  c.drawRect(Skia.XYWHRect(0, 0, W, H), lin(0, 0, 0, 260, ['#E9E4F2', '#CFC8DE'], null, 1));
  for (let i = 0; i < 26; i++) {
    const x = hash01(regionId * 50 + i, 31) * W;
    const y = hash01(regionId * 50 + i, 32) * H;
    const r = 40 + hash01(regionId * 50 + i, 33) * 60;
    c.drawCircle(x, y, r, rad(x, y - r * 0.3, r, ['#FFFFFF', '#E6E0F0'], [0, 1], [0.9, 0.0]));
  }
  // Soft edge where the fog meets the previous region
  c.drawRect(Skia.XYWHRect(0, 0, W, 80), lin(0, 0, 0, 80, ['#FFFFFF', '#E9E4F2'], null, 0.9));
}

export { ball, glow, sparkle, leaf };
