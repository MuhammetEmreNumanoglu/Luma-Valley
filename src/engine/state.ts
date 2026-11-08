// New-game state and small state helpers (economy grants that every command shares).
import { BALANCE, xpForNext } from '../content/balance';
import type { ItemKey } from '../content/families';
import { levelReward } from '../content/progression';
import { SUPPLY } from '../content/resources';
import { CELLS, initialBoard } from './board';
import type { GameEvent, GameState, Settings } from './types';

export const SAVE_VERSION = 6;
const LEDGER_KEEP = 200;

export const DEFAULT_SETTINGS: Settings = { lang: null, music: true, sfx: true, haptics: true, reduceMotion: false, quality: 'high' };

export function newGame(now: number, seed: number, tzOffset = 0): GameState {
  return {
    version: SAVE_VERSION,
    rng: seed | 0,
    createdAt: now,
    lastTick: now,
    clockHigh: now,
    tzOffset,
    level: 1,
    xp: 0,
    leaves: BALANCE.leaves.start,
    energy: BALANCE.energy.start,
    energyAnchor: now,
    crate: { charges: BALANCE.crate.start, anchor: now, refillDay: -1, refills: 0, opens: 0 },
    board: initialBoard(),
    workerCapacity: 1,
    hurryTokens: 0,
    starTokens: 0,
    workshop: { active: 0, unlocked: [0], boards: Array.from({ length: 9 }, (_, i) => i === 0 ? initialBoard() : Array.from({ length: CELLS }, () => ({ t: 'e' as const }))) },
    farmReadyAt: {},
    harvestStock: {},
    rewardStorage: [],
    rewardUnread: false,
    farmFactories: { merchant: { recipe: 0, readyAt: 0, payout: 0 }, grocer: { recipe: 0, readyAt: 0, payout: 0 } },
    nodes: {},
    supply: { charges: SUPPLY.start, anchor: now },
    inventory: new Array(BALANCE.inventory.startSlots).fill(null),
    producers: {},
    pending: [],
    pendingProducers: [],
    cellsOpened: 0,
    regions: [1],
    quests: { done: [], seen: [] },
    structures: {},
    decor: {},
    decorations: [],
    puzzles: {},
    hintsDay: 0,
    energyBuys: 0,
    hintsUsed: 0,
    discovered: ['flower:1'],
    collected: [],
    tutorial: { done: [], skipped: false },
    recipesFound: [],
    memories: [],
    metChars: ['lumi'],
    achievements: [],
    orders: [],
    orderSeq: 0,
    daily: { day: -1, tasks: [] },
    weekly: { week: -1, task: null },
    echo: { day: -1, solved: false },
    stats: {
      merges: 0,
      merge5: 0,
      produced: 0,
      puzzles: 0,
      threeStars: 0,
      orders: 0,
      structures: 0,
      leavesEarned: 0,
      sold: 0,
      converted: 0,
      cleared: 0,
      familyMerges: {},
    },
    ledger: [],
    purchases: [],
    flags: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function clone(s: GameState): GameState {
  return JSON.parse(JSON.stringify(s)) as GameState;
}

export function addLeaves(s: GameState, n: number): void {
  if (n <= 0) return;
  s.leaves += Math.floor(n);
  s.stats.leavesEarned += Math.floor(n);
}

/**
 * One-time coin grants and spends with an id (achievements, collection, purchases, conversions)
 * go through the ledger: the same id never pays twice. Returns false if it would go negative.
 */
export function changeCoins(s: GameState, delta: number, reason: string, id: string, now: number): boolean {
  if (s.leaves + delta < 0) return false;
  if (s.ledger.some((e) => e.id === id)) return false; // idempotent
  s.leaves += delta;
  if (delta > 0) s.stats.leavesEarned += delta;
  s.ledger.push({ id, delta, reason, at: now });
  if (s.ledger.length > LEDGER_KEEP) s.ledger.splice(0, s.ledger.length - LEDGER_KEEP);
  return true;
}

export function addEnergy(s: GameState, n: number): void {
  s.energy = Math.min(BALANCE.energy.overflowCap, s.energy + Math.max(0, Math.floor(n)));
}

export function addXp(s: GameState, n: number, now: number, events: GameEvent[]): void {
  s.xp += Math.max(0, Math.floor(n));
  for (let guard = 0; guard < 50; guard++) {
    const need = xpForNext(s.level);
    if (s.xp < need) return;
    s.xp -= need;
    s.level += 1;
    const reward = levelReward(s.level);
    addLeaves(s, reward.coins);
    addEnergy(s, reward.energy);
    s.supply.charges = Math.min(SUPPLY.max + 2, s.supply.charges + reward.supplies);
    // Extra crate openings are a level-up reward, not a refill and never cost energy.
    const before = s.crate.charges;
    s.crate.charges = Math.min(999, before + reward.crates);
    events.push({ type: 'levelUp', level: s.level, crates: s.crate.charges - before });
  }
}

/**
 * Records the first sighting of an item. The one-time collection reward is not paid here: the
 * player collects it in the Journal (`claimCollection`), so "discovered" and "rewarded" are
 * separate, persistent facts.
 */
export function discover(s: GameState, key: ItemKey, _now: number, events: GameEvent[]): void {
  if (s.discovered.includes(key)) return;
  s.discovered.push(key);
  events.push({ type: 'discover', item: key });
}

