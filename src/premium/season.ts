/** Offline season uses Istanbul civil days (UTC+03:00); paid entitlement needs trusted server time. */
import { SEASON_DAYS, SEASON_ID, SEASON_LEVELS, SEASON_XP_CAP, SEASON_XP_PER_LEVEL } from './catalog';
import type { Stats } from '../engine/types';

export type SeasonMetric = 'merges' | 'orders' | 'produced' | 'cleared' | 'crates' | 'sold' | 'purchase';
export { SEASON_XP_CAP, SEASON_XP_PER_LEVEL };
export type SeasonPeriod = 'daily' | 'weekly' | 'season';
export type SeasonTaskId = `${SeasonPeriod}:${SeasonMetric}`;
export interface SeasonTask { id: SeasonTaskId; label: string; target: number; xp: number }
export interface PendingSeasonTask { key: string; label: string; xp: number }
export interface FreeSeason {
  id: string; start: number; highTime: number; day: number; week: number; xp: number;
  progress: Record<SeasonTaskId, number>; claimedTasks: SeasonTaskId[]; claimedRewards: number[];
  pendingTasks: PendingSeasonTask[]; legacyDaily: boolean;
  /** Progress added today to weekly and season goals (reset each Turkish day). */
  today?: Partial<Record<SeasonTaskId, number>>;
}
const DAY = 86400000;
const TURKEY_OFFSET = 3 * 3600000;
export const turkeyDay = (time: number) => Math.floor((time + TURKEY_OFFSET) / DAY);
export const turkeyWeek = (day: number) => Math.floor((day + 3) / 7);
export const untilTurkeyMidnight = (now: number) => (turkeyDay(now) + 1) * DAY - TURKEY_OFFSET - now;
// A 20–30 day journey (docs/BATTLE_PASS.md, scripts/bp-tasks-report.ts). 30 levels × 260 XP = 7,800.
// Dailies fit 30–60 minutes of play (~225 XP a day), weeklies need 3–4 days of such play (150 XP
// each), season goals 10–15 days at ~30 minutes. The one-time "first purchase" task pays 300 XP
// (about one level), so a single purchase never skips a large part of the pass. Every goal uses
// systems open from the first session (merging, orders, crates, workshop resources). "Produced"
// counts every new item (crates, harvests, producers), so its goals sit above the others.
export const SEASON_TASKS: readonly SeasonTask[] = [
  { id: 'daily:merges', label: '25 ürün birleştir', target: 25, xp: 45 },
  { id: 'daily:orders', label: '3 sipariş tamamla', target: 3, xp: 45 },
  { id: 'daily:produced', label: '20 ürün üret', target: 20, xp: 45 },
  { id: 'daily:sold', label: '4 ürünü sat', target: 4, xp: 45 },
  { id: 'daily:cleared', label: '1 kaynak yığını temizle', target: 1, xp: 45 },
  { id: 'daily:crates', label: '15 kutu aç', target: 15, xp: 45 },
  { id: 'weekly:merges', label: '160 ürün birleştir', target: 160, xp: 150 },
  { id: 'weekly:orders', label: '15 sipariş tamamla', target: 15, xp: 150 },
  { id: 'weekly:produced', label: '300 ürün üret', target: 300, xp: 150 },
  { id: 'weekly:crates', label: '150 kutu aç', target: 150, xp: 150 },
  { id: 'season:purchase', label: 'İlk Alışverişini Yap', target: 1, xp: 300 },
  { id: 'season:merges', label: '450 ürün birleştir', target: 450, xp: 200 },
  { id: 'season:orders', label: '30 sipariş tamamla', target: 30, xp: 200 },
  { id: 'season:produced', label: '800 ürün üret', target: 800, xp: 150 },
  { id: 'season:crates', label: '300 kutu aç', target: 300, xp: 150 },
  { id: 'season:cleared', label: '20 kaynak yığını temizle', target: 20, xp: 100 },
];
const DAILY_TARGETS: Partial<Record<SeasonTaskId, readonly [number, number, number]>> = {
  'daily:merges': [20, 25, 30], 'daily:orders': [2, 3, 3], 'daily:produced': [15, 20, 25],
  'daily:crates': [10, 15, 20], 'daily:cleared': [1, 1, 2], 'daily:sold': [3, 4, 5],
};
/**
 * Weekly goals take at least 3 days and season goals at least 10: a day adds at most this much,
 * so a long first session cannot finish them on day one. Daily goals have no cap.
 */
export function seasonDailyCap(task: Pick<SeasonTask, 'id' | 'target'>): number {
  if (task.id === 'season:purchase') return Infinity;
  return task.id.startsWith('weekly:') ? Math.ceil(task.target / 3) : task.id.startsWith('season:') ? Math.ceil(task.target / 10) : Infinity;
}
const DAILY_LABEL: Partial<Record<SeasonTaskId, (n: number) => string>> = {
  'daily:merges': n => `${n} ürün birleştir`, 'daily:orders': n => `${n} sipariş tamamla`, 'daily:produced': n => `${n} ürün üret`,
  'daily:crates': n => `${n} kutu aç`, 'daily:cleared': n => `${n} kaynak yığını temizle`, 'daily:sold': n => `${n} ürünü sat`,
};
/** Deterministic daily variety; a migrated day's original 50-XP terms remain intact. */
export function seasonTasks(s: FreeSeason): SeasonTask[] {
  const variant = ((s.day % 3) + 3) % 3;
  return SEASON_TASKS.filter(t => t.id !== 'daily:orders' && t.id !== 'daily:sold' || (s.legacyDaily || variant !== 1 ? t.id !== 'daily:sold' : t.id !== 'daily:orders')).map(t => {
    if (!t.id.startsWith('daily:')) return t;
    if (s.legacyDaily && ['daily:merges', 'daily:orders', 'daily:produced'].includes(t.id)) {
      const target = t.id === 'daily:merges' ? 10 : t.id === 'daily:orders' ? 3 : 5;
      return { ...t, target, xp: 50, label: t.id === 'daily:merges' ? '10 ürün birleştir' : t.id === 'daily:orders' ? '3 sipariş tamamla' : '5 ürün üret' };
    }
    const target = DAILY_TARGETS[t.id]?.[variant] ?? t.target;
    const label = DAILY_LABEL[t.id]?.(target) ?? t.label;
    return { ...t, target, label };
  });
}
export function newFreeSeason(now: number): FreeSeason {
  const day = turkeyDay(now);
  return { id: SEASON_ID, start: now, highTime: now, day, week: turkeyWeek(day), xp: 0, progress: Object.fromEntries(SEASON_TASKS.map(t => [t.id, 0])) as Record<SeasonTaskId, number>, claimedTasks: [], claimedRewards: [], pendingTasks: [], legacyDaily: false };
}
export function seasonRemaining(s: FreeSeason, now: number): number { return Math.max(0, s.start + SEASON_DAYS * DAY - Math.max(now, s.highTime)); }
export function freeSeasonLevel(s: FreeSeason): number { return Math.min(SEASON_LEVELS, Math.floor(s.xp / SEASON_XP_PER_LEVEL)); }
/** Adds XP up to the season cap; the only place free-pass XP grows. */
export function addSeasonXp(s: FreeSeason, xp: number): void { s.xp = Math.min(SEASON_XP_CAP, s.xp + Math.max(0, Math.floor(xp))); }
export function refreshFreeSeason(s: FreeSeason, now: number): void {
  s.highTime = Math.max(s.highTime, now);
  const day = turkeyDay(s.highTime), week = turkeyWeek(day);
  for (const task of seasonTasks(s)) if ((task.id.startsWith('daily:') && day > s.day) || (task.id.startsWith('weekly:') && week > s.week)) {
    if ((s.progress[task.id] ?? 0) >= task.target && !s.claimedTasks.includes(task.id)) {
      const key = `${task.id.startsWith('daily:') ? s.day : s.week}:${task.id}`;
      if (!s.pendingTasks.some(p => p.key === key)) s.pendingTasks.push({ key, label: task.label, xp: task.xp });
    }
    s.progress[task.id] = 0; s.claimedTasks = s.claimedTasks.filter(id => id !== task.id);
  }
  if (day > s.day) { s.legacyDaily = false; s.today = {}; }
  s.day = Math.max(s.day, day); s.week = Math.max(s.week, week);
}
export function recordSeasonProgress(s: FreeSeason, before: Stats, after: Stats, now: number, beforeCrates = 0, afterCrates = 0): void {
  if (!seasonRemaining(s, now)) return;
  for (const t of seasonTasks(s)) {
    const metric = t.id.split(':')[1] as SeasonMetric;
    if (metric === 'purchase') continue; // Only a successful paid in-game purchase sets this explicitly.
    const delta = metric === 'crates' ? afterCrates - beforeCrates : after[metric] - before[metric];
    const cap = seasonDailyCap(t), used = s.today?.[t.id] ?? 0;
    const add = Math.max(0, Math.min(delta, cap - used, t.target - (s.progress[t.id] ?? 0)));
    if (!add) continue;
    s.progress[t.id] = (s.progress[t.id] ?? 0) + add;
    if (cap !== Infinity) s.today = { ...s.today, [t.id]: used + add };
  }
}

/** Derived from unclaimed, actually available rewards; viewing a screen never clears these. */
export function seasonNotices(s: FreeSeason, energy: number) {
  const counts = { daily: 0, weekly: 0, season: 0, levels: 0 };
  for (const task of seasonTasks(s)) if (!s.claimedTasks.includes(task.id) && (s.progress[task.id] ?? 0) >= task.target) counts[task.id.split(':')[0] as SeasonPeriod]++;
  for (const pending of s.pendingTasks ?? []) { const match = pending.key.match(/:(daily|weekly|season):/); if (match) counts[match[1] as SeasonPeriod]++; }
  for (let n=1;n<=freeSeasonLevel(s);n++) if (!s.claimedRewards.includes(n) && (n%3!==2 || energy+15<=999)) counts.levels++;
  return { ...counts, tasks: counts.daily + counts.weekly + counts.season, any: counts.daily + counts.weekly + counts.season + counts.levels > 0 };
}
