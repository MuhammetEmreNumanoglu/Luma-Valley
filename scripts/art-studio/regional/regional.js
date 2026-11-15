// Original procedural 3D models for Luma Valley's starting valley and its five bridge regions.
// No third-party geometry or textures: every shape is built here from three.js primitives.
// Each landmark and crossing has three stages: 0 ruin, 1 under repair, 2 restored.
// Units: 1 = one Kenney grid cell. Origin = ground point under the model. Camera sees +x and +z faces.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ------------------------------------------------------------------ core helpers
let SEED = 1;
const rnd = () => { SEED = (SEED * 16807) % 2147483647; return (SEED - 1) / 2147483646; };
const rr = (a, b) => a + rnd() * (b - a);
const pick = (a) => a[Math.floor(rnd() * a.length) % a.length];
let WEATHER = 0;
const GREY = new THREE.Color(0x8f8576);
const jit = (hex, l = 0.05, h = 0.008) => new THREE.Color(hex).offsetHSL(rr(-h, h), rr(-0.03, 0.03), rr(-l, l)).getHex();
function mat(hex, o = {}) {
  const c = new THREE.Color(hex);
  if (!o.keep && WEATHER > 0) c.lerp(GREY, WEATHER);
  return new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.82, metalness: o.metal ?? 0, flatShading: o.flat ?? false, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, transparent: o.opacity !== undefined, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide });
}
function put(geo, hex, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(geo, o.material ?? mat(hex, o));
  m.position.set(x, y, z);
  m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0, o.order ?? 'XYZ');
  if (o.s) m.scale.set(...o.s);
  m.castShadow = o.cast ?? true; m.receiveShadow = true;
  return m;
}
/** Rounded box resting on y (bottom), centred on x/z. */
const rbox = (w, h, d, hex, x = 0, y = 0, z = 0, o = {}) => put(new RoundedBoxGeometry(w, h, d, 2, Math.max(0.002, Math.min(w, h, d) * (o.r ?? 0.2))), hex, x, y + h / 2, z, o);
const cyl = (r1, r2, h, hex, x = 0, y = 0, z = 0, o = {}) => put(new THREE.CylinderGeometry(r1, r2, h, o.seg ?? 14), hex, x, y + h / 2, z, o);
const ball = (r, hex, x = 0, y = 0, z = 0, o = {}) => put(new THREE.SphereGeometry(r, o.seg ?? 14, Math.max(6, Math.round((o.seg ?? 14) * 0.7))), hex, x, y, z, o);
const stone = (r, hex, x, y, z, o = {}) => { const m = put(new THREE.DodecahedronGeometry(r, 1), jit(hex, 0.06), x, y, z, o); m.scale.set(o.sx ?? rr(1, 1.4), o.sy ?? rr(0.55, 0.8), o.sz ?? rr(0.9, 1.2)); m.rotation.y = rnd() * 3; return m; };
const capsule = (r, len, hex, x, y, z, o = {}) => put(new THREE.CapsuleGeometry(r, len, 4, 10), hex, x, y, z, o);
const cone = (r, h, hex, x, y, z, o = {}) => put(new THREE.ConeGeometry(r, h, o.seg ?? 12), hex, x, y + h / 2, z, o);
const grp = (...items) => { const g = new THREE.Group(); items.flat().forEach((i) => i && g.add(i)); return g; };
const at = (obj, x, y, z, ry = 0) => { obj.position.set(x, y, z); obj.rotation.y = ry; return obj; };
const stageWeather = (st, a = 0.5, b = 0.1) => (WEATHER = st === 0 ? a : st === 1 ? b : 0);

// ------------------------------------------------------------------ nature details
const GRASS = [0x7fb34e, 0x8fc25a, 0x6fa646, 0x9ccb62];
const FLOWER_SETS = {
  meadow: [0xffffff, 0xf6d55c, 0xf2a7c3, 0xc9a7ee],
  warm: [0xf2c14e, 0xe8735a, 0xffffff, 0xf29a4a],
  garden: [0xf2a7c3, 0xffffff, 0xc7a3e8, 0xf7c6d9, 0xe86f98],
  lake: [0xffffff, 0x9cc8f0, 0xf6d55c, 0xc7a3e8],
  forest: [0xf6d55c, 0xffffff, 0xe8a85a, 0xb98ae0],
  festival: [0xe0655a, 0xf2c14e, 0x5fa8d3, 0xffffff, 0xf29ac0],
};
function tuft(x, z, s = 1, cols = GRASS, y = 0) {
  const g = new THREE.Group();
  for (let i = 0; i < 7; i++) g.add(put(new THREE.ConeGeometry(0.012 * s, rr(0.09, 0.17) * s, 4), pick(cols), x + rr(-0.04, 0.04) * s, y + 0.05 * s, z + rr(-0.04, 0.04) * s, { keep: true, rx: rr(-0.4, 0.4), rz: rr(-0.4, 0.4) }));
  return g;
}
/** A flower clump: leafy mound with five-petal blossoms. */
function flowers(x, z, n = 5, cols = FLOWER_SETS.meadow, s = 1, y = 0) {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) g.add(ball(rr(0.028, 0.042) * s, jit(0x5e9a44, 0.06), x + rr(-0.05, 0.05) * s, y + 0.025 * s, z + rr(-0.05, 0.05) * s, { keep: true, seg: 8, s: [1, 0.7, 1] }));
  for (let i = 0; i < n; i++) {
    const px = x + rr(-0.06, 0.06) * s, pz = z + rr(-0.06, 0.06) * s, py = y + rr(0.05, 0.09) * s, c = pick(cols);
    for (let p = 0; p < 5; p++) { const a = p * 1.2566; g.add(ball(0.013 * s, c, px + Math.cos(a) * 0.014 * s, py, pz + Math.sin(a) * 0.014 * s, { keep: true, seg: 6, s: [1, 0.55, 1] })); }
    g.add(ball(0.008 * s, 0xf6c443, px, py + 0.004 * s, pz, { keep: true, seg: 6 }));
  }
  return g;
}
function bush(x, z, r = 0.12, col = 0x5f9a46, bloom = null, y = 0) {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) { const a = rnd() * 6.28, d = rr(0, r * 0.6); g.add(ball(r * rr(0.45, 0.7), jit(col, 0.07), x + Math.cos(a) * d, y + r * rr(0.35, 0.75), z + Math.sin(a) * d, { keep: true, seg: 10 })); }
  if (bloom) for (let i = 0; i < 9; i++) { const a = rnd() * 6.28; g.add(ball(r * 0.13, pick(bloom), x + Math.cos(a) * r * 0.7, y + r * rr(0.5, 1.05), z + Math.sin(a) * r * 0.7, { keep: true, seg: 6 })); }
  return g;
}
function pebbles(x, z, n = 4, hex = 0xb7b0a2, s = 1) { const g = new THREE.Group(); for (let i = 0; i < n; i++) g.add(stone(rr(0.025, 0.045) * s, hex, x + rr(-0.08, 0.08) * s, 0.012, z + rr(-0.08, 0.08) * s)); return g; }
/** Grassy earth island every sprite stands on (matches the painted map sprites' little ground base). */
function island(rx, rz, o = {}) {
  const g = new THREE.Group();
  const pts = []; const N = 30;
  for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2; const k = 1 + rr(-0.05, 0.05); pts.push(new THREE.Vector2(Math.cos(a) * rx * k, Math.sin(a) * rz * k)); }
  const sh = new THREE.Shape(pts);
  const dirt = new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.03, bevelSegments: 3, curveSegments: 6 }); dirt.rotateX(-Math.PI / 2);
  g.add(put(dirt, o.dirt ?? 0x9a6a43, 0, -0.115, 0, { keep: !o.weather }));
  const top = new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.04, bevelSegments: 3, curveSegments: 6 }); top.rotateX(-Math.PI / 2);
  g.add(put(top, o.grass ?? 0x8dbb58, 0, -0.035, 0, { keep: !o.weather }));
  const fl = o.flowers ?? FLOWER_SETS.meadow, gc = o.grassCols ?? GRASS;
  for (let i = 0; i < (o.tufts ?? 14); i++) { const a = rnd() * 6.28; g.add(tuft(Math.cos(a) * rx * rr(0.82, 0.98), Math.sin(a) * rz * rr(0.82, 0.98), rr(0.8, 1.2), gc)); }
  for (let i = 0; i < (o.blooms ?? 6); i++) { const a = rnd() * 6.28; g.add(flowers(Math.cos(a) * rx * rr(0.78, 0.92), Math.sin(a) * rz * rr(0.78, 0.92), 3, fl, 0.85)); }
  for (let i = 0; i < (o.stones ?? 3); i++) { const a = rnd() * 6.28; g.add(pebbles(Math.cos(a) * rx * 0.88, Math.sin(a) * rz * 0.88, 2)); }
  return g;
}
function ivy(x0, y0, w, h, n = 30) { // leaves on a plane facing +z at local z=0
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) { const t = rnd(); const x = x0 + rr(0, w) * (0.4 + t * 0.6), y = y0 + h * Math.pow(rnd(), 1.6); g.add(ball(rr(0.018, 0.03), pick([0x4f8a3c, 0x5f9a46, 0x6fae52, 0x447a36]), x, y, rr(0.005, 0.02), { keep: true, seg: 6, s: [1, 1, 0.45] })); }
  return g;
}
function lantern(x, y, z, lit = true, s = 1) {
  const g = new THREE.Group();
  g.add(rbox(0.07 * s, 0.012 * s, 0.07 * s, 0x3b302a, x, y, z));
  g.add(rbox(0.055 * s, 0.075 * s, 0.055 * s, lit ? 0xffd27a : 0x5a554e, x, y + 0.012 * s, z, lit ? { emissive: 0xffa53a, ei: 1.1, keep: true } : {}));
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(cyl(0.004 * s, 0.004 * s, 0.08 * s, 0x3b302a, x + dx * 0.03 * s, y + 0.008 * s, z + dz * 0.03 * s, { seg: 4 }));
  g.add(cone(0.055 * s, 0.035 * s, 0x3b302a, x, y + 0.088 * s, z, { seg: 4, ry: Math.PI / 4 }));
  g.add(put(new THREE.TorusGeometry(0.012 * s, 0.003 * s, 4, 10), 0x3b302a, x, y + 0.13 * s, z));
  return g;
}
function lampPost(x, z, lit = true, h = 0.5) { const g = new THREE.Group(); g.add(cyl(0.035, 0.045, 0.04, 0x3b302a, x, 0, z)); g.add(cyl(0.014, 0.018, h, 0x3b302a, x, 0, z, { seg: 8 })); g.add(lantern(x, h, z, lit, 1.2)); return g; }

// ------------------------------------------------------------------ building parts
/** Roof of tiles/shingles/slate: ridge along x, slopes to ±z. `upto` keeps eave rows only (repair), `missing` drops tiles (ruin). */
function tiledRoof(w, d, h, hex, y, o = {}) {
  const g = new THREE.Group();
  const over = o.over ?? 0.09, W = w + 2 * over;
  const ang = Math.atan2(h, d / 2), L = Math.hypot(d / 2, h) + over;
  const style = o.style ?? 'clay';
  const tw = style === 'clay' ? 0.075 : 0.085, th = style === 'clay' ? 0.085 : 0.07;
  const cols = Math.round(W / tw), rows = Math.round(L / th);
  for (const side of [1, -1]) {
    const slab = new THREE.Group();
    if (o.rafters) for (let i = 0; i <= Math.round(W / 0.14); i++) slab.add(rbox(0.03, 0.035, L, 0x8a5c38, -W / 2 + i * 0.14, -0.04, 0, { keep: o.freshRafters }));
    if (o.battens) for (let r = 0; r < rows; r += 2) slab.add(rbox(W, 0.014, 0.022, 0xd8b27a, 0, -0.005, L / 2 - (r + 0.5) * th, { keep: true }));
    if (!o.noBoard) slab.add(rbox(W, 0.025, L, o.under ?? 0x6b4a33, 0, -0.045, 0));
    for (let r = 0; r < rows; r++) {
      if (r / rows >= (o.upto ?? 1)) continue;
      for (let c = 0; c < cols + (r % 2); c++) {
        if (rnd() < (o.missing ?? 0) * (0.4 + r / rows)) continue;
        const x = -W / 2 + (c + (r % 2 ? 0 : 0.5)) * W / cols;
        if (x < -W / 2 - 0.01 || x > W / 2 + 0.01) continue;
        const z = L / 2 - (r + 0.5) * L / rows;
        const hex2 = jit(hex, 0.07, 0.01);
        let m;
        if (style === 'clay') m = put(new THREE.CylinderGeometry(tw * 0.5, tw * 0.46, th * 1.3, 8), hex2, x, 0.0, z, { rx: Math.PI / 2 + 0.12, s: [1, 1, 0.42] });
        else if (style === 'slate') m = rbox(tw * 0.92, 0.02, th * 1.35, hex2, x, -0.01, z, { r: 0.25, rx: 0.1 });
        else m = rbox(tw * 0.95, 0.024, th * 1.4, hex2, x, -0.012, z, { r: 0.3, rx: 0.12 });
        slab.add(m);
      }
    }
    slab.add(rbox(W, 0.03, 0.03, o.trim ?? 0x6b4a33, 0, -0.03, L / 2));
    slab.rotation.x = ang;
    slab.position.set(0, y + h - (L / 2) * Math.sin(ang), (L / 2) * Math.cos(ang) - over * Math.cos(ang) * 0.5);
    const holder = grp(slab); holder.rotation.y = side === 1 ? 0 : Math.PI;
    g.add(holder);
  }
  if ((o.upto ?? 1) >= 1 && (o.missing ?? 0) < 0.3) g.add(capsule(0.035, W, o.ridge ?? jit(hex, 0.1), 0, y + h + 0.02, 0, { rz: Math.PI / 2 }));
  return g;
}
/** Straw thatch: stacked rounded bundles with a rolled ridge. */
function thatchRoof(w, d, h, y, o = {}) {
  const g = new THREE.Group(); const over = 0.12, W = w + 2 * over;
  const ang = Math.atan2(h, d / 2), L = Math.hypot(d / 2, h) + over; const rows = Math.round(L / 0.06);
  const cols = [0xd6be82, 0xc9ad6c, 0xbd9f5e, 0xdfca92];
  for (const side of [1, -1]) {
    const slab = new THREE.Group();
    for (let r = 0; r < rows; r++) {
      if (r / rows >= (o.upto ?? 1)) continue;
      const z = L / 2 - (r + 0.5) * L / rows; const rad = r === 0 ? 0.05 : 0.038;
      for (let k = 0; k < 3; k++) { if (rnd() < (o.missing ?? 0)) continue; const seg = W / 3; slab.add(capsule(rad, seg - rad, jit(pick(cols), 0.05), -W / 2 + (k + 0.5) * seg, rad * 0.4, z, { rz: Math.PI / 2 })); }
    }
    slab.add(rbox(W, 0.03, L, 0x8a6a3e, 0, -0.03, 0));
    slab.rotation.x = ang; slab.position.set(0, y + h - (L / 2) * Math.sin(ang), (L / 2) * Math.cos(ang) - over * 0.5 * Math.cos(ang));
    const holder = grp(slab); holder.rotation.y = side === 1 ? 0 : Math.PI; g.add(holder);
  }
  if ((o.upto ?? 1) >= 1) { g.add(capsule(0.06, W - 0.05, 0xc9984a, 0, y + h + 0.03, 0, { rz: Math.PI / 2 })); for (let i = 0; i < 5; i++) g.add(rbox(0.02, 0.12, 0.14, 0x9a7a3e, -W / 2 + 0.1 + i * (W - 0.2) / 4, y + h - 0.02, 0, { r: 0.4 })); }
  return g;
}
/** Triangular gable wall on the +x/-x ends (ridge along x). */
function gableEnd(d, h, hex, x, y, o = {}) {
  const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1 }); geo.translate(0, 0, -0.025);
  const g = grp(put(geo, hex, 0, 0, 0));
  if (o.beams) { g.add(rbox(0.035, h * 0.8, 0.02, o.beams, 0, 0, 0.035)); const l = rbox(0.03, Math.hypot(d / 2, h) * 0.9, 0.02, o.beams, -d / 4, 0.02, 0.035); l.rotation.z = -Math.atan2(d / 2, h); g.add(l); const r2 = rbox(0.03, Math.hypot(d / 2, h) * 0.9, 0.02, o.beams, d / 4, 0.02, 0.035); r2.rotation.z = Math.atan2(d / 2, h); g.add(r2); }
  if (o.vent) g.add(put(new THREE.CircleGeometry(0.045, 14), 0x3b2c22, 0, h * 0.45, 0.03));
  g.position.set(x, y, 0); g.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
  return g;
}
/** One wall face along local x (length len) at z=0, facing +z. Styles: plaster, timber, stone, logs, boards, brick. */
function wallFace(len, h, style, hex, st, o = {}) {
  const g = new THREE.Group(); const ruin = st === 0;
  const segs = Math.max(2, Math.round(len / 0.12)); const sw = len / segs;
  const hs = Array.from({ length: segs }, (_, i) => (ruin ? (rnd() < 0.15 ? 0 : h * (0.35 + 0.65 * Math.abs(Math.sin(i * 1.7 + SEED % 7)) * rr(0.6, 1))) : h));
  if (style === 'stone' || style === 'brick') {
    const rowH = style === 'brick' ? 0.045 : 0.085, rows = Math.max(1, Math.round(h / rowH));
    for (let r = 0; r < rows; r++) {
      let t = -len / 2 + (r % 2 ? (style === 'brick' ? 0.04 : 0.05) : 0) - 0.02;
      while (t < len / 2) {
        const bl = Math.min(len / 2 - t, style === 'brick' ? 0.09 : rr(0.09, 0.16)); const mid = t + bl / 2;
        const si = Math.min(segs - 1, Math.max(0, Math.floor((mid + len / 2) / sw)));
        if (bl > 0.02 && (r + 1) * rowH <= hs[si] + 0.001 + (rows === 1 ? 1 : 0)) g.add(rbox(bl - 0.012, Math.min(rowH, h) - 0.012, 0.07, jit(hex, style === 'brick' ? 0.05 : 0.07), mid, r * rowH, 0, { r: style === 'brick' ? 0.2 : 0.32 }));
        t += bl;
      }
    }
    const fill = Math.max(0.01, Math.min(h, ...hs.filter(Boolean)) * 0.95);
    g.add(rbox(len - 0.03, fill, 0.05, o.mortar ?? 0xd9d0bf, 0, 0, -0.02, { r: 0.05 }));
  } else if (style === 'logs') {
    const rows = Math.round(h / 0.07); const top = Math.max(...hs);
    for (let r = 0; r < rows; r++) { const y = r * 0.07 + 0.035; if (ruin && y > top * rr(0.5, 1)) continue; g.add(capsule(0.036, len, jit(hex, 0.07), 0, y, 0, { rz: Math.PI / 2 })); }
  } else {
    for (let i = 0; i < segs; i++) {
      if (hs[i] <= 0.01) continue;
      const x = -len / 2 + (i + 0.5) * sw;
      if (style === 'boards') g.add(rbox(sw - 0.008, hs[i], 0.04, jit(hex, 0.05), x, 0, 0, { r: 0.2 }));
      else g.add(rbox(sw + 0.002, hs[i], 0.05, jit(hex, 0.015), x, 0, 0, { r: 0.04 }));
    }
    if (style === 'timber' && !ruin) {
      const beam = o.beam ?? 0x6b4a33;
      for (const x of [-len / 2 + 0.02, len / 2 - 0.02, ...(len > 0.6 ? [0] : [])]) g.add(rbox(0.045, h, 0.03, jit(beam, 0.04), x, 0, 0.03));
      g.add(rbox(len, 0.04, 0.032, beam, 0, h - 0.04, 0.03)); g.add(rbox(len, 0.035, 0.032, beam, 0, h * 0.48, 0.03));
      for (const sgn of [-1, 1]) { const b = rbox(0.03, Math.hypot(len / 4, h * 0.45), 0.028, beam, sgn * len / 4, h * 0.5, 0.032); b.rotation.z = sgn * 0.7; g.add(b); }
    }
    if (ruin && style !== 'boards') for (let i = 0; i < 3; i++) g.add(rbox(rr(0.05, 0.1), rr(0.04, 0.08), 0.052, 0xb7ae9e, rr(-len / 2, len / 2) * 0.8, rr(0.05, h * 0.5), 0.005, { r: 0.3 }));
  }
  return g;
}
/** Four walls: front (+z) and side (+x) get full detail; back faces are simple. */
function walls(w, d, h, style, hex, st, y = 0, o = {}) {
  const g = new THREE.Group();
  g.add(at(wallFace(w, h, style, hex, st, o), 0, y, d / 2));
  g.add(at(wallFace(d, h, style, hex, st, o), w / 2, y, 0, Math.PI / 2));
  g.add(at(wallFace(w, h, style, hex, st, o), 0, y, -d / 2, Math.PI));
  g.add(at(wallFace(d, h, style, hex, st, o), -w / 2, y, 0, -Math.PI / 2));
  if (st > 0 || style === 'logs') g.add(rbox(w - 0.04, h * (st === 0 ? 0.4 : 0.98), d - 0.04, 0x5a4636, 0, y, 0));
  return g;
}
/** Window on a face plane (local +z out); origin at the top-centre of the opening. */
function windowAt(o = {}) {
  const w = o.w ?? 0.15, h = o.h ?? 0.19, lit = o.lit ?? false, frame = o.frame ?? 0xf4ead4, g = new THREE.Group();
  if (o.boarded) { g.add(rbox(w + 0.03, h + 0.03, 0.02, 0x3a2e26, 0, -h - 0.015, 0.02)); for (const s of [-1, 1]) { const p = rbox(w * 1.35, 0.035, 0.02, 0x8a6a4a, 0, -h / 2 - 0.017, 0.04); p.rotation.z = s * 0.75; g.add(p); } return g; }
  if (o.arch) { const s = new THREE.Shape(); s.moveTo(-w / 2, -h); s.lineTo(w / 2, -h); s.lineTo(w / 2, -w / 2); s.absarc(0, -w / 2, w / 2, 0, Math.PI, false); s.closePath(); const fr = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.01, bevelSegments: 2 }); g.add(put(fr, frame, 0, 0, 0)); g.add(put(new THREE.ShapeGeometry(s), lit ? 0xffd98a : 0x37505e, 0, 0, 0.032, lit ? { emissive: 0xffa94d, ei: 0.75, keep: true } : { keep: true, rough: 0.3 })); }
  else { g.add(rbox(w + 0.035, h + 0.035, 0.025, frame, 0, -h - 0.0175, 0, { r: 0.2 })); g.add(rbox(w, h, 0.01, lit ? 0xffd98a : 0x37505e, 0, -h, 0.022, lit ? { emissive: 0xffa94d, ei: 0.75, keep: true } : { keep: true, rough: 0.3 })); }
  g.add(rbox(0.014, h, 0.016, frame, 0, -h, 0.03)); g.add(rbox(w, 0.014, 0.016, frame, 0, -h / 2 - 0.007, 0.03));
  g.add(rbox(w + 0.06, 0.022, 0.05, o.sill ?? frame, 0, -h - 0.03, 0.02));
  if (o.shutters) for (const s of [-1, 1]) { g.add(rbox(w * 0.45, h + 0.01, 0.018, o.shutters, s * (w / 2 + w * 0.26), -h - 0.005, 0.005, { r: 0.15 })); for (let k = 0; k < 3; k++) g.add(rbox(w * 0.38, 0.008, 0.02, new THREE.Color(o.shutters).multiplyScalar(0.8).getHex(), s * (w / 2 + w * 0.26), -h * (0.25 + k * 0.25) - 0.004, 0.012)); }
  if (o.box) { g.add(rbox(w + 0.05, 0.04, 0.05, o.boxColor ?? 0x8a5c38, 0, -h - 0.075, 0.045)); g.add(flowers(-w / 4, 0.05, 3, o.box, 0.7, -h - 0.045)); g.add(flowers(w / 4, 0.05, 3, o.box, 0.7, -h - 0.045)); for (let i = 0; i < 3; i++) g.add(ball(0.014, 0x4f8a3c, rr(-w / 2, w / 2), -h - 0.07 - rr(0, 0.04), 0.075, { keep: true, seg: 6 })); }
  if (o.awning) for (let i = 0; i < 6; i++) { const a = rbox((w + 0.08) / 6, 0.012, 0.09, i % 2 ? 0xffffff : o.awning, -(w + 0.08) / 2 + (i + 0.5) * (w + 0.08) / 6, 0.02, 0.05); a.rotation.x = 0.5; g.add(a); }
  return g;
}
function doorAt(o = {}) {
  const w = o.w ?? 0.17, h = o.h ?? 0.27, c = o.color ?? 0x7a4a2c, g = new THREE.Group();
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.closePath();
  const fr = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelSize: 0.022, bevelThickness: 0.012, bevelSegments: 2 });
  g.add(put(fr, o.frame ?? 0xb9ae9c, 0, 0, -0.005));
  const leaf = new THREE.ExtrudeGeometry(s, { depth: 0.022, bevelEnabled: false });
  if (o.broken) { g.add(put(leaf, 0x3a2e26, 0, 0, 0.01)); g.add(rbox(w * 0.9, h * 0.6, 0.02, 0x7a6a5a, 0.03, 0.0, 0.045, { rz: 0.15 })); return g; }
  g.add(put(leaf, c, 0, 0, 0.01));
  for (let i = 1; i < 4; i++) g.add(rbox(0.006, h * 0.85, 0.006, new THREE.Color(c).multiplyScalar(0.7).getHex(), -w / 2 + i * w / 4, 0.01, 0.034));
  for (const y of [h * 0.25, h * 0.65]) g.add(rbox(w * 0.6, 0.014, 0.008, 0x3b302a, -w * 0.18, y, 0.036));
  g.add(ball(0.012, 0xd9a441, w * 0.3, h * 0.45, 0.04, { keep: true, metal: 0.3 }));
  g.add(rbox(w + 0.1, 0.035, 0.09, 0xa59d90, 0, -0.035, 0.05));
  if (o.mat) g.add(rbox(w * 0.9, 0.006, 0.06, 0xb5654a, 0, 0.0, 0.08));
  return g;
}
function chimney(x, z, y, h, hex = 0xa89f92) {
  const g = new THREE.Group();
  for (let r = 0; r < Math.round(h / 0.06); r++) for (const dx of [-0.04, 0.04]) g.add(rbox(0.08, 0.055, 0.15, jit(hex, 0.07), x + dx + (r % 2 ? 0.01 : -0.01), y + r * 0.06, z, { r: 0.3 }));
  g.add(rbox(0.19, 0.035, 0.18, 0x7d766c, x, y + h, z));
  g.add(cyl(0.03, 0.03, 0.05, 0xb5654a, x - 0.03, y + h + 0.035, z));
  return g;
}
function scaffold(x0, x1, z, h) {
  const g = new THREE.Group(); const C = 0xc9a06a;
  for (const x of [x0, (x0 + x1) / 2, x1]) for (const dz of [0, 0.14]) g.add(cyl(0.013, 0.013, h + 0.12, C, x, 0, z + dz, { seg: 6, keep: true }));
  for (let y = 0.32; y < h; y += 0.34) { for (let k = 0; k < 3; k++) g.add(rbox(x1 - x0 + 0.08, 0.016, 0.045, jit(0xdcb57d, 0.05), (x0 + x1) / 2, y, z + 0.025 + k * 0.047, { keep: true })); g.add(rbox(x1 - x0, 0.012, 0.012, C, (x0 + x1) / 2, y + 0.15, z + 0.14, { keep: true })); }
  const br = rbox(0.012, Math.hypot(x1 - x0, h * 0.6), 0.012, C, (x0 + x1) / 2, 0.05, z + 0.145, { keep: true }); br.rotation.z = Math.atan2(x1 - x0, h * 0.6); g.add(br);
  return g;
}
function ladder(x, z, h, ry = 0) { const g = new THREE.Group(); for (const s of [-1, 1]) g.add(rbox(0.018, h, 0.018, 0xc9a06a, s * 0.05, 0, 0, { keep: true })); for (let y = 0.06; y < h; y += 0.075) g.add(rbox(0.1, 0.012, 0.014, 0xc9a06a, 0, y, 0, { keep: true })); g.rotation.set(-0.2, ry, 0); g.position.set(x, 0, z); return g; }
function plankStack(x, z, ry = 0) { const g = new THREE.Group(); for (let i = 0; i < 6; i++) g.add(rbox(0.36, 0.024, 0.07, jit(0xe0bd86, 0.05), 0, i * 0.026, (i % 3 - 1) * 0.075, { keep: true })); for (const s of [-1, 1]) g.add(rbox(0.04, 0.03, 0.24, 0x8a6a4a, s * 0.13, -0.002, 0, { keep: true })); g.position.set(x, 0, z); g.rotation.y = ry; return g; }
function tileStack(x, z, hex = 0xc4673f) { const g = new THREE.Group(); for (let i = 0; i < 7; i++) g.add(put(new THREE.CylinderGeometry(0.036, 0.034, 0.1, 8), jit(hex, 0.05), x, 0.02 + i * 0.022, z, { rx: Math.PI / 2, s: [1, 1, 0.42], keep: true })); return g; }
function bucket(x, z) { return grp(cyl(0.035, 0.028, 0.06, 0x8a8f96, x, 0, z, { keep: true, metal: 0.2 }), put(new THREE.TorusGeometry(0.03, 0.003, 4, 12, Math.PI), 0x5a5f66, x, 0.065, z)); }
function crate(x, z, s = 1, ry = 0) { const g = new THREE.Group(); g.add(rbox(0.12 * s, 0.1 * s, 0.12 * s, 0xb3854f, 0, 0, 0)); for (const y of [0.012, 0.075]) g.add(rbox(0.125 * s, 0.014 * s, 0.125 * s, 0x8a6036, 0, y * s, 0)); g.position.set(x, 0, z); g.rotation.y = ry; return g; }
function sack(x, z, hex = 0xe6dcc4) { const g = new THREE.Group(); g.add(ball(0.055, hex, x, 0.05, z, { s: [1, 1.15, 0.9] })); g.add(cyl(0.02, 0.03, 0.03, hex, x, 0.105, z)); g.add(put(new THREE.TorusGeometry(0.02, 0.004, 4, 10), 0xa47a50, x, 0.112, z, { rx: Math.PI / 2 })); return g; }
function rubble(x, z, hex = 0xa59d90, n = 8, s = 1) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) g.add(stone(rr(0.03, 0.06) * s, hex, x + rr(-0.16, 0.16) * s, 0.015, z + rr(-0.12, 0.12) * s));
  for (let i = 0; i < 3; i++) { const p = rbox(rr(0.2, 0.32) * s, 0.022, 0.05, 0x8a6a4a, x + rr(-0.1, 0.1) * s, 0.01 + i * 0.02, z + rr(-0.1, 0.1) * s); p.rotation.y = rr(0, 3); p.rotation.z = rr(-0.15, 0.15); g.add(p); }
  return g;
}
function weeds(x, z, n = 3) { const g = new THREE.Group(); for (let i = 0; i < n; i++) g.add(tuft(x + rr(-0.1, 0.1), z + rr(-0.1, 0.1), rr(1, 1.5), [0x8a9a4a, 0x9aa255, 0x7a8a42])); return g; }
function stepping(x0, z0, x1, z1, n = 4, hex = 0xc9c0b0) { const g = new THREE.Group(); for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; g.add(stone(rr(0.04, 0.055), hex, x0 + (x1 - x0) * t + rr(-0.02, 0.02), 0.005, z0 + (z1 - z0) * t, { sy: 0.3 })); } return g; }

/**
 * Common house: plinth, walls, gables, roof, windows, door and stage dressing.
 * windows: [{ face: 'z'|'x', u, v, ...windowAt opts }] (v = top of opening above the plinth); door: { face, u, ...doorAt opts }.
 */
function house(st, o) {
  const g = new THREE.Group(); const { w, d, h } = o; const py = o.plinth ?? 0.08; const lit = st === 2;
  if (py > 0) g.add(walls(w + 0.04, d + 0.04, py, 'stone', o.stoneColor ?? 0xb3aa9c, st === 0 ? 1 : 2));
  g.add(walls(w, d, h, o.wall, o.wallColor, st, py, { beam: o.beam }));
  const top = py + h;
  for (const win of o.windows ?? []) {
    const wo = windowAt({ ...win, lit, boarded: st === 0, box: st === 2 ? win.box : null, shutters: st === 0 ? null : win.shutters, awning: st === 2 ? win.awning : null });
    if (st === 0 && win.v > h * 0.6) continue;
    if (win.face === 'x') g.add(at(wo, w / 2 + 0.03, py + win.v, win.u, Math.PI / 2)); else g.add(at(wo, win.u, py + win.v, d / 2 + 0.03));
  }
  if (o.door) { const dd = doorAt({ ...o.door, broken: st === 0, mat: st === 2 }); if (o.door.face === 'x') g.add(at(dd, w / 2 + 0.03, py, o.door.u, Math.PI / 2)); else g.add(at(dd, o.door.u, py, d / 2 + 0.03)); }
  const rh = o.roofH ?? 0.36;
  if (st > 0) for (const x of [w / 2, -w / 2]) g.add(gableEnd(d, rh, o.gableColor ?? o.wallColor, x, top, { beams: o.wall === 'timber' ? o.beam ?? 0x6b4a33 : null, vent: st === 2 }));
  const roofOpts = { style: o.roof, trim: o.trim, ridge: o.ridge, under: o.under };
  if (st === 2) g.add(o.roof === 'thatch' ? thatchRoof(w, d, rh, top) : tiledRoof(w, d, rh, o.roofColor, top, roofOpts));
  if (st === 1) g.add(o.roof === 'thatch' ? grp(tiledRoof(w, d, rh, 0xc9a06a, top, { style: 'shingle', upto: 0, rafters: true, battens: true, freshRafters: true, noBoard: true }), thatchRoof(w, d, rh, top, { upto: 0.4 })) : tiledRoof(w, d, rh, o.roofColor, top, { ...roofOpts, upto: 0.5, rafters: true, battens: true, freshRafters: true, noBoard: true }));
  if (st === 0) g.add(tiledRoof(w, d, rh * 0.9, o.roof === 'thatch' ? 0xa0884e : o.roofColor, top - 0.1, { ...roofOpts, style: o.roof === 'thatch' ? 'shingle' : o.roof, missing: 0.85, rafters: true, noBoard: true, upto: 0.65 }));
  if (o.chimney && st > 0) g.add(chimney(o.chimney[0], o.chimney[1], top + 0.02, rh + 0.1, o.stoneColor ?? 0xa89f92));
  if (st === 0) {
    g.add(rubble(w * 0.15, d / 2 + 0.25, o.stoneColor ?? 0xa59d90, 9));
    g.add(at(ivy(-w / 2 + 0.05, py, w * 0.6, h * 0.8, 45), 0, 0, d / 2 + 0.035));
    g.add(at(ivy(-d / 2, py, d * 0.7, h * 0.7, 30), w / 2 + 0.035, 0, 0, Math.PI / 2));
    for (let i = 0; i < 6; i++) g.add(weeds(rr(-w / 2, w / 2), d / 2 + rr(0.05, 0.3)));
    const fallen = rbox(0.5, 0.04, 0.05, 0x6b4a33, -w / 2 - 0.1, 0.02, d / 2 + 0.15); fallen.rotation.y = 0.6; fallen.rotation.z = 0.12; g.add(fallen);
  }
  if (st === 1) {
    g.add(scaffold(-w / 2 + 0.05, w / 2 - 0.05, d / 2 + 0.1, top + rh * 0.5));
    g.add(ladder(w / 2 + 0.16, d / 2 + 0.12, top + 0.15, -0.3));
    g.add(plankStack(-w / 2 - 0.25, d / 2 + 0.1, 0.5)); g.add(tileStack(w / 2 + 0.25, d / 2 - 0.1, o.roofColor ?? 0xc4673f)); g.add(bucket(w / 2 + 0.05, d / 2 + 0.38));
    g.add(crate(-w / 2 + 0.1, d / 2 + 0.4, 1, 0.3));
  }
  if (st === 2) {
    if (o.door) g.add(o.door.face === 'x' ? stepping(w / 2 + 0.12, o.door.u, w / 2 + 0.45, o.door.u + 0.05, 3) : stepping(o.door.u, d / 2 + 0.12, o.door.u + 0.05, d / 2 + 0.45, 3));
    const fl = o.flowers ?? FLOWER_SETS.meadow;
    for (let i = 0; i < 5; i++) { const x = -w / 2 + 0.08 + i * (w - 0.16) / 4 + rr(-0.03, 0.03); if (o.door && o.door.face !== 'x' && Math.abs(x - o.door.u) < 0.12) continue; g.add(flowers(x, d / 2 + 0.1, 4, fl)); }
    for (let i = 0; i < 3; i++) { const z = -d / 2 + 0.12 + i * (d - 0.24) / 2; if (o.door && o.door.face === 'x' && Math.abs(z - o.door.u) < 0.12) continue; g.add(flowers(w / 2 + 0.09, z, 4, fl)); }
    g.add(bush(-w / 2 - 0.08, d / 2 + 0.05, 0.1, 0x5f9a46, fl));
    g.add(at(ivy(-w / 2 + 0.02, py, w * 0.22, h, 22), 0, 0, d / 2 + 0.035));
  }
  return g;
}

// ------------------------------------------------------------------ trees (one per region)
function trunk(h, r, hex = 0x7a5236, lean = 0) {
  const g = new THREE.Group();
  const t = cyl(r * 0.7, r, h, hex, 0, 0, 0, { seg: 9 }); t.rotation.z = lean; g.add(t);
  for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4; const root = cone(r * 0.5, r * 1.6, hex, Math.cos(a) * r * 0.9, -0.02, Math.sin(a) * r * 0.9, { seg: 6 }); root.rotation.z = Math.cos(a) * 1.1; root.rotation.x = -Math.sin(a) * 1.1; g.add(root); }
  return g;
}
/** Canopy of overlapping smooth clumps, lighter toward the top-left light. */
function canopy(cx, cy, cz, rx, ry, cols, n = 16, clump = 0.45) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const u = rnd() * 6.28, v = Math.acos(rr(-0.6, 1)); const x = Math.sin(v) * Math.cos(u) * rx, y = Math.cos(v) * ry, z = Math.sin(v) * Math.sin(u) * rx;
    const k = (y / ry + 1) / 2; const c = new THREE.Color(cols[0]).lerp(new THREE.Color(cols[2]), Math.min(1, k * 0.9 + (x < 0 ? 0.15 : 0))).lerp(new THREE.Color(cols[1]), 0.25);
    g.add(ball(Math.max(rx, ry) * clump * rr(0.75, 1.1), c.offsetHSL(0, 0, rr(-0.03, 0.03)).getHex(), cx + x, cy + y, cz + z, { keep: true, seg: 12 }));
  }
  return g;
}
const TREE_BASE = (cols = GRASS, fl = FLOWER_SETS.meadow, r = 0.22) => island(r, r * 0.85, { tufts: 8, blooms: 3, stones: 1, grassCols: cols, flowers: fl });
export const TREES = {
  /** Quiet Valley: broad apple oak with red fruit. */
  meadowOak() { SEED = 7; const g = grp(TREE_BASE(), trunk(0.42, 0.065, 0x7a5236)); for (const s of [-1, 1]) g.add(cyl(0.025, 0.035, 0.22, 0x7a5236, s * 0.06, 0.3, 0, { seg: 7, rz: -s * 0.7 })); g.add(canopy(0, 0.68, 0, 0.32, 0.22, [0x4f8a36, 0x77ad45, 0xa9d167], 22)); for (let i = 0; i < 12; i++) { const a = rnd() * 6.28; g.add(ball(0.028, 0xd9483b, Math.cos(a) * 0.3, 0.55 + rr(0, 0.25), Math.sin(a) * 0.28, { keep: true, seg: 8 })); } return g; },
  /** Old Mill Road: slender poplar. */
  poplar() { SEED = 11; return grp(TREE_BASE(GRASS, FLOWER_SETS.warm, 0.17), trunk(0.3, 0.045, 0x6e4a35), canopy(0, 0.78, 0, 0.15, 0.45, [0x4a7f34, 0x74a644, 0xb2d06c], 20, 0.55)); },
  /** Flower Gardens: magnolia heavy with blossom. */
  magnolia() { SEED = 23; const g = grp(TREE_BASE(GRASS, FLOWER_SETS.garden), trunk(0.36, 0.055, 0x6e4a35, 0.05)); g.add(canopy(0, 0.6, 0, 0.3, 0.2, [0x5e8f44, 0x86b55a, 0xb4d77e], 12)); g.add(canopy(0, 0.64, 0, 0.32, 0.23, [0xe58fb2, 0xf6c3d7, 0xfff1f6], 18, 0.32)); for (let i = 0; i < 10; i++) g.add(ball(0.016, 0xf6c3d7, rr(-0.25, 0.25), 0.02, rr(-0.2, 0.2), { keep: true, seg: 6, s: [1, 0.3, 1] })); return g; },
  /** Lakeside: weeping willow. */
  willow() { SEED = 37; const g = grp(TREE_BASE([0x7fb34e, 0x6fa646], FLOWER_SETS.lake), trunk(0.45, 0.07, 0x6a5440)); g.add(canopy(0, 0.72, 0, 0.26, 0.15, [0x5f8f3e, 0x8db85c, 0xbad781], 12)); for (let i = 0; i < 34; i++) { const a = (i / 34) * 6.28 + rr(-0.1, 0.1), r = rr(0.2, 0.32), l = rr(0.28, 0.48); for (let k = 0; k < 4; k++) g.add(ball(0.03, pick([0x7fae52, 0x95c063, 0xa6cc72]), Math.cos(a) * (r + k * 0.012), 0.74 - k * l / 4, Math.sin(a) * (r + k * 0.012), { keep: true, seg: 6, s: [0.8, 1.6, 0.8] })); } return g; },
  /** Lantern Woods: deep fir with a hanging lantern. */
  lanternFir() { SEED = 41; const g = grp(TREE_BASE([0x6a9e48, 0x5d8f40], FLOWER_SETS.forest), trunk(0.22, 0.05, 0x5c4231)); const tc = [0x2f5e3e, 0x3b6e48, 0x467d52, 0x568e5e, 0x67a06c]; for (let i = 0; i < 5; i++) { const y = 0.16 + i * 0.17, r = 0.3 - i * 0.05; for (let k = 0; k < 10; k++) { const a = (k / 10) * 6.28 + i; g.add(put(new THREE.ConeGeometry(r * 0.42, 0.2, 7), jit(tc[i], 0.04), Math.cos(a) * r * 0.55, y + 0.1, Math.sin(a) * r * 0.55, { keep: true, rz: Math.cos(a) * 0.5, rx: -Math.sin(a) * 0.5 })); } g.add(cone(r, 0.24, tc[i], 0, y, 0, { keep: true, seg: 10 })); } g.add(cone(0.06, 0.16, 0x67a06c, 0, 1.0, 0, { keep: true })); g.add(cyl(0.004, 0.004, 0.08, 0x3b302a, 0.2, 0.42, 0.14, { seg: 4 })); g.add(lantern(0.2, 0.33, 0.14, true, 0.9)); return g; },
  /** Festival Square: rounded maple in autumn colours with bunting. */
  festivalMaple() { SEED = 53; const g = grp(TREE_BASE(GRASS, FLOWER_SETS.festival), trunk(0.4, 0.06, 0x6e4a35)); g.add(canopy(0, 0.68, 0, 0.3, 0.22, [0xc25a2e, 0xe39340, 0xf5c45c], 20)); const cols = [0xe0655a, 0xf2c14e, 0x5fa8d3, 0x7fbf6a]; for (let i = 0; i < 11; i++) { const a = -1.4 + i * 0.28; g.add(cone(0.025, 0.05, cols[i % 4], Math.cos(a) * 0.34, 0.5 - Math.sin((i / 10) * Math.PI) * 0.05, Math.sin(a) * 0.34, { keep: true, seg: 3, rx: Math.PI })); } return g; },
};

// ------------------------------------------------------------------ props (one per region)

function boatModel() {
  const g = new THREE.Group();
  const hullG = new THREE.SphereGeometry(0.2, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); hullG.scale(1.55, 0.55, 0.62);
  const hull = put(hullG, 0x4f86b0, 0, 0.1, 0, { keep: true }); hull.material.side = THREE.DoubleSide; g.add(hull);
  const rim = put(new THREE.TorusGeometry(0.2, 0.012, 6, 30), 0xf5efe2, 0, 0.1, 0, { rx: Math.PI / 2, keep: true }); rim.scale.set(1.55, 0.62, 1); g.add(rim);
  g.add(put(new THREE.CircleGeometry(0.19, 24), 0xc9a274, 0, 0.065, 0, { rx: -Math.PI / 2, keep: true, s: [1.5, 0.6, 1] }));
  for (const x of [-0.1, 0.1]) g.add(rbox(0.045, 0.018, 0.22, 0x9a6b42, x, 0.085, 0));
  const oar = rbox(0.42, 0.014, 0.026, 0xd9b27a, 0.02, 0.11, 0.05, { keep: true }); oar.rotation.y = 0.25; g.add(oar);
  g.add(rbox(0.07, 0.006, 0.045, 0xd9b27a, 0.22, 0.11, 0.0, { keep: true }));
  g.add(sack(-0.15, 0.0, 0xeee4cc)); g.children[g.children.length - 1].position.y += 0.06;
  return g;
}
export const PROPS = {
  hayCart() { SEED = 61; const g = grp(island(0.36, 0.28, { tufts: 8, blooms: 3 })); g.add(rbox(0.46, 0.05, 0.26, 0xa0703f, 0, 0.11, 0)); for (const s of [-1, 1]) g.add(rbox(0.46, 0.08, 0.025, 0x8a5c38, 0, 0.16, s * 0.13)); for (const [x, z] of [[-0.15, 0.15], [0.15, 0.15], [-0.15, -0.15], [0.15, -0.15]]) { g.add(put(new THREE.TorusGeometry(0.075, 0.016, 8, 18), 0x6b4a33, x, 0.09, z)); for (let k = 0; k < 4; k++) g.add(rbox(0.008, 0.14, 0.008, 0x6b4a33, x, 0.02, z, { rz: k * 0.785 })); } for (let i = 0; i < 4; i++) g.add(rbox(0.16, 0.1, 0.11, jit(0xe8c76a, 0.04), -0.12 + (i % 2) * 0.2, 0.17 + Math.floor(i / 2) * 0.1, (i % 2 ? 0.04 : -0.04))); g.add(rbox(0.36, 0.02, 0.02, 0x8a5c38, 0.36, 0.12, 0, { rz: 0.2 })); g.add(flowers(-0.3, 0.12, 4, FLOWER_SETS.meadow)); return g; },
  millstones() { SEED = 89; const g = grp(island(0.34, 0.28, { tufts: 8, blooms: 2, flowers: FLOWER_SETS.warm })); const s1 = cyl(0.17, 0.17, 0.06, 0xb3aa9c, -0.12, 0, 0, { seg: 22 }); s1.rotation.z = 1.3; s1.position.y = 0.17; g.add(s1); g.add(cyl(0.17, 0.17, 0.06, 0xa59d90, 0.14, 0, 0.06, { seg: 22 })); g.add(cyl(0.035, 0.035, 0.062, 0x6f6a62, 0.14, 0.001, 0.06)); for (let i = 0; i < 3; i++) g.add(sack(0.18 + (i % 2) * 0.1, -0.16 + i * 0.04, 0xeee4cc)); g.add(crate(-0.25, 0.15, 0.9, 0.3)); return g; },
  flowerArch() { SEED = 67; const g = grp(island(0.36, 0.26, { tufts: 6, blooms: 5, flowers: FLOWER_SETS.garden })); for (const s of [-1, 1]) g.add(rbox(0.035, 0.5, 0.035, 0xf6f1e6, s * 0.22, 0, 0)); g.add(put(new THREE.TorusGeometry(0.22, 0.018, 8, 22, Math.PI), 0xf6f1e6, 0, 0.5, 0)); for (let i = 0; i < 46; i++) { const a = rnd() * Math.PI, side = rnd() < 0.35; const x = side ? (rnd() < 0.5 ? -0.22 : 0.22) : Math.cos(a) * 0.22, y = side ? rr(0.05, 0.5) : 0.5 + Math.sin(a) * 0.22; g.add(ball(i % 3 ? 0.03 : 0.024, i % 3 ? pick([0x5f9a46, 0x6fae52]) : pick(FLOWER_SETS.garden), x + rr(-0.02, 0.02), y, rr(-0.03, 0.03), { keep: true, seg: 7 })); } g.add(flowers(-0.3, 0.05, 5, FLOWER_SETS.garden)); g.add(flowers(0.3, 0.05, 5, FLOWER_SETS.garden)); return g; },
  rowBoat() { SEED = 71; const g = grp(island(0.42, 0.32, { tufts: 6, blooms: 3, flowers: FLOWER_SETS.lake })); g.add(put(new THREE.CircleGeometry(0.27, 26), 0x6fb6c8, 0.04, 0.012, 0.02, { rx: -Math.PI / 2, keep: true, s: [1.3, 1, 1], rough: 0.2 })); const b = boatModel(); b.position.set(0.04, 0.0, 0.02); b.rotation.y = 0.5; g.add(b); for (const z of [-0.12, 0.12]) g.add(cyl(0.02, 0.024, 0.16, 0x5a4636, -0.33, 0, z, { seg: 7 })); g.add(rbox(0.16, 0.025, 0.3, 0xc9a274, -0.33, 0.13, 0)); g.add(lantern(-0.33, 0.16, -0.12, true, 0.7)); for (let i = 0; i < 12; i++) { const x = 0.3 + rr(-0.06, 0.06), z = rr(-0.22, 0.2); g.add(cyl(0.006, 0.006, rr(0.16, 0.3), 0x7a9a4a, x, 0, z, { seg: 4, keep: true })); if (rnd() < 0.45) g.add(capsule(0.013, 0.035, 0x7a5236, x, rr(0.18, 0.26), z, { keep: true })); } return g; },
  lanternShrine() { SEED = 79; const g = grp(island(0.3, 0.25, { tufts: 8, blooms: 3, flowers: FLOWER_SETS.forest, grassCols: [0x6a9e48, 0x5d8f40] })); g.add(walls(0.2, 0.2, 0.1, 'stone', 0x9a958a, 2)); g.add(rbox(0.15, 0.22, 0.15, 0xa59f94, 0, 0.1, 0)); g.add(rbox(0.1, 0.1, 0.16, 0xffd27a, 0, 0.18, 0, { emissive: 0xffa53a, ei: 1, keep: true })); g.add(cone(0.17, 0.12, 0x5b6a5e, 0, 0.32, 0, { seg: 4, ry: Math.PI / 4 })); g.add(ball(0.025, 0xd9a441, 0, 0.46, 0, { keep: true })); for (let i = 0; i < 5; i++) g.add(ball(0.05, jit(0x5f8a4a, 0.05), rr(-0.2, 0.2), 0.03, rr(-0.18, 0.18), { keep: true, s: [1, 0.6, 1] })); for (let i = 0; i < 4; i++) g.add(cyl(0.012, 0.015, 0.05, 0xf0e2c4, rr(-0.15, 0.15), 0, 0.15 + rr(0, 0.05))); return g; },
  marketStall() { SEED = 83; const g = grp(island(0.4, 0.3, { tufts: 6, blooms: 3, flowers: FLOWER_SETS.festival })); g.add(rbox(0.5, 0.2, 0.26, 0xb07a4a, 0, 0, 0)); g.add(rbox(0.52, 0.025, 0.28, 0xd9b27a, 0, 0.2, 0)); for (const [x, z] of [[-0.24, -0.12], [0.24, -0.12], [-0.24, 0.12], [0.24, 0.12]]) g.add(cyl(0.012, 0.012, 0.52, 0x8a5c38, x, 0, z, { seg: 6 })); for (let i = 0; i < 6; i++) { const st = rbox(0.09, 0.016, 0.38, i % 2 ? 0xffffff : 0xe0655a, -0.225 + i * 0.09, 0.52, 0.03); st.rotation.x = -0.25; g.add(st); } for (let i = 0; i < 10; i++) g.add(ball(0.032, pick([0xf2c14e, 0xe0655a, 0x7fbf6a, 0xf29a4a]), -0.2 + (i % 5) * 0.1, 0.25, i < 5 ? -0.05 : 0.06, { keep: true, seg: 8 })); g.add(crate(0.34, 0.12, 0.8)); g.add(lantern(-0.24, 0.52, 0.14, true, 0.8)); return g; },
};

// ------------------------------------------------------------------ landmarks (3 stages)
const LM = {};
const ISLE = (st, fl, extra = {}) => island(extra.rx ?? 0.9, extra.rz ?? 0.72, { weather: st === 0, grass: st === 0 ? 0xa3b062 : extra.grass ?? 0x8dbb58, blooms: st === 0 ? 1 : 8, flowers: fl, grassCols: extra.grassCols });
/** Quiet Valley: thatched farmhouse with a hay lean-to and picket garden. */
LM.farmhouse = (st) => {
  SEED = 606; stageWeather(st);
  const g = grp(ISLE(st, FLOWER_SETS.meadow, { rx: 0.85, rz: 0.72 }));
  g.add(house(st, { w: 0.82, d: 0.6, h: 0.36, wall: 'timber', wallColor: 0xf6ecd8, beam: 0x6b4a33, roof: 'thatch', roofH: 0.42, plinth: 0.08, chimney: [-0.22, -0.12], flowers: FLOWER_SETS.meadow, windows: [{ face: 'z', u: -0.2, v: 0.27, shutters: 0x6f9e4c, box: FLOWER_SETS.meadow }, { face: 'x', u: -0.05, v: 0.27, shutters: 0x6f9e4c, box: FLOWER_SETS.meadow }], door: { face: 'z', u: 0.17, color: 0x6f9e4c } }));
  if (st === 2) { for (const z of [0.22, -0.22]) g.add(rbox(0.04, 0.3, 0.04, 0x7a5236, -0.62, 0, z)); const lean = rbox(0.3, 0.025, 0.56, 0xc9a050, -0.55, 0.3, 0); lean.rotation.z = 0.35; g.add(lean); for (let i = 0; i < 5; i++) g.add(rbox(0.13, 0.1, 0.1, jit(0xe8c76a, 0.04), -0.58 + (i % 2) * 0.1, Math.floor(i / 2) * 0.1, -0.15 + (i % 3) * 0.13)); for (let i = 0; i < 9; i++) g.add(rbox(0.025, 0.13, 0.016, 0xfbf7ef, -0.4 + i * 0.1, 0, 0.62, { r: 0.3 })); g.add(rbox(0.85, 0.018, 0.012, 0xfbf7ef, 0, 0.08, 0.62)); g.add(lampPost(0.48, 0.48, true, 0.42)); }
  if (st === 1) for (let i = 0; i < 3; i++) g.add(capsule(0.06, 0.24, 0xe3be6a, -0.6, 0.06, -0.2 + i * 0.13, { rz: Math.PI / 2, keep: true }));
  return g;
};
/** Old Mill Road: stone watermill with timber upper floor, clay roof and paddle wheel. */
LM.watermill = (st) => {
  SEED = 101; stageWeather(st, 0.55);
  const g = grp(ISLE(st, FLOWER_SETS.warm, { rx: 0.95, rz: 0.75 }));
  const base = house(st, { w: 0.8, d: 0.62, h: st === 0 ? 0.3 : 0.54, wall: st === 0 ? 'stone' : 'stone', wallColor: 0xb5ac9e, roof: 'clay', roofColor: 0xc4673f, roofH: 0.34, plinth: 0, chimney: [-0.2, -0.1], flowers: FLOWER_SETS.warm, windows: [{ face: 'z', u: -0.2, v: 0.24, arch: true, w: 0.13, h: 0.17 }, { face: 'z', u: 0.12, v: 0.5, shutters: 0x5f8db0, box: FLOWER_SETS.warm }, { face: 'x', u: -0.05, v: 0.5, shutters: 0x5f8db0 }], door: { face: 'z', u: 0.15, color: 0x5f8db0 } });
  base.position.x = -0.1; g.add(base);
  if (st > 0) { const band = walls(0.84, 0.66, 0.035, 'plaster', 0x6b4a33, 2, 0.29); band.position.x = -0.1; g.add(band); }
  const wx = 0.42;
  g.add(walls(0.16, 0.9, 0.08, 'stone', 0xa59d90, 2).translateX(wx).translateZ(0.05));
  if (st > 0) g.add(rbox(0.12, 0.012, 0.9, 0x6fb3c8, wx, 0.07, 0.05, { keep: true, opacity: 0.85, rough: 0.2 }));
  const wheel = new THREE.Group(); const R = 0.3, n = st === 0 ? 6 : 12;
  for (const sx of [-0.05, 0.05]) { if (st === 0 && sx > 0) continue; wheel.add(put(new THREE.TorusGeometry(R, 0.018, 8, 30), 0x6b4a33, sx, 0, 0, { ry: Math.PI / 2 })); wheel.add(put(new THREE.TorusGeometry(R * 0.35, 0.014, 6, 16), 0x6b4a33, sx, 0, 0, { ry: Math.PI / 2 })); }
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const sp = rbox(0.02, R, 0.02, 0x7a5236, 0, 0, 0); sp.position.set(0, Math.cos(a) * R / 2, Math.sin(a) * R / 2); sp.rotation.x = a; wheel.add(sp); const p = rbox(0.14, 0.06, 0.02, jit(0x8a5c38, 0.05), 0, 0, 0); p.position.set(0, Math.cos(a) * R, Math.sin(a) * R); p.rotation.x = a; wheel.add(p); }
  wheel.add(cyl(0.035, 0.035, 0.16, 0x3b302a, 0, -0.08, 0, { rz: Math.PI / 2 }));
  wheel.position.set(wx, R + 0.06, 0.1); if (st === 0) { wheel.rotation.z = 0.3; wheel.position.y = R - 0.03; } else wheel.rotation.x = 0.2;
  g.add(wheel);
  if (st === 2) { g.add(sack(-0.62, 0.42)); g.add(sack(-0.55, 0.52, 0xeee4cc)); g.add(crate(-0.66, 0.25, 1, 0.4)); g.add(lampPost(0.2, 0.58, true, 0.42)); g.add(bush(0.62, -0.45, 0.12, 0x5f9a46, FLOWER_SETS.warm)); }
  return g;
};
/** Flower Gardens: Victorian glasshouse on a brick plinth. */
LM.greenhouse = (st) => {
  SEED = 202; stageWeather(st, 0.5);
  const g = grp(ISLE(st, FLOWER_SETS.garden, { rx: 0.95, rz: 0.72, grass: 0x93c45e }));
  const W = 1.0, D = 0.62, H = 0.36, frame = 0x2f6b62, glassO = st === 2 ? 0.38 : st === 1 ? 0.3 : 0.2;
  g.add(walls(W + 0.04, D + 0.04, 0.12, 'brick', 0xb5654a, st === 0 ? 0 : 2));
  const panes = (len, x0, z0, ry) => { const n = Math.round(len / 0.125); for (let i = 0; i <= n; i++) { const t = -len / 2 + i * len / n; const tall = st === 0 && rnd() < 0.45 ? H * rr(0.2, 0.7) : H; g.add(rbox(0.022, tall, 0.022, frame, x0 + (ry ? 0 : t), 0.12, z0 + (ry ? t : 0))); if (i < n && (st > 0 || rnd() < 0.3)) { const gp = rbox(len / n - 0.02, H - 0.02, 0.01, 0xd7f2f0, x0 + (ry ? 0 : t + len / n / 2), 0.13, z0 + (ry ? t + len / n / 2 : 0), { keep: true, opacity: glassO, rough: 0.08 }); gp.rotation.y = ry; g.add(gp); } } };
  panes(W, 0, D / 2, 0); panes(W, 0, -D / 2, 0); panes(D, W / 2, 0, Math.PI / 2); panes(D, -W / 2, 0, Math.PI / 2);
  if (st > 0) { g.add(rbox(W + 0.03, 0.025, 0.025, frame, 0, 0.12 + H, D / 2)); g.add(rbox(W + 0.03, 0.025, 0.025, frame, 0, 0.12 + H, -D / 2)); }
  if (st >= 1) {
    const ribs = 8, R = D / 2;
    for (let i = 0; i <= ribs; i++) { if (st === 1 && i > 5) continue; g.add(put(new THREE.TorusGeometry(R, 0.012, 6, 18, Math.PI), frame, -W / 2 + i * W / ribs, 0.12 + H, 0, { ry: Math.PI / 2, s: [1, 0.8, 1] })); }
    for (let i = 0; i < ribs; i++) { if (st === 1 && i > 4) continue; g.add(put(new THREE.CylinderGeometry(R, R, W / ribs - 0.01, 18, 1, true, -Math.PI / 2, Math.PI), 0xd7f2f0, -W / 2 + (i + 0.5) * W / ribs, 0.12 + H, 0, { rz: Math.PI / 2, keep: true, opacity: glassO, rough: 0.08, side: THREE.DoubleSide, s: [0.8, 1, 1] })); }
    g.add(rbox(W + 0.04, 0.02, 0.02, frame, 0, 0.12 + H + R * 0.8, 0));
    if (st === 2) { g.add(rbox(0.22, 0.12, 0.16, 0xe9f6f1, 0, 0.12 + H + R * 0.8, 0, { opacity: 0.6, keep: true })); g.add(cone(0.14, 0.1, frame, 0, 0.24 + H + R * 0.8, 0, { seg: 4, ry: Math.PI / 4 })); g.add(ball(0.02, 0xd9a441, 0, 0.37 + H + R * 0.8, 0, { keep: true, metal: 0.4 })); for (let i = 0; i < 9; i++) g.add(cone(0.012, 0.04, 0xd9a441, -W / 2 + 0.06 + i * (W - 0.12) / 8, 0.12 + H + R * 0.8 + 0.01, 0, { keep: true, seg: 4 })); }
  }
  for (let i = 0; i < (st === 0 ? 3 : 9); i++) { const x = -W / 2 + 0.12 + rnd() * (W - 0.24), z = rr(-D / 2 + 0.12, D / 2 - 0.12); if (st === 0) g.add(bush(x, z, 0.07, 0x8a8a5a, null, 0.12)); else { g.add(cyl(0.035, 0.028, 0.05, 0xb5654a, x, 0.12, z)); g.add(bush(x, z, 0.06, 0x5f9a46, st === 2 ? FLOWER_SETS.garden : null, 0.16)); } }
  g.add(at(doorAt({ color: st === 0 ? 0x5a6a62 : frame, frame: 0xe6efe8, broken: st === 0, w: 0.18, h: 0.3 }), W / 2 + 0.02, 0.12, 0.05, Math.PI / 2));
  if (st === 0) { g.add(rubble(0.2, D / 2 + 0.25, 0xb7a090, 7)); for (let i = 0; i < 8; i++) { const sh = rbox(0.06, 0.006, 0.05, 0xd7f2f0, rr(-0.5, 0.4), 0.002, D / 2 + rr(0.1, 0.4), { keep: true, opacity: 0.55 }); sh.rotation.y = rr(0, 3); g.add(sh); } for (let i = 0; i < 6; i++) g.add(weeds(rr(-0.5, 0.5), D / 2 + rr(0.05, 0.3))); g.add(at(ivy(-W / 2, 0.12, W * 0.5, H, 40), 0, 0, D / 2 + 0.03)); }
  if (st === 1) { g.add(plankStack(-0.75, 0.3, 0.6)); for (let i = 0; i < 3; i++) g.add(rbox(0.24, 0.18, 0.01, 0xd7f2f0, 0.78, 0.0, -0.1 + i * 0.05, { keep: true, opacity: 0.5, ry: 0.3, rz: 0.15 })); g.add(ladder(0.3, D / 2 + 0.12, 0.55, 0.2)); g.add(bucket(-0.3, D / 2 + 0.3)); }
  if (st === 2) { for (let i = 0; i < 4; i++) g.add(flowers(-0.4 + i * 0.25, D / 2 + 0.14, 5, FLOWER_SETS.garden)); for (const [x, z] of [[0.62, 0.32], [0.62, -0.2]]) { g.add(cyl(0.06, 0.045, 0.09, 0xc06a4a, x, 0, z)); g.add(bush(x, z, 0.08, 0x5f9a46, FLOWER_SETS.garden, 0.07)); } g.add(at(ivy(-W / 2 - 0.02, 0.1, 0.2, 0.4, 24), 0, 0, D / 2 + 0.03)); g.add(stepping(0.62, 0.05, 0.85, 0.5, 3)); g.add(lampPost(-0.6, 0.48, true, 0.42)); }
  return g;
};
/** Lakeside: boathouse on stilts over a cove, with a moored rowing boat. */
LM.boathouse = (st) => {
  SEED = 303; stageWeather(st, 0.55);
  const g = grp(ISLE(st, FLOWER_SETS.lake, { rx: 0.92, rz: 0.75 }));
  g.add(put(new THREE.CircleGeometry(0.5, 28), 0x6fb6c8, 0.35, 0.012, 0.25, { rx: -Math.PI / 2, keep: true, s: [1.2, 1, 1], rough: 0.2 }));
  for (const x of [-0.05, 0.25, 0.55, 0.8]) for (const z of [-0.25, 0.4]) g.add(cyl(0.025, 0.03, 0.18, 0x5a4636, x, 0, z, { seg: 7 }));
  for (let i = 0; i < 13; i++) if (st > 0 || rnd() > 0.3) g.add(rbox(0.07, 0.025, 0.68, jit(0xbf9363, 0.06), -0.42 + i * 0.075, 0.17, 0.07));
  const hs = house(st, { w: 0.62, d: 0.52, h: 0.34, wall: 'boards', wallColor: 0x4f86ab, roof: 'shingle', roofColor: 0xd25f45, roofH: 0.3, plinth: 0, flowers: FLOWER_SETS.lake, windows: [{ face: 'z', u: -0.12, v: 0.27, frame: 0xffffff, box: FLOWER_SETS.lake }, { face: 'x', u: -0.1, v: 0.27, frame: 0xffffff }], door: { face: 'x', u: 0.12, color: 0xf2ecdc, frame: 0xffffff } });
  hs.position.set(-0.25, 0.19, -0.02); g.add(hs);
  for (const z of [-0.25, 0.4]) g.add(cyl(0.03, 0.03, 0.34, 0x6b4a33, 0.88, 0, z, { seg: 7 }));
  if (st === 2) { const boat = PROPS.rowBoat(); boat.children[0].visible = false; boat.scale.setScalar(0.75); boat.position.set(0.55, 0.0, 0.6); boat.rotation.y = 0.1; g.add(boat); g.add(put(new THREE.TorusGeometry(0.055, 0.018, 8, 16), 0xf5f5f5, 0.12, 0.42, 0.25, { keep: true, ry: Math.PI / 2 })); g.add(lantern(0.88, 0.34, -0.25, true)); g.add(lantern(0.88, 0.34, 0.4, true)); for (let i = 0; i < 10; i++) g.add(tuft(rr(-0.2, 0.9), rr(0.55, 0.7), 1.4, [0x7a9a4a, 0x8aaa55])); g.add(crate(0.6, -0.1, 0.8, 0.2).translateY(0.19)); }
  return g;
};
/** Lantern Woods: log cabin with mossy shingle roof, porch and lanterns. */
LM.forestCabin = (st) => {
  SEED = 404; stageWeather(st, 0.5);
  const g = grp(ISLE(st, FLOWER_SETS.forest, { rx: 0.88, rz: 0.72, grass: 0x79ad52, grassCols: [0x6a9e48, 0x5d8f40, 0x7aae52] }));
  g.add(house(st, { w: 0.8, d: 0.6, h: 0.36, wall: 'logs', wallColor: 0x9a6a42, roof: 'shingle', roofColor: 0x6f7f4a, roofH: 0.36, plinth: 0.06, stoneColor: 0x8d887e, chimney: [0.22, -0.12], flowers: FLOWER_SETS.forest, windows: [{ face: 'z', u: -0.2, v: 0.27, shutters: 0x3f6e4c, box: FLOWER_SETS.forest }, { face: 'x', u: 0.0, v: 0.27, shutters: 0x3f6e4c }], door: { face: 'z', u: 0.16, color: 0x5a3d28 } }));
  if (st === 2) { g.add(rbox(0.9, 0.025, 0.22, 0xa47a50, 0, 0.06, 0.42)); for (const x of [-0.42, 0.42]) g.add(cyl(0.022, 0.025, 0.36, 0x6b4a33, x, 0.08, 0.52, { seg: 7 })); const pr = rbox(0.96, 0.02, 0.26, 0x6f7f4a, 0, 0.44, 0.46); pr.rotation.x = 0.25; g.add(pr); for (const x of [-0.3, 0.3]) g.add(lantern(x, 0.32, 0.52, true)); for (let i = 0; i < 16; i++) g.add(ball(0.035, pick([0x6f9a4a, 0x7fae58, 0x5f8a42]), rr(-0.4, 0.4), 0.62 + rr(0, 0.12), rr(-0.15, 0.25), { keep: true, seg: 7, s: [1.3, 0.5, 1.1] })); g.add(rbox(0.3, 0.12, 0.16, 0x8a5c38, -0.62, 0, 0.2)); for (let i = 0; i < 6; i++) g.add(capsule(0.028, 0.24, jit(0xa47a50, 0.05), -0.62, 0.15 + Math.floor(i / 3) * 0.055, 0.15 + (i % 3) * 0.05, { rz: Math.PI / 2 })); g.add(lampPost(0.58, 0.5, true, 0.42)); for (let i = 0; i < 4; i++) g.add(cyl(0.02, 0.028, 0.05, 0xf0e2c4, -0.5 + i * 0.07, 0, 0.58 + (i % 2) * 0.05)); for (let i = 0; i < 4; i++) g.add(ball(0.026, 0xd9583b, -0.45 + i * 0.08, 0.06, 0.6, { keep: true, s: [1, 0.6, 1] })); }
  if (st === 1) for (let i = 0; i < 4; i++) g.add(capsule(0.035, 0.42, 0xb07a4a, 0.62, 0.04 + Math.floor(i / 2) * 0.07, 0.15 + (i % 2) * 0.075, { keep: true, rx: Math.PI / 2 }));
  return g;
};
/** Festival Square: two-storey café with striped awning, bunting, string lights and tables. */
LM.festivalCafe = (st) => {
  SEED = 505; stageWeather(st, 0.55);
  const g = grp(ISLE(st, FLOWER_SETS.festival, { rx: 0.95, rz: 0.78 }));
  for (let i = 0; i < 40; i++) g.add(stone(rr(0.035, 0.05), 0xd9cfbe, rr(-0.6, 0.6), 0.0, rr(0.38, 0.68), { sy: 0.25 }));
  g.add(house(st, { w: 0.84, d: 0.6, h: st === 0 ? 0.4 : 0.62, wall: 'plaster', wallColor: 0xf2c99a, roof: 'slate', roofColor: 0x3f6e86, ridge: 0xf2c14e, trim: 0xf6f1e6, roofH: 0.3, plinth: 0.07, stoneColor: 0xc9c0b0, chimney: [-0.22, -0.12], flowers: FLOWER_SETS.festival, windows: [{ face: 'z', u: -0.18, v: 0.27, w: 0.26, h: 0.2, frame: 0x3f6e86, awning: 0xe0655a }, { face: 'z', u: -0.2, v: 0.56, shutters: 0x3f6e86, box: FLOWER_SETS.festival }, { face: 'z', u: 0.2, v: 0.56, shutters: 0x3f6e86, box: FLOWER_SETS.festival }, { face: 'x', u: 0.0, v: 0.27, frame: 0x3f6e86 }, { face: 'x', u: 0.0, v: 0.56, shutters: 0x3f6e86, box: FLOWER_SETS.festival }], door: { face: 'z', u: 0.22, color: 0x3f6e86, frame: 0xf6f1e6, h: 0.26 } }));
  if (st > 0) g.add(rbox(0.88, 0.035, 0.64, 0xf6f1e6, 0, 0.07 + 0.34, 0));
  if (st === 2) {
    g.add(rbox(0.36, 0.025, 0.12, 0xf6f1e6, -0.2, 0.42, 0.36)); for (let i = 0; i < 8; i++) g.add(cyl(0.006, 0.006, 0.09, 0x3b302a, -0.36 + i * 0.045, 0.445, 0.41, { seg: 4 })); g.add(rbox(0.36, 0.012, 0.012, 0x3b302a, -0.2, 0.53, 0.41));
    for (const [x, z, c] of [[-0.35, 0.58, 0xf2c14e], [0.25, 0.62, 0x5fa8d3]]) { g.add(cyl(0.09, 0.09, 0.015, 0xffffff, x, 0.14, z, { seg: 18 })); g.add(cyl(0.012, 0.018, 0.14, 0x3b302a, x, 0, z)); g.add(cyl(0.007, 0.007, 0.22, 0xdcdcdc, x, 0.15, z, { seg: 6 })); g.add(cone(0.17, 0.08, c, x, 0.36, z, { keep: true, seg: 10 })); for (let k = 0; k < 10; k++) { const a = k * 0.628; g.add(cone(0.02, 0.025, k % 2 ? 0xffffff : c, x + Math.cos(a) * 0.165, 0.335, z + Math.sin(a) * 0.165, { keep: true, seg: 3, rx: Math.PI })); } for (const s of [-1, 1]) { g.add(rbox(0.06, 0.08, 0.06, 0x3f6e86, x + s * 0.13, 0, z)); g.add(rbox(0.06, 0.06, 0.012, 0x3f6e86, x + s * 0.13, 0.08, z - 0.025)); } g.add(cyl(0.012, 0.012, 0.02, 0xffffff, x, 0.155, z)); }
    g.add(cyl(0.014, 0.018, 0.8, 0xf6f1e6, 0.62, 0, 0.55, { seg: 8 })); g.add(ball(0.025, 0xf2c14e, 0.62, 0.81, 0.55, { keep: true }));
    const cols = [0xe0655a, 0xf2c14e, 0x5fa8d3, 0x7fbf6a, 0xf29ac0];
    for (let i = 0; i < 10; i++) { const t = i / 9; g.add(cone(0.025, 0.05, cols[i % 5], 0.3 + t * 0.32, 0.7 - Math.sin(t * Math.PI) * 0.09, 0.3 + t * 0.25, { keep: true, seg: 3, rx: Math.PI })); }
    for (let i = 0; i < 9; i++) { const t = i / 8; g.add(ball(0.013, 0xffe6a0, -0.42 + t * 1.04, 0.62 - Math.sin(t * Math.PI) * 0.07, 0.62, { keep: true, emissive: 0xffc04d, ei: 1.2, seg: 6 })); }
    g.add(cyl(0.012, 0.012, 0.62, 0x3b302a, -0.45, 0, 0.62, { seg: 6 }));
    for (const [x, z] of [[-0.5, 0.36], [0.47, 0.34]]) { g.add(cyl(0.05, 0.04, 0.08, 0xc06a4a, x, 0, z)); g.add(bush(x, z, 0.08, 0x5f9a46, FLOWER_SETS.festival, 0.06)); }
  }
  return g;
};
export const LANDMARKS = LM;

// ------------------------------------------------------------------ crossings (bridges and gates, 3 stages)
function stream(len, wid, bank = 0x8dbb58, fl = FLOWER_SETS.meadow) {
  const g = new THREE.Group();
  g.add(put(new THREE.PlaneGeometry(len, wid), 0x6db3c6, 0, -0.04, 0, { rx: -Math.PI / 2, keep: true, rough: 0.2 }));
  for (let i = 0; i < 7; i++) g.add(rbox(rr(0.08, 0.16), 0.004, 0.012, 0xe8f7fa, rr(-len / 2 + 0.2, len / 2 - 0.2), -0.035, rr(-wid / 2, wid / 2), { keep: true, opacity: 0.7 }));
  for (const s of [-1, 1]) { const b = island(0.32, wid * 0.62, { grass: bank, flowers: fl, tufts: 10, blooms: 4, stones: 3 }); b.position.x = s * (len / 2 - 0.08); g.add(b); }
  return g;
}
function plankDeck(len, wid, hex, y, o = {}) {
  const g = new THREE.Group(); const n = Math.round(len / 0.075);
  for (let i = 0; i < n; i++) { if (o.ruin && rnd() < 0.3) continue; const t = (i + 0.5) / n; const x = -len / 2 + t * len; const yy = y + (o.arch ? Math.sin(t * Math.PI) * o.arch : 0); const p = rbox(len / n - 0.01, 0.028, wid * (o.ruin ? rr(0.5, 1) : 1), jit(hex, 0.06), x, yy, o.ruin ? rr(-0.04, 0.04) : 0, { r: 0.25 }); if (o.arch) p.rotation.z = -Math.cos(t * Math.PI) * o.arch * Math.PI / len; g.add(p); }
  return g;
}
function rail(len, z, h, hex, o = {}) {
  const g = new THREE.Group(); const n = o.posts ?? 6;
  for (let i = 0; i <= n; i++) { if (o.ruin && rnd() < 0.4) continue; const t = i / n, x = -len / 2 + t * len; const y0 = (o.y ?? 0) + (o.arch ? Math.sin(t * Math.PI) * o.arch : 0); g.add(rbox(0.035, h * (o.ruin ? rr(0.4, 1) : 1), 0.035, hex, x, y0, z)); if (o.caps && !o.ruin) g.add(ball(0.025, hex, x, y0 + h + 0.01, z)); }
  if (!o.ruin) for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n; const y0 = o.arch ? Math.sin(t0 * Math.PI) * o.arch : 0, y1 = o.arch ? Math.sin(t1 * Math.PI) * o.arch : 0; const r = rbox(len / n + 0.02, 0.03, 0.04, hex, -len / 2 + ((t0 + t1) / 2) * len, (o.y ?? 0) + (y0 + y1) / 2 + h - 0.03, z); r.rotation.z = Math.atan2(y1 - y0, len / n); g.add(r); if (o.mid) { const r2 = r.clone(); r2.position.y -= h * 0.45; g.add(r2); } }
  return g;
}
export const CROSSINGS = {
  /** Quiet Valley: low timber footbridge with hay bales and wildflowers. */
  meadowBridge(st) {
    SEED = 701; stageWeather(st, 0.55); const L = 1.5, Wd = 0.4; const g = stream(L + 0.5, 0.9);
    for (const x of [-0.42, 0, 0.42]) for (const z of [-Wd / 2, Wd / 2]) g.add(cyl(0.03, 0.035, 0.18, 0x6b4a33, x, -0.06, z, { seg: 8 }));
    g.add(plankDeck(L, Wd, 0xbf9363, 0.1, { ruin: st === 0, arch: 0.06 }));
    if (st > 0) for (const z of [-Wd / 2, Wd / 2]) g.add(rail(L, z, 0.2, 0x8a5c38, { arch: 0.06, y: 0.12, posts: 6, mid: true })); else g.add(rail(L, Wd / 2, 0.2, 0x6b5a4a, { ruin: true, y: 0.12 }));
    if (st === 0) { g.add(rubble(0.2, 0.42, 0x8a6a4a, 3)); g.add(weeds(-0.7, 0.2)); g.add(weeds(0.75, -0.2)); }
    if (st === 1) { g.add(plankStack(-0.85, 0.32, 0.3)); g.add(bucket(0.8, 0.3)); g.add(rbox(0.04, 0.03, 0.3, 0xdcb57d, 0.3, 0.2, 0.32, { keep: true, ry: 0.6 })); }
    if (st === 2) { for (const s of [-1, 1]) { g.add(rbox(0.16, 0.11, 0.11, 0xe8c76a, s * 0.95, 0, -0.3 * s)); g.add(lampPost(s * 0.8, 0.28 * s, true, 0.42)); } g.add(flowers(-0.9, 0.3, 5)); g.add(flowers(0.9, -0.05, 5)); }
    return g;
  },
  /** Old Mill Road: stone gatehouse arch with timber hoarding and a wheel sign. */
  millGate(st) {
    SEED = 702; stageWeather(st, 0.55); const g = grp(island(0.95, 0.7, { weather: st === 0, flowers: FLOWER_SETS.warm, blooms: st === 2 ? 8 : 2 }));
    for (let i = 0; i < 26; i++) g.add(stone(rr(0.04, 0.055), 0xc9c0b0, rr(-0.14, 0.14), 0.0, -0.65 + i * 0.05, { sy: 0.25 }));
    for (const s of [-1, 1]) { const tw = walls(0.32, 0.38, st === 0 ? rr(0.3, 0.42) : 0.62, 'stone', 0xb3aa9c, st === 0 ? 0 : 2); tw.position.x = s * 0.42; g.add(tw); if (st > 0) { g.add(rbox(0.38, 0.04, 0.44, 0x8d867a, s * 0.42, 0.62, 0)); if (st === 2) { g.add(tiledRoof(0.3, 0.38, 0.22, 0xc4673f, 0.66, { style: 'clay' }).translateX(s * 0.42)); for (const x of [0.15, -0.15]) g.add(gableEnd(0.38, 0.22, 0xb3aa9c, x, 0.66).translateX(s * 0.42)); } } }
    if (st > 0) for (let i = 0; i < 9; i++) { const a = (i / 8) * Math.PI; g.add(rbox(0.07, 0.08, 0.4, jit(0xb3aa9c, 0.06), Math.cos(a) * 0.27, 0.36 + Math.sin(a) * 0.27 - 0.04, 0, { rz: a - Math.PI / 2 })); }
    if (st === 2) { g.add(walls(0.5, 0.36, 0.16, 'timber', 0xf3e6c8, 2, 0.66, { beam: 0x6b4a33 })); g.add(tiledRoof(0.5, 0.36, 0.2, 0xc4673f, 0.82, { style: 'clay' })); for (const x of [0.25, -0.25]) g.add(gableEnd(0.36, 0.2, 0xf3e6c8, x, 0.82, { beams: 0x6b4a33 })); const w = new THREE.Group(); for (let i = 0; i < 8; i++) { const sp = rbox(0.01, 0.17, 0.01, 0x6b4a33, 0, -0.085, 0); sp.rotation.z = (i / 8) * Math.PI; w.add(sp); } w.add(put(new THREE.TorusGeometry(0.085, 0.012, 6, 18), 0x6b4a33)); w.position.set(0, 0.74, 0.21); g.add(w); for (const s of [-1, 1]) { g.add(lantern(s * 0.24, 0.42, 0.22, true)); g.add(flowers(s * 0.42, 0.28, 5, FLOWER_SETS.warm)); g.add(at(ivy(-0.12, 0.05, 0.12, 0.4, 16), s * 0.42, 0, 0.2)); } g.add(sack(0.7, 0.35)); g.add(crate(-0.72, 0.32, 1, 0.4)); }
    if (st === 1) { g.add(scaffold(-0.6, 0.6, 0.24, 0.8)); g.add(plankStack(0.8, 0.35, 0.3)); g.add(tileStack(-0.78, 0.3)); }
    if (st === 0) { g.add(rubble(0, 0.15, 0xb3aa9c, 14, 1.4)); g.add(weeds(-0.2, 0.35, 4)); g.add(at(ivy(-0.12, 0, 0.3, 0.3, 30), -0.42, 0, 0.2)); }
    return g;
  },
  /** Flower Gardens: white moon bridge with flower boxes and a rose arch. */
  gardenBridge(st) {
    SEED = 703; stageWeather(st, 0.55); const L = 1.5, Wd = 0.38; const g = stream(L + 0.5, 0.9, 0x93c45e, FLOWER_SETS.garden);
    for (const s of [-1, 1]) g.add(walls(0.22, Wd + 0.08, 0.16, 'stone', 0xe0d8c8, st === 0 ? 0 : 2).translateX(s * 0.62).translateY(-0.04));
    g.add(plankDeck(L, Wd, 0xece2ce, 0.12, { ruin: st === 0, arch: 0.2 }));
    if (st > 0) for (const z of [-Wd / 2, Wd / 2]) g.add(rail(L, z, 0.18, 0xfaf6ee, { arch: 0.2, y: 0.14, posts: 8, caps: true })); else g.add(rail(L, -Wd / 2, 0.18, 0xb8b2a6, { ruin: true, arch: 0.2, y: 0.14, posts: 8 }));
    if (st === 2) { for (const z of [-Wd / 2 - 0.04, Wd / 2 + 0.04]) for (const x of [-0.35, 0.35]) { const y = Math.sin((x / L + 0.5) * Math.PI) * 0.2 + 0.32; g.add(rbox(0.2, 0.05, 0.05, 0x8a5c38, x, y, z)); g.add(flowers(x - 0.05, z, 3, FLOWER_SETS.garden, 0.7, y + 0.03)); g.add(flowers(x + 0.05, z, 3, FLOWER_SETS.garden, 0.7, y + 0.03)); } const arch = PROPS.flowerArch(); arch.children[0].visible = false; arch.scale.setScalar(0.75); arch.position.set(-L / 2 - 0.12, 0, 0); arch.rotation.y = Math.PI / 2; g.add(arch); g.add(lampPost(0.9, 0.32, true, 0.42)); }
    if (st === 1) { g.add(plankStack(0.85, 0.3, -0.3)); for (let i = 0; i < 3; i++) g.add(cyl(0.04, 0.032, 0.07, 0xc06a4a, -0.95 + i * 0.09, 0, 0.35)); g.add(bucket(-0.7, 0.4)); }
    if (st === 0) { g.add(weeds(-0.75, 0.3)); g.add(weeds(0.7, -0.3)); g.add(rubble(0.1, 0.45, 0xe0d8c8, 6)); }
    return g;
  },
  /** Lakeside: boardwalk gate of blue-painted posts with floats and lanterns, among reeds. */
  lakeGate(st) {
    SEED = 704; stageWeather(st, 0.55); const g = grp(island(0.95, 0.75, { weather: st === 0, flowers: FLOWER_SETS.lake, blooms: 4 }));
    g.add(put(new THREE.CircleGeometry(0.42, 26), 0x6fb6c8, 0, 0.012, 0.05, { rx: -Math.PI / 2, keep: true, s: [1.3, 1, 1], rough: 0.2 }));
    for (const x of [-0.18, 0.18]) for (const z of [-0.55, -0.2, 0.15, 0.5]) g.add(cyl(0.022, 0.026, 0.14, 0x5a4636, x, 0, z, { seg: 7 }));
    const deck = plankDeck(1.2, 0.36, 0xc9a274, 0.12, { ruin: st === 0 }); deck.rotation.y = Math.PI / 2; g.add(deck);
    for (const s of [-1, 1]) g.add(rbox(0.07, st === 0 ? 0.32 : 0.7, 0.07, 0x4f86ab, s * 0.24, 0.12, 0));
    if (st > 0) { g.add(rbox(0.62, 0.06, 0.09, 0x4f86ab, 0, 0.82, 0)); g.add(rbox(0.54, 0.04, 0.07, 0xf5f5f5, 0, 0.74, 0)); }
    if (st === 2) { for (const s of [-1, 1]) { g.add(cone(0.06, 0.09, 0xd25f45, s * 0.3, 0.88, 0, { seg: 4, ry: Math.PI / 4 })); g.add(put(new THREE.TorusGeometry(0.055, 0.018, 8, 16), 0xf5f5f5, s * 0.24, 0.5, 0.06, { keep: true })); g.add(lantern(s * 0.24, 0.6, 0.07, true)); } for (let i = 0; i < 6; i++) g.add(ball(0.028, i % 2 ? 0xd25f45 : 0xf5f5f5, -0.18 + i * 0.072, 0.7 - Math.sin((i / 5) * Math.PI) * 0.05, 0.03, { keep: true, seg: 8 })); const boat = boatModel(); boat.scale.setScalar(0.8); boat.position.set(0.45, 0.0, 0.25); boat.rotation.y = 1.3; g.add(boat); }
    if (st === 1) { g.add(plankStack(0.55, -0.35, 0.2)); g.add(rbox(0.62, 0.06, 0.09, 0xdcb57d, 0.45, 0.0, 0.42, { keep: true, ry: 0.4 })); g.add(bucket(-0.45, 0.42)); }
    for (let i = 0; i < 18; i++) { const x = (rnd() < 0.5 ? -1 : 1) * rr(0.3, 0.6), z = rr(-0.3, 0.45); g.add(cyl(0.006, 0.006, rr(0.2, 0.36), 0x7a9a4a, x, 0, z, { seg: 4, keep: true })); if (rnd() < 0.45) g.add(capsule(0.014, 0.04, 0x7a5236, x, rr(0.22, 0.3), z, { keep: true })); }
    return g;
  },
  /** Lantern Woods: log bridge with rope rails strung with lanterns. */
  forestBridge(st) {
    SEED = 705; stageWeather(st, 0.55); const L = 1.5, Wd = 0.38; const g = stream(L + 0.5, 0.9, 0x79ad52, FLOWER_SETS.forest);
    for (const z of [-0.12, 0.12]) g.add(capsule(0.05, L, 0x6b4a33, 0, 0.04, z, { rz: Math.PI / 2 }));
    g.add(plankDeck(L, Wd, 0x9a6a42, 0.09, { ruin: st === 0 }));
    for (const x of [-L / 2 + 0.05, 0, L / 2 - 0.05]) for (const z of [-Wd / 2, Wd / 2]) if (st > 0 || rnd() < 0.5) g.add(cyl(0.028, 0.034, st === 0 ? 0.18 : 0.36, 0x5c4231, x, 0.1, z, { seg: 8 }));
    if (st > 0) for (const z of [-Wd / 2, Wd / 2]) for (let i = 0; i < 2; i++) { const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push(new THREE.Vector3(-L / 2 + 0.05 + i * (L / 2 - 0.05) + t * (L / 2 - 0.05), 0.44 - Math.sin(t * Math.PI) * 0.07, z)); } g.add(put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.01, 6), 0xd2ad7a)); }
    if (st === 2) { for (const x of [-L / 2 + 0.05, 0, L / 2 - 0.05]) for (const z of [-Wd / 2, Wd / 2]) g.add(lantern(x, 0.46, z, true, 0.9)); g.add(PROPS.lanternShrine().translateX(0.95).translateZ(0.3)); for (let i = 0; i < 5; i++) g.add(ball(0.03, pick([0xf0e2c4, 0xd9583b]), -0.9 + rr(-0.06, 0.06), 0.02, rr(-0.3, 0.3), { keep: true, s: [1, 0.6, 1] })); }
    if (st === 1) { for (let i = 0; i < 4; i++) g.add(capsule(0.03, 0.4, 0xb07a4a, -0.85, 0.03 + Math.floor(i / 2) * 0.06, 0.25 + (i % 2) * 0.065, { keep: true, rz: Math.PI / 2 })); g.add(put(new THREE.TorusGeometry(0.05, 0.016, 6, 14), 0xd2ad7a, 0.85, 0.02, 0.3, { keep: true, rx: Math.PI / 2 })); }
    if (st === 0) { g.add(weeds(-0.8, 0.25)); g.add(weeds(0.8, -0.25)); g.add(capsule(0.045, 0.4, 0x6b4a33, 0.3, -0.02, 0.4, { rz: Math.PI / 2, ry: 0.5 })); }
    return g;
  },
  /** Festival Square: lantern-hung festival arch with pennants and flower tubs. */
  festivalGate(st) {
    SEED = 706; stageWeather(st, 0.55); const g = grp(island(0.95, 0.7, { weather: st === 0, flowers: FLOWER_SETS.festival, blooms: st === 2 ? 8 : 2 }));
    for (let i = 0; i < 30; i++) g.add(stone(rr(0.035, 0.05), 0xd9cfbe, rr(-0.18, 0.18), 0.0, -0.65 + i * 0.045, { sy: 0.25 }));
    for (const s of [-1, 1]) { g.add(walls(0.16, 0.16, 0.1, 'stone', 0xc9c0b0, st === 0 ? 0 : 2).translateX(s * 0.36)); g.add(cyl(0.05, 0.06, st === 0 ? rr(0.25, 0.4) : 0.78, 0xf6f1e6, s * 0.36, 0.1, 0, { seg: 12 })); if (st > 0) { g.add(cyl(0.075, 0.075, 0.035, 0xf2c14e, s * 0.36, 0.88, 0, { keep: st === 2 })); g.add(ball(0.05, 0xf2c14e, s * 0.36, 0.95, 0, { keep: st === 2 })); } }
    if (st > 0) { g.add(rbox(0.86, 0.08, 0.1, 0x3f6e86, 0, 0.8, 0)); g.add(put(new THREE.TorusGeometry(0.3, 0.025, 8, 24, Math.PI), 0xf6f1e6, 0, 0.5, 0)); }
    if (st === 2) {
      g.add(rbox(0.5, 0.14, 0.03, 0xf6ecd2, 0, 0.62, 0.06)); for (let i = 0; i < 5; i++) g.add(ball(0.02, [0xe0655a, 0xf2c14e, 0x5fa8d3, 0x7fbf6a, 0xf29ac0][i], -0.16 + i * 0.08, 0.69, 0.08, { keep: true, seg: 8 }));
      const cols = [0xe0655a, 0xf2c14e, 0x5fa8d3, 0x7fbf6a, 0xf29ac0];
      for (let i = 0; i < 9; i++) { const t = i / 8; g.add(cone(0.028, 0.06, cols[i % 5], -0.36 + t * 0.72, 0.72 - Math.sin(t * Math.PI) * 0.12, 0.06, { keep: true, seg: 3, rx: Math.PI })); }
      for (const s of [-1, 1]) { g.add(lantern(s * 0.2, 0.52, 0.05, true)); g.add(cyl(0.004, 0.004, 0.24, 0x3b302a, s * 0.2, 0.58, 0.05, { seg: 4 })); g.add(cyl(0.08, 0.06, 0.1, 0xc06a4a, s * 0.62, 0, 0.25)); g.add(bush(s * 0.62, 0.25, 0.09, 0x5f9a46, FLOWER_SETS.festival, 0.08)); g.add(flowers(s * 0.36, 0.25, 5, FLOWER_SETS.festival)); }
      for (let i = 0; i < 8; i++) g.add(ball(0.012, 0xffe6a0, -0.36 + i * 0.1, 0.9 - Math.sin((i / 7) * Math.PI) * 0.05, 0.0, { keep: true, emissive: 0xffc04d, ei: 1.2, seg: 6 }));
    }
    if (st === 1) { g.add(scaffold(-0.3, 0.3, 0.14, 0.75)); g.add(crate(0.65, 0.3, 1, 0.3)); g.add(plankStack(-0.7, 0.3, 0.4)); for (let i = 0; i < 4; i++) g.add(cone(0.028, 0.06, [0xe0655a, 0xf2c14e, 0x5fa8d3, 0x7fbf6a][i], 0.62 + i * 0.03, 0.02, 0.45, { keep: true, seg: 3, rz: Math.PI / 2 })); }
    if (st === 0) { g.add(rubble(0, 0.3, 0xd9cfbe, 10)); g.add(cyl(0.05, 0.06, 0.6, 0xc8c2b4, 0.3, 0.06, 0.35, { rz: Math.PI / 2, ry: 0.4 })); g.add(weeds(-0.3, 0.4)); const torn = rbox(0.3, 0.008, 0.16, 0x9a7a6a, -0.25, 0.005, 0.5); torn.rotation.y = 0.5; g.add(torn); }
    return g;
  },
};

// ------------------------------------------------------------------ card-pack chest (closed), for the card opening screen
export function closedChest() {
  SEED = 97; WEATHER = 0;
  const g = new THREE.Group();
  const W = 0.9, H = 0.46, D = 0.6, R = 0.3, wood = 0xb58660, dark = 0x86603f, gold = 0xe8c47e;
  g.add(rbox(W, H, D, wood, 0, 0, 0, { r: 0.08 }));
  // Inset carved panels on the two visible faces.
  g.add(rbox(W * 0.62, H * 0.6, 0.02, dark, 0, H * 0.18, D / 2, { r: 0.3 }));
  g.add(rbox(0.02, H * 0.6, D * 0.6, dark, W / 2, H * 0.18, 0, { r: 0.3 }));
  // Gold corner posts and bands.
  for (const x of [-1, 1]) for (const z of [-1, 1]) g.add(rbox(0.1, H + 0.02, 0.1, gold, x * (W / 2 - 0.03), -0.01, z * (D / 2 - 0.03), { r: 0.3, rough: 0.45, metal: 0.25 }));
  g.add(rbox(W + 0.04, 0.07, D + 0.04, gold, 0, -0.005, 0, { r: 0.3, rough: 0.45, metal: 0.25 }));
  g.add(rbox(W + 0.04, 0.06, D + 0.04, gold, 0, H - 0.05, 0, { r: 0.3, rough: 0.45, metal: 0.25 }));
  for (const x of [-1, 1]) for (const z of [-1, 1]) g.add(ball(0.022, 0xf5d27a, x * (W / 2 + 0.005), H * 0.5, z * (D / 2 - 0.03) + z * 0.05, { keep: true, metal: 0.3 }));
  // Rounded lid: half cylinder along x.
  const lidG = new THREE.CylinderGeometry(R, R, W - 0.02, 28, 1, false, 0, Math.PI); lidG.rotateZ(Math.PI / 2);
  const lid = put(lidG, wood, 0, H, 0, { s: [1, 1, D / (2 * R)] }); g.add(lid);
  const capG = new THREE.CircleGeometry(R, 28, 0, Math.PI);
  for (const s of [-1, 1]) { const cap = put(capG, dark, s * (W / 2 - 0.009), H, 0, { ry: s * Math.PI / 2, s: [D / (2 * R), 1, 1], side: THREE.DoubleSide }); g.add(cap); }
  for (const x of [-0.36, 0, 0.36]) { const bG = new THREE.CylinderGeometry(R + 0.018, R + 0.018, 0.075, 28, 1, true, 0, Math.PI); bG.rotateZ(Math.PI / 2); g.add(put(bG, gold, x, H, 0, { s: [1, 1, (D + 0.036) / (2 * R + 0.036)], rough: 0.45, metal: 0.25, side: THREE.DoubleSide })); }
  // Magic light leaking from the seam.
  g.add(rbox(W - 0.1, 0.018, D - 0.06, 0xd9b8ff, 0, H - 0.012, 0, { keep: true, emissive: 0xb784ff, ei: 1.4 }));
  // Clasp with a cream flower.
  g.add(rbox(0.16, 0.2, 0.05, gold, 0, H - 0.14, D / 2 + 0.01, { r: 0.35, rough: 0.4, metal: 0.3 }));
  for (let p = 0; p < 5; p++) { const a = p * 1.2566 + 0.3; g.add(ball(0.028, 0xf8efd8, Math.cos(a) * 0.035, H - 0.04 + Math.sin(a) * 0.035, D / 2 + 0.045, { keep: true, seg: 8, s: [1, 1, 0.5] })); }
  g.add(ball(0.02, 0xf2c14e, 0, H - 0.04, D / 2 + 0.06, { keep: true }));
  // Leaves and flowers on the lid.
  const leafG = new THREE.SphereGeometry(0.1, 10, 6); leafG.scale(1, 0.25, 0.45);
  for (const [x, ry] of [[-0.12, 0.5], [-0.02, -0.4], [0.1, 0.8], [0.18, -0.2]]) g.add(put(leafG, jit(0x7ea152, 0.05), x, H + R * 0.95, 0.05, { keep: true, ry, rz: 0.2 }));
  for (const [x, z] of [[-0.05, 0.06], [0.12, 0.02]]) { for (let p = 0; p < 5; p++) { const a = p * 1.2566; g.add(ball(0.028, 0xfbf3e0, x + Math.cos(a) * 0.033, H + R * 0.98 + 0.03, z + Math.sin(a) * 0.033, { keep: true, seg: 8, s: [1, 0.45, 1] })); } g.add(ball(0.018, 0xf2c14e, x, H + R * 0.98 + 0.04, z, { keep: true })); }
  // Side vines.
  for (let i = 0; i < 6; i++) g.add(put(leafG, jit(0x86ad5a, 0.05), W / 2 + 0.02, 0.1 + i * 0.05, -0.12 + i * 0.045, { keep: true, rz: Math.PI / 2, ry: 0.4 * (i % 2 ? 1 : -1), s: [0.6, 0.6, 0.6] }));
  // Leafy tufts and blossoms at the base.
  for (const [x, z] of [[-0.45, 0.33], [0.5, 0.25], [0.35, 0.38]]) g.add(bush(x, z, 0.1, 0x6fa04a, [0xfbf3e0]));
  g.add(flowers(-0.32, 0.4, 3, [0xfbf3e0, 0xf6d55c], 1.2));
  return g;
}
