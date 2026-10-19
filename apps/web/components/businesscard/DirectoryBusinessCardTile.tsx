'use client';

import Link from 'next/link';

import { BusinessCardFace } from '@/components/businesscard/BusinessCardFace';
import { BoostBadge } from '@/components/ui/BoostBadge';
import { LikeButton } from '@/components/ui/LikeButton';
import { SaveButton } from '@/components/ui/SaveButton';
import type { DirectoryBusinessCard } from '@/lib/api';

interface Props {
  businessCard: DirectoryBusinessCard;
}

/**
 * One tile of the /business-cards «کاشی» grid: the landscape business-card face
 * (the same presentation the public page uses), with the boost/ad badge and the
 * like/save actions layered on top. Clicking the tile opens the card's public
 * page; the classic list view remains available from the view switch.
 */
export function DirectoryBusinessCardTile({ businessCard }: Props) {
  const now = new Date();
  const directoryAd =
    businessCard.adDirectoryUntil && new Date(businessCard.adDirectoryUntil) > now;
  const boosted =
    !directoryAd && businessCard.boostedUntil && new Date(businessCard.boostedUntil) > now;

  return (
    <div className="directory-tile">
      <div className="pointer-events-none">
        <BusinessCardFace
          fullName={businessCard.fullName}
          jobTitle={businessCard.jobTitle}
          bio={businessCard.bio}
          cityName={businessCard.city?.name}
          businessName={businessCard.business?.name}
          avatarUrl={businessCard.avatarUrl}
          accent={businessCard.primaryColor}
          compact
        />
      </div>

      <div className="directory-tile-badges">
        {directoryAd ? (
          <BoostBadge
            label="تبلیغات"
            title="این کارت ویزیت تبلیغ هدفمند است و در همین دسته‌بندی شهر و کسب‌وکار در صدر لیست نمایش داده می‌شود"
          />
        ) : boosted ? (
          <BoostBadge
            label="پله"
            title="این کارت ویزیت با «پله» به صدر لیست کل دایرکتوری آورده شده است و با ثبت موارد جدیدتر پایین می‌رود"
          />
        ) : null}
      </div>

      <div className="directory-tile-actions">
        <LikeButton
          kind="business-cards"
          slug={businessCard.slug}
          initialCount={businessCard.likeCount ?? 0}
          initialLiked={businessCard.liked ?? false}
          reconcile={false}
        />
        <SaveButton
          kind="business-cards"
          slug={businessCard.slug}
          initialSaved={businessCard.saved ?? false}
        />
      </div>

      {/* Full-tile link (kept as a real anchor for crawlers) under the badges
          and action buttons, which sit above it with a higher z-index. */}
      <Link
        href={`/business-cards/${businessCard.slug}`}
        prefetch={false}
        aria-label={`مشاهده کارت ویزیت ${businessCard.fullName}`}
        className="absolute inset-0 z-[2] rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      />
    </div>
  );
}
