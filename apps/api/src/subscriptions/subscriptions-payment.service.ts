import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  NotificationType,
  PaymentStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  WalletEntryKind,
} from '@prisma/client';
import { randomBytes } from 'node:crypto';

import { ActivityService } from '../activity/activity.service';
import { paypingReturnBaseUrl } from '../common/app-url';
import { addMonths, isPlanPeriodMonths, planPriceForMonths } from '../common/plans';
import { FINANCE_SOURCE_TYPES } from '../finance/finance.constants';
import { FinanceService } from '../finance/finance.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentSimulatorService } from '../payping/payment-simulator.service';
import { PaypingService } from '../payping/payping.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { WalletService } from '../wallet/wallet.service';

/**
 * Online subscription payment: PayPing checkout, the payment callback and
 * paid-plan activation. Split out of the large `SubscriptionsService`.
 */
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
   * Mirror one plan term into a PayPing «آیتم مالی» so every purchasable
   * period (1/3/6/12 months) has its own product in the merchant account. The
   * code is cached on the plan row and reused for later checkouts.
   */
  private async ensurePlanProduct(
    plan: SubscriptionPlan,
    months = 1,
  ): Promise<string> {
    if (!this.payping.configured) {
      throw new ServiceUnavailableException(
        'توکن درگاه پرداخت پی‌پینگ تنظیم نشده است. مقدار PAYPING_TOKEN را در محیط سرور قرار دهید.',
      );
    }
    const amount = planPriceForMonths(plan, months);
    const term = months === 1 ? 'یک‌ماهه' : `${months} ماهه`;
    const payload = {
      title: `اشتراک ${plan.name} — ${term} — شمالی‌کارت`,
      description: plan.description
        ? `${plan.description} (دوره‌ی ${term})`
        : `دوره‌ی ${term}`,
      amount,
      defineAmountByUser: false,
      haveTax: false,
      unlimited: true,
    };

    const codeField = this.planProductCodeField(months);
    const existingCode = plan[codeField];
    if (existingCode) {
      // Keep the remote product price/title in sync with the plan. A failure
      // here must not block a checkout that already has a valid product code.
      try {
        await this.payping.updateProduct({
          ...payload,
          code: existingCode,
        });
      } catch (error) {
        this.logger.warn(
          `PayPing product ${existingCode} sync failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      return existingCode;
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

  /** Prisma column that stores the PayPing product code of one term. */
  private planProductCodeField(
    months: number,
  ):
    | 'paypingProductCode'
    | 'paypingProductCode3Months'
    | 'paypingProductCode6Months'
    | 'paypingProductCode12Months' {
    if (months === 3) return 'paypingProductCode3Months';
    if (months === 6) return 'paypingProductCode6Months';
    if (months === 12) return 'paypingProductCode12Months';
    return 'paypingProductCode';
  }

  /** Best-effort product sync for every billable term (never throws). */
  async syncPlanProductQuietly(plan: SubscriptionPlan): Promise<void> {
    if (this.simulator.isEnabled || !this.payping.configured) return;
    for (const months of [1, 3, 6, 12] as const) {
      if (planPriceForMonths(plan, months) < 1000) continue;
      try {
        await this.ensurePlanProduct(plan, months);
      } catch (error) {
        this.logger.warn(
          `PayPing product sync for plan ${plan.id} (${months}m) failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  /** Admin action: create/refresh the PayPing products of every plan term. */
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
    return {
      planId,
      paypingProductCode: paypingProductCodes[1] ?? null,
      paypingProductCodes,
    };
  }

  /**
   * Start an online payment for a paid plan. Returns the PayPing gateway URL;
   * the plan is activated only after the callback verifies the transaction.
   */
  async checkout(
    userId: string,
    planId: string,
    requestedMonths = 1,
    returnTo?: string,
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
    const amount = planPriceForMonths(plan, months);
    if (amount < 1000) {
      throw new BadRequestException(
        'مبلغ این اشتراک برای پرداخت آنلاین معتبر نیست؛ از درخواست اشتراک استفاده کنید.',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        planId: true,
      },
    });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    if (user.planId === plan.id) {
      // Re-buying the same plan is allowed only to extend its term.
      const active = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { planExpiresAt: true },
      });
      if (!active?.planExpiresAt) {
        throw new BadRequestException('شما در حال حاضر مشترک این بسته هستید');
      }
    }
    await this.assertNotDowngrade(userId, plan.id);

    // Online-only mode (the current policy) always goes through the gateway,
    // so a purchase can never leave a negative wallet balance behind.
    const onlineOnly = await this.settings.getPaymentsOnlineOnly();
    if (!onlineOnly && (await this.settings.isFeatureEnabled('featureWallet'))) {
      return this.purchaseViaWallet(userId, plan, months);
    }

    // The simulator has no merchant account to mirror plans into.
    const paypingProductCode = this.simulator.isEnabled
      ? null
      : await this.ensurePlanProduct(plan, months);

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
      },
    });

    const returnUrl = `${paypingReturnBaseUrl()}/api/subscriptions/payments/callback`;
    let result: { paymentCode?: string; url?: string } | null = null;
    try {
      result = this.simulator.isEnabled
        ? this.simulator.createPayment({
            amount,
            returnUrl,
            clientRefId,
            description: `اشتراک ${plan.name} — شمالی‌کارت`,
          })
        : ((await this.payping.createPayment({
            amount,
            returnUrl,
            payerIdentity: user.phone ?? user.email ?? undefined,
            payerName: user.fullName ?? undefined,
            description: `اشتراک ${plan.name} — شمالی‌کارت`,
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
    };
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
  ) {
    const previous = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { planId: true, planExpiresAt: true },
    });
    const previousPlanId = previous?.planId ?? null;
    const amount = planPriceForMonths(plan, months);
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
    const periodNote = months > 1 ? ` برای دوره‌ی ${months} ماهه` : '';
    await this.notifications.notify({
      userId,
      type: NotificationType.SUCCESS,
      title: 'اشتراک شما فعال شد',
      body:
        charged > 0
          ? `بسته «${plan.name}»${periodNote} فعال شد و مبلغ ${charged.toLocaleString('fa-IR')} تومان به بدهی کیف پول شما اضافه شد؛ تا سررسید یک‌جا پرداخت کنید.`
          : `بسته «${plan.name}»${periodNote} روی حساب شما فعال شد.`,
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
    };
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
          activation.pendingActivation
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
      activation.pendingActivation
        ? `پرداخت با موفقیت انجام شد؛ برای فعال‌سازی اشتراک «${payment.plan.name}» به صفحه‌ی اشتراک‌ها بروید.`
        : `پرداخت با موفقیت انجام شد و اشتراک «${payment.plan.name}» فعال شد.`,
      activation.pendingActivation ? 'pending' : undefined,
    );
  }

  private callbackResult(
    status: 'success' | 'failed' | 'pending',
    message: string,
    planName?: string,
    options?: { returnTo?: string | null; activation?: 'pending' },
  ) {
    const params = new URLSearchParams({ payment: status });
    if (planName) params.set('plan', planName);
    if (options?.activation) params.set('activation', options.activation);
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
  ): Promise<{ subscriptionId: string | null; pendingActivation: boolean }> {
    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { id: paymentId },
      include: { plan: true, user: { select: { fullName: true, email: true } } },
    });
    if (!payment) return { subscriptionId: null, pendingActivation: false };
    if (payment.status === PaymentStatus.PAID) {
      return {
        subscriptionId: payment.subscriptionId,
        pendingActivation: false,
      };
    }

    const now = new Date();
    const paidAt = verified?.payedDate ? new Date(verified.payedDate) : now;
    const months = payment.months || 1;
    const term = this.planTermLabel(months);
    const result = await this.prisma.$transaction(async (tx) => {
      const account = await tx.user.findUnique({
        where: { id: payment.userId },
        select: { planId: true, planExpiresAt: true },
      });
      const activeOtherPlan = Boolean(
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
      await this.finance.recordSale({
        sourceType: FINANCE_SOURCE_TYPES.SUBSCRIPTION,
        sourceId: payment.id,
        title: `خرید اشتراک «${payment.plan.name}» — ${term}`,
        amount: payment.amount,
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
        },
      });
    } catch (error) {
      this.logger.warn(
        `invoice creation failed for subscription payment ${payment.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return { subscriptionId: result.id, pendingActivation };
  }

  /** Persian label for a billable term, used in invoices and notifications. */
  private planTermLabel(months: number): string {
    if (months === 3) return 'سه‌ماهه';
    if (months === 6) return 'شش‌ماهه';
    if (months === 12) return 'یک‌ساله';
    return 'یک‌ماهه';
  }
}
