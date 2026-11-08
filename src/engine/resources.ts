// Workshop resource obstacles (content/resources.ts): break → wait (wall clock) → collect, three
// times; the third collection frees the cell. Mutators run inside `apply` on a working copy.
//
// Safety (tests/resources.test.ts):
// - Energy is paid once when a stage starts; a running stage cannot be started again.
// - A stage pays only after its time and only once (the cell is updated before paying).
// - Rewards never vanish: no room on the board → reward storage.
// - Obstacles are never placed on an occupied cell.
import { RESOURCES, RESOURCE_KINDS, resourceTier, stageEnergy, SUPPLY, type ResourceKind } from '../content/resources';
import { regen } from '../core/time';
import { boardCenter, CELLS, emptyCellsNear, xy } from './board';
import { discover } from './state';
import type { Cell, DenyReason, GameEvent, GameState } from './types';

export type ResourceCell = Extract<Cell, { t: 'r' }>;

export function makeResource(kind: ResourceKind, tier: number): ResourceCell {
  return { t: 'r', r: kind, tier, stage: 0, readyAt: 0 };
}

/** Kinds whose supply has arrived (by region). */
export function unlockedKinds(s: GameState): ResourceKind[] {
  return RESOURCE_KINDS.filter((k) => s.regions.includes(RESOURCES[k].region));
}

export function resourceAt(s: GameState, cell: number): ResourceCell | null {
  const c = s.board[cell];
  return c?.t === 'r' ? c : null;
}

/** Puts items next to `near` on the active board; overflow goes to the reward storage. */
export function deliverNear(s: GameState, near: number, item: string, n: number, now: number, events: GameEvent[]): void {
  for (let k = 0; k < n; k++) {
    const free = emptyCellsNear(s.board, near);
    if (free.length) {
      s.board[free[0]] = { t: 'i', k: item };
      events.push({ type: 'gift', item, producer: null, at: free[0] });
    } else {
      s.rewardStorage.push(item);
      s.rewardUnread = true;
    }
  }
  discover(s, item, now, events);
}

export function breakResource(s: GameState, cell: number, now: number, events: GameEvent[]): DenyReason | null {
  const c = resourceAt(s, cell);
  if (!c) return 'invalid';
  if (c.readyAt > 0) return 'notAvailable'; // already being broken (double tap)
  if (c.stage >= 3) return 'invalid';
  const cost = stageEnergy(c.r, c.stage, c.tier);
  if (s.energy < cost) return 'noEnergy';
  s.energy -= cost;
  const secs = RESOURCES[c.r].stages[c.stage].seconds;
  s.board[cell] = { ...c, readyAt: now + secs * 1000 };
  events.push({ type: 'resource', at: cell, kind: c.r, stage: c.stage, phase: 'start' });
  return null;
}

export function claimResource(s: GameState, cell: number, now: number, events: GameEvent[]): DenyReason | null {
  const c = resourceAt(s, cell);
  if (!c || !(c.readyAt > 0) || now < c.readyAt) return 'notAvailable';
  const def = RESOURCES[c.r];
  const paid = def.stages[c.stage].yield;
  const stage = c.stage + 1;
  // Update the cell before paying (a second claim finds nothing to pay). The obstacle still
  // occupies its cell while the goods are placed around it, then the cell is freed.
  s.board[cell] = { ...c, stage, readyAt: 0 };
  deliverNear(s, cell, `${def.family}:${c.tier}`, paid, now, events);
  if (stage >= 3) {
    s.board[cell] = { t: 'e' };
    s.stats.cleared = (s.stats.cleared ?? 0) + 1;
  }
  s.stats.produced += paid;
  events.push({ type: 'resource', at: cell, kind: c.r, stage, phase: stage >= 3 ? 'cleared' : 'claimed' });
  return null;
}

/** Free cells on the board edge, outermost first: new supplies never land in the middle. */
export function supplyCells(board: Cell[]): number[] {
  const [cx, cy] = xy(boardCenter());
  const free: number[] = [];
  for (let i = 0; i < CELLS; i++) if (board[i].t === 'e') free.push(i);
  return free.sort((a, b) => {
    const [ax, ay] = xy(a);
    const [bx, by] = xy(b);
    return Math.abs(bx - cx) + Math.abs(by - cy) - (Math.abs(ax - cx) + Math.abs(ay - cy)) || a - b;
  });
}

export function obstaclesOn(board: Cell[]): number {
  return board.filter((c) => c.t === 'r').length;
}

export function placeResource(s: GameState, kind: ResourceKind, now: number, events: GameEvent[]): DenyReason | null {
  if (!RESOURCES[kind]) return 'invalid';
  if (!unlockedKinds(s).includes(kind)) return 'locked';
  if (s.supply.charges <= 0) return 'noCharges';
  if (obstaclesOn(s.board) >= SUPPLY.perBoard) return 'notAvailable';
  const spot = supplyCells(s.board)[0];
  if (spot === undefined) return 'boardFull';
  if (s.supply.charges === SUPPLY.max) s.supply.anchor = now; // refill clock starts on first use
  s.supply.charges -= 1;
  s.board[spot] = makeResource(kind, resourceTier(s.level));
  events.push({ type: 'resource', at: spot, kind, stage: 0, phase: 'placed' });
  return null;
}

/** Supply refill and clock safety for running breaks (called from tick). */
export function tickResources(s: GameState, now: number, anchorNow: number): void {
  if (s.supply.charges < SUPPLY.max) {
    const r = regen(s.supply.charges, SUPPLY.max, s.supply.anchor, anchorNow, SUPPLY.regenMs);
    s.supply.charges = r.amount;
    s.supply.anchor = r.anchor;
  } else s.supply.anchor = now;
  const boards = s.workshop.boards.map((b, i) => (i === s.workshop.active ? s.board : b));
  for (const b of boards) {
    for (let i = 0; i < b.length; i++) {
      const c = b[i];
      if (c?.t !== 'r' || c.readyAt <= 0) continue;
      const max = now + RESOURCES[c.r].stages[Math.min(2, c.stage)].seconds * 1000;
      if (c.readyAt > max) b[i] = { ...c, readyAt: max };
    }
  }
}
