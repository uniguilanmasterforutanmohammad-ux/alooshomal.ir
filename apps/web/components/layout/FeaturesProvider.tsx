'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { PublicFeatures } from '@/lib/features-store';

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

export function FeaturesProvider({
  initial,
  children,
}: {
  initial: PublicFeatures;
  children: ReactNode;
}) {
  return (
    <FeaturesContext.Provider value={initial}>{children}</FeaturesContext.Provider>
  );
}

export function useFeaturesContext(): PublicFeatures | null {
  return useContext(FeaturesContext);
}
