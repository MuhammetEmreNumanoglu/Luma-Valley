// Deliberate merging (v5): drop an item ON an identical item; three merge (the dragged one, the
// target and the nearest identical item connected to the target). Adjacency never merges.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BALANCE } from '../src/content/balance';
import { nextRandom } from '../src/core/rng';
import { decode, encode } from '../src/persistence/save';
import { idx, mergeTrio } from '../src/engine/board';
import { blank, fresh, items, put, run } from './helpers';

test('placing a third chick NEXT to two chicks does not merge anything', () => {
  const s = blank();
  put(s, idx(0, 0), 'chicken:1');
  put(s, idx(1, 0), 'chicken:1');
  put(s, idx(5, 5), 'chicken:1');
  const { s: n, ev } = run(s, { type: 'move', from: idx(5, 5), to: idx(2, 0) });
  assert.equal(ev.filter((e) => e.type === 'merge').length, 0);
  assert.deepEqual(items(n), { 'chicken:1': 3 });
});

test('dropping the third chick ON one of the pair merges exactly three into the target cell', () => {
  const s = blank();
  put(s, idx(0, 0), 'chicken:1');
  put(s, idx(1, 0), 'chicken:1');
  put(s, idx(5, 5), 'chicken:1');
  const before = s.stats.merges;
  const { s: n, ev } = run(s, { type: 'move', from: idx(5, 5), to: idx(1, 0) });
  assert.deepEqual(n.board[idx(1, 0)], { t: 'i', k: 'chicken:2' });
  assert.deepEqual(n.board[idx(0, 0)], { t: 'e' });
  assert.deepEqual(n.board[idx(5, 5)], { t: 'e' });
  assert.deepEqual(items(n), { 'chicken:2': 1 });
  const m = ev.find((e) => e.type === 'merge');
  assert.ok(m && m.type === 'merge' && m.count === 3 && m.at === idx(1, 0));
  assert.equal(n.stats.merges, before + 1);
  assert.ok(n.xp > s.xp, 'XP is paid');
  assert.ok(n.discovered.includes('chicken:2'), 'collection records the new level');
});

test('with only two, dropping one on the other changes nothing (no loss, no swap)', () => {
  const s = blank();
  put(s, idx(0, 0), 'flower:1');
  put(s, idx(4, 4), 'flower:1');
  const r = run(s, { type: 'move', from: idx(4, 4), to: idx(0, 0) });
  assert.equal(r.s, s);
});

test('the third item must be connected to the target, never a far-away one', () => {
  const s = blank();
  put(s, idx(0, 0), 'wood:1');
  put(s, idx(6, 8), 'wood:1'); // far away
  put(s, idx(3, 4), 'wood:1');
  assert.equal(mergeTrio(s.board, idx(3, 4), idx(0, 0)), null);
  assert.equal(run(s, { type: 'move', from: idx(3, 4), to: idx(0, 0) }).s, s);
});

test('more than three identical: exactly three are used, deterministically (N,E,S,W from target)', () => {
  const s = blank();
  put(s, idx(3, 3), 'fruit:1'); // target
  put(s, idx(3, 2), 'fruit:1'); // north of target: chosen
  put(s, idx(4, 3), 'fruit:1'); // east: stays
  put(s, idx(0, 8), 'fruit:1'); // dragged
  const { s: n } = run(s, { type: 'move', from: idx(0, 8), to: idx(3, 3) });
  assert.deepEqual(n.board[idx(3, 3)], { t: 'i', k: 'fruit:2' });
  assert.deepEqual(n.board[idx(3, 2)], { t: 'e' });
  assert.deepEqual(n.board[idx(4, 3)], { t: 'i', k: 'fruit:1' });
  assert.deepEqual(items(n), { 'fruit:1': 1, 'fruit:2': 1 });
});

test('no cascade: a new item next to two of its kind does not merge again', () => {
  const s = blank();
  put(s, idx(0, 0), 'stone:1');
  put(s, idx(1, 0), 'stone:1');
  put(s, idx(2, 1), 'stone:2');
  put(s, idx(3, 1), 'stone:2');
  put(s, idx(6, 8), 'stone:1');
  const { s: n, ev } = run(s, { type: 'move', from: idx(6, 8), to: idx(1, 0) });
  assert.equal(ev.filter((e) => e.type === 'merge').length, 1);
  assert.deepEqual(items(n), { 'stone:2': 3 });
});

test('different items or levels never merge: they swap and nothing is lost', () => {
  const s = blank();
  put(s, idx(0, 0), 'chicken:1');
  put(s, idx(1, 0), 'chicken:1');
  put(s, idx(4, 4), 'chicken:2');
  const { s: n } = run(s, { type: 'move', from: idx(4, 4), to: idx(1, 0) });
  assert.deepEqual(items(n), { 'chicken:1': 2, 'chicken:2': 1 });
  assert.deepEqual(n.board[idx(1, 0)], { t: 'i', k: 'chicken:2' });
});

test('invalid drags never lose items: locked cell, resource obstacle, out of range', () => {
  const s = fresh();
  const before = items(s);
  const locked = s.board.findIndex((c) => c.t === 'x');
  const rock = s.board.findIndex((c) => c.t === 'r');
  const item = s.board.findIndex((c) => c.t === 'i');
  for (const to of [locked, rock, -1, 999]) {
    const { s: n } = run(s, { type: 'move', from: item, to });
    assert.deepEqual(items(n), before);
    assert.deepEqual(n.board[rock], s.board[rock]);
  }
  // An obstacle itself cannot be dragged.
  assert.equal(run(s, { type: 'move', from: rock, to: s.board.findIndex((c) => c.t === 'e') }).s, s);
});

test('max level items never merge further', () => {
  const s = blank();
  for (const x of [0, 1]) put(s, idx(x, 0), 'lantern:8');
  put(s, idx(5, 5), 'lantern:8');
  const r = run(s, { type: 'move', from: idx(5, 5), to: idx(1, 0) });
  assert.equal(r.s, s);
});

test('new game: tutorial pair + lone seed merge on drop; four obstacles, no brambles', () => {
  const s = fresh();
  assert.equal(s.board.filter((c) => c.t === 'b').length, 0);
  assert.equal(s.board.filter((c) => c.t === 'r').length, 4);
  const { s: n } = run(s, { type: 'move', from: idx(3, 6), to: idx(3, 4) });
  assert.deepEqual(n.board[idx(3, 4)], { t: 'i', k: 'flower:2' });
});


test('five connected items merge into two upgraded items', () => {
  const s = blank();
  for (const x of [0, 1, 2, 3]) put(s, idx(x, 0), 'flower:1');
  put(s, idx(5, 5), 'flower:1');
  const { s: n, ev } = run(s, { type: 'move', from: idx(5, 5), to: idx(1, 0) });
  assert.deepEqual(items(n), { 'flower:2': 2 });
  assert.equal(n.stats.merge5, 1);
  const m = ev.find((e) => e.type === 'merge');
  assert.ok(m && m.type === 'merge' && m.count === 5 && m.created.length === 2);
});

test('four can be assembled without merging, then a fifth creates two upgrades', () => {
  let s = blank();
  for (const [x, y] of [[0, 0], [2, 0], [4, 0], [6, 0], [6, 6]]) put(s, idx(x, y), 'flower:1');
  for (const [from, to] of [[idx(2, 0), idx(1, 0)], [idx(4, 0), idx(2, 0)], [idx(6, 0), idx(3, 0)]]) {
    const r = run(s, { type: 'move', from, to });
    assert.ok(!r.ev.some((e) => e.type === 'merge'));
    s = r.s;
  }
  const r = run(s, { type: 'move', from: idx(6, 6), to: idx(1, 0) });
  assert.deepEqual(items(r.s), { 'flower:2': 2 });
  assert.equal(r.s.stats.merges, s.stats.merges + 1);
  assert.equal(r.s.stats.familyMerges.flower, (s.stats.familyMerges.flower ?? 0) + 1);
  assert.equal(r.s.stats.merge5, s.stats.merge5 + 1);
});


// Harvestable chains (flower) combo at 30%, other chains (wood) at 25%.
for (const [fam, chance] of [['flower', BALANCE.harvestBonusChance], ['grain', BALANCE.mergeBonusChance]] as const) for (const count of [3, 5]) test(`${count}-item ${fam} merge has a reproducible ${Math.round(chance * 100)}% extra product`, () => {
  const winningSeed = Array.from({ length: 100 }, (_, i) => i).find((seed) => nextRandom(seed)[0] < chance)!;
  const losingSeed = Array.from({ length: 100 }, (_, i) => i).find((seed) => nextRandom(seed)[0] >= chance)!;
  // A roll between the two chances separates them: combo for flowers, none for grain.
  const between = Array.from({ length: 400 }, (_, i) => i).find((seed) => { const r = nextRandom(seed)[0]; return r >= BALANCE.mergeBonusChance && r < BALANCE.harvestBonusChance; })!;
  for (const [seed, bonus] of [[winningSeed, true], [losingSeed, false], [between, fam === 'flower']] as const) {
    const s = blank(seed);
    // Fill all other cells: the bonus must fit into cells freed by the merge.
    s.board = s.board.map(() => ({ t: 'x' as const }));
    for (let x = 0; x < count - 1; x++) put(s, idx(x, 0), `${fam}:1`);
    put(s, idx(6, 8), `${fam}:1`);
    const r = run(s, { type: 'move', from: idx(6, 8), to: idx(1, 0) });
    const event = r.ev.find((e) => e.type === 'merge');
    assert.ok(event && event.type === 'merge');
    assert.equal(event.bonus, bonus);
    assert.equal(event.created.length, (count === 5 ? 2 : 1) + Number(bonus));
    assert.equal(items(r.s)[`${fam}:2`], event.created.length);
    assert.equal(decode(encode(r.s, 1, 100))?.state.rng, r.s.rng);
  }
});
