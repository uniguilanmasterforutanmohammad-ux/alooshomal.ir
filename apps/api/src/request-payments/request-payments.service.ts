import {
  BadGatewayException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BoostTargetKind,
  NotificationScope,
  NotificationType,
  PaymentStatus,
  RequestPaymentTarget,
} from '@prisma/client';
import { randomBytes } from 'crypto';

import { NotificationsService } from '../notifications/notifications.service';
import { PaypingService } from '../payping/payping.service';
import { PrismaService } from '../prisma/prisma.service';

/** Smallest amount PayPing accepts; below this the request stays free. */
const MIN_GATEWAY_AMOUNT = 1000;

/** Public shape of a request payment returned to the web app. */
export interface RequestPaymentInfo {
  amount: number;
  status: PaymentStatus;
  url: string | null;
}

/**
 * Online prepayment for «افزایش بازدید» products (the «پله» boost and the two
 * ad placements). When the merchant gateway (`PAYPING_TOKEN`) is configured,
 * a request is only handed to the admin review queue after its fee is paid;
 * otherwise it keeps the legacy free behaviour and no payment row is created.
 *
 * One `RequestPayment` row is kept per request and refreshed on retry, so a
 * failed attempt never leaves a duplicate order behind.
 */
@Injectable()
export class RequestPaymentsService {
  private readonly logger = new Logger(RequestPaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payping: PaypingService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Site origin used for the gateway return URL. */
  private appUrl(): string {
    return (
      this.config.get<string>('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000'
    ).replace(/\/+$/, '');
  }

  /** Whether a request with this price must be paid before admin review. */
  isRequired(amount: number): boolean {
    return this.payping.configured && amount >= MIN_GATEWAY_AMOUNT;
  }

  /** Serialize a payment row for the web app. */
  static toInfo(
    payment: {
      amount: number;
      status: PaymentStatus;
      gatewayUrl: string | null;
    } | null,
  ): RequestPaymentInfo | null {
    if (!payment) return null;
    return {
      amount: payment.amount,
      status: payment.status,
      url: payment.status === PaymentStatus.PENDING ? payment.gatewayUrl : null,
    };
  }

  /**
   * Find or create the pending payment of one request and open (or reopen) a
   * PayPing order for it. Returns `null` when the gateway is not configured.
   */
  async start(params: {
    userId: string;
    target: RequestPaymentTarget;
    requestId: string;
    amount: number;
    description: string;
    payerIdentity?: string | null;
    payerName?: string | null;
  }): Promise<RequestPaymentInfo | null> {
    if (!this.isRequired(params.amount)) return null;

    const requestKey =
      params.target === RequestPaymentTarget.BOOST
        ? { boostRequestId: params.requestId }
        : { adRequestId: params.requestId };

    const existing = await this.prisma.requestPayment.findFirst({
      where: requestKey,
    });
    if (existing?.status === PaymentStatus.PAID) {
      return RequestPaymentsService.toInfo(existing);
    }

    const clientRefId = randomBytes(16).toString('hex');
    const base = {
      userId: params.userId,
      target: params.target,
      amount: params.amount,
      status: PaymentStatus.PENDING,
      clientRefId,
      paymentCode: null,
      refId: null,
      gatewayUrl: null,
      paidAt: null,
      verifiedAt: null,
      failureReason: null,
    };
    const payment = existing
      ? await this.prisma.requestPayment.update({
          where: { id: existing.id },
          data: base,
        })
      : await this.prisma.requestPayment.create({
          data: { ...base, ...requestKey },
        });

    const returnUrl = `${this.appUrl()}/api/payments/request-callback`;
    let result: { paymentCode?: string; url?: string } | null = null;
    try {
      result = (await this.payping.createPayment({
        amount: payment.amount,
        returnUrl,
        payerIdentity: params.payerIdentity ?? undefined,
        payerName: params.payerName ?? undefined,
        description: params.description.slice(0, 250),
        clientRefId: payment.clientRefId,
        isReversible: false,
      })) as { paymentCode?: string; url?: string } | null;
    } catch (error) {
      await this.markFailed(
        payment.id,
        error instanceof Error ? error.message : 'ساخت پرداخت ناموفق بود',
      );
      throw error;
    }

    if (!result?.paymentCode || !result?.url) {
      await this.markFailed(payment.id, 'پاسخ نامعتبر از پی‌پینگ');
      throw new BadGatewayException('ساخت پرداخت در پی‌پینگ ناموفق بود');
    }

    const updated = await this.prisma.requestPayment.update({
      where: { id: payment.id },
      data: { paymentCode: result.paymentCode, gatewayUrl: result.url },
    });
    return RequestPaymentsService.toInfo(updated);
  }

  /**
   * Handle PayPing's browser redirect for a boost/ad payment. Always returns a
   * redirect target so the user lands on a friendly page even on failure.
   */
  async handleCallback(params: {
    paymentCode?: string;
    refId?: string;
    clientRefId?: string;
  }): Promise<{ status: 'success' | 'failed' | 'pending'; message: string; redirectUrl: string }> {
    const paymentCode = params.paymentCode?.trim() || undefined;
    const clientRefId = params.clientRefId?.trim() || undefined;
    const refId = params.refId?.trim() || undefined;

    const payment = paymentCode
      ? await this.prisma.requestPayment.findUnique({ where: { paymentCode } })
      : clientRefId
        ? await this.prisma.requestPayment.findUnique({ where: { clientRefId } })
        : null;

    if (!payment) {
      return this.result('failed', 'پرداخت موردنظر پیدا نشد.');
    }
    if (payment.status === PaymentStatus.PAID) {
      return this.result('success', 'این پرداخت قبلاً تأیید شده و درخواست شما در صف بررسی مدیر است.');
    }
    if (payment.status === PaymentStatus.CANCELED) {
      return this.result('failed', 'این پرداخت لغو شده است.');
    }
    if (!refId || !payment.paymentCode) {
      await this.markFailed(payment.id, 'اطلاعات بازگشتی درگاه ناقص است');
      return this.result(
        'failed',
        'اطلاعات بازگشتی درگاه ناقص بود؛ در صورت کسر وجه با پشتیبانی تماس بگیرید.',
      );
    }

    type VerifyResult = {
      amount?: number;
      clientRefId?: string;
      paymentRefId?: number;
    };
    let verified: VerifyResult | null = null;
    try {
      verified = (await this.payping.verifyPayment({
        paymentRefId: Number(refId),
        paymentCode: payment.paymentCode,
        amount: payment.amount,
      })) as VerifyResult;
    } catch (error) {
      const current = await this.prisma.requestPayment.findUnique({
        where: { id: payment.id },
      });
      if (current?.status === PaymentStatus.PAID) {
        return this.result('success', 'پرداخت شما تأیید شد و درخواست در صف بررسی مدیر است.');
      }
      const upstreamStatus = (error as { paypingStatus?: number }).paypingStatus;
      const status =
        upstreamStatus ??
        (error instanceof HttpException ? error.getStatus() : 500);
      const message =
        error instanceof Error ? error.message : 'تأیید پرداخت ناموفق بود';
      if (status === 409) {
        // PayPing code 110: already verified (e.g. duplicated callback).
        await this.markPaid(payment.id, refId);
        return this.result('success', 'پرداخت شما تأیید شد و درخواست در صف بررسی مدیر است.');
      }
      if (status >= 500) {
        return this.result(
          'pending',
          'تأیید پرداخت در حال پردازش است؛ چند لحظه بعد صفحه را دوباره باز کنید.',
        );
      }
      await this.markFailed(payment.id, message);
      return this.result('failed', message);
    }

    if (typeof verified?.amount === 'number' && verified.amount !== payment.amount) {
      await this.markFailed(
        payment.id,
        `مبلغ پرداخت‌شده (${verified.amount}) با مبلغ سفارش (${payment.amount}) مطابقت ندارد`,
      );
      return this.result('failed', 'مبلغ پرداخت‌شده با مبلغ درخواست مطابقت ندارد؛ با پشتیبانی تماس بگیرید.');
    }
    if (verified?.clientRefId && verified.clientRefId !== payment.clientRefId) {
      await this.markFailed(payment.id, 'شناسه ارجاع بازگشتی با سفارش مطابقت ندارد');
      return this.result('failed', 'شناسه‌ی پرداخت با سفارش شما مطابقت ندارد.');
    }

    await this.markPaid(payment.id, refId);
    return this.result('success', 'پرداخت با موفقیت انجام شد و درخواست شما برای تأیید به مدیر ارسال شد.');
  }

  private result(
    status: 'success' | 'failed' | 'pending',
    message: string,
  ) {
    const params = new URLSearchParams({ payment: status });
    return {
      status,
      message,
      redirectUrl: `${this.appUrl()}/dashboard/boost?${params.toString()}`,
    };
  }

  private async markFailed(id: string, reason: string): Promise<void> {
    await this.prisma.requestPayment.update({
      where: { id },
      data: {
        status: PaymentStatus.FAILED,
        failureReason: reason.slice(0, 300),
      },
    });
  }

  /** Flip one payment to PAID and queue the underlying request for review. */
  private async markPaid(id: string, refId: string | null): Promise<void> {
    const payment = await this.prisma.requestPayment.update({
      where: { id },
      data: {
        status: PaymentStatus.PAID,
        refId,
        paidAt: new Date(),
        verifiedAt: new Date(),
        failureReason: null,
      },
    });
    await this.notifyAdmins(payment);
  }

  /** Tell the review team a paid request is now waiting for them. */
  private async notifyAdmins(payment: {
    id: string;
    userId: string;
    target: RequestPaymentTarget;
    boostRequestId: string | null;
    adRequestId: string | null;
    amount: number;
  }): Promise<void> {
    try {
      const isBoost = payment.target === RequestPaymentTarget.BOOST;
      const request = isBoost
        ? await this.prisma.boostRequest.findUnique({
            where: { id: payment.boostRequestId ?? '' },
          })
        : await this.prisma.adRequest.findUnique({
            where: { id: payment.adRequestId ?? '' },
          });
      if (!request) return;

      const label = await this.targetLabel(request.kind, request.targetId);
      const isDirectory = payment.target === RequestPaymentTarget.AD_DIRECTORY;
      const link = isBoost
        ? '/admin?section=boosts'
        : isDirectory
          ? '/admin?section=ads&placement=directory'
          : '/admin?section=ads';
      const title = isBoost
        ? 'درخواست پله پرداخت شد'
        : isDirectory
          ? 'درخواست تبلیغ دایرکتوری پرداخت شد'
          : 'درخواست تبلیغ پرداخت شد';

      await this.notifications.notifyAdmins({
        category: isBoost ? 'BOOST' : 'AD',
        scope: isBoost
          ? NotificationScope.BOOST
          : isDirectory
            ? NotificationScope.DIRECTORY_AD
            : NotificationScope.AD,
        title,
        body: `پرداخت «${label}» تأیید شد و درخواست برای بررسی در صف است.`,
        type: NotificationType.INFO,
        link,
        actorId: payment.userId,
      });
    } catch (error) {
      this.logger.warn(
        `paid-request admin notification failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** Human-readable name of a boost/ad target. */
  private async targetLabel(
    kind: BoostTargetKind,
    targetId: string,
  ): Promise<string> {
    if (kind === BoostTargetKind.BIOLINK) {
      const item = await this.prisma.biolink.findUnique({
        where: { id: targetId },
        select: { fullName: true },
      });
      return item?.fullName ?? 'بیولینک';
    }
    if (kind === BoostTargetKind.BUSINESS_CARD) {
      const item = await this.prisma.businessCard.findUnique({
        where: { id: targetId },
        select: { fullName: true },
      });
      return item?.fullName ?? 'کارت ویزیت';
    }
    const post = await this.prisma.feedPost.findUnique({
      where: { id: targetId },
      select: { body: true },
    });
    return post?.body?.slice(0, 40) || 'پست فید';
  }
}
