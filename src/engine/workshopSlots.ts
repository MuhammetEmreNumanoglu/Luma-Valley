import { BOARD_H, BOARD_W } from '../content/balance';
import type { GameState } from './types';

/** The existing final board row is reserved for the fixed shop fixtures. */
export const SHOP_ROW_START = BOARD_W * (BOARD_H - 1);
export const isShopCell = (index: number) => index >= SHOP_ROW_START && index < BOARD_W * BOARD_H;

/** Move old occupants without losing items, timed harvests or running resource jobs. */
export function reserveShopRows(s: GameState): void {
  const overflow = s.workshopOverflow ?? (s.workshopOverflow = []);
  for (let area = 0; area < s.workshop.boards.length; area++) {
    const board = area === s.workshop.active ? s.board : s.workshop.boards[area];
    for (let i = SHOP_ROW_START; i < board.length; i++) {
      const cell = board[i];
      if (cell?.t === 'i' || cell?.t === 'r') {
        const key = `${area}:${i}`;
        const readyAt = s.farmReadyAt[key];
        delete s.farmReadyAt[key];
        overflow.push({ area, cell, ...(readyAt !== undefined ? { readyAt } : {}) });
      }
      board[i] = { t: 'x' };
    }
    s.workshop.boards[area] = board;
  }
  restoreWorkshopOverflow(s);
}

/** Prefer their original board; full boards retain displaced cells safely until room opens. */
export function restoreWorkshopOverflow(s: GameState): void {
  const waiting = s.workshopOverflow ?? [];
  s.workshopOverflow = waiting.filter(entry => {
    const board = entry.area === s.workshop.active ? s.board : s.workshop.boards[entry.area];
    if (!board) return true;
    const spot = board.findIndex((cell, i) => i < SHOP_ROW_START && cell.t === 'e');
    if (spot < 0) {
      // Ordinary items remain accessible from the existing reward storage even on a full board.
      if (entry.cell.t === 'i' && entry.readyAt === undefined) {
        s.rewardStorage.push(entry.cell.k); s.rewardUnread = true; return false;
      }
      return true;
    }
    board[spot] = entry.cell;
    if (entry.readyAt !== undefined) s.farmReadyAt[`${entry.area}:${spot}`] = entry.readyAt;
    return false;
  });
}
