import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { blank } from './helpers';
import { familyIntroKey, needsFamilyIntro } from '../src/engine/tutorial';
import { encode, decode } from '../src/persistence/save';

test('tutorials are once per mechanic and older per-family flags are respected', () => {
  const s = blank();
  assert.equal(needsFamilyIntro(s, 'cow'), true);
  s.flags['introItem:cow'] = true;
  assert.equal(needsFamilyIntro(s, 'chicken'), false);
  assert.equal(needsFamilyIntro(s, 'tomatoFarm'), true);
  s.flags[familyIntroKey('tomatoFarm')] = true;
  assert.equal(needsFamilyIntro(s, 'wheatFarm'), false);
  assert.equal(needsFamilyIntro(s, 'energyOrb'), true);
  s.flags[familyIntroKey('energyOrb')] = true;
  const copy = decode(encode(s, 1, 1000))!.state;
  assert.equal(needsFamilyIntro(copy, 'energyOrb'), false);
  assert.equal(needsFamilyIntro(copy, 'cornFarm'), false);
});
