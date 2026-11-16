import { BALANCE } from '../content/balance';
import { MOCK_PRODUCTS, type MockProductId } from '../premium/catalog';
import { addEnergy, changeCoins, clone } from './state';
import type { GameState } from './types';
import { REGIONS } from '../content/regions';
import { CRATE_POOL, newFamilySeenFlag } from '../content/progression';

/** Highest level the DEV TEST tools can jump to. */
export const DEV_MAX_LEVEL = 60;

export type DevGrant =
  | { currency: 'level'; to: number }
  | { currency: 'region'; region: number }
  | { currency: 'gold' | 'tokens' | 'energy'; amount: number } | { currency: 'fill' } | { currency: 'mock'; product: MockProductId; transactionId: string } | { currency: 'perk'; perk: 'bridgeHelper'; transactionId: string };
/** Never registered as a game command. The provider also checks the actual development build flag. */
export function applyDevGrant(state: GameState, grant: DevGrant, now: number, enabled: boolean): GameState | null {
  if (!enabled) return null;
  if (grant.currency === 'level') return devSetLevel(state, grant.to, now);
  if (grant.currency === 'region') return devOpenRegion(state, grant.region, now);
  if (grant.currency === 'perk') {
    // DEV TEST only: no real payment exists, so the helper is never sold or granted in a release build.
    if (grant.perk !== 'bridgeHelper' || !grant.transactionId || state.perks?.bridgeHelper || (state.devTestTransactions ?? []).includes(grant.transactionId)) return null;
    const s = clone(state);
    s.devTestTransactions = [...(s.devTestTransactions ?? []), grant.transactionId];
    s.perks = { ...(s.perks ?? {}), bridgeHelper: { source: 'devTest', transactionId: grant.transactionId } };
    return s;
  }
  let currency: 'gold' | 'tokens' | 'energy' = grant.currency === 'fill' ? 'energy' : grant.currency === 'mock' ? 'tokens' : grant.currency;
  let amount = grant.currency === 'fill' ? Math.max(0, BALANCE.energy.max - state.energy) : grant.currency === 'mock' ? (MOCK_PRODUCTS.find(p => p.id === grant.product && p.kind === 'consumable')?.tokens ?? 0) : grant.amount;
  if (grant.currency === 'gold' && ![1000,10000,100000,200000].includes(amount)) return null;
  if (grant.currency === 'tokens' && ![100,500,1000,10000].includes(amount)) return null;
  if (grant.currency === 'energy' && ![25,100].includes(amount)) return null;
  if (grant.currency === 'mock' && (!amount || !grant.transactionId || (state.devTestTransactions ?? []).includes(grant.transactionId))) return null;
  if (amount <= 0 || !Number.isSafeInteger(amount)) return null;
  const s = clone(state);
  const id = grant.currency === 'mock' ? grant.transactionId : `dev-${now}-${Math.random().toString(36).slice(2)}`;
  if (currency === 'gold') { if (!changeCoins(s, amount, 'DEV TEST', id, now)) return null; }
  else if (currency === 'tokens') { if (!Number.isSafeInteger(s.starTokens + amount)) return null; s.starTokens += amount; }
  else { const old = s.energy; addEnergy(s, amount); amount = s.energy - old; if (!amount) return null; }
  if (grant.currency === 'mock') s.devTestTransactions = [...(s.devTestTransactions ?? []), id];
  s.devTestLedger = [...(s.devTestLedger ?? []), { at: now, amount, currency, reason: grant.currency === 'mock' ? `mock:${grant.product}` : 'testGrant' }].slice(-100);
  return s;
}

/**
 * DEV TEST: jump up to a level. XP starts the new level at 0 (no XP/level mismatch) and the skipped
 * level-up rewards are not paid, so the tool can never be used to farm them. Unlocks that depend on
 * the level (crate families, shops, trader, orders) follow automatically; their cards are marked seen.
 */
function devSetLevel(state: GameState, to: number, now: number): GameState | null {
  if (!Number.isSafeInteger(to) || to <= state.level || to > DEV_MAX_LEVEL) return null;
  const s = clone(state);
  const from = s.level;
  s.level = to; s.xp = 0;
  for (const e of CRATE_POOL) if (e.level <= to) s.flags[newFamilySeenFlag(e.family)] = true;
  s.devTestLedger = [...(s.devTestLedger ?? []), { at: now, amount: to - from, currency: 'level' as const, reason: `level ${from} → ${to}` }].slice(-100);
  return s;
}

/** DEV TEST: open one valley region for testing; opening an open region changes nothing. */
function devOpenRegion(state: GameState, region: number, now: number): GameState | null {
  if (!REGIONS.some((r) => r.id === region) || state.regions.includes(region)) return null;
  const s = clone(state);
  s.regions = [...s.regions, region].sort((a, b) => a - b);
  s.devTestLedger = [...(s.devTestLedger ?? []), { at: now, amount: 1, currency: 'region' as const, reason: `region ${region}` }].slice(-100);
  return s;
}
