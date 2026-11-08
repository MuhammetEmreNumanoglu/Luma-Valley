// "Next goal": one short, actionable objective for the HUD chip. Pure and read-only.
import { QUESTS, type QuestDef } from '../content/quests';
import type { ItemKey } from '../content/families';
import { readyNodes } from './nodes';
import { availableQuests, canComplete, requirementProgress } from './quests';
import { itemSources, type Source } from './sources';
import type { GameState } from './types';

export type Goal =
  | { kind: 'claimNode'; node: string }
  | { kind: 'completeQuest'; quest: string }
  | { kind: 'item'; quest: string; item: ItemKey; missing: number; source: Source | null }
  | { kind: 'puzzle'; quest: string }
  | { kind: 'coins'; quest: string; missing: number }
  | { kind: 'region'; quest: string };

const RANK: Record<QuestDef['kind'], number> = { story: 0, project: 1, side: 2 };

export function nextGoal(s: GameState, now: number): Goal | null {
  const ready = readyNodes(s, now)[0];
  if (ready) return { kind: 'claimNode', node: ready.id };
  const open = availableQuests(s).sort((a, b) => RANK[a.kind] - RANK[b.kind] || QUESTS.indexOf(a) - QUESTS.indexOf(b));
  const done = open.find((q) => canComplete(s, q));
  if (done) return { kind: 'completeQuest', quest: done.id };
  const q = open[0];
  if (!q) return null;
  for (const p of requirementProgress(s, q)) {
    if (p.met) continue;
    switch (p.req.kind) {
      case 'item': {
        const sources = itemSources(s, p.req.item);
        const direct = sources.find((x) => x.kind !== 'merge' && 'available' in x && x.available) ?? sources.find((x) => x.kind === 'merge') ?? sources[0] ?? null;
        return { kind: 'item', quest: q.id, item: p.req.item, missing: p.need - p.have, source: direct };
      }
      case 'puzzle':
        return { kind: 'puzzle', quest: q.id };
      case 'leaves':
        return { kind: 'coins', quest: q.id, missing: p.need - p.have };
    }
  }
  return { kind: 'region', quest: q.id };
}
