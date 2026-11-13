// Spec scenarios (§24 / §31): play through the opening with a scripted player, close and reopen
// the app (save → load), and keep going; offline play including a puzzle and a region unlock.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { QUEST } from '../src/content/quests';
import { apply, type Command } from '../src/engine/commands';
import { canComplete } from '../src/engine/quests';
import type { GameState } from '../src/engine/types';
import { getPuzzle } from '../src/puzzles/levels';
import { solvedCopy } from '../src/puzzles/lightpaths';
import { SaveStore, type KeyValue } from '../src/persistence/storage';
import { autoplayStep } from '../scripts/autoplay';
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

test('opening: tutorial merge → first quest → reward → save → reload → progress kept', async () => {
  let s = fresh();
  // Tutorial drag: the lone seed onto the gap between the other two.
  const seeds = s.board.map((c, i) => (c.t === 'i' ? i : -1)).filter((i) => i >= 0);
  assert.equal(seeds.length, 3);
  const r = apply(s, { type: 'move', from: seeds[2], to: seeds[0] + 1 }, T0);
  assert.ok(r.events.some((e) => e.type === 'merge'));
  s = r.state;
  assert.ok(canComplete(s, QUEST.r1_light));
  s = apply(s, { type: 'completeQuest', id: 'r1_light' }, T0 + 1000).state;
  const leaves = s.leaves;
  const kv = new MemKV();
  await new SaveStore(kv).save(s, T0 + 1000);
  const loaded = (await new SaveStore(kv).load())!;
  assert.deepEqual(loaded.quests.done, ['r1_light']);
  assert.equal(loaded.leaves, leaves);
  assert.deepEqual(loaded.board, s.board);
});

test('crate-led opening remains deterministic and never restores retired production buildings', () => {
  let s: GameState = fresh(3);
  let now = T0;
  for (let steps = 0; steps < 20; steps++) {
    const cmd: Command = { type: 'openCrate' };
    s = apply(s, cmd, now).state;
    now += 2_000;
  }
  assert.equal(s.crate.charges, 30);
  assert.equal(s.board.filter((c) => c.t === 'p' && c.p !== 'merchant').length, 0);
});

test('offline: solve a puzzle, complete a quest, restart, continue', async () => {
  let s = fresh();
  s.quests.done.push('r1_light', 'r1_garden1', 'r1_mira');
  for (const id of ['lp01', 'lp02']) {
    const p = getPuzzle(id);
    s = apply(s, { type: 'solvePuzzle', id, rotations: solvedCopy(p).tiles.map((t) => t.rot), moves: p.par }, T0).state;
  }
  s = apply(s, { type: 'completeQuest', id: 'r1_shrine' }, T0).state;
  const kv = new MemKV();
  await new SaveStore(kv).save(s, T0);
  const back = (await new SaveStore(kv).load())!;
  assert.ok(back.puzzles.lp02);
  assert.equal(back.structures.r1_shrine, 1);
});
