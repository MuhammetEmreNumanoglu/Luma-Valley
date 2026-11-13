import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { blank, fresh, run, T0 } from './helpers';
import { decode, encode, migrate } from '../src/persistence/save';
import { DAY } from '../src/core/time';
import { seasonNotices, seasonTasks } from '../src/premium/season';
import { shopOpen, farmRecipeUnlocked } from '../src/engine/shops';
import { FARM_RECIPES, traderRecipe } from '../src/content/farm';
import { canMakeItem } from '../src/engine/reachability';

test('new player starts with 40 normal plus credited 10 daily; no same-day duplicate', () => {
 const s=fresh(); assert.equal(s.crate.charges,50); assert.deepEqual(s.crate.wallet,{normal:40,daily:10,bonus:0,energy:0,legacy:0});
 assert.equal(run(s,{type:'claimDailyCrates'}).s.crate.charges,50);
 const next=run(s,{type:'claimDailyCrates'},T0+DAY).s; assert.equal(next.crate.charges,60); assert.equal(next.crate.wallet?.daily,20);
});
test('v13 balance of 210 is preserved as unknown provenance and does not refill', () => {
 const old=JSON.parse(JSON.stringify(fresh())); old.version=13; old.crate.charges=210; delete old.crate.wallet;
 const s=migrate(old); assert.ok(s); assert.equal(s.crate.charges,210); assert.equal(s.crate.wallet?.legacy,210);
 const later=run(s,{type:'tick'},T0+DAY).s; assert.equal(later.crate.charges,210); assert.equal(decode(encode(later,1,T0+DAY))!.state.crate.wallet?.legacy,210);
});
test('normal refill stops at 40 total and bonus does not get overwritten', () => {
 const s=blank(); s.crate.charges=0; s.crate.wallet={normal:0,daily:0,bonus:0,energy:0,legacy:0}; s.crate.anchor=T0;
 const full=run(s,{type:'tick'},T0+180*60000).s; assert.equal(full.crate.charges,40); assert.equal(full.crate.wallet?.normal,40);
 const bonus=run(full,{type:'claimDailyCrates'},T0+DAY).s; assert.equal(bonus.crate.charges,50); assert.equal(bonus.crate.wallet?.daily,10);
 assert.equal(run(bonus,{type:'tick'},T0+2*DAY).s.crate.charges,50);
});
test('shop requests only achievable initial ingredients', () => {
 const s=fresh(); s.level=1; for (const input of traderRecipe(s.level).inputs) assert.ok(canMakeItem(s,input.item));
 assert.ok(!traderRecipe(s.level).inputs.some(x=>x.item==='wheatCrop:1'));
 assert.equal(shopOpen(s,1),false); assert.equal(farmRecipeUnlocked(s,FARM_RECIPES.grocer[1]),false);
 s.level=12; assert.equal(shopOpen(s,1),true); assert.equal(farmRecipeUnlocked(s,FARM_RECIPES.grocer[2]),false);
});
test('notices persist until each task or free reward is claimed', () => {
 const s=fresh(), daily=seasonTasks(s.freeSeason).filter(t=>t.id.startsWith('daily:')).slice(0,2);
 for (const t of daily) s.freeSeason.progress[t.id]=t.target;
 s.freeSeason.xp=100; assert.equal(seasonNotices(s.freeSeason,s.energy).daily,2); assert.equal(seasonNotices(s.freeSeason,s.energy).levels,1);
 let next=run(s,{type:'claimSeasonTask',id:daily[0].id}).s; assert.equal(seasonNotices(next.freeSeason,next.energy).daily,1);
 next=decode(encode(next,1,T0))!.state; assert.equal(seasonNotices(next.freeSeason,next.energy).daily,1);
 next=run(next,{type:'claimSeasonTask',id:daily[1].id}).s; assert.equal(seasonNotices(next.freeSeason,next.energy).daily,0); assert.equal(seasonNotices(next.freeSeason,next.energy).any,true);
 next=run(next,{type:'claimSeasonReward',level:1}).s; assert.equal(seasonNotices(next.freeSeason,next.energy).any,false);
});

test('normal and development save namespaces remain independent', async () => {
 const { SaveStore } = await import('../src/persistence/storage');
 const data = new Map<string,string>(); const kv={getItem:async(k:string)=>data.get(k)??null,setItem:async(k:string,v:string)=>{data.set(k,v);},removeItem:async(k:string)=>{data.delete(k);}};
 const normal=new SaveStore(kv), dev=new SaveStore(kv,'luma.dev.save'); const a=fresh(); a.starTokens=30; const b=JSON.parse(JSON.stringify(a)); b.starTokens=1030; b.themes.owned.push('sakura');
 await normal.save(a,T0); await dev.save(b,T0); assert.equal((await new SaveStore(kv).load())!.starTokens,30); assert.equal((await new SaveStore(kv,'luma.dev.save').load())!.starTokens,1030);
});


test('unlocked trader and shop recipes have producible ingredients at every level', () => {
 for (let level=1;level<=100;level++) {
  const s=fresh(); s.level=level;
  for (const input of traderRecipe(level).inputs) assert.ok(canMakeItem(s,input.item), `trader level ${level} ${input.item}`);
  for (const recipe of FARM_RECIPES.grocer) if (farmRecipeUnlocked(s,recipe)) for (const input of recipe.inputs) assert.ok(canMakeItem(s,input.item), `grocer level ${level} ${input.item}`);
 }
});

test('weekly and seasonal dots stay until their own rewards are claimed', () => {
 const s=fresh(); const all=seasonTasks(s.freeSeason); const weekly=all.find(x=>x.id.startsWith('weekly:'))!, seasonal=all.find(x=>x.id.startsWith('season:'))!;
 s.freeSeason.progress[weekly.id]=weekly.target; s.freeSeason.progress[seasonal.id]=seasonal.target;
 let n=seasonNotices(s.freeSeason,s.energy); assert.equal(n.weekly,1); assert.equal(n.season,1);
 const first=run(s,{type:'claimSeasonTask',id:weekly.id}).s; n=seasonNotices(first.freeSeason,first.energy); assert.equal(n.weekly,0); assert.equal(n.season,1); assert.equal(n.any,true);
 const second=run(first,{type:'claimSeasonTask',id:seasonal.id}).s; n=seasonNotices(second.freeSeason,second.energy); assert.equal(n.season,0); assert.equal(n.levels,4); // XP unlocks unclaimed free levels
});

test('profile save reports write errors and can retry without clearing the other profile', async () => {
 const { SaveStore } = await import('../src/persistence/storage'); const data=new Map<string,string>(); let fail=true;
 const kv={getItem:async(k:string)=>data.get(k)??null,setItem:async(k:string,v:string)=>{if(fail){fail=false;throw new Error('storage failed');}data.set(k,v);},removeItem:async(k:string)=>{data.delete(k);}};
 const store=new SaveStore(kv,'luma.dev.save'); const s=fresh(); await assert.rejects(store.save(s,T0)); await store.save(s,T0); assert.equal((await new SaveStore(kv,'luma.dev.save').load())?.level,s.level);
});

test('higher trader tier reserves XP and preserves an active order through a level change and reload', () => {
 const s=blank(); s.level=9; s.harvestStock={'flowerCrop:1':2,'fruitCrop:1':2};
 const started=run(s,{type:'startFarmRecipe',factory:'merchant'},T0).s;
 assert.equal(started.farmFactories.merchant.readyAt,T0+60000); assert.equal(started.farmFactories.merchant.rewardXp,2);
 started.level=12; const restored=decode(encode(started,1,T0))!.state;
 const claimed=run(restored,{type:'claimFarmReward',factory:'merchant'},T0+60000).s;
 assert.equal(claimed.xp,2); assert.ok(claimed.board.some(c=>c.t==='i'&&c.k==='starCoin:1'));
 assert.equal(run(claimed,{type:'claimFarmReward',factory:'merchant'},T0+60000).s.xp,2);
});
