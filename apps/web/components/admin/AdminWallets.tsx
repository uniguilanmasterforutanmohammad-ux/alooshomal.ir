'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  IdCard,
  RefreshCw,
  Save,
  Search,
  Wallet,
} from 'lucide-react';

import { api } from '@/lib/api';
import { formatJalali } from '@/lib/jalali';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface AdminWalletRow {
  id: string;
  userId: string;
  nationalCode: string | null;
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
    nationalCode: string | null;
  } | null;
}

interface AdminWalletsResponse {
  settlementDays: number;
  totalDebt: number;
  wallets: AdminWalletRow[];
}

interface WalletLookup {
  nationalCode: string;
  balance: number;
  wallets: AdminWalletRow[];
  entries: {
    id: string;
    kind: string;
    amount: number;
    title: string;
    nationalCode: string | null;
    createdAt: string;
  }[];
  payments: {
    id: string;
    amount: number;
    status: string;
    refId: string | null;
    nationalCode: string | null;
    createdAt: string;
  }[];
  invoices: {
    id: string;
    number: string;
    title: string;
    total: number;
    customerNationalCode: string | null;
    issuedAt: string;
  }[];
}

function faPrice(amount: number): string {
  return `${Math.abs(amount).toLocaleString('fa-IR')} تومان`;
}

function rowNationalCode(wallet: AdminWalletRow): string | null {
  return wallet.nationalCode ?? wallet.user?.nationalCode ?? null;
}

/**
 * Admin «کیف پول‌ها» panel: the running tab of every user, its due date and a
 * manual adjustment (e.g. a support discount) that lands in the ledger.
 */
export function AdminWallets() {
  const [data, setData] = useState<AdminWalletsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lookupCode, setLookupCode] = useState('');
  const [lookup, setLookup] = useState<WalletLookup | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
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

  async function runLookup() {
    const code = lookupCode.trim();
    if (!/^\d{10}$/.test(code)) {
      toast.error('کد ملی باید دقیقاً ۱۰ رقم باشد.');
      return;
    }
    setLookupBusy(true);
    try {
      setLookup(await api.get<WalletLookup>(`/admin/wallets/lookup?nationalCode=${code}`));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'جستجوی کد ملی ناموفق بود');
    } finally {
      setLookupBusy(false);
    }
  }

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

  const query = search.trim().toLowerCase();
  const visibleWallets = (data?.wallets ?? []).filter((wallet) => {
    if (!query) return true;
    const code = rowNationalCode(wallet)?.toLowerCase() ?? '';
    const name = wallet.user?.fullName?.toLowerCase() ?? '';
    const phone = wallet.user?.phone?.toLowerCase() ?? '';
    const email = wallet.user?.email?.toLowerCase() ?? '';
    return (
      code.includes(query) ||
      name.includes(query) ||
      phone.includes(query) ||
      email.includes(query)
    );
  });

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

      <div className="indeed-panel flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <IdCard className="size-5 text-brand" aria-hidden />
          <div>
            <p className="text-sm font-extrabold text-ink">گردش کامل کیف پول با کد ملی</p>
            <p className="text-xs text-muted">
              کل گردش حساب، پرداخت‌ها و فاکتورهای یک شخص را با کد ملی او ببینید —
              کیف پول و سابقه‌ی آن به کد ملی گره خورده است.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={lookupCode}
            onChange={(event) =>
              setLookupCode(event.target.value.replace(/\D/g, '').slice(0, 10))
            }
            inputMode="numeric"
            placeholder="کد ملی ۱۰ رقمی"
            dir="ltr"
            className="indeed-input w-44"
          />
          <button
            type="button"
            onClick={() => void runLookup()}
            disabled={lookupBusy}
            className="indeed-btn indeed-btn-primary"
          >
            <Search className={cn('size-4', lookupBusy && 'animate-pulse')} aria-hidden />
            {lookupBusy ? 'در حال جستجو...' : 'نمایش گردش'}
          </button>
        </div>
        {lookup ? (
          <div className="flex flex-col gap-3 rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-paper)]/60 p-3">
            <p className="text-xs font-bold text-ink">
              کد ملی <span dir="ltr">{lookup.nationalCode}</span> — مجموع بدهی:{' '}
              {faPrice(lookup.balance)}
            </p>
            <div className="grid gap-3 lg:grid-cols-3">
              <div>
                <p className="text-xs font-bold text-muted">
                  گردش حساب ({lookup.entries.length.toLocaleString('fa-IR')})
                </p>
                <ul className="mt-1 flex flex-col gap-1 text-[11px]">
                  {lookup.entries.slice(0, 20).map((entry) => (
                    <li key={entry.id} className="flex justify-between gap-2">
                      <span className="truncate text-ink">{entry.title}</span>
                      <span className={entry.amount < 0 ? 'text-red-600' : 'text-emerald-600'}>
                        {entry.amount < 0 ? '−' : '+'}
                        {faPrice(entry.amount)}
                      </span>
                    </li>
                  ))}
                  {lookup.entries.length === 0 ? (
                    <li className="text-muted">موردی ثبت نشده است.</li>
                  ) : null}
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold text-muted">
                  پرداخت‌ها ({lookup.payments.length.toLocaleString('fa-IR')})
                </p>
                <ul className="mt-1 flex flex-col gap-1 text-[11px]">
                  {lookup.payments.slice(0, 20).map((payment) => (
                    <li key={payment.id} className="flex justify-between gap-2">
                      <span className="text-muted">{formatJalali(payment.createdAt)}</span>
                      <span>{faPrice(payment.amount)}</span>
                      <span className="text-muted">{payment.status}</span>
                    </li>
                  ))}
                  {lookup.payments.length === 0 ? (
                    <li className="text-muted">موردی ثبت نشده است.</li>
                  ) : null}
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold text-muted">
                  فاکتورها ({lookup.invoices.length.toLocaleString('fa-IR')})
                </p>
                <ul className="mt-1 flex flex-col gap-1 text-[11px]">
                  {lookup.invoices.slice(0, 20).map((invoice) => (
                    <li key={invoice.id} className="flex justify-between gap-2">
                      <span className="truncate text-ink" dir="ltr">
                        {invoice.number}
                      </span>
                      <span>{faPrice(invoice.total)}</span>
                    </li>
                  ))}
                  {lookup.invoices.length === 0 ? (
                    <li className="text-muted">موردی ثبت نشده است.</li>
                  ) : null}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="text-muted">در حال بارگذاری...</p>
      ) : !data || data.wallets.length === 0 ? (
        <p className="indeed-panel p-5 text-sm text-muted">
          در حال حاضر هیچ کیف پول بازی وجود ندارد.
        </p>
      ) : (
        <div className="indeed-panel overflow-x-auto">
          <div className="flex items-center gap-2 border-b border-dashed border-[var(--vintage-border)] px-3 py-2.5">
            <Search className="size-4 text-muted" aria-hidden />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جستجو بر اساس نام، موبایل یا کد ملی"
              className="indeed-input w-full max-w-sm py-1.5 text-xs"
            />
          </div>
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-dashed border-[var(--vintage-border)] text-xs text-muted">
              <tr>
                <th className="px-3 py-3 text-right">کاربر</th>
                <th className="px-3 py-3 text-right">کد ملی</th>
                <th className="px-3 py-3 text-right">بدهی</th>
                <th className="px-3 py-3 text-right">سررسید</th>
                <th className="px-3 py-3 text-right">تنظیم دستی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--vintage-border)]">
              {visibleWallets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-5 text-center text-xs text-muted">
                    موردی با این جستجو یافت نشد.
                  </td>
                </tr>
              ) : null}
              {visibleWallets.map((wallet) => (
                <tr key={wallet.id}>
                  <td className="px-3 py-3">
                    <p className="font-bold text-ink">
                      {wallet.user?.fullName ?? 'بدون نام'}
                    </p>
                    <p className="text-xs text-muted" dir="ltr">
                      {wallet.user?.phone ?? wallet.user?.email ?? wallet.userId}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-xs" dir="ltr">
                    {rowNationalCode(wallet) ?? '—'}
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
