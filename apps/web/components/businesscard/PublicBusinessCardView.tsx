import Link from 'next/link';
import { ArrowRight, Crown, Home } from 'lucide-react';

import { ThemedBusinessCard } from './ThemedBusinessCard';
import { LikeButton } from '@/components/ui/LikeButton';
import { businessCardThemeClassName } from '@/lib/themes';
import type { BusinessCard } from '@/lib/api';

interface Props {
  businessCard: BusinessCard;
  qr: string;
  link: string;
  like?: { liked: boolean; likeCount: number };
}

/**
 * Full public business-card page. The page background and the card itself are
 * painted with the selected business-card theme, so `/business-cards/<slug>`
 * matches the live preview and the reference templates.
 */
export function PublicBusinessCardView({ businessCard, qr, link, like }: Props) {
  return (
    <div className={`bcard-theme bcard-theme-page ${businessCardThemeClassName(businessCard.template)}`}>
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-[460px]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Link
              href="/business-cards"
              className="bc-panel bc-fa bc-muted inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold opacity-85 transition hover:opacity-100"
            >
              <ArrowRight className="size-3.5" aria-hidden />
              بازگشت به دایرکتوری
            </Link>
            <Link
              href="/"
              className="bc-panel bc-fa bc-muted inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold opacity-85 transition hover:opacity-100"
            >
              <Home className="size-3.5" aria-hidden />
              صفحه اصلی
            </Link>
          </div>

          {businessCard.planName ? (
            <div className="mb-3 flex justify-center">
              <span className="bc-panel bc-fa bc-muted inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold opacity-90">
                <Crown className="size-3.5" aria-hidden />
                نوع اشتراک: {businessCard.planName}
              </span>
            </div>
          ) : null}

          <ThemedBusinessCard
            themeKey={businessCard.template}
            data={businessCard}
            cityName={businessCard.city?.name}
            businessName={businessCard.business?.name}
            interactive
          />

          <div className="bc-panel mt-6 flex items-center gap-4 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt="QR کد کارت ویزیت"
              width={96}
              height={96}
              className="size-24 shrink-0 rounded-lg bg-white p-1.5"
            />
            <div className="min-w-0 flex-1 text-right">
              <p className="bc-muted bc-fa text-xs font-bold">
                اسکن کنید یا لینک را به اشتراک بگذارید
              </p>
              <p dir="ltr" className="bc-muted mt-1 break-all text-[11px]">
                {link}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <a
                  href={`/api/proxy/business-cards/public/${businessCard.slug}/vcard`}
                  className="bc-btn bc-fa inline-flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-bold"
                >
                  ذخیره مخاطب
                </a>
                <LikeButton
                  kind="business-cards"
                  slug={businessCard.slug}
                  initialCount={like?.likeCount ?? 0}
                  initialLiked={like?.liked ?? false}
                  size="md"
                />
              </div>
            </div>
          </div>

          <p className="bc-muted bc-fa mt-6 text-center text-xs">
            ساخته‌شده با{' '}
            <Link href="/" className="font-bold underline">
              آلوشمال
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
