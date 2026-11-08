'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { errorText, Panel, Banner } from './shared';
import type { PaypingStatus, OverviewPayload } from './shared';

export function OverviewTab({
  status,
  onRefreshStatus,
}: {
  status: PaypingStatus | null;
  onRefreshStatus: () => void;
}) {
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOverview(await api.get<OverviewPayload>('/admin/payping/overview'));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cards: Array<{ label: string; value: number | undefined }> = [
    { label: 'تراکنش‌ها', value: overview?.transactions?.result },
    { label: 'تسویه‌ها', value: overview?.withdrawals?.result },
    { label: 'مشتریان', value: overview?.customers?.count },
    { label: 'کدهای تخفیف', value: overview?.coupons?.count },
    { label: 'فاکتورها', value: overview?.invoices?.count },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="وضعیت اتصال درگاه پی‌پینگ"
        action={
          <button
            onClick={onRefreshStatus}
            className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            بررسی مجدد
          </button>
        }
      >
        {!status ? (
          <p className="text-sm text-muted">در حال بررسی اتصال...</p>
        ) : status.configured && status.reachable ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2 font-bold text-green-700">
              <CheckCircle2 className="size-4" aria-hidden />
              اتصال برقرار است
            </span>
            <span className="text-muted" dir="ltr">
              {status.baseUrl}
              {status.latencyMs ? ` · ${status.latencyMs}ms` : ''}
            </span>
          </div>
        ) : (
          <Banner kind="error">
            {status.message ?? 'اتصال به پی‌پینگ برقرار نشد.'}
          </Banner>
        )}
      </Panel>

      <Panel
        title="خلاصه‌ی حساب"
        action={
          <button
            onClick={() => void load()}
            className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            بارگذاری
          </button>
        }
      >
        {error ? (
          <Banner kind="error">{error}</Banner>
        ) : loading && !overview ? (
          <p className="text-sm text-muted">در حال بارگذاری...</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-[var(--vintage-border)] p-4"
              >
                <p className="text-xs text-muted">{card.label}</p>
                <p className="mt-1 text-lg font-extrabold text-ink">
                  {card.value === undefined
                    ? '—'
                    : card.value.toLocaleString('fa-IR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Banner kind="info">
        این پنل با توکن پذیرنده‌ی پی‌پینگ کار می‌کند و همه‌ی سرویس‌های مجاز
        توکن (پرداخت، گزارش، تسویه، مشتریان، کد تخفیف، آیتم مالی، فاکتور،
        اقساطی، استعلام و آپلود) را در دسترس قرار می‌دهد. اگر سرویسی «IP مجاز
        نیست» برگرداند، باید IP سرور در کنسول توسعه‌دهنده‌ی پی‌پینگ ثبت شود.
      </Banner>
    </div>
  );
}
