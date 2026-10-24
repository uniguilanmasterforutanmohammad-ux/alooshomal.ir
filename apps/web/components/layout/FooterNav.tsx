'use client';

import Link from 'next/link';

import { useFeatures } from '@/lib/features';
import { PUBLIC_NAV } from '@/lib/nav';

/**
 * The footer's «دسترسی سریع» list. Split into a small client component so only
 * this list reacts to the admin's feature-visibility switches; the rest of the
 * footer stays a server component. Hidden nav entries (disabled or not-visible
 * features) simply drop out of the list.
 */
export function FooterNav() {
  const { showNav } = useFeatures();
  const items = PUBLIC_NAV.filter((item) => showNav(item.href));

  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            prefetch={false}
            className="text-sm text-white/85 transition hover:text-white hover:underline underline-offset-4"
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
