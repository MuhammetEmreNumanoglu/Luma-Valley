import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apply } from '../src/engine/commands';
import { turkeyDay } from '../src/premium/season';
import { decode, encode } from '../src/persistence/save';
import { fresh, T0 } from './helpers';

test('daily market charges earned gold once and preserves rewards after reload', () => {
  const s = fresh(); s.leaves = 200;
  const cmd = { type: 'buyMarketOffer' as const, id: 'materials' as const, expectedDay: turkeyDay(T0) };
  const paid = apply(s, cmd, T0).state;
  assert.equal(paid.leaves, 160); assert.deepEqual(paid.rewardStorage.slice(-2), ['wood:1', 'stone:1']);
  assert.equal(apply(paid, cmd, T0).state.leaves, 160);
  const loaded = decode(encode(paid, 1, T0))!.state;
  assert.equal(apply(loaded, cmd, T0).state.leaves, 160);
  const poor = fresh(); poor.leaves = 1; assert.equal(apply(poor, cmd, T0).state.leaves, 1);
});

test('market offer rotates at Istanbul midnight and rejects stale day confirmations', () => {
  const at = Date.UTC(2026, 10, 10, 21); const s = fresh(); s.leaves = 300;
  const day = turkeyDay(at - 1); const cmd = { type: 'buyMarketOffer' as const, id: 'crates' as const, expectedDay: day };
  const bought = apply(s, cmd, at - 1).state; assert.equal(bought.crate.charges, 55);
  assert.equal(apply(bought, cmd, at).state.leaves, 220);
  const tomorrow = apply(bought, { ...cmd, expectedDay: day + 1 }, at).state;
  assert.equal(tomorrow.leaves, 140); assert.equal(tomorrow.crate.charges, 60);
});
