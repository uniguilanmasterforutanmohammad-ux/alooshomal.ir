import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  NotificationType,
  PaymentStatus,
  Prisma,
  SubscriptionPlan,
  SubscriptionPayment,
  SubscriptionStatus,
  WalletEntryKind,
} from '@prisma/client';
import { randomBytes } from 'node:crypto';

import { ActivityService } from '../activity/activity.service';
import { ApiIrService } from '../apiir/apiir.service';
import { paypingReturnBaseUrl } from '../common/app-url';
import { isValidNationalCode } from '../common/national-code';
import {
  addMonths,
  isFreePlan,
  isPlanPeriodMonths,
  planPriceForMonths,
} from '../common/plans';
import { FINANCE_SOURCE_TYPES } from '../finance/finance.constants';
import { FinanceService } from '../finance/finance.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ONBOARDING_CART_PREFIX,
  type OnboardingCartItem,
} from '../onboarding/onboarding.constants';
import { PaymentSimulatorService } from '../payping/payment-simulator.service';
import { PaypingService } from '../payping/payping.service';
import { resolvePendingBusinessPhones } from '../profile/business-identity-phones';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { WalletService } from '../wallet/wallet.service';
import { ZohalService } from '../zohal/zohal.service';
import { BusinessPackageService } from './business-package.service';
import { buildSubscriptionInvoiceLines } from './subscription-invoice';

/**
 * Online subscription payment: PayPing checkout, the payment callback and
 * paid-plan activation. Split out of the large `SubscriptionsService`.
 */
/**
 * Settings prefixes that cache PayPing product codes outside the plan table
 * (Zohal services and «مدیریت کسب‌وکار» packages). They must be dropped
 * together with the plan codes when the merchant catalogue is wiped, otherwise
 * the next «همگام‌سازی» tries to update products that no longer exist and the
 * sync fails.
 */
const ZOHAL_PRODUCT_SETTING_PREFIX = 'payping.product.zohal.';
const MANAGEMENT_PRODUCT_SETTING_PREFIX = 'businessManagementPayping:';

/** One «بسته مدیریت کسب‌وکار» bought alongside a subscription term. */
export interface BusinessAddon {
  workspaceId: string;
  packageKey: string;
  /** Persian label of the industry package, for invoices and messages. */
  label: string;
  /** Name of the business, so the buyer sees which one is covered. */
  businessName: string;
  /** Prorated price of the add-on for the covered days (Toman). */
  amount: number;
  /** Months the subscription term lasts — mirrored by the package. */
  months: number;
  /** ISO date the package expires with the subscription. */
  paidUntil: string;
}

/** One business in the add-on quote shown in the purchase cart. */
export interface BusinessAddonQuoteItem {
  workspaceId: string;
  name: string;
  industryKey: string;
  industryLabel: string;
  /** Prorated price of the management for the covered days (Toman). */
  amount: number;
  months: number;
  paidUntil: string;
  /** False when the industry has no price yet, so it cannot be added. */
  available: boolean;
  /** Existing management expiry, so a renewal can be labelled as such. */
  currentPaidUntil: string | null;
}

/** One selectable «مدیریت کسب‌وکار» package in the onboarding cart. */
export interface BusinessAddonQuotePackage {
  key: string;
  label: string;
  /** Prorated price for the covered days (Toman). */
  amount: number;
  months: number;
  /** False when the plan cannot buy it or the package has no price. */
  available: boolean;
}

/** Identity inputs of a combined checkout (plan + management + inquiry). */
export interface CheckoutIdentityInput {
  nationalCode?: string;
  birthDate?: string;
  withLicense?: boolean;
  licenseTrackingCode?: string;
}

/** Identity data snapshotted on the payment for the post-payment inquiry. */
export interface CheckoutIdentitySnapshot {
  nationalCode: string | null;
  birthDate: string | null;
  withLicense: boolean;
  licenseTrackingCode: string | null;
  /** Price of the identity/phone-match leg, so the invoice can split lines. */
  identityAmount?: number;
  /** Price of the business-license leg, so the invoice can split lines. */
  licenseAmount?: number;
}

@Injectable()
export class SubscriptionsPaymentService {
  private readonly logger = new Logger(SubscriptionsPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
    private readonly payping: PaypingService,
    private readonly simulator: PaymentSimulatorService,
    private readonly finance: FinanceService,
    private readonly settings: SettingsService,
    private readonly wallet: WalletService,
    private readonly packages: BusinessPackageService,
    private readonly zohal: ZohalService,
    private readonly apiir: ApiIrService,
  ) {}

  /** Loads a plan or throws, so payment paths never act on a missing plan. */
  private async requirePlan(id: string): Promise<SubscriptionPlan> {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('اشتراک یافت نشد');
    }
    return plan;
  }

  /** «ارتقا فقط»: moving to a lower plan is refused on the paid path too. */
  private async assertNotDowngrade(userId: string, planId: string) {
    const [user, target] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { plan: { select: { name: true, sortOrder: true } } },
      }),
      this.prisma.subscriptionPlan.findUnique({
        where: { id: planId },
        select: { sortOrder: true },
      }),
    ]);
    const current = user?.plan;
    if (!current || !target) return;
    if (target.sortOrder < current.sortOrder) {
      throw new BadRequestException(
        `امکان تغییر از اشتراک «${current.name}» به اشتراک پایین‌تر وجود ندارد؛ فقط ارتقا به بسته‌های بالاتر ممکن است.`,
      );
    }
  }

  // -------------------------------------------------------------------------
  //  Online payment (PayPing)
  // -------------------------------------------------------------------------

  /**
   * Mirror one subscription SKU into a PayPing «آیتم مالی». Every plan ships
   * two variants for each of the four terms — the plain subscription and the
   * subscription bundled with one «بسته مدیریت کسب‌وکار» — so the merchant
   * account ends up with the 16 sellable products. The code is cached on the
   * plan row and reused for later checkouts; its amount is refreshed on every
   * checkout so the bundle always matches the package actually chosen.
   */
  private async ensurePlanProduct(
    plan: SubscriptionPlan,
    months = 1,
    options: {
      withBusinessPackage?: boolean;
      businessAmount?: number;
      /** Non-plan, non-management part of the payment (e.g. identity inquiry). */
      extraAmount?: number;
    } = {},
  ): Promise<string> {
    const withBusinessPackage = Boolean(options.withBusinessPackage);
    const businessAmount = withBusinessPackage
      ? Math.max(0, Math.round(options.businessAmount ?? 0))
      : 0;
    if (!this.payping.configured) {
      throw new ServiceUnavailableException(
        'توکن درگاه پرداخت پی‌پینگ تنظیم نشده است. مقدار PAYPING_TOKEN را در محیط سرور قرار دهید.',
      );
    }
    const extraAmount = Math.max(0, Math.round(options.extraAmount ?? 0));
    const amount =
      planPriceForMonths(plan, months) + businessAmount + extraAmount;
    const term = months === 1 ? 'یک‌ماهه' : `${months} ماهه`;
    const suffix = withBusinessPackage
      ? ' + بسته مدیریت کسب‌وکار'
      : '';
    const payload = {
      title: `اشتراک ${plan.name} — ${term}${suffix} — شمالی‌کارت`,
      description: plan.description
        ? `${plan.description} (دوره‌ی ${term})`
        : `دوره‌ی ${term}`,
      amount,
      defineAmountByUser: false,
      haveTax: false,
      unlimited: true,
    };

    const codeField = this.planProductCodeField(months, withBusinessPackage);
    const existingCode = plan[codeField];
    if (existingCode) {
      // Keep the remote product price/title in sync with the plan. A failure
      // here must not block a checkout that already has a valid product code.
      try {
        await this.payping.updateProduct({
          ...payload,
          code: existingCode,
        });
        return existingCode;
      } catch (error) {
        const status = (error as { paypingStatus?: number } | null)
          ?.paypingStatus;
        this.logger.warn(
          `PayPing product ${existingCode} sync failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        // A 4xx (e.g. the product was deleted in the PayPing console or wiped
        // by the cleanup action) means the cached code is dead: recreate it
        // instead of handing a stale code to the checkout. Transient failures
        // keep the old code so a payment can still go through.
        if (!(typeof status === 'number' && status >= 400 && status < 500)) {
          return existingCode;
        }
      }
    }

    const created = (await this.payping.createProduct(payload)) as {
      code?: string;
    } | null;
    if (!created?.code) {
      throw new BadGatewayException(
        'ساخت محصول اشتراک در پی‌پینگ ناموفق بود؛ لطفاً دوباره تلاش کنید.',
      );
    }
    await this.prisma.subscriptionPlan.update({
      where: { id: plan.id },
      data: { [codeField]: created.code },
    });
    return created.code;
  }

  /** Prisma column that stores the PayPing product code of one SKU. */
  private planProductCodeField(
    months: number,
    withBusinessPackage = false,
  ):
    | 'paypingProductCode'
    | 'paypingProductCode3Months'
    | 'paypingProductCode6Months'
    | 'paypingProductCode12Months'
    | 'paypingProductCodeWithPackage'
    | 'paypingProductCodeWithPackage3Months'
    | 'paypingProductCodeWithPackage6Months'
    | 'paypingProductCodeWithPackage12Months' {
    if (withBusinessPackage) {
      if (months === 3) return 'paypingProductCodeWithPackage3Months';
      if (months === 6) return 'paypingProductCodeWithPackage6Months';
      if (months === 12) return 'paypingProductCodeWithPackage12Months';
      return 'paypingProductCodeWithPackage';
    }
    if (months === 3) return 'paypingProductCode3Months';
    if (months === 6) return 'paypingProductCode6Months';
    if (months === 12) return 'paypingProductCode12Months';
    return 'paypingProductCode';
  }

  /**
   * Reference price of the business-package half of a bundle, used when the
   * admin syncs the catalogue: the checkout re-syncs the product with the price
   * of the business actually chosen, so this is only the default amount.
   */
  private async referenceBusinessAmount(months: number): Promise<number> {
    // Prefer the base package, then fall back to the first sellable industry so
    // the admin sync can still create the «+ بسته مدیریت کسب‌وکار» products
    // even when the base management carries no price of its own.
    const keys = ['generalBusiness', ...(await this.packages.availablePackageKeys())];
    for (const key of Array.from(new Set(keys))) {
      const price = await this.packages.termPrice(key, months);
      if (price > 0) return price;
    }
    return 0;
  }

  /** Best-effort product sync for every SKU (never throws). */
  async syncPlanProductQuietly(plan: SubscriptionPlan): Promise<void> {
    if (this.simulator.isEnabled || !this.payping.configured) return;
    for (const months of [1, 3, 6, 12] as const) {
      const businessAmount = await this.referenceBusinessAmount(months);
      for (const withBusinessPackage of [false, true]) {
        if (withBusinessPackage && businessAmount <= 0) continue;
        try {
          await this.ensurePlanProduct(plan, months, {
            withBusinessPackage,
            businessAmount,
          });
        } catch (error) {
          this.logger.warn(
            `PayPing product sync for plan ${plan.id} (${months}m${
              withBusinessPackage ? '+biz' : ''
            }) failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
  }

  /**
   * Admin action: create/refresh the PayPing products of one plan — the four
   * terms plus the four «+ بسته مدیریت کسب‌وکار» bundles.
   */
  async syncPaypingProduct(planId: string) {
    const plan = await this.requirePlan(planId);
    if (planPriceForMonths(plan, 1) < 1000) {
      throw new BadRequestException(
        'برای ساخت محصول پی‌پینگ، قیمت اشتراک باید حداقل ۱۰۰۰ تومان باشد.',
      );
    }
    // Mirroring the plan as a PayPing product is desirable but not required by
    // `/v3/pay`; a restricted merchant token must not block a real payment.
    const paypingProductCodes: Record<string, string | null> = {};
    for (const months of [1, 3, 6, 12] as const) {
      if (planPriceForMonths(plan, months) < 1000) {
        paypingProductCodes[months] = null;
        continue;
      }
      try {
        paypingProductCodes[months] = await this.ensurePlanProduct(plan, months);
      } catch (error) {
        this.logger.warn(
          `PayPing product for plan ${plan.id} (${months}m) unavailable: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        paypingProductCodes[months] = null;
      }
    }
    const businessAmount = await this.referenceBusinessAmount(1);
    const bundleProductCodes: Record<string, string | null> = {};
    for (const months of [1, 3, 6, 12] as const) {
      const addonAmount = await this.referenceBusinessAmount(months);
      const amount = planPriceForMonths(plan, months) + addonAmount;
      if (amount < 1000) {
        bundleProductCodes[months] = null;
        continue;
      }
      try {
        bundleProductCodes[months] = await this.ensurePlanProduct(plan, months, {
          withBusinessPackage: true,
          businessAmount: addonAmount,
        });
      } catch (error) {
        this.logger.warn(
          `PayPing bundle product for plan ${plan.id} (${months}m) unavailable: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        bundleProductCodes[months] = null;
      }
    }
    return {
      planId,
      paypingProductCode: paypingProductCodes[1] ?? null,
      paypingProductCodes,
      businessAmount,
      paypingBundleProductCodes: bundleProductCodes,
    };
  }

  /**
   * Admin cleanup: delete every product in the PayPing account, then clear the
   * cached codes so the next «همگام‌سازی» recreates them from scratch instead
   * of trying to update products that no longer exist.
   */
  async deleteAllPaypingProducts() {
    const result = await this.payping.deleteAllProducts();
    let clearedCodes = 0;

    // Empty catalogue: every cached code is stale (e.g. products were removed
    // manually in the PayPing console), so clear them all before the re-sync.
    if (result.total === 0) {
      const plans = await this.prisma.subscriptionPlan.findMany({
        select: {
          paypingProductCode: true,
          paypingProductCode3Months: true,
          paypingProductCode6Months: true,
          paypingProductCode12Months: true,
          paypingProductCodeWithPackage: true,
          paypingProductCodeWithPackage3Months: true,
          paypingProductCodeWithPackage6Months: true,
          paypingProductCodeWithPackage12Months: true,
        },
      });
      clearedCodes = plans.reduce(
        (sum, plan) =>
          sum +
          [
            plan.paypingProductCode,
            plan.paypingProductCode3Months,
            plan.paypingProductCode6Months,
            plan.paypingProductCode12Months,
            plan.paypingProductCodeWithPackage,
            plan.paypingProductCodeWithPackage3Months,
            plan.paypingProductCodeWithPackage6Months,
            plan.paypingProductCodeWithPackage12Months,
          ].filter(Boolean).length,
        0,
      );
      if (clearedCodes) {
        await this.prisma.subscriptionPlan.updateMany({
          data: {
            paypingProductCode: null,
            paypingProductCode3Months: null,
            paypingProductCode6Months: null,
            paypingProductCode12Months: null,
            paypingProductCodeWithPackage: null,
            paypingProductCodeWithPackage3Months: null,
            paypingProductCodeWithPackage6Months: null,
            paypingProductCodeWithPackage12Months: null,
          },
        });
      }
    } else {
      const codes = [...new Set(result.deletedCodes)];
      if (codes.length) {
        const operations = [
          this.prisma.subscriptionPlan.updateMany({
            where: { paypingProductCode: { in: codes } },
            data: { paypingProductCode: null },
          }),
          this.prisma.subscriptionPlan.updateMany({
            where: { paypingProductCode3Months: { in: codes } },
            data: { paypingProductCode3Months: null },
          }),
          this.prisma.subscriptionPlan.updateMany({
            where: { paypingProductCode6Months: { in: codes } },
            data: { paypingProductCode6Months: null },
          }),
          this.prisma.subscriptionPlan.updateMany({
            where: { paypingProductCode12Months: { in: codes } },
            data: { paypingProductCode12Months: null },
          }),
          this.prisma.subscriptionPlan.updateMany({
            where: { paypingProductCodeWithPackage: { in: codes } },
            data: { paypingProductCodeWithPackage: null },
          }),
          this.prisma.subscriptionPlan.updateMany({
            where: { paypingProductCodeWithPackage3Months: { in: codes } },
            data: { paypingProductCodeWithPackage3Months: null },
          }),
          this.prisma.subscriptionPlan.updateMany({
            where: { paypingProductCodeWithPackage6Months: { in: codes } },
            data: { paypingProductCodeWithPackage6Months: null },
          }),
          this.prisma.subscriptionPlan.updateMany({
            where: { paypingProductCodeWithPackage12Months: { in: codes } },
            data: { paypingProductCodeWithPackage12Months: null },
          }),
        ];
        const cleared = await this.prisma.$transaction(operations);
        clearedCodes = cleared.reduce((sum, item) => sum + item.count, 0);
      }
    }

    // The catalogue is now empty, so every non-plan product cache is stale too
    // (Zohal services and business-management packages). Drop them so the next
    // sync recreates the products instead of updating deleted ones.
    clearedCodes += await this.clearProductCodeCaches();
    return { ...result, clearedCodes };
  }

  /** Delete the PayPing product-code settings of Zohal and management cards. */
  private async clearProductCodeCaches(): Promise<number> {
    const deleted = await this.prisma.setting.deleteMany({
      where: {
        OR: [
          { key: { startsWith: ZOHAL_PRODUCT_SETTING_PREFIX } },
          { key: { startsWith: MANAGEMENT_PRODUCT_SETTING_PREFIX } },
        ],
      },
    });
    return deleted.count;
  }

  /**
   * Start an online payment for a paid plan. Returns the PayPing gateway URL;
   * the plan is activated only after the callback verifies the transaction.
   *
   * `options.workspaceIds` turns the same payment into «اشتراک + بسته مدیریت
   * کسب‌وکار»: each named business gets the package of its own industry for the
   * days the subscription term covers — a mid-term add-on is prorated to the
   * remaining time — and the amounts are added to the subscription price. The
   * packages expire together with the plan. The free plan can never buy the
   * add-on, and a plan may only cover as many businesses as it allows.
   *
   * `options.identity` adds the identity inquiry bundle to the *same* payment,
   * so a new account pays once for plan + management + verification. The
   * inquiry itself runs only after the gateway confirms the payment.
   */
  async checkout(
    userId: string,
    planId: string,
    requestedMonths = 1,
    returnTo?: string,
    options: {
      workspaceIds?: string[] | null;
      identity?: CheckoutIdentityInput | null;
      managementPackageKey?: string | null;
      /** Onboarding cart step ids to charge in this checkout. */
      moduleStepIds?: string[] | null;
    } = {},
  ) {
    const plan = await this.requirePlan(planId);
    if (!plan.isActive) {
      throw new BadRequestException('این اشتراک در حال حاضر فعال نیست');
    }
    // Only the four billable terms are accepted; anything else falls back to
    // the monthly price so a bogus value can never under-charge a purchase.
    const months = isPlanPeriodMonths(requestedMonths) ? requestedMonths : 1;
    // Only same-site absolute paths are stored; anything else falls back to
    // the default subscriptions page.
    const safeReturnTo =
      returnTo && /^\/(?!\/)/.test(returnTo)
        ? returnTo.slice(0, 200)
        : null;
    // «+ بسته مدیریت کسب‌وکار»: the add-on term mirrors the subscription term.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        planId: true,
        planExpiresAt: true,
        phoneVerified: true,
        nationalCode: true,
        birthDate: true,
        identityVerifiedAt: true,
        businessLicenseVerifiedAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    if (user.planId === plan.id && !user.planExpiresAt) {
      // Re-buying the same plan is allowed only to extend its term.
      throw new BadRequestException('شما در حال حاضر مشترک این بسته هستید');
    }
    await this.assertNotDowngrade(userId, plan.id);

    // The term this payment adds starts at the current expiry when the same
    // plan is still running (so nothing is thrown away) and otherwise now.
    const now = new Date();
    const activeTerm =
      user.planId === plan.id &&
      user.planExpiresAt &&
      user.planExpiresAt.getTime() > now.getTime()
        ? user.planExpiresAt
        : now;
    const expiresAt = addMonths(activeTerm, months);

    // «+ بسته مدیریت کسب‌وکار»: every chosen business gets the package of its
    // own industry, priced for the days this term covers (so a mid-term add-on
    // is prorated to what is left) and expiring together with the subscription.
    const addons = await this.resolveBusinessAddons(
      userId,
      plan,
      months,
      activeTerm,
      expiresAt,
      options.workspaceIds,
      { packageKey: options.managementPackageKey ?? undefined },
    );
    const businessAmount = addons.reduce((sum, item) => sum + item.amount, 0);
    const identity = await this.resolveIdentityCharge(user, options.identity);
    const identityAmount = identity.amount;
    const moduleItems = await this.resolveOnboardingModules(
      userId,
      options.moduleStepIds,
    );
    const moduleAmount = moduleItems.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const amount =
      planPriceForMonths(plan, months) +
      businessAmount +
      identityAmount +
      moduleAmount;
    if (amount < 1000) {
      throw new BadRequestException(
        'مبلغ این اشتراک برای پرداخت آنلاین معتبر نیست؛ از درخواست اشتراک استفاده کنید.',
      );
    }

    // Online-only mode (the current policy) always goes through the gateway,
    // so a purchase can never leave a negative wallet balance behind.
    const onlineOnly = await this.settings.getPaymentsOnlineOnly();
    if (
      !onlineOnly &&
      moduleItems.length === 0 &&
      (await this.settings.isFeatureEnabled('featureWallet'))
    ) {
      return this.purchaseViaWallet(userId, plan, months, addons);
    }

    // The simulator has no merchant account to mirror plans into.
    const paypingProductCode = this.simulator.isEnabled
      ? null
      : await this.ensurePlanProduct(plan, months, {
          withBusinessPackage: addons.length > 0,
          businessAmount,
          extraAmount: identityAmount + moduleAmount,
        });

    // Supersede any previous unpaid attempt for the same plan.
    await this.prisma.subscriptionPayment.updateMany({
      where: { userId, planId, status: PaymentStatus.PENDING },
      data: {
        status: PaymentStatus.CANCELED,
        failureReason: 'پرداخت جدید جایگزین شد',
      },
    });

    const clientRefId = randomBytes(16).toString('hex');
    const payment = await this.prisma.subscriptionPayment.create({
      data: {
        userId,
        planId,
        amount,
        months,
        clientRefId,
        returnTo: safeReturnTo,
        payerName: user.fullName ?? undefined,
        businessAmount,
        identityAmount,
        moduleAmount,
        moduleItems:
          moduleItems.length > 0
            ? (moduleItems as unknown as Prisma.InputJsonValue)
            : undefined,
        identityData: identity.data
          ? (identity.data as unknown as Prisma.InputJsonValue)
          : undefined,
        withBusinessPackage: addons.length > 0,
        businessPackages:
          addons.length > 0
            ? (addons as unknown as Prisma.InputJsonValue)
            : undefined,
      },
    });

    const bundleNote =
      addons.length === 1
        ? ` + مدیریت «${addons[0].label}»`
        : addons.length > 1
          ? ` + مدیریت ${addons.length} کسب‌وکار`
          : '';
    const gatewayDescription = `اشتراک ${plan.name}${bundleNote} — شمالی‌کارت`;
    const returnUrl = `${paypingReturnBaseUrl()}/api/subscriptions/payments/callback`;
    let result: { paymentCode?: string; url?: string } | null = null;
    try {
      result = this.simulator.isEnabled
        ? this.simulator.createPayment({
            amount,
            returnUrl,
            clientRefId,
            description: gatewayDescription,
          })
        : ((await this.payping.createPayment({
            amount,
            returnUrl,
            payerIdentity: user.phone ?? user.email ?? undefined,
            payerName: user.fullName ?? undefined,
            description: gatewayDescription,
            clientRefId,
            isReversible: false,
          })) as { paymentCode?: string; url?: string } | null);
    } catch (error) {
      await this.prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason:
            error instanceof Error
              ? error.message.slice(0, 300)
              : 'ساخت پرداخت ناموفق بود',
        },
      });
      throw error;
    }

    if (!result?.paymentCode || !result?.url) {
      await this.prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: 'پاسخ نامعتبر از پی‌پینگ',
        },
      });
      throw new BadGatewayException('ساخت پرداخت در پی‌پینگ ناموفق بود');
    }

    const updated = await this.prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: { paymentCode: result.paymentCode, gatewayUrl: result.url },
    });

    return {
      paymentId: updated.id,
      amount: updated.amount,
      months: updated.months,
      paymentCode: updated.paymentCode,
      url: updated.gatewayUrl,
      paypingProductCode,
      plan: { id: plan.id, name: plan.name },
      withBusinessPackage: addons.length > 0,
      businessAmount,
      businessPackages: addons,
      identityAmount,
      identityPending: identityAmount > 0,
      moduleAmount,
      moduleItems,
      /** ISO expiry the plan and every add-on package share. */
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Mid-term add-on purchase: a paid subscriber can buy the «بسته مدیریت
   * کسب‌وکار» for one or more businesses *without* a new subscription term. The
   * price is prorated to the days left in the running term and the packages
   * expire exactly when the subscription does — never longer.
   */
  async addonCheckout(
    userId: string,
    workspaceIds?: string[] | null,
    returnTo?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        planId: true,
        planExpiresAt: true,
      },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    const now = new Date();
    if (
      !user.planId ||
      !user.planExpiresAt ||
      user.planExpiresAt.getTime() <= now.getTime()
    ) {
      throw new BadRequestException(
        'برای خرید افزودنی «بسته مدیریت کسب‌وکار» ابتدا یک اشتراک فعال اکو یا پلاس داشته باشید.',
      );
    }
    const plan = await this.requirePlan(user.planId);
    if (isFreePlan(plan)) {
      throw new BadRequestException(
        'اشتراک رایگان امکان خرید «بسته مدیریت کسب‌وکار» را ندارد؛ ابتدا به اکو یا پلاس ارتقا دهید.',
      );
    }
    // The add-on only runs until the current term ends, so it is priced by the
    // day (monthly rate × days left) rather than as a whole new term.
    const addons = await this.resolveBusinessAddons(
      userId,
      plan,
      1,
      now,
      user.planExpiresAt,
      workspaceIds,
      { prorate: true },
    );
    if (addons.length === 0) {
      throw new BadRequestException(
        (workspaceIds ?? []).length > 0
          ? 'بسته مدیریت کسب‌وکار این کسب‌وکارها تا پایان دوره‌ی جدید فعال است و مبلغی برای پرداخت باقی نمانده است.'
          : 'کسب‌وکاری برای افزودن «بسته مدیریت کسب‌وکار» انتخاب نشده است.',
      );
    }
    const businessAmount = addons.reduce((sum, item) => sum + item.amount, 0);
    if (businessAmount < 1000) {
      throw new BadRequestException(
        'مبلغ افزودنی برای پرداخت آنلاین معتبر نیست؛ با پشتیبانی تماس بگیرید.',
      );
    }
    const safeReturnTo =
      returnTo && /^\/(?!\/)/.test(returnTo) ? returnTo.slice(0, 200) : null;

    if (!this.simulator.isEnabled) {
      await this.ensurePlanProduct(plan, 1, {
        withBusinessPackage: true,
        businessAmount,
      });
    }
    await this.prisma.subscriptionPayment.updateMany({
      where: {
        userId,
        planId: plan.id,
        months: 0,
        status: PaymentStatus.PENDING,
      },
      data: {
        status: PaymentStatus.CANCELED,
        failureReason: 'پرداخت جدید جایگزین شد',
      },
    });
    const clientRefId = randomBytes(16).toString('hex');
    const payment = await this.prisma.subscriptionPayment.create({
      data: {
        userId,
        planId: plan.id,
        amount: businessAmount,
        months: 0,
        clientRefId,
        returnTo: safeReturnTo,
        payerName: user.fullName ?? undefined,
        businessAmount,
        withBusinessPackage: true,
        businessPackages: addons as unknown as Prisma.InputJsonValue,
      },
    });
    const bundleNote =
      addons.length === 1
        ? `مدیریت «${addons[0].label}»`
        : `مدیریت ${addons.length} کسب‌وکار`;
    const description = `افزودنی ${bundleNote} — شمالی‌کارت`;
    const returnUrl = `${paypingReturnBaseUrl()}/api/subscriptions/payments/callback`;
    let result: { paymentCode?: string; url?: string } | null = null;
    try {
      result = this.simulator.isEnabled
        ? this.simulator.createPayment({
            amount: businessAmount,
            returnUrl,
            clientRefId,
            description,
          })
        : ((await this.payping.createPayment({
            amount: businessAmount,
            returnUrl,
            payerIdentity: user.phone ?? user.email ?? undefined,
            payerName: user.fullName ?? undefined,
            description,
            clientRefId,
            isReversible: false,
          })) as { paymentCode?: string; url?: string } | null);
    } catch (error) {
      await this.prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason:
            error instanceof Error
              ? error.message.slice(0, 300)
              : 'ساخت پرداخت ناموفق بود',
        },
      });
      throw error;
    }
    if (!result?.paymentCode || !result?.url) {
      await this.prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: 'پاسخ نامعتبر از پی‌پینگ',
        },
      });
      throw new BadGatewayException('ساخت پرداخت در پی‌پینگ ناموفق بود');
    }
    const updated = await this.prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: { paymentCode: result.paymentCode, gatewayUrl: result.url },
    });
    return {
      paymentId: updated.id,
      amount: updated.amount,
      months: 0,
      paymentCode: updated.paymentCode,
      url: updated.gatewayUrl,
      paypingProductCode: null,
      plan: { id: plan.id, name: plan.name },
      withBusinessPackage: true,
      businessAmount,
      businessPackages: addons,
      expiresAt: user.planExpiresAt.toISOString(),
      addonOnly: true,
    };
  }

  /**
   * Resolve the «بسته مدیریت کسب‌وکار» add-ons of a checkout: validate the
   * chosen businesses, price each one's industry package for the days the term
   * covers, and refuse the add-on for the free plan or beyond the plan's
   * business capacity.
   *
   * A subscription term (`prorate: false`) charges the package's whole-term
   * price — the same amount the admin panel lists — so the combined total is
   * exactly plan + management. A mid-term add-on (`prorate: true`) pays only
   * for the days left in the running term.
   */
  private async resolveBusinessAddons(
    userId: string,
    plan: SubscriptionPlan,
    months: number,
    coverageStart: Date,
    expiresAt: Date,
    workspaceIds?: string[] | null,
    options: { prorate?: boolean; packageKey?: string } = {},
  ): Promise<BusinessAddon[]> {
    const unique = Array.from(
      new Set(
        (workspaceIds ?? [])
          .map((id) => (typeof id === 'string' ? id.trim() : ''))
          .filter(Boolean),
      ),
    );
    if (unique.length === 0) return [];
    if (isFreePlan(plan)) {
      throw new BadRequestException(
        'اشتراک رایگان امکان خرید «بسته مدیریت کسب‌وکار» را ندارد؛ ابتدا به اکو یا پلاس ارتقا دهید.',
      );
    }
    // The onboarding cart lets the buyer pick any *available* package, not
    // only the one mapped from their business category. Validate the choice
    // here so an unknown/disabled key can never be charged.
    const chosenPackageKey = options.packageKey?.trim() || null;
    if (chosenPackageKey) {
      const available = await this.packages.availablePackageKeys();
      if (!available.includes(chosenPackageKey)) {
        throw new BadRequestException(
          'بسته‌ی مدیریت کسب‌وکار انتخاب‌شده در دسترس نیست.',
        );
      }
    }
    const maxBusinesses = Math.max(1, Number(plan.maxBusinesses ?? 1));
    if (unique.length > maxBusinesses) {
      throw new BadRequestException(
        `اشتراک «${plan.name}» فقط برای ${maxBusinesses} کسب‌وکار امکان خرید «بسته مدیریت کسب‌وکار» را دارد.`,
      );
    }
    // A package already paid up to the end of the running term must only be
    // charged for the days *after* that expiry, otherwise a renewal pays for
    // the same days twice (which made a plan renewal cost more than a fresh
    // purchase and mismatched the eco/plus cart totals).
    const activations = await this.prisma.businessModuleActivation.findMany({
      where: { workspaceId: { in: unique }, paidUntil: { not: null } },
      select: { workspaceId: true, paidUntil: true },
    });
    const currentExpiry = new Map<string, Date>();
    for (const row of activations) {
      if (!row.paidUntil) continue;
      const seen = currentExpiry.get(row.workspaceId);
      if (!seen || row.paidUntil.getTime() > seen.getTime()) {
        currentExpiry.set(row.workspaceId, row.paidUntil);
      }
    }
    const addons: BusinessAddon[] = [];
    for (const workspaceId of unique) {
      const workspace = await this.packages.requireOwnedWorkspace(
        userId,
        workspaceId,
      );
      const packageKey = chosenPackageKey ?? workspace.industryKey;
      const label = await this.packages.label(packageKey);
      const days = options.prorate
        ? this.addonCoverageDays(
            expiresAt,
            coverageStart,
            currentExpiry.get(workspace.id),
          )
        : this.addonTermDays(
            expiresAt,
            coverageStart,
            currentExpiry.get(workspace.id),
            months,
          );
      // The package is already paid through (or past) the new term, so there
      // is nothing left to charge for this business.
      if (days <= 0) continue;
      const price = await this.packages.proratedPrice(
        packageKey,
        months,
        days,
      );
      if (price < 1000) {
        throw new BadRequestException(
          `قیمت «بسته مدیریت کسب‌وکار» برای «${workspace.name}» تعیین نشده است؛ ابتدا صنف آن را انتخاب کنید یا با پشتیبانی تماس بگیرید.`,
        );
      }
      addons.push({
        workspaceId: workspace.id,
        packageKey,
        label,
        businessName: workspace.name,
        amount: price,
        months,
        paidUntil: expiresAt.toISOString(),
      });
    }
    return addons;
  }

  /**
   * Days a package still needs to cover: from the later of the term start and
   * the business's already-paid expiry, up to the new term end. This keeps a
   * renewal from charging again for days the management is already paid for,
   * and makes the cart quote equal to the amount actually charged.
   */
  private addonCoverageDays(
    expiresAt: Date,
    coverageStart: Date,
    currentPaidUntil?: Date,
  ): number {
    const start =
      currentPaidUntil && currentPaidUntil.getTime() > coverageStart.getTime()
        ? currentPaidUntil
        : coverageStart;
    return Math.max(0, (expiresAt.getTime() - start.getTime()) / 86_400_000);
  }

  /**
   * Days billed for a whole subscription term. A business with no earlier
   * management pays the full term price (so the bundle equals plan +
   * management term price); one already paid past the term start only pays for
   * the days beyond that expiry.
   */
  private addonTermDays(
    expiresAt: Date,
    coverageStart: Date,
    currentPaidUntil: Date | undefined,
    months: number,
  ): number {
    const fullTermDays = Math.max(1, months) * 30.4375;
    if (
      currentPaidUntil &&
      currentPaidUntil.getTime() > coverageStart.getTime()
    ) {
      return Math.min(
        fullTermDays,
        this.addonCoverageDays(expiresAt, coverageStart, currentPaidUntil),
      );
    }
    return fullTermDays;
  }

  /**
   * Price the identity inquiry leg of a combined checkout and snapshot its
   * inputs. Returns `amount: 0` when the account is already verified (or the
   * caller did not request it), so the same checkout can serve both new and
   * returning users.
   */
  /**
   * Read the user's onboarding cart and keep only the requested module steps.
   * The cart is written server-side when a priced module step is used, so its
   * amounts are trusted; the client only names which steps to pay for.
   */
  private async resolveOnboardingModules(
    userId: string,
    stepIds?: string[] | null,
  ): Promise<OnboardingCartItem[]> {
    const row = await this.prisma.setting.findUnique({
      where: { key: `${ONBOARDING_CART_PREFIX}${userId}` },
    });
    if (!row?.value) return [];
    let items: OnboardingCartItem[] = [];
    try {
      const parsed = JSON.parse(row.value) as unknown;
      if (Array.isArray(parsed)) {
        items = parsed.filter(
          (item): item is OnboardingCartItem =>
            Boolean(item) &&
            typeof item === 'object' &&
            typeof (item as OnboardingCartItem).stepId === 'string' &&
            typeof (item as OnboardingCartItem).moduleKey === 'string' &&
            typeof (item as OnboardingCartItem).label === 'string' &&
            typeof (item as OnboardingCartItem).amount === 'number' &&
            (item as OnboardingCartItem).amount > 0,
        );
      }
    } catch {
      return [];
    }
    if (stepIds && stepIds.length > 0) {
      const wanted = new Set(stepIds);
      items = items.filter((item) => wanted.has(item.stepId));
    }
    return items;
  }

  private async resolveIdentityCharge(
    user: {
      id: string;
      phone: string | null;
      phoneVerified: boolean;
      nationalCode: string | null;
      birthDate: string | null;
      identityVerifiedAt: Date | null;
      businessLicenseVerifiedAt: Date | null;
    },
    input?: CheckoutIdentityInput | null,
  ): Promise<{ amount: number; data: CheckoutIdentitySnapshot | null }> {
    if (!input) return { amount: 0, data: null };
    const withLicense = Boolean(input.withLicense);
    const licenseTrackingCode = input.licenseTrackingCode?.trim() ?? '';
    if (withLicense && !licenseTrackingCode) {
      throw new BadRequestException(
        'برای استعلام جواز کسب، کد پیگیری جواز را وارد کنید.',
      );
    }
    const needsIdentity = !user.identityVerifiedAt;
    const needsLicense = withLicense && !user.businessLicenseVerifiedAt;
    let nationalCode = (input.nationalCode ?? user.nationalCode ?? '').trim();
    let birthDate = (input.birthDate ?? user.birthDate ?? '').trim();
    if (needsIdentity) {
      if (!user.phone || !user.phoneVerified) {
        throw new BadRequestException(
          'برای استعلام هویت، ابتدا باید شماره موبایل حساب تأیید شده باشد.',
        );
      }
      if (!isValidNationalCode(nationalCode)) {
        throw new BadRequestException('کد ملی وارد‌شده معتبر نیست');
      }
      if (!birthDate) {
        throw new BadRequestException(
          'برای استعلام هویت، تاریخ تولد را انتخاب کنید.',
        );
      }
      const owner = await this.prisma.user.findUnique({
        where: { nationalCode },
        select: { id: true },
      });
      if (owner && owner.id !== user.id) {
        throw new ConflictException(
          'این کد ملی قبلاً برای حساب دیگری ثبت شده است',
        );
      }
    } else {
      nationalCode = nationalCode || '';
      birthDate = birthDate || '';
    }
    // Every changed/added business mobile is its own Shahkar inquiry, priced
    // on top of the primary identity bundle.
    const pendingExtraPhones = await resolvePendingBusinessPhones(
      this.prisma,
      user.id,
      user.phone,
      nationalCode || user.nationalCode || null,
    );
    const needsExtraPhones = pendingExtraPhones.length > 0;
    if (!needsIdentity && !needsLicense && !needsExtraPhones) {
      return { amount: 0, data: null };
    }
    if (needsExtraPhones && !isValidNationalCode(nationalCode)) {
      throw new BadRequestException('کد ملی وارد‌شده معتبر نیست');
    }
    const [identityBundle, licensePrice] = await Promise.all([
      this.zohal.identityBundleQuote(),
      needsLicense ? this.apiir.getServicePrice('license') : Promise.resolve(0),
    ]);
    if ((needsIdentity || needsExtraPhones) && !identityBundle.available) {
      throw new BadRequestException(
        'استعلام هویت در حال حاضر فعال نیست؛ لطفاً بعداً دوباره تلاش کنید.',
      );
    }
    const identityPart = Math.max(
      0,
      Math.round(
        (needsIdentity ? identityBundle.total : 0) +
          (needsExtraPhones
            ? identityBundle.shahkar * pendingExtraPhones.length
            : 0),
      ),
    );
    const licensePart = Math.max(0, Math.round(needsLicense ? licensePrice : 0));
    const amount = identityPart + licensePart;
    return {
      amount,
      data: {
        nationalCode: nationalCode || null,
        birthDate: birthDate || null,
        withLicense,
        licenseTrackingCode: licenseTrackingCode || null,
        identityAmount: identityPart,
        licenseAmount: licensePart,
      },
    };
  }

  /**
   * Quote for the «بسته مدیریت کسب‌وکار» add-on: for the buyer's businesses,
   * the prorated price of each one's package for the days a `months`-term
   * covers, plus the exact expiry every add-on will share. The cart shows this
   * before payment, so the buyer sees what a mid-term add-on really costs.
   */
  async addonQuote(userId: string, planId: string, requestedMonths = 1) {
    const plan = await this.requirePlan(planId);
    // `months = 0` asks for the mid-term (add-on-only) quote: it covers the
    // days left in the running term and expires with it.
    const months = requestedMonths <= 0
      ? 0
      : isPlanPeriodMonths(requestedMonths)
        ? requestedMonths
        : 1;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { planId: true, planExpiresAt: true },
    });
    const now = new Date();
    const hasActiveSamePlan = Boolean(
      user?.planId === plan.id &&
        user.planExpiresAt &&
        user.planExpiresAt.getTime() > now.getTime(),
    );
    const activeTerm = hasActiveSamePlan ? user!.planExpiresAt! : now;
    const addonOnly = months === 0;
    const expiresAt = addonOnly ? activeTerm : addMonths(activeTerm, months);
    // Mid-term add-ons are always priced at the monthly rate × remaining days.
    const pricingMonths = addonOnly ? 1 : months;
    const days = Math.max(
      0,
      (expiresAt.getTime() - now.getTime()) / 86_400_000,
    );
    const maxBusinesses = Math.max(1, Number(plan.maxBusinesses ?? 1));
    const base = {
      plan: { id: plan.id, name: plan.name },
      allowed: !isFreePlan(plan) && (!addonOnly || hasActiveSamePlan),
      addonOnly,
      maxBusinesses,
      months,
      days: Math.round(days),
      expiresAt: expiresAt.toISOString(),
    };
    /** Every available package with its term price, for the onboarding list. */
    const quotePackages = async (
      coveredDays: number,
      allowed: boolean,
    ): Promise<BusinessAddonQuotePackage[]> => {
      const keys = await this.packages.availablePackageKeys();
      return Promise.all(
        keys.map(async (key) => {
          const [label, amount] = await Promise.all([
            this.packages.label(key),
            this.packages.proratedPrice(key, pricingMonths, coveredDays),
          ]);
          return {
            key,
            label,
            amount,
            months: pricingMonths,
            available: allowed && amount >= 1000,
          };
        }),
      );
    };
    if (isFreePlan(plan)) {
      return {
        ...base,
        workspaces: [] as BusinessAddonQuoteItem[],
        packages: await quotePackages(days, false),
      };
    }
    const workspaces = await this.prisma.businessWorkspace.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, industryKey: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    const activations = await this.prisma.businessModuleActivation.findMany({
      where: {
        workspaceId: { in: workspaces.map((row) => row.id) },
        paidUntil: { not: null },
      },
      select: { workspaceId: true, paidUntil: true },
    });
    const currentExpiry = new Map<string, Date>();
    for (const row of activations) {
      if (!row.paidUntil) continue;
      const seen = currentExpiry.get(row.workspaceId);
      if (!seen || row.paidUntil.getTime() > seen.getTime()) {
        currentExpiry.set(row.workspaceId, row.paidUntil);
      }
    }
    // The onboarding cart shows every package; the days already paid for the
    // buyer's business are the best estimate of what a switch would cost.
    const paidUntil = [...currentExpiry.values()].sort(
      (a, b) => b.getTime() - a.getTime(),
    )[0];
    const packageDays = addonOnly
      ? this.addonCoverageDays(expiresAt, now, paidUntil)
      : this.addonTermDays(expiresAt, activeTerm, paidUntil, months);
    const packages = await quotePackages(packageDays, true);
    const items: BusinessAddonQuoteItem[] = [];
    for (const workspace of workspaces) {
      const packageKey = workspace.industryKey;
      // Mirror the checkout exactly: a business whose management is already
      // paid up to the new expiry only owes for the days beyond it.
      const coveredDays = addonOnly
        ? this.addonCoverageDays(
            expiresAt,
            now,
            currentExpiry.get(workspace.id),
          )
        : this.addonTermDays(
            expiresAt,
            activeTerm,
            currentExpiry.get(workspace.id),
            months,
          );
      const [label, amount] = await Promise.all([
        this.packages.label(packageKey),
        this.packages.proratedPrice(packageKey, pricingMonths, coveredDays),
      ]);
      items.push({
        workspaceId: workspace.id,
        name: workspace.name,
        industryKey: packageKey,
        industryLabel: label,
        amount,
        months: pricingMonths,
        paidUntil: expiresAt.toISOString(),
        available: coveredDays > 0 && amount >= 1000,
        currentPaidUntil: currentExpiry.get(workspace.id)?.toISOString() ?? null,
      });
    }
    return { ...base, workspaces: items, packages };
  }

  /**
   * Wallet purchase: record the price as a debt and activate the plan now, so
   * the user can keep buying (blue tick, subscriptions, …) and settle
   * everything with one payment before the wallet due date.
   */
  private async purchaseViaWallet(
    userId: string,
    plan: SubscriptionPlan,
    months = 1,
    addons: BusinessAddon[] = [],
  ) {
    const previous = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { planId: true, planExpiresAt: true },
    });
    const previousPlanId = previous?.planId ?? null;
    const businessAmount = addons.reduce((sum, item) => sum + item.amount, 0);
    const amount = planPriceForMonths(plan, months) + businessAmount;
    const now = new Date();
    const subscription = await this.prisma.$transaction(async (tx) => {
      const pending = await tx.userSubscription.findMany({
        where: { userId, status: SubscriptionStatus.PENDING },
        select: { id: true, payment: { select: { status: true } } },
      });
      const replaceable = pending
        .filter((row) => row.payment?.status !== PaymentStatus.PAID)
        .map((row) => row.id);
      if (replaceable.length > 0) {
        await tx.userSubscription.deleteMany({
          where: { id: { in: replaceable } },
        });
      }
      // Renewing the same plan before its term ends extends the current term.
      const base =
        previousPlanId === plan.id &&
        previous?.planExpiresAt &&
        previous.planExpiresAt.getTime() > now.getTime()
          ? previous.planExpiresAt
          : now;
      const expiresAt = addMonths(base, months);
      const created = await tx.userSubscription.create({
        data: {
          userId,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          months,
          startsAt: base,
          expiresAt,
          decidedAt: now,
          adminNote: 'فعال‌سازی با کیف پول (تسویه یک‌جا در سررسید)',
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { planId: plan.id, planExpiresAt: expiresAt },
      });
      return created;
    });
    let charged = 0;
    try {
      charged = await this.wallet.charge({
        userId,
        kind: WalletEntryKind.SUBSCRIPTION,
        amount,
        title:
          months > 1
            ? `خرید اشتراک «${plan.name}» (${months} ماهه)`
            : `خرید اشتراک «${plan.name}»`,
        sourceType: 'SUBSCRIPTION_PLAN',
        sourceId: subscription.id,
        idempotencyKey: `subscription:${subscription.id}`,
      });
    } catch (error) {
      // Never leave an activated plan behind if the ledger write failed.
      await this.prisma.$transaction([
        this.prisma.userSubscription.delete({ where: { id: subscription.id } }),
        this.prisma.user.update({
          where: { id: userId },
          data: { planId: previousPlanId, planExpiresAt: previous?.planExpiresAt ?? null },
        }),
      ]);
      throw error;
    }
    // Grant the add-on packages once the plan is definitely booked; they end
    // with the same term as the subscription so nothing outlives it.
    await this.applyBusinessAddons(addons, subscription.expiresAt ?? new Date());
    const periodNote = months > 1 ? ` برای دوره‌ی ${months} ماهه` : '';
    const bundleNote =
      addons.length === 1
        ? ` + مدیریت «${addons[0].label}»`
        : addons.length > 1
          ? ` + مدیریت ${addons.length} کسب‌وکار`
          : '';
    await this.notifications.notify({
      userId,
      type: NotificationType.SUCCESS,
      title: 'اشتراک شما فعال شد',
      body:
        charged > 0
          ? `بسته «${plan.name}»${periodNote}${bundleNote} فعال شد و مبلغ ${charged.toLocaleString('fa-IR')} تومان به بدهی کیف پول شما اضافه شد؛ تا سررسید یک‌جا پرداخت کنید.`
          : `بسته «${plan.name}»${periodNote}${bundleNote} روی حساب شما فعال شد.`,
      link: '/dashboard/subscriptions',
    });
    await this.notifications.notifyAdmins({
      category: 'SUBSCRIPTION',
      scope: 'SUBSCRIPTION',
      title: 'خرید اشتراک از کیف پول',
      body: `بسته «${plan.name}»${periodNote} فعال شد و مبلغ ${charged.toLocaleString('fa-IR')} تومان به کیف پول کاربر اضافه شد.`,
      type: NotificationType.INFO,
      link: '/jga4rm8j?section=wallets',
      actorId: userId,
    });
    await this.activity.log({
      action: 'SUBSCRIPTION_APPROVED',
      summary: `فعال‌سازی اشتراک «${plan.name}»${periodNote} با کیف پول`,
      entityType: 'SUBSCRIPTION',
      entityId: subscription.id,
    });
    return {
      wallet: true,
      paymentId: null,
      amount: charged,
      months,
      paymentCode: null,
      url: null,
      plan: { id: plan.id, name: plan.name },
      withBusinessPackage: addons.length > 0,
      businessAmount,
      businessPackages: addons,
      expiresAt: (subscription.expiresAt ?? new Date()).toISOString(),
    };
  }

  /** Grant a list of add-on packages, expiring together with the term. */
  private async applyBusinessAddons(
    addons: BusinessAddon[],
    paidUntil: Date,
  ): Promise<void> {
    for (const addon of addons) {
      if (!addon?.workspaceId || !addon?.packageKey) continue;
      try {
        await this.packages.activate(
          addon.workspaceId,
          addon.packageKey,
          paidUntil,
        );
      } catch (error) {
        this.logger.warn(
          `granting business package «${addon.packageKey}» for ${addon.workspaceId} failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  /**
   * Same as {@link applyBusinessAddons} but for the JSON stored on a payment,
   * so a callback or a later activation can re-grant idempotently.
   */
  private async grantStoredBusinessPackages(
    raw: Prisma.JsonValue | null | undefined,
    paidUntil: Date,
  ): Promise<void> {
    if (!Array.isArray(raw)) return;
    const addons: BusinessAddon[] = [];
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      if (
        typeof row.workspaceId === 'string' &&
        typeof row.packageKey === 'string'
      ) {
        addons.push({
          workspaceId: row.workspaceId,
          packageKey: row.packageKey,
          label: typeof row.label === 'string' ? row.label : row.packageKey,
          businessName:
            typeof row.businessName === 'string' ? row.businessName : '',
          amount: typeof row.amount === 'number' ? row.amount : 0,
          months: typeof row.months === 'number' ? row.months : 0,
          paidUntil:
            typeof row.paidUntil === 'string' ? row.paidUntil : '',
        });
      }
    }
    await this.applyBusinessAddons(addons, paidUntil);
  }

  /**
   * Handle PayPing's browser redirect. Always returns a redirect target so the
   * user lands on a friendly page even when verification fails.
   */
  async handlePaymentCallback(params: {
    paymentCode?: string;
    refId?: string;
    clientRefId?: string;
    status?: number;
  }) {
    const paymentCode = params.paymentCode?.trim() || undefined;
    const refId = params.refId?.trim() || undefined;
    const clientRefId = params.clientRefId?.trim() || undefined;

    const payment = paymentCode
      ? await this.prisma.subscriptionPayment.findUnique({
          where: { paymentCode },
          include: { plan: true },
        })
      : clientRefId
        ? await this.prisma.subscriptionPayment.findUnique({
            where: { clientRefId },
            include: { plan: true },
          })
        : null;

    if (!payment) {
      return this.callbackResult('failed', 'پرداخت موردنظر پیدا نشد.');
    }
    /** Reply helper that keeps the buyer on the page they started from. */
    const reply = (
      status: 'success' | 'failed' | 'pending',
      message: string,
      activation?: 'pending',
    ) =>
      this.callbackResult(status, message, payment.plan.name, {
        returnTo: payment.returnTo,
        activation,
        // The identity inquiry is paid with this checkout but runs on the
        // onboarding page (it needs the profile module). Tell the client to
        // run it as soon as the payment is confirmed.
        identity:
          status === 'success' &&
          payment.identityAmount > 0 &&
          !payment.identityConsumedAt
            ? 'pending'
            : undefined,
        // Priced onboarding module steps are paid here but their inquiries run
        // on the onboarding page, like the identity bundle.
        modules:
          status === 'success' &&
          payment.moduleAmount > 0 &&
          !payment.moduleConsumedAt
            ? 'pending'
            : undefined,
      });
    if (payment.status === PaymentStatus.PAID) {
      return reply(
        'success',
        'این پرداخت قبلاً تأیید شده و اشتراک شما فعال است.',
      );
    }
    if (payment.status === PaymentStatus.CANCELED) {
      return reply('failed', 'این پرداخت لغو شده است.');
    }
    if (params.status === 0) {
      await this.markPaymentFailed(
        payment.id,
        'پرداخت توسط کاربر لغو شد یا درگاه آن را ناموفق اعلام کرد',
      );
      return reply(
        'failed',
        'پرداخت انجام نشد یا لغو شد. در صورت کسر وجه، مبلغ تا ۷۲ ساعت به حساب شما بازمی‌گردد.',
      );
    }
    if (!refId || !payment.paymentCode) {
      await this.markPaymentFailed(
        payment.id,
        'اطلاعات بازگشتی درگاه ناقص است',
      );
      return reply(
        'failed',
        'اطلاعات بازگشتی درگاه ناقص بود؛ در صورت کسر وجه با پشتیبانی تماس بگیرید.',
      );
    }

    type VerifyResult = {
      amount?: number;
      clientRefId?: string;
      paymentRefId?: number;
      payedDate?: string;
    };
    let verified: VerifyResult | null = null;
    try {
      verified = this.simulator.handles(payment.paymentCode)
        ? this.simulator.verifyPayment({
            paymentCode: payment.paymentCode,
            amount: payment.amount,
            clientRefId: payment.clientRefId,
          })
        : ((await this.payping.verifyPayment({
            paymentRefId: Number(refId),
            paymentCode: payment.paymentCode,
            amount: payment.amount,
          })) as VerifyResult);
    } catch (error) {
      const current = await this.prisma.subscriptionPayment.findUnique({
        where: { id: payment.id },
      });
      if (current?.status === PaymentStatus.PAID) {
        return reply('success', 'پرداخت شما تأیید شد و اشتراک فعال است.');
      }
      const upstreamStatus = (error as { paypingStatus?: number }).paypingStatus;
      const status =
        upstreamStatus ??
        (error instanceof HttpException ? error.getStatus() : 500);
      const message =
        error instanceof Error ? error.message : 'تأیید پرداخت ناموفق بود';
      if (status === 409) {
        // PayPing code 110: this transaction was already verified (e.g. a
        // duplicated callback). Treat it as success instead of failing it.
        const activation = await this.activatePaidSubscription(
          payment.id,
          refId,
          null,
        );
        return reply(
          'success',
          activation.addonOnly
            ? 'پرداخت شما تأیید شد و «بسته مدیریت کسب‌وکار» برای دوره‌ی باقی‌مانده فعال است.'
            : activation.pendingActivation
              ? 'پرداخت شما تأیید شد؛ برای فعال‌سازی اشتراک جدید به صفحه‌ی اشتراک‌ها بروید.'
              : 'پرداخت شما تأیید شد و اشتراک فعال است.',
          activation.pendingActivation ? 'pending' : undefined,
        );
      }
      if (status >= 500) {
        // PayPing returns 202/502 while verification is still processing.
        return reply(
          'pending',
          'تأیید پرداخت در حال پردازش است؛ چند لحظه بعد صفحه را دوباره باز کنید.',
        );
      }
      await this.markPaymentFailed(payment.id, message);
      return reply('failed', message);
    }

    if (
      typeof verified?.amount === 'number' &&
      verified.amount !== payment.amount
    ) {
      await this.markPaymentFailed(
        payment.id,
        `مبلغ پرداخت‌شده (${verified.amount}) با مبلغ سفارش (${payment.amount}) مطابقت ندارد`,
      );
      return reply(
        'failed',
        'مبلغ پرداخت‌شده با مبلغ اشتراک مطابقت ندارد؛ با پشتیبانی تماس بگیرید.',
      );
    }
    if (
      verified?.clientRefId &&
      verified.clientRefId !== payment.clientRefId
    ) {
      await this.markPaymentFailed(
        payment.id,
        'شناسه ارجاع بازگشتی با سفارش مطابقت ندارد',
      );
      return reply('failed', 'شناسه‌ی پرداخت با سفارش شما مطابقت ندارد.');
    }

    const activation = await this.activatePaidSubscription(
      payment.id,
      refId,
      verified,
    );
    return reply(
      'success',
      activation.addonOnly
        ? 'پرداخت با موفقیت انجام شد و «بسته مدیریت کسب‌وکار» برای دوره‌ی باقی‌مانده فعال شد.'
        : activation.pendingActivation
          ? `پرداخت با موفقیت انجام شد؛ برای فعال‌سازی اشتراک «${payment.plan.name}» به صفحه‌ی اشتراک‌ها بروید.`
          : `پرداخت با موفقیت انجام شد و اشتراک «${payment.plan.name}» فعال شد.`,
      activation.pendingActivation ? 'pending' : undefined,
    );
  }

  private callbackResult(
    status: 'success' | 'failed' | 'pending',
    message: string,
    planName?: string,
    options?: {
      returnTo?: string | null;
      activation?: 'pending';
      identity?: 'pending' | 'failed';
      modules?: 'pending';
    },
  ) {
    const params = new URLSearchParams({ payment: status });
    if (planName) params.set('plan', planName);
    if (options?.activation) params.set('activation', options.activation);
    if (options?.identity) params.set('identity', options.identity);
    if (options?.modules) params.set('modules', options.modules);
    const safeReturnTo =
      options?.returnTo && /^\/(?!\/)/.test(options.returnTo)
        ? options.returnTo
        : '/dashboard/subscriptions';
    const separator = safeReturnTo.includes('?') ? '&' : '?';
    return {
      status,
      message,
      redirectUrl: `${paypingReturnBaseUrl()}${safeReturnTo}${separator}${params.toString()}`,
    };
  }

  private async markPaymentFailed(id: string, reason: string) {
    await this.prisma.subscriptionPayment.updateMany({
      where: { id, status: { not: PaymentStatus.PAID } },
      data: { status: PaymentStatus.FAILED, failureReason: reason.slice(0, 300) },
    });
  }

  /**
   * Mark the payment paid and activate the plan in one transaction. Safe to
   * call twice: a payment that is already PAID is returned untouched.
   *
   * Buying the *same* plan extends the current term from its expiry. Buying a
   * *different* plan while another paid term is still active does not silently
   * throw the remaining days away: the new term is stored as a paid, pending
   * activation that the user must confirm from the subscriptions page.
   */
  private async activatePaidSubscription(
    paymentId: string,
    refId: string,
    verified: { payedDate?: string } | null,
  ): Promise<{
    subscriptionId: string | null;
    pendingActivation: boolean;
    addonOnly: boolean;
  }> {
    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { id: paymentId },
      include: { plan: true, user: { select: { fullName: true, email: true } } },
    });
    if (!payment) {
      return { subscriptionId: null, pendingActivation: false, addonOnly: false };
    }
    if (payment.status === PaymentStatus.PAID) {
      return {
        subscriptionId: payment.subscriptionId,
        pendingActivation: false,
        addonOnly: payment.months <= 0,
      };
    }

    const now = new Date();
    const paidAt = verified?.payedDate ? new Date(verified.payedDate) : now;
    // `months = 0` marks an add-on-only purchase (management bought mid-term
    // for an existing subscription): no new term is created, the packages just
    // expire together with the running subscription.
    if (payment.months <= 0) {
      return this.activateAddonOnlyPayment(payment, refId, paidAt, now);
    }
    const months = payment.months || 1;
    const term = this.planTermLabel(months);
    const result = await this.prisma.$transaction(async (tx) => {
      const account = await tx.user.findUnique({
        where: { id: payment.userId },
        select: {
          planId: true,
          planExpiresAt: true,
          plan: { select: { name: true } },
        },
      });
      // The free plan is the automatic starter plan, not a paid term the user
      // would lose by upgrading. Buying Eco/Plus from it must activate right
      // away (and grant the management packages in the same payment) instead
      // of parking the purchase behind a manual activation step.
      const currentIsFree = isFreePlan(account?.plan);
      const activeOtherPlan = Boolean(
        !currentIsFree &&
          account?.planId &&
          account.planId !== payment.planId &&
          account.planExpiresAt &&
          account.planExpiresAt.getTime() > now.getTime(),
      );
      const pendingActivation = activeOtherPlan;
      const base =
        account?.planId === payment.planId &&
        account.planExpiresAt &&
        account.planExpiresAt.getTime() > now.getTime()
          ? account.planExpiresAt
          : now;
      const startsAt = pendingActivation ? null : base;
      const expiresAt = pendingActivation ? null : addMonths(base, months);
      const created = await tx.userSubscription.create({
        data: {
          userId: payment.userId,
          planId: payment.planId,
          status: pendingActivation
            ? SubscriptionStatus.PENDING
            : SubscriptionStatus.ACTIVE,
          months,
          startsAt,
          expiresAt,
          decidedAt: now,
          adminNote: pendingActivation
            ? 'پرداخت آنلاین پی‌پینگ — در انتظار فعال‌سازی توسط کاربر'
            : 'پرداخت آنلاین پی‌پینگ',
        },
      });
      if (!pendingActivation) {
        await tx.user.update({
          where: { id: payment.userId },
          data: { planId: payment.planId, planExpiresAt: expiresAt },
        });
      }
      await tx.userSubscription.updateMany({
        where: {
          userId: payment.userId,
          status: SubscriptionStatus.PENDING,
          id: { not: created.id },
        },
        data: {
          status: SubscriptionStatus.CANCELLED,
          decidedAt: now,
          adminNote: 'با پرداخت آنلاین اشتراک دیگر لغو شد',
        },
      });
      await tx.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          refId,
          paidAt: Number.isNaN(paidAt.getTime()) ? now : paidAt,
          verifiedAt: now,
          subscriptionId: created.id,
          failureReason: null,
        },
      });
      await tx.subscriptionPayment.updateMany({
        where: {
          userId: payment.userId,
          status: PaymentStatus.PENDING,
          id: { not: payment.id },
        },
        data: {
          status: PaymentStatus.CANCELED,
          failureReason: 'پرداخت دیگری تأیید شد',
        },
      });
      return created;
    });

    const pendingActivation = result.status === SubscriptionStatus.PENDING;
    // Grant the add-on packages (if any) with exactly the term expiry, so they
    // run and end together with the subscription. Idempotent: re-granting only
    // moves the same `paidUntil`.
    if (!pendingActivation && payment.withBusinessPackage) {
      await this.grantStoredBusinessPackages(
        payment.businessPackages,
        result.expiresAt ?? now,
      );
    }
    const termNote = ` (${term})`;
    await this.notifications.notify({
      userId: payment.userId,
      type: NotificationType.SUCCESS,
      title: pendingActivation
        ? 'پرداخت اشتراک جدید انجام شد'
        : 'اشتراک شما فعال شد',
      body: pendingActivation
        ? `پرداخت بسته «${payment.plan.name}»${termNote} انجام شد. برای فعال‌سازی آن به صفحه‌ی اشتراک‌ها بروید؛ با فعال‌سازی، روزهای باقی‌مانده‌ی اشتراک فعلی شما از بین می‌رود.`
        : `پرداخت آنلاین انجام شد و بسته «${payment.plan.name}»${termNote} روی حساب شما فعال شد.`,
      link: '/dashboard/subscriptions',
    });
    await this.notifications.notifyAdmins({
      category: 'SUBSCRIPTION',
      scope: 'SUBSCRIPTION',
      title: 'پرداخت آنلاین اشتراک',
      body: `${payment.user?.fullName ?? payment.user?.email ?? 'کاربر'} بسته «${payment.plan.name}»${termNote} را به مبلغ ${payment.amount.toLocaleString('fa-IR')} تومان خریداری کرد.`,
      type: NotificationType.SUCCESS,
      link: '/jga4rm8j?section=subscriptions',
      actorId: payment.userId,
    });
    await this.activity.log({
      action: pendingActivation
        ? 'SUBSCRIPTION_PAID_PENDING'
        : 'SUBSCRIPTION_PAID',
      summary: `پرداخت آنلاین اشتراک «${payment.plan.name}»${termNote}${
        pendingActivation ? ' — در انتظار فعال‌سازی' : ''
      }`,
      entityType: 'SUBSCRIPTION',
      entityId: result.id,
    });
    try {
      const invoiceLines = buildSubscriptionInvoiceLines({
        months,
        amount: payment.amount,
        businessAmount: payment.businessAmount,
        identityAmount: payment.identityAmount,
        businessPackages: payment.businessPackages,
        moduleAmount: payment.moduleAmount,
        moduleItems: payment.moduleItems,
        identityData: payment.identityData,
        planName: payment.plan.name,
      });
      await this.finance.recordSale({
        sourceType: FINANCE_SOURCE_TYPES.SUBSCRIPTION,
        sourceId: payment.id,
        title: `خرید اشتراک «${payment.plan.name}» — ${term}`,
        amount: payment.amount,
        items: invoiceLines,
        paidAt: Number.isNaN(paidAt.getTime()) ? now : paidAt,
        userId: payment.userId,
        customerName: payment.user?.fullName ?? null,
        customerEmail: payment.user?.email ?? null,
        metadata: {
          planId: payment.planId,
          months,
          term,
          startsAt: result.startsAt?.toISOString() ?? null,
          expiresAt: result.expiresAt?.toISOString() ?? null,
          pendingActivation,
          refId,
          paymentMethod: 'online',
        },
      });
    } catch (error) {
      this.logger.warn(
        `invoice creation failed for subscription payment ${payment.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return { subscriptionId: result.id, pendingActivation, addonOnly: false };
  }

  /**
   * Settle an add-on-only payment: the subscription term is untouched, only the
   * «بسته مدیریت کسب‌وکار» packages are enabled until the running term ends.
   */
  private async activateAddonOnlyPayment(
    payment: SubscriptionPayment & {
      user?: { fullName: string | null; email: string | null } | null;
      plan: { name: string };
    },
    refId: string,
    paidAt: Date,
    now: Date,
  ): Promise<{
    subscriptionId: string | null;
    pendingActivation: boolean;
    addonOnly: boolean;
  }> {
    const account = await this.prisma.user.findUnique({
      where: { id: payment.userId },
      select: { planExpiresAt: true },
    });
    const paidUntil =
      account?.planExpiresAt && account.planExpiresAt.getTime() > now.getTime()
        ? account.planExpiresAt
        : now;
    await this.prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        refId,
        paidAt: Number.isNaN(paidAt.getTime()) ? now : paidAt,
        verifiedAt: now,
        failureReason: null,
      },
    });
    await this.grantStoredBusinessPackages(payment.businessPackages, paidUntil);
    await this.notifications.notify({
      userId: payment.userId,
      type: NotificationType.SUCCESS,
      title: 'بسته مدیریت کسب‌وکار فعال شد',
      body: `«بسته مدیریت کسب‌وکار» برای کسب‌وکارهای انتخابی تا پایان اشتراک فعلی (${paidUntil.toLocaleDateString('fa-IR')}) فعال شد؛ پس از آن اطلاعات باقی می‌ماند و فقط کنترل آن متوقف می‌شود.`,
      link: '/dashboard/business',
    });
    await this.notifications.notifyAdmins({
      category: 'SUBSCRIPTION',
      scope: 'SUBSCRIPTION',
      title: 'خرید افزودنی مدیریت کسب‌وکار',
      body: `${payment.user?.fullName ?? payment.user?.email ?? 'کاربر'} «بسته مدیریت کسب‌وکار» را به مبلغ ${payment.amount.toLocaleString('fa-IR')} تومان برای دوره‌ی باقی‌مانده خریداری کرد.`,
      type: NotificationType.SUCCESS,
      link: '/jga4rm8j?section=subscriptions',
      actorId: payment.userId,
    });
    await this.activity.log({
      action: 'SUBSCRIPTION_PAID',
      summary: `خرید افزودنی «بسته مدیریت کسب‌وکار» برای دوره‌ی باقی‌مانده`,
      entityType: 'SUBSCRIPTION',
      entityId: payment.id,
    });
    try {
      const invoiceLines = buildSubscriptionInvoiceLines({
        months: 0,
        amount: payment.amount,
        businessAmount: payment.businessAmount,
        identityAmount: 0,
        businessPackages: payment.businessPackages,
        moduleAmount: payment.moduleAmount,
        moduleItems: payment.moduleItems,
        identityData: payment.identityData,
        planName: payment.plan.name,
      });
      await this.finance.recordSale({
        sourceType: FINANCE_SOURCE_TYPES.SUBSCRIPTION,
        sourceId: payment.id,
        title: `افزودنی «بسته مدیریت کسب‌وکار»`,
        amount: payment.amount,
        items: invoiceLines,
        paidAt: Number.isNaN(paidAt.getTime()) ? now : paidAt,
        userId: payment.userId,
        customerName: payment.user?.fullName ?? null,
        customerEmail: payment.user?.email ?? null,
        metadata: {
          planId: payment.planId,
          months: 0,
          addonOnly: true,
          refId,
          paymentMethod: 'online',
        },
      });
    } catch (error) {
      this.logger.warn(
        `invoice creation failed for add-on payment ${payment.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return { subscriptionId: null, pendingActivation: false, addonOnly: true };
  }

  /** Persian label for a billable term, used in invoices and notifications. */
  private planTermLabel(months: number): string {
    if (months === 3) return 'سه‌ماهه';
    if (months === 6) return 'شش‌ماهه';
    if (months === 12) return 'یک‌ساله';
    return 'یک‌ماهه';
  }
}
