import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { REGIONS } from '../src/content/regions';
import { regionalIdentity } from '../src/content/regionIdentity';

test('the starting valley and five bridge regions have stable distinct identities', () => {
  const ids = REGIONS.slice(0, 6).map(regionalIdentity);
  assert.ok(ids.every(Boolean));
  assert.equal(new Set(ids.map(i => i!.key)).size, 6);
  assert.deepEqual(ids.map(i => i!.id), [1, 2, 3, 4, 5, 6]);
});
