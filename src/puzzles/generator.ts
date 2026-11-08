// Builds Light Path puzzles that are solvable by construction:
//   1. grow one random spanning tree per light colour from its source (multi-source Prim),
//   2. turn chosen leaves into targets, keep other leaves as dead-end decoys,
//   3. derive every tile's connector mask from the tree edges (that layout is the solution),
//   4. fill unused cells with decoy pieces or rocks, add colour filters and locked anchors,
//   5. scramble rotations, requiring a minimum number of wrong tiles.
// The result is then checked with the same propagate() the game uses (validatePuzzle).
import { makeRng, type Rng } from '../core/rng';
import { E, isSolved, N, period, propagate, rotateMask, S, solvedCopy, tapsBetween, W, type LightColor, type Puzzle, type Tile } from './lightpaths';

export interface GenParams {
  w: number;
  h: number;
  colors: 1 | 2;
  /** Targets per colour. */
  targets: number;
  /** Fraction of cells that belong to the light trees. */
  coverage: number;
  /** Rocks among non-tree cells (0..1); the rest become decoy pieces. */
  rocks: number;
  filters: number;
  /** Locked (non-rotatable) path tiles shown as anchors. */
  locks: number;
  /** Minimum share of rotatable tiles that start in a wrong orientation. */
  scramble: number;
  tier: number;
}

const DIR = [N, E, S, W];
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];
const OPP = [S, W, N, E];

function emptyTile(): Tile {
  return { kind: 'empty', mask: 0, rot: 0, fixed: true, color: 0 };
}

interface Grown {
  owner: number[]; // -1 = free, otherwise colour index
  mask: number[];
  depth: number[];
  sources: number[];
}

function grow(rng: Rng, p: GenParams): Grown {
  const n = p.w * p.h;
  const owner = new Array<number>(n).fill(-1);
  const mask = new Array<number>(n).fill(0);
  const depth = new Array<number>(n).fill(0);
  const sources: number[] = [];
  // Sources sit on the border, spread apart.
  const border: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = i % p.w;
    const y = (i / p.w) | 0;
    if (x === 0 || y === 0 || x === p.w - 1 || y === p.h - 1) border.push(i);
  }
  for (let c = 0; c < p.colors; c++) {
    let best = border[rng.int(border.length)];
    if (c > 0) {
      // Farthest border cell from the first source (with a little randomness).
      let bestD = -1;
      for (const b of border) {
        const d = Math.abs((b % p.w) - (sources[0] % p.w)) + Math.abs(((b / p.w) | 0) - ((sources[0] / p.w) | 0)) + rng.next();
        if (d > bestD) {
          bestD = d;
          best = b;
        }
      }
    }
    owner[best] = c;
    sources.push(best);
  }
  const goal = Math.max(p.colors * 3, Math.round(n * p.coverage));
  let size = sources.length;
  let guard = 0;
  while (size < goal && guard++ < n * 40) {
    // Alternate colours so trees stay balanced.
    const c = guard % p.colors;
    const frontier: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      if (owner[i] !== c) continue;
      const x = i % p.w;
      const y = (i / p.w) | 0;
      for (let k = 0; k < 4; k++) {
        const nx = x + DX[k];
        const ny = y + DY[k];
        if (nx < 0 || ny < 0 || nx >= p.w || ny >= p.h) continue;
        const j = ny * p.w + nx;
        if (owner[j] === -1) frontier.push([i, k]);
      }
    }
    if (!frontier.length) {
      if (p.colors === 1) break;
      continue;
    }
    // Prefer extending deep cells a bit, which makes longer, more interesting paths.
    let pick = frontier[rng.int(frontier.length)];
    const alt = frontier[rng.int(frontier.length)];
    if (depth[alt[0]] > depth[pick[0]] && rng.next() < 0.5) pick = alt;
    const [i, k] = pick;
    // Sources keep a single connector.
    if (sources.includes(i) && mask[i] !== 0) continue;
    const x = i % p.w;
    const y = (i / p.w) | 0;
    const j = (y + DY[k]) * p.w + (x + DX[k]);
    owner[j] = c;
    mask[i] |= DIR[k];
    mask[j] |= OPP[k];
    depth[j] = depth[i] + 1;
    size++;
  }
  return { owner, mask, depth, sources };
}

function bitCount(m: number): number {
  return (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);
}

export function generatePuzzle(id: string, seed: number, p: GenParams): Puzzle | null {
  const rng = makeRng(seed);
  const g = grow(rng, p);
  const n = p.w * p.h;
  const tiles: Tile[] = new Array(n);
  for (let i = 0; i < n; i++) tiles[i] = emptyTile();

  // Targets: deepest leaves of each tree (with a random tie-break), at least 2 steps from the source.
  for (let c = 0; c < p.colors; c++) {
    const leaves: number[] = [];
    for (let i = 0; i < n; i++) {
      if (g.owner[i] === c && i !== g.sources[c] && bitCount(g.mask[i]) === 1 && g.depth[i] >= 2) leaves.push(i);
    }
    if (leaves.length < p.targets) return null;
    leaves.sort((a, b) => g.depth[b] - g.depth[a] + (rng.next() - 0.5) * 3);
    for (let t = 0; t < p.targets; t++) {
      const i = leaves[t];
      tiles[i] = { kind: 'target', mask: g.mask[i], rot: 0, fixed: true, color: c as LightColor };
    }
    const s = g.sources[c];
    if (g.mask[s] === 0) return null;
    tiles[s] = { kind: 'source', mask: g.mask[s], rot: 0, fixed: true, color: c as LightColor };
  }
  // Tree paths.
  const pathCells: number[] = [];
  for (let i = 0; i < n; i++) {
    if (g.owner[i] < 0 || tiles[i].kind !== 'empty') continue;
    tiles[i] = { kind: 'path', mask: g.mask[i], rot: 0, fixed: false, color: g.owner[i] as LightColor };
    pathCells.push(i);
  }
  // Free cells: rocks or decoys (decoys are ends/straights/corners that lead nowhere useful).
  const decoyMasks = [N, N | S, N | E, N | E | S];
  for (let i = 0; i < n; i++) {
    if (g.owner[i] >= 0) continue;
    if (rng.next() < p.rocks) tiles[i] = { kind: 'rock', mask: 0, rot: 0, fixed: true, color: 0 };
    else tiles[i] = { kind: 'path', mask: rotateMask(rng.pick(decoyMasks), rng.int(4)), rot: 0, fixed: false, color: 0 };
  }
  // Filters on straight segments of 2-colour puzzles: only their own colour passes.
  if (p.colors === 2 && p.filters > 0) {
    const straights = pathCells.filter((i) => g.mask[i] === (N | S) || g.mask[i] === (E | W));
    for (let f = 0; f < p.filters && straights.length; f++) {
      const i = straights.splice(rng.int(straights.length), 1)[0];
      tiles[i] = { ...tiles[i], kind: 'filter' };
    }
  }
  // Locks: some tree tiles are fixed in their solved orientation (anchors for reasoning).
  const lockable = pathCells.filter((i) => tiles[i].kind === 'path' && period(tiles[i].mask) > 1);
  for (let l = 0; l < p.locks && lockable.length; l++) {
    const i = lockable.splice(rng.int(lockable.length), 1)[0];
    tiles[i] = { ...tiles[i], fixed: true };
  }

  const solution = new Array<number>(n).fill(0);
  const puzzle: Puzzle = { id, w: p.w, h: p.h, tiles, solution, par: 0, tier: p.tier };
  if (!isSolved(puzzle)) return null;

  // Scramble.
  const rotatable = tiles.map((t, i) => (!t.fixed && period(t.mask) > 1 ? i : -1)).filter((i) => i >= 0);
  if (rotatable.length < 3) return null;
  for (let attempt = 0; attempt < 30; attempt++) {
    const scrambled = tiles.map((t) => ({ ...t }));
    let wrong = 0;
    let par = 0;
    for (const i of rotatable) {
      const t = scrambled[i];
      const r = rng.int(4);
      t.rot = r;
      const taps = tapsBetween(t.mask, r, 0);
      if (taps > 0 && g.owner[i] >= 0) wrong++;
      if (g.owner[i] >= 0) par += taps;
    }
    const treeRotatable = rotatable.filter((i) => g.owner[i] >= 0).length;
    const candidate: Puzzle = { ...puzzle, tiles: scrambled, par };
    if (wrong >= Math.max(2, Math.ceil(treeRotatable * p.scramble)) && !isSolved(candidate)) return candidate;
  }
  return null;
}

/** Same checks the content tests run: reference solution solves it; start state does not. */
export function validatePuzzle(p: Puzzle): string | null {
  if (p.tiles.length !== p.w * p.h) return 'size mismatch';
  if (!p.tiles.some((t) => t.kind === 'target')) return 'no targets';
  if (!p.tiles.some((t) => t.kind === 'source')) return 'no source';
  if (!isSolved(solvedCopy(p))) return 'reference solution does not solve';
  if (isSolved(p)) return 'starts solved';
  if (p.par < 2) return 'too easy';
  const lit = propagate(solvedCopy(p));
  for (let i = 0; i < p.tiles.length; i++) if (p.tiles[i].kind === 'target' && lit[i] !== 1 << p.tiles[i].color) return 'target unlit';
  return null;
}

/** Generates with retries over derived seeds (deterministic). */
export function generateValid(id: string, seed: number, params: GenParams): Puzzle {
  for (let k = 0; k < 200; k++) {
    const p = generatePuzzle(id, (seed * 7919 + k * 104729) | 0, params);
    if (p && validatePuzzle(p) === null) return p;
  }
  throw new Error(`Could not generate puzzle ${id}`);
}
