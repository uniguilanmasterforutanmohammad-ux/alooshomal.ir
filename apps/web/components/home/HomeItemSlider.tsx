'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { spectrumColorAt } from '@/lib/card-spectrum';

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
 * Home-page carousel for «آخرین کارت‌های ویزیت» / «آخرین بیولینک‌ها».
 *
 * Each slide is the landscape business-card design from the reference file
 * (`spectrum-v8.html`): a coloured front face (business name, manager, contact
 * rows) and a back face (logo lockup), framed by an inner hairline border and a
 * faint scan-line texture. The colour of every card is picked from the 14-entry
 * spectrum palette deterministically by `spectrumColorAt`, so it looks shuffled
 * without causing a server/client hydration mismatch.
 *
 * Interaction matches the previous carousel:
 *  - touch swipe (native horizontal pan) moves one card
 *  - mouse drag moves one card and swallows the trailing click
 *  - arrows wrap around the list; dots jump to a card
 *  - tapping a card opens its public page
 */
export function HomeItemSlider({ kind, items, moreHref }: Props) {
  const [index, setIndex] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const drag = useRef({ active: false, x: 0, moved: false });
  // After a touch swipe the browser still fires a click on whatever was under
  // the finger; `suppressClickUntil` swallows that click so swiping never
  // navigates into the card.
  const suppressClickUntil = useRef(0);

  const count = items.length;

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  const goBy = useCallback(
    (delta: number) => {
      setIndex((current) => {
        if (count === 0) return 0;
        return (((current + delta) % count) + count) % count;
      });
    },
    [count],
  );

  const goByRef = useRef(goBy);
  goByRef.current = goBy;

  useEffect(() => {
    // Keep the index valid if the fetched list shrinks.
    setIndex((current) => (count === 0 ? 0 : Math.min(current, count - 1)));
  }, [count]);

  // Mouse drag: tracked on the window instead of with pointer capture, so a
  // plain click still reaches the card link while a drag moves the carousel.
  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      if (!drag.current.active) return;
      if (Math.abs(event.clientX - drag.current.x) > 40) {
        drag.current.moved = true;
      }
    }

    function onPointerUp(event: PointerEvent) {
      if (!drag.current.active) return;
      drag.current.active = false;
      const dx = event.clientX - drag.current.x;
      if (Math.abs(dx) > 40) {
        drag.current.moved = true;
        // RTL: dragging right moves to the next card.
        goByRef.current(dx > 0 ? 1 : -1);
      }
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  if (count === 0) return null;

  function onTouchStart(event: React.TouchEvent) {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(event: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    // Ignore vertical page scrolls and tiny taps.
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    suppressClickUntil.current = Date.now() + 500;
    // RTL: swiping right moves to the next card.
    goBy(dx > 0 ? 1 : -1);
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    // Never start a drag on a control; a drag there would swallow its click.
    if ((event.target as Element).closest('button')) return;
    drag.current = { active: true, x: event.clientX, moved: false };
  }

  function onClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (!drag.current.moved && Date.now() > suppressClickUntil.current) return;
    drag.current.moved = false;
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <section className="container-page mt-10" dir="rtl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold text-ink sm:text-xl">
          {kind === 'business-cards' ? 'آخرین کارت‌های ویزیت' : 'آخرین بیولینک‌ها'}
        </h2>
        <Link
          href={moreHref}
          className="text-sm font-bold text-brand hover:underline"
          prefetch={false}
        >
          مشاهده همه
        </Link>
      </div>

      <div
        className="spectrum-shell select-none"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
      >
        <button
          type="button"
          onClick={() => goBy(-1)}
          className="spectrum-arrow spectrum-arrow-prev"
          aria-label="قبلی"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => goBy(1)}
          className="spectrum-arrow spectrum-arrow-next"
          aria-label="بعدی"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>

        <div className="spectrum-viewport">
          <div
            className="spectrum-track"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {items.map((item, itemIndex) => {
              const color = spectrumColorAt(kind, itemIndex);
              // The card headline is the brand: the company name when the owner
              // set one, otherwise the business category (or the role as a last
              // resort) — mirroring the reference card's business-name line.
              const title = item.company || item.business?.name || item.jobTitle || '';
              const cityName = item.city?.name ?? '';
              const phone = item.mobile || item.phone || '';
              return (
                <div key={item.id} className="spectrum-slide">
                  <Link
                    href={`/${kind}/${item.slug}`}
                    prefetch={false}
                    className="spectrum-pair"
                    style={{ ['--card-bg' as string]: color.bg, ['--card-fg' as string]: color.fg }}
                    aria-label={`مشاهده ${item.fullName}`}
                  >
                    {/* رو */}
                    <div className="spectrum-face spectrum-front">
                      <span className="spectrum-lbl">رو</span>
                      {title ? <p className="spectrum-title">{title}</p> : null}
                      <p className="spectrum-manager">{item.fullName}</p>
                      <div className="spectrum-rows">
                        {item.business?.name && item.business.name !== title ? (
                          <div>
                            <b>کسب و کار:</b>
                            {item.business.name}
                          </div>
                        ) : null}
                        {cityName ? (
                          <div>
                            <b>شهر:</b>
                            {cityName}
                          </div>
                        ) : null}
                        {phone ? (
                          <div>
                            <b>تلفن همراه:</b>
                            <span dir="ltr">{phone}</span>
                          </div>
                        ) : null}
                        {item.address ? (
                          <div>
                            <b>آدرس:</b>
                            {item.address}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* پشت */}
                    <div className="spectrum-face spectrum-back">
                      <span className="spectrum-lbl">پشت</span>
                      <div className="spectrum-logo">
                        {title ? <b>{title}</b> : null}
                        <span className="spectrum-mg">
                          به مدیریت {item.fullName}
                        </span>
                        <small>
                          {[item.jobTitle || item.business?.name, cityName]
                            .filter(Boolean)
                            .join(' · ')}
                        </small>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        <div className="spectrum-dots">
          {items.map((item, dotIndex) => (
            <button
              key={item.id}
              type="button"
              onClick={() => go(dotIndex)}
              className="spectrum-dot"
              aria-current={dotIndex === index}
              aria-label={`کارت ${dotIndex + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
