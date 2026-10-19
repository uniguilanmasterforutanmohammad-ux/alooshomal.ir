/**
 * Home-page card palette — the 14-colour "spectrum" set taken from the
 * reference business-card design (`spectrum-v8.html`).
 *
 * Every entry is a background/text pair chosen so the small card stays
 * readable. The colour of each card is picked *randomly looking* but
 * deterministically: a stable hash of the list seed plus the item index. That
 * keeps the server and client render identical (no hydration mismatch, no
 * colour flicker) while still shuffling the palette across the cards.
 */
export interface SpectrumColor {
  /** Persian label of the swatch (mirrors the reference file). */
  name: string;
  /** Card background. */
  bg: string;
  /** Card foreground (text + inner hairline border). */
  fg: string;
}

export const SPECTRUM_COLORS: SpectrumColor[] = [
  { name: 'نارنجی روشن', bg: '#fadfa3', fg: '#7f2d05' },
  { name: 'نارنجی', bg: '#ea5101', fg: '#ffffff' },
  { name: 'زرد روشن', bg: '#f9ffbd', fg: '#714302' },
  { name: 'زرد', bg: '#e3c301', fg: '#1c1a19' },
  { name: 'قهوه‌ای', bg: '#783601', fg: '#f9ffbd' },
  { name: 'صورتی روشن', bg: '#fec4e8', fg: '#8b0640' },
  { name: 'صورتی', bg: '#de026d', fg: '#ffffff' },
  { name: 'بنفش روشن', bg: '#e1c9fd', fg: '#5b0095' },
  { name: 'بنفش', bg: '#9002ee', fg: '#ffffff' },
  { name: 'آبی روشن', bg: '#c3d2ff', fg: '#33018c' },
  { name: 'آبی', bg: '#5605f1', fg: '#ffffff' },
  { name: 'فیروزه‌ای', bg: '#029b8b', fg: '#ffffff' },
  { name: 'سبز روشن', bg: '#aff8cb', fg: '#025d30' },
  { name: 'سبز', bg: '#02b44d', fg: '#ffffff' },
];

/** Small dependency-free string hash (djb2) — stable across server/client. */
export function hashString(value: string): number {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    // Multiplication (not `<< 5`) keeps the accumulator positive: a 32-bit
    // bit-shift would overflow into negatives and make the modulo negative.
    hash = (hash * 33 + value.charCodeAt(index)) % 0x7fffffff;
  }
  return hash;
}

/**
 * Colour for the card at `index` of a list seeded by `seed`.
 *
 * The offset is derived from the seed so two lists (business cards and
 * biolinks) do not start on the same colour, and `+ index` walks the palette so
 * neighbouring cards never repeat while the list is shorter than the palette.
 */
export function spectrumColorAt(seed: string, index: number): SpectrumColor {
  const start = hashString(seed) % SPECTRUM_COLORS.length;
  return SPECTRUM_COLORS[(start + index) % SPECTRUM_COLORS.length];
}

/** The theme key shared by the business-card and biolink «طیفی» theme. */
export const SPECTRUM_THEME_KEY = 'spectrum';

/** Normalise a hex colour to `#rrggbb` (lower-case), or `null` if invalid. */
function normalizeHex(value: string | null | undefined): string | null {
  if (!value) return null;
  const hex = value.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) return null;
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((char) => char + char)
          .join('')
      : hex;
  return `#${full.toLowerCase()}`;
}

/** Look up a palette entry by its background colour (exact match). */
export function spectrumColorByBg(bg: string | null | undefined): SpectrumColor | null {
  const normalized = normalizeHex(bg);
  if (!normalized) return null;
  return (
    SPECTRUM_COLORS.find((color) => color.bg.toLowerCase() === normalized) ?? null
  );
}

/** WCAG relative luminance of an `#rrggbb` colour (0 = black, 1 = white). */
function relativeLuminance(hex: string): number {
  const normalized = normalizeHex(hex) ?? '#ffffff';
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(normalized.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (
    0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  );
}

/** Readable foreground (near-black or white) for a given background colour. */
export function contrastText(bg: string | null | undefined): string {
  return relativeLuminance(bg ?? '#ffffff') > 0.55 ? '#1c1a19' : '#ffffff';
}

/**
 * Resolve the `{ bg, fg }` palette a card should render with, given its stored
 * theme and colour. Spectrum cards first look the colour up in the sample
 * palette (so they match the reference file exactly) and otherwise fall back to
 * an automatically-chosen readable foreground.
 */
export function cardPalette(options: {
  theme?: string | null;
  primaryColor?: string | null;
}): SpectrumColor {
  const bg = options.primaryColor || SPECTRUM_COLORS[0].bg;
  const preset = spectrumColorByBg(bg);
  if (preset) return preset;
  return { name: 'سفارشی', bg, fg: contrastText(bg) };
}

/**
 * Inline CSS custom properties the themed card / tile spreads onto its root so
 * the shared `.theme-spectrum` / `.bc-theme-spectrum` rules pick up the
 * owner-selected colours without a per-colour CSS class.
 */
export function spectrumStyleVars(options: {
  theme?: string | null;
  primaryColor?: string | null;
}): Record<string, string> | undefined {
  if (options.theme !== SPECTRUM_THEME_KEY) return undefined;
  const palette = cardPalette(options);
  return { '--spectrum-bg': palette.bg, '--spectrum-fg': palette.fg };
}
