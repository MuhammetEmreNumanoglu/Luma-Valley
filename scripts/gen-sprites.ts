// Bakes the procedural drawings into PNG sprites for React Native UI (lists, chips, journal,
// dialogue) and writes assets/sprites/manifest.json. Board, map and puzzle draw the same
// functions live with Skia.
//   node --import ./scripts/ts-register.mjs scripts/gen-sprites.ts             # sprites + manifest
//   node --import ./scripts/ts-register.mjs scripts/gen-sprites.ts --preview d # review sheets
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { Skia, type SkCanvas } from '@shopify/react-native-skia';

import { CHARACTERS, type Mood } from '../src/content/characters';
import { allItemKeys } from '../src/content/families';
import { PRODUCERS } from '../src/content/producers';
import { QUESTS, STRUCTURE_STAGES } from '../src/content/quests';
import { MAP_W, REGION_H, REGIONS } from '../src/content/regions';
import { drawIcon, ICON_IDS } from '../src/render/icons';
import { drawItem } from '../src/render/items';
import { drawRegion, drawFog } from '../src/render/map';
import { drawPortrait } from '../src/render/portraits';
import { drawLevelPips, drawProducer } from '../src/render/producers';
import { drawPuzzle } from '../src/render/puzzle';
import { getPuzzle } from '../src/puzzles/levels';
import { propagate, solvedCopy } from '../src/puzzles/lightpaths';

const MOODS: Mood[] = ['calm', 'happy', 'curious', 'sad', 'surprised', 'proud'];

function surfacePng(w: number, h: number, bg: string | null, draw: (c: SkCanvas) => void): Uint8Array {
  const surface = Skia.Surface.MakeOffscreen(w, h)!;
  const c = surface.getCanvas();
  c.clear(Skia.Color(bg ?? 'transparent'));
  draw(c);
  surface.flush();
  return surface.makeImageSnapshot().encodeToBytes();
}

function boxPng(size: number, draw: (c: SkCanvas) => void): Uint8Array {
  return surfacePng(size, size, null, (c) => {
    c.scale(size / 100, size / 100);
    draw(c);
  });
}

function sheet(cells: ((c: SkCanvas) => void)[], cols: number, cell = 120): Uint8Array {
  const rows = Math.ceil(cells.length / cols);
  return surfacePng(cols * cell, rows * cell, '#F4EAD5', (c) => {
    const bg = Skia.Paint();
    bg.setColor(Skia.Color('#FFF8EA'));
    cells.forEach((d, i) => {
      c.save();
      c.translate((i % cols) * cell + 10, Math.floor(i / cols) * cell + 10);
      c.scale((cell - 20) / 100, (cell - 20) / 100);
      c.drawRRect(Skia.RRectXY(Skia.XYWHRect(0, 0, 100, 100), 16, 16), bg);
      d(c);
      c.restore();
    });
  });
}

const args = process.argv.slice(2);
const pi = args.indexOf('--preview');

if (pi >= 0) {
  const dir = args[pi + 1];
  mkdirSync(dir, { recursive: true });
  const keys = allItemKeys();
  writeFileSync(join(dir, 'items.png'), sheet(keys.map((k) => (c: SkCanvas) => drawItem(c, k)), 10));
  writeFileSync(join(dir, 'producers.png'), sheet(PRODUCERS.map((p) => (c: SkCanvas) => { drawProducer(c, p.id); drawLevelPips(c, 2, p.levels.length); }), 6));
  writeFileSync(join(dir, 'portraits.png'), sheet(CHARACTERS.flatMap((ch) => MOODS.map((m) => (c: SkCanvas) => drawPortrait(c, ch.id, m))), 6));
  writeFileSync(join(dir, 'icons.png'), sheet(ICON_IDS.map((id) => (c: SkCanvas) => drawIcon(c, id)), 7));
  const regionShot = (rid: number, k: number, name: string) => {
    const r = REGIONS[rid - 1];
    const stages: Record<string, number> = {};
    for (const s of r.structures) stages[s.id] = Math.round((STRUCTURE_STAGES[s.id] ?? 1) * k);
    const markers: Record<string, boolean> = {};
    if (k < 1) markers[r.structures[2].id] = false;
    const scale = 1;
    writeFileSync(
      join(dir, name),
      surfacePng(MAP_W * scale, REGION_H * scale, null, (c) => {
        c.scale(scale, scale);
        drawRegion(c, r, { unlocked: true, vitality: k, stages, totals: STRUCTURE_STAGES, decor: {}, markers, quality: 'high' });
      }),
    );
  };
  for (const rid of [1, 2, 3, 4, 5, 6, 7]) {
    regionShot(rid, 0, `region${rid}_ruin.png`);
    regionShot(rid, 1, `region${rid}_done.png`);
  }
  regionShot(1, 0.5, 'region1_half.png');
  writeFileSync(join(dir, 'fog.png'), surfacePng(MAP_W, 400, null, (c) => drawFog(c, 3)));
  for (const id of ['lp03', 'lp30', 'lp75']) {
    const p = getPuzzle(id);
    const s = 52;
    for (const [suffix, pz] of [['start', p], ['solved', solvedCopy(p)]] as const) {
      writeFileSync(
        join(dir, `puzzle_${id}_${suffix}.png`),
        surfacePng(p.w * s + 40, p.h * s + 40, '#141A2E', (c) => {
          c.translate(20, 20);
          drawPuzzle(c, pz, propagate(pz), s, null, null);
        }),
      );
    }
  }
  console.log('preview written to', dir, QUESTS.length);
} else {
  const OUT = join(process.cwd(), 'assets', 'sprites');
  mkdirSync(OUT, { recursive: true });
  type Entry = { id: string; category: string; file: string; width: number; height: number; screens: string[]; source: string; license: string };
  const manifest: Entry[] = [];
  const req: string[] = [];
  const add = (id: string, category: string, file: string, size: number, screens: string[], source: string, png: Uint8Array) => {
    writeFileSync(join(OUT, file), png);
    manifest.push({ id, category, file: `assets/sprites/${file}`, width: size, height: size, screens, source, license: 'Original work, generated procedurally by this project' });
    req.push(`  '${id}': require('../../assets/sprites/${file}'),`);
  };
  for (const k of allItemKeys()) add(`item.${k}`, 'item', `item_${k.replace(':', '_')}.png`, 96, ['Quests', 'Journal', 'Board', 'Orders'], 'src/render/items.ts', boxPng(96, (c) => drawItem(c, k)));
  for (const p of PRODUCERS) add(`producer.${p.id}`, 'producer', `producer_${p.id}.png`, 96, ['Shop', 'Journal'], 'src/render/producers.ts', boxPng(96, (c) => drawProducer(c, p.id)));
  for (const ch of CHARACTERS) for (const m of MOODS) add(`portrait.${ch.id}.${m}`, 'portrait', `portrait_${ch.id}_${m}.png`, 192, ['Dialogue', 'Quests', 'Journal'], 'src/render/portraits.ts', boxPng(192, (c) => drawPortrait(c, ch.id, m)));
  for (const id of ICON_IDS) add(`icon.${id}`, 'icon', `icon_${id}.png`, 72, ['HUD', 'Navigation', 'Buttons'], 'src/render/icons.ts', boxPng(72, (c) => drawIcon(c, id)));
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ generated: 'scripts/gen-sprites.ts', count: manifest.length, assets: manifest }, null, 1));
  writeFileSync(
    join(process.cwd(), 'src', 'render', 'sprites.generated.ts'),
    `// Generated by scripts/gen-sprites.ts. Do not edit by hand.\n/* eslint-disable */\nexport const SPRITES: Record<string, number> = {\n${req.join('\n')}\n};\n`,
  );
  console.log(`${manifest.length} sprites`);
}
