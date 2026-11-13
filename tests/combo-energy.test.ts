import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BALANCE } from '../src/content/balance';
import { nextRandom } from '../src/core/rng';
import { idx } from '../src/engine/board';
import { decode, encode } from '../src/persistence/save';
import { blank, put, run, T0 } from './helpers';

test('a combo awards a persistent mergeable energy item', () => {
  const seed = Array.from({ length: 1000 }, (_, i) => i).find(i => { const [roll, after] = nextRandom(i); return roll < BALANCE.harvestBonusChance && nextRandom(after)[0] < 0.1; })!;
  const s = blank(seed); s.energy = 20;
  put(s, idx(0, 0), 'flower:1'); put(s, idx(1, 0), 'flower:1'); put(s, idx(5, 5), 'flower:1');
  const r = run(s, { type: 'move', from: idx(5, 5), to: idx(1, 0) });
  assert.ok(r.ev.some(e => e.type === 'merge' && e.bonus));
  const index = r.s.board.findIndex(c => c.t === 'i' && c.k === 'energyOrb:1');
  assert.ok(index >= 0);
  const restored = decode(encode(r.s, 1, T0))!.state;
  const collected = run(restored, { type: 'collectCoin', cell: index }).s;
  assert.equal(collected.energy, 30);
  assert.equal(collected.board[index].t, 'e');
  assert.equal(run(collected, { type: 'collectCoin', cell: index }).s, collected);
});

test('energy items combine up to level four and pay increasing energy', () => {
  for (const level of [1, 2, 3, 4]) {
    const s = blank(); s.energy = 0; put(s, 0, `energyOrb:${level}`);
    const collected = run(s, { type: 'collectCoin', cell: 0 }).s;
    assert.equal(collected.energy, 10 * 3 ** (level - 1));
    if (level < 4) {
      const m = blank(1); for (const i of [0, 1, 8]) put(m, i, `energyOrb:${level}`);
      const combined = run(m, { type: 'move', from: 8, to: 1 }).s;
      assert.deepEqual(combined.board[1], { t: 'i', k: `energyOrb:${level + 1}` });
    }
  }
});

test('an energy item is kept when the entire reward cannot fit', () => {
  const s = blank(); s.energy = BALANCE.energy.overflowCap - 5;
  put(s, 0, 'energyOrb:1');
  const result = run(s, { type: 'collectCoin', cell: 0 });
  assert.equal(result.s, s);
  assert.deepEqual(result.s.board[0], { t: 'i', k: 'energyOrb:1' });
});
