/** Guaranteed card packs: no randomness and no real-money purchase. */
export const CARD_PACKS = [
  { id: 'winter', name: 'Kış Kartı', price: 80, sprite: 'item.crystal:1', kind: 'theme', target: 'winter' },
  { id: 'moonlight', name: 'Ay Işığı Kartı', price: 100, sprite: 'item.lantern:4', kind: 'theme', target: 'moonlight' },
  { id: 'crystal', name: 'Kristal Atölye Kartı', price: 85, sprite: 'item.crystal:4', kind: 'workshop', target: 'crystal' },
  { id: 'moonworkshop', name: 'Ay Işığı Atölye Kartı', price: 100, sprite: 'icon.star', kind: 'workshop', target: 'moonlight' },
] as const;
export type CardId = typeof CARD_PACKS[number]['id'];
export const CARD_GOAL = 10;
export function seasonCard(level: number): CardId | undefined {
  if (level % 5 !== 0) return undefined;
  return CARD_PACKS[(Math.floor(level / 5) - 1) % CARD_PACKS.length].id;
}
