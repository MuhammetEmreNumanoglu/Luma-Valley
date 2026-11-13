import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { QUEST, QUESTS } from '../src/content/quests';
import { parseItem } from '../src/content/families';
import { canMakeItem } from '../src/engine/reachability';
import { availableQuests } from '../src/engine/quests';
import { fillOrders, producibleFamilies } from '../src/engine/orders';
import { fresh, T0, run } from './helpers';

test('level eight garden does not require fruit and legacy quest completion remains intact', () => {
  const s = fresh(); s.level = 8; s.quests.done.push('r1_orchard');
  const q = QUEST.r1_bees; assert.ok(q.reqs.every(r => r.kind !== 'item' || parseItem(r.item).f !== 'fruit'));
  assert.ok(availableQuests(s).some(x => x.id === q.id));
  assert.ok(s.quests.done.includes('r1_orchard'));
});

test('quest prerequisites form an acyclic graph and reference existing quests', () => {
  const done = new Set<string>(), walking = new Set<string>();
  const visit = (id: string) => { assert.ok(QUEST[id], `missing prerequisite ${id}`); assert.ok(!walking.has(id), `cycle at ${id}`); if (done.has(id)) return; walking.add(id); for (const p of QUEST[id].prereq) visit(p); walking.delete(id); done.add(id); };
  for (const q of QUESTS) visit(q.id);
});

test('open goals and generated orders have current sources across levels 1–100', () => {
  for (let level=1; level<=100; level++) {
    const s = fresh(); s.level = level; s.regions = [1,2,3,4,5,6,7]; s.quests.done = QUESTS.filter(q => q.region < 2).map(q=>q.id); s.orders = [];
    for (const q of availableQuests(s)) for (const req of q.reqs) if (req.kind === 'item') assert.ok(canMakeItem(s, req.item), `${level}: ${q.id} ${req.item}`);
    fillOrders(s, 1);
    for (const o of s.orders) for (const req of o.items) assert.ok(canMakeItem(s, req.item), `${level}: order ${req.item}`);
    assert.ok(producibleFamilies(s).includes('flower'));
  }
});

test('energy crate bundle is atomic, works above zero and rejects repeated confirmation', () => {
  let s = fresh(); s.energy = 50; s.crate.charges = 48;
  const first = run(s, { type: 'buyCrates', expectedCharges: 48 }, T0); s = first.s;
  assert.equal(s.energy,25); assert.equal(s.crate.charges,58); assert.equal(s.crate.wallet?.energy,10);
  const duplicate = run(s, { type: 'buyCrates', expectedCharges: 48 }, T0+1).s; assert.equal(duplicate.energy,25); assert.equal(duplicate.crate.charges,58);
  s.energy=24; const poor = run(s, { type: 'buyCrates', expectedCharges:58 }, T0+2).s; assert.equal(poor.energy,24); assert.equal(poor.crate.charges,58);
});


test('legacy order requiring a locked family can be replaced free without consuming saved items', () => {
  const s = fresh(); s.level = 8; s.leaves = 0; s.quests.done.push('r1_garden1');
  s.board[31] = { t: 'i', k: 'flower:2' };
  s.orders = [{ id: 'old-locked', giver: 'lumi', items: [{ item: 'tomatoFarm:1', n: 1 }], leaves: 10, xp: 2, special: false }];
  const result = run(s, { type: 'replaceOrder', id: 'old-locked' }, T0);
  assert.equal(result.s.leaves, 0); assert.ok(!result.s.orders.some(o => o.id === 'old-locked'));
  assert.deepEqual(result.s.board[31], { t: 'i', k: 'flower:2' });
  for (const o of result.s.orders) for (const item of o.items) assert.ok(canMakeItem(result.s, item.item));
});
