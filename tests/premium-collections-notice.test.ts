import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { claimableCosmeticCollections } from '../src/premium/collections';
import { apply } from '../src/engine/commands';
import { fresh, T0 } from './helpers';

test('cosmetic collection notices only count complete unclaimed collections', () => {
  const s=fresh(); assert.equal(claimableCosmeticCollections(s),0);
  s.themes.owned.push('sakura'); s.workshopSkin.owned.push('sakura');
  s.premiumDecor.owned.push('sakura_tree'); assert.equal(claimableCosmeticCollections(s),0);
  s.premiumDecor.owned.push('flower_path'); assert.equal(claimableCosmeticCollections(s),1);
  const paid=apply(s,{type:'claimCosmeticCollection',id:'sakura'},T0).state;
  assert.equal(claimableCosmeticCollections(paid),0); assert.equal(paid.starTokens,s.starTokens+25);
});
