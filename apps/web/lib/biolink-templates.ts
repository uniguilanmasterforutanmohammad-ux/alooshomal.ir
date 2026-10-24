/**
 * «حالت‌های نمایش» بیولینک — the display templates taken from the reference
 * file `biolinks.html` (14 ready-made designs).
 *
 * Each template is a stable `key` stored on `Biolink.template` (the owner's
 * light-mode choice) and `Biolink.templateDark` (the dark-mode choice). The
 * admin can enable/disable which templates are offered and pick the default of
 * each group from the «ویژگی‌ها» settings panel; the public page lets a visitor
 * switch between the enabled templates (and between light/dark), remembering the
 * choice in `localStorage`.
 *
 * `dark` marks designs that are inherently dark (dark surface / light text), so
 * the default picked for the dark group only offers those.
 */
export interface BiolinkTemplate {
  /** stable identifier stored on the biolink */
  key: string;
  /** Persian label shown in the picker and the visitor switcher */
  name: string;
  /** whether the design is a dark one (used to group the two defaults) */
  dark: boolean;
  /** preview colours for the picker / switcher chip */
  swatch: [string, string, string];
}

export const BIOLINK_TEMPLATES: BiolinkTemplate[] = [
  { key: 'studio-nord', name: 'استودیو نورد', dark: false, swatch: ['#e5391f', '#1a0502', '#1b1b1b'] },
  { key: 'mark-tyler', name: 'مارک تایلر', dark: true, swatch: ['#1e5a6b', '#c8384c', '#3c1b3c'] },
  { key: 'sunny', name: 'سانی ساید', dark: false, swatch: ['#f6efd6', '#f0ad2a', '#5c2e0c'] },
  { key: 'nails', name: 'ناخن لولو', dark: false, swatch: ['#f9b7d3', '#c98cff', '#bcd6f9'] },
  { key: 'kai', name: 'کای ناکامورا', dark: true, swatch: ['#0f0f0f', '#4dff7a', '#1fa84a'] },
  { key: 'law', name: 'دفتر حقوقی', dark: false, swatch: ['#ffffff', '#1d2a7a', '#5d6470'] },
  { key: 'razor', name: 'ریزورویچ', dark: true, swatch: ['#141414', '#d6192f', '#f0c020'] },
  { key: 'emily', name: 'امیلی رز', dark: true, swatch: ['#1f1f1f', '#8fd3f4', '#f26a6a'] },
  { key: 'aria', name: 'آریا چن', dark: true, swatch: ['#1e1f5e', '#0d8c7e', '#155f7a'] },
  { key: 'fitness', name: 'تناسب اندام', dark: false, swatch: ['#f4955b', '#ffffff', '#3f3a36'] },
  { key: 'handmade', name: 'دست‌ساز جسیکا', dark: false, swatch: ['#8f8f8f', '#aad2eb', '#7fa86a'] },
  { key: 'fern', name: 'سرخس و فولی', dark: false, swatch: ['#e8dcb4', '#4f6b4c', '#2e4a2e'] },
  { key: 'ocean', name: 'موج اقیانوس', dark: true, swatch: ['#3d0f7a', '#c91fa3', '#7b1aa8'] },
  { key: 'bradley', name: 'بردلی اسمیت', dark: false, swatch: ['#f5f5f5', '#7c8a94', '#111111'] },
];

export const BIOLINK_TEMPLATE_KEYS = BIOLINK_TEMPLATES.map((t) => t.key);

/// The legacy «طیفی» theme key, kept so old records still render.
export const LEGACY_TEMPLATE_KEYS = ['vintage', 'spectrum'];

export const DEFAULT_LIGHT_TEMPLATE_KEY = 'sunny';
export const DEFAULT_DARK_TEMPLATE_KEY = 'aria';

export function isBiolinkTemplateKey(value: string | null | undefined): boolean {
  return Boolean(value && BIOLINK_TEMPLATES.some((t) => t.key === value));
}

export function biolinkTemplate(key: string | null | undefined): BiolinkTemplate | null {
  if (!key) return null;
  return BIOLINK_TEMPLATES.find((t) => t.key === key) ?? null;
}

/**
 * The templates a visitor may switch between: the admin-enabled ones. Any key
 * not recognised (legacy «طیفی»/«وینتیج») is dropped. Falls back to every
 * template so the page still renders if the settings answer is empty.
 */
export function enabledTemplates(enabledKeys: string[] | null | undefined): BiolinkTemplate[] {
  const set = new Set(enabledKeys ?? []);
  const picked = BIOLINK_TEMPLATES.filter((t) => set.has(t.key));
  return picked.length > 0 ? picked : BIOLINK_TEMPLATES;
}
