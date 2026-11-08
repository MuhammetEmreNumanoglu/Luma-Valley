// Board geometry and the merge rule. Functions here mutate a working copy of the state that the
// command layer created; they never touch the caller's state object.
import { BOARD_H, BOARD_W } from '../content/balance';
import { isMaxLevel, itemKey, parseItem, type ItemKey } from '../content/families';
import type { Cell, GameEvent, GameState } from './types';

export const CELLS = BOARD_W * BOARD_H;

export function xy(i: number): [number, number] {
  return [i % BOARD_W, Math.floor(i / BOARD_W)];
}

export function idx(x: number, y: number): number {
  return y * BOARD_W + x;
}

/** Orthogonal neighbours in a fixed order (N, E, S, W) so results are deterministic. */
export function neighbours(i: number): number[] {
  const [x, y] = xy(i);
  const out: number[] = [];
  if (y > 0) out.push(idx(x, y - 1));
  if (x < BOARD_W - 1) out.push(idx(x + 1, y));
  if (y < BOARD_H - 1) out.push(idx(x, y + 1));
  if (x > 0) out.push(idx(x - 1, y));
  return out;
}

export function isFree(c: Cell): boolean {
  return c.t === 'e';
}

/** Empty cells ordered by distance from `from` (Manhattan, ties by index). */
export function emptyCellsNear(board: Cell[], from: number): number[] {
  const [fx, fy] = xy(from);
  const list: number[] = [];
  for (let i = 0; i < board.length; i++) if (board[i].t === 'e') list.push(i);
  list.sort((a, b) => {
    const [ax, ay] = xy(a);
    const [bx, by] = xy(b);
    const da = Math.abs(ax - fx) + Math.abs(ay - fy);
    const db = Math.abs(bx - fx) + Math.abs(by - fy);
    return da - db || a - b;
  });
  return list;
}

export function boardCenter(): number {
  return idx(Math.floor(BOARD_W / 2), Math.floor(BOARD_H / 2));
}

/** Connected group of identical items containing `start`, in BFS order from `start`. */
export function findGroup(board: Cell[], start: number): number[] {
  const c = board[start];
  if (c.t !== 'i') return [];
  const key = c.k;
  const seen = new Set<number>([start]);
  const order = [start];
  for (let q = 0; q < order.length; q++) {
    for (const n of neighbours(order[q])) {
      if (seen.has(n)) continue;
      const nc = board[n];
      if (nc.t === 'i' && nc.k === key) {
        seen.add(n);
        order.push(n);
      }
    }
  }
  return order;
}

export interface MergeHooks {
  onCreate: (s: GameState, key: ItemKey, events: GameEvent[]) => void;
  onMerge: (s: GameState, level: number, family: string, events: GameEvent[]) => void;
}

/**
 * The trio for a deliberate merge: the dragged item (`from`), the item it was dropped on (`to`)
 * and the nearest identical item connected to the target (BFS from `to`, N/E/S/W order, so the
 * choice is deterministic and never a far-away item). Null when there is no third item.
 */
export function mergeTrio(board: Cell[], from: number, to: number): number[] | null {
  const a = board[from];
  const b = board[to];
  if (a?.t !== 'i' || b?.t !== 'i' || a.k !== b.k || from === to || isMaxLevel(a.k)) return null;
  const sim = board.slice();
  sim[from] = { t: 'e' };
  const group = findGroup(sim, to);
  return group.length >= 2 ? [from, to, group[1]] : null;
}

/**
 * Merges exactly three: the result appears on the target cell, the other two cells are left
 * empty. Adjacency alone never merges anything and nothing cascades.
 */
export function mergeDrop(s: GameState, from: number, to: number, events: GameEvent[], hooks: MergeHooks): boolean {
  const trio = mergeTrio(s.board, from, to);
  if (!trio) return false;
  const cell = s.board[to] as { t: 'i'; k: ItemKey };
  const { f, l } = parseItem(cell.k);
  const next = itemKey(f, l + 1);
  for (const i of trio) s.board[i] = { t: 'e' };
  s.board[to] = { t: 'i', k: next };
  events.push({ type: 'merge', item: next, at: to, from: trio, created: [to], count: 3 });
  hooks.onMerge(s, l + 1, f, events);
  hooks.onCreate(s, next, events);
  return true;
}

export function countItem(s: GameState, key: ItemKey): number {
  let n = s.harvestStock?.[key] ?? 0;
  for (const c of s.board) if (c.t === 'i' && c.k === key) n++;
  for (const area of s.workshop.unlocked) if (area !== s.workshop.active) for (const c of s.workshop.boards[area]) if (c.t === 'i' && c.k === key) n++;
  for (const k of s.inventory) if (k === key) n++;
  return n;
}

/** Removes n copies of key, inventory first, then board from the last cell backwards. */
export function removeItems(s: GameState, key: ItemKey, n: number): boolean {
  if (countItem(s, key) < n) return false;
  let left = n;
  const stored = Math.min(left, s.harvestStock?.[key] ?? 0);
  if (stored) { s.harvestStock[key] -= stored; left -= stored; }
  for (let i = 0; i < s.inventory.length && left > 0; i++) {
    if (s.inventory[i] === key) {
      s.inventory[i] = null;
      left--;
    }
  }
  for (let i = s.board.length - 1; i >= 0 && left > 0; i--) {
    const c = s.board[i];
    if (c.t === 'i' && c.k === key) {
      s.board[i] = { t: 'e' };
      left--;
    }
  }
  for (const area of s.workshop.unlocked) {
    if (area === s.workshop.active) continue;
    const board = s.workshop.boards[area];
    for (let i = board.length - 1; i >= 0 && left > 0; i--) {
      const c = board[i];
      if (c.t === 'i' && c.k === key) { board[i] = { t: 'e' }; left--; }
    }
  }
  return true;
}

/** Locked cells in the order they open: nearest to the board centre first. */
export function lockedOpenOrder(board: Cell[]): number[] {
  const [cx, cy] = xy(boardCenter());
  const list: number[] = [];
  for (let i = 0; i < board.length; i++) if (board[i].t === 'x') list.push(i);
  list.sort((a, b) => {
    const [ax, ay] = xy(a);
    const [bx, by] = xy(b);
    return Math.abs(ax - cx) + Math.abs(ay - cy) - (Math.abs(bx - cx) + Math.abs(by - cy)) || a - b;
  });
  return list;
}

/** A locked cell can be bought only next to an open (non-locked) cell. */
export function isOpenable(board: Cell[], i: number): boolean {
  if (board[i]?.t !== 'x') return false;
  return neighbours(i).some((n) => board[n].t !== 'x');
}

/** Initial board: a clearing with the merchant, starter seeds and four resource obstacles. */
export function initialBoard(): Cell[] {
  // prettier-ignore
  // S/W: a big rock / log pile to break (they free their cell); i: the tutorial seeds.
  const layout = [
    'xxxxxxx',
    'xSeeeWx',
    'eeeeeee',
    'eeePeee',
    'eeiieee',
    'xWeeeSx',
    'xxeiexx',
    'xxxxxxx',
    'xxxxxxx',
  ];
  const cells: Cell[] = [];
  for (const row of layout) {
    for (const ch of row) {
      if (ch === 'x') cells.push({ t: 'x' });
      else if (ch === 'P') cells.push({ t: 'p', p: 'merchant' });
      else if (ch === 'i') cells.push({ t: 'i', k: 'flower:1' });
      else if (ch === 'S') cells.push({ t: 'r', r: 'stone', tier: 1, stage: 0, readyAt: 0 });
      else if (ch === 'W') cells.push({ t: 'r', r: 'wood', tier: 1, stage: 0, readyAt: 0 });
      else cells.push({ t: 'e' });
    }
  }
  if (cells.length !== CELLS) throw new Error('bad initial board');
  return cells;
}
