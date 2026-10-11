import { Injectable, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export const DIRECTORY_PAGE_SIZE_KEY = 'directoryPageSize';
export const DEFAULT_DIRECTORY_PAGE_SIZE = 10;
export const ADMIN_LIST_PAGE_SIZE_KEY = 'adminListPageSize';
export const DEFAULT_ADMIN_LIST_PAGE_SIZE = 10;

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

  async all(): Promise<Record<string, string>> {
    const rows = await this.prisma.setting.findMany();
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }
}
