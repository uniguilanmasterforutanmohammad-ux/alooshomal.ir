import type { ReactNode } from 'react';

import { KashiThemePreview } from './KashiThemePreview';

/**
 * Preview components for the modular themes in `lib/site-themes/`.
 *
 * `AdminAppearanceSettings` checks this map before its built-in previews, so a
 * new theme only needs one line here (plus its own component file).
 */
export const EXTRA_THEME_PREVIEWS: Record<string, () => ReactNode> = {
  kashi: KashiThemePreview,
};
