// Original procedural 3D models for the five bridge regions of Luma Valley (no third-party
// geometry). Each landmark has three stages: 0 ruin, 1 under repair, 2 restored. Trees and props
// are region-specific. Units: 1 = one Kenney grid cell; origin = ground point under the model.
import * as THREE from 'three';

// ---------------------------------------------------------------- helpers
let SEED = 1;
const rnd = () => { SEED = (SEED * 16807) % 2147483647; return (SEED - 1) / 2147483646; };
const tint = (hex, k) => { // k=0 original, 1 = fully weathered grey-brown
  const c = new THREE.Color(hex); const g = new THREE.Color(0x8a8378);
  return c.lerp(g, k).getHex();
};
let WEATHER = 0;
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color: tint(color, o.keep ? 0 : WEATHER), roughness: o.rough ?? 0.75, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, flatShading: o.flat ?? true, transparent: !!o.opacity, opacity: o.opacity ?? 1 });
const mesh = (g, mat, x = 0, y = 0, z = 0, ry = 0) => { const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; return m; };
const box = (w, h, d, c, x = 0, y = 0, z = 0, o = {}) => mesh(new THREE.BoxGeometry(w, h, d), M(c, o), x, y + h / 2, z, o.ry ?? 0);
const cyl = (r1, r2, h, c, x = 0, y = 0, z = 0, seg = 12, o = {}) => mesh(new THREE.CylinderGeometry(r1, r2, h, seg), M(c, o), x, y + h / 2, z);
const sphere = (r, c, x, y, z, o = {}) => mesh(new THREE.IcosahedronGeometry(r, o.detail ?? 1), M(c, o), x, y, z);
const group = (...o) => { const g = new THREE.Group(); o.flat().forEach(x => x && g.add(x)); return g; };

/** Gable roof prism along x: width w (x), depth d (z), rise h; slight overhang and ridge. */
function gable(w, d, h, c, y, o = {}) {
  const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }); g.translate(0, 0, -w / 2);
  const m = mesh(g, M(c, o), o.x ?? 0, y, o.z ?? 0); m.rotation.y = Math.PI / 2 + (o.ry ?? 0);
  return m;
}
/** Shingled roof: two sloped slabs with rows of shingle strips, plus a ridge beam. */
function shingleRoof(w, d, h, c, y, o = {}) {
  const g = new THREE.Group();
  const slope = Math.hypot(d / 2, h), ang = Math.atan2(h, d / 2);
  for (const side of [-1, 1]) {
    const slab = new THREE.Group();
    slab.add(box(w + 0.12, 0.05, slope + 0.08, c, 0, -0.025, 0, o));
    for (let r = 0; r < 4; r++) slab.add(box(w + 0.14, 0.035, 0.05, o.dark ?? tint(c, 0.25), 0, 0.02, -slope / 2 + (r + 0.6) * slope / 4, o));
    slab.position.set(0, y + h / 2, side * d / 4); slab.rotation.x = side * ang;
    g.add(slab);
  }
  g.add(box(w + 0.16, 0.07, 0.07, o.ridge ?? 0x6b4a33, 0, y + h - 0.02, 0));
  g.rotation.y = o.ry ?? 0; g.position.set(o.x ?? 0, 0, o.z ?? 0);
  return g;
}
/** Window with frame, sill and either warm light or dark glass. */
function windowAt(x, y, z, face, o = {}) {
  const lit = o.lit ?? false, w = o.w ?? 0.2, h = o.h ?? 0.24;
  const g = new THREE.Group();
  g.add(box(w + 0.06, h + 0.06, 0.03, o.frame ?? 0xf3e6c9, 0, -0.03, 0));
  g.add(box(w, h, 0.035, lit ? 0xffd37a : 0x3d4f5c, 0, 0, 0.005, lit ? { emissive: 0xffb84d, ei: 0.55, keep: true } : {}));
  g.add(box(0.02, h, 0.04, o.frame ?? 0xf3e6c9, 0, 0, 0.01));
  g.add(box(w + 0.1, 0.03, 0.07, o.frame ?? 0xf3e6c9, 0, -0.05, 0.02));
  if (o.shutters) for (const s of [-1, 1]) g.add(box(0.07, h, 0.02, o.shutters, s * (w / 2 + 0.06), 0, 0));
  g.position.set(x, y, z); g.rotation.y = face;
  return g;
}
function door(x, y, z, face, c = 0x7a4e2e, w = 0.24, h = 0.38) {
  const g = new THREE.Group();
  g.add(box(w + 0.06, h + 0.04, 0.03, 0xe8d8b6, 0, 0, 0));
  g.add(box(w, h, 0.04, c, 0, 0, 0.005));
  for (let i = 0; i < 3; i++) g.add(box(0.012, h * 0.9, 0.045, tint(c, 0.3), -w / 3 + i * w / 3, 0.02, 0.006));
  g.add(sphere(0.018, 0xd9a441, w / 3, h / 2, 0.035, { keep: true }));
  g.position.set(x, y, z); g.rotation.y = face;
  return g;
}
/** Irregular stone course: jittered blocks along a rectangle perimeter. */
function stoneBase(w, d, h, c, o = {}) {
  const g = new THREE.Group();
  const rows = Math.max(1, Math.round(h / 0.11));
  for (let r = 0; r < rows; r++) {
    for (const [len, axis, off] of [[w, 'x', d / 2], [w, 'x', -d / 2], [d, 'z', w / 2], [d, 'z', -w / 2]]) {
      let t = -len / 2 + (r % 2) * 0.07;
      while (t < len / 2) {
        const bl = Math.min(len / 2 - t, 0.12 + rnd() * 0.1);
        const col = new THREE.Color(c).offsetHSL(0, 0, (rnd() - 0.5) * 0.08).getHex();
        const b = axis === 'x' ? box(bl - 0.01, h / rows - 0.012, 0.09, col, t + bl / 2, r * h / rows, off) : box(0.09, h / rows - 0.012, bl - 0.01, col, off, r * h / rows, t + bl / 2);
        if (!(o.ruin && r > 0 && rnd() < 0.35 * r / rows)) g.add(b);
        t += bl;
      }
    }
  }
  return g;
}
function plankWall(w, h, c, x, y, z, ry, o = {}) {
  const g = new THREE.Group(); const n = Math.max(2, Math.round(w / 0.1));
  for (let i = 0; i < n; i++) {
    const hh = o.ruin ? h * (0.35 + rnd() * 0.65) : h;
    if (o.ruin && rnd() < 0.2) continue;
    const col = new THREE.Color(c).offsetHSL(0, 0, (rnd() - 0.5) * 0.06).getHex();
    g.add(box(w / n - 0.008, hh, 0.05, col, -w / 2 + (i + 0.5) * w / n, 0, 0));
  }
  g.position.set(x, y, z); g.rotation.y = ry;
  return g;
}
function grassTuft(x, z, c = 0x6f9e4c, s = 1) {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) { const b = mesh(new THREE.ConeGeometry(0.02 * s, 0.14 * s * (0.7 + rnd() * 0.6), 4), M(c, { keep: true }), x + (rnd() - 0.5) * 0.08, 0.06 * s, z + (rnd() - 0.5) * 0.08); b.rotation.z = (rnd() - 0.5) * 0.6; g.add(b); }
  return g;
}
function flowerBed(x, z, w, d, cols) {
  const g = new THREE.Group();
  g.add(box(w, 0.05, d, 0x6b4a33, x, 0, z, { keep: true }));
  for (let i = 0; i < Math.round(w * d * 90); i++) {
    const px = x + (rnd() - 0.5) * (w - 0.05), pz = z + (rnd() - 0.5) * (d - 0.05);
    g.add(cyl(0.006, 0.006, 0.07, 0x4f8a3c, px, 0.05, pz, 4, { keep: true }));
    g.add(sphere(0.022, cols[i % cols.length], px, 0.13, pz, { keep: true, detail: 0 }));
  }
  return g;
}
function rubble(x, z, c = 0x9a948a, n = 7) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) { const s = 0.04 + rnd() * 0.06; const b = box(s * 1.4, s, s, new THREE.Color(c).offsetHSL(0, 0, (rnd() - 0.5) * 0.1).getHex(), x + (rnd() - 0.5) * 0.4, 0, z + (rnd() - 0.5) * 0.3); b.rotation.y = rnd() * 3; g.add(b); }
  for (let i = 0; i < 3; i++) { const p = box(0.32, 0.025, 0.05, 0x8b6a4a, x + (rnd() - 0.5) * 0.3, 0.01 + i * 0.02, z + (rnd() - 0.5) * 0.3); p.rotation.y = rnd() * 3; g.add(p); }
  return g;
}
/** Scaffold of poles and boards against one face, plus a ladder and a stack of fresh planks. */
function scaffold(x0, x1, z, h, face = 0) {
  const g = new THREE.Group();
  for (const x of [x0, (x0 + x1) / 2, x1]) g.add(cyl(0.022, 0.022, h + 0.15, 0xc79a5e, x, 0, 0, 6, { keep: true }));
  for (let y = 0.35; y < h; y += 0.4) { g.add(box(x1 - x0 + 0.1, 0.03, 0.16, 0xd8b27a, (x0 + x1) / 2, y, 0.04, { keep: true })); g.add(box(x1 - x0, 0.018, 0.018, 0xb88a52, (x0 + x1) / 2, y + 0.18, -0.03, { keep: true })); }
  const ladder = new THREE.Group();
  for (const s of [-1, 1]) ladder.add(box(0.02, h * 0.8, 0.02, 0xc79a5e, s * 0.06, 0, 0, { keep: true }));
  for (let y = 0.08; y < h * 0.8; y += 0.1) ladder.add(box(0.12, 0.015, 0.02, 0xc79a5e, 0, y, 0, { keep: true }));
  ladder.position.set(x1 + 0.12, 0, 0.12); ladder.rotation.x = -0.18; g.add(ladder);
  g.position.z = z; g.rotation.y = face;
  return g;
}
function plankStack(x, z, ry = 0) {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) g.add(box(0.42, 0.03, 0.08, i % 2 ? 0xe2c08a : 0xd5ad73, 0, i * 0.032, (i % 3 - 1) * 0.085, { keep: true }));
  g.add(box(0.12, 0.08, 0.12, 0x8d8a82, 0.3, 0, 0.05, { keep: true })); g.add(box(0.1, 0.07, 0.1, 0x9d9890, 0.3, 0.08, 0.03, { keep: true }));
  g.position.set(x, 0, z); g.rotation.y = ry;
  return g;
}
function lanternPost(x, z, lit = true, h = 0.55) {
  const g = new THREE.Group();
  g.add(cyl(0.025, 0.03, h, 0x3e3a36, x, 0, z, 6));
  g.add(box(0.1, 0.12, 0.1, lit ? 0xffd27a : 0x4a4640, x, h, z, lit ? { emissive: 0xffa53a, ei: 0.8, keep: true } : {}));
  g.add(mesh(new THREE.ConeGeometry(0.09, 0.07, 4), M(0x3e3a36), x, h + 0.155, z, Math.PI / 4));
  return g;
}

// ---------------------------------------------------------------- trees (region-specific)
function foliage(c, r, x, y, z, n = 5, spread = 0.6) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const s = r * (0.7 + rnd() * 0.45);
    const col = new THREE.Color(c).offsetHSL((rnd() - 0.5) * 0.02, 0, (rnd() - 0.5) * 0.08).getHex();
    g.add(sphere(s, col, x + (rnd() - 0.5) * r * spread * 2, y + (rnd() - 0.3) * r * spread, z + (rnd() - 0.5) * r * spread * 2, { keep: true, detail: 1 }));
  }
  return g;
}
export const TREES = {
  // Old Mill Road: tall slender poplar
  poplar() { SEED = 11; return group(cyl(0.05, 0.07, 0.5, 0x7a5236, 0, 0, 0, 7), ...[0, 1, 2, 3].map(i => sphere(0.24 - i * 0.04, [0x7fa84a, 0x8fb553, 0x9cbf5c, 0xa9c867][i], 0, 0.62 + i * 0.3, 0, { keep: true, detail: 1 })).map(m => { m.scale.set(0.8, 1.35, 0.8); return m; })); },
  // Flower Gardens: rounded magnolia with pink-white blossoms
  magnolia() { SEED = 23; const g = group(cyl(0.05, 0.08, 0.42, 0x6e4a35, 0, 0, 0, 7), foliage(0x8fbf6a, 0.24, 0, 0.62, 0, 4, 0.7)); for (let i = 0; i < 26; i++) { const a = rnd() * 6.28, r = 0.2 + rnd() * 0.18; g.add(sphere(0.045, i % 3 ? 0xf6cfe0 : 0xfff3f6, Math.cos(a) * r, 0.52 + rnd() * 0.36, Math.sin(a) * r, { keep: true, detail: 0 })); } return g; },
  // Lakeside: weeping willow with hanging strands
  willow() { SEED = 37; const g = group(cyl(0.06, 0.09, 0.55, 0x6a5440, 0, 0, 0, 7), foliage(0x93b866, 0.26, 0, 0.72, 0, 4, 0.5)); for (let i = 0; i < 22; i++) { const a = (i / 22) * 6.28, r = 0.3 + rnd() * 0.06, l = 0.35 + rnd() * 0.25; g.add(box(0.035, l, 0.035, i % 2 ? 0x9ac46a : 0x86b35a, Math.cos(a) * r, 0.78 - l, Math.sin(a) * r, { keep: true })); } return g; },
  // Lantern Woods: dark fir with a tiny glowing lantern hung on a branch
  lanternFir() { SEED = 41; const g = group(cyl(0.045, 0.06, 0.28, 0x5c4231, 0, 0, 0, 7)); [0, 1, 2, 3].forEach(i => g.add(mesh(new THREE.ConeGeometry(0.34 - i * 0.07, 0.36, 8), M([0x3f6e4c, 0x467a52, 0x4f8559, 0x5a9061][i], { keep: true }), 0, 0.42 + i * 0.22, 0))); g.add(box(0.06, 0.08, 0.06, 0xffd27a, 0.22, 0.42, 0.12, { emissive: 0xffa53a, ei: 0.9, keep: true })); g.add(box(0.012, 0.1, 0.012, 0x3e3a36, 0.22, 0.5, 0.12, { keep: true })); return g; },
  // Festival Square: maple pruned round with bunting string
  festivalMaple() { SEED = 53; const g = group(cyl(0.05, 0.08, 0.45, 0x6e4a35, 0, 0, 0, 7), foliage(0xd98a3d, 0.25, 0, 0.7, 0, 5, 0.6), foliage(0xe8a64b, 0.18, 0.08, 0.86, 0.05, 2, 0.4)); const cols = [0xe0655a, 0xf2c14e, 0x5fa8d3, 0x7fbf6a]; for (let i = 0; i < 9; i++) { const a = -1.2 + i * 0.3; const f = mesh(new THREE.ConeGeometry(0.035, 0.07, 3), M(cols[i % 4], { keep: true }), Math.cos(a) * 0.32, 0.56 - Math.sin(i / 8 * Math.PI) * 0.06, Math.sin(a) * 0.32); f.rotation.x = Math.PI; g.add(f); } return g; },
};

// ---------------------------------------------------------------- props (region-specific)
export const PROPS = {
  hayCart() { SEED = 61; const g = new THREE.Group(); g.add(box(0.5, 0.06, 0.3, 0x9a6b42, 0, 0.12, 0)); for (const s of [-1, 1]) g.add(box(0.5, 0.1, 0.03, 0x8a5c38, 0, 0.18, s * 0.14)); for (const [x, z] of [[-0.17, 0.17], [-0.17, -0.17], [0.17, 0.17], [0.17, -0.17]]) { const w = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 12), M(0x6b4a33), x, 0.09, z); w.rotation.x = Math.PI / 2; g.add(w); } for (let i = 0; i < 9; i++) g.add(sphere(0.09, 0xe8c76a, (rnd() - 0.5) * 0.36, 0.28 + rnd() * 0.08, (rnd() - 0.5) * 0.18, { keep: true, detail: 0 })); g.add(box(0.03, 0.03, 0.4, 0x8a5c38, 0.36, 0.13, 0, { ry: 0 })); g.add(box(0.12, 0.16, 0.1, 0xe6dcc4, -0.38, 0, 0.18)); g.add(box(0.1, 0.13, 0.09, 0xdcd0b4, -0.4, 0, 0.05)); return g; },
  flowerArch() { SEED = 67; const g = new THREE.Group(); for (const s of [-1, 1]) g.add(box(0.04, 0.55, 0.04, 0xf3ede0, s * 0.25, 0, 0)); const arc = mesh(new THREE.TorusGeometry(0.25, 0.025, 6, 16, Math.PI), M(0xf3ede0), 0, 0.55, 0); g.add(arc); for (let i = 0; i < 30; i++) { const a = rnd() * Math.PI, side = rnd() < 0.3; const x = side ? (rnd() < 0.5 ? -0.25 : 0.25) : Math.cos(a) * 0.25, y = side ? rnd() * 0.5 : 0.55 + Math.sin(a) * 0.25; g.add(sphere(i % 4 ? 0.035 : 0.045, [0x6f9e4c, 0xf2a7c3, 0xffffff, 0x7fae58][i % 4], x, y, (rnd() - 0.5) * 0.06, { keep: true, detail: 0 })); } g.add(flowerBed(-0.36, 0, 0.16, 0.16, [0xf2a7c3, 0xffe28a])); g.add(flowerBed(0.36, 0, 0.16, 0.16, [0xc7a3e8, 0xffffff])); return g; },
  rowBoat() { SEED = 71; const g = new THREE.Group(); const s = new THREE.Shape(); s.moveTo(-0.36, 0); s.quadraticCurveTo(-0.3, -0.12, 0, -0.13); s.quadraticCurveTo(0.3, -0.12, 0.4, 0.02); s.lineTo(-0.36, 0.02); const hull = new THREE.ExtrudeGeometry(s, { depth: 0.24, bevelEnabled: false }); hull.translate(0, 0.13, -0.12); g.add(mesh(hull, M(0x5f8db0))); g.add(box(0.74, 0.03, 0.22, 0xd9b27a, 0.02, 0.12, 0)); g.add(box(0.06, 0.03, 0.24, 0x9a6b42, -0.05, 0.15, 0)); const oar = box(0.6, 0.02, 0.03, 0xc79a5e, 0.05, 0.17, 0.16); oar.rotation.y = 0.3; g.add(oar); g.add(grassTuft(-0.45, 0.1, 0x7aa35a)); g.add(grassTuft(-0.42, -0.12, 0x8ab265)); return g; },
  lanternShrine() { SEED = 79; const g = new THREE.Group(); g.add(stoneBase(0.26, 0.26, 0.12, 0x8d8a82)); g.add(box(0.2, 0.3, 0.2, 0x9b968c, 0, 0.12, 0)); g.add(box(0.12, 0.12, 0.21, 0xffd27a, 0, 0.24, 0, { emissive: 0xffa53a, ei: 0.9, keep: true })); g.add(mesh(new THREE.ConeGeometry(0.22, 0.14, 4), M(0x5b6a5e), 0, 0.49, 0, Math.PI / 4)); g.add(sphere(0.03, 0xd9a441, 0, 0.58, 0, { keep: true })); for (let i = 0; i < 6; i++) g.add(sphere(0.07, 0x5f8a4a, (rnd() - 0.5) * 0.5, 0.04, (rnd() - 0.5) * 0.5, { keep: true, detail: 0 })); return g; },
  marketStall() { SEED = 83; const g = new THREE.Group(); g.add(box(0.6, 0.22, 0.3, 0xb07a4a, 0, 0, 0)); g.add(box(0.62, 0.03, 0.32, 0xd9b27a, 0, 0.22, 0)); for (const [x, z] of [[-0.29, -0.14], [0.29, -0.14], [-0.29, 0.14], [0.29, 0.14]]) g.add(cyl(0.015, 0.015, 0.62, 0x8a5c38, x, 0, z, 6)); for (let i = 0; i < 6; i++) { const st = box(0.11, 0.025, 0.42, i % 2 ? 0xffffff : 0xe0655a, -0.275 + i * 0.11, 0.62, 0.03); st.rotation.x = -0.25; g.add(st); } for (let i = 0; i < 8; i++) g.add(sphere(0.04, [0xf2c14e, 0xe0655a, 0x7fbf6a, 0xf29a4a][i % 4], -0.22 + (i % 4) * 0.15, 0.28, i < 4 ? -0.05 : 0.07, { keep: true, detail: 0 })); g.add(box(0.14, 0.1, 0.1, 0xe6dcc4, 0.42, 0, 0.12)); return g; },
};

// ---------------------------------------------------------------- landmarks (3 stages)
/** Old Mill Road: stone watermill with timber upper floor and a paddle wheel. */
function watermill(st) {
  SEED = 101; WEATHER = st === 0 ? 0.55 : st === 1 ? 0.12 : 0;
  const g = new THREE.Group(), W = 1.0, D = 0.8;
  g.add(stoneBase(W, D, st === 0 ? 0.5 : 0.5, 0x9b958a, { ruin: st === 0 }));
  g.add(box(W - 0.08, 0.48, D - 0.08, 0x8f897e, 0, 0, 0));
  if (st > 0) {
    // timber upper floor with cross bracing
    g.add(box(W + 0.04, 0.04, D + 0.04, 0x6b4a33, 0, 0.5, 0));
    g.add(box(W - 0.02, 0.34, D - 0.02, 0xf0e2c4, 0, 0.54, 0));
    for (const x of [-0.5, 0, 0.5]) for (const z of [-0.4, 0.4]) g.add(box(0.05, 0.36, 0.05, 0x6b4a33, x * W, 0.52, z * D / 0.8 * 0.8 + (z > 0 ? 0.02 : -0.02)));
    const brace = box(0.04, 0.42, 0.03, 0x6b4a33, -0.25, 0.53, D / 2 + 0.02); brace.rotation.z = 0.9; g.add(brace);
    g.add(windowAt(0.22, 0.72, D / 2 + 0.02, 0, { lit: st === 2, shutters: st === 2 ? 0x5f8db0 : null }));
    g.add(windowAt(W / 2 + 0.02, 0.72, -0.12, Math.PI / 2, { lit: st === 2 }));
  } else {
    for (const x of [-0.45, 0.45]) g.add(box(0.05, 0.22 + rnd() * 0.15, 0.05, 0x5a4a3c, x, 0.5, D / 2));
  }
  g.add(windowAt(-0.25, 0.3, D / 2 + 0.05, 0, { lit: st === 2, w: 0.16, h: 0.2 }));
  g.add(door(0.2, 0.0, D / 2 + 0.05, 0, st === 0 ? 0x5a4a3c : 0x7a4e2e));
  if (st === 2) g.add(shingleRoof(W + 0.1, D + 0.15, 0.42, 0x8a5a44, 0.88, { dark: 0x744a38 }));
  if (st === 2) { g.add(box(0.14, 0.32, 0.14, 0x8f897e, -0.3, 1.0, -0.15)); g.add(box(0.17, 0.04, 0.17, 0x6f6a62, -0.3, 1.32, -0.15)); }
  if (st === 1) { for (let i = 0; i < 6; i++) { const r = box(0.03, 0.03, Math.hypot(0.5, 0.42), 0xd8b27a, -0.45 + i * 0.18, 1.06, 0, { keep: true }); r.rotation.x = 0; g.add(r); const a = box(0.03, 0.5, 0.03, 0xd8b27a, -0.45 + i * 0.18, 0.88, 0.2, { keep: true }); a.rotation.x = -0.9; g.add(a); const b = box(0.03, 0.5, 0.03, 0xd8b27a, -0.45 + i * 0.18, 0.88, -0.2, { keep: true }); b.rotation.x = 0.9; g.add(b); } g.add(scaffold(-0.45, 0.45, D / 2 + 0.22, 0.95)); g.add(plankStack(0.95, 0.6, 0.4)); }
  // water channel and wheel on the +x side
  g.add(box(0.28, 0.06, 1.1, st === 0 ? 0x7f8e8a : 0x6fb3c8, W / 2 + 0.2, 0, 0.1, { keep: st !== 0, opacity: st === 0 ? 0 : 0.85 }));
  for (const s of [-1, 1]) g.add(box(0.05, 0.1, 1.1, 0x8f897e, W / 2 + 0.2 + s * 0.16, 0, 0.1));
  const wheel = new THREE.Group(); const R = 0.36, spokes = st === 0 ? 5 : 10;
  for (let i = 0; i < spokes; i++) { const a = (i / spokes) * Math.PI * 2; const sp = box(0.03, R * 2, 0.03, 0x6b4a33, 0, -R, 0); sp.rotation.x = a; sp.position.y = 0; wheel.add(sp); const p = box(0.18, 0.04, 0.1, 0x7a5236, 0, Math.cos(a) * R, Math.sin(a) * R); p.rotation.x = a; wheel.add(p); }
  if (st > 0) for (const s of [-1, 1]) { const rim = mesh(new THREE.TorusGeometry(R, 0.022, 6, 24), M(0x6b4a33), s * 0.08, 0, 0); rim.rotation.y = Math.PI / 2; wheel.add(rim); }
  wheel.position.set(W / 2 + 0.2, R + 0.02, 0.1); if (st === 0) { wheel.rotation.z = 0.35; wheel.position.y = R - 0.05; }
  g.add(wheel);
  if (st === 0) { g.add(rubble(0.1, D / 2 + 0.4)); g.add(grassTuft(-0.5, 0.5)); g.add(grassTuft(0.4, -0.5)); g.add(grassTuft(-0.1, 0.45)); }
  if (st === 2) { g.add(flowerBed(-0.3, D / 2 + 0.2, 0.36, 0.14, [0xf2c14e, 0xe0655a, 0xffffff])); for (let i = 0; i < 3; i++) g.add(box(0.12, 0.16, 0.1, 0xe6dcc4, -0.6, i * 0.0 + (i > 1 ? 0.16 : 0), 0.3 - i * 0.12 + (i > 1 ? 0.12 : 0))); g.add(lanternPost(0.6, 0.6, true, 0.5)); }
  return g;
}

/** Flower Gardens: glass greenhouse on a brick plinth. */
function greenhouse(st) {
  SEED = 202; WEATHER = st === 0 ? 0.5 : st === 1 ? 0.1 : 0;
  const g = new THREE.Group(), W = 1.1, D = 0.7, H = 0.42;
  g.add(stoneBase(W, D, 0.14, 0xb5654a, { ruin: st === 0 }));
  const frame = 0xf3ede0, glassO = st === 2 ? 0.45 : st === 1 ? 0.3 : 0.18;
  // posts
  for (let i = 0; i <= 5; i++) for (const z of [-D / 2, D / 2]) { const tall = st === 0 && rnd() < 0.4 ? H * (0.3 + rnd() * 0.5) : H; g.add(box(0.03, tall, 0.03, frame, -W / 2 + i * W / 5, 0.14, z)); }
  for (const x of [-W / 2, W / 2]) for (let i = 0; i <= 3; i++) g.add(box(0.03, H, 0.03, frame, x, 0.14, -D / 2 + i * D / 3));
  // glass panes (some missing in ruin)
  for (let i = 0; i < 5; i++) for (const z of [-D / 2, D / 2]) if (st > 0 || rnd() < 0.35) g.add(box(W / 5 - 0.03, H - 0.02, 0.012, 0xcfeff2, -W / 2 + (i + 0.5) * W / 5, 0.15, z, { opacity: glassO, keep: true, rough: 0.1 }));
  for (const x of [-W / 2, W / 2]) for (let i = 0; i < 3; i++) if (st > 0 || rnd() < 0.35) g.add(box(0.012, H - 0.02, D / 3 - 0.03, 0xcfeff2, x, 0.15, -D / 2 + (i + 0.5) * D / 3, { opacity: glassO, keep: true, rough: 0.1 }));
  // roof: glass gable with ridge lantern
  if (st >= 1) {
    const roofH = 0.3, slope = Math.hypot(D / 2, roofH), ang = Math.atan2(roofH, D / 2);
    for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
      if (st === 1 && i > 2) continue;
      const pane = box(W / 5 - 0.02, 0.012, slope, 0xcfeff2, -W / 2 + (i + 0.5) * W / 5, 0, 0, { opacity: glassO, keep: true, rough: 0.1 });
      const piv = new THREE.Group(); piv.add(pane); piv.position.set(0, 0.14 + H + roofH / 2, side * D / 4); piv.rotation.x = side * ang; g.add(piv);
    }
    for (let i = 0; i <= 5; i++) for (const side of [-1, 1]) { const r = box(0.03, 0.03, slope, frame, -W / 2 + i * W / 5, 0, 0); const piv = new THREE.Group(); piv.add(r); piv.position.set(0, 0.14 + H + roofH / 2 + 0.01, side * D / 4); piv.rotation.x = side * ang; g.add(piv); }
    g.add(box(W + 0.06, 0.05, 0.05, frame, 0, 0.14 + H + roofH - 0.02, 0));
    if (st === 2) { g.add(box(0.2, 0.12, 0.16, frame, 0, 0.14 + H + roofH, 0)); g.add(mesh(new THREE.ConeGeometry(0.15, 0.1, 4), M(0x6f9e7a), 0, 0.14 + H + roofH + 0.17, 0, Math.PI / 4)); }
  }
  // interior plants
  const plantCols = st === 0 ? [0x8a8a6a] : [0x6f9e4c, 0x7fae58, 0x5f8f44];
  for (let i = 0; i < (st === 0 ? 3 : 8); i++) g.add(sphere(0.07 + rnd() * 0.05, plantCols[i % plantCols.length], -W / 2 + 0.12 + rnd() * (W - 0.24), 0.24, (rnd() - 0.5) * (D - 0.2), { keep: true, detail: 0 }));
  if (st === 2) for (let i = 0; i < 10; i++) g.add(sphere(0.03, [0xf2a7c3, 0xffe28a, 0xffffff, 0xe0655a][i % 4], -W / 2 + 0.12 + rnd() * (W - 0.24), 0.32, (rnd() - 0.5) * (D - 0.2), { keep: true, detail: 0 }));
  g.add(door(W / 2 + 0.02, 0.14, 0.05, Math.PI / 2, st === 0 ? 0x6a6a5a : 0x6f9e7a, 0.2, 0.34));
  if (st === 0) { g.add(rubble(0.2, D / 2 + 0.3, 0xb7b0a0)); for (let i = 0; i < 5; i++) g.add(grassTuft(-0.5 + rnd(), D / 2 + 0.15 + rnd() * 0.2)); for (let i = 0; i < 6; i++) { const shard = box(0.06, 0.008, 0.05, 0xcfeff2, (rnd() - 0.3) * 0.8, 0, D / 2 + 0.2 + rnd() * 0.3, { opacity: 0.5, keep: true }); shard.rotation.y = rnd() * 3; g.add(shard); } }
  if (st === 1) { g.add(plankStack(-0.85, 0.35, 0.6)); for (let i = 0; i < 3; i++) g.add(box(0.26, 0.2, 0.012, 0xcfeff2, 0.85, 0.05 + i * 0.01, -0.1 + i * 0.05, { opacity: 0.5, keep: true, ry: 0.3 })); }
  if (st === 2) { g.add(flowerBed(-0.25, D / 2 + 0.18, 0.5, 0.14, [0xf2a7c3, 0xffffff, 0xc7a3e8])); g.add(flowerBed(0.35, D / 2 + 0.18, 0.36, 0.14, [0xffe28a, 0xe0655a])); for (let i = 0; i < 2; i++) g.add(cyl(0.06, 0.05, 0.1, 0xb5654a, 0.75 + i * 0.12, 0, D / 2 + 0.1, 10)); }
  return g;
}

/** Lakeside: boathouse dock on stilts with a pitched roof and a moored boat. */
function boathouse(st) {
  SEED = 303; WEATHER = st === 0 ? 0.55 : st === 1 ? 0.1 : 0;
  const g = new THREE.Group(), W = 0.9, D = 0.7;
  // water plate under the dock
  g.add(box(1.6, 0.02, 1.3, 0x75b9c8, 0.25, -0.01, 0.1, { opacity: 0.85, keep: true, rough: 0.2 }));
  for (const x of [-0.45, 0, 0.45, 0.9]) for (const z of [-0.35, 0.35]) g.add(cyl(0.035, 0.04, 0.2, 0x5a4636, x, 0, z, 6));
  // deck planks
  for (let i = 0; i < 14; i++) if (st > 0 || rnd() > 0.3) g.add(box(0.1 - 0.008, 0.035, D, 0xb78b5c, -0.5 + i * 0.1 + 0.05, 0.2, 0));
  // house walls
  if (st === 0) { g.add(plankWall(W * 0.6, 0.4, 0x8a6a4a, -0.15, 0.24, -D / 2 + 0.03, 0, { ruin: true })); g.add(plankWall(D * 0.8, 0.3, 0x8a6a4a, -W / 2 + 0.03, 0.24, 0, Math.PI / 2, { ruin: true })); }
  else {
    for (const [w, x, z, ry] of [[W * 0.66, -0.15, -D / 2 + 0.03, 0], [D - 0.06, -W / 2 + 0.03, 0, Math.PI / 2], [D - 0.06, 0.15 + W * 0.33 - 0.03, 0, Math.PI / 2]]) g.add(plankWall(w, 0.46, 0x4f7f9e, x, 0.235, z, ry));
    g.add(plankWall(W * 0.66, 0.46, 0x4f7f9e, -0.15, 0.235, D / 2 - 0.03, 0));
    g.add(windowAt(-0.15, 0.48, D / 2 + 0.0, 0, { lit: st === 2, frame: 0xffffff }));
    g.add(door(0.18 + W * 0.33 - 0.02, 0.235, 0.05, Math.PI / 2, 0xe8d8b6, 0.22, 0.36));
  }
  if (st === 2) { g.add(shingleRoof(W * 0.75, D + 0.12, 0.34, 0xd9644a, 0.7, { x: -0.15 + 0.02, ridge: 0xffffff, dark: 0xbf5440 })); g.add(box(0.03, 0.03, 0.03, 0xffffff, -0.15, 1.04, 0)); }
  if (st === 1) { for (let i = 0; i < 5; i++) { for (const s of [-1, 1]) { const a = box(0.03, 0.46, 0.03, 0xd8b27a, -0.45 + i * 0.15, 0.62, s * 0.18, { keep: true }); a.rotation.x = -s * 0.95; g.add(a); } } g.add(scaffold(-0.45, 0.15, D / 2 + 0.18, 0.75)); g.add(plankStack(0.75, -0.25, 0.2)); }
  // mooring posts, rope, life ring, boat
  for (const z of [-0.35, 0.35]) g.add(cyl(0.035, 0.035, 0.35, 0x6b4a33, 0.95, 0.0, z, 6));
  if (st === 2) { const ring = mesh(new THREE.TorusGeometry(0.07, 0.025, 8, 16), M(0xf2f2f2, { keep: true }), 0.18 + W * 0.33, 0.45, D / 2 - 0.0); g.add(ring); const boat = PROPS.rowBoat(); boat.scale.setScalar(0.8); boat.position.set(0.55, -0.02, 0.62); boat.rotation.y = 0.1; g.add(boat); for (let i = 0; i < 2; i++) g.add(lanternPost(0.95, -0.35 + i * 0.7, true, 0.42).translateY(0.2)); }
  if (st === 0) { g.add(rubble(0.4, 0.0, 0x8a6a4a)); g.add(grassTuft(-0.7, 0.5, 0x7aa35a)); g.add(grassTuft(-0.65, -0.4, 0x7aa35a)); }
  for (let i = 0; i < 4; i++) g.add(grassTuft(-0.75 + rnd() * 0.15, -0.5 + rnd(), 0x6f9e4c, 1.2));
  return g;
}

/** Lantern Woods: log cabin with mossy roof, porch and hanging lanterns. */
function forestCabin(st) {
  SEED = 404; WEATHER = st === 0 ? 0.5 : st === 1 ? 0.1 : 0;
  const g = new THREE.Group(), W = 0.95, D = 0.72;
  g.add(stoneBase(W + 0.1, D + 0.1, 0.1, 0x7d7a72, { ruin: st === 0 }));
  // log walls: stacked rounded logs with crossed corners
  const rows = 6;
  for (let r = 0; r < rows; r++) {
    if (st === 0 && r > 2 + Math.floor(rnd() * 2)) continue;
    const y = 0.1 + r * 0.075 + 0.0375;
    for (const z of [-D / 2, D / 2]) { const l = mesh(new THREE.CylinderGeometry(0.04, 0.04, W + 0.16, 8), M(r % 2 ? 0x9a6a42 : 0x8a5c38), 0, y, z); l.rotation.z = Math.PI / 2; g.add(l); }
    for (const x of [-W / 2, W / 2]) { const l = mesh(new THREE.CylinderGeometry(0.04, 0.04, D + 0.16, 8), M(r % 2 ? 0x8a5c38 : 0x9a6a42), x, y + 0.0375, 0); l.rotation.x = Math.PI / 2; g.add(l); }
  }
  g.add(box(W - 0.04, st === 0 ? 0.16 : 0.45, D - 0.04, 0x7a5236, 0, 0.1, 0));
  if (st > 0) {
    g.add(door(0.18, 0.1, D / 2 + 0.04, 0, 0x5a3d28, 0.22, 0.34));
    g.add(windowAt(-0.22, 0.36, D / 2 + 0.04, 0, { lit: st === 2, shutters: 0x3f6e4c }));
    g.add(windowAt(W / 2 + 0.04, 0.36, 0, Math.PI / 2, { lit: st === 2, shutters: 0x3f6e4c }));
    // porch
    g.add(box(W + 0.1, 0.03, 0.28, 0xa47a50, 0, 0.1, D / 2 + 0.16));
    for (const x of [-0.5, 0.5]) g.add(box(0.04, 0.42, 0.04, 0x6b4a33, x, 0.1, D / 2 + 0.28));
  }
  if (st === 2) {
    g.add(shingleRoof(W + 0.2, D + 0.5, 0.42, 0x5f7a4a, 0.55, { dark: 0x4f6a3c, ridge: 0x4a3a2c, z: 0.12 }));
    for (let i = 0; i < 10; i++) g.add(sphere(0.05, 0x7fa85a, -0.5 + rnd(), 0.68 + rnd() * 0.18, -0.2 + rnd() * 0.5, { keep: true, detail: 0 }));
    g.add(box(0.13, 0.36, 0.13, 0x7d7a72, 0.32, 0.72, -0.18));
    for (const x of [-0.4, 0.4]) { g.add(box(0.012, 0.08, 0.012, 0x3e3a36, x, 0.44, D / 2 + 0.3)); g.add(box(0.07, 0.09, 0.07, 0xffd27a, x, 0.36, D / 2 + 0.3, { emissive: 0xffa53a, ei: 1, keep: true })); }
    g.add(box(0.36, 0.14, 0.18, 0x8a5c38, -0.75, 0, 0.25)); for (let i = 0; i < 6; i++) { const l = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 8), M(0xa47a50), -0.75, 0.16 + Math.floor(i / 3) * 0.07, 0.19 + (i % 3) * 0.06); l.rotation.z = Math.PI / 2; g.add(l); }
    g.add(lanternPost(0.7, 0.62, true, 0.5));
  }
  if (st === 1) { for (let i = 0; i < 5; i++) for (const s of [-1, 1]) { const a = box(0.035, 0.52, 0.035, 0xd8b27a, -0.45 + i * 0.225, 0.74, s * 0.2, { keep: true }); a.rotation.x = -s * 0.95; g.add(a); } g.add(scaffold(-0.45, 0.45, -D / 2 - 0.2, 0.7, Math.PI)); for (let i = 0; i < 4; i++) { const l = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), M(0xb07a4a, { keep: true }), 0.85, 0.04 + Math.floor(i / 2) * 0.075, 0.2 + (i % 2) * 0.085); l.rotation.x = Math.PI / 2; g.add(l); } }
  if (st === 0) { g.add(rubble(0.3, D / 2 + 0.35, 0x8a6a4a)); for (let i = 0; i < 4; i++) g.add(grassTuft(-0.5 + rnd(), 0.5 + rnd() * 0.2)); for (let i = 0; i < 3; i++) g.add(sphere(0.06, 0x5c7a4a, -0.3 + rnd() * 0.6, 0.38, -0.2 + rnd() * 0.4, { keep: true, detail: 0 })); }
  return g;
}

/** Festival Square: two-storey café with striped awning, balcony bunting and outdoor tables. */
function festivalCafe(st) {
  SEED = 505; WEATHER = st === 0 ? 0.55 : st === 1 ? 0.12 : 0;
  const g = new THREE.Group(), W = 1.0, D = 0.72;
  g.add(stoneBase(W, D, 0.12, 0xb9b2a4, { ruin: st === 0 }));
  g.add(box(W - 0.02, st === 0 ? 0.42 : 0.48, D - 0.02, 0xf0d9a8, 0, 0.12, 0));
  if (st > 0) { g.add(box(W + 0.04, 0.04, D + 0.04, 0xffffff, 0, 0.6, 0)); g.add(box(W - 0.06, 0.36, D - 0.06, 0xe9b98c, 0, 0.64, 0)); }
  else for (const x of [-0.42, 0.1]) g.add(box(0.18, 0.15 + rnd() * 0.12, 0.08, 0xe9b98c, x, 0.54, D / 2 - 0.05));
  // ground floor: big shop window + door
  g.add(windowAt(-0.22, 0.34, D / 2 + 0.02, 0, { w: 0.36, h: 0.26, lit: st === 2, frame: 0x3f6e86 }));
  g.add(door(0.26, 0.12, D / 2 + 0.02, 0, st === 0 ? 0x5a4a3c : 0x3f6e86, 0.22, 0.36));
  g.add(windowAt(W / 2 + 0.02, 0.34, 0, Math.PI / 2, { lit: st === 2, frame: 0x3f6e86 }));
  if (st > 0) { for (const x of [-0.25, 0.22]) g.add(windowAt(x, 0.82, D / 2 + 0.0, 0, { lit: st === 2, shutters: 0x3f6e86 })); g.add(windowAt(W / 2 + 0.0, 0.82, 0, Math.PI / 2, { lit: st === 2, shutters: 0x3f6e86 })); }
  if (st === 2) {
    g.add(shingleRoof(W + 0.12, D + 0.14, 0.36, 0x3f6e86, 1.0, { dark: 0x355e74, ridge: 0xf2c14e }));
    // striped awning
    for (let i = 0; i < 8; i++) { const s = box(W / 8, 0.02, 0.3, i % 2 ? 0xffffff : 0xe0655a, -W / 2 + (i + 0.5) * W / 8, 0.56, D / 2 + 0.14); s.rotation.x = 0.35; g.add(s); }
    for (let i = 0; i < 8; i++) { const f = mesh(new THREE.ConeGeometry(0.03, 0.06, 3), M(i % 2 ? 0xffffff : 0xe0655a, { keep: true }), -W / 2 + (i + 0.5) * W / 8, 0.47, D / 2 + 0.28); f.rotation.x = Math.PI; g.add(f); }
    // bunting from roof edge to pole
    g.add(cyl(0.02, 0.02, 1.0, 0xffffff, 0.9, 0, 0.75, 6)); const cols = [0xe0655a, 0xf2c14e, 0x5fa8d3, 0x7fbf6a];
    for (let i = 0; i < 8; i++) { const t = i / 7; const f = mesh(new THREE.ConeGeometry(0.035, 0.07, 3), M(cols[i % 4], { keep: true }), 0.45 + t * 0.45, 0.98 - Math.sin(t * Math.PI) * 0.1, D / 2 + t * (0.75 - D / 2)); f.rotation.x = Math.PI; g.add(f); }
    // tables with umbrellas
    for (const [x, z] of [[-0.3, 0.75], [0.25, 0.85]]) { g.add(cyl(0.12, 0.12, 0.02, 0xffffff, x, 0.18, z, 16)); g.add(cyl(0.015, 0.02, 0.18, 0x3e3a36, x, 0, z, 6)); g.add(cyl(0.01, 0.01, 0.3, 0xdcdcdc, x, 0.2, z, 6)); g.add(mesh(new THREE.ConeGeometry(0.2, 0.1, 8), M(x < 0 ? 0xf2c14e : 0x5fa8d3, { keep: true }), x, 0.55, z)); for (const s of [-1, 1]) g.add(box(0.08, 0.1, 0.08, 0x3f6e86, x + s * 0.16, 0, z)); }
    g.add(flowerBed(-0.3, D / 2 + 0.1, 0.3, 0.08, [0xe0655a, 0xffe28a]));
  }
  if (st === 1) { g.add(scaffold(-0.45, 0.45, D / 2 + 0.2, 1.0)); for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const a = box(0.03, 0.45, 0.03, 0xd8b27a, -0.45 + i * 0.18, 1.12, s * 0.18, { keep: true }); a.rotation.x = -s * 0.95; g.add(a); } g.add(plankStack(0.9, 0.2, -0.3)); g.add(box(0.2, 0.12, 0.14, 0xc8c2b4, -0.75, 0, 0.3, { keep: true })); }
  if (st === 0) { g.add(rubble(0.0, D / 2 + 0.35, 0xc9b998)); for (let i = 0; i < 4; i++) g.add(grassTuft(-0.5 + rnd(), D / 2 + 0.2 + rnd() * 0.3)); const torn = box(0.4, 0.02, 0.2, 0x9a7a6a, -0.1, 0.02, D / 2 + 0.5); torn.rotation.y = 0.4; g.add(torn); }
  return g;
}

export const LANDMARKS = { watermill, greenhouse, boathouse, forestCabin, festivalCafe };

// ---------------------------------------------------------------- Quiet Valley (region 1)
/** Quiet Valley: thatched farmhouse with a hay loft lean-to and a picket garden. */
function farmhouse(st) {
  SEED = 606; WEATHER = st === 0 ? 0.55 : st === 1 ? 0.12 : 0;
  const g = new THREE.Group(), W = 0.9, D = 0.66;
  g.add(stoneBase(W, D, 0.14, 0xa8a196, { ruin: st === 0 }));
  // whitewashed walls with timber frame
  g.add(box(W - 0.04, st === 0 ? 0.3 : 0.44, D - 0.04, 0xf4ead6, 0, 0.14, 0));
  if (st === 0) for (const x of [-0.3, 0.25]) g.add(box(0.16, 0.08 + rnd() * 0.12, 0.06, 0xf4ead6, x, 0.44, D / 2 - 0.05));
  for (const x of [-W / 2 + 0.02, 0, W / 2 - 0.02]) g.add(box(0.04, st === 0 ? 0.3 : 0.44, 0.03, 0x7a5236, x, 0.14, D / 2 - 0.005));
  g.add(box(W, 0.035, 0.03, 0x7a5236, 0, st === 0 ? 0.42 : 0.56, D / 2 - 0.005));
  g.add(door(0.2, 0.14, D / 2 + 0.01, 0, st === 0 ? 0x5a4a3c : 0x6f9e4c, 0.2, 0.32));
  g.add(windowAt(-0.22, 0.38, D / 2 + 0.01, 0, { lit: st === 2, shutters: st === 2 ? 0x6f9e4c : null, w: 0.18 }));
  g.add(windowAt(W / 2 + 0.01, 0.38, 0, Math.PI / 2, { lit: st === 2, shutters: st === 2 ? 0x6f9e4c : null, w: 0.18 }));
  if (st === 2) {
    // rounded thatch: stacked slabs, slightly bulging
    for (let i = 0; i < 4; i++) g.add(gable(W + 0.18 - i * 0.04, D + 0.26 - i * 0.07, 0.5 - i * 0.1, [0xe1b862, 0xd6ab55, 0xcfa24e, 0xc4984a][i], 0.58 + i * 0.03));
    g.add(box(W + 0.2, 0.06, 0.08, 0xb58a3e, 0, 1.06, 0));
    g.add(box(0.13, 0.3, 0.13, 0xa8a196, -0.26, 0.86, -0.12)); g.add(box(0.16, 0.04, 0.16, 0x7d7a72, -0.26, 1.16, -0.12));
    // hay loft lean-to
    g.add(box(0.06, 0.4, 0.06, 0x7a5236, -0.72, 0, 0.25)); g.add(box(0.06, 0.4, 0.06, 0x7a5236, -0.72, 0, -0.25));
    const lean = box(0.4, 0.03, 0.62, 0xc4984a, -0.6, 0.42, 0); lean.rotation.z = 0.35; g.add(lean);
    for (let i = 0; i < 5; i++) g.add(box(0.14, 0.12, 0.1, 0xe8c76a, -0.62 + (i % 2) * 0.12, Math.floor(i / 2) * 0.12, -0.15 + (i % 3) * 0.13, { keep: true }));
    // picket garden and flowers
    for (let i = 0; i < 9; i++) g.add(box(0.03, 0.14, 0.02, 0xfaf6ee, -0.45 + i * 0.11, 0, D / 2 + 0.34));
    g.add(box(0.98, 0.02, 0.02, 0xfaf6ee, -0.01, 0.09, D / 2 + 0.34));
    g.add(flowerBed(-0.22, D / 2 + 0.17, 0.42, 0.14, [0xf2a7c3, 0xffe28a, 0xc7a3e8])); g.add(flowerBed(0.38, D / 2 + 0.17, 0.2, 0.14, [0xe0655a, 0xffffff]));
    g.add(cyl(0.07, 0.06, 0.12, 0xb5654a, 0.55, 0, 0.0, 10)); g.add(sphere(0.07, 0x6f9e4c, 0.55, 0.16, 0, { keep: true }));
  }
  if (st === 1) {
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const a = box(0.03, 0.5, 0.03, 0xd8b27a, -0.42 + i * 0.17, 0.75, s * 0.2, { keep: true }); a.rotation.x = -s * 0.9; g.add(a); }
    g.add(box(W + 0.06, 0.04, 0.04, 0xd8b27a, 0, 0.97, 0, { keep: true }));
    g.add(scaffold(-0.4, 0.4, D / 2 + 0.2, 0.85)); g.add(plankStack(0.8, 0.45, 0.5));
    for (let i = 0; i < 3; i++) g.add(cyl(0.07, 0.07, 0.3, 0xe1b862, -0.7, 0.07, -0.2 + i * 0.16, 8, { keep: true }).rotateZ(Math.PI / 2));
  }
  if (st === 0) { g.add(rubble(0.0, D / 2 + 0.35, 0xb7b0a0)); for (let i = 0; i < 6; i++) g.add(grassTuft(-0.6 + rnd() * 1.2, D / 2 + 0.1 + rnd() * 0.4)); for (let i = 0; i < 4; i++) { const t = box(0.3, 0.03, 0.1, 0xb59a6a, -0.5 + rnd(), 0.0, -0.4 + rnd() * 0.2); t.rotation.y = rnd() * 3; g.add(t); } }
  return g;
}
LANDMARKS.farmhouse = farmhouse;
TREES.meadowOak = () => { SEED = 7; const g = group(cyl(0.07, 0.1, 0.38, 0x6e4a35, 0, 0, 0, 7)); for (const [x, z, r] of [[-0.12, 0, 0.1], [0.1, 0.05, 0.09]]) { const b = cyl(0.03, 0.04, 0.25, 0x6e4a35, x * 0.6, 0.3, z * 0.6, 6); b.rotation.z = -x * 4; g.add(b); } g.add(foliage(0x79a84a, 0.26, 0, 0.66, 0, 7, 0.75)); for (let i = 0; i < 10; i++) { const a = rnd() * 6.28; g.add(sphere(0.03, 0xe0655a, Math.cos(a) * 0.3, 0.5 + rnd() * 0.3, Math.sin(a) * 0.3, { keep: true, detail: 0 })); } return g; };
PROPS.millstones = () => { SEED = 89; const g = new THREE.Group(); const s1 = cyl(0.2, 0.2, 0.07, 0xa8a196, 0, 0, 0, 18); s1.rotation.z = 1.35; s1.position.set(-0.15, 0.2, 0); g.add(s1); g.add(cyl(0.2, 0.2, 0.07, 0x9b958a, 0.18, 0, 0.08, 18)); g.add(cyl(0.04, 0.04, 0.071, 0x6f6a62, 0.18, 0.001, 0.08, 10)); for (let i = 0; i < 3; i++) { const sk = sphere(0.09, 0xe6dcc4, 0.2 + (i % 2) * 0.12, 0.13 + Math.floor(i / 2) * 0.12, -0.2 + i * 0.05, { detail: 1 }); sk.scale.set(1, 1.2, 0.85); g.add(sk); } g.add(box(0.2, 0.05, 0.12, 0xd9b27a, -0.35, 0, 0.2)); for (let i = 0; i < 4; i++) g.add(sphere(0.03, 0xe8c76a, -0.4 + i * 0.03, 0.06, 0.2, { keep: true, detail: 0 })); return g; };
PROPS.lanternStones = () => { SEED = 97; const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const x = -0.3 + i * 0.3, z = (i % 2) * 0.15; g.add(sphere(0.08, 0x8d8a82, x, 0.03, z, { detail: 0 })); g.add(cyl(0.006, 0.006, 0.3, 0x3e3a36, x, 0.05, z, 4)); g.add(sphere(0.045, 0xffd27a, x, 0.32, z, { emissive: 0xffa53a, ei: 1, keep: true, detail: 1 })); } for (let i = 0; i < 5; i++) g.add(sphere(0.06, 0x5f8a4a, (rnd() - 0.5) * 0.8, 0.03, (rnd() - 0.5) * 0.4, { keep: true, detail: 0 })); for (let i = 0; i < 4; i++) { g.add(cyl(0.012, 0.015, 0.06, 0xf0e2c4, -0.2 + rnd() * 0.4, 0, 0.2 + rnd() * 0.1, 6)); } return g; };

// ---------------------------------------------------------------- crossings (bridges and gates, 3 stages)
// All crossings span along x (the screen's upper-left → lower-right diagonal), length ~1.6.
function planks(len, w, c, y, o = {}) {
  const g = new THREE.Group(), n = Math.round(len / 0.09);
  for (let i = 0; i < n; i++) { if (o.ruin && rnd() < 0.3) continue; const col = new THREE.Color(c).offsetHSL(0, 0, (rnd() - 0.5) * 0.07).getHex(); const p = box(len / n - 0.012, 0.035, w * (o.ruin ? 0.6 + rnd() * 0.4 : 1), col, -len / 2 + (i + 0.5) * len / n, y + (o.arch ? Math.sin(((i + 0.5) / n) * Math.PI) * o.arch : 0), 0); g.add(p); }
  return g;
}
function railing(len, z, h, c, o = {}) {
  const g = new THREE.Group(), n = o.posts ?? 6;
  for (let i = 0; i <= n; i++) { if (o.ruin && rnd() < 0.35) continue; const t = i / n, x = -len / 2 + t * len; g.add(box(0.045, h * (o.ruin ? 0.5 + rnd() * 0.5 : 1), 0.045, c, x, (o.arch ? Math.sin(t * Math.PI) * o.arch : 0) + (o.y ?? 0), z)); }
  if (!o.ruin) for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n; const y0 = o.arch ? Math.sin(t0 * Math.PI) * o.arch : 0, y1 = o.arch ? Math.sin(t1 * Math.PI) * o.arch : 0; const r = box(len / n + 0.02, 0.035, 0.05, c, -len / 2 + (t0 + t1) / 2 * len, (y0 + y1) / 2 + h - 0.03 + (o.y ?? 0), z); r.rotation.z = Math.atan2(y1 - y0, len / n); g.add(r); }
  return g;
}
function water(len, w) { return box(len, 0.02, w, 0x75b9c8, 0, -0.06, 0, { opacity: 0.85, keep: true, rough: 0.2 }); }
function bank(x, w, c = 0x8fae6a) { const g = new THREE.Group(); g.add(box(0.36, 0.08, w, c, x, -0.06, 0, { keep: true })); for (let i = 0; i < 4; i++) g.add(sphere(0.06, 0x9b958a, x + (rnd() - 0.5) * 0.3, -0.02, (rnd() - 0.5) * w, { detail: 0 })); return g; }

export const CROSSINGS = {
  /** Quiet Valley: low timber footbridge with hay bales and wildflowers. */
  meadowBridge(st) {
    SEED = 701; WEATHER = st === 0 ? 0.55 : st === 1 ? 0.12 : 0;
    const g = new THREE.Group(), L = 1.5, Wd = 0.42;
    g.add(water(L, 0.9)); g.add(bank(-L / 2 - 0.05, 0.9)); g.add(bank(L / 2 + 0.05, 0.9));
    for (const x of [-0.45, 0, 0.45]) for (const z of [-Wd / 2, Wd / 2]) g.add(cyl(0.035, 0.04, 0.2, 0x6b4a33, x, -0.06, z, 6));
    g.add(planks(L, Wd, 0xb78b5c, 0.12, { ruin: st === 0, arch: 0.06 }));
    if (st > 0) for (const z of [-Wd / 2, Wd / 2]) g.add(railing(L, z, 0.22, 0x8a5c38, { arch: 0.06, y: 0.14, posts: 5 }));
    else g.add(railing(L, Wd / 2, 0.2, 0x6b5a4a, { ruin: true, y: 0.14, posts: 5 }));
    if (st === 1) { g.add(plankStack(-0.35, 0.5, 0.2)); g.add(box(0.05, 0.04, 0.3, 0xd8b27a, 0.3, 0.2, 0.36, { keep: true, ry: 0.6 })); }
    if (st === 2) { for (const s of [-1, 1]) { g.add(box(0.16, 0.12, 0.11, 0xe8c76a, s * (L / 2 + 0.05), -0.02, -0.32 * s, { keep: true })); g.add(flowerBed(s * (L / 2 + 0.02), 0.32 * s, 0.18, 0.12, [0xffe28a, 0xffffff, 0xc7a3e8])); } }
    if (st === 0) { g.add(grassTuft(-0.7, 0.3)); g.add(grassTuft(0.7, -0.3)); g.add(rubble(0.3, 0.45, 0x8a6a4a, 3)); }
    return g;
  },
  /** Old Mill Road: stone gatehouse arch with timber hoarding and mill wheel sign. */
  millGate(st) {
    SEED = 702; WEATHER = st === 0 ? 0.55 : st === 1 ? 0.12 : 0;
    const g = new THREE.Group();
    for (const s of [-1, 1]) { const tw = new THREE.Group(); tw.add(stoneBase(0.36, 0.42, st === 0 ? 0.42 : 0.7, 0xa8a196, { ruin: st === 0 })); tw.add(box(0.3, st === 0 ? 0.4 : 0.68, 0.36, 0x9b958a, 0, 0, 0)); if (st > 0) { tw.add(box(0.42, 0.05, 0.48, 0x7d7a72, 0, 0.7, 0)); if (st === 2) tw.add(mesh(new THREE.ConeGeometry(0.3, 0.3, 4), M(0x8a5a44), 0, 0.9, 0, Math.PI / 4)); } tw.position.x = s * 0.5; g.add(tw); }
    if (st > 0) { // arch beam with timber hoarding on top
      g.add(box(0.7, 0.14, 0.36, 0x9b958a, 0, 0.5, 0));
      const arc = mesh(new THREE.TorusGeometry(0.33, 0.04, 6, 16, Math.PI), M(0x8d8a82), 0, 0.12, 0.17); g.add(arc);
      if (st === 2) { g.add(box(0.74, 0.18, 0.38, 0xf0e2c4, 0, 0.64, 0)); for (const x of [-0.3, 0, 0.3]) g.add(box(0.04, 0.18, 0.4, 0x6b4a33, x, 0.64, 0)); g.add(gable(0.76, 0.48, 0.2, 0x8a5a44, 0.82));
        // wheel sign
        const w = new THREE.Group(); for (let i = 0; i < 6; i++) { const sp = box(0.012, 0.18, 0.012, 0x6b4a33, 0, -0.09, 0); sp.rotation.z = (i / 6) * Math.PI; w.add(sp); } const rim = mesh(new THREE.TorusGeometry(0.09, 0.012, 6, 18), M(0x6b4a33), 0, 0, 0); w.add(rim); w.position.set(0, 0.73, 0.2); g.add(w);
        for (const s of [-1, 1]) g.add(lanternPost(s * 0.32, 0.36, true, 0.45)); g.add(flowerBed(-0.5, 0.36, 0.3, 0.1, [0xf2c14e, 0xe0655a])); g.add(flowerBed(0.5, 0.36, 0.3, 0.1, [0xffffff, 0xf2c14e])); }
      if (st === 1) { g.add(scaffold(-0.35, 0.35, 0.34, 0.8)); g.add(plankStack(0.9, 0.35, 0.3)); }
    } else { g.add(rubble(0, 0.25, 0xa8a196, 10)); g.add(grassTuft(-0.2, 0.4)); g.add(grassTuft(0.25, -0.3)); }
    // cobbled road through
    for (let i = 0; i < 18; i++) g.add(box(0.1, 0.02, 0.1, new THREE.Color(0xb9b2a4).offsetHSL(0, 0, (rnd() - 0.5) * 0.08).getHex(), -0.15 + (i % 3) * 0.13 + (rnd() - 0.5) * 0.02, 0, -0.7 + Math.floor(i / 3) * 0.26));
    return g;
  },
  /** Flower Gardens: white moon bridge with flower boxes and a rose arch. */
  gardenBridge(st) {
    SEED = 703; WEATHER = st === 0 ? 0.55 : st === 1 ? 0.12 : 0;
    const g = new THREE.Group(), L = 1.5, Wd = 0.4;
    g.add(water(L, 0.9)); g.add(bank(-L / 2 - 0.05, 0.9, 0x9dc18d)); g.add(bank(L / 2 + 0.05, 0.9, 0x9dc18d));
    for (const s of [-1, 1]) g.add(stoneBase(0.22, Wd + 0.06, 0.18, 0xd8d2c4, { ruin: st === 0 }).translateX(s * 0.62));
    g.add(planks(L, Wd, 0xe8dcc6, 0.14, { ruin: st === 0, arch: 0.18 }));
    if (st > 0) for (const z of [-Wd / 2, Wd / 2]) g.add(railing(L, z, 0.2, 0xf8f4ec, { arch: 0.18, y: 0.16, posts: 7 }));
    else g.add(railing(L, -Wd / 2, 0.2, 0xb8b2a6, { ruin: true, arch: 0.18, y: 0.16, posts: 7 }));
    if (st === 2) {
      for (const z of [-Wd / 2 - 0.05, Wd / 2 + 0.05]) for (const x of [-0.4, 0.4]) { const y = Math.sin((x / L + 0.5) * Math.PI) * 0.18 + 0.36; g.add(box(0.2, 0.06, 0.06, 0x8a5c38, x, y, z)); for (let i = 0; i < 6; i++) g.add(sphere(0.028, [0xf2a7c3, 0xffffff, 0xc7a3e8][i % 3], x - 0.08 + i * 0.032, y + 0.08, z, { keep: true, detail: 0 })); }
      const arch = PROPS.flowerArch(); arch.scale.setScalar(0.7); arch.position.set(-L / 2 - 0.05, -0.02, 0); arch.rotation.y = Math.PI / 2; g.add(arch);
      g.add(flowerBed(L / 2 + 0.05, 0.3, 0.24, 0.16, [0xf2a7c3, 0xffe28a]));
    }
    if (st === 1) { g.add(plankStack(0.55, 0.5, -0.3)); for (let i = 0; i < 3; i++) g.add(cyl(0.05, 0.04, 0.08, 0xb5654a, -0.75 + i * 0.1, -0.02, 0.4, 8)); }
    if (st === 0) { g.add(grassTuft(-0.7, 0.35)); g.add(grassTuft(0.65, -0.35)); g.add(grassTuft(0.7, 0.3)); }
    return g;
  },
  /** Lakeside: boardwalk gate of reeds and blue-painted posts with hanging floats. */
  lakeGate(st) {
    SEED = 704; WEATHER = st === 0 ? 0.55 : st === 1 ? 0.12 : 0;
    const g = new THREE.Group(), L = 1.5;
    g.add(water(1.7, 1.2));
    for (const x of [-0.6, -0.2, 0.2, 0.6]) for (const z of [-0.2, 0.2]) g.add(cyl(0.03, 0.035, 0.2, 0x5a4636, x, -0.06, z, 6));
    g.add(planks(L, 0.4, 0xc9a274, 0.12, { ruin: st === 0 }).rotateY(Math.PI / 2));
    for (const s of [-1, 1]) { g.add(box(0.08, st === 0 ? 0.35 : 0.75, 0.08, 0x4f7f9e, s * 0.26, 0.12, 0)); }
    if (st > 0) { g.add(box(0.7, 0.07, 0.1, 0x4f7f9e, 0, 0.86, 0)); g.add(box(0.6, 0.05, 0.08, 0xf2f2f2, 0, 0.78, 0)); }
    if (st === 2) {
      g.add(mesh(new THREE.ConeGeometry(0.06, 0.1, 4), M(0xd9644a), -0.36, 0.96, 0, Math.PI / 4)); g.add(mesh(new THREE.ConeGeometry(0.06, 0.1, 4), M(0xd9644a), 0.36, 0.96, 0, Math.PI / 4));
      for (const s of [-1, 1]) { const r = mesh(new THREE.TorusGeometry(0.06, 0.022, 8, 16), M(0xf2f2f2, { keep: true }), s * 0.26, 0.55, 0.06); g.add(r); g.add(box(0.06, 0.08, 0.06, 0xffd27a, s * 0.26, 0.68, 0.08, { emissive: 0xffa53a, ei: 0.9, keep: true })); }
      for (let i = 0; i < 5; i++) g.add(sphere(0.035, [0xe0655a, 0xf2f2f2][i % 2], -0.2 + i * 0.1, 0.72 - Math.sin(i / 4 * Math.PI) * 0.06, 0.02, { keep: true, detail: 0 }));
      const boat = PROPS.rowBoat(); boat.scale.setScalar(0.6); boat.position.set(0.55, -0.05, 0.4); boat.rotation.y = 1.4; g.add(boat);
    }
    if (st === 1) { g.add(plankStack(0.55, 0.35, 0.2)); g.add(box(0.7, 0.07, 0.1, 0xd8b27a, 0.35, 0.12, 0.45, { keep: true, ry: 0.4 })); }
    for (let i = 0; i < 14; i++) { const x = (rnd() < 0.5 ? -1 : 1) * (0.35 + rnd() * 0.4), z = (rnd() - 0.5) * 1.0; const r = cyl(0.008, 0.008, 0.25 + rnd() * 0.2, 0x7a9a4a, x, -0.05, z, 4); g.add(r); if (rnd() < 0.4) g.add(cyl(0.018, 0.018, 0.07, 0x7a5236, x, 0.18 + rnd() * 0.1, z, 6)); }
    return g;
  },
  /** Lantern Woods: log bridge with rope rails strung with lanterns. */
  forestBridge(st) {
    SEED = 705; WEATHER = st === 0 ? 0.55 : st === 1 ? 0.12 : 0;
    const g = new THREE.Group(), L = 1.5, Wd = 0.4;
    g.add(water(L, 0.9)); g.add(bank(-L / 2 - 0.05, 0.9, 0x83a57d)); g.add(bank(L / 2 + 0.05, 0.9, 0x83a57d));
    for (const z of [-0.12, 0.12]) { const l = mesh(new THREE.CylinderGeometry(0.06, 0.06, L, 9), M(0x6b4a33), 0, 0.06, z); l.rotation.z = Math.PI / 2; g.add(l); }
    g.add(planks(L, Wd, 0x9a6a42, 0.11, { ruin: st === 0 }));
    for (const x of [-L / 2 + 0.05, 0, L / 2 - 0.05]) for (const z of [-Wd / 2, Wd / 2]) if (st > 0 || rnd() < 0.5) g.add(cyl(0.035, 0.04, st === 0 ? 0.2 : 0.38, 0x5c4231, x, 0.12, z, 7));
    if (st > 0) for (const z of [-Wd / 2, Wd / 2]) for (let i = 0; i < 2; i++) { const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(new THREE.Vector3(-L / 2 + 0.05 + i * (L / 2 - 0.05) + t * (L / 2 - 0.05), 0.48 - Math.sin(t * Math.PI) * 0.07, z)); } g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.012, 5), M(0xc9a274))); }
    if (st === 2) {
      for (const x of [-L / 2 + 0.05, 0, L / 2 - 0.05]) for (const z of [-Wd / 2, Wd / 2]) g.add(box(0.07, 0.09, 0.07, 0xffd27a, x, 0.52, z, { emissive: 0xffa53a, ei: 1, keep: true }));
      g.add(PROPS.lanternStones().translateX(L / 2 + 0.15).translateZ(0.3).rotateY(0.6));
      for (let i = 0; i < 6; i++) g.add(sphere(0.05, 0xf0e2c4, -0.8 + rnd() * 0.15, 0.0, -0.3 + rnd() * 0.6, { detail: 0 }));
    }
    if (st === 1) { for (let i = 0; i < 4; i++) { const l = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), M(0xb07a4a, { keep: true }), -0.55, 0.0 + Math.floor(i / 2) * 0.07, 0.36 + (i % 2) * 0.075); l.rotation.z = Math.PI / 2; g.add(l); } const coil = mesh(new THREE.TorusGeometry(0.06, 0.02, 6, 14), M(0xc9a274, { keep: true }), 0.6, 0.02, 0.35); coil.rotation.x = Math.PI / 2; g.add(coil); }
    if (st === 0) { g.add(grassTuft(-0.7, 0.3, 0x5f8a4a)); g.add(grassTuft(0.7, -0.3, 0x5f8a4a)); const fallen = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), M(0x6b4a33), 0.3, -0.02, 0.38); fallen.rotation.z = Math.PI / 2; fallen.rotation.y = 0.5; g.add(fallen); }
    return g;
  },
};
