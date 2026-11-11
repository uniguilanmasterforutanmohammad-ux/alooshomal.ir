import { kashiTheme } from './kashi';
import type { SiteThemeDefinition } from './types';

/**
 * Registry of the modular themes added on top of the four built-in skins
 * (`vintage` / `modern` / `bazaar` / `twitter`).
 *
 * Adding a theme: create `lib/site-themes/<key>.ts`, its
 * `app/themes/<key>.css`, and append it here. Removing one: delete those two
 * files and this entry.
 */
export const EXTRA_SITE_THEMES = [kashiTheme] as const satisfies readonly SiteThemeDefinition[];

export type ExtraSiteTheme = (typeof EXTRA_SITE_THEMES)[number];
export type ExtraSiteThemeKey = ExtraSiteTheme['key'];

export type { SiteThemeDefinition } from './types';
