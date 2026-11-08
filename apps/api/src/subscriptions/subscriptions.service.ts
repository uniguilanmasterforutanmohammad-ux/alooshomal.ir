import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationType,
  PaymentStatus,
  Prisma,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client';
import { randomBytes } from 'node:crypto';

import {
  DEFAULT_PLAN,
  DEFAULT_PLANS,
  DEFAULT_HIDDEN_LINK_FIELDS,
  hiddenFieldsFrom,
  planLimitsFrom,
  PlanLimits,
} from '../common/plans';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import { PaypingService } from '../payping/payping.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { DecideSubscriptionDto } from './dto/decide-subscription.dto';
import { RequestSubscriptionDto } from './dto/request-subscription.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class SubscriptionsService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
    private readonly payping: PaypingService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Make sure the built-in plans always exist, even without running the seed.
    try {
      await this.ensureDefaultPlans();
      await this.backfillHiddenFields();
      await this.backfillFreeEmailHidden();
      await this.backfillPlanPrices();
    } catch {
      // The table may not exist yet on a very first boot; ignore and let the
      // entrypoint `prisma db push` create it, a later boot will seed it.
    }
  }

  /**
   * One-time migration for installations that already had the built-in plans
   * with a zero price. A marker row in `settings` guarantees an admin's later
   * decision to keep a plan free is never overwritten on the next boot.
   */
  private async backfillPlanPrices() {
    const marker = 'plansPriceBackfillV1';
    const done = await this.prisma.setting.findUnique({ where: { key: marker } });
    if (done) return;
    for (const plan of DEFAULT_PLANS) {
      if (plan.price <= 0) continue;
      await this.prisma.subscriptionPlan.updateMany({
        where: { name: plan.name, price: 0 },
        data: { price: plan.price },
      });
    }
    await this.prisma.setting.upsert({
      where: { key: marker },
      update: {},
      create: { key: marker, value: new Date().toISOString() },
    });
  }

  /**
   * One-time migration for plans created before the per-field `hiddenFields`
   * column existed: a plan that had social/web links hidden (`showSocialLinks
   * = false`) gets the legacy link-field list. The write path keeps the two in
   * sync, so this only ever matches un-migrated rows and is safe to re-run.
   */
  private async backfillHiddenFields() {
    await this.prisma.subscriptionPlan.updateMany({
      where: { showSocialLinks: false, hiddenFields: { equals: [] } },
      data: { hiddenFields: DEFAULT_HIDDEN_LINK_FIELDS },
    });
  }

  /**
   * The free plan now also hides the e-mail. Plans that already carry the
   * legacy link-field list (without `email`) get it appended; the update is
   * targeted so it never touches a custom list an admin curated.
   */
  private async backfillFreeEmailHidden() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { showSocialLinks: false },
      select: { id: true, hiddenFields: true },
    });
    for (const plan of plans) {
      const hidden = Array.isArray(plan.hiddenFields) ? plan.hiddenFields : [];
      if (hidden.length === 0 || hidden.includes('email')) continue;
      await this.prisma.subscriptionPlan.update({
        where: { id: plan.id },
        data: { hiddenFields: [...hidden, 'email'] },
      });
    }
  }

  /**
   * Ensure the three built-in plans exist. Called on boot (seeding) and before
   * any plan listing so the catalogue is never empty.
   */
  async ensureDefaultPlans() {
    for (const plan of DEFAULT_PLANS) {
      await this.prisma.subscriptionPlan.upsert({
        where: { name: plan.name },
        update: {},
        create: {
          name: plan.name,
          description: plan.description,
          price: plan.price,
          maxBiolinks: plan.maxBiolinks,
          maxBusinessCards: plan.maxBusinessCards,
          showSocialLinks: plan.showSocialLinks,
          hiddenFields: plan.hiddenFields,
          features: plan.features,
          sortOrder: plan.sortOrder,
          isActive: true,
        },
      });
    }
  }

  listPlans(activeOnly = true) {
    return this.prisma.subscriptionPlan.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
    });
  }

  /**
   * Brand-new users start on the free plan. We assign it lazily the first time
   * their limits/subscription are read, so the panel shows «اشتراک فعلی شما»
   * on the free plan instead of an «درخواست اشتراک» button.
   */
  private async ensureDefaultPlanForUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { planId: true },
    });
    if (!user || user.planId) return;
    const free = await this.prisma.subscriptionPlan.findFirst({
      where: { name: DEFAULT_PLAN.name },
      select: { id: true },
    });
    if (!free) return;
    await this.prisma.user.update({
      where: { id: userId },
      data: { planId: free.id },
    });
  }

  /**
   * Give a brand-new user the free plan immediately (called on registration).
   * Kept public so auth can seed the account without duplicating the lookup.
   */
  async assignDefaultPlan(userId: string): Promise<void> {
    await this.ensureDefaultPlanForUser(userId);
  }

  async createPlan(dto: CreatePlanDto) {
    const exists = await this.prisma.subscriptionPlan.findUnique({
      where: { name: dto.name },
    });
    if (exists) {
      throw new ConflictException('اشتراکی با این نام قبلاً وجود دارد');
    }
    const hiddenFields = dto.hiddenFields ?? [];
    const created = await this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price ?? 0,
        maxBiolinks: dto.maxBiolinks ?? 1,
        maxBusinessCards: dto.maxBusinessCards ?? 1,
        // `showSocialLinks` is kept in sync with the field toggles so the
        // legacy flag (and older clients) still behaves correctly.
        showSocialLinks: !hiddenFields.includes('website'),
        hiddenFields,
        features: dto.features ?? [],
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 99,
      },
    });
    await this.syncPlanProductQuietly(created);
    return created;
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    const current = await this.getPlan(id);
    const hiddenFields =
      dto.hiddenFields !== undefined
        ? dto.hiddenFields
        : hiddenFieldsFrom(current);
    const updated = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...dto,
        hiddenFields,
        showSocialLinks: !hiddenFields.includes('website'),
      },
    });
    if (
      updated.paypingProductCode &&
      (dto.price !== undefined || dto.name !== undefined || dto.description !== undefined)
    ) {
      await this.syncPlanProductQuietly(updated);
    } else if (!updated.paypingProductCode) {
      await this.syncPlanProductQuietly(updated);
    }
    return updated;
  }

  async getPlan(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('اشتراک یافت نشد');
    }
    return plan;
  }

  async removePlan(id: string) {
    const activeUsers = await this.prisma.user.count({ where: { planId: id } });
    if (activeUsers > 0) {
      throw new BadRequestException(
        'این اشتراک به کاربران فعال اختصاص یافته و قابل حذف نیست؛ آن را غیرفعال کنید.',
      );
    }
    const payments = await this.prisma.subscriptionPayment.count({
      where: { planId: id },
    });
    if (payments > 0) {
      throw new BadRequestException(
        'برای این اشتراک سابقه‌ی پرداخت ثبت شده و قابل حذف نیست؛ آن را غیرفعال کنید.',
      );
    }
    await this.getPlan(id);
    await this.prisma.subscriptionPlan.delete({ where: { id } });
    return { deleted: true };
  }

  /** The plan limits currently in force for a user. */
  async limitsForUser(userId: string): Promise<PlanLimits> {
    await this.ensureDefaultPlanForUser(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { plan: true },
    });
    return planLimitsFrom(user?.plan ?? null);
  }

  async mySubscriptions(userId: string) {
    await this.ensureDefaultPlanForUser(userId);
    const [plan, requests, payments] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: { plan: true },
      }),
      this.prisma.userSubscription.findMany({
        where: { userId },
        include: { plan: true },
        orderBy: { requestedAt: 'desc' },
        take: 20,
      }),
      this.prisma.subscriptionPayment.findMany({
        where: { userId },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);
    return { plan: plan?.plan ?? null, requests, payments };
  }

  /**
   * A user requests a plan. A pending request replaces any previous pending one.
   * If the user is already on that plan, the request is rejected early.
   */
  async requestSubscription(userId: string, dto: RequestSubscriptionDto) {
    const plan = await this.getPlan(dto.planId);
    if (!plan.isActive) {
      throw new BadRequestException('این اشتراک در حال حاضر فعال نیست');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.planId === plan.id) {
      throw new BadRequestException('شما در حال حاضر مشترک این بسته هستید');
    }

    await this.prisma.userSubscription.deleteMany({
      where: { userId, status: SubscriptionStatus.PENDING },
    });

    const request = await this.prisma.userSubscription.create({
      data: { userId, planId: plan.id, note: dto.note },
      include: { plan: true },
    });

    await this.notifications.notifyAdmins({
      category: 'SUBSCRIPTION',
      scope: 'SUBSCRIPTION',
      title: 'درخواست اشتراک جدید',
      body: `${user?.fullName ?? user?.email ?? 'کاربر'} درخواست بسته «${plan.name}» را ثبت کرد.`,
      type: NotificationType.INFO,
      link: '/admin?section=subscriptions',
      actorId: userId,
    });

    await this.activity.log({
      action: 'SUBSCRIPTION_REQUESTED',
      summary: `درخواست اشتراک «${plan.name}»`,
      entityType: 'SUBSCRIPTION',
      entityId: request.id,
    });

    return request;
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
  private async syncPlanProductQuietly(plan: SubscriptionPlan): Promise<void> {
    if (!this.payping.configured || plan.price < 1000) return;
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
    const plan = await this.getPlan(planId);
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
    const plan = await this.getPlan(planId);
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

    const paypingProductCode = await this.ensurePlanProduct(plan);

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

    let result: { paymentCode?: string; url?: string } | null = null;
    try {
      result = (await this.payping.createPayment({
        amount: plan.price,
        returnUrl: `${this.appUrl()}/api/subscriptions/payments/callback`,
        payerIdentity: user.phone ?? user.email ?? undefined,
        payerName: user.fullName ?? undefined,
        description: `اشتراک ${plan.name} — شمالی‌کارت`,
        clientRefId,
        isReversible: false,
      })) as { paymentCode?: string; url?: string } | null;
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
      verified = (await this.payping.verifyPayment({
        paymentRefId: Number(refId),
        paymentCode: payment.paymentCode,
        amount: payment.amount,
      })) as VerifyResult;
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
  }

  async listRequests(status?: SubscriptionStatus) {
    const where: Prisma.UserSubscriptionWhereInput = status ? { status } : {};
    return this.prisma.userSubscription.findMany({
      where,
      include: {
        plan: true,
        user: { select: { id: true, email: true, fullName: true } },
        decidedBy: { select: { id: true, email: true, fullName: true } },
      },
      orderBy: { requestedAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Paginated review queue for the limited «کاربر ادمین» panel. Pending rows
   * are shown to every reviewer; decided rows only to the reviewer who made
   * the call (`decidedById`).
   */
  async listRequestQueue(params: {
    status?: SubscriptionStatus;
    decidedById?: string;
    skip: number;
    take: number;
  }) {
    const { status, decidedById, skip, take } = params;
    const where: Prisma.UserSubscriptionWhereInput = {
      ...(status ? { status } : {}),
      ...(decidedById && status && status !== SubscriptionStatus.PENDING
        ? { decidedById }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.userSubscription.findMany({
        where,
        include: {
          plan: true,
          user: { select: { id: true, email: true, fullName: true } },
          decidedBy: { select: { id: true, email: true, fullName: true } },
        },
        orderBy: { requestedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.userSubscription.count({ where }),
    ]);
    return { items, total };
  }

  /** Per-status counts for the review-queue tabs. */
  async requestQueueCounts(decidedById: string) {
    const [pending, approved, rejected] = await this.prisma.$transaction([
      this.prisma.userSubscription.count({ where: { status: SubscriptionStatus.PENDING } }),
      this.prisma.userSubscription.count({
        where: { status: SubscriptionStatus.ACTIVE, decidedById },
      }),
      this.prisma.userSubscription.count({
        where: { status: SubscriptionStatus.REJECTED, decidedById },
      }),
    ]);
    return { pending, approved, rejected };
  }

  /**
   * Admin decides a subscription request. Approving applies the plan to the user
   * (and cancels that user's other pending/active requests).
   */
  async decideRequest(
    adminId: string,
    requestId: string,
    dto: DecideSubscriptionDto,
  ) {
    const request = await this.prisma.userSubscription.findUnique({
      where: { id: requestId },
      include: { plan: true },
    });
    if (!request) {
      throw new NotFoundException('درخواست اشتراک یافت نشد');
    }
    if (request.status !== SubscriptionStatus.PENDING) {
      throw new BadRequestException('این درخواست قبلاً بررسی شده است');
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.userSubscription.update({
        where: { id: requestId },
        data: {
          status: dto.status,
          decidedAt: now,
          decidedById: adminId,
          adminNote: dto.adminNote ?? null,
        },
        include: { plan: true },
      });

      if (dto.status === SubscriptionStatus.ACTIVE) {
        await tx.user.update({
          where: { id: request.userId },
          data: { planId: request.planId },
        });
        // supersede any other pending requests for this user
        await tx.userSubscription.updateMany({
          where: {
            userId: request.userId,
            status: SubscriptionStatus.PENDING,
            id: { not: requestId },
          },
          data: {
            status: SubscriptionStatus.CANCELLED,
            decidedAt: now,
            decidedById: adminId,
            adminNote: 'با تأیید درخواست دیگر لغو شد',
          },
        });
      }

      return updated;
    });

    const approved = dto.status === SubscriptionStatus.ACTIVE;
    await this.notifications.notify({
      userId: request.userId,
      type: approved ? NotificationType.SUCCESS : NotificationType.WARNING,
      title: approved ? 'اشتراک شما فعال شد' : 'درخواست اشتراک شما رد شد',
      body: approved
        ? `بسته «${request.plan?.name ?? ''}» روی حساب شما فعال شد.`
        : `درخواست بسته «${request.plan?.name ?? ''}» رد شد.` +
          (dto.adminNote ? ` دلیل: ${dto.adminNote}` : ''),
      link: '/dashboard/subscriptions',
      actorId: adminId,
    });

    await this.activity.log({
      action: approved ? 'SUBSCRIPTION_APPROVED' : 'SUBSCRIPTION_REJECTED',
      summary: `${approved ? 'تأیید' : 'رد'} اشتراک «${request.plan?.name ?? ''}»`,
      entityType: 'SUBSCRIPTION',
      entityId: requestId,
    });

    return updated;
  }

  /** Admin assigns a plan directly to a user (no request needed). */
  async assignPlan(userId: string, planId: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    const plan = planId ? await this.getPlan(planId) : null;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { planId },
      select: { id: true, email: true, fullName: true, planId: true },
    });

    if (plan) {
      await this.notifications.notify({
        userId,
        type: NotificationType.SUCCESS,
        title: 'اشتراک شما تغییر کرد',
        body: `بسته «${plan.name}» روی حساب شما فعال شد.`,
        link: '/dashboard/subscriptions',
      });
    }

    await this.activity.log({
      action: 'SUBSCRIPTION_ASSIGNED',
      summary: plan
        ? `تخصیص اشتراک «${plan.name}» به کاربر`
        : 'حذف اشتراک کاربر',
      entityType: 'USER',
      entityId: userId,
    });

    return updated;
  }

  async enforceNotExceeded(userId: string, kind: 'biolink' | 'businessCard') {
    await this.ensureDefaultPlanForUser(userId);
    const limits = await this.limitsForUser(userId);
    if (kind === 'biolink') {
      const count = await this.prisma.biolink.count({ where: { userId } });
      if (count >= limits.maxBiolinks) {
        throw new ForbiddenException(
          `سقف اشتراک شما (${limits.maxBiolinks} بیولینک) تکمیل شده است. برای ساخت بیشتر اشتراک خود را ارتقا دهید.`,
        );
      }
    } else {
      const count = await this.prisma.businessCard.count({ where: { userId } });
      if (count >= limits.maxBusinessCards) {
        throw new ForbiddenException(
          `سقف اشتراک شما (${limits.maxBusinessCards} کارت ویزیت) تکمیل شده است. برای ساخت بیشتر اشتراک خود را ارتقا دهید.`,
        );
      }
    }
  }
}
