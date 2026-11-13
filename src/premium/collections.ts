import type { GameState } from '../engine/types';
export type CollectionId = 'sakura' | 'crystal' | 'moonlight';
export const COSMETIC_COLLECTIONS = [
  { id: 'sakura', name: 'Sakura Koleksiyonu', reward: 25, items: [
    { type: 'theme', id: 'sakura', name: 'Sakura Vadisi', sprite: 'item.flower:4' }, { type: 'skin', id: 'sakura', name: 'Sakura Atölyesi', sprite: 'icon.upgrade' }, { type: 'decor', id: 'sakura_tree', name: 'Sakura Ağacı', sprite: 'item.flower:4' }, { type: 'decor', id: 'flower_path', name: 'Çiçekli Yol', sprite: 'item.flower:2' },
  ] },
  { id: 'crystal', name: 'Kristal Koleksiyonu', reward: 25, items: [
    { type: 'skin', id: 'crystal', name: 'Kristal Atölye', sprite: 'icon.upgrade' }, { type: 'decor', id: 'crystal_lamp', name: 'Kristal Fener', sprite: 'item.lantern:4' }, { type: 'decor', id: 'glowing_stones', name: 'Parlayan Taşlar', sprite: 'item.crystal:4' }, { type: 'decor', id: 'pond', name: 'Küçük Gölet', sprite: 'deco.pond' },
  ] },
  { id: 'moonlight', name: 'Ay Işığı Koleksiyonu', reward: 25, items: [
    { type: 'theme', id: 'moonlight', name: 'Ay Işığı Vadisi', sprite: 'item.lantern:4' }, { type: 'skin', id: 'moonlight', name: 'Ay Işığı Atölyesi', sprite: 'icon.upgrade' }, { type: 'decor', id: 'fairy_lights', name: 'Peri Lambası', sprite: 'deco.banner' }, { type: 'decor', id: 'magic_flowers', name: 'Sihirli Çiçekler', sprite: 'item.flower:3' },
  ] },
] as const;
export function ownsCosmetic(s: GameState, item: { type: string; id: string }): boolean {
  return item.type === 'theme' ? s.themes.owned.includes(item.id) : item.type === 'skin' ? s.workshopSkin.owned.includes(item.id) : item.type === 'decor' && s.premiumDecor.owned.includes(item.id);
}
