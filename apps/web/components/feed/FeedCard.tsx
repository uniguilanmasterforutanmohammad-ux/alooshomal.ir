'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, Images, MessageSquare, UserRound } from 'lucide-react';

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
 * Instagram-style feed card: a square image area (with a multi-image count
 * badge), the author line, the caption and a like row. The whole card links to
 * the single-post page, where liking/saving happens.
 */
export function FeedCard({ post, compact = false }: Props) {
  const cover = post.images[0];
  return (
    <Link
      href={`/feeds/${post.id}`}
      className="group block overflow-hidden rounded-xl border border-[var(--vintage-border)] bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-square w-full bg-soft">
        {cover ? (
          <Image
            src={cover}
            alt={post.body?.slice(0, 40) ?? 'پست فید'}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <MessageSquare className="size-8" aria-hidden />
          </div>
        )}
        {post.images.length > 1 ? (
          <span className="absolute end-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
            <Images className="size-3" aria-hidden />
            {post.images.length.toLocaleString('fa-IR')}
          </span>
        ) : null}
        {post.topic ? (
          <span className="absolute start-2 top-2 rounded-full bg-brand/90 px-2 py-0.5 text-[10px] font-bold text-white">
            {post.topic.name}
          </span>
        ) : null}
      </div>

      <div className={cn('p-3', compact && 'p-2.5')}>
        <div className="flex items-center gap-2 text-xs text-muted">
          <UserRound className="size-3.5" aria-hidden />
          <span className="truncate font-bold text-ink">
            {post.user?.fullName ?? 'کاربر'}
          </span>
          <span className="ms-auto">{faDate(post.publishedAt ?? post.createdAt)}</span>
        </div>
        {post.body ? (
          <p className="mt-2 line-clamp-2 text-xs leading-6 text-ink">{post.body}</p>
        ) : null}
        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <Heart className="size-3.5" aria-hidden />
            {post.likeCount.toLocaleString('fa-IR')}
          </span>
        </div>
      </div>
    </Link>
  );
}
