/** Conservative, renewable item reachability for the player's current unlocks.
 * An existing item always remains usable; otherwise follow open crates, resources and node jobs. */
import { FARM_YIELD } from '../content/farm';
import { FAMILY, parseItem, type ItemKey } from '../content/families';
import { cratePool } from '../content/progression';
import { PRODUCER } from '../content/producers';
import { RESOURCES } from '../content/resources';
import { NODES } from '../content/valley';
import { isNodeUnlocked } from './nodes';
import type { GameState } from './types';

export function canMakeItem(s: GameState, item: ItemKey, visited = new Set<string>()): boolean {
  const { f, l } = parseItem(item);
  if (!FAMILY[f] || l < 1 || l > FAMILY[f].levels || visited.has(item)) return false;
  const next = new Set(visited); next.add(item);
  if (cratePool(s.level).some(x => x.family === f)) return true;
  if (Object.values(RESOURCES).some(r => r.family === f && s.regions.includes(r.region))) return true;
  if (Object.entries(s.producers).some(([id, owned]) => owned && PRODUCER[id as keyof typeof PRODUCER]?.kind === 'generator' && PRODUCER[id as keyof typeof PRODUCER]?.family === f)) return true;
  for (const [source, yieldDef] of Object.entries(FARM_YIELD)) if (yieldDef.item === item && canMakeItem(s, source, next)) return true;
  for (const node of NODES) {
    if (!isNodeUnlocked(s, node)) continue;
    for (const job of node.jobs) {
      if ((job.level ?? 1) > s.level || !job.outputs.some(o => { const out = parseItem(o.item); return out.f === f && out.l <= l; })) continue;
      if ((job.inputs ?? []).every(input => canMakeItem(s, input.item, next))) return true;
    }
  }
  return false;
}
