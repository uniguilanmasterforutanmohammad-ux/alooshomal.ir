'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Check,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { FeedPost, NewsStatus } from '@/lib/api';
import { richTextPreview } from '@/lib/rich-text';
import { STATUS_LABELS, STATUS_FILTERS } from './shared';

export function PostsModeration() {
  const [status, setStatus] = useState<NewsStatus>('PENDING');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPosts(await api.get<FeedPost[]>(`/admin/feeds/posts?status=${status}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, decision: 'APPROVED' | 'REJECTED') {
    setBusyId(id);
    try {
      await api.patch(`/admin/feeds/posts/${id}/moderate`, { decision });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت تصمیم ناموفق بود');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('این پست حذف شود؟')) return;
    try {
      await api.delete(`/admin/feeds/posts/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف ناموفق بود');
    }
  }

  async function decideTag(id: string, decision: 'CONFIRM' | 'REJECT') {
    setBusyId(id);
    try {
      await api.patch(`/admin/feeds/posts/${id}/tag-payment`, { decision });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت تصمیم تگ ناموفق بود');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((value) => (
          <button
            key={value}
            onClick={() => setStatus(value)}
            className={
              status === value
                ? 'indeed-btn indeed-btn-primary py-2 text-sm'
                : 'indeed-btn indeed-btn-secondary py-2 text-sm'
            }
          >
            {STATUS_LABELS[value]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted">در حال بارگذاری...</p>
      ) : posts.length === 0 ? (
        <div className="indeed-panel p-8 text-center text-muted">
          پستی در این وضعیت وجود ندارد.
        </div>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="indeed-panel flex flex-wrap gap-4 p-4">
            {post.images.length ? (
              <div className="flex gap-2">
                {post.images.slice(0, 4).map((image) => (
                  <Image
                    key={image}
                    src={image}
                    alt="تصویر پست"
                    width={72}
                    height={72}
                    className="size-18 rounded-lg object-cover"
                    unoptimized
                  />
                ))}
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">{richTextPreview(post.body) || '—'}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>{post.user?.fullName ?? post.user?.email ?? '—'}</span>
                <span>•</span>
                <span>{new Date(post.createdAt).toLocaleDateString('fa-IR')}</span>
                {post.topic ? <span>• {post.topic.name}</span> : null}
              </div>
              {post.tagKind ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-[var(--vintage-border)]/20 p-2 text-xs">
                  <Tag className="size-3.5 text-brand" aria-hidden />
                  <span className="text-ink">
                    تگ:{' '}
                    <b>{post.tag?.company || post.tag?.fullName || '—'}</b>
                    {post.tagKind === 'BIOLINK' ? ' (بیولینک)' : ' (کارت ویزیت)'}
                  </span>
                  <span
                    className={
                      post.tagPaid
                        ? 'font-bold text-green-700'
                        : 'font-bold text-amber-700'
                    }
                  >
                    {post.tagPaid
                      ? '✓ پرداخت تأییدشده'
                      : `در انتظار پرداخت${
                          post.tagPrice
                            ? ` (${post.tagPrice.toLocaleString('fa-IR')} تومان)`
                            : ''
                        }`}
                  </span>
                  {!post.tagPaid ? (
                    <span className="flex items-center gap-1">
                      <button
                        disabled={busyId === post.id}
                        onClick={() => decideTag(post.id, 'CONFIRM')}
                        className="indeed-btn indeed-btn-primary py-1 text-xs disabled:opacity-60"
                      >
                        <Check className="size-3.5" aria-hidden />
                        تأیید پرداخت
                      </button>
                      <button
                        disabled={busyId === post.id}
                        onClick={() => decideTag(post.id, 'REJECT')}
                        className="indeed-btn indeed-btn-secondary py-1 text-xs text-red-600 disabled:opacity-60"
                      >
                        <X className="size-3.5" aria-hidden />
                        رد تگ
                      </button>
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {post.status === 'PENDING' ? (
                <>
                  <button
                    disabled={busyId === post.id}
                    onClick={() => decide(post.id, 'APPROVED')}
                    className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
                  >
                    <Check className="size-4" aria-hidden />
                    تأیید
                  </button>
                  <button
                    disabled={busyId === post.id}
                    onClick={() => decide(post.id, 'REJECTED')}
                    className="indeed-btn indeed-btn-secondary py-2 text-sm text-red-600 disabled:opacity-60"
                  >
                    <X className="size-4" aria-hidden />
                    رد
                  </button>
                </>
              ) : null}
              <button
                onClick={() => remove(post.id)}
                className="indeed-btn indeed-btn-secondary py-2 text-sm text-red-600"
              >
                <Trash2 className="size-4" aria-hidden />
                حذف
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
