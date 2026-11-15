import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { newGame } from '../src/engine/state';
import { apply } from '../src/engine/commands';

test('repeated group taps retrieve exactly the requested kind, even when slot positions change', () => {
  let s = newGame(1000, 4);
  s.rewardStorage = ['stone:1', 'wood:1', 'stone:1'];
  for (let i = 0; i < 2; i++) {
    const r = apply(s, { type: 'retrieveReward', slot: 0, expectedItem: 'stone:1' }, 1001 + i);
    assert.equal(r.events.filter(e => e.type === 'gift' && e.origin === 'storage').length, 1);
    s = r.state;
  }
  assert.deepEqual(s.rewardStorage, ['wood:1']);
  const stale = apply(s, { type: 'retrieveReward', slot: 0, expectedItem: 'stone:1' }, 1005);
  assert.ok(stale.events.some(e => e.type === 'denied'));
  assert.deepEqual(stale.state.rewardStorage, ['wood:1']);
});

test('full board cannot consume a stored item', () => {
  const s = newGame(1000, 4); s.rewardStorage = ['stone:1'];
  s.board = s.board.map(cell => cell.t === 'x' ? cell : { t: 'i', k: 'wood:1' });
  const r = apply(s, { type: 'retrieveReward', slot: 0, expectedItem: 'stone:1' }, 1001);
  assert.ok(r.events.some(e => e.type === 'denied'));
  assert.deepEqual(r.state.rewardStorage, ['stone:1']);
});
