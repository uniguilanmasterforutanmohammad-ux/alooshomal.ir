'use client';

import { BoostBadge } from '@/components/ui/BoostBadge';
import { DirectoryContactTile } from '@/components/ui/DirectoryContactTile';
import type { DirectoryBiolink } from '@/lib/api';

interface Props {
  biolink: DirectoryBiolink;
}

/**
 * One tile of the /biolinks «کاشی» grid. It shows the same information the
 * directory list rows do — name, role · company, city · business and both phone
 * numbers — inside a fixed-size tile whose long lines truncate with an
 * ellipsis. Clicking the tile opens the biolink's public page; the classic list
 * view remains available from the view switch.
 */
export function DirectoryBiolinkTile({ biolink }: Props) {
  const now = new Date();
  const directoryAd =
    biolink.adDirectoryUntil && new Date(biolink.adDirectoryUntil) > now;
  const boosted =
    !directoryAd && biolink.boostedUntil && new Date(biolink.boostedUntil) > now;

  return (
    <DirectoryContactTile
      href={`/biolinks/${biolink.slug}`}
      ariaLabel={`مشاهده بیولینک ${biolink.fullName}`}
      kind="biolinks"
      slug={biolink.slug}
      fullName={biolink.fullName}
      jobTitle={biolink.jobTitle}
      company={biolink.company}
      cityName={biolink.city?.name}
      businessName={biolink.business?.name}
      mobile={biolink.mobile}
      landline={biolink.phone}
      accent={biolink.primaryColor}
      likeCount={biolink.likeCount ?? 0}
      liked={biolink.liked ?? false}
      saved={biolink.saved ?? false}
      badge={
        directoryAd ? (
          <BoostBadge
            label="تبلیغات"
            title="این بیولینک تبلیغ هدفمند است و در همین دسته‌بندی شهر و کسب‌وکار در صدر لیست نمایش داده می‌شود"
          />
        ) : boosted ? (
          <BoostBadge
            label="پله"
            title="این بیولینک با «پله» به صدر لیست کل دایرکتوری آورده شده است و با ثبت موارد جدیدتر پایین می‌رود"
          />
        ) : null
      }
    />
  );
}
