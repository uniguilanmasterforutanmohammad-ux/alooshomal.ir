'use client';

import { ThemedBusinessCard } from './ThemedBusinessCard';
import type { BusinessCardFormValues } from './BusinessCardForm';

interface Props {
  values: BusinessCardFormValues;
  cityName?: string;
  businessName?: string;
  compact?: boolean;
}

/**
 * Live, real-time preview of the public business card. It re-renders on every
 * keystroke and whenever the selected theme changes, so the user (and the
 * admin) always sees exactly what visitors will get.
 */
export function LiveBusinessCardPreview({ values, cityName, businessName, compact }: Props) {
  return (
    <ThemedBusinessCard
      themeKey={values.template}
      data={values}
      cityName={cityName}
      businessName={businessName}
      compact={compact}
    />
  );
}
