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

export interface JalaliDate {
  year: number;
  month: number;
  day: number;
}

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** Converts ASCII digits to Persian digits without grouping separators. */
export function faDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => FA_DIGITS[Number(digit)]);
}

/** Formats a number with Persian digits. */
export function fa(value: number): string {
  return value.toLocaleString('fa-IR');
}

// ---------------------------------------------------------------------------
//  Jalali <-> Gregorian conversion
//
//  The arithmetic calendar algorithm from jalaali-js (MIT). Kept dependency-free
//  so date pickers and filters can convert on the client without a new package.
// ---------------------------------------------------------------------------

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
  2192, 2262, 2324, 2394, 2456, 3178,
];

function div(a: number, b: number): number {
  return Math.trunc(a / b);
}

function mod(a: number, b: number): number {
  return a - Math.trunc(a / b) * b;
}

function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jump = 0;

  for (let i = 1; i < bl; i += 1) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number): JalaliDate {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;

  if (k >= 0) {
    if (k <= 185) {
      return { year: jy, month: 1 + div(k, 31), day: mod(k, 31) + 1 };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }

  return { year: jy, month: 7 + div(k, 30), day: mod(k, 30) + 1 };
}

export function toJalali(
  gy: number,
  gm: number,
  gd: number,
): JalaliDate {
  return d2j(g2d(gy, gm, gd));
}

export function toGregorian(
  jy: number,
  jm: number,
  jd: number,
): { gy: number; gm: number; gd: number } {
  return d2g(j2d(jy, jm, jd));
}

export function isLeapJalaliYear(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

/** Number of days in a Jalali month (۱–۱۲). */
export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaliYear(jy) ? 30 : 29;
}

/** Parses an ISO `YYYY-MM-DD` string into a Jalali date (local time). */
export function isoToJalali(iso?: string | null): JalaliDate | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  return toJalali(Number(match[1]), Number(match[2]), Number(match[3]));
}

/** Builds an ISO `YYYY-MM-DD` string from a Jalali date. */
export function jalaliToIso(jy: number, jm: number, jd: number): string {
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
}

/** «۱۴۰۵/۰۸/۱۸» for an ISO date, or an empty string. */
export function formatJalali(iso?: string | null): string {
  const date = isoToJalali(iso);
  if (!date) return '';
  return faDigits(
    `${date.year}/${String(date.month).padStart(2, '0')}/${String(date.day).padStart(2, '0')}`,
  );
}

/** Parses a typed Jalali date («۱۴۰۵/۸/۱۸» or `1405-08-18`). */
export function parseJalali(value: string): JalaliDate | null {
  const normalized = value
    .replace(/[۰-۹]/g, (digit) => String(FA_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .trim();
  const match = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/.exec(normalized);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > jalaliMonthLength(year, month)) return null;
  return { year, month, day };
}

/** Today's local date as `YYYY-MM-DD`. */
export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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
