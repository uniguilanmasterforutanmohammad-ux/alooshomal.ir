import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MAX_PRICE, SettingsService } from '../settings/settings.service';
import { ZOHAL_SERVICES } from '../zohal/zohal.constants';
import { ZohalService } from '../zohal/zohal.service';

export type PricingSource = 'SETTING' | 'ZOHAL' | 'PLAN' | 'FEED_PACKAGE';

export interface PricingItem {
  key: string;
  label: string;
  group: string;
  description?: string;
  price: number;
  source: PricingSource;
  sourceId?: string;
  active?: boolean;
}

export interface PricingUpdate {
  key: string;
  price: number;
}

/**
 * Rows the admin still edits but that must not be advertised on the public
 * pricing page (the feature exists, but it is not part of the public offer).
 */
const HIDDEN_PUBLIC_PRICING_KEYS = new Set(['setting:feedTagPrice']);
const HIDDEN_PUBLIC_FEED_PACKAGE_LABELS = new Set([
  'بسته فید «اشتراک یک‌ماهه ۵ پست»',
  'بسته فید «اشتراک یک‌ماهه ۱۰ پست»',
]);

/**
 * Single admin catalogue of every billable item. Dynamic rows (plans, feed
 * packages, Zohal services) are merged with the fixed setting-backed prices so
 * the «اشتراک‌ها» panel can show and edit them in one place. New paid features
 * only need to be added to this registry (or to the DB-backed lists) to appear.
 */
@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly zohal: ZohalService,
  ) {}

  async list(): Promise<{
    items: PricingItem[];
    settlementDays: number;
    maxPrice: number;
    onlineOnly: boolean;
  }> {
    const [
      boostPrice,
      adHomePrice,
      adDirectoryPrice,
      feedTagPrice,
      settlementDays,
      onlineOnly,
      plans,
      packages,
      zohal,
    ] = await Promise.all([
      this.settings.getBoostPrice(),
      this.settings.getAdHomePrice(),
      this.settings.getAdDirectoryPrice(),
      this.settings.getFeedTagPrice(),
      this.settings.getWalletSettlementDays(),
      this.settings.getPaymentsOnlineOnly(),
      this.prisma.subscriptionPlan.findMany({
        orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
      }),
      this.prisma.feedPackage.findMany({
        orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
      }),
      this.zohal.listServices(),
    ]);

    const items: PricingItem[] = [
      {
        key: 'setting:boostPrice',
        label: 'پله (ارتقای جایگاه در لیست مشاغل)',
        group: 'بازاریابی و تبلیغات',
        description: 'هزینه‌ی هر درخواست پله برای کارت/بیولینک/پست فید.',
        price: boostPrice,
        source: 'SETTING',
        sourceId: 'boostPrice',
      },
      {
        key: 'setting:adHomePrice',
        label: 'تبلیغات در صفحه اصلی',
        group: 'بازاریابی و تبلیغات',
        description: 'هزینه‌ی نمایش در باکس تبلیغات صفحه‌ی اصلی.',
        price: adHomePrice,
        source: 'SETTING',
        sourceId: 'adHomePrice',
      },
      {
        key: 'setting:adDirectoryPrice',
        label: 'ارتقای جایگاه در لیست دسته بندی مشاغل',
        group: 'بازاریابی و تبلیغات',
        description: 'هزینه‌ی نمایش هدفمند در صدر شهر/کسب‌وکار همان مورد.',
        price: adDirectoryPrice,
        source: 'SETTING',
        sourceId: 'adDirectoryPrice',
      },
      {
        key: 'setting:feedTagPrice',
        label: 'تگ کارت/بیولینک روی پست فید',
        group: 'فیدها',
        description: 'هزینه‌ی چسباندن کارت یا بیولینک به یک پست فید.',
        price: feedTagPrice,
        source: 'SETTING',
        sourceId: 'feedTagPrice',
      },
      ...plans.map((plan) => ({
        key: `plan:${plan.id}`,
        label: `اشتراک «${plan.name}»`,
        group: 'اشتراک‌ها',
        description: plan.description ?? undefined,
        price: plan.price,
        source: 'PLAN' as const,
        sourceId: plan.id,
        active: plan.isActive,
      })),
      ...packages.map((pkg) => ({
        key: `feedPackage:${pkg.id}`,
        label: `بسته فید «${pkg.name}»`,
        group: 'فیدها',
        description: pkg.description ?? undefined,
        price: pkg.price,
        source: 'FEED_PACKAGE' as const,
        sourceId: pkg.id,
        active: pkg.isActive,
      })),
      ...zohal.services
        .filter(
          (service) =>
            service.price > 0 ||
            service.key === 'shahkar' ||
            service.key === 'national_identity_inquiry',
        )
        .map((service) => ({
          key: `zohal:${service.key}`,
          label: service.label,
          group: 'استعلام‌های هویتی',
          description: service.description,
          price: service.price,
          source: 'ZOHAL' as const,
          sourceId: service.key,
          active: service.enabled,
        })),
    ];

    return { items, settlementDays, maxPrice: MAX_PRICE, onlineOnly };
  }

  /**
   * Public version of the catalogue: same prices the admin edits, but with
   * inactive plans/packages/services removed so the pricing page never offers
   * something that cannot be bought or requested.
   */
  async listPublic(): Promise<{
    items: PricingItem[];
    settlementDays: number;
  }> {
    const { items, settlementDays } = await this.list();
    return {
      items: items.filter(
        (item) =>
          item.active !== false &&
          !HIDDEN_PUBLIC_PRICING_KEYS.has(item.key) &&
          !HIDDEN_PUBLIC_FEED_PACKAGE_LABELS.has(item.label),
      ),
      settlementDays,
    };
  }

  async update(
    items: PricingUpdate[],
    onlineOnly?: boolean,
  ): Promise<Awaited<ReturnType<PricingService['list']>>> {
    if (!Array.isArray(items)) {
      throw new BadRequestException('فهرست قیمت‌ها نامعتبر است.');
    }
    if (items.length === 0 && onlineOnly === undefined) {
      throw new BadRequestException('فهرست قیمت‌ها خالی است.');
    }
    for (const item of items) {
      if (!item || typeof item.key !== 'string') {
        throw new BadRequestException('کلید قیمت نامعتبر است.');
      }
      if (
        !Number.isInteger(item.price) ||
        item.price < 0 ||
        item.price > MAX_PRICE
      ) {
        throw new BadRequestException('مبلغ وارد‌شده معتبر نیست.');
      }
    }

    // Validate every key up-front so a bad row cannot leave the catalogue in a
    // half-updated state after some earlier rows were already written.
    for (const item of items) {
      await this.assertKnownKey(item.key);
    }

    for (const item of items) {
      const [kind, id] = item.key.split(':', 2);
      if (!id) throw new BadRequestException('کلید قیمت نامعتبر است.');
      if (kind === 'setting') {
        await this.updateSettingPrice(id, item.price);
      } else if (kind === 'zohal') {
        await this.zohal.setServicePrice(id, item.price);
      } else if (kind === 'plan') {
        await this.prisma.subscriptionPlan.update({
          where: { id },
          data: { price: item.price },
        });
      } else if (kind === 'feedPackage') {
        await this.prisma.feedPackage.update({
          where: { id },
          data: { price: item.price },
        });
      } else {
        throw new BadRequestException('کلید قیمت نامعتبر است.');
      }
    }
    if (onlineOnly !== undefined) {
      await this.settings.setPaymentsOnlineOnly(onlineOnly);
    }
    return this.list();
  }

  private async assertKnownKey(key: string): Promise<void> {
    const [kind, id] = key.split(':', 2);
    if (!id) throw new BadRequestException('کلید قیمت نامعتبر است.');
    if (kind === 'setting') {
      if (
        id !== 'boostPrice' &&
        id !== 'adHomePrice' &&
        id !== 'adDirectoryPrice' &&
        id !== 'feedTagPrice'
      ) {
        throw new BadRequestException('کلید قیمت نامعتبر است.');
      }
      return;
    }
    if (kind === 'zohal') {
      if (!ZOHAL_SERVICES.some((service) => service.key === id)) {
        throw new BadRequestException('کلید قیمت نامعتبر است.');
      }
      return;
    }
    if (kind === 'plan') {
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!plan) throw new BadRequestException('اشتراک انتخاب‌شده یافت نشد.');
      return;
    }
    if (kind === 'feedPackage') {
      const pkg = await this.prisma.feedPackage.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!pkg) throw new BadRequestException('بسته‌ی فید انتخاب‌شده یافت نشد.');
      return;
    }
    throw new BadRequestException('کلید قیمت نامعتبر است.');
  }

  private async updateSettingPrice(key: string, price: number): Promise<void> {
    if (key === 'boostPrice') {
      await this.settings.setBoostPrice(price);
      return;
    }
    if (key === 'adHomePrice') {
      await this.settings.setAdHomePrice(price);
      return;
    }
    if (key === 'adDirectoryPrice') {
      await this.settings.setAdDirectoryPrice(price);
      return;
    }
    if (key === 'feedTagPrice') {
      await this.settings.setFeedTagPrice(price);
      return;
    }
    throw new BadRequestException('کلید قیمت نامعتبر است.');
  }
}
