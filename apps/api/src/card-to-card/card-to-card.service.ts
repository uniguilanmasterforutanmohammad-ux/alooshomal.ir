import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { BusinessModulesService } from '../business-modules/business-modules.service';
import { PrismaService } from '../prisma/prisma.service';
import { RetailService } from '../retail/retail.service';
import { SettingsService } from '../settings/settings.service';
import { ZohalService } from '../zohal/zohal.service';
import { ReviewCardPaymentDto } from './dto/review-payment.dto';
import { SubmitCardPaymentDto } from './dto/submit-payment.dto';
import { UpsertCardAccountDto } from './dto/upsert-account.dto';
import { VerifyCardDto } from './dto/verify-card.dto';

const CARD_VERIFICATION_CHECK = 'check_card_with_national_code';
const CARD_VERIFICATION_IBAN = 'card_to_iban';
const CARD_VERIFICATION_RETURN_TO = '/dashboard/business/card-to-card';

/** Normalise Persian/Arabic digits and strip separators from a card number. */
function normalizeCardNumber(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/\D/g, '');
}

/** Normalise an IBAN returned by the inquiry provider (`IR…`, no spaces). */
function normalizeIban(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  if (!cleaned) return null;
  return cleaned.startsWith('IR') ? cleaned : `IR${cleaned}`;
}

function isMatched(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function maskCardNumber(value: string): string {
  const digits = normalizeCardNumber(value);
  return digits.length >= 8
    ? `${digits.slice(0, 4)} **** **** ${digits.slice(-4)}`
    : digits;
}

function maskNationalCode(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 6
    ? `${digits.slice(0, 3)}****${digits.slice(-3)}`
    : null;
}

interface CompositeModuleSnapshot {
  serviceKey: string;
  label: string;
  amount: number;
  payload: Record<string, unknown>;
}

interface CompositeResultEntry {
  serviceKey: string;
  label?: string;
  ok: boolean;
  message?: string;
  data?: unknown;
  latencyMs?: number | null;
}

@Injectable()
export class CardToCardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modules: BusinessModulesService,
    private readonly settings: SettingsService,
    private readonly retail: RetailService,
    private readonly zohal: ZohalService,
  ) {}

  private async workspaceId(userId: string): Promise<string> {
    return this.modules.getWorkspaceId(userId);
  }

  // -------------------------------------------------------------------------
  //  Owner: card account + payment inbox
  // -------------------------------------------------------------------------

  async getAccount(userId: string) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.cardToCardAccount.findUnique({ where: { workspaceId } });
  }

  // -------------------------------------------------------------------------
  //  Owner: verify the card belongs to the user, then derive its IBAN
  // -------------------------------------------------------------------------

  private parseModules(items: unknown): CompositeModuleSnapshot[] {
    const raw = (items ?? {}) as { modules?: unknown };
    if (!Array.isArray(raw.modules)) return [];
    return (raw.modules as Array<Record<string, unknown>>)
      .filter((item) => typeof item?.serviceKey === 'string')
      .map((item) => ({
        serviceKey: String(item.serviceKey),
        label: String(item.label ?? item.serviceKey),
        amount: Number(item.amount ?? 0),
        payload:
          item.payload && typeof item.payload === 'object'
            ? (item.payload as Record<string, unknown>)
            : {},
      }));
  }

  private parseResults(result: unknown): CompositeResultEntry[] {
    if (!Array.isArray(result)) return [];
    return (result as Array<Record<string, unknown>>)
      .filter((item) => typeof item?.serviceKey === 'string')
      .map((item) => ({
        serviceKey: String(item.serviceKey),
        label: typeof item.label === 'string' ? item.label : undefined,
        ok: item.ok === true,
        message: typeof item.message === 'string' ? item.message : undefined,
        data: item.data,
        latencyMs:
          typeof item.latencyMs === 'number' ? item.latencyMs : null,
      }));
  }

  private summarizeVerification(
    payment: {
      id: string;
      amount: number;
      createdAt: Date;
      consumedAt: Date | null;
      items: unknown;
      result: unknown;
    },
    account: { cardNumber: string; iban: string | null } | null,
  ) {
    const modules = this.parseModules(payment.items);
    const results = this.parseResults(payment.result);
    const check = results.find(
      (entry) => entry.serviceKey === CARD_VERIFICATION_CHECK,
    );
    const ibanEntry = results.find(
      (entry) => entry.serviceKey === CARD_VERIFICATION_IBAN,
    );
    const checkData = (check?.data ?? {}) as Record<string, unknown>;
    const ibanData = (ibanEntry?.data ?? {}) as Record<string, unknown>;
    const matched = check ? check.ok && isMatched(checkData.matched) : null;
    const iban = ibanEntry ? normalizeIban(ibanData.IBAN) : null;
    const cardRaw =
      modules.find((item) => item.serviceKey === CARD_VERIFICATION_CHECK)
        ?.payload.card_number ??
      modules.find((item) => item.serviceKey === CARD_VERIFICATION_IBAN)
        ?.payload.card_number;
    const cardNumber =
      typeof cardRaw === 'string' ? normalizeCardNumber(cardRaw) : '';
    const applied = Boolean(
      account &&
        cardNumber.length === 16 &&
        account.cardNumber === cardNumber &&
        iban &&
        account.iban === iban,
    );
    return {
      paymentId: payment.id,
      createdAt: payment.createdAt.toISOString(),
      amount: payment.amount,
      status: payment.consumedAt ? 'DONE' : 'RUNNING',
      matched,
      iban,
      cardNumberMasked: cardNumber ? maskCardNumber(cardNumber) : null,
      applied,
      message: check?.message ?? ibanEntry?.message ?? null,
    };
  }

  async verificationOverview(userId: string) {
    const [composite, user, account] = await Promise.all([
      this.zohal.findCardVerificationComposite(),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { nationalCode: true, birthDate: true },
      }),
      this.getAccount(userId),
    ]);
    const nationalCode = user?.nationalCode?.trim() ?? '';
    const birthDate = user?.birthDate?.trim() ?? '';
    const profileReady = /^\d{10}$/.test(nationalCode) && Boolean(birthDate);
    let latest = null;
    if (composite) {
      const payment = await this.zohal.latestCompositePayment(
        userId,
        composite.key,
      );
      if (payment) {
        latest = this.summarizeVerification(
          {
            id: payment.id,
            amount: payment.amount,
            createdAt: payment.createdAt,
            consumedAt: payment.consumedAt,
            items: payment.items,
            result: payment.result,
          },
          account,
        );
      }
    }
    return {
      available: Boolean(composite),
      simulated: this.zohal.cardInquirySimulated,
      composite: composite
        ? {
            key: composite.key,
            label: composite.label,
            amount: composite.amount,
            purchasable: composite.purchasable,
            issues: composite.issues,
          }
        : null,
      profile: {
        ready: profileReady,
        nationalCodeMasked: nationalCode
          ? maskNationalCode(nationalCode)
          : null,
        hasBirthDate: Boolean(birthDate),
      },
      latest,
    };
  }

  async startVerification(userId: string, dto: VerifyCardDto) {
    const cardNumber = normalizeCardNumber(dto.cardNumber);
    if (cardNumber.length !== 16) {
      throw new BadRequestException('شماره کارت باید ۱۶ رقم باشد');
    }
    const composite = await this.zohal.findCardVerificationComposite();
    if (!composite) {
      throw new BadRequestException(
        'محصول ترکیبی «کارت با کدملی + تبدیل به شبا» در پنل مدیریت تعریف نشده است.',
      );
    }
    if (!composite.purchasable) {
      throw new BadRequestException(
        composite.issues[0] ?? 'این استعلام در حال حاضر قابل خرید نیست.',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { nationalCode: true, birthDate: true },
    });
    const nationalCode = user?.nationalCode?.trim() ?? '';
    const birthDate = user?.birthDate?.trim() ?? '';
    if (!/^\d{10}$/.test(nationalCode)) {
      throw new BadRequestException(
        'برای استعلام کارت، ابتدا کد ملی خود را در پروفایل کامل کنید.',
      );
    }
    if (!birthDate) {
      throw new BadRequestException(
        'برای استعلام کارت، ابتدا تاریخ تولد خود را در پروفایل کامل کنید.',
      );
    }
    return this.zohal.checkoutComposite(
      userId,
      composite.key,
      {
        national_code: nationalCode,
        birth_date: birthDate,
        card_number: cardNumber,
      },
      CARD_VERIFICATION_RETURN_TO,
      {
        stopOnFailure: true,
        moduleOrder: [CARD_VERIFICATION_CHECK, CARD_VERIFICATION_IBAN],
      },
    );
  }

  async applyVerification(userId: string) {
    const composite = await this.zohal.findCardVerificationComposite();
    if (!composite) {
      throw new BadRequestException(
        'محصول ترکیبی «کارت با کدملی + تبدیل به شبا» در پنل مدیریت تعریف نشده است.',
      );
    }
    const payment = await this.zohal.latestCompositePayment(
      userId,
      composite.key,
    );
    const account = await this.getAccount(userId);
    if (!payment) {
      return {
        applied: false,
        matched: null,
        iban: null,
        account,
        message: 'نتیجه‌ی استعلامی برای ثبت پیدا نشد.',
      };
    }
    if (!payment.consumedAt) {
      return {
        applied: false,
        matched: null,
        iban: null,
        account,
        message: 'نتیجه‌ی استعلام هنوز آماده نیست؛ چند لحظه بعد دوباره تلاش کنید.',
      };
    }
    const modules = this.parseModules(payment.items);
    const results = this.parseResults(payment.result);
    const check = results.find(
      (entry) => entry.serviceKey === CARD_VERIFICATION_CHECK,
    );
    const ibanEntry = results.find(
      (entry) => entry.serviceKey === CARD_VERIFICATION_IBAN,
    );
    const checkData = (check?.data ?? {}) as Record<string, unknown>;
    const ibanData = (ibanEntry?.data ?? {}) as Record<string, unknown>;
    const matched = Boolean(check?.ok && isMatched(checkData.matched));
    const iban = ibanEntry ? normalizeIban(ibanData.IBAN) : null;
    const cardRaw =
      modules.find((item) => item.serviceKey === CARD_VERIFICATION_CHECK)
        ?.payload.card_number ??
      modules.find((item) => item.serviceKey === CARD_VERIFICATION_IBAN)
        ?.payload.card_number;
    const cardNumber =
      typeof cardRaw === 'string' ? normalizeCardNumber(cardRaw) : '';
    if (!matched) {
      return {
        applied: false,
        matched: false,
        iban: null,
        account,
        message:
          check?.message ||
          'شماره کارت با کد ملی مطابقت ندارد؛ کارت باید به نام خودتان باشد.',
      };
    }
    if (!iban || cardNumber.length !== 16) {
      return {
        applied: false,
        matched: true,
        iban: null,
        account,
        message:
          ibanEntry?.message || 'تبدیل کارت به شبا انجام نشد؛ دوباره تلاش کنید.',
      };
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    const holderName =
      (typeof ibanData.name === 'string' && ibanData.name.trim()) ||
      user?.fullName?.trim() ||
      'صاحب کارت';
    const bankName =
      typeof ibanData.bank_name === 'string' && ibanData.bank_name.trim()
        ? ibanData.bank_name.trim()
        : null;
    const workspaceId = await this.workspaceId(userId);
    const saved = await this.prisma.cardToCardAccount.upsert({
      where: { workspaceId },
      update: { cardNumber, holderName, bankName, iban },
      create: {
        workspaceId,
        cardNumber,
        holderName,
        bankName,
        iban,
        isActive: true,
      },
    });
    return {
      applied: true,
      matched: true,
      iban,
      account: saved,
      message: 'کارت تأیید شد و شماره شبا به‌صورت خودکار ثبت گردید.',
    };
  }

  async upsertAccount(userId: string, dto: UpsertCardAccountDto) {
    const workspaceId = await this.workspaceId(userId);
    const cardNumber = normalizeCardNumber(dto.cardNumber);
    if (cardNumber.length !== 16) {
      throw new BadRequestException('شماره کارت باید ۱۶ رقم باشد');
    }
    return this.prisma.cardToCardAccount.upsert({
      where: { workspaceId },
      update: {
        cardNumber,
        holderName: dto.holderName.trim(),
        bankName: dto.bankName?.trim() || null,
        iban: dto.iban?.trim() || null,
        instructions: dto.instructions?.trim() || null,
        isActive: dto.isActive ?? true,
      },
      create: {
        workspaceId,
        cardNumber,
        holderName: dto.holderName.trim(),
        bankName: dto.bankName?.trim() || null,
        iban: dto.iban?.trim() || null,
        instructions: dto.instructions?.trim() || null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async listPayments(userId: string, status?: string) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.cardToCardPayment.findMany({
      where: { workspaceId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async reviewPayment(userId: string, id: string, dto: ReviewCardPaymentDto) {
    const workspaceId = await this.workspaceId(userId);
    const payment = await this.prisma.cardToCardPayment.findFirst({
      where: { id, workspaceId },
    });
    if (!payment) throw new NotFoundException('رسید پیدا نشد');
    if (payment.status !== 'PENDING') {
      throw new BadRequestException('این رسید قبلاً بررسی شده است');
    }
    const updated = await this.prisma.cardToCardPayment.update({
      where: { id },
      data: {
        status: dto.status,
        reviewNote: dto.reviewNote?.trim() || null,
        reviewedAt: new Date(),
        reviewedBy: userId,
      },
    });
    if (payment.referenceType === 'ORDER' && payment.referenceId) {
      if (dto.status === 'APPROVED') {
        // Settles the order (payment status, timeline, invoice, CRM totals).
        await this.retail.settleOrderPaid(
          payment.referenceId,
          workspaceId,
          userId,
        );
      } else {
        await this.prisma.retailOrder.updateMany({
          where: { id: payment.referenceId, workspaceId },
          data: { paymentStatus: 'UNPAID' },
        });
        await this.prisma.retailOrderEvent.create({
          data: {
            orderId: payment.referenceId,
            workspaceId,
            kind: 'PAYMENT_REJECTED',
            fromStatus: 'PENDING_REVIEW',
            toStatus: 'UNPAID',
            note: dto.reviewNote?.trim() || null,
            actorId: userId,
          },
        });
      }
    }
    if (
      dto.status === 'APPROVED' &&
      payment.referenceType === 'BOOKING' &&
      payment.referenceId
    ) {
      const booking = await this.prisma.accommodationBookingRequest.findFirst({
        where: { id: payment.referenceId, workspaceId },
      });
      if (booking) {
        await this.prisma.accommodationBookingRequest.update({
          where: { id: booking.id },
          data: { depositStatus: 'PAID', depositPaidAt: new Date() },
        });
      }
    }
    return updated;
  }

  // -------------------------------------------------------------------------
  //  Public: card info + receipt submission
  // -------------------------------------------------------------------------

  private async resolveWorkspace(slug: string) {
    const workspace = await this.modules.findWorkspaceByPublicSlug(slug);
    if (!workspace || workspace.status !== 'ACTIVE') {
      throw new NotFoundException('کسب‌وکار پیدا نشد');
    }
    const enabled = await this.modules.isModuleEnabledForWorkspace(
      workspace.id,
      'cardToCard',
    );
    if (!enabled) throw new NotFoundException('پرداخت کارت به کارت فعال نیست');
    return workspace;
  }

  async publicInfo(slug: string) {
    await this.settings.assertFeatureEnabled('featureCardToCard');
    const workspace = await this.resolveWorkspace(slug);
    const account = await this.prisma.cardToCardAccount.findUnique({
      where: { workspaceId: workspace.id },
    });
    return {
      workspace: { id: workspace.id, name: workspace.name },
      card:
        account && account.isActive
          ? {
              cardNumber: account.cardNumber,
              holderName: account.holderName,
              bankName: account.bankName,
              instructions: account.instructions,
            }
          : null,
    };
  }

  async submitPublic(slug: string, dto: SubmitCardPaymentDto) {
    await this.settings.assertFeatureEnabled('featureCardToCard');
    const workspace = await this.resolveWorkspace(slug);
    const account = await this.prisma.cardToCardAccount.findUnique({
      where: { workspaceId: workspace.id },
    });
    if (!account || !account.isActive) {
      throw new ForbiddenException('این کسب‌وکار هنوز شماره کارت ثبت نکرده است');
    }

    let expectedAmount: number | null = null;
    if (dto.referenceType === 'ORDER' && dto.referenceId) {
      const order = await this.prisma.retailOrder.findFirst({
        where: { id: dto.referenceId, workspaceId: workspace.id },
        select: {
          id: true,
          totalAmount: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
        },
      });
      if (!order) throw new BadRequestException('سفارش مرتبط پیدا نشد');
      if (order.paymentMethod !== 'CARD_TO_CARD') {
        throw new BadRequestException('روش پرداخت این سفارش کارت به کارت نیست');
      }
      if (order.paymentStatus === 'PAID') {
        throw new BadRequestException('این سفارش قبلاً پرداخت شده است');
      }
      if (order.status === 'CANCELLED') {
        throw new BadRequestException('این سفارش لغو شده است');
      }
      if (order.status !== 'CONFIRMED') {
        throw new BadRequestException(
          'ابتدا فروشنده باید سفارش را تأیید کند؛ سپس امکان ارسال رسید فعال می‌شود',
        );
      }
      expectedAmount = order.totalAmount;
    }
    if (dto.referenceType === 'BOOKING' && dto.referenceId) {
      const booking = await this.prisma.accommodationBookingRequest.findFirst({
        where: { id: dto.referenceId, workspaceId: workspace.id },
        select: { id: true },
      });
      if (!booking) throw new BadRequestException('رزرو مرتبط پیدا نشد');
    }

    const trackingNumber = dto.trackingNumber?.trim() || null;
    if (trackingNumber) {
      const duplicate = await this.prisma.cardToCardPayment.findFirst({
        where: {
          workspaceId: workspace.id,
          trackingNumber,
          status: { not: 'REJECTED' },
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new ConflictException(
          'این شماره پیگیری قبلاً برای یک رسید دیگر ثبت شده است',
        );
      }
    }

    const payment = await this.prisma.cardToCardPayment.create({
      data: {
        workspaceId: workspace.id,
        referenceType: dto.referenceType ?? 'OTHER',
        referenceId: dto.referenceId,
        customerName: dto.customerName.trim(),
        customerPhone: dto.customerPhone.trim(),
        amount: dto.amount,
        expectedAmount,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : null,
        trackingNumber,
        receiptUrl: dto.receiptUrl,
        note: dto.note?.trim() || null,
      },
    });
    if (dto.referenceType === 'ORDER' && dto.referenceId) {
      await this.prisma.retailOrder.updateMany({
        where: { id: dto.referenceId, workspaceId: workspace.id },
        data: { paymentStatus: 'PENDING_REVIEW' },
      });
      await this.prisma.retailOrderEvent.create({
        data: {
          orderId: dto.referenceId,
          workspaceId: workspace.id,
          kind: 'PAYMENT_SUBMITTED',
          fromStatus: 'UNPAID',
          toStatus: 'PENDING_REVIEW',
          note: trackingNumber ? `شماره پیگیری ${trackingNumber}` : null,
        },
      });
    }
    return payment;
  }
}
