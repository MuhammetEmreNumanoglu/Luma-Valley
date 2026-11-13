import { isMaxLevel } from '../content/families';
import { cratePool, type CrateEntry } from '../content/progression';
import type { Cell } from './types';

/** Bias the last six available spaces towards two mergeable triples when possible. */
export function crateChoices(board: Cell[], level: number): CrateEntry[] {
  const pool = cratePool(level);
  if (board.filter(c => c.t === 'e').length > 6) return pool;
  const counts = new Map<string, number>();
  for (const cell of board) if (cell.t === 'i' && !isMaxLevel(cell.k)) counts.set(cell.k, (counts.get(cell.k) ?? 0) + 1);
  const triples = [...counts.values()].reduce((n, count) => n + Math.floor(count / 3), 0);
  if (triples >= 2) return pool;

  function missingAfter(entry: CrateEntry): number {
    const next = new Map(counts);
    const key = `${entry.family}:1`;
    next.set(key, (next.get(key) ?? 0) + 1);
    const have = [...next.values()].reduce((n, count) => n + Math.floor(count / 3), 0);
    const needed = 2 - have;
    if (needed <= 0) return 0;
    const gaps = pool.map(p => 3 - ((next.get(`${p.family}:1`) ?? 0) % 3)).sort((a, b) => a - b);
    if (needed === 1) return gaps[0];
    return Math.min(gaps[0] + 3, gaps.length > 1 ? gaps[0] + gaps[1] : Infinity);
  }
  const scores = pool.map(missingAfter);
  const best = Math.min(...scores);
  return pool.filter((_, i) => scores[i] === best);
}
