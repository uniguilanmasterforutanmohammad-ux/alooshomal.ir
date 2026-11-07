'use client';

import { useEffect, useState } from 'react';

import { api } from './api';
import { useFeaturesContext } from '@/components/layout/FeaturesProvider';
import {
  EMPTY_FEATURES as EMPTY,
  getFeaturesCache,
  setFeaturesCache,
  type PublicFeatures,
  type StoppedSection,
} from './features-store';

export type { PublicFeatures, StoppedSection } from './features-store';

/**
 * One shared, cached read of the public feature switches so the header, mobile
 * bar, footer and any CTA agree without each firing its own request.
 *
 * A feature has two independent admin switches:
 *   - *enabled*  (`features[key]`)        — the capability works at all;
 *   - *visible*  (`featureVisibility[key]`) — it is advertised in the chrome.
 * `isFeatureVisible` returns true only when the feature is both enabled and
 * visible, and `showNav` also hides any nav entry the API flagged.
 *
 * `stoppedSections` lists the public pages/areas the admin stopped; the
 * `FeatureNoticeBar` turns that into the site-wide «توقف موقت» strip.
 */
let inflight: Promise<PublicFeatures> | null = null;
const subscribers = new Set<(value: PublicFeatures) => void>();

async function load(): Promise<PublicFeatures> {
  // The root layout seeds this on the client from an inline snapshot, so the
  // first render already knows the hidden nav hrefs (no flash, no refetch).
  const cached = getFeaturesCache();
  if (cached) return cached;
  if (!inflight) {
    inflight = api
      .get<Partial<PublicFeatures>>('/settings/public')
      .then((result) => {
        const next: PublicFeatures = {
          features: result.features ?? {},
          featureVisibility: result.featureVisibility ?? {},
          hiddenNavHrefs: result.hiddenNavHrefs ?? [],
          stoppedSections: result.stoppedSections ?? [],
          featureNoticeEnabled: result.featureNoticeEnabled !== false,
        };
        setFeaturesCache(next);
        subscribers.forEach((notify) => notify(next));
        return next;
      })
      .catch(() => EMPTY);
  }
  return inflight;
}

export interface UseFeatures {
  features: Record<string, boolean>;
  featureVisibility: Record<string, boolean>;
  hiddenNavHrefs: string[];
  stoppedSections: StoppedSection[];
  featureNoticeEnabled: boolean;
  loaded: boolean;
  /** enabled *and* visible */
  isFeatureVisible: (key: string) => boolean;
  /** whether a public nav href should be shown */
  showNav: (href: string) => boolean;
  /** whether a public area (by route) has its display stopped */
  isSectionStopped: (route: string) => boolean;
}

/**
 * Subscribe to the shared public feature switches. Until the answer arrives (or
 * when the request fails) everything is treated as visible, so the site never
 * hides its own navigation because of a slow/failed settings call — the API
 * remains the source of truth and still rejects a disabled action.
 */
export function useFeatures(): UseFeatures {
  // The root layout provides the server-fetched snapshot, so the first render
  // (including SSR) already has the right hidden hrefs. Outside a provider we
  // fall back to the shared cache / a client fetch.
  const provided = useFeaturesContext();
  const [value, setValue] = useState<PublicFeatures>(
    provided ?? getFeaturesCache() ?? EMPTY,
  );
  const [loaded, setLoaded] = useState(Boolean(provided ?? getFeaturesCache()));

  useEffect(() => {
    if (provided) {
      setValue(provided);
      setLoaded(true);
      return;
    }
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
  }, [provided]);

  function isFeatureVisible(key: string): boolean {
    // Default to visible until we know otherwise.
    if (value.features[key] === false) return false;
    return value.featureVisibility[key] !== false;
  }

  function showNav(href: string): boolean {
    // A hidden route prefix also hides its variants (e.g. the notebook deep
    // link `/business-cards?view=notebook&sort=alpha` when `/business-cards` is
    // stopped), so one switch removes every link into that section.
    return !value.hiddenNavHrefs.some(
      (route) =>
        href === route ||
        href.startsWith(`${route}/`) ||
        href.startsWith(`${route}?`),
    );
  }

  function isSectionStopped(route: string): boolean {
    return value.stoppedSections.some((section) => section.routes.includes(route));
  }

  return {
    features: value.features,
    featureVisibility: value.featureVisibility,
    hiddenNavHrefs: value.hiddenNavHrefs,
    stoppedSections: value.stoppedSections,
    featureNoticeEnabled: value.featureNoticeEnabled,
    loaded,
    isFeatureVisible,
    showNav,
    isSectionStopped,
  };
}
