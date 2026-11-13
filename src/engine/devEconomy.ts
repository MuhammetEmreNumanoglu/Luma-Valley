import { BALANCE } from '../content/balance';
import { MOCK_PRODUCTS, type MockProductId } from '../premium/catalog';
import { addEnergy, changeCoins, clone } from './state';
import type { GameState } from './types';

export type DevGrant = { currency: 'gold' | 'tokens' | 'energy'; amount: number } | { currency: 'fill' } | { currency: 'mock'; product: MockProductId; transactionId: string };
/** Never registered as a game command. The provider also checks the actual development build flag. */
export function applyDevGrant(state: GameState, grant: DevGrant, now: number, enabled: boolean): GameState | null {
  if (!enabled) return null;
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
