import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { blank, put, run, T0 } from './helpers';
import { FARM_RECIPES, FARM_YIELD, TRADER_RECIPE } from '../src/content/farm';
import { cratePool } from '../src/content/progression';
import { decode, encode } from '../src/persistence/save';

test('a level-4 cow is consumed once when harvested', () => {
  const s = blank(2);
  put(s, 10, 'cow:4');
  const first = run(s, { type: 'tap', cell: 10 });
  assert.deepEqual(first.s.board[10], { t: 'e' });
  assert.equal(first.s.harvestStock['milk:1'], FARM_YIELD['cow:4'].n);
  assert.equal(first.s.energy, s.energy);
  assert.equal(run(first.s, { type: 'tap', cell: 10 }, T0 + 1000).s, first.s);
});

test('levels below 4 cannot be harvested', () => {
  const s = blank();
  for (let level = 1; level <= 3; level++) {
    put(s, level, `chicken:${level}`);
    assert.equal(run(s, { type: 'tap', cell: level }).s, s);
  }
});

test('farm goods survive a full board and saving', () => {
  for (const [source, y] of Object.entries(FARM_YIELD)) {
    const s = blank();
    s.board = s.board.map(() => ({ t: 'i', k: 'wood:1' }));
    put(s, 10, source);
    const r = run(s, { type: 'tap', cell: 10 }).s;
    assert.equal(r.harvestStock[y.item], y.n, source);
    assert.equal(decode(encode(r, 1, T0))!.state.harvestStock[y.item], y.n);
  }
});

test('legacy harvest items on the board are collected into the stock with one tap', () => {
  const s = blank();
  put(s, 3, 'milk:1');
  put(s, 9, 'milk:1');
  const r = run(s, { type: 'tap', cell: 3 });
  assert.equal(r.s.harvestStock['milk:1'], 2);
  assert.equal(r.ev.find((e) => e.type === 'collectHarvest')?.from.length, 2);
});

test('trader consumes only barn milk and wheat and delivers a collectible star coin', () => {
  const s = blank();
  put(s, 0, 'milk:1'); put(s, 1, 'wheatCrop:1');
  s.harvestStock['milk:1'] = TRADER_RECIPE.inputs[0].count; s.harvestStock['wheatCrop:1'] = TRADER_RECIPE.inputs[1].count;
  const started = run(s, { type: 'startFarmRecipe', factory: 'merchant' }).s;
  assert.equal(started.harvestStock['milk:1'], 0);
  assert.equal(started.harvestStock['wheatCrop:1'], 0);
  assert.equal(started.board[0].t, 'i');
  assert.equal(started.farmFactories.merchant.readyAt, T0 + 120_000);
  assert.equal(run(started, { type: 'claimFarmReward', factory: 'merchant' }, T0 + 119_999).s, started);
  const loaded = decode(encode(started, 1, T0))!.state;
  const claimed = run(loaded, { type: 'claimFarmReward', factory: 'merchant' }, T0 + 120_000).s;
  const coin = claimed.board.findIndex(c => c.t === 'i' && c.k === 'starCoin:1');
  assert.ok(coin >= 0);
  assert.equal(run(claimed, { type: 'claimFarmReward', factory: 'merchant' }, T0 + 120_000).s, claimed);
  const collected = run(claimed, { type: 'collectCoin', cell: coin }, T0 + 120_000).s;
  assert.equal(collected.starTokens, 3);
  assert.equal(collected.leaves, s.leaves);
  assert.equal(collected.board[coin].t, 'e');
  assert.equal(run(collected, { type: 'collectCoin', cell: coin }, T0 + 120_000).s, collected);
  assert.equal(decode(encode(collected, 2, T0))!.state.starTokens, 3);
});

test('board or inventory goods cannot substitute for the barn', () => {
  const s = blank();
  for (const [i, item] of ['milk:1', 'milk:1', 'wheatCrop:1', 'wheatCrop:1'].entries()) put(s, i, item);
  assert.equal(run(s, { type: 'startFarmRecipe', factory: 'merchant' }).s, s);
});

test('new trader reward is saved in storage if the board is full', () => {
  const s = blank(); s.board = s.board.map(() => ({ t: 'i', k: 'wood:1' }));
  s.farmFactories.merchant = { recipe: 0, readyAt: T0 - 1, payout: 1, rewardKind: 'starCoin' };
  const claimed = run(s, { type: 'claimFarmReward', factory: 'merchant' }).s;
  assert.deepEqual(claimed.rewardStorage, ['starCoin:1']);
  assert.equal(decode(encode(claimed, 1, T0))!.state.rewardStorage[0], 'starCoin:1');
});

test('star coins merge and higher tiers collect at three times the preceding value', () => {
  const s = blank(1); for (const i of [0, 1, 20]) put(s, i, 'starCoin:1');
  const merged = run(s, { type: 'move', from: 20, to: 1 }).s;
  assert.deepEqual(merged.board[1], { t: 'i', k: 'starCoin:2' });
  const collected = run(merged, { type: 'collectCoin', cell: 1 }).s;
  assert.equal(collected.starTokens, 9);
});

test('the merchant can switch to another request while idle, never while working', () => {
  const s = blank();
  const skipped = run(s, { type: 'skipFarmRecipe', factory: 'merchant' }).s;
  assert.equal(skipped.farmFactories.merchant.recipe, 1);
  s.farmFactories.merchant = { recipe: 0, readyAt: T0 + 5000, payout: 30 };
  assert.equal(run(s, { type: 'skipFarmRecipe', factory: 'merchant' }).s, s);
});

test('merchant payout is claimable even when the merge board is full', () => {
  const s = blank();
  s.board = s.board.map(() => ({ t: 'i', k: 'wood:1' }));
  s.farmFactories.merchant = { recipe: 0, readyAt: T0 - 1, payout: 60 };
  const claimed = run(s, { type: 'claimFarmReward', factory: 'merchant' });
  assert.equal(claimed.s.leaves, s.leaves + 60);
});

test('the crate only gives seeds and saplings unlocked at the player level', () => {
  const natural = ['wood', 'stone', 'clay', 'crystal', 'ceramic', 'shell', 'lantern', 'memory'];
  for (const level of [1, 3, 5, 10, 30]) {
    const allowed = new Set(cratePool(level).map((e) => `${e.family}:1`));
    for (let seed = 1; seed <= 120; seed++) {
      const s = blank(seed);
      s.level = level;
      const opened = run(s, { type: 'openCrate' }).s;
      for (const c of opened.board) if (c.t === 'i') {
        assert.ok(allowed.has(c.k), `${c.k} at level ${level}`);
        assert.ok(!natural.includes(c.k.split(':')[0]), c.k);
      }
    }
  }
  const first = new Set<string>();
  for (let seed = 1; seed <= 50; seed++) {
    const opened = run(blank(seed), { type: 'openCrate' }).s;
    for (const c of opened.board) if (c.t === 'i') first.add(c.k);
  }
  assert.deepEqual([...first], ['flower:1'], 'the very first crates are flowers only (tutorial)');
});

test('every level-four barn producer is obtainable from crates', () => {
  const families = new Set(cratePool(100).map((entry) => entry.family));
  for (const key of Object.keys(FARM_YIELD)) {
    const [family, level] = key.split(':');
    assert.equal(level, '4');
    assert.ok(families.has(family as never), `${family} missing from crate pool`);
  }
  assert.ok(cratePool(5).some((entry) => entry.family === 'chicken'));
  assert.ok(cratePool(7).some((entry) => entry.family === 'cow'));
  // New starters arrive one at a time, at least two levels apart.
  const levels = [...new Set(cratePool(100).map((e) => e.level))].sort((x, y) => x - y);
  assert.equal(levels.length, cratePool(100).length);
  for (let i = 1; i < levels.length; i++) assert.ok(levels[i] - levels[i - 1] >= 2, `crate unlocks at ${levels[i - 1]} and ${levels[i]}`);
});
