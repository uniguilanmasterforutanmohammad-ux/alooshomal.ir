'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bookmark } from 'lucide-react';

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
  initialSaved?: boolean;
  /** compact pill used inside directory rows; large pill for public pages */
  size?: 'sm' | 'md';
  /** optional callback so a parent list can remove the item from "saved" views */
  onToggled?: (saved: boolean) => void;
  /** render as a plain icon-only button (public pages) */
  iconOnly?: boolean;
  /**
   * When the parent cannot know the signed-in visitor's save state (the public
   * pages are server-rendered), set this to `true` to reconcile it on mount
   * with the per-user `GET .../public/<slug>/save` endpoint. Defaults to
   * `false` because directory rows already carry the real state.
   */
  reconcile?: boolean;
}

/**
 * Bookmark ("ذخیره") toggle. Saving requires a signed-in user; anonymous
 * visitors are redirected to the login page.
 */
export function SaveButton({
  kind,
  slug,
  initialSaved = false,
  size = 'sm',
  onToggled,
  iconOnly,
  reconcile = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, hydrated } = useAuth();
  const apply = useInteractionStore((state) => state.apply);
  const syncFromProps = useInteractionStore((state) => state.syncFromProps);
  const entry = useInteraction(kind, slug);
  const saved = entry?.saved ?? initialSaved;
  const [busy, setBusy] = useState(false);

  // Seed the shared store with this row's snapshot; a view switch then remounts
  // from the store (which already reflects any toggle) instead of the stale
  // server prop, so a save made in another view is not lost.
  useEffect(() => {
    syncFromProps(interactionKey(kind, slug), { saved: initialSaved });
  }, [kind, slug, initialSaved, syncFromProps]);

  // The public record pages are server-rendered and cannot know the visitor, so
  // ask the API for the real save state once the session is hydrated.
  useEffect(() => {
    if (!reconcile || !hydrated) return;
    let active = true;
    api
      .get<{ saved: boolean }>(`/${kind}/public/${encodeURIComponent(slug)}/save`)
      .then((result) => {
        if (active) {
          apply(interactionKey(kind, slug), { saved: result.saved });
        }
      })
      .catch(() => {
        /* keep the server snapshot */
      });
    return () => {
      active = false;
    };
  }, [kind, slug, reconcile, hydrated, token, apply]);

  async function toggle(event: React.MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    if (hydrated && !token) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !saved;
    const key = interactionKey(kind, slug);
    apply(key, { saved: next });
    try {
      const result = await api.post<{ saved: boolean }>(
        `/${kind}/public/${encodeURIComponent(slug)}/save`,
      );
      apply(key, { saved: result.saved });
      onToggled?.(result.saved);
    } catch {
      apply(key, { saved });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? 'حذف از ذخیره‌شده‌ها' : 'ذخیره'}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-full border font-bold transition',
        iconOnly
          ? size === 'sm'
            ? 'size-8'
            : 'size-10'
          : size === 'sm'
            ? 'px-2.5 py-1 text-xs'
            : 'px-4 py-2 text-sm',
        saved
          ? 'border-amber-200 bg-amber-50 text-amber-600'
          : 'border-[var(--vintage-border)] text-muted hover:border-amber-200 hover:text-amber-500',
        busy && 'opacity-70',
      )}
    >
      <Bookmark
        className={cn(size === 'sm' ? 'size-3.5' : 'size-4', saved && 'fill-current')}
        aria-hidden
      />
      {iconOnly ? null : <span>{saved ? 'ذخیره شد' : 'ذخیره'}</span>}
    </button>
  );
}
