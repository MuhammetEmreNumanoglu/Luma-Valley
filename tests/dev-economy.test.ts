import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { applyDevGrant } from '../src/engine/devEconomy';
import { ensureDevBackup, restoreDevBackup } from '../src/persistence/devBackup';
import { SaveStore } from '../src/persistence/storage';
import { decode, encode } from '../src/persistence/save';
import { fresh, T0 } from './helpers';

const memory = () => { const data = new Map<string,string>(); return { data, getItem: async (k:string) => data.get(k) ?? null, setItem: async (k:string,v:string) => { data.set(k,v); }, removeItem: async (k:string) => { data.delete(k); } }; };
test('test grants use catalog values, persist transaction ids, and refuse production or duplicate grants', () => {
  const s = fresh();
  assert.equal(applyDevGrant(s, {currency:'tokens',amount:10000}, T0, false), null);
  const first = applyDevGrant(s, {currency:'mock',product:'light.3500',transactionId:'unique'}, T0, true)!;
  assert.equal(first.starTokens, s.starTokens+3500);
  const loaded=decode(encode(first,1,T0))!.state;
  assert.equal(applyDevGrant(loaded, {currency:'mock',product:'light.3500',transactionId:'unique'}, T0, true), null);
  assert.equal(applyDevGrant(s, {currency:'mock',product:'worker',transactionId:'x'}, T0, true), null);
  assert.equal(applyDevGrant(s, {currency:'tokens',amount:999999}, T0, true), null);
});
test('verified backups survive failures, restore the original save, and archive test progress', async () => {
  const kv=memory(), store=new SaveStore(kv), before=fresh(); before.starTokens=7;
  await store.save(before,T0); await ensureDevBackup(kv,before,false,T0);
  const after=applyDevGrant(before,{currency:'tokens',amount:10000},T0+1,true)!;
  await store.save(after,T0+1); await ensureDevBackup(kv,after,false,T0+1);
  const restored=await restoreDevBackup(kv,store,false,T0+2);
  assert.equal(restored?.starTokens,7); assert.equal((await new SaveStore(kv).load())?.starTokens,7);
  const archive=[...kv.data.keys()].find(k=>k.includes('.archive.'))!;
  assert.equal(decode(kv.data.get(archive))?.state.starTokens,10007);
  assert.equal(await restoreDevBackup(kv,store,false,T0+3),null);
});
test('a damaged backup fails closed without replacing the test-era save', async () => {
  const kv=memory(), store=new SaveStore(kv), s=fresh(); s.starTokens=23;
  await store.save(s,T0); await ensureDevBackup(kv,s,false,T0);
  kv.data.set('luma.dev.backup.normal.snapshot','corrupt');
  await assert.rejects(restoreDevBackup(kv,store,false,T0+1));
  assert.equal((await store.load())?.starTokens,23);
  assert.equal(kv.data.get('luma.dev.backup.normal.active'),'1');
});

test('all offered development balances and token products use the real active game values', async () => {
  const { MOCK_PRODUCTS } = await import('../src/premium/catalog');
  const base=fresh();
  for(const n of [1000,10000,100000,200000]) assert.equal(applyDevGrant(base,{currency:'gold',amount:n},T0,true)!.leaves,base.leaves+n);
  for(const n of [100,500,1000,10000]) assert.equal(applyDevGrant(base,{currency:'tokens',amount:n},T0,true)!.starTokens,base.starTokens+n);
  base.energy=5;
  for(const n of [25,100]) assert.equal(applyDevGrant(base,{currency:'energy',amount:n},T0,true)!.energy,5+n);
  assert.equal(applyDevGrant(base,{currency:'fill'},T0,true)!.energy,100);
  for(const product of MOCK_PRODUCTS.filter(p=>p.tokens)) assert.equal(applyDevGrant(base,{currency:'mock',product:product.id,transactionId:`test-${product.id}`},T0,true)!.starTokens,base.starTokens+product.tokens!);
});

test('test funds can be spent through the normal cosmetic, cards and convenience commands', async () => {
  const { apply } = await import('../src/engine/commands');
  let s=applyDevGrant(fresh(),{currency:'tokens',amount:10000},T0,true)!;
  s=apply(s,{type:'buyTheme',id:'sakura'},T0).state; assert.equal(s.themes.active,'sakura');
  s=apply(s,{type:'buyTheme',id:'autumn'},T0).state; assert.equal(s.themes.active,'autumn');
  for(const id of ['winter','moonlight','crystal','moonworkshop'] as const) {
    for(let i=0;i<5;i++) s=apply(s,{type:'buyCardPack',id,requestId:`${id}-${i}`},T0).state;
    assert.equal(s.themeCards[id],10);
    s=apply(s,{type:'unlockCardCosmetic',id},T0).state;
  }
  assert.ok(s.themes.owned.includes('winter') && s.themes.owned.includes('moonlight'));
  assert.ok(s.workshopSkin.owned.includes('crystal') && s.workshopSkin.owned.includes('moonlight'));
  s=apply(s,{type:'buyWorkshopSkin',id:'forest'},T0).state; assert.ok(s.workshopSkin.owned.includes('forest'));
  s=apply(s,{type:'buyPremiumDecor',id:'crystal_lamp'},T0).state; assert.ok(s.premiumDecor.owned.includes('crystal_lamp'));
  s.energy=10; s=apply(s,{type:'buyConvenience',id:'energy30',requestId:'energy'},T0).state; assert.equal(s.energy,40);
  const slots=s.inventory.length; s=apply(s,{type:'buyConvenience',id:'slots5',requestId:'slots'},T0).state; assert.equal(s.inventory.length,slots+5);
  s.farmFactories.grocer={recipe:0,readyAt:T0+3600000,payout:10};
  s=apply(s,{type:'buyConvenience',id:'speed15',requestId:'speed',target:{id:'grocer',expectedReadyAt:T0+3600000}},T0).state;
  assert.equal(s.farmFactories.grocer.readyAt,T0+2700000);
});
