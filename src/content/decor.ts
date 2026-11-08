// Decoration colours for restored structures. The structure sprites are fixed art, so a choice
// recolours one tonal band of the sprite (roof tiles, painted wood, paving) instead of redrawing
// it. swatches[0] is the sprite's own colour (no change); the others are the alternatives.
import type { StructureType } from './regions';

export interface DecorStyle {
  /** Hue band (degrees) and minimum saturation of the recoloured pixels. */
  hue: number;
  width: number;
  minSat: number;
  /** Recolour near-neutral pixels (stone paving) instead of a hue band; minSat is then a maximum. */
  neutral?: boolean;
  swatches: readonly [string, string, string, string];
}

const WOOD: DecorStyle = { hue: 22, width: 13, minSat: 0.3, swatches: ['#AE6E41', '#EFE3C8', '#9AA3A8', '#6B4226'] };

export const DECOR_STYLE: Partial<Record<StructureType, DecorStyle>> = {
  cottage: { hue: 8, width: 13, minSat: 0.45, swatches: ['#9F3D21', '#4F7699', '#5E8C59', '#6B4226'] },
  bakery: { hue: 52, width: 16, minSat: 0.3, swatches: ['#6E6636', '#9F3D21', '#4F7699', '#6B4226'] },
  garden: WOOD,
  square: WOOD,
  stonepath: { hue: 0, width: 0, minSat: 0.14, neutral: true, swatches: ['#C9C4B8', '#E3C99A', '#8FA3B8', '#D9A79A'] },
};
