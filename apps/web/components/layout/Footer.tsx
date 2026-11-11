import Link from 'next/link';

import { EnamadBadge } from '@/components/layout/EnamadBadge';
import { APP_VERSION } from '@/lib/version';

/** Live destinations only (the old footer linked to `/privacy`/`/terms` 404s). */
const FOOTER_LINKS = [
  { href: '/guide', label: 'راهنما' },
  { href: '/rules', label: 'قوانین و مقررات' },
  { href: '/contact', label: 'تماس با ما' },
  { href: '/dashboard/support', label: 'پشتیبانی آنلاین' },
  { href: '/dashboard/tickets', label: 'تیکت پشتیبانی' },
];

/**
 * Site footer: one compact row — brand, the support/legal links, the copyright
 * line and the version pill. The public destinations live in the header
 * (desktop) and the bottom bar (phones/tablets), so the footer stays quiet and
 * still keeps «حریم خصوصی» / «قوانین و مقررات» / «ارتباط با ما» reachable.
 *
 * The whole footer is desktop-only: phones and tablets rely on the fixed bottom
 * navigation instead, so they render no footer at all (avoids a redundant block
 * under the thumb). The optional `showEnamad` seal lives in its own row and is
 * shown on the home page at desktop widths.
 */
export function Footer({ showEnamad = false }: { showEnamad?: boolean }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="site-footer relative mt-4 hidden overflow-hidden bg-brand text-white sm:mt-12 lg:block"
    >
      {/* لایه گرادیان و نور ملایم برای عمق بصری */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[32rem] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

      <div className="container-page relative z-10 hidden flex-wrap items-center justify-center gap-x-5 gap-y-1 py-2 text-xs text-white/75 sm:py-3 lg:flex lg:justify-between">
        <Link
          href="/"
          prefetch={false}
          className="flex items-center gap-2 text-sm font-extrabold text-white"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-white text-[11px] font-extrabold text-brand shadow shadow-black/20">
            ش
          </span>
          شمالی کارت
        </Link>

        <nav aria-label="پشتیبانی و قوانین">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
            {FOOTER_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  className="transition hover:text-white hover:underline underline-offset-4"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="text-white/70">© {currentYear} شمالی کارت</p>

        <span
          dir="ltr"
          className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 font-medium text-white/80"
        >
          {APP_VERSION}
        </span>
      </div>

      {/* Official e-namad trust seal, shown on the home page (desktop) as the
          verification requires. The markup is fixed by enamad.ir. */}
      {showEnamad ? (
        <div className="container-page relative z-10 flex justify-center py-3">
          <EnamadBadge className="shrink-0" />
        </div>
      ) : null}
    </footer>
  );
}
