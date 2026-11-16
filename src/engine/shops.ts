import { FARM_RECIPES, traderRecipe, type FarmRecipe } from '../content/farm';
import { canMakeItem } from './reachability';
import type { GameState } from './types';

/**
 * Grocer recipes each board shop offers (indices into FARM_RECIPES.grocer) and the player level
 * each shop needs. Shops open left to right, and only once every ingredient of one of their
 * recipes is renewable (crate families unlock in content/progression.ts):
 *   0 Valley Trader  L1  milk + wheat (TRADER_LADDER)
 *   1 Village Grocer L6  eggs (L4) + tomatoes (L6); corn chowder joins at L12
 *   2 Harvest Farm   L8  milk + wheat breakfast
 *   3 Fruit Shop     L10 flowers (L8) + fruit (L10)
 *   4 Village Dairy  L12 corn (L12) + milk
 *   5 Sunlit Kitchen L13 grapes (L13) + fruit; summer crate (melon, L15) joins later
 *   6 Stone Oven     L14 pumpkin (L14) + flour (grain, L11)
 */
export const SHOP_RECIPES: Record<number, number[]> = { 1: [1], 2: [5], 3: [0], 4: [2], 5: [6, 3], 6: [4] };
export const SHOP_LEVELS = [1, 6, 8, 10, 12, 13, 14];

export function farmRecipeUnlocked(s: GameState, recipe: FarmRecipe): boolean {
  return recipe.inputs.every(input => (s.harvestStock[input.item] ?? 0) >= input.count || canMakeItem(s, input.item));
}

/** Recipes a shop may show now: never one whose goods the player cannot make yet. */
export function shopOffers(s: GameState, shop: number): number[] {
  return (SHOP_RECIPES[shop] ?? []).filter(index => farmRecipeUnlocked(s, FARM_RECIPES.grocer[index]) || (s.farmFactories.grocer.readyAt > 0 && s.farmFactories.grocer.recipe === index));
}

export const SHOP_OPEN_MS = [120000, 1800000, 5400000, 10800000, 18000000, 28800000, 43200000] as const;
export const SHOP_NAMES = [
  { tr: 'Vadi Tüccarı', en: 'Valley Trader' }, { tr: 'Köy Bakkalı', en: 'Village Grocer' },
  { tr: 'Bereket Çiftliği', en: 'Harvest Farm' }, { tr: 'Güneş Meyvecisi', en: 'Sunny Fruit Shop' },
  { tr: 'Köy Mandırası', en: 'Village Dairy' }, { tr: 'Gün Işığı Mutfağı', en: 'Sunlit Kitchen' },
  { tr: 'Taş Fırın', en: 'Stone Oven' },
] as const;
/** Recipe/level eligibility by itself; timer state is handled separately. */
export function shopEligible(s: GameState, shop: number): boolean {
  if (shop === 0) return true;
  const recipes = SHOP_RECIPES[shop] ?? [];
  if (s.farmFactories.grocer.readyAt && recipes.includes(s.farmFactories.grocer.recipe)) return true;
  if (s.level < SHOP_LEVELS[shop]) return false;
  return recipes.some(index => farmRecipeUnlocked(s, FARM_RECIPES.grocer[index]));
}
/** Completion is persisted; a running job from an older save always remains accessible. */
export function shopOpen(s: GameState, shop: number): boolean {
  const current = s.shopUnlocks?.[shop];
  return current ? current.opened : shopEligible(s, shop);
}
/** Starts timers when conditions become true and advances them using a monotonic wall clock. */
export function refreshShopUnlocks(s: GameState, now: number): void {
  if (!s.shopUnlocks) return; // Existing unmigrated states retain legacy accessibility.
  const at = Math.max(now, s.clockHigh);
  for (let i = 0; i < SHOP_OPEN_MS.length; i++) {
    const item = s.shopUnlocks[i];
    if (!item || item.opened) continue;
    if (!item.readyAt && shopEligible(s, i)) item.readyAt = at + SHOP_OPEN_MS[i];
    if (item.readyAt > 0 && at >= item.readyAt) { item.opened = true; item.readyAt = 0; }
  }
}

export function shopCanDeliver(s: GameState, shop: number): boolean {
  return shopOpen(s, shop) && !s.farmFactories.grocer.readyAt && shopOffers(s, shop).some(index =>
    FARM_RECIPES.grocer[index].inputs.every(input => (s.harvestStock[input.item] ?? 0) >= input.count));
}

export type ShopStatus = 'locked' | 'unlocking' | 'missing' | 'available' | 'running' | 'complete';
/** Status of the particular slot, independent of other shops sharing the grocer timer. */
export function shopStatus(s: GameState, shop: number, now: number): { status: ShopStatus; readyAt: number } {
  if (!shopOpen(s, shop)) { const at = s.shopUnlocks?.[shop]?.readyAt ?? 0; return { status: at ? 'unlocking' : 'locked', readyAt: at }; }
  const isMerchant = shop === 0;
  const job = isMerchant ? s.farmFactories.merchant : s.farmFactories.grocer;
  const belongs = isMerchant || !!SHOP_RECIPES[shop]?.includes(job.recipe);
  if (belongs && job.readyAt > 0) return { status: now < job.readyAt ? 'running' : 'complete', readyAt: job.readyAt };
  if (!isMerchant) return { status: shopCanDeliver(s, shop) ? 'available' : 'missing', readyAt: 0 };
  const recipe = traderRecipe(s.level);
  const enough = !job.readyAt && recipe.inputs.every(input => (s.harvestStock[input.item] ?? 0) >= input.count);
  return { status: enough ? 'available' : 'missing', readyAt: 0 };
}
