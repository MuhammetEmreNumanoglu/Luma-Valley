// The Light Path trail: 80 puzzles. 1–6 are hand-authored tutorials; 7–80 come from the
// generator with fixed seeds and tier parameters, and every one is validated by the tests.
// Endless "echo" puzzles (daily, after the trail) use the same generator with a day seed.
import { makeRng } from '../core/rng';
import { generateValid, type GenParams } from './generator';
import { E, N, S, W, isSolved, period, tapsBetween, type LightColor, type Puzzle, type Tile } from './lightpaths';

const BOX: Record<string, number> = {
  '─': E | W,
  '│': N | S,
  '┌': E | S,
  '┐': W | S,
  '└': N | E,
  '┘': N | W,
  '├': N | E | S,
  '┤': N | W | S,
  '┬': E | W | S,
  '┴': N | E | W,
  '┼': N | E | S | W,
  '╴': W,
  '╶': E,
  '╵': N,
  '╷': S,
};

/** Parses an authored layout (drawn in its solved state) and scrambles it deterministically. */
function authored(id: string, seed: number, rows: string[]): Puzzle {
  const h = rows.length;
  const w = [...rows[0]].length;
  const grid = rows.map((r) => [...r]);
  const maskAt = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : (BOX[grid[y][x]] ?? 0));
  const inferred = (x: number, y: number) =>
    ((maskAt(x, y - 1) & S) ? N : 0) | ((maskAt(x + 1, y) & W) ? E : 0) | ((maskAt(x, y + 1) & N) ? S : 0) | ((maskAt(x - 1, y) & E) ? W : 0);
  const tiles: Tile[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = grid[y][x];
      if (BOX[ch] !== undefined) tiles.push({ kind: 'path', mask: BOX[ch], rot: 0, fixed: false, color: 0 });
      else if (ch === 'A' || ch === 'B') tiles.push({ kind: 'source', mask: inferred(x, y), rot: 0, fixed: true, color: (ch === 'B' ? 1 : 0) as LightColor });
      else if (ch === 'a' || ch === 'b') tiles.push({ kind: 'target', mask: inferred(x, y), rot: 0, fixed: true, color: (ch === 'b' ? 1 : 0) as LightColor });
      else if (ch === '#') tiles.push({ kind: 'rock', mask: 0, rot: 0, fixed: true, color: 0 });
      else tiles.push({ kind: 'empty', mask: 0, rot: 0, fixed: true, color: 0 });
    }
  }
  const solution = new Array<number>(tiles.length).fill(0);
  const rng = makeRng(seed);
  for (let attempt = 0; attempt < 50; attempt++) {
    let par = 0;
    const scrambled = tiles.map((t) => {
      if (t.fixed || period(t.mask) === 1) return { ...t };
      const rot = rng.int(4);
      par += tapsBetween(t.mask, rot, 0);
      return { ...t, rot };
    });
    const p: Puzzle = { id, w, h, tiles: scrambled, solution, par, tier: 0 };
    if (!isSolved(p) && par >= 3) return p;
  }
  throw new Error(`Cannot scramble ${id}`);
}

// prettier-ignore
const AUTHORED: [number, string[]][] = [
  [11, ['A─┐.', '..│.', '..└a', '....']],
  [23, ['A─┬╴', '..│.', '#.└a', '....']],
  [37, ['A─┬─┐', '#.│.│', 'a─┘.╵']],
  [41, ['..a..', '..│..', 'A─┼─┐', '..│.│', '..└─a']],
  [53, ['A─┐.#', '#.├─a', '.┌┘.#', '.│...', '.└──a']],
  [67, ['A─┬──┐', '.#│.#│', '┌─┘.┌┘', '│.#.│.', '└─a.└a']],
];

/** Tier parameters for trail positions 7..80. */
function paramsFor(k: number): GenParams {
  if (k <= 10) return { w: 5, h: 5, colors: 1, targets: 2, coverage: 0.6, rocks: 0.35, filters: 0, locks: 0, scramble: 0.55, tier: 1 };
  if (k <= 12) return { w: 5, h: 6, colors: 2, targets: 1, coverage: 0.6, rocks: 0.4, filters: 0, locks: 1, scramble: 0.5, tier: 2 };
  if (k <= 22) return { w: 6, h: 6, colors: k % 2 ? 2 : 1, targets: k % 2 ? 1 : 3, coverage: 0.66, rocks: 0.3, filters: k % 2 ? 1 : 0, locks: 1, scramble: 0.6, tier: 2 };
  if (k <= 34) return { w: 6, h: 6, colors: 2, targets: k % 3 === 0 ? 2 : 1, coverage: 0.72, rocks: 0.25, filters: 1, locks: 1, scramble: 0.65, tier: 3 };
  if (k <= 46) return { w: 6, h: 7, colors: 2, targets: 2, coverage: 0.74, rocks: 0.2, filters: 2, locks: 2, scramble: 0.7, tier: 4 };
  if (k <= 58) return { w: 7, h: 7, colors: 2, targets: 2, coverage: 0.76, rocks: 0.2, filters: 2, locks: 2, scramble: 0.72, tier: 5 };
  if (k <= 70) return { w: 7, h: 8, colors: 2, targets: k % 2 ? 2 : 3, coverage: 0.78, rocks: 0.15, filters: 3, locks: 2, scramble: 0.75, tier: 6 };
  return { w: 7, h: 8, colors: 2, targets: 3, coverage: 0.82, rocks: 0.12, filters: 3, locks: 3, scramble: 0.8, tier: 7 };
}

export const TRAIL_LENGTH = 80;

export function trailId(k: number): string {
  return `lp${String(k).padStart(2, '0')}`;
}

const cache = new Map<string, Puzzle>();

/** Trail puzzle by id ("lp01".."lp80"). Built lazily and cached. */
export function getPuzzle(id: string): Puzzle {
  const hit = cache.get(id);
  if (hit) return hit;
  let p: Puzzle;
  if (id.startsWith('echo-')) {
    const [, day, tier] = id.split('-');
    p = generateValid(id, Number(day) * 31 + 17, paramsFor(Math.min(80, 10 + Number(tier) * 10)));
  } else {
    const k = Number(id.slice(2));
    if (!(k >= 1 && k <= TRAIL_LENGTH)) throw new Error(`Unknown puzzle ${id}`);
    if (k <= AUTHORED.length) {
      const [seed, rows] = AUTHORED[k - 1];
      p = authored(id, seed, rows);
    } else {
      p = generateValid(id, 1000 + k * 37, paramsFor(k));
    }
  }
  cache.set(id, p);
  return p;
}

/** Region whose trail section contains puzzle k (1-based). */
export function puzzleRegion(k: number): number {
  if (k <= 10) return 1;
  if (k <= 22) return 2;
  return Math.min(7, 3 + Math.floor((k - 23) / 12));
}

/** Endless daily puzzle after the trail is done (or as the daily bonus). */
export function echoId(day: number, tier: number): string {
  return `echo-${day}-${Math.max(1, Math.min(7, tier))}`;
}
