import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Briefcase, MapPin, Megaphone, Phone, Smartphone } from 'lucide-react';

import type { ActiveAd } from '@/lib/api';
import { readableAccent } from '@/lib/card-spectrum';

/** Same optional fields the business-card slider uses; the API may omit them. */
type AdItem = ActiveAd & {
  company?: string | null;
  primaryColor?: string | null;
  phone?: string | null;
  mobile?: string | null;
};

async function getActiveAds(): Promise<AdItem[]> {
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
      data: { items: AdItem[] } | null;
    };
    return payload.data?.items ?? [];
  } catch {
    return [];
  }
}

/** The first letter of the name — the banner falls back to it when no logo/photo. */
function initial(name: string): string {
  return name.trim().charAt(0) || '؟';
}

/**
 * One sponsored banner. Instead of echoing the whole business-card face, the ad
 * is a compact, wide «بنر تبلیغاتی»: the sponsor's mark on the side, the name
 * and a short subtitle, city/business/phone chips and a single clear «مشاهده»
 * call to action. The owner's colour (`readableAccent`) drives the accent so the
 * banner still carries the sponsor's hue. The whole banner is one link.
 */
function AdBanner({ ad }: { ad: AdItem }) {
  const accent = readableAccent(ad.primaryColor);
  const meta = [ad.jobTitle, ad.company].filter(Boolean).join(' · ');
  const place = [ad.city?.name, ad.business?.name].filter(Boolean).join(' · ');
  const mobile = ad.mobile?.trim() || '';
  const landline = ad.phone?.trim() || '';
  const image = ad.avatarUrl || ad.logoUrl || '';
  const teaser = ad.bio?.trim() || '';

  return (
    <Link
      href={ad.href}
      prefetch={false}
      className="ad-banner"
      style={{ ['--ad-accent' as string]: accent }}
      aria-label={`تبلیغ ${ad.fullName} — مشاهده`}
    >
      <span className="ad-banner-flag">تبلیغ</span>

      <span className="ad-banner-media" aria-hidden>
        {image ? (
          <Image
            src={image}
            alt=""
            width={96}
            height={96}
            className="ad-banner-img"
            unoptimized
          />
        ) : (
          <span className="ad-banner-initial">{initial(ad.fullName)}</span>
        )}
      </span>

      <span className="ad-banner-body">
        <span className="ad-banner-name">{ad.fullName}</span>
        {meta ? <span className="ad-banner-meta">{meta}</span> : null}
        {teaser ? <span className="ad-banner-teaser">{teaser}</span> : null}

        <span className="ad-banner-chips">
          {ad.city?.name ? (
            <span className="ad-banner-chip">
              <MapPin aria-hidden />
              {ad.city.name}
            </span>
          ) : null}
          {ad.business?.name ? (
            <span className="ad-banner-chip">
              <Briefcase aria-hidden />
              {ad.business.name}
            </span>
          ) : null}
          {mobile ? (
            <span className="ad-banner-chip" dir="ltr">
              <Smartphone aria-hidden />
              {mobile}
            </span>
          ) : null}
          {!mobile && landline ? (
            <span className="ad-banner-chip" dir="ltr">
              <Phone aria-hidden />
              {landline}
            </span>
          ) : null}
        </span>
      </span>

      <span className="ad-banner-cta">
        مشاهده
        <ArrowLeft className="size-4" aria-hidden />
      </span>
    </Link>
  );
}

/**
 * «تبلیغات» — home-page sponsored banners. Each approved ad is shown as a wide
 * advert banner taken from the sponsor's own card/biolink/feed, with a clear
 * call to action. Returns nothing while no ad runs.
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

      <div className="flex flex-col gap-4">
        {ads.map((ad) => (
          <AdBanner key={ad.id} ad={ad} />
        ))}
      </div>
    </section>
  );
}
