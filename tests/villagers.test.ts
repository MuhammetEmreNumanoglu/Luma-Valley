import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apply } from '../src/engine/commands';
import { VILLAGERS, villagerAt } from '../src/content/villagers';
import { VILLAGER_TALKS } from '../src/i18n/dialogues';
import { decode, encode } from '../src/persistence/save';
import { blank, T0 } from './helpers';

test('every villager has bilingual talks and is found under its own position', () => {
  for (const v of VILLAGERS) {
    const talks = VILLAGER_TALKS[v.id];
    assert.ok(talks && talks.length >= 2, `${v.id} talks`);
    for (const talk of talks) for (const line of talk) { assert.ok(line.tr.length > 0); assert.ok(line.en.length > 0); }
    assert.equal(villagerAt(v.region, v.x, v.y - 8)?.id, v.id);
    assert.equal(villagerAt(v.region, v.x + 200, v.y - 200), null);
  }
});

test('first chat pays its gift once, later chats only count, locked regions refuse', () => {
  let s = blank(); s.regions = [1, 2, 3, 4, 5, 6];
  const coins = s.leaves;
  const first = apply(s, { type: 'talkVillager', id: 'pamuk' }, T0);
  assert.ok(first.events.some(e => e.type === 'villagerGift'));
  assert.equal(first.state.leaves, coins + 15);
  s = apply(first.state, { type: 'talkVillager', id: 'pamuk' }, T0).state;
  assert.equal(s.leaves, coins + 15); assert.equal(s.villagerTalks?.pamuk, 2);
  const reloaded = decode(encode(s, 1, T0))!.state;
  assert.equal(apply(reloaded, { type: 'talkVillager', id: 'pamuk' }, T0).state.leaves, coins + 15);
  const locked = blank(); locked.regions = [1];
  const denied = apply(locked, { type: 'talkVillager', id: 'cocuklar' }, T0);
  assert.ok(denied.events.some(e => e.type === 'denied')); assert.deepEqual(denied.state, locked);
});
