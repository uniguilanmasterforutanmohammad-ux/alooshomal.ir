'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';

import { BusinessCardStatusBadge } from '@/components/businesscard/BusinessCardStatusBadge';
import { CardStatsBar } from '@/components/dashboard/CardStatsBar';
import { api, type BusinessCard } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function MyBusinessCardsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const [businessCards, setBusinessCards] = useState<BusinessCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<BusinessCard[]>('/business-cards/mine');
      setBusinessCards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!token) {
      router.replace('/login');
      return;
    }
    void load();
  }, [hydrated, token, router, load]);

  async function remove(id: string, name: string) {
    if (!window.confirm(`آیا از حذف کارت ویزیت «${name}» مطمئن هستید؟ این کار بازگشت‌پذیر نیست.`)) {
      return;
    }
    setDeletingId(id);
    setError(null);
    try {
      await api.delete(`/business-cards/${id}`);
      setBusinessCards((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف کارت ویزیت ناموفق بود');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-ink">کارت‌های ویزیت من</h2>
          <p className="text-sm text-muted">مدیریت و ویرایش کارت ویزیت‌های ویزیت دیجیتال</p>
        </div>
        <Link href="/dashboard/business-cards/new" className="indeed-btn indeed-btn-primary">
          <Plus className="size-4" aria-hidden />
          کارت ویزیت جدید
        </Link>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-muted">در حال بارگذاری...</p>
      ) : businessCards.length === 0 ? (
        <div className="indeed-panel p-10 text-center">
          <p className="text-lg font-bold text-ink">هنوز کارت ویزیتی نساخته‌اید</p>
          <p className="mt-2 text-sm text-muted">
            اولین کارت ویزیت دیجیتال خود را بسازید و برای تأیید ارسال کنید.
          </p>
          <Link href="/dashboard/business-cards/new" className="indeed-btn indeed-btn-primary mt-6">
            <Plus className="size-4" aria-hidden />
            ساخت کارت ویزیت
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {businessCards.map((businessCard) => (
            <div key={businessCard.id} className="indeed-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-extrabold text-ink">{businessCard.fullName}</h3>
                  <p className="text-sm text-muted">{businessCard.jobTitle ?? '—'}</p>
                </div>
                <BusinessCardStatusBadge status={businessCard.status} />
              </div>

              {businessCard.rejectionReason ? (
                <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                  دلیل رد: {businessCard.rejectionReason}
                </p>
              ) : null}

              <CardStatsBar
                kind="business-cards"
                targetId={businessCard.id}
                isPublished={businessCard.isPublished}
                likeCount={businessCard.likeCount}
                saveCount={businessCard.saveCount}
                views={businessCard.views}
                rank={businessCard.rank}
                boostStatus={businessCard.boostStatus}
              />

              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={`/dashboard/business-cards/${businessCard.id}/edit`}
                  className="indeed-btn indeed-btn-primary flex-1 py-2 text-sm"
                >
                  ویرایش
                </Link>
                {businessCard.isPublished ? (
                  <Link
                    href={`/business-cards/${businessCard.slug}`}
                    className="indeed-btn indeed-btn-secondary flex-1 py-2 text-sm"
                  >
                    مشاهده
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => remove(businessCard.id, businessCard.fullName)}
                  disabled={deletingId === businessCard.id}
                  aria-label="حذف کارت ویزیت"
                  className="indeed-btn flex items-center justify-center border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
