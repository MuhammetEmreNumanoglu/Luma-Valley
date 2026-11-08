// Save format, integrity check, migrations and repair. Storage-agnostic and pure.
//
// Durability model (see docs/ARCHITECTURE.md):
// - The whole game state is one JSON document. Commands are atomic in memory (engine/commands),
//   so a saved document is always a consistent snapshot: never half a reward.
// - Two slots (A/B) are written alternately with an increasing sequence number and a checksum.
//   A crash while writing can only damage the slot being written; load picks the newest slot
//   whose checksum is valid, so at worst the last few seconds are lost.
import { BALANCE, BOARD_H, BOARD_W } from '../content/balance';
import { isValidItem } from '../content/families';
import { FARM_RECIPES, legacyHarvest } from '../content/farm';
import { isCollectible } from '../content/progression';
import { NODE, RETIRED_NODES } from '../content/valley';
import { RESOURCES, SUPPLY } from '../content/resources';
import { PRODUCER, type ProducerId } from '../content/producers';
import { hashString } from '../core/rng';
import { initialBoard } from '../engine/board';
import { DEFAULT_SETTINGS, newGame, SAVE_VERSION } from '../engine/state';
import type { Cell, GameState } from '../engine/types';

export interface Envelope {
  /** Format of the envelope itself. */
  f: 1;
  seq: number;
  savedAt: number;
  sum: number;
  data: string;
}

export function encode(state: GameState, seq: number, now: number): string {
  const data = JSON.stringify(state);
  const env: Envelope = { f: 1, seq, savedAt: now, sum: hashString(data), data };
  return JSON.stringify(env);
}

export function decode(raw: string | null | undefined): { seq: number; state: GameState } | null {
  if (!raw) return null;
  try {
    const env = JSON.parse(raw) as Envelope;
    if (env.f !== 1 || typeof env.data !== 'string') return null;
    if (hashString(env.data) !== env.sum) return null; // torn or edited write
    const state = migrate(JSON.parse(env.data));
    return state ? { seq: env.seq, state } : null;
  } catch {
    return null;
  }
}

/** Newest valid slot wins. */
export function pickSlot(a: string | null, b: string | null): { seq: number; state: GameState } | null {
  const da = decode(a);
  const db = decode(b);
  if (da && db) return da.seq >= db.seq ? da : db;
  return da ?? db;
}

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/**
 * Migrations from version n to n+1, applied in order. Add one entry per schema change and never
 * edit an existing one. (v1 is the first Luma Valley schema; older Tam Anı saves are ignored.)
 */
const MIGRATIONS: Record<number, Migration> = {
  // v1 had independently placed generators and two off-board factories. Replace those
  // fixtures with one merchant without discarding progress: active factory payouts remain
  // claimable, while each removed building becomes a modest, one-time unlock-currency credit.
  1: (raw) => {
    const producers = (raw.producers && typeof raw.producers === 'object' ? raw.producers : {}) as Record<string, { level?: unknown }>;
    const retired = Object.entries(producers).filter(([id]) => id !== 'merchant');
    const compensation = retired.reduce((total, [, p]) => total + 75 + Math.max(0, (Math.floor(Number(p?.level) || 1) - 1)) * 25, 0);
    const oldFactories = (raw.farmFactories && typeof raw.farmFactories === 'object' ? raw.farmFactories : {}) as Record<string, { recipe?: unknown; readyAt?: unknown; payout?: unknown }>;
    const running = [oldFactories.dairy, oldFactories.market].find((f) => Number(f?.readyAt) > 0) ?? oldFactories.dairy ?? oldFactories.market;
    const merchant = {
      recipe: 0,
      readyAt: Math.max(0, Number(running?.readyAt) || 0),
      payout: Math.max(0, Math.floor(Number(running?.payout) || 0)),
    };
    const clearBuildings = (value: unknown) => Array.isArray(value) ? value.map((c) => c && typeof c === 'object' && (c as { t?: unknown }).t === 'p' ? { t: 'e' } : c) : value;
    raw.board = clearBuildings(raw.board);
    const workshop = raw.workshop && typeof raw.workshop === 'object' ? raw.workshop as Record<string, unknown> : {};
    const boards = Array.isArray(workshop.boards) ? workshop.boards.map(clearBuildings) : workshop.boards;
    raw.workshop = { ...workshop, boards, gold: Math.max(0, Math.floor(Number(workshop.gold) || 0)) + compensation };
    raw.producers = {};
    raw.pendingProducers = [];
    raw.farmFactories = { merchant };
    return raw;
  },
  // v2 granted crates automatically at midnight. v3 makes the same daily amount an explicit
  // player choice; a player with no crates gets one immediately available claim on migration.
  2: (raw) => {
    const crate = raw.crate && typeof raw.crate === 'object' ? raw.crate as Record<string, unknown> : null;
    if (crate && Math.floor(Number(crate.charges) || 0) === 0) crate.refillDay = -1;
    return raw;
  },
  // v4 (valley redesign): one coin currency, valley sources, collection rewards, sparks,
  // contextual tutorial, no brambles. Nothing the player owned is lost:
  // - workshop gold is added to the coin balance (they were two names for the same thing);
  // - a running or finished rock job pays its stones into the reward storage;
  // - bramble cells become free cells;
  // - items discovered before v4 already paid their discovery bonus, so they count as collected;
  // - sparks start from the Light Paths already solved; old tutorial flags are carried over.
  3: (raw) => {
    const workshop = raw.workshop && typeof raw.workshop === 'object' ? raw.workshop as Record<string, unknown> : null;
    const gold = Math.max(0, Math.floor(Number(workshop?.gold) || 0));
    raw.leaves = Math.max(0, Math.floor(Number(raw.leaves) || 0)) + gold;
    if (workshop) delete workshop.gold;
    const quarry = raw.quarry && typeof raw.quarry === 'object' ? raw.quarry as Record<string, unknown> : null;
    const stones = Number(quarry?.readyAt) > 0 ? Math.max(0, Math.min(50, Math.floor(Number(quarry?.reward) || 0))) : 0;
    const storage = Array.isArray(raw.rewardStorage) ? [...raw.rewardStorage] : [];
    for (let i = 0; i < stones; i++) storage.push('stone:1');
    raw.rewardStorage = storage;
    if (stones) raw.rewardUnread = true;
    delete raw.quarry;
    const unbramble = (b: unknown) => Array.isArray(b) ? b.map((c) => c && typeof c === 'object' && (c as { t?: unknown }).t === 'b' ? { t: 'e' } : c) : b;
    raw.board = unbramble(raw.board);
    if (workshop && Array.isArray(workshop.boards)) workshop.boards = workshop.boards.map(unbramble);
    const discovered = Array.isArray(raw.discovered) ? raw.discovered.filter((k): k is string => typeof k === 'string') : [];
    raw.collected = discovered.filter((k) => isValidItem(k) && isCollectible(k));
    const puzzles = raw.puzzles && typeof raw.puzzles === 'object' ? Object.keys(raw.puzzles) : [];
    raw.sparks = Math.min(60, puzzles.filter((k) => k.startsWith('lp')).length + 3);
    const flags = raw.flags && typeof raw.flags === 'object' ? raw.flags as Record<string, unknown> : {};
    const stats = raw.stats && typeof raw.stats === 'object' ? raw.stats as Record<string, unknown> : {};
    const done: string[] = [];
    if (flags.tutMerge || Number(stats.merges) > 0) done.push('merge', 'crate', 'crateMerge');
    if (Array.isArray((raw.quests as { done?: unknown })?.done) && ((raw.quests as { done: string[] }).done.includes('r1_light'))) done.push('quest');
    if (Number(stats.orders) > 0) done.push('order');
    if (Number(raw.level) >= 2) done.push('level');
    raw.tutorial = { done, skipped: false };
    raw.nodes = {};
    // The merchant's job list gained "fresh eggs" at index 1.
    const ff = raw.farmFactories && typeof raw.farmFactories === 'object' ? raw.farmFactories as Record<string, { recipe?: number }> : null;
    if (ff?.merchant && Number(ff.merchant.recipe) >= 1) ff.merchant.recipe = Number(ff.merchant.recipe) + 1;
    return raw;
  },
  // v5 (workshop resources, one currency, manual merge). Nothing the player earned is lost:
  // - Light Tokens and sparks become coins, once, through the ledger (30 / 10 coins each; a
  //   token bought from the store would also convert — none could be, the store was never live);
  // - clay (removed family) becomes ceramic of the same level everywhere it is stored;
  // - valley rock/tree/clay/crystal sources and the quarry/woodlot/claypit/tide pool/grotto/kiln
  //   buildings left the valley: a running job pays its goods into the reward storage and the
  //   coins spent building one are refunded;
  // - up to four locked cells next to the open area of the home board become a rock or log pile
  //   (only locked cells: never on an item), and the player gets three resource deliveries.
  4: (raw) => {
    const at = Math.max(0, Number(raw.lastTick) || 0);
    const ledger = Array.isArray(raw.ledger) ? (raw.ledger as { id: string }[]) : [];
    let coins = Math.max(0, Math.floor(Number(raw.leaves) || 0));
    const pay = (id: string, delta: number, reason: string) => {
      if (delta <= 0 || ledger.some((e) => e.id === id)) return;
      coins += delta;
      ledger.push({ id, delta, reason, at } as never);
    };
    const tokens = Math.max(0, Math.floor(Number(raw.tokens) || 0));
    const sparks = Math.max(0, Math.floor(Number(raw.sparks) || 0));
    pay('v5:tokens', tokens * BALANCE.coinsPerToken, 'tokensToCoins');
    pay('v5:sparks', sparks * BALANCE.coinsPerSpark, 'sparksToCoins');
    if (Array.isArray(raw.purchases) && raw.purchases.length) {
      const flags = (raw.flags && typeof raw.flags === 'object' ? raw.flags : (raw.flags = {})) as Record<string, boolean>;
      flags.v5PaidTokensConverted = true; // support marker: purchased tokens were converted, not dropped
    }
    delete raw.tokens;
    delete raw.sparks;
    const clay = (k: unknown) => (typeof k === 'string' && k.startsWith('clay:') ? `ceramic:${k.slice(5)}` : k);
    const fixBoard = (b: unknown) => (Array.isArray(b) ? b.map((c) => (c && typeof c === 'object' && (c as { t?: string }).t === 'i' ? { t: 'i', k: clay((c as { k: string }).k) } : c)) : b);
    raw.board = fixBoard(raw.board);
    const workshop = raw.workshop && typeof raw.workshop === 'object' ? (raw.workshop as Record<string, unknown>) : null;
    if (workshop && Array.isArray(workshop.boards)) workshop.boards = workshop.boards.map(fixBoard);
    for (const key of ['inventory', 'rewardStorage', 'pending'] as const) if (Array.isArray(raw[key])) raw[key] = (raw[key] as unknown[]).map(clay);
    if (raw.harvestStock && typeof raw.harvestStock === 'object') {
      const hs: Record<string, number> = {};
      for (const [k, v] of Object.entries(raw.harvestStock as Record<string, number>)) hs[clay(k) as string] = (hs[clay(k) as string] ?? 0) + (Number(v) || 0);
      raw.harvestStock = hs;
    }
    const storage = Array.isArray(raw.rewardStorage) ? (raw.rewardStorage as string[]) : [];
    const nodes = raw.nodes && typeof raw.nodes === 'object' ? (raw.nodes as Record<string, { built?: boolean; readyAt?: number; out?: { item: string; n: number }[] }>) : {};
    for (const [id, st] of Object.entries(nodes)) {
      if (NODE[id]) continue;
      if (Number(st?.readyAt) > 0) for (const o of st.out ?? []) for (let i = 0; i < Math.min(50, Number(o.n) || 0); i++) storage.push(clay(o.item) as string);
      if (st?.built && RETIRED_NODES[id]) pay(`v5:refund:${id}`, RETIRED_NODES[id].build, 'retiredBuilding');
      delete nodes[id];
    }
    raw.nodes = nodes;
    raw.rewardStorage = storage;
    if (storage.length) raw.rewardUnread = true;
    const home = workshop && Array.isArray(workshop.boards) ? (workshop.boards as { t: string }[][])[0] : null;
    const active = workshop ? Number(workshop.active) || 0 : 0;
    const board = (active === 0 ? raw.board : home) as { t: string }[] | null;
    if (Array.isArray(board) && board.length === BOARD_W * BOARD_H) {
      const idx = (x: number, y: number) => y * BOARD_W + x;
      const openNeighbour = (i: number) => {
        const x = i % BOARD_W, y = Math.floor(i / BOARD_W);
        return [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]].some(([a, b]) => a >= 0 && b >= 0 && a < BOARD_W && b < BOARD_H && board[idx(a, b)].t !== 'x');
      };
      const kinds = ['stone', 'wood', 'stone', 'wood'];
      let placed = 0;
      for (let i = 0; i < board.length && placed < kinds.length; i++) {
        if (board[i]?.t === 'x' && openNeighbour(i)) board[i] = { t: 'r', r: kinds[placed++], tier: 1, stage: 0, readyAt: 0 } as never;
      }
      if (active === 0) raw.board = board;
      else if (home) (workshop!.boards as unknown[])[0] = board;
    }
    raw.supply = { charges: SUPPLY.max, anchor: at };
    const stats = raw.stats && typeof raw.stats === 'object' ? (raw.stats as Record<string, unknown>) : null;
    if (stats) stats.cleared = 0;
    const tut = raw.tutorial && typeof raw.tutorial === 'object' ? (raw.tutorial as { done?: string[] }) : null;
    if (tut && Array.isArray(tut.done)) tut.done = tut.done.filter((x) => x !== 'node');
    raw.leaves = coins;
    raw.ledger = ledger;
    return raw;
  },
  // v6: flowers and fruit end at level 4 and are harvested there. Every stored flower or fruit
  // above level 4 (boards, inventory, reward storage, pending, barn) becomes 2 × (L − 3) of its
  // harvest good in the barn (no board space needed); orders and running valley jobs ask for or
  // pay 2 × (L − 4) per former item, matching the new quest requirements. Runs once (version).
  5: (raw) => {
    const stock = (raw.harvestStock && typeof raw.harvestStock === 'object' ? raw.harvestStock : (raw.harvestStock = {})) as Record<string, number>;
    const bank = (key: unknown): boolean => {
      const h = typeof key === 'string' ? legacyHarvest(key) : null;
      if (!h) return false;
      stock[h.item] = (Number(stock[h.item]) || 0) + 2 * (h.level - 3);
      return true;
    };
    const fixBoard = (b: unknown) => (Array.isArray(b) ? b.map((c) => (c && typeof c === 'object' && (c as { t?: string }).t === 'i' && bank((c as { k: string }).k) ? { t: 'e' } : c)) : b);
    raw.board = fixBoard(raw.board);
    const workshop = raw.workshop && typeof raw.workshop === 'object' ? (raw.workshop as Record<string, unknown>) : null;
    if (workshop && Array.isArray(workshop.boards)) workshop.boards = workshop.boards.map(fixBoard);
    if (Array.isArray(raw.inventory)) raw.inventory = (raw.inventory as unknown[]).map((k) => (bank(k) ? null : k));
    for (const key of ['rewardStorage', 'pending'] as const) if (Array.isArray(raw[key])) raw[key] = (raw[key] as unknown[]).filter((k) => !bank(k));
    for (const k of Object.keys(stock)) {
      const h = legacyHarvest(k);
      if (!h) continue;
      stock[h.item] = (Number(stock[h.item]) || 0) + 2 * (h.level - 3) * (Number(stock[k]) || 0);
      delete stock[k];
    }
    const asked = (item: string, n: number) => {
      const h = legacyHarvest(item);
      return h ? { item: h.item, n: n * 2 * (h.level - 4) } : { item, n };
    };
    if (Array.isArray(raw.orders)) for (const o of raw.orders as { items?: { item: string; n: number }[] }[]) if (Array.isArray(o?.items)) o.items = o.items.map((i) => asked(i.item, Number(i.n) || 1));
    const nodes = raw.nodes && typeof raw.nodes === 'object' ? (raw.nodes as Record<string, { out?: { item: string; n: number }[] }>) : {};
    for (const st of Object.values(nodes)) if (Array.isArray(st?.out)) st.out = st.out.map((o) => asked(o.item, Number(o.n) || 0));
    return raw;
  },
};

export function migrate(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  let r = raw as Record<string, unknown>;
  const v = typeof r.version === 'number' ? r.version : 0;
  if (v < 1 || !Array.isArray(r.board)) return null; // not a Luma Valley save
  for (let k = v; k < SAVE_VERSION; k++) {
    const m = MIGRATIONS[k];
    if (!m) return null;
    r = m(r);
    r.version = k + 1;
  }
  if ((r.version as number) > SAVE_VERSION) return null; // from a newer app: refuse, never corrupt
  return repair(r as unknown as GameState);
}

/**
 * Restores invariants on loaded data: missing fields get defaults, impossible values are
 * clamped, unknown items are dropped. Never throws.
 */
export function repair(original: GameState): GameState {
  const input = JSON.parse(JSON.stringify(original)) as GameState;
  const fresh = newGame(input.createdAt || 0, input.rng || 1, input.tzOffset || 0);
  const s: GameState = { ...fresh, ...input };
  const crate = input.crate;
  s.crate = crate && typeof crate === 'object' ? {
    charges: Math.max(0, Math.min(999, Math.floor(Number(crate.charges) || 0))),
    anchor: Number.isFinite(crate.anchor) ? crate.anchor : s.lastTick,
    refillDay: Number.isFinite(crate.refillDay) ? Math.floor(crate.refillDay) : -1,
    refills: Math.max(0, Math.min(2, Math.floor(Number(crate.refills) || 0))),
    opens: Math.max(0, Math.floor(Number(crate.opens) || 0)),
  } : fresh.crate;
  s.nodes = {};
  for (const [id, raw] of Object.entries(input.nodes && typeof input.nodes === 'object' ? input.nodes : {})) {
    const def = NODE[id];
    if (!def || !raw || typeof raw !== 'object') continue;
    const job = Math.floor(Number(raw.job));
    const readyAt = Math.max(0, Number(raw.readyAt) || 0);
    const running = readyAt > 0 && Number.isInteger(job) && job >= 0 && job < def.jobs.length;
    const out = running && Array.isArray(raw.out) ? raw.out.filter((o) => o && isValidItem(o.item) && Number.isFinite(o.n)).map((o) => ({ item: o.item, n: Math.max(0, Math.min(50, Math.floor(o.n))) })) : [];
    s.nodes[id] = {
      built: !!raw.built,
      stage: Math.max(0, Math.min(def.mode === 'stages' ? def.jobs.length : 1e6, Math.floor(Number(raw.stage) || 0))),
      job: running ? job : -1,
      readyAt: running ? readyAt : 0,
      out: running ? out : [],
    };
  }
  s.starTokens = Number.isSafeInteger(input.starTokens) ? Math.max(0, input.starTokens) : 0;
  s.hurryTokens = Number.isSafeInteger(input.hurryTokens) ? Math.max(0, input.hurryTokens) : 0;
  s.workerCapacity = Number.isInteger(input.workerCapacity) ? Math.max(1, Math.min(2, input.workerCapacity)) : 1;
  s.supply = input.supply && typeof input.supply === 'object' ? { charges: Math.max(0, Math.min(SUPPLY.max + 2, Math.floor(Number(input.supply.charges) || 0))), anchor: Number.isFinite(input.supply.anchor) ? input.supply.anchor : s.lastTick } : fresh.supply;
  s.tutorial = { done: Array.isArray(input.tutorial?.done) ? [...new Set(input.tutorial.done.filter((x) => typeof x === 'string'))] : [], skipped: !!input.tutorial?.skipped, ...(input.tutorial?.replay ? { replay: true } : {}) };
  s.settings = { ...DEFAULT_SETTINGS, ...(input.settings ?? {}) };
  s.farmReadyAt = input.farmReadyAt && typeof input.farmReadyAt === 'object' ? Object.fromEntries(Object.entries(input.farmReadyAt).filter(([k, v]) => /^\d+:\d+$/.test(k) && Number.isFinite(v))) : {};
  s.harvestStock = input.harvestStock && typeof input.harvestStock === 'object' ? Object.fromEntries(Object.entries(input.harvestStock).filter(([k, v]) => isValidItem(k) && Number.isFinite(v) && v > 0).map(([k, v]) => [k, Math.floor(v)])) : {};
  s.rewardStorage = Array.isArray(input.rewardStorage) ? input.rewardStorage.filter(isValidItem) : [];
  s.rewardUnread = !!input.rewardUnread && s.rewardStorage.length > 0;
  s.farmFactories = { ...fresh.farmFactories };
  const merchantFactory = input.farmFactories?.merchant;
  if (merchantFactory) {
    const recipe = Math.max(0, Math.min(FARM_RECIPES.merchant.length - 1, Math.floor(Number(merchantFactory.recipe) || 0)));
    const readyAt = Math.max(0, Number(merchantFactory.readyAt) || 0);
    const payout = Math.max(0, Math.min(100000, Math.floor(Number(merchantFactory.payout) || 0)));
    s.farmFactories.merchant = { recipe, readyAt, payout: readyAt ? (payout || FARM_RECIPES.merchant[recipe].gold) : 0, ...(readyAt && merchantFactory.rewardKind === 'starCoin' ? { rewardKind: 'starCoin' as const } : {}) };
  }
  const grocerFactory = input.farmFactories?.grocer;
  if (grocerFactory) {
    const readyAt = Math.max(0, Number(grocerFactory.readyAt) || 0);
    const payout = Math.max(0, Math.min(100000, Math.floor(Number(grocerFactory.payout) || 0)));
    s.farmFactories.grocer = { recipe: 0, readyAt, payout: readyAt ? (payout || FARM_RECIPES.grocer[0].gold) : 0 };
  }
  s.stats = { ...fresh.stats, ...(input.stats ?? {}), familyMerges: { ...(input.stats?.familyMerges ?? {}) } };
  s.quests = { done: [...new Set(input.quests?.done ?? [])], seen: [...new Set(input.quests?.seen ?? [])] };
  for (const k of ['leaves', 'energy', 'xp'] as const) {
    const n = Number(s[k]);
    s[k] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
  s.energy = Math.min(s.energy, BALANCE.energy.overflowCap);
  s.energyBuys = Math.max(0, Math.floor(Number(s.energyBuys) || 0));
  s.level = Math.max(1, Math.floor(Number(s.level) || 1));
  // Board
  const cells = BOARD_W * BOARD_H;
  if (!Array.isArray(s.board) || s.board.length !== cells) s.board = initialBoard();
  const cleanCell = (c: Cell): Cell => {
    if (!c || typeof c !== 'object') return { t: 'e' };
    if (c.t === 'i') return isValidItem(c.k) ? c : { t: 'e' };
    if (c.t === 'p') return PRODUCER[c.p] ? c : { t: 'e' };
    if (c.t === 'b') return { t: 'e' }; // brambles were removed in v4
    if (c.t === 'r') {
      if (!RESOURCES[c.r]) return { t: 'e' };
      const stage = Math.max(0, Math.min(2, Math.floor(Number(c.stage) || 0)));
      return { t: 'r', r: c.r, tier: Math.max(1, Math.min(9, Math.floor(Number(c.tier) || 1))), stage, readyAt: Math.max(0, Number(c.readyAt) || 0) };
    }
    if (c.t === 'x' || c.t === 'e') return c;
    return { t: 'e' };
  };
  s.board = s.board.map(cleanCell);
  const workshop = input.workshop;
  const unlocked = Array.isArray(workshop?.unlocked) ? [...new Set(workshop.unlocked.filter((n) => Number.isInteger(n) && n >= 0 && n < 9))] : [0];
  if (!unlocked.includes(0)) unlocked.unshift(0);
  const active = unlocked.includes(workshop?.active) ? workshop.active : 0;
  const boards = Array.from({ length: 9 }, (_, i) => {
    const b = workshop?.boards?.[i];
    return Array.isArray(b) && b.length === cells ? b.map(cleanCell) : fresh.workshop.boards[i];
  });
  boards[active] = s.board;
  s.workshop = { active, unlocked, boards };
  // Shop fixtures now live below the workshop. Jobs and reserved payouts remain in farmFactories.
  s.workshop.boards = s.workshop.boards.map(board => board.map(c => c.t === 'p' ? { t: 'e' as const } : c));
  s.board = s.workshop.boards[active];
  s.producers = {};
  s.pendingProducers = [];
  s.inventory = (Array.isArray(s.inventory) ? s.inventory : []).map((k) => (k && isValidItem(k) ? k : null));
  while (s.inventory.length < BALANCE.inventory.startSlots) s.inventory.push(null);
  if (s.inventory.length > BALANCE.inventory.maxSlots) s.inventory.length = BALANCE.inventory.maxSlots;
  s.pending = (s.pending ?? []).filter(isValidItem);
  s.regions = [...new Set([1, ...(s.regions ?? [])])].sort((a, b) => a - b);
  s.discovered = [...new Set(s.discovered ?? [])].filter(isValidItem);
  s.collected = [...new Set(Array.isArray(input.collected) ? input.collected : [])].filter((k) => isValidItem(k) && s.discovered.includes(k) && isCollectible(k));
  s.ledger = Array.isArray(s.ledger) ? s.ledger : [];
  s.purchases = Array.isArray(s.purchases) ? s.purchases : [];
  s.decorations = Array.isArray(s.decorations) ? [...new Set(s.decorations.filter((d) => typeof d === 'string'))] : [];
  s.orders = Array.isArray(s.orders) ? s.orders.filter((o) => o && Array.isArray(o.items) && o.items.every((i) => isValidItem(i.item))) : [];
  for (const k of ['tokens', 'sparks', 'quarry'] as const) delete (s as unknown as Record<string, unknown>)[k];
  s.version = SAVE_VERSION;
  return s;
}
