import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { countItem } from '../src/engine/board';
import { isAdjacentToUnlocked, workshopAt, workshopPosition, WORKSHOP_PRICES } from '../src/content/workshop';
import { decode, encode } from '../src/persistence/save';
import { blank, put, run, T0 } from './helpers';

test('workshop areas are locked initially and cost coins', () => {
  const s = blank();
  s.leaves = 0;
  assert.deepEqual(s.workshop.unlocked, [0]);
  assert.equal(run(s, { type: 'unlockWorkshop', area: 1 }).s, s);
  assert.equal(run(s, { type: 'switchWorkshop', area: 1 }).s, s);
});

test('the original area is central, and only adjacent areas can be unlocked', () => {
  assert.deepEqual(workshopPosition(0), { col: 1, row: 1 });
  assert.equal(workshopAt(150, 150, 100, 100), 0);
  assert.equal(workshopAt(150, 50, 100, 100), 1);
  assert.equal(workshopAt(-1, 50, 100, 100), null);
  assert.equal(isAdjacentToUnlocked(1, [0]), true);
  assert.equal(isAdjacentToUnlocked(2, [0]), true);
  assert.equal(isAdjacentToUnlocked(5, [0]), false);
  const s = blank(); s.leaves = 9999;
  assert.equal(run(s, { type: 'unlockWorkshop', area: 5 }).s, s);
  assert.equal(run(s, { type: 'unlockWorkshop', area: 2 }).s.workshop.active, 2);
});

test('switching and saving retains the contents of both areas', () => {
  const s = blank();
  s.leaves = WORKSHOP_PRICES[1];
  put(s, 0, 'flower:1');
  let next = run(s, { type: 'unlockWorkshop', area: 1 }).s;
  assert.equal(next.leaves, 0);
  assert.equal(next.workshop.active, 1);
  put(next, 2, 'wood:1');
  next = run(next, { type: 'switchWorkshop', area: 0 }).s;
  assert.deepEqual(next.board[0], { t: 'i', k: 'flower:1' });
  assert.equal(countItem(next, 'wood:1'), 1);
  const restored = decode(encode(next, 1, T0))!.state;
  const second = run(restored, { type: 'switchWorkshop', area: 1 }).s;
  assert.deepEqual(second.board[2], { t: 'i', k: 'wood:1' });
});
