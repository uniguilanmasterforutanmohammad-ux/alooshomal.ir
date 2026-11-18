'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

import { MyItemsTable } from '@/components/dashboard/MyItemsTable';
import { Pagination } from '@/components/ui/Pagination';
import { api, type BusinessCard, type Paged } from '@/lib/api';
import { useAuth } from '@/lib/auth';

/**
 * The user's own digital business cards. Rendered both in the standalone
 * `/dashboard/business-cards` route and inline inside the modular business
 * panel (`/dashboard/business/cards`), so it stays one source of truth.
 */
export function MyBusinessCardsPanel({
  nextPath = '/dashboard/business/cards',
}: {
  nextPath?: string;
}) {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const [businessCards, setBusinessCards] = useState<BusinessCard[]>([]);
  const [meta, setMeta] = useState<Paged<BusinessCard>['meta'] | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Paged<BusinessCard>>(`/business-cards/mine?page=${page}`);
      setBusinessCards(data.items);
      setMeta(data.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }
    void load();
  }, [hydrated, token, router, load, nextPath]);

  // The header workspace switcher only changes the id sent with each request;
  // reload so the table never mixes two businesses. Needed on the standalone
  // `/dashboard/cards` route too, which is outside the business-panel layout.
  useEffect(() => {
    function onWorkspaceChanged() {
      setPage(1);
      void load();
    }
    window.addEventListener('alooshomal:workspace-changed', onWorkspaceChanged);
    return () =>
      window.removeEventListener(
        'alooshomal:workspace-changed',
        onWorkspaceChanged,
      );
  }, [load]);

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
        <>
        <MyItemsTable
          kind="business-cards"
          items={businessCards}
          loading={loading}
          deletingId={deletingId}
          onRemove={remove}
        />
        {meta ? <Pagination meta={meta} onPage={setPage} /> : null}
        </>
      )}
    </div>
  );
}
