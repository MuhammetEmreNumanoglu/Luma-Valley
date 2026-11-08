// "Where does this item come from?" — one answer used by the collection book, quest panels,
// merchant orders (only ask for what the player can get) and the anti-softlock test.
import { CRATE_POOL } from '../content/progression';
import { FARM_YIELD } from '../content/farm';
import { parseItem, type FamilyId, type ItemKey } from '../content/families';
import { NODES, nodeFamilies, type NodeDef } from '../content/valley';
import { isResourceFamily, RESOURCES, resourceTier, type ResourceKind } from '../content/resources';
import { unlockedKinds } from './resources';
import { isDepleted, isNodeUnlocked } from './nodes';
import type { GameState } from './types';

export type Source =
  | { kind: 'crate'; level: number; available: boolean }
  | { kind: 'resource'; res: ResourceKind; region: number; available: boolean; tier: number }
  | { kind: 'node'; node: NodeDef; available: boolean; depleted: boolean }
  | { kind: 'merge'; from: ItemKey }
  | { kind: 'farm'; from: ItemKey; available: boolean }
  | { kind: 'merchant' };

/** Families that a farm producer turns into goods (cow → milk…). */
function farmProducersOf(key: ItemKey): ItemKey[] {
  return Object.entries(FARM_YIELD)
    .filter(([, y]) => y.item === key)
    .map(([k]) => k);
}

/** Every way to obtain `key`, best first. */
export function itemSources(s: GameState, key: ItemKey): Source[] {
  const { f, l } = parseItem(key);
  const out: Source[] = [];
  if (f === 'coin') return [{ kind: 'merchant' }];
  for (const e of CRATE_POOL) if (e.family === f && l === 1) out.push({ kind: 'crate', level: e.level, available: s.level >= e.level });
  if (isResourceFamily(f)) {
    const tier = resourceTier(s.level);
    if (l <= tier) out.push({ kind: 'resource', res: f, region: RESOURCES[f].region, available: unlockedKinds(s).includes(f), tier });
  }
  for (const n of NODES) {
    if (!n.jobs.some((j) => j.outputs.some((o) => o.item === key))) continue;
    out.push({ kind: 'node', node: n, available: isNodeUnlocked(s, n) && !isDepleted(s, n), depleted: isDepleted(s, n) });
  }
  for (const p of farmProducersOf(key)) out.push({ kind: 'farm', from: p, available: s.discovered.includes(p) });
  if (l > 1) out.push({ kind: 'merge', from: `${f}:${l - 1}` });
  // Sort: available direct sources first, then merge, then locked.
  const rank = (x: Source) => (x.kind === 'merge' ? 1 : 'available' in x && x.available ? 0 : 2);
  return out.sort((a, b) => rank(a) - rank(b));
}

/** Families the player can currently obtain at level 1 or by merging their direct outputs. */
export function obtainableFamilies(s: GameState): FamilyId[] {
  const set = new Set<string>();
  for (const e of CRATE_POOL) if (s.level >= e.level) set.add(e.family);
  for (const k of unlockedKinds(s)) set.add(RESOURCES[k].family);
  for (const n of NODES) {
    if (!isNodeUnlocked(s, n)) continue;
    if (n.mode === 'stages' && isDepleted(s, n)) continue;
    // Processing buildings only count if their inputs are obtainable; checked in a second pass.
    if (n.jobs.every((j) => j.inputs?.length)) continue;
    for (const f of nodeFamilies(n)) set.add(f);
  }
  for (const n of NODES) {
    if (!isNodeUnlocked(s, n) || !n.jobs.every((j) => j.inputs?.length)) continue;
    for (const j of n.jobs) if ((j.inputs ?? []).every((i) => set.has(parseItem(i.item).f) || farmGoodAvailable(set, i.item))) for (const o of j.outputs) set.add(parseItem(o.item).f);
  }
  return [...set] as FamilyId[];
}

function farmGoodAvailable(families: Set<string>, good: ItemKey): boolean {
  return farmProducersOf(good).some((p) => families.has(parseItem(p).f));
}
