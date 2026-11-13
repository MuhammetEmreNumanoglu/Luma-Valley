import assert from 'node:assert/strict';
import { test } from 'node:test';

import { countItem } from '../src/engine/board';
import { canDeliverOrder, orderProgress } from '../src/engine/orders';
import type { Order } from '../src/engine/types';
import { decode, encode } from '../src/persistence/save';
import { blank, put, run, T0 } from './helpers';

const order = (id: string, n = 1): Order => ({ id, giver: 'mira', items: [{ item: 'flower:1', n }], leaves: 12, xp: 0, special: false });

test('selling a required product immediately removes delivery readiness and cannot pay a stale order', () => {
  const s = blank();
  const o = order('first');
  s.orders = [o];
  put(s, 0, 'flower:1');
  assert.ok(canDeliverOrder(s, o));
  const sold = run(s, { type: 'sell', cell: 0 }).s;
  assert.equal(canDeliverOrder(sold, o), false);
  assert.deepEqual(orderProgress(sold, o), [{ item: 'flower:1', have: 0, need: 1, met: false }]);
  const attempt = run(sold, { type: 'deliverOrder', id: o.id });
  assert.equal(attempt.s, sold);
  assert.ok(attempt.ev.some((e) => e.type === 'denied' && e.reason === 'missingItems'));
});

test('delivering one order removes readiness from another order using the same product', () => {
  const s = blank();
  const a = order('first'), b = order('second');
  s.orders = [a, b];
  s.inventory[0] = 'flower:1';
  assert.ok(canDeliverOrder(s, a) && canDeliverOrder(s, b));
  const delivered = run(s, { type: 'deliverOrder', id: a.id }).s;
  assert.equal(delivered.stats.orders, 1);
  assert.equal(delivered.leaves, s.leaves + a.leaves);
  assert.equal(delivered.inventory[0], null);
  assert.equal(canDeliverOrder(delivered, a), false);
  assert.equal(canDeliverOrder(delivered, b), false);
  assert.equal(run(delivered, { type: 'deliverOrder', id: b.id }).s, delivered);
});

test('delivery uses the same barn, inventory and all unlocked map stock as the card, without returning spent products', () => {
  const s = blank();
  const o = order('all-stock', 4);
  s.orders = [o];
  s.harvestStock['flower:1'] = 1;
  s.inventory[0] = 'flower:1';
  put(s, 0, 'flower:1');
  s.workshop.unlocked.push(1);
  s.workshop.boards[1][0] = { t: 'i', k: 'flower:1' };
  assert.ok(canDeliverOrder(s, o));
  const delivered = run(s, { type: 'deliverOrder', id: o.id }).s;
  assert.equal(delivered.stats.orders, 1);
  assert.equal(countItem(delivered, 'flower:1'), 0);
  const switched = run(delivered, { type: 'switchWorkshop', area: 1 }).s;
  const restored = decode(encode(switched, 1, T0))!.state;
  assert.equal(countItem(restored, 'flower:1'), 0);
  assert.equal(countItem(run(restored, { type: 'switchWorkshop', area: 0 }).s, 'flower:1'), 0);
});

test('spending a product in a quest or merge also clears order readiness', () => {
  const s = blank();
  const o = { ...order('sprout'), items: [{ item: 'flower:2', n: 1 }] };
  s.orders = [o];
  put(s, 0, 'flower:2');
  assert.ok(canDeliverOrder(s, o));
  const spent = run(s, { type: 'completeQuest', id: 'r1_light' }).s;
  assert.equal(canDeliverOrder(spent, o), false);
  const seeds = blank();
  const seedOrder = order('seeds', 3);
  seeds.orders = [seedOrder];
  for (const i of [0, 1, 2]) put(seeds, i, 'flower:1');
  assert.ok(canDeliverOrder(seeds, seedOrder));
  const merged = run(seeds, { type: 'move', from: 2, to: 1 }).s;
  assert.equal(canDeliverOrder(merged, seedOrder), false);
});

test('duplicate requirement lines cannot spend the same item twice or partially deliver', () => {
  const s = blank();
  const o = order('duplicates');
  o.items.push({ item: 'flower:1', n: 1 });
  s.orders = [o];
  put(s, 0, 'flower:1');
  assert.equal(canDeliverOrder(s, o), false);
  assert.equal(run(s, { type: 'deliverOrder', id: o.id }).s, s);
  put(s, 1, 'flower:1');
  assert.ok(canDeliverOrder(s, o));
  const delivered = run(s, { type: 'deliverOrder', id: o.id }).s;
  assert.equal(countItem(delivered, 'flower:1'), 0);
  assert.equal(delivered.stats.orders, 1);
});
