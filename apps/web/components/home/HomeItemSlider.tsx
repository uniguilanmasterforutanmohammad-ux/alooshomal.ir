'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

export interface HomeSliderItem {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  avatarUrl: string | null;
  logoUrl: string | null;
  city?: { id: string; name: string } | null;
}

interface Props {
  /** API resource segment: `biolinks` or `business-cards`. */
  kind: 'biolinks' | 'business-cards';
  items: HomeSliderItem[];
  /** Href of the «مشاهده همه» link. */
  moreHref: string;
}

/**
 * Responsive horizontal slider of square cards for the home page («آخرین
 * کارت‌های ویزیت» / «آخرین بیولینک‌ها»). One card per screen on phones, two on
 * tablets and up, more on wide desktops. On phones/tablets it is a native
 * swipe scroller; on desktop the arrow buttons appear. Scroll-snap keeps each
 * card lined up whether the visitor swipes or clicks.
 */
export function HomeItemSlider({ kind, items, moreHref }: Props) {
  const scrollerRef = useRef<HTMLUListElement>(null);

  if (items.length === 0) return null;

  function scrollByCards(direction: 1 | -1) {
    const node = scrollerRef.current;
    if (!node) return;
    // One card ≈ the width of the first item plus the gap.
    const first = node.firstElementChild as HTMLElement | null;
    const step = first ? first.offsetWidth + 12 : node.clientWidth * 0.8;
    node.scrollBy({ left: direction * step * 2, behavior: 'smooth' });
  }

  return (
    <section className="container-page mt-10" dir="rtl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold text-ink sm:text-xl">
          {kind === 'business-cards' ? 'آخرین کارت‌های ویزیت' : 'آخرین بیولینک‌ها'}
        </h2>
        <div className="flex items-center gap-2">
          <Link
            href={moreHref}
            className="text-sm font-bold text-brand hover:underline"
            prefetch={false}
          >
            مشاهده همه
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            <button
              type="button"
              onClick={() => scrollByCards(-1)}
              className="flex size-8 items-center justify-center rounded-full border border-[var(--vintage-border)] bg-white text-brand transition hover:border-brand"
              aria-label="قبلی"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => scrollByCards(1)}
              className="flex size-8 items-center justify-center rounded-full border border-[var(--vintage-border)] bg-white text-brand transition hover:border-brand"
              aria-label="بعدی"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <ul
        ref={scrollerRef}
        className="home-slider flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
      >
        {items.map((item) => {
          const initials = (item.fullName || '?').trim().slice(0, 1);
          return (
            <li
              key={item.id}
              className="home-slider-item w-[72%] shrink-0 snap-start sm:w-[45%] md:w-[31%] lg:w-[23%]"
            >
              <Link
                href={`/${kind}/${item.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--vintage-border)] bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="relative flex aspect-square w-full items-center justify-center bg-brand-light/40">
                  {item.avatarUrl ? (
                    <Image
                      src={item.avatarUrl}
                      alt={item.fullName}
                      fill
                      sizes="(max-width: 640px) 72vw, (max-width: 1024px) 31vw, 23vw"
                      className="object-cover transition group-hover:scale-105"
                      unoptimized
                    />
                  ) : item.logoUrl ? (
                    <Image
                      src={item.logoUrl}
                      alt={item.fullName}
                      width={96}
                      height={96}
                      className="size-24 object-contain"
                      unoptimized
                    />
                  ) : (
                    <span className="text-4xl font-extrabold text-brand">{initials}</span>
                  )}
                </div>
                <div className="flex min-h-0 flex-1 flex-col p-3 text-start">
                  <p className="truncate text-sm font-extrabold text-ink">
                    {item.company || item.fullName}
                  </p>
                  {item.company && item.fullName ? (
                    <p className="truncate text-xs text-muted">{item.fullName}</p>
                  ) : null}
                  {item.jobTitle ? (
                    <p className="mt-0.5 truncate text-xs text-muted">{item.jobTitle}</p>
                  ) : null}
                  {item.city ? (
                    <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[11px] text-muted">
                      <MapPin className="size-3" aria-hidden />
                      {item.city.name}
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
