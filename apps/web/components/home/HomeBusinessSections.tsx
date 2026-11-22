import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronLeft,
  MapPin,
  Megaphone,
  Phone,
  Star,
} from 'lucide-react';

import { ReportBusinessCardButton } from '@/components/businesscard/ReportBusinessCardButton';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import type { HomeBusinessCard } from '@/lib/home-server';
import { cn } from '@/lib/utils';

function ratingText(item: HomeBusinessCard): string {
  return Math.max(0, Math.min(5, Number(item.ratingAvg) || 0)).toLocaleString(
    'fa-IR',
    { minimumFractionDigits: 1, maximumFractionDigits: 1 },
  );
}

function reviewCount(item: HomeBusinessCard): string {
  return Math.max(0, Number(item.ratingCount) || 0).toLocaleString('fa-IR');
}

function phoneNumber(item: HomeBusinessCard): string | null {
  return (
    item.phone?.trim() ||
    item.mobile?.trim() ||
    item.otherPhones?.find((entry) => entry.trim())?.trim() ||
    null
  );
}

function telHref(number: string): string {
  return `tel:${number.replace(/[^\d+]/g, '')}`;
}

function description(item: HomeBusinessCard): string {
  return (
    item.bio?.trim() ||
    [item.jobTitle, item.company].filter(Boolean).join(' · ') ||
    item.tags?.slice(0, 3).join(' · ') ||
    'کارت ویزیت دیجیتال شمالی کارت'
  );
}

function addressLine(item: HomeBusinessCard): string {
  return (
    item.address?.trim() ||
    [item.city?.name, item.business?.name].filter(Boolean).join(' · ') ||
    'شمالی کارت'
  );
}

function galleryImages(item: HomeBusinessCard): string[] {
  const list = (item.gallery ?? []).filter(Boolean);
  if (list.length === 0) {
    const fallback = item.logoUrl || item.avatarUrl;
    if (fallback) list.push(fallback);
  }
  return list.slice(0, 5);
}

function SectionHeader({
  title,
  description,
  href,
  moreLabel,
}: {
  title: string;
  description: string;
  href: string;
  moreLabel: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-bold leading-8 text-ink">{title}</h2>
        <p className="text-xs leading-5 text-muted">{description}</p>
      </div>
      <Link
        href={href}
        prefetch={false}
        className="flex shrink-0 items-center gap-1 text-xs font-semibold text-brand transition hover:text-brand-hover"
      >
        {moreLabel}
        <ChevronLeft className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}

/**
 * One home-page business card, modelled on the Behtarino card: campaign/rank
 * marker, verified tick, report action, description, rating, phone, address,
 * a horizontal photo gallery and the call/details actions. Colours come from
 * the active site theme (`--vintage-*` tokens), so light/dark and every skin
 * stay in sync with the rest of the page.
 */
function BusinessCardTile({
  item,
  variant,
  rank,
}: {
  item: HomeBusinessCard;
  variant: 'promoted' | 'ranked';
  rank?: number;
}) {
  const gallery = galleryImages(item);
  const number = phoneNumber(item);
  const hasRating = item.ratingCount > 0 && item.ratingAvg > 0;

  return (
    <article className="mx-auto flex w-full max-w-[28rem] flex-col gap-3 rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] p-3 text-start shadow-sm">
      <header className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            {variant === 'promoted' ? (
              <Megaphone className="size-5 shrink-0 text-brand" aria-hidden />
            ) : (
              <span className="shrink-0 text-[0.938rem] font-semibold leading-8 text-muted">
                {(rank ?? 1).toLocaleString('fa-IR')}.
              </span>
            )}
            <h3 className="min-w-0 text-[0.938rem] font-semibold leading-8 text-ink [overflow-wrap:anywhere]">
              <Link
                href={`/business-cards/${item.slug}`}
                prefetch={false}
                className="transition hover:text-brand hover:underline"
              >
                {item.fullName}
              </Link>
            </h3>
            <VerificationBadge
              identity={item.ownerIdentityVerified ?? item.ownerVerified}
              businessLicense={item.ownerBusinessLicenseVerified}
              placement="bottom"
              className="shrink-0"
            />
          </div>
          <ReportBusinessCardButton
            slug={item.slug}
            title={item.fullName}
            withLabel
            className="shrink-0"
          />
        </div>
        <p className="line-clamp-2 text-[0.688rem] leading-5 text-muted">
          {description(item)}
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          {hasRating ? (
            <>
              <Star
                className="size-5 shrink-0 fill-amber-400 text-amber-500"
                aria-hidden
              />
              <span className="text-xs font-semibold leading-7 text-ink">
                {ratingText(item)}
              </span>
              <span className="text-[0.688rem] leading-6 text-muted">
                ({reviewCount(item)} نفر)
              </span>
            </>
          ) : (
            <>
              <Star
                className="size-5 shrink-0 text-[var(--vintage-border)]"
                aria-hidden
              />
              <span className="text-[0.688rem] leading-6 text-muted">
                بدون امتیاز
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 text-[0.625rem] leading-4 text-muted">
          <Phone className="size-4 shrink-0" aria-hidden />
          {number ? (
            <span dir="ltr">{number}</span>
          ) : (
            <span>بدون شماره تماس</span>
          )}
        </div>
      </div>

      <address className="flex items-start gap-1 text-[0.688rem] leading-5 text-muted not-italic">
        <MapPin className="mt-1 size-4 shrink-0" aria-hidden />
        <span className="line-clamp-2">{addressLine(item)}</span>
      </address>

      {gallery.length > 0 ? (
        <div
          role="group"
          aria-label={`تصاویر ${item.fullName}`}
          className="flex gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {gallery.map((src, index) => (
            <a
              key={`${src}-${index}`}
              href={src}
              target="_blank"
              rel="noreferrer"
              aria-label={`نمایش تصویر ${index + 1} ${item.fullName}`}
              className="relative block size-[116px] shrink-0 overflow-hidden rounded-lg bg-[var(--vintage-paper)]"
            >
              <Image
                src={src}
                alt={`تصویر ${index + 1} ${item.fullName}`}
                width={116}
                height={116}
                unoptimized
                className="size-full object-cover"
              />
            </a>
          ))}
        </div>
      ) : null}

      <footer className="flex flex-wrap gap-2 py-2">
        {number ? (
          <a
            href={telHref(number)}
            className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-3 text-xs font-bold text-white transition hover:bg-brand-hover"
          >
            <Phone className="size-5" aria-hidden />
            تماس
          </a>
        ) : null}
        <Link
          href={`/business-cards/${item.slug}`}
          prefetch={false}
          className={cn(
            'flex h-9 items-center justify-center gap-2 rounded-lg border border-brand px-3 text-xs font-bold text-brand transition hover:bg-brand-light/40',
            number ? 'flex-1' : 'w-full',
          )}
        >
          <ArrowLeft className="size-5" aria-hidden />
          جزئیات بیشتر
        </Link>
      </footer>
    </article>
  );
}

/**
 * Two home-page rails in the active site palette: «پیشنهاد شمالی کارت»
 * (verified/high-rated cards lead) and «کسب‌وکارهای تازه» (newest
 * publications). Both render as real links on the server so the cards are
 * indexable and visible without waiting for a client fetch.
 */
export function HomeBusinessSections({
  suggested,
  latest,
}: {
  suggested: HomeBusinessCard[];
  latest: HomeBusinessCard[];
}) {
  if (suggested.length === 0 && latest.length === 0) return null;

  return (
    <div className="mx-auto mt-6 flex w-full max-w-7xl flex-col gap-6 px-4 pb-2 lg:px-6">
      {suggested.length > 0 ? (
        <section>
          <SectionHeader
            title="پیشنهاد شمالی کارت"
            description="کسب‌وکارهای منتخب برای شروع"
            href="/business-cards"
            moreLabel="مشاهده همه"
          />
          <div className="grid items-start gap-3 sm:grid-cols-2">
            {suggested.map((item) => (
              <BusinessCardTile key={item.id} item={item} variant="promoted" />
            ))}
          </div>
        </section>
      ) : null}

      {latest.length > 0 ? (
        <section>
          <SectionHeader
            title="تازه‌ترین کسب‌وکارها"
            description="پروفایل‌های جدید در شمالی کارت"
            href="/business-cards?sort=recent"
            moreLabel="همه کسب‌وکارها"
          />
          <div className="grid items-start gap-3 sm:grid-cols-2">
            {latest.map((item, index) => (
              <BusinessCardTile
                key={item.id}
                item={item}
                variant="ranked"
                rank={index + 1}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
