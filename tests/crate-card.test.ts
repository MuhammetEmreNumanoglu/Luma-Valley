import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apply } from '../src/engine/commands';
import { nextRandom } from '../src/core/rng';
import { decode, encode } from '../src/persistence/save';
import { CRATE_CARD_PACK } from '../src/premium/cards';
import { fresh, T0 } from './helpers';

test('gold pack pays its saved random crate reward once, without granting a second card', () => {
  const s=fresh(); s.leaves=1000; const [roll]=nextRandom(s.rng);
  const n=CRATE_CARD_PACK.min + Math.floor(roll*(CRATE_CARD_PACK.max-CRATE_CARD_PACK.min+1));
  const a=apply(s,{type:'buyCrateCardPack',requestId:'p1'},T0).state;
  assert.equal(a.leaves,0); assert.equal(a.crateCards,0); assert.equal(a.crate.charges,s.crate.charges+n);
  assert.equal(a.cardReveals[0].crates,n); assert.equal(a.cardReveals[0].kind,'crateReward');
  const b=decode(encode(a,1,T0))!.state;
  assert.equal(apply(b,{type:'buyCrateCardPack',requestId:'p1'},T0).state.crate.charges,b.crate.charges);
  assert.equal(apply(fresh(),{type:'buyCrateCardPack',requestId:'poor'},T0).state.crateCards,0);
  const full=fresh(); full.leaves=1000; full.crate.charges=900;
  assert.equal(apply(full,{type:'buyCrateCardPack',requestId:'full'},T0).state,full);
});
test('crate card consumes once, uses uniform 5–100 outcome and pays the real crate wallet', () => {
  const s=fresh(); s.crateCards=1; const [roll] = nextRandom(s.rng);
  const n=CRATE_CARD_PACK.min+Math.floor(roll*(CRATE_CARD_PACK.max-CRATE_CARD_PACK.min+1));
  const out=apply(s,{type:'openCrateCard',requestId:'c1'},T0);
  assert.equal(out.state.crate.charges,s.crate.charges+n); assert.equal(out.state.crateCards,0);
  assert.ok(out.events.some(e=>e.type==='crateCardReward' && e.crates===n));
  const loaded=decode(encode(out.state,1,T0))!.state;
  assert.equal(apply(loaded,{type:'openCrateCard',requestId:'c1'},T0).state.crate.charges,loaded.crate.charges);
});
test('insufficient capacity does not consume the card, advance randomness, or pay a partial reward', () => {
  const s=fresh(); s.crateCards=1; s.crate.charges=900;
  const out=apply(s,{type:'openCrateCard',requestId:'full'},T0);
  assert.equal(out.state,s); assert.equal(out.state.rng,s.rng); assert.equal(s.crateCards,1);
});
test('the minimum and maximum advertised outcomes are both attainable', () => {
  for (const [target, predicate] of [[5, (r:number) => r < 1/96], [100, (r:number) => r >= 95/96]] as const) {
    const seed=Array.from({length:10000},(_,i)=>i).find(i=>predicate(nextRandom(i)[0])); assert.notEqual(seed,undefined);
    const s=fresh(); s.rng=seed!; s.crateCards=1;
    const result=apply(s,{type:'openCrateCard',requestId:`edge-${target}`},T0);
    assert.ok(result.events.some(e=>e.type==='crateCardReward' && e.crates===target));
  }
});
