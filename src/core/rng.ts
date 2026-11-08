// Seeded, serialisable random numbers. The engine never calls Math.random: every random choice
// reads and advances `state.rng`, so the same save + the same commands give the same result.

/** mulberry32 step: returns [value in [0,1), next state]. */
export function nextRandom(seed: number): [number, number] {
  let t = (seed + 0x6d2b79f5) | 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** Small mutable generator for pure functions that need many draws (puzzle generator, tests). */
export interface Rng {
  next(): number;
  int(maxExclusive: number): number;
  pick<T>(list: readonly T[]): T;
  state(): number;
}

export function makeRng(seed: number): Rng {
  let s = seed | 0;
  const next = () => {
    const [v, n] = nextRandom(s);
    s = n;
    return v;
  };
  return {
    next,
    int: (max) => Math.floor(next() * max),
    pick: (list) => list[Math.floor(next() * list.length)],
    state: () => s,
  };
}

/** Stable 32-bit hash of a string (FNV-1a). Used for day seeds and content checksums. */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic 0..1 noise for decoration (no state). */
export function hash01(a: number, b = 0): number {
  'worklet';
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Weighted pick with an explicit random value (keeps callers pure). */
export function weighted<T>(entries: readonly { value: T; weight: number }[], r: number): T {
  let total = 0;
  for (const e of entries) total += e.weight;
  let x = r * total;
  for (const e of entries) {
    x -= e.weight;
    if (x < 0) return e.value;
  }
  return entries[entries.length - 1].value;
}
