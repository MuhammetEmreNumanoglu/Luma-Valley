// Valley sources (content/valley.ts): unlock rules, the start/claim state machine and delivery of
// the produced items. Read-only helpers are shared with the UI; mutators run inside `apply`.
//
// Safety properties (tests/nodes.test.ts):
// - A job's costs are paid exactly once, when it starts; a running job cannot be started again.
// - A reward is paid only after its wall-clock time and exactly once (claim clears the job first).
// - A one-off deposit runs each stage once and never comes back.
// - Rewards never disappear: if the board is full they wait in the reward storage.
import { NODE, NODES, type NodeDef, type NodeJob } from '../content/valley';
import type { ItemKey } from '../content/families';
import { boardCenter, countItem, emptyCellsNear, removeItems } from './board';
import { discover } from './state';
import type { DenyReason, GameEvent, GameState, NodeState } from './types';

export const IDLE: NodeState = { built: false, stage: 0, job: -1, readyAt: 0, out: [] };

export function nodeState(s: GameState, id: string): NodeState {
  return s.nodes?.[id] ?? IDLE;
}

/** Unlocked by level/quest and its region is open. Does not say whether it is built. */
export function isNodeUnlocked(s: GameState, n: NodeDef): boolean {
  if (!s.regions.includes(n.region)) return false;
  if (n.level && s.level < n.level) return false;
  if (n.quest && !s.quests.done.includes(n.quest)) return false;
  return true;
}

export function isNodeBuilt(s: GameState, n: NodeDef): boolean {
  return !n.build || nodeState(s, n.id).built;
}

/** A one-off deposit whose last stage has been collected. */
export function isDepleted(s: GameState, n: NodeDef): boolean {
  const st = nodeState(s, n.id);
  return n.mode === 'stages' && st.readyAt === 0 && st.stage >= n.jobs.length;
}

export function isRunning(s: GameState, id: string): boolean {
  return nodeState(s, id).readyAt > 0;
}

export function isReady(s: GameState, id: string, now: number): boolean {
  const st = nodeState(s, id);
  return st.readyAt > 0 && now >= st.readyAt;
}

/** The job a deposit would run next; for buildings, the job at `index`. */
export function jobFor(s: GameState, n: NodeDef, index?: number): NodeJob | null {
  if (n.mode === 'stages') {
    const st = nodeState(s, n.id);
    return n.jobs[st.stage] ?? null;
  }
  return n.jobs[index ?? 0] ?? null;
}

export function jobLevelOk(s: GameState, j: NodeJob): boolean {
  return !j.level || s.level >= j.level;
}

export function canAfford(s: GameState, j: NodeJob): DenyReason | null {
  if (s.energy < j.energy) return 'noEnergy';
  for (const inp of j.inputs ?? []) if (countItem(s, inp.item) < inp.n) return 'missingItems';
  return null;
}

/** Visual stage of a deposit for the map: 0 = whole … jobs.length = gone. Running counts as worked. */
export function depositLook(s: GameState, n: NodeDef): number {
  const st = nodeState(s, n.id);
  return Math.min(n.jobs.length, st.stage + (st.readyAt > 0 ? 0.5 : 0));
}

/** Places items on the active board near the centre; the rest wait in the reward storage. */
export function deliver(s: GameState, items: { item: ItemKey; n: number }[], now: number, events: GameEvent[]): void {
  for (const it of items) {
    for (let k = 0; k < it.n; k++) {
      const free = emptyCellsNear(s.board, boardCenter());
      if (free.length) {
        s.board[free[0]] = { t: 'i', k: it.item };
        events.push({ type: 'gift', item: it.item, producer: null, at: free[0] });
      } else {
        s.rewardStorage.push(it.item);
        s.rewardUnread = true;
      }
      discover(s, it.item, now, events);
    }
  }
}

function put(s: GameState, id: string, st: NodeState): void {
  s.nodes[id] = st;
}

export function buildNode(s: GameState, id: string): DenyReason | null {
  const n = NODE[id];
  if (!n || !n.build) return 'invalid';
  if (!isNodeUnlocked(s, n)) return 'locked';
  const st = nodeState(s, id);
  if (st.built) return 'invalid';
  if (s.leaves < n.build) return 'noLeaves';
  s.leaves -= n.build;
  put(s, id, { ...st, built: true });
  return null;
}

export function startNode(s: GameState, id: string, jobIndex: number | undefined, now: number, events: GameEvent[]): DenyReason | null {
  const n = NODE[id];
  if (!n) return 'invalid';
  if (!isNodeUnlocked(s, n)) return 'locked';
  if (!isNodeBuilt(s, n)) return 'locked';
  const st = nodeState(s, id);
  if (st.readyAt > 0) return 'notAvailable'; // already working (double tap)
  if (isDepleted(s, n)) return 'notAvailable';
  const index = n.mode === 'stages' ? st.stage : Math.floor(jobIndex ?? 0);
  const job = n.jobs[index];
  if (!job) return 'invalid';
  if (!jobLevelOk(s, job)) return 'locked';
  const lack = canAfford(s, job);
  if (lack) return lack;
  for (const inp of job.inputs ?? []) removeItems(s, inp.item, inp.n);
  s.energy -= job.energy;
  put(s, id, { ...st, job: index, readyAt: now + job.seconds * 1000, out: job.outputs.map((o) => ({ ...o })) });
  events.push({ type: 'node', id, stage: st.stage, depleted: false, claimed: false });
  return null;
}

export function claimNode(s: GameState, id: string, now: number, events: GameEvent[]): DenyReason | null {
  const n = NODE[id];
  if (!n) return 'invalid';
  const st = nodeState(s, id);
  if (!(st.readyAt > 0)) return 'notAvailable';
  if (now < st.readyAt) return 'notAvailable';
  const out = st.out;
  const stage = st.stage + 1;
  // Clear the job before paying, so a second claim (double tap) finds nothing to pay.
  put(s, id, { ...st, stage, job: -1, readyAt: 0, out: [] });
  deliver(s, out, now, events);
  s.stats.produced += out.reduce((a, o) => a + o.n, 0);
  const depleted = n.mode === 'stages' && stage >= n.jobs.length;
  events.push({ type: 'node', id, stage, depleted, claimed: true });
  return null;
}

/** Clock safety: a job can never be further away than its own duration (clock moved back). */
export function clampNodeTimers(s: GameState, now: number): void {
  for (const [id, st] of Object.entries(s.nodes)) {
    const n = NODE[id];
    if (!n || st.readyAt <= 0) continue;
    const job = n.jobs[st.job];
    const max = now + (job?.seconds ?? 0) * 1000;
    if (st.readyAt > max) st.readyAt = max;
  }
}

/** Valley sources the player can use right now (unlocked, not depleted). */
export function activeNodes(s: GameState): NodeDef[] {
  return NODES.filter((n) => isNodeUnlocked(s, n) && !isDepleted(s, n));
}

/** Sources with a finished job waiting to be collected (map badges, tab dot). */
export function readyNodes(s: GameState, now: number): NodeDef[] {
  return NODES.filter((n) => isReady(s, n.id, now));
}

