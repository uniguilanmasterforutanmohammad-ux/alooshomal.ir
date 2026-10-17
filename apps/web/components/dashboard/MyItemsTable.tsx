'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Eye,
  Heart,
  ListOrdered,
  Megaphone,
  Pencil,
  Trash2,
  TrendingUp,
} from 'lucide-react';

import { BiolinkStatusBadge } from '@/components/biolink/BiolinkStatusBadge';
import { BusinessCardStatusBadge } from '@/components/businesscard/BusinessCardStatusBadge';
import { api } from '@/lib/api';
import type { Biolink, BusinessCard } from '@/lib/api';
import { cn } from '@/lib/utils';

export type MyItemKind = 'biolinks' | 'business-cards';
type Row = Biolink & BusinessCard;
type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | null;

interface Props {
  kind: MyItemKind;
  items: Row[];
  loading: boolean;
  deletingId: string | null;
  onRemove: (id: string, name: string) => void;
}

/**
 * Table view for the user's own biolinks / business cards. Keeps every action
 * the previous card grid had (status, rank/views/likes/saves, edit, view,
 * delete, «پله») and adds the two advertising requests: home-page ad and
 * directory ad.
 */
export function MyItemsTable({ kind, items, loading, deletingId, onRemove }: Props) {
  const [boostState, setBoostState] = useState<Record<string, RequestStatus>>({});
  const [adState, setAdState] = useState<Record<string, RequestStatus>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiKind = kind === 'biolinks' ? 'BIOLINK' : 'BUSINESS_CARD';

  async function requestBoost(item: Row) {
    setBusy(`boost:${item.id}`);
    setError(null);
    try {
      await api.post('/boosts/request', {
        kind: apiKind,
        targetId: item.id,
        feature: 'POLE',
      });
      setBoostState((prev) => ({ ...prev, [item.id]: 'PENDING' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت درخواست پله ناموفق بود');
    } finally {
      setBusy(null);
    }
  }

  async function requestAd(item: Row) {
    setBusy(`ad:${item.id}`);
    setError(null);
    try {
      await api.post('/ads/request', { kind: apiKind, targetId: item.id });
      setAdState((prev) => ({ ...prev, [item.id]: 'PENDING' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت درخواست تبلیغ ناموفق بود');
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <p className="text-muted">در حال بارگذاری...</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="indeed-panel overflow-x-auto">
        <table className="w-full min-w-[56rem] border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-dashed border-[var(--vintage-accent-hover)] text-right text-xs text-muted">
              <th className="px-3 py-3 font-bold">عنوان</th>
              <th className="px-3 py-3 font-bold">وضعیت</th>
              <th className="px-3 py-3 font-bold">جایگاه</th>
              <th className="px-3 py-3 font-bold">بازدید</th>
              <th className="px-3 py-3 font-bold">لایک / ذخیره</th>
              <th className="px-3 py-3 font-bold">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const boostStatus = boostState[item.id] ?? item.boostStatus ?? null;
              const adStatus = adState[item.id] ?? item.adStatus ?? null;
              const rank = item.rank?.rank ?? null;
              const rankPage = item.rank?.page ?? null;
              return (
                <tr
                  key={item.id}
                  className="border-b border-dashed border-[var(--vintage-border)] last:border-b-0"
                >
                  <td className="px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">{item.fullName}</p>
                      <p className="truncate text-xs text-muted">{item.jobTitle ?? '—'}</p>
                      {item.rejectionReason ? (
                        <p className="mt-1 text-xs text-red-600">
                          دلیل رد: {item.rejectionReason}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {kind === 'biolinks' ? (
                      <BiolinkStatusBadge status={item.status} />
                    ) : (
                      <BusinessCardStatusBadge status={item.status} />
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
                        rank === 1 ? 'bg-amber-100 text-amber-700' : 'bg-soft text-ink',
                      )}
                    >
                      <ListOrdered className="size-3.5" aria-hidden />
                      {rank ? (
                        <>
                          ردیف {rank.toLocaleString('fa-IR')}
                          {rankPage ? ` • ص${rankPage.toLocaleString('fa-IR')}` : ''}
                        </>
                      ) : (
                        '—'
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 text-xs text-muted">
                      <Eye className="size-3.5 text-sky-500" aria-hidden />
                      {(item.views ?? 0).toLocaleString('fa-IR')}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-2 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="size-3.5 text-red-500" aria-hidden />
                        {(item.likeCount ?? 0).toLocaleString('fa-IR')}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Bookmark className="size-3.5 text-amber-500" aria-hidden />
                        {(item.saveCount ?? 0).toLocaleString('fa-IR')}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link
                        href={`/dashboard/${kind}/${item.id}/edit`}
                        className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
                      >
                        <Pencil className="size-3.5" aria-hidden />
                        ویرایش
                      </Link>
                      {item.isPublished ? (
                        <Link
                          href={`/${kind === 'biolinks' ? 'biolinks' : 'business-cards'}/${item.slug}`}
                          className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
                        >
                          <Eye className="size-3.5" aria-hidden />
                          مشاهده
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy === `ad:${item.id}` || adStatus === 'PENDING' || !item.isPublished}
                        onClick={() => requestAd(item)}
                        title={!item.isPublished ? 'فقط موارد منتشرشده قابل تبلیغ هستند' : 'درخواست تبلیغ در صفحه اصلی'}
                        className={cn(
                          'indeed-btn py-1.5 text-xs',
                          adStatus === 'PENDING'
                            ? 'border border-amber-200 bg-amber-50 text-amber-600'
                            : 'indeed-btn-secondary',
                        )}
                      >
                        <Megaphone className="size-3.5" aria-hidden />
                        {adStatus === 'PENDING' ? 'تبلیغ: در انتظار' : 'تبلیغ صفحه اول'}
                      </button>
                      <button
                        type="button"
                        disabled={busy === `boost:${item.id}` || boostStatus === 'PENDING' || !item.isPublished}
                        onClick={() => requestBoost(item)}
                        title={!item.isPublished ? 'فقط موارد منتشرشده قابل پله هستند' : 'درخواست تبلیغ در دایرکتوری'}
                        className={cn(
                          'indeed-btn py-1.5 text-xs',
                          boostStatus === 'PENDING'
                            ? 'border border-amber-200 bg-amber-50 text-amber-600'
                            : 'indeed-btn-secondary',
                        )}
                      >
                        <TrendingUp className="size-3.5" aria-hidden />
                        {boostStatus === 'PENDING' ? 'پله: در انتظار' : 'تبلیغ دایرکتوری'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(item.id, item.fullName)}
                        disabled={deletingId === item.id}
                        aria-label="حذف"
                        className="indeed-btn flex items-center justify-center border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-muted">
                  موردی برای نمایش نیست.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
