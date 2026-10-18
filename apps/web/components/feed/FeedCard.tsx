'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Bookmark, Heart, Images, Tag, UserRound } from 'lucide-react';

import { BoostBadge } from '@/components/ui/BoostBadge';
import { cn } from '@/lib/utils';
import type { FeedPost } from '@/lib/api';

interface Props {
  post: FeedPost;
  /** show the like count as a pill (directory rows) */
  compact?: boolean;
}

function faDate(value: string) {
  return new Date(value).toLocaleDateString('fa-IR');
}

/**
 * Text-first feed card. The text leads — topic badge, author, body and meta
 * (date · likes · image count) — and any images are shown as a small thumbnail
 * strip on the side, so a feed of short posts reads like a text stream instead
 * of an image grid (as requested for `/feeds`). The whole card links to the
 * single-post page, where liking/saving happens.
 */
export function FeedCard({ post, compact = false }: Props) {
  const cover = post.images[0];
  const now = new Date();
  const directoryAd =
    post.adDirectoryUntil && new Date(post.adDirectoryUntil) > now;
  const boosted =
    !directoryAd && post.boostedUntil && new Date(post.boostedUntil) > now;
  return (
    <Link
      href={`/feeds/${post.id}`}
      className={cn(
        'group block overflow-hidden rounded-xl border-s-4 border border-[var(--vintage-border)] border-s-transparent bg-white p-4 text-right shadow-sm transition hover:border-s-brand hover:shadow-md',
        compact && 'p-3',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            {post.topic ? (
              <span className="rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-bold text-brand">
                {post.topic.name}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3.5" aria-hidden />
              <span className="truncate font-bold text-ink">
                {post.user?.fullName ?? 'کاربر'}
              </span>
            </span>
            <span className="ms-auto">{faDate(post.publishedAt ?? post.createdAt)}</span>
            {directoryAd ? (
              <BoostBadge
                label="تبلیغات"
                title="این پست تبلیغ هدفمند است و در صدر همین موضوع در دایرکتوری فیدها نمایش داده می‌شود"
              />
            ) : boosted ? (
              <BoostBadge
                label="پله"
                title="این پست با «پله» به صدر دایرکتوری فیدها آورده شده است"
              />
            ) : null}
          </div>

          {post.body ? (
            <p
              className={cn(
                'mt-2 whitespace-pre-line text-sm leading-7 text-ink',
                compact ? 'line-clamp-3' : 'line-clamp-4',
              )}
            >
              {post.body}
            </p>
          ) : null}

          {post.tag ? (
            <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--vintage-border)] px-2.5 py-1 text-[11px] text-muted">
              <Tag className="size-3.5 shrink-0 text-brand" aria-hidden />
              <span className="truncate">
                {post.tag.company || post.tag.fullName}
              </span>
            </span>
          ) : null}

          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1">
              <Heart className="size-3.5" aria-hidden />
              {post.likeCount.toLocaleString('fa-IR')}
            </span>
            {post.images.length ? (
              <span className="inline-flex items-center gap-1">
                <Images className="size-3.5" aria-hidden />
                {post.images.length.toLocaleString('fa-IR')} تصویر
              </span>
            ) : null}
            {post.saved ? (
              <span className="inline-flex items-center gap-1">
                <Bookmark className="size-3.5" aria-hidden />
                ذخیره‌شده
              </span>
            ) : null}
          </div>
        </div>

        {/* Images are secondary in this layout: a small stacked thumbnail
            preview instead of the old full-width square cover. */}
        {cover ? (
          <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-soft sm:size-24">
            <Image
              src={cover}
              alt={post.body?.slice(0, 40) ?? 'پست فید'}
              fill
              sizes="96px"
              className="object-cover transition group-hover:scale-105"
              unoptimized
            />
            {post.images.length > 1 ? (
              <span className="absolute bottom-1 end-1 inline-flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                <Images className="size-3" aria-hidden />
                {post.images.length.toLocaleString('fa-IR')}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
