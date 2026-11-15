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

/** Composite an rgba() colour over an opaque hex background. */
function over(rgba: string, bg: string): string {
  const m = rgba.match(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/);
  if (!m) return rgba;
  const a = Number(m[4]);
  const b = [1, 3, 5].map(i => parseInt(bg.slice(i, i + 2), 16));
  return '#' + [1, 2, 3].map((k, i) => Math.round(Number(m[k]) * a + b[i] * (1 - a)).toString(16).padStart(2, '0')).join('');
}

test('journal: reward numbers, hints and locked silhouettes are readable in both themes', () => {
  for (const [name, p] of [['light', colors], ['dark', darkUiColors]] as const) {
    for (const bg of [p.paper, p.cream, p.surface, p.surfaceAlt]) assert.ok(contrast(p.hintInk, bg) >= 4.5, `${name} hint on ${bg}: ${contrast(p.hintInk, bg).toFixed(2)}`);
    assert.ok(contrast(p.rewardChipInk, p.rewardChip) >= 4.5, `${name} gold reward chip`);
    assert.ok(contrast(p.inkSoft, p.honeySoft) >= 4.5, `${name} meta on a ready stage`);
    assert.ok(contrast(p.inkSoft, p.sageSoft) >= 4.5, `${name} meta on a claimed stage`);
    // The locked cell stands out from the card and the silhouette from the cell (non-text ≥ 3:1).
    assert.ok(contrast(over(p.lockedInk, p.lockedCell), p.lockedCell) >= 3, `${name} silhouette on locked cell`);
    assert.ok(contrast(p.lockedCell, p.paper) >= 1.15, `${name} locked cell differs from the card`);
  }
  // The old combination (honey ink on white in dark mode) is what made numbers vanish.
  assert.ok(contrast(darkUiColors.honeyInk, '#FFFFFF') < 1.5);
});
