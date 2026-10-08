/** Working days between two inclusive YYYY-MM-DD dates, skipping weekends and public holidays. */

export function countLeaveDays(
  start: string,
  end: string,
  holidays: readonly string[],
  halfDay = false,
): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new Error("Use dates in YYYY-MM-DD format.");
  }
  if (end < start) throw new Error("The end date is before the start date.");
  const off = new Set(holidays);
  if (halfDay) {
    if (start !== end) throw new Error("A half day has to be a single date.");
    if (isWeekend(start) || off.has(start)) return 0;
    return 0.5;
  }
  let days = 0;
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last) {
    const iso = cursor.toISOString().slice(0, 10);
    if (!isWeekend(iso) && !off.has(iso)) days += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function isWeekend(iso: string): boolean {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}
