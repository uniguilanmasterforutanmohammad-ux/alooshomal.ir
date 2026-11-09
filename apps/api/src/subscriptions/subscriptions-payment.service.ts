import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationType,
  PaymentStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  WalletEntryKind,
} from '@prisma/client';
import { randomBytes } from 'node:crypto';

import { ActivityService } from '../activity/activity.service';
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
    private readonly config: ConfigService,
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

  // -------------------------------------------------------------------------
  //  Online payment (PayPing)
  // -------------------------------------------------------------------------

  /** Public site origin used for the PayPing return URL and the final redirect. */
  private appUrl(): string {
    return (
      this.config.get<string>('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000'
    ).replace(/\/+$/, '');
  }

  /**
   * Mirror a plan into a PayPing «آیتم مالی» so every subscription has its own
   * product in the merchant account. The code is cached on the plan row and
   * reused for later checkouts.
   */
  private async ensurePlanProduct(plan: SubscriptionPlan): Promise<string> {
    if (!this.payping.configured) {
      throw new ServiceUnavailableException(
        'توکن درگاه پرداخت پی‌پینگ تنظیم نشده است. مقدار PAYPING_TOKEN را در محیط سرور قرار دهید.',
      );
    }
    const payload = {
      title: `اشتراک ${plan.name} — شمالی‌کارت`,
      description: plan.description ?? undefined,
      amount: plan.price,
      defineAmountByUser: false,
      haveTax: false,
      unlimited: true,
    };

    if (plan.paypingProductCode) {
      // Keep the remote product price/title in sync with the plan. A failure
      // here must not block a checkout that already has a valid product code.
      try {
        await this.payping.updateProduct({
          ...payload,
          code: plan.paypingProductCode,
        });
      } catch (error) {
        this.logger.warn(
          `PayPing product ${plan.paypingProductCode} sync failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      return plan.paypingProductCode;
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
      data: { paypingProductCode: created.code },
    });
    return created.code;
  }

  /** Best-effort product sync used by plan create/update (never throws). */
  async syncPlanProductQuietly(plan: SubscriptionPlan): Promise<void> {
    if (this.simulator.isEnabled || !this.payping.configured || plan.price < 1000)
      return;
    try {
      await this.ensurePlanProduct(plan);
    } catch (error) {
      this.logger.warn(
        `PayPing product sync for plan ${plan.id} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** Admin action: create/refresh the PayPing product of one plan. */
  async syncPaypingProduct(planId: string) {
    const plan = await this.requirePlan(planId);
    if (plan.price < 1000) {
      throw new BadRequestException(
        'برای ساخت محصول پی‌پینگ، قیمت اشتراک باید حداقل ۱۰۰۰ تومان باشد.',
      );
    }
    // Mirroring the plan as a PayPing product is desirable but not required by
    // `/v3/pay`; a restricted merchant token must not block a real payment.
    let paypingProductCode: string | null = null;
    try {
      paypingProductCode = await this.ensurePlanProduct(plan);
    } catch (error) {
      this.logger.warn(
        `PayPing product for plan ${plan.id} unavailable: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return { planId, paypingProductCode };
  }

  /**
   * Start an online payment for a paid plan. Returns the PayPing gateway URL;
   * the plan is activated only after the callback verifies the transaction.
   */
  async checkout(userId: string, planId: string) {
    const plan = await this.requirePlan(planId);
    if (!plan.isActive) {
      throw new BadRequestException('این اشتراک در حال حاضر فعال نیست');
    }
    if (plan.price < 1000) {
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
      throw new BadRequestException('شما در حال حاضر مشترک این بسته هستید');
    }

    // With the wallet switched on, the plan is activated right away and its
    // price is added to the user's tab instead of a per-purchase gateway call.
    if (await this.settings.isFeatureEnabled('featureWallet')) {
      return this.purchaseViaWallet(userId, plan);
    }

    // The simulator has no merchant account to mirror plans into.
    const paypingProductCode = this.simulator.isEnabled
      ? null
      : await this.ensurePlanProduct(plan);

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
        amount: plan.price,
        clientRefId,
        payerName: user.fullName ?? undefined,
      },
    });

    const returnUrl = `${this.appUrl()}/api/subscriptions/payments/callback`;
    let result: { paymentCode?: string; url?: string } | null = null;
    try {
      result = this.simulator.isEnabled
        ? this.simulator.createPayment({
            amount: plan.price,
            returnUrl,
            clientRefId,
            description: `اشتراک ${plan.name} — شمالی‌کارت`,
          })
        : ((await this.payping.createPayment({
            amount: plan.price,
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
  private async purchaseViaWallet(userId: string, plan: SubscriptionPlan) {
    const amount = await this.wallet.charge({
      userId,
      kind: WalletEntryKind.SUBSCRIPTION,
      amount: plan.price,
      title: `خرید اشتراک «${plan.name}»`,
      sourceType: 'SUBSCRIPTION_PLAN',
      sourceId: plan.id,
    });
    const now = new Date();
    const subscription = await this.prisma.$transaction(async (tx) => {
      await tx.userSubscription.deleteMany({
        where: { userId, status: SubscriptionStatus.PENDING },
      });
      const created = await tx.userSubscription.create({
        data: {
          userId,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          decidedAt: now,
          adminNote: 'فعال‌سازی با کیف پول (تسویه یک‌جا در سررسید)',
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { planId: plan.id },
      });
      return created;
    });
    await this.notifications.notify({
      userId,
      type: NotificationType.SUCCESS,
      title: 'اشتراک شما فعال شد',
      body:
        amount > 0
          ? `بسته «${plan.name}» فعال شد و مبلغ ${amount.toLocaleString('fa-IR')} تومان به بدهی کیف پول شما اضافه شد؛ تا سررسید یک‌جا پرداخت کنید.`
          : `بسته «${plan.name}» روی حساب شما فعال شد.`,
      link: '/dashboard/subscriptions',
    });
    await this.notifications.notifyAdmins({
      category: 'SUBSCRIPTION',
      scope: 'SUBSCRIPTION',
      title: 'خرید اشتراک از کیف پول',
      body: `بسته «${plan.name}» فعال شد و مبلغ ${amount.toLocaleString('fa-IR')} تومان به کیف پول کاربر اضافه شد.`,
      type: NotificationType.INFO,
      link: '/admin?section=wallets',
      actorId: userId,
    });
    await this.activity.log({
      action: 'SUBSCRIPTION_APPROVED',
      summary: `فعال‌سازی اشتراک «${plan.name}» با کیف پول`,
      entityType: 'SUBSCRIPTION',
      entityId: subscription.id,
    });
    return {
      wallet: true,
      paymentId: null,
      amount,
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
    if (payment.status === PaymentStatus.PAID) {
      return this.callbackResult(
        'success',
        'این پرداخت قبلاً تأیید شده و اشتراک شما فعال است.',
        payment.plan.name,
      );
    }
    if (payment.status === PaymentStatus.CANCELED) {
      return this.callbackResult(
        'failed',
        'این پرداخت لغو شده است.',
        payment.plan.name,
      );
    }
    if (!refId || !payment.paymentCode) {
      await this.markPaymentFailed(
        payment.id,
        'اطلاعات بازگشتی درگاه ناقص است',
      );
      return this.callbackResult(
        'failed',
        'اطلاعات بازگشتی درگاه ناقص بود؛ در صورت کسر وجه با پشتیبانی تماس بگیرید.',
        payment.plan.name,
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
        return this.callbackResult(
          'success',
          'پرداخت شما تأیید شد و اشتراک فعال است.',
          payment.plan.name,
        );
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
        await this.activatePaidSubscription(payment.id, refId, null);
        return this.callbackResult(
          'success',
          'پرداخت شما تأیید شد و اشتراک فعال است.',
          payment.plan.name,
        );
      }
      if (status >= 500) {
        // PayPing returns 202/502 while verification is still processing.
        return this.callbackResult(
          'pending',
          'تأیید پرداخت در حال پردازش است؛ چند لحظه بعد صفحه را دوباره باز کنید.',
          payment.plan.name,
        );
      }
      await this.markPaymentFailed(payment.id, message);
      return this.callbackResult('failed', message, payment.plan.name);
    }

    if (
      typeof verified?.amount === 'number' &&
      verified.amount !== payment.amount
    ) {
      await this.markPaymentFailed(
        payment.id,
        `مبلغ پرداخت‌شده (${verified.amount}) با مبلغ سفارش (${payment.amount}) مطابقت ندارد`,
      );
      return this.callbackResult(
        'failed',
        'مبلغ پرداخت‌شده با مبلغ اشتراک مطابقت ندارد؛ با پشتیبانی تماس بگیرید.',
        payment.plan.name,
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
      return this.callbackResult(
        'failed',
        'شناسه‌ی پرداخت با سفارش شما مطابقت ندارد.',
        payment.plan.name,
      );
    }

    await this.activatePaidSubscription(payment.id, refId, verified);
    return this.callbackResult(
      'success',
      `پرداخت با موفقیت انجام شد و اشتراک «${payment.plan.name}» فعال شد.`,
      payment.plan.name,
    );
  }

  private callbackResult(
    status: 'success' | 'failed' | 'pending',
    message: string,
    planName?: string,
  ) {
    const params = new URLSearchParams({ payment: status });
    if (planName) params.set('plan', planName);
    return {
      status,
      message,
      redirectUrl: `${this.appUrl()}/dashboard/subscriptions?${params.toString()}`,
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
   */
  private async activatePaidSubscription(
    paymentId: string,
    refId: string,
    verified: { payedDate?: string } | null,
  ) {
    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { id: paymentId },
      include: { plan: true, user: { select: { fullName: true, email: true } } },
    });
    if (!payment || payment.status === PaymentStatus.PAID) return;

    const now = new Date();
    const paidAt = verified?.payedDate ? new Date(verified.payedDate) : now;
    const subscription = await this.prisma.$transaction(async (tx) => {
      const created = await tx.userSubscription.create({
        data: {
          userId: payment.userId,
          planId: payment.planId,
          status: SubscriptionStatus.ACTIVE,
          decidedAt: now,
          adminNote: 'پرداخت آنلاین پی‌پینگ',
        },
      });
      await tx.user.update({
        where: { id: payment.userId },
        data: { planId: payment.planId },
      });
      await tx.userSubscription.updateMany({
        where: {
          userId: payment.userId,
          status: SubscriptionStatus.PENDING,
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

    await this.notifications.notify({
      userId: payment.userId,
      type: NotificationType.SUCCESS,
      title: 'اشتراک شما فعال شد',
      body: `پرداخت آنلاین انجام شد و بسته «${payment.plan.name}» روی حساب شما فعال شد.`,
      link: '/dashboard/subscriptions',
    });
    await this.notifications.notifyAdmins({
      category: 'SUBSCRIPTION',
      scope: 'SUBSCRIPTION',
      title: 'پرداخت آنلاین اشتراک',
      body: `${payment.user?.fullName ?? payment.user?.email ?? 'کاربر'} بسته «${payment.plan.name}» را به مبلغ ${payment.amount.toLocaleString('fa-IR')} تومان خریداری کرد.`,
      type: NotificationType.SUCCESS,
      link: '/admin?section=subscriptions',
      actorId: payment.userId,
    });
    await this.activity.log({
      action: 'SUBSCRIPTION_PAID',
      summary: `پرداخت آنلاین اشتراک «${payment.plan.name}»`,
      entityType: 'SUBSCRIPTION',
      entityId: subscription.id,
    });
    try {
      await this.finance.recordSale({
        sourceType: FINANCE_SOURCE_TYPES.SUBSCRIPTION,
        sourceId: payment.id,
        title: `خرید اشتراک «${payment.plan.name}»`,
        amount: payment.amount,
        paidAt: Number.isNaN(paidAt.getTime()) ? now : paidAt,
        userId: payment.userId,
        customerName: payment.user?.fullName ?? null,
        customerEmail: payment.user?.email ?? null,
        metadata: { planId: payment.planId, refId },
      });
    } catch (error) {
      this.logger.warn(
        `invoice creation failed for subscription payment ${payment.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
