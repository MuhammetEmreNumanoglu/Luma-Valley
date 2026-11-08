// Deliberate merging (v5): drop an item ON an identical item; three merge (the dragged one, the
// target and the nearest identical item connected to the target). Adjacency never merges.
import assert from 'node:assert/strict';
import { test } from 'node:test';

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
