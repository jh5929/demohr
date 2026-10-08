/** Office hours for DEMO SDN BHD, Asia/Kuala_Lumpur. */
export const SHIFT_START_MIN = 9 * 60;
export const GRACE_MIN = 15;
export const SHIFT_END_MIN = 18 * 60;

/**
 * Minutes late, counted from 09:00 once the 15-minute grace is passed.
 * 09:10 → 0. 09:27 → 27.
 */
export function lateMinutes(clockInMin: number): number {
  if (clockInMin <= SHIFT_START_MIN + GRACE_MIN) return 0;
  return clockInMin - SHIFT_START_MIN;
}

/** Minutes worked past 18:00. `clockOutMin` may exceed 24h when the punch is the next day. */
export function overtimeMinutes(clockOutMin: number): number {
  return Math.max(0, clockOutMin - SHIFT_END_MIN);
}

export function klParts(date = new Date()): { date: string; minutes: number; label: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: hour * 60 + minute,
    label: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}
