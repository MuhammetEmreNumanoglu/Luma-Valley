/**
 * Workshop areas sit in one tall column, built from the bottom up: the home area (id 0) is the
 * bottom row, area 1 the row above it, and so on to area 8 at the top. Saved area ids are stable.
 */
export const WORKSHOP_COLS = 1;
export const WORKSHOP_ROWS = 9;
/** Area id per grid cell, row by row from the top. */
export const WORKSHOP_GRID = [8, 7, 6, 5, 4, 3, 2, 1, 0] as const;

/**
 * Price of the next workshop area, by how many are already open (home included): the first extra
 * area costs coins, every later one star tokens (from shop deliveries), rising each time.
 */
export const WORKSHOP_COIN_PRICE = 150;
export const WORKSHOP_STAR_PRICES = [9, 18, 30, 45, 60, 80, 100] as const;

export function workshopPrice(opened: number): { currency: 'coins' | 'stars'; amount: number } {
  if (opened <= 1) return { currency: 'coins', amount: WORKSHOP_COIN_PRICE };
  return { currency: 'stars', amount: WORKSHOP_STAR_PRICES[Math.min(WORKSHOP_STAR_PRICES.length - 1, opened - 2)] };
}

export function workshopPosition(area: number): { col: number; row: number } {
  const index = WORKSHOP_GRID.indexOf(area as (typeof WORKSHOP_GRID)[number]);
  const i = index < 0 ? WORKSHOP_GRID.length - 1 : index;
  return { col: i % WORKSHOP_COLS, row: Math.floor(i / WORKSHOP_COLS) };
}

export function workshopAt(x: number, y: number, width: number, height: number): number | null {
  const col = Math.floor(x / width), row = Math.floor(y / height);
  return col >= 0 && col < WORKSHOP_COLS && row >= 0 && row < WORKSHOP_ROWS ? WORKSHOP_GRID[row * WORKSHOP_COLS + col] : null;
}

export function isAdjacentToUnlocked(area: number, unlocked: readonly number[]): boolean {
  const p = workshopPosition(area);
  return unlocked.some((id) => { const q = workshopPosition(id); return Math.abs(p.col - q.col) + Math.abs(p.row - q.row) === 1; });
}
