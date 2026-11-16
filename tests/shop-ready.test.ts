import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FARM_RECIPES, traderRecipe } from '../src/content/farm';
import { SHOP_NAMES, SHOP_RECIPES, shopStatus } from '../src/engine/shops';
import { makeRng } from '../src/core/rng';
import { blank, run, T0 } from './helpers';

const GOODS = ['milk:1', 'wheatCrop:1', 'egg:1', 'tomatoCrop:1', 'flowerCrop:1', 'fruitCrop:1', 'cornCrop:1', 'grapeCrop:1', 'pumpkinCrop:1', 'melonCrop:1', 'flour:1'];

/** Can the real command start production in this shop right now? */
function canStart(s: ReturnType<typeof blank>, shop: number): boolean {
  if (shop === 0) return run(s, { type: 'startFarmRecipe', factory: 'merchant' }, T0).s !== s;
  return (SHOP_RECIPES[shop] ?? []).some((recipe) => run(s, { type: 'startFarmRecipe', factory: 'grocer', recipe }, T0).s !== s);
}

test('the ready badge (gold gear) shows exactly when the start command would succeed', () => {
  const rng = makeRng(99);
  for (let k = 0; k < 400; k++) {
    const s = blank(k); s.level = 1 + rng.int(20);
    for (let i = 0; i < 7; i++) s.shopUnlocks[i] = { readyAt: 0, opened: rng.next() < 0.8, notified: true };
    s.harvestStock = Object.fromEntries(GOODS.map((g) => [g, rng.int(4)]));
    if (rng.next() < 0.3) s.farmFactories.grocer = { recipe: rng.int(FARM_RECIPES.grocer.length), readyAt: T0 + 60_000, payout: 10 };
    if (rng.next() < 0.2) s.farmFactories.merchant = { recipe: 0, readyAt: T0 + 60_000, payout: 1, rewardKind: 'starCoin' };
    for (let shop = 0; shop < SHOP_NAMES.length; shop++) {
      const st = shopStatus(s, shop, T0).status;
      assert.equal(st === 'available', canStart(s, shop), `case ${k}, shop ${shop}: ${st}`);
    }
  }
});

test('ready → running → complete → re-evaluated after collecting', () => {
  let s = blank(); s.shopUnlocks[0].opened = true;
  for (const x of traderRecipe(1).inputs) s.harvestStock[x.item] = x.count * 2;
  assert.equal(shopStatus(s, 0, T0).status, 'available');
  s = run(s, { type: 'startFarmRecipe', factory: 'merchant' }, T0).s;
  assert.equal(shopStatus(s, 0, T0).status, 'running');
  const done = T0 + traderRecipe(1).seconds * 1000;
  assert.equal(shopStatus(s, 0, done).status, 'complete');
  s = run(s, { type: 'claimFarmReward', factory: 'merchant' }, done).s;
  assert.equal(shopStatus(s, 0, done).status, 'available', 'second batch in stock: ready again');
  s = run(s, { type: 'startFarmRecipe', factory: 'merchant' }, done).s;
  s = run(s, { type: 'claimFarmReward', factory: 'merchant' }, done + traderRecipe(1).seconds * 1000).s;
  assert.equal(shopStatus(s, 0, done).status, 'missing', 'stock used up: no badge');
});
