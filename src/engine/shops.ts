import { FARM_RECIPES, traderRecipe, type FarmRecipe } from '../content/farm';
import { canMakeItem } from './reachability';
import type { GameState } from './types';

export const SHOP_RECIPES: Record<number, number[]> = { 1: [1, 2], 2: [0], 3: [3], 4: [4], 5: [5], 6: [6] };
export const SHOP_LEVELS = [1, 1, 4, 6, 8, 10, 12];

export function farmRecipeUnlocked(s: GameState, recipe: FarmRecipe): boolean {
  return recipe.inputs.every(input => (s.harvestStock[input.item] ?? 0) >= input.count || canMakeItem(s, input.item));
}

export const SHOP_OPEN_MS = [120000, 1800000, 5400000, 10800000, 18000000, 28800000, 43200000] as const;
export const SHOP_NAMES = [
  { tr: 'Vadi Tüccarı', en: 'Valley Trader' }, { tr: 'Köy Bakkalı', en: 'Village Grocer' },
  { tr: 'Bereket Çiftliği', en: 'Harvest Farm' }, { tr: 'Güneş Meyvecisi', en: 'Sunny Fruit Shop' },
  { tr: 'Taş Fırın', en: 'Stone Oven' }, { tr: 'Köy Mandırası', en: 'Village Dairy' },
  { tr: 'Gün Işığı Mutfağı', en: 'Sunlit Kitchen' },
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
  return shopOpen(s, shop) && !s.farmFactories.grocer.readyAt && (SHOP_RECIPES[shop] ?? []).some(index =>
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
