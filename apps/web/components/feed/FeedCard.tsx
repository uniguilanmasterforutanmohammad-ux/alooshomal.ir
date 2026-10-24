'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Globe, Images, Tag } from 'lucide-react';

import { BoostBadge } from '@/components/ui/BoostBadge';
import { LikeButton } from '@/components/ui/LikeButton';
import { SaveButton } from '@/components/ui/SaveButton';
import { bodyToHtml, richTextPreview } from '@/lib/rich-text';
import { cn } from '@/lib/utils';
import type { FeedPost } from '@/lib/api';

interface Props {
  post: FeedPost;
  /** tighter paddings/sizes for the saved-list or aside variants */
  compact?: boolean;
}

function faDate(value: string) {
  return new Date(value).toLocaleDateString('fa-IR');
}

/** Deterministic accent for the author chip, keyed off the user id. */
const AVATAR_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

function authorColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * One user post in the `/feeds` stream, in the familiar social-network shape:
 *
 *   author header (initial avatar · name · date · public globe)
 *   → the post text, leading the card
 *   → the images, if any, as a simple edge-to-edge strip
 *   → a divider and an action bar (like · save · open-post)
 *
 * The text is the star (this is a text-first feed), so the body gets the most
 * space and images stay secondary. The card itself is not a link — it holds
 * interactive buttons — the «مشاهدهٔ پست» action and the timestamp navigate to
 * the single-post page instead.
 */
export function FeedCard({ post, compact = false }: Props) {
  const now = new Date();
  const directoryAd = post.adDirectoryUntil && new Date(post.adDirectoryUntil) > now;
  const boosted = !directoryAd && post.boostedUntil && new Date(post.boostedUntil) > now;
  const authorName = post.user?.fullName ?? 'کاربر';
  const href = `/feeds/${post.id}`;
  const preview = post.images.slice(0, 4);
  const extraImages = post.images.length - preview.length;

  return (
    <article
      className={cn(
        'indeed-panel overflow-hidden',
        compact ? 'p-3' : 'p-4 sm:p-5',
      )}
    >
      {/* Header: author + date (+ promotion badge). */}
      <div className="flex items-center gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white"
          style={{ background: authorColor(post.userId) }}
          aria-hidden
        >
          {authorName.trim().charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{authorName}</p>
          <p className="flex items-center gap-1.5 text-[11px] text-muted">
            <Link href={href} className="hover:underline">
              {faDate(post.publishedAt ?? post.createdAt)}
            </Link>
            <Globe className="size-3" aria-hidden />
          </p>
        </div>
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

      {/* The post text leads the card. */}
      {post.body ? (
        <div
          className={cn('feed-rich mt-3', compact && 'line-clamp-6')}
          // Sanitised through the allow-list in `lib/rich-text`.
          dangerouslySetInnerHTML={{ __html: bodyToHtml(post.body) }}
        />
      ) : null}

      {/* Images: secondary, a simple grid like a social post (max 4 + “+n”). */}
      {preview.length ? (
        <div
          className={cn(
            'mt-3 grid gap-1.5 overflow-hidden rounded-lg',
            preview.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
          )}
        >
          {preview.map((src, index) => (
            <div
              key={src}
              className={cn(
                'relative overflow-hidden rounded-lg bg-soft',
                preview.length === 1 ? 'aspect-[16/9]' : 'aspect-square',
              )}
            >
              <Image
                src={src}
                alt={richTextPreview(post.body).slice(0, 60) || `تصویر ${index + 1} پست`}
                fill
                sizes="(max-width: 640px) 50vw, 300px"
                className="object-cover"
                unoptimized
              />
              {index === preview.length - 1 && extraImages > 0 ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-extrabold text-white">
                  {`+${extraImages.toLocaleString('fa-IR')}`}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* Topic + paid tag chips. */}
      {post.topic || post.tag || post.images.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted">
          {post.topic ? (
            <span className="rounded-full bg-brand-light px-2.5 py-0.5 font-bold text-brand">
              {post.topic.name}
            </span>
          ) : null}
          {post.tag ? (
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--vintage-border)] px-2.5 py-0.5">
              <Tag className="size-3.5 shrink-0 text-brand" aria-hidden />
              <span className="truncate">{post.tag.company || post.tag.fullName}</span>
            </span>
          ) : null}
          {post.images.length ? (
            <span className="ms-auto inline-flex items-center gap-1">
              <Images className="size-3.5" aria-hidden />
              {`${post.images.length.toLocaleString('fa-IR')} تصویر`}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Action bar. */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-dashed border-[var(--vintage-border)] pt-3">
        <div className="flex items-center gap-2">
          <LikeButton
            kind="feeds"
            slug={post.id}
            initialCount={post.likeCount}
            initialLiked={post.liked ?? false}
            reconcile={false}
          />
          <SaveButton
            kind="feeds"
            slug={post.id}
            initialSaved={post.saved ?? false}
          />
        </div>
        <Link
          href={href}
          className="text-xs font-bold text-brand hover:underline"
        >
          مشاهدهٔ پست
        </Link>
      </div>
    </article>
  );
}
