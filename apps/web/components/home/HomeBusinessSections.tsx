import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, ChevronLeft, MapPin, Phone } from 'lucide-react';

import type { HomeBusinessCard } from '@/lib/home-server';

function accent(item: HomeBusinessCard): string {
  return item.primaryColor || '#0e187b';
}

function imageUrl(item: HomeBusinessCard): string | null {
  return item.logoUrl || item.avatarUrl;
}

function subline(item: HomeBusinessCard): string {
  return [item.jobTitle, item.company].filter(Boolean).join(' · ');
}

function place(item: HomeBusinessCard): string {
  return [item.city?.name, item.business?.name].filter(Boolean).join(' · ');
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
        <h2 className="text-base font-bold leading-8 text-[var(--footer-ink)]">
          {title}
        </h2>
        <p className="text-xs leading-5 text-[var(--footer-faint)]">{description}</p>
      </div>
      <Link
        href={href}
        prefetch={false}
        className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--footer-brand-light)] transition hover:text-[var(--footer-brand)]"
      >
        {moreLabel}
        <ChevronLeft className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}

function SuggestionCard({ item }: { item: HomeBusinessCard }) {
  const image = imageUrl(item);
  const color = accent(item);
  const meta = place(item);

  return (
    <Link
      href={`/business-cards/${item.slug}`}
      prefetch={false}
      className="group flex flex-col overflow-hidden rounded-xl border border-[var(--footer-border)] bg-[var(--footer-tile)] transition hover:border-[var(--footer-brand-light)] hover:shadow-[0_6px_18px_rgba(16,24,65,0.08)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--footer-bg)]">
        <span
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        {image ? (
          <Image
            src={image}
            alt={item.fullName}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-contain p-6 transition duration-300 group-hover:scale-105"
          />
        ) : (
          <span
            className="flex size-full items-center justify-center text-3xl font-black"
            style={{ color }}
          >
            {item.fullName.trim().slice(0, 1)}
          </span>
        )}
        {item.ownerVerified ? (
          <span className="absolute left-2 top-2 flex size-6 items-center justify-center rounded-full bg-[var(--footer-tile)] text-[var(--footer-brand-light)] shadow-sm">
            <BadgeCheck className="size-4" aria-hidden />
          </span>
        ) : null}
        <span className="absolute bottom-2 right-2 rounded-full bg-[var(--footer-tile)] px-2 py-0.5 text-[10px] font-bold text-[var(--footer-ink)] shadow-sm">
          کارت ویزیت
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-1 text-sm font-bold text-[var(--footer-ink)] transition group-hover:text-[var(--footer-brand)]">
          {item.fullName}
        </h3>
        <p className="line-clamp-1 text-[11px] text-[var(--footer-faint)]">
          {subline(item) || meta || 'کارت ویزیت دیجیتال'}
        </p>
        <p className="mt-auto flex items-center gap-1 text-[11px] leading-5 text-[var(--footer-faint)]">
          <MapPin className="size-3 shrink-0" aria-hidden />
          <span className="line-clamp-1">{meta || 'شمالی کارت'}</span>
        </p>
      </div>
    </Link>
  );
}

function LatestCard({ item }: { item: HomeBusinessCard }) {
  const image = imageUrl(item);
  const color = accent(item);
  const meta = place(item);
  const phone = item.mobile || item.phone;

  return (
    <Link
      href={`/business-cards/${item.slug}`}
      prefetch={false}
      className="group flex gap-3 rounded-xl border border-[var(--footer-border)] bg-[var(--footer-tile)] p-3 transition hover:border-[var(--footer-brand-light)] hover:shadow-[0_4px_14px_rgba(16,24,65,0.07)]"
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-[var(--footer-bg)] sm:h-28 sm:w-32">
        {image ? (
          <Image
            src={image}
            alt={item.fullName}
            fill
            unoptimized
            sizes="128px"
            className="object-contain p-3 transition duration-300 group-hover:scale-105"
          />
        ) : (
          <span
            className="flex size-full items-center justify-center text-2xl font-black"
            style={{ color }}
          >
            {item.fullName.trim().slice(0, 1)}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-bold text-[var(--footer-ink)] transition group-hover:text-[var(--footer-brand)]">
            {item.fullName}
          </h3>
          {item.ownerVerified ? (
            <BadgeCheck
              className="mt-0.5 size-4 shrink-0 text-[var(--footer-brand-light)]"
              aria-hidden
            />
          ) : null}
        </div>
        <p className="line-clamp-1 text-[11px] text-[var(--footer-faint)]">
          {subline(item) || 'کارت ویزیت دیجیتال'}
        </p>
        <p className="line-clamp-1 flex items-center gap-1 text-[11px] leading-5 text-[var(--footer-faint)]">
          <MapPin className="size-3 shrink-0" aria-hidden />
          {meta || 'شمالی کارت'}
        </p>
        {phone ? (
          <p className="mt-auto flex items-center gap-1 text-[11px] leading-5 text-[var(--footer-faint)]">
            <Phone className="size-3 shrink-0" aria-hidden />
            <span dir="ltr">{phone}</span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}

/**
 * Two home-page rails in the same light palette as the site footer:
 * «پیشنهاد شمالی کارت» (verified cards lead) and «کسب‌وکارهای تازه»
 * (newest publications). Both render as real links on the server so the cards
 * are indexable and visible without waiting for a client fetch.
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
    <div className="container-page mt-6 flex flex-col gap-6 pb-2">
      {suggested.length > 0 ? (
        <section className="footer-palette rounded-xl border border-[var(--footer-border)] bg-[var(--footer-bg)] p-4 sm:p-5">
          <SectionHeader
            title="پیشنهاد شمالی کارت"
            description="کسب‌وکارهای منتخب برای شروع"
            href="/business-cards"
            moreLabel="مشاهده همه"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {suggested.map((item) => (
              <SuggestionCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      {latest.length > 0 ? (
        <section className="footer-palette rounded-xl border border-[var(--footer-border)] bg-[var(--footer-bg)] p-4 sm:p-5">
          <SectionHeader
            title="کسب و کارهای تازه"
            description="تازه‌ترین پروفایل‌ها در شمالی کارت"
            href="/business-cards?sort=recent"
            moreLabel="همه کسب‌وکارها"
          />
          <div className="grid gap-2 lg:grid-cols-2">
            {latest.map((item) => (
              <LatestCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
