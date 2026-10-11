'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  Eye,
  Heart,
  IdCard,
  ListOrdered,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

import { BoostBadge } from '@/components/ui/BoostBadge';
import {
  api,
  type BoostOverview,
  type BoostRequest,
  type BoostTargetItem,
  type BoostTargetKind,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const BOOST_STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار تأیید',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
};

interface RowProps {
  item: BoostTargetItem;
  kind: BoostTargetKind;
  requests: BoostRequest[];
  busy: boolean;
  onBoost: (kind: BoostTargetKind, item: BoostTargetItem) => void;
}

function TargetRow({ item, kind, requests, busy, onBoost }: RowProps) {
  const request = requests.find(
    (entry) => entry.kind === kind && entry.targetId === item.id,
  );
  const boostedUntil = item.boostedUntil ? new Date(item.boostedUntil) : null;
  const isBoosted = boostedUntil && boostedUntil > new Date();
  const rank = item.rank?.rank ?? null;
  const rankPage = item.rank?.page ?? null;
  const lastBoostedAt = item.lastBoostedAt ? new Date(item.lastBoostedAt) : null;

  return (
    <div className="indeed-panel flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-base font-extrabold text-ink">{item.fullName}</h3>
          {isBoosted ? <BoostBadge /> : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold',
              rank === 1
                ? 'bg-amber-100 text-amber-700'
                : 'bg-soft text-ink',
            )}
          >
            <ListOrdered className="size-3.5" aria-hidden />
            {rank ? (
              <>
                ردیف {rank.toLocaleString('fa-IR')}
                {rankPage ? ` • صفحه ${rankPage.toLocaleString('fa-IR')}` : ''}
              </>
            ) : (
              'خارج از لیست'
            )}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="size-3.5" aria-hidden />
            {item.views.toLocaleString('fa-IR')} بازدید
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart className="size-3.5" aria-hidden />
            {item.likes.toLocaleString('fa-IR')} لایک
          </span>
          {lastBoostedAt ? (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <Sparkles className="size-3.5" aria-hidden />
              آخرین پله: {lastBoostedAt.toLocaleDateString('fa-IR')}
            </span>
          ) : null}
          {request && request.status !== 'REJECTED' ? (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 font-bold',
                request.status === 'APPROVED'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-amber-50 text-amber-700',
              )}
            >
              {BOOST_STATUS_LABELS[request.status] ?? request.status}
            </span>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        disabled={busy || request?.status === 'PENDING' || !item.isPublished}
        onClick={() => onBoost(kind, item)}
        className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
      >
        <TrendingUp className="size-4" aria-hidden />
        {request?.status === 'PENDING'
          ? 'در انتظار تأیید'
          : !item.isPublished
            ? 'منتشر نشده'
            : 'درخواست پله'}
      </button>
    </div>
  );
}

export default function BoostPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const [data, setData] = useState<BoostOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const overview = await api.get<BoostOverview>('/boosts/overview');
      setData(overview);
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

  async function boost(kind: BoostTargetKind, item: BoostTargetItem) {
    setBusyId(item.id);
    setError(null);
    setMessage(null);
    try {
      await api.post('/boosts/request', {
        kind,
        targetId: item.id,
        feature: 'POLE',
      });
      setMessage('درخواست پله ثبت شد. پس از تأیید مدیر، این کارت به بالای لیست می‌رود.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت درخواست ناموفق بود');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="text-muted">در حال بارگذاری...</p>;
  }

  const requests = data?.requests ?? [];
  const total = (data?.biolinks.length ?? 0) + (data?.businessCards.length ?? 0);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold text-ink">افزایش بازدید</h2>
        <p className="text-sm text-muted">
          با «پله» می‌توانید یکی از کارت‌ها یا بیولینک‌های خود را به بالای لیست دایرکتوری
          بیاورید (پس از تأیید مدیر).
        </p>
      </div>

      {message ? (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {total === 0 ? (
        <div className="indeed-panel p-10 text-center">
          <p className="text-lg font-bold text-ink">هنوز کارتی نساخته‌اید</p>
          <p className="mt-2 text-sm text-muted">
            برای استفاده از «پله» ابتدا یک بیولینک یا کارت ویزیت بسازید و منتشر کنید.
          </p>
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <IdCard className="size-4 text-brand" aria-hidden />
              بیولینک‌ها
            </h3>
            {data?.biolinks.length ? (
              data.biolinks.map((item) => (
                <TargetRow
                  key={item.id}
                  item={item}
                  kind="BIOLINK"
                  requests={requests}
                  busy={busyId === item.id}
                  onBoost={boost}
                />
              ))
            ) : (
              <p className="indeed-panel p-4 text-sm text-muted">
                بیولینکی برای نمایش نیست.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <BadgeCheck className="size-4 text-brand" aria-hidden />
              کارت‌های ویزیت
            </h3>
            {data?.businessCards.length ? (
              data.businessCards.map((item) => (
                <TargetRow
                  key={item.id}
                  item={item}
                  kind="BUSINESS_CARD"
                  requests={requests}
                  busy={busyId === item.id}
                  onBoost={boost}
                />
              ))
            ) : (
              <p className="indeed-panel p-4 text-sm text-muted">
                کارت ویزیتی برای نمایش نیست.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
