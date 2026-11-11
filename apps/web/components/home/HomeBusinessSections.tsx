import Image from 'next/image';
import Link from 'next/link';
import {
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  MapPin,
  Star,
} from 'lucide-react';

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

function publishedLabel(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('fa-IR', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function ratingValue(item: HomeBusinessCard): number {
  return Math.max(0, Math.min(5, Number(item.ratingAvg) || 0));
}

function ratingText(item: HomeBusinessCard): string {
  return ratingValue(item).toLocaleString('fa-IR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function reviewCount(item: HomeBusinessCard): string {
  return Math.max(0, Number(item.ratingCount) || 0).toLocaleString('fa-IR');
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
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--footer-border)] bg-[var(--footer-tile)] transition hover:border-[var(--footer-brand-light)] hover:shadow-[0_6px_18px_rgba(16,24,65,0.08)]"
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
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-[var(--footer-tile)] px-2 py-0.5 text-[10px] font-bold text-[var(--footer-ink)] shadow-sm">
          {item.ratingCount > 0 ? (
            <>
              <Star className="size-3 fill-amber-400 text-amber-500" aria-hidden />
              {ratingText(item)}
              <span className="font-normal text-[var(--footer-faint)]">
                ({reviewCount(item)})
              </span>
            </>
          ) : (
            <span className="font-normal text-[var(--footer-faint)]">بدون امتیاز</span>
          )}
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
  // The reference uses a photo-like cover; avatars are the closest fit, with
  // the logo as a fallback.
  const image = item.avatarUrl || item.logoUrl;
  const color = accent(item);
  const meta = place(item);
  const address = item.address?.trim() || meta;
  const date = publishedLabel(item.publishedAt);

  return (
    <Link
      href={`/business-cards/${item.slug}`}
      prefetch={false}
      className="group flex gap-3 rounded-2xl border border-[var(--footer-border)] bg-[var(--footer-tile)] p-3 transition hover:border-[var(--footer-brand-light)] hover:shadow-[0_2px_8px_0_rgba(16,24,65,0.06)]"
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[var(--footer-thumb)] sm:h-28 sm:w-32">
        {image ? (
          <Image
            src={image}
            alt={item.fullName}
            fill
            unoptimized
            sizes="128px"
            className="size-full object-cover transition duration-300 group-hover:scale-105"
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
        <div className="flex flex-wrap items-center gap-2">
          {item.ratingCount > 0 ? (
            <span
              className="inline-flex items-center gap-1 text-xs text-[var(--footer-muted)]"
              aria-label={`امتیاز ${ratingText(item)} از ۵ بر اساس ${reviewCount(item)} دیدگاه`}
            >
              <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-500" aria-hidden />
              <span className="font-bold text-[var(--footer-ink)]">{ratingText(item)}</span>
              <span>({reviewCount(item)} نفر)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--footer-faint)]">
              <Star className="size-3.5 shrink-0 text-[var(--footer-border)]" aria-hidden />
              بدون امتیاز
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e5f5ee] px-2 py-0.5 text-[11px] font-semibold leading-5 text-[#439878] dark:bg-[#1d3a31] dark:text-[#8fd4b9]">
            تازه
          </span>
        </div>
        <p className="line-clamp-2 flex items-start gap-1 text-[11px] leading-5 text-[var(--footer-faint)]">
          <MapPin className="mt-1 size-3 shrink-0" aria-hidden />
          {address || 'شمالی کارت'}
        </p>
        <div className="mt-auto flex items-center gap-2 pt-1 text-[10px] text-[var(--footer-faint)]">
          {item.business?.name ? (
            <span className="rounded bg-[var(--footer-chip)] px-1.5 py-0.5">
              {item.business.name}
            </span>
          ) : null}
          {item.city?.name ? (
            <span className="rounded bg-[var(--footer-chip)] px-1.5 py-0.5">
              {item.city.name}
            </span>
          ) : null}
          {date ? (
            <span className="ms-auto flex items-center gap-1 text-[var(--footer-brand-light)]">
              <CalendarDays className="size-3" aria-hidden />
              {date}
            </span>
          ) : null}
        </div>
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
    <div className="mx-auto mt-6 flex w-full max-w-7xl flex-col gap-6 px-4 pb-2 lg:px-6">
      {suggested.length > 0 ? (
        <section className="footer-palette">
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
        <section className="footer-palette">
          <SectionHeader
            title="تازه‌ترین کسب‌وکارها"
            description="پروفایل‌های جدید در شمالی کارت"
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
