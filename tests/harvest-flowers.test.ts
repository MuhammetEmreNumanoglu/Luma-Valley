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
  assert.equal(s.harvestStock['flowerCrop:1'], 2);
});

test('no quest or valley job asks for or pays a flower or fruit above level 4', () => {
  for (const q of QUESTS) for (const r of q.reqs) if (r.kind === 'item') assert.ok(!/^(flower|fruit):([5-9]|\d\d)$/.test(r.item), `${q.id} ${r.item}`);
  for (const n of NODES) if (n.mode === 'jobs') for (const j of n.jobs) for (const o of j.outputs) assert.ok(!/^(flower|fruit):([5-9]|\d\d)$/.test(o.item), `${n.id} ${o.item}`);
});

test('the grocer turns two bouquets and two fruit baskets into coins and XP, once', () => {
  let s = blank();
  s.harvestStock = { 'flowerCrop:1': 2, 'fruitCrop:1': 3 };
  const recipe = FARM_RECIPES.grocer[0];
  s = run(s, { type: 'startFarmRecipe', factory: 'grocer' }, T0).s;
  assert.equal(s.harvestStock['flowerCrop:1'], 0);
  assert.equal(s.harvestStock['fruitCrop:1'], 1);
  assert.equal(run(s, { type: 'claimFarmReward', factory: 'grocer' }, T0).s, s); // not ready yet
  const before = s.leaves;
  const done = run(s, { type: 'claimFarmReward', factory: 'grocer' }, T0 + recipe.seconds * 1000).s;
  assert.equal(done.leaves, before + recipe.gold);
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
  s.harvestStock = { 'egg:1': 2, 'tomatoCrop:1': 2 };
  assert.equal(run(s, { type: 'startFarmRecipe', factory: 'grocer', recipe: 0 }, T0).s, s); // no bouquets
  assert.equal(run(s, { type: 'startFarmRecipe', factory: 'grocer', recipe: 99 }, T0).s, s);
  s = run(s, { type: 'startFarmRecipe', factory: 'grocer', recipe: 1 }, T0).s;
  assert.equal(s.farmFactories.grocer.recipe, 1);
  assert.equal(s.farmFactories.grocer.payout, FARM_RECIPES.grocer[1].gold);
  assert.equal(s.harvestStock['egg:1'], 0);
});
