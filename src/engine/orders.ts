// Villager orders and daily / weekly tasks. Generated from rules, not lists, with variety
// constraints: no family twice in a row, levels follow player progress, at most one special.
import { BALANCE, sellValue } from '../content/balance';
import { FAMILY, itemKey, parseItem, type FamilyId } from '../content/families';
import { cratePool } from '../content/progression';
import { RESOURCES } from '../content/resources';
import { NODES } from '../content/valley';
import { isNodeUnlocked } from './nodes';
import { unlockedKinds } from './resources';
import { PRODUCER, type ProducerId } from '../content/producers';
import { hashString, makeRng, nextRandom } from '../core/rng';
import { localDay, localWeek } from '../core/time';
import type { DailyTask, GameState, Order } from './types';

/**
 * Families the player can make right now: crate starters unlocked at this level, workshop
 * materials whose deliveries have arrived, and what unlocked valley buildings produce. Orders
 * only ask for these (never a chain the player has not met yet).
 */
export function producibleFamilies(s: GameState): FamilyId[] {
  const set = new Set<FamilyId>();
  for (const e of cratePool(s.level)) set.add(e.family);
  for (const k of unlockedKinds(s)) set.add(RESOURCES[k].family);
  for (const n of NODES) {
    if (!isNodeUnlocked(s, n)) continue;
    for (const j of n.jobs) if (!j.level || j.level <= s.level) for (const o of j.outputs) set.add(parseItem(o.item).f);
  }
  // Orders ask for levels 1..max−1, so single-level goods (milk, bouquets) and currencies are out.
  return [...set].filter((f) => f !== 'memory' && f !== 'coin' && f !== 'starCoin' && FAMILY[f] && FAMILY[f].levels >= 2);
}

function rand(s: GameState): number {
  const [v, n] = nextRandom(s.rng);
  s.rng = n;
  return v;
}

function orderGivers(s: GameState): string[] {
  const g = s.metChars.filter((c) => c !== 'lumi');
  return g.length ? g : ['lumi'];
}

/** Fills empty order slots. Uses and advances the save's RNG (deterministic). */
export function fillOrders(s: GameState, day: number): void {
  const fams = producibleFamilies(s);
  if (fams.length === 0) return;
  // Orders appear after the first story steps so the opening stays focused.
  if (!s.quests.done.includes('r1_garden1')) return;
  let guard = 0;
  while (s.orders.length < BALANCE.orders.slots && guard++ < 20) {
    const last = s.orders[s.orders.length - 1];
    const lastFam = last?.items[0]?.item.split(':')[0];
    const pool = fams.length > 1 ? fams.filter((f) => f !== lastFam) : fams;
    const f = pool[Math.floor(rand(s) * pool.length)];
    const fmax = FAMILY[f].levels - 1;
    const top = Math.max(2, Math.min(fmax, 2 + Math.floor(s.level / 2)));
    const low = Math.max(1, top - 2);
    const l = low + Math.floor(rand(s) * (top - low + 1));
    const items = [{ item: itemKey(f, l), n: l <= 2 && rand(s) < 0.5 ? 2 : 1 }];
    // Second line for variety once two families exist.
    if (fams.length > 1 && rand(s) < 0.45) {
      const others = fams.filter((x) => x !== f);
      const f2 = others[Math.floor(rand(s) * others.length)];
      const l2 = Math.max(1, Math.min(FAMILY[f2].levels - 1, l - 1));
      items.push({ item: itemKey(f2, l2), n: 1 });
    }
    const special = !s.orders.some((o) => o.special) && s.flags[`special:${day}`] !== true;
    if (special) s.flags[`special:${day}`] = true;
    let value = 0;
    let xp = 0;
    for (const it of items) {
      const lv = Number(it.item.split(':')[1]);
      value += sellValue(lv) * it.n;
      xp += lv * BALANCE.orders.xpPerLevel * it.n;
    }
    const leaves = Math.round(value * BALANCE.orders.multiplier * (special ? BALANCE.orders.specialBonus : 1)) + 4;
    const givers = orderGivers(s);
    s.orderSeq += 1;
    const order: Order = { id: `o${s.orderSeq}`, giver: givers[Math.floor(rand(s) * givers.length)], items, leaves, xp, special };
    s.orders.push(order);
  }
}

// `tokens` is the former Light Token reward; it is paid as coins (×30) since save v5.
type Template = { kind: DailyTask['kind']; min: number; max: number; leaves: number; tokens: number; energy: number };

const DAILY: Template[] = [
  { kind: 'merge', min: 20, max: 40, leaves: 40, tokens: 0, energy: 15 },
  { kind: 'produce', min: 25, max: 45, leaves: 40, tokens: 0, energy: 10 },
  { kind: 'order', min: 2, max: 4, leaves: 60, tokens: 1, energy: 0 },
  { kind: 'puzzle', min: 1, max: 2, leaves: 50, tokens: 1, energy: 0 },
  { kind: 'leaves', min: 120, max: 260, leaves: 0, tokens: 1, energy: 15 },
  { kind: 'mergeFamily', min: 8, max: 16, leaves: 45, tokens: 0, energy: 10 },
];

export function statFor(s: GameState, t: Pick<DailyTask, 'kind' | 'family'>): number {
  switch (t.kind) {
    case 'merge':
      return s.stats.merges;
    case 'produce':
      return s.stats.produced;
    case 'order':
      return s.stats.orders;
    case 'puzzle':
      return s.stats.puzzles;
    case 'leaves':
      return s.stats.leavesEarned;
    case 'mergeFamily':
      return s.stats.familyMerges[t.family ?? ''] ?? 0;
    case 'discover':
      return s.discovered.length;
  }
}

export function taskProgress(s: GameState, t: DailyTask): number {
  return Math.max(0, Math.min(t.target, statFor(s, t) - t.base));
}

/** Issues the day's tasks the first time a new local day is seen. Missing days costs nothing. */
export function refreshDaily(s: GameState, now: number): void {
  const day = Math.max(localDay(now, s.tzOffset), s.daily.day);
  if (day !== s.daily.day) {
    const rng = makeRng(hashString(`daily:${day}`) ^ (s.createdAt | 0));
    const fams = producibleFamilies(s);
    const pool = DAILY.filter((t) => {
      if (t.kind === 'puzzle') return true; // echo puzzle always exists
      if (t.kind === 'order') return s.quests.done.includes('r1_garden1');
      return true;
    });
    const tasks: DailyTask[] = [];
    const used = new Set<string>();
    for (let k = 0; k < BALANCE.daily.count * 4 && tasks.length < BALANCE.daily.count; k++) {
      const tpl = rng.pick(pool);
      if (used.has(tpl.kind)) continue;
      used.add(tpl.kind);
      const target = tpl.min + rng.int(tpl.max - tpl.min + 1);
      const family = tpl.kind === 'mergeFamily' ? (fams.length ? rng.pick(fams) : 'flower') : undefined;
      const scale = 1 + Math.min(2, (s.level - 1) * 0.08);
      const task: DailyTask = {
        id: `d${day}_${tasks.length}`,
        kind: tpl.kind,
        ...(family ? { family } : {}),
        target,
        base: 0,
        reward: { leaves: Math.round(tpl.leaves * scale) + tpl.tokens * 30, energy: tpl.energy },
        claimed: false,
      };
      task.base = statFor(s, task);
      tasks.push(task);
    }
    s.daily = { day, tasks };
    s.hintsDay = 0;
    s.energyBuys = 0;
  }
  const week = localWeek(day);
  if (week !== s.weekly.week) {
    const rng = makeRng(hashString(`weekly:${week}`));
    const kinds: Template[] = [
      { kind: 'merge', min: 180, max: 260, leaves: 300, tokens: 5, energy: 40 },
      { kind: 'puzzle', min: 5, max: 8, leaves: 300, tokens: 5, energy: 0 },
      { kind: 'order', min: 12, max: 18, leaves: 350, tokens: 5, energy: 30 },
    ];
    const tpl = rng.pick(kinds);
    const task: DailyTask = {
      id: `w${week}`,
      kind: tpl.kind,
      target: tpl.min + rng.int(tpl.max - tpl.min + 1),
      base: 0,
      reward: { leaves: tpl.leaves + tpl.tokens * 30, energy: tpl.energy },
      claimed: false,
    };
    task.base = statFor(s, task);
    s.weekly = { week, task };
  }
  if (s.echo.day !== day) s.echo = { day, solved: false };
}
