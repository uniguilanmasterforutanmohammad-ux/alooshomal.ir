/**
 * Types for the public feature snapshot plus a small client-side cache.
 *
 * The root layout reads `GET /settings/public` on the server and hands it to
 * `FeaturesProvider` (a client context), so the server-rendered header already
 * knows the hidden nav hrefs — a disabled section never flashes in. This cache
 * is only the fallback for components rendered outside that provider.
 */

/** One public area whose display the admin has stopped. */
export interface StoppedSection {
  key: string;
  name: string;
  routes: string[];
  homeBox: boolean;
}

/** The public feature payload returned by `GET /settings/public`. */
export interface PublicFeatures {
  features: Record<string, boolean>;
  featureVisibility: Record<string, boolean>;
  /** public nav hrefs the admin has hidden (their feature is not visible). */
  hiddenNavHrefs: string[];
  /** public areas whose display is stopped right now. */
  stoppedSections: StoppedSection[];
  /** whether the site-wide «توقف موقت» notice bar may be shown. */
  featureNoticeEnabled: boolean;
}

export const EMPTY_FEATURES: PublicFeatures = {
  features: {},
  featureVisibility: {},
  hiddenNavHrefs: [],
  stoppedSections: [],
  featureNoticeEnabled: true,
};

let cached: PublicFeatures | null = null;

export function getFeaturesCache(): PublicFeatures | null {
  return cached;
}

export function setFeaturesCache(value: PublicFeatures | null): void {
  cached = value;
}
