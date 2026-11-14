'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';

import { api } from '@/lib/api';

interface PricingItem {
  key: string;
  label: string;
  group: string;
  description?: string;
  price: number;
  source: 'SETTING' | 'ZOHAL' | 'PLAN' | 'FEED_PACKAGE';
  sourceId?: string;
  active?: boolean;
}

interface PricingPayload {
  items: PricingItem[];
  settlementDays: number;
  maxPrice: number;
  onlineOnly: boolean;
}

function faPrice(value: number): string {
  return value.toLocaleString('fa-IR');
}

/**
 * «قیمت خدمات» — one place for every billable item: plans, feed packages,
 * Zohal inquiries, boost and both ad placements. The API merges the dynamic
 * rows with the setting-backed prices, so a new paid feature only needs to be
 * registered server-side and it shows up here automatically.
 */
export function AdminPricingPanel() {
  const [data, setData] = useState<PricingPayload | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<PricingPayload>('/admin/pricing');
      setData(result);
      setOnlineOnly(result.onlineOnly);
      setDraft(
        Object.fromEntries(result.items.map((item) => [item.key, String(item.price)])),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری قیمت‌ها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, PricingItem[]>();
    for (const item of data?.items ?? []) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return Array.from(map.entries());
  }, [data]);

  const changed = useMemo(() => {
    if (!data) return [];
    return data.items
      .filter((item) => Number(draft[item.key]) !== item.price)
      .map((item) => ({ key: item.key, price: Number(draft[item.key]) }));
  }, [data, draft]);

  async function save() {
    if (changed.length === 0 && onlineOnly === data?.onlineOnly) {
      setNotice('تغییری برای ذخیره وجود ندارد.');
      return;
    }
    if (changed.some((item) => !Number.isInteger(item.price) || item.price < 0)) {
      setError('مبالغ باید عدد صحیح و نامنفی باشند.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.patch<PricingPayload>('/admin/pricing', {
        items: changed,
        onlineOnly,
      });
      setData(result);
      setOnlineOnly(result.onlineOnly);
      setDraft(
        Object.fromEntries(result.items.map((item) => [item.key, String(item.price)])),
      );
      setNotice('قیمت‌ها به‌روزرسانی شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره قیمت‌ها ناموفق بود');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-muted">در حال بارگذاری قیمت‌ها...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
      {notice ? (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>
      ) : null}

      <div className="indeed-panel p-4 text-xs leading-6 text-muted">
        همه‌ی خدمات دارای هزینه در یک جدول آمده‌اند. مبلغ هر ردیف را تغییر دهید و
        یک‌جا ذخیره کنید. مهلت تسویه‌ی کیف پول اکنون{' '}
        <b className="text-ink">{faPrice(data?.settlementDays ?? 7)} روز</b> است و از
        بخش «کیف پول» تنظیمات قابل تغییر است.
      </div>

      <label className="indeed-panel flex items-start gap-3 p-4 text-xs leading-6 text-muted">
        <input
          type="checkbox"
          checked={onlineOnly}
          onChange={(event) => setOnlineOnly(event.target.checked)}
          className="mt-1 size-4 accent-[var(--vintage-accent)]"
        />
        <span>
          <b className="text-ink">پرداخت فقط آنلاین</b>
          <br />
          اشتراک‌ها و استعلام هویت در همان مرحله از درگاه پرداخت می‌شوند و کیف پول
          منفی نمی‌شود. برای بازگشت موقت به پرداخت اعتباری، این گزینه را خاموش کنید
          و ذخیره بزنید.
        </span>
      </label>

      {groups.map(([group, items]) => (
        <div key={group} className="indeed-panel overflow-hidden">
          <div className="border-b border-dashed border-[var(--vintage-border)] px-5 py-3">
            <h3 className="text-sm font-extrabold text-ink">{group}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--vintage-border)] text-right text-xs text-muted">
                  <th className="px-4 py-2 font-bold">خدمت</th>
                  <th className="px-4 py-2 font-bold">مبلغ (تومان)</th>
                  <th className="px-4 py-2 font-bold">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.key} className="border-b border-[var(--vintage-border)] last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-bold text-ink">{item.label}</p>
                      {item.description ? (
                        <p className="mt-0.5 text-xs text-muted">{item.description}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        max={data?.maxPrice}
                        value={draft[item.key] ?? ''}
                        onChange={(event) =>
                          setDraft((prev) => ({ ...prev, [item.key]: event.target.value }))
                        }
                        className="indeed-input w-40"
                        dir="ltr"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {item.active === false ? 'غیرفعال' : 'فعال'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || (changed.length === 0 && onlineOnly === data?.onlineOnly)}
          className="indeed-btn indeed-btn-primary"
        >
          <Save className="size-4" aria-hidden />
          {saving
            ? 'در حال ذخیره...'
            : `ذخیره ${changed.length || ''} تغییر`}
        </button>
        {changed.length > 0 ? (
          <span className="text-xs text-muted">{changed.length} ردیف تغییر کرده است.</span>
        ) : null}
      </div>
    </div>
  );
}
