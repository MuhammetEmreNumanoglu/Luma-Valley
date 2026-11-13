import assert from 'node:assert/strict';
import { test } from 'node:test';
import { idx } from '../src/engine/board';
import { apply } from '../src/engine/commands';
import { decode, encode, migrate } from '../src/persistence/save';
import { blank, fresh, put, T0 } from './helpers';

test('real merges advance each season goal once and not on rejected commands', () => {
  const s = blank();
  put(s, idx(0, 0), 'chicken:1'); put(s, idx(1, 0), 'chicken:1'); put(s, idx(5, 5), 'chicken:1');
  const next = apply(s, { type: 'move', from: idx(5, 5), to: idx(1, 0) }, T0).state;
  assert.equal(next.freeSeason.progress['daily:merges'], 1);
  assert.equal(next.freeSeason.progress['weekly:merges'], 1);
  assert.equal(next.freeSeason.progress['season:merges'], 1);
  const denied = apply(next, { type: 'move', from: -1, to: 0 }, T0).state;
  assert.deepEqual(denied.freeSeason.progress, next.freeSeason.progress);
});

test('claimed XP unlocks real free rewards exactly once through save and reload', async () => {
  const { seasonTasks } = await import('../src/premium/season');
  let s = fresh(); const daily = seasonTasks(s.freeSeason).filter(t => t.id.startsWith('daily:'));
  for (const task of daily.slice(0, 4)) s.freeSeason.progress[task.id] = task.target;
  for (const task of daily.slice(0, 4)) s = apply(s, { type: 'claimSeasonTask', id: task.id }, T0).state;
  assert.equal(s.freeSeason.xp, 110); assert.equal(s.xp, 0);
  assert.equal(apply(s, { type: 'claimSeasonTask', id: daily[0].id }, T0).state.freeSeason.xp, 110);
  const claim = apply(s, { type: 'claimSeasonReward', level: 1 }, T0).state;
  assert.equal(claim.leaves, s.leaves + 100);
  const restored = decode(encode(claim, 1, T0)); assert.ok(restored);
  assert.equal(apply(restored.state, { type: 'claimSeasonReward', level: 1 }, T0).state.leaves, claim.leaves);
});

test('daily and weekly progress reset forward only, old v9 saves retain game data', () => {
  const s = fresh(); s.freeSeason.progress['daily:merges'] = 8; s.freeSeason.progress['season:merges'] = 8;
  const tomorrow = apply(s, { type: 'tick' }, T0 + 86400000).state;
  assert.equal(tomorrow.freeSeason.progress['daily:merges'], 0);
  assert.equal(tomorrow.freeSeason.progress['season:merges'], 8);
  const oldClock = apply(tomorrow, { type: 'tick' }, T0).state;
  assert.equal(oldClock.freeSeason.day, tomorrow.freeSeason.day);
  const old = { ...fresh(), version: 9 } as Record<string, unknown>; delete old.freeSeason;
  const loaded = migrate(old); assert.ok(loaded); assert.deepEqual(loaded.themes, fresh().themes); assert.deepEqual(loaded.inventory, fresh().inventory);
});

test('a long-inactive v9 player starts the new season on their next visit', () => {
  const old = { ...fresh(), version: 9 } as Record<string, unknown>; delete old.freeSeason;
  const loaded = migrate(old); assert.ok(loaded);
  const future = T0 + 100 * 86400000;
  const visited = apply(loaded, { type: 'tick' }, future).state;
  assert.equal(visited.freeSeason.start, future);
});

test('Istanbul midnight rotates five real goals and keeps unclaimed completed XP', async () => {
  const { seasonTasks, turkeyDay, freeSeasonLevel } = await import('../src/premium/season');
  const midnight = Date.UTC(2026, 10, 10, 21, 0, 0); // midnight in Turkey
  let s = fresh(); s.freeSeason.start = midnight - 10000; s.freeSeason.highTime = midnight - 1000;
  s.freeSeason.day = turkeyDay(midnight - 1000); const tasks = seasonTasks(s.freeSeason).filter(t => t.id.startsWith('daily:'));
  assert.equal(tasks.length, 5); s.freeSeason.progress[tasks[0].id] = tasks[0].target;
  const next = apply(s, { type: 'tick' }, midnight).state;
  assert.equal(next.freeSeason.day, s.freeSeason.day + 1); assert.equal(next.freeSeason.pendingTasks.length, 1);
  assert.notDeepEqual(seasonTasks(next.freeSeason).filter(t => t.id.startsWith('daily:')).map(t => t.target), tasks.map(t => t.target));
  const loaded = decode(encode(next, 1, midnight))!.state;
  const paid = apply(loaded, { type: 'claimSeasonTask', id: loaded.freeSeason.pendingTasks[0].key }, midnight).state;
  assert.equal(paid.freeSeason.xp, tasks[0].xp); assert.equal(paid.freeSeason.pendingTasks.length, 0);
  assert.equal(freeSeasonLevel({ ...paid.freeSeason, xp: 300 }), 3);
});

test('old season progress and unclaimed legacy XP survive v11 migration', () => {
  const s = fresh(); s.version = 11; s.freeSeason.xp = 230; s.freeSeason.progress['daily:merges'] = 10;
  s.freeSeason.claimedRewards = [1, 2];
  const loaded = migrate(s)!; assert.equal(loaded.freeSeason.xp, 230); assert.deepEqual(loaded.freeSeason.claimedRewards, [1, 2]);
  const claimed = apply(loaded, { type: 'claimSeasonTask', id: 'daily:merges' }, T0).state;
  assert.equal(claimed.freeSeason.xp, 280);
});

test('thirtieth free reward gives a usable lantern once, including migrated saves', () => {
  const s = fresh(); s.freeSeason.xp = 3000;
  const claimed = apply(s, { type: 'claimSeasonReward', level: 30 }, T0).state;
  assert.equal(claimed.starTokens, 5); assert.ok(claimed.premiumDecor.owned.includes('festival_lantern'));
  const restored = decode(encode(claimed, 1, T0))!.state;
  assert.equal(apply(restored, { type: 'claimSeasonReward', level: 30 }, T0).state.starTokens, 5);
  const old = fresh(); old.version = 11; old.freeSeason.claimedRewards = [30];
  assert.ok(migrate(old)!.premiumDecor.owned.includes('festival_lantern'));
});

test('milestones grant their bonus once and migrated claims receive only the added bonus', () => {
  const s = fresh(); s.freeSeason.xp = 2000; s.energy = 0;
  const before = s.leaves;
  const first = apply(s, { type: 'claimSeasonReward', level: 10 }, T0).state;
  assert.equal(first.leaves, before + 250);
  const second = apply(first, { type: 'claimSeasonReward', level: 20 }, T0).state;
  assert.equal(second.leaves, before + 400); assert.equal(second.energy, 15);
  assert.equal(apply(second, { type: 'claimSeasonReward', level: 10 }, T0).state.leaves, before + 400);
  const old = JSON.parse(JSON.stringify(s)); old.version = 11; old.freeSeason.claimedRewards = [10, 20];
  const migrated = migrate(old); assert.ok(migrated); assert.equal(migrated.leaves, before + 300);
});
