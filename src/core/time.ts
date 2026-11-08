// Wall-clock helpers. The engine receives `now` (ms) as an argument and never reads the clock,
// so time handling is testable and a wrong device clock can be handled in one place.

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/**
 * Elapsed time between two wall-clock readings, guarded against clock changes:
 * - backwards (clock set to the past): 0, the caller re-bases; the player loses nothing.
 * - forwards: real, but regeneration is capped by the caller (energy/charges cap at max),
 *   so jumping the clock ahead can never give more than a full refill.
 */
export function elapsed(from: number, now: number): number {
  if (!Number.isFinite(from) || !Number.isFinite(now)) return 0;
  return now > from ? now - from : 0;
}

/** Local calendar day number (days since epoch in the device's time zone). */
export function localDay(now: number, tzOffsetMinutes: number): number {
  return Math.floor((now - tzOffsetMinutes * MINUTE) / DAY);
}

/** Monday-based week number derived from a local day number (epoch day 0 was a Thursday). */
export function localWeek(day: number): number {
  return Math.floor((day + 3) / 7);
}

/**
 * Regenerates a resource that gains 1 unit every `period` ms.
 * Returns the new amount and the new anchor time. Amounts at or above `max` do not regenerate
 * (and are not reduced), and the anchor moves with `now` so no stored time is lost or doubled.
 */
export function regen(amount: number, max: number, anchor: number, now: number, period: number): { amount: number; anchor: number } {
  if (now < anchor) return { amount, anchor: now }; // clock moved backwards: re-base, no penalty
  if (amount >= max) return { amount, anchor: now };
  const dt = elapsed(anchor, now);
  const gained = Math.floor(dt / period);
  if (gained <= 0) return { amount, anchor };
  const next = Math.min(max, amount + gained);
  return { amount: next, anchor: next >= max ? now : anchor + gained * period };
}
