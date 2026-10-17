'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coins, Gift } from 'lucide-react';

import { api, type PointsSummary, type Reward, type RewardKind } from '@/lib/api';
import type { AdsOverview } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const KIND_LABELS: Record<RewardKind, string> = {
  SUBSCRIPTION: 'اشتراک',
  AD_HOME: 'تبلیغ صفحه اصلی',
  AD_DIRECTORY: 'تبلیغ دایرکتوری',
};

function faDate(value: string) {
  return new Date(value).toLocaleDateString('fa-IR');
}

/**
 * User points page. Shows the running balance, the points earned from approved
 * «نبض شهر» news, the recent ledger, and the reward catalogue the admin has
 * defined — each reward can be redeemed straight from here.
 */
export default function PointsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const [data, setData] = useState<PointsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targets, setTargets] = useState<
    Array<{ id: string; fullName: string; kind: 'BUSINESS_CARD' | 'BIOLINK' }>
  >([]);
  const [pickerFor, setPickerFor] = useState<Reward | null>(null);
  const [selectedTarget, setSelectedTarget] = useState('');

  const load = useCallback(async () => {
    try {
      const [summary, ads] = await Promise.all([
        api.get<PointsSummary>('/points/me'),
        api.get<AdsOverview>('/ads/overview').catch(() => null),
      ]);
      setData(summary);
      if (ads) {
        setTargets([
          ...ads.businessCards
            .filter((item) => item.isPublished)
            .map((item) => ({
              id: item.id,
              fullName: item.fullName,
              kind: 'BUSINESS_CARD' as const,
            })),
          ...ads.biolinks
            .filter((item) => item.isPublished)
            .map((item) => ({
              id: item.id,
              fullName: item.fullName,
              kind: 'BIOLINK' as const,
            })),
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    void load();
  }, [hydrated, token, router, load]);

  async function redeem(reward: Reward, targetId?: string, targetKind?: string) {
    setBusyId(reward.id);
    setError(null);
    setMessage(null);
    try {
      const result = await api.post<{ redeemed: boolean; balance: number }>(
        `/points/redeem/${reward.id}`,
        targetId ? { targetId, targetKind } : {},
      );
      setMessage(`جایزه «${reward.title}» فعال شد. موجودی جدید: ${result.balance.toLocaleString('fa-IR')} امتیاز`);
      setPickerFor(null);
      setSelectedTarget('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'دریافت جایزه ناموفق بود');
    } finally {
      setBusyId(null);
    }
  }

  function startRedeem(reward: Reward) {
    if (reward.kind === 'SUBSCRIPTION') {
      void redeem(reward);
      return;
    }
    setPickerFor(reward);
    setSelectedTarget('');
    setError(null);
    setMessage(null);
  }

  if (loading) {
    return <p className="text-muted">در حال بارگذاری...</p>;
  }

  const balance = data?.balance ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold text-ink">امتیاز من</h2>
        <p className="text-sm text-muted">
          با ثبت خبر در «نبض شهر» و تأیید آن، برای هر خبر{' '}
          {(data?.pointsPerNews ?? 0).toLocaleString('fa-IR')} امتیاز می‌گیرید و می‌توانید
          آن را صرف جوایز کنید.
        </p>
      </div>

      <div className="indeed-panel flex items-center gap-4 p-5">
        <span className="vintage-avatar flex size-14 items-center justify-center">
          <Coins className="size-7" aria-hidden />
        </span>
        <div>
          <p className="text-xs text-muted">موجودی امتیاز شما</p>
          <p className="text-2xl font-extrabold text-brand">
            {balance.toLocaleString('fa-IR')}
          </p>
        </div>
      </div>

      {message ? (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <Gift className="size-4 text-brand" aria-hidden />
          جوایز قابل دریافت
        </h3>
        {data?.rewards.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {data.rewards.map((reward) => {
              const affordable = balance >= reward.points;
              return (
                <div
                  key={reward.id}
                  className={cn(
                    'indeed-panel flex flex-col gap-2 p-4',
                    affordable && 'border-brand',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-extrabold text-ink">{reward.title}</h4>
                    <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] font-bold text-muted">
                      {KIND_LABELS[reward.kind]}
                    </span>
                  </div>
                  {reward.description ? (
                    <p className="text-xs leading-6 text-muted">{reward.description}</p>
                  ) : null}
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-brand">
                      {reward.points.toLocaleString('fa-IR')} امتیاز
                    </span>
                    <button
                      type="button"
                      disabled={busyId === reward.id || !affordable}
                      onClick={() => startRedeem(reward)}
                      className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
                    >
                      {affordable ? 'دریافت جایزه' : 'امتیاز کافی نیست'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="indeed-panel p-4 text-sm text-muted">هنوز جایزه‌ای تعریف نشده است.</p>
        )}
      </section>

      {pickerFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="indeed-panel w-full max-w-md p-5">
            <h3 className="text-base font-extrabold text-ink">
              انتخاب مورد برای «{pickerFor.title}»
            </h3>
            <p className="mt-1 text-xs text-muted">
              یکی از کارت‌های ویزیت یا بیولینک‌های منتشرشده‌ی خود را انتخاب کنید.
            </p>
            {targets.length === 0 ? (
              <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                ابتدا یک کارت ویزیت یا بیولینک بسازید و منتشر کنید.
              </p>
            ) : (
              <select
                value={selectedTarget}
                onChange={(event) => setSelectedTarget(event.target.value)}
                className="mt-4 w-full rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              >
                <option value="">— انتخاب کنید —</option>
                {targets.map((target) => (
                  <option key={`${target.kind}:${target.id}`} value={`${target.kind}:${target.id}`}>
                    {target.fullName} ({target.kind === 'BUSINESS_CARD' ? 'کارت ویزیت' : 'بیولینک'})
                  </option>
                ))}
              </select>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPickerFor(null)}
                className="indeed-btn indeed-btn-secondary py-2 text-sm"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={!selectedTarget || busyId === pickerFor.id}
                onClick={() => {
                  const [kind, id] = selectedTarget.split(':');
                  void redeem(pickerFor, id, kind);
                }}
                className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
              >
                دریافت جایزه
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {data?.redemptions.length ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-extrabold text-ink">جوایز دریافت‌شده</h3>
          <div className="indeed-panel divide-y divide-[var(--vintage-border)]">
            {data.redemptions.map((redemption) => (
              <div
                key={redemption.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
              >
                <span className="font-bold text-ink">
                  {redemption.reward?.title ?? 'جایزه'}
                </span>
                <span className="text-xs text-muted">{faDate(redemption.createdAt)}</span>
                <span className="text-xs font-bold text-red-600">
                  -{redemption.pointsSpent.toLocaleString('fa-IR')} امتیاز
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-extrabold text-ink">گردش امتیاز</h3>
        <div className="indeed-panel divide-y divide-[var(--vintage-border)]">
          {data?.ledger.length ? (
            data.ledger.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
              >
                <span className="text-ink">{entry.reason}</span>
                <span className="text-xs text-muted">{faDate(entry.createdAt)}</span>
                <span
                  className={cn(
                    'text-xs font-extrabold',
                    entry.delta >= 0 ? 'text-emerald-600' : 'text-red-600',
                  )}
                >
                  {entry.delta >= 0 ? '+' : ''}
                  {entry.delta.toLocaleString('fa-IR')}
                </span>
              </div>
            ))
          ) : (
            <p className="p-4 text-sm text-muted">هنوز امتیازی ثبت نشده است.</p>
          )}
        </div>
      </section>
    </div>
  );
}
