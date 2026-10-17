import { Injectable, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

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
 * Unit prices (in Toman) for the paid products, used only to *estimate* the
 * revenue the platform earns from each approved transaction. There is no
 * payment gateway yet, so these are admin-set figures the revenue report
 * multiplies by the number of approved transactions per model.
 */
export const BOOST_PRICE_KEY = 'boostPrice';
export const DEFAULT_BOOST_PRICE = 50_000;
export const AD_HOME_PRICE_KEY = 'adHomePrice';
export const DEFAULT_AD_HOME_PRICE = 150_000;
export const AD_DIRECTORY_PRICE_KEY = 'adDirectoryPrice';
export const DEFAULT_AD_DIRECTORY_PRICE = 100_000;
export const MAX_PRICE = 1_000_000_000;

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
//  Authentication settings
// ---------------------------------------------------------------------------

/** Admin toggle: allow sign-in/sign-up with phone + OTP. */
export const PHONE_LOGIN_ENABLED_KEY = 'authPhoneLoginEnabled';
export const DEFAULT_PHONE_LOGIN_ENABLED = true;

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
  'TICKET',
  'SECURITY',
] as const;
export type AdminNotifyCategory = (typeof ADMIN_NOTIFY_CATEGORIES)[number];

const ADMIN_NOTIFY_KEY_PREFIX = 'notifyAdmin.';

/** How long a notification preference is cached before re-reading the DB. */
const NOTIFY_PREF_TTL_MS = 10_000;

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  private notifyPrefCache: {
    at: number;
    values: Record<AdminNotifyCategory, boolean>;
  } | null = null;

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureDefaults();
    } catch {
      // table may not exist yet on a very first boot; a later boot seeds it
    }
  }

  async ensureDefaults(): Promise<void> {
    await Promise.all([
      this.prisma.setting.upsert({
        where: { key: DIRECTORY_PAGE_SIZE_KEY },
        update: {},
        create: {
          key: DIRECTORY_PAGE_SIZE_KEY,
          value: String(DEFAULT_DIRECTORY_PAGE_SIZE),
        },
      }),
      this.prisma.setting.upsert({
        where: { key: ADMIN_LIST_PAGE_SIZE_KEY },
        update: {},
        create: {
          key: ADMIN_LIST_PAGE_SIZE_KEY,
          value: String(DEFAULT_ADMIN_LIST_PAGE_SIZE),
        },
      }),
      this.prisma.setting.upsert({
        where: { key: DIRECTORY_DISPLAY_MODE_KEY },
        update: {},
        create: {
          key: DIRECTORY_DISPLAY_MODE_KEY,
          value: DEFAULT_DIRECTORY_DISPLAY_MODE,
        },
      }),
      this.prisma.setting.upsert({
        where: { key: MY_LIST_PAGE_SIZE_KEY },
        update: {},
        create: {
          key: MY_LIST_PAGE_SIZE_KEY,
          value: String(DEFAULT_MY_LIST_PAGE_SIZE),
        },
      }),
      this.prisma.setting.upsert({
        where: { key: ACTIVITY_RETENTION_MONTHS_KEY },
        update: {},
        create: {
          key: ACTIVITY_RETENTION_MONTHS_KEY,
          value: String(DEFAULT_ACTIVITY_RETENTION_MONTHS),
        },
      }),
      this.prisma.setting.upsert({
        where: { key: ALLOW_BIOLINK_CREATION_KEY },
        update: {},
        create: { key: ALLOW_BIOLINK_CREATION_KEY, value: 'true' },
      }),
      this.prisma.setting.upsert({
        where: { key: ALLOW_CARD_CREATION_KEY },
        update: {},
        create: { key: ALLOW_CARD_CREATION_KEY, value: 'true' },
      }),
      this.prisma.setting.upsert({
        where: { key: NEWS_HEADLINE_COUNT_KEY },
        update: {},
        create: {
          key: NEWS_HEADLINE_COUNT_KEY,
          value: String(DEFAULT_NEWS_HEADLINE_COUNT),
        },
      }),
      this.prisma.setting.upsert({
        where: { key: NEWS_ACCESS_LEVEL_KEY },
        update: {},
        create: {
          key: NEWS_ACCESS_LEVEL_KEY,
          value: DEFAULT_NEWS_ACCESS_LEVEL,
        },
      }),
      this.prisma.setting.upsert({
        where: { key: PHONE_LOGIN_ENABLED_KEY },
        update: {},
        create: {
          key: PHONE_LOGIN_ENABLED_KEY,
          value: DEFAULT_PHONE_LOGIN_ENABLED ? 'true' : 'false',
        },
      }),
      this.prisma.setting.upsert({
        where: { key: AD_DURATION_DAYS_KEY },
        update: {},
        create: {
          key: AD_DURATION_DAYS_KEY,
          value: String(DEFAULT_AD_DURATION_DAYS),
        },
      }),
      this.prisma.setting.upsert({
        where: { key: AD_DAILY_SLOTS_KEY },
        update: {},
        create: {
          key: AD_DAILY_SLOTS_KEY,
          value: String(DEFAULT_AD_DAILY_SLOTS),
        },
      }),
      this.prisma.setting.upsert({
        where: { key: BOOST_DURATION_DAYS_KEY },
        update: {},
        create: {
          key: BOOST_DURATION_DAYS_KEY,
          value: String(DEFAULT_BOOST_DURATION_DAYS),
        },
      }),
      this.prisma.setting.upsert({
        where: { key: AD_DIRECTORY_DURATION_DAYS_KEY },
        update: {},
        create: {
          key: AD_DIRECTORY_DURATION_DAYS_KEY,
          value: String(DEFAULT_AD_DIRECTORY_DURATION_DAYS),
        },
      }),
      this.prisma.setting.upsert({
        where: { key: BOOST_PRICE_KEY },
        update: {},
        create: { key: BOOST_PRICE_KEY, value: String(DEFAULT_BOOST_PRICE) },
      }),
      this.prisma.setting.upsert({
        where: { key: AD_HOME_PRICE_KEY },
        update: {},
        create: { key: AD_HOME_PRICE_KEY, value: String(DEFAULT_AD_HOME_PRICE) },
      }),
      this.prisma.setting.upsert({
        where: { key: AD_DIRECTORY_PRICE_KEY },
        update: {},
        create: {
          key: AD_DIRECTORY_PRICE_KEY,
          value: String(DEFAULT_AD_DIRECTORY_PRICE),
        },
      }),
      this.prisma.setting.upsert({
        where: { key: POINTS_PER_NEWS_KEY },
        update: {},
        create: {
          key: POINTS_PER_NEWS_KEY,
          value: String(DEFAULT_POINTS_PER_NEWS),
        },
      }),
      this.prisma.setting.upsert({
        where: { key: FEED_MAX_IMAGES_KEY },
        update: {},
        create: {
          key: FEED_MAX_IMAGES_KEY,
          value: String(DEFAULT_FEED_MAX_IMAGES),
        },
      }),
      this.prisma.setting.upsert({
        where: { key: FEED_MAX_IMAGE_KB_KEY },
        update: {},
        create: {
          key: FEED_MAX_IMAGE_KB_KEY,
          value: String(DEFAULT_FEED_MAX_IMAGE_KB),
        },
      }),
      ...ADMIN_NOTIFY_CATEGORIES.map((category) =>
        this.prisma.setting.upsert({
          where: { key: ADMIN_NOTIFY_KEY_PREFIX + category },
          update: {},
          create: {
            key: ADMIN_NOTIFY_KEY_PREFIX + category,
            value: 'true',
          },
        }),
      ),
    ]);
  }

  async getAdminNotifyPrefs(): Promise<Record<AdminNotifyCategory, boolean>> {
    const cached = this.notifyPrefCache;
    if (cached && Date.now() - cached.at < NOTIFY_PREF_TTL_MS) {
      return cached.values;
    }
    const rows = await this.prisma.setting.findMany({
      where: { key: { startsWith: ADMIN_NOTIFY_KEY_PREFIX } },
    });
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    const values = {} as Record<AdminNotifyCategory, boolean>;
    for (const category of ADMIN_NOTIFY_CATEGORIES) {
      // Default ON: a missing row means the admin never touched this toggle.
      values[category] = byKey.get(ADMIN_NOTIFY_KEY_PREFIX + category) !== 'false';
    }
    this.notifyPrefCache = { at: Date.now(), values };
    return values;
  }

  async isAdminNotifyEnabled(category: AdminNotifyCategory): Promise<boolean> {
    const prefs = await this.getAdminNotifyPrefs();
    return prefs[category];
  }

  async setAdminNotifyPrefs(
    prefs: Partial<Record<AdminNotifyCategory, boolean>>,
  ): Promise<Record<AdminNotifyCategory, boolean>> {
    const entries = ADMIN_NOTIFY_CATEGORIES.filter(
      (category) => prefs[category] !== undefined,
    );
    await Promise.all(
      entries.map((category) =>
        this.prisma.setting.upsert({
          where: { key: ADMIN_NOTIFY_KEY_PREFIX + category },
          update: { value: prefs[category] ? 'true' : 'false' },
          create: {
            key: ADMIN_NOTIFY_KEY_PREFIX + category,
            value: prefs[category] ? 'true' : 'false',
          },
        }),
      ),
    );
    this.notifyPrefCache = null;
    return this.getAdminNotifyPrefs();
  }

  async getDirectoryPageSize(): Promise<number> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: DIRECTORY_PAGE_SIZE_KEY },
    });
    const parsed = setting ? Number(setting.value) : NaN;
    return Number.isFinite(parsed) && parsed > 0 && parsed <= 100
      ? Math.floor(parsed)
      : DEFAULT_DIRECTORY_PAGE_SIZE;
  }

  async setDirectoryPageSize(value: number): Promise<number> {
    const clamped = Math.min(100, Math.max(1, Math.floor(value)));
    await this.prisma.setting.upsert({
      where: { key: DIRECTORY_PAGE_SIZE_KEY },
      update: { value: String(clamped) },
      create: { key: DIRECTORY_PAGE_SIZE_KEY, value: String(clamped) },
    });
    return clamped;
  }

  /** How the public directories display their results (pagination vs. infinite). */
  async getDirectoryDisplayMode(): Promise<DirectoryDisplayMode> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: DIRECTORY_DISPLAY_MODE_KEY },
    });
    return setting &&
      (DIRECTORY_DISPLAY_MODES as readonly string[]).includes(setting.value)
      ? (setting.value as DirectoryDisplayMode)
      : DEFAULT_DIRECTORY_DISPLAY_MODE;
  }

  async setDirectoryDisplayMode(
    value: DirectoryDisplayMode,
  ): Promise<DirectoryDisplayMode> {
    const clean = (DIRECTORY_DISPLAY_MODES as readonly string[]).includes(value)
      ? value
      : DEFAULT_DIRECTORY_DISPLAY_MODE;
    await this.prisma.setting.upsert({
      where: { key: DIRECTORY_DISPLAY_MODE_KEY },
      update: { value: clean },
      create: { key: DIRECTORY_DISPLAY_MODE_KEY, value: clean },
    });
    return clean;
  }

  async getAdminListPageSize(): Promise<number> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: ADMIN_LIST_PAGE_SIZE_KEY },
    });
    const parsed = setting ? Number(setting.value) : NaN;
    return Number.isFinite(parsed) && parsed > 0 && parsed <= 100
      ? Math.floor(parsed)
      : DEFAULT_ADMIN_LIST_PAGE_SIZE;
  }

  async setAdminListPageSize(value: number): Promise<number> {
    const clamped = Math.min(100, Math.max(1, Math.floor(value)));
    await this.prisma.setting.upsert({
      where: { key: ADMIN_LIST_PAGE_SIZE_KEY },
      update: { value: String(clamped) },
      create: { key: ADMIN_LIST_PAGE_SIZE_KEY, value: String(clamped) },
    });
    return clamped;
  }

  /** Page size for the signed-in user's own card lists. */
  async getMyListPageSize(): Promise<number> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: MY_LIST_PAGE_SIZE_KEY },
    });
    const parsed = setting ? Number(setting.value) : NaN;
    return Number.isFinite(parsed) && parsed > 0 && parsed <= 100
      ? Math.floor(parsed)
      : DEFAULT_MY_LIST_PAGE_SIZE;
  }

  async setMyListPageSize(value: number): Promise<number> {
    const clamped = Math.min(100, Math.max(1, Math.floor(value)));
    await this.prisma.setting.upsert({
      where: { key: MY_LIST_PAGE_SIZE_KEY },
      update: { value: String(clamped) },
      create: { key: MY_LIST_PAGE_SIZE_KEY, value: String(clamped) },
    });
    return clamped;
  }

  async getActivityRetentionMonths(): Promise<number> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: ACTIVITY_RETENTION_MONTHS_KEY },
    });
    const parsed = setting ? Number(setting.value) : NaN;
    return Number.isFinite(parsed) && parsed >= 1 && parsed <= 60
      ? Math.floor(parsed)
      : DEFAULT_ACTIVITY_RETENTION_MONTHS;
  }

  async setActivityRetentionMonths(value: number): Promise<number> {
    const clamped = Math.min(60, Math.max(1, Math.floor(value)));
    await this.prisma.setting.upsert({
      where: { key: ACTIVITY_RETENTION_MONTHS_KEY },
      update: { value: String(clamped) },
      create: { key: ACTIVITY_RETENTION_MONTHS_KEY, value: String(clamped) },
    });
    return clamped;
  }

  /** Global creation locks — default ON (creation allowed). */
  async getCreationLocks(): Promise<CreationLocks> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: [ALLOW_BIOLINK_CREATION_KEY, ALLOW_CARD_CREATION_KEY] } },
    });
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    return {
      allowBiolinkCreation:
        byKey.get(ALLOW_BIOLINK_CREATION_KEY) !== 'false',
      allowBusinessCardCreation:
        byKey.get(ALLOW_CARD_CREATION_KEY) !== 'false',
    };
  }

  async setCreationLocks(locks: Partial<CreationLocks>): Promise<CreationLocks> {
    const writes: Promise<unknown>[] = [];
    if (locks.allowBiolinkCreation !== undefined) {
      writes.push(
        this.prisma.setting.upsert({
          where: { key: ALLOW_BIOLINK_CREATION_KEY },
          update: { value: locks.allowBiolinkCreation ? 'true' : 'false' },
          create: {
            key: ALLOW_BIOLINK_CREATION_KEY,
            value: locks.allowBiolinkCreation ? 'true' : 'false',
          },
        }),
      );
    }
    if (locks.allowBusinessCardCreation !== undefined) {
      writes.push(
        this.prisma.setting.upsert({
          where: { key: ALLOW_CARD_CREATION_KEY },
          update: { value: locks.allowBusinessCardCreation ? 'true' : 'false' },
          create: {
            key: ALLOW_CARD_CREATION_KEY,
            value: locks.allowBusinessCardCreation ? 'true' : 'false',
          },
        }),
      );
    }
    await Promise.all(writes);
    return this.getCreationLocks();
  }

  // ---- «نبض شهر» settings ----

  async getNewsHeadlineCount(): Promise<number> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: NEWS_HEADLINE_COUNT_KEY },
    });
    const parsed = setting ? Number(setting.value) : NaN;
    return Number.isFinite(parsed) && parsed >= 1 && parsed <= 50
      ? Math.floor(parsed)
      : DEFAULT_NEWS_HEADLINE_COUNT;
  }

  async setNewsHeadlineCount(value: number): Promise<number> {
    const clamped = Math.min(50, Math.max(1, Math.floor(value)));
    await this.prisma.setting.upsert({
      where: { key: NEWS_HEADLINE_COUNT_KEY },
      update: { value: String(clamped) },
      create: { key: NEWS_HEADLINE_COUNT_KEY, value: String(clamped) },
    });
    return clamped;
  }

  async getNewsAccessLevel(): Promise<NewsAccessLevel> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: NEWS_ACCESS_LEVEL_KEY },
    });
    const value = setting?.value as NewsAccessLevel | undefined;
    return value && (NEWS_ACCESS_LEVELS as readonly string[]).includes(value)
      ? value
      : DEFAULT_NEWS_ACCESS_LEVEL;
  }

  async setNewsAccessLevel(value: NewsAccessLevel): Promise<NewsAccessLevel> {
    const clean = (NEWS_ACCESS_LEVELS as readonly string[]).includes(value)
      ? value
      : DEFAULT_NEWS_ACCESS_LEVEL;
    await this.prisma.setting.upsert({
      where: { key: NEWS_ACCESS_LEVEL_KEY },
      update: { value: clean },
      create: { key: NEWS_ACCESS_LEVEL_KEY, value: clean },
    });
    return clean;
  }

  // ---- authentication settings ----

  /** Whether phone + OTP sign-in/sign-up is enabled (default ON). */
  async getPhoneLoginEnabled(): Promise<boolean> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: PHONE_LOGIN_ENABLED_KEY },
    });
    return setting ? setting.value !== 'false' : DEFAULT_PHONE_LOGIN_ENABLED;
  }

  async setPhoneLoginEnabled(value: boolean): Promise<boolean> {
    await this.prisma.setting.upsert({
      where: { key: PHONE_LOGIN_ENABLED_KEY },
      update: { value: value ? 'true' : 'false' },
      create: { key: PHONE_LOGIN_ENABLED_KEY, value: value ? 'true' : 'false' },
    });
    return value;
  }

  async all(): Promise<Record<string, string>> {
    const rows = await this.prisma.setting.findMany();
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  // ---- «تبلیغات» + boost duration ----

  /** How many days an approved home-page ad keeps running. */
  async getAdDurationDays(): Promise<number> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: AD_DURATION_DAYS_KEY },
    });
    const parsed = setting ? Number(setting.value) : NaN;
    return Number.isFinite(parsed) && parsed >= 1 && parsed <= 365
      ? Math.floor(parsed)
      : DEFAULT_AD_DURATION_DAYS;
  }

  async setAdDurationDays(value: number): Promise<number> {
    const clamped = Math.min(365, Math.max(1, Math.floor(value)));
    await this.prisma.setting.upsert({
      where: { key: AD_DURATION_DAYS_KEY },
      update: { value: String(clamped) },
      create: { key: AD_DURATION_DAYS_KEY, value: String(clamped) },
    });
    return clamped;
  }

  /** How many ads the home-page ad box rotates through each day. */
  async getAdDailySlots(): Promise<number> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: AD_DAILY_SLOTS_KEY },
    });
    const parsed = setting ? Number(setting.value) : NaN;
    return Number.isFinite(parsed) && parsed >= 1 && parsed <= 20
      ? Math.floor(parsed)
      : DEFAULT_AD_DAILY_SLOTS;
  }

  async setAdDailySlots(value: number): Promise<number> {
    const clamped = Math.min(20, Math.max(1, Math.floor(value)));
    await this.prisma.setting.upsert({
      where: { key: AD_DAILY_SLOTS_KEY },
      update: { value: String(clamped) },
      create: { key: AD_DAILY_SLOTS_KEY, value: String(clamped) },
    });
    return clamped;
  }

  /** How many days an approved boost («پله») keeps an item at the top. */
  async getBoostDurationDays(): Promise<number> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: BOOST_DURATION_DAYS_KEY },
    });
    const parsed = setting ? Number(setting.value) : NaN;
    return Number.isFinite(parsed) && parsed >= 1 && parsed <= 365
      ? Math.floor(parsed)
      : DEFAULT_BOOST_DURATION_DAYS;
  }

  async setBoostDurationDays(value: number): Promise<number> {
    const clamped = Math.min(365, Math.max(1, Math.floor(value)));
    await this.prisma.setting.upsert({
      where: { key: BOOST_DURATION_DAYS_KEY },
      update: { value: String(clamped) },
      create: { key: BOOST_DURATION_DAYS_KEY, value: String(clamped) },
    });
    return clamped;
  }

  /** How many days an approved directory ad keeps an item at the top. */
  async getAdDirectoryDurationDays(): Promise<number> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: AD_DIRECTORY_DURATION_DAYS_KEY },
    });
    const parsed = setting ? Number(setting.value) : NaN;
    return Number.isFinite(parsed) && parsed >= 1 && parsed <= 365
      ? Math.floor(parsed)
      : DEFAULT_AD_DIRECTORY_DURATION_DAYS;
  }

  async setAdDirectoryDurationDays(value: number): Promise<number> {
    const clamped = Math.min(365, Math.max(1, Math.floor(value)));
    await this.prisma.setting.upsert({
      where: { key: AD_DIRECTORY_DURATION_DAYS_KEY },
      update: { value: String(clamped) },
      create: { key: AD_DIRECTORY_DURATION_DAYS_KEY, value: String(clamped) },
    });
    return clamped;
  }

  // ---- unit prices (used by the revenue estimate report) ----

  private async readPrice(key: string, fallback: number): Promise<number> {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    const parsed = setting ? Number(setting.value) : NaN;
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= MAX_PRICE
      ? Math.floor(parsed)
      : fallback;
  }

  private async writePrice(key: string, value: number): Promise<number> {
    const clamped = Math.min(MAX_PRICE, Math.max(0, Math.floor(value)));
    await this.prisma.setting.upsert({
      where: { key },
      update: { value: String(clamped) },
      create: { key, value: String(clamped) },
    });
    return clamped;
  }

  /** Price (Toman) charged for one «پله» boost. */
  getBoostPrice(): Promise<number> {
    return this.readPrice(BOOST_PRICE_KEY, DEFAULT_BOOST_PRICE);
  }

  setBoostPrice(value: number): Promise<number> {
    return this.writePrice(BOOST_PRICE_KEY, value);
  }

  /** Price (Toman) charged for one home-page ad. */
  getAdHomePrice(): Promise<number> {
    return this.readPrice(AD_HOME_PRICE_KEY, DEFAULT_AD_HOME_PRICE);
  }

  setAdHomePrice(value: number): Promise<number> {
    return this.writePrice(AD_HOME_PRICE_KEY, value);
  }

  /** Price (Toman) charged for one directory ad. */
  getAdDirectoryPrice(): Promise<number> {
    return this.readPrice(AD_DIRECTORY_PRICE_KEY, DEFAULT_AD_DIRECTORY_PRICE);
  }

  setAdDirectoryPrice(value: number): Promise<number> {
    return this.writePrice(AD_DIRECTORY_PRICE_KEY, value);
  }

  /** Points credited per approved «نبض شهر» news item. */
  async getPointsPerNews(): Promise<number> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: POINTS_PER_NEWS_KEY },
    });
    const parsed = setting ? Number(setting.value) : NaN;
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100000
      ? Math.floor(parsed)
      : DEFAULT_POINTS_PER_NEWS;
  }

  async setPointsPerNews(value: number): Promise<number> {
    const clamped = Math.min(100000, Math.max(0, Math.floor(value)));
    await this.prisma.setting.upsert({
      where: { key: POINTS_PER_NEWS_KEY },
      update: { value: String(clamped) },
      create: { key: POINTS_PER_NEWS_KEY, value: String(clamped) },
    });
    return clamped;
  }

  /** Max images per feed post (1–20). */
  async getFeedMaxImages(): Promise<number> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: FEED_MAX_IMAGES_KEY },
    });
    const parsed = setting ? Number(setting.value) : NaN;
    return Number.isFinite(parsed) && parsed >= 1 && parsed <= 20
      ? Math.floor(parsed)
      : DEFAULT_FEED_MAX_IMAGES;
  }

  async setFeedMaxImages(value: number): Promise<number> {
    const clamped = Math.min(20, Math.max(1, Math.floor(value)));
    await this.prisma.setting.upsert({
      where: { key: FEED_MAX_IMAGES_KEY },
      update: { value: String(clamped) },
      create: { key: FEED_MAX_IMAGES_KEY, value: String(clamped) },
    });
    return clamped;
  }

  /** Max size of each feed image, in KB (64 KB – 20 MB). */
  async getFeedMaxImageKb(): Promise<number> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: FEED_MAX_IMAGE_KB_KEY },
    });
    const parsed = setting ? Number(setting.value) : NaN;
    return Number.isFinite(parsed) && parsed >= 64 && parsed <= 20480
      ? Math.floor(parsed)
      : DEFAULT_FEED_MAX_IMAGE_KB;
  }

  async setFeedMaxImageKb(value: number): Promise<number> {
    const clamped = Math.min(20480, Math.max(64, Math.floor(value)));
    await this.prisma.setting.upsert({
      where: { key: FEED_MAX_IMAGE_KB_KEY },
      update: { value: String(clamped) },
      create: { key: FEED_MAX_IMAGE_KB_KEY, value: String(clamped) },
    });
    return clamped;
  }
}
