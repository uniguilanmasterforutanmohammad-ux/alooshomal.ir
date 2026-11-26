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

function div(a: number, b: number): number {
  // Truncate toward zero (jalaali-js semantics) — `Math.floor` breaks the
  // negative intermediate values used by the conversion.
  return Math.trunc(a / b);
}

function mod(a: number, b: number): number {
  return a - Math.trunc(a / b) * b;
}

const JALALI_BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
  2192, 2262, 2324, 2394, 2456, 3178,
];

/** Gregorian day number (Rata Die) for a Gregorian date. */
function gregorianDayNumber(gy: number, gm: number, gd: number): number {
  let day =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  day = day - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return day;
}

function dayNumberToGregorian(dayNumber: number): {
  gy: number;
  gm: number;
  gd: number;
} {
  let j = 4 * dayNumber + 139361631;
  j = j + div(div(4 * dayNumber + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

/** March day on which the given Jalali year starts (jalaali-js algorithm). */
function jalaliMarchDay(jy: number): number {
  const bl = JALALI_BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = JALALI_BREAKS[0];
  let jump = 0;
  for (let i = 1; i < bl; i += 1) {
    const jm = JALALI_BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  const n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  return 20 + leapJ - leapG;
}

/**
 * Converts a Jalali date (and optional Tehran wall-clock time) to a `Date`.
 * Returns `null` for out-of-range years so callers can skip a bad row instead
 * of throwing. Tehran is UTC+03:30 (no DST since 2022).
 */
export function jalaliToDate(
  jy: number,
  jm: number,
  jd: number,
  hour = 0,
  minute = 0,
): Date | null {
  if (jy < 1200 || jy > 1600 || jm < 1 || jm > 12 || jd < 1 || jd > 31) {
    return null;
  }
  const gy = jy + 621;
  const march = jalaliMarchDay(jy);
  const dayNumber =
    gregorianDayNumber(gy, 3, march) +
    (jm - 1) * 31 -
    div(jm, 7) * (jm - 7) +
    jd -
    1;
  const { gy: outY, gm: outM, gd: outD } = dayNumberToGregorian(dayNumber);
  const utcMs = Date.UTC(outY, outM - 1, outD, hour, minute) - 3.5 * 3600_000;
  return new Date(utcMs);
}
