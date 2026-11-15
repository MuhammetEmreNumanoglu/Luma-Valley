import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { colors, darkUiColors } from '../src/ui/theme';

function luminance(hex: string): number {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function contrast(a: string, b: string): number {
  const [lo, hi] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (hi + 0.05) / (lo + 0.05);
}
test('secondary text on quest and premium card surfaces has AA contrast in both UI themes', () => {
  for (const palette of [colors, darkUiColors]) {
    assert.ok(contrast(palette.inkSoft, palette.paper) >= 4.5);
    assert.ok(contrast(palette.inkSoft, palette.tokenSoft) >= 4.5);
  }
});
