import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cratePool } from '../src/content/progression';
import { TRADER_LADDER, traderRecipe } from '../src/content/farm';
import { QUESTS } from '../src/content/quests';
import { NODES } from '../src/content/valley';
import { makeRng, weighted } from '../src/core/rng';
import { crateChoices } from '../src/engine/crate';
import { canMakeItem } from '../src/engine/reachability';
import { isNodeUnlocked } from '../src/engine/nodes';
import { fresh, blank } from './helpers';

/** Open-board base distribution only; the near-full board safeguard intentionally changes odds. */
test('levels 1–30 offer all and only level-unlocked crate families at equal base weight', () => {
  for (let level = 1; level <= 30; level++) {
    const pool = cratePool(level), board = blank().board;
    assert.deepEqual(crateChoices(board, level), pool, `open board, level ${level}`);
    assert.ok(pool.length > 0);
    assert.equal(new Set(pool.map(x => x.weight)).size, 1, `weights, level ${level}`);
    assert.deepEqual(pool.map(x => x.family), cratePool(30).filter(x => x.level <= level).map(x => x.family));
    const draws = 12_000, rng = makeRng(7123 + level), counts = new Map(pool.map(x => [x.family, 0]));
    for (let i = 0; i < draws; i++) {
      const family = weighted(pool.map(x => ({ value: x.family, weight: x.weight })), rng.next());
      counts.set(family, counts.get(family)! + 1);
    }
    const p = 1 / pool.length, sigma = Math.sqrt(draws * p * (1 - p));
    for (const [family, count] of counts) assert.ok(Math.abs(count - draws * p) < 6 * sigma + 1, `level ${level} ${family}: ${count}/${draws}`);
  }
});

test('each trader recipe is harvestable from unlocked families at levels 1–30', () => {
  for (let level = 1; level <= 30; level++) {
    const s = fresh(); s.level = level;
    const recipe = traderRecipe(level);
    assert.ok(TRADER_LADDER.some(x => x === recipe));
    assert.ok(recipe.inputs.length > 0 && recipe.inputs.length <= 2);
    for (const input of recipe.inputs) assert.ok(canMakeItem(s, input.item), `level ${level}: trader ${input.item}`);
  }
  assert.deepEqual(traderRecipe(1).inputs.map(x => x.item).sort(), ['milk:1', 'wheatCrop:1']);
  assert.deepEqual(traderRecipe(5).inputs.map(x => x.item).sort(), ['egg:1', 'tomatoCrop:1']);
});

test('available jobs through level 30 have renewable inputs when their region and quest are unlocked', () => {
  for (let level = 1; level <= 30; level++) {
    const s = fresh(); s.level = level; s.regions = [1, 2, 3, 4, 5, 6, 7]; s.quests.done = QUESTS.map(q => q.id);
    for (const node of NODES) {
      if (!isNodeUnlocked(s, node)) continue;
      for (const job of node.jobs) {
        if (job.level && level < job.level) continue;
        for (const input of job.inputs ?? []) assert.ok(canMakeItem(s, input.item), `level ${level}: ${node.id}/${job.id} requires ${input.item}`);
      }
    }
  }
});

test('early story item prerequisites become renewable by level 30 without buying access to later regions', () => {
  for (const q of QUESTS.filter(x => x.region === 1 && x.kind === 'story')) {
    let firstLevel: number | undefined;
    for (let level = 1; level <= 30; level++) {
      const s = fresh(); s.level = level; s.regions = [1]; s.quests.done = q.prereq;
      if (q.reqs.every(r => r.kind !== 'item' || canMakeItem(s, r.item))) { firstLevel = level; break; }
    }
    assert.ok(firstLevel !== undefined, `${q.id} never has renewable materials in region 1`);
  }
});

test('item source guidance does not mark a locked production tier available', async () => {
  const { itemSources } = await import('../src/engine/sources');
  const s = fresh(); s.level = 11; s.regions = [1, 2]; s.quests.done.push('r2_windmill1');
  const source = () => itemSources(s, 'grain:3').find(x => x.kind === 'node' && x.node.id === 'r2_mill');
  const before = source(); assert.ok(before && before.kind === 'node'); assert.equal(before.available, false);
  s.level = 12;
  const after = source(); assert.ok(after && after.kind === 'node'); assert.equal(after.available, true);
});

test('a legacy level-one loom job can still complete after its minimum level changes', async () => {
  const { run, T0 } = await import('./helpers');
  const { encode, decode } = await import('../src/persistence/save');
  const s = blank(); s.level = 1; s.regions = [1, 2]; s.quests.done.push('r2_loom');
  s.nodes.r2_loom = { built: true, stage: 0, job: 0, readyAt: T0 + 1000, out: [{ item: 'fabric:1', n: 2 }] };
  const loaded = decode(encode(s, 1, T0))!.state;
  const result = run(loaded, { type: 'claimNode', id: 'r2_loom' }, T0 + 1000);
  assert.equal(result.s.board.filter(x => x.t === 'i' && x.k === 'fabric:1').length, 2);
  assert.equal(run(result.s, { type: 'claimNode', id: 'r2_loom' }, T0 + 1000).s.nodes.r2_loom.readyAt, 0);
});

test('the level-one and level-five traders accept real harvested goods and pay after the saved timer', async () => {
  const { run, put, T0 } = await import('./helpers');
  const { encode, decode } = await import('../src/persistence/save');
  for (const [level, first, second, seconds] of [[1, 'cow:4', 'wheatFarm:4', 45], [5, 'chicken:4', 'tomatoFarm:4', 75]] as const) {
    let s = blank(); s.level = level; put(s, 10, first); put(s, 11, second);
    const start = T0 + 120_000; // New-game trader opens after its two-minute timer.
    s = run(s, { type: 'tap', cell: 10 }, start).s;
    s = run(s, { type: 'tap', cell: 11 }, start).s;
    const recipe = traderRecipe(level);
    for (const input of recipe.inputs) assert.ok((s.harvestStock[input.item] ?? 0) >= input.count);
    const started = run(s, { type: 'startFarmRecipe', factory: 'merchant' }, start);
    assert.ok(!started.ev.some(x => x.type === 'denied'));
    const restored = decode(encode(started.s, 1, start))!.state;
    const paid = run(restored, { type: 'claimFarmReward', factory: 'merchant' }, start + seconds * 1000);
    assert.ok(!paid.ev.some(x => x.type === 'denied'));
    assert.equal(paid.s.leaves, s.leaves + 25);
    assert.ok(paid.s.board.some(x => x.t === 'i' && x.k === 'starCoin:1') || paid.s.rewardStorage.includes('starCoin:1'));
  }
});
