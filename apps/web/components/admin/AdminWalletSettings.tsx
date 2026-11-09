'use client';

import { useCallback, useEffect, useState } from 'react';
import { Save, Wallet } from 'lucide-react';

import { api } from '@/lib/api';

interface SettingsPayload {
  walletSettlementDays: number;
}

/**
 * Settlement window of the user wallet: how many days after the first charge
 * the accumulated balance must be paid in one go.
 */
export function AdminWalletSettings() {
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await api.get<SettingsPayload>('/admin/settings');
      setDays(result.walletSettlementDays ?? 7);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری تنظیمات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.patch<SettingsPayload>('/admin/settings', {
        walletSettlementDays: days,
      });
      setDays(result.walletSettlementDays);
      setMessage('مهلت تسویه کیف پول ذخیره شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره تنظیمات ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="indeed-panel p-5">
      <div className="flex items-center gap-2">
        <Wallet className="size-5 text-brand" aria-hidden />
        <h3 className="font-extrabold text-ink">کیف پول کاربران</h3>
      </div>
      <p className="mt-1 text-sm text-muted">
        هزینه استعلام‌ها و اشتراک‌ها به‌صورت بدهی جمع می‌شود و کاربر تا این
        مهلت، همه را یک‌جا پرداخت می‌کند.
      </p>
      {loading ? (
        <p className="mt-4 text-sm text-muted">در حال بارگذاری...</p>
      ) : (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-bold text-ink">مهلت تسویه (روز)</span>
            <input
              type="number"
              min={1}
              max={90}
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="indeed-input w-32 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="indeed-btn indeed-btn-primary py-2 text-sm"
          >
            <Save className="size-4" aria-hidden />
            ذخیره
          </button>
        </div>
      )}
      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
      {message ? (
        <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
    </section>
  );
}
