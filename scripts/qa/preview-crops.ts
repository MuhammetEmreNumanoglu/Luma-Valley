// Contact sheet of the procedural grape / pumpkin / watermelon art, next to existing plot art.
//   node --import ./scripts/ts-register.mjs scripts/qa/preview-crops.ts <out.png>
import { readFileSync, writeFileSync } from 'node:fs';
import { Skia } from '@shopify/react-native-skia';
import { CROP_DRAWERS } from '../../src/render/crops';

const out = process.argv[2] ?? 'crops-preview.png';
const rows = [['grapeFarm', 'grapeCrop'], ['pumpkinFarm', 'pumpkinCrop'], ['melonFarm', 'melonCrop']] as const;
const S = 180;
const surface = Skia.Surface.MakeOffscreen(S * 6, S * 4)!;
const c = surface.getCanvas();
c.clear(Skia.Color('#F4F0E4'));
rows.forEach(([chain, crop], r) => {
  [...CROP_DRAWERS[chain], ...CROP_DRAWERS[crop]].forEach((d, i) => {
    c.save(); c.translate(i * S, r * S); c.scale(S / 100, S / 100); d(c); c.restore();
  });
});
// Reference row: the existing tomato chain and crop.
['item_tomatoFarm_1', 'item_tomatoFarm_2', 'item_tomatoFarm_3', 'item_tomatoFarm_4', 'item_tomatoCrop_1'].forEach((id, i) => {
  const img = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(new Uint8Array(readFileSync(`assets/art/items/${id}.png`))))!;
  c.drawImageRect(img, Skia.XYWHRect(0, 0, img.width(), img.height()), Skia.XYWHRect(i * S, 3 * S, S, S), Skia.Paint());
});
surface.flush();
writeFileSync(out, surface.makeImageSnapshot().encodeToBytes());
console.log('wrote', out);
