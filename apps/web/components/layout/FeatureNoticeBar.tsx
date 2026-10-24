'use client';

import { useEffect, useRef, useState } from 'react';
import { PowerOff } from 'lucide-react';

import { useFeatures } from '@/lib/features';

/**
 * Site-wide «توقف موقت» strip. Whenever the admin turns off the «نمایش» switch
 * of a feature that owns a public area (biolinks, business cards, posts, news,
 * home-page ads, …), a persistent notice sits above the header on every page
 * until the section is turned back on. It is driven by the shared feature
 * payload, so a future section shows up here automatically.
 *
 * It is a sticky strip pinned above the header: the page headers stick right
 * below it (`top: var(--feature-notice-h)`), so the warning stays visible while
 * the site chrome keeps its place. Its measured height is published as the
 * `--feature-notice-h` CSS var on `<html>` so the full-height directory shells
 * can subtract it and keep the page itself from scrolling.
 */
export function FeatureNoticeBar() {
  const { stoppedSections, loaded } = useFeatures();
  // Avoid a hydration flash: only show after the client read has settled.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const ref = useRef<HTMLDivElement | null>(null);
  const visible = mounted && loaded && stoppedSections.length > 0;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const height = visible && ref.current ? ref.current.offsetHeight : 0;
    document.documentElement.style.setProperty('--feature-notice-h', `${height}px`);
    return () => {
      document.documentElement.style.setProperty('--feature-notice-h', '0px');
    };
  }, [visible, stoppedSections.length]);

  if (!visible) return null;
  const names = stoppedSections.map((section) => section.name).join('، ');

  return (
    <div
      ref={ref}
      role="status"
      className="sticky top-0 z-[60] border-b-2 border-dashed border-amber-300 bg-amber-500 px-4 py-2 text-center text-sm font-bold text-white"
    >
      <span className="inline-flex flex-wrap items-center justify-center gap-2">
        <PowerOff className="size-4 shrink-0" aria-hidden />
        <span>
          {stoppedSections.length === 1
            ? `نمایش «${names}» موقتاً توسط مدیر متوقف شده است.`
            : `نمایش بخش‌های «${names}» موقتاً توسط مدیر متوقف شده است.`}
        </span>
      </span>
    </div>
  );
}
