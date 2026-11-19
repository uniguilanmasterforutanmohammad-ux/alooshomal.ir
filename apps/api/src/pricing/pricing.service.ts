import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityService } from '../activity/activity.service';
import { PaypingService } from '../payping/payping.service';
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
  /** True when a PayPing product can be mirrored for this row. */
  paypingSyncable?: boolean;
  /** PayPing product mirrored for this row (null until synced). */
  payping?: { code: string; amount: number | null } | null;
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
  'بسته پست «اشتراک یک‌ماهه ۵ پست»',
  'بسته پست «اشتراک یک‌ماهه ۱۰ پست»',
]);

/**
 * Setting-backed prices that can be mirrored into a PayPing «آیتم مالی». The
 * admin edits the price in «قیمت خدمات» and presses «همگام‌سازی» to create (or
 * update) the matching product; the product code is stored under
 * {@link PRICING_PAYPING_PRODUCT_PREFIX} so it survives price edits.
 */
const PRICING_PAYPING_PRODUCT_PREFIX = 'payping.pricing.';
const PRICING_PAYPING_PRODUCTS: Record<
  string,
  { title: string; description: string }
> = {
  boostPrice: {
    title: 'پله (ارتقای جایگاه در لیست مشاغل) — شمالی‌کارت',
    description:
      'ارتقای جایگاه کارت/بیولینک/پست در فهرست شمالی‌کارت برای یک دوره.',
  },
  adDirectoryPrice: {
    title: 'تبلیغ در صدر دایرکتوری مشاغل — شمالی‌کارت',
    description: 'نمایش هدفمند در صدر شهر/دسته‌بندی مشاغل در دایرکتوری.',
  },
  adHomePrice: {
    title: 'تبلیغ در صفحه اول سایت — شمالی‌کارت',
    description: 'نمایش در باکس تبلیغات صفحه‌ی اصلی شمالی‌کارت.',
  },
};

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
    private readonly payping: PaypingService,
    private readonly activity: ActivityService,
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
      paypingProducts,
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
      this.getPaypingProductMap(),
    ]);

    const items: PricingItem[] = [
      {
        key: 'setting:boostPrice',
        label: 'پله (ارتقای جایگاه در لیست مشاغل)',
        group: 'بازاریابی و تبلیغات',
        description: 'هزینه‌ی هر درخواست پله برای کارت/بیولینک/پست.',
        price: boostPrice,
        source: 'SETTING',
        sourceId: 'boostPrice',
        paypingSyncable: true,
        payping: paypingProducts.boostPrice ?? null,
      },
      {
        key: 'setting:adHomePrice',
        label: 'تبلیغات در صفحه اصلی',
        group: 'بازاریابی و تبلیغات',
        description: 'هزینه‌ی نمایش در باکس تبلیغات صفحه‌ی اصلی.',
        price: adHomePrice,
        source: 'SETTING',
        sourceId: 'adHomePrice',
        paypingSyncable: true,
        payping: paypingProducts.adHomePrice ?? null,
      },
      {
        key: 'setting:adDirectoryPrice',
        label: 'ارتقای جایگاه در لیست دسته بندی مشاغل',
        group: 'بازاریابی و تبلیغات',
        description: 'هزینه‌ی نمایش هدفمند در صدر شهر/کسب‌وکار همان مورد.',
        price: adDirectoryPrice,
        source: 'SETTING',
        sourceId: 'adDirectoryPrice',
        paypingSyncable: true,
        payping: paypingProducts.adDirectoryPrice ?? null,
      },
      {
        key: 'setting:feedTagPrice',
        label: 'تگ کارت/بیولینک روی پست',
        group: 'پست‌ها',
        description: 'هزینه‌ی چسباندن کارت یا بیولینک به یک پست.',
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
        label: `بسته پست «${pkg.name}»`,
        group: 'پست‌ها',
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
      if (!pkg) throw new BadRequestException('بسته‌ی پست انتخاب‌شده یافت نشد.');
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

  private async getSettingPrice(id: string): Promise<number> {
    if (id === 'boostPrice') return this.settings.getBoostPrice();
    if (id === 'adHomePrice') return this.settings.getAdHomePrice();
    if (id === 'adDirectoryPrice') return this.settings.getAdDirectoryPrice();
    if (id === 'feedTagPrice') return this.settings.getFeedTagPrice();
    throw new BadRequestException('کلید قیمت نامعتبر است.');
  }

  private paypingProductKey(id: string) {
    return `${PRICING_PAYPING_PRODUCT_PREFIX}${id}`;
  }

  /** Parse a stored product row, tolerating the legacy plain-code format. */
  private parsePaypingProduct(
    value: string | undefined,
  ): { code: string; amount: number | null } | null {
    const raw = value?.trim();
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { code?: unknown; amount?: unknown };
      if (typeof parsed?.code === 'string' && parsed.code.trim()) {
        return {
          code: parsed.code.trim(),
          amount:
            typeof parsed.amount === 'number' && Number.isFinite(parsed.amount)
              ? parsed.amount
              : null,
        };
      }
    } catch {
      // Not JSON: fall through to the legacy plain-code format.
    }
    return { code: raw, amount: null };
  }

  /** PayPing product mirrored for each syncable setting price. */
  async getPaypingProductMap(): Promise<
    Record<string, { code: string; amount: number | null }>
  > {
    const rows = await this.prisma.setting.findMany({
      where: { key: { startsWith: PRICING_PAYPING_PRODUCT_PREFIX } },
    });
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    const map: Record<string, { code: string; amount: number | null }> = {};
    for (const id of Object.keys(PRICING_PAYPING_PRODUCTS)) {
      const parsed = this.parsePaypingProduct(
        byKey.get(this.paypingProductKey(id)),
      );
      if (parsed) map[id] = parsed;
    }
    return map;
  }

  /**
   * Mirror one setting-backed price (پله / تبلیغ دایرکتوری / تبلیغ صفحه‌ی اول)
   * into a PayPing «آیتم مالی». The amount follows the admin-set price; a cached
   * code is updated in place, and a 4xx (product deleted in the PayPing console)
   * recreates it.
   */
  async syncPaypingProduct(
    itemKey: string,
    actorId?: string,
  ): Promise<{
    key: string;
    code: string;
    amount: number;
    title: string;
    updated: boolean;
  }> {
    const [kind, id] = itemKey.split(':', 2);
    if (kind !== 'setting' || !id || !PRICING_PAYPING_PRODUCTS[id]) {
      throw new NotFoundException(
        'این ردیف قابلیت ساخت محصول در پی‌پینگ را ندارد.',
      );
    }
    const meta = PRICING_PAYPING_PRODUCTS[id];
    const price = await this.getSettingPrice(id);
    if (price <= 0) {
      throw new BadRequestException(
        'ابتدا هزینه‌ی این خدمت را ثبت کنید؛ محصول بدون مبلغ ساخته نمی‌شود.',
      );
    }
    if (price < 1000) {
      throw new BadRequestException(
        'حداقل مبلغ محصول در درگاه پی‌پینگ ۱٬۰۰۰ تومان است.',
      );
    }
    const payload = {
      title: meta.title,
      description: meta.description.slice(0, 300),
      amount: price,
      defineAmountByUser: false,
      haveTax: false,
      unlimited: true,
    };

    const stored = this.parsePaypingProduct(
      (
        await this.prisma.setting.findUnique({
          where: { key: this.paypingProductKey(id) },
        })
      )?.value,
    );
    let code: string | null = null;
    let updated = false;
    if (stored?.code) {
      try {
        await this.payping.updateProduct({ ...payload, code: stored.code });
        code = stored.code;
        updated = true;
      } catch (error) {
        const status = (error as { paypingStatus?: number } | null)
          ?.paypingStatus;
        // A 4xx means the cached product is gone (deleted in the PayPing
        // console): recreate it below.
        if (!(typeof status === 'number' && status >= 400 && status < 500)) {
          throw error;
        }
      }
    }
    if (!code) {
      // Reuse a product that already exists with this exact title (created in
      // another environment or before its code was stored) instead of
      // duplicating it.
      const existing = await this.payping
        .findProductCodeByTitle(meta.title)
        .catch(() => null);
      if (existing) {
        await this.payping.updateProduct({ ...payload, code: existing });
        code = existing;
        updated = true;
      }
    }
    if (!code) {
      const created = (await this.payping.createProduct(payload)) as {
        code?: string;
      } | null;
      if (!created?.code) {
        throw new BadGatewayException(
          'ساخت محصول در پی‌پینگ ناموفق بود؛ لطفاً دوباره تلاش کنید.',
        );
      }
      code = created.code;
    }

    await this.prisma.setting.upsert({
      where: { key: this.paypingProductKey(id) },
      create: {
        key: this.paypingProductKey(id),
        value: JSON.stringify({ code, amount: price }),
      },
      update: { value: JSON.stringify({ code, amount: price }) },
    });
    await this.activity.log({
      actor: actorId ? { id: actorId } : null,
      action: 'PRICING_PAYPING_PRODUCT_SYNCED',
      summary: `${updated ? 'به‌روزرسانی' : 'ساخت'} محصول پی‌پینگ «${meta.title}» با مبلغ ${price.toLocaleString('fa-IR')} تومان`,
      entityType: 'SETTING',
      entityId: this.paypingProductKey(id),
    });
    return { key: itemKey, code, amount: price, title: meta.title, updated };
  }
}
