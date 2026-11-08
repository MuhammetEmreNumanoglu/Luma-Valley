// Valley buildings (renewable production restored through the story).
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { NODE, NODES } from '../src/content/valley';
import { isResourceFamily } from '../src/content/resources';
import { nodeFamilies } from '../src/content/valley';
import { nodeState } from '../src/engine/nodes';
import { blank, run, T0 } from './helpers';

test('the valley produces no workshop material (wood, stone, ceramic, shell, crystal)', () => {
  for (const n of NODES) for (const f of nodeFamilies(n)) assert.ok(!isResourceFamily(f), `${n.id} yields ${f}`);
  for (const n of NODES) assert.equal(n.mode, 'jobs');
});

test('a building unlocks by level/quest, is built once with coins and never runs out', () => {
  let s = blank();
  s.level = 2;
  assert.equal(run(s, { type: 'startNode', id: 'r1_greenhouse', job: 0 }).s, s, 'must be built first');
  s.leaves = 1000;
  s = run(s, { type: 'buildNode', id: 'r1_greenhouse' }).s;
  assert.equal(s.leaves, 1000 - NODE.r1_greenhouse.build!);
  assert.equal(run(s, { type: 'buildNode', id: 'r1_greenhouse' }).s, s, 'built once');
  let t = T0;
  for (let k = 0; k < 5; k++) {
    s.energy = 100;
    s = run(s, { type: 'startNode', id: 'r1_greenhouse', job: 0 }, t).s;
    assert.equal(run(s, { type: 'startNode', id: 'r1_greenhouse', job: 0 }, t + 1).s, s, 'one job at a time');
    t += NODE.r1_greenhouse.jobs[0].seconds * 1000;
    s = run(s, { type: 'claimNode', id: 'r1_greenhouse' }, t).s;
    assert.equal(run(s, { type: 'claimNode', id: 'r1_greenhouse' }, t + 1).s, s, 'paid once');
    s.board = s.board.map((c) => (c.t === 'i' ? { t: 'e' } : c));
  }
  assert.equal(nodeState(s, 'r1_greenhouse').stage, 5);
});

test('processing: the mill takes wheat at start and returns flour', () => {
  let s = blank();
  s.regions = [1, 2];
  s.quests.done.push('r2_windmill1');
  s.harvestStock['wheatCrop:1'] = 2;
  s = run(s, { type: 'startNode', id: 'r2_mill', job: 0 }).s;
  assert.equal(s.harvestStock['wheatCrop:1'], 0);
  s = run(s, { type: 'claimNode', id: 'r2_mill' }, T0 + 180_000).s;
  assert.equal(s.board.filter((c) => c.t === 'i' && c.k === 'grain:2').length, 1);
});
