import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { QUEST, QUESTS } from '../src/content/quests';
import { levelReward, cratePool } from '../src/content/progression';
import { traderRecipe } from '../src/content/farm';
import { canMakeItem } from '../src/engine/reachability';
import { requirementProgress } from '../src/engine/quests';
import { blank, fresh, put, run, T0 } from './helpers';

const gates = [['r1_bridge3', 'leaves', 2000], ['r2_gate', 'tokens', 200], ['r3_bridge', 'tokens', 300], ['r4_gate', 'tokens', 400], ['r5_bridge', 'tokens', 500]] as const;
test('bridge prices spend the correct currency once and never relock old regions', () => {
  for (const [id, kind, price] of gates) {
    const q = QUEST[id], s = blank(); s.level = 100;
    s.regions = Array.from({ length: q.region }, (_, i) => i + 1);
    s.quests.done = QUESTS.filter(x => x.id !== id).map(x => x.id);
    s.leaves = 10000; s.starTokens = 1000;
    let i = 0;
    for (const r of q.reqs) {
      if (r.kind === 'item') for (let n = 0; n < r.n; n++) put(s, i++, r.item);
      if (r.kind === 'puzzle') s.puzzles[r.id] = { stars: 3, bestMoves: 1 };
    }
    assert.deepEqual(q.reqs.find(r => r.kind === kind), { kind, n: price });
    const poor = structuredClone(s); if (kind === 'leaves') poor.leaves = price - 1; else poor.starTokens = price - 1;
    const rejected = run(poor, { type: 'completeQuest', id }, T0); assert.ok(rejected.ev.some(e => e.type === 'denied')); assert.deepEqual(rejected.s.regions, poor.regions);
    const done = run(s, { type: 'completeQuest', id }, T0); assert.ok(done.s.regions.includes(q.region + 1));
    if (kind === 'tokens') assert.equal(done.s.starTokens, s.starTokens - price);
    else assert.equal(requirementProgress(s, q).find(x => x.req.kind === kind)?.need, price);
    const repeat = run(done.s, { type: 'completeQuest', id }, T0 + 1); assert.equal(repeat.s.starTokens, done.s.starTokens); assert.deepEqual(repeat.s.regions, done.s.regions);
  }
});

test('level rewards grow gently from level four and are capped for high levels', () => {
  for (let level = 4; level <= 10; level++) { assert.equal(levelReward(level).energy, level + 16); assert.equal(levelReward(level).crates, level + 6); }
  assert.equal(levelReward(100).energy, 50); assert.equal(levelReward(100).crates, 30);
});

test('early trader ingredients are renewable throughout levels 1 to 20', () => {
  assert.deepEqual(cratePool(1).map(x => x.family), ['cow', 'wheatFarm']);
  for (let level = 1; level <= 100; level++) assert.equal(new Set(cratePool(level).map(x => x.weight)).size, 1, `unequal crate weights at level ${level}`);
  for (let level = 1; level <= 20; level++) {
    const s = fresh(); s.level = level;
    for (const { item } of traderRecipe(level).inputs) assert.ok(canMakeItem(s, item), `level ${level}: ${item}`);
  }
});

test('special orders award at most one daily token bonus and survive save/load', async () => {
  const s = blank();
  s.quests.done.push('r1_garden1');
  s.orders = [
    { id: 'one', giver: 'lumi', items: [{ item: 'cow:1', n: 1 }], leaves: 5, xp: 0, special: true },
    { id: 'two', giver: 'lumi', items: [{ item: 'cow:1', n: 1 }], leaves: 5, xp: 0, special: true },
  ];
  put(s, 0, 'cow:1'); put(s, 1, 'cow:1');
  const first = run(s, { type: 'deliverOrder', id: 'one' }, T0).s;
  assert.equal(first.starTokens, s.starTokens + 20);
  const { encode, decode } = await import('../src/persistence/save');
  const loaded = decode(encode(first, 1, T0))!.state;
  const second = run(loaded, { type: 'deliverOrder', id: 'two' }, T0 + 1000).s;
  assert.equal(second.starTokens, first.starTokens);
  const repeat = run(second, { type: 'deliverOrder', id: 'two' }, T0 + 2000).s;
  assert.equal(repeat.starTokens, first.starTokens);
  const backwards = structuredClone(first);
  backwards.orders.push({ id: 'three', giver: 'lumi', items: [{ item: 'cow:1', n: 1 }], leaves: 5, xp: 0, special: true });
  put(backwards, 2, 'cow:1');
  assert.equal(run(backwards, { type: 'deliverOrder', id: 'three' }, T0 - 86_400_000).s.starTokens, first.starTokens);
});
