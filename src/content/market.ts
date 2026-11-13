/** Modest, one-per-Istanbul-day offers paid with earned coins. */
export const MARKET_OFFERS = [
  { id: 'crates', name: '5 tohum kutusu', price: 80, sprite: 'icon.gift', crates: 5, items: [] },
  { id: 'materials', name: 'Dal ve çakıl', price: 40, sprite: 'item.wood:1', crates: 0, items: ['wood:1', 'stone:1'] },
] as const;
export type MarketOfferId = typeof MARKET_OFFERS[number]['id'];
