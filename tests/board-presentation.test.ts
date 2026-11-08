import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { showItemLevels } from '../src/ui/boardPresentation';

test('item level hints remain visible through player level 20', () => {
  assert.equal(showItemLevels(1), true);
  assert.equal(showItemLevels(20), true);
  assert.equal(showItemLevels(21), false);
  assert.equal(showItemLevels(100), false);
});
