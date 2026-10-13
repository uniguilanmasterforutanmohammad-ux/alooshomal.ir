'use client';

import { ThemedBiolink } from './ThemedBiolink';
import type { BiolinkFormValues } from './BiolinkForm';
import type { TaxonomyItem } from '@/lib/api';

interface Props {
  values: BiolinkFormValues;
  cityName?: string;
  businessName?: string;
  compact?: boolean;
  editable?: boolean;
  onFieldChange?: (key: string, value: string) => void;
  cityOptions?: TaxonomyItem[];
  businessOptions?: TaxonomyItem[];
}

/**
 * Live, real-time preview of the public biolink. It re-renders on every
 * keystroke and whenever the selected theme changes, so the user (and the
 * admin) always sees exactly what visitors will get.
 */
export function LiveBiolinkPreview({
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
    <ThemedBiolink
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
