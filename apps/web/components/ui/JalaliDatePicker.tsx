'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

import {
  JALALI_MONTHS,
  faDigits,
  formatJalali,
  isoToJalali,
  jalaliMonthLength,
  jalaliToIso,
  parseJalali,
  todayIso,
} from '@/lib/jalali';
import { cn } from '@/lib/utils';

interface JalaliDatePickerProps {
  /** Gregorian ISO date (`YYYY-MM-DD`) or an empty string. */
  value: string;
  onChange: (iso: string) => void;
  id?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Inclusive ISO bounds. */
  min?: string;
  max?: string;
  'aria-label'?: string;
}

const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function weekdayIndex(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  // 0 = شنبه … 6 = جمعه
  return (new Date(year, month - 1, day).getDay() + 1) % 7;
}

/**
 * Jalali (Persian) date picker used everywhere a date is chosen or shown.
 * The stored value stays a Gregorian ISO string so the API contract is
 * unchanged; only the input and the calendar are Persian.
 */
export function JalaliDatePicker({
  value,
  onChange,
  id,
  className,
  placeholder = 'انتخاب تاریخ',
  disabled = false,
  min,
  max,
  'aria-label': ariaLabel,
}: JalaliDatePickerProps) {
  const [open, setOpen] = useState(false);
  // `draft` holds what the user is typing; `null` means "show the value".
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? formatJalali(value);
  const initial = isoToJalali(value) ?? isoToJalali(todayIso())!;
  const [view, setView] = useState({
    year: initial.year,
    month: initial.month,
  });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const selected = useMemo(() => isoToJalali(value), [value]);
  const today = useMemo(() => isoToJalali(todayIso()), []);
  // A generous range around today (or the explicit min/max) so the year
  // dropdown works for birth dates and scheduled dates alike.
  const years = useMemo(() => {
    const todayYear = today?.year ?? 1400;
    const minYear = min ? isoToJalali(min)?.year : undefined;
    const maxYear = max ? isoToJalali(max)?.year : undefined;
    const start = Math.min(minYear ?? todayYear - 100, view.year);
    const end = Math.max(maxYear ?? todayYear + 10, view.year);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [today, min, max, view.year]);

  function showCalendar() {
    if (disabled) return;
    const base = isoToJalali(value) ?? today;
    if (base) setView({ year: base.year, month: base.month });
    setOpen(true);
  }

  function shiftMonth(delta: number) {
    setView((current) => {
      const zeroBased = current.month - 1 + delta;
      const year = current.year + Math.floor(zeroBased / 12);
      const month = ((zeroBased % 12) + 12) % 12 + 1;
      return { year, month };
    });
  }

  function pick(year: number, month: number, day: number) {
    onChange(jalaliToIso(year, month, day));
    setDraft(null);
    setOpen(false);
  }

  function commitTyped() {
    const parsed = parseJalali(text);
    if (parsed) {
      onChange(jalaliToIso(parsed.year, parsed.month, parsed.day));
    }
    setDraft(null);
  }

  const length = jalaliMonthLength(view.year, view.month);
  const leading = weekdayIndex(jalaliToIso(view.year, view.month, 1));
  const cells: Array<number | null> = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function isDisabled(day: number): boolean {
    const iso = jalaliToIso(view.year, view.month, day);
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          dir="ltr"
          autoComplete="off"
          className="indeed-input w-full pl-9 text-center"
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={ariaLabel}
          onFocus={showCalendar}
          onClick={showCalendar}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitTyped}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitTyped();
              setOpen(false);
            }
          }}
        />
        <button
          type="button"
          onClick={showCalendar}
          disabled={disabled}
          aria-label="باز کردن تقویم شمسی"
          className="absolute inset-y-0 left-2 flex items-center text-neutral-500 hover:text-neutral-800 disabled:opacity-50"
        >
          <CalendarDays className="size-4" aria-hidden />
        </button>
        {value && !disabled ? (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setDraft(null);
            }}
            aria-label="پاک کردن تاریخ"
            className="absolute inset-y-0 right-2 flex items-center text-neutral-400 hover:text-red-600"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          role="dialog"
          aria-label="تقویم شمسی"
          className="absolute z-50 mt-2 w-72 rounded-xl border border-[var(--vintage-border)] bg-white p-3 shadow-xl"
        >
          <div className="mb-2 flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="ماه قبل"
              className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
            <div className="flex flex-1 items-center justify-center gap-1">
              <select
                value={view.month}
                onChange={(event) =>
                  setView((current) => ({
                    ...current,
                    month: Number(event.target.value),
                  }))
                }
                aria-label="انتخاب ماه"
                className="rounded-md border border-neutral-200 bg-white px-1.5 py-1 text-xs font-bold text-ink outline-none"
              >
                {JALALI_MONTHS.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
              <select
                value={view.year}
                onChange={(event) =>
                  setView((current) => ({
                    ...current,
                    year: Number(event.target.value),
                  }))
                }
                aria-label="انتخاب سال"
                className="rounded-md border border-neutral-200 bg-white px-1.5 py-1 text-xs font-bold text-ink outline-none"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {faDigits(year)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="ماه بعد"
              className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-bold text-neutral-400">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-sm">
            {cells.map((day, index) => {
              if (day === null) {
                return <span key={`blank-${index}`} />;
              }
              const isSelected =
                selected?.year === view.year &&
                selected.month === view.month &&
                selected.day === day;
              const isToday =
                today?.year === view.year &&
                today.month === view.month &&
                today.day === day;
              const disabledDay = isDisabled(day);
              return (
                <button
                  key={`${view.year}-${view.month}-${day}`}
                  type="button"
                  disabled={disabledDay}
                  onClick={() => pick(view.year, view.month, day)}
                  className={cn(
                    'rounded-md py-1.5 transition-colors',
                    isSelected
                      ? 'bg-[var(--indeed-blue)] font-bold text-white'
                      : 'hover:bg-neutral-100',
                    !isSelected && isToday && 'ring-1 ring-[var(--indeed-blue)]',
                    disabledDay && 'cursor-not-allowed opacity-40',
                  )}
                >
                  {faDigits(day)}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2">
            <button
              type="button"
              onClick={() => {
                if (today) pick(today.year, today.month, today.day);
              }}
              className="text-xs font-bold text-[var(--indeed-blue)] hover:underline"
            >
              امروز
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-neutral-500 hover:text-neutral-800"
            >
              بستن
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
