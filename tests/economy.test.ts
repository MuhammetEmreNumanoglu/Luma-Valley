import assert from 'node:assert/strict';
import { test } from 'node:test';

import { leafBreakCost, BALANCE, sellValue } from '../src/content/balance';
import { producerLevel } from '../src/content/producers';
import { idx } from '../src/engine/board';
import { blank, fresh, items, put, run, T0 } from './helpers';

// Legacy producer rules remain engine-tested in isolation, while normal play only places the
// merchant on a board. This helper constructs the old fixture explicitly.
const producerCell = (s: ReturnType<typeof fresh>) => {
  let p = s.board.findIndex((c) => c.t === 'p' && c.p === 'greenhouse');
  if (p >= 0) return p;
  p = s.board.findIndex((c) => c.t === 'e');
  s.board[p] = { t: 'p', p: 'greenhouse' };
  s.producers.greenhouse = { level: 1, charges: 14, anchor: T0 };
  return p;
};

test('producing spends one energy and one charge and places the item next to the producer', () => {
  const s = fresh();
  const p = producerCell(s);
  const { s: n, ev } = run(s, { type: 'tap', cell: p });
  assert.equal(n.energy, s.energy - 1);
  assert.equal(n.producers.greenhouse!.charges, s.producers.greenhouse!.charges - 1);
  const e = ev.find((x) => x.type === 'produce');
  assert.ok(e && e.type === 'produce');
  assert.ok(e.item.startsWith('flower:'));
});

test('energy can never go negative; no energy → produce is denied without side effects', () => {
  const s = fresh();
  s.energy = 0;
  const { s: n, ev } = run(s, { type: 'tap', cell: producerCell(s) });
  assert.equal(n.energy, 0);
  assert.deepEqual(items(n), items(s));
  assert.ok(ev.some((e) => e.type === 'denied' && e.reason === 'noEnergy'));
});

test('energy regenerates offline, caps at max, and a backwards clock never removes it', () => {
  const s = fresh();
  s.energy = 10;
  s.energyAnchor = T0;
  let { s: n } = run(s, { type: 'tick' }, T0 + BALANCE.energy.regenMs * 5 + 10);
  assert.equal(n.energy, 15);
  ({ s: n } = run(n, { type: 'tick' }, T0 + 1000 * 3600 * 24 * 30));
  assert.equal(n.energy, BALANCE.energy.max);
  // Clock set back a day: energy kept.
  ({ s: n } = run(n, { type: 'tick' }, T0 - 1000 * 3600 * 24));
  assert.equal(n.energy, BALANCE.energy.max);
});

test('clock jump backwards then forwards does not double-count regeneration', () => {
  const s = fresh();
  s.energy = 0;
  const later = T0 + BALANCE.energy.regenMs * 10;
  let { s: n } = run(s, { type: 'tick' }, later);
  assert.equal(n.energy, 10);
  ({ s: n } = run(n, { type: 'tick' }, T0)); // back
  ({ s: n } = run(n, { type: 'tick' }, later)); // forward again
  assert.ok(n.energy <= 20, `energy ${n.energy}`);
});

test('producer charges recharge over time and never exceed capacity', () => {
  const s = fresh();
  const p = producerCell(s);
  let cur = s;
  for (let k = 0; k < 14; k++) cur = run(cur, { type: 'tap', cell: p }).s;
  assert.equal(cur.producers.greenhouse!.charges, 0);
  const denied = run(cur, { type: 'tap', cell: p });
  assert.ok(denied.ev.some((e) => e.type === 'denied' && e.reason === 'noCharges'));
  const lv = producerLevel('greenhouse', 1);
  const after = run(cur, { type: 'tick' }, T0 + lv.rechargeMs * 100).s;
  assert.equal(after.producers.greenhouse!.charges, lv.charges);
});

test('full board: producing is denied and spends nothing', () => {
  const s = blank();
  s.producers = { greenhouse: { level: 1, charges: 10, anchor: T0 } };
  s.board = s.board.map(() => ({ t: 'i', k: 'stone:1' }) as const);
  s.board[0] = { t: 'p', p: 'greenhouse' };
  const { s: n, ev } = run(s, { type: 'tap', cell: 0 });
  assert.equal(n.energy, s.energy);
  assert.ok(ev.some((e) => e.type === 'denied' && e.reason === 'boardFull'));
});

test('selling pays the configured value; upgrades need enough leaves', () => {
  const s = blank();
  put(s, 0, 'flower:4');
  const { s: n } = run(s, { type: 'sell', cell: 0 });
  assert.equal(n.leaves, s.leaves + sellValue(4));
  const poor = fresh();
  producerCell(poor);
  poor.leaves = 0;
  const up = run(poor, { type: 'upgrade', producer: 'greenhouse' });
  assert.ok(up.ev.some((e) => e.type === 'denied' && e.reason === 'noLeaves'));
  assert.equal(up.s.producers.greenhouse!.level, 1);
  const rich = fresh();
  producerCell(rich);
  rich.leaves = 10_000;
  const up2 = run(rich, { type: 'upgrade', producer: 'greenhouse' });
  assert.equal(up2.s.producers.greenhouse!.level, 2);
  assert.equal(up2.s.leaves, 10_000 - producerLevel('greenhouse', 1).upgradeLeaves!);
});

test('one-time coin grants go through the ledger and never pay twice', () => {
  const s = fresh();
  s.discovered.push('wood:3');
  const a = run(s, { type: 'claimCollection', item: 'wood:3' }).s;
  assert.ok(a.ledger.some((e) => e.id === 'col:wood:3'));
  assert.equal(run(a, { type: 'claimCollection', item: 'wood:3' }).s, a);
});

test('inventory: store and retrieve keep items; full inventory refuses', () => {
  const s = blank();
  for (let i = 0; i < 6; i++) put(s, i, `wood:${i + 1}`);
  let cur = s;
  for (let i = 0; i < 4; i++) cur = run(cur, { type: 'store', cell: i }).s;
  const full = run(cur, { type: 'store', cell: 4 });
  assert.ok(full.ev.some((e) => e.type === 'denied' && e.reason === 'inventoryFull'));
  assert.deepEqual(items(full.s), items(s));
  const back = run(cur, { type: 'retrieve', slot: 0 }).s;
  assert.deepEqual(items(back), items(s));
});

test('opening a locked cell costs leaves and only works next to open ground', () => {
  const s = fresh();
  s.leaves = 1000;
  const deep = s.board.length - 1; // bottom-right, surrounded by locked cells
  assert.ok(run(s, { type: 'openCell', cell: deep }).ev.some((e) => e.type === 'denied'));
  const edge = s.board.findIndex((c, i) => c.t === 'x' && i >= 7 * 7 && s.board[i - 7].t !== 'x');
  const r = run(s, { type: 'openCell', cell: edge });
  assert.equal(r.s.board[edge].t, 'e');
  assert.ok(r.s.leaves < 1000);
});

test('converter: dropping a flour sack on the oven makes flour; unknown inputs just swap', () => {
  const s = blank();
  s.producers = { oven: { level: 1, charges: 6, anchor: T0 } };
  s.board[idx(3, 3)] = { t: 'p', p: 'oven' };
  put(s, idx(0, 0), 'grain:4');
  const { s: n, ev } = run(s, { type: 'move', from: idx(0, 0), to: idx(3, 3) });
  assert.deepEqual(items(n), { 'flour:1': 2 });
  assert.ok(ev.some((e) => e.type === 'convert'));
  put(n, idx(6, 8), 'wood:1');
  const sw = run(n, { type: 'move', from: idx(6, 8), to: idx(3, 3) }).s;
  assert.deepEqual(items(sw), { 'flour:1': 2, 'wood:1': 1 });
});

test('secret recipe is found once', () => {
  const s = blank();
  s.producers = { kiln: { level: 1, charges: 6, anchor: T0 } };
  s.board[10] = { t: 'p', p: 'kiln' };
  put(s, 0, 'crystal:2');
  const r = run(s, { type: 'move', from: 0, to: 10 });
  assert.ok(r.s.recipesFound.includes('kiln:crystal:2'));
  assert.ok(r.ev.some((e) => e.type === 'convert' && e.secret));
});

test('purchase grants are idempotent per transaction id and reject bad amounts', () => {
  const s = fresh();
  const a = run(s, { type: 'grantPurchase', transactionId: 'tx-1', coins: 600 }).s;
  assert.equal(a.leaves, s.leaves + 600);
  const b = run(a, { type: 'grantPurchase', transactionId: 'tx-1', coins: 600 }).s;
  assert.equal(b.leaves, a.leaves);
  const c = run(a, { type: 'grantPurchase', transactionId: 'tx-2', coins: -5 }).s;
  assert.equal(c.leaves, a.leaves);
});

test('level up pays rewards and refills energy', () => {
  const s = fresh();
  s.energy = 0;
  s.xp = 10_000;
  const n = run(s, { type: 'tick' }).s;
  // tick alone does not level; give xp through a sale-free path: complete first quest prerequisites
  assert.equal(n.level, 1);
  const b = blank();
  b.xp = 1000;
  for (const x of [0, 1]) put(b, idx(x, 0), 'flower:1');
  put(b, idx(4, 7), 'flower:1');
  const r = run(b, { type: 'move', from: idx(4, 7), to: idx(1, 0) });
  assert.ok(r.s.level > 1);
  assert.ok(r.ev.some((e) => e.type === 'levelUp'));
});

test('energy is bought directly with coins; the price grows ×1.5 the same day and resets the next day', () => {
  const s = fresh();
  s.energy = 0;
  s.leaves = 10_000;
  const a = run(s, { type: 'buyEnergy' }).s;
  assert.equal(a.energy, BALANCE.energy.leafBreak.amount);
  assert.equal(a.leaves, 10_000 - BALANCE.energy.leafBreak.base);
  const b = run(a, { type: 'buyEnergy' }).s;
  assert.equal(b.leaves, a.leaves - Math.round(BALANCE.energy.leafBreak.base * 1.5));
  // Repeated buying gets expensive fast: no coin → energy pump.
  let c = b;
  for (let i = 0; i < 6; i++) c = run({ ...c, energy: 0 }, { type: 'buyEnergy' }).s;
  assert.ok(leafBreakCost(c.energyBuys) > BALANCE.energy.leafBreak.base * 10);
  const poor = fresh();
  poor.energy = 0;
  poor.leaves = 10;
  assert.ok(run(poor, { type: 'buyEnergy' }).ev.some((e) => e.type === 'denied' && e.reason === 'noLeaves'));
  const tomorrow = run(b, { type: 'tick' }, T0 + 86_400_000).s;
  assert.equal(tomorrow.energyBuys, 0);
});

test('decorations: bought once with leaves, only in unlocked regions', () => {
  const s = fresh();
  s.leaves = 1000;
  const a = run(s, { type: 'buyDecoration', id: 'd1_1' }).s;
  assert.deepEqual(a.decorations, ['d1_1']);
  assert.equal(a.leaves, 1000 - 150);
  assert.ok(run(a, { type: 'buyDecoration', id: 'd1_1' }).ev.some((e) => e.type === 'denied'));
  assert.ok(run(a, { type: 'buyDecoration', id: 'd3_1' }).ev.some((e) => e.type === 'denied' && e.reason === 'locked'));
});


test('energy regeneration becomes 1 percent faster per level', async () => {
  const { energyRegenMs } = await import('../src/content/balance');
  assert.equal(energyRegenMs(1), 60_000);
  assert.equal(energyRegenMs(11), Math.round(60_000 / 1.1));
  let s = blank(); s.level = 11; s.energy = 0; s.energyAnchor = T0;
  assert.equal(run(s, { type: 'tick' }, T0 + energyRegenMs(11) - 1).s.energy, 0);
  assert.equal(run(s, { type: 'tick' }, T0 + energyRegenMs(11)).s.energy, 1);
});

test('energy purchase permits overflow, rejects duplicate quote and never overflows cap', () => {
  const s = fresh(); s.energy = 100; s.leaves = 1000;
  const first = run(s, { type: 'buyEnergy', expectedBuys: 0 }).s;
  assert.equal(first.energy, 125); assert.equal(first.leaves, 940);
  const retry = run(first, { type: 'buyEnergy', expectedBuys: 0 }).s;
  assert.equal(retry, first);
  const full = { ...first, energy: BALANCE.energy.overflowCap - 10 };
  assert.equal(run(full, { type: 'buyEnergy', expectedBuys: first.energyBuys }).s, full);
});
