import Link from 'next/link';
import { ArrowLeft, Megaphone, MapPin, Phone } from 'lucide-react';

import type { ActiveAd } from '@/lib/api';
import { RecordCard } from '@/components/ui/RecordCard';
import { BusinessCardFace, type BizCardRow } from '@/components/businesscard/BusinessCardFace';

/** Same optional fields the business-card slider uses; the API may omit them. */
type AdItem = ActiveAd & {
  company?: string | null;
  primaryColor?: string | null;
  phone?: string | null;
  mobile?: string | null;
};

function buildRows(ad: AdItem): BizCardRow[] {
  const rows: BizCardRow[] = [];
  const cityName = ad.city?.name ?? '';
  const phone = ad.mobile || ad.phone || '';
  if (cityName) rows.push({ key: 'city', label: 'شهر', value: cityName, Icon: MapPin });
  if (phone) {
    rows.push({ key: 'phone', label: 'تلفن همراه', value: phone, dir: 'ltr', Icon: Phone });
  }
  return rows;
}

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

/**
 * «تبلیغات» — home-page ad slot. Each ad is rendered with the exact same
 * business-card face used on the site, so ads look like the cards themselves.
 * Returns nothing while no ad runs.
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
            className="group block w-full transition duration-300 hover:-translate-y-0.5"
          >
            {ad.href.includes('/biolinks/') ? (
              <RecordCard
                fullName={ad.fullName}
                headline={ad.company || ad.jobTitle || ad.fullName || 'بیولینک'}
                subline={
                  ad.company
                    ? [ad.fullName, ad.jobTitle].filter(Boolean).join(' — ') || null
                    : ad.jobTitle
                      ? ad.fullName
                      : null
                }
                bio={ad.bio}
                cityName={ad.city?.name}
                businessName={ad.business?.name}
                avatarUrl={ad.avatarUrl}
                rows={buildRows(ad)}
                accent={ad.primaryColor}
              />
            ) : (
            <BusinessCardFace
              fullName={ad.fullName}
              jobTitle={ad.jobTitle}
              cityName={ad.city?.name ?? null}
              businessName={ad.company || ad.business?.name || null}
              avatarUrl={ad.avatarUrl}
              rows={buildRows(ad)}
              accent={ad.primaryColor}
              footer={
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-bold text-white">
                  مشاهده
                  <ArrowLeft className="size-3.5" aria-hidden />
                </span>
              }
            />
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
