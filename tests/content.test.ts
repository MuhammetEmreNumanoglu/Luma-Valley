// Content validation: every reference resolves, every quest is reachable, every requirement is
// producible, every text exists in both languages, every item has a drawer.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NODES } from '../src/content/valley';
import { CRATE_POOL } from '../src/content/progression';
import { RESOURCES } from '../src/content/resources';
import { FARM_YIELD } from '../src/content/farm';

import { ACHIEVEMENTS } from '../src/content/achievements';
import { CHARACTERS } from '../src/content/characters';
import { allItemKeys, FAMILIES, isValidItem, parseItem } from '../src/content/families';
import { PRODUCER, PRODUCERS } from '../src/content/producers';
import { QUEST, QUESTS, STRUCTURE_STAGES } from '../src/content/quests';
import { REGIONS, STRUCTURE, STRUCTURES } from '../src/content/regions';
import { CONTENT } from '../src/i18n/content';
import { DIALOGUES } from '../src/i18n/dialogues';
import { STRINGS } from '../src/i18n/strings';
import { getPuzzle, puzzleRegion } from '../src/puzzles/levels';

test('families have valid level counts, including four-stage farm chains', () => {
  assert.ok(FAMILIES.length >= 12);
  for (const f of FAMILIES) assert.ok(f.levels >= 1 && f.levels <= 12, f.id);
  for (const id of ['cow', 'chicken', 'wheatFarm', 'tomatoFarm', 'cornFarm', 'grapeFarm', 'pumpkinFarm', 'melonFarm']) assert.equal(FAMILIES.find((f) => f.id === id)?.levels, 4);
});

test('ids are unique', () => {
  const uniq = (xs: string[]) => new Set(xs).size === xs.length;
  assert.ok(uniq(QUESTS.map((q) => q.id)));
  assert.ok(uniq(STRUCTURES.map((s) => s.id)));
  assert.ok(uniq(PRODUCERS.map((p) => p.id)));
  assert.ok(uniq(ACHIEVEMENTS.map((a) => a.id)));
});

test('7 regions, 70+ restoration targets, 80+ quests', () => {
  assert.equal(REGIONS.length, 7);
  assert.ok(STRUCTURES.length >= 70, `${STRUCTURES.length} structures`);
  assert.ok(QUESTS.length >= 80, `${QUESTS.length} quests`);
});

test('every quest reference resolves', () => {
  for (const q of QUESTS) {
    if (q.structure) assert.ok(STRUCTURE[q.structure], `${q.id} structure`);
    if (q.structure) assert.equal(STRUCTURE[q.structure].region, q.region, `${q.id} structure region`);
    for (const p of q.prereq) assert.ok(QUEST[p], `${q.id} prereq ${p}`);
    for (const r of q.reqs) {
      if (r.kind === 'item') assert.ok(isValidItem(r.item), `${q.id} item ${r.item}`);
      if (r.kind === 'puzzle') {
        getPuzzle(r.id);
        assert.ok(puzzleRegion(Number(r.id.slice(2))) <= q.region, `${q.id} puzzle ${r.id} region`);
      }
    }
    for (const r of q.rewards) {
      if (r.kind === 'producer') assert.ok(PRODUCER[r.id], `${q.id} producer ${r.id}`);
      if (r.kind === 'memory') assert.ok(STRUCTURE[r.id], `${q.id} memory ${r.id}`);
    }
  }
});

test('every structure is built by at least one quest', () => {
  for (const s of STRUCTURES) assert.ok(STRUCTURE_STAGES[s.id] >= 1, s.id);
});

test('quest graph is acyclic and every quest is reachable by simulation of unlocks', () => {
  const done = new Set<string>();
  const regions = new Set([1]);
  let progress = true;
  while (progress) {
    progress = false;
    for (const q of QUESTS) {
      if (done.has(q.id) || !regions.has(q.region) || !q.prereq.every((p) => done.has(p))) continue;
      done.add(q.id);
      for (const r of q.rewards) if (r.kind === 'region') regions.add(r.n);
      progress = true;
    }
  }
  const missing = QUESTS.filter((q) => !done.has(q.id)).map((q) => q.id);
  assert.deepEqual(missing, []);
  assert.equal(regions.size, 7);
});

test('no softlock: every required item has a renewable source by the time its quest is available', () => {
  // Deposits (big rocks, old trees, clay beds, veins) are finite, so each family a quest asks for
  // must also come from the crate or a renewable valley building that is unlocked *before* that
  // quest (never by the quest itself or a later one). Levels always grow, so they are not gates.
  const done = new Set<string>();
  const regions = new Set([1]);
  const renewable = () => {
    const fam = new Set<string>(CRATE_POOL.map((e) => e.family));
    // Workshop resource deliveries never run out once their region is open.
    for (const r of Object.values(RESOURCES)) if (regions.has(r.region)) fam.add(r.family);
    // Farm goods: grown animals/plots from the crate or the barn.
    const farm = (good: string) => Object.entries(FARM_YIELD).some(([k, y]) => y.item === good && fam.has(parseItem(k).f));
    for (let pass = 0; pass < 3; pass++) {
      for (const n of NODES) {
        if (n.mode !== 'jobs' || !regions.has(n.region) || (n.quest && !done.has(n.quest))) continue;
        for (const j of n.jobs) if ((j.inputs ?? []).every((i) => fam.has(parseItem(i.item).f) || farm(i.item))) for (const o of j.outputs) fam.add(parseItem(o.item).f);
      }
    }
    return fam;
  };
  let progress = true;
  while (progress) {
    progress = false;
    for (const q of QUESTS) {
      if (done.has(q.id) || !regions.has(q.region) || !q.prereq.every((p) => done.has(p))) continue;
      const fam = renewable();
      for (const r of q.reqs) if (r.kind === 'item') assert.ok(fam.has(parseItem(r.item).f), `${q.id} needs ${r.item}; renewable now: ${[...fam].join(',')}`);
      done.add(q.id);
      for (const r of q.rewards) if (r.kind === 'region') regions.add(r.n);
      progress = true;
    }
  }
  assert.equal(done.size, QUESTS.length);
});

test('the crate never gives natural materials, and every collectible item has a source', () => {
  for (const e of CRATE_POOL) assert.ok(!['wood', 'stone', 'shell', 'crystal', 'ceramic'].includes(e.family), e.family);
  const direct = new Set<string>(CRATE_POOL.map((e) => e.family));
  for (const r of Object.values(RESOURCES)) direct.add(r.family);
  for (const n of NODES) for (const j of n.jobs) for (const o of j.outputs) direct.add(parseItem(o.item).f);
  for (const y of Object.values(FARM_YIELD)) direct.add(parseItem(y.item).f);
  direct.add('starCoin'); // trader reward
  for (const f of FAMILIES) if (f.id !== 'coin') assert.ok(direct.has(f.id), `${f.id} has no source`);
});

test('requirements never ask for a max-level-plus item', () => {
  for (const q of QUESTS) for (const r of q.reqs) if (r.kind === 'item') assert.ok(isValidItem(r.item), r.item);
});

test('all UI strings exist in Turkish and English', () => {
  const tr = Object.keys(STRINGS.tr).sort();
  const en = Object.keys(STRINGS.en).sort();
  assert.deepEqual(tr, en);
  for (const k of tr) {
    assert.ok(STRINGS.tr[k as keyof typeof STRINGS.tr].length > 0, k);
    assert.ok(STRINGS.en[k as keyof typeof STRINGS.en].length > 0, k);
  }
});

test('every content name exists in both languages', () => {
  const need: string[] = [];
  for (const k of allItemKeys()) need.push(`item.${k}`);
  for (const f of FAMILIES) need.push(`family.${f.id}`);
  for (const p of PRODUCERS) need.push(`producer.${p.id}`);
  for (const n of NODES) {
    need.push(`node.${n.kind}`, `node.${n.kind}.desc`);
    for (const j of n.jobs) need.push(`job.${j.id}`);
  }
  for (const q of QUESTS) need.push(`quest.${q.id}`);
  for (const s of STRUCTURES) need.push(`structure.${s.id}`);
  for (const r of REGIONS) need.push(`region.${r.id}`, `region.${r.id}.desc`);
  for (const c of CHARACTERS) need.push(`char.${c.id}`, `char.${c.id}.role`, `char.${c.id}.bio`);
  for (const a of ACHIEVEMENTS) need.push(`ach.${a.id}`);
  for (const m of new Set(QUESTS.flatMap((q) => q.rewards.filter((r) => r.kind === 'memory').map((r) => (r as { id: string }).id)))) need.push(`memory.${m}`);
  const miss = need.filter((k) => !CONTENT.tr[k] || !CONTENT.en[k]);
  assert.deepEqual(miss, []);
});

test('every quest has start and finish dialogue in both languages', () => {
  for (const q of QUESTS) {
    const d = DIALOGUES[q.id];
    assert.ok(d, q.id);
    for (const part of [d.start, d.end]) {
      assert.ok(part.length >= 1 && part.length <= 4, `${q.id} length`);
      for (const line of part) assert.ok(line.tr && line.en, `${q.id} text`);
    }
  }
});
