'use client';

import { useEffect, useState } from 'react';

import { api } from './api';

/** The public feature payload returned by `GET /settings/public`. */
export interface PublicFeatures {
  features: Record<string, boolean>;
  featureVisibility: Record<string, boolean>;
  /** public nav hrefs the admin has hidden (their feature is not visible). */
  hiddenNavHrefs: string[];
}

const EMPTY: PublicFeatures = {
  features: {},
  featureVisibility: {},
  hiddenNavHrefs: [],
};

/**
 * One shared, cached read of the public feature switches so the header, mobile
 * bar, footer and any CTA agree without each firing its own request.
 *
 * A feature has two independent admin switches:
 *   - *enabled*  (`features[key]`)        — the capability works at all;
 *   - *visible*  (`featureVisibility[key]`) — it is advertised in the chrome.
 * `isFeatureVisible` returns true only when the feature is both enabled and
 * visible, and `showNav` also hides any nav entry the API flagged.
 */
let cached: PublicFeatures | null = null;
let inflight: Promise<PublicFeatures> | null = null;
const subscribers = new Set<(value: PublicFeatures) => void>();

async function load(): Promise<PublicFeatures> {
  if (cached) return cached;
  if (!inflight) {
    inflight = api
      .get<Partial<PublicFeatures>>('/settings/public')
      .then((result) => {
        cached = {
          features: result.features ?? {},
          featureVisibility: result.featureVisibility ?? {},
          hiddenNavHrefs: result.hiddenNavHrefs ?? [],
        };
        subscribers.forEach((notify) => notify(cached as PublicFeatures));
        return cached;
      })
      .catch(() => EMPTY);
  }
  return inflight;
}

export interface UseFeatures {
  features: Record<string, boolean>;
  featureVisibility: Record<string, boolean>;
  hiddenNavHrefs: string[];
  loaded: boolean;
  /** enabled *and* visible */
  isFeatureVisible: (key: string) => boolean;
  /** whether a public nav href should be shown */
  showNav: (href: string) => boolean;
}

/**
 * Subscribe to the shared public feature switches. Until the answer arrives (or
 * when the request fails) everything is treated as visible, so the site never
 * hides its own navigation because of a slow/failed settings call — the API
 * remains the source of truth and still rejects a disabled action.
 */
export function useFeatures(): UseFeatures {
  const [value, setValue] = useState<PublicFeatures>(cached ?? EMPTY);
  const [loaded, setLoaded] = useState(Boolean(cached));

  useEffect(() => {
    let active = true;
    const notify = (next: PublicFeatures) => {
      if (active) setValue(next);
    };
    subscribers.add(notify);
    void load().then((next) => {
      if (active) {
        setValue(next);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
      subscribers.delete(notify);
    };
  }, []);

  function isFeatureVisible(key: string): boolean {
    // Default to visible until we know otherwise.
    if (value.features[key] === false) return false;
    return value.featureVisibility[key] !== false;
  }

  function showNav(href: string): boolean {
    return !value.hiddenNavHrefs.includes(href);
  }

  return {
    features: value.features,
    featureVisibility: value.featureVisibility,
    hiddenNavHrefs: value.hiddenNavHrefs,
    loaded,
    isFeatureVisible,
    showNav,
  };
}
