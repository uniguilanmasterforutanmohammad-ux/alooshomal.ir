'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

import { api } from '@/lib/api';
import {
  setFeaturesCache,
  type PublicFeatures,
} from '@/lib/features-store';

/**
 * Carries the server-fetched public feature snapshot through the React tree.
 *
 * The root layout (a server component) reads `GET /settings/public` and passes
 * it here, so the client components that decide what to show — `Header`,
 * `Footer`, `FeatureNoticeBar` — already know the hidden nav
 * hrefs during the *server* render. That removes the flash where a disabled
 * section briefly appeared in the header before the client fetch resolved.
 */
const FeaturesContext = createContext<PublicFeatures | null>(null);

/** Do not hit the settings endpoint more than once per this window. */
const REFRESH_INTERVAL_MS = 5_000;
/** Background poll so an idle panel still picks up an admin change. */
const POLL_INTERVAL_MS = 30_000;

function snapshotFrom(
  result: Partial<PublicFeatures>,
): PublicFeatures {
  return {
    features: result.features ?? {},
    featureVisibility: result.featureVisibility ?? {},
    hiddenNavHrefs: result.hiddenNavHrefs ?? [],
    stoppedSections: result.stoppedSections ?? [],
    featureNoticeEnabled: result.featureNoticeEnabled !== false,
  };
}

function sameSnapshot(a: PublicFeatures, b: PublicFeatures): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function FeaturesProvider({
  initial,
  children,
}: {
  initial: PublicFeatures;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [value, setValue] = useState(initial);
  const lastFetch = useRef(0);
  const inflight = useRef<Promise<void> | null>(null);

  // Seed the module cache so hooks rendered outside this provider (or before
  // it hydrates) never fall back to «everything visible».
  useEffect(() => {
    setFeaturesCache(initial);
  }, [initial]);

  const refresh = useCallback(() => {
    if (inflight.current) return inflight.current;
    const request = api
      .get<Partial<PublicFeatures>>('/settings/public')
      .then((result) => {
        const next = snapshotFrom(result);
        setFeaturesCache(next);
        setValue((previous) =>
          sameSnapshot(previous, next) ? previous : next,
        );
      })
      .catch(() => {
        // A failed refresh keeps the last known snapshot. The API is still the
        // source of truth for every action, so this is a display-only fallback.
      })
      .finally(() => {
        inflight.current = null;
        lastFetch.current = Date.now();
      });
    inflight.current = request;
    return request;
  }, []);

  // Re-read the admin switches on (throttled) navigation so a feature that was
  // turned off in another tab disappears from the open panel without a reload.
  useEffect(() => {
    if (lastFetch.current === 0 || Date.now() - lastFetch.current >= REFRESH_INTERVAL_MS) {
      void refresh();
    }
  }, [pathname, refresh]);

  // Returning to the tab is the moment an admin change is most likely waiting.
  useEffect(() => {
    function onVisible() {
      if (!document.hidden) void refresh();
    }
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, POLL_INTERVAL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [refresh]);

  return (
    <FeaturesContext.Provider value={value}>{children}</FeaturesContext.Provider>
  );
}

export function useFeaturesContext(): PublicFeatures | null {
  return useContext(FeaturesContext);
}
