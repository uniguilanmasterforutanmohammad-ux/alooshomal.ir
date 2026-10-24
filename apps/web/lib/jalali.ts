/**
 * Jalali (Persian) calendar helpers shared by the admin widgets.
 *
 * The whole panel speaks the Persian calendar, so month-based charts and
 * breakdowns need the *real* Jalali month/year rather than the Gregorian one.
 * These compute on the client with `Intl` (no dependency) so the numbers line
 * up with the API-side series (`admin.service.ts`), which uses the same
 * `en-US-u-ca-persian` formatter.
 */

export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

/** Formats a number with Persian digits. */
export function fa(value: number): string {
  return value.toLocaleString('fa-IR');
}

/** Jalali month name for a 1-based month index. */
export function jalaliMonthName(month: number): string {
  return JALALI_MONTHS[Math.min(11, Math.max(0, month - 1))];
}

/** Today's Jalali year/month on the client (used for labels only). */
export function jalaliNow(): { year: number; month: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
      year: 'numeric',
      month: 'numeric',
      timeZone: 'Asia/Tehran',
    }).formatToParts(new Date());
    const read = (type: string) =>
      Number(parts.find((part) => part.type === type)?.value ?? 0);
    return { year: read('year'), month: read('month') };
  } catch {
    return { year: 0, month: 0 };
  }
}

/** Formats a Jalali year/month pair as «آبان ۱۴۰۵» (or «آبان» when `short`). */
export function jalaliMonthLabel(year: number, month: number, short = false): string {
  const name = jalaliMonthName(month);
  if (short) return `${name} ${fa(year % 100)}`;
  return `${name} ${fa(year)}`;
}
