import { FARM_RECIPES, traderRecipe, type FarmRecipe } from '../content/farm';
import { canMakeItem } from './reachability';
import type { GameState } from './types';

export const SHOP_RECIPES: Record<number, number[]> = { 1: [1, 2], 2: [0], 3: [3], 4: [4] };
export const SHOP_LEVELS = [1, 1, 4, 6, 8, Infinity, Infinity];

export function farmRecipeUnlocked(s: GameState, recipe: FarmRecipe): boolean {
  return recipe.inputs.every(input => (s.harvestStock[input.item] ?? 0) >= input.count || canMakeItem(s, input.item));
}

/** A shop opens only when a complete recipe can be made; old running jobs remain accessible. */
export function shopOpen(s: GameState, shop: number): boolean {
  if (shop === 0) return true;
  const recipes = SHOP_RECIPES[shop] ?? [];
  if (s.farmFactories.grocer.readyAt && recipes.includes(s.farmFactories.grocer.recipe)) return true;
  if (s.level < SHOP_LEVELS[shop]) return false;
  return recipes.some(index => farmRecipeUnlocked(s, FARM_RECIPES.grocer[index]));
}

export function shopCanDeliver(s: GameState, shop: number): boolean {
  return shopOpen(s, shop) && !s.farmFactories.grocer.readyAt && (SHOP_RECIPES[shop] ?? []).some(index =>
    FARM_RECIPES.grocer[index].inputs.every(input => (s.harvestStock[input.item] ?? 0) >= input.count));
}

export type ShopStatus = 'locked' | 'missing' | 'available' | 'running' | 'complete';
/** Status of the particular slot, independent of other shops sharing the grocer timer. */
export function shopStatus(s: GameState, shop: number, now: number): { status: ShopStatus; readyAt: number } {
  if (!shopOpen(s, shop)) return { status: 'locked', readyAt: 0 };
  const isMerchant = shop === 0;
  const job = isMerchant ? s.farmFactories.merchant : s.farmFactories.grocer;
  const belongs = isMerchant || !!SHOP_RECIPES[shop]?.includes(job.recipe);
  if (belongs && job.readyAt > 0) return { status: now < job.readyAt ? 'running' : 'complete', readyAt: job.readyAt };
  if (!isMerchant) return { status: shopCanDeliver(s, shop) ? 'available' : 'missing', readyAt: 0 };
  const recipe = traderRecipe(s.level);
  const enough = !job.readyAt && recipe.inputs.every(input => (s.harvestStock[input.item] ?? 0) >= input.count);
  return { status: enough ? 'available' : 'missing', readyAt: 0 };
}
