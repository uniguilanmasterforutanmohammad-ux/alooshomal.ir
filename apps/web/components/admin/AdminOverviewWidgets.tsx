'use client';

import { useState } from 'react';
import {
  BadgeCheck,
  BarChart3,
  IdCard,
  LifeBuoy,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';

export interface OverviewStats {
  pending: number;
  approved: number;
  rejected: number;
  published: number;
  users: number;
  scans: number;
  openTickets: number;
  totalTickets: number;
  recentUsers: number;
}

export function StatTile({
  icon: Icon,
  label,
  value,
  trend,
  trendUp,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="indeed-panel flex items-center gap-3.5 p-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--vintage-border)] bg-brand-light text-brand">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-lg font-extrabold text-ink">{value.toLocaleString('fa-IR')}</p>
        {trend ? (
          <p
            className={
              trendUp
                ? 'mt-0.5 flex items-center gap-1 text-[11px] font-bold text-emerald-600'
                : 'mt-0.5 flex items-center gap-1 text-[11px] font-bold text-amber-600'
            }
          >
            {trendUp ? (
              <TrendingUp className="size-3" aria-hidden />
            ) : (
              <TrendingDown className="size-3" aria-hidden />
            )}
            {trend}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function StatsGrid({ stats }: { stats: OverviewStats }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        icon={Users}
        label="کل کاربران"
        value={stats.users}
        trend={`${stats.recentUsers.toLocaleString('fa-IR')} کاربر جدید در ۳۰ روز`}
        trendUp
      />
      <StatTile
        icon={IdCard}
        label="بیولینک‌های منتشرشده"
        value={stats.published}
        trend={`${stats.approved.toLocaleString('fa-IR')} تأییدشده`}
        trendUp
      />
      <StatTile
        icon={LifeBuoy}
        label="تیکت‌های باز"
        value={stats.openTickets}
        trend={`از ${stats.totalTickets.toLocaleString('fa-IR')} تیکت`}
        trendUp={stats.openTickets === 0}
      />
      <StatTile
        icon={BadgeCheck}
        label="در انتظار بررسی"
        value={stats.pending}
        trend={`${stats.rejected.toLocaleString('fa-IR')} ردشده`}
        trendUp={stats.pending === 0}
      />
    </section>
  );
}

const MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

/** One Jalali month bucket of the signup series (`month` is 1-based). */
export interface SignupMonth {
  month: number;
  year: number;
  count: number;
}

/** One Jalali day-of-month bucket of the current month. */
export interface SignupDay {
  day: number;
  count: number;
}

/** The two signup series returned by `GET /admin/overview`. */
export interface SignupSeries {
  monthly: SignupMonth[];
  daily: SignupDay[];
}

export const EMPTY_SIGNUP_SERIES: SignupSeries = { monthly: [], daily: [] };

type SignupTab = 'monthly' | 'daily';

/** Formats a plain number with Persian digits. */
function fa(value: number): string {
  return value.toLocaleString('fa-IR');
}

/**
 * «آمار ثبت‌نام کاربران» with two tabs:
 *
 *   - «۱۲ ماه سال» — signups per Jalali month over the last 12 months, labelled
 *     with the real Persian month name (and the year when it changes).
 *   - «روزانه در ماه جاری» — signups per day of the *current* Jalali month.
 *
 * Both series come from the API already bucketed on the Persian calendar, so the
 * labels here are purely presentational. Every bar carries an SVG `<title>` so
 * the exact count is available on hover (and to automated tests).
 */
export function SignupChart({ series }: { series: SignupSeries }) {
  const [tab, setTab] = useState<SignupTab>('monthly');

  const monthly = series.monthly ?? [];
  const daily = series.daily ?? [];
  const bars: Array<{ value: number; label: string; full: string }> =
    tab === 'monthly'
      ? monthly.map((entry, index) => {
          const previous = monthly[index - 1];
          const yearChanged = !previous || previous.year !== entry.year;
          return {
            value: entry.count,
            // Show the month name always; append the year when it changes so
            // the last 12 months stay unambiguous across a year boundary.
            label: yearChanged
              ? `${MONTHS[entry.month - 1]} ${fa(entry.year % 100)}`
              : MONTHS[entry.month - 1],
            full: `${MONTHS[entry.month - 1]} ${fa(entry.year)}`,
          };
        })
      : daily.map((entry, index) => {
          const showLabel = daily.length <= 16 || index % 2 === 0 || index === daily.length - 1;
          return {
            value: entry.count,
            label: showLabel ? fa(entry.day) : '',
            full: `${fa(entry.day)} ${MONTHS[(monthly[monthly.length - 1]?.month ?? 1) - 1]}`,
          };
        });

  const total = bars.reduce((sum, bar) => sum + bar.value, 0);
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  const width = 640;
  const height = 260;
  const chartTop = 20;
  const chartBottom = 210;
  const left = 40;
  const right = 20;
  const usable = width - left - right;
  const slot = bars.length ? usable / bars.length : usable;
  const barWidth = Math.max(6, Math.min(26, slot * 0.6));

  return (
    <div className="indeed-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-brand" aria-hidden />
            <h3 className="text-sm font-extrabold text-ink">آمار ثبت‌نام کاربران</h3>
          </div>
          <p className="mt-1 text-xs text-muted">
            {tab === 'monthly'
              ? 'تعداد ثبت‌نام در ۱۲ ماه گذشته'
              : 'تعداد ثبت‌نام روزانه در ماه جاری'}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="بازه‌ی نمودار ثبت‌نام"
          className="flex rounded-lg border border-[var(--vintage-border)] bg-white p-0.5 text-xs font-bold"
        >
          {(
            [
              { key: 'monthly', label: '۱۲ ماه سال' },
              { key: 'daily', label: 'روزانه در ماه جاری' },
            ] as Array<{ key: SignupTab; label: string }>
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              onClick={() => setTab(item.key)}
              className={
                tab === item.key
                  ? 'rounded-md bg-brand px-3 py-1.5 text-white'
                  : 'rounded-md px-3 py-1.5 text-muted hover:text-brand'
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs text-muted">
        <span>
          مجموع این بازه: <b className="text-ink">{fa(total)}</b> نفر
        </span>
        <span aria-hidden>·</span>
        <span>
          بیشترین: <b className="text-ink">{fa(max === 1 && total === 0 ? 0 : max)}</b>
        </span>
      </div>

      {bars.length === 0 ? (
        <p className="mt-6 py-10 text-center text-sm text-muted">داده‌ای برای نمایش نیست</p>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="mt-3 w-full"
          role="img"
          aria-label="نمودار ثبت‌نام کاربران"
        >
          {[0, 1, 2, 3, 4].map((line) => {
            const y = chartTop + ((chartBottom - chartTop) / 4) * line;
            return (
              <line
                key={line}
                x1={left}
                y1={y}
                x2={width - right}
                y2={y}
                stroke="var(--vintage-border)"
                strokeWidth="1"
              />
            );
          })}

          {bars.map((bar, index) => {
            const barHeight = (bar.value / max) * (chartBottom - chartTop);
            const x = left + slot * index + (slot - barWidth) / 2;
            const y = chartBottom - barHeight;
            return (
              <g key={index}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(2, barHeight)}
                  rx="5"
                  fill="var(--vintage-accent)"
                >
                  <title>{`${bar.full}: ${fa(bar.value)} نفر`}</title>
                </rect>
                {bar.label ? (
                  <text
                    x={x + barWidth / 2}
                    y={chartBottom + 22}
                    textAnchor="middle"
                    fontSize="10.5"
                    fill="var(--vintage-ink-soft)"
                  >
                    {bar.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
