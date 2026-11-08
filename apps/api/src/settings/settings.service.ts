import { ForbiddenException, Injectable, OnModuleInit } from '@nestjs/common';

import { ensureSettingsDefaults } from './settings-defaults';

import { PrismaService } from '../prisma/prisma.service';

import {
  ACTIVITY_RETENTION_MONTHS_KEY,
  ADMIN_LIST_PAGE_SIZE_KEY,
  ADMIN_NOTIFY_CATEGORIES,
  AD_DAILY_SLOTS_KEY,
  AD_DIRECTORY_DURATION_DAYS_KEY,
  AD_DIRECTORY_PRICE_KEY,
  AD_DURATION_DAYS_KEY,
  AD_HOME_PRICE_KEY,
  ALLOW_BIOLINK_CREATION_KEY,
  ALLOW_CARD_CREATION_KEY,
  AdminNotifyCategory,
  BIOLINK_TEMPLATES_ENABLED_KEY,
  BIOLINK_TEMPLATE_KEYS,
  BIOLINK_VIEWS_KEY,
  BOOST_DURATION_DAYS_KEY,
  BOOST_PRICE_KEY,
  BUSINESS_CARD_VIEWS_KEY,
  CreationLocks,
  DEFAULT_ACTIVITY_RETENTION_MONTHS,
  DEFAULT_ADMIN_LIST_PAGE_SIZE,
  DEFAULT_AD_DAILY_SLOTS,
  DEFAULT_AD_DIRECTORY_DURATION_DAYS,
  DEFAULT_AD_DIRECTORY_PRICE,
  DEFAULT_AD_DURATION_DAYS,
  DEFAULT_AD_HOME_PRICE,
  DEFAULT_BIOLINK_TEMPLATES_ENABLED,
  DEFAULT_BIOLINK_VIEWS,
  DEFAULT_BOOST_DURATION_DAYS,
  DEFAULT_BOOST_PRICE,
  DEFAULT_BUSINESS_CARD_VIEWS,
  DEFAULT_DIRECTORY_DISPLAY_MODE,
  DEFAULT_DIRECTORY_PAGE_SIZE,
  DEFAULT_EMAIL_LOGIN_ENABLED,
  DEFAULT_FEATURE_NOTICE_ENABLED,
  DEFAULT_FEED_MAX_IMAGES,
  DEFAULT_FEED_MAX_IMAGE_KB,
  DEFAULT_FEED_TAG_PRICE,
  DEFAULT_MY_LIST_PAGE_SIZE,
  DEFAULT_NEWS_ACCESS_LEVEL,
  DEFAULT_NEWS_HEADLINE_COUNT,
  DEFAULT_PHONE_LOGIN_ENABLED,
  DEFAULT_POINTS_PER_NEWS,
  DEFAULT_SITE_THEME,
  DIRECTORY_DISPLAY_MODES,
  DIRECTORY_DISPLAY_MODE_KEY,
  DIRECTORY_PAGE_SIZE_KEY,
  DIRECTORY_VIEW_KEYS,
  DirectoryDisplayMode,
  DirectoryViewKey,
  EMAIL_LOGIN_ENABLED_KEY,
  FEATURE_FLAGS,
  FEATURE_FLAG_KEYS,
  FEATURE_NOTICE_ENABLED_KEY,
  FEATURE_VISIBLE_SUFFIX,
  FEED_MAX_IMAGES_KEY,
  FEED_MAX_IMAGE_KB_KEY,
  FEED_TAG_PRICE_KEY,
  MAX_PRICE,
  MY_LIST_PAGE_SIZE_KEY,
  NEWS_ACCESS_LEVELS,
  NEWS_ACCESS_LEVEL_KEY,
  NEWS_HEADLINE_COUNT_KEY,
  NewsAccessLevel,
  PHONE_LOGIN_ENABLED_KEY,
  POINTS_PER_NEWS_KEY,
  SITE_THEMES,
  SITE_THEME_KEY,
  SiteTheme,
  StoppedSection,
} from './settings.constants';

export * from './settings.constants';

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
      await ensureSettingsDefaults(this.prisma);
    } catch {
      // table may not exist yet on a very first boot; a later boot seeds it
    }
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

  // ---- «حالت نمایش» دایرکتوری‌ها (لیست / کاشی / دفترچه) ----

  /**
   * Reads one directory's enabled view list. Unknown values are dropped, the
   * registry order is preserved, and an empty result falls back to the default
   * so a directory always has at least one look to render.
   */
  private async getDirectoryViews(
    key: string,
    fallback: DirectoryViewKey[],
  ): Promise<DirectoryViewKey[]> {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) return [...fallback];
    const stored = setting.value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry): entry is DirectoryViewKey =>
        (DIRECTORY_VIEW_KEYS as readonly string[]).includes(entry),
      );
    const ordered = (DIRECTORY_VIEW_KEYS as readonly DirectoryViewKey[]).filter(
      (view) => stored.includes(view),
    );
    return ordered.length > 0 ? ordered : [...fallback];
  }

  private async setDirectoryViews(
    key: string,
    fallback: DirectoryViewKey[],
    views: string[],
  ): Promise<DirectoryViewKey[]> {
    const clean = (DIRECTORY_VIEW_KEYS as readonly DirectoryViewKey[]).filter(
      (view) => views.includes(view),
    );
    const value = (clean.length > 0 ? clean : fallback).join(',');
    await this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return this.getDirectoryViews(key, fallback);
  }

  /** Looks enabled for the business-card directory. */
  getBusinessCardDirectoryViews(): Promise<DirectoryViewKey[]> {
    return this.getDirectoryViews(
      BUSINESS_CARD_VIEWS_KEY,
      DEFAULT_BUSINESS_CARD_VIEWS,
    );
  }

  setBusinessCardDirectoryViews(views: string[]): Promise<DirectoryViewKey[]> {
    return this.setDirectoryViews(
      BUSINESS_CARD_VIEWS_KEY,
      DEFAULT_BUSINESS_CARD_VIEWS,
      views,
    );
  }

  /** Looks enabled for the biolink directory (notebook is not offered here). */
  getBiolinkDirectoryViews(): Promise<DirectoryViewKey[]> {
    return this.getDirectoryViews(BIOLINK_VIEWS_KEY, DEFAULT_BIOLINK_VIEWS);
  }

  setBiolinkDirectoryViews(views: string[]): Promise<DirectoryViewKey[]> {
    return this.setDirectoryViews(
      BIOLINK_VIEWS_KEY,
      DEFAULT_BIOLINK_VIEWS,
      views,
    );
  }

  // ---- «حالت نمایش» بیولینک ----

  /** The template keys the admin currently allows (order follows the registry). */
  async getBiolinkTemplatesEnabled(): Promise<string[]> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: BIOLINK_TEMPLATES_ENABLED_KEY },
    });
    if (!setting) return [...DEFAULT_BIOLINK_TEMPLATES_ENABLED];
    const stored = setting.value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) =>
        (BIOLINK_TEMPLATE_KEYS as readonly string[]).includes(entry),
      );
    // Preserve the registry order and never return an empty set (the public
    // page must always have something to render).
    const ordered = (BIOLINK_TEMPLATE_KEYS as readonly string[]).filter((key) =>
      stored.includes(key),
    );
    return ordered.length > 0 ? ordered : [...DEFAULT_BIOLINK_TEMPLATES_ENABLED];
  }

  async setBiolinkTemplatesEnabled(keys: string[]): Promise<string[]> {
    const clean = (BIOLINK_TEMPLATE_KEYS as readonly string[]).filter((key) =>
      keys.includes(key),
    );
    const value = (clean.length > 0 ? clean : [...DEFAULT_BIOLINK_TEMPLATES_ENABLED]).join(
      ',',
    );
    await this.prisma.setting.upsert({
      where: { key: BIOLINK_TEMPLATES_ENABLED_KEY },
      update: { value },
      create: { key: BIOLINK_TEMPLATES_ENABLED_KEY, value },
    });
    return this.getBiolinkTemplatesEnabled();
  }

  /** The site-wide visual theme the admin picked (see `SITE_THEMES`). */
  async getSiteTheme(): Promise<SiteTheme> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: SITE_THEME_KEY },
    });
    const value = setting?.value as SiteTheme | undefined;
    return value && (SITE_THEMES as readonly string[]).includes(value)
      ? value
      : DEFAULT_SITE_THEME;
  }

  async setSiteTheme(theme: SiteTheme): Promise<SiteTheme> {
    const value = (SITE_THEMES as readonly string[]).includes(theme)
      ? theme
      : DEFAULT_SITE_THEME;
    await this.prisma.setting.upsert({
      where: { key: SITE_THEME_KEY },
      update: { value },
      create: { key: SITE_THEME_KEY, value },
    });
    return value as SiteTheme;
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

  // ---- unified feature switches ----

  /**
   * Read every user-facing feature switch as a `{ [key]: boolean }` bag.
   * A missing row falls back to the flag's declared default.
   */
  async getFeatureFlags(): Promise<Record<string, boolean>> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: FEATURE_FLAG_KEYS } },
    });
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    const values: Record<string, boolean> = {};
    for (const flag of FEATURE_FLAGS) {
      values[flag.key] = byKey.has(flag.key)
        ? byKey.get(flag.key) !== 'false'
        : flag.default;
    }
    return values;
  }

  /**
   * Read every flag's *visibility* switch as a `{ [key]: boolean }` bag, keyed
   * by the flag's own key (not the raw `…Visible` setting key).
   */
  async getFeatureVisibility(): Promise<Record<string, boolean>> {
    const visibleKeys = FEATURE_FLAG_KEYS.map((key) => key + FEATURE_VISIBLE_SUFFIX);
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: visibleKeys } },
    });
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    const values: Record<string, boolean> = {};
    for (const flag of FEATURE_FLAGS) {
      const row = byKey.get(flag.key + FEATURE_VISIBLE_SUFFIX);
      values[flag.key] = row
        ? row !== 'false'
        : (flag.visibleDefault ?? flag.default);
    }
    return values;
  }

  /** Whether one user-facing feature is currently enabled (default per flag). */
  async isFeatureEnabled(key: string): Promise<boolean> {
    const flag = FEATURE_FLAGS.find((entry) => entry.key === key);
    const fallback = flag?.default ?? true;
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return row ? row.value !== 'false' : fallback;
  }

  /**
   * Whether one user-facing feature should be *advertised* in the site chrome
   * (nav entries, CTAs, direct links) — the second admin switch. A feature can
   * be enabled but not visible, in which case it still works through direct
   * links but is not surfaced anywhere.
   */
  async isFeatureVisible(key: string): Promise<boolean> {
    // A disabled feature is never advertised, whatever the visibility switch says.
    if (!(await this.isFeatureEnabled(key))) return false;
    const flag = FEATURE_FLAGS.find((entry) => entry.key === key);
    // Unknown key: default to the enabled state so nothing unexpectedly hides.
    const fallback = flag ? (flag.visibleDefault ?? flag.default) : true;
    const row = await this.prisma.setting.findUnique({
      where: { key: key + FEATURE_VISIBLE_SUFFIX },
    });
    return row ? row.value !== 'false' : fallback;
  }

  /** Which public nav hrefs should be hidden given the current visibility flags. */
  async getHiddenNavHrefs(): Promise<string[]> {
    const hidden = new Set<string>();
    for (const flag of FEATURE_FLAGS) {
      const routes = flag.publicSection?.routes;
      if (!routes?.length) continue;
      if (await this.isFeatureVisible(flag.key)) continue;
      routes.forEach((route) => hidden.add(route));
    }
    return [...hidden];
  }

  /**
   * Public areas whose display the admin has *stopped* (their feature is not
   * visible). The public pages use this to render a «موقتاً غیرفعال» screen and
   * the notice bar uses the names to warn visitors site-wide.
   */
  async getStoppedSections(): Promise<StoppedSection[]> {
    const stopped: StoppedSection[] = [];
    for (const flag of FEATURE_FLAGS) {
      if (!flag.publicSection) continue;
      if (await this.isFeatureVisible(flag.key)) continue;
      stopped.push({
        key: flag.key,
        name: flag.publicSection.name,
        routes: flag.publicSection.routes ?? [],
        homeBox: Boolean(flag.publicSection.homeBox),
      });
    }
    return stopped;
  }

  /**
   * Persist any subset of the feature switches. Unknown keys are ignored so a
   * stray payload can never create arbitrary settings rows.
   */
  async setFeatureFlags(
    flags: Record<string, boolean | undefined>,
  ): Promise<Record<string, boolean>> {
    const writes: Promise<unknown>[] = [];
    for (const flag of FEATURE_FLAGS) {
      const value = flags[flag.key];
      if (value === undefined) continue;
      writes.push(
        this.prisma.setting.upsert({
          where: { key: flag.key },
          update: { value: value ? 'true' : 'false' },
          create: { key: flag.key, value: value ? 'true' : 'false' },
        }),
      );
    }
    await Promise.all(writes);
    return this.getFeatureFlags();
  }

  /**
   * Persist any subset of the feature *visibility* switches, keyed by the
   * flag's own key. Unknown keys are ignored.
   */
  async setFeatureVisibility(
    visibility: Record<string, boolean | undefined>,
  ): Promise<Record<string, boolean>> {
    const writes: Promise<unknown>[] = [];
    for (const flag of FEATURE_FLAGS) {
      const value = visibility[flag.key];
      if (value === undefined) continue;
      const key = flag.key + FEATURE_VISIBLE_SUFFIX;
      writes.push(
        this.prisma.setting.upsert({
          where: { key },
          update: { value: value ? 'true' : 'false' },
          create: { key, value: value ? 'true' : 'false' },
        }),
      );
    }
    await Promise.all(writes);
    return this.getFeatureVisibility();
  }

  /** Whether the site-wide «توقف موقت» notice strip is allowed to show. */
  async getFeatureNoticeEnabled(): Promise<boolean> {
    const row = await this.prisma.setting.findUnique({
      where: { key: FEATURE_NOTICE_ENABLED_KEY },
    });
    return row ? row.value !== 'false' : DEFAULT_FEATURE_NOTICE_ENABLED;
  }

  async setFeatureNoticeEnabled(value: boolean): Promise<boolean> {
    await this.prisma.setting.upsert({
      where: { key: FEATURE_NOTICE_ENABLED_KEY },
      update: { value: value ? 'true' : 'false' },
      create: { key: FEATURE_NOTICE_ENABLED_KEY, value: value ? 'true' : 'false' },
    });
    return value;
  }

  /**
   * Throw a friendly 403 when a user-facing feature has been switched off.
   * Feature services call this at their server-side entry points so a disabled
   * feature is blocked even if a client bypasses the hidden UI.
   */
  async assertFeatureEnabled(key: string, message?: string): Promise<void> {
    if (await this.isFeatureEnabled(key)) return;
    throw new ForbiddenException(
      message ?? 'این قابلیت موقتاً توسط مدیر غیرفعال شده است. لطفاً بعداً تلاش کنید.',
    );
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

  /** Whether email + password sign-in/sign-up is enabled (default ON). */
  async getEmailLoginEnabled(): Promise<boolean> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: EMAIL_LOGIN_ENABLED_KEY },
    });
    return setting ? setting.value !== 'false' : DEFAULT_EMAIL_LOGIN_ENABLED;
  }

  async setEmailLoginEnabled(value: boolean): Promise<boolean> {
    await this.prisma.setting.upsert({
      where: { key: EMAIL_LOGIN_ENABLED_KEY },
      update: { value: value ? 'true' : 'false' },
      create: { key: EMAIL_LOGIN_ENABLED_KEY, value: value ? 'true' : 'false' },
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

  /** Price (Toman) charged for tagging a card/biolink on a feed post. */
  getFeedTagPrice(): Promise<number> {
    return this.readPrice(FEED_TAG_PRICE_KEY, DEFAULT_FEED_TAG_PRICE);
  }

  setFeedTagPrice(value: number): Promise<number> {
    return this.writePrice(FEED_TAG_PRICE_KEY, value);
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
