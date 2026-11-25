'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';

interface ReportRow {
  propertyId?: string;
  title?: string;
  channelId?: string | null;
  name?: string;
  nights: number;
  revenue: number;
  bookings: number;
  occupancy?: number;
  commission?: number;
  net?: number;
}

interface Report {
  from: string;
  to: string;
  rangeDays: number;
  properties: number;
  bookings: number;
  bookedNights: number;
  revenue: number;
  adr: number;
  revPar: number;
  occupancy: number;
  perProperty: ReportRow[];
  perChannel: ReportRow[];
  monthly: Array<{ month: string; nights: number; revenue: number }>;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { from: isoDate(from), to: isoDate(to) };
}

function money(value: number): string {
  return `${Math.round(value).toLocaleString('fa-IR')} تومان`;
}

export default function AccommodationReportsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [range, setRange] = useState(defaultRange);
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await api.get<Report>(
          `/accommodations/reports?from=${range.from}&to=${range.to}`,
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/accommodations/reports');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  const field =
    'rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">گزارش و تحلیل اقامتگاه</h1>
        <p className="mt-1 text-sm text-muted">
          اشغال، درآمد، ADR/RevPAR و سهم هر کانال در بازه‌ی انتخابی.
        </p>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted">
          از
          <input
            type="date"
            className={`${field} mt-1 block`}
            value={range.from}
            onChange={(event) =>
              setRange((prev) => ({ ...prev, from: event.target.value }))
            }
          />
        </label>
        <label className="text-xs text-muted">
          تا
          <input
            type="date"
            className={`${field} mt-1 block`}
            value={range.to}
            onChange={(event) =>
              setRange((prev) => ({ ...prev, to: event.target.value }))
            }
          />
        </label>
      </div>

      {loading && !data ? (
        <p className="text-muted">در حال محاسبه…</p>
      ) : !data ? null : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'درآمد', value: money(data.revenue) },
              { label: 'شب‌های رزروشده', value: data.bookedNights.toLocaleString('fa-IR') },
              { label: 'نرخ اشغال', value: `${data.occupancy.toLocaleString('fa-IR')}٪` },
              { label: 'ADR (میانگین شب)', value: money(data.adr) },
              { label: 'RevPAR', value: money(data.revPar) },
              { label: 'رزروها', value: data.bookings.toLocaleString('fa-IR') },
              { label: 'اقامتگاه‌ها', value: data.properties.toLocaleString('fa-IR') },
              { label: 'روزهای بازه', value: data.rangeDays.toLocaleString('fa-IR') },
            ].map((item) => (
              <div key={item.label} className="indeed-panel p-4">
                <p className="text-[11px] text-muted">{item.label}</p>
                <p className="mt-1 text-sm font-extrabold text-ink">{item.value}</p>
              </div>
            ))}
          </div>

          <section className="indeed-panel p-4">
            <h2 className="mb-3 text-sm font-extrabold text-ink">به تفکیک اقامتگاه</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="text-muted">
                  <tr>
                    <th className="p-2">اقامتگاه</th>
                    <th className="p-2">رزرو</th>
                    <th className="p-2">شب</th>
                    <th className="p-2">اشغال</th>
                    <th className="p-2">درآمد</th>
                  </tr>
                </thead>
                <tbody>
                  {data.perProperty.map((row) => (
                    <tr key={row.propertyId} className="border-t border-[var(--vintage-border)]">
                      <td className="p-2 font-bold text-ink">{row.title}</td>
                      <td className="p-2">{row.bookings.toLocaleString('fa-IR')}</td>
                      <td className="p-2">{row.nights.toLocaleString('fa-IR')}</td>
                      <td className="p-2">{(row.occupancy ?? 0).toLocaleString('fa-IR')}٪</td>
                      <td className="p-2">{money(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="indeed-panel p-4">
            <h2 className="mb-3 text-sm font-extrabold text-ink">به تفکیک کانال</h2>
            {data.perChannel.length === 0 ? (
              <p className="text-xs text-muted">در این بازه رزروی ثبت نشده است.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="text-muted">
                    <tr>
                      <th className="p-2">کانال</th>
                      <th className="p-2">رزرو</th>
                      <th className="p-2">ناخالص</th>
                      <th className="p-2">کمیسیون</th>
                      <th className="p-2">خالص</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.perChannel.map((row) => (
                      <tr key={row.channelId ?? 'direct'} className="border-t border-[var(--vintage-border)]">
                        <td className="p-2 font-bold text-ink">{row.name}</td>
                        <td className="p-2">{row.bookings.toLocaleString('fa-IR')}</td>
                        <td className="p-2">{money(row.revenue)}</td>
                        <td className="p-2">{money(row.commission ?? 0)}</td>
                        <td className="p-2">{money(row.net ?? row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="indeed-panel p-4">
            <h2 className="mb-3 text-sm font-extrabold text-ink">روند ماهانه</h2>
            {data.monthly.length === 0 ? (
              <p className="text-xs text-muted">داده‌ای برای نمایش نیست.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.monthly.map((row) => {
                  const max = Math.max(...data.monthly.map((item) => item.revenue), 1);
                  return (
                    <div key={row.month} className="flex items-center gap-2 text-[11px]">
                      <span className="w-16 text-muted" dir="ltr">{row.month}</span>
                      <div className="h-3 flex-1 rounded bg-[var(--vintage-paper)]">
                        <div
                          className="h-3 rounded bg-brand"
                          style={{ width: `${Math.round((row.revenue / max) * 100)}%` }}
                        />
                      </div>
                      <span className="w-28 text-left font-bold text-ink">
                        {money(row.revenue)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
