import assert from 'node:assert/strict';
import { test } from 'node:test';

import { apply } from '../src/engine/commands';
import { decode, encode, migrate, pickSlot, repair } from '../src/persistence/save';
import { SaveStore, type KeyValue } from '../src/persistence/storage';
import { fresh, T0 } from './helpers';

class MemKV implements KeyValue {
  m = new Map<string, string>();
  async getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  async setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  async removeItem(k: string) {
    this.m.delete(k);
  }
}

test('encode/decode round-trips the whole state', () => {
  const s = apply(fresh(), { type: 'tick' }, T0).state;
  const back = decode(encode(s, 3, T0));
  assert.ok(back);
  assert.equal(back.seq, 3);
  assert.deepEqual(back.state, repair(s));
  assert.deepEqual(back.state.board, s.board);
});

test('a torn or edited save is rejected by the checksum', () => {
  const raw = encode(fresh(), 1, T0);
  assert.equal(decode(raw.slice(0, raw.length - 20)), null);
  const edited = raw.replace('"leaves\\":40', '"leaves\\":99999');
  assert.notEqual(edited, raw);
  assert.equal(decode(edited), null);
});

test('the newest valid slot wins; a corrupt newer slot falls back to the older one', () => {
  const a = fresh();
  a.leaves = 100;
  const b = fresh();
  b.leaves = 200;
  assert.equal(pickSlot(encode(a, 1, T0), encode(b, 2, T0))!.state.leaves, 200);
  assert.equal(pickSlot(encode(a, 1, T0), 'garbage')!.state.leaves, 100);
  assert.equal(pickSlot(null, null), null);
});

test('store alternates slots and reloads the latest state', async () => {
  const kv = new MemKV();
  const store = new SaveStore(kv);
  const s = fresh();
  for (let k = 1; k <= 5; k++) {
    s.leaves = k * 10;
    await store.save({ ...s }, T0 + k);
  }
  assert.equal(kv.m.size, 2);
  const again = new SaveStore(kv);
  const loaded = await again.load();
  assert.equal(loaded!.leaves, 50);
  // Damage the newest slot: still loads the previous one.
  const newest = [...kv.m.entries()].sort((x, y) => JSON.parse(y[1]).seq - JSON.parse(x[1]).seq)[0][0];
  kv.m.set(newest, '{"broken":');
  const third = await new SaveStore(kv).load();
  assert.equal(third!.leaves, 40);
});

test('migrate refuses foreign or future saves and repairs damaged fields', () => {
  assert.equal(migrate({ version: 2, levels: {} }), null); // old Tam Anı save
  assert.equal(migrate({ ...fresh(), version: 99 }), null);
  const bad = fresh() as unknown as Record<string, unknown>;
  bad.leaves = -50;
  (bad.board as unknown[])[0] = { t: 'i', k: 'dragon:99' };
  bad.inventory = ['flower:1', 'nonsense:3'];
  const s = migrate(bad)!;
  assert.equal(s.leaves, 0);
  assert.deepEqual(s.board[0], { t: 'e' });
  assert.deepEqual(s.inventory.slice(0, 2), ['flower:1', null]);
});

test('repair moves merchant off the board without losing its job or reserved payout', () => {
  const s = fresh();
  s.board[24] = { t: 'p', p: 'merchant' };
  s.board[25] = { t: 'p', p: 'greenhouse' };
  s.farmFactories.merchant = { recipe: 0, readyAt: T0 + 30_000, payout: 30 };
  const r = repair(JSON.parse(JSON.stringify(s)));
  assert.equal(r.workshop.boards.flat().filter(c => c.t === 'p').length, 0);
  assert.deepEqual(r.farmFactories.merchant, s.farmFactories.merchant);
  assert.deepEqual(repair(r), r);
});
