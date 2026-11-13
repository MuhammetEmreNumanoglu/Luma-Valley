import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DECOR_SPOTS } from '../src/premium/decor';
import { apply } from '../src/engine/commands';
import { encode, decode } from '../src/persistence/save';
import { fresh, T0 } from './helpers';

test('buy, place, move and remove a decoration while preserving its ownership', () => {
  const s = fresh(); s.starTokens = 200;
  const spots = DECOR_SPOTS.filter(x => x.region === 1); assert.ok(spots.length >= 2);
  const bought = apply(s, { type: 'buyPremiumDecor', id: 'crystal_lamp' }, T0).state;
  assert.equal(bought.starTokens, 140);
  const placed = apply(bought, { type: 'placePremiumDecor', id: 'crystal_lamp', spot: spots[0].id }, T0).state;
  const loaded = decode(encode(placed, 1, T0)); assert.ok(loaded); assert.equal(loaded.state.premiumDecor.placements.crystal_lamp, spots[0].id);
  const moved = apply(loaded.state, { type: 'placePremiumDecor', id: 'crystal_lamp', spot: spots[1].id }, T0).state;
  assert.equal(moved.premiumDecor.placements.crystal_lamp, spots[1].id);
  const removed = apply(moved, { type: 'placePremiumDecor', id: 'crystal_lamp', spot: null }, T0).state;
  assert.equal(removed.premiumDecor.placements.crystal_lamp, undefined); assert.ok(removed.premiumDecor.owned.includes('crystal_lamp'));
});

test('collection rewards are granted once and require actual owned cosmetics', () => {
  const s = fresh();
  assert.equal(apply(s, { type: 'claimCosmeticCollection', id: 'sakura' }, T0).state.starTokens, 0);
  s.themes.owned.push('sakura'); s.workshopSkin.owned.push('sakura'); s.premiumDecor.owned.push('sakura_tree', 'flower_path');
  const claimed = apply(s, { type: 'claimCosmeticCollection', id: 'sakura' }, T0).state;
  assert.equal(claimed.starTokens, 25);
  const loaded = decode(encode(claimed, 1, T0)); assert.ok(loaded);
  assert.equal(apply(loaded.state, { type: 'claimCosmeticCollection', id: 'sakura' }, T0).state.starTokens, 25);
});
