/**
 * «حالت‌های نمایش» بیولینک — the display modes a public biolink can use.
 *
 * There are two kinds of mode:
 *   - `record`  — the classic «رکورد» look (cream paper, dashed accent frame,
 *     labelled icon rows). This is the long-standing style every biolink had
 *     before the new designs, and it always stays available.
 *   - a ready-made design key from the reference file `biolinks.html`, which the
 *     owner picks while building and the admin can enable/disable.
 *
 * A published biolink therefore has **two** view modes at most: the classic
 * `record` design plus the owner's chosen design. The visitor can switch between
 * them (remembered per biolink in `localStorage`).
 *
 * The keys are stored on `Biolink.template`. Legacy values («classic»,
 * «vintage», «spectrum», …) are treated as `record` so old records keep the
 * classic look.
 */
export interface BiolinkTemplate {
  /** stable identifier stored on the biolink */
  key: string;
  /** Persian label shown in the picker and the visitor switcher */
  name: string;
  /** whether the design is a dark one (dark surface / light text) */
  dark: boolean;
  /** preview colours for the picker / switcher chip */
  swatch: [string, string, string];
}

/** The classic «رکورد» design — always available, never disabled by the admin. */
export const RECORD_TEMPLATE_KEY = 'record';

export const RECORD_TEMPLATE: BiolinkTemplate = {
  key: RECORD_TEMPLATE_KEY,
  name: 'کلاسیک (رکورد)',
  dark: false,
  swatch: ['#8b3a1a', '#f2e8d9', '#3a281c'],
};

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

/** Every design key the admin can enable/disable (excludes the classic record). */
export const BIOLINK_TEMPLATE_KEYS = BIOLINK_TEMPLATES.map((t) => t.key);

/** Legacy template keys still found on old records; all map to `record`. */
export const LEGACY_TEMPLATE_KEYS = [
  'classic',
  'vintage',
  'spectrum',
  'paper-editorial',
  'aurora',
  'dark-academia',
  'monochrome',
  'clay-3d',
  'glassmorphism',
  'neo-brutalism',
  'swiss-minimal',
  'dark-gradient',
  'soft-pastel',
  'retro-terminal',
  'neumorphism',
  'neon-cyberpunk',
  'dark-luxury',
  'vibrant-gradient',
  'gold-foil',
  'watercolor',
  'art-deco',
  'corporate-clean',
  'nature-organic',
  'typographic',
];

export const DEFAULT_TEMPLATE_KEY = RECORD_TEMPLATE_KEY;

/**
 * Look up a ready-made design. Returns `null` for the classic record key and
 * for any legacy/unknown value (both render as the classic record).
 */
export function biolinkTemplate(key: string | null | undefined): BiolinkTemplate | null {
  if (!key) return null;
  return BIOLINK_TEMPLATES.find((t) => t.key === key) ?? null;
}

/**
 * The view modes a published biolink exposes to visitors: the classic record
 * plus the owner's chosen design (when it is a ready-made one). Deduplicated.
 */
export function biolinkViewModes(template: string | null | undefined): BiolinkTemplate[] {
  const modes: BiolinkTemplate[] = [RECORD_TEMPLATE];
  const chosen = biolinkTemplate(template);
  if (chosen) modes.push(chosen);
  return modes;
}
