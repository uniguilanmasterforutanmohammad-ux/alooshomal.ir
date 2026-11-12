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
  BOOST_DURATION_DAYS_KEY,
  BOOST_PRICE_KEY,
  DEFAULT_ACTIVITY_RETENTION_MONTHS,
  DEFAULT_ADMIN_LIST_PAGE_SIZE,
  DEFAULT_AD_DAILY_SLOTS,
  DEFAULT_AD_DIRECTORY_DURATION_DAYS,
  DEFAULT_AD_DIRECTORY_PRICE,
  DEFAULT_AD_DURATION_DAYS,
  DEFAULT_AD_HOME_PRICE,
  DEFAULT_BOOST_DURATION_DAYS,
  DEFAULT_BOOST_PRICE,
  DEFAULT_DIRECTORY_DISPLAY_MODE,
  DEFAULT_DIRECTORY_PAGE_SIZE,
  DEFAULT_FEED_MAX_IMAGES,
  DEFAULT_FEED_MAX_IMAGE_KB,
  DEFAULT_MY_LIST_PAGE_SIZE,
  DEFAULT_NEWS_ACCESS_LEVEL,
  DEFAULT_NEWS_HEADLINE_COUNT,
  DEFAULT_PHONE_LOGIN_ENABLED,
  DEFAULT_POINTS_PER_NEWS,
  DIRECTORY_DISPLAY_MODE_KEY,
  DIRECTORY_PAGE_SIZE_KEY,
  FEATURE_FLAGS,
  FEATURE_VISIBLE_SUFFIX,
  FEED_MAX_IMAGES_KEY,
  FEED_MAX_IMAGE_KB_KEY,
  MY_LIST_PAGE_SIZE_KEY,
  NEWS_ACCESS_LEVEL_KEY,
  NEWS_HEADLINE_COUNT_KEY,
  PHONE_LOGIN_ENABLED_KEY,
  POINTS_PER_NEWS_KEY,
  DEFAULT_SUPPORT_CHAT_SMS_ENABLED,
  SUPPORT_CHAT_SMS_ENABLED_KEY,
  SUPPORT_CHAT_SMS_PHONE_KEY,
} from './settings.constants';

const ADMIN_NOTIFY_KEY_PREFIX = 'notifyAdmin.';

/**
 * Idempotent seeding of every `Setting` row with its default value. Split out of
 * `SettingsService` so the accessor surface stays focused on reads/writes.
 */
export async function ensureSettingsDefaults(
  prisma: PrismaService,
): Promise<void> {
    await Promise.all([
      prisma.setting.upsert({
        where: { key: DIRECTORY_PAGE_SIZE_KEY },
        update: {},
        create: {
          key: DIRECTORY_PAGE_SIZE_KEY,
          value: String(DEFAULT_DIRECTORY_PAGE_SIZE),
        },
      }),
      prisma.setting.upsert({
        where: { key: ADMIN_LIST_PAGE_SIZE_KEY },
        update: {},
        create: {
          key: ADMIN_LIST_PAGE_SIZE_KEY,
          value: String(DEFAULT_ADMIN_LIST_PAGE_SIZE),
        },
      }),
      prisma.setting.upsert({
        where: { key: DIRECTORY_DISPLAY_MODE_KEY },
        update: {},
        create: {
          key: DIRECTORY_DISPLAY_MODE_KEY,
          value: DEFAULT_DIRECTORY_DISPLAY_MODE,
        },
      }),
      prisma.setting.upsert({
        where: { key: MY_LIST_PAGE_SIZE_KEY },
        update: {},
        create: {
          key: MY_LIST_PAGE_SIZE_KEY,
          value: String(DEFAULT_MY_LIST_PAGE_SIZE),
        },
      }),
      prisma.setting.upsert({
        where: { key: ACTIVITY_RETENTION_MONTHS_KEY },
        update: {},
        create: {
          key: ACTIVITY_RETENTION_MONTHS_KEY,
          value: String(DEFAULT_ACTIVITY_RETENTION_MONTHS),
        },
      }),
      prisma.setting.upsert({
        where: { key: ALLOW_BIOLINK_CREATION_KEY },
        update: {},
        create: { key: ALLOW_BIOLINK_CREATION_KEY, value: 'true' },
      }),
      prisma.setting.upsert({
        where: { key: ALLOW_CARD_CREATION_KEY },
        update: {},
        create: { key: ALLOW_CARD_CREATION_KEY, value: 'true' },
      }),
      // Seed every unified feature switch from its declared default (the two
      // creation locks above are already part of `FEATURE_FLAGS`, so these
      // upserts simply no-op for them). Each flag also gets its paired
      // *visibility* row so the second admin switch has a default.
      ...FEATURE_FLAGS.flatMap((flag) => [
        prisma.setting.upsert({
          where: { key: flag.key },
          update: {},
          create: { key: flag.key, value: flag.default ? 'true' : 'false' },
        }),
        prisma.setting.upsert({
          where: { key: flag.key + FEATURE_VISIBLE_SUFFIX },
          update: {},
          create: {
            key: flag.key + FEATURE_VISIBLE_SUFFIX,
            value: (flag.visibleDefault ?? flag.default) ? 'true' : 'false',
          },
        }),
      ]),
      prisma.setting.upsert({
        where: { key: NEWS_HEADLINE_COUNT_KEY },
        update: {},
        create: {
          key: NEWS_HEADLINE_COUNT_KEY,
          value: String(DEFAULT_NEWS_HEADLINE_COUNT),
        },
      }),
      prisma.setting.upsert({
        where: { key: NEWS_ACCESS_LEVEL_KEY },
        update: {},
        create: {
          key: NEWS_ACCESS_LEVEL_KEY,
          value: DEFAULT_NEWS_ACCESS_LEVEL,
        },
      }),
      prisma.setting.upsert({
        where: { key: PHONE_LOGIN_ENABLED_KEY },
        update: {},
        create: {
          key: PHONE_LOGIN_ENABLED_KEY,
          value: DEFAULT_PHONE_LOGIN_ENABLED ? 'true' : 'false',
        },
      }),
      prisma.setting.upsert({
        where: { key: SUPPORT_CHAT_SMS_ENABLED_KEY },
        update: {},
        create: {
          key: SUPPORT_CHAT_SMS_ENABLED_KEY,
          value: DEFAULT_SUPPORT_CHAT_SMS_ENABLED ? 'true' : 'false',
        },
      }),
      prisma.setting.upsert({
        where: { key: SUPPORT_CHAT_SMS_PHONE_KEY },
        update: {},
        create: { key: SUPPORT_CHAT_SMS_PHONE_KEY, value: '' },
      }),
      prisma.setting.upsert({
        where: { key: AD_DURATION_DAYS_KEY },
        update: {},
        create: {
          key: AD_DURATION_DAYS_KEY,
          value: String(DEFAULT_AD_DURATION_DAYS),
        },
      }),
      prisma.setting.upsert({
        where: { key: AD_DAILY_SLOTS_KEY },
        update: {},
        create: {
          key: AD_DAILY_SLOTS_KEY,
          value: String(DEFAULT_AD_DAILY_SLOTS),
        },
      }),
      prisma.setting.upsert({
        where: { key: BOOST_DURATION_DAYS_KEY },
        update: {},
        create: {
          key: BOOST_DURATION_DAYS_KEY,
          value: String(DEFAULT_BOOST_DURATION_DAYS),
        },
      }),
      prisma.setting.upsert({
        where: { key: AD_DIRECTORY_DURATION_DAYS_KEY },
        update: {},
        create: {
          key: AD_DIRECTORY_DURATION_DAYS_KEY,
          value: String(DEFAULT_AD_DIRECTORY_DURATION_DAYS),
        },
      }),
      prisma.setting.upsert({
        where: { key: BOOST_PRICE_KEY },
        update: {},
        create: { key: BOOST_PRICE_KEY, value: String(DEFAULT_BOOST_PRICE) },
      }),
      prisma.setting.upsert({
        where: { key: AD_HOME_PRICE_KEY },
        update: {},
        create: { key: AD_HOME_PRICE_KEY, value: String(DEFAULT_AD_HOME_PRICE) },
      }),
      prisma.setting.upsert({
        where: { key: AD_DIRECTORY_PRICE_KEY },
        update: {},
        create: {
          key: AD_DIRECTORY_PRICE_KEY,
          value: String(DEFAULT_AD_DIRECTORY_PRICE),
        },
      }),
      prisma.setting.upsert({
        where: { key: POINTS_PER_NEWS_KEY },
        update: {},
        create: {
          key: POINTS_PER_NEWS_KEY,
          value: String(DEFAULT_POINTS_PER_NEWS),
        },
      }),
      prisma.setting.upsert({
        where: { key: FEED_MAX_IMAGES_KEY },
        update: {},
        create: {
          key: FEED_MAX_IMAGES_KEY,
          value: String(DEFAULT_FEED_MAX_IMAGES),
        },
      }),
      prisma.setting.upsert({
        where: { key: FEED_MAX_IMAGE_KB_KEY },
        update: {},
        create: {
          key: FEED_MAX_IMAGE_KB_KEY,
          value: String(DEFAULT_FEED_MAX_IMAGE_KB),
        },
      }),
      ...ADMIN_NOTIFY_CATEGORIES.map((category) =>
        prisma.setting.upsert({
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
