'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

interface OverviewProperty {
  id: string;
  title: string;
  propertyType: string;
  status: string;
}

interface OverviewBlock {
  id: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  source: string;
}

interface OverviewBooking {
  id: string;
  propertyId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: string;
  channel?: { id: string; name: string } | null;
}

interface Overview {
  from: string;
  to: string;
  properties: OverviewProperty[];
  blocks: OverviewBlock[];
  bookings: OverviewBooking[];
}

const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isoDay(value: string): string {
  return value.slice(0, 10);
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(date);
}

export function AccommodationCalendarGrid() {
  const [month, setMonth] = useState(() => monthStart(new Date()));
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const from = dayKey(month);
  const to = dayKey(addMonths(month, 1));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await api.get<Overview>(
          `/accommodations/calendar?from=${from}&to=${to}`,
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const days = useMemo(() => {
    const out: Date[] = [];
    const end = addMonths(month, 1);
    for (
      let cursor = new Date(month);
      cursor < end;
      cursor = new Date(
        Date.UTC(
          cursor.getUTCFullYear(),
          cursor.getUTCMonth(),
          cursor.getUTCDate() + 1,
        ),
      )
    ) {
      out.push(cursor);
    }
    return out;
  }, [month]);

  async function syncAll() {
    setSyncing(true);
    try {
      const result = await api.post<{
        channels: number;
        synced: number;
        results: Array<{ name: string; ok: boolean; synced: number }>;
      }>('/accommodation-channels/sync-all', {});
      const failed = result.results.filter((item) => !item.ok).length;
      toast.success(
        `${result.channels} کانال بررسی شد؛ ${result.synced} رویداد همگام شد${
          failed ? ` • ${failed} خطا` : ''
        }`,
      );
      await load();
    } catch {
      // API client already surfaced the failure message.
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section className="indeed-panel flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-ink">تقویم یکپارچه</h2>
          <p className="text-[11px] text-muted">
            رزروها، مسدودی دستی و مسدودی کانال‌ها در یک نگاه.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonth((prev) => addMonths(prev, -1))}
            className="rounded-lg border border-[var(--vintage-border)] p-1.5 text-muted"
            aria-label="ماه قبل"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
          <span className="min-w-[110px] text-center text-xs font-extrabold text-ink">
            {monthLabel(month)}
          </span>
          <button
            type="button"
            onClick={() => setMonth((prev) => addMonths(prev, 1))}
            className="rounded-lg border border-[var(--vintage-border)] p-1.5 text-muted"
            aria-label="ماه بعد"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setMonth(monthStart(new Date()))}
            className="rounded-lg border border-[var(--vintage-border)] px-2 py-1 text-[11px] font-bold text-muted"
          >
            امروز
          </button>
          <button
            type="button"
            onClick={() => void syncAll()}
            disabled={syncing}
            className="inline-flex items-center gap-1 rounded-lg border border-brand/30 px-2 py-1 text-[11px] font-bold text-brand disabled:opacity-50"
          >
            <RefreshCw className={`size-3 ${syncing ? 'animate-spin' : ''}`} aria-hidden />
            همگام‌سازی کانال‌ها
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted">
        <span className="inline-flex items-center gap-1">
          <span className="size-2.5 rounded-sm bg-emerald-500" /> رزرو تأییدشده
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2.5 rounded-sm bg-amber-400" /> درخواست در انتظار
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2.5 rounded-sm bg-sky-400" /> مسدودی کانال
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2.5 rounded-sm bg-gray-400" /> مسدودی دستی
        </span>
      </div>

      {loading && !data ? (
        <p className="text-xs text-muted">در حال بارگذاری تقویم…</p>
      ) : !data || data.properties.length === 0 ? (
        <p className="text-xs text-muted">هنوز اقامتگاهی برای نمایش نیست.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-[10px]">
            <thead>
              <tr>
                <th className="sticky right-0 z-10 min-w-[130px] bg-[var(--vintage-surface)] p-1 text-right font-bold text-muted">
                  اقامتگاه
                </th>
                {days.map((day) => {
                  const weekday = WEEKDAYS[day.getUTCDay()];
                  const isFriday = day.getUTCDay() === 5;
                  return (
                    <th
                      key={dayKey(day)}
                      className={`min-w-[22px] p-0.5 text-center font-normal ${
                        isFriday ? 'text-red-500' : 'text-muted'
                      }`}
                    >
                      <div>{day.getUTCDate()}</div>
                      <div className="text-[8px] opacity-70">{weekday}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.properties.map((property) => (
                <tr key={property.id}>
                  <th className="sticky right-0 z-10 max-w-[160px] truncate bg-[var(--vintage-surface)] p-1 text-right font-bold text-ink">
                    {property.title}
                  </th>
                  {days.map((day) => {
                    const key = dayKey(day);
                    const booking = data.bookings.find(
                      (item) =>
                        item.propertyId === property.id &&
                        isoDay(item.checkIn) <= key &&
                        key < isoDay(item.checkOut),
                    );
                    const block = data.blocks.find(
                      (item) =>
                        item.propertyId === property.id &&
                        isoDay(item.startDate) <= key &&
                        key < isoDay(item.endDate),
                    );
                    const tone = booking
                      ? booking.status === 'CONFIRMED'
                        ? 'bg-emerald-500'
                        : 'bg-amber-400'
                      : block
                        ? block.source === 'ICAL'
                          ? 'bg-sky-400'
                          : 'bg-gray-400'
                        : 'bg-[var(--vintage-paper)]';
                    const title = booking
                      ? `رزرو ${booking.guestName}${
                          booking.channel ? ` • ${booking.channel.name}` : ''
                        }`
                      : block
                        ? `مسدود${block.reason ? `: ${block.reason}` : ''}`
                        : 'آزاد';
                    return (
                      <td key={key} className="p-0.5">
                        <div
                          title={title}
                          className={`h-5 w-full rounded-sm ${tone}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
