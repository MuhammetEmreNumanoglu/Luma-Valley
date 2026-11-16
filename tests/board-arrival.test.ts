// Items placed on the board from outside report the real target cell and where they came from,
// exactly once per item, so the UI can fly each one to its own cell.
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { isShopCell, SHOP_ROW_START } from '../src/engine/workshopSlots';
import type { GameEvent } from '../src/engine/types';
import { blank, put, run, T0 } from './helpers';

const gifts = (ev: GameEvent[]) => ev.filter((e): e is Extract<GameEvent, { type: 'gift' }> => e.type === 'gift');
function check(s: ReturnType<typeof blank>, ev: GameEvent[], origin: string) {
  const g = gifts(ev);
  for (const e of g) {
    assert.equal(e.origin, origin);
    const cellAt = s.board[e.at];
    assert.ok(cellAt.t === 'i' && cellAt.k === e.item, 'event points at the real item');
  }
  assert.equal(new Set(g.map((e) => e.at)).size, g.length, 'one cell per item');
  return g;
}

test('one item from storage lands on the cell the event names', () => {
  let s = blank(); s.rewardStorage = ['wood:1'];
  const r = run(s, { type: 'retrieveReward', slot: 0 }); s = r.s;
  assert.equal(check(s, r.ev, 'storage').length, 1);
  assert.equal(s.rewardStorage.length, 0);
});

test('five items from storage get five different cells and five events, no duplicates', () => {
  let s = blank(); s.rewardStorage = ['wood:1', 'wood:1', 'wood:1', 'cow:1', 'stone:1'];
  const r = run(s, { type: 'retrieveAllRewards' }); s = r.s;
  assert.equal(check(s, r.ev, 'storage').length, 5);
  assert.equal(s.board.filter((c) => c.t === 'i').length, 5);
});

test('rapid taps: each retrieve is its own item; nothing doubles', () => {
  let s = blank(); s.rewardStorage = ['wood:1', 'wood:1', 'wood:1'];
  const cells: number[] = [];
  for (let i = 0; i < 6; i++) { const r = run(s, { type: 'retrieveReward', slot: 0 }, T0 + i); s = r.s; cells.push(...gifts(r.ev).map((e) => e.at)); }
  assert.equal(cells.length, 3); assert.equal(new Set(cells).size, 3);
  assert.equal(s.board.filter((c) => c.t === 'i' && c.k === 'wood:1').length, 3);
});

test('the last free cell, a full board, the bag and the crate', () => {
  let s = blank();
  const last = 12;
  s.board.forEach((_, i) => { if (i !== last && !isShopCell(i)) put(s, i, 'stone:1'); });
  s.rewardStorage = ['wood:1', 'wood:2'];
  let r = run(s, { type: 'retrieveReward', slot: 0 }); s = r.s;
  assert.equal(check(s, r.ev, 'storage')[0].at, last);
  r = run(s, { type: 'retrieveReward', slot: 0 });
  assert.equal(r.s, s, 'full board: nothing changes'); assert.ok(r.ev.some((e) => e.type === 'denied' && e.reason === 'boardFull'));
  let b = blank(); b.inventory[0] = 'cow:2';
  r = run(b, { type: 'retrieve', slot: 0 }); b = r.s;
  assert.equal(check(b, r.ev, 'bag').length, 1);
  let c = blank(); c.crate.charges = 2;
  r = run(c, { type: 'openCrate' }); c = r.s;
  assert.equal(check(c, r.ev, 'crate').length, 1);
});

test('a production reward flies from its shop', () => {
  let s = blank(); s.farmFactories.merchant = { ...s.farmFactories.merchant, readyAt: T0, payout: 1, rewardKind: 'starCoin', rewardXp: 0 } as never;
  const r = run(s, { type: 'claimFarmReward', factory: 'merchant' }, T0 + 1); s = r.s;
  const g = check(s, r.ev, 'shop');
  assert.equal(g.length, 1); assert.equal(g[0].from, SHOP_ROW_START);
});
