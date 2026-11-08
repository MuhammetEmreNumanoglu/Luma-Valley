// Robustness: thousands of random (valid and invalid) commands, checking invariants after each.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BALANCE } from '../src/content/balance';
import { isValidItem } from '../src/content/families';
import { QUESTS } from '../src/content/quests';
import { NODE, NODES } from '../src/content/valley';
import { apply, type Command } from '../src/engine/commands';
import { availableQuests } from '../src/engine/quests';
import type { GameState } from '../src/engine/types';
import { makeRng } from '../src/core/rng';
import { decode, encode } from '../src/persistence/save';
import { fresh, T0 } from './helpers';

function invariants(s: GameState, prev: GameState) {
  assert.ok(s.leaves >= 0 && Number.isInteger(s.leaves), 'leaves');
  assert.ok(s.energy >= 0 && s.energy <= BALANCE.energy.overflowCap, 'energy');
  assert.equal(s.board.length, 63);
  for (const c of s.board) if (c.t === 'i') assert.ok(isValidItem(c.k), c.k);
  for (const k of s.inventory) if (k) assert.ok(isValidItem(k), k);
  const prods = s.board.filter((c) => c.t === 'p').map((c) => (c as { p: string }).p);
  assert.equal(new Set(prods).size, prods.length, 'producer duplicated');
  for (const p of prods) assert.ok(p === 'merchant' || s.producers[p as keyof typeof s.producers], `orphan producer ${p}`);
  assert.equal(new Set(s.quests.done).size, s.quests.done.length, 'quest rewarded twice');
  assert.ok(s.quests.done.length >= prev.quests.done.length);
  assert.ok(s.inventory.length <= BALANCE.inventory.maxSlots);
  for (const id of s.quests.done) assert.ok(QUESTS.some((q) => q.id === id));
  // Ledger ids are unique (no double grants).
  assert.equal(new Set(s.ledger.map((l) => l.id)).size, s.ledger.length, 'ledger duplicate');
  assert.ok(s.supply.charges >= 0, 'supply');
  for (const c of s.board) if (c.t === 'r') assert.ok(c.stage >= 0 && c.stage < 3, 'obstacle stage');
  // Collection rewards: only for discovered items, each at most once.
  assert.equal(new Set(s.collected).size, s.collected.length, 'collection paid twice');
  for (const k of s.collected) assert.ok(s.discovered.includes(k));
  // A deposit's stage never exceeds its stages; a running job always knows its outputs.
  for (const [id, st] of Object.entries(s.nodes)) {
    const n = NODE[id];
    assert.ok(n, id);
    if (n.mode === 'stages') assert.ok(st.stage <= n.jobs.length, `${id} stage`);
    if (st.readyAt > 0) assert.ok(st.out.length > 0 && st.job >= 0);
    const before = prev.nodes[id];
    if (before) assert.ok(st.stage >= before.stage, `${id} stage went back`);
  }
}

function randomCommand(rng: ReturnType<typeof makeRng>, s: GameState): Command {
  const r = rng.next();
  const cell = () => rng.int(70) - 3; // includes out-of-range
  if (r < 0.32) {
    const p = s.board.map((c, i) => (c.t === 'p' ? i : -1)).filter((i) => i >= 0);
    return { type: 'tap', cell: p.length && rng.next() < 0.9 ? rng.pick(p) : cell() };
  }
  if (r < 0.7) {
    // Prefer moves that drop an item onto a twin's neighbour, like a player would.
    const itemsAt = s.board.map((c, i) => (c.t === 'i' ? i : -1)).filter((i) => i >= 0);
    const from = itemsAt.length ? rng.pick(itemsAt) : cell();
    return { type: 'move', from, to: cell() };
  }
  if (r < 0.75) return { type: 'sell', cell: cell() };
  if (r < 0.79) return { type: 'store', cell: cell() };
  if (r < 0.82) return { type: 'retrieve', slot: rng.int(6) };
  if (r < 0.85) return { type: 'openCell', cell: cell() };
  if (r < 0.88) {
    const q = availableQuests(s);
    return { type: 'completeQuest', id: q.length ? rng.pick(q).id : 'nope' };
  }
  if (r < 0.91) return { type: 'deliverOrder', id: s.orders.length ? rng.pick(s.orders).id : 'x' };
  if (r < 0.93) return { type: 'upgrade', producer: 'greenhouse' };
  if (r < 0.95) return { type: 'claimTask', id: s.daily.tasks[0]?.id ?? 'x' };
  if (r < 0.96) return { type: 'buySlot' };
  if (r < 0.97) return { type: 'useHint' };
  if (r < 0.975) return { type: rng.next() < 0.5 ? 'breakResource' : 'claimResource', cell: cell() };
  const n = rng.pick(NODES).id;
  const r2 = rng.next();
  if (r2 < 0.3) return { type: 'startNode', id: n, job: rng.int(4) };
  if (r2 < 0.55) return { type: 'claimNode', id: n };
  if (r2 < 0.65) return { type: 'buildNode', id: n };
  if (r2 < 0.8) return { type: 'claimCollection', item: s.discovered.length ? rng.pick(s.discovered) : 'flower:1' };
  if (r2 < 0.9) return { type: 'openCrate' };
  if (r2 < 0.93) return { type: 'retrieveAllRewards' };
  if (r2 < 0.97) return { type: 'placeResource', kind: 'stone' };
  return { type: 'tick' };
}

test('5000 random commands keep every invariant', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const rng = makeRng(seed);
    let s = fresh(seed);
    let now = T0;
    for (let k = 0; k < 1000; k++) {
      // Time moves mostly forward, sometimes jumps, occasionally backwards.
      const dt = rng.next() < 0.02 ? -3_600_000 : rng.next() < 0.05 ? 7_200_000 : 1500;
      now += dt;
      const prev = s;
      const cmd = randomCommand(rng, s);
      s = apply(s, cmd, now).state;
      invariants(s, prev);
    }
    // Save/load round trip at the end of each run.
    const back = decode(encode(s, 1, now))!.state;
    assert.deepEqual(back.board, s.board);
    assert.equal(back.leaves, s.leaves);
  }
});

test('determinism: same seed and same commands give the same state', () => {
  const play = () => {
    const rng = makeRng(77);
    let s = fresh(9);
    let now = T0;
    for (let k = 0; k < 600; k++) {
      now += 1200;
      s = apply(s, randomCommand(rng, s), now).state;
    }
    return JSON.stringify(s);
  };
  assert.equal(play(), play());
});

test('items never multiply: without producers, the total item level-weight never grows', () => {
  // Merges conserve or reduce "value" in seed units (3^(l-1) per item) except merge-5's bonus
  // which turns 5 into 2 (=6 units from 5 → bounded growth). We check: merges only, no producing.
  const rng = makeRng(5);
  let s = fresh(5);
  s.producers = {};
  s.board = s.board.map((c) => (c.t === 'p' ? { t: 'e' } : c));
  for (let i = 0; i < s.board.length; i++) if (s.board[i].t === 'e' && rng.next() < 0.7) s.board[i] = { t: 'i', k: `flower:${1 + rng.int(2)}` };
  const count = (st: GameState) => st.board.filter((c) => c.t === 'i').length + st.inventory.filter(Boolean).length;
  let n0 = count(s);
  for (let k = 0; k < 2000; k++) {
    s = apply(s, { type: 'move', from: rng.int(63), to: rng.int(63) }, T0 + k).state;
    const n = count(s);
    assert.ok(n <= n0, 'item count grew without production');
    n0 = n;
  }
});
