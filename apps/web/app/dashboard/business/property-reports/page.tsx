'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { api, type PropertyReportOverview } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';

const money = (value: number) => `${value.toLocaleString('fa-IR')} تومان`;

export default function PropertyReportsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [data, setData] = useState<PropertyReportOverview | null>(null);

  const load = useCallback(async () => {
    setData(await api.get<PropertyReportOverview>('/property-reports/overview'));
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/property-reports');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  const cards = data
    ? [
        { label: 'فایل فعال', value: data.activeFiles },
        { label: 'فایل کهنه (۳۰ روز)', value: data.staleFiles },
        { label: 'تقاضای بی‌پیگیری', value: data.leadsWithoutFollowUp },
        { label: 'بازدید انجام‌شده', value: data.visitsDone },
        { label: 'قرارداد امضاشده', value: data.signedContracts },
        { label: 'نسبت تبدیل', value: `${Math.round(data.conversion * 100)}٪` },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">داشبورد عملکرد املاک</h1>
        <p className="mt-1 text-sm text-muted">
          فایل فعال و کهنه، تقاضای بی‌پیگیری، بازدید، تبدیل و وصولی به تفکیک مشاور و محله.
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
            <h2 className="text-sm font-extrabold text-ink">کمیسیون</h2>
            <p className="mt-2 text-xs text-muted">مورد انتظار: {money(data.commissionExpected)}</p>
            <p className="text-xs text-muted">وصول‌شده: {money(data.commissionCollected)}</p>
            <p className="text-xs text-muted">مانده: {money(data.commissionOutstanding)}</p>
          </section>
          <section className="indeed-panel p-4">
            <h2 className="text-sm font-extrabold text-ink">به تفکیک مشاور</h2>
            {data.byAgent.length === 0 ? (
              <p className="mt-2 text-xs text-muted">داده‌ای نیست.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1 text-xs">
                {data.byAgent.map((row) => (
                  <li key={row.agentId} className="flex items-center justify-between">
                    <span>{row.agentId}</span>
                    <span className="text-muted">{row.contracts} قرارداد • {money(row.collected)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="indeed-panel p-4">
            <h2 className="text-sm font-extrabold text-ink">فایل فعال به تفکیک محله</h2>
            {data.byNeighborhood.length === 0 ? (
              <p className="mt-2 text-xs text-muted">داده‌ای نیست.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1 text-xs">
                {data.byNeighborhood.map((row) => (
                  <li key={row.label} className="flex items-center justify-between">
                    <span>{row.label}</span>
                    <span className="text-muted">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="indeed-panel p-4">
            <h2 className="text-sm font-extrabold text-ink">منبع فایل</h2>
            {data.bySource.length === 0 ? (
              <p className="mt-2 text-xs text-muted">داده‌ای نیست.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1 text-xs">
                {data.bySource.map((row) => (
                  <li key={row.label} className="flex items-center justify-between">
                    <span>{row.label}</span>
                    <span className="text-muted">{row.count}</span>
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
