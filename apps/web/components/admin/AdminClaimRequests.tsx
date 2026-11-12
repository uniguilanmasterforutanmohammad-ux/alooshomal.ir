'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, ShieldQuestion, X } from 'lucide-react';

import { api } from '@/lib/api';
import { fa, formatJalali } from '@/lib/jalali';

interface ClaimRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  note: string | null;
  createdAt: string;
  decidedAt: string | null;
  user: { id: string; fullName: string | null; email: string | null; phone: string | null };
  decidedBy: { id: string; fullName: string | null; email: string | null } | null;
  businessCard: {
    id: string;
    slug: string;
    fullName: string;
    isUnclaimed: boolean;
    isPublished: boolean;
    city: { name: string } | null;
    business: { name: string } | null;
  };
}

interface ClaimRequestsResponse {
  items: ClaimRequest[];
  total: number;
  pending: number;
}

const FILTERS: Array<{ key: string; label: string }> = [
  { key: 'PENDING', label: 'در انتظار' },
  { key: 'APPROVED', label: 'تأییدشده' },
  { key: 'REJECTED', label: 'ردشده' },
  { key: 'ALL', label: 'همه' },
];

const STATUS_LABEL: Record<ClaimRequest['status'], string> = {
  PENDING: 'در انتظار',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
};

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * «درخواست‌های تصاحب» — imported business cards without a mobile/e-mail cannot
 * prove ownership with a one-time code, so their claim lands here. Approving
 * transfers the card exactly like a verified claim; rejecting notifies the user.
 */
export function AdminClaimRequests() {
  const [data, setData] = useState<ClaimRequestsResponse | null>(null);
  const [status, setStatus] = useState('PENDING');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await api.get<ClaimRequestsResponse>(
        `/admin/claim-requests?status=${status}`,
      );
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری درخواست‌ها');
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(request: ClaimRequest, approve: boolean) {
    if (
      !confirm(
        approve
          ? `مالکیت «${request.businessCard.fullName}» به ${request.user.email ?? request.user.phone ?? 'این کاربر'} منتقل شود؟`
          : 'این درخواست تصاحب رد شود؟',
      )
    ) {
      return;
    }
    setBusy(request.id);
    setError(null);
    setMessage(null);
    try {
      await api.post(`/admin/claim-requests/${request.id}/decide`, {
        approve,
        note: notes[request.id]?.trim() || undefined,
      });
      setMessage(
        approve
          ? `مالکیت «${request.businessCard.fullName}» منتقل شد.`
          : 'درخواست رد شد و به کاربر اطلاع داده شد.',
      );
      setNotes((prev) => {
        const next = { ...prev };
        delete next[request.id];
        return next;
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بررسی درخواست ناموفق بود');
    } finally {
      setBusy(null);
    }
  }

  const items = data?.items ?? [];

  return (
    <div className="indeed-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
            <ShieldQuestion className="size-5 text-brand" aria-hidden />
            درخواست‌های تصاحب کسب‌وکار
          </h3>
          <p className="mt-1 text-xs text-muted">
            کارت‌های ایمپورت‌شده‌ای که نه موبایل دارند و نه ایمیل، با کد
            یکبارمصرف قابل تأیید نیستند؛ درخواست صاحبشان اینجا برای بررسی مدیر
            می‌آید. تأیید، مالکیت را مثل تصاحب تأییدشده منتقل می‌کند.
          </p>
        </div>
        {data ? (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
            در انتظار: {fa(data.pending)}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setStatus(filter.key)}
            className={
              status === filter.key
                ? 'indeed-btn indeed-btn-primary py-1.5 text-xs'
                : 'indeed-btn indeed-btn-secondary py-1.5 text-xs'
            }
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        {items.length === 0 ? (
          <p className="rounded-lg bg-soft p-3 text-xs text-muted">
            درخواستی در این وضعیت وجود ندارد.
          </p>
        ) : (
          items.map((request) => (
            <div
              key={request.id}
              className="rounded-xl border border-[var(--vintage-border)] bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-ink">
                    {request.businessCard.fullName}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {[request.businessCard.business?.name, request.businessCard.city?.name]
                      .filter(Boolean)
                      .join(' · ')}
                    {' — '}
                    <a
                      href={`/business-cards/${request.businessCard.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-brand hover:underline"
                    >
                      مشاهده صفحه
                    </a>
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    درخواست‌دهنده:{' '}
                    <span dir="ltr" className="font-bold text-ink">
                      {request.user.email ?? request.user.phone ?? request.user.id}
                    </span>
                    {request.user.fullName ? ` — ${request.user.fullName}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    ثبت: {formatJalali(request.createdAt)} — {timeOf(request.createdAt)}
                    {request.decidedAt
                      ? ` · بررسی: ${formatJalali(request.decidedAt)} — ${timeOf(request.decidedAt)}`
                      : ''}
                  </p>
                  {request.note ? (
                    <p className="mt-1 text-xs text-muted">یادداشت: {request.note}</p>
                  ) : null}
                </div>
                <span
                  className={
                    request.status === 'PENDING'
                      ? 'rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700'
                      : request.status === 'APPROVED'
                        ? 'rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700'
                        : 'rounded-full bg-soft px-2.5 py-1 text-[11px] font-bold text-muted'
                  }
                >
                  {STATUS_LABEL[request.status]}
                </span>
              </div>

              {request.status === 'PENDING' ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    value={notes[request.id] ?? ''}
                    onChange={(event) =>
                      setNotes((prev) => ({ ...prev, [request.id]: event.target.value }))
                    }
                    placeholder="یادداشت اختیاری (برای رد، دلیل به کاربر نشان داده می‌شود)"
                    maxLength={500}
                    className="min-w-64 flex-1 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-xs text-ink outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void decide(request, true)}
                    disabled={busy !== null}
                    className="indeed-btn indeed-btn-primary py-1.5 text-xs disabled:opacity-60"
                  >
                    {busy === request.id ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Check className="size-3.5" aria-hidden />
                    )}
                    تأیید و انتقال
                  </button>
                  <button
                    type="button"
                    onClick={() => void decide(request, false)}
                    disabled={busy !== null}
                    className="indeed-btn py-1.5 text-xs font-bold text-red-600 disabled:opacity-60"
                  >
                    <X className="size-3.5" aria-hidden />
                    رد
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      {message ? (
        <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
