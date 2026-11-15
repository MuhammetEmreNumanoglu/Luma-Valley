/**
 * Villagers who live in the valley: drawn by render/ambient.ts, tappable on the map. Each has a
 * few short talks (i18n/dialogues.ts VILLAGER_TALKS) and pays a small one-time welcome gift the
 * first time the player chats (engine command `talkVillager`). Positions are region-local.
 */

export type VillagerId = 'pamuk' | 'karabas' | 'gulTeyze' | 'ordekler' | 'cocuklar';
export interface VillagerDef {
  id: VillagerId;
  region: number;
  /** Ambient drawing used for this villager (render/ambient.ts AMB key). */
  kind: 'dog' | 'gardener' | 'duck' | 'kids';
  x: number;
  y: number;
  scale: number;
  seed: number;
  /** Tap radius in world units (moving villagers get a wider target). */
  radius: number;
  gift: { coins: number } | { energy: number };
}

export const VILLAGERS: readonly VillagerDef[] = [
  { id: 'pamuk', region: 1, kind: 'dog', x: 200, y: 610, scale: 1.15, seed: 3, radius: 40, gift: { coins: 15 } },
  { id: 'karabas', region: 2, kind: 'dog', x: 120, y: 700, scale: 1.05, seed: 8, radius: 38, gift: { energy: 10 } },
  { id: 'gulTeyze', region: 3, kind: 'gardener', x: 300, y: 560, scale: 1.2, seed: 4, radius: 26, gift: { energy: 15 } },
  { id: 'ordekler', region: 4, kind: 'duck', x: 235, y: 317, scale: 0.9, seed: 2, radius: 26, gift: { coins: 20 } },
  { id: 'cocuklar', region: 6, kind: 'kids', x: 205, y: 560, scale: 1.2, seed: 2, radius: 34, gift: { coins: 25 } },
];
export const VILLAGER: Record<VillagerId, VillagerDef> = Object.fromEntries(VILLAGERS.map(v => [v.id, v])) as Record<VillagerId, VillagerDef>;

/** Nearest villager under a region-local tap, if any. */
export function villagerAt(region: number, x: number, y: number): VillagerDef | null {
  let best: VillagerDef | null = null, bestD = Infinity;
  for (const v of VILLAGERS) {
    if (v.region !== region) continue;
    const d = Math.hypot((v.x - x) * 0.8, v.y - 8 - y);
    if (d < v.radius && d < bestD) { best = v; bestD = d; }
  }
  return best;
}
