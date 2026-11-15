import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apply } from '../src/engine/commands';
import { applyDevGrant } from '../src/engine/devEconomy';
import { decode, encode } from '../src/persistence/save';
import { RESOURCES } from '../src/content/resources';
import { hasBridgeHelper, resourceStageSeconds } from '../src/premium/bridgeHelper';
import { blank, T0 } from './helpers';

test('bridge helper cannot be enabled in a release build and is off by default', () => {
  const s = blank();
  assert.equal(hasBridgeHelper(s), false);
  assert.equal(applyDevGrant(s, { currency: 'perk', perk: 'bridgeHelper', transactionId: 'tx1' }, T0, false), null);
});

test('dev-test bridge helper halves wood and stone stages only, once, and survives save/load', () => {
  const s = blank();
  const on = applyDevGrant(s, { currency: 'perk', perk: 'bridgeHelper', transactionId: 'tx1' }, T0, true)!;
  assert.ok(hasBridgeHelper(on));
  assert.equal(applyDevGrant(on, { currency: 'perk', perk: 'bridgeHelper', transactionId: 'tx2' }, T0, true), null, 'granted once');
  const wood = RESOURCES.wood.stages[0].seconds, ceramic = RESOURCES.ceramic.stages[0].seconds;
  assert.equal(resourceStageSeconds(on, 'wood', wood), Math.round(wood / 2));
  assert.equal(resourceStageSeconds(on, 'stone', RESOURCES.stone.stages[1].seconds), Math.round(RESOURCES.stone.stages[1].seconds / 2));
  assert.equal(resourceStageSeconds(on, 'ceramic', ceramic), ceramic);
  assert.equal(on.leaves, s.leaves); assert.equal(on.starTokens, s.starTokens);
  const loaded = decode(encode(on, 1, T0))!.state;
  assert.ok(hasBridgeHelper(loaded));
});

test('a forged helper perk without its test transaction is dropped on load', () => {
  const s = blank(); s.perks = { bridgeHelper: { source: 'devTest', transactionId: 'forged' } };
  assert.equal(hasBridgeHelper(s), false);
  assert.equal(decode(encode(s, 1, T0))!.state.perks?.bridgeHelper, undefined);
});

test('a real break uses the shortened time on a wood stack', () => {
  let s = applyDevGrant(blank(), { currency: 'perk', perk: 'bridgeHelper', transactionId: 'tx1' }, T0, true)!;
  s.board[10] = { t: 'r', r: 'wood', tier: 1, stage: 0, readyAt: 0 } as never; s.energy = 100;
  s = apply(s, { type: 'breakResource', cell: 10 }, T0).state;
  const c = s.board[10] as { readyAt: number };
  assert.equal(c.readyAt, T0 + Math.round(RESOURCES.wood.stages[0].seconds / 2) * 1000);
});
