// Sprite registry coverage: every game id has an isometric sprite file with sane metadata, so a
// missing or renamed asset is caught before it reaches a device (the renderer also falls back).
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

import { artIdForSprite, BIOME_TREES, decorationArtId, itemArtId, PROP_SMALL, producerArtId, structureArtId, structureStage } from '../src/art/ids';
import { allItemKeys } from '../src/content/families';
import { PRODUCERS } from '../src/content/producers';
import { REGIONS } from '../src/content/regions';
import { DECORATIONS } from '../src/content/decorations';

const manifest: { id: string; file: string; size: [number, number]; anchor: [number, number]; pxPerUnit: number; license: string }[] = JSON.parse(readFileSync('assets/art/manifest.json', 'utf8'));
const byId = new Map(manifest.map((m) => [m.id, m]));
const reg = readFileSync('src/art/registry.generated.ts', 'utf8');

function has(id: string) {
  const m = byId.get(id);
  assert.ok(m, `missing sprite ${id}`);
  assert.ok(existsSync(m.file), `missing file ${m.file}`);
  assert.ok(reg.includes(`'${id}':`), `not in registry ${id}`);
  // PNG signature + IHDR size matches the manifest
  const buf = readFileSync(m.file);
  assert.equal(buf.subarray(1, 4).toString(), 'PNG');
  assert.equal(buf.readUInt32BE(16), m.size[0]);
  assert.equal(buf.readUInt32BE(20), m.size[1]);
  assert.equal(buf[25], 6, `${id} must be RGBA (colour type 6)`);
  assert.ok(m.pxPerUnit > 0 && m.anchor[0] >= 0 && m.anchor[1] > 0);
  assert.ok(['CC0 1.0', 'OpenAI-generated; not represented as CC0', 'Original work, generated procedurally by this project'].includes(m.license), `unrecorded license for ${id}`);
}

test('all items and 12 producers have square sprites', () => {
  const keys = allItemKeys();
  assert.equal(keys.length, 153); // flowers and fruit end at level 4 (−12) and give two harvest goods (+2)
  for (const k of keys) {
    has(itemArtId(k));
    assert.equal(artIdForSprite(`item.${k}`), k.startsWith('starCoin:') ? 'icon_token' : itemArtId(k));
    assert.deepEqual(byId.get(itemArtId(k))!.size, [256, 256]);
  }
  for (const p of PRODUCERS) has(producerArtId(p.id));
});

test('every structure has ruin, repair and restored sprites', () => {
  assert.equal(structureStage(0), 0);
  assert.equal(structureStage(0.5), 1);
  assert.equal(structureStage(1), 2);
  for (const r of REGIONS) for (const s of r.structures) for (const k of [0, 0.5, 1]) has(structureArtId(s.type, k, s.v ?? 0));
});

test('map props and decorations have sprites', () => {
  for (const list of Object.values(BIOME_TREES)) for (const id of list) has(id);
  for (const id of Object.values(PROP_SMALL)) has(id);
  for (const d of DECORATIONS) has(decorationArtId(d.kind));
});

test('old saves keep working: item ids are unchanged and resolve to art', () => {
  // Sprite ids are derived from the save's item keys; no key is renamed by the art overhaul.
  for (const k of ['flower:1', 'wood:10', 'lantern:8', 'memory:8', 'crystal:9']) assert.ok(byId.has(itemArtId(k)));
});

test('portraits (7 × 6), the icon set and currency icons have sprites', async () => {
  const { CHARACTERS } = await import('../src/content/characters');
  const moods = ['happy', 'calm', 'curious', 'sad', 'surprised', 'proud'];
  for (const ch of CHARACTERS) for (const m of moods) {
    const id = artIdForSprite(`portrait.${ch.id}.${m}`)!;
    has(id);
  }
  const icons = ['bag', 'board', 'calendar', 'check', 'energy', 'gift', 'hint', 'journal', 'leaf', 'lock', 'map', 'puzzle', 'quests', 'reset', 'settings', 'shop', 'star', 'token', 'trophy', 'undo', 'upgrade', 'spark', 'coin'];
  for (const i of icons) has(artIdForSprite(`icon.${i}`)!);
  has('prop_bramble_1');
  has('prop_bramble_2');
  // every icon id referenced in the UI source has a sprite
  const { readdirSync } = await import('node:fs');
  const used = new Set<string>();
  const walk = (d: string) => { for (const f of readdirSync(d, { withFileTypes: true })) { if (f.isDirectory()) walk(`${d}/${f.name}`); else if (/\.tsx?$/.test(f.name)) for (const mm of readFileSync(`${d}/${f.name}`, 'utf8').matchAll(/['"]icon\.([a-zA-Z]+)['"]/g)) used.add(mm[1]); } };
  walk('src');
  for (const u of used) has(artIdForSprite(`icon.${u}`)!);
});
