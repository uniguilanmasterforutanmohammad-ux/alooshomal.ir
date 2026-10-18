'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, MapPin, Store } from 'lucide-react';

export interface HomeSliderItem {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  avatarUrl: string | null;
  logoUrl: string | null;
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
 * Responsive horizontal slider of text-first square cards for the home page
 * («آخرین کارت‌های ویزیت» / «آخرین بیولینک‌ها»). One card per screen on phones,
 * two on tablets and more on wide desktops.
 *
 * Movement works with a real mouse drag as well as a native touch swipe:
 *  - touch/native horizontal scroll is left to the browser
 *  - mouse drag is handled manually (pointer capture) so desktop users can
 *    grab the row and pull it, like a carousel
 *  - arrow buttons remain for keyboard/precise navigation
 * `scroll-snap` keeps each card aligned whichever way it was moved.
 */
export function HomeItemSlider({ kind, items, moreHref }: Props) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const drag = useRef<{
    active: boolean;
    startX: number;
    startScroll: number;
    moved: boolean;
  }>({ active: false, startX: 0, startScroll: 0, moved: false });
  const [dragging, setDragging] = useState(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const syncEdges = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth;
    // Chrome/Firefox use a negative `scrollLeft` range in RTL (0 at the first
    // card, down to -(scrollWidth-clientWidth) at the last), so "previous"
    // means a smaller-than-zero offset here.
    const rtl = getComputedStyle(node).direction === 'rtl';
    setCanPrev(rtl ? node.scrollLeft < -4 : node.scrollLeft > 4);
    setCanNext(
      rtl ? node.scrollLeft > -(max - 4) : node.scrollLeft < max - 4,
    );
  }, []);

  useEffect(() => {
    syncEdges();
    const node = scrollerRef.current;
    if (!node) return;
    const onResize = () => syncEdges();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [syncEdges, items.length]);

  if (items.length === 0) return null;

  function scrollByCards(direction: 1 | -1) {
    const node = scrollerRef.current;
    if (!node) return;
    const first = node.firstElementChild as HTMLElement | null;
    const step = first ? first.offsetWidth + 12 : node.clientWidth * 0.8;
    const rtl = getComputedStyle(node).direction === 'rtl';
    // In RTL "next" advances toward negative scrollLeft.
    node.scrollBy({ left: direction * (rtl ? -1 : 1) * step * 2, behavior: 'smooth' });
  }

  function onPointerDown(event: React.PointerEvent<HTMLUListElement>) {
    // Only intercept a primary mouse drag; touch keeps native scrolling.
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    const node = scrollerRef.current;
    if (!node) return;
    drag.current = {
      active: true,
      startX: event.clientX,
      startScroll: node.scrollLeft,
      moved: false,
    };
    setDragging(true);
    node.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLUListElement>) {
    if (!drag.current.active) return;
    const node = scrollerRef.current;
    if (!node) return;
    const delta = event.clientX - drag.current.startX;
    if (Math.abs(delta) > 4) drag.current.moved = true;
    // Grabbing the strip and pulling it to the right reveals the later cards
    // in RTL (which live at a more negative `scrollLeft`).
    node.scrollLeft = drag.current.startScroll - delta;
  }

  function endDrag(event: React.PointerEvent<HTMLUListElement>) {
    if (!drag.current.active) return;
    drag.current.active = false;
    setDragging(false);
    const node = scrollerRef.current;
    if (node?.hasPointerCapture(event.pointerId)) {
      node.releasePointerCapture(event.pointerId);
    }
    syncEdges();
  }

  function onClickCapture(event: React.MouseEvent<HTMLUListElement>) {
    // Swallow the click that ends a drag so grabbing the row doesn't navigate.
    if (drag.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      drag.current.moved = false;
    }
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
              disabled={!canPrev}
              className="flex size-8 items-center justify-center rounded-full border border-[var(--vintage-border)] bg-white text-brand transition hover:border-brand disabled:opacity-40"
              aria-label="قبلی"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => scrollByCards(1)}
              disabled={!canNext}
              className="flex size-8 items-center justify-center rounded-full border border-[var(--vintage-border)] bg-white text-brand transition hover:border-brand disabled:opacity-40"
              aria-label="بعدی"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <ul
        ref={scrollerRef}
        onScroll={syncEdges}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={onClickCapture}
        className={`home-slider flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 ${
          dragging ? 'cursor-grabbing select-none' : 'cursor-grab md:cursor-grab'
        }`}
      >
        {items.map((item) => {
          const initials = (item.fullName || '?').trim().slice(0, 1);
          const primary = item.company || item.fullName;
          const showSecondaryName = Boolean(item.company && item.fullName);
          return (
            <li
              key={item.id}
              className="home-slider-item w-[72%] shrink-0 snap-start sm:w-[45%] md:w-[31%] lg:w-[23%]"
            >
              <Link
                href={`/${kind}/${item.slug}`}
                draggable={false}
                className="group flex h-full min-h-[13rem] flex-col overflow-hidden rounded-xl border border-[var(--vintage-border)] bg-gradient-to-bl from-white to-[#fbf3e9] p-4 shadow-sm transition hover:border-brand hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-light text-lg font-extrabold text-brand"
                    aria-hidden
                  >
                    {initials}
                  </span>
                  {item.business?.name ? (
                    <span className="inline-flex max-w-[55%] items-center gap-1 truncate rounded-full bg-brand-light/70 px-2 py-0.5 text-[10px] font-bold text-brand">
                      <Store className="size-3 shrink-0" aria-hidden />
                      <span className="truncate">{item.business.name}</span>
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-3 line-clamp-2 text-base font-extrabold leading-6 text-ink">
                  {primary}
                </h3>
                {showSecondaryName ? (
                  <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-muted">
                    {item.fullName}
                  </p>
                ) : null}
                {item.jobTitle ? (
                  <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-[var(--vintage-accent-hover)]">
                    {item.jobTitle}
                  </p>
                ) : null}

                {item.city ? (
                  <span className="mt-auto inline-flex items-center gap-1 pt-3 text-[11px] font-bold text-muted">
                    <MapPin className="size-3" aria-hidden />
                    {item.city.name}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
