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
    levelUpRefill: (level: number) => Math.min(50, 16 + Math.max(2, level)),
    /** Energy may exceed max by this much from rewards (never from regeneration). */
    overflowCap: 999,
    /** Energy for coins: +amount energy; the price grows ×1.5 with each purchase the same day
     * (resets daily), so coins can top up energy but never become an endless energy pump. */
    leafBreak: { amount: 25, base: 80, growth: 1.5 },
  },
  leaves: { start: 40 },
  /** orderBonus: crates per delivered order; discoveryBonus: crates per collected discovery.
   * comboGift is 0: combos already pay an extra item, and 2 crates per combo let a 20-minute
   * session grow 50 crates to 110 (scripts/crate-pace.ts). */
  crate: { start: 50, autoMax: 40, refillMs: 270_000, dailyFree: 10, comboGift: 0, levelUpBonus: (level: number) => Math.min(30, 6 + Math.max(2, level)), orderBonus: 1, discoveryBonus: 1, energyPack: { cost: 25, charges: 10 } },
  inventory: { startSlots: 4, maxSlots: 12, slotCostLeaves: [100, 200, 350, 550, 800, 1100, 1500, 2000] },
  /**
   * Gold paid when selling an item of a merge level (SELL_TABLE, below). The same number feeds the
   * Sell button, the sell command, order rewards and the simulations.
   */
  sell: { table: [1, 3, 9, 24, 55, 135, 320, 900, 1850, 3500] as readonly number[], beyondGrowth: 1.35 },
  /** XP for a merge producing level L: L * mergeXp. */
  mergeXp: 1,
  /** Chance that a successful merge creates one additional upgraded item. */
  mergeBonusChance: 0.30,
  /** Combo chance for harvestable chains (animals, plots, flowers, fruit: content/farm.ts). */
  harvestBonusChance: 0.35,
  /** Conditional chance after a combo; effective per merge is 2.1% or 2.45%. */
  comboEnergyChance: 0.07,
  /** Coins per former Light Token (save v5 conversion, quest/achievement reward rescale). */
  coinsPerToken: 30,
  /** Coins per former spark (save v5 conversion). */
  coinsPerSpark: 10,
  /** XP needed to go from level n to n+1: round(a * n^p + b). */
  xpCurve: { a: 18, p: 1.35, b: 12 },
  levelUpLeaves: (level: number) => 20 + level * 10,
  /** Board cells opened by spending leaves (cost grows per opened cell). */
  openCell: { base: 40, step: 25 },
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
    /** Gold for an order = sum over items of sellValue * multiplier (+4). Orders ask levels 1–5,
     * so with the stepped sell table an order pays 6–115 gold per line. */
    multiplier: 2.0,
    xpPerLevel: 2,
    /** Daily special order bonus factor. */
    specialBonus: 1.5,
    /** Daily special order pays tokens once; normal orders cannot farm this bonus. */
    specialStarBonus: 30,
  },
  daily: { count: 3, completionTokens: 30 },
  /** Max gap (ms) honoured for offline regeneration of producer charges. */
  maxOfflineMs: 3 * 24 * 3600 * 1000,
};

/**
 * Single source for an item's gold value by merge level: 1, 3, 9 for the first steps (three
 * level-1 items make a level-2 one), then a gentler stepped curve (24, 55, 135, 320, 900, 1850,
 * 3500) because a combo merge often pays an extra item and a ×3 rule would reach 19,683 at level
 * 10. Above the table every step adds ×1.35 only, so future longer chains never explode.
 */
export function sellValue(level: number): number {
  const t = BALANCE.sell.table;
  const l = Math.max(1, Math.floor(level));
  if (l <= t.length) return t[l - 1];
  return Math.round(t[t.length - 1] * Math.pow(BALANCE.sell.beyondGrowth, l - t.length));
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

/** Each level adds 1% to energy regeneration speed relative to level one. */
export function energyRegenMs(level: number): number {
  return Math.max(1, Math.round(BALANCE.energy.regenMs / (1 + Math.max(0, Math.floor(level) - 1) * 0.01)));
}
