// DEV TEST level and region tools: real state changes, no reward farming, idempotent, and refused
// outside development builds.
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { applyDevGrant, DEV_MAX_LEVEL } from '../src/engine/devEconomy';
import { cratePoolFor, unseenNewFamilies } from '../src/content/progression';
import { canMakeItem } from '../src/engine/reachability';
import { apply } from '../src/engine/commands';
import { decode, encode } from '../src/persistence/save';
import { fresh, T0 } from './helpers';

test('level jump changes the real level, keeps XP consistent and pays no skipped level rewards', () => {
  const s = fresh(); s.xp = 7;
  const next = applyDevGrant(s, { currency: 'level', to: 15 }, T0, true)!;
  assert.equal(next.level, 15); assert.equal(next.xp, 0);
  assert.equal(next.leaves, s.leaves); assert.equal(next.energy, s.energy); assert.equal(next.crate.charges, s.crate.charges);
  assert.equal(cratePoolFor(next).length, 11, 'all level-15 families unlocked');
  assert.ok(canMakeItem(next, 'melonFarm:1'));
  assert.deepEqual(unseenNewFamilies(next), []);
  // Normal play continues from there; the next level-up pays exactly once.
  const after = apply(next, { type: 'tick' }, T0 + 1000).state;
  assert.equal(after.level, 15);
  assert.equal(applyDevGrant(next, { currency: 'level', to: 15 }, T0, true), null, 'same level: nothing');
  assert.equal(applyDevGrant(next, { currency: 'level', to: 3 }, T0, true), null, 'never backwards (no reward farming)');
  assert.equal(applyDevGrant(next, { currency: 'level', to: DEV_MAX_LEVEL + 1 }, T0, true), null);
  assert.equal(next.devTestLedger!.at(-1)!.currency, 'level');
});

test('opening a region for testing is idempotent and survives a save round trip', () => {
  const s = fresh();
  const a = applyDevGrant(s, { currency: 'region', region: 3 }, T0, true)!;
  assert.deepEqual(a.regions, [1, 3]);
  assert.equal(applyDevGrant(a, { currency: 'region', region: 3 }, T0, true), null);
  assert.equal(applyDevGrant(a, { currency: 'region', region: 99 }, T0, true), null);
  const loaded = decode(encode(a, 1, T0))!.state;
  assert.deepEqual(loaded.regions, [1, 3]);
  assert.equal(loaded.devTestLedger!.at(-1)!.currency, 'region');
});

test('production: every DEV TEST grant is refused and the state is untouched', () => {
  const s = fresh();
  for (const g of [{ currency: 'level', to: 10 }, { currency: 'region', region: 2 }, { currency: 'gold', amount: 1000 }, { currency: 'tokens', amount: 100 }, { currency: 'energy', amount: 25 }, { currency: 'perk', perk: 'bridgeHelper', transactionId: 'x' }] as const) {
    assert.equal(applyDevGrant(s, g as never, T0, false), null, JSON.stringify(g));
  }
  // There is no game command for these either.
  const r = apply(s, { type: 'devLevel', to: 10 } as never, T0);
  assert.equal(r.state.level, s.level);
});
