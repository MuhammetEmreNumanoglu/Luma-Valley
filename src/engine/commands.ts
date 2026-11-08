// The command layer: every player action is `apply(state, command, now)` → new state + events.
// It works on a deep copy, so a rejected command returns the caller's state untouched and a
// completed one is applied in full: there are no half-applied rewards.
import { HURRY, hurryCost, type HurryTarget } from '../content/hurry';
import { ACHIEVEMENTS } from '../content/achievements';
import { BALANCE, leafBreakCost, openCellCost, sellValue } from '../content/balance';
import { DECORATION } from '../content/decorations';
import { parseItem, type ItemKey } from '../content/families';
import { FARM_RECIPES, FARM_YIELD, HARVEST_ITEMS, TRADER_RECIPE, type FarmFactoryId } from '../content/farm';
import { coinValue } from '../content/coins';
import { collectionReward, cratePool, isCollectible } from '../content/progression';
import { isAdjacentToUnlocked, WORKSHOP_PRICES } from '../content/workshop';
import { findRecipe, PRODUCER, producerLevel, type ProducerId } from '../content/producers';
import { QUEST, STRUCTURE_STAGES, type Reward } from '../content/quests';
import { REGION_COUNT } from '../content/regions';
import { nextRandom, weighted } from '../core/rng';
import { localDay, regen } from '../core/time';
import { getPuzzle } from '../puzzles/levels';
import { isSolved, starsFor, type Puzzle } from '../puzzles/lightpaths';
import { boardCenter, countItem, emptyCellsNear, isOpenable, lockedOpenOrder, mergeDrop, mergeTrio, removeItems, type MergeHooks } from './board';
import { breakResource, cancelResource, claimResource, deliverNear, placeResource, tickResources } from './resources';
import type { ResourceKind } from '../content/resources';
import { fillOrders, refreshDaily, taskProgress } from './orders';
import { canComplete, isPuzzleUnlocked } from './quests';
import { buildNode, claimNode, clampNodeTimers, startNode } from './nodes';
import { addEnergy, addLeaves, addXp, changeCoins, clone, discover } from './state';
import { TUTORIAL_STEPS, type TutorialStep } from './tutorial';
import type { DenyReason, GameEvent, GameState, Result, Settings } from './types';

export type Command =
  | { type: 'tick' }
  | { type: 'exchangeHurryToken' }
  | { type: 'hurry'; target: HurryTarget; maxCost: number; expectedReadyAt: number; area: number; maxGold?: number }
  | { type: 'move'; from: number; to: number }
  | { type: 'tap'; cell: number }
  | { type: 'openCrate' }
  | { type: 'claimDailyCrates' }
  | { type: 'buyCrates' }
  | { type: 'refillCrate' }
  | { type: 'switchWorkshop'; area: number }
  | { type: 'unlockWorkshop'; area: number }
  | { type: 'startFarmRecipe'; factory: FarmFactoryId }
  | { type: 'claimFarmReward'; factory: FarmFactoryId }
  | { type: 'skipFarmRecipe'; factory: FarmFactoryId }
  | { type: 'buildNode'; id: string }
  | { type: 'startNode'; id: string; job?: number }
  | { type: 'claimNode'; id: string }
  | { type: 'claimCollection'; item: ItemKey }
  | { type: 'tutorial'; step?: TutorialStep; skip?: boolean; reset?: boolean }
  | { type: 'retrieveReward'; slot: number }
  | { type: 'retrieveAllRewards' }
  | { type: 'viewRewards' }
  | { type: 'collectCoin'; cell: number }
  | { type: 'sell'; cell: number }
  | { type: 'store'; cell: number }
  | { type: 'retrieve'; slot: number }
  | { type: 'openCell'; cell: number }
  | { type: 'buySlot' }
  | { type: 'upgrade'; producer: ProducerId }
  | { type: 'completeQuest'; id: string }
  | { type: 'deliverOrder'; id: string }
  | { type: 'replaceOrder'; id: string }
  | { type: 'solvePuzzle'; id: string; rotations: number[]; moves: number }
  | { type: 'useHint' }
  | { type: 'buyEnergy' }
  | { type: 'buyDecoration'; id: string }
  | { type: 'claimTask'; id: string }
  | { type: 'setDecor'; structure: string; variant: number }
  | { type: 'meet'; char: string }
  | { type: 'seeQuest'; id: string }
  | { type: 'flag'; key: string }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'breakResource'; cell: number }
  | { type: 'claimResource'; cell: number }
  | { type: 'cancelResource'; cell: number }
  | { type: 'placeResource'; kind: ResourceKind }
  | { type: 'grantPurchase'; transactionId: string; coins: number }
  | { type: 'grantWorkerPurchase'; transactionId: string };

function markTutorial(s: GameState, step: TutorialStep): void {
  if (!s.tutorial.done.includes(step)) s.tutorial.done.push(step);
  if (s.tutorial.replay && TUTORIAL_STEPS.every((x) => s.tutorial.done.includes(x))) delete s.tutorial.replay;
}

function deny(state: GameState, reason: DenyReason): Result {
  return { state, events: [{ type: 'denied', reason }] };
}

const hooks = (now: number): MergeHooks => ({
  onCreate: (s, key, ev) => discover(s, key, now, ev),
  onMerge: (s, level, family, ev) => {
    s.stats.merges += 1;
    markTutorial(s, 'merge');
    if (s.tutorial.done.includes('crate')) markTutorial(s, 'crateMerge');
    s.stats.familyMerges[family] = (s.stats.familyMerges[family] ?? 0) + 1;
    addXp(s, level * BALANCE.mergeXp, now, ev);
  },
});

/** Legacy producer gifts: the matching valley building unlocks by quest id (content/valley.ts). */
function giveProducer(_s: GameState, _id: ProducerId, _now: number, _events: GameEvent[]): void {}

function openCells(s: GameState, n: number): void {
  const order = lockedOpenOrder(s.board);
  for (let k = 0; k < n && k < order.length; k++) s.board[order[k]] = { t: 'e' };
}

function applyRewards(s: GameState, rewards: Reward[], txPrefix: string, now: number, events: GameEvent[]): void {
  let leaves = 0;
  let xp = 0;
  let energy = 0;
  for (const r of rewards) {
    switch (r.kind) {
      case 'leaves':
        leaves += r.n;
        break;
      case 'xp':
        xp += r.n;
        break;
      case 'energy':
        energy += r.n;
        break;
      case 'cells':
        openCells(s, r.n);
        break;
      case 'producer':
        giveProducer(s, r.id, now, events);
        break;
      case 'memory':
        if (!s.memories.includes(r.id)) {
          s.memories.push(r.id);
          events.push({ type: 'memory', id: r.id });
        }
        break;
      case 'region':
        if (!s.regions.includes(r.n) && r.n <= REGION_COUNT) {
          s.regions.push(r.n);
          s.regions.sort((a, b) => a - b);
          events.push({ type: 'region', n: r.n });
        }
        break;
    }
  }
  addLeaves(s, leaves);
  addEnergy(s, energy);
  addXp(s, xp, now, events);
  events.push({ type: 'reward', leaves, xp, energy });
  void txPrefix;
}

/** Regeneration, gift placement and daily refresh. Safe to call any number of times. */
function tick(s: GameState, now: number): void {
  // Fast Refresh can retain an in-memory state from before crates were introduced.
  if (!s.crate) s.crate = { charges: BALANCE.crate.start, anchor: s.lastTick || now, refillDay: -1, refills: 0, opens: 0 };
  if (!Number.isFinite(s.crate.opens)) s.crate.opens = 0;
  if (!s.workshop) s.workshop = { active: 0, unlocked: [0], boards: Array.from({ length: 9 }, (_, i) => i === 0 ? s.board : s.board.map(() => ({ t: 'e' as const }))) };
  if (!s.farmReadyAt) s.farmReadyAt = {};
  if (!s.harvestStock) s.harvestStock = {};
  if (!s.rewardStorage) s.rewardStorage = [];
  if (!s.farmFactories) s.farmFactories = { merchant: { recipe: 0, readyAt: 0, payout: 0 } };
  if (!s.nodes) s.nodes = {};
  if (!s.supply) s.supply = { charges: 1, anchor: now };
  if (!s.collected) s.collected = [];
  if (!s.tutorial) s.tutorial = { done: [], skipped: false };
  for (const key of Object.keys(s.farmReadyAt)) {
    const [area, cell] = key.split(':').map(Number);
    const board = area === s.workshop.active ? s.board : s.workshop.boards[area];
    const occupant = board?.[cell];
    if (!occupant || occupant.t !== 'i' || !FARM_YIELD[occupant.k]) delete s.farmReadyAt[key];
  }
  if (now < s.lastTick) {
    // Device clock went backwards: re-anchor everything to now. Nothing is lost or gained.
    s.energyAnchor = Math.min(s.energyAnchor, now);
    for (const p of Object.values(s.producers)) if (p) p.anchor = Math.min(p.anchor, now);
  }
  clampNodeTimers(s, now);
  for (const [key, at] of Object.entries(s.farmReadyAt)) {
    const [area, cell] = key.split(':').map(Number);
    const board = area === s.workshop.active ? s.board : s.workshop.boards[area];
    const occupant = board?.[cell];
    const y = occupant?.t === 'i' ? FARM_YIELD[occupant.k] : undefined;
    if (y && at > now + y.seconds * 1000) s.farmReadyAt[key] = now + y.seconds * 1000;
  }
  const capNow = Math.min(now, s.lastTick + BALANCE.maxOfflineMs);
  const anchorNow = now < s.lastTick ? now : capNow;
  if (s.energy < BALANCE.energy.max) {
    const r = regen(s.energy, BALANCE.energy.max, s.energyAnchor, anchorNow, BALANCE.energy.regenMs);
    s.energy = r.amount;
    s.energyAnchor = r.anchor;
  } else s.energyAnchor = now;
  const day = localDay(now, s.tzOffset);
  for (const [id, p] of Object.entries(s.producers)) {
    if (!p) continue;
    const lv = producerLevel(id as ProducerId, p.level);
    const r = regen(p.charges, lv.charges, p.anchor, anchorNow, lv.rechargeMs);
    p.charges = r.amount;
    p.anchor = r.anchor;
  }
  tickResources(s, now, anchorNow);
  s.lastTick = now;
  s.clockHigh = Math.max(s.clockHigh, now);
  // Place queued gifts as space frees up.
  while (s.pendingProducers.length) giveProducer(s, s.pendingProducers.shift()!, now, []);
  while (s.pending.length) {
    const free = emptyCellsNear(s.board, boardCenter());
    if (!free.length) break;
    s.board[free[0]] = { t: 'i', k: s.pending.shift()! };
  }
  refreshDaily(s, now);
  fillOrders(s, s.daily.day);
}

function checkAchievements(s: GameState, now: number, events: GameEvent[]): void {
  for (const a of ACHIEVEMENTS) {
    if (s.achievements.includes(a.id)) continue;
    if (a.value(s) >= a.target) {
      s.achievements.push(a.id);
      changeCoins(s, a.coins, 'achievement', `ach:${a.id}`, now);
      events.push({ type: 'achievement', id: a.id });
    }
  }
}

function produce(s: GameState, cell: number, now: number, events: GameEvent[]): DenyReason | null {
  const c = s.board[cell];
  if (c?.t === 'i') {
    if (HARVEST_ITEMS.includes(c.k)) {
      const from: number[] = [];
      s.board.forEach((item, i) => { if (item.t === 'i' && item.k === c.k) { s.board[i] = { t: 'e' }; from.push(i); } });
      s.harvestStock[c.k] = (s.harvestStock[c.k] ?? 0) + from.length;
      events.push({ type: 'collectHarvest', item: c.k, from });
      return null;
    }
    const y = FARM_YIELD[c.k];
    if (!y) return 'invalid';
    const key = `${s.workshop.active}:${cell}`;
    if ((s.farmReadyAt[key] ?? 0) > now) return 'notAvailable';
    // Consuming the level-four producer and crediting the barn are one atomic command.
    s.harvestStock[y.item] = (s.harvestStock[y.item] ?? 0) + y.n;
    s.board[cell] = { t: 'e' };
    delete s.farmReadyAt[key];
    s.stats.produced += y.n;
    discover(s, y.item, now, events);
    events.push({ type: 'collectHarvest', item: y.item, from: Array.from({ length: y.n }, () => cell) });
    return null;
  }
  if (!c || c.t !== 'p') return 'invalid';
  const def = PRODUCER[c.p];
  const st = s.producers[c.p];
  if (!st || def.kind !== 'generator') return 'invalid';
  if (st.charges <= 0) return 'noCharges';
  if (s.energy < def.energyCost) return 'noEnergy';
  const free = emptyCellsNear(s.board, cell);
  if (free.length === 0) return 'boardFull';
  const lv = producerLevel(c.p, st.level);
  const [r, next] = nextRandom(s.rng);
  s.rng = next;
  const item = weighted(lv.outputs ?? [], r);
  s.energy -= def.energyCost;
  if (st.charges === lv.charges) st.anchor = now; // recharge clock starts on first use
  st.charges -= 1;
  s.board[free[0]] = { t: 'i', k: item };
  s.stats.produced += 1;
  events.push({ type: 'produce', producer: c.p, item, from: cell, to: free[0] });
  discover(s, item, now, events);
  return null;
}

function convert(s: GameState, from: number, to: number, now: number, events: GameEvent[]): DenyReason | null {
  const src = s.board[from];
  const dst = s.board[to];
  if (src.t !== 'i' || dst.t !== 'p') return 'invalid';
  const def = PRODUCER[dst.p];
  const st = s.producers[dst.p];
  const recipe = findRecipe(dst.p, src.k);
  if (!st || def.kind !== 'converter' || !recipe) return 'invalid';
  if (st.charges <= 0) return 'noCharges';
  if (s.energy < def.energyCost) return 'noEnergy';
  s.board[from] = { t: 'e' };
  const free = emptyCellsNear(s.board, from);
  if (free.length < recipe.count) {
    s.board[from] = src; // not enough room: nothing happens, the item stays
    return 'boardFull';
  }
  const lv = producerLevel(dst.p, st.level);
  s.energy -= def.energyCost;
  if (st.charges === lv.charges) st.anchor = now;
  st.charges -= 1;
  const placed = free.slice(0, recipe.count);
  for (const i of placed) s.board[i] = { t: 'i', k: recipe.output };
  s.stats.converted += 1;
  const id = `${dst.p}:${recipe.input}`;
  const secret = !!recipe.secret && !s.recipesFound.includes(id);
  if (recipe.secret && !s.recipesFound.includes(id)) s.recipesFound.push(id);
  events.push({ type: 'convert', producer: dst.p, input: recipe.input, output: recipe.output, to: placed, secret });
  discover(s, recipe.output, now, events);
  return null;
}

function move(s: GameState, from: number, to: number, now: number, events: GameEvent[]): DenyReason | null {
  const n = s.board.length;
  if (!(from >= 0 && from < n && to >= 0 && to < n) || from === to) return 'invalid';
  const a = s.board[from];
  const b = s.board[to];
  if (a.t !== 'i' && a.t !== 'p') return 'invalid';
  if (b.t === 'x' || b.t === 'b' || b.t === 'r') return 'locked';
  // Dropping an item on an identical one is a deliberate merge (needs a third connected to the
  // target). Without a third, nothing happens and the item returns home.
  if (a.t === 'i' && b.t === 'i' && a.k === b.k) {
    if (!mergeTrio(s.board, from, to)) return 'invalid';
    for (const c of mergeTrio(s.board, from, to)!) delete s.farmReadyAt[`${s.workshop.active}:${c}`];
    mergeDrop(s, from, to, events, hooks(now));
    return null;
  }
  if (a.t === 'i' && b.t === 'p' && PRODUCER[b.p].kind === 'converter' && findRecipe(b.p, a.k)) return convert(s, from, to, now, events);
  // Empty target: move. Occupied target: swap. Either way nothing is ever lost.
  const aKey = `${s.workshop.active}:${from}`, bKey = `${s.workshop.active}:${to}`;
  const aReady = s.farmReadyAt[aKey], bReady = s.farmReadyAt[bKey];
  delete s.farmReadyAt[aKey]; delete s.farmReadyAt[bKey];
  if (aReady !== undefined) s.farmReadyAt[bKey] = aReady;
  if (bReady !== undefined) s.farmReadyAt[aKey] = bReady;
  s.board[to] = a;
  s.board[from] = b;
  return null;
}

function solvePuzzle(s: GameState, id: string, rotations: number[], moves: number, now: number, events: GameEvent[]): DenyReason | null {
  if (!isPuzzleUnlocked(s, id)) return 'locked';
  let def: Puzzle;
  try {
    def = getPuzzle(id);
  } catch {
    return 'invalid';
  }
  if (rotations.length !== def.tiles.length) return 'invalid';
  const candidate: Puzzle = { ...def, tiles: def.tiles.map((t, i) => (t.fixed ? t : { ...t, rot: rotations[i] & 3 })) };
  if (!isSolved(candidate)) return 'invalid'; // wrong solutions never pay
  const stars = starsFor(Math.max(0, moves | 0), def.par);
  const isEcho = id.startsWith('echo-');
  const prev = s.puzzles[id];
  const first = !prev;
  s.puzzles[id] = { stars: Math.max(prev?.stars ?? 0, stars), bestMoves: Math.min(prev?.bestMoves ?? Infinity, moves) };
  if (first) {
    s.stats.puzzles += 1;
    addLeaves(s, BALANCE.puzzle.leaves(def.tier));
    addXp(s, BALANCE.puzzle.xp(def.tier), now, events);
    events.push({ type: 'reward', leaves: BALANCE.puzzle.leaves(def.tier), xp: BALANCE.puzzle.xp(def.tier), energy: 0 });
    if (isEcho) {
      s.echo.solved = true;
      changeCoins(s, BALANCE.puzzle.echoCoins, 'echo', `echo:${id}`, now);
    }
  }
  if (stars === 3 && (prev?.stars ?? 0) < 3) {
    s.stats.threeStars += 1;
    changeCoins(s, BALANCE.puzzle.threeStarCoins, 'threeStars', `star3:${id}`, now);
  }
  events.push({ type: 'puzzle', id, stars, first });
  return null;
}

function completeQuest(s: GameState, id: string, now: number, events: GameEvent[]): DenyReason | null {
  const q = QUEST[id];
  if (!q) return 'invalid';
  if (!canComplete(s, q)) return s.quests.done.includes(id) ? 'invalid' : 'missingItems';
  for (const r of q.reqs) {
    if (r.kind === 'item' && !removeItems(s, r.item, r.n)) return 'missingItems';
    if (r.kind === 'leaves') s.leaves -= r.n;
  }
  s.quests.done.push(id);
  events.push({ type: 'quest', id });
  if (q.structure) {
    const stage = (s.structures[q.structure] ?? 0) + 1;
    s.structures[q.structure] = stage;
    const complete = stage >= (STRUCTURE_STAGES[q.structure] ?? 1);
    if (complete) s.stats.structures += 1;
    events.push({ type: 'structure', id: q.structure, stage, complete });
  }
  if (!s.metChars.includes(q.giver)) s.metChars.push(q.giver);
  applyRewards(s, q.rewards, `quest:${id}`, now, events);
  if (id === 'r1_light') markTutorial(s, 'quest');
  return null;
}

function deliverOrder(s: GameState, id: string, now: number, events: GameEvent[]): DenyReason | null {
  const o = s.orders.find((x) => x.id === id);
  if (!o) return 'invalid';
  for (const it of o.items) {
    let have = 0;
    for (const c of s.board) if (c.t === 'i' && c.k === it.item) have++;
    for (const k of s.inventory) if (k === it.item) have++;
    if (have < it.n) return 'missingItems';
  }
  for (const it of o.items) removeItems(s, it.item, it.n);
  s.orders = s.orders.filter((x) => x.id !== id);
  s.stats.orders += 1;
  markTutorial(s, 'order');
  addLeaves(s, o.leaves);
  addXp(s, o.xp, now, events);
  events.push({ type: 'order', id });
  events.push({ type: 'reward', leaves: o.leaves, xp: o.xp, energy: 0 });
  return null;
}

function claimTask(s: GameState, id: string, now: number, events: GameEvent[]): DenyReason | null {
  const task = s.daily.tasks.find((t) => t.id === id) ?? (s.weekly.task?.id === id ? s.weekly.task : null);
  if (!task || task.claimed) return 'invalid';
  if (taskProgress(s, task) < task.target) return 'missingItems';
  task.claimed = true;
  addLeaves(s, task.reward.leaves);
  addEnergy(s, task.reward.energy);
  events.push({ type: 'reward', leaves: task.reward.leaves, xp: 0, energy: task.reward.energy });
  return null;
}

export function apply(state: GameState, cmd: Command, now: number): Result {
  const s = clone(state);
  const events: GameEvent[] = [];
  tick(s, now);
  let err: DenyReason | null = null;
  switch (cmd.type) {
    case 'tick':
      break;
    case 'viewRewards':
      s.rewardUnread = false;
      break;
    case 'retrieveReward': {
      const item = s.rewardStorage[cmd.slot];
      const free = emptyCellsNear(s.board, boardCenter());
      if (!item) { err = 'invalid'; break; }
      if (!free.length) { err = 'boardFull'; break; }
      s.rewardStorage.splice(cmd.slot, 1);
      s.board[free[0]] = { t: 'i', k: item };
      discover(s, item, now, events);
      events.push({ type: 'gift', item, producer: null, at: free[0] });
      break;
    }
    case 'retrieveAllRewards': {
      if (!s.rewardStorage.length) { err = 'invalid'; break; }
      let placed = 0;
      while (s.rewardStorage.length) {
        const free = emptyCellsNear(s.board, boardCenter());
        if (!free.length) break;
        const item = s.rewardStorage.shift()!;
        s.board[free[0]] = { t: 'i', k: item };
        discover(s, item, now, events);
        events.push({ type: 'gift', item, producer: null, at: free[0] });
        placed++;
      }
      if (!placed) err = 'boardFull';
      if (!s.rewardStorage.length) s.rewardUnread = false;
      break;
    }
    case 'move':
      err = move(s, cmd.from, cmd.to, now, events);
      break;
    case 'tap':
      err = produce(s, cmd.cell, now, events);
      break;
    case 'switchWorkshop': {
      const area = cmd.area;
      if (!Number.isInteger(area) || !s.workshop.unlocked.includes(area)) { err = 'locked'; break; }
      s.workshop.boards[s.workshop.active] = s.board;
      s.workshop.active = area;
      s.board = s.workshop.boards[area];
      break;
    }
    case 'unlockWorkshop': {
      const area = cmd.area;
      if (!Number.isInteger(area) || area < 1 || area > 8 || s.workshop.unlocked.includes(area) || !isAdjacentToUnlocked(area, s.workshop.unlocked)) { err = 'locked'; break; }
      if (s.leaves < WORKSHOP_PRICES[area]) { err = 'noLeaves'; break; }
      s.leaves -= WORKSHOP_PRICES[area];
      s.workshop.unlocked.push(area);
      s.workshop.boards[s.workshop.active] = s.board;
      s.workshop.active = area;
      s.board = s.workshop.boards[area];
      break;
    }
    case 'startFarmRecipe': {
      const factory = s.farmFactories[cmd.factory];
      const recipes = FARM_RECIPES[cmd.factory];
      if (!factory || !recipes || factory.readyAt) { err = 'notAvailable'; break; }
      if (TRADER_RECIPE.inputs.some((input) => (s.harvestStock[input.item] ?? 0) < input.count)) { err = 'missingItems'; break; }
      for (const input of TRADER_RECIPE.inputs) s.harvestStock[input.item] -= input.count;
      factory.readyAt = now + TRADER_RECIPE.seconds * 1000;
      factory.payout = 1;
      factory.rewardKind = 'starCoin';
      break;
    }
    case 'claimFarmReward': {
      const f = s.farmFactories[cmd.factory];
      const recipes = FARM_RECIPES[cmd.factory];
      if (!f || !recipes || !f.readyAt || now < f.readyAt || f.payout <= 0) { err = 'notAvailable'; break; }
      if (f.rewardKind === 'starCoin') {
        f.readyAt = 0; f.payout = 0; delete f.rewardKind;
        deliverNear(s, boardCenter(), 'starCoin:1', 1, now, events);
      } else {
        // Jobs started before this update retain their original gold reward and XP.
        const xp = recipes[f.recipe]?.xp ?? 0;
        const paid = f.payout;
        addLeaves(s, paid);
        f.readyAt = 0; f.payout = 0; f.recipe = 0;
        addXp(s, xp, now, events);
        events.push({ type: 'reward', leaves: paid, xp, energy: 0 });
      }
      break;
    }
    case 'skipFarmRecipe': {
      const f = s.farmFactories[cmd.factory];
      const recipes = FARM_RECIPES[cmd.factory];
      if (!f || !recipes || f.readyAt) { err = 'notAvailable'; break; }
      f.recipe = (f.recipe + 1) % recipes.length;
      break;
    }
    case 'buildNode':
      err = buildNode(s, cmd.id);
      break;
    case 'startNode':
      err = startNode(s, cmd.id, cmd.job, now, events);
      break;
    case 'claimNode':
      err = claimNode(s, cmd.id, now, events);
      break;
    case 'claimCollection': {
      // Idempotent: the reward is tied to the item id and recorded in the save before paying.
      if (!isCollectible(cmd.item) || !s.discovered.includes(cmd.item) || s.collected.includes(cmd.item)) { err = 'invalid'; break; }
      const r = collectionReward(cmd.item);
      s.collected.push(cmd.item);
      changeCoins(s, r.coins, 'collection', `col:${cmd.item}`, now);
      events.push({ type: 'collect', item: cmd.item, coins: r.coins });
      markTutorial(s, 'collection');
      break;
    }
    case 'tutorial':
      if (cmd.reset) s.tutorial = { done: [], skipped: false, replay: true };
      else if (cmd.skip) s.tutorial = { done: [...TUTORIAL_STEPS], skipped: true };
      else if (cmd.step && TUTORIAL_STEPS.includes(cmd.step)) markTutorial(s, cmd.step);
      else err = 'invalid';
      break;
    case 'collectCoin': {
      const c = s.board[cmd.cell];
      if (!c || c.t !== 'i' || !['coin', 'starCoin'].includes(parseItem(c.k).f)) { err = 'invalid'; break; }
      if (parseItem(c.k).f === 'starCoin') s.starTokens = (s.starTokens ?? 0) + 3 * coinValue(parseItem(c.k).l);
      else addLeaves(s, coinValue(parseItem(c.k).l));
      s.board[cmd.cell] = { t: 'e' };
      break;
    }
    case 'openCrate': {
      const free = emptyCellsNear(s.board, boardCenter());
      if (!s.crate.charges) { err = 'noCharges'; break; }
      if (!free.length) { err = 'boardFull'; break; }
      const [roll, rng] = nextRandom(s.rng);
      s.rng = rng;
      // Seeds and saplings only (content/progression.ts); natural materials come from the valley.
      const item = `${weighted(cratePool(s.level).map((e) => ({ value: e.family, weight: e.weight })), roll)}:1`;
      s.crate.charges -= 1;
      s.crate.opens += 1;
      s.board[free[0]] = { t: 'i', k: item };
      s.stats.produced += 1;
      discover(s, item, now, events);
      events.push({ type: 'gift', item, producer: null, at: free[0] });
      markTutorial(s, 'crate');
      break;
    }
    case 'claimDailyCrates': {
      const day = localDay(now, s.tzOffset);
      if (s.crate.charges > 0 || day <= s.crate.refillDay) { err = 'notAvailable'; break; }
      s.crate.charges = Math.min(999, s.crate.charges + BALANCE.crate.dailyFree);
      s.crate.refillDay = day;
      break;
    }
    case 'buyCrates': {
      const day = localDay(now, s.tzOffset);
      // This is an in-game energy exchange, shown only after today's free bundle is used.
      if (s.crate.charges > 0 || day > s.crate.refillDay) { err = 'notAvailable'; break; }
      if (s.energy < BALANCE.crate.energyPack.cost) { err = 'noEnergy'; break; }
      s.energy -= BALANCE.crate.energyPack.cost;
      s.crate.charges = Math.min(999, s.crate.charges + BALANCE.crate.energyPack.charges);
      break;
    }
    case 'refillCrate':
      err = 'notAvailable';
      break;
    case 'sell': {
      const c = s.board[cmd.cell];
      if (c?.t !== 'i' || parseItem(c.k).f === 'coin') {
        err = 'invalid';
        break;
      }
      const v = sellValue(parseItem(c.k).l);
      s.board[cmd.cell] = { t: 'e' };
      addLeaves(s, v);
      s.stats.sold += 1;
      events.push({ type: 'sell', item: c.k, leaves: v });
      break;
    }
    case 'store': {
      const c = s.board[cmd.cell];
      const slot = s.inventory.indexOf(null);
      if (c?.t !== 'i') err = 'invalid';
      else if (slot < 0) err = 'inventoryFull';
      else {
        s.inventory[slot] = c.k;
        s.board[cmd.cell] = { t: 'e' };
      }
      break;
    }
    case 'retrieve': {
      const key = s.inventory[cmd.slot];
      const free = emptyCellsNear(s.board, boardCenter());
      if (!key) err = 'invalid';
      else if (!free.length) err = 'boardFull';
      else {
        s.inventory[cmd.slot] = null;
        s.board[free[0]] = { t: 'i', k: key };
      }
      break;
    }
    case 'openCell': {
      if (!isOpenable(s.board, cmd.cell)) err = 'locked';
      else {
        const cost = openCellCost(s.cellsOpened);
        if (s.leaves < cost) err = 'noLeaves';
        else {
          s.leaves -= cost;
          s.cellsOpened += 1;
          s.board[cmd.cell] = { t: 'e' };
        }
      }
      break;
    }
    case 'buySlot': {
      const bought = s.inventory.length - BALANCE.inventory.startSlots;
      const cost = BALANCE.inventory.slotCostLeaves[bought];
      if (cost === undefined || s.inventory.length >= BALANCE.inventory.maxSlots) err = 'invalid';
      else if (s.leaves < cost) err = 'noLeaves';
      else {
        s.leaves -= cost;
        s.inventory.push(null);
      }
      break;
    }
    case 'upgrade': {
      const st = s.producers[cmd.producer];
      const lv = st ? producerLevel(cmd.producer, st.level) : null;
      if (!st || !lv || lv.upgradeLeaves === undefined) err = 'invalid';
      else if (s.leaves < lv.upgradeLeaves) err = 'noLeaves';
      else {
        s.leaves -= lv.upgradeLeaves;
        st.level += 1;
        st.charges = producerLevel(cmd.producer, st.level).charges; // upgrade refills
        st.anchor = now;
      }
      break;
    }
    case 'completeQuest':
      err = completeQuest(s, cmd.id, now, events);
      break;
    case 'deliverOrder':
      err = deliverOrder(s, cmd.id, now, events);
      break;
    case 'replaceOrder': {
      const i = s.orders.findIndex((o) => o.id === cmd.id);
      if (i < 0) err = 'invalid';
      else if (s.leaves < 5) err = 'noLeaves';
      else {
        s.leaves -= 5;
        s.orders.splice(i, 1);
        fillOrders(s, s.daily.day);
      }
      break;
    }
    case 'solvePuzzle':
      err = solvePuzzle(s, cmd.id, cmd.rotations, cmd.moves, now, events);
      break;
    case 'useHint':
      if (s.hintsDay < BALANCE.puzzle.freeHintsPerDay) s.hintsDay += 1;
      else if (s.leaves < BALANCE.puzzle.hintCoins) err = 'noLeaves';
      else s.leaves -= BALANCE.puzzle.hintCoins;
      if (!err) s.hintsUsed += 1;
      break;
    case 'buyEnergy': {
      const cost = leafBreakCost(s.energyBuys);
      if (s.energy >= BALANCE.energy.max) err = 'invalid';
      else if (s.leaves < cost) err = 'noLeaves';
      else {
        s.leaves -= cost;
        s.energyBuys += 1;
        addEnergy(s, BALANCE.energy.leafBreak.amount);
        events.push({ type: 'reward', leaves: 0, xp: 0, energy: BALANCE.energy.leafBreak.amount });
      }
      break;
    }
    case 'buyDecoration': {
      const d = DECORATION[cmd.id];
      if (!d || s.decorations.includes(d.id)) err = 'invalid';
      else if (!s.regions.includes(d.region)) err = 'locked';
      else if (s.leaves < d.cost) err = 'noLeaves';
      else {
        s.leaves -= d.cost;
        s.decorations.push(d.id);
      }
      break;
    }
    case 'claimTask':
      err = claimTask(s, cmd.id, now, events);
      break;
    case 'setDecor':
      if (!(s.structures[cmd.structure] >= (STRUCTURE_STAGES[cmd.structure] ?? 1))) err = 'locked';
      else s.decor[cmd.structure] = Math.max(0, Math.min(3, cmd.variant | 0));
      break;
    case 'meet':
      if (!s.metChars.includes(cmd.char)) s.metChars.push(cmd.char);
      break;
    case 'seeQuest':
      if (!s.quests.seen.includes(cmd.id)) s.quests.seen.push(cmd.id);
      break;
    case 'flag':
      s.flags[cmd.key] = true;
      break;
    case 'settings':
      s.settings = { ...s.settings, ...cmd.patch };
      break;
    case 'grantPurchase':
      // Only called by the purchase service after store/receipt verification. Idempotent.
      if (s.purchases.includes(cmd.transactionId)) err = 'invalid';
      else if (!(cmd.coins > 0 && Number.isInteger(cmd.coins))) err = 'invalid';
      else {
        s.purchases.push(cmd.transactionId);
        changeCoins(s, cmd.coins, 'purchase', `iap:${cmd.transactionId}`, now);
      }
      break;
    case 'exchangeHurryToken':
      if (s.leaves < HURRY.coinsPerToken) err = 'noLeaves';
      else { s.leaves -= HURRY.coinsPerToken; s.hurryTokens = (s.hurryTokens ?? 0) + 1; }
      break;
    case 'hurry': {
      if (cmd.target.kind === 'resource' && cmd.area !== s.workshop.active) { err = 'invalid'; break; }
      const target = cmd.target.kind === 'resource' ? s.board[cmd.target.cell] : cmd.target.kind === 'merchant' ? s.farmFactories.merchant : s.nodes[cmd.target.id];
      if (!target || !('readyAt' in target) || target.readyAt !== cmd.expectedReadyAt) { err = 'invalid'; break; }
      const cost = hurryCost(target.readyAt, now);
      if (!cost || !Number.isSafeInteger(cmd.maxCost) || cost > cmd.maxCost) { err = 'notAvailable'; break; }
      const missing = Math.max(0, cost - (s.hurryTokens ?? 0));
      const gold = missing * HURRY.coinsPerToken;
      if (gold && (!Number.isSafeInteger(cmd.maxGold) || gold > cmd.maxGold!)) { err = 'notAvailable'; break; }
      if (s.leaves < gold) { err = 'noLeaves'; break; }
      s.leaves -= gold;
      s.hurryTokens = Math.max(0, (s.hurryTokens ?? 0) - cost);
      target.readyAt = now;
      break;
    }
    case 'grantWorkerPurchase':
      if (!cmd.transactionId || s.purchases.includes(cmd.transactionId) || s.workerCapacity >= 2) err = 'invalid';
      else { s.purchases.push(cmd.transactionId); s.workerCapacity = 2; }
      break;
    case 'breakResource':
      err = breakResource(s, cmd.cell, now, events);
      if (!err) markTutorial(s, 'resource');
      break;
    case 'cancelResource':
      err = cancelResource(s, cmd.cell, now);
      break;
    case 'claimResource':
      err = claimResource(s, cmd.cell, now, events);
      break;
    case 'placeResource':
      err = placeResource(s, cmd.kind, now, events);
      break;
  }
  if (err) return deny(state, err);
  s.workshop.boards[s.workshop.active] = s.board;
  checkAchievements(s, now, events);
  fillOrders(s, s.daily.day);
  return { state: s, events };
}

/** Today's echo puzzle id for the player's progress. */
export function todayEchoDay(s: GameState, now: number): number {
  return localDay(now, s.tzOffset);
}

