import Link from 'next/link';
import { ArrowUpLeft } from 'lucide-react';
import { PUBLIC_NAV } from '@/lib/nav';
import { APP_VERSION } from '@/lib/version';

const LEGAL_LINKS = [
  { href: '/privacy', label: 'حریم خصوصی' },
  { href: '/terms', label: 'قوانین و مقررات' },
  { href: '/contact', label: 'ارتباط با ما' },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer relative mt-16 overflow-hidden bg-brand text-white sm:mt-24">
      {/* لایه گرادیان و نور ملایم برای عمق بصری */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[32rem] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

      <div className="container-page relative z-10 py-14 lg:py-16">
        {/* بخش بالایی: معرفی و دکمه اقدام */}
        <div className="flex flex-col gap-8 border-b border-white/15 pb-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-md space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-brand text-lg font-extrabold shadow-lg shadow-black/20">
                ش
              </span>
              <span className="text-xl font-extrabold tracking-tight">شمالی کارت</span>
            </div>
            <p className="text-sm leading-7 text-white/80">
              پلتفرم هوشمند کارت ویزیت دیجیتال و صفحات لینک‌بیو برای کسب‌وکارها و افراد خلاق.
            </p>
          </div>

          <Link
            href="/biolinks"
            prefetch={false}
            className="group inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            ساخت بیولینک رایگان
            <ArrowUpLeft className="size-4 transition group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
          </Link>
        </div>

        {/* لینک‌ها */}
        <div className="grid grid-cols-2 gap-8 py-10 md:grid-cols-3">
          <nav aria-label="دسترسی سریع">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/60">دسترسی سریع</h3>
            <ul className="space-y-2.5">
              {PUBLIC_NAV.map((item) => (
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
          </nav>

          <nav aria-label="پشتیبانی و قوانین">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/60">پشتیبانی و قوانین</h3>
            <ul className="space-y-2.5">
              {LEGAL_LINKS.map((item) => (
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
          </nav>
        </div>

        {/* کپی‌رایت */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/15 pt-6 text-xs text-white/70 sm:flex-row">
          <p>© {currentYear} شمالی کارت. تمامی حقوق محفوظ است.</p>
          <span
            dir="ltr"
            className="rounded-full border border-white/20 bg-white/10 px-3 py-1 font-medium text-white/80"
          >
            {APP_VERSION}
          </span>
        </div>
      </div>
    </footer>
  );
}
