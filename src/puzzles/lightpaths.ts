// Light Paths ("Işık Yolları"): a rotation puzzle. Tiles carry connectors on their four sides;
// tapping a tile turns it 90° clockwise. Light flows from each source through pairs of facing
// connectors. A target is lit when it receives exactly its own colour; colour filters only let
// their colour through. The puzzle is solved when every target is lit correctly.
//
// Everything here is pure and synchronous so it can be unit-tested and used by the generator.

export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;
const DIRS = [N, E, S, W] as const;
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

export type LightColor = 0 | 1; // 0 = amber, 1 = azure
export type TileKind = 'path' | 'source' | 'target' | 'filter' | 'rock' | 'empty';

export interface Tile {
  kind: TileKind;
  /** Connector mask in the *solved* orientation (rotation 0 = as authored). */
  mask: number;
  /** Current rotation, quarter turns clockwise (0..3). */
  rot: number;
  /** Tile cannot be rotated (sources, targets, locks). */
  fixed: boolean;
  color: LightColor;
}

export interface Puzzle {
  id: string;
  w: number;
  h: number;
  tiles: Tile[];
  /** Rotation of each tile in the reference solution (equals tiles[i].rot when solved). */
  solution: number[];
  /** Upper bound of the fewest taps (sum of minimal taps to the reference solution). */
  par: number;
  tier: number;
}

/** Rotates a 4-bit mask clockwise by r quarter turns. */
export function rotateMask(mask: number, r: number): number {
  let m = mask & 15;
  for (let i = 0; i < (r & 3); i++) m = ((m << 1) | (m >> 3)) & 15;
  return m;
}

export function currentMask(t: Tile): number {
  return rotateMask(t.mask, t.rot);
}

/** Distinct orientations of a mask (cross = 1, straight = 2, others = 4). */
export function period(mask: number): number {
  if (rotateMask(mask, 1) === mask) return 1;
  if (rotateMask(mask, 2) === mask) return 2;
  return 4;
}

/** Taps (clockwise) needed to go from rotation a to an orientation equivalent to rotation b. */
export function tapsBetween(mask: number, a: number, b: number): number {
  const p = period(mask);
  return (((b - a) % p) + p) % p;
}

function opposite(d: number): number {
  return d === N ? S : d === S ? N : d === E ? W : E;
}

/** Bitset of colours (bit 0 amber, bit 1 azure) that reach every tile. */
export function propagate(p: Puzzle): number[] {
  const lit = new Array<number>(p.tiles.length).fill(0);
  for (const color of [0, 1] as LightColor[]) {
    const bit = 1 << color;
    const queue: number[] = [];
    p.tiles.forEach((t, i) => {
      if (t.kind === 'source' && t.color === color) {
        lit[i] |= bit;
        queue.push(i);
      }
    });
    while (queue.length) {
      const i = queue.shift()!;
      const t = p.tiles[i];
      // Targets absorb light; they do not pass it on.
      if (t.kind === 'target') continue;
      const m = currentMask(t);
      const x = i % p.w;
      const y = (i - x) / p.w;
      for (let k = 0; k < 4; k++) {
        const d = DIRS[k];
        if (!(m & d)) continue;
        const nx = x + DX[k];
        const ny = y + DY[k];
        if (nx < 0 || ny < 0 || nx >= p.w || ny >= p.h) continue;
        const j = ny * p.w + nx;
        const n = p.tiles[j];
        if (n.kind === 'rock' || n.kind === 'empty') continue;
        if (!(currentMask(n) & opposite(d))) continue;
        if (n.kind === 'filter' && n.color !== color) continue;
        if (n.kind === 'source') continue;
        if (lit[j] & bit) continue;
        lit[j] |= bit;
        queue.push(j);
      }
    }
  }
  return lit;
}

export function isSolved(p: Puzzle, lit = propagate(p)): boolean {
  let any = false;
  for (let i = 0; i < p.tiles.length; i++) {
    const t = p.tiles[i];
    if (t.kind !== 'target') continue;
    any = true;
    if (lit[i] !== 1 << t.color) return false;
  }
  return any;
}

export function canRotate(t: Tile): boolean {
  return !t.fixed && (t.kind === 'path' || t.kind === 'filter') && period(t.mask) > 1;
}

/** Returns a new puzzle with tile i turned one quarter clockwise (no-op for fixed tiles). */
export function rotateTile(p: Puzzle, i: number): Puzzle {
  const t = p.tiles[i];
  if (!t || !canRotate(t)) return p;
  const tiles = p.tiles.slice();
  tiles[i] = { ...t, rot: (t.rot + 1) & 3 };
  return { ...p, tiles };
}

/** Taps still needed to reach the reference solution (0 = matches it). */
export function distanceToSolution(p: Puzzle): number {
  let d = 0;
  p.tiles.forEach((t, i) => {
    if (canRotate(t)) d += tapsBetween(t.mask, t.rot, p.solution[i]);
  });
  return d;
}

/**
 * Hint: the tile to tap next. Prefers tiles that are on the path of light that is already lit
 * (so the hint "follows the light"), otherwise the first wrong tile in reading order.
 */
export function hintTile(p: Puzzle): number | null {
  if (isSolved(p)) return null;
  const lit = propagate(p);
  let fallback: number | null = null;
  for (let i = 0; i < p.tiles.length; i++) {
    const t = p.tiles[i];
    if (!canRotate(t) || tapsBetween(t.mask, t.rot, p.solution[i]) === 0) continue;
    if (fallback === null) fallback = i;
    if (neighbourLit(p, i, lit)) return i;
  }
  return fallback;
}

function neighbourLit(p: Puzzle, i: number, lit: number[]): boolean {
  const x = i % p.w;
  const y = (i - x) / p.w;
  for (let k = 0; k < 4; k++) {
    const nx = x + DX[k];
    const ny = y + DY[k];
    if (nx < 0 || ny < 0 || nx >= p.w || ny >= p.h) continue;
    if (lit[ny * p.w + nx]) return true;
  }
  return false;
}

/** Stars for a solve: par → 3, par*1.5+2 → 2, otherwise 1. */
export function starsFor(moves: number, par: number): number {
  if (moves <= par) return 3;
  if (moves <= Math.ceil(par * 1.5) + 2) return 2;
  return 1;
}

/** Puts every rotatable tile in its reference orientation (used by tests and the generator). */
export function solvedCopy(p: Puzzle): Puzzle {
  return { ...p, tiles: p.tiles.map((t, i) => ({ ...t, rot: p.solution[i] })) };
}

export function resetTo(p: Puzzle, initial: Puzzle): Puzzle {
  return { ...p, tiles: initial.tiles.map((t) => ({ ...t })) };
}
