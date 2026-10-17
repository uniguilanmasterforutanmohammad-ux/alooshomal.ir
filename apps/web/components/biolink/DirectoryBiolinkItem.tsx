'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Building2, UserRound } from 'lucide-react';

import { BoostBadge } from '@/components/ui/BoostBadge';
import { LikeButton } from '@/components/ui/LikeButton';
import { SaveButton } from '@/components/ui/SaveButton';
import { cn } from '@/lib/utils';
import type { DirectoryBiolink } from '@/lib/api';

interface Props {
  biolink: DirectoryBiolink;
  selected: boolean;
  onSelect: () => void;
}

export function DirectoryBiolinkItem({ biolink, selected, onSelect }: Props) {
  const initials = biolink.fullName.trim().slice(0, 1);
  const now = new Date();
  const directoryAd =
    biolink.adDirectoryUntil && new Date(biolink.adDirectoryUntil) > now;
  const boosted =
    !directoryAd && biolink.boostedUntil && new Date(biolink.boostedUntil) > now;

  return (
    // The row is clickable (split view) but the *link* is a real `<a href>` on
    // the heading so crawlers can follow it to the detail page. Keeping the
    // like/save buttons outside the anchor avoids nesting interactive elements.
    <div
      role="button"
      tabIndex={-1}
      onClick={onSelect}
      className={cn(
        'indeed-panel relative w-full cursor-pointer border-s-4 p-4 text-right transition',
        selected
          ? 'border-s-brand bg-brand-light/40 shadow-sm'
          : 'border-s-transparent hover:border-s-brand/50 hover:shadow-sm',
      )}
    >
      {directoryAd ? (
        <BoostBadge
          className="absolute end-3 top-3"
          label="تبلیغات"
          title="این بیولینک تبلیغ هدفمند است و در همین دسته‌بندی شهر و کسب‌وکار در صدر لیست نمایش داده می‌شود"
        />
      ) : boosted ? (
        <BoostBadge
          className="absolute end-3 top-3"
          label="پله"
          title="این بیولینک با «پله» به صدر لیست همین دسته‌بندی شهر و کسب‌وکار آورده شده است"
        />
      ) : null}
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-light text-lg font-extrabold text-brand">
          {biolink.avatarUrl ? (
            <Image
              src={biolink.avatarUrl}
              alt={biolink.fullName}
              width={48}
              height={48}
              className="size-12 object-cover"
              unoptimized
            />
          ) : (
            initials
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              'truncate text-base font-extrabold',
              selected ? 'text-brand' : 'text-ink',
            )}
          >
            <Link
              href={`/biolinks/${biolink.slug}`}
              onClick={(event) => {
                event.preventDefault();
                onSelect();
              }}
              className="hover:underline focus:underline focus:outline-none"
            >
              {biolink.fullName}
              {/* descriptive anchor text for crawlers (avoids "click here") */}
              <span className="sr-only">
                {' '}
                — مشاهده بیولینک {biolink.fullName}
                {biolink.jobTitle ? ` (${biolink.jobTitle})` : ''}
              </span>
            </Link>
          </h3>
          {biolink.jobTitle ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
              <UserRound className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{biolink.jobTitle}</span>
            </p>
          ) : null}
          {biolink.company ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
              <Building2 className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{biolink.company}</span>
            </p>
          ) : null}

          <div className="mt-2 flex items-center gap-2">
            <LikeButton
              kind="biolinks"
              slug={biolink.slug}
              initialCount={biolink.likeCount ?? 0}
              initialLiked={biolink.liked ?? false}
            />
            <SaveButton
              kind="biolinks"
              slug={biolink.slug}
              initialSaved={biolink.saved ?? false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
