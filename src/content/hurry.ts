/** One token per started minute; tokens are exchanged from earned coins. */
export const HURRY = { millisecondsPerToken: 60_000, coinsPerToken: 20 } as const;
export function hurryCost(readyAt: number, now: number): number {
  return Number.isFinite(readyAt) && Number.isFinite(now) ? Math.max(0, Math.ceil((readyAt - now) / HURRY.millisecondsPerToken)) : 0;
}
export type HurryTarget = { kind: 'resource'; cell: number } | { kind: 'merchant' } | { kind: 'node'; id: string };
