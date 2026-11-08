// Rebuild only the three new procedural crop families; existing art stays untouched.
import { readFileSync, writeFileSync } from 'node:fs';
import { Skia } from '@shopify/react-native-skia';
import { drawItem } from '../src/render/items';

const keys = ['beanFarm', 'barleyFarm', 'lentilFarm'].flatMap((family) => [1, 2, 3, 4].map((level) => `${family}:${level}`)).concat(['beanCrop:1', 'barleyCrop:1', 'lentilCrop:1']);
const manifestPath = 'assets/art/manifest.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>[];
for (const key of keys) {
  const id = `item_${key.replace(':', '_')}`;
  const surface = Skia.Surface.MakeOffscreen(256, 256)!;
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('transparent'));
  canvas.scale(2.56, 2.56);
  drawItem(canvas, key);
  surface.flush();
  writeFileSync(`assets/art/items/${id}.png`, surface.makeImageSnapshot().encodeToBytes());
  const entry = { id, category: 'items', file: `assets/art/items/${id}.png`, size: [256, 256], anchor: [128, 220], pxPerUnit: 256, source: 'Procedurally drawn for Luma Valley', license: 'Original work, generated procedurally by this project' };
  const i = manifest.findIndex((m) => m.id === id);
  if (i >= 0) manifest[i] = entry; else manifest.push(entry);
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
