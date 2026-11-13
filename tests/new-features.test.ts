import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACHIEVEMENTS } from '../src/content/achievements';
import { BALANCE } from '../src/content/balance';
import { nextRandom } from '../src/core/rng';
import { idx } from '../src/engine/board';
import { shopCanDeliver, shopOpen } from '../src/engine/shops';
import { decode, encode } from '../src/persistence/save';
import { blank, put, run, T0 } from './helpers';

test('shop unlock and ready badge depend on that shop’s actual products', () => {
  const s = blank(); s.level = 21;
  assert.equal(shopOpen(s, 4), false, 'pumpkin not yet available');
  s.level = 22;
  assert.equal(shopOpen(s, 4), true);
  s.harvestStock = { 'pumpkinCrop:1': 2, 'flour:1': 2 };
  assert.equal(shopCanDeliver(s, 4), true);
  assert.equal(shopCanDeliver(s, 1), false);
  s.harvestStock['flour:1'] = 0;
  assert.equal(shopCanDeliver(s, 4), false);
});

test('energy reward is independently rolled with ten percent probability after a combo', () => {
  let wins = 0, drops = 0;
  for (let seed = 0; seed < 3000; seed++) {
    const [combo, after] = nextRandom(seed);
    if (combo >= BALANCE.harvestBonusChance) continue;
    wins++;
    const shouldDrop = nextRandom(after)[0] < 0.1;
    const s = blank(seed); put(s, 0, 'flower:1'); put(s, 1, 'flower:1'); put(s, idx(5, 5), 'flower:1');
    const r = run(s, { type: 'move', from: idx(5, 5), to: 1 });
    const dropped = r.s.board.some(c => c.t === 'i' && c.k === 'energyOrb:1') || r.s.rewardStorage.includes('energyOrb:1');
    assert.equal(dropped, shouldDrop);
    if (dropped) drops++;
  }
  assert.ok(drops / wins > 0.075 && drops / wins < 0.125);
});

test('old high-level grain is converted once across boards and inventory', () => {
  const s = blank(); s.version = 7; s.workshop.unlocked.push(1);
  put(s, 0, 'grain:5'); s.workshop.boards[0] = s.board;
  s.workshop.boards[1][0] = { t: 'i', k: 'grain:6' };
  s.inventory[0] = 'grain:7'; s.rewardStorage.push('grain:8');
  s.orders = [{ id: 'legacy', giver: 'mira', items: [{ item: 'grain:4', n: 1 }, { item: 'grain:6', n: 1 }], leaves: 10, xp: 0, special: false }];
  const migrated = decode(encode(s, 1, T0))!.state;
  assert.equal(migrated.harvestStock['flour:1'], 4 + 6 + 8 + 10);
  assert.equal(migrated.board[0].t, 'e');
  assert.equal(migrated.workshop.boards[1][0].t, 'e');
  assert.equal(migrated.inventory[0], null);
  assert.deepEqual(migrated.orders[0].items, [{ item: 'flour:1', n: 2 }, { item: 'flour:1', n: 4 }]);
  assert.equal(decode(encode(migrated, 2, T0))!.state.harvestStock['flour:1'], 28);
});

test('flour sack is harvested to the barn and no longer merges', () => {
  const s = blank(); put(s, 0, 'grain:4');
  const r = run(s, { type: 'tap', cell: 0 });
  assert.equal(r.s.board[0].t, 'e');
  assert.equal(r.s.harvestStock['flour:1'], 5);
});

test('achievement stages pay escalating gold and star tokens once; old completed saves do not repay', () => {
  const a = ACHIEVEMENTS.find(a => a.id === 'merge10')!;
  let s = blank(); s.stats.merges = 4;
  const beforeClaim = run(s, { type: 'tick' }).s;
  assert.ok(!beforeClaim.achievements.includes('merge10:bronze'));
  assert.equal(beforeClaim.leaves, s.leaves);
  let next = run(s, { type: 'claimAchievement', id: 'merge10', stage: 0 }).s;
  assert.ok(next.achievements.includes('merge10:bronze'));
  assert.equal(next.leaves - s.leaves, a.coins); assert.equal(next.starTokens, 1);
  s = next; s.stats.merges = 7; next = run(s, { type: 'claimAchievement', id: 'merge10', stage: 1 }).s;
  assert.ok(next.achievements.includes('merge10:silver')); assert.equal(next.leaves - s.leaves, a.coins * 2); assert.equal(next.starTokens, 4);
  s = next; s.stats.merges = 10; next = run(s, { type: 'claimAchievement', id: 'merge10', stage: 2 }).s;
  assert.ok(next.achievements.includes('merge10:gold')); assert.equal(next.leaves - s.leaves, a.coins * 4); assert.equal(next.starTokens, 13);
  const previous = blank(); previous.stats.merges = 10; previous.achievements.push('merge10');
  const restored = run(previous, { type: 'claimAchievement', id: 'merge10', stage: 0 }).s;
  assert.equal(restored.leaves, previous.leaves); assert.equal(restored.starTokens, previous.starTokens);
});

test('daily completion bonus requires all three claims and pays once per day', () => {
  let s = run(blank(), { type: 'tick' }).s;
  assert.equal(s.daily.tasks.length, 3);
  assert.equal(run(s, { type: 'claimDailyBonus' }).s, s);
  s.daily.tasks.forEach(t => { t.claimed = true; });
  const claimed = run(s, { type: 'claimDailyBonus' }).s;
  assert.equal(claimed.leaves, s.leaves + 100);
  assert.equal(claimed.energy, s.energy + 25);
  assert.equal(claimed.starTokens, s.starTokens + 3);
  assert.equal(run(claimed, { type: 'claimDailyBonus' }).s, claimed);
  const restored = decode(encode(claimed, 2, T0))!.state;
  assert.equal(run(restored, { type: 'claimDailyBonus' }).s, restored);
});

test('achievement stages can be claimed independently and never twice', () => {
  const s = blank(); s.stats.merges = 10;
  const silver = run(s, { type: 'claimAchievement', id: 'merge10', stage: 1 }).s;
  assert.equal(silver.starTokens, 3);
  const gold = run(silver, { type: 'claimAchievement', id: 'merge10', stage: 2 }).s;
  assert.equal(gold.starTokens, 12);
  const saved = decode(encode(gold, 1, T0))!.state;
  const bronze = run(saved, { type: 'claimAchievement', id: 'merge10', stage: 0 }).s;
  assert.equal(bronze.starTokens, 13);
  assert.equal(run(bronze, { type: 'claimAchievement', id: 'merge10', stage: 0 }).s, bronze);
});

test('family tutorial does not repeat for another level or after skipping', async () => {
  const { needsFamilyIntro } = await import('../src/engine/tutorial');
  const s = blank(); assert.equal(needsFamilyIntro(s, 'tomatoFarm'), true);
  s.flags['introItem:tomatoFarm'] = true;
  assert.equal(needsFamilyIntro(s, 'tomatoFarm'), false);
  assert.equal(needsFamilyIntro(s, 'grain'), true);
  s.tutorial.skipped = true; assert.equal(needsFamilyIntro(s, 'grain'), false);
  const saved = decode(encode(s, 1, T0))!.state;
  assert.equal(needsFamilyIntro(saved, 'tomatoFarm'), false);
});

test('merchant status distinguishes missing, available, running and complete across reload', async () => {
  const { shopStatus } = await import('../src/engine/shops');
  const s = blank(); s.level = 3; assert.equal(shopStatus(s, 0, T0).status, 'missing');
  s.harvestStock = { 'milk:1': 2, 'wheatCrop:1': 2 };
  assert.equal(shopStatus(s, 0, T0).status, 'available');
  const working = run(s, { type: 'startFarmRecipe', factory: 'merchant' }, T0).s;
  assert.equal(shopStatus(working, 0, T0).status, 'running');
  const saved = decode(encode(working, 1, T0))!.state;
  assert.equal(shopStatus(saved, 0, T0 + 44000).status, 'running');
  assert.equal(shopStatus(saved, 0, T0 + 45000).status, 'complete');
  const collected = run(saved, { type: 'claimFarmReward', factory: 'merchant' }, T0 + 45000).s;
  assert.equal(shopStatus(collected, 0, T0 + 45000).status, 'missing');
});
