'use client';

import type { Weekday, WorkingHours } from '@/lib/api';

const DAYS: Array<{ key: Weekday; label: string }> = [
  { key: 'saturday', label: 'شنبه' },
  { key: 'sunday', label: 'یکشنبه' },
  { key: 'monday', label: 'دوشنبه' },
  { key: 'tuesday', label: 'سه‌شنبه' },
  { key: 'wednesday', label: 'چهارشنبه' },
  { key: 'thursday', label: 'پنجشنبه' },
  { key: 'friday', label: 'جمعه' },
];

interface Props {
  value: WorkingHours;
  onChange: (value: WorkingHours) => void;
}

/** Seven-row weekly working-hours editor used by the business-card form. */
export function WorkingHoursEditor({ value, onChange }: Props) {
  function update(day: Weekday, patch: Partial<WorkingHours[Weekday]>) {
    const next: WorkingHours = { ...value };
    const current = next[day] ?? {};
    const merged = { ...current, ...patch };
    if (merged.closed !== true && !merged.open && !merged.close) {
      delete next[day];
    } else {
      next[day] = merged;
    }
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-ink">ساعات کاری هفتگی</p>
      <p className="text-[11px] text-muted">
        برای هر روز ساعت شروع و پایان را وارد کنید یا «تعطیل» را بزنید.
      </p>
      <ul className="divide-y divide-[var(--vintage-border)] rounded-lg border border-[var(--vintage-border)]">
        {DAYS.map((day) => {
          const entry = value[day.key];
          const closed = entry?.closed === true;
          return (
            <li
              key={day.key}
              className="flex flex-wrap items-center gap-2 p-2.5 sm:flex-nowrap"
            >
              <span className="w-16 shrink-0 text-sm text-ink">{day.label}</span>
              <label className="flex items-center gap-1 text-[11px] text-muted">
                <input
                  type="checkbox"
                  checked={closed}
                  onChange={(event) =>
                    update(day.key, {
                      closed: event.target.checked,
                      ...(event.target.checked ? { open: undefined, close: undefined } : {}),
                    })
                  }
                />
                تعطیل
              </label>
              <div className={`flex flex-1 items-center gap-1.5 ${closed ? 'opacity-40' : ''}`}>
                <input
                  type="time"
                  disabled={closed}
                  value={entry?.open ?? ''}
                  onChange={(event) => update(day.key, { open: event.target.value, closed: false })}
                  className="indeed-input max-w-28 py-1 text-xs"
                  aria-label={`ساعت شروع ${day.label}`}
                />
                <span className="text-xs text-muted">تا</span>
                <input
                  type="time"
                  disabled={closed}
                  value={entry?.close ?? ''}
                  onChange={(event) => update(day.key, { close: event.target.value, closed: false })}
                  className="indeed-input max-w-28 py-1 text-xs"
                  aria-label={`ساعت پایان ${day.label}`}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
