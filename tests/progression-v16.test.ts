import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACHIEVEMENTS, ACHIEVEMENT_STAGES } from '../src/content/achievements';
import { BALANCE, sellValue } from '../src/content/balance';
import { FARM_RECIPES, traderRecipe } from '../src/content/farm';
import { FAMILIES, FAMILY, parseItem } from '../src/content/families';
import { collectibleKeys, collectionReward, CRATE_POOL, crateFamilyFlag, crateOdds, cratePool, cratePoolFor, LEGACY_CRATE_LEVELS, legacyCollectionReward, newFamilySeenFlag, unseenNewFamilies } from '../src/content/progression';
import { fillOrders } from '../src/engine/orders';
import { canMakeItem } from '../src/engine/reachability';
import { SHOP_LEVELS, SHOP_NAMES, SHOP_RECIPES, shopEligible, shopOffers } from '../src/engine/shops';
import { migrate } from '../src/persistence/save';
import { SAVE_VERSION } from '../src/engine/state';
import { SEASON_TASKS } from '../src/premium/season';
import { applyDevGrant } from '../src/engine/devEconomy';
import { apply } from '../src/engine/commands';
import { blank, fresh, put, run, T0 } from './helpers';

/** Design table from the product brief: families by the level they open. */
const TABLE: Record<number, string[]> = {
  1: ['cow', 'wheatFarm'], 4: ['chicken'], 6: ['tomatoFarm'], 8: ['flower'], 10: ['fruit'],
  11: ['grain'], 12: ['cornFarm'], 13: ['grapeFarm'], 14: ['pumpkinFarm'], 15: ['melonFarm'],
};

test('levels 1–15: crate families follow the design table, nothing else opens, odds are equal', () => {
  const open: string[] = [];
  for (let level = 1; level <= 15; level++) {
    open.push(...(TABLE[level] ?? []));
    const pool = cratePool(level);
    assert.deepEqual(pool.map(e => e.family).sort(), [...open].sort(), `level ${level}`);
    for (const { p } of crateOdds(pool)) assert.equal(p, 1 / open.length, `odds at level ${level}`);
    const locked = CRATE_POOL.filter(e => !open.includes(e.family));
    const s = fresh(); s.level = level;
    for (const e of locked) assert.equal(canMakeItem(s, `${e.family}:1`), false, `${e.family} must be locked at ${level}`);
  }
  assert.equal(cratePool(15).length, 11, 'all eleven families are open by level 15');
  assert.deepEqual(cratePool(60), cratePool(15), 'level 60 adds no hidden family; new ones are data entries');
  // Player level and merge chain length are separate axes.
  for (const e of CRATE_POOL) assert.equal(FAMILY[e.family].levels, 4, `${e.family} keeps its own 4-step chain`);
});

test('a new game opens only cows and wheat from the crate', () => {
  let s = blank(); s.crate.charges = 300;
  const seen = new Set<string>();
  for (let i = 0; i < 300; i++) {
    const r = run(s, { type: 'openCrate' }, T0 + i);
    s = r.s;
    for (const c of s.board) if (c.t === 'i') seen.add(parseItem(c.k).f);
    s.board = s.board.map(() => ({ t: 'e' as const }));
  }
  assert.deepEqual([...seen].sort(), ['cow', 'wheatFarm']);
});

test('levels 1–15: shops, trader and orders never ask for something the player cannot make', () => {
  for (let level = 1; level <= 15; level++) {
    const s = fresh(); s.level = level; s.quests.done.push('r1_garden1'); s.orders = [];
    for (const { item } of traderRecipe(level).inputs) assert.ok(canMakeItem(s, item), `trader at ${level}: ${item}`);
    for (let shop = 1; shop < SHOP_NAMES.length; shop++) {
      const eligible = shopEligible(s, shop);
      assert.equal(eligible, level >= SHOP_LEVELS[shop], `${SHOP_NAMES[shop].tr} at level ${level}`);
      for (const index of shopOffers(s, shop)) for (const input of FARM_RECIPES.grocer[index].inputs) assert.ok(canMakeItem(s, input.item), `${SHOP_NAMES[shop].tr} offer needs ${input.item} at ${level}`);
    }
    for (let day = 0; day < 6; day++) { s.orders = []; fillOrders(s, day); for (const o of s.orders) for (const it of o.items) assert.ok(canMakeItem(s, it.item), `order ${it.item} at level ${level}`); }
  }
  // Shops open left to right; the grocer only after eggs (4) and tomatoes (6).
  for (let i = 1; i < SHOP_LEVELS.length; i++) assert.ok(SHOP_LEVELS[i] >= SHOP_LEVELS[i - 1]);
  assert.equal(SHOP_LEVELS[1], 6); assert.deepEqual(SHOP_RECIPES[1], [1]);
  assert.deepEqual(traderRecipe(1).inputs.map(x => x.item).sort(), ['milk:1', 'wheatCrop:1']);
});

test('the grocer opening timer starts only once eggs and tomatoes are producible', () => {
  let s = fresh(); s.level = 5;
  s = run(s, { type: 'tick' }, T0).s; assert.equal(s.shopUnlocks[1].readyAt, 0);
  s.level = 6; s = run(s, { type: 'tick' }, T0 + 1000).s;
  assert.equal(s.shopUnlocks[1].readyAt, T0 + 1000 + 30 * 60_000);
});

test('v15 → v16 keeps families and shops a player already had, without re-announcing them', () => {
  const old = JSON.parse(JSON.stringify(fresh())); old.version = 15; old.level = 5; old.flags = {};
  old.shopUnlocks = Array.from({ length: 7 }, (_, i) => ({ readyAt: 0, opened: i === 4, notified: i === 4 }));
  const m = migrate(old)!;
  assert.equal(m.version, SAVE_VERSION);
  const fams = cratePoolFor(m).map(e => e.family);
  for (const [f, at] of Object.entries(LEGACY_CRATE_LEVELS)) assert.equal(fams.includes(f as never), at! <= 5, f);
  assert.ok(m.flags[crateFamilyFlag('tomatoFarm')], 'tomato (old level 5) stays');
  assert.deepEqual(unseenNewFamilies(m), []);
  // The old index 4 was the Stone Oven; it keeps its open state under its new position.
  assert.equal(m.shopUnlocks[6].opened, true); assert.equal(m.shopUnlocks[4].opened, false);
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(m))), m, 'idempotent');
});

test('new product card: shown once per family, never for the level-one starters', () => {
  const s = fresh(); assert.deepEqual(unseenNewFamilies(s), []);
  s.level = 4; assert.deepEqual(unseenNewFamilies(s), ['chicken']);
  const seen = run(s, { type: 'flag', key: newFamilySeenFlag('chicken') }).s;
  assert.deepEqual(unseenNewFamilies(seen), []);
  seen.level = 6; assert.deepEqual(unseenNewFamilies(seen), ['tomatoFarm']);
});

test('sell table: 1, 3, 9 then a controlled, monotonic curve without overflow', () => {
  assert.deepEqual([1, 2, 3].map(sellValue), [1, 3, 9]);
  const v = (l: number) => sellValue(l);
  assert.ok(v(4) >= 22 && v(4) <= 25); assert.ok(v(5) >= 50 && v(5) <= 60); assert.ok(v(6) >= 120 && v(6) <= 150);
  assert.ok(v(7) >= 280 && v(7) <= 350); assert.ok(v(8) >= 800 && v(8) <= 1000); assert.ok(v(9) >= 1700 && v(9) <= 2000);
  assert.ok(v(10) >= 3000 && v(10) <= 4000);
  for (let l = 2; l <= 30; l++) { assert.ok(v(l) > v(l - 1)); if (l > 10) assert.ok(v(l) / v(l - 1) <= 1.36, `growth at ${l}`); assert.ok(Number.isSafeInteger(v(l))); }
  const maxLevel = Math.max(...FAMILIES.map(f => f.levels));
  assert.ok(v(maxLevel) <= 4000, 'no current item sells for more than 4,000');
});

test('the sell command, the Sell label and order rewards use the same price', () => {
  for (const l of [1, 3, 5, 8, 10]) {
    const s = blank(); put(s, 0, `wood:${l}`);
    const r = run(s, { type: 'sell', cell: 0 });
    assert.equal(r.s.leaves - s.leaves, sellValue(l));
  }
  const s = fresh(); s.level = 15; s.quests.done.push('r1_garden1'); s.orders = []; fillOrders(s, 3);
  for (const o of s.orders) {
    const value = o.items.reduce((n, it) => n + sellValue(parseItem(it.item).l) * it.n, 0);
    const expected = Math.round(value * BALANCE.orders.multiplier * (o.special ? BALANCE.orders.specialBonus : 1)) + 4;
    assert.equal(o.leaves, expected);
  }
});

test('collection rewards grow with level and rarity, never fall below the old reward, pay once', () => {
  for (const k of collectibleKeys()) assert.ok(collectionReward(k).coins >= legacyCollectionReward(k), k);
  for (const f of FAMILIES) for (let l = 2; l <= f.levels; l++) if (!['coin', 'starCoin', 'energyOrb'].includes(f.id)) assert.ok(collectionReward(`${f.id}:${l}`).coins > collectionReward(`${f.id}:${l - 1}`).coins, `${f.id}:${l}`);
  assert.ok(collectionReward('wood:7').coins > 2 * collectionReward('wood:5').coins);
  const s = fresh(); s.discovered.push('wood:7');
  const once = run(s, { type: 'claimCollection', item: 'wood:7' }).s;
  assert.equal(once.leaves - s.leaves, collectionReward('wood:7').coins);
  assert.equal(run(once, { type: 'claimCollection', item: 'wood:7' }).s.leaves, once.leaves);
});

test('achievement gold follows effort inside each goal family', () => {
  const families: Record<string, string[]> = { merge: ['merge10', 'merge100', 'merge500', 'merge2000'], puzzle: ['puzzle1', 'puzzle10', 'puzzle40', 'puzzle80'], discover: ['discover20', 'discover50', 'discover100'], orders: ['orders25', 'orders200'], region: ['region1', 'region3', 'region5', 'region7'] };
  for (const ids of Object.values(families)) for (let i = 1; i < ids.length; i++) {
    const a = ACHIEVEMENTS.find(x => x.id === ids[i - 1])!, b = ACHIEVEMENTS.find(x => x.id === ids[i])!;
    assert.ok(b.coins > a.coins, `${b.id} pays more than ${a.id}`);
  }
  assert.ok(ACHIEVEMENTS.find(x => x.id === 'merge10')!.coins <= 20, 'trivial goals stay small');
  assert.deepEqual(ACHIEVEMENT_STAGES.map(x => x.multiplier), [1, 2, 4]);
});

test('Battle Pass first purchase: 300 BP XP, once; developer grants and denied purchases never count', () => {
  const task = SEASON_TASKS.find(t => t.id === 'season:purchase')!;
  assert.equal(task.xp, 300); assert.equal(task.label, 'İlk Alışverişini Yap');
  const granted = applyDevGrant(fresh(), { currency: 'gold', amount: 1000 }, T0, true)!;
  assert.equal(granted.freeSeason.progress['season:purchase'], 0);
  const poor = fresh(); poor.leaves = 0;
  assert.equal(apply(poor, { type: 'buyCrateCardPack', requestId: 'x' }, T0).state.freeSeason.progress['season:purchase'], 0);
  let s = fresh(); s.leaves = 3000;
  s = apply(s, { type: 'buyCrateCardPack', requestId: 'a' }, T0).state;
  s = apply(s, { type: 'claimSeasonTask', id: 'season:purchase' }, T0).state;
  s = apply(s, { type: 'buyCrateCardPack', requestId: 'b' }, T0).state;
  s = apply(s, { type: 'claimSeasonTask', id: 'season:purchase' }, T0).state;
  assert.equal(s.freeSeason.xp, 300);
  assert.equal(s.xp, 0, 'player XP is untouched');
});
