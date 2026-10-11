'use client';

import { ThemedBiolink } from './ThemedBiolink';
import type { BiolinkFormValues } from './BiolinkForm';

interface Props {
  values: BiolinkFormValues;
  cityName?: string;
  businessName?: string;
  compact?: boolean;
}

/**
 * Live, real-time preview of the public biolink. It re-renders on every
 * keystroke and whenever the selected theme changes, so the user (and the
 * admin) always sees exactly what visitors will get.
 */
export function LiveBiolinkPreview({ values, cityName, businessName, compact }: Props) {
  return (
    <ThemedBiolink
      themeKey={values.template}
      data={values}
      cityName={cityName}
      businessName={businessName}
      compact={compact}
    />
  );
}
