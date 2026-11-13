import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apply } from '../src/engine/commands';
import { encode, decode } from '../src/persistence/save';
import { fresh, T0 } from './helpers';

test('energy packs charge atomically and retrying the same request grants nothing', () => {
  const s = fresh(); s.starTokens = 100; s.energy = 20;
  const bought = apply(s, { type: 'buyConvenience', id: 'energy30', requestId: 'once' }, T0).state;
  assert.equal(bought.energy, 50); assert.equal(bought.starTokens, 80);
  const retried = apply(bought, { type: 'buyConvenience', id: 'energy30', requestId: 'once' }, T0).state;
  assert.equal(retried.energy, 50); assert.equal(retried.starTokens, 80);
  const poor = fresh(); const rejected = apply(poor, { type: 'buyConvenience', id: 'energy100', requestId: 'poor' }, T0).state;
  assert.equal(rejected.starTokens, 0); assert.equal(rejected.energy, poor.energy);
});

test('inventory upgrades persist all items and capacity across save/load', () => {
  const s = fresh(); s.starTokens = 500; s.inventory[0] = 'flower:1';
  const n = apply(s, { type: 'buyConvenience', id: 'slots10', requestId: 'slot1' }, T0).state;
  assert.equal(n.inventory.length, s.inventory.length + 10); assert.equal(n.starTokens, 320);
  const saved = decode(encode(n, 1, T0)); assert.ok(saved); assert.equal(saved.state.inventory.length, n.inventory.length); assert.equal(saved.state.inventory[0], 'flower:1');
  assert.equal(apply(saved.state, { type: 'buyConvenience', id: 'slots10', requestId: 'slot1' }, T0).state.starTokens, 320);
});

test('workshop skins charge once, persist selection and never move board items', () => {
  const s = fresh(); s.starTokens = 400; const board = JSON.stringify(s.board);
  const bought = apply(s, { type: 'buyWorkshopSkin', id: 'sakura' }, T0).state;
  assert.equal(bought.starTokens, 0); assert.ok(bought.workshopSkin.owned.includes('sakura'));
  const selected = apply(bought, { type: 'equipWorkshopSkin', id: 'sakura' }, T0).state;
  assert.equal(selected.workshopSkin.active, 'sakura'); assert.equal(JSON.stringify(selected.board), board);
  const saved = decode(encode(selected, 1, T0)); assert.ok(saved); assert.equal(saved.state.workshopSkin.active, 'sakura');
  assert.equal(apply(saved.state, { type: 'buyWorkshopSkin', id: 'sakura' }, T0).state.starTokens, 0);
});

test('boost shortens one verified running job and rejects stale or duplicate requests', () => {
  const s = fresh(); s.starTokens = 100;
  s.farmFactories.grocer = { recipe: 0, readyAt: T0 + 3600000, payout: 10 };
  const cmd = { type: 'buyConvenience' as const, id: 'speed15' as const, requestId: 'boost', target: { id: 'grocer', expectedReadyAt: T0 + 3600000 } };
  const n = apply(s, cmd, T0).state;
  assert.equal(n.starTokens, 65); assert.equal(n.farmFactories.grocer.readyAt, T0 + 2700000);
  assert.equal(apply(n, cmd, T0).state.starTokens, 65);
  assert.equal(apply(s, { ...cmd, requestId: 'stale', target: { ...cmd.target, expectedReadyAt: T0 + 1 } }, T0).state.starTokens, 100);
});

test('premium inventory does not remove the original gold upgrade', () => {
  const s = fresh(); s.starTokens = 100; s.leaves = 100;
  const expanded = apply(s, { type: 'buyConvenience', id: 'slots5', requestId: 'slots' }, T0).state;
  const goldSlot = apply(expanded, { type: 'buySlot' }, T0).state;
  assert.equal(goldSlot.inventory.length, expanded.inventory.length + 1);
  assert.equal(goldSlot.leaves, 40);
});

test('resource boost applies to the current verified resource only', () => {
  const s = fresh(); s.starTokens = 35;
  const i = s.board.findIndex(c => c.t === 'r'); assert.ok(i >= 0);
  const c = s.board[i]; assert.equal(c.t, 'r'); if (c.t !== 'r') return;
  c.readyAt = T0 + 30000;
  const target = { id: `resource:${s.workshop.active}:${i}`, expectedReadyAt: c.readyAt };
  const after = apply(s, { type: 'buyConvenience', id: 'speed15', requestId: 'res1', target }, T0).state;
  assert.equal(after.starTokens, 0); const r = after.board[i]; assert.equal(r.t, 'r'); if (r.t === 'r') assert.equal(r.readyAt, T0);
});
