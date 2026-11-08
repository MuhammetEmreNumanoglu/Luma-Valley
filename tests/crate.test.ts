import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { blank, run, T0 } from './helpers';
import { migrate } from '../src/persistence/save';
import { localDay } from '../src/core/time';
import { addXp } from '../src/engine/state';
import type { GameEvent } from '../src/engine/types';

test('a crate drop costs no energy and starts every new game with forty openings', () => {
  const s = blank(2);
  assert.equal(s.crate.charges, 40);
  const first = run(s, { type: 'openCrate' });
  assert.equal(first.s.energy, s.energy);
  assert.equal(first.s.crate.charges, 39);
  assert.ok(first.s.board.some((c) => c.t === 'i'));
});

test('crate rolls are independent rather than following a protected starter sequence', () => {
  const a = blank(3);
  const b = blank(3);
  a.crate.opens = 0;
  b.crate.opens = 99;
  assert.deepEqual(run(a, { type: 'openCrate' }).s.board, run(b, { type: 'openCrate' }).s.board);
});

test('daily crate claim, energy exchange, and level rewards are additive and idempotent', () => {
  let s = blank();
  s.crate.charges = 0;
  s = run(s, { type: 'claimDailyCrates' }).s;
  assert.equal(s.crate.charges, 10);
  assert.equal(run(s, { type: 'claimDailyCrates' }, T0 + 1).s.crate.charges, 10);
  while (s.crate.charges) s = run(s, { type: 'openCrate' }).s;
  s.energy = 50;
  s = run(s, { type: 'buyCrates' }).s;
  assert.equal(s.crate.charges, 25);
  assert.equal(s.energy, 0);
  s.xp = 1_000;
  s.board[0] = { t: 'i', k: 'flower:1' };
  s.board[1] = { t: 'i', k: 'flower:1' };
  s.board[3] = { t: 'i', k: 'flower:1' };
  const levelled = run(s, { type: 'move', from: 3, to: 1 }, T0 + 2).s;
  assert.ok(levelled.crate.charges >= 45);
});

test('old saves gain the crate and a migrated save retains its board', () => {
  const s = blank();
  s.board[0] = { t: 'i', k: 'flower:2' };
  const old = { ...s, version: 1 } as Partial<typeof s>;
  delete old.crate;
  const loaded = migrate(old)!;
  assert.deepEqual(loaded.board[0], s.board[0]);
  assert.ok(loaded.crate.charges >= 40);
});

test('a v2 player with no crates receives an available daily claim after migration', () => {
  const s = blank();
  s.version = 2;
  s.crate.charges = 0;
  s.crate.refillDay = localDay(T0, s.tzOffset);
  const loaded = migrate(s)!;
  assert.equal(loaded.version, 5);
  assert.equal(loaded.crate.refillDay, -1);
  assert.equal(run(loaded, { type: 'claimDailyCrates' }).s.crate.charges, 10);
});

test('level celebration reports the actual crate grant, including the storage cap', () => {
  const s = blank();
  s.crate.charges = 995;
  const events: GameEvent[] = [];
  addXp(s, 10000, T0, events);
  const levels = events.filter((event) => event.type === 'levelUp');
  assert.ok(levels.length > 1);
  assert.equal(levels[0].crates, 4);
  assert.equal(levels.slice(1).reduce((total, event) => total + event.crates, 0), 0);
  assert.equal(s.crate.charges, 999);
  const back = migrate(s)!;
  assert.equal(back.crate.charges, 999);
});
