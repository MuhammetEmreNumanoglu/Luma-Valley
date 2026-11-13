import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newGame } from '../src/engine/state';
import { migrate, encode, decode } from '../src/persistence/save';
import { SHOP_ROW_START } from '../src/engine/workshopSlots';
import { isOpenable, lockedOpenOrder } from '../src/engine/board';
import { apply } from '../src/engine/commands';
import { busyWorkers } from '../src/engine/resources';

test('shop cells are reserved and old contents including running resources survive save and reload', () => {
  const now = 1_700_000_000_000, old = newGame(now, 4);
  old.board = Array.from({ length: 63 }, (_, i) => i < SHOP_ROW_START ? { t: 'i' as const, k: 'flower:1' as const } : { t: 'e' as const });
  old.board[56] = { t: 'i', k: 'chicken:1' };
  old.board[57] = { t: 'r', r: 'wood', tier: 2, stage: 1, readyAt: now + 30000 };
  old.workshop.boards[0] = old.board;
  const repaired = migrate(JSON.parse(JSON.stringify(old)))!;
  assert.ok(repaired.board.slice(SHOP_ROW_START).every(c => c.t === 'x'));
  assert.ok(repaired.rewardStorage.includes('chicken:1'));
  assert.equal(repaired.workshopOverflow?.length, 1);
  assert.equal(busyWorkers(repaired, now), 1);
  assert.ok(!lockedOpenOrder(repaired.board).some(i => i >= SHOP_ROW_START));
  assert.equal(isOpenable(repaired.board, 56), false);
  const saved = decode(encode(repaired, 1, now))!.state;
  assert.equal(saved.workshopOverflow?.length, 1);
  saved.board[0] = { t: 'e' };
  const restored = apply(saved, { type: 'tick' }, now + 1000).state;
  assert.deepEqual(restored.board[0], { t: 'r', r: 'wood', tier: 2, stage: 1, readyAt: now + 30000 });
  assert.equal(restored.workshopOverflow?.length, 0);
});
