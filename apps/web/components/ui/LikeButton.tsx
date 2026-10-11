'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
}

export function LikeButton({
  kind,
  slug,
  initialCount,
  initialLiked = false,
  size = 'sm',
}: Props) {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [busy, setBusy] = useState(false);

  // The public pages are server-rendered, so their server-side `like` snapshot
  // cannot know the browser's `x-visitor-id`. Reconcile here on mount with the
  // real visitor key so a refresh keeps the red heart for what we liked.
  useEffect(() => {
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
  }, [kind, slug]);

  async function toggle(event: React.MouseEvent) {
    // directory rows are clickable; don't trigger the row's onSelect
    event.stopPropagation();
    event.preventDefault();
    // liking requires a signed-in user; send anonymous visitors to login
    if (hydrated && !token) {
      router.push('/login');
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
