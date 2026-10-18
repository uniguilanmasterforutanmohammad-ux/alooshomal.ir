/**
 * Ready-made biolink themes.
 *
 * Each theme mirrors one of the reference biolink templates and exposes:
 *  - `key`      stable identifier stored on the biolink (`template` column)
 *  - `name`     Persian label shown in the theme dropdown
 *  - `swatch`   preview colours for the picker
 *  - `className`root class applied to the live preview / public biolink
 *
 * The actual colours live in `globals.css` under `.theme-<key>` so themes
 * stay declarative and easy to extend.
 */
export interface BiolinkTheme {
  key: string;
  name: string;
  swatch: [string, string, string];
  /** dark themes need light text on the surrounding chrome */
  dark?: boolean;
}

export const BIOLINK_THEMES: BiolinkTheme[] = [
  {
    key: 'vintage',
    name: 'وینتیج (پیش‌فرض)',
    swatch: ['#8b3a1a', '#f2e8d9', '#3a281c'],
  },
  {
    key: 'paper-editorial',
    name: 'کاغذی تحریریه',
    swatch: ['#ffffff', '#171717', '#8b5cf6'],
  },
  {
    key: 'aurora',
    name: 'شفق سبز',
    swatch: ['#0d2b2b', '#82be8d', '#f4fffa'],
    dark: true,
  },
  {
    key: 'dark-academia',
    name: 'آکادمی تاریک',
    swatch: ['#1a1008', '#c9a84c', '#f3e7ca'],
    dark: true,
  },
  {
    key: 'monochrome',
    name: 'تک‌رنگ',
    swatch: ['#ffffff', '#111111', '#555555'],
  },
  {
    key: 'clay-3d',
    name: 'خمیری سه‌بعدی',
    swatch: ['#fdf6ef', '#f3c2ad', '#382c34'],
  },
  {
    key: 'glassmorphism',
    name: 'شیشه‌ای',
    swatch: ['#7b2ff7', '#2b6cf6', '#ffffff'],
    dark: true,
  },
  {
    key: 'neo-brutalism',
    name: 'نئو بروتالیسم',
    swatch: ['#ffffff', '#ffd600', '#111111'],
  },
  {
    key: 'swiss-minimal',
    name: 'سوئیسی مینیمال',
    swatch: ['#f5f0e8', '#c8c2b8', '#242321'],
  },
  {
    key: 'dark-gradient',
    name: 'گرادیان تاریک',
    swatch: ['#0d0d14', '#9a78ff', '#f7f5ff'],
    dark: true,
  },
  {
    key: 'soft-pastel',
    name: 'پاستل نرم',
    swatch: ['#fff9f2', '#f7cdb8', '#342a32'],
  },
  {
    key: 'retro-terminal',
    name: 'ترمینال رترو',
    swatch: ['#000000', '#00ff41', '#00c934'],
    dark: true,
  },
  {
    key: 'neumorphism',
    name: 'نئومورفیسم',
    swatch: ['#e0e5ec', '#b8bec7', '#303843'],
  },
  {
    key: 'neon-cyberpunk',
    name: 'نئون سایبرپانک',
    swatch: ['#08010f', '#d46cff', '#48e8ee'],
    dark: true,
  },
];

export const DEFAULT_THEME_KEY = 'vintage';

/**
 * TEMPORARY: only the «وینتیج» theme is offered while the other looks are
 * being reworked. Everything else stays in {@link BIOLINK_THEMES} so existing
 * cards keep rendering their stored theme, but the builder hides the pickers.
 * Flip this back to `null` to re-enable every theme everywhere.
 */
export const THEME_SELECTION_LOCKED = true;

/** Themes the builder may offer to the user (locked to Vintage for now). */
export const SELECTABLE_BIOLINK_THEMES: BiolinkTheme[] = THEME_SELECTION_LOCKED
  ? BIOLINK_THEMES.filter((theme) => theme.key === DEFAULT_THEME_KEY)
  : BIOLINK_THEMES;

export function getTheme(key: string | null | undefined): BiolinkTheme {
  return (
    BIOLINK_THEMES.find((theme) => theme.key === key) ?? BIOLINK_THEMES[0]
  );
}

export function themeClassName(key: string | null | undefined): string {
  return `biolink-theme theme-${getTheme(key).key}`;
}

/**
 * Ready-made business-card themes.
 *
 * Mirrors {@link BIOLINK_THEMES} but for the `businesscard` feature: each entry
 * maps to a `.bc-theme-<key>` block in `globals.css`.
 */
export const BUSINESS_CARD_THEMES: BiolinkTheme[] = [
  {
    key: 'vintage',
    name: 'وینتیج (پیش‌فرض)',
    swatch: ['#8b3a1a', '#f2e8d9', '#3a281c'],
  },
  {
    key: 'glassmorphism',
    name: 'شیشه‌ای',
    swatch: ['#10162e', '#00d4ff', '#a855f7'],
    dark: true,
  },
  {
    key: 'neo-brutalism',
    name: 'نئو بروتالیسم',
    swatch: ['#ffffff', '#ffe600', '#000000'],
  },
  {
    key: 'swiss-minimal',
    name: 'سوئیسی مینیمال',
    swatch: ['#ffffff', '#e0e0e0', '#161616'],
  },
  {
    key: 'dark-luxury',
    name: 'لاکچری تاریک',
    swatch: ['#1a1a1a', '#c9a84c', '#f0d27b'],
    dark: true,
  },
  {
    key: 'neumorphism',
    name: 'نئومورفیسم',
    swatch: ['#e0e5ec', '#b8bec7', '#303843'],
  },
  {
    key: 'vibrant-gradient',
    name: 'گرادیان پرشور',
    swatch: ['#05b5d6', '#7434df', '#3267e9'],
    dark: true,
  },
  {
    key: 'monochrome',
    name: 'تک‌رنگ',
    swatch: ['#ffffff', '#111111', '#555555'],
  },
  {
    key: 'gold-foil',
    name: 'ورق طلا',
    swatch: ['#0d0d0d', '#c9a84c', '#f1dfb4'],
    dark: true,
  },
  {
    key: 'neon-cyberpunk',
    name: 'نئون سایبرپانک',
    swatch: ['#08010f', '#c96bff', '#48e8ee'],
    dark: true,
  },
  {
    key: 'watercolor',
    name: 'آبرنگ',
    swatch: ['#fffefa', '#48c2c3', '#e6aa78'],
  },
  {
    key: 'dark-academia',
    name: 'آکادمی تاریک',
    swatch: ['#2a1d18', '#9b806c', '#f4ecde'],
    dark: true,
  },
  {
    key: 'art-deco',
    name: 'آرت دکو',
    swatch: ['#14110b', '#c7a75e', '#e4c77f'],
    dark: true,
  },
  {
    key: 'corporate-clean',
    name: 'شرکتی تمیز',
    swatch: ['#ffffff', '#2f6fd6', '#182536'],
  },
  {
    key: 'nature-organic',
    name: 'طبیعت ارگانیک',
    swatch: ['#eef5ea', '#789678', '#203b2c'],
  },
  {
    key: 'typographic',
    name: 'تایپوگرافیک',
    swatch: ['#fffefa', '#101010', '#444444'],
  },
];

export const DEFAULT_BUSINESS_CARD_THEME_KEY = 'vintage';

/**
 * TEMPORARY: the business-card builder only offers the «وینتیج» theme (see
 * {@link THEME_SELECTION_LOCKED}). The same vintage look is applied to the
 * business card so both builders show one consistent, enabled theme.
 */
export const SELECTABLE_BUSINESS_CARD_THEMES: BiolinkTheme[] = THEME_SELECTION_LOCKED
  ? [
      {
        key: 'vintage',
        name: 'وینتیج (پیش‌فرض)',
        swatch: ['#8b3a1a', '#f2e8d9', '#3a281c'],
      },
    ]
  : BUSINESS_CARD_THEMES;

export function getBusinessCardTheme(key: string | null | undefined): BiolinkTheme {
  return (
    BUSINESS_CARD_THEMES.find((theme) => theme.key === key) ??
    BUSINESS_CARD_THEMES[0]
  );
}

export function businessCardThemeClassName(key: string | null | undefined): string {
  return `bcard-theme bc-theme-${getBusinessCardTheme(key).key}`;
}
