import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeResource } from '../src/engine/resources';
import { blank, run, T0 } from './helpers';
import { encode, decode } from '../src/persistence/save';

for (const kind of ['stone', 'wood'] as const) {
  test(`${kind} delivery animation describes already saved items and never pays twice`, () => {
    let s = blank();
    s.energy = 100;
    s.board[24] = makeResource(kind, 1);
    s = run(s, { type: 'breakResource', cell: 24 }, T0).s;
    const r = run(s, { type: 'claimResource', cell: 24 }, T0 + 3600_000);
    const event = r.ev.find(e => e.type === 'resourceDelivery');
    assert.ok(event && event.type === 'resourceDelivery');
    assert.equal(event.from, 24);
    assert.ok(event.to.length > 0);
    const loaded = decode(encode(r.s, 1, T0 + 3600_000))!.state;
    for (const cell of event.to) assert.deepEqual(loaded.board[cell], { t: 'i', k: event.item });
    assert.equal(run(r.s, { type: 'claimResource', cell: 24 }, T0 + 3600_001).s, r.s);
  });
}
