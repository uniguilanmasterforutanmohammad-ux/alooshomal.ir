export const DIRECTORY_PAGE_SIZE_KEY = 'directoryPageSize';
export const DEFAULT_DIRECTORY_PAGE_SIZE = 10;
/**
 * How the public directories display their results:
 *   - `PAGINATION` — classic prev/next pagination
 *   - `INFINITE`   — load more results as the visitor scrolls
 */
export const DIRECTORY_DISPLAY_MODE_KEY = 'directoryDisplayMode';
export const DIRECTORY_DISPLAY_MODES = ['PAGINATION', 'INFINITE'] as const;
export type DirectoryDisplayMode = (typeof DIRECTORY_DISPLAY_MODES)[number];
export const DEFAULT_DIRECTORY_DISPLAY_MODE: DirectoryDisplayMode = 'PAGINATION';

/**
 * The looks each public directory can render in (mirrors `DirectoryView` on the
 * web side). The admin may enable/disable each one per directory.
 */
export const DIRECTORY_VIEW_KEYS = ['list', 'tiles', 'notebook'] as const;
export type DirectoryViewKey = (typeof DIRECTORY_VIEW_KEYS)[number];
export const BUSINESS_CARD_VIEWS_KEY = 'businessCardDirectoryViews';
export const DEFAULT_BUSINESS_CARD_VIEWS: DirectoryViewKey[] = [
  'list',
  'tiles',
  'notebook',
];
export const BIOLINK_VIEWS_KEY = 'biolinkDirectoryViews';
export const DEFAULT_BIOLINK_VIEWS: DirectoryViewKey[] = ['list', 'tiles'];

export const ADMIN_LIST_PAGE_SIZE_KEY = 'adminListPageSize';
export const DEFAULT_ADMIN_LIST_PAGE_SIZE = 10;
/** Page size for the user's own lists (my biolinks / cards / saved / boost). */
export const MY_LIST_PAGE_SIZE_KEY = 'myListPageSize';
export const DEFAULT_MY_LIST_PAGE_SIZE = 12;

/** How many months of system activity logs to keep (older rows are pruned). */
export const ACTIVITY_RETENTION_MONTHS_KEY = 'activityRetentionMonths';
export const DEFAULT_ACTIVITY_RETENTION_MONTHS = 6;

// ---------------------------------------------------------------------------
//  «تبلیغات» (home-page advertising) + boost («پله») duration
// ---------------------------------------------------------------------------

/** How many days an approved ad keeps showing in the home-page ad box. */
export const AD_DURATION_DAYS_KEY = 'adDurationDays';
export const DEFAULT_AD_DURATION_DAYS = 30;

/**
 * How many ads the home-page ad box shows per day. Approved ads are rotated
 * deterministically each day so every advertiser gets a fair share instead of
 * the newest ad hogging the single slot forever.
 */
export const AD_DAILY_SLOTS_KEY = 'adDailySlots';
export const DEFAULT_AD_DAILY_SLOTS = 1;

/** How many days an approved boost («پله») keeps an item pinned at the top. */
export const BOOST_DURATION_DAYS_KEY = 'boostDurationDays';
export const DEFAULT_BOOST_DURATION_DAYS = 7;

/**
 * How many days an approved «تبلیغ در دایرکتوری» keeps an item at the top of
 * its city+business directory slice. This is a paid, targeted ad — distinct
 * from a free/quota-based «پله».
 */
export const AD_DIRECTORY_DURATION_DAYS_KEY = 'adDirectoryDurationDays';
export const DEFAULT_AD_DIRECTORY_DURATION_DAYS = 30;

/**
 * Unit prices (in Toman) for the paid products. Since the PayPing gateway was
 * wired up, these are what `RequestPaymentsService` actually charges before a
 * «پله»/ad request reaches admin review; the revenue report also multiplies
 * them by the number of approved transactions per model. When the gateway is
 * off they remain estimation-only figures.
 */
export const BOOST_PRICE_KEY = 'boostPrice';
export const DEFAULT_BOOST_PRICE = 50_000;
export const AD_HOME_PRICE_KEY = 'adHomePrice';
export const DEFAULT_AD_HOME_PRICE = 150_000;
export const AD_DIRECTORY_PRICE_KEY = 'adDirectoryPrice';
export const DEFAULT_AD_DIRECTORY_PRICE = 100_000;

/**
 * Price (Toman) charged for tagging one of the author's own cards/biolinks on
 * a feed post. Publishing a feed post is free; the tag is the paid extra. No
 * gateway is wired yet, so an admin confirms the payment manually.
 */
export const FEED_TAG_PRICE_KEY = 'feedTagPrice';
export const DEFAULT_FEED_TAG_PRICE = 20_000;
export const MAX_PRICE = 1_000_000_000;

/**
 * How many days a user has to settle the negative wallet balance. The admin
 * chooses this period; the due date is set when the first charge of a cycle is
 * recorded and cleared after the single settlement payment.
 */
export const WALLET_SETTLEMENT_DAYS_KEY = 'walletSettlementDays';
export const DEFAULT_WALLET_SETTLEMENT_DAYS = 7;

// ---------------------------------------------------------------------------
//  «امتیاز» (points) — earned by approved «نبض شهر» news, spent on rewards
// ---------------------------------------------------------------------------

/** Points credited to a reporter for each approved news item. */
export const POINTS_PER_NEWS_KEY = 'pointsPerNews';
export const DEFAULT_POINTS_PER_NEWS = 10;

// ---------------------------------------------------------------------------
//  «فیدها» (feed) limits
// ---------------------------------------------------------------------------

/** Max number of images allowed on a single feed post. */
export const FEED_MAX_IMAGES_KEY = 'feedMaxImages';
export const DEFAULT_FEED_MAX_IMAGES = 5;

/** Max size (in KB) allowed for each feed image. */
export const FEED_MAX_IMAGE_KB_KEY = 'feedMaxImageKb';
export const DEFAULT_FEED_MAX_IMAGE_KB = 2048;

// ---------------------------------------------------------------------------
//  «نبض شهر» news settings
// ---------------------------------------------------------------------------

/** How many headlines the home-page «نبض شهر» table shows. */
export const NEWS_HEADLINE_COUNT_KEY = 'newsHeadlineCount';
export const DEFAULT_NEWS_HEADLINE_COUNT = 6;

/**
 * Who may file news once approved as a reporter:
 *   - `REPORTERS_ONLY` — only users whose role is CITIZEN_REPORTER
 *   - `ANY_ACTIVE_USER` — any active logged-in user
 *   - `ADMINS_ONLY`     — only admins (reporters are effectively paused)
 */
export const NEWS_ACCESS_LEVEL_KEY = 'newsAccessLevel';
export const NEWS_ACCESS_LEVELS = [
  'REPORTERS_ONLY',
  'ANY_ACTIVE_USER',
  'ADMINS_ONLY',
] as const;
export type NewsAccessLevel = (typeof NEWS_ACCESS_LEVELS)[number];
export const DEFAULT_NEWS_ACCESS_LEVEL: NewsAccessLevel = 'REPORTERS_ONLY';

/**
 * Global kill-switches the admin can flip while load-testing the platform, so
 * no real user can accidentally create content among thousands of imported
 * test rows.
 */
export const ALLOW_BIOLINK_CREATION_KEY = 'allowBiolinkCreation';
export const ALLOW_CARD_CREATION_KEY = 'allowBusinessCardCreation';

export interface CreationLocks {
  allowBiolinkCreation: boolean;
  allowBusinessCardCreation: boolean;
}

// ---------------------------------------------------------------------------
//  «حالت نمایش» بیولینک (biolink display templates)
// ---------------------------------------------------------------------------

/**
 * The display templates a biolink can use, mirroring
 * `apps/web/lib/biolink-templates.ts` (the reference `biolinks.html` designs).
 * Stored per-biolink in `Biolink.template`.
 */
export const BIOLINK_TEMPLATE_KEYS = [
  'studio-nord',
  'mark-tyler',
  'sunny',
  'nails',
  'kai',
  'law',
  'razor',
  'emily',
  'aria',
  'fitness',
  'handmade',
  'fern',
  'ocean',
  'bradley',
] as const;

/**
 * Legacy template keys still stored on older records; the public page renders
 * all of them as the classic «رکورد» look, and the biolink service normalises
 * them to `record` on the next save.
 */
export const LEGACY_TEMPLATE_KEYS: string[] = [
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

export const BIOLINK_TEMPLATES_ENABLED_KEY = 'biolinkTemplatesEnabled';

export const DEFAULT_BIOLINK_TEMPLATES_ENABLED: string[] = [...BIOLINK_TEMPLATE_KEYS];

// ---------------------------------------------------------------------------
//  Site-wide visual theme («تم سایت»)
// ---------------------------------------------------------------------------

/**
 * Which site-wide design the public web app renders:
 *   - `vintage` — the original cream/terracotta «record» look (default);
 *   - `modern`  — the clean, card-based «نوین» look with light/dark modes;
 *   - `bazaar`  — the playful emerald/amber «بازارچه» look inspired by
 *                 Javaneh Bazaar (kids marketplace);
 *   - `twitter` — the flat Twitter/X skin (white/black canvas, #1d9bf0 accent)
 *                 layered on the «نوین» layout.
 *   - `kashi`   — the Persian-tile «کاشی ایرانی» look (ivory canvas, lapis,
 *                 turquoise and gold) defined in `apps/web/app/themes/kashi.css`.
 *
 * This is a global setting (not per-visitor): the admin switches it once from
 * «تنظیمات ← ظاهر سایت» and every page follows. Dark/light stays a per-visitor
 * preference handled client-side.
 */
export const SITE_THEME_KEY = 'siteTheme';
export const SITE_THEMES = [
  'vintage',
  'modern',
  'bazaar',
  'twitter',
  'kashi',
] as const;
export type SiteTheme = (typeof SITE_THEMES)[number];
export const DEFAULT_SITE_THEME: SiteTheme = 'vintage';

// ---------------------------------------------------------------------------
//  Unified user-facing feature switches («کلیدهای ویژگی»)
// ---------------------------------------------------------------------------

/**
 * One admin-controllable, user-facing feature switch.
 *
 * IMPORTANT — permanent rule (see `AGENTS.md`, «قانون ۹»): every user-facing
 * capability that a visitor/registered user can trigger must have an entry in
 * `FEATURE_FLAGS` so the admin can enable/disable it from the single
 * «ویژگی‌ها و دسترسی‌ها» panel. When you add a new such feature, add its flag
 * here (and call `isFeatureEnabled` at its server-side entry point) in the same
 * change — otherwise the feature would ship without an admin off-switch.
 *
 * Every flag automatically gets **two** admin switches:
 *   - *enabled*  (`flag.key`, default `flag.default`) — whether the capability
 *     works at all; enforced server-side via `assertFeatureEnabled`.
 *   - *visible*  (`flag.key + 'Visible'`, default `flag.visibleDefault`) —
 *     whether the feature is even shown in the site chrome (nav, CTAs, links)
 *     when it is enabled. A hidden-but-enabled feature keeps working through
 *     direct links but is not advertised anywhere (`isFeatureVisible`).
 * Adding a flag here is therefore enough to get both switches in the panel —
 * no per-feature wiring is needed for the switches themselves.
 *
 * Exemptions (always on, never gated): support tickets and all ways to contact
 * the admin/support team.
 */
export interface FeatureFlag {
  /** the `Setting.key` this flag is stored under (also its wire id). */
  key: string;
  /** admin-panel label (Persian). */
  label: string;
  /** one-line explanation shown under the label. */
  description: string;
  /** grouping header in the admin panel. */
  group: string;
  /** *enabled* value used when the admin never touched this switch. */
  default: boolean;
  /** *visible* value used when the admin never touched this switch. */
  visibleDefault?: boolean;
  /**
   * Set when this feature *owns* a public area (a page or the home-page ad
   * box). Turning its «نمایش» switch off then stops that area entirely (the
   * pages render a «موقتاً غیرفعال» screen) and raises the site-wide notice bar.
   * `routes` are the public route prefixes that belong to the section and are
   * also the nav hrefs hidden while the section is not visible.
   */
  publicSection?: FeaturePublicSection;
}

/** One stopped public area, as returned by `getStoppedSections`. */
export interface StoppedSection {
  key: string;
  name: string;
  routes: string[];
  homeBox: boolean;
}

/** A public page/area owned by one feature (see `FeatureFlag.publicSection`). */
export interface FeaturePublicSection {
  /** user-facing section name shown in the site-wide notice. */
  name: string;
  /** public route prefixes stopped while the section is hidden. */
  routes?: string[];
  /** the home-page ad box belongs to this section (no dedicated route). */
  homeBox?: boolean;
}

export const FEATURE_FLAGS: FeatureFlag[] = [
  {
    key: ALLOW_BIOLINK_CREATION_KEY,
    label: 'ساخت بیولینک توسط کاربران',
    description:
      'اگر خاموش باشد، کاربران نمی‌توانند بیولینک جدید بسازند. خاموش‌کردن «نمایش» صفحه‌ی «بیولینک‌ها» را هم متوقف می‌کند.',
    group: 'ساخت محتوا',
    default: true,
    publicSection: { name: 'بیولینک‌ها', routes: ['/biolinks'] },
  },
  {
    key: ALLOW_CARD_CREATION_KEY,
    label: 'ساخت کارت ویزیت توسط کاربران',
    description:
      'اگر خاموش باشد، کاربران نمی‌توانند کارت ویزیت جدید بسازند. خاموش‌کردن «نمایش» صفحه‌ی «کارت‌های ویزیت» را هم متوقف می‌کند.',
    group: 'ساخت محتوا',
    default: true,
    publicSection: {
      name: 'کارت‌های ویزیت',
      routes: ['/business-cards', '/categories', '/business'],
    },
  },
  {
    key: 'featureFeedPosts',
    label: 'پست کاربران (فید)',
    description:
      'اگر خاموش باشد، کاربران نمی‌توانند پست تازه منتشر کنند. خاموش‌کردن «نمایش» صفحه‌ی «پست‌های کاربران» را هم متوقف می‌کند.',
    group: 'ساخت محتوا',
    default: true,
    publicSection: { name: 'پست‌های کاربران', routes: ['/feeds'] },
  },
  {
    key: 'featureNews',
    label: 'شهروند خبرنگار (ثبت خبر)',
    description:
      'اگر خاموش باشد، ثبت خبر جدید ممکن نیست. خاموش‌کردن «نمایش» صفحه‌ی «اخبار شهر» را هم متوقف می‌کند.',
    group: 'ساخت محتوا',
    default: true,
    publicSection: { name: 'اخبار شهر', routes: ['/pulse'] },
  },
  {
    key: 'featureFeedComments',
    label: 'کامنت کاربران روی پست‌های فید',
    description:
      'اگر خاموش باشد، کاربران نمی‌توانند روی پست‌های فید کامنت بگذارند. کامنت‌ها پیش از نمایش عمومی توسط مدیر تأیید می‌شوند.',
    group: 'ساخت محتوا',
    default: true,
  },
  {
    key: 'featureBusinessReviews',
    label: 'دیدگاه و امتیاز کسب‌وکارها',
    description:
      'اگر خاموش باشد، کاربران نمی‌توانند برای کسب‌وکارها دیدگاه و امتیاز ثبت یا ویرایش کنند؛ دیدگاه‌های قبلی همچنان نمایش داده می‌شوند.',
    group: 'ساخت محتوا',
    default: true,
  },
  {
    key: 'featureBlog',
    label: 'بلاگ سایت',
    description:
      'اگر خاموش باشد، بخش «بلاگ» سایت نمایش داده نمی‌شود (صفحه، لینک منو و بخش صفحه اصلی). خاموش‌کردن «نمایش» صفحه‌ی بلاگ را متوقف می‌کند.',
    group: 'ساخت محتوا',
    default: true,
    publicSection: { name: 'بلاگ', routes: ['/blog'] },
  },
  {
    key: 'featureBoostRequests',
    label: 'درخواست پله (ارتقای جایگاه)',
    description: 'اگر خاموش باشد، کاربران نمی‌توانند درخواست پله ثبت کنند.',
    group: 'بازاریابی و تبلیغات',
    default: true,
  },
  {
    key: 'featureAdRequests',
    label: 'درخواست تبلیغ (صفحه‌ی اصلی)',
    description:
      'اگر خاموش باشد، ثبت درخواست تبلیغ برای تبلیغات صفحه‌ی اصلی ممکن نیست. خاموش‌کردن «نمایش» جعبه‌ی تبلیغات صفحه‌ی اصلی را هم پنهان می‌کند.',
    group: 'بازاریابی و تبلیغات',
    default: true,
    publicSection: { name: 'تبلیغات صفحه‌ی اصلی', homeBox: true },
  },
  {
    key: 'featureAdDirectoryRequests',
    label: 'درخواست تبلیغ در صدر دایرکتوری',
    description: 'اگر خاموش باشد، ثبت تبلیغ هدفمند در صدر لیست دایرکتوری ممکن نیست.',
    group: 'بازاریابی و تبلیغات',
    default: true,
  },
  {
    key: 'featureIdentityInquiry',
    label: 'استعلام خودکار هویت (زحل)',
    description:
      'در تکمیل پروفایل، نام و نام خانوادگی از استعلام کد ملی و تاریخ تولد (زحل) گرفته می‌شود. اگر خاموش باشد، کاربر نام را دستی وارد می‌کند.',
    group: 'احراز هویت',
    default: true,
  },
  {
    key: 'featureOnboarding',
    label: 'بخش «شروع آسان» در داشبورد کاربری',
    description:
      'بخش مجزای «شروع آسان» در داشبورد کاربر (منو + صفحه‌ی اختصاصی) شامل ویزارد مرحله‌به‌مرحله‌ی راه‌اندازی کسب‌وکار، از استعلام هویت تا تأیید مدیر. ترتیب و فهرست مراحل از تنظیمات پنل مدیریت قابل تغییر است.',
    group: 'احراز هویت',
    default: true,
  },
  {
    key: 'featureBlueTick',
    label: 'تیک آبی (احراز هویت)',
    description:
      'کاربران می‌توانند پس از تکمیل مشخصات هویتی، درخواست تیک آبی ثبت کنند؛ تأیید نهایی در پنل «زحل» انجام می‌شود.',
    group: 'احراز هویت',
    default: true,
  },
  {
    key: 'featureWallet',
    label: 'کیف پول و پرداخت یکجا',
    description:
      'هزینه استعلام‌ها و اشتراک‌ها به‌صورت بدهی در کیف پول جمع می‌شود و کاربر یک‌بار کل مبلغ را تا سررسید پرداخت می‌کند.',
    group: 'احراز هویت',
    default: true,
  },
];

export const FEATURE_FLAG_KEYS = FEATURE_FLAGS.map((flag) => flag.key);

/** Suffix appended to a flag key to build its *visibility* setting key. */
export const FEATURE_VISIBLE_SUFFIX = 'Visible';

/**
 * Whether the site-wide «توقف موقت» notice bar is shown. The bar itself is
 * driven by `stoppedSections`; this switch lets the admin keep a section
 * stopped (pages still show the disabled screen) while silencing the strip —
 * e.g. once the warning has been up long enough.
 */
export const FEATURE_NOTICE_ENABLED_KEY = 'featureNoticeEnabled';
export const DEFAULT_FEATURE_NOTICE_ENABLED = true;

// ---------------------------------------------------------------------------
//  Authentication settings
// ---------------------------------------------------------------------------

/** Admin toggle: allow sign-in/sign-up with phone + OTP. */
export const PHONE_LOGIN_ENABLED_KEY = 'authPhoneLoginEnabled';
export const DEFAULT_PHONE_LOGIN_ENABLED = true;

/** Admin toggle: allow sign-in/sign-up with email + password. */
export const EMAIL_LOGIN_ENABLED_KEY = 'authEmailLoginEnabled';
export const DEFAULT_EMAIL_LOGIN_ENABLED = true;

/**
 * Categories of admin-facing notifications. Each one can be muted from the
 * admin settings panel: a muted category is skipped at creation time, so no
 * row is written at all (this is what keeps the notifications table small
 * when the platform has thousands of users).
 */
export const ADMIN_NOTIFY_CATEGORIES = [
  'NEW_USER',
  'BIOLINK',
  'BUSINESS_CARD',
  'SUBSCRIPTION',
  'BOOST',
  'AD',
  'FEED',
  'FEED_COMMENT',
  'TICKET',
  'SECURITY',
  'SYSTEM',
] as const;
export type AdminNotifyCategory = (typeof ADMIN_NOTIFY_CATEGORIES)[number];
