'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

/** Sections of the business profile, in the order they appear on the page. */
const SECTIONS = [
  { id: 'about', label: 'درباره' },
  { id: 'gallery', label: 'تصاویر' },
  { id: 'info', label: 'آدرس و تماس' },
  { id: 'hours', label: 'ساعات کاری' },
  { id: 'reviews', label: 'دیدگاه‌ها' },
] as const;

/**
 * Sticky in-page navigation for the public business profile («دسته‌بندی
 * مشاغل»-style anchor tabs). Highlights the section currently in view and
 * smooth-scrolls to the target, with `scroll-margin-top` applied to the
 * sections in CSS so the sticky header never covers their title.
 */
export function BusinessSectionNav() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const targets = SECTIONS.map((section) => document.getElementById(section.id)).filter(
      (element): element is HTMLElement => Boolean(element),
    );
    if (targets.length === 0) return;

    // Track the topmost section that has scrolled into the visible band below
    // the sticky header; a plain `scroll` listener is enough here because the
    // page has few sections and the handler is cheap.
    const pickActive = () => {
      const offset = 140;
      let current = targets[0].id;
      for (const element of targets) {
        if (element.getBoundingClientRect().top - offset <= 0) current = element.id;
      }
      setActive(current);
    };

    const observer = new IntersectionObserver(pickActive, {
      rootMargin: '-140px 0px -55% 0px',
      threshold: [0, 0.25, 0.5, 1],
    });
    targets.forEach((element) => observer.observe(element));
    pickActive();
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="biz-tabs" aria-label="بخش‌های صفحه کسب‌وکار">
      <div className="biz-tabs-inner">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            aria-current={active === section.id ? 'true' : undefined}
            className={cn('biz-tab', active === section.id && 'biz-tab-active')}
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
