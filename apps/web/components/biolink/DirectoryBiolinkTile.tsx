'use client';

import Link from 'next/link';

import { BoostBadge } from '@/components/ui/BoostBadge';
import { LikeButton } from '@/components/ui/LikeButton';
import { SaveButton } from '@/components/ui/SaveButton';
import { RecordCard } from '@/components/ui/RecordCard';
import type { DirectoryBiolink } from '@/lib/api';

interface Props {
  biolink: DirectoryBiolink;
}

/**
 * One tile of the /biolinks «کاشی» grid: the very same `RecordCard` the public
 * biolink page renders (so the directory previews exactly what the page shows),
 * with the boost/ad badge and the like/save actions layered on top. Clicking the
 * tile opens the biolink's public page; the classic list view remains available
 * from the view switch.
 */
export function DirectoryBiolinkTile({ biolink }: Props) {
  const now = new Date();
  const directoryAd =
    biolink.adDirectoryUntil && new Date(biolink.adDirectoryUntil) > now;
  const boosted =
    !directoryAd && biolink.boostedUntil && new Date(biolink.boostedUntil) > now;

  // Same headline/subline logic as `PublicBiolinkView`, so the tile and the
  // public page read identically. No contact rows are passed: the directory
  // payload is lightweight and the tile stays a non-nested click target.
  const headline =
    biolink.company || biolink.jobTitle || biolink.fullName || 'بیولینک';
  const subline = biolink.company
    ? [biolink.fullName, biolink.jobTitle].filter(Boolean).join(' — ') || null
    : biolink.jobTitle
      ? biolink.fullName
      : null;

  return (
    <div className="directory-tile">
      <div className="pointer-events-none">
        <RecordCard
          fullName={biolink.fullName}
          headline={headline}
          subline={subline}
          bio={biolink.bio}
          cityName={biolink.city?.name}
          businessName={biolink.business?.name}
          avatarUrl={biolink.avatarUrl}
          accent={biolink.primaryColor}
          compact
        />
      </div>

      <div className="directory-tile-badges">
        {directoryAd ? (
          <BoostBadge
            label="تبلیغات"
            title="این بیولینک تبلیغ هدفمند است و در همین دسته‌بندی شهر و کسب‌وکار در صدر لیست نمایش داده می‌شود"
          />
        ) : boosted ? (
          <BoostBadge
            label="پله"
            title="این بیولینک با «پله» به صدر لیست کل دایرکتوری آورده شده است و با ثبت موارد جدیدتر پایین می‌رود"
          />
        ) : null}
      </div>

      <div className="directory-tile-actions">
        <LikeButton
          kind="biolinks"
          slug={biolink.slug}
          initialCount={biolink.likeCount ?? 0}
          initialLiked={biolink.liked ?? false}
          reconcile={false}
        />
        <SaveButton
          kind="biolinks"
          slug={biolink.slug}
          initialSaved={biolink.saved ?? false}
        />
      </div>

      <Link
        href={`/biolinks/${biolink.slug}`}
        prefetch={false}
        aria-label={`مشاهده بیولینک ${biolink.fullName}`}
        className="absolute inset-0 z-[2] rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      />
    </div>
  );
}
