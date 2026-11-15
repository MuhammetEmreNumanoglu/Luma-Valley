import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { REGIONAL_ART } from '../src/art/regional.generated';
import { REGIONAL_STAGED_ART, regionalPropArt, regionalTreeArt, structureSpriteId } from '../src/art/ids';
import { REGIONS } from '../src/content/regions';
import { REGION_IDENTITIES } from '../src/content/regionIdentity';

test('each of the first five regions has its own landmark and crossing in all three restoration stages', () => {
  const ids = new Set(REGIONS.flatMap((r) => r.structures.map((s) => s.id)));
  for (const r of [1, 2, 3, 4, 5]) {
    const mine = Object.entries(REGIONAL_STAGED_ART).filter(([id]) => id.startsWith(`r${r}_`));
    assert.equal(mine.length, 2, `region ${r} landmark + crossing`);
    for (const [id, base] of mine) {
      assert.ok(ids.has(id), `${id} is a saved structure id`);
      for (const st of [0, 1, 2]) assert.ok(REGIONAL_ART[`${base}_${st}`], `${base}_${st}`);
    }
    assert.ok(REGIONAL_ART[regionalTreeArt(r)!], `region ${r} tree`);
    assert.ok(REGIONAL_ART[regionalPropArt(r)!], `region ${r} decoration`);
  }
  assert.equal(regionalTreeArt(6), undefined);
});

test('regional sprites pick the stage from restoration progress and keep shared art elsewhere', () => {
  assert.equal(structureSpriteId('r1_cottage', 'cottage', 0), 'regional_r1_landmark_0');
  assert.equal(structureSpriteId('r1_cottage', 'cottage', 0.5), 'regional_r1_landmark_1');
  assert.equal(structureSpriteId('r5_bridge', 'bridge', 1), 'regional_r5_crossing_2');
  assert.equal(structureSpriteId('r1_well', 'well', 1), 'st_well_2');
  assert.equal(structureSpriteId('r6_house', 'house', 1, 0, 'regional_festival_cafe'), 'regional_festival_cafe');
  assert.equal(structureSpriteId('r6_house', 'house', 0.5, 0, 'regional_festival_cafe'), 'st_house0_1');
});

test('regional sprite files exist, are distinct, and are recorded as original work in the manifest', () => {
  const manifest = JSON.parse(readFileSync('assets/art/manifest.json', 'utf8')) as { id: string; file: string; license: string }[];
  const byId = new Map(manifest.map((m) => [m.id, m]));
  const hashes = new Set<string>();
  for (const id of Object.keys(REGIONAL_ART)) {
    const m = byId.get(id);
    assert.ok(m, `${id} in manifest`);
    assert.match(m!.license, /Original work/);
    assert.ok(existsSync(m!.file), m!.file);
    hashes.add(readFileSync(m!.file).toString('base64'));
  }
  assert.equal(hashes.size, Object.keys(REGIONAL_ART).length, 'no sprite is a copy of another');
});

test('the first five regions each have a different path style', () => {
  const styles = [1, 2, 3, 4, 5].map((r) => REGION_IDENTITIES[r].path?.style);
  assert.ok(styles.every(Boolean));
  assert.equal(new Set(styles).size, 5);
});
