'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgeCheck, IdCard, Megaphone, Sparkles } from 'lucide-react';

import {
  api,
  type AdRequest,
  type AdTargetItem,
  type AdTargetKind,
  type AdsOverview,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار تأیید',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
};

interface RowProps {
  item: AdTargetItem;
  kind: AdTargetKind;
  request: AdRequest | undefined;
  busy: boolean;
  onRequest: (kind: AdTargetKind, item: AdTargetItem) => void;
}

function TargetRow({ item, kind, request, busy, onRequest }: RowProps) {
  const pending = request?.status === 'PENDING';
  const active =
    request?.status === 'APPROVED' &&
    request.endsAt &&
    new Date(request.endsAt) > new Date();

  return (
    <div className="indeed-panel flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-base font-extrabold text-ink">{item.fullName}</h3>
          {active ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
              در حال نمایش
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-muted">
          {item.jobTitle ?? '—'}
          {item.company ? ` — ${item.company}` : ''}
        </p>
        {request && request.status !== 'REJECTED' ? (
          <span
            className={cn(
              'mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold',
              request.status === 'APPROVED'
                ? 'bg-green-50 text-green-700'
                : 'bg-amber-50 text-amber-700',
            )}
          >
            {STATUS_LABELS[request.status] ?? request.status}
            {active && request.endsAt
              ? ` • تا ${new Date(request.endsAt).toLocaleDateString('fa-IR')}`
              : ''}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        disabled={busy || pending || !item.isPublished}
        onClick={() => onRequest(kind, item)}
        className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
      >
        <Megaphone className="size-4" aria-hidden />
        {pending
          ? 'در انتظار تأیید'
          : !item.isPublished
            ? 'منتشر نشده'
            : 'ثبت درخواست تبلیغ'}
      </button>
    </div>
  );
}

export default function AdsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const [data, setData] = useState<AdsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.get<AdsOverview>('/ads/overview'));
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

  async function requestAd(kind: AdTargetKind, item: AdTargetItem) {
    setBusyId(item.id);
    setError(null);
    setMessage(null);
    try {
      await api.post('/ads/request', { kind, targetId: item.id });
      setMessage('درخواست تبلیغ ثبت شد. پس از تأیید مدیر در صفحه اصلی نمایش داده می‌شود.');
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
  const requestFor = (kind: AdTargetKind, id: string) =>
    requests.find((request) => request.kind === kind && request.targetId === id);
  const total = (data?.businessCards.length ?? 0) + (data?.biolinks.length ?? 0);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold text-ink">تبلیغات</h2>
        <p className="text-sm text-muted">
          یکی از کارت‌های ویزیت یا بیولینک‌های خود را برای نمایش در کادر تبلیغات صفحه
          اصلی انتخاب کنید. پس از تأیید مدیر، تبلیغ شما برای مدت مشخص‌شده نمایش داده
          می‌شود.
        </p>
      </div>

      {data?.settings ? (
        <div className="indeed-panel flex flex-wrap items-center gap-4 p-4 text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted">
            <Sparkles className="size-4 text-brand" aria-hidden />
            مدت نمایش هر تبلیغ:{' '}
            <b className="text-ink">
              {data.settings.durationDays.toLocaleString('fa-IR')} روز
            </b>
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted">
            <Megaphone className="size-4 text-brand" aria-hidden />
            تعداد تبلیغ در روز:{' '}
            <b className="text-ink">
              {data.settings.dailySlots.toLocaleString('fa-IR')}
            </b>
          </span>
        </div>
      ) : null}

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
            برای ثبت تبلیغ ابتدا یک بیولینک یا کارت ویزیت بسازید و منتشر کنید.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/dashboard/business-cards" className="indeed-btn indeed-btn-primary py-2 text-sm">
              کارت‌های ویزیت من
            </Link>
            <Link href="/dashboard/biolinks" className="indeed-btn indeed-btn-secondary py-2 text-sm">
              بیولینک‌های من
            </Link>
          </div>
        </div>
      ) : (
        <>
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
                  request={requestFor('BUSINESS_CARD', item.id)}
                  busy={busyId === item.id}
                  onRequest={requestAd}
                />
              ))
            ) : (
              <p className="indeed-panel p-4 text-sm text-muted">
                کارت ویزیتی برای نمایش نیست.
              </p>
            )}
          </section>

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
                  request={requestFor('BIOLINK', item.id)}
                  busy={busyId === item.id}
                  onRequest={requestAd}
                />
              ))
            ) : (
              <p className="indeed-panel p-4 text-sm text-muted">
                بیولینکی برای نمایش نیست.
              </p>
            )}
          </section>

          {requests.length ? (
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-extrabold text-ink">تاریخچه درخواست‌ها</h3>
              <div className="indeed-panel divide-y divide-[var(--vintage-border)]">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
                  >
                    <span className="font-bold text-ink">
                      {request.target?.fullName ?? '—'}
                      <span className="ms-2 text-xs text-muted">
                        {request.kind === 'BUSINESS_CARD' ? 'کارت ویزیت' : 'بیولینک'}
                      </span>
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(request.requestedAt).toLocaleDateString('fa-IR')}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-bold',
                        request.status === 'APPROVED'
                          ? 'bg-green-50 text-green-700'
                          : request.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700',
                      )}
                    >
                      {STATUS_LABELS[request.status] ?? request.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
