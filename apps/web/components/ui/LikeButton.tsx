'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  interactionKey,
  useInteraction,
  useInteractionStore,
} from '@/lib/interactions';
import { cn } from '@/lib/utils';

interface Props {
  kind: 'biolinks' | 'business-cards' | 'feeds';
  slug: string;
  initialCount: number;
  initialLiked?: boolean;
  /** compact pill used inside directory rows; large pill for public pages */
  size?: 'sm' | 'md';
  /**
   * When the parent already has the *real* per-visitor liked state (e.g. a
   * directory row whose API response included `liked`), set this to `false` to
   * skip the per-row `GET .../like` reconciliation. Doing so removes an N+1
   * request storm — one like-status request per visible row on every directory
   * load — that was a top load-time bottleneck. Defaults to `true` because the
   * server-rendered public card page cannot know the browser's visitor id.
   */
  reconcile?: boolean;
}

export function LikeButton({
  kind,
  slug,
  initialCount,
  initialLiked = false,
  size = 'sm',
  reconcile = true,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, hydrated } = useAuth();
  const apply = useInteractionStore((state) => state.apply);
  const syncFromProps = useInteractionStore((state) => state.syncFromProps);
  const entry = useInteraction(kind, slug);
  const count = entry?.likeCount ?? initialCount;
  const liked = entry?.liked ?? initialLiked;
  const [busy, setBusy] = useState(false);

  // Publish this row's own snapshot into the shared store. On the first mount
  // it seeds the entry; on later mounts (after a view switch) it is a no-op
  // because the store already holds the authoritative value, so a toggle made in
  // another view survives. A stale background re-fetch cannot clobber a pending
  // toggle — `syncFromProps` keeps local changes until the props catch up.
  useEffect(() => {
    syncFromProps(interactionKey(kind, slug), {
      liked: initialLiked,
      likeCount: initialCount,
    });
  }, [kind, slug, initialLiked, initialCount, syncFromProps]);

  // The public pages are server-rendered, so their server-side `like` snapshot
  // cannot know the browser's `x-visitor-id`. Reconcile here on mount with the
  // real visitor key so a refresh keeps the red heart for what we liked.
  useEffect(() => {
    if (!reconcile) return;
    let active = true;
    api
      .get<{ liked: boolean; likeCount: number }>(
        `/${kind}/public/${encodeURIComponent(slug)}/like`,
      )
      .then((result) => {
        if (!active) return;
        apply(interactionKey(kind, slug), {
          liked: result.liked,
          likeCount: result.likeCount,
        });
      })
      .catch(() => {
        /* keep the server snapshot */
      });
    return () => {
      active = false;
    };
  }, [kind, slug, reconcile, apply]);

  async function toggle(event: React.MouseEvent) {
    // directory rows are clickable; don't trigger the row's onSelect
    event.stopPropagation();
    event.preventDefault();
    // liking requires a signed-in user; send anonymous visitors to login
    if (hydrated && !token) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (busy) return;
    setBusy(true);
    // optimistic update
    const nextLiked = !liked;
    const key = interactionKey(kind, slug);
    apply(key, { liked: nextLiked, likeCount: count + (nextLiked ? 1 : -1) });
    try {
      const result = await api.post<{ liked: boolean; likeCount: number }>(
        `/${kind}/public/${encodeURIComponent(slug)}/like`,
      );
      apply(key, { liked: result.liked, likeCount: result.likeCount });
    } catch {
      // roll back on failure
      apply(key, { liked, likeCount: count });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={liked}
      aria-label={liked ? 'برداشتن لایک' : 'لایک'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-bold transition',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm',
        liked
          ? 'border-red-200 bg-red-50 text-red-600'
          : 'border-[var(--vintage-border)] text-muted hover:border-red-200 hover:text-red-500',
        busy && 'opacity-70',
      )}
    >
      <Heart
        className={cn(size === 'sm' ? 'size-3.5' : 'size-4', liked && 'fill-current')}
        aria-hidden
      />
      <span>{count.toLocaleString('fa-IR')}</span>
    </button>
  );
}
