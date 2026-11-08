// Workshop resource obstacles. The big rock is specified exactly, so it is tested exactly.
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { nextTierLevel, RESOURCES, RESOURCE_KINDS, resourceTier, SUPPLY, type ResourceKind } from '../src/content/resources';
import { kindUnlock, makeResource } from '../src/engine/resources';
import type { GameState } from '../src/engine/types';
import { decode, encode } from '../src/persistence/save';
import { blank, put, run, T0 } from './helpers';

const MIN = 60_000;
const count = (s: GameState, key: string) => s.board.filter((c) => c.t === 'i' && c.k === key).length + s.rewardStorage.filter((k) => k === key).length;

function withRock(kind: ResourceKind = 'stone', cell = 24): GameState {
  const s = blank();
  s.energy = 100;
  s.board[cell] = makeResource(kind, 1);
  return s;
}

test('big rock: 5⚡/1 min/5 stone → 10⚡/5 min/8 → 15⚡/10 min/12, then the cell is free', () => {
  let s = withRock();
  let t = T0;
  const plan = [
    { energy: 5, ms: 1 * MIN, stones: 5 },
    { energy: 10, ms: 5 * MIN, stones: 8 },
    { energy: 15, ms: 10 * MIN, stones: 12 },
  ];
  let total = 0;
  for (const [i, p] of plan.entries()) {
    const before = s.energy;
    s = run(s, { type: 'breakResource', cell: 24 }, t).s;
    assert.equal(s.energy, before - p.energy, `stage ${i + 1} costs ${p.energy} energy`);
    assert.equal(run(s, { type: 'breakResource', cell: 24 }, t + 10).s, s, 'a second tap does not charge or restart');
    assert.equal(run(s, { type: 'claimResource', cell: 24 }, t + p.ms - 1).s, s, 'no reward before time');
    s = run(s, { type: 'claimResource', cell: 24 }, t + p.ms).s;
    total += p.stones;
    assert.equal(count(s, 'stone:1'), total, `stage ${i + 1} pays ${p.stones} stone`);
    assert.equal(run(s, { type: 'claimResource', cell: 24 }, t + p.ms + 1).s, s, 'claiming twice pays nothing');
    if (i < 2) assert.deepEqual({ t: s.board[24].t, stage: (s.board[24] as { stage: number }).stage }, { t: 'r', stage: i + 1 }, 'the rock stays on its cell');
    t += p.ms + 1000;
  }
  assert.equal(total, 25);
  assert.deepEqual(s.board[24], { t: 'e' }, 'the third stage frees the cell');
  assert.equal(s.stats.cleared, 1);
  // The freed cell takes ordinary items.
  put(s, 0, 'flower:1');
  assert.deepEqual(run(s, { type: 'move', from: 0, to: 24 }, t).s.board[24], { t: 'i', k: 'flower:1' });
});

test('all five kinds break in three stages, pay their own material and free the cell', () => {
  for (const kind of RESOURCE_KINDS) {
    let s = withRock(kind, 10);
    let t = T0;
    let paid = 0;
    for (let i = 0; i < 3; i++) {
      s.energy = 100;
      s = run(s, { type: 'breakResource', cell: 10 }, t).s;
      t += RESOURCES[kind].stages[i].seconds * 1000;
      s = run(s, { type: 'claimResource', cell: 10 }, t).s;
      paid += RESOURCES[kind].stages[i].yield;
      s.board = s.board.map((c, k) => (k === 10 ? c : c.t === 'i' ? { t: 'e' } : c));
    }
    assert.deepEqual(s.board[10], { t: 'e' }, kind);
    assert.ok(paid > 0);
  }
});

test('a break keeps running while the game is closed (save → reload later → collect)', () => {
  let s = withRock();
  s = run(s, { type: 'breakResource', cell: 24 }, T0).s;
  const loaded = decode(encode(s, 1, T0))!.state;
  const later = run(loaded, { type: 'tick' }, T0 + 3 * 3600_000).s;
  const claimed = run(later, { type: 'claimResource', cell: 24 }, T0 + 3 * 3600_000).s;
  assert.equal(count(claimed, 'stone:1'), 5);
});

test('not enough energy: refused, nothing changes', () => {
  const s = withRock();
  s.energy = 4;
  const r = run(s, { type: 'breakResource', cell: 24 });
  assert.equal(r.s, s);
  assert.ok(r.ev.some((e) => e.type === 'denied' && e.reason === 'noEnergy'));
});

test('a full board never loses the reward: it waits in the reward storage', () => {
  let s = withRock();
  s.board = s.board.map((c, i) => (i === 24 ? c : { t: 'i', k: 'flower:1' }));
  s = run(s, { type: 'breakResource', cell: 24 }).s;
  s = run(s, { type: 'claimResource', cell: 24 }, T0 + MIN).s;
  assert.equal(s.rewardStorage.filter((k) => k === 'stone:1').length, 5);
});

test('ordinary items are never breakable resources', () => {
  const s = blank();
  for (const k of ['chicken:1', 'cow:2', 'flower:3', 'milk:1', 'stone:1']) {
    put(s, 5, k);
    assert.equal(run(s, { type: 'breakResource', cell: 5 }).s, s, k);
  }
});

test('deliveries: placed only on free edge cells, limited by charges; kinds unlock by region', () => {
  let s = blank();
  s.supply = { charges: 2, anchor: T0 };
  put(s, 0, 'flower:1'); // corner occupied: never overwritten
  s = run(s, { type: 'placeResource', kind: 'stone' }).s;
  const placed = s.board.findIndex((c) => c.t === 'r');
  assert.ok(placed > 0);
  assert.deepEqual(s.board[0], { t: 'i', k: 'flower:1' });
  assert.equal(s.supply.charges, 1);
  assert.equal(run(s, { type: 'placeResource', kind: 'crystal' }).s, s, 'crystal needs region 4');
  s.regions = [1, 2, 3, 4];
  s = run(s, { type: 'placeResource', kind: 'crystal' }).s;
  assert.equal(s.supply.charges, 0);
  assert.equal(run(s, { type: 'placeResource', kind: 'wood' }).s, s, 'no charges left');
  const later = run(s, { type: 'tick' }, T0 + SUPPLY.regenMs).s;
  assert.equal(later.supply.charges, 1, 'charges refill over time');
});

test('deliveries never fill a board that already has many obstacles', () => {
  let s = blank();
  s.supply = { charges: SUPPLY.max, anchor: T0 };
  for (let i = 0; i < SUPPLY.perBoard; i++) s.board[30 + i] = makeResource('wood', 1);
  const r = run(s, { type: 'placeResource', kind: 'stone' });
  assert.equal(r.s, s);
  s = r.s;
});

test('clock set back cannot push a running break further than its duration', () => {
  let s = withRock();
  s = run(s, { type: 'breakResource', cell: 24 }, T0 + 10 * MIN).s;
  s = run(s, { type: 'tick' }, T0).s;
  assert.ok((s.board[24] as { readyAt: number }).readyAt <= T0 + MIN);
});

test('workers limit active breaks across areas and persist after reload', () => {
  let s = withRock();
  s.board[25] = makeResource('wood', 1);
  s.workshop.unlocked = [0, 1];
  s.workshop.boards[1][10] = makeResource('stone', 1);
  s = run(s, { type: 'breakResource', cell: 24 }, T0).s;
  assert.equal(run(s, { type: 'breakResource', cell: 25 }, T0).s, s);
  s = run(s, { type: 'switchWorkshop', area: 1 }, T0).s;
  s = decode(encode(s, 1, T0))!.state;
  assert.equal(run(s, { type: 'breakResource', cell: 10 }, T0).s, s);
  s = run(s, { type: 'grantWorkerPurchase', transactionId: 'verified-worker' }, T0).s;
  s = decode(encode(s, 1, T0))!.state;
  assert.equal(s.workerCapacity, 2);
  s = run(s, { type: 'breakResource', cell: 10 }, T0).s;
  assert.ok(s.board[10].t === 'r' && s.board[10].readyAt > T0);
  s = run(s, { type: 'switchWorkshop', area: 0 }, T0).s;
  assert.equal(run(s, { type: 'breakResource', cell: 25 }, T0).s, s);
  assert.equal(run(s, { type: 'grantWorkerPurchase', transactionId: 'verified-worker' }, T0).s, s);
  assert.notEqual(run(s, { type: 'breakResource', cell: 25 }, T0 + MIN).s, s);
});

test('old saves start with one worker', () => {
  const s = withRock();
  delete (s as Partial<GameState>).workerCapacity;
  assert.equal(decode(encode(s, 1, T0))!.state.workerCapacity, 1);
});

test('cancel an unfinished break refunds energy once and frees the worker', () => {
  let s = blank(); s.energy = 50;
  s.board[24] = makeResource('wood', 1);
  s.board[25] = makeResource('stone', 1);
  s = run(s, { type: 'breakResource', cell: 24 }, T0).s;
  assert.equal(s.energy, 46);
  const canceled = run(s, { type: 'cancelResource', cell: 24 }, T0 + 1000).s;
  assert.equal(canceled.energy, 50);
  assert.deepEqual(canceled.board[24], makeResource('wood', 1));
  assert.equal(run(canceled, { type: 'cancelResource', cell: 24 }, T0 + 1000).s, canceled);
  assert.notEqual(run(canceled, { type: 'breakResource', cell: 25 }, T0 + 1000).s, canceled);
  assert.equal(decode(encode(canceled, 1, T0))!.state.energy, 50);
  assert.equal(run(s, { type: 'cancelResource', cell: 24 }, T0 + 60_000).s, s, 'finished jobs cannot be canceled for a refund');
});

test('supply panel: every locked kind names the story quest that opens its region', () => {
  const s = blank();
  s.regions = [1];
  for (const k of RESOURCE_KINDS) {
    const u = kindUnlock(s, k);
    if (RESOURCES[k].region === 1) continue;
    assert.ok(u, `${k} has an unlocking quest`);
    assert.ok(u.quest.rewards.some((r) => r.kind === 'region' && r.n === RESOURCES[k].region));
    assert.ok(u.done <= u.total && u.total >= 1);
  }
  // Ceramic (region 2) is reachable from region 1; crystal (region 4) needs region 3 first.
  assert.equal(kindUnlock(s, 'ceramic')?.reachable, true);
  assert.equal(kindUnlock(s, 'crystal')?.reachable, false);
  // The next material tier is announced at the level where resourceTier rises.
  for (let l = 1; l < 30; l++) {
    const at = nextTierLevel(l);
    if (at === null) assert.equal(resourceTier(l), 4);
    else assert.ok(at > l && resourceTier(at) === resourceTier(l) + 1 && resourceTier(at - 1) === resourceTier(l));
  }
});
