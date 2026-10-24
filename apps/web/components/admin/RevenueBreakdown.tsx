'use client';

import { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  Clock,
  Layers,
  TrendingUp,
} from 'lucide-react';

import { fa, jalaliMonthLabel } from '@/lib/jalali';
import { cn } from '@/lib/utils';

/** One Jalali month of the revenue breakdown. */
export interface RevenueMonth {
  year: number;
  month: number;
  revenue: number;
  count: number;
}

/** One Jalali year of the revenue breakdown. */
export interface RevenueYear {
  year: number;
  revenue: number;
  count: number;
}

/** Management-facing extras returned next to the monthly/yearly series. */
export interface RevenueSummary {
  thisMonth: number;
  lastMonth: number;
  thisYear: number;
  averageMonthly: number;
  pendingBoosts: number;
  pendingAds: number;
  pendingSubscriptions: number;
  activeFeedSubscriptions: number;
  approvedCount: number;
}

function toman(value: number) {
  return `${fa(value)} تومان`;
}

/**
 * «درآمد برآوردی کل» and «مجموع تراکنش‌های تأییدشده» broken down by Jalali
 * month and year, plus the management metrics an admin actually needs: this
 * month vs. last month, the running year total, a monthly average, and the
 * pending requests still waiting for a decision (the pipeline that will become
 * revenue once approved).
 */
export function RevenueBreakdown({
  monthly,
  yearly,
  summary,
}: {
  monthly: RevenueMonth[];
  yearly: RevenueYear[];
  summary: RevenueSummary;
}) {
  const [tab, setTab] = useState<'month' | 'year'>('month');

  const rows =
    tab === 'month'
      ? monthly.map((row) => ({
          key: `${row.year}-${row.month}`,
          label: jalaliMonthLabel(row.year, row.month),
          revenue: row.revenue,
          count: row.count,
        }))
      : yearly.map((row) => ({
          key: String(row.year),
          label: `سال ${fa(row.year)}`,
          revenue: row.revenue,
          count: row.count,
        }));

  const maxRevenue = Math.max(1, ...rows.map((row) => row.revenue));
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const totalCount = rows.reduce((sum, row) => sum + row.count, 0);
  const pendingTotal =
    summary.pendingBoosts + summary.pendingAds + summary.pendingSubscriptions;

  const momDelta = summary.lastMonth
    ? Math.round(((summary.thisMonth - summary.lastMonth) / summary.lastMonth) * 100)
    : 0;
  const deltaUp = summary.thisMonth >= summary.lastMonth;

  const metrics: Array<{
    icon: typeof Clock;
    label: string;
    value: string;
    hint?: string;
    tone?: 'up' | 'down' | 'neutral';
  }> = [
    {
      icon: TrendingUp,
      label: 'درآمد ماه جاری',
      value: toman(summary.thisMonth),
      hint:
        summary.lastMonth > 0
          ? `${deltaUp ? '+' : ''}${fa(momDelta)}٪ نسبت به ماه قبل`
          : 'ماه قبل درآمدی ثبت نشده',
      tone: summary.lastMonth > 0 ? (deltaUp ? 'up' : 'down') : 'neutral',
    },
    {
      icon: CalendarRange,
      label: 'درآمد ماه قبل',
      value: toman(summary.lastMonth),
    },
    {
      icon: Layers,
      label: 'درآمد سال جاری',
      value: toman(summary.thisYear),
      hint: `میانگین ماهانه: ${toman(summary.averageMonthly)}`,
    },
    {
      icon: Clock,
      label: 'در انتظار تأیید (پایپ‌لاین)',
      value: `${fa(pendingTotal)} درخواست`,
      hint: `پله ${fa(summary.pendingBoosts)} · تبلیغ ${fa(summary.pendingAds)} · اشتراک ${fa(summary.pendingSubscriptions)}`,
      tone: pendingTotal > 0 ? 'down' : 'neutral',
    },
  ];

  return (
    <section className="indeed-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-ink">تفکیک درآمد بر اساس ماه و سال</h3>
          <p className="mt-1 text-xs text-muted">
            درآمد برآوردی و تعداد تراکنش‌های تأییدشده، به تفکیک تقویم شمسی.
          </p>
        </div>
        <div
          role="tablist"
          aria-label="تفکیک درآمد"
          className="flex rounded-lg border border-[var(--vintage-border)] bg-white p-0.5 text-xs font-bold"
        >
          {(
            [
              { key: 'month', label: 'ماهانه' },
              { key: 'year', label: 'سالانه' },
            ] as Array<{ key: 'month' | 'year'; label: string }>
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                'rounded-md px-3 py-1.5',
                tab === item.key ? 'bg-brand text-white' : 'text-muted hover:text-brand',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="flex items-start gap-3 rounded-xl border border-[var(--vintage-border)] bg-white p-3"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
              <metric.icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-muted">{metric.label}</p>
              <p className="text-sm font-extrabold text-ink">{metric.value}</p>
              {metric.hint ? (
                <p
                  className={cn(
                    'mt-0.5 flex items-center gap-1 text-[10px] font-bold',
                    metric.tone === 'up'
                      ? 'text-emerald-600'
                      : metric.tone === 'down'
                        ? 'text-amber-600'
                        : 'text-muted',
                  )}
                >
                  {metric.tone === 'up' ? (
                    <ArrowUpRight className="size-3" aria-hidden />
                  ) : metric.tone === 'down' ? (
                    <ArrowDownRight className="size-3" aria-hidden />
                  ) : null}
                  {metric.hint}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
        <span>
          جمع این بازه: <b className="text-ink">{toman(totalRevenue)}</b>
        </span>
        <span aria-hidden>·</span>
        <span>
          تعداد تراکنش: <b className="text-ink">{fa(totalCount)}</b>
        </span>
      </div>

      {/* A simple, readable table + inline bar — clearer than a chart for the
          handful of rows a month/year breakdown produces. */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-right text-sm">
          <thead>
            <tr className="border-b border-dashed border-[var(--vintage-border)] text-xs text-muted">
              <th className="px-3 py-2 font-bold">بازه</th>
              <th className="px-3 py-2 font-bold">تعداد تراکنش</th>
              <th className="px-3 py-2 font-bold">درآمد برآوردی</th>
              <th className="px-3 py-2 font-bold">سهم</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.key}
                className="border-b border-dashed border-[var(--vintage-border)] last:border-b-0"
              >
                <td className="px-3 py-2 font-bold text-ink">{row.label}</td>
                <td className="px-3 py-2 text-muted">{fa(row.count)}</td>
                <td className="px-3 py-2 font-bold text-brand">{toman(row.revenue)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-[var(--vintage-border)]">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${Math.round((row.revenue / maxRevenue) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-muted">
                      {totalRevenue
                        ? `${fa(Math.round((row.revenue / totalRevenue) * 100))}٪`
                        : '—'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
