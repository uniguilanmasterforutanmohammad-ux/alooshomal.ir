'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Globe, Images, MessageCircle, Share2 } from 'lucide-react';

import { BoostBadge } from '@/components/ui/BoostBadge';
import { LikeButton } from '@/components/ui/LikeButton';
import { SaveButton } from '@/components/ui/SaveButton';
import { FeedTagCard } from '@/components/feed/FeedTagCard';
import { bodyToHtml, richTextPreview } from '@/lib/rich-text';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { FeedPost } from '@/lib/api';

interface Props {
  post: FeedPost;
  /** tighter paddings/sizes for the saved-list or aside variants */
  compact?: boolean;
}

function faWhen(value: string) {
  const date = new Date(value);
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return 'همین حالا';
  if (minutes < 60) return `${minutes.toLocaleString('fa-IR')} دقیقه`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours.toLocaleString('fa-IR')} ساعت`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days.toLocaleString('fa-IR')} روز`;
  return date.toLocaleDateString('fa-IR');
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
 * One post in the Twitter/X-style `/feeds` timeline: a flat row (no card box)
 * with a round avatar on the inline-start side, the author line, the text and
 * images, and an evenly spaced icon action bar underneath. The row itself is
 * not a link because it holds interactive buttons; the avatar, timestamp and
 * comment action open the single-post page.
 */
export function FeedCard({ post, compact = false }: Props) {
  const now = new Date();
  const directoryAd = post.adDirectoryUntil && new Date(post.adDirectoryUntil) > now;
  const boosted = !directoryAd && post.boostedUntil && new Date(post.boostedUntil) > now;
  const authorName = post.user?.fullName ?? 'کاربر';
  const href = `/feeds/${post.id}`;
  const preview = post.images.slice(0, 4);
  const extraImages = post.images.length - preview.length;

  async function share() {
    const url = `${window.location.origin}${href}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('لینک پست کپی شد');
    } catch {
      toast.error('کپی لینک ممکن نشد');
    }
  }

  return (
    <article className={cn('tw-post', compact && 'tw-post-compact')}>
      <Link href={href} className="shrink-0" aria-label={`پست ${authorName}`}>
        <span
          className="tw-avatar"
          style={{ background: authorColor(post.userId) }}
          aria-hidden
        >
          {authorName.trim().charAt(0)}
        </span>
      </Link>

      <div className="min-w-0 flex-1">
        {/* Author line: name · relative time · public globe (+ promotion badge). */}
        <div className="flex items-center gap-1.5">
          <Link
            href={href}
            className="truncate text-sm font-extrabold text-ink hover:underline"
          >
            {authorName}
          </Link>
          <span className="text-xs text-muted" aria-hidden>
            ·
          </span>
          <Link
            href={href}
            className="shrink-0 text-xs text-muted hover:underline"
            title={new Date(post.publishedAt ?? post.createdAt).toLocaleString('fa-IR')}
          >
            {faWhen(post.publishedAt ?? post.createdAt)}
          </Link>
          <Globe className="size-3 shrink-0 text-muted" aria-hidden />
          {directoryAd ? (
            <BoostBadge
              label="تبلیغات"
              title="این پست تبلیغ هدفمند است و در صدر همین موضوع در دایرکتوری فیدها نمایش داده می‌شود"
              className="ms-auto"
            />
          ) : boosted ? (
            <BoostBadge
              label="پله"
              title="این پست با «پله» به صدر دایرکتوری فیدها آورده شده است"
              className="ms-auto"
            />
          ) : null}
        </div>

        {/* The post text leads the row. */}
        {post.body ? (
          <div
            className={cn('feed-rich mt-1.5', compact && 'line-clamp-6')}
            // Sanitised through the allow-list in `lib/rich-text`.
            dangerouslySetInnerHTML={{ __html: bodyToHtml(post.body) }}
          />
        ) : null}

        {/* Images: a rounded social-media grid (max 4 + “+n”). */}
        {preview.length ? (
          <div
            className={cn(
              'mt-3 grid gap-1 overflow-hidden rounded-2xl border border-[var(--vintage-border)]',
              preview.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
            )}
          >
            {preview.map((src, index) => (
              <div
                key={src}
                className={cn(
                  'relative overflow-hidden bg-soft',
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

        {/* Paid tag: a proper card (author's own card/biolink) rather than a chip. */}
        {post.tag ? <FeedTagCard tag={post.tag} compact /> : null}

        {/* Topic + image-count chips. */}
        {post.topic || post.images.length ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
            {post.topic ? (
              <span className="rounded-full bg-brand-light px-2.5 py-0.5 font-bold text-brand">
                {post.topic.name}
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

        {/* Twitter-style action bar: reply · like · save · share. */}
        <div className="tw-actions">
          <Link href={href} className="tw-action" aria-label="مشاهده و پاسخ به پست">
            <MessageCircle className="size-[18px]" aria-hidden />
          </Link>
          <LikeButton
            kind="feeds"
            slug={post.id}
            initialCount={post.likeCount}
            initialLiked={post.liked ?? false}
            reconcile={false}
            variant="twitter"
          />
          <SaveButton
            kind="feeds"
            slug={post.id}
            initialSaved={post.saved ?? false}
            variant="twitter"
          />
          <button type="button" onClick={share} className="tw-action" aria-label="کپی لینک پست">
            <Share2 className="size-[18px]" aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}
