import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BALANCE } from '../src/content/balance';
import { QUEST, STRUCTURE_STAGES } from '../src/content/quests';
import { NODE } from '../src/content/valley';
import { isNodeUnlocked } from '../src/engine/nodes';
import { apply } from '../src/engine/commands';
import { availableQuests, canComplete, regionVitality } from '../src/engine/quests';
import { getPuzzle } from '../src/puzzles/levels';
import { solvedCopy } from '../src/puzzles/lightpaths';
import { fresh, items, put, run, T0 } from './helpers';

test('first quest is available at start and needs one sprout', () => {
  const s = fresh();
  const ids = availableQuests(s).map((q) => q.id);
  assert.deepEqual(ids, ['r1_light']);
  assert.equal(canComplete(s, QUEST.r1_light), false);
  const denied = run(s, { type: 'completeQuest', id: 'r1_light' });
  assert.ok(denied.ev.some((e) => e.type === 'denied'));
});

test('completing a quest consumes items, pays once, advances the structure', () => {
  const s = fresh();
  const free = s.board.findIndex((c) => c.t === 'e');
  put(s, free, 'flower:2');
  const before = s.leaves;
  const { s: n, ev } = run(s, { type: 'completeQuest', id: 'r1_light' });
  assert.ok(n.quests.done.includes('r1_light'));
  assert.equal(items(n)['flower:2'] ?? 0, 0);
  assert.equal(n.leaves, before + 15);
  assert.equal(n.structures.r1_shrine, 1);
  assert.ok(ev.some((e) => e.type === 'structure' && e.id === 'r1_shrine'));
  // Second attempt: denied, nothing changes.
  put(n, free, 'flower:2');
  const again = run(n, { type: 'completeQuest', id: 'r1_light' });
  assert.ok(again.ev.some((e) => e.type === 'denied'));
  assert.equal(again.s.leaves, n.leaves);
  assert.equal(again.s.quests.done.filter((q) => q === 'r1_light').length, 1);
});

test('story quests unlock valley buildings (no building appears on the board)', () => {
  const s = fresh();
  s.quests.done.push('r1_light');
  const free = s.board.map((c, i) => (c.t === 'e' ? i : -1)).filter((i) => i >= 0);
  put(s, free[0], 'flower:3');
  put(s, free[5], 'flower:3');
  const { s: n } = run(s, { type: 'completeQuest', id: 'r1_garden1' });
  assert.equal(n.board.filter((c) => c.t === 'p' && c.p !== 'merchant').length, 0);
  n.quests.done.push('r1_cottage2', 'r1_ada', 'r1_orchard');
  assert.ok(isNodeUnlocked(n, NODE.r1_orchard));
});

test('puzzle requirement: wrong rotations never count, correct solve unlocks the quest step', () => {
  let s = fresh();
  s.quests.done.push('r1_light', 'r1_garden1', 'r1_mira');
  const p1 = getPuzzle('lp01');
  const wrong = run(s, { type: 'solvePuzzle', id: 'lp01', rotations: p1.tiles.map((t) => t.rot), moves: 0 });
  assert.ok(wrong.ev.some((e) => e.type === 'denied'));
  assert.equal(wrong.s.puzzles.lp01, undefined);
  // lp02 is locked until lp01 is solved.
  const p2 = getPuzzle('lp02');
  const early = run(s, { type: 'solvePuzzle', id: 'lp02', rotations: solvedCopy(p2).tiles.map((t) => t.rot), moves: 5 });
  assert.ok(early.ev.some((e) => e.type === 'denied' && e.reason === 'locked'));
  s = run(s, { type: 'solvePuzzle', id: 'lp01', rotations: solvedCopy(p1).tiles.map((t) => t.rot), moves: p1.par }).s;
  assert.equal(s.puzzles.lp01.stars, 3);
  s = run(s, { type: 'solvePuzzle', id: 'lp02', rotations: solvedCopy(p2).tiles.map((t) => t.rot), moves: 99 }).s;
  assert.equal(s.puzzles.lp02.stars, 1);
  const leaves = s.leaves;
  // Re-solving gives no second first-solve reward.
  const re = run(s, { type: 'solvePuzzle', id: 'lp02', rotations: solvedCopy(p2).tiles.map((t) => t.rot), moves: 1 }).s;
  assert.equal(re.leaves, leaves + BALANCE.puzzle.threeStarCoins, 'only the first-3-star bonus, no second solve reward');
  assert.equal(re.puzzles.lp02.stars, 3);
  assert.ok(canComplete(s, QUEST.r1_shrine));
  const done = run(s, { type: 'completeQuest', id: 'r1_shrine' }).s;
  assert.equal(done.structures.r1_shrine, 1);
  assert.ok(isNodeUnlocked(done, NODE.r1_shrine), 'and opens the lantern shrine in the valley');
});

test('bridge completion unlocks region 2 and its first quest', () => {
  const s = fresh();
  for (const q of Object.values(QUEST)) if (q.region === 1 && q.id !== 'r1_bridge3') s.quests.done.push(q.id);
  for (let k = 1; k <= 8; k++) s.puzzles[`lp0${k}`] = { stars: 3, bestMoves: 1 };
  const free = s.board.map((c, i) => (c.t === 'e' ? i : -1)).filter((i) => i >= 0);
  put(s, free[0], 'wood:6');
  put(s, free[2], 'stone:6');
  s.leaves = 500;
  s.level = 60; // no level-up leaves in this check
  const { s: n, ev } = run(s, { type: 'completeQuest', id: 'r1_bridge3' });
  assert.ok(n.regions.includes(2));
  assert.ok(ev.some((e) => e.type === 'region' && e.n === 2));
  assert.ok(n.leaves >= 500 - 120 + 150, 'pays 120, earns the 150-coin reward (former 5 tokens) and achievements');
  assert.ok(availableQuests(n).some((q) => q.id === 'r2_niko'));
});

test('region vitality grows with restoration', () => {
  const s = fresh();
  assert.equal(regionVitality(s, 1), 0);
  s.structures.r1_cottage = STRUCTURE_STAGES.r1_cottage;
  assert.ok(regionVitality(s, 1) > 0);
});

test('orders appear after the opening and can be delivered for leaves', () => {
  const s = fresh();
  s.quests.done.push('r1_light', 'r1_garden1');
  const ticked = apply(s, { type: 'tick' }, T0).state;
  assert.equal(ticked.orders.length, 3);
  const o = ticked.orders[0];
  let cell = 0;
  for (const it of o.items) for (let k = 0; k < it.n; k++) {
    while (ticked.board[cell].t !== 'e') cell++;
    put(ticked, cell, it.item);
  }
  const { s: n } = run(ticked, { type: 'deliverOrder', id: o.id });
  assert.equal(n.stats.orders, 1);
  assert.equal(n.leaves, ticked.leaves + o.leaves);
  assert.equal(n.orders.length, 3); // refilled
});

test('daily tasks: three per day, claim once, missing days are not punished', () => {
  const s = fresh();
  const d0 = apply(s, { type: 'tick' }, T0).state;
  assert.equal(d0.daily.tasks.length, 3);
  const t = d0.daily.tasks[0];
  const notYet = run(d0, { type: 'claimTask', id: t.id });
  assert.ok(notYet.ev.some((e) => e.type === 'denied'));
  // Ten days later: a fresh set, nothing taken away.
  const later = apply(d0, { type: 'tick' }, T0 + 10 * 86400_000).state;
  assert.notEqual(later.daily.day, d0.daily.day);
  assert.equal(later.daily.tasks.length, 3);
  assert.ok(later.leaves >= d0.leaves);
});
