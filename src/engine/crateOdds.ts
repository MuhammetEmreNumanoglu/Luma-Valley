// Dynamic crate odds: families the player is short of come up more often, families they already
// hoard come up less, without ever reaching zero. Pure and cheap: computed only when a crate is
// opened (or when the odds panel asks), from the state that is already there.
//
//   units_f   = Σ min(3^(level−1), UNIT_CAP) over items of family f on every workshop board,
//               the bag and reward storage, + harvest goods of f (1 each). Each item is counted once.
//   s_f       = max(0, units_f − DEMAND_RELIEF · open demand_f) / UNIT_SCALE
//   w_f       = base_f / (s_f + C)^ALPHA × (1 + min(DEMAND_BONUS_CAP, demand_f / DEMAND_SCALE))
//   P_f       = w_f / Σw, then every family gets at least FLOOR_SHARE of its fair share (1/N).
//
// Locked families never enter (the pool comes from cratePoolFor). Fixed recipes are untouched.
import { FARM_YIELD, traderRecipe } from '../content/farm';
import { parseItem, type FamilyId } from '../content/families';
import type { CrateEntry } from '../content/progression';
import type { Cell, GameState } from './types';

export const CRATE_ODDS = {
  /** A level-L item counts as 3^(L−1) level-1 items, capped so one big item cannot dominate. */
  UNIT_CAP: 9,
  /** Units per step of "stock"; 10 eggs vs 10 tomatoes is balanced, 50 vs 5 is strongly skewed. */
  UNIT_SCALE: 10,
  C: 1,
  ALPHA: 1,
  /** Open order / trader demand counts against stock (half of it) and adds a capped bonus. */
  DEMAND_RELIEF: 0.5,
  DEMAND_SCALE: 10,
  DEMAND_BONUS_CAP: 0.5,
  /** No open family drops below 40% of its fair share. */
  FLOOR_SHARE: 0.4,
} as const;

/** Harvest good → the crate family that grows it (egg:1 → chicken). */
const GOOD_FAMILY: Record<string, FamilyId> = Object.fromEntries(Object.entries(FARM_YIELD).map(([src, y]) => [y.item, parseItem(src).f]));

export type FamilyStock = Partial<Record<FamilyId, number>>;

function itemUnits(key: string): { f: FamilyId; units: number } | null {
  const good = GOOD_FAMILY[key];
  if (good) return { f: good, units: 1 };
  const { f, l } = parseItem(key);
  if (!f || !Number.isFinite(l) || l < 1) return null;
  return { f, units: Math.min(3 ** (l - 1), CRATE_ODDS.UNIT_CAP) };
}

/** Base-unit stock per family across every place the player keeps things (no double counting). */
export function familyStock(s: GameState): FamilyStock {
  const out: FamilyStock = {};
  const add = (key: string | null | undefined, n = 1) => {
    if (!key || n <= 0) return;
    const u = itemUnits(key);
    if (u) out[u.f] = (out[u.f] ?? 0) + u.units * n;
  };
  const boards: Cell[][] = [s.board];
  s.workshop?.boards?.forEach((b, i) => { if (i !== s.workshop.active && b !== s.board) boards.push(b); });
  for (const b of boards) for (const c of b) if (c.t === 'i') add(c.k);
  for (const k of s.inventory ?? []) add(k);
  for (const k of s.rewardStorage ?? []) add(k);
  for (const o of s.workshopOverflow ?? []) if (o.cell.t === 'i') add(o.cell.k);
  for (const [k, n] of Object.entries(s.harvestStock ?? {})) add(k, n);
  return out;
}

/** Units of each family that open orders and the trader still ask for. */
export function familyDemand(s: GameState): FamilyStock {
  const out: FamilyStock = {};
  const add = (key: string, n: number) => { const u = itemUnits(key); if (u) out[u.f] = (out[u.f] ?? 0) + u.units * n; };
  for (const o of s.orders ?? []) for (const it of o.items) add(it.item, it.n);
  for (const it of traderRecipe(s.level).inputs) add(it.item, it.count);
  return out;
}

/** Final probabilities for the given (already unlocked) pool; they sum to 1. */
export function dynamicCrateOdds(pool: readonly CrateEntry[], stock: FamilyStock, demand: FamilyStock = {}): { family: FamilyId; p: number }[] {
  if (!pool.length) return [];
  const K = CRATE_ODDS;
  const w = pool.map((e) => {
    const units = stock[e.family] ?? 0, need = demand[e.family] ?? 0;
    const sv = Math.max(0, units - K.DEMAND_RELIEF * need) / K.UNIT_SCALE;
    return (e.weight / Math.pow(sv + K.C, K.ALPHA)) * (1 + Math.min(K.DEMAND_BONUS_CAP, need / K.DEMAND_SCALE));
  });
  const total = w.reduce((a, b) => a + b, 0);
  let p = w.map((x) => x / total);
  // Floor: lift starved families, take the difference proportionally from the others.
  const floor = K.FLOOR_SHARE / pool.length;
  const low = p.map((x) => x < floor);
  if (low.some(Boolean)) {
    const lifted = low.reduce((n, l) => n + (l ? 1 : 0), 0) * floor;
    const restTotal = p.reduce((n, x, i) => n + (low[i] ? 0 : x), 0);
    p = p.map((x, i) => (low[i] ? floor : (x / restTotal) * (1 - lifted)));
  }
  return pool.map((e, i) => ({ family: e.family, p: p[i] }));
}

/** Crate entries with dynamic weights for a state, ready for `weighted()`. */
export function crateWeights(s: GameState, pool: readonly CrateEntry[]): { value: FamilyId; weight: number }[] {
  return dynamicCrateOdds(pool, familyStock(s), familyDemand(s)).map((x) => ({ value: x.family, weight: x.p }));
}
