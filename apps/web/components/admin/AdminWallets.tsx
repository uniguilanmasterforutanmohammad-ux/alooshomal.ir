'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Save, Wallet } from 'lucide-react';

import { api } from '@/lib/api';
import { formatJalali } from '@/lib/jalali';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface AdminWalletRow {
  id: string;
  userId: string;
  balance: number;
  dueAt: string | null;
  reminderSentAt: string | null;
  overdue: boolean;
  updatedAt: string;
  user: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

interface AdminWalletsResponse {
  settlementDays: number;
  totalDebt: number;
  wallets: AdminWalletRow[];
}

function faPrice(amount: number): string {
  return `${Math.abs(amount).toLocaleString('fa-IR')} تومان`;
}

/**
 * Admin «کیف پول‌ها» panel: the running tab of every user, its due date and a
 * manual adjustment (e.g. a support discount) that lands in the ledger.
 */
export function AdminWallets() {
  const [data, setData] = useState<AdminWalletsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [titles, setTitles] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.get<AdminWalletsResponse>('/admin/wallets'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'خطا در بارگذاری کیف پول‌ها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function adjust(wallet: AdminWalletRow) {
    const raw = amounts[wallet.userId] ?? '';
    const amount = Number(raw.replace(/[,\s]/g, ''));
    if (!raw || !Number.isFinite(amount) || amount === 0) {
      toast.error('مبلغ تنظیم باید یک عدد مخالف صفر باشد.');
      return;
    }
    setBusyId(wallet.userId);
    try {
      await api.post(`/admin/wallets/${wallet.userId}/adjust`, {
        amount,
        title: titles[wallet.userId]?.trim() || undefined,
      });
      toast.success('کیف پول کاربر به‌روزرسانی شد.');
      setAmounts((current) => ({ ...current, [wallet.userId]: '' }));
      setTitles((current) => ({ ...current, [wallet.userId]: '' }));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تنظیم کیف پول ناموفق بود');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="indeed-panel flex flex-1 items-center gap-3 p-4">
          <Wallet className="size-5 text-brand" aria-hidden />
          <div>
            <p className="text-xs text-muted">مجموع بدهی کاربران</p>
            <p className="text-lg font-extrabold text-ink">
              {faPrice(data?.totalDebt ?? 0)}
            </p>
          </div>
        </div>
        <div className="indeed-panel flex flex-1 items-center gap-3 p-4">
          <AlertTriangle className="size-5 text-amber-600" aria-hidden />
          <div>
            <p className="text-xs text-muted">مهلت تسویه (تنظیمات)</p>
            <p className="text-lg font-extrabold text-ink">
              {(data?.settlementDays ?? 7).toLocaleString('fa-IR')} روز
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="indeed-btn indeed-btn-secondary"
        >
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} aria-hidden />
          به‌روزرسانی
        </button>
      </div>

      {loading ? (
        <p className="text-muted">در حال بارگذاری...</p>
      ) : !data || data.wallets.length === 0 ? (
        <p className="indeed-panel p-5 text-sm text-muted">
          در حال حاضر هیچ کیف پول بازی وجود ندارد.
        </p>
      ) : (
        <div className="indeed-panel overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-dashed border-[var(--vintage-border)] text-xs text-muted">
              <tr>
                <th className="px-3 py-3 text-right">کاربر</th>
                <th className="px-3 py-3 text-right">بدهی</th>
                <th className="px-3 py-3 text-right">سررسید</th>
                <th className="px-3 py-3 text-right">تنظیم دستی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--vintage-border)]">
              {data.wallets.map((wallet) => (
                <tr key={wallet.id}>
                  <td className="px-3 py-3">
                    <p className="font-bold text-ink">
                      {wallet.user?.fullName ?? 'بدون نام'}
                    </p>
                    <p className="text-xs text-muted" dir="ltr">
                      {wallet.user?.phone ?? wallet.user?.email ?? wallet.userId}
                    </p>
                  </td>
                  <td className="px-3 py-3 font-extrabold text-red-600">
                    {wallet.balance < 0 ? faPrice(wallet.balance) : '—'}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {wallet.dueAt ? formatJalali(wallet.dueAt) : '—'}
                    {wallet.overdue ? (
                      <span className="ms-2 rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-700">
                        سررسید گذشته
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={amounts[wallet.userId] ?? ''}
                        onChange={(event) =>
                          setAmounts((current) => ({
                            ...current,
                            [wallet.userId]: event.target.value,
                          }))
                        }
                        inputMode="numeric"
                        placeholder="مبلغ (+ بدهی / − بستانکاری)"
                        className="indeed-input w-40 py-1.5 text-xs"
                      />
                      <input
                        value={titles[wallet.userId] ?? ''}
                        onChange={(event) =>
                          setTitles((current) => ({
                            ...current,
                            [wallet.userId]: event.target.value,
                          }))
                        }
                        placeholder="توضیح (اختیاری)"
                        className="indeed-input w-36 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => void adjust(wallet)}
                        disabled={busyId === wallet.userId}
                        className="indeed-btn indeed-btn-primary py-1.5 text-xs"
                      >
                        <Save className="size-3.5" aria-hidden />
                        ثبت
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
