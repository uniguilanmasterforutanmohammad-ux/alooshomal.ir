'use client';

import { useCallback, useEffect, useState } from 'react';
import { Banknote, Coins, Save, Tag } from 'lucide-react';

import { api } from '@/lib/api';
import { AdminDataTable, type AdminColumn } from './AdminDataTable';

interface RevenueItem {
  model: string;
  label: string;
  count: number;
  unitPrice: number;
  revenue: number;
}

interface RevenueReport {
  items: RevenueItem[];
  totalRevenue: number;
  totalCount: number;
}

interface PriceSettings {
  boostPrice: number;
  adHomePrice: number;
  adDirectoryPrice: number;
}

function toman(value: number) {
  return `${value.toLocaleString('fa-IR')} تومان`;
}

/**
 * Revenue report for the monetisation models. Because no payment gateway is
 * wired up yet, every approved transaction is priced with the admin-set unit
 * price of its model — so the totals are an *estimate*. The admin can tune the
 * three unit prices here (subscription prices come from the plan/package
 * definitions themselves).
 */
export function AdminRevenue() {
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [boostPrice, setBoostPrice] = useState('');
  const [adHomePrice, setAdHomePrice] = useState('');
  const [adDirectoryPrice, setAdDirectoryPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await api.get<RevenueReport>('/admin/revenue'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری گزارش');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPrices = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const result = await api.get<PriceSettings>('/admin/settings');
      setBoostPrice(String(result.boostPrice));
      setAdHomePrice(String(result.adHomePrice));
      setAdDirectoryPrice(String(result.adDirectoryPrice));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری قیمت‌ها');
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadPrices();
  }, [load, loadPrices]);

  async function savePrices(event: React.FormEvent) {
    event.preventDefault();
    const parsed = {
      boostPrice: Number(boostPrice),
      adHomePrice: Number(adHomePrice),
      adDirectoryPrice: Number(adDirectoryPrice),
    };
    for (const [key, value] of Object.entries(parsed)) {
      if (!Number.isInteger(value) || value < 0 || value > 1_000_000_000) {
        setError(`قیمت ${key} باید عددی بین ۰ تا ۱٬۰۰۰٬۰۰۰٬۰۰۰ تومان باشد`);
        return;
      }
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.patch<PriceSettings>('/admin/settings', parsed);
      setBoostPrice(String(result.boostPrice));
      setAdHomePrice(String(result.adHomePrice));
      setAdDirectoryPrice(String(result.adDirectoryPrice));
      setMessage('قیمت‌های واحد ذخیره شد.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره قیمت‌ها ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  const columns: Array<AdminColumn<RevenueItem>> = [
    {
      key: 'model',
      label: 'مدل درآمدی',
      render: (item) => (
        <span className="font-extrabold text-ink">{item.model}</span>
      ),
    },
    {
      key: 'label',
      label: 'شرح',
      render: (item) => <span className="text-xs text-muted">{item.label}</span>,
    },
    {
      key: 'count',
      label: 'تعداد تأییدشده',
      render: (item) => (
        <span className="text-ink">{item.count.toLocaleString('fa-IR')}</span>
      ),
    },
    {
      key: 'unitPrice',
      label: 'قیمت واحد',
      render: (item) => (
        <span className="text-xs text-muted">{toman(item.unitPrice)}</span>
      ),
    },
    {
      key: 'revenue',
      label: 'درآمد برآوردی',
      render: (item) => (
        <span className="font-extrabold text-brand">{toman(item.revenue)}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="indeed-panel flex items-center gap-3.5 p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--vintage-border)] bg-brand-light text-brand">
            <Banknote className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted">درآمد برآوردی کل</p>
            <p className="text-lg font-extrabold text-ink">
              {toman(report?.totalRevenue ?? 0)}
            </p>
          </div>
        </div>
        <div className="indeed-panel flex items-center gap-3.5 p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--vintage-border)] bg-brand-light text-brand">
            <Coins className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted">مجموع تراکنش‌های تأییدشده</p>
            <p className="text-lg font-extrabold text-ink">
              {(report?.totalCount ?? 0).toLocaleString('fa-IR')}
            </p>
          </div>
        </div>
      </section>

      <p className="text-xs text-muted">
        هنوز درگاه پرداخت متصل نیست؛ بنابراین هر تراکنش تأییدشده با «قیمت واحد» همان
        مدل ضرب می‌شود و عدد حاصل برآوردی است. قیمت اشتراک‌ها از خودِ تعریف پلن/بسته
        خوانده می‌شود.
      </p>

      {loading ? (
        <p className="text-muted">در حال بارگذاری گزارش...</p>
      ) : (
        <AdminDataTable
          columns={columns}
          rows={report?.items ?? []}
          rowKey={(item) => `${item.model}:${item.label}`}
          empty="داده‌ای برای نمایش نیست."
          minWidthClass="min-w-[52rem]"
        />
      )}

      <form onSubmit={savePrices} className="indeed-panel p-5">
        <div className="flex items-center gap-2">
          <Tag className="size-5 text-brand" aria-hidden />
          <h3 className="text-sm font-extrabold text-ink">قیمت واحد مدل‌ها</h3>
        </div>
        <p className="mt-1 text-xs text-muted">
          این قیمت‌ها فقط برای محاسبه‌ی درآمد برآوردی استفاده می‌شوند (تومان).
        </p>
        {settingsLoading ? (
          <p className="mt-3 text-muted">در حال بارگذاری قیمت‌ها...</p>
        ) : (
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-xs font-bold text-muted">
              قیمت پله (تومان)
              <input
                type="number"
                min={0}
                value={boostPrice}
                onChange={(event) => setBoostPrice(event.target.value)}
                className="w-40 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-muted">
              قیمت تبلیغ دایرکتوری (تومان)
              <input
                type="number"
                min={0}
                value={adDirectoryPrice}
                onChange={(event) => setAdDirectoryPrice(event.target.value)}
                className="w-44 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-muted">
              قیمت تبلیغ صفحه اول (تومان)
              <input
                type="number"
                min={0}
                value={adHomePrice}
                onChange={(event) => setAdHomePrice(event.target.value)}
                className="w-44 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
            >
              <Save className="size-4" aria-hidden />
              ذخیره قیمت‌ها
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
