// Seed crates as a reward: every delivered order and every collected discovery adds crates.
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { BALANCE } from '../src/content/balance';
import { blank, put, run } from './helpers';

test('a delivered order adds seed crates once', () => {
  let s = blank();
  s.crate.charges = 3;
  put(s, 10, 'flower:2');
  s.orders = [{ id: 'o1', giver: 'mira', items: [{ item: 'flower:2', n: 1 }], leaves: 10, xp: 2, special: false }];
  const r = run(s, { type: 'deliverOrder', id: 'o1' });
  assert.equal(r.s.crate.charges, 3 + BALANCE.crate.orderBonus);
  assert.ok(r.ev.some((e) => e.type === 'order' && e.crates === BALANCE.crate.orderBonus));
  assert.equal(run(r.s, { type: 'deliverOrder', id: 'o1' }).s, r.s);
});

test('collecting a discovery adds seed crates once', () => {
  let s = blank();
  s.crate.charges = 0;
  s.discovered = ['flower:3'];
  s = run(s, { type: 'claimCollection', item: 'flower:3' }).s;
  assert.equal(s.crate.charges, BALANCE.crate.discoveryBonus);
  assert.equal(run(s, { type: 'claimCollection', item: 'flower:3' }).s, s);
});
