import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { BusinessModulesService } from '../business-modules/business-modules.service';
import { PrismaService } from '../prisma/prisma.service';
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
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.cardToCardPayment.update({
        where: { id },
        data: {
          status: dto.status,
          reviewNote: dto.reviewNote?.trim() || null,
          reviewedAt: new Date(),
          reviewedBy: userId,
        },
      });
      if (dto.status === 'APPROVED' && payment.referenceType === 'ORDER' && payment.referenceId) {
        const order = await tx.retailOrder.findFirst({
          where: { id: payment.referenceId, workspaceId },
        });
        if (order) {
          await tx.retailOrder.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'PAID',
              ...(order.status === 'PENDING' ? { status: 'CONFIRMED' } : {}),
            },
          });
        }
      }
      if (
        dto.status === 'APPROVED' &&
        payment.referenceType === 'BOOKING' &&
        payment.referenceId
      ) {
        const booking = await tx.accommodationBookingRequest.findFirst({
          where: { id: payment.referenceId, workspaceId },
        });
        if (booking) {
          await tx.accommodationBookingRequest.update({
            where: { id: booking.id },
            data: { depositStatus: 'PAID', depositPaidAt: new Date() },
          });
        }
      }
      return updated;
    });
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

    if (dto.referenceType === 'ORDER' && dto.referenceId) {
      const order = await this.prisma.retailOrder.findFirst({
        where: { id: dto.referenceId, workspaceId: workspace.id },
        select: { id: true },
      });
      if (!order) throw new BadRequestException('سفارش مرتبط پیدا نشد');
    }
    if (dto.referenceType === 'BOOKING' && dto.referenceId) {
      const booking = await this.prisma.accommodationBookingRequest.findFirst({
        where: { id: dto.referenceId, workspaceId: workspace.id },
        select: { id: true },
      });
      if (!booking) throw new BadRequestException('رزرو مرتبط پیدا نشد');
    }

    const payment = await this.prisma.cardToCardPayment.create({
      data: {
        workspaceId: workspace.id,
        referenceType: dto.referenceType ?? 'OTHER',
        referenceId: dto.referenceId,
        customerName: dto.customerName.trim(),
        customerPhone: dto.customerPhone.trim(),
        amount: dto.amount,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : null,
        trackingNumber: dto.trackingNumber?.trim() || null,
        receiptUrl: dto.receiptUrl,
        note: dto.note?.trim() || null,
      },
    });
    if (dto.referenceType === 'ORDER' && dto.referenceId) {
      await this.prisma.retailOrder.updateMany({
        where: { id: dto.referenceId, workspaceId: workspace.id },
        data: { paymentStatus: 'PENDING_REVIEW' },
      });
    }
    return payment;
  }
}
