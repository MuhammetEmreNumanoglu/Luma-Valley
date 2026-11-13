import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { blank, run, T0 } from './helpers';
import { migrate } from '../src/persistence/save';
import { DAY, localDay } from '../src/core/time';
import { decode, encode } from '../src/persistence/save';
import { BALANCE } from '../src/content/balance';
import { addXp, SAVE_VERSION } from '../src/engine/state';
import type { GameEvent } from '../src/engine/types';

test('a crate drop costs no energy and starts every new game with fifty openings', () => {
  const s = blank(2);
  assert.equal(s.crate.charges, 50);
  const first = run(s, { type: 'openCrate' });
  assert.equal(first.s.energy, s.energy);
  assert.equal(first.s.crate.charges, 49);
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
  s.crate.charges = 0; s.crate.refillDay = -1;
  s = run(s, { type: 'claimDailyCrates' }).s;
  assert.equal(s.crate.charges, 10);
  assert.equal(run(s, { type: 'claimDailyCrates' }, T0 + 1).s.crate.charges, 10);
  while (s.crate.charges) s = run(s, { type: 'openCrate' }).s;
  s.energy = 50;
  s = run(s, { type: 'buyCrates', expectedCharges: s.crate.charges }).s;
  assert.equal(s.crate.charges, 10);
  assert.equal(s.energy, 50 - BALANCE.crate.energyPack.cost);
  s.xp = 1_000;
  s.board[0] = { t: 'i', k: 'flower:1' };
  s.board[1] = { t: 'i', k: 'flower:1' };
  s.board[3] = { t: 'i', k: 'flower:1' };
  const levelled = run(s, { type: 'move', from: 3, to: 1 }, T0 + 2).s;
  assert.ok(levelled.crate.charges >= 30);
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
  assert.equal(loaded.version, SAVE_VERSION);
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

test('near a full board the crate completes two existing pairs before filling it', () => {
  for (let seed = 0; seed < 100; seed++) {
    let s = blank(seed); s.level = 7;
    s.board = s.board.map(() => ({ t: 'x' as const }));
    for (const [cell, key] of [[0, 'flower:1'], [1, 'flower:1'], [7, 'cow:1'], [8, 'cow:1']] as const) s.board[cell] = { t: 'i', k: key };
    for (const cell of [2, 3, 4, 5, 6, 9]) s.board[cell] = { t: 'e' };
    while (s.board.some(c => c.t === 'e')) s = run(s, { type: 'openCrate' }).s;
    const counts = new Map<string, number>();
    for (const c of s.board) if (c.t === 'i') counts.set(c.k, (counts.get(c.k) ?? 0) + 1);
    assert.ok([...counts.values()].reduce((total, n) => total + Math.floor(n / 3), 0) >= 2, `seed ${seed}`);
  }
});

test('near-full protection never removes existing items even when two triples are impossible', () => {
  const s = blank(); s.level = 7; s.board = s.board.map(() => ({ t: 'x' as const }));
  s.board[0] = { t: 'i', k: 'wood:8' }; s.board[1] = { t: 'e' };
  const n = run(s, { type: 'openCrate' }).s;
  assert.deepEqual(n.board[0], s.board[0]);
  assert.equal(n.board[1].t, 'i');
  assert.equal(n.crate.charges, s.crate.charges - 1);
});


test('starting daily gift is already credited and new days grant it only once', () => {
  let s = blank();
  assert.equal(s.crate.charges, 50);
  assert.deepEqual(s.crate.wallet, { normal: 40, daily: 10, bonus: 0, energy: 0, legacy: 0 });
  assert.equal(run(s, { type: 'claimDailyCrates' }, T0).s.crate.charges, 50);
  s = run(s, { type: 'tick' }, T0 + DAY).s;
  s = run(s, { type: 'claimDailyCrates' }, T0 + DAY).s;
  assert.equal(s.crate.charges, 60); assert.equal(s.crate.wallet?.daily, 20);
  s = decode(encode(s, 1, T0 + DAY))!.state;
  assert.equal(run(s, { type: 'claimDailyCrates' }, T0 + DAY).s.crate.charges, 60);
  const earlier = run(s, { type: 'tick' }, T0).s;
  assert.equal(run(earlier, { type: 'claimDailyCrates' }, T0 + DAY).s.crate.charges, 60);
});


test('timed crate refill reaches forty in three hours and never touches extra gifts', () => {
  for (const [initial, elapsed, expected] of [[0, 180, 40], [25, 90, 40], [40, 600, 40], [60, 600, 60]] as const) {
    const s = blank(); s.crate.charges = initial; s.crate.anchor = T0;
    const n = run(s, { type: 'tick' }, T0 + elapsed * 60000).s;
    assert.equal(n.crate.charges, expected);
    const loaded = decode(encode(n, 1, T0 + elapsed * 60000))!.state;
    assert.equal(run(loaded, { type: 'tick' }, T0 + elapsed * 60000).s.crate.charges, expected);
  }
  const s = blank(); s.crate.charges = 38; s.crate.refillDay = -1;
  const gift = run(s, { type: 'claimDailyCrates' }).s; assert.equal(gift.crate.charges, 48);
  gift.crate.charges = 39; gift.crate.anchor = T0;
  assert.equal(run(gift, { type: 'tick' }, T0 + BALANCE.crate.refillMs).s.crate.charges, 40);
});

test('fractional refill persists and backwards time cannot replay an interval', () => {
  const s = blank(); s.crate.charges = 0; s.crate.anchor = T0;
  const n = run(s, { type: 'tick' }, T0 + BALANCE.crate.refillMs + 50000).s;
  assert.equal(n.crate.charges, 1);
  const loaded = decode(encode(n, 1, T0))!.state;
  const back = run(loaded, { type: 'tick' }, T0).s;
  assert.equal(run(back, { type: 'tick' }, T0 + BALANCE.crate.refillMs).s.crate.charges, 1);
  assert.equal(run(back, { type: 'tick' }, T0 + 2 * BALANCE.crate.refillMs).s.crate.charges, 2);
});

test('v10 migration preserves untraceable balances and starts a fresh refill clock', () => {
  const s = blank(); s.version = 10; s.crate.charges = 200;
  const loaded = migrate(s)!; assert.equal(loaded.crate.charges, 200);
  assert.equal(run(loaded, { type: 'tick' }, T0 + 86400000).s.crate.charges, 200);
});
