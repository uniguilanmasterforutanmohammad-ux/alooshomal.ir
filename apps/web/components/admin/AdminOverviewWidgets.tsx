'use client';

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

export function SignupChart({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  const width = 640;
  const height = 260;
  const chartTop = 20;
  const chartBottom = 210;
  const slot = width / 12;
  const barWidth = 26;

  return (
    <div className="indeed-panel p-5">
      <div className="flex items-center gap-2">
        <BarChart3 className="size-4 text-brand" aria-hidden />
        <h3 className="text-sm font-extrabold text-ink">آمار ثبت‌نام کاربران</h3>
      </div>
      <p className="mt-1 text-xs text-muted">تعداد ثبت‌نام در ۱۲ ماه گذشته</p>

      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 w-full" role="img">
        {[0, 1, 2, 3, 4].map((line) => {
          const y = chartTop + ((chartBottom - chartTop) / 4) * line;
          return (
            <line
              key={line}
              x1="40"
              y1={y}
              x2={width - 20}
              y2={y}
              stroke="var(--vintage-border)"
              strokeWidth="1"
            />
          );
        })}

        {data.map((value, index) => {
          const barHeight = (value / max) * (chartBottom - chartTop);
          const x = 48 + slot * index + (slot - barWidth) / 2;
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
              />
              <text
                x={x + barWidth / 2}
                y={chartBottom + 22}
                textAnchor="middle"
                fontSize="10.5"
                fill="var(--vintage-ink-soft)"
              >
                {MONTHS[index]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
