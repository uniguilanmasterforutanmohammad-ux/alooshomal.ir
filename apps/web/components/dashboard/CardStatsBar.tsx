'use client';

import { useEffect, useState } from 'react';
import { Bookmark, Eye, Heart, ListOrdered, TrendingUp } from 'lucide-react';

import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Props {
  kind: 'biolinks' | 'business-cards';
  targetId: string;
  isPublished: boolean;
  likeCount?: number;
  saveCount?: number;
  views?: number;
  rank?: { rank: number | null; page: number | null } | null;
  boostStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
}

/**
 * Minimal per-card analytics row shown under each "my biolinks / my business
 * cards" card: likes, directory rank + page, saves by other users, total views,
 * plus a compact "درخواست پله" button.
 */
export function CardStatsBar({
  kind,
  targetId,
  isPublished,
  likeCount = 0,
  saveCount = 0,
  views = 0,
  rank,
  boostStatus: initialBoostStatus = null,
}: Props) {
  const [boostStatus, setBoostStatus] = useState(initialBoostStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBoostStatus(initialBoostStatus);
  }, [initialBoostStatus]);

  async function requestBoost() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/boosts/request', {
        kind: kind === 'biolinks' ? 'BIOLINK' : 'BUSINESS_CARD',
        targetId,
        feature: 'POLE',
      });
      setBoostStatus('PENDING');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت درخواست ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  const rankText = rank?.rank
    ? `#${rank.rank.toLocaleString('fa-IR')}${
        rank.page ? ` ص${rank.page.toLocaleString('fa-IR')}` : ''
      }`
    : '—';

  return (
    <div className="mt-3 border-t border-dashed border-[var(--vintage-border)] pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1" title="تعداد لایک">
            <Heart className="size-3.5 text-red-500" aria-hidden />
            {likeCount.toLocaleString('fa-IR')}
          </span>
          <span className="inline-flex items-center gap-1" title="جایگاه در دایرکتوری">
            <ListOrdered className="size-3.5 text-brand" aria-hidden />
            {rankText}
          </span>
          <span className="inline-flex items-center gap-1" title="ذخیره‌شده توسط کاربران">
            <Bookmark className="size-3.5 text-amber-500" aria-hidden />
            {saveCount.toLocaleString('fa-IR')}
          </span>
          <span className="inline-flex items-center gap-1" title="تعداد نمایش کل">
            <Eye className="size-3.5 text-sky-500" aria-hidden />
            {views.toLocaleString('fa-IR')}
          </span>
        </div>

        <button
          type="button"
          disabled={busy || !isPublished || boostStatus === 'PENDING'}
          onClick={requestBoost}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition',
            boostStatus === 'PENDING'
              ? 'border-amber-200 bg-amber-50 text-amber-600'
              : 'border-[var(--vintage-border)] text-muted hover:border-brand hover:text-brand',
            (busy || !isPublished) && 'opacity-50',
          )}
          title={!isPublished ? 'فقط کارت‌های منتشرشده قابل پله هستند' : 'درخواست پله'}
        >
          <TrendingUp className="size-3.5" aria-hidden />
          {boostStatus === 'PENDING' ? 'در انتظار تأیید' : 'درخواست پله'}
        </button>
      </div>
      {error ? <p className="mt-1 text-[10px] text-red-600">{error}</p> : null}
    </div>
  );
}
