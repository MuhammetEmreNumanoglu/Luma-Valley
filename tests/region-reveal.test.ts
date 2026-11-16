// Region identity is data (one entry per region) and every region opens with a one-time intro.
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { REGIONAL_STAGED_ART, regionalTreeArt } from '../src/art/ids';
import { REGIONS } from '../src/content/regions';
import { pendingRegionIntro, REGION_IDENTITIES, regionIntroFlag, regionLife } from '../src/content/regionIdentity';
import { AMB } from '../src/render/ambient';
import { CONTENT } from '../src/i18n/content';
import { migrate } from '../src/persistence/save';
import { apply } from '../src/engine/commands';
import { fresh, T0 } from './helpers';

test('each identity region has its own life, art and an intro line in both languages', () => {
  const lives = new Set<string>();
  for (const r of Object.values(REGION_IDENTITIES)) {
    const life = regionLife(r.id, true);
    assert.ok(life.length >= 2, `region ${r.id} has its own life`);
    for (const l of life) assert.ok(l.kind in AMB, l.kind);
    lives.add(JSON.stringify(life.map((l) => l.kind).sort()));
    assert.ok(r.art && REGIONAL_STAGED_ART[r.art.landmark] && REGIONAL_STAGED_ART[r.art.crossing], `region ${r.id} staged art`);
    assert.ok(REGIONS[r.id - 1].structures.some((s) => s.id === r.art!.landmark));
    assert.ok(regionalTreeArt(r.id));
    assert.ok(regionLife(r.id, false).length <= life.length, 'low quality never draws more');
  }
  assert.equal(lives.size, Object.keys(REGION_IDENTITIES).length, 'no two regions share the same life');
  for (const r of REGIONS) for (const L of ['tr', 'en'] as const) assert.ok(CONTENT[L][`region.${r.id}.intro`], `intro ${r.id} ${L}`);
});

test('regions beyond the hand-made ones fall back to biome defaults without code changes', () => {
  for (let id = 8; id <= 100; id++) { assert.deepEqual(regionLife(id, true), []); assert.equal(regionalTreeArt(id), undefined); }
});

test('a new region introduces itself once; the start region and migrated saves never do', () => {
  const s = fresh();
  assert.equal(pendingRegionIntro(s), null);
  s.regions = [1, 2];
  assert.equal(pendingRegionIntro(s), 2);
  const seen = apply(s, { type: 'flag', key: regionIntroFlag(2) }, T0).state;
  assert.equal(pendingRegionIntro(seen), null);
  seen.regions = [1, 2, 3];
  assert.equal(pendingRegionIntro(seen), 3);
  const old = JSON.parse(JSON.stringify(fresh())); old.version = 15; old.regions = [1, 2, 3, 4]; old.flags = {};
  assert.equal(pendingRegionIntro(migrate(old)!), null);
});
