/**
 * Jalali (Persian) calendar helpers shared by the admin dashboard reports.
 *
 * The panel shows Jalali dates, so signup/revenue series are bucketed on the
 * Persian calendar in `Asia/Tehran` rather than in Gregorian months.
 */

const PERSIAN_DATE_FORMAT = new Intl.DateTimeFormat('en-US-u-ca-persian', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'Asia/Tehran',
});

/** Splits a Gregorian `Date` into its `Asia/Tehran` Jalali y/m/d parts. */
export function jalaliParts(date: Date): { year: number; month: number; day: number } {
  const parts = PERSIAN_DATE_FORMAT.formatToParts(date);
  const read = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: read('year'), month: read('month'), day: read('day') };
}

/** Shifts a Jalali `(year, month)` pair by `delta` months (month is 1-based). */
export function addJalaliMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const zero = year * 12 + (month - 1) + delta;
  return { year: Math.floor(zero / 12), month: (zero % 12) + 1 };
}
