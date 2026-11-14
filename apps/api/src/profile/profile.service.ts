import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IdentityInquiryKind,
  IdentityInquiryStatus,
  NewsStatus,
  NotificationType,
  PaymentStatus,
  Prisma,
  WalletEntryKind,
} from '@prisma/client';
import { randomBytes } from 'node:crypto';

import { ActivityService } from '../activity/activity.service';
import { OtpService } from '../auth/otp.service';
import { paypingReturnBaseUrl } from '../common/app-url';
import { isProfileComplete, isValidNationalCode } from '../common/national-code';
import { FINANCE_SOURCE_TYPES } from '../finance/finance.constants';
import { FinanceService } from '../finance/finance.service';
import { PaymentSimulatorService } from '../payping/payment-simulator.service';
import { PaypingService } from '../payping/payping.service';
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ZohalService } from '../zohal/zohal.service';
import { WalletService } from '../wallet/wallet.service';

// Only these profile fields may be changed through a request. Everything else
// (role, password, ...) is intentionally out of scope. Phone/email changes are
// OTP-verified before the request is filed, then need admin approval too.
const ALLOWED_FIELDS = ['fullName', 'phone', 'email'] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

function pickAllowed(changes: Prisma.JsonObject): Partial<Record<AllowedField, string>> {
  const picked: Partial<Record<AllowedField, string>> = {};
  for (const key of ALLOWED_FIELDS) {
    const value = changes[key];
    if (typeof value === 'string' && value.trim()) {
      picked[key] = value.trim();
    }
  }
  return picked;
}

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
    private readonly otp: OtpService,
    private readonly settings: SettingsService,
    private readonly zohal: ZohalService,
    private readonly wallet: WalletService,
    private readonly payping: PaypingService,
    private readonly simulator: PaymentSimulatorService,
    private readonly finance: FinanceService,
  ) {}

  /** Contact changes rely on the same OTP delivery as phone sign-in. */
  private async assertOtpAvailable(): Promise<void> {
    if (!(await this.settings.getPhoneLoginEnabled())) {
      throw new BadRequestException(
        'امکان ارسال کد تأیید در حال حاضر غیرفعال است',
      );
    }
  }

  /**
   * Persist one identity-inquiry attempt. Best-effort: the audit trail must
   * never break the paid flow, and `CACHED` rows keep the «no double charge»
   * story visible in the history (see `IdentityInquiryLog`).
   */
  private async logInquiry(input: {
    userId: string;
    kind: IdentityInquiryKind;
    status: IdentityInquiryStatus;
    nationalCode?: string | null;
    birthDate?: string | null;
    phone?: string | null;
    matched?: boolean | null;
    firstName?: string | null;
    lastName?: string | null;
    fatherName?: string | null;
    message?: string | null;
    amount?: number;
    raw?: unknown;
  }): Promise<void> {
    try {
      await this.prisma.identityInquiryLog.create({
        data: {
          userId: input.userId,
          kind: input.kind,
          status: input.status,
          nationalCode: input.nationalCode ?? null,
          birthDate: input.birthDate ?? null,
          phone: input.phone ?? null,
          matched: input.matched ?? null,
          firstName: input.firstName ?? null,
          lastName: input.lastName ?? null,
          fatherName: input.fatherName ?? null,
          message: input.message ?? null,
          amount: input.amount ?? 0,
          raw: (input.raw ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    } catch {
      // history is best-effort
    }
  }

  /** Profile of the current user plus their latest pending change request. */
  async me(userId: string) {
    const [user, pending, identityInquiryAvailable, identityHistory] =
      await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          fullName: true,
          firstName: true,
          lastName: true,
          fatherName: true,
          nationalCode: true,
          birthDate: true,
          phoneMatchVerifiedAt: true,
          identityVerifiedAt: true,
          verifiedAt: true,
          blueTickRequestedAt: true,
          blueTickNote: true,
          role: true,
          isActive: true,
          createdAt: true,
          plan: true,
          passwordHash: true,
        },
      }),
      this.prisma.profileChangeRequest.findFirst({
        where: { userId, status: NewsStatus.PENDING },
        orderBy: { createdAt: 'desc' },
      }),
      this.zohal.identityInquiryAvailable(),
      this.prisma.identityInquiryLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
    ]);
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    // Never leak the hash itself — only whether a password has been set.
    const { passwordHash, ...rest } = user;
    return {
      ...rest,
      hasPassword: Boolean(passwordHash),
      profileCompleted: isProfileComplete(user),
      identityInquiryAvailable,
      identity: {
        phoneMatched: Boolean(user.phoneMatchVerifiedAt),
        verified: Boolean(user.identityVerifiedAt),
        nationalCode: user.nationalCode,
        birthDate: user.birthDate,
        firstName: user.firstName,
        lastName: user.lastName,
        fatherName: user.fatherName,
      },
      identityHistory,
      pendingChange: pending,
    };
  }

  /**
   * Step 1: prove the signed-in mobile belongs to the national code (Shahkar)
   * and capture the Jalali birth date. The paid call is charged to the wallet
   * even when Shahkar says «not matched», because the upstream inquiry was
   * consumed. A successful match clears any previous identity verification.
   */
  async matchIdentityPhone(
    userId: string,
    dto: { nationalCode: string; birthDate: string },
    options: { skipOnlineGuard?: boolean; skipWallet?: boolean; force?: boolean } = {},
  ) {
    if (
      !options.skipOnlineGuard &&
      (await this.settings.getPaymentsOnlineOnly())
    ) {
      throw new BadRequestException(
        'پرداخت استعلام هویت فقط به‌صورت آنلاین انجام می‌شود؛ از دکمه‌ی «پرداخت و استعلام» استفاده کنید.',
      );
    }
    await this.settings.assertFeatureEnabled(
      'featureIdentityInquiry',
      'استعلام هویت موقتاً توسط مدیر غیرفعال شده است.',
    );
    const nationalCode = dto.nationalCode.trim();
    if (!isValidNationalCode(nationalCode)) {
      throw new BadRequestException('کد ملی وارد‌شده معتبر نیست');
    }
    const birthDate = dto.birthDate.trim();
    const owner = await this.prisma.user.findUnique({
      where: { nationalCode },
      select: { id: true },
    });
    if (owner && owner.id !== userId) {
      throw new ConflictException('این کد ملی قبلاً برای حساب دیگری ثبت شده است');
    }
    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        phone: true,
        phoneVerified: true,
        nationalCode: true,
        birthDate: true,
        phoneMatchVerifiedAt: true,
      },
    });
    if (!me?.phone || !me.phoneVerified) {
      throw new BadRequestException(
        'برای استعلام مالکیت شماره، ابتدا باید شماره موبایل حساب تأیید شده باشد.',
      );
    }

    // Idempotency: the same national code + birth date already matched on this
    // account, so nothing is re-sent upstream and nothing is charged. The row
    // is still logged (CACHED) so the history shows what happened.
    if (
      !options.force &&
      me.phoneMatchVerifiedAt &&
      me.nationalCode === nationalCode &&
      me.birthDate === birthDate
    ) {
      await this.logInquiry({
        userId,
        kind: IdentityInquiryKind.PHONE_MATCH,
        status: IdentityInquiryStatus.CACHED,
        nationalCode,
        birthDate,
        phone: me.phone,
        matched: true,
        message: 'قبلاً تطبیق داده شده بود؛ هزینه‌ی مجدد ثبت نشد.',
      });
      return {
        matched: true,
        cached: true,
        charged: 0,
        nationalCode,
        birthDate,
        phoneMatchVerifiedAt: me.phoneMatchVerifiedAt,
      };
    }

    const inquiry = await this.zohal.verifyPhoneOwnership(
      me.phone,
      nationalCode,
    );
    const price = await this.zohal.getServicePrice('shahkar');
    // Charge only when Zohal actually answered; a network/timeout failure never
    // consumed the paid inquiry, so the user must not be billed for it.
    let charged = 0;
    if (inquiry.httpStatus !== null && !options.skipWallet) {
      charged = await this.wallet.charge({
        userId,
        kind: WalletEntryKind.PHONE_MATCH,
        amount: price,
        title: 'تطبیق شماره موبایل و کد ملی (شاهکار)',
        sourceType: 'ZOHAL',
        sourceId: 'shahkar',
        idempotencyKey: `identity:phone-match:${userId}:${nationalCode}:${birthDate}`,
      });
    }

    if (!inquiry.ok) {
      await this.logInquiry({
        userId,
        kind: IdentityInquiryKind.PHONE_MATCH,
        status: IdentityInquiryStatus.FAILED,
        nationalCode,
        birthDate,
        phone: me.phone,
        matched: null,
        message: inquiry.message ?? 'استعلام شاهکار انجام نشد',
        amount: charged,
        raw: inquiry.data ?? null,
      });
      throw new BadRequestException(
        inquiry.message || 'استعلام شاهکار انجام نشد؛ لطفاً دوباره تلاش کنید.',
      );
    }
    if (!inquiry.data?.matched) {
      await this.logInquiry({
        userId,
        kind: IdentityInquiryKind.PHONE_MATCH,
        status: IdentityInquiryStatus.FAILED,
        nationalCode,
        birthDate,
        phone: me.phone,
        matched: false,
        message: 'شماره‌ی موبایل با کد ملی تطبیق نداشت',
        amount: charged,
        raw: inquiry.data ?? null,
      });
      throw new BadRequestException(
        'شماره‌ی موبایل تأییدشده با این کد ملی تطبیق ندارد؛ شماره و کد ملی را بررسی کنید.',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        nationalCode,
        birthDate,
        phoneMatchVerifiedAt: new Date(),
        // Any previous inquiry belongs to the old national code / birth date.
        identityVerifiedAt: null,
        fatherName: null,
        identityInquiryData: Prisma.DbNull,
      },
      select: {
        nationalCode: true,
        birthDate: true,
        phoneMatchVerifiedAt: true,
        identityVerifiedAt: true,
      },
    });
    await this.activity.log({
      actor: { id: userId },
      action: 'IDENTITY_PHONE_MATCHED',
      summary: 'تطبیق موفق شماره موبایل با کد ملی (شاهکار)',
      entityType: 'USER',
      entityId: userId,
    });
    await this.logInquiry({
      userId,
      kind: IdentityInquiryKind.PHONE_MATCH,
      status: IdentityInquiryStatus.SUCCESS,
      nationalCode,
      birthDate,
      phone: me.phone,
      matched: true,
      message: 'تطبیق شماره موبایل با کد ملی انجام شد',
      amount: charged,
      raw: inquiry.data ?? null,
    });
    return { matched: true, ...updated, charged };
  }

  /**
   * Step 2: run the paid Zohal identity inquiry with the already-matched
   * national code + birth date, store the returned name/father data and mark
   * the account as identity-verified. Idempotent once verified: a second call
   * returns the stored result without charging again.
   */
  async inquiryIdentity(
    userId: string,
    options: { skipOnlineGuard?: boolean; skipWallet?: boolean } = {},
  ) {
    if (
      !options.skipOnlineGuard &&
      (await this.settings.getPaymentsOnlineOnly())
    ) {
      throw new BadRequestException(
        'پرداخت استعلام هویت فقط به‌صورت آنلاین انجام می‌شود؛ از دکمه‌ی «پرداخت و استعلام» استفاده کنید.',
      );
    }
    await this.settings.assertFeatureEnabled(
      'featureIdentityInquiry',
      'استعلام هویت موقتاً توسط مدیر غیرفعال شده است.',
    );
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        nationalCode: true,
        birthDate: true,
        phoneMatchVerifiedAt: true,
        identityVerifiedAt: true,
        firstName: true,
        lastName: true,
        fatherName: true,
      },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    if (user.identityVerifiedAt) {
      await this.logInquiry({
        userId,
        kind: IdentityInquiryKind.IDENTITY_INQUIRY,
        status: IdentityInquiryStatus.CACHED,
        nationalCode: user.nationalCode,
        birthDate: user.birthDate,
        matched: true,
        firstName: user.firstName,
        lastName: user.lastName,
        fatherName: user.fatherName,
        message: 'هویت قبلاً استعلام شده بود؛ هزینه‌ی مجدد ثبت نشد.',
      });
      return {
        alreadyVerified: true,
        cached: true,
        charged: 0,
        identityVerifiedAt: user.identityVerifiedAt,
        firstName: user.firstName,
        lastName: user.lastName,
        fatherName: user.fatherName,
      };
    }
    if (!user.phoneMatchVerifiedAt || !user.nationalCode || !user.birthDate) {
      throw new BadRequestException(
        'ابتدا مرحله‌ی اول را کامل کنید: تطبیق کد ملی با شماره موبایل و ثبت تاریخ تولد.',
      );
    }

    const inquiry = await this.zohal.inquiryIdentity(
      user.nationalCode,
      user.birthDate,
    );
    const price = await this.zohal.getServicePrice('national_identity_inquiry');
    // Same rule as step 1: bill only a call that Zohal actually answered.
    let charged = 0;
    if (inquiry.httpStatus !== null && !options.skipWallet) {
      charged = await this.wallet.charge({
        userId,
        kind: WalletEntryKind.IDENTITY_INQUIRY,
        amount: price,
        title: 'استعلام اطلاعات هویتی (زحل)',
        sourceType: 'ZOHAL',
        sourceId: 'national_identity_inquiry',
        idempotencyKey: `identity:inquiry:${userId}:${user.nationalCode}:${user.birthDate}`,
      });
    }

    if (!inquiry.ok) {
      await this.logInquiry({
        userId,
        kind: IdentityInquiryKind.IDENTITY_INQUIRY,
        status: IdentityInquiryStatus.FAILED,
        nationalCode: user.nationalCode,
        birthDate: user.birthDate,
        matched: null,
        message: inquiry.message ?? 'استعلام هویت انجام نشد',
        amount: charged,
        raw: inquiry.data ?? null,
      });
      throw new BadRequestException(
        inquiry.message || 'استعلام هویت انجام نشد؛ لطفاً دوباره تلاش کنید.',
      );
    }
    if (!inquiry.data?.matched) {
      await this.logInquiry({
        userId,
        kind: IdentityInquiryKind.IDENTITY_INQUIRY,
        status: IdentityInquiryStatus.FAILED,
        nationalCode: user.nationalCode,
        birthDate: user.birthDate,
        matched: false,
        message: 'اطلاعات هویتی با کد ملی و تاریخ تولد تطبیق نداشت',
        amount: charged,
        raw: inquiry.data ?? null,
      });
      throw new BadRequestException(
        'اطلاعات هویتی با این کد ملی و تاریخ تولد تطبیق نداشت؛ تاریخ تولد را بررسی کنید.',
      );
    }
    const firstName = inquiry.data.first_name?.trim() ?? '';
    const lastName = inquiry.data.last_name?.trim() ?? '';
    if (!firstName || !lastName) {
      throw new BadRequestException(
        'نام و نام خانوادگی از استعلام هویت دریافت نشد',
      );
    }
    const fatherName = inquiry.data.father_name?.trim() || null;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        fatherName,
        fullName: `${firstName} ${lastName}`,
        identityVerifiedAt: new Date(),
        identityInquiryData: inquiry.data as unknown as Prisma.InputJsonValue,
      },
      select: {
        firstName: true,
        lastName: true,
        fatherName: true,
        fullName: true,
        identityVerifiedAt: true,
      },
    });
    await this.activity.log({
      actor: { id: userId },
      action: 'IDENTITY_INQUIRY_COMPLETED',
      summary: `تکمیل استعلام هویت: ${updated.fullName}`,
      entityType: 'USER',
      entityId: userId,
    });
    await this.logInquiry({
      userId,
      kind: IdentityInquiryKind.IDENTITY_INQUIRY,
      status: IdentityInquiryStatus.SUCCESS,
      nationalCode: user.nationalCode,
      birthDate: user.birthDate,
      matched: true,
      firstName,
      lastName,
      fatherName,
      message: 'استعلام اطلاعات هویتی با موفقیت انجام شد',
      amount: charged,
      raw: inquiry.data ?? null,
    });
    return { ...updated, charged };
  }

  // -------------------------------------------------------------------------
  //  Online payment for the identity bundle (شاهکار + استعلام هویتی)
  // -------------------------------------------------------------------------

  /**
   * Start the single online payment that covers both identity inquiries.
   * The wallet is never touched: the inquiries run only after the gateway
   * verifies the transaction.
   */
  async identityCheckout(
    userId: string,
    dto: { nationalCode?: string; birthDate?: string } = {},
  ) {
    await this.settings.assertFeatureEnabled(
      'featureIdentityInquiry',
      'استعلام هویت موقتاً توسط مدیر غیرفعال شده است.',
    );
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        phone: true,
        phoneVerified: true,
        nationalCode: true,
        birthDate: true,
        identityVerifiedAt: true,
        fullName: true,
        email: true,
      },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    if (user.identityVerifiedAt) {
      return { alreadyVerified: true, amount: 0, url: null, paid: false };
    }
    if (!user.phone || !user.phoneVerified) {
      throw new BadRequestException(
        'برای استعلام هویت، ابتدا باید شماره موبایل حساب تأیید شده باشد.',
      );
    }

    const nationalCode = (dto.nationalCode ?? user.nationalCode ?? '').trim();
    if (!isValidNationalCode(nationalCode)) {
      throw new BadRequestException('کد ملی وارد‌شده معتبر نیست');
    }
    const birthDate = (dto.birthDate ?? user.birthDate ?? '').trim();
    if (!birthDate) {
      throw new BadRequestException('برای استعلام هویت، تاریخ تولد را انتخاب کنید.');
    }
    const owner = await this.prisma.user.findUnique({
      where: { nationalCode },
      select: { id: true },
    });
    if (owner && owner.id !== userId) {
      throw new ConflictException('این کد ملی قبلاً برای حساب دیگری ثبت شده است');
    }

    // A verified-but-not-yet-consumed payment is reused, so a browser refresh
    // or a retry never charges the user twice.
    const paid = await this.prisma.servicePayment.findFirst({
      where: {
        userId,
        serviceKey: 'identity_bundle',
        status: PaymentStatus.PAID,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (paid) {
      return {
        paymentId: paid.id,
        amount: paid.amount,
        url: null,
        paid: true,
        paymentCode: paid.paymentCode,
      };
    }

    const { total } = await this.zohal.identityBundlePrice();
    if (total < 1000) {
      throw new BadRequestException(
        'تعرفه‌ی استعلام هویت برای پرداخت آنلاین معتبر نیست؛ با پشتیبانی تماس بگیرید.',
      );
    }
    const productCode = await this.zohal
      .ensureIdentityBundleProduct()
      .catch(() => null);

    await this.prisma.servicePayment.updateMany({
      where: { userId, serviceKey: 'identity_bundle', status: PaymentStatus.PENDING },
      data: {
        status: PaymentStatus.CANCELED,
        failureReason: 'پرداخت جدید جایگزین شد',
      },
    });
    const clientRefId = randomBytes(16).toString('hex');
    const payment = await this.prisma.servicePayment.create({
      data: {
        userId,
        serviceKey: 'identity_bundle',
        amount: total,
        nationalCode,
        birthDate,
        clientRefId,
      },
    });

    const returnUrl = `${paypingReturnBaseUrl()}/api/profile/identity/payments/callback`;
    let result: { paymentCode?: string; url?: string } | null = null;
    try {
      result = this.simulator.isEnabled
        ? this.simulator.createPayment({
            amount: total,
            returnUrl,
            clientRefId,
            description: 'استعلام هویت (شاهکار + هویتی) — شمالی‌کارت',
          })
        : ((await this.payping.createPayment({
            amount: total,
            returnUrl,
            payerIdentity: user.phone ?? user.email ?? undefined,
            payerName: user.fullName ?? undefined,
            description: 'استعلام هویت (شاهکار + هویتی) — شمالی‌کارت',
            clientRefId,
            isReversible: false,
          })) as { paymentCode?: string; url?: string } | null);
    } catch (error) {
      await this.prisma.servicePayment.update({
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
      await this.prisma.servicePayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: 'پاسخ نامعتبر از درگاه',
        },
      });
      throw new BadRequestException('ساخت پرداخت در درگاه ناموفق بود');
    }
    const updated = await this.prisma.servicePayment.update({
      where: { id: payment.id },
      data: { paymentCode: result.paymentCode, gatewayUrl: result.url },
    });
    return {
      paymentId: updated.id,
      amount: updated.amount,
      url: updated.gatewayUrl,
      paid: false,
      paymentCode: updated.paymentCode,
      productCode,
    };
  }

  /** Run both inquiries once the bundle payment is confirmed. */
  private async performIdentityBundle(
    userId: string,
    nationalCode: string | null,
    birthDate: string | null,
  ) {
    if (!nationalCode || !birthDate) {
      throw new BadRequestException('اطلاعات هویتی پرداخت ناقص است.');
    }
    await this.matchIdentityPhone(
      userId,
      { nationalCode, birthDate },
      { skipOnlineGuard: true, skipWallet: true, force: true },
    );
    return this.inquiryIdentity(userId, {
      skipOnlineGuard: true,
      skipWallet: true,
    });
  }

  /** Retry the paid bundle without charging again (used after a failed call). */
  async verifyIdentityPayment(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { identityVerifiedAt: true },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    if (user.identityVerifiedAt) {
      return { alreadyVerified: true, charged: 0 };
    }
    const paid = await this.prisma.servicePayment.findFirst({
      where: {
        userId,
        serviceKey: 'identity_bundle',
        status: PaymentStatus.PAID,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!paid) {
      throw new BadRequestException(
        'پرداخت آنلاین استعلام هویت انجام نشده است؛ ابتدا مبلغ را پرداخت کنید.',
      );
    }
    const result = await this.performIdentityBundle(
      userId,
      paid.nationalCode,
      paid.birthDate,
    );
    await this.prisma.servicePayment.update({
      where: { id: paid.id },
      data: { consumedAt: new Date() },
    });
    return result;
  }

  /**
   * Gateway return URL. Verifies the transaction, runs both inquiries and
   * redirects the browser back to the onboarding step.
   */
  async handleIdentityPaymentCallback(params: {
    paymentCode?: string;
    refId?: string;
    clientRefId?: string;
    status?: number;
  }) {
    const successUrl = `${paypingReturnBaseUrl()}/dashboard/onboarding?identity=success`;
    const failedUrl = `${paypingReturnBaseUrl()}/dashboard/onboarding?identity=failed`;
    const paymentCode = params.paymentCode?.trim() || undefined;
    const refId = params.refId?.trim() || undefined;
    const clientRefId = params.clientRefId?.trim() || undefined;
    const payment = paymentCode
      ? await this.prisma.servicePayment.findUnique({ where: { paymentCode } })
      : clientRefId
        ? await this.prisma.servicePayment.findUnique({ where: { clientRefId } })
        : null;
    if (!payment) return { redirectUrl: failedUrl };
    if (payment.status === PaymentStatus.PAID) {
      if (!payment.consumedAt) {
        try {
          await this.performIdentityBundle(
            payment.userId,
            payment.nationalCode,
            payment.birthDate,
          );
          await this.prisma.servicePayment.update({
            where: { id: payment.id },
            data: { consumedAt: new Date() },
          });
        } catch {
          return { redirectUrl: failedUrl };
        }
      }
      return { redirectUrl: successUrl };
    }
    if (payment.status === PaymentStatus.CANCELED) {
      return { redirectUrl: failedUrl };
    }
    if (params.status === 0) {
      await this.prisma.servicePayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: 'پرداخت توسط کاربر لغو شد یا درگاه آن را ناموفق اعلام کرد',
        },
      });
      return { redirectUrl: failedUrl };
    }
    if (!refId || !payment.paymentCode) {
      await this.prisma.servicePayment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED, failureReason: 'اطلاعات بازگشتی ناقص است' },
      });
      return { redirectUrl: failedUrl };
    }

    type VerifyResult = { amount?: number };
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
          })) as VerifyResult | null);
    } catch (error) {
      await this.prisma.servicePayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason:
            error instanceof Error ? error.message.slice(0, 300) : 'تأیید پرداخت ناموفق بود',
        },
      });
      return { redirectUrl: failedUrl };
    }
    if (!verified || Number(verified.amount ?? 0) !== payment.amount) {
      await this.prisma.servicePayment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED, failureReason: 'مبلغ تأییدشده مطابق نیست' },
      });
      return { redirectUrl: failedUrl };
    }

    await this.prisma.servicePayment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        refId,
        paidAt: new Date(),
        verifiedAt: new Date(),
      },
    });
    try {
      await this.finance.recordSale({
        sourceType: FINANCE_SOURCE_TYPES.SERVICE_PAYMENT,
        sourceId: payment.id,
        title: 'استعلام هویت (شاهکار + هویتی)',
        amount: payment.amount,
        paidAt: new Date(),
        userId: payment.userId,
        metadata: { serviceKey: payment.serviceKey, refId },
      });
    } catch {
      // Invoicing is best-effort; the paid inquiry must still run.
    }
    try {
      await this.performIdentityBundle(
        payment.userId,
        payment.nationalCode,
        payment.birthDate,
      );
      await this.prisma.servicePayment.update({
        where: { id: payment.id },
        data: { consumedAt: new Date() },
      });
      return { redirectUrl: successUrl };
    } catch (error) {
      await this.prisma.servicePayment.update({
        where: { id: payment.id },
        data: {
          failureReason:
            error instanceof Error ? error.message.slice(0, 300) : 'اجرای استعلام ناموفق بود',
        },
      });
      return { redirectUrl: failedUrl };
    }
  }

  /**
   * Save the identity fields that unlock content creation. `fullName` is kept
   * in sync so every list, invoice and notification keeps showing one name.
   *
   * When the Zohal identity inquiry is available, the caller only sends the
   * national code + Jalali birth date and the first/last name are filled from
   * the inquiry (never trusted from the client). The manual name fields are a
   * fallback for when the admin has switched the inquiry off.
   */
  async updateIdentity(
    userId: string,
    dto: {
      firstName?: string;
      lastName?: string;
      nationalCode: string;
      birthDate?: string;
    },
  ) {
    if (await this.zohal.identityInquiryAvailable()) {
      throw new BadRequestException(
        'برای ثبت هویت از مرحله‌های «تطبیق شاهکار» و «استعلام هویت» در پروفایل استفاده کنید.',
      );
    }
    const nationalCode = dto.nationalCode.trim();
    if (!isValidNationalCode(nationalCode)) {
      throw new BadRequestException('کد ملی وارد‌شده معتبر نیست');
    }
    const owner = await this.prisma.user.findUnique({
      where: { nationalCode },
      select: { id: true },
    });
    if (owner && owner.id !== userId) {
      throw new ConflictException('این کد ملی قبلاً برای حساب دیگری ثبت شده است');
    }

    let firstName = dto.firstName?.trim() ?? '';
    let lastName = dto.lastName?.trim() ?? '';
    let fatherName: string | null = null;
    let inquiryData: Prisma.InputJsonValue | undefined;
    const birthDate = dto.birthDate?.trim() || null;
    let inquiryUsed = false;

    if (!firstName || !lastName) {
      if (!birthDate) {
        throw new BadRequestException(
          'برای استعلام خودکار هویت، تاریخ تولد شمسی الزامی است',
        );
      }
      if (!(await this.zohal.identityInquiryAvailable())) {
        throw new BadRequestException(
          'استعلام خودکار هویت در دسترس نیست؛ نام و نام خانوادگی را دستی وارد کنید',
        );
      }
      const inquiry = await this.zohal.inquiryIdentity(nationalCode, birthDate);
      if (!inquiry.ok) {
        throw new BadRequestException(
          inquiry.message || 'استعلام هویت انجام نشد؛ لطفاً دوباره تلاش کنید',
        );
      }
      if (!inquiry.data?.matched) {
        throw new BadRequestException(
          'اطلاعات هویتی با این کد ملی و تاریخ تولد تطبیق نداشت؛ تاریخ تولد را بررسی کنید',
        );
      }
      firstName = inquiry.data.first_name?.trim() ?? '';
      lastName = inquiry.data.last_name?.trim() ?? '';
      fatherName = inquiry.data.father_name?.trim() || null;
      inquiryData = inquiry.data as unknown as Prisma.InputJsonValue;
      inquiryUsed = true;
      if (!firstName || !lastName) {
        throw new BadRequestException(
          'نام و نام خانوادگی از استعلام هویت دریافت نشد',
        );
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        fatherName,
        nationalCode,
        birthDate,
        fullName: `${firstName} ${lastName}`,
        ...(inquiryUsed
          ? { identityVerifiedAt: new Date(), identityInquiryData: inquiryData }
          : {}),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        firstName: true,
        lastName: true,
        nationalCode: true,
        birthDate: true,
        phoneMatchVerifiedAt: true,
        identityVerifiedAt: true,
        verifiedAt: true,
        blueTickRequestedAt: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (inquiryUsed) {
      const price = await this.zohal.getServicePrice('national_identity_inquiry');
      await this.wallet.charge({
        userId,
        kind: WalletEntryKind.IDENTITY_INQUIRY,
        amount: price,
        title: 'استعلام اطلاعات هویتی',
        sourceType: 'ZOHAL',
        sourceId: 'national_identity_inquiry',
        idempotencyKey: `identity:inquiry:${userId}:${nationalCode}:${birthDate}`,
      });
    }
    await this.activity.log({
      actor: { id: userId, email: user.email, role: user.role },
      action: 'PROFILE_IDENTITY_UPDATED',
      summary: `تکمیل/ویرایش مشخصات هویتی: ${user.fullName}`,
      entityType: 'USER',
      entityId: userId,
    });
    return { ...user, profileCompleted: isProfileComplete(user) };
  }

  /** Submit a name change for admin approval (one pending request at a time). */
  async requestChange(userId: string, fullName: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    if ((user.fullName ?? '') === fullName.trim()) {
      throw new BadRequestException('نام جدید با نام فعلی یکسان است');
    }
    const created = await this.fileChangeRequest(userId, { fullName: fullName.trim() });
    await this.notifications.notifyAdmins({
      category: 'PROFILE',
      title: 'درخواست تغییر پروفایل',
      body: `«${user.fullName ?? user.email}» درخواست تغییر نام به «${fullName.trim()}» دارد.`,
      link: '/jga4rm8j?section=users',
      type: NotificationType.INFO,
      actorId: userId,
      sms: { section: 'کاربران', subject: 'درخواست تغییر پروفایل' },
    });
    await this.activity.log({
      actor: { id: userId },
      action: 'PROFILE_CHANGE_REQUESTED',
      summary: `درخواست تغییر نام به «${fullName.trim()}»`,
      entityType: 'USER',
      entityId: userId,
    });
    return created;
  }

  /** Latest change request of the current user (for the profile panel). */
  latestMine(userId: string) {
    return this.prisma.profileChangeRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ----- verified contact changes (phone / email) -----

  /**
   * Step 1 of a phone change: verify the new number can be used and send an OTP
   * to it. The code is namespaced (`phone-change`) so a sign-in code cannot be
   * replayed here. The current (old) number stays active until verification.
   */
  async requestPhoneChange(userId: string, rawPhone: string) {
    await this.assertOtpAvailable();
    const phone = OtpService.normalizePhone(rawPhone);
    const me = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!me) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    if (me.phone === phone) {
      throw new BadRequestException('این شماره همان شماره‌ی فعلی شماست');
    }
    const owner = await this.prisma.user.findUnique({ where: { phone } });
    if (owner && owner.id !== userId) {
      throw new ConflictException('این شماره قبلاً ثبت شده است');
    }
    const issued = await this.otp.issue(phone, 'phone-change');
    return { phone, ...issued };
  }

  /**
   * Step 2 of a phone change: check the OTP sent to the new number, then file a
   * pending change request. The number is NOT swapped here — the account keeps
   * its current phone until an admin approves the request. A code to the
   * *current* number is not required because the user is already authenticated
   * and proving control of the new number is the point.
   */
  async verifyPhoneChange(userId: string, rawPhone: string, code: string) {
    await this.assertOtpAvailable();
    const phone = OtpService.normalizePhone(rawPhone);
    const me = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!me) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    const owner = await this.prisma.user.findUnique({ where: { phone } });
    if (owner && owner.id !== userId) {
      throw new ConflictException('این شماره قبلاً ثبت شده است');
    }
    await this.otp.verify(phone, code, 'phone-change');
    const request = await this.fileChangeRequest(userId, { phone });
    await this.notifications.notifyAdmins({
      category: 'SECURITY',
      type: NotificationType.INFO,
      title: 'درخواست تغییر شماره موبایل',
      body: `${me.fullName ?? me.email ?? me.phone} درخواست تغییر شماره به ${phone} دارد (کد تأیید شده).`,
      link: '/jga4rm8j?section=users',
      actorId: userId,
    });
    await this.activity.log({
      actor: { id: userId },
      action: 'PROFILE_PHONE_CHANGE_REQUESTED',
      summary: `درخواست تغییر شماره موبایل به ${phone}`,
      entityType: 'USER',
      entityId: userId,
    });
    return { ...request, applied: false };
  }

  /**
   * Step 1 of an email change: validate the new address for uniqueness and send
   * the OTP to *that* address, so the user proves control of the mailbox they
   * want to add. No verified phone is required.
   */
  async requestEmailChange(userId: string, rawEmail: string) {
    const email = rawEmail.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('ایمیل معتبر نیست');
    }
    const me = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!me) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    if (me.email === email) {
      throw new BadRequestException('این ایمیل همان ایمیل فعلی شماست');
    }
    const owner = await this.prisma.user.findUnique({ where: { email } });
    if (owner && owner.id !== userId) {
      throw new ConflictException('این ایمیل قبلاً ثبت شده است');
    }
    const issued = await this.otp.issueEmailChange(userId, email);
    return { email, sentTo: email, ...issued };
  }

  /**
   * Step 2 of an email change: check the OTP sent to the new email and apply
   * the change immediately. The code already proves control of the mailbox, so
   * no admin approval is required (unlike phone changes).
   */
  async verifyEmailChange(userId: string, rawEmail: string, code: string) {
    const email = rawEmail.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('ایمیل معتبر نیست');
    }
    const me = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!me) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    if (me.email === email) {
      throw new BadRequestException('این ایمیل همان ایمیل فعلی شماست');
    }
    const owner = await this.prisma.user.findUnique({ where: { email } });
    if (owner && owner.id !== userId) {
      throw new ConflictException('این ایمیل قبلاً ثبت شده است');
    }
    await this.otp.verifyEmailChange(userId, code);
    await this.prisma.user.update({ where: { id: userId }, data: { email } });
    await this.activity.log({
      actor: { id: userId, email },
      action: 'PROFILE_EMAIL_CHANGED',
      summary: `تغییر ایمیل از ${me.email ?? '—'} به ${email}`,
      entityType: 'USER',
      entityId: userId,
    });
    return { applied: true, email };
  }

  /**
   * Files the single PENDING change request for a user. When one already exists
   * its changes are merged with the new ones (a user may, for example, verify a
   * phone and an email while the admin has not reviewed the first request yet),
   * so the queue never contains more than one open request per user.
   */
  private async fileChangeRequest(
    userId: string,
    changes: Partial<Record<AllowedField, string>>,
  ) {
    const existing = await this.prisma.profileChangeRequest.findFirst({
      where: { userId, status: NewsStatus.PENDING },
    });
    if (existing) {
      const merged = {
        ...(existing.changes as Prisma.JsonObject),
        ...changes,
      } as Prisma.InputJsonValue;
      return this.prisma.profileChangeRequest.update({
        where: { id: existing.id },
        data: { changes: merged },
      });
    }
    return this.prisma.profileChangeRequest.create({
      data: { userId, changes },
    });
  }

  // ----- admin -----

  listRequests(status?: NewsStatus) {
    return this.prisma.profileChangeRequest.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, fullName: true, role: true } },
      },
    });
  }

  async decide(adminId: string, id: string, decision: NewsStatus, reason?: string) {
    const request = await this.prisma.profileChangeRequest.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });
    if (!request) {
      throw new NotFoundException('درخواست یافت نشد');
    }
    if (request.status !== NewsStatus.PENDING) {
      throw new BadRequestException('این درخواست قبلاً بررسی شده است');
    }
    const approved = decision === NewsStatus.APPROVED;
    const picked = pickAllowed(request.changes as Prisma.JsonObject);

    // Re-check uniqueness at approval time: another account may have claimed the
    // new phone/email while this request was pending.
    if (approved) {
      if (picked.phone) {
        const owner = await this.prisma.user.findUnique({
          where: { phone: picked.phone },
        });
        if (owner && owner.id !== request.userId) {
          throw new ConflictException(
            'این شماره از زمان ثبت درخواست توسط کاربر دیگری ثبت شده است',
          );
        }
      }
      if (picked.email) {
        const owner = await this.prisma.user.findUnique({
          where: { email: picked.email },
        });
        if (owner && owner.id !== request.userId) {
          throw new ConflictException(
            'این ایمیل از زمان ثبت درخواست توسط کاربر دیگری ثبت شده است',
          );
        }
      }
    }

    // A verified phone change also marks the new number as phone-verified.
    const appliedData: Prisma.UserUpdateInput = {
      ...picked,
      ...(approved && picked.fullName
        ? {
            firstName: picked.fullName.split(/\s+/)[0] ?? null,
            lastName: picked.fullName.split(/\s+/).slice(1).join(' ') || null,
          }
        : {}),
      ...(approved && picked.phone ? { phoneVerified: true } : {}),
    };

    await this.prisma.$transaction([
      this.prisma.profileChangeRequest.update({
        where: { id },
        data: { status: decision, reason: reason ?? null, decidedAt: new Date() },
      }),
      ...(approved && Object.keys(picked).length > 0
        ? [this.prisma.user.update({ where: { id: request.userId }, data: appliedData })]
        : []),
    ]);

    const changedLabels = [
      picked.fullName ? 'نام' : null,
      picked.phone ? 'شماره موبایل' : null,
      picked.email ? 'ایمیل' : null,
    ].filter(Boolean) as string[];

    await this.notifications.notify({
      userId: request.userId,
      title: approved ? 'تغییر پروفایل تأیید شد' : 'درخواست تغییر پروفایل رد شد',
      body: approved
        ? changedLabels.length
          ? `تغییر ${changedLabels.join(' و ')} شما تأیید و اعمال شد.`
          : 'تغییرات پروفایل شما اعمال شد.'
        : reason
          ? `درخواست شما رد شد: ${reason}`
          : 'درخواست تغییر پروفایل شما رد شد.',
      type: approved ? NotificationType.SUCCESS : NotificationType.WARNING,
      link: '/dashboard/profile',
      actorId: adminId,
    });
    if (approved) {
      await this.notifications.notifyAdmins({
        category: 'SECURITY',
        type: NotificationType.SUCCESS,
        title: 'تغییر تماس کاربر تأیید شد',
        body: `تغییر ${changedLabels.join(' و ') || 'پروفایل'} برای «${request.user.fullName ?? request.user.email}» اعمال شد.`,
        link: '/jga4rm8j?section=reports',
        actorId: adminId,
      });
    }
    await this.activity.log({
      actor: { id: adminId },
      action: approved ? 'PROFILE_CHANGE_APPROVED' : 'PROFILE_CHANGE_REJECTED',
      summary: `${approved ? 'تأیید' : 'رد'} تغییر ${changedLabels.join(' و ') || 'پروفایل'} «${request.user.fullName ?? request.user.email}»`,
      entityType: 'USER',
      entityId: request.userId,
    });
    return { ok: true };
  }
}
