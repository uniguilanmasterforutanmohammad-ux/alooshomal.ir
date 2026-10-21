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
 * «تبلیغات» — home-page ad slot in the site theme: cream paper card,
 * brand-colored accents and a soft shadow. Returns nothing while no ad runs.
 */
export async function HomeAdBox() {
  const ads = await getActiveAds();
  if (ads.length === 0) return null;

  return (
    <section className="container-page mt-16" id="ads">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
          <Megaphone className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-xl font-black text-ink">تبلیغات</h2>
          <p className="text-sm text-muted">معرفی کسب‌وکارهای شهر</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {ads.map((ad) => (
          <Link
            key={ad.id}
            href={ad.href}
            className="group relative block w-full overflow-hidden rounded-3xl border border-ink/10 bg-[#fbf6ea] p-6 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.3)] sm:p-8"
          >
            <span aria-hidden className="absolute inset-y-0 start-0 w-1.5 bg-brand" />

            <div className="flex items-center gap-6">
              <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand/10 text-3xl font-black text-brand sm:size-28">
                {ad.avatarUrl ? (
                  <Image
                    src={ad.avatarUrl}
                    alt={ad.fullName}
                    width={128}
                    height={128}
                    className="size-full object-cover"
                    unoptimized
                  />
                ) : (
                  ad.fullName.trim().slice(0, 1)
                )}
              </div>

              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand">
                  <Megaphone className="size-3.5" aria-hidden />
                  تبلیغ ویژه
                </span>
                <h3 className="mt-2 truncate text-2xl font-black text-ink sm:text-3xl">
                  {ad.fullName}
                </h3>
                {ad.jobTitle ? (
                  <p className="mt-1 truncate text-base font-semibold text-muted">
                    {ad.jobTitle}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink/70">
                  {ad.city ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/60 px-3 py-1">
                      <MapPin className="size-4 text-brand" aria-hidden />
                      {ad.city.name}
                    </span>
                  ) : null}
                  {ad.business ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/60 px-3 py-1">
                      <Building2 className="size-4 text-brand" aria-hidden />
                      {ad.business.name}
                    </span>
                  ) : null}
                </div>
              </div>

              <span className="hidden shrink-0 items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition group-hover:opacity-90 sm:flex">
                مشاهده
                <ArrowLeft className="size-4" aria-hidden />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
