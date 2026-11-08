import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { blank, put, run, T0 } from './helpers';
import { FARM_RECIPES, FARM_YIELD } from '../src/content/farm';
import { cratePool } from '../src/content/progression';
import { decode, encode } from '../src/persistence/save';

test('a dairy cow stays on the board and gives milk on a cooldown', () => {
  const s = blank(2);
  put(s, 10, 'cow:4');
  const first = run(s, { type: 'tap', cell: 10 });
  assert.deepEqual(first.s.board[10], { t: 'i', k: 'cow:4' }, 'the animal is kept');
  assert.equal(first.s.harvestStock['milk:1'], 2);
  assert.equal(first.s.energy, s.energy, 'harvesting costs no energy');
  // Second tap before the cooldown is refused and changes nothing.
  assert.equal(run(first.s, { type: 'tap', cell: 10 }, T0 + 1000).s, first.s);
  const again = run(first.s, { type: 'tap', cell: 10 }, T0 + FARM_YIELD['cow:4'].seconds * 1000).s;
  assert.equal(again.harvestStock['milk:1'], 4);
});

test('level-3 animals and plots already produce, but less; level 1–2 do not', () => {
  const s = blank();
  put(s, 0, 'chicken:3');
  put(s, 1, 'chicken:2');
  assert.equal(run(s, { type: 'tap', cell: 0 }).s.harvestStock['egg:1'], 1);
  assert.equal(run(s, { type: 'tap', cell: 1 }).s, s);
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

test('merchant reserves delivered goods, then pays coins and XP only when claimed', () => {
  const s = blank();
  put(s, 0, 'flower:2'); put(s, 1, 'flower:2');
  const before = s.leaves;
  const started = run(s, { type: 'startFarmRecipe', factory: 'merchant' }).s;
  assert.equal(started.board.filter((c) => c.t === 'i' && c.k === 'flower:2').length, 0);
  assert.equal(run(started, { type: 'startFarmRecipe', factory: 'merchant' }).s, started);
  const done = run(started, { type: 'tick' }, T0 + 45_000).s;
  assert.equal(done.leaves, before);
  const claimed = run(done, { type: 'claimFarmReward', factory: 'merchant' }, T0 + 45_000).s;
  assert.equal(claimed.leaves, before + FARM_RECIPES.merchant[0].gold);
  assert.equal(claimed.farmFactories.merchant.recipe, 1);
  assert.equal(run(claimed, { type: 'claimFarmReward', factory: 'merchant' }, T0 + 45_001).s, claimed);
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
