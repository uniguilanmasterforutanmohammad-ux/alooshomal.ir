import { Clock } from 'lucide-react';

import type { Weekday, WorkingHours } from '@/lib/api';

const DAYS: Array<{ key: Weekday; label: string; short: string }> = [
  { key: 'saturday', label: 'شنبه', short: 'ش' },
  { key: 'sunday', label: 'یکشنبه', short: 'ی' },
  { key: 'monday', label: 'دوشنبه', short: 'د' },
  { key: 'tuesday', label: 'سه‌شنبه', short: 'س' },
  { key: 'wednesday', label: 'چهارشنبه', short: 'چ' },
  { key: 'thursday', label: 'پنجشنبه', short: 'پ' },
  { key: 'friday', label: 'جمعه', short: 'ج' },
];

const EN_TO_KEY: Record<string, Weekday> = {
  Saturday: 'saturday',
  Sunday: 'sunday',
  Monday: 'monday',
  Tuesday: 'tuesday',
  Wednesday: 'wednesday',
  Thursday: 'thursday',
  Friday: 'friday',
};

function todayKey(): Weekday {
  try {
    const name = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: 'Asia/Tehran',
    }).format(new Date());
    return EN_TO_KEY[name] ?? 'saturday';
  } catch {
    return 'saturday';
  }
}

/** Weekly working-hours table for the public business profile. */
export function WorkingHoursTable({ hours }: { hours?: WorkingHours | null }) {
  const today = todayKey();
  const entries = DAYS.map((day) => ({
    ...day,
    value: hours?.[day.key],
  })).filter((entry) => entry.value);

  if (entries.length === 0) {
    return (
      <p className="rounded-lg bg-soft p-3 text-sm text-muted">
        ساعات کاری این کسب‌وکار ثبت نشده است.
      </p>
    );
  }

  return (
    <ul className="biz-hours">
      {entries.map((entry) => {
        const value = entry.value;
        const closed = value?.closed === true || (!value?.open && !value?.close);
        return (
          <li
            key={entry.key}
            className={entry.key === today ? 'biz-hours-today' : undefined}
          >
            <span className="flex items-center gap-2">
              <span className="biz-hours-dot" aria-hidden>
                {entry.short}
              </span>
              <span className="text-sm text-ink">{entry.label}</span>
              {entry.key === today ? (
                <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand">
                  امروز
                </span>
              ) : null}
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              <Clock className="size-3.5 text-muted" aria-hidden />
              {closed ? (
                <span className="font-bold text-red-600">تعطیل</span>
              ) : (
                <span className="font-bold text-ink" dir="ltr">
                  {value?.open ?? '—'} - {value?.close ?? '—'}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
