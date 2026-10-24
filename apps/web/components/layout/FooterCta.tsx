'use client';

import Link from 'next/link';
import { ArrowUpLeft } from 'lucide-react';

import { useFeatures } from '@/lib/features';

/**
 * The footer's «ساخت بیولینک رایگان» call to action. Split into a client
 * component so it obeys the admin's «نمایش» switch: when the biolinks section
 * is stopped (or its creation feature hidden) the button disappears instead of
 * linking into a disabled area.
 */
export function FooterCta() {
  const { isSectionStopped, isFeatureVisible } = useFeatures();
  if (isSectionStopped('/biolinks') || !isFeatureVisible('allowBiolinkCreation')) {
    return null;
  }

  return (
    <Link
      href="/biolinks"
      prefetch={false}
      className="site-footer-cta group inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      ساخت بیولینک رایگان
      <ArrowUpLeft
        className="size-4 transition group-hover:-translate-x-0.5 group-hover:-translate-y-0.5"
        aria-hidden
      />
    </Link>
  );
}
