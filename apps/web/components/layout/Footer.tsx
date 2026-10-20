import Link from 'next/link';

import { PUBLIC_NAV } from '@/lib/nav';
import { APP_VERSION } from '@/lib/version';

/**
 * Two-column public footer. The right column repeats the header's public links
 * as a stacked list (in a smaller, footer-standard size); the left column keeps
 * only the copyright line and the app version.
 *
 * On phones and tablets the nav column is hidden and only the brand line
 * ("© … شمالی کارت · vX.Y.Z" + the tagline) remains, so the compact footer does
 * not duplicate the bottom navigation bar. The links reappear from `lg` up.
 */
export function Footer() {
  return (
    <footer className="mt-16 border-t border-pink-200 bg-pink-100 py-8">
      <div className="container-page grid grid-cols-2 items-start gap-6">
        <div className="col-span-2 flex flex-col gap-1 text-xs text-pink-900 lg:col-span-1">
          <p>
            © {new Date().getFullYear()} شمالی کارت
            <span dir="ltr" className="ms-2 font-bold">
              {APP_VERSION}
            </span>
          </p>
          <p>شمالی کارت، کارت ویزیت دیجیتال و بیولینک</p>
        </div>

        <nav
          aria-label="پیوندهای فوتر"
          className="hidden flex-col gap-1.5 text-xs lg:flex"
        >
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              // These repeat the header nav on every page; prefetching them all
              // doubles the wasted background RSC traffic (see the speed report).
              prefetch={false}
              // `py-1.5` gives each link a ~44px-tall touch target so the
              // Lighthouse "touch targets" audit passes on phones.
              className="py-1.5 text-pink-800 hover:text-pink-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
