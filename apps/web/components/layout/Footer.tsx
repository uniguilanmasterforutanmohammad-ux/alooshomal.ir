'use client';

import Link from 'next/link';
import {
  BookOpen,
  IdCard,
  LifeBuoy,
  Mail,
  MessageCircleQuestion,
  ScrollText,
} from 'lucide-react';

import { EnamadBadge } from '@/components/layout/EnamadBadge';
import { useFeatures } from '@/lib/features';
import { NOTEBOOK_NAV_HREF } from '@/lib/nav';
import { APP_VERSION } from '@/lib/version';

/** Business-owner destinations (dashboard + the free-start CTA). */
const OWNER_LINKS = [
  { href: '/dashboard', label: 'پنل کاربری' },
  { href: '/dashboard/business-cards', label: 'کارت‌های ویزیت من' },
  { href: '/dashboard/biolinks', label: 'بیولینک‌های من' },
  { href: '/pricing', label: 'اشتراک و تعرفه‌ها' },
];

/** Public pages, in the same order as the header navigation. */
const SITE_LINKS = [
  { href: '/categories', label: 'دسته‌بندی مشاغل' },
  { href: '/business-cards', label: 'کارت‌های ویزیت' },
  { href: '/biolinks', label: 'بیولینک‌ها' },
  { href: NOTEBOOK_NAV_HREF, label: 'دفترچه تلفن' },
  { href: '/feeds', label: 'پست‌ها' },
  { href: '/pulse', label: 'اخبار' },
  { href: '/blog', label: 'بلاگ' },
  { href: '/services', label: 'خدمات' },
];

/** Help/legal shortcuts (support and contact are always reachable). */
const QUICK_LINKS = [
  { href: '/pricing', label: 'تعرفه‌ها' },
  { href: '/guide', label: 'راهنما' },
  { href: '/rules', label: 'قوانین و مقررات' },
  { href: '/contact', label: 'تماس با ما' },
  { href: '/dashboard/support', label: 'پشتیبانی آنلاین' },
  { href: '/dashboard/tickets', label: 'تیکت پشتیبانی' },
  { href: '/dashboard', label: 'پنل کاربری' },
  { href: '/login', label: 'ورود / ثبت‌نام' },
];

/** The icon tiles beside the brand (support channels are always available). */
const SUPPORT_TILES = [
  { href: '/dashboard/support', label: 'پشتیبانی آنلاین', Icon: MessageCircleQuestion },
  { href: '/dashboard/tickets', label: 'تیکت پشتیبانی', Icon: LifeBuoy },
  { href: '/guide', label: 'راهنما', Icon: BookOpen },
  { href: '/rules', label: 'قوانین و مقررات', Icon: ScrollText },
  { href: '/contact', label: 'تماس با ما', Icon: Mail },
];

/** Contact rows in the last column, each with a leading icon. */
const CONTACT_ROWS = [
  { href: '/dashboard/support', label: 'گفتگوی آنلاین با پشتیبانی', Icon: MessageCircleQuestion },
  { href: '/dashboard/tickets', label: 'ثبت تیکت پشتیبانی', Icon: LifeBuoy },
  { href: '/guide', label: 'راهنمای استفاده', Icon: BookOpen },
  { href: '/rules', label: 'قوانین و مقررات', Icon: ScrollText },
];

/**
 * Site footer — mirrors the reference layout: a light panel with a brand row
 * (logo + icon tiles), four columns (owner links, site pages, quick links and
 * contact rows) and a centered copyright line.
 *
 * Links go through `showNav` so an admin-disabled section disappears from the
 * footer too, exactly like the header and the mobile bar. Support/contact
 * destinations are exempt from the feature switches and stay visible.
 */
export function Footer({ showEnamad = false }: { showEnamad?: boolean }) {
  const currentYear = new Date().getFullYear();
  const { showNav } = useFeatures();

  const ownerLinks = OWNER_LINKS.filter((item) => showNav(item.href));
  const siteLinks = SITE_LINKS.filter((item) => showNav(item.href));
  const quickLinks = QUICK_LINKS.filter((item) => showNav(item.href));

  return (
    <footer className="site-footer mt-8 border-t">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-6">
        {/* Brand + icon tiles */}
        <div className="flex flex-col gap-6 border-b border-[var(--footer-border)] pb-6 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" prefetch={false} className="flex items-center gap-3">
            <span className="vintage-avatar flex size-12 shrink-0 items-center justify-center">
              <IdCard className="size-6" aria-hidden />
            </span>
            <span>
              <span className="block text-base font-bold text-[var(--footer-brand)]">
                شمالی کارت
              </span>
              <span className="block text-xs text-[var(--footer-faint)]">
                کارت ویزیت دیجیتال، بیولینک و دفترچه تلفن کسب‌وکارها
              </span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {SUPPORT_TILES.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                prefetch={false}
                aria-label={label}
                title={label}
                className="flex size-9 items-center justify-center rounded-xl bg-[var(--footer-tile)] text-[var(--footer-muted)] shadow-[var(--footer-shadow)] transition hover:text-[var(--footer-brand)]"
              >
                <Icon className="size-[18px]" aria-hidden />
              </Link>
            ))}
          </div>
        </div>

        {/* Link columns */}
        <div className="grid gap-6 py-6 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="mb-3 text-sm font-bold text-[var(--footer-ink)]">
              صاحب کسب‌وکار هستید؟
            </h3>
            <ul className="space-y-2 leading-6">
              {ownerLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    className="text-xs text-[var(--footer-muted)] transition hover:text-[var(--footer-brand)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/login?next=/dashboard/business-cards"
              prefetch={false}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[var(--footer-brand)] px-3 py-2 text-xs font-bold text-[var(--footer-on-brand)]"
            >
              <IdCard className="size-4" aria-hidden />
              ساخت کارت ویزیت
            </Link>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold text-[var(--footer-ink)]">
              صفحه‌های شمالی کارت
            </h3>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-2 leading-6">
              {siteLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    className="text-xs text-[var(--footer-muted)] transition hover:text-[var(--footer-brand)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold text-[var(--footer-ink)]">
              دسترسی سریع
            </h3>
            <ul className="space-y-2 leading-6">
              {quickLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    className="text-xs text-[var(--footer-muted)] transition hover:text-[var(--footer-brand)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold text-[var(--footer-ink)]">
              ارتباط با ما
            </h3>
            <ul className="space-y-2 text-xs leading-6 text-[var(--footer-muted)]">
              {CONTACT_ROWS.map(({ href, label, Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    prefetch={false}
                    className="flex items-center gap-1.5 transition hover:text-[var(--footer-brand)]"
                  >
                    <Icon
                      className="size-3.5 shrink-0 text-[var(--footer-brand-light)]"
                      aria-hidden
                    />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright + version */}
        <div className="border-t border-[var(--footer-border)] pt-4 text-center text-[11px] leading-6 text-[var(--footer-faint)]">
          <p className="flex flex-wrap items-center justify-center gap-2">
            <span>© {currentYear} شمالی کارت — همه‌ی حقوق مادی و معنوی محفوظ است.</span>
            <span
              dir="ltr"
              className="rounded-full border border-[var(--footer-border)] bg-[var(--footer-tile)] px-2 py-0.5 font-medium"
            >
              {APP_VERSION}
            </span>
          </p>
        </div>

        {/* Official e-namad trust seal (home page only). The markup is fixed by
            enamad.ir and must not be edited. */}
        {showEnamad ? (
          <div className="mt-4 flex justify-center">
            <EnamadBadge className="shrink-0" />
          </div>
        ) : null}
      </div>
    </footer>
  );
}
