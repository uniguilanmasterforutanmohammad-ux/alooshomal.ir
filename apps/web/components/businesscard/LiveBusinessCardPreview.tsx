'use client';

import { ThemedBusinessCard } from './ThemedBusinessCard';
import type { BusinessCardFormValues } from './BusinessCardForm';
import type { TaxonomyItem } from '@/lib/api';

interface Props {
  values: BusinessCardFormValues;
  cityName?: string;
  businessName?: string;
  compact?: boolean;
  editable?: boolean;
  onFieldChange?: (key: string, value: string) => void;
  cityOptions?: TaxonomyItem[];
  businessOptions?: TaxonomyItem[];
}

/**
 * Live, real-time preview of the public business card. It re-renders on every
 * keystroke and whenever the selected theme changes, so the user (and the
 * admin) always sees exactly what visitors will get.
 */
export function LiveBusinessCardPreview({
  values,
  cityName,
  businessName,
  compact,
  editable,
  onFieldChange,
  cityOptions,
  businessOptions,
}: Props) {
  return (
    <ThemedBusinessCard
      themeKey={values.template}
      data={values}
      cityName={cityName}
      businessName={businessName}
      compact={compact}
      editable={editable}
      onFieldChange={onFieldChange}
      cityOptions={cityOptions}
      businessOptions={businessOptions}
    />
  );
}
