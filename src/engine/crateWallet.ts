/** Separate provenance without guessing the origin of older balances. */
import type { GameState } from './types';
type Crate = GameState['crate'];
type Bucket = 'normal' | 'daily' | 'bonus' | 'energy' | 'legacy';
const buckets: Bucket[] = ['normal', 'daily', 'bonus', 'energy', 'legacy'];
export function reconcileCrates(c: Crate): void {
  if (!c.wallet) c.wallet = { normal: 0, daily: 0, bonus: 0, energy: 0, legacy: Math.max(0, c.charges) };
  for (const key of buckets) c.wallet[key] = Math.max(0, Math.floor(Number(c.wallet[key]) || 0));
  let delta = c.charges - buckets.reduce((sum, key) => sum + c.wallet![key], 0);
  if (delta > 0) c.wallet.legacy += delta;
  else for (const key of ['legacy', 'bonus', 'energy', 'daily', 'normal'] as Bucket[]) { const n = Math.min(c.wallet[key], -delta); c.wallet[key] -= n; delta += n; if (delta === 0) break; }
}
export function addCrateBalance(c: Crate, bucket: Bucket, count: number): number {
  reconcileCrates(c); const n = Math.max(0, Math.min(Math.floor(count), 999-c.charges)); c.wallet![bucket] += n; c.charges += n; return n;
}
export function spendCrate(c: Crate): boolean {
  reconcileCrates(c); if (c.charges <= 0) return false;
  for (const key of ['daily', 'bonus', 'energy', 'legacy', 'normal'] as Bucket[]) if (c.wallet![key] > 0) { c.wallet![key]--; c.charges--; return true; }
  return false;
}
