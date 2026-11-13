import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { collectionReward } from '../src/content/progression';
import { SAVE_VERSION } from '../src/engine/state';
import { unclaimedCollection } from '../src/engine/tutorial';
import { decode, encode, migrate } from '../src/persistence/save';
import { blank, put, run, T0 } from './helpers';

test('a first discovery is recorded, shows as unclaimed, and pays exactly once', () => {
  let s = blank();
  put(s, 0, 'flower:1'); put(s, 1, 'flower:1'); put(s, 3, 'flower:1');
  const merged = run(s, { type: 'move', from: 3, to: 1 });
  s = merged.s;
  assert.ok(s.discovered.includes('flower:2'));
  assert.ok(merged.ev.some((e) => e.type === 'discover' && e.item === 'flower:2'));
  assert.equal(unclaimedCollection(s), 2, 'flower:1 (start) and flower:2');
  const coins = s.leaves;
  const r = collectionReward('flower:2');
  s = run(s, { type: 'claimCollection', item: 'flower:2' }).s;
  assert.equal(s.leaves, coins + r.coins);
  assert.ok(s.collected.includes('flower:2'));
  // A double tap or a replay after reload pays nothing.
  assert.equal(run(s, { type: 'claimCollection', item: 'flower:2' }).s, s);
  const reloaded = decode(encode(s, 3, T0))!.state;
  assert.equal(run(reloaded, { type: 'claimCollection', item: 'flower:2' }).s, reloaded);
  assert.equal(unclaimedCollection(reloaded), 1);
});

test('undiscovered items and currency coins cannot be claimed', () => {
  const s = blank();
  assert.equal(run(s, { type: 'claimCollection', item: 'flower:5' }).s, s);
  s.discovered.push('coin:2');
  assert.equal(run(s, { type: 'claimCollection', item: 'coin:2' }).s, s);
});

test('rarer items pay more coins, recorded once in the ledger', () => {
  assert.ok(collectionReward('wood:2').coins < collectionReward('wood:5').coins);
  assert.ok(collectionReward('wood:5').coins < collectionReward('wood:9').coins);
  const s = blank();
  s.discovered.push('wood:7');
  const r = run(s, { type: 'claimCollection', item: 'wood:7' }).s;
  assert.equal(r.leaves, s.leaves + collectionReward('wood:7').coins);
  assert.ok(r.ledger.some((e) => e.id === 'col:wood:7'));
});

test('v3 → v4 migration keeps progress: gold becomes coins, old discoveries count as collected, brambles open', () => {
  const s = blank();
  const raw = JSON.parse(JSON.stringify(s));
  raw.version = 3;
  raw.leaves = 120;
  raw.workshop.gold = 345;
  raw.discovered = ['flower:1', 'flower:2', 'wood:3', 'coin:2'];
  delete raw.collected;
  delete raw.nodes;
  delete raw.sparks;
  delete raw.tutorial;
  raw.board[5] = { t: 'b', hp: 2 };
  raw.board[6] = { t: 'i', k: 'stone:2' };
  raw.quarry = { stage: 1, readyAt: T0 + 5000, reward: 3 };
  raw.puzzles = { lp01: { stars: 3, bestMoves: 4 }, lp02: { stars: 2, bestMoves: 9 } };
  raw.stats.merges = 12;
  const m = migrate(raw)!;
  assert.equal(m.version, SAVE_VERSION);
  assert.equal(m.leaves, 120 + 345 + 5 * 10, 'gold folded in (v4), then sparks converted (v5)');
  assert.deepEqual(m.collected.sort(), ['flower:1', 'flower:2', 'wood:3']);
  assert.deepEqual(m.board[5], { t: 'e' });
  assert.deepEqual(m.board[6], { t: 'i', k: 'stone:2' });
  assert.equal(m.rewardStorage.filter((k) => k === 'stone:1').length, 3, 'the running rock job is paid');
  assert.ok(m.tutorial.done.includes('merge'));
  assert.deepEqual(m.nodes, {});
  assert.ok(!('quarry' in m));
});

test('v4 → v5 migration: tokens and sparks become coins once, clay becomes ceramic, retired valley sources pay out', () => {
  const s = blank();
  const raw = JSON.parse(JSON.stringify(s));
  raw.version = 4;
  raw.leaves = 100;
  raw.tokens = 12;
  raw.sparks = 7;
  delete raw.supply;
  raw.board[0] = { t: 'i', k: 'clay:2' };
  raw.inventory[0] = 'clay:1';
  raw.board[1] = { t: 'i', k: 'chicken:1' };
  raw.nodes = {
    r1_quarry: { built: true, stage: 4, job: 0, readyAt: T0 + 60_000, out: [{ item: 'stone:1', n: 4 }] },
    r2_clay_a: { built: false, stage: 1, job: 1, readyAt: T0 + 1000, out: [{ item: 'clay:1', n: 5 }] },
    r1_greenhouse: { built: true, stage: 2, job: -1, readyAt: 0, out: [] },
  };
  raw.board[60] = { t: 'x' };
  raw.board[53] = { t: 'x' };
  const m = migrate(JSON.parse(JSON.stringify(raw)))!;
  assert.equal(m.version, SAVE_VERSION);
  assert.equal(m.leaves, 100 + 12 * 30 + 7 * 10 + 60, 'tokens ×30, sparks ×10, quarry build refunded');
  assert.ok(!('tokens' in m) && !('sparks' in m));
  assert.deepEqual(m.board[0], { t: 'i', k: 'ceramic:2' });
  assert.equal(m.inventory[0], 'ceramic:1');
  assert.deepEqual(m.board[1], { t: 'i', k: 'chicken:1' }, 'items are never replaced by obstacles');
  assert.equal(m.rewardStorage.filter((k) => k === 'stone:1').length, 4);
  assert.equal(m.rewardStorage.filter((k) => k === 'ceramic:1').length, 5);
  assert.deepEqual(Object.keys(m.nodes), ['r1_greenhouse']);
  assert.ok(m.board.filter((c) => c.t === 'r').length <= 4);
  for (const [i, c] of m.board.entries()) if (c.t === 'r') assert.ok(['x', 'e'].includes(raw.board[i].t), 'obstacles never replace existing items when relocated from the reserved shop row');
  assert.equal(m.supply.charges, 3);
  // Conversions are ledger entries: migrating the result again pays nothing more.
  assert.equal(migrate(JSON.parse(JSON.stringify(m)))!.leaves, m.leaves);
});
