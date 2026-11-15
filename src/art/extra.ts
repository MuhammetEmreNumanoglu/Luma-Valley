import type { ArtSprite } from './registry.generated';

/** Original project artwork; separate from the generated Kenney asset registry. */
export const EXTRA_ART: Record<string, ArtSprite> = {
  'regional_greenhouse': { src: require('../../assets/art/structures/regional_greenhouse_original.png'), w: 768, h: 512, ax: 384, ay: 465, unit: 350 },
  'regional_forest_cabin': { src: require('../../assets/art/structures/regional_forest_cabin_original.png'), w: 768, h: 512, ax: 384, ay: 465, unit: 350 },
  'regional_lakeside_dock': { src: require('../../assets/art/structures/regional_lakeside_dock_original.png'), w: 768, h: 512, ax: 384, ay: 465, unit: 350 },
  'regional_festival_cafe': { src: require('../../assets/art/structures/regional_festival_cafe_original.png'), w: 768, h: 512, ax: 384, ay: 465, unit: 350 },
  'regional_watermill_restored': { src: require('../../assets/art/structures/watermill_landmark_original.png'), w: 768, h: 512, ax: 384, ay: 465, unit: 350 },
};
