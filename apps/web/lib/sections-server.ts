/**
 * Server-side (RSC) read of the public areas the admin has *stopped* from
 * displaying — the «نمایش» switch of a feature whose `publicSection` owns a
 * page. Used by the server-rendered pages (`/business-cards`, `/biolinks`,
 * `/pulse/[id]`, …) and the home page so they can refuse to render a stopped
 * section, and by `FeatureNoticeBar` on the client.
 *
 * The list is short and only changes when the admin flips a switch, so a
 * short revalidation keeps the SSR snapshot fresh without extra load.
 */

import { SERVER_API_URL } from './site';
import {
  EMPTY_FEATURES,
  type PublicFeatures,
  type StoppedSection,
} from './features-store';

export type { StoppedSection } from './features-store';

/**
 * Server-side read of the whole public feature snapshot. The root layout seeds
 * the shared feature store with it so the server-rendered header already hides
 * the nav entries of disabled/stopped sections (no flash on first paint).
 */
export async function getPublicFeatureSnapshot(): Promise<PublicFeatures> {
  try {
    const response = await fetch(`${SERVER_API_URL}/settings/public`, {
      next: { revalidate: 10, tags: ['public-features'] },
    });
    if (!response.ok) return EMPTY_FEATURES;
    const payload = (await response.json()) as {
      data?: Partial<PublicFeatures> | null;
    };
    const data = payload.data ?? {};
    return {
      features: data.features ?? {},
      featureVisibility: data.featureVisibility ?? {},
      hiddenNavHrefs: data.hiddenNavHrefs ?? [],
      stoppedSections: data.stoppedSections ?? [],
      featureNoticeEnabled: data.featureNoticeEnabled !== false,
    };
  } catch {
    return EMPTY_FEATURES;
  }
}

export async function getStoppedSections(): Promise<StoppedSection[]> {
  try {
    const response = await fetch(`${SERVER_API_URL}/settings/public`, {
      next: { revalidate: 10 },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as {
      data: { stoppedSections?: StoppedSection[] } | null;
    };
    return payload.data?.stoppedSections ?? [];
  } catch {
    return [];
  }
}

/** Whether a public route prefix is stopped right now. */
export function isRouteStopped(
  sections: StoppedSection[],
  route: string,
): boolean {
  return sections.some((section) => section.routes.includes(route));
}

/** The user-facing name of a stopped section, for the disabled screen. */
export function stoppedSectionName(
  sections: StoppedSection[],
  route: string,
): string | null {
  const section = sections.find((entry) => entry.routes.includes(route));
  return section?.name ?? null;
}
