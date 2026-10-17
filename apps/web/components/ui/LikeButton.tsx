'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface Props {
  kind: 'biolinks' | 'business-cards';
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
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [busy, setBusy] = useState(false);

  // Directory rows hand us their own reconciled `liked`/`likeCount` (the SSR
  // snapshot is always `liked:false`, then the client re-fetch of page 1 lands
  // with the real values). Mirror those into local state *only when the props
  // actually change*, so a parent re-render or the optimistic toggle's `busy`
  // flip never wipes the user's own click.
  const lastProps = useRef({ liked: initialLiked, count: initialCount });
  useEffect(() => {
    const previous = lastProps.current;
    if (previous.liked === initialLiked && previous.count === initialCount) return;
    lastProps.current = { liked: initialLiked, count: initialCount };
    setLiked(initialLiked);
    setCount(initialCount);
  }, [initialLiked, initialCount]);

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
        setLiked(result.liked);
        setCount(result.likeCount);
      })
      .catch(() => {
        /* keep the server snapshot */
      });
    return () => {
      active = false;
    };
  }, [kind, slug, reconcile]);

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
    setLiked(nextLiked);
    setCount((value) => value + (nextLiked ? 1 : -1));
    try {
      const result = await api.post<{ liked: boolean; likeCount: number }>(
        `/${kind}/public/${encodeURIComponent(slug)}/like`,
      );
      setLiked(result.liked);
      setCount(result.likeCount);
    } catch {
      // roll back on failure
      setLiked(!nextLiked);
      setCount((value) => value + (nextLiked ? -1 : 1));
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
