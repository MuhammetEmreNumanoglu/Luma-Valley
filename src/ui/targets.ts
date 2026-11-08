// Screen rectangles of real buttons (crate, tabs, level badge, orders, a valley source), so the
// tutorial highlight is drawn exactly where the control is on every iPhone size. Components
// report their window rect after layout; the tutorial layer subscribes.
import { useCallback, useEffect, useSyncExternalStore } from 'react';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const rects = new Map<string, Rect>();
const listeners = new Set<() => void>();

export function setTarget(id: string, r: Rect | null): void {
  const prev = rects.get(id);
  if (r && prev && Math.abs(prev.x - r.x) < 0.5 && Math.abs(prev.y - r.y) < 0.5 && Math.abs(prev.w - r.w) < 0.5 && Math.abs(prev.h - r.h) < 0.5) return;
  if (r) rects.set(id, r);
  else rects.delete(id);
  for (const fn of listeners) fn();
}

export function getTarget(id: string): Rect | null {
  return rects.get(id) ?? null;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useTarget(id: string | null): Rect | null {
  return useSyncExternalStore(subscribe, () => (id ? getTarget(id) : null));
}

/** Attach to a View: `ref={ref} onLayout={measure}`; re-measures on layout changes. */
interface Measurable {
  measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void;
}

const nodes = new Map<string, Measurable>();

/** Ref callback + onLayout handler for the control with tutorial id `id`. */
export function useMeasuredTarget(id: string): [setNode: (node: unknown) => void, measure: () => void] {
  const setNode = useCallback((n: unknown) => {
    if (n) nodes.set(id, n as Measurable);
    else nodes.delete(id);
  }, [id]);
  const measure = useCallback(() => {
    // measureInWindow runs after layout; a short defer lets parents settle (safe areas, fonts).
    requestAnimationFrame(() => nodes.get(id)?.measureInWindow((x: number, y: number, w: number, h: number) => {
      if (w > 0 && h > 0) setTarget(id, { x, y, w, h });
    }));
  }, [id]);
  useEffect(() => () => setTarget(id, null), [id]);
  return [setNode, measure];
}
