'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, Coins, PackageCheck, Truck } from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { api, type RetailReportsOverview } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';

function money(value: number) {
  return `${value.toLocaleString('fa-IR')} تومان`;
}

export default function ReportsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [data, setData] = useState<RetailReportsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/reports');
      return;
    }
    if (!enabled) return;
    let active = true;
    api
      .get<RetailReportsOverview>('/retail/reports/overview')
      .then((result) => {
        if (active) setData(result);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hydrated, token, router, enabled]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">گزارش فروش و سود</h1>
        <p className="mt-1 text-sm text-muted">
          فروش خالص، سود سفارش‌ها، واریزی‌های تطبیق‌نیافته و کالاهای کم‌موجود در
          ۳۰ روز گذشته.
        </p>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      {loading || !data ? (
        <p className="text-sm text-muted">در حال بارگذاری…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="indeed-panel p-4">
              <p className="flex items-center gap-1 text-xs text-muted">
                <Coins className="size-3.5" aria-hidden /> فروش خالص
              </p>
              <p className="mt-1 text-xl font-extrabold text-ink">
                {money(data.totals.netSales)}
              </p>
              <p className="text-[11px] text-muted">
                {data.totals.paidOrders.toLocaleString('fa-IR')} سفارش پرداخت‌شده
              </p>
            </div>
            <div className="indeed-panel p-4">
              <p className="flex items-center gap-1 text-xs text-muted">
                <BarChart3 className="size-3.5" aria-hidden /> سود سفارش‌ها
              </p>
              <p className="mt-1 text-xl font-extrabold text-emerald-700">
                {money(data.totals.profit)}
              </p>
              <p className="text-[11px] text-muted">
                پس از کسر بهای کالا، بسته‌بندی و کرایه‌ی واقعی
              </p>
            </div>
            <div className="indeed-panel p-4">
              <p className="flex items-center gap-1 text-xs text-muted">
                <PackageCheck className="size-3.5" aria-hidden /> واریزی‌های تطبیق‌نیافته
              </p>
              <p className="mt-1 text-xl font-extrabold text-amber-700">
                {data.unmatchedDeposits.count.toLocaleString('fa-IR')}
              </p>
              <p className="text-[11px] text-muted">
                {money(data.unmatchedDeposits.amount)} در انتظار بررسی
              </p>
            </div>
            <div className="indeed-panel p-4">
              <p className="flex items-center gap-1 text-xs text-muted">
                <Truck className="size-3.5" aria-hidden /> روش تحویل
              </p>
              <p className="mt-1 text-sm font-extrabold text-ink">
                پیک: {data.totals.deliverySplit.SNAP.toLocaleString('fa-IR')} • حضوری:{' '}
                {data.totals.deliverySplit.PICKUP.toLocaleString('fa-IR')}
              </p>
              <p className="text-[11px] text-muted">
                بازپرداخت‌ها: {money(data.totals.refunds)}
              </p>
            </div>
          </div>

          <section className="indeed-panel p-5">
            <h2 className="mb-3 text-sm font-extrabold text-ink">گزارش روزانه</h2>
            {data.daily.length === 0 ? (
              <p className="text-xs text-muted">در این بازه سفارشی ثبت نشده است.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted">
                      <th className="p-2 text-start">تاریخ</th>
                      <th className="p-2 text-start">سفارش</th>
                      <th className="p-2 text-start">پرداخت‌شده</th>
                      <th className="p-2 text-start">فروش</th>
                      <th className="p-2 text-start">سود</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map((day) => (
                      <tr key={day.date} className="border-t border-[var(--vintage-border)]">
                        <td className="p-2 text-ink">
                          {new Date(`${day.date}T00:00:00`).toLocaleDateString('fa-IR')}
                        </td>
                        <td className="p-2">{day.orders.toLocaleString('fa-IR')}</td>
                        <td className="p-2">{day.paidOrders.toLocaleString('fa-IR')}</td>
                        <td className="p-2">{money(day.gross)}</td>
                        <td className="p-2">{money(day.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="indeed-panel p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-ink">
              <AlertTriangle className="size-4 text-amber-600" aria-hidden />
              کالاهای کم‌موجود ({data.lowStockCount.toLocaleString('fa-IR')})
            </h2>
            {data.lowStock.length === 0 ? (
              <p className="text-xs text-muted">همه‌ی کالاها موجودی کافی دارند.</p>
            ) : (
              <ul className="divide-y divide-[var(--vintage-border)] text-xs">
                {data.lowStock.map((product) => (
                  <li key={product.id} className="flex items-center justify-between py-2">
                    <span className="text-ink">{product.title}</span>
                    <span className="text-muted">
                      {product.stock.toLocaleString('fa-IR')} {product.unit} (آستانه{' '}
                      {product.lowStockThreshold.toLocaleString('fa-IR')})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
