// Quest availability and progress (read-only helpers used by both the engine and the UI).
import { QUESTS, STRUCTURE_STAGES, type QuestDef, type Requirement } from '../content/quests';
import { REGIONS } from '../content/regions';
import { getPuzzle, puzzleRegion, trailId, TRAIL_LENGTH } from '../puzzles/levels';
import { countItem } from './board';
import type { GameState } from './types';

export function isQuestDone(s: GameState, id: string): boolean {
  return s.quests.done.includes(id);
}

export function isQuestAvailable(s: GameState, q: QuestDef): boolean {
  if (isQuestDone(s, q.id)) return false;
  if (!s.regions.includes(q.region)) return false;
  return q.prereq.every((p) => isQuestDone(s, p));
}

export function availableQuests(s: GameState): QuestDef[] {
  return QUESTS.filter((q) => isQuestAvailable(s, q));
}

export interface ReqProgress {
  req: Requirement;
  have: number;
  need: number;
  met: boolean;
}

export function requirementProgress(s: GameState, q: QuestDef): ReqProgress[] {
  return q.reqs.map((req) => {
    if (req.kind === 'item') {
      const have = countItem(s, req.item);
      return { req, have: Math.min(have, req.n), need: req.n, met: have >= req.n };
    }
    if (req.kind === 'puzzle') {
      const done = !!s.puzzles[req.id];
      return { req, have: done ? 1 : 0, need: 1, met: done };
    }
    return { req, have: Math.min(s.leaves, req.n), need: req.n, met: s.leaves >= req.n };
  });
}

export function canComplete(s: GameState, q: QuestDef): boolean {
  return isQuestAvailable(s, q) && requirementProgress(s, q).every((r) => r.met);
}

export function structureStage(s: GameState, id: string): number {
  return s.structures[id] ?? 0;
}

export function structureComplete(s: GameState, id: string): boolean {
  return structureStage(s, id) >= (STRUCTURE_STAGES[id] ?? 1);
}

/** 0..1 restoration of a region, drives the map's colour and life. */
export function regionVitality(s: GameState, region: number): number {
  const r = REGIONS.find((x) => x.id === region);
  if (!r) return 0;
  let have = 0;
  let total = 0;
  for (const st of r.structures) {
    const stages = STRUCTURE_STAGES[st.id] ?? 0;
    total += stages;
    have += Math.min(stages, structureStage(s, st.id));
  }
  return total === 0 ? 0 : have / total;
}

/** A trail puzzle is playable when the previous one is solved and its region is unlocked. */
export function isPuzzleUnlocked(s: GameState, id: string): boolean {
  if (id.startsWith('echo-')) return true;
  const k = Number(id.slice(2));
  if (!(k >= 1 && k <= TRAIL_LENGTH)) return false;
  if (!s.regions.includes(puzzleRegion(k))) return false;
  return k === 1 || !!s.puzzles[trailId(k - 1)];
}

/** Next unsolved trail puzzle, or null when the trail is finished. */
export function nextTrailPuzzle(s: GameState): string | null {
  for (let k = 1; k <= TRAIL_LENGTH; k++) {
    const id = trailId(k);
    if (!s.puzzles[id]) return isPuzzleUnlocked(s, id) ? id : null;
  }
  return null;
}

export function puzzleTier(id: string): number {
  return getPuzzle(id).tier;
}
