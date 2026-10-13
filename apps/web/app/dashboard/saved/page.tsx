'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Bookmark, IdCard } from 'lucide-react';

import { SaveButton } from '@/components/ui/SaveButton';
import { Pagination } from '@/components/ui/Pagination';
import { api, type Paged, type SavedItem } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface SavedPayload {
  biolinks: SavedItem[];
  businessCards: SavedItem[];
}

export default function SavedPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const [data, setData] = useState<SavedPayload>({ biolinks: [], businessCards: [] });
  const [biolinkMeta, setBiolinkMeta] = useState<Paged<SavedItem>['meta'] | null>(null);
  const [cardMeta, setCardMeta] = useState<Paged<SavedItem>['meta'] | null>(null);
  const [biolinkPage, setBiolinkPage] = useState(1);
  const [cardPage, setCardPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [biolinks, businessCards] = await Promise.all([
        api.get<Paged<SavedItem>>(`/biolinks/saved/mine?page=${biolinkPage}`),
        api.get<Paged<SavedItem>>(`/business-cards/saved/mine?page=${cardPage}`),
      ]);
      setData({ biolinks: biolinks.items, businessCards: businessCards.items });
      setBiolinkMeta(biolinks.meta);
      setCardMeta(businessCards.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, [biolinkPage, cardPage]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    void load();
  }, [hydrated, token, router, load]);

  const total =
    (biolinkMeta?.total ?? data.biolinks.length) +
    (cardMeta?.total ?? data.businessCards.length);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold text-ink">ذخیره‌شده‌های من</h2>
        <p className="text-sm text-muted">
          بیولینک‌ها و کارت‌های ویزیتی که ذخیره کرده‌اید اینجا نمایش داده می‌شوند.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-muted">در حال بارگذاری...</p>
      ) : total === 0 ? (
        <div className="indeed-panel p-10 text-center">
          <Bookmark className="mx-auto size-10 text-brand-light" aria-hidden />
          <p className="mt-3 text-lg font-bold text-ink">هنوز چیزی ذخیره نکرده‌اید</p>
          <p className="mt-2 text-sm text-muted">
            در دایرکتوری‌ها روی دکمه «ذخیره» بزنید تا اینجا نمایش داده شوند.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link href="/biolinks" className="indeed-btn indeed-btn-secondary py-2 text-sm">
              دایرکتوری بیولینک
            </Link>
            <Link
              href="/business-cards"
              className="indeed-btn indeed-btn-secondary py-2 text-sm"
            >
              دایرکتوری کارت ویزیت
            </Link>
          </div>
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <IdCard className="size-4 text-brand" aria-hidden />
              بیولینک‌ها
            </h3>
            {data.biolinks.length ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.biolinks.map((item) => (
                  <SavedCard
                    key={item.id}
                    item={item}
                    kind="biolinks"
                    href={`/biolinks/${item.slug}`}
                    onRemoved={() =>
                      setData((prev) => ({
                        ...prev,
                        biolinks: prev.biolinks.filter((entry) => entry.id !== item.id),
                      }))
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="indeed-panel p-4 text-sm text-muted">
                بیولینکی ذخیره نشده است.
              </p>
            )}
            {biolinkMeta ? (
              <Pagination meta={biolinkMeta} onPage={setBiolinkPage} />
            ) : null}
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <BadgeCheck className="size-4 text-brand" aria-hidden />
              کارت‌های ویزیت
            </h3>
            {data.businessCards.length ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.businessCards.map((item) => (
                  <SavedCard
                    key={item.id}
                    item={item}
                    kind="business-cards"
                    href={`/business-cards/${item.slug}`}
                    onRemoved={() =>
                      setData((prev) => ({
                        ...prev,
                        businessCards: prev.businessCards.filter(
                          (entry) => entry.id !== item.id,
                        ),
                      }))
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="indeed-panel p-4 text-sm text-muted">
                کارت ویزیتی ذخیره نشده است.
              </p>
            )}
            {cardMeta ? <Pagination meta={cardMeta} onPage={setCardPage} /> : null}
          </section>
        </>
      )}
    </div>
  );
}

function SavedCard({
  item,
  kind,
  href,
  onRemoved,
}: {
  item: SavedItem;
  kind: 'biolinks' | 'business-cards';
  href: string;
  onRemoved: () => void;
}) {
  return (
    <div className="indeed-panel flex flex-col p-5">
      <h4 className="truncate text-lg font-extrabold text-ink">{item.fullName}</h4>
      <p className="truncate text-sm text-muted">{item.jobTitle ?? item.company ?? '—'}</p>

      <div className="mt-4 flex items-center gap-2">
        <Link href={href} className="indeed-btn indeed-btn-secondary flex-1 py-2 text-sm">
          مشاهده
        </Link>
        <SaveButton
          kind={kind}
          slug={item.slug}
          initialSaved
          onToggled={(saved) => {
            if (!saved) onRemoved();
          }}
        />
      </div>
    </div>
  );
}
