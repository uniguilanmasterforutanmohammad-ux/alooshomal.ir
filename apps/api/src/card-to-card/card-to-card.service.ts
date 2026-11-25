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
import { ReviewCardPaymentDto } from './dto/review-payment.dto';
import { SubmitCardPaymentDto } from './dto/submit-payment.dto';
import { UpsertCardAccountDto } from './dto/upsert-account.dto';

/** Normalise Persian/Arabic digits and strip separators from a card number. */
function normalizeCardNumber(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/\D/g, '');
}

@Injectable()
export class CardToCardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modules: BusinessModulesService,
    private readonly settings: SettingsService,
    private readonly retail: RetailService,
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
