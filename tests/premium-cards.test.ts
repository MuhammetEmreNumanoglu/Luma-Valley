import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apply } from '../src/engine/commands';
import { decode, encode, migrate } from '../src/persistence/save';
import { fresh, T0 } from './helpers';

test('guaranteed packs charge once, survive reload and unlock a selected theme', () => {
  let s = fresh(); s.starTokens = 500;
  s = apply(s, { type: 'buyCardPack', id: 'winter', requestId: 'one' }, T0).state;
  assert.equal(s.themeCards.winter, 2); assert.equal(s.starTokens, 420);
  s = apply(s, { type: 'buyCardPack', id: 'winter', requestId: 'one' }, T0).state;
  assert.equal(s.themeCards.winter, 2); assert.equal(s.starTokens, 420);
  for (let i = 2; i <= 5; i++) s = apply(s, { type: 'buyCardPack', id: 'winter', requestId: `pack-${i}` }, T0).state;
  const loaded = decode(encode(s, 1, T0)); assert.ok(loaded); s = loaded.state;
  assert.equal(s.themeCards.winter, 10); assert.equal(s.starTokens, 100);
  s = apply(s, { type: 'unlockCardCosmetic', id: 'winter' }, T0).state;
  assert.equal(s.themes.active, 'winter'); assert.ok(s.themes.owned.includes('winter')); assert.equal(s.themeCards.winter, 0);
  assert.equal(apply(s, { type: 'buyCardPack', id: 'winter', requestId: 'extra' }, T0).state.starTokens, 100);
});

test('cosmetic ownership and season progress survive migration and milestone cards are not repeated', () => {
  const s = fresh(); s.themes.owned.push('winter'); s.themes.active = 'winter'; s.freeSeason.xp = 1000; s.freeSeason.claimedRewards = [5, 10];
  const old = JSON.parse(JSON.stringify(s)); old.version = 12; delete old.themeCards;
  const loaded = migrate(old); assert.ok(loaded); assert.equal(loaded.themes.active, 'winter'); assert.equal(loaded.freeSeason.xp, 1000); assert.equal(loaded.themeCards.winter, 2); assert.equal(loaded.themeCards.moonlight, 2);
  assert.equal(apply(loaded, { type: 'claimSeasonReward', level: 5 }, T0).state.themeCards.winter, 2);
});

test('card workshops require ten cards and preserve board; direct themes apply immediately', () => {
  let s = fresh(); s.starTokens = 500; const board = JSON.stringify(s.board);
  assert.equal(apply(s, { type: 'unlockCardCosmetic', id: 'crystal' }, T0).state.workshopSkin.active, 'classic');
  s = apply(s, { type: 'buyTheme', id: 'sakura' }, T0).state; assert.equal(s.themes.active, 'sakura');
  s.themeCards.crystal = 10; s = apply(s, { type: 'unlockCardCosmetic', id: 'crystal' }, T0).state;
  assert.equal(s.workshopSkin.active, 'crystal'); assert.equal(JSON.stringify(s.board), board);
});
