import { Injectable, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export const DIRECTORY_PAGE_SIZE_KEY = 'directoryPageSize';
export const DEFAULT_DIRECTORY_PAGE_SIZE = 10;
export const ADMIN_LIST_PAGE_SIZE_KEY = 'adminListPageSize';
export const DEFAULT_ADMIN_LIST_PAGE_SIZE = 10;
/** Page size for the user's own lists (my biolinks / cards / saved / boost). */
export const MY_LIST_PAGE_SIZE_KEY = 'myListPageSize';
export const DEFAULT_MY_LIST_PAGE_SIZE = 12;

/** How many months of system activity logs to keep (older rows are pruned). */
export const ACTIVITY_RETENTION_MONTHS_KEY = 'activityRetentionMonths';
export const DEFAULT_ACTIVITY_RETENTION_MONTHS = 6;

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
}
