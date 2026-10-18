import Link from 'next/link';
import { ArrowRight, Crown, Home } from 'lucide-react';

import { ThemedBiolink } from './ThemedBiolink';
import { LikeButton } from '@/components/ui/LikeButton';
import { PlanUpgradeNotice } from '@/components/ui/PlanUpgradeNotice';
import { themeClassName } from '@/lib/themes';
import type { Biolink } from '@/lib/api';

interface Props {
  biolink: Biolink;
  qr: string;
  link: string;
  like?: { liked: boolean; likeCount: number };
}

/**
 * Full public biolink page. The whole page — background, biolink and the share
 * block underneath — is painted in the theme the owner selected, so
 * `/biolinks/<slug>` matches the live preview and the reference templates.
 */
export function PublicBiolinkView({ biolink, qr, link, like }: Props) {
  return (
    <div
      className={`biolink-theme biolink-theme-page card-public-page ${themeClassName(
        biolink.template,
      )}`}
    >
      <div className="flex min-h-0 flex-1 items-stretch justify-center px-4 py-4 sm:py-8">
        <div className="card-public-inner w-full max-w-[480px]">
          {/* One aligned row: back link · plan badge · home link. */}
          <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
            <Link
              href="/biolinks"
              className="theme-panel theme-panel-text inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold opacity-85 transition hover:opacity-100"
            >
              <ArrowRight className="size-3.5" aria-hidden />
              بازگشت به دایرکتوری
            </Link>

            {biolink.planName ? (
              <span className="theme-panel theme-panel-text inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold opacity-90">
                <Crown className="size-3.5" aria-hidden />
                نوع اشتراک: {biolink.planName}
              </span>
            ) : null}

            <Link
              href="/"
              className="theme-panel theme-panel-text inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold opacity-85 transition hover:opacity-100"
            >
              <Home className="size-3.5" aria-hidden />
              صفحه اصلی
            </Link>
          </div>

          <PlanUpgradeNotice
            ownerUserId={biolink.userId}
            hidesFields={biolink.planHidesFields}
          />

          {/* Only this region scrolls; the chrome above and below stays put. */}
          <div className="card-public-scroll">
            <ThemedBiolink
              themeKey={biolink.template}
              data={biolink}
              cityName={biolink.city?.name}
              businessName={biolink.business?.name}
              interactive
            />
          </div>

          <div className="theme-panel mt-4 flex shrink-0 items-center gap-4 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt="QR کد بیولینک"
              width={96}
              height={96}
              className="size-24 shrink-0 rounded-lg bg-white p-1.5"
            />
            <div className="min-w-0 flex-1 text-right">
              <p className="theme-panel-text text-xs font-bold">
                اسکن کنید یا لینک را به اشتراک بگذارید
              </p>
              <p dir="ltr" className="theme-panel-muted mt-1 break-all text-[11px]">
                {link}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <a
                  href={`/api/proxy/biolinks/public/${biolink.slug}/vcard`}
                  className="theme-link inline-flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-bold"
                >
                  ذخیره مخاطب
                </a>
                <LikeButton
                  kind="biolinks"
                  slug={biolink.slug}
                  initialCount={like?.likeCount ?? 0}
                  initialLiked={like?.liked ?? false}
                  size="md"
                />
              </div>
            </div>
          </div>

          <p className="theme-panel-muted mt-3 shrink-0 text-center text-xs">
            ساخته‌شده با{' '}
            <Link href="/" className="font-bold underline">
              شمالی کارت
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
