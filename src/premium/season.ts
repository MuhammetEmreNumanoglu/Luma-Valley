/** Offline season uses Istanbul civil days (UTC+03:00); paid entitlement needs trusted server time. */
import { SEASON_DAYS, SEASON_ID, SEASON_LEVELS } from './catalog';
import type { Stats } from '../engine/types';

export type SeasonMetric = 'merges' | 'orders' | 'produced' | 'cleared' | 'crates' | 'sold';
export type SeasonPeriod = 'daily' | 'weekly' | 'season';
export type SeasonTaskId = `${SeasonPeriod}:${SeasonMetric}`;
export interface SeasonTask { id: SeasonTaskId; label: string; target: number; xp: number }
export interface PendingSeasonTask { key: string; label: string; xp: number }
export interface FreeSeason {
  id: string; start: number; highTime: number; day: number; week: number; xp: number;
  progress: Record<SeasonTaskId, number>; claimedTasks: SeasonTaskId[]; claimedRewards: number[];
  pendingTasks: PendingSeasonTask[]; legacyDaily: boolean;
}
const DAY = 86400000;
const TURKEY_OFFSET = 3 * 3600000;
export const turkeyDay = (time: number) => Math.floor((time + TURKEY_OFFSET) / DAY);
export const turkeyWeek = (day: number) => Math.floor((day + 3) / 7);
export const untilTurkeyMidnight = (now: number) => (turkeyDay(now) + 1) * DAY - TURKEY_OFFSET - now;
export const SEASON_TASKS: readonly SeasonTask[] = [
  { id: 'daily:merges', label: '10 ürün birleştir', target: 10, xp: 20 },
  { id: 'daily:orders', label: '1 sipariş tamamla', target: 1, xp: 25 },
  { id: 'daily:produced', label: '5 ürün üret', target: 5, xp: 30 },
  { id: 'daily:sold', label: '1 ürünü sat', target: 1, xp: 25 },
  { id: 'daily:cleared', label: '1 kaynak yığını temizle', target: 1, xp: 35 },
  { id: 'daily:crates', label: '5 kutu aç', target: 5, xp: 40 },
  { id: 'weekly:merges', label: '100 ürün birleştir', target: 100, xp: 150 },
  { id: 'weekly:orders', label: '20 sipariş tamamla', target: 20, xp: 150 },
  { id: 'weekly:produced', label: '50 ürün üret', target: 50, xp: 150 },
  { id: 'season:merges', label: '500 ürün birleştir', target: 500, xp: 300 },
  { id: 'season:orders', label: '100 sipariş tamamla', target: 100, xp: 300 },
  { id: 'season:produced', label: '250 ürün üret', target: 250, xp: 300 },
];
/** Deterministic daily variety; a migrated day's original 50-XP terms remain intact. */
export function seasonTasks(s: FreeSeason): SeasonTask[] {
  const variant = ((s.day % 3) + 3) % 3;
  return SEASON_TASKS.filter(t => t.id !== 'daily:orders' && t.id !== 'daily:sold' || (s.legacyDaily || variant !== 1 ? t.id !== 'daily:sold' : t.id !== 'daily:orders')).map(t => {
    if (!t.id.startsWith('daily:')) return t;
    if (s.legacyDaily && ['daily:merges', 'daily:orders', 'daily:produced'].includes(t.id)) {
      const target = t.id === 'daily:merges' ? 10 : t.id === 'daily:orders' ? 3 : 5;
      return { ...t, target, xp: 50, label: t.id === 'daily:merges' ? '10 ürün birleştir' : t.id === 'daily:orders' ? '3 sipariş tamamla' : '5 ürün üret' };
    }
    const target = t.id === 'daily:merges' ? [8, 10, 12][variant] : t.id === 'daily:orders' ? [1, 2, 1][variant] : t.id === 'daily:produced' ? [5, 6, 7][variant] : t.id === 'daily:crates' ? [5, 6, 7][variant] : 1;
    const label = t.id === 'daily:merges' ? `${target} ürün birleştir` : t.id === 'daily:orders' ? `${target} sipariş tamamla` : t.id === 'daily:produced' ? `${target} ürün üret` : t.id === 'daily:crates' ? `${target} kutu aç` : t.id === 'daily:sold' ? '1 ürünü sat' : '1 kaynak yığını temizle';
    return { ...t, target, label };
  });
}
export function newFreeSeason(now: number): FreeSeason {
  const day = turkeyDay(now);
  return { id: SEASON_ID, start: now, highTime: now, day, week: turkeyWeek(day), xp: 0, progress: Object.fromEntries(SEASON_TASKS.map(t => [t.id, 0])) as Record<SeasonTaskId, number>, claimedTasks: [], claimedRewards: [], pendingTasks: [], legacyDaily: false };
}
export function seasonRemaining(s: FreeSeason, now: number): number { return Math.max(0, s.start + SEASON_DAYS * DAY - Math.max(now, s.highTime)); }
export function freeSeasonLevel(s: FreeSeason): number { return Math.min(SEASON_LEVELS, Math.floor(s.xp / 100)); }
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
  if (day > s.day) s.legacyDaily = false;
  s.day = Math.max(s.day, day); s.week = Math.max(s.week, week);
}
export function recordSeasonProgress(s: FreeSeason, before: Stats, after: Stats, now: number, beforeCrates = 0, afterCrates = 0): void {
  if (!seasonRemaining(s, now)) return;
  for (const t of seasonTasks(s)) {
    const metric = t.id.split(':')[1] as SeasonMetric;
    const delta = metric === 'crates' ? afterCrates - beforeCrates : after[metric] - before[metric];
    s.progress[t.id] = Math.min(t.target, (s.progress[t.id] ?? 0) + Math.max(0, delta));
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
