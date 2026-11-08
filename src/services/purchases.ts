// Real-money purchases. The game talks to this interface only; the engine never sees a store SDK.
//
// Current build: NO store is configured (no App Store Connect / Play Console products, no
// receipt-validation server). `UnconfiguredStore` therefore reports every product as
// unavailable and every purchase as failed. It never reports success, and it never grants
// coins. See docs/MONETIZATION.md for the production plan (StoreKit 2 / Play Billing via a
// maintained Expo-compatible library such as react-native-purchases, receipts validated
// server-side, then `grantPurchase` with the store transaction id).

// Since save v5 the game has one currency (coins); packs grant coins. Light Tokens were removed.
export type ProductId = 'luma.coins.small' | 'luma.coins.medium' | 'luma.coins.large' | 'luma.coins.extra';

/** Product catalogue: coin amounts only. Prices always come from the store, in local currency. */
export const PRODUCTS: readonly { id: ProductId; coins: number; bonusPct: number }[] = [
  { id: 'luma.coins.small', coins: 1800, bonusPct: 0 },
  { id: 'luma.coins.medium', coins: 4800, bonusPct: 10 },
  { id: 'luma.coins.large', coins: 10800, bonusPct: 20 },
  { id: 'luma.coins.extra', coins: 24000, bonusPct: 35 },
];

export interface StoreProduct {
  id: ProductId;
  coins: number;
  /** Localised price string from the store, e.g. "₺49,99". Null when unknown. */
  price: string | null;
}

export type PurchaseResult =
  | { status: 'verified'; transactionId: string; productId: ProductId; coins: number }
  | { status: 'cancelled' }
  | { status: 'pending' }
  | { status: 'unavailable'; reason: 'notConfigured' | 'offline' | 'storeError' };

export interface PurchaseService {
  readonly configured: boolean;
  products(): Promise<StoreProduct[]>;
  /** Resolves only after server-side verification. Callers grant coins on 'verified' only. */
  purchase(id: ProductId, online: boolean): Promise<PurchaseResult>;
}

export class UnconfiguredStore implements PurchaseService {
  readonly configured = false;

  async products(): Promise<StoreProduct[]> {
    return PRODUCTS.map((p) => ({ id: p.id, coins: p.coins, price: null }));
  }

  async purchase(_id: ProductId, online: boolean): Promise<PurchaseResult> {
    if (!online) return { status: 'unavailable', reason: 'offline' };
    return { status: 'unavailable', reason: 'notConfigured' };
  }
}

export const purchases: PurchaseService = new UnconfiguredStore();
