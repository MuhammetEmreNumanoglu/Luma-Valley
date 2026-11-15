/**
 * Köprü Yardımcısı (Bridge Helper): a planned optional ₺9,90 perk that halves wood and stone
 * clearing times. Prototype only: real payment is off, so the perk can be switched on solely by
 * the development-build test grant (engine/devEconomy.ts). A release build has no way to set it.
 */
import type { ResourceKind } from '../content/resources';
import type { GameState } from '../engine/types';

export const BRIDGE_HELPER = {
  id: 'helper.bridge',
  name: { tr: 'Köprü Yardımcısı', en: 'Bridge Helper' },
  plannedPrice: '₺9,90',
  factor: 0.5,
  kinds: ['wood', 'stone'] as readonly ResourceKind[],
} as const;

/** True only for a perk recorded with a development test transaction that the save also lists. */
export function hasBridgeHelper(s: GameState): boolean {
  const perk = s.perks?.bridgeHelper;
  return !!perk && perk.source === 'devTest' && (s.devTestTransactions ?? []).includes(perk.transactionId);
}

/** Clearing time for one resource stage, after the helper (never below one second). */
export function resourceStageSeconds(s: GameState, kind: ResourceKind, seconds: number): number {
  return hasBridgeHelper(s) && BRIDGE_HELPER.kinds.includes(kind) ? Math.max(1, Math.round(seconds * BRIDGE_HELPER.factor)) : seconds;
}
