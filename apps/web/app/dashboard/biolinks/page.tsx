'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';

import { BiolinkStatusBadge } from '@/components/biolink/BiolinkStatusBadge';
import { CardStatsBar } from '@/components/dashboard/CardStatsBar';
import { Pagination } from '@/components/ui/Pagination';
import { api, type Biolink, type Paged } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function MyBiolinksPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const [biolinks, setBiolinks] = useState<Biolink[]>([]);
  const [meta, setMeta] = useState<Paged<Biolink>['meta'] | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Paged<Biolink>>(`/biolinks/mine?page=${page}`);
      setBiolinks(data.items);
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
      router.replace('/login');
      return;
    }
    void load();
  }, [hydrated, token, router, load]);

  async function remove(id: string, name: string) {
    if (!window.confirm(`آیا از حذف بیولینک «${name}» مطمئن هستید؟ این کار بازگشت‌پذیر نیست.`)) {
      return;
    }
    setDeletingId(id);
    setError(null);
    try {
      await api.delete(`/biolinks/${id}`);
      setBiolinks((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف بیولینک ناموفق بود');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-ink">بیولینک‌های من</h2>
          <p className="text-sm text-muted">مدیریت و ویرایش بیولینک‌های ویزیت دیجیتال</p>
        </div>
        <Link href="/dashboard/biolinks/new" className="indeed-btn indeed-btn-primary">
          <Plus className="size-4" aria-hidden />
          بیولینک جدید
        </Link>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-muted">در حال بارگذاری...</p>
      ) : biolinks.length === 0 ? (
        <div className="indeed-panel p-10 text-center">
          <p className="text-lg font-bold text-ink">هنوز بیولینکی نساخته‌اید</p>
          <p className="mt-2 text-sm text-muted">
            اولین بیولینک دیجیتال خود را بسازید و برای تأیید ارسال کنید.
          </p>
          <Link href="/dashboard/biolinks/new" className="indeed-btn indeed-btn-primary mt-6">
            <Plus className="size-4" aria-hidden />
            ساخت بیولینک
          </Link>
        </div>
      ) : (
        <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {biolinks.map((biolink) => (
            <div key={biolink.id} className="indeed-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-extrabold text-ink">{biolink.fullName}</h3>
                  <p className="text-sm text-muted">{biolink.jobTitle ?? '—'}</p>
                </div>
                <BiolinkStatusBadge status={biolink.status} />
              </div>

              {biolink.rejectionReason ? (
                <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                  دلیل رد: {biolink.rejectionReason}
                </p>
              ) : null}

              <CardStatsBar
                kind="biolinks"
                targetId={biolink.id}
                isPublished={biolink.isPublished}
                likeCount={biolink.likeCount}
                saveCount={biolink.saveCount}
                views={biolink.views}
                rank={biolink.rank}
                boostStatus={biolink.boostStatus}
              />

              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={`/dashboard/biolinks/${biolink.id}/edit`}
                  className="indeed-btn indeed-btn-primary flex-1 py-2 text-sm"
                >
                  ویرایش
                </Link>
                {biolink.isPublished ? (
                  <Link
                    href={`/biolinks/${biolink.slug}`}
                    className="indeed-btn indeed-btn-secondary flex-1 py-2 text-sm"
                  >
                    مشاهده
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => remove(biolink.id, biolink.fullName)}
                  disabled={deletingId === biolink.id}
                  aria-label="حذف بیولینک"
                  className="indeed-btn flex items-center justify-center border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>
        {meta ? <Pagination meta={meta} onPage={setPage} /> : null}
        </>
      )}
    </div>
  );
}
