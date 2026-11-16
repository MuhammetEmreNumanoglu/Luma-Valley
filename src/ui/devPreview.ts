// DEV TEST view-only state for the valley: a restoration-stage preview for one region and a
// one-shot camera focus request. Never saved and never touches the game state.
import { useSyncExternalStore } from 'react';

export type StagePreview = { region: number; stage: 0 | 1 | 2 } | null;
let preview: StagePreview = null;
let focus: number | null = null;
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };

export function setStagePreview(next: StagePreview): void { preview = next; emit(); }
export function useStagePreview(): StagePreview {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => preview, () => preview);
}
/** Ask the valley map to centre on a region the next time it opens. */
export function requestMapFocus(region: number): void { focus = region; }
export function takeMapFocus(): number | null { const f = focus; focus = null; return f; }

/** Structure stage shown for a preview: ruin (0), halfway (1) or restored (2). */
export function previewStage(stage: 0 | 1 | 2, total: number): number {
  return stage === 0 ? 0 : stage === 2 ? total : Math.max(1, Math.floor(total / 2));
}
