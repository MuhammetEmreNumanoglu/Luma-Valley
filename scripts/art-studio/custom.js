// Original procedural 3D models (no third-party geometry) for things the Kenney kits do not have:
// candles, shells, bramble, and the UI icon set. Same palette/lighting as the rendered kits.
import * as THREE from 'three';

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1, flatShading: o.flat ?? false, transparent: !!o.opacity, opacity: o.opacity ?? 1 });
const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
const ext = (shape, depth = 0.2, bevel = 0.04) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 24 });
  g.center();
  return g;
};
const poly = (pts) => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return s; };
const flame = (h = 0.22, col = 0xffc94d) => {
  const prof = []; for (let i = 0; i <= 16; i++) { const t = i / 16; prof.push(new THREE.Vector2(Math.max(0.001, Math.sin(Math.PI * Math.pow(t, 0.7)) * h * 0.32 * (1 - t * 0.5)), t * h)); }
  const g = new THREE.Group();
  g.add(mesh(new THREE.LatheGeometry(prof, 24), M(col, { emissive: 0xff9a1f, ei: 1.4 })));
  const core = mesh(new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(p.x * 0.5, p.y * 0.6)), 16), M(0xfff6d8, { emissive: 0xfff0b0, ei: 1.2 }), 0, 0.01, 0);
  g.add(core);
  return g;
};
const wrap = (...objs) => { const g = new THREE.Group(); objs.forEach((o) => g.add(o)); return g; };

export const CUSTOM = {
  tealight() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.12, 32), M(0xc9ced6, { metal: 0.5, rough: 0.35 }), 0, 0.06, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.1, 32), M(0xf6ebd0, { rough: 0.5 }), 0, 0.13, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 8), M(0x2a1e1a), 0, 0.2, 0));
    const f = flame(0.2); f.position.y = 0.2; g.add(f);
    return g;
  },
  candle() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.06, 32), M(0xd9a441, { metal: 0.6, rough: 0.3 }), 0, 0.03, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.1, 24), M(0xd9a441, { metal: 0.6, rough: 0.3 }), 0, 0.11, 0));
    const ring = mesh(new THREE.TorusGeometry(0.12, 0.03, 10, 24, Math.PI * 1.2), M(0xd9a441, { metal: 0.6, rough: 0.3 }), 0.4, 0.06, 0); ring.rotation.y = Math.PI / 2; g.add(ring);
    g.add(mesh(new THREE.CylinderGeometry(0.11, 0.115, 0.62, 24), M(0xf6ebd0, { rough: 0.5 }), 0, 0.47, 0));
    g.add(mesh(new THREE.SphereGeometry(0.04, 12, 8), M(0xf6ebd0), 0.1, 0.68, 0.03));
    g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 8), M(0x2a1e1a), 0, 0.8, 0));
    const f = flame(0.24); f.position.y = 0.8; g.add(f);
    return g;
  },
  scallop(o) {
    const g = new THREE.Group();
    const cols = [o.c1 ?? 0xf7b9a6, o.c2 ?? 0xf29a86];
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.19;
      const rib = mesh(new THREE.CapsuleGeometry(0.075, 0.42, 6, 12), M(cols[i % 2], { rough: 0.45 }));
      rib.scale.set(1, 1, 0.45);
      rib.position.set(Math.cos(a + Math.PI / 2) * 0.26 * -1, 0.28 * Math.cos((i - 4) * 0.19), 0);
      rib.position.set(Math.sin((i - 4) * 0.19) * 0.27, Math.cos((i - 4) * 0.19) * 0.27, 0);
      rib.rotation.z = -(i - 4) * 0.19;
      g.add(rib);
    }
    g.add(mesh(new THREE.BoxGeometry(0.26, 0.09, 0.05), M(cols[1], { rough: 0.45 }), 0, 0.0, 0));
    g.rotation.x = -1.05;
    return wrap(g);
  },
  snail() {
    const g = new THREE.Group();
    for (let i = 0; i < 26; i++) {
      const t = i / 25; const a = t * Math.PI * 5; const r = 0.26 * (1 - t * 0.85); const y = t * 0.55;
      g.add(mesh(new THREE.SphereGeometry(0.2 * (1 - t * 0.8) + 0.025, 16, 12), M(i % 4 < 2 ? 0xf3e2c0 : 0xd98b5f, { rough: 0.4 }), Math.cos(a) * r, y + 0.12, Math.sin(a) * r));
    }
    const mouth = mesh(new THREE.TorusGeometry(0.11, 0.05, 10, 20), M(0xf7c9b8, { rough: 0.35 }), 0.22, 0.14, 0.12); mouth.rotation.y = 0.8; g.add(mouth);
    return g;
  },
  bramble(o) {
    const g = new THREE.Group();
    const leaf = [0x4e6e3a, 0x3e5a2e, 0x5a7a40];
    const pts = [[0, 0.28, 0, 0.3], [-0.28, 0.2, 0.1, 0.24], [0.28, 0.2, 0.05, 0.25], [0.05, 0.22, 0.28, 0.22], [-0.1, 0.48, -0.05, 0.22], [0.18, 0.44, 0.12, 0.18]];
    pts.forEach(([x, y, z, r], i) => g.add(mesh(new THREE.IcosahedronGeometry(r, 0), M(leaf[i % 3], { flat: true, rough: 0.8 }), x, y, z)));
    const thorn = M(0x8e5a3a, { rough: 0.6 });
    for (let i = 0; i < 22; i++) {
      const a = i * 2.39, h = 0.1 + (i % 6) * 0.08; const r = 0.4 - Math.abs(h - 0.3) * 0.45;
      const c = mesh(new THREE.ConeGeometry(0.03, 0.14, 6), thorn, Math.cos(a) * r, h, Math.sin(a) * r);
      c.lookAt(Math.cos(a) * 2, h + 0.3, Math.sin(a) * 2); c.rotateX(Math.PI / 2); g.add(c);
    }
    for (let i = 0; i < 5; i++) { const a = i * 1.7; const st = mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.5, 6), M(0x6e4a2e), Math.cos(a) * 0.3, 0.2, Math.sin(a) * 0.3); st.rotation.z = Math.cos(a) * 0.9; st.rotation.x = Math.sin(a) * 0.9; g.add(st); }
    if (o.berries) for (const [x, y, z] of [[0.1, 0.5, 0.25], [-0.25, 0.32, 0.25], [0.32, 0.3, 0.2], [-0.05, 0.6, 0.1]]) g.add(mesh(new THREE.SphereGeometry(0.06, 12, 8), M(0xc8324a, { rough: 0.3 }), x, y, z));
    return g;
  },
  clockface() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 32), M(0xf6efe0, { rough: 0.4 })));
    { const t = mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 32), M(0xd9a441, { metal: 0.6, rough: 0.3 }), 0, 0.03, 0); t.rotation.x = Math.PI / 2; g.add(t); }
    const h1 = mesh(new THREE.BoxGeometry(0.03, 0.02, 0.2), M(0x2a1e1a), 0, 0.04, -0.08); g.add(h1);
    const h2 = mesh(new THREE.BoxGeometry(0.14, 0.02, 0.03), M(0x2a1e1a), 0.06, 0.04, 0); g.add(h2);
    g.rotation.x = Math.PI / 2;
    return wrap(g);
  },
  dome(o) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M(o.c ?? 0x4fa3a8, { metal: 0.4, rough: 0.35 })));
    const slit = mesh(new THREE.BoxGeometry(0.14, 0.5, 0.06), M(0x1e2440), 0, 0.25, 0.42); slit.rotation.x = -0.5; g.add(slit);
    g.add(mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.06, 32), M(0xd9a441, { metal: 0.6, rough: 0.3 })));
    return g;
  },
  lanternroom() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.5, 8), M(0xfff1b0, { emissive: 0xffc94d, ei: 0.9, rough: 0.2 }), 0, 0.25, 0));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.add(mesh(new THREE.BoxGeometry(0.04, 0.52, 0.04), M(0x2e3658), Math.cos(a) * 0.32, 0.26, Math.sin(a) * 0.32)); }
    const roof = mesh(new THREE.ConeGeometry(0.42, 0.42, 8), M(0xc9443a, { rough: 0.5 }), 0, 0.71, 0); g.add(roof);
    g.add(mesh(new THREE.SphereGeometry(0.06, 12, 8), M(0xd9a441, { metal: 0.6 }), 0, 0.95, 0));
    return g;
  },
  // ---------------- UI icons ----------------
  bolt() { return mesh(ext(poly([[0.1, 0.5], [-0.28, -0.04], [-0.02, -0.04], [-0.12, -0.5], [0.3, 0.08], [0.04, 0.08], [0.18, 0.5]]), 0.14, 0.04), M(0x3fc8bf, { rough: 0.35, emissive: 0x0e5e5a, ei: 0.3 })); },
  leaf() {
    const s = new THREE.Shape(); s.moveTo(0, -0.5); s.bezierCurveTo(0.42, -0.25, 0.42, 0.25, 0, 0.5); s.bezierCurveTo(-0.42, 0.25, -0.42, -0.25, 0, -0.5);
    const g = wrap(mesh(ext(s, 0.08, 0.03), M(0x6fbf4a, { rough: 0.45 })), mesh(new THREE.BoxGeometry(0.035, 0.9, 0.05), M(0x4e9a3a), 0, -0.02, 0.07));
    g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 8), M(0x6e4a2e), 0, -0.58, 0));
    g.rotation.z = -0.6;
    return wrap(g);
  },
  coin() {
    const g = new THREE.Group();
    const c = mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.14, 48), M(0xf2b544, { metal: 0.55, rough: 0.3 })); c.rotation.x = Math.PI / 2; g.add(c);
    const rim = mesh(new THREE.TorusGeometry(0.42, 0.04, 10, 48), M(0xd9902e, { metal: 0.6, rough: 0.3 }), 0, 0, 0.07); g.add(rim);
    const st = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.11 : 0.25, a = Math.PI / 2 + (i * Math.PI) / 5; i ? st.lineTo(Math.cos(a) * r, Math.sin(a) * r) : st.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.add(mesh(ext(st, 0.04, 0.015), M(0xffe08a, { metal: 0.5, rough: 0.3 }), 0, 0, 0.09));
    return g;
  },
  trophy() {
    const g = new THREE.Group(); const gold = M(0xf2c14e, { metal: 0.6, rough: 0.28 });
    const prof = [[0.01, 0], [0.3, 0.02], [0.32, 0.12], [0.14, 0.16], [0.06, 0.3], [0.06, 0.42], [0.16, 0.48], [0.34, 0.62], [0.38, 0.95], [0.34, 0.96]].map(([x, y]) => new THREE.Vector2(x, y));
    g.add(mesh(new THREE.LatheGeometry(prof, 40), gold));
    for (const sx of [1, -1]) { const h = mesh(new THREE.TorusGeometry(0.14, 0.035, 10, 24, Math.PI), gold, sx * 0.38, 0.78, 0); h.rotation.z = sx > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(h); }
    const s2 = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.05 : 0.11, a = Math.PI / 2 + (i * Math.PI) / 5; i ? s2.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s2.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.add(mesh(ext(s2, 0.02, 0.01), M(0xffffff, { rough: 0.3 }), 0, 0.72, 0.37));
    return g;
  },
  mapscroll() {
    const g = new THREE.Group(); const paper = [0xf3e2c0, 0xe9d3a0, 0xf3e2c0];
    paper.forEach((c, i) => { const p = mesh(new THREE.BoxGeometry(0.32, 0.8, 0.03), M(c, { rough: 0.7 }), (i - 1) * 0.31, 0, i === 1 ? -0.05 : 0); p.rotation.y = i === 1 ? 0 : (i - 1) * -0.35; g.add(p); });
    g.add(mesh(new THREE.CircleGeometry(0.1, 20), M(0x6fae52), -0.32, 0.12, 0.03));
    { const rv = mesh(new THREE.BoxGeometry(0.05, 0.5, 0.01), M(0x5fb3d3), 0.0, -0.05, -0.02); rv.rotation.z = 0.4; g.add(rv); }
    const x1 = mesh(new THREE.BoxGeometry(0.16, 0.04, 0.02), M(0xc8443a), 0.3, -0.18, 0.03); x1.rotation.z = 0.785; g.add(x1);
    const x2 = mesh(new THREE.BoxGeometry(0.16, 0.04, 0.02), M(0xc8443a), 0.3, -0.18, 0.03); x2.rotation.z = -0.785; g.add(x2);
    return g;
  },
  book(o) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.62, 0.8, 0.2), M(o.c ?? 0x8c6bb1, { rough: 0.55 })));
    g.add(mesh(new THREE.BoxGeometry(0.56, 0.74, 0.16), M(0xfbf3e2, { rough: 0.8 }), 0.04, 0, 0));
    g.add(mesh(new THREE.BoxGeometry(0.05, 0.82, 0.22), M(0x5e4a8e), -0.3, 0, 0));
    g.add(mesh(new THREE.BoxGeometry(0.06, 0.3, 0.01), M(0xc8443a), 0.12, -0.5, 0.06));
    const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.06 : 0.14, a = Math.PI / 2 + (i * Math.PI) / 5; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.add(mesh(ext(s, 0.02, 0.01), M(0xf2c14e, { metal: 0.5, rough: 0.3 }), 0.02, 0.06, 0.11));
    return g;
  },
  satchel() {
    const g = new THREE.Group(); const lth = M(0xb07a4a, { rough: 0.6 });
    g.add(mesh(new THREE.BoxGeometry(0.8, 0.6, 0.32), lth, 0, -0.05, 0));
    const flap = mesh(new THREE.BoxGeometry(0.82, 0.34, 0.05), M(0x8e5a32, { rough: 0.6 }), 0, 0.12, 0.17); flap.rotation.x = 0.12; g.add(flap);
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.1, 0.04), M(0xd9a441, { metal: 0.6, rough: 0.3 }), 0, -0.02, 0.21));
    const strap = mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 32, Math.PI), M(0x7a5232), 0, 0.22, 0); g.add(strap);
    return g;
  },
  boardtray() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(1.0, 0.1, 1.0), M(0xb07a4a, { rough: 0.6 })));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) g.add(mesh(new THREE.BoxGeometry(0.27, 0.06, 0.27), M((i + j) % 2 ? 0xfbf3e2 : 0xf2e3c4, { rough: 0.7 }), (i - 1) * 0.3, 0.08, (j - 1) * 0.3));
    const sp = mesh(new THREE.ConeGeometry(0.07, 0.24, 6), M(0x6fbf4a), 0, 0.24, 0); g.add(sp);
    g.add(mesh(new THREE.SphereGeometry(0.08, 12, 8), M(0xe8644a), 0.3, 0.17, 0.3));
    g.rotation.x = 0.9;
    return wrap(g);
  },
  calendar() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.8, 0.8, 0.1), M(0xfbf3e2, { rough: 0.6 })));
    g.add(mesh(new THREE.BoxGeometry(0.82, 0.22, 0.12), M(0xd9604a, { rough: 0.5 }), 0, 0.3, 0.01));
    for (const x of [-0.2, 0.2]) g.add(mesh(new THREE.TorusGeometry(0.05, 0.02, 8, 16), M(0x9aa3a8, { metal: 0.5 }), x, 0.42, 0.05));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) g.add(mesh(new THREE.BoxGeometry(0.14, 0.1, 0.02), M(i === 1 && j === 1 ? 0xf2b544 : 0xd9c9b0), (i - 1) * 0.22, -0.02 - j * 0.15, 0.06));
    return g;
  },
  check() { return mesh(ext(poly([[-0.45, 0.02], [-0.3, 0.17], [-0.12, -0.02], [0.32, 0.45], [0.47, 0.3], [-0.12, -0.32]]), 0.14, 0.04), M(0x6fae52, { rough: 0.4 })); },
  bulb() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.SphereGeometry(0.34, 32, 20), M(0xffe08a, { emissive: 0xffc94d, ei: 0.7, rough: 0.2 }), 0, 0.2, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.2, 24), M(0xffe08a, { emissive: 0xffc94d, ei: 0.5 }), 0, -0.12, 0));
    for (let i = 0; i < 3; i++) g.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 24), M(0x9aa3a8, { metal: 0.6, rough: 0.3 }), 0, -0.26 - i * 0.07, 0));
    g.add(mesh(new THREE.SphereGeometry(0.06, 12, 8), M(0x5e5a5a), 0, -0.48, 0));
    return g;
  },
  puzzletile() {
    const g = new THREE.Group();
    const s = new THREE.Shape(); const r = 0.12, w = 0.42; s.moveTo(-w + r, -w); s.lineTo(w - r, -w); s.quadraticCurveTo(w, -w, w, -w + r); s.lineTo(w, w - r); s.quadraticCurveTo(w, w, w - r, w); s.lineTo(-w + r, w); s.quadraticCurveTo(-w, w, -w, w - r); s.lineTo(-w, -w + r); s.quadraticCurveTo(-w, -w, -w + r, -w);
    g.add(mesh(ext(s, 0.12, 0.04), M(0x3e4a7a, { rough: 0.4 })));
    g.add(mesh(ext(poly([[-0.42, -0.07], [0.07, -0.07], [0.07, 0.42], [-0.07, 0.42], [-0.07, 0.07], [-0.42, 0.07]]), 0.04, 0.01), M(0xffd25a, { emissive: 0xffa21f, ei: 0.8 }), -0.14, 0.14, 0.1));
    g.add(mesh(new THREE.SphereGeometry(0.1, 16, 12), M(0xfff1b0, { emissive: 0xffc94d, ei: 1 }), 0, 0, 0.14));
    return g;
  },
  scroll() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.62, 0.7, 0.02), M(0xf3e2c0, { rough: 0.7 })));
    for (const y of [0.36, -0.36]) { const c = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.74, 20), M(0xe9d3a0, { rough: 0.6 }), 0, y, 0.02); c.rotation.z = Math.PI / 2; g.add(c); }
    for (let i = 0; i < 3; i++) g.add(mesh(new THREE.BoxGeometry(0.4 - i * 0.06, 0.04, 0.01), M(0xb8a888), -0.02, 0.15 - i * 0.12, 0.02));
    { const se = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 20), M(0xc8443a, { rough: 0.4 }), 0.15, -0.22, 0.03); se.rotation.x = Math.PI / 2; g.add(se); }
    return g;
  },
  arrowCircle(o) {
    const s = new THREE.Shape(); const R = 0.38, r = 0.24, a0 = 0.5, a1 = Math.PI * 1.75;
    s.absarc(0, 0, R, a0, a1, false); s.absarc(0, 0, r, a1, a0, true);
    const g = new THREE.Group();
    g.add(mesh(ext(s, 0.12, 0.03), M(o.c ?? 0xf2b544, { rough: 0.4 })));
    const hx = Math.cos(a0) * 0.31, hy = Math.sin(a0) * 0.31;
    const head = mesh(ext(poly([[-0.2, 0], [0.2, 0], [0, 0.22]]), 0.12, 0.03), M(o.c ?? 0xf2b544, { rough: 0.4 }), hx + 0.02, hy + 0.06, 0); head.rotation.z = a0 + Math.PI / 2 + 0.25; g.add(head);
    if (o.flip) g.scale.x = -1;
    return wrap(g);
  },
  gear() {
    const s = new THREE.Shape(); const n = 8;
    for (let i = 0; i < n * 4; i++) { const a = (i / (n * 4)) * Math.PI * 2; const r = i % 4 < 2 ? 0.46 : 0.34; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const hole = new THREE.Path(); hole.absarc(0, 0, 0.14, 0, Math.PI * 2, true); s.holes.push(hole);
    return mesh(ext(s, 0.16, 0.03), M(0x8e9aa8, { metal: 0.4, rough: 0.35 }));
  },
  upArrow() { return mesh(ext(poly([[0, 0.48], [0.4, 0.06], [0.15, 0.06], [0.15, -0.45], [-0.15, -0.45], [-0.15, 0.06], [-0.4, 0.06]]), 0.14, 0.04), M(0x6fae52, { rough: 0.4 })); },
};
