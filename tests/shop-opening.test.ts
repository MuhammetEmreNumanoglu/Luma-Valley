import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { apply } from '../src/engine/commands';
import { decode, encode, migrate } from '../src/persistence/save';
import { SHOP_OPEN_MS, SHOP_RECIPES, shopEligible, shopOpen, shopStatus } from '../src/engine/shops';
import { FARM_RECIPES } from '../src/content/farm';
import { fresh, T0 } from './helpers';

test('shop opening starts after requirements, survives offline and rejects early trade', () => {
  let s=fresh(); s.harvestStock={'milk:1':2,'wheatCrop:1':2};
  assert.equal(shopStatus(s,0,T0).status,'unlocking');
  assert.equal(apply(s,{type:'startFarmRecipe',factory:'merchant'},T0+119999).state,s);
  s=decode(encode(s,1,T0))!.state;
  s=apply(s,{type:'tick'},T0+120000).state;
  assert.equal(shopOpen(s,0),true); assert.equal(s.shopUnlocks[0].notified,false);
  s=apply(s,{type:'ackShopOpening',shop:0},T0+120000).state;
  assert.equal(s.shopUnlocks[0].notified,true);
  assert.equal(apply(s,{type:'ackShopOpening',shop:0},T0+120000).state,s);
  s=decode(encode(s,2,T0+120000))!.state;
  assert.equal(s.shopUnlocks[0].notified,true);
  assert.ok(apply(s,{type:'startFarmRecipe',factory:'merchant'},T0+120000).state.farmFactories.merchant.readyAt > 0);
});

test('each of seven timers starts only when eligible and persists through clock rollback', () => {
  let s=fresh(); s.level=15;
  for (const jobs of Object.values(SHOP_RECIPES)) for (const i of jobs) for (const input of FARM_RECIPES.grocer[i].inputs) s.harvestStock[input.item]=Math.max(input.count,s.harvestStock[input.item]??0);
  s=apply(s,{type:'tick'},T0).state;
  for (let i=0;i<7;i++) { assert.ok(shopEligible(s,i)); assert.equal(s.shopUnlocks[i].readyAt,T0+SHOP_OPEN_MS[i]); }
  s=decode(encode(s,1,T0))!.state;
  s=apply(s,{type:'tick'},T0-300000).state;
  assert.ok(s.shopUnlocks.every(x=>!x.opened));
  s=apply(s,{type:'tick'},T0+SHOP_OPEN_MS[6]-1).state; assert.equal(shopOpen(s,6),false);
  s=apply(s,{type:'tick'},T0+SHOP_OPEN_MS[6]).state; assert.ok(s.shopUnlocks.every(x=>x.opened));
});

test('legacy accessible shops and active orders are never re-locked by migration', () => {
  const old=JSON.parse(JSON.stringify(fresh())); delete old.shopUnlocks; old.level=1;
  old.farmFactories.grocer={recipe:3,readyAt:T0+100000,payout:90};
  const migrated=migrate(old)!;
  assert.equal(shopOpen(migrated,0),true); assert.equal(shopOpen(migrated,5),true);
  assert.equal(migrated.farmFactories.grocer.payout,90);
  assert.equal(migrated.shopUnlocks[0].notified,true); assert.equal(migrated.shopUnlocks[6].opened,false);
});
