import Link from 'next/link';

import { APP_VERSION } from '@/lib/version';

/** Live destinations only: `/privacy`, `/terms` and `/contact` never existed in
 *  this app (the old footer linked to three 404s). */
const FOOTER_LINKS = [
  { href: '/guide', label: 'راهنما' },
  { href: '/rules', label: 'قوانین و مقررات' },
  { href: '/dashboard/tickets', label: 'پشتیبانی' },
];

/**
 * Site footer: one compact row — brand, the support/legal links, the copyright
 * line and the version pill. The public destinations live in the header
 * (desktop) and the bottom bar (phones/tablets), so the footer stays quiet and
 * still keeps «حریم خصوصی» / «قوانین و مقررات» / «ارتباط با ما» reachable.
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer relative mt-4 overflow-hidden bg-brand text-white sm:mt-12">
      {/* لایه گرادیان و نور ملایم برای عمق بصری */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[32rem] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

      <div className="container-page relative z-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 py-2 text-xs text-white/75 sm:py-3 lg:justify-between">
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
    </footer>
  );
}
