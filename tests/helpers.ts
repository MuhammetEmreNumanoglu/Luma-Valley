import { apply, type Command } from '../src/engine/commands';
import { newGame } from '../src/engine/state';
import type { Cell, GameEvent, GameState } from '../src/engine/types';
import { CELLS } from '../src/engine/board';

export const T0 = Date.UTC(2026, 10, 4, 9, 0, 0);

export function fresh(seed = 42): GameState {
  return newGame(T0, seed, 0);
}

/** Board with every cell open and empty, for focused rule tests. */
export function blank(seed = 1): GameState {
  const s = fresh(seed);
  s.board = new Array<Cell>(CELLS).fill(null as unknown as Cell).map(() => ({ t: 'e' }));
  s.producers = {};
  return s;
}

export function run(s: GameState, cmd: Command, now = T0): { s: GameState; ev: GameEvent[] } {
  const r = apply(s, cmd, now);
  return { s: r.state, ev: r.events };
}

export function put(s: GameState, i: number, k: string) {
  s.board[i] = { t: 'i', k };
}

export function items(s: GameState): Record<string, number> {
  const m: Record<string, number> = {};
  for (const c of s.board) if (c.t === 'i') m[c.k] = (m[c.k] ?? 0) + 1;
  for (const k of s.inventory) if (k) m[k] = (m[k] ?? 0) + 1;
  return m;
}
