// Flowers and fruit end at level 4: harvested there into bouquets / fruit baskets (barn), which the
// grocer turns into coins. Old saves convert higher levels without losing anything.
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { FARM_RECIPES, FARM_YIELD } from '../src/content/farm';
import { FAMILY } from '../src/content/families';
import { QUESTS } from '../src/content/quests';
import { NODES } from '../src/content/valley';
import { SAVE_VERSION } from '../src/engine/state';
import { migrate } from '../src/persistence/save';
import { blank, put, run, T0 } from './helpers';

test('flowers and fruit stop at level 4 and harvest into the barn', () => {
  assert.equal(FAMILY.flower.levels, 4);
  assert.equal(FAMILY.fruit.levels, 4);
  assert.equal(FARM_YIELD['flower:4'].item, 'flowerCrop:1');
  assert.equal(FARM_YIELD['fruit:4'].item, 'fruitCrop:1');
  let s = blank();
  put(s, 10, 'flower:4');
  s = run(s, { type: 'tap', cell: 10 }, T0).s;
  assert.equal(s.board[10].t, 'e');
  assert.equal(s.harvestStock['flowerCrop:1'], FARM_YIELD['flower:4'].n);
});

test('no quest or valley job asks for or pays a flower or fruit above level 4', () => {
  for (const q of QUESTS) for (const r of q.reqs) if (r.kind === 'item') assert.ok(!/^(flower|fruit):([5-9]|\d\d)$/.test(r.item), `${q.id} ${r.item}`);
  for (const n of NODES) if (n.mode === 'jobs') for (const j of n.jobs) for (const o of j.outputs) assert.ok(!/^(flower|fruit):([5-9]|\d\d)$/.test(o.item), `${n.id} ${o.item}`);
});

test('the grocer turns bouquets and fruit baskets into coins and XP, once', () => {
  let s = blank();
  const recipe = FARM_RECIPES.grocer[0];
  s.harvestStock = { 'flowerCrop:1': recipe.inputs[0].count, 'fruitCrop:1': recipe.inputs[1].count + 1 };
  s = run(s, { type: 'startFarmRecipe', factory: 'grocer' }, T0).s;
  assert.equal(s.harvestStock['flowerCrop:1'], 0);
  assert.equal(s.harvestStock['fruitCrop:1'], 1);
  assert.equal(run(s, { type: 'claimFarmReward', factory: 'grocer' }, T0).s, s); // not ready yet
  const before = s.leaves;
  const done = run(s, { type: 'claimFarmReward', factory: 'grocer' }, T0 + recipe.seconds * 1000).s;
  assert.equal(done.leaves, before + recipe.gold);
  assert.equal(done.board.filter((c) => c.t === 'i' && c.k === 'starCoin:1').length + done.rewardStorage.filter((k) => k === 'starCoin:1').length, 1);
  assert.equal(run(done, { type: 'claimFarmReward', factory: 'grocer' }, T0 + recipe.seconds * 1000).s, done);
});

test('v5 → v6: higher flowers and fruit become barn goods; nothing is dropped', () => {
  const s = blank();
  const raw = JSON.parse(JSON.stringify(s));
  raw.version = 5;
  raw.board[3] = { t: 'i', k: 'flower:6' };
  raw.board[4] = { t: 'i', k: 'flower:3' };
  raw.inventory[0] = 'fruit:5';
  raw.rewardStorage = ['flower:9', 'wood:2'];
  raw.orders = [{ id: 'o', giver: 'mira', items: [{ item: 'fruit:7', n: 1 }], leaves: 5, xp: 1, special: false }];
  const m = migrate(raw)!;
  assert.equal(m.version, SAVE_VERSION);
  assert.equal(m.board[3].t, 'e');
  assert.deepEqual(m.board[4], { t: 'i', k: 'flower:3' });
  assert.equal(m.inventory[0], null);
  assert.deepEqual(m.rewardStorage, ['wood:2']);
  assert.equal(m.harvestStock['flowerCrop:1'], 2 * 3 + 2 * 6);
  assert.equal(m.harvestStock['fruitCrop:1'], 2 * 2);
  assert.deepEqual(m.orders[0].items, [{ item: 'fruitCrop:1', n: 6 }]);
  // Running the migration chain again from v6 changes nothing.
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(m))), m);
});

test('the grocer lets the player pick any offer; every crate harvest good has a buyer', () => {
  const bought = new Set(FARM_RECIPES.grocer.flatMap((r) => r.inputs.map((i) => i.item)));
  for (const y of Object.values(FARM_YIELD)) assert.ok(bought.has(y.item) || y.item === 'wheatCrop:1' || y.item === 'milk:1', `${y.item} has no buyer`);
  let s = blank();
  s.harvestStock = { 'egg:1': FARM_RECIPES.grocer[1].inputs[0].count, 'tomatoCrop:1': FARM_RECIPES.grocer[1].inputs[1].count };
  assert.equal(run(s, { type: 'startFarmRecipe', factory: 'grocer', recipe: 0 }, T0).s, s); // no bouquets
  assert.equal(run(s, { type: 'startFarmRecipe', factory: 'grocer', recipe: 99 }, T0).s, s);
  s = run(s, { type: 'startFarmRecipe', factory: 'grocer', recipe: 1 }, T0).s;
  assert.equal(s.farmFactories.grocer.recipe, 1);
  assert.equal(s.farmFactories.grocer.payout, FARM_RECIPES.grocer[1].gold);
  assert.equal(s.harvestStock['egg:1'], 0);
});

test('shops are hurried with coins only, never with star tokens', () => {
  let s = blank();
  s.harvestStock = { 'flowerCrop:1': 3, 'fruitCrop:1': 3 };
  s.starTokens = 50; s.leaves = 500;
  s = run(s, { type: 'startFarmRecipe', factory: 'grocer', recipe: 0 }, T0).s;
  const base = { type: 'hurry' as const, target: { kind: 'grocer' as const }, maxCost: 10, expectedReadyAt: s.farmFactories.grocer.readyAt, area: 0 };
  assert.equal(run(s, { ...base, maxGold: 0 }, T0).s, s);
  const paid = run(s, { ...base, pay: 'gold', maxGold: 1000 }, T0).s;
  assert.equal(paid.starTokens, 50);
  assert.ok(paid.leaves < 500);
});

test('quests never ask for a harvestable level-4 item or a harvest good (a tap would consume it)', () => {
  const goods = new Set(Object.values(FARM_YIELD).map((y) => y.item));
  for (const q of QUESTS) for (const r of q.reqs) if (r.kind === 'item') {
    assert.ok(!FARM_YIELD[r.item], `${q.id} asks for ${r.item}, which is harvested on tap`);
    assert.ok(!goods.has(r.item), `${q.id} asks for the harvest good ${r.item}`);
  }
});

test('v6 → v7: beans, barley and lentils become grapes, pumpkins and watermelons, same level and count', () => {
  const raw = JSON.parse(JSON.stringify(blank()));
  raw.version = 6;
  raw.board[3] = { t: 'i', k: 'beanFarm:3' };
  raw.board[4] = { t: 'i', k: 'lentilFarm:4' };
  raw.inventory[0] = 'barleyFarm:2';
  raw.harvestStock = { 'beanCrop:1': 4, 'barleyCrop:1': 2, 'milk:1': 1 };
  raw.discovered = ['beanFarm:1', 'flower:1'];
  raw.collected = ['beanFarm:1'];
  const m = migrate(raw)!;
  assert.equal(m.version, SAVE_VERSION);
  assert.deepEqual(m.board[3], { t: 'i', k: 'grapeFarm:3' });
  assert.deepEqual(m.board[4], { t: 'i', k: 'melonFarm:4' });
  assert.equal(m.inventory[0], 'pumpkinFarm:2');
  assert.equal(m.harvestStock['grapeCrop:1'], 4);
  assert.equal(m.harvestStock['pumpkinCrop:1'], 2);
  assert.equal(m.harvestStock['milk:1'], 1);
  assert.ok(m.discovered.includes('grapeFarm:1') && m.collected.includes('grapeFarm:1'));
  assert.ok(!JSON.stringify(m).match(/bean|barley|lentil/));
});
