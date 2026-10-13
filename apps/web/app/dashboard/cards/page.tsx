'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgeCheck, IdCard, Plus, Trash2 } from 'lucide-react';

import { BiolinkStatusBadge } from '@/components/biolink/BiolinkStatusBadge';
import { BusinessCardStatusBadge } from '@/components/businesscard/BusinessCardStatusBadge';
import { api, type Biolink, type BusinessCard, type Paged } from '@/lib/api';
import { useAuth } from '@/lib/auth';

/**
 * Unified "my cards" page. Lists every biolink and business card the signed-in
 * user owns and lets them delete either kind directly.
 */
export default function MyCardsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const [biolinks, setBiolinks] = useState<Biolink[]>([]);
  const [businessCards, setBusinessCards] = useState<BusinessCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [links, cards] = await Promise.all([
        api.get<Paged<Biolink>>('/biolinks/mine'),
        api.get<Paged<BusinessCard>>('/business-cards/mine'),
      ]);
      setBiolinks(links.items);
      setBusinessCards(cards.items);
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

  async function removeBiolink(item: Biolink) {
    if (!window.confirm(`آیا از حذف بیولینک «${item.fullName}» مطمئن هستید؟`)) return;
    setDeletingId(item.id);
    try {
      await api.delete(`/biolinks/${item.id}`);
      setBiolinks((prev) => prev.filter((entry) => entry.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف بیولینک ناموفق بود');
    } finally {
      setDeletingId(null);
    }
  }

  async function removeBusinessCard(item: BusinessCard) {
    if (!window.confirm(`آیا از حذف کارت ویزیت «${item.fullName}» مطمئن هستید؟`)) return;
    setDeletingId(item.id);
    try {
      await api.delete(`/business-cards/${item.id}`);
      setBusinessCards((prev) => prev.filter((entry) => entry.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف کارت ویزیت ناموفق بود');
    } finally {
      setDeletingId(null);
    }
  }

  const total = biolinks.length + businessCards.length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-ink">کارت‌های من</h2>
          <p className="text-sm text-muted">
            همه بیولینک‌ها و کارت‌های ویزیت شما در یک نگاه — با امکان حذف.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/biolinks/new" className="indeed-btn indeed-btn-secondary">
            <Plus className="size-4" aria-hidden />
            بیولینک جدید
          </Link>
          <Link href="/dashboard/business-cards/new" className="indeed-btn indeed-btn-primary">
            <Plus className="size-4" aria-hidden />
            کارت ویزیت جدید
          </Link>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-muted">در حال بارگذاری...</p>
      ) : total === 0 ? (
        <div className="indeed-panel p-10 text-center">
          <p className="text-lg font-bold text-ink">هنوز کارتی نساخته‌اید</p>
          <p className="mt-2 text-sm text-muted">
            اولین بیولینک یا کارت ویزیت دیجیتال خود را بسازید.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {biolinks.map((item) => (
            <div key={item.id} className="indeed-panel flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand">
                    <IdCard className="size-3" aria-hidden />
                    بیولینک
                  </span>
                  <h3 className="truncate text-lg font-extrabold text-ink">
                    {item.fullName}
                  </h3>
                  <p className="truncate text-sm text-muted">{item.jobTitle ?? '—'}</p>
                </div>
                <BiolinkStatusBadge status={item.status} />
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={`/dashboard/biolinks/${item.id}/edit`}
                  className="indeed-btn indeed-btn-primary flex-1 py-2 text-sm"
                >
                  ویرایش
                </Link>
                {item.isPublished ? (
                  <Link
                    href={`/biolinks/${item.slug}`}
                    className="indeed-btn indeed-btn-secondary flex-1 py-2 text-sm"
                  >
                    مشاهده
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeBiolink(item)}
                  disabled={deletingId === item.id}
                  aria-label="حذف بیولینک"
                  className="indeed-btn flex items-center justify-center border border-red-200 bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100 disabled:opacity-60"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          ))}

          {businessCards.map((item) => (
            <div key={item.id} className="indeed-panel flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand">
                    <BadgeCheck className="size-3" aria-hidden />
                    کارت ویزیت
                  </span>
                  <h3 className="truncate text-lg font-extrabold text-ink">
                    {item.fullName}
                  </h3>
                  <p className="truncate text-sm text-muted">{item.jobTitle ?? '—'}</p>
                </div>
                <BusinessCardStatusBadge status={item.status} />
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={`/dashboard/business-cards/${item.id}/edit`}
                  className="indeed-btn indeed-btn-primary flex-1 py-2 text-sm"
                >
                  ویرایش
                </Link>
                {item.isPublished ? (
                  <Link
                    href={`/business-cards/${item.slug}`}
                    className="indeed-btn indeed-btn-secondary flex-1 py-2 text-sm"
                  >
                    مشاهده
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeBusinessCard(item)}
                  disabled={deletingId === item.id}
                  aria-label="حذف کارت ویزیت"
                  className="indeed-btn flex items-center justify-center border border-red-200 bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100 disabled:opacity-60"
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
