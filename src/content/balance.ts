// Every tunable economy number lives here (and in the producer / quest tables), so balancing
// never means hunting for constants in engine code. scripts/simulate.ts reads the same values.

export const BOARD_W = 7;
export const BOARD_H = 9;

export const BALANCE = {
  energy: {
    start: 100,
    max: 100,
    /** ms per +1 energy. */
    regenMs: 60_000,
    /** Energy refilled on level up (capped at max + overflow allowance). */
    levelUpRefill: 40,
    /** Energy may exceed max by this much from rewards (never from regeneration). */
    overflowCap: 200,
    /** Energy for coins: +amount energy; the price grows ×1.5 with each purchase the same day
     * (resets daily), so coins can top up energy but never become an endless energy pump. */
    leafBreak: { amount: 25, base: 60, growth: 1.5 },
  },
  leaves: { start: 40 },
  crate: { start: 40, dailyFree: 10, levelUpBonus: 20, energyPack: { cost: 50, charges: 25 } },
  inventory: { startSlots: 4, maxSlots: 12, slotCostLeaves: [60, 120, 200, 320, 480, 650, 850, 1100] },
  /** Leaves paid when selling an item: round(base * growth^(level-1)). */
  sell: { base: 1, growth: 1.75 },
  /** XP for a merge producing level L: L * mergeXp. */
  mergeXp: 1,
  /** Chance that a successful merge creates one additional upgraded item. */
  mergeBonusChance: 0.25,
  /** Coins per former Light Token (save v5 conversion, quest/achievement reward rescale). */
  coinsPerToken: 30,
  /** Coins per former spark (save v5 conversion). */
  coinsPerSpark: 10,
  /** XP needed to go from level n to n+1: round(a * n^p + b). */
  xpCurve: { a: 18, p: 1.35, b: 12 },
  levelUpLeaves: (level: number) => 20 + level * 10,
  /** Board cells opened by spending leaves (cost grows per opened cell). */
  openCell: { base: 25, step: 15 },
  puzzle: {
    leaves: (tier: number) => 15 + tier * 10,
    xp: (tier: number) => 6 + tier * 4,
    /** First 3-star solve of a puzzle: bonus coins. */
    threeStarCoins: 20,
    /** Coins for the daily Echo puzzle. */
    echoCoins: 15,
    /** Coins per hint once the free daily hints are used. */
    hintCoins: 15,
    freeHintsPerDay: 3,
  },
  orders: {
    slots: 3,
    /** Leaves for an order = sum over items of sellValue * orderMultiplier. */
    multiplier: 2.6,
    xpPerLevel: 2,
    /** Daily special order bonus factor. */
    specialBonus: 1.5,
  },
  daily: { count: 3 },
  /** Max gap (ms) honoured for offline regeneration of producer charges. */
  maxOfflineMs: 3 * 24 * 3600 * 1000,
};

export function sellValue(level: number): number {
  return Math.max(1, Math.round(BALANCE.sell.base * Math.pow(BALANCE.sell.growth, level - 1)));
}

export function xpForNext(level: number): number {
  const { a, p, b } = BALANCE.xpCurve;
  return Math.round(a * Math.pow(level, p) + b);
}

export function openCellCost(opened: number): number {
  return BALANCE.openCell.base + BALANCE.openCell.step * opened;
}

/** Leaves for the n-th (0-based) tea break of the day. */
export function leafBreakCost(n: number): number {
  return Math.round(BALANCE.energy.leafBreak.base * Math.pow(BALANCE.energy.leafBreak.growth, n));
}
