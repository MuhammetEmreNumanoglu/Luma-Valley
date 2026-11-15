import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { apply } from '../src/engine/commands';
import { decode, encode } from '../src/persistence/save';
import { fresh, T0 } from './helpers';

test('paid rewards are saved before the reveal and duplicate reveal taps never grant cards', () => {
  let s=fresh(); s.starTokens=200;
  s=apply(s,{type:'buyCardPack',id:'winter',requestId:'pack-1'},T0).state;
  assert.equal(s.themeCards.winter,2); assert.equal(s.starTokens,120); assert.equal(s.cardReveals[0].shown,0); assert.equal(s.cardReveals[0].total,5); assert.equal(s.energy,110); assert.equal(s.crate.charges,52);
  s=apply(s,{type:'advanceCardReveal',id:'pack-1',expectedShown:0},T0).state;
  assert.equal(s.cardReveals[0].shown,1); assert.equal(s.themeCards.winter,2);
  assert.equal(apply(s,{type:'advanceCardReveal',id:'pack-1',expectedShown:0},T0).state,s);
  s=decode(encode(s,1,T0))!.state; assert.equal(s.cardReveals[0].shown,1);
  s=apply(s,{type:'advanceCardReveal',id:'pack-1',expectedShown:1},T0).state;
  assert.equal(s.cardReveals[0].shown,2); assert.equal(s.themeCards.winter,2);
  assert.deepEqual(s.cardReveals[0].extras?.map(x=>x.kind),['energy','crate','crate']);
  for (let i=2;i<5;i++) s=apply(s,{type:'advanceCardReveal',id:'pack-1',expectedShown:i},T0).state;
  assert.equal(s.cardReveals[0].shown,5); assert.equal(s.energy,110); assert.equal(s.crate.charges,52);
  s=apply(s,{type:'finishCardReveal',id:'pack-1'},T0).state;
  assert.equal(s.cardReveals.length,0); assert.equal(s.starTokens,120);
});
test('closing a reveal early never removes rewards and crate outcomes are saved once', () => {
  let s=fresh();s.crateCards=1;
  const result=apply(s,{type:'openCrateCard',requestId:'crate-1'},T0);s=result.state;
  const reward=result.events.find(e=>e.type==='crateCardReward');assert.ok(reward && reward.type==='crateCardReward');
  const paid=s.crate.charges;assert.equal(s.cardReveals[0].crates,reward.crates);
  s=decode(encode(s,1,T0))!.state;assert.equal(s.crate.charges,paid);
  s=apply(s,{type:'finishCardReveal',id:'crate-1'},T0).state;
  assert.equal(s.crate.charges,paid);assert.equal(s.crateCards,0);assert.equal(s.cardReveals.length,0);
});

test('pack rewards do not charge or lose items when a wallet is full', () => {
  const s=fresh(); s.starTokens=100; s.energy=995;
  assert.equal(apply(s,{type:'buyCardPack',id:'winter',requestId:'full'},T0).state,s);
  assert.equal(s.starTokens,100); assert.equal(s.themeCards.winter,0);
});
