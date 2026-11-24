'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { api, type EduReportOverview } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';

const money = (value: number) => `${value.toLocaleString('fa-IR')} تومان`;
const DISCIPLINES: Record<string, string> = { SPORT: 'ورزشی', ART: 'هنری', MUSIC: 'موسیقی', OTHER: 'سایر' };

export default function EduReportsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [data, setData] = useState<EduReportOverview | null>(null);

  const load = useCallback(async () => {
    setData(await api.get<EduReportOverview>('/edu-reports/overview'));
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/edu-reports');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  const cards = data
    ? [
        { label: 'کلاس فعال', value: data.activeClasses },
        { label: 'هنرجوی فعال', value: data.activeStudents },
        { label: 'ثبت‌نام فعال', value: data.activeEnrollments },
        { label: 'جلسه‌ی برگزارشده', value: data.sessionsDone },
        { label: 'نرخ حضور', value: `${Math.round(data.attendanceRate * 100)}٪` },
        { label: 'بسته‌ی رو به اتمام', value: data.expiringPackages },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">داشبورد آموزش</h1>
        <p className="mt-1 text-sm text-muted">
          ظرفیت پرشده، نرخ حضور، مطالبات شهریه، وصولی و سود هر کلاس.
        </p>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="indeed-panel p-4">
            <p className="text-xs text-muted">{card.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-ink">{card.value}</p>
          </div>
        ))}
      </div>

      {data ? (
        <div className="grid gap-3 md:grid-cols-2">
          <section className="indeed-panel p-4">
            <h2 className="text-sm font-extrabold text-ink">مالی</h2>
            <p className="mt-2 text-xs text-muted">شهریه‌ی ثبت‌شده: {money(data.totalRevenue)}</p>
            <p className="text-xs text-muted">وصول‌شده: {money(data.collected)}</p>
            <p className="text-xs text-muted">مطالبات: {money(data.receivables)}</p>
            <p className="text-xs text-muted">تسویه‌ی مربیان در انتظار: {money(data.pendingSettlements)}</p>
          </section>
          <section className="indeed-panel p-4">
            <h2 className="text-sm font-extrabold text-ink">کلاس‌ها به تفکیک رشته</h2>
            {data.byDiscipline.length === 0 ? <p className="mt-2 text-xs text-muted">داده‌ای نیست.</p> : (
              <ul className="mt-2 flex flex-col gap-1 text-xs">
                {data.byDiscipline.map((row) => (
                  <li key={row.label} className="flex items-center justify-between">
                    <span>{DISCIPLINES[row.label] ?? row.label}</span>
                    <span className="text-muted">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="indeed-panel p-4 md:col-span-2">
            <h2 className="text-sm font-extrabold text-ink">سود هر کلاس</h2>
            {data.classProfit.length === 0 ? <p className="mt-2 text-xs text-muted">داده‌ای نیست.</p> : (
              <ul className="mt-2 flex flex-col gap-2 text-xs">
                {data.classProfit.map((row) => (
                  <li key={row.classId} className="flex flex-wrap items-center justify-between gap-2">
                    <span>{row.title} • {row.enrolled}/{row.capacity} ({Math.round(row.utilization * 100)}٪)</span>
                    <span className="text-muted">
                      شهریه {money(row.revenue)} • وصول {money(row.collected)} • هزینه {money(row.expenses)} • سود {money(row.profit)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
