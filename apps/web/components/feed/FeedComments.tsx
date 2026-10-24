'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Send, ShieldCheck, Trash2 } from 'lucide-react';

import {
  api,
  type FeedComment,
  type MyFeedCommentsResponse,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFeatures } from '@/lib/features';
import { cn } from '@/lib/utils';

/** Status pill shown on the author's own not-yet-approved comments. */
const STATUS_PILL: Record<FeedComment['status'], { label: string; className: string }> = {
  PENDING: {
    label: 'در انتظار تأیید',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  APPROVED: {
    label: 'تأییدشده',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  REJECTED: {
    label: 'ردشده',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
};

function faDate(value: string) {
  return new Date(value).toLocaleString('fa-IR');
}

/**
 * Comments on a single feed post. Comments are moderated, so a newly posted
 * comment is shown to its author with an «در انتظار تأیید» badge and only
 * becomes public once an admin approves it. Only signed-in users can comment.
 */
export function FeedComments({ postId }: { postId: string }) {
  const { token, hydrated, user } = useAuth();
  const { isFeatureVisible } = useFeatures();
  const [items, setItems] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const enabled = isFeatureVisible('featureFeedComments');

  const load = useCallback(async () => {
    try {
      const result = await api.get<MyFeedCommentsResponse>(
        `/feeds/public/${postId}/comments`,
      );
      setItems(result.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری کامنت‌ها');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const created = await api.post<FeedComment>(
        `/feeds/public/${postId}/comments`,
        { body: text },
      );
      setItems((prev) => [created, ...prev]);
      setBody('');
      setNotice('کامنت شما ثبت شد و پس از تأیید مدیر نمایش داده می‌شود.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت کامنت ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/feeds/public/comments/${id}`);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف کامنت ناموفق بود');
    }
  }

  const approvedCount = items.filter((item) => item.status === 'APPROVED').length;

  return (
    <section className="indeed-panel mt-4 p-5">
      <div className="flex items-center gap-2">
        <MessageCircle className="size-5 text-brand" aria-hidden />
        <h2 className="text-sm font-extrabold text-ink">
          کامنت‌ها
          {approvedCount > 0 ? (
            <span className="ms-1 text-xs font-bold text-muted">
              ({approvedCount.toLocaleString('fa-IR')})
            </span>
          ) : null}
        </h2>
      </div>

      {!enabled ? (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          کامنت‌گذاری موقتاً توسط مدیر غیرفعال شده است.
        </p>
      ) : null}

      {enabled ? (
        hydrated && token ? (
          <form onSubmit={submit} className="mt-4">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="دیدگاه خود را بنویسید…"
              className="w-full resize-none rounded-xl border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1 text-[11px] text-muted">
                <ShieldCheck className="size-3.5" aria-hidden />
                کامنت‌ها پس از تأیید مدیر منتشر می‌شوند.
              </p>
              <button
                type="submit"
                disabled={busy || !body.trim()}
                className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
              >
                <Send className="size-4" aria-hidden />
                ارسال کامنت
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-4 rounded-lg bg-soft p-3 text-sm text-muted">
            برای ثبت کامنت ابتدا{' '}
            <Link href="/login" className="font-bold text-brand">
              وارد شوید
            </Link>
            .
          </p>
        )
      ) : null}

      {notice ? (
        <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <ul className="mt-5 flex flex-col divide-y divide-dashed divide-[var(--vintage-border)]">
        {loading ? (
          <li className="py-4 text-sm text-muted">در حال بارگذاری کامنت‌ها…</li>
        ) : items.length === 0 ? (
          <li className="py-4 text-sm text-muted">
            هنوز کامنتی ثبت نشده؛ اولین نفر باشید.
          </li>
        ) : (
          items.map((comment) => {
            const mine = user?.id === comment.userId;
            const pill = STATUS_PILL[comment.status];
            return (
              <li key={comment.id} className="flex gap-3 py-3.5">
                <span className="vintage-avatar flex size-9 shrink-0 items-center justify-center text-xs font-extrabold">
                  {(comment.user?.fullName ?? '؟').trim().charAt(0) || '؟'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-ink">
                      {comment.user?.fullName ?? 'کاربر'}
                      {mine ? <span className="text-muted"> (شما)</span> : null}
                    </p>
                    {comment.status !== 'APPROVED' ? (
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-bold',
                          pill.className,
                        )}
                      >
                        {pill.label}
                      </span>
                    ) : null}
                    <span className="text-[10px] text-muted">{faDate(comment.createdAt)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm leading-7 text-ink-soft">
                    {comment.body}
                  </p>
                  {mine ? (
                    <button
                      type="button"
                      onClick={() => void remove(comment.id)}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-red-500 hover:underline"
                    >
                      <Trash2 className="size-3" aria-hidden />
                      حذف
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
