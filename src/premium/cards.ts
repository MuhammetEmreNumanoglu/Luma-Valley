export type PackExtra = { kind: 'energy' | 'crate' | 'gold'; amount: number };
export const PACK_EXTRAS: Record<'winter' | 'moonlight' | 'crystal' | 'moonworkshop', readonly PackExtra[]> = {
  winter: [{ kind: 'energy', amount: 10 }, { kind: 'crate', amount: 1 }, { kind: 'crate', amount: 1 }],
  moonlight: [{ kind: 'gold', amount: 50 }, { kind: 'energy', amount: 10 }, { kind: 'gold', amount: 50 }],
  crystal: [{ kind: 'crate', amount: 1 }, { kind: 'gold', amount: 50 }, { kind: 'crate', amount: 1 }],
  moonworkshop: [{ kind: 'energy', amount: 10 }, { kind: 'gold', amount: 50 }, { kind: 'crate', amount: 1 }],
};
/** Total required room, checked before charging so purchased rewards are never lost. */
export function packCapacity(extras: readonly PackExtra[]) {
  return extras.reduce((out, reward) => { if (reward.kind === 'crate') out.crates += reward.amount; if (reward.kind === 'energy') out.energy += reward.amount; return out; }, { crates: 0, energy: 0 });
}

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

/** One guaranteed crate card, purchased with gold. A card yields a uniform 5–100 crates. */
export const CRATE_CARD_PACK = { price: 1000, min: 5, max: 100 } as const;
