import type { FreeSeason } from '../premium/season';
// Game state. Plain JSON (no classes, no Maps) so it saves and loads losslessly.
import type { ItemKey } from '../content/families';
import type { ProducerId } from '../content/producers';
import type { ResourceKind } from '../content/resources';

export type Cell =
  | { t: 'e' } // empty
  | { t: 'i'; k: ItemKey } // item
  | { t: 'p'; p: ProducerId } // producer (state in GameState.producers)
  | { t: 'b'; hp: number } // legacy bramble (removed in save v4; never created any more)
  | { t: 'x' } // locked cell, opened with coins or quest rewards
  /** Resource obstacle (rock, logs…): one cell, broken in 3 timed stages, then the cell is free. */
  | { t: 'r'; r: ResourceKind; tier: number; stage: number; readyAt: number };

export interface ProducerState {
  level: number;
  charges: number;
  /** Wall-clock anchor of the charge regeneration. */
  anchor: number;
}

/** A valley source (content/valley.ts). */
export interface NodeState {
  /** Coins paid to build a renewable source. */
  built: boolean;
  /** Completed stages (one-off deposits) or completed jobs (renewable). */
  stage: number;
  /** Running job index, -1 when idle. */
  job: number;
  /** Wall-clock time the running job finishes (0 = idle). */
  readyAt: number;
  /** Outputs of the running job, fixed when it started. */
  out: { item: ItemKey; n: number }[];
}

export interface QuestProgress {
  /** Completed quest ids (never re-awarded). */
  done: string[];
  /** Quests whose start dialogue has been shown. */
  seen: string[];
}

export interface Order {
  id: string;
  giver: string;
  items: { item: ItemKey; n: number }[];
  leaves: number;
  xp: number;
  special: boolean;
}

export interface DailyTask {
  id: string;
  kind: 'merge' | 'produce' | 'puzzle' | 'order' | 'leaves' | 'mergeFamily' | 'discover';
  family?: string;
  target: number;
  /** Stat value when the task was issued; progress = stat - base. */
  base: number;
  reward: { leaves: number; energy: number };
  claimed: boolean;
}

export interface Stats {
  merges: number;
  merge5: number;
  produced: number;
  puzzles: number;
  threeStars: number;
  orders: number;
  structures: number;
  leavesEarned: number;
  sold: number;
  converted: number;
  /** Resource obstacles fully cleared. */
  cleared: number;
  /** Per family merge counters (for daily tasks). */
  familyMerges: Record<string, number>;
}

export interface LedgerEntry {
  /** Unique transaction id; a second grant with the same id is ignored. */
  id: string;
  delta: number;
  reason: string;
  at: number;
}

export interface Settings {
  lang: 'tr' | 'en' | null;
  music: boolean;
  sfx: boolean;
  haptics: boolean;
  reduceMotion: boolean;
  quality: 'high' | 'low';
}

export interface PuzzleRecord {
  stars: number;
  bestMoves: number;
}

export interface GameState {
  version: number;
  /** Random state (see core/rng). */
  rng: number;
  createdAt: number;
  /** Last time `tick` ran (wall clock). */
  lastTick: number;
  /** Highest wall-clock time seen; for diagnostics of clock changes. */
  clockHigh: number;
  tzOffset: number;

  level: number;
  xp: number;
  /** Coins (Altın): the one currency. Stored as `leaves` for save compatibility. */
  leaves: number;
  energy: number;
  energyAnchor: number;
  /** `refillDay` is the local day on which the manual free bundle was claimed. */
  crate: { charges: number; anchor: number; refillDay: number; refills: number; opens: number; baseDay?: number; wallet?: { normal: number; daily: number; bonus: number; energy: number; legacy: number } };

  board: Cell[];
  workerCapacity: number;
  hurryTokens: number;
  starTokens: number;
  themes: { owned: string[]; active: string };
  freeSeason: FreeSeason;
  premiumOperations: string[];
  devTestLedger?: { at: number; amount: number; reason?: string; currency?: 'gold' | 'tokens' | 'energy' }[];
  devTestTransactions?: string[];
  themeCards: Record<import('../premium/cards').CardId, number>;
  premiumSlots: number;
  workshopSkin: { owned: string[]; active: string };
  premiumDecor: { owned: string[]; placements: Record<string, string> };
  cosmeticRewards: string[];
  workshop: { active: number; unlocked: number[]; boards: Cell[][] };
  /** Cells displaced from the reserved shop row, retained if their board is full. */
  workshopOverflow?: { area: number; cell: Cell; readyAt?: number }[];
  farmReadyAt: Record<string, number>;
  harvestStock: Record<string, number>;
  rewardStorage: ItemKey[];
  rewardUnread: boolean;
  farmFactories: Record<'merchant' | 'grocer', { recipe: number; readyAt: number; payout: number; rewardKind?: 'starCoin'; rewardXp?: number }>;
  nodes: Record<string, NodeState>;
  /** Resource deliveries the player can place on the board (content/resources.ts SUPPLY). */
  supply: { charges: number; anchor: number };
  inventory: (ItemKey | null)[];
  producers: Partial<Record<ProducerId, ProducerState>>;
  /** Gifts that could not be placed because the board was full. */
  pending: ItemKey[];
  pendingProducers: ProducerId[];
  cellsOpened: number;

  regions: number[];
  quests: QuestProgress;
  structures: Record<string, number>;
  decor: Record<string, number>;
  /** Owned valley decorations (content/decorations.ts). */
  decorations: string[];
  puzzles: Record<string, PuzzleRecord>;
  /** Free hints used today. */
  hintsDay: number;
  /** Leaf-bought energy today (price doubles each time; resets daily). */
  energyBuys: number;
  hintsUsed: number;

  discovered: ItemKey[];
  /** Discoveries whose one-time collection reward has been paid (subset of `discovered`). */
  collected: ItemKey[];
  /** Short contextual tutorial hints already completed (engine/tutorial.ts). */
  tutorial: { done: string[]; skipped: boolean; replay?: boolean };
  recipesFound: string[];
  memories: string[];
  metChars: string[];
  achievements: string[];

  orders: Order[];
  orderSeq: number;
  daily: { day: number; tasks: DailyTask[] };
  weekly: { week: number; task: DailyTask | null };
  echo: { day: number; solved: boolean };

  stats: Stats;
  ledger: LedgerEntry[];
  /** Processed store transaction ids (idempotency for future real purchases). */
  purchases: string[];
  flags: Record<string, boolean>;
  settings: Settings;
}

/** Things that happened during a command, for animation, sound and UI. */
export type GameEvent =
  | { type: 'resourceDelivery'; item: ItemKey; from: number; to: number[] }
  | { type: 'collectHarvest'; item: ItemKey; from: number[] }
  | { type: 'merge'; item: ItemKey; at: number; from: number[]; created: number[]; count: number; bonus: boolean; giftCrates: number }
  | { type: 'discover'; item: ItemKey }
  | { type: 'produce'; producer: ProducerId; item: ItemKey; from: number; to: number }
  | { type: 'convert'; producer: ProducerId; input: ItemKey; output: ItemKey; to: number[]; secret: boolean }
  | { type: 'bramble'; at: number; cleared: boolean }
  | { type: 'levelUp'; level: number; crates: number }
  | { type: 'quest'; id: string }
  | { type: 'structure'; id: string; stage: number; complete: boolean }
  | { type: 'region'; n: number }
  | { type: 'achievement'; id: string; stage: number; coins: number; stars: number }
  | { type: 'reward'; leaves: number; xp: number; energy: number }
  | { type: 'resource'; at: number; kind: ResourceKind; stage: number; phase: 'placed' | 'start' | 'claimed' | 'cleared' }
  | { type: 'node'; id: string; stage: number; depleted: boolean; claimed: boolean }
  | { type: 'collect'; item: ItemKey; coins: number; crates: number }
  | { type: 'order'; id: string; crates: number }
  | { type: 'sell'; item: ItemKey; leaves: number }
  | { type: 'puzzle'; id: string; stars: number; first: boolean }
  | { type: 'gift'; item: ItemKey | null; producer: ProducerId | null; at: number }
  | { type: 'memory'; id: string }
  | { type: 'denied'; reason: DenyReason };

export type DenyReason =
  | 'noEnergy'
  | 'noCharges'
  | 'boardFull'
  | 'noLeaves'
  | 'noStars'
  | 'inventoryFull'
  | 'missingItems'
  | 'locked'
  | 'notAvailable'
  | 'invalid';

export interface Result {
  state: GameState;
  events: GameEvent[];
}
