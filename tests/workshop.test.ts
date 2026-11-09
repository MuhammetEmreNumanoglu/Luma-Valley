import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { countItem } from '../src/engine/board';
import { isAdjacentToUnlocked, workshopAt, workshopPosition, workshopPrice, WORKSHOP_COIN_PRICE, WORKSHOP_STAR_PRICES } from '../src/content/workshop';
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
  s.leaves = WORKSHOP_COIN_PRICE;
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

test('the first extra area costs coins, every later one star tokens at a rising price', () => {
  assert.deepEqual(workshopPrice(1), { currency: 'coins', amount: WORKSHOP_COIN_PRICE });
  for (let k = 1; k < WORKSHOP_STAR_PRICES.length; k++) assert.ok(WORKSHOP_STAR_PRICES[k] > WORKSHOP_STAR_PRICES[k - 1]);
  let s = blank();
  s.leaves = 100000; s.starTokens = WORKSHOP_STAR_PRICES[0] - 1;
  s = run(s, { type: 'unlockWorkshop', area: 1 }).s;
  assert.equal(s.leaves, 100000 - WORKSHOP_COIN_PRICE);
  // The second extra area needs star tokens; coins do not help.
  assert.equal(run(s, { type: 'unlockWorkshop', area: 2 }).s, s);
  s.starTokens = WORKSHOP_STAR_PRICES[0];
  const opened = run(s, { type: 'unlockWorkshop', area: 2 }).s;
  assert.ok(opened.workshop.unlocked.includes(2));
  assert.equal(opened.starTokens, 0);
  assert.equal(opened.leaves, s.leaves);
});
