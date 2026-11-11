/**
 * Shape of a self-contained site-theme module.
 *
 * Each theme lives in its own file under `lib/site-themes/` and exports one
 * object with this shape. `lib/site-themes/index.ts` collects them, and
 * `lib/site-theme.ts` derives the public option list from that registry.
 *
 * Deleting a theme is therefore a local operation: remove its module, its CSS
 * file under `app/themes/`, and its single entry in the index — nothing else
 * in the app references the theme by name.
 */
export interface SiteThemeDefinition {
  /** Stable identifier written on `<html data-theme>` and stored in settings. */
  key: string;
  /** Persian label shown in «تنظیمات ← ظاهر سایت». */
  name: string;
  /** One-line Persian description shown under the label. */
  description: string;
  /** Browser chrome colour for the light and dark colour schemes. */
  themeColor: { light: string; dark: string };
  /**
   * Optional override for the document attributes. Most themes map to
   * `data-theme="<key>"`; a skin may instead reuse another layout and add a
   * `data-skin` marker (as the Twitter skin does).
   */
  documentAttrs?: { theme: string; skin: string | null };
}
