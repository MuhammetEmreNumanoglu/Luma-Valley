/** Ephemeral visual events. Balances are always committed by the engine first. */
export type RewardKind = 'gold' | 'energy' | 'token';
export type RewardVisual = { id: number; kind: RewardKind; x: number; y: number };
let origin: { x: number; y: number; at: number } | null = null;
let sequence = 0;
const listeners = new Set<(event: RewardVisual) => void>();
export function captureRewardOrigin(x: number, y: number) { if (Number.isFinite(x) && Number.isFinite(y) && (x > 0 || y > 0)) origin = { x, y, at: Date.now() }; }
export function subscribeRewards(fn: (event: RewardVisual) => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function emitReward(kind: RewardKind) {
  if (!origin || Date.now() - origin.at > 2500) return;
  const event = { id: ++sequence, kind, x: origin.x, y: origin.y };
  for (const fn of listeners) fn(event);
}
