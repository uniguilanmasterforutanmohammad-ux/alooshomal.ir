'use client';

import { create } from 'zustand';

/**
 * Shared, in-memory like/save state for the public directories.
 *
 * `LikeButton`/`SaveButton` used to own their state internally and seed it from
 * the props of whatever row rendered them. Switching the directory look (list ⇄
 * کاشی ⇄ دفترچه) unmounts those rows and remounts them from the *stale* SSR
 * props, so a like/save the visitor had just made appeared to vanish until a
 * full page refresh (which re-fetched the rows). Keeping the value here — keyed
 * by `kind:slug`, outside React — means every view reads the same authoritative
 * value, so a toggle survives the switch with no refresh.
 *
 * The store is only a client-side mirror: it never replaces the API call, it
 * just holds the last known truth per item so remounts agree.
 */

export type InteractionKind = 'biolinks' | 'business-cards' | 'feeds';

export interface InteractionEntry {
  liked?: boolean;
  likeCount?: number;
  saved?: boolean;
  /**
   * True while the visitor's own toggle is in flight / recently applied, so a
   * background list re-fetch (whose props may still carry the pre-click value)
   * must not clobber the optimistic value.
   */
  dirty?: boolean;
}

interface InteractionState {
  entries: Record<string, InteractionEntry>;
  /**
   * Adopt the values carried by a row's props (`liked`/`likeCount`/`saved`).
   *
   * - When we have nothing yet, take the props.
   * - Once the visitor has toggled (`dirty`), the local value is authoritative
   *   for the rest of the session: later props are ignored.
   *
   * That last rule matters because a directory row's props come from *two*
   * sources with different freshness — the SSR snapshot (always `liked:false`)
   * and the client page-1 re-fetch — so a remount (view switch) can hand us a
   * stale snapshot after a fresher one. Ignoring props after a toggle keeps the
   * visitor's own click stable across view switches; a full page reload resets
   * this store and re-reads the persisted truth.
   */
  syncFromProps: (key: string, patch: InteractionEntry) => void;
  /** Authoritative update after a toggle / reconcile, marking it dirty. */
  apply: (key: string, patch: InteractionEntry) => void;
}

export function interactionKey(kind: InteractionKind, slug: string): string {
  return `${kind}:${slug}`;
}

export const useInteractionStore = create<InteractionState>((set) => ({
  entries: {},
  syncFromProps: (key, patch) =>
    set((state) => {
      const current = state.entries[key];
      if (!current) {
        return { entries: { ...state.entries, [key]: { ...patch } } };
      }
      // A local toggle wins for the rest of the session.
      if (current.dirty) return state;
      const next: InteractionEntry = { ...current };
      let changed = false;
      for (const field of ['liked', 'likeCount', 'saved'] as const) {
        if (patch[field] !== undefined && current[field] !== patch[field]) {
          (next as Record<string, unknown>)[field] = patch[field];
          changed = true;
        }
      }
      if (!changed) return state;
      return { entries: { ...state.entries, [key]: next } };
    }),
  apply: (key, patch) =>
    set((state) => ({
      entries: {
        ...state.entries,
        [key]: { ...state.entries[key], ...patch, dirty: true },
      },
    })),
}));

/** Read one item's entry (subscribes the component to its changes). */
export function useInteraction(
  kind: InteractionKind,
  slug: string,
): InteractionEntry | undefined {
  return useInteractionStore((state) => state.entries[interactionKey(kind, slug)]);
}
