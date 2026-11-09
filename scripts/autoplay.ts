// A greedy "reasonable player" bot. Used by the integration test (can the game be finished
// without getting stuck?) and by scripts/simulate.ts (how long does content last?).
// It only issues the same commands a player can.
import { BALANCE, leafBreakCost, openCellCost } from '../src/content/balance';
import { DECORATIONS } from '../src/content/decorations';
import { isMaxLevel, parseItem, type ItemKey } from '../src/content/families';
import { PRODUCER, type ProducerId } from '../src/content/producers';
import { FARM_RECIPES, FARM_YIELD, HARVEST_ITEMS, TRADER_RECIPE } from '../src/content/farm';
import { isCollectible } from '../src/content/progression';
import { NODES } from '../src/content/valley';
import { RESOURCES, resourceTier, stageEnergy, SUPPLY } from '../src/content/resources';
import { busyWorkers, obstaclesOn, unlockedKinds } from '../src/engine/resources';
import { canAfford, isDepleted, isNodeBuilt, isNodeUnlocked, isReady, isRunning, jobLevelOk, nodeState } from '../src/engine/nodes';
import type { Command } from '../src/engine/commands';
import { countItem, isOpenable, mergeTrio, neighbours } from '../src/engine/board';
import { availableQuests, canComplete, nextTrailPuzzle } from '../src/engine/quests';
import { taskProgress } from '../src/engine/orders';
import type { GameState } from '../src/engine/types';
import { echoId, getPuzzle } from '../src/puzzles/levels';
import { solvedCopy } from '../src/puzzles/lightpaths';

/** Items the bot keeps for open quests and orders: key → count. */
function reserved(s: GameState): Map<ItemKey, number> {
  const m = new Map<ItemKey, number>();
  for (const q of availableQuests(s)) for (const r of q.reqs) if (r.kind === 'item') m.set(r.item, Math.max(m.get(r.item) ?? 0, r.n));
  for (const o of s.orders) for (const it of o.items) m.set(it.item, (m.get(it.item) ?? 0) + it.n);
  return m;
}

/** The family/level the bot is working towards: first unmet item of the first open quest.
 * Families that only come from converters are resolved to the converter's input. */
type Focus = { f: string; l: number; convert?: { producer: string; input: string; output: string } };

function focus(s: GameState): Focus | null {
  return foci(s)[0] ?? null;
}

function foci(s: GameState): Focus[] {
  const out: Focus[] = [];
  const qs = availableQuests(s).sort((a, b) => rank(a.kind) - rank(b.kind));
  for (const q of qs) {
    for (const r of q.reqs) {
      if (r.kind !== 'item') continue;
      if (countItem(s, r.item) >= r.n) continue;
      const it = parseItem(sourceOf(r.item));
      const gen = (Object.keys(s.producers) as ProducerId[]).some((id) => PRODUCER[id].kind === 'generator' && PRODUCER[id].levels.some((lv) => (lv.outputs ?? []).some((o) => o.value.startsWith(it.f + ':'))));
      if (gen) {
        out.push(it);
        continue;
      }
      for (const id of Object.keys(s.producers) as ProducerId[]) {
        for (const rc of PRODUCER[id].recipes ?? []) {
          const o = parseItem(rc.output);
          if (o.f === it.f && o.l <= it.l && !rc.secret) {
            const inp = parseItem(rc.input);
            out.push({ f: inp.f, l: inp.l, convert: { producer: id, input: rc.input, output: rc.output } });
          }
        }
      }
    }
  }
  return out;
}

function rank(kind: string): number {
  return kind === 'story' ? 0 : kind === 'project' ? 1 : 2;
}

/** A harvest good (bouquet, milk…) is grown from its family's level-4 item. */
function sourceOf(item: ItemKey): ItemKey {
  const from = Object.entries(FARM_YIELD).find(([, y]) => y.item === item);
  return from ? from[0] : item;
}

/** Families and max level the open goals need. */
function wanted(s: GameState): Map<string, number> {
  const m = new Map<string, number>();
  for (const q of availableQuests(s)) for (const r of q.reqs) if (r.kind === 'item' && countItem(s, r.item) < r.n) {
    const { f, l } = parseItem(sourceOf(r.item));
    m.set(f, Math.max(m.get(f) ?? 0, l));
  }
  return m;
}

function mergeMove(s: GameState, keep: Map<ItemKey, number>, want: Map<string, number>): Command | null {
  const byKey = new Map<ItemKey, number[]>();
  s.board.forEach((c, i) => {
    if (c.t === 'i' && !isMaxLevel(c.k)) byKey.set(c.k, [...(byKey.get(c.k) ?? []), i]);
  });
  // Lowest levels first: that is where space is won.
  const keys = [...byKey.keys()].sort((a, b) => parseItem(a).l - parseItem(b).l);
  for (const key of keys) {
    const cells = byKey.get(key)!;
    const { f, l } = parseItem(key);
    const need = keep.get(key) ?? 0;
    const target = want.get(f) ?? 0;
    // Do not merge items that are exactly what a goal needs, unless there is surplus; never merge
    // a goal family past the level the goals ask for (that only burns the needed level).
    if (l >= target && target > 0 && (cells.length - need < 3 || l >= target)) continue;
    if (cells.length < 3) continue;
    // A deliberate drop onto a matching item that already has a matching neighbour.
    for (const to of cells) for (const from of cells) if (from !== to && mergeTrio(s.board, from, to)) return { type: 'move', from, to };
    // Otherwise build a pair: move one next to another (onto a free neighbour).
    for (const t of cells) {
      for (const n of neighbours(t)) {
        if (s.board[n].t !== 'e') continue;
        const src = cells.find((o) => o !== t && !neighbours(o).includes(t));
        if (src !== undefined) return { type: 'move', from: src, to: n };
      }
    }
  }
  return null;
}

export interface BotOptions {
  /** Plays only the story: ignores orders, merchant and collection rewards. */
  questsOnly?: boolean;
  /** Solves at most this many trail puzzles per call budget (a casual player avoids puzzles). */
  puzzles?: boolean;
}

export function autoplayStep(s: GameState, now: number, opts: BotOptions = {}): Command {
  // 0. Collect what is waiting.
  for (const n of NODES) if (isReady(s, n.id, now)) return { type: 'claimNode', id: n.id };
  for (let i = 0; i < s.board.length; i++) {
    const c = s.board[i];
    if (c.t === 'r' && c.readyAt > 0 && now >= c.readyAt) return { type: 'claimResource', cell: i };
  }
  // Only pull stored rewards back when there is room for them (otherwise it is a sell/retrieve loop).
  if (s.rewardStorage.length && s.board.filter((c) => c.t === 'e').length >= 4) return { type: 'retrieveAllRewards' };
  if (!opts.questsOnly) {
    const col = s.discovered.find((k) => isCollectible(k) && !s.collected.includes(k));
    if (col) return { type: 'claimCollection', item: col };
  }
  // 1. Finish goals.
  const qs = availableQuests(s).sort((a, b) => (a.kind === 'story' ? -1 : 0) - (b.kind === 'story' ? -1 : 0));
  for (const q of qs) if (canComplete(s, q)) return { type: 'completeQuest', id: q.id };
  const questWant = wanted(s);
  for (const o of opts.questsOnly ? [] : s.orders) {
    // Skip orders that would eat material a quest is being built from.
    if (o.items.some((it) => {
      const { f, l } = parseItem(it.item);
      return (questWant.get(f) ?? 0) >= l;
    })) continue;
    let ok = true;
    for (const it of o.items) {
      if (countItem(s, it.item) < it.n) ok = false;
    }
    if (ok) return { type: 'deliverOrder', id: o.id };
  }
  for (const t of [...s.daily.tasks, ...(s.weekly.task ? [s.weekly.task] : [])]) {
    if (!t.claimed && taskProgress(s, t) >= t.target) return { type: 'claimTask', id: t.id };
  }
  // 2. Puzzles (bot plays them perfectly; simulate.ts charges time for them).
  const next = nextTrailPuzzle(s);
  const puzzleNeeded = availableQuests(s).some((q) => q.reqs.some((r) => r.kind === 'puzzle'));
  if (next && (opts.puzzles !== false || puzzleNeeded)) {
    const p = getPuzzle(next);
    return { type: 'solvePuzzle', id: next, rotations: solvedCopy(p).tiles.map((t) => t.rot), moves: p.par };
  }
  // The daily Echo puzzle (one spark a day).
  if (!s.echo.solved && opts.puzzles !== false) {
    const id = echoId(s.echo.day, Math.max(1, Math.min(7, Math.max(...s.regions))));
    const p = getPuzzle(id);
    return { type: 'solvePuzzle', id, rotations: solvedCopy(p).tiles.map((t) => t.rot), moves: p.par };
  }
  const keep = reserved(s);
  const want = wanted(s);
  // 3. Merge.
  const m = mergeMove(s, keep, want);
  if (m) return m;
  // 4. Space management: when nearly full, sell what no goal needs (unwanted families first,
  // then the lowest surplus level); never sell the material on the way to a goal.
  const free = s.board.filter((c) => c.t === 'e').length;
  // Finished junk (top-level items nobody needs) goes first.
  if (free <= 10) {
    const junk = s.board.findIndex((c) => c.t === 'i' && isMaxLevel(c.k) && (keep.get(c.k) ?? 0) === 0 && !(want.get(parseItem(c.k).f) ?? 0));
    if (junk >= 0) return { type: 'sell', cell: junk };
  }
  const missingKind = s.supply.charges > 0 && unlockedKinds(s).some((k) => want.has(RESOURCES[k].family) && !s.board.some((c) => c.t === 'r' && c.r === k));
  if (free <= 4 || (missingKind && free < 3)) {
    let worst = -1;
    let worstScore = Infinity;
    s.board.forEach((c, i) => {
      if (c.t !== 'i') return;
      const { f, l } = parseItem(c.k);
      if ((keep.get(c.k) ?? 0) > 0) return;
      const target = want.get(f) ?? 0;
      const useful = target > 0 && l < target;
      const score = (useful ? 100 : 0) + l;
      if (score < worstScore) {
        worst = i;
        worstScore = score;
      }
    });
    if (worst >= 0) return { type: 'sell', cell: worst };
  }
  // 5. Grow: open cells and build valley sources with spare coins.
  const leavesNeeded = availableQuests(s).reduce((t, q) => t + q.reqs.reduce((u, r) => u + (r.kind === 'leaves' ? r.n : 0), 0), 0);
  const spare = s.leaves - leavesNeeded;
  for (const n of NODES) {
    if (n.build && isNodeUnlocked(s, n) && !nodeState(s, n.id).built && spare >= n.build) return { type: 'buildNode', id: n.id };
  }
  const openable = s.board.findIndex((_, i) => isOpenable(s.board, i));
  if (openable >= 0 && spare > openCellCost(s.cellsOpened) * 2) return { type: 'openCell', cell: openable };
  // 6. Farm: harvest grown animals and plots; feed the merchant.
  for (let i = 0; i < s.board.length; i++) {
    const c = s.board[i];
    if (c.t === 'i' && FARM_YIELD[c.k] && (s.farmReadyAt[`${s.workshop.active}:${i}`] ?? 0) <= now) return { type: 'tap', cell: i };
  }
  // Shops: collect rewards, start a delivery when the barn holds its inputs (never quest stock).
  for (const factory of ['merchant', 'grocer'] as const) {
    const job = s.farmFactories[factory];
    if (!job) continue;
    if (job.readyAt > 0 && now >= job.readyAt) return { type: 'claimFarmReward', factory };
    const offers = factory === 'grocer' ? FARM_RECIPES.grocer.map((r) => r.inputs) : [TRADER_RECIPE.inputs];
    const pick = offers.findIndex((inputs) => inputs.every((x) => (s.harvestStock[x.item] ?? 0) >= x.count + (keep.get(x.item) ?? 0)));
    if (!job.readyAt && !opts.questsOnly && pick >= 0) return { type: 'startFarmRecipe', factory, recipe: pick };
  }
  // Coins and star coins on the board are banked.
  const coin = s.board.findIndex((c) => c.t === 'i' && (c.k.startsWith('coin:') || c.k.startsWith('starCoin:')));
  if (coin >= 0) return { type: 'collectCoin', cell: coin };
  // 7. Valley work towards the goals: deposits first, then the best renewable job.
  const goalFams = new Map<string, number>(want);
  for (const o of s.orders) for (const it of o.items) { const { f, l } = parseItem(it.item); goalFams.set(f, Math.max(goalFams.get(f) ?? 0, l)); }
  if (!goalFams.size) goalFams.set('flower', 3);
  // Processed goods: the inputs of their building become goals too (ceramic → clay…).
  for (const n of NODES) {
    if (!isNodeUnlocked(s, n)) continue;
    for (const j of n.jobs) {
      if (!j.inputs?.length || !jobLevelOk(s, j)) continue;
      const out = parseItem(j.outputs[0].item);
      if (!goalFams.has(out.f)) continue;
      for (const x of j.inputs) { const i = parseItem(x.item); if (!HARVEST_ITEMS.includes(x.item)) goalFams.set(i.f, Math.max(goalFams.get(i.f) ?? 0, i.l)); }
    }
  }
  const jobs: { id: string; job: number; score: number }[] = [];
  for (const n of NODES) {
    if (!isNodeUnlocked(s, n) || !isNodeBuilt(s, n) || isRunning(s, n.id) || isDepleted(s, n)) continue;
    const list = n.mode === 'stages' ? [nodeState(s, n.id).stage] : n.jobs.map((_, i) => i);
    for (const ji of list) {
      const j = n.jobs[ji];
      if (!j || !jobLevelOk(s, j) || canAfford(s, j)) continue;
      // Keep inputs that are themselves goal material.
      if ((j.inputs ?? []).some((x) => (keep.get(x.item) ?? 0) > 0)) continue;
      const out = parseItem(j.outputs[0].item);
      const target = goalFams.get(out.f) ?? 0;
      if (!target || out.l > target) continue;
      jobs.push({ id: n.id, job: ji, score: out.l * 10 + ((want.get(out.f) ?? 0) > 0 ? 100 : 0) - j.energy * 0.05 });
    }
  }
  jobs.sort((a, b) => b.score - a.score);
  // Workshop resources: break obstacles of wanted materials first; when a wanted material has no
  // obstacle and the board's obstacle limit is reached, break an unwanted one to make room; ask
  // for a delivery of the most needed missing material.
  if (free >= 2) {
    // Lowest level each material is still asked for: an obstacle of a higher tier cannot give it.
    const lowWant = new Map<string, number>();
    for (const q of availableQuests(s)) for (const r of q.reqs) if (r.kind === 'item' && countItem(s, r.item) < r.n) { const it = parseItem(r.item); lowWant.set(it.f, Math.min(lowWant.get(it.f) ?? Infinity, it.l)); }
    const missing = unlockedKinds(s).filter((k) => goalFams.has(RESOURCES[k].family) && !s.board.some((c) => c.t === 'r' && c.r === k && c.tier <= (lowWant.get(RESOURCES[k].family) ?? Infinity)));
    const capped = obstaclesOn(s.board) >= SUPPLY.perBoard;
    if (busyWorkers(s, now) < s.workerCapacity) {
      let best = -1;
      let bestScore = -1;
      for (let i = 0; i < s.board.length; i++) {
        const c = s.board[i];
        if (c.t !== 'r' || c.readyAt > 0 || s.energy < stageEnergy(c.r, c.stage, c.tier)) continue;
        const fam = RESOURCES[c.r].family;
        // What an open quest is waiting for comes first; orders next; space last.
        const score = (want.has(fam) ? 20 : goalFams.has(fam) ? 10 : 0) + (free < 8 || (capped && missing.length) ? 5 : 0) + c.stage;
        if (score > bestScore) { best = i; bestScore = score; }
      }
      if (best >= 0 && (bestScore >= 5 || jobs.length === 0)) return { type: 'breakResource', cell: best };
    }
    if (s.supply.charges > 0 && missing.length && !capped) {
      const need = (k: string) => goalFams.get(RESOURCES[k as keyof typeof RESOURCES].family) ?? 0;
      const kind = [...missing].sort((a, b) => need(b) - need(a))[0];
      // Bring the lowest level a goal still asks for (never above the current tier).
      let low = Infinity;
      for (const q of availableQuests(s)) for (const r of q.reqs) if (r.kind === 'item' && countItem(s, r.item) < r.n) { const it = parseItem(r.item); if (it.f === RESOURCES[kind].family) low = Math.min(low, it.l); }
      return { type: 'placeResource', kind, tier: Math.max(1, Math.min(resourceTier(s.level), Number.isFinite(low) ? low : resourceTier(s.level))) };
    }
  }
  // No new valley work while the reward storage is backed up (it would only pile up there).
  if (jobs[0] && free >= 4 && s.rewardStorage.length <= 30) return { type: 'startNode', id: jobs[0].id, job: jobs[0].job };
  // Animals for the merchant (and the collection) once the barn exists.
  if (!opts.questsOnly && free >= 6 && s.energy >= 10) {
    const barn = NODES.find((n) => n.kind === 'barn');
    if (barn && isNodeUnlocked(s, barn) && isNodeBuilt(s, barn) && !isRunning(s, barn.id)) {
      const herd = s.board.filter((c) => c.t === 'i' && (c.k.startsWith('cow:') || c.k.startsWith('chicken:'))).length;
      if (herd < 8) return { type: 'startNode', id: barn.id, job: s.level >= 5 && herd % 2 ? 1 : 0 };
    }
  }
  // Seed crate: starters for flowers, fruit, grain and plots (and XP early on).
  if (s.crate.charges > 0 && free >= 10) return { type: 'openCrate' };
  const today = Math.floor(now / 86_400_000);
  if (s.crate.charges === 0 && today > s.crate.refillDay) return { type: 'claimDailyCrates' };
  // 8. Big surpluses go to decorations; spare leaves buy a tea break when energy is out.
  const deco = DECORATIONS.find((d) => s.regions.includes(d.region) && !s.decorations.includes(d.id) && spare > d.cost * 4);
  if (deco) return { type: 'buyDecoration', id: deco.id };
  // Spare coins become energy (a player with a full purse does not sit idle).
  if (s.energy < 20 && s.leaves - leavesNeeded > leafBreakCost(s.energyBuys) * 3 + 300) return { type: 'buyEnergy' };
  void now;
  void BALANCE;
  return { type: 'tick' };
}
