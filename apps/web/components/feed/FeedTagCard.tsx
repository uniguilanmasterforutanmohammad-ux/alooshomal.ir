import Image from 'next/image';
import Link from 'next/link';
import { Briefcase, Building2, MapPin, Tag } from 'lucide-react';

import type { FeedTag } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Props {
  tag: FeedTag;
  /** tighter paddings for the feed stream; the post page uses the roomy one */
  compact?: boolean;
}

/**
 * The paid tag on a feed post, rendered as a proper card instead of a one-line
 * chip: the author's own biolink / business card with its identity (avatar or
 * initials), role, company and place — so a tag carries real information and
 * clearly reads as a recommendation, not a stray link.
 *
 * Shared by the `/feeds` stream, the single-post page and the «پست‌های من»
 * list, so every place a tag appears looks the same.
 */
export function FeedTagCard({ tag, compact = false }: Props) {
  const kindLabel = tag.kind === 'BIOLINK' ? 'بیولینک' : 'کارت ویزیت';
  const meta = [tag.jobTitle, tag.company || tag.businessName].filter(Boolean).join(' · ');
  const place = [tag.cityName, tag.businessName].filter(Boolean).join(' · ');

  return (
    <Link
      href={tag.href}
      className={cn(
        'group mt-3 flex gap-3 rounded-xl border border-dashed border-[var(--vintage-accent-hover)] bg-soft transition hover:border-brand hover:shadow-sm',
        compact ? 'p-2.5' : 'p-3.5',
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-light font-extrabold text-brand',
          compact ? 'size-11 text-base' : 'size-14 text-lg',
        )}
      >
        {tag.avatarUrl ? (
          <Image
            src={tag.avatarUrl}
            alt={tag.fullName}
            width={56}
            height={56}
            className="size-full object-cover"
            unoptimized
          />
        ) : (
          tag.fullName.trim().charAt(0)
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand">
          <Tag className="size-3" aria-hidden />
          {`${kindLabel} معرفی‌شده`}
        </span>
        <span
          className={cn(
            'mt-0.5 block truncate font-extrabold text-ink',
            compact ? 'text-sm' : 'text-base',
          )}
        >
          {tag.company || tag.fullName}
        </span>
        {meta ? (
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
            <Briefcase className="size-3.5 shrink-0 text-brand" aria-hidden />
            <span className="truncate">{meta}</span>
          </span>
        ) : null}
        {place ? (
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
            <MapPin className="size-3.5 shrink-0 text-brand" aria-hidden />
            <span className="truncate">{place}</span>
          </span>
        ) : null}
        {!compact && tag.bio ? (
          <span className="mt-1.5 line-clamp-2 block text-xs leading-6 text-muted">
            {tag.bio}
          </span>
        ) : null}
        {!meta && !place && !tag.company ? (
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
            <Building2 className="size-3.5 shrink-0 text-brand" aria-hidden />
            <span className="truncate">{tag.fullName}</span>
          </span>
        ) : null}
      </span>

      <span className="self-center text-xs font-bold text-brand opacity-0 transition group-hover:opacity-100">
        مشاهده
      </span>
    </Link>
  );
}
