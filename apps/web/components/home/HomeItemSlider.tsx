'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
 * Liquid-glass carousel for the home page («آخرین کارت‌های ویزیت» /
 * «آخرین بیولینک‌ها»). One «one-per-view» card with a rotating conic-gradient
 * neon border around a frosted white surface, arrow buttons on both sides and
 * clickable dots.
 *
 * Interaction matches the reference design:
 *  - touch swipe (native horizontal pan) moves one card
 *  - mouse drag moves one card and swallows the trailing click
 *  - arrows wrap around the list; dots jump to a card
 * Cards are text-only (initials avatar, name, role, company, city and a
 * «مشاهده کارت» pill) so they stay fast and readable.
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

  useEffect(() => {
    // Keep the index valid if the fetched list shrinks.
    setIndex((current) => (count === 0 ? 0 : Math.min(current, count - 1)));
  }, [count]);

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
    go(dx > 0 ? index + 1 : index - 1);
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    // Never capture pointer events that start on a control: pointer capture
    // retargets the trailing click to the shell, which would swallow the
    // arrows/dots/card-link. Only a drag started on the card body is tracked.
    if ((event.target as Element).closest('button, a')) return;
    drag.current = { active: true, x: event.clientX, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    drag.current.active = false;
    const dx = event.clientX - drag.current.x;
    if (Math.abs(dx) > 40) {
      drag.current.moved = true;
      go(dx > 0 ? index + 1 : index - 1);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
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
        className="liquid-shell select-none"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClickCapture={onClickCapture}
      >
        <button
          type="button"
          onClick={() => go(index - 1)}
          className="liquid-arrow liquid-arrow-prev"
          aria-label="قبلی"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          className="liquid-arrow liquid-arrow-next"
          aria-label="بعدی"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>

        <div className="liquid-viewport">
          <div
            className="liquid-track"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {items.map((item) => {
              const initials = (item.fullName || '?').trim().slice(0, 1);
              const role = item.jobTitle || item.business?.name || '';
              return (
                <div key={item.id} className="liquid-slide">
                  <div className="liquid-card">
                    <div className="liquid-inner">
                      <div className="liquid-avatar" aria-hidden>
                        {initials}
                      </div>
                      <div className="liquid-name">{item.fullName}</div>
                      {role ? <div className="liquid-role">{role}</div> : null}
                      {item.company ? (
                        <div className="liquid-co">{item.company}</div>
                      ) : null}
                      <ul className="liquid-info">
                        {item.business?.name ? (
                          <li>{item.business.name}</li>
                        ) : null}
                        {item.city?.name ? <li>{item.city.name}</li> : null}
                        <li dir="ltr">alooshomal.ir/{kind}/{item.slug}</li>
                      </ul>
                      <Link
                        href={`/${kind}/${item.slug}`}
                        prefetch={false}
                        className="liquid-save"
                      >
                        مشاهده کارت
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="liquid-dots">
          {items.map((item, dotIndex) => (
            <button
              key={item.id}
              type="button"
              onClick={() => go(dotIndex)}
              className="liquid-dot"
              aria-current={dotIndex === index}
              aria-label={`کارت ${dotIndex + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
