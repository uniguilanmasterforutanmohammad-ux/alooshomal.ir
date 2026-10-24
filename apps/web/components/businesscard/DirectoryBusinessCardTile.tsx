'use client';

import { BoostBadge } from '@/components/ui/BoostBadge';
import { DirectoryContactTile } from '@/components/ui/DirectoryContactTile';
import type { DirectoryBusinessCard } from '@/lib/api';

interface Props {
  businessCard: DirectoryBusinessCard;
}

/**
 * One tile of the /business-cards «کاشی» grid. It shows the same information
 * the «دفترچه تلفن» notebook rows do — name, role · company, city · business
 * and both phone numbers — inside a fixed-size tile whose long lines truncate
 * with an ellipsis. Clicking the tile opens the card's public page; the classic
 * list view remains available from the view switch.
 */
export function DirectoryBusinessCardTile({ businessCard }: Props) {
  const now = new Date();
  const directoryAd =
    businessCard.adDirectoryUntil && new Date(businessCard.adDirectoryUntil) > now;
  const boosted =
    !directoryAd && businessCard.boostedUntil && new Date(businessCard.boostedUntil) > now;

  return (
    <DirectoryContactTile
      href={`/business-cards/${businessCard.slug}`}
      ariaLabel={`مشاهده کارت ویزیت ${businessCard.fullName}`}
      kind="business-cards"
      slug={businessCard.slug}
      fullName={businessCard.fullName}
      jobTitle={businessCard.jobTitle}
      company={businessCard.company}
      cityName={businessCard.city?.name}
      businessName={businessCard.business?.name}
      mobile={businessCard.mobile}
      landline={businessCard.phone}
      accent={businessCard.primaryColor}
      likeCount={businessCard.likeCount ?? 0}
      liked={businessCard.liked ?? false}
      saved={businessCard.saved ?? false}
      badge={
        directoryAd ? (
          <BoostBadge
            label="تبلیغات"
            title="این کارت ویزیت تبلیغ هدفمند است و در همین دسته‌بندی شهر و کسب‌وکار در صدر لیست نمایش داده می‌شود"
          />
        ) : boosted ? (
          <BoostBadge
            label="پله"
            title="این کارت ویزیت با «پله» به صدر لیست کل دایرکتوری آورده شده است و با ثبت موارد جدیدتر پایین می‌رود"
          />
        ) : null
      }
    />
  );
}
