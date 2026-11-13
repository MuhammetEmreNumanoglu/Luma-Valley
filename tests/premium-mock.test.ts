import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MockPurchaseProvider, StoreKitPurchaseProvider, buyDemoTheme, claimDemoReward, equipDemoTheme, newDemo, remainingSeason, seasonLevel } from '../src/premium/mock';
import { SEASON_DAYS } from '../src/premium/catalog';
const t = 1800000000000;
const stats = { merges: 0, orders: 0, produced: 0 };
const provider = new MockPurchaseProvider(true);

test('mock consumable grants exact tokens once; release provider cannot grant', () => {
  const s = newDemo(t, stats);
  const p = provider.purchase(s, 'light.120', 'tx1', 'success');
  assert.ok(p.ok); assert.equal(p.state.tokens, 120); assert.equal(s.tokens, 0);
  assert.equal(provider.purchase(p.state, 'light.120', 'tx1', 'success').ok, false);
  assert.equal(new MockPurchaseProvider(false).purchase(s, 'light.120', 'tx2', 'success').ok, false);
  assert.equal(new StoreKitPurchaseProvider().purchase(s).ok, false);
  for (const outcome of ['cancelled', 'failed', 'offline'] as const) {
    const r = provider.purchase(s, 'light.120', 'tx3', outcome); assert.equal(r.ok, false); assert.equal(r.state, s);
  }
});

test('themes require funds, persist after serialization, and do not charge twice', () => {
  let s = newDemo(t, stats);
  assert.equal(buyDemoTheme(s, 'sakura', true).ok, false);
  const topup = provider.purchase(s, 'light.750', 'tx2', 'success'); assert.ok(topup.ok); s = topup.state;
  const buy = buyDemoTheme(s, 'sakura', true); assert.ok(buy.ok); assert.equal(buy.state.tokens, 300);
  const restored = JSON.parse(JSON.stringify(buy.state));
  assert.equal(buyDemoTheme(restored, 'sakura', true).ok, false);
  const equipped = equipDemoTheme(restored, 'sakura', true); assert.ok(equipped.ok); assert.equal(equipped.state.theme, 'sakura');
  assert.equal(buyDemoTheme(s, 'sakura', false).ok, false);
});

test('season has separate one-time tracks and late pass unlocks earlier rewards', () => {
  let s = newDemo(t, stats);
  const progress = { merges: 20, orders: 0, produced: 0 };
  assert.equal(seasonLevel(s, progress), 2);
  const free = claimDemoReward(s, 'free', 1, progress, t, true); assert.ok(free.ok); s = free.state;
  assert.equal(claimDemoReward(s, 'free', 1, progress, t, true).ok, false);
  assert.equal(claimDemoReward(s, 'premium', 1, progress, t, true).ok, false);
  const pass = provider.purchase(s, 'pass.moon', 'pass1', 'success'); assert.ok(pass.ok); s = pass.state;
  assert.equal(seasonLevel(s, progress), 2, 'pass never opens levels');
  const premium = claimDemoReward(s, 'premium', 1, progress, t, true); assert.ok(premium.ok); s = premium.state;
  assert.equal(claimDemoReward(s, 'premium', 1, progress, t, true).ok, false);
  assert.equal(claimDemoReward(s, 'free', 3, progress, t, true).ok, false);
  assert.equal(claimDemoReward(s, 'free', 2, progress, t + (SEASON_DAYS + 1) * 86400000, true).ok, false);
  assert.ok(s.owned.includes('season-cosmetic-1'));
  assert.equal(remainingSeason(s, t + (SEASON_DAYS + 1) * 86400000), 0);
});

test('restore reopens only restorable items, never consumes or pays token packs again', () => {
  const fresh = newDemo(t, stats);
  const pack = provider.purchase(fresh, 'light.120', 'one', 'success'); assert.ok(pack.ok);
  const pass = provider.purchase(pack.state, 'pass.moon', 'two', 'success'); assert.ok(pass.ok);
  const simulated = { ...pass.state, owned: ['classic'], season: { ...pass.state.season, premium: false } };
  const restored = provider.restore(simulated); assert.ok(restored.ok);
  assert.ok(restored.state.owned.includes('pass.moon')); assert.equal(restored.state.season.premium, true);
  assert.equal(restored.state.tokens, 120); assert.ok(!restored.state.owned.includes('light.120'));
  assert.equal(provider.restore(restored.state).state.tokens, 120);
});

import { apply } from '../src/engine/commands';
import { decode, encode, migrate } from '../src/persistence/save';
import { fresh, T0 } from './helpers';

test('game theme purchases spend earned tokens once, persist and preserve decorations', () => {
  const s = fresh(); s.starTokens = 450; s.decorations = ['pond'];
  const bought = apply(s, { type: 'buyTheme', id: 'sakura' }, T0).state;
  assert.equal(bought.starTokens, 0); assert.ok(bought.themes.owned.includes('sakura'));
  assert.equal(apply(bought, { type: 'buyTheme', id: 'sakura' }, T0).state.starTokens, 0);
  const selected = apply(bought, { type: 'equipTheme', id: 'sakura' }, T0).state;
  assert.equal(selected.themes.active, 'sakura'); assert.deepEqual(selected.decorations, ['pond']);
  const loaded = decode(encode(selected, 1, T0)); assert.ok(loaded); assert.equal(loaded.state.themes.active, 'sakura');
  assert.equal(apply(fresh(), { type: 'buyTheme', id: 'winter' }, T0).state.themes.owned.includes('winter'), false);
  assert.equal(apply(fresh(), { type: 'equipTheme', id: 'winter' }, T0).state.themes.active, 'classic');
});

test('version 8 saves migrate without losing inventory and default to classic', () => {
  const old = { ...fresh(), version: 8 } as Record<string, unknown>;
  delete old.themes;
  const result = migrate(old); assert.ok(result); assert.deepEqual(result.themes, { owned: ['classic'], active: 'classic' });
  assert.deepEqual(result.inventory, fresh().inventory);
});
