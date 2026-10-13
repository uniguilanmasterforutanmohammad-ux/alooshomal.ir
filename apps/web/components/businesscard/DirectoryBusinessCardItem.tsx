'use client';

import Image from 'next/image';
import { Building2, UserRound } from 'lucide-react';

import { BoostBadge } from '@/components/ui/BoostBadge';
import { LikeButton } from '@/components/ui/LikeButton';
import { SaveButton } from '@/components/ui/SaveButton';
import { cn } from '@/lib/utils';
import type { DirectoryBusinessCard } from '@/lib/api';

interface Props {
  businessCard: DirectoryBusinessCard;
  selected: boolean;
  onSelect: () => void;
}

export function DirectoryBusinessCardItem({ businessCard, selected, onSelect }: Props) {
  const initials = businessCard.fullName.trim().slice(0, 1);
  const boosted =
    businessCard.boostedUntil && new Date(businessCard.boostedUntil) > new Date();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'indeed-panel relative w-full cursor-pointer border-s-4 p-4 text-right transition',
        selected
          ? 'border-s-brand bg-brand-light/40 shadow-sm'
          : 'border-s-transparent hover:border-s-brand/50 hover:shadow-sm',
      )}
    >
      {boosted ? (
        <BoostBadge className="absolute end-3 top-3" />
      ) : null}
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-light text-lg font-extrabold text-brand">
          {businessCard.avatarUrl ? (
            <Image
              src={businessCard.avatarUrl}
              alt={businessCard.fullName}
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
            {businessCard.fullName}
          </h3>
          {businessCard.jobTitle ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
              <UserRound className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{businessCard.jobTitle}</span>
            </p>
          ) : null}
          {businessCard.company ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
              <Building2 className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{businessCard.company}</span>
            </p>
          ) : null}

          <div className="mt-2 flex items-center gap-2">
            <LikeButton
              kind="business-cards"
              slug={businessCard.slug}
              initialCount={businessCard.likeCount ?? 0}
              initialLiked={businessCard.liked ?? false}
            />
            <SaveButton
              kind="business-cards"
              slug={businessCard.slug}
              initialSaved={businessCard.saved ?? false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
