'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Check,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { FeedComment, FeedCommentsResponse, NewsStatus } from '@/lib/api';
import { richTextPreview } from '@/lib/rich-text';
import { cn } from '@/lib/utils';
import { STATUS_LABELS, STATUS_FILTERS } from './shared';

/**
 * «کامنت‌ها» — moderation queue for user comments on feed posts. Comments only
 * become public after an admin approves them, so the default filter is the
 * pending queue; approved/rejected tabs let an admin revisit past decisions.
 */
export function CommentsModeration() {
  const [status, setStatus] = useState<NewsStatus>('PENDING');
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [meta, setMeta] = useState<FeedCommentsResponse['meta'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<FeedCommentsResponse>(
        `/admin/feeds/comments?status=${status}`,
      );
      setComments(result.items);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری کامنت‌ها');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function moderate(id: string, decision: NewsStatus, reason?: string) {
    setBusyId(id);
    setError(null);
    try {
      await api.patch(`/admin/feeds/comments/${id}/moderate`, { decision, reason });
      setComments((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت تصمیم ناموفق بود');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('این کامنت برای همیشه حذف شود؟')) return;
    setBusyId(id);
    try {
      await api.delete(`/admin/feeds/comments/${id}`);
      setComments((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف ناموفق بود');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item}
            onClick={() => setStatus(item)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-bold transition',
              status === item
                ? 'border-brand bg-brand-light text-brand'
                : 'border-[var(--vintage-border)] bg-white text-muted hover:border-brand',
            )}
          >
            {STATUS_LABELS[item]}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">در حال بارگذاری...</p>
      ) : comments.length === 0 ? (
        <p className="indeed-panel p-6 text-center text-sm text-muted">
          کامنتی با این وضعیت وجود ندارد.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((comment) => (
            <article key={comment.id} className="indeed-panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="vintage-avatar flex size-8 items-center justify-center text-xs font-extrabold">
                    {(comment.user?.fullName ?? '؟').trim().charAt(0) || '؟'}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink">
                      {comment.user?.fullName ?? 'کاربر'}
                    </p>
                    <p className="text-[10px] text-muted" dir="ltr">
                      {comment.user?.email ?? ''}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-muted">
                  {new Date(comment.createdAt).toLocaleString('fa-IR')}
                </span>
              </div>

              <p className="mt-2 whitespace-pre-line rounded-lg bg-soft p-3 text-sm leading-7 text-ink-soft">
                {comment.body}
              </p>

              {comment.feedPost ? (
                <p className="mt-2 line-clamp-2 text-[11px] text-muted">
                  روی پست: {richTextPreview(comment.feedPost.body ?? '') || '—'}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === comment.id}
                  onClick={() => void moderate(comment.id, 'APPROVED')}
                  className="indeed-btn indeed-btn-primary py-1.5 text-xs disabled:opacity-60"
                >
                  <Check className="size-3.5" aria-hidden />
                  تأیید و انتشار
                </button>
                <button
                  type="button"
                  disabled={busyId === comment.id}
                  onClick={() => {
                    const reason = window.prompt('علت رد کامنت (اختیاری):') ?? undefined;
                    void moderate(comment.id, 'REJECTED', reason);
                  }}
                  className="indeed-btn indeed-btn-secondary py-1.5 text-xs disabled:opacity-60"
                >
                  <X className="size-3.5" aria-hidden />
                  رد
                </button>
                <button
                  type="button"
                  disabled={busyId === comment.id}
                  onClick={() => void remove(comment.id)}
                  className="indeed-btn py-1.5 text-xs text-red-600 disabled:opacity-60"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  حذف
                </button>
              </div>
              {meta ? (
                <p className="mt-2 text-[10px] text-muted">
                  {meta.total.toLocaleString('fa-IR')} کامنت با این وضعیت
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
