/** Saved area IDs stay stable; the original area is placed in the middle of the world. */
export const WORKSHOP_GRID = [5, 1, 6, 2, 0, 3, 7, 4, 8] as const;
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
