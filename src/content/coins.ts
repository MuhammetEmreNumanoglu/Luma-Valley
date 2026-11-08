/** Mergeable workshop currency: each level is worth three of the preceding one. */
export const COIN_LEVELS = 8;
export const coinValue = (level: number) => 3 ** Math.max(0, Math.min(COIN_LEVELS - 1, level - 1));

/** Split an old or new payout into exact denominations without rounding away player value. */
export function coinDenominations(value: number): string[] {
  let remaining = Math.max(0, Math.floor(value));
  const coins: string[] = [];
  for (let level = COIN_LEVELS; level >= 1; level--) {
    const amount = coinValue(level);
    while (remaining >= amount) { coins.push(`coin:${level}`); remaining -= amount; }
  }
  return coins;
}
