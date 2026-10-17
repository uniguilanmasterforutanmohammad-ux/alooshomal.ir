import Link from 'next/link';

import { PUBLIC_NAV } from '@/lib/nav';
import { APP_VERSION } from '@/lib/version';

/**
 * Two-column public footer. The right column repeats the header's public links
 * as a stacked list (in a smaller, footer-standard size); the left column keeps
 * only the copyright line and the app version.
 */
export function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--indeed-border)] bg-white py-8">
      <div className="container-page grid grid-cols-2 items-start gap-6">
        <div className="flex flex-col gap-1 text-xs text-muted">
          <p>
            © {new Date().getFullYear()} آلوشمال
            <span dir="ltr" className="ms-2 font-bold">
              {APP_VERSION}
            </span>
          </p>
          <p>بیولینک و کارت ویزیت دیجیتال</p>
        </div>

        <nav aria-label="پیوندهای فوتر" className="flex flex-col gap-1.5 text-xs">
          {PUBLIC_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-muted hover:text-brand">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
