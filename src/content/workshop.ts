/** Saved area IDs stay stable; the original area is placed in the middle of the world. */
export const WORKSHOP_GRID = [5, 1, 6, 2, 0, 3, 7, 4, 8] as const;
export const WORKSHOP_PRICES = [0, 100, 250, 500, 900, 1500, 2400, 3600, 5000] as const;

export function workshopPosition(area: number): { col: number; row: number } {
  const index = WORKSHOP_GRID.indexOf(area as (typeof WORKSHOP_GRID)[number]);
  return { col: index < 0 ? 1 : index % 3, row: index < 0 ? 1 : Math.floor(index / 3) };
}

export function workshopAt(x: number, y: number, width: number, height: number): number | null {
  const col = Math.floor(x / width), row = Math.floor(y / height);
  return col >= 0 && col < 3 && row >= 0 && row < 3 ? WORKSHOP_GRID[row * 3 + col] : null;
}

export function isAdjacentToUnlocked(area: number, unlocked: readonly number[]): boolean {
  const p = workshopPosition(area);
  return unlocked.some((id) => { const q = workshopPosition(id); return Math.abs(p.col - q.col) + Math.abs(p.row - q.row) === 1; });
}
