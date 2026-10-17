import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Building2, MapPin, Megaphone } from 'lucide-react';

import type { ActiveAd } from '@/lib/api';

async function getActiveAds(): Promise<ActiveAd[]> {
  const apiUrl =
    process.env.INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:4000/api';
  try {
    const response = await fetch(`${apiUrl}/ads/public/active`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as {
      data: { items: ActiveAd[] } | null;
    };
    return payload.data?.items ?? [];
  } catch {
    return [];
  }
}

/**
 * «تبلیغات» — the home-page ad slot. Shows the ad(s) the admin has approved and
 * that are still inside their display window; each ad links to the advertised
 * business card or biolink. Returns nothing while no ad is running so the page
 * keeps its original layout.
 */
export async function HomeAdBox() {
  const ads = await getActiveAds();
  if (ads.length === 0) return null;

  return (
    <section className="container-page mt-16" id="ads">
      <div className="mb-4 flex items-center gap-3">
        <span className="vintage-avatar flex size-11 items-center justify-center">
          <Megaphone className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-xl font-extrabold text-ink">تبلیغات</h2>
          <p className="text-sm text-muted">معرفی کسب‌وکارهای شهر</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ads.map((ad) => (
          <Link
            key={ad.id}
            href={ad.href}
            className="indeed-panel group flex items-center gap-4 border-s-4 border-s-brand p-4 transition hover:shadow-md"
          >
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-light text-xl font-extrabold text-brand">
              {ad.avatarUrl ? (
                <Image
                  src={ad.avatarUrl}
                  alt={ad.fullName}
                  width={64}
                  height={64}
                  className="size-16 object-cover"
                  unoptimized
                />
              ) : (
                ad.fullName.trim().slice(0, 1)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-700">
                <Megaphone className="size-3" aria-hidden />
                تبلیغ
              </span>
              <h3 className="mt-1 truncate text-base font-extrabold text-ink group-hover:text-brand">
                {ad.fullName}
              </h3>
              {ad.jobTitle ? (
                <p className="truncate text-sm text-muted">{ad.jobTitle}</p>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                {ad.city ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden />
                    {ad.city.name}
                  </span>
                ) : null}
                {ad.business ? (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="size-3.5" aria-hidden />
                    {ad.business.name}
                  </span>
                ) : null}
              </div>
            </div>
            <ArrowLeft
              className="size-5 shrink-0 text-muted transition group-hover:-translate-x-1 group-hover:text-brand"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
