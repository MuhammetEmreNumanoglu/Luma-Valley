import { REGIONS } from '../content/regions';
import { DECORATIONS } from '../content/decorations';

export const PREMIUM_DECOR = [
  { id: 'festival_lantern', name: 'Ay Işığı Feneri', cost: 0, art: 'item_lantern_4', sprite: 'item.lantern:4', tint: '#D9B8FF' },
  { id: 'crystal_lamp', name: 'Kristal Fener', cost: 60, art: 'item_lantern_4', sprite: 'item.lantern:4', tint: '#B3F3F3' },
  { id: 'sakura_tree', name: 'Sakura Ağacı', cost: 100, art: 'prop_tree_blossom', sprite: 'item.flower:4', tint: '#F5AFCB' },
  { id: 'magic_flowers', name: 'Sihirli Çiçekler', cost: 45, art: 'prop_flowers', sprite: 'item.flower:3', tint: '#E4A8EC' },
  { id: 'pond', name: 'Küçük Gölet', cost: 150, art: 'prop_deco_pond', sprite: 'deco.pond', tint: '#92DCD9' },
  { id: 'gold_statue', name: 'Altın Heykel', cost: 180, art: 'st_statue_2', sprite: 'icon.trophy', tint: '#F5CE72' },
  { id: 'glowing_stones', name: 'Parlayan Taşlar', cost: 70, art: 'item_crystal_4', sprite: 'item.crystal:4', tint: '#A2E6ED' },
  { id: 'fairy_lights', name: 'Peri Lambası', cost: 90, art: 'prop_deco_banner', sprite: 'deco.banner', tint: '#F6D68D' },
  { id: 'fence', name: 'Özel Çit', cost: 110, art: 'prop_deco_bench', sprite: 'deco.bench', tint: '#E9CDA6' },
  { id: 'flower_path', name: 'Çiçekli Yol', cost: 80, art: 'prop_bush_flower', sprite: 'item.flower:2', tint: '#F5B9CC' },
  { id: 'waterfall', name: 'Mini Şelale', cost: 220, art: 'prop_deco_pond', sprite: 'deco.pond', tint: '#A2E9F3' },
] as const;
export type PremiumDecorId = typeof PREMIUM_DECOR[number]['id'];
export interface DecorSpot { id: string; region: number; x: number; y: number }
/** Fixed, disjoint ground points; avoid all structure hit areas and legacy decoration spots. */
export const DECOR_SPOTS: readonly DecorSpot[] = REGIONS.flatMap(r => {
  const out: DecorSpot[] = [];
  for (let y = 90; y <= 900; y += 100) for (let x = 45; x <= 355; x += 62) {
    if (r.structures.some(st => Math.abs(st.x - x) < 65 * st.s + 30 && y > st.y - 150 * st.s - 35 && y < st.y + 60)) continue;
    if (DECORATIONS.some(d => d.region === r.id && Math.hypot(d.x - x, d.y - y) < 65)) continue;
    if (out.some(d => Math.hypot(d.x - x, d.y - y) < 60)) continue;
    out.push({ id: `${r.id}:${x}:${y}`, region: r.id, x, y });
  }
  return out.slice(0, 12);
});
