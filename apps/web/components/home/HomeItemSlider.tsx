'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, MapPin, Phone } from 'lucide-react';

import { RecordCard, type RecordRow } from '@/components/ui/RecordCard';

export interface HomeSliderItem {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  avatarUrl: string | null;
  logoUrl: string | null;
  phone?: string | null;
  mobile?: string | null;
  address?: string | null;
  city?: { id: string; name: string } | null;
  business?: { id: string; name: string } | null;
}

interface Props {
  /** API resource segment: `biolinks` or `business-cards`. */
  kind: 'biolinks' | 'business-cards';
  items: HomeSliderItem[];
  /** Href of the «مشاهده همه» link. */
  moreHref: string;
}

/**
 * Home-page slider for «آخرین کارت‌های ویزیت» / «آخرین بیولینک‌ها».
 *
 * All six items sit **side by side** in one horizontal, scroll-snap rail: the
 * cards stay next to each other and the rail scrolls (native touch swipe on
 * phones, drag / arrows / dots on desktop) to reveal the rest. Each card is the
 * site's vintage «record» card (the same design as the directory detail panel
 * and the public pages) in its compact variant, tinted with the owner's colour.
 */
export function HomeItemSlider({ kind, items, moreHref }: Props) {
  const railRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [active, setActive] = useState(0);
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });
  // After a touch swipe the browser still fires a click on whatever was under
  // the finger; `suppressClickUntil` swallows that click so swiping never
  // navigates into the card.
  const suppressClickUntil = useRef(0);

  const count = items.length;

  /** Index of the card whose start edge is closest to the rail's start edge. */
  const measureActive = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const railStart = rail.getBoundingClientRect();
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    slideRefs.current.forEach((slide, index) => {
      if (!slide) return;
      const rect = slide.getBoundingClientRect();
      // RTL and LTR both: compare the card's leading edge against the rail's
      // leading edge (the right edge is the start in this RTL layout).
      const distance = Math.abs(rect.right - railStart.right);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    setActive(bestIndex);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    measureActive();
    rail.addEventListener('scroll', measureActive, { passive: true });
    window.addEventListener('resize', measureActive);
    return () => {
      rail.removeEventListener('scroll', measureActive);
      window.removeEventListener('resize', measureActive);
    };
  }, [measureActive, count]);

  const scrollToCard = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, count - 1));
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    slideRefs.current[clamped]?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'start',
    });
  }, [count]);

  // Mouse drag: tracked on the window so a plain click still reaches the card
  // link while a drag pans the rail.
  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      if (!drag.current.active) return;
      const rail = railRef.current;
      if (!rail) return;
      const dx = event.clientX - drag.current.startX;
      if (Math.abs(dx) > 6) drag.current.moved = true;
      rail.scrollLeft = drag.current.startScroll - dx;
    }

    function onPointerUp() {
      drag.current.active = false;
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  if (count === 0) return null;

  // Touch panning is native (`overflow-x: auto` + scroll-snap); the handlers
  // only track whether the finger moved, so the trailing click a swipe leaves
  // behind is swallowed instead of opening a card.
  const touchStartX = useRef<number | null>(null);

  function onTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0].clientX;
  }

  function onTouchMove(event: React.TouchEvent) {
    const startX = touchStartX.current;
    if (startX === null) return;
    if (Math.abs(event.touches[0].clientX - startX) > 6) {
      suppressClickUntil.current = Date.now() + 500;
    }
  }

  function onTouchEnd() {
    touchStartX.current = null;
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    // Never start a drag on a control; a drag there would swallow its click.
    if ((event.target as Element).closest('button')) return;
    const rail = railRef.current;
    drag.current = {
      active: true,
      startX: event.clientX,
      startScroll: rail?.scrollLeft ?? 0,
      moved: false,
    };
  }

  function onClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (!drag.current.moved && Date.now() > suppressClickUntil.current) return;
    drag.current.moved = false;
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <section className="container-page mt-10" dir="rtl">
      <div className="home-section-frame">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold text-ink sm:text-xl">
          {kind === 'business-cards' ? 'آخرین کارت‌های ویزیت' : 'آخرین بیولینک‌ها'}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollToCard(active - 1)}
            className="spectrum-arrow spectrum-arrow-inline"
            aria-label="قبلی"
            disabled={active === 0}
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => scrollToCard(active + 1)}
            className="spectrum-arrow spectrum-arrow-inline"
            aria-label="بعدی"
            disabled={active >= count - 1}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <Link
            href={moreHref}
            className="text-sm font-bold text-brand hover:underline"
            prefetch={false}
          >
            مشاهده همه
          </Link>
        </div>
      </div>

      <div
        className="spectrum-shell select-none"
        ref={railRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
      >
        {items.map((item, itemIndex) => {
          // The card headline is the brand: the company name when the owner set
          // one, otherwise the business category (or the role as a last resort).
          const title = item.company || item.business?.name || item.jobTitle || '';
          const cityName = item.city?.name ?? '';
          const phone = item.mobile || item.phone || '';
          // Only surface a chip when it is not already the card's headline.
          const companyChip = item.company && item.company !== title ? item.company : null;
          const businessChip =
            item.business?.name && item.business.name !== title ? item.business.name : null;
          const rows: RecordRow[] = [];
          if (cityName) {
            rows.push({ key: 'city', label: 'شهر', value: cityName, Icon: MapPin });
          }
          if (phone) {
            rows.push({
              key: 'phone',
              label: 'تلفن همراه',
              value: phone,
              dir: 'ltr',
              Icon: Phone,
            });
          }
          return (
            <div
              key={item.id}
              className="spectrum-slide"
              ref={(node) => {
                slideRefs.current[itemIndex] = node;
              }}
            >
              <Link
                href={`/${kind}/${item.slug}`}
                prefetch={false}
                className="spectrum-pair"
                aria-label={`مشاهده ${item.fullName}`}
              >
                <RecordCard
                  fullName={item.fullName}
                  headline={title || item.fullName}
                  subline={title ? item.fullName : item.jobTitle}
                  companyName={companyChip}
                  cityName={cityName}
                  businessName={businessChip}
                  avatarUrl={item.avatarUrl}
                  rows={rows}
                  compact
                />
              </Link>
            </div>
          );
        })}
      </div>

      <div className="spectrum-dots">
        {items.map((item, dotIndex) => (
          <button
            key={item.id}
            type="button"
            onClick={() => scrollToCard(dotIndex)}
            className="spectrum-dot"
            aria-current={dotIndex === active}
            aria-label={`کارت ${dotIndex + 1}`}
          />
        ))}
      </div>
      </div>
    </section>
  );
}
