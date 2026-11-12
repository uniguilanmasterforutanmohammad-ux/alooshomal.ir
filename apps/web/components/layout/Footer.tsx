'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  BookOpen,
  IdCard,
  LifeBuoy,
  Mail,
  MessageCircle,
  MessageCircleQuestion,
  Phone,
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

/** Direct contact channels (always available). */
const PHONE_DISPLAY = '۰۹۲۰۷۸۱۸۳۸۹';
const BALE_CHAT_HREF = 'https://ble.ir/09207818389';
const DIRECT_CONTACTS = [
  { href: 'tel:+989207818389', label: PHONE_DISPLAY, Icon: Phone, ltr: true },
  {
    href: 'mailto:support@shomalicard.ir',
    label: 'support@shomalicard.ir',
    Icon: Mail,
    ltr: true,
  },
  { href: BALE_CHAT_HREF, label: 'چت در پیام‌رسان بله', Icon: MessageCircle, external: true },
];

/** Support shortcuts shown under the direct contacts. */
const CONTACT_ROWS = [
  { href: '/dashboard/support', label: 'گفتگوی آنلاین با پشتیبانی', Icon: MessageCircleQuestion },
  { href: '/dashboard/tickets', label: 'ثبت تیکت پشتیبانی', Icon: LifeBuoy },
];

/**
 * Site footer — mirrors the reference layout: a light panel with a brand row
 * (logo + icon tiles), four columns (owner links, site pages, quick links and
 * contact rows), and a centered copyright line. The e-namad seal lives inside
 * the contact column so it does not add a separate full-width row.
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
          <Link
            href="/"
            prefetch={false}
            aria-label="شمالی کارت — صفحه اصلی"
            className="flex items-center gap-3"
          >
            <Image
              src="/shomali-card-calligraphy.svg"
              alt="شمالی کارت"
              width={148}
              height={72}
              unoptimized
              className="h-10 w-auto shrink-0 dark:invert"
            />
            <span className="max-w-[17rem] text-xs leading-5 text-[var(--footer-faint)]">
              کارت ویزیت دیجیتال، بیولینک و دفترچه تلفن کسب‌وکارها
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

        {/* Link columns: two tidy columns on phones/tablets, four on desktop. */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 py-6 lg:grid-cols-4">
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
            <ul className="grid gap-y-2 leading-6 lg:grid-cols-2 lg:gap-x-3">
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
              {DIRECT_CONTACTS.map(({ href, label, Icon, external, ltr }) => (
                <li key={href}>
                  <a
                    href={href}
                    {...(external
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                    dir={ltr ? 'ltr' : undefined}
                    className="flex items-center gap-1.5 transition hover:text-[var(--footer-brand)]"
                  >
                    <Icon
                      className="size-3.5 shrink-0 text-[var(--footer-brand-light)]"
                      aria-hidden
                    />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
            <ul className="mt-3 space-y-2 text-xs leading-6 text-[var(--footer-muted)]">
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
            {showEnamad ? (
              <div className="mt-4 flex justify-center lg:justify-start">
                <EnamadBadge className="shrink-0" />
              </div>
            ) : null}
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

      </div>
    </footer>
  );
}
