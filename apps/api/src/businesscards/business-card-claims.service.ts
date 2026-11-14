import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BiolinkStatus, NotificationType } from '@prisma/client';

import { ActivityService } from '../activity/activity.service';
import { OtpService } from '../auth/otp.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

export type ClaimStartResult =
  | {
      channel: 'sms' | 'email';
      /** Masked destination shown to the user (e.g. `0912***1234`). */
      destination: string;
      resendAfter: number;
      /** Present only in local development (no real SMS/e-mail configured). */
      devCode?: string;
    }
  | { channel: 'admin'; requested: true; requestId: string }
  | { claimed: true; id: string; slug: string };

function maskDestination(value: string): string {
  if (value.includes('@')) {
    const [local, domain] = value.split('@');
    return `${local.slice(0, 2)}***@${domain}`;
  }
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

/**
 * «تصاحب کسب‌وکار» — taking over an imported profile must prove control of the
 * contact channel the business itself published:
 *
 *   * mobile on the card → one-time code by SMS,
 *   * otherwise e-mail    → one-time code by e-mail,
 *   * neither            → the request is queued for an admin to approve.
 *
 * Only after that proof does ownership move to the user. The old immediate
 * claim path (one click for anybody signed in) no longer exists.
 */
@Injectable()
export class BusinessCardClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
    private readonly settings: SettingsService,
  ) {}

  private async assertEnabled(): Promise<void> {
    await this.settings.assertFeatureEnabled(
      'featureBusinessClaim',
      'تصاحب کسب‌وکارهای ثبت‌شده‌ی سیستمی موقتاً غیرفعال است.',
    );
  }

  private async loadCard(cardId: string) {
    const card = await this.prisma.businessCard.findUnique({
      where: { id: cardId },
      select: {
        id: true,
        slug: true,
        fullName: true,
        userId: true,
        isUnclaimed: true,
        isPublished: true,
        mobile: true,
        email: true,
      },
    });
    if (!card) {
      throw new NotFoundException('کسب‌وکار مورد نظر یافت نشد');
    }
    return card;
  }

  /** The card's mobile in canonical `09…` form, or null when it is unusable. */
  private mobileOf(value: string | null): string | null {
    if (!value?.trim()) return null;
    try {
      return OtpService.normalizePhone(value);
    } catch {
      return null;
    }
  }

  private emailOf(value: string | null): string | null {
    const email = (value ?? '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  }

  /** Starts a claim: sends the code, or queues an admin request when possible. */
  async start(cardId: string, userId: string): Promise<ClaimStartResult> {
    await this.assertEnabled();
    const card = await this.loadCard(cardId);
    if (card.userId === userId) {
      return { claimed: true, id: card.id, slug: card.slug };
    }
    if (!card.isUnclaimed) {
      throw new ConflictException('این کسب‌وکار قبلاً توسط صاحبش ثبت شده است');
    }

    const pending = await this.prisma.businessCardClaimRequest.findFirst({
      where: { businessCardId: card.id, userId, status: 'PENDING' },
      select: { id: true },
    });
    if (pending) {
      return { channel: 'admin', requested: true, requestId: pending.id };
    }

    const mobile = this.mobileOf(card.mobile);
    if (mobile) {
      const issued = await this.otp.issueClaimCode({
        businessCardId: card.id,
        userId,
        channel: 'sms',
        phone: mobile,
      });
      return {
        channel: 'sms',
        destination: maskDestination(mobile),
        resendAfter: issued.resendAfter,
        ...(issued.devCode ? { devCode: issued.devCode } : {}),
      };
    }

    const email = this.emailOf(card.email);
    if (email) {
      const issued = await this.otp.issueClaimCode({
        businessCardId: card.id,
        userId,
        channel: 'email',
        email,
      });
      return {
        channel: 'email',
        destination: maskDestination(email),
        resendAfter: issued.resendAfter,
        ...(issued.devCode ? { devCode: issued.devCode } : {}),
      };
    }

    return this.queueForAdmin(card, userId);
  }

  /** Verifies the code and transfers ownership once it matches. */
  async verify(
    cardId: string,
    userId: string,
    code: string,
  ): Promise<{ claimed: true; id: string; slug: string }> {
    await this.assertEnabled();
    const card = await this.loadCard(cardId);
    if (card.userId === userId) {
      return { claimed: true, id: card.id, slug: card.slug };
    }
    if (!card.isUnclaimed) {
      throw new ConflictException('این کسب‌وکار قبلاً توسط صاحبش ثبت شده است');
    }

    const mobile = this.mobileOf(card.mobile);
    if (mobile) {
      await this.otp.verifyClaimCode({
        businessCardId: card.id,
        channel: 'sms',
        target: mobile,
        code,
      });
    } else {
      const email = this.emailOf(card.email);
      if (!email) {
        throw new BadRequestException(
          'این کسب‌وکار راه ارتباطی برای تأیید کد ندارد؛ درخواست شما در انتظار بررسی مدیر است',
        );
      }
      await this.otp.verifyClaimCode({
        businessCardId: card.id,
        channel: 'email',
        target: email,
        code,
      });
    }

    await this.transfer(card, userId);
    return { claimed: true, id: card.id, slug: card.slug };
  }

  /** Admin queue: pending requests plus a counter for the sidebar badge. */
  async listRequests(status?: string) {
    const where = status && status !== 'ALL' ? { status } : {};
    const [items, total, pending] = await Promise.all([
      this.prisma.businessCardClaimRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          status: true,
          note: true,
          createdAt: true,
          decidedAt: true,
          user: { select: { id: true, fullName: true, email: true, phone: true } },
          decidedBy: { select: { id: true, fullName: true, email: true } },
          businessCard: {
            select: {
              id: true,
              slug: true,
              fullName: true,
              isUnclaimed: true,
              isPublished: true,
              city: { select: { name: true } },
              business: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.businessCardClaimRequest.count({ where }),
      this.prisma.businessCardClaimRequest.count({
        where: { status: 'PENDING' },
      }),
    ]);
    return { items, total, pending };
  }

  /** Admin decision: approve transfers ownership, reject just closes it. */
  async decide(
    adminId: string,
    requestId: string,
    approve: boolean,
    note?: string,
  ) {
    const request = await this.prisma.businessCardClaimRequest.findUnique({
      where: { id: requestId },
      include: {
        user: { select: { id: true, fullName: true } },
        businessCard: {
          select: {
            id: true,
            slug: true,
            fullName: true,
            userId: true,
            isUnclaimed: true,
            isPublished: true,
          },
        },
      },
    });
    if (!request) {
      throw new NotFoundException('درخواست تصاحب پیدا نشد');
    }
    if (request.status !== 'PENDING') {
      throw new ConflictException('این درخواست قبلاً بررسی شده است');
    }

    const decidedAt = new Date();
    if (approve) {
      const card = request.businessCard;
      if (card.userId !== request.userId) {
        if (!card.isUnclaimed) {
          throw new ConflictException('این کسب‌وکار دیگر قابل تصاحب نیست');
        }
        await this.transfer(card, request.userId);
      }
      await this.prisma.businessCardClaimRequest.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          note: note?.trim() || null,
          decidedAt,
          decidedById: adminId,
        },
      });
      // One card can have requests from several users; the others are closed
      // so nobody keeps waiting for a card that now has an owner.
      await this.prisma.businessCardClaimRequest.updateMany({
        where: {
          businessCardId: card.id,
          status: 'PENDING',
          id: { not: request.id },
        },
        data: {
          status: 'REJECTED',
          note: 'کسب‌وکار به کاربر دیگری واگذار شد',
          decidedAt,
          decidedById: adminId,
        },
      });
      await this.notifications.notify({
        userId: request.userId,
        type: NotificationType.SUCCESS,
        title: 'درخواست تصاحب تأیید شد',
        body: `مالکیت «${card.fullName}» به حساب شما منتقل شد؛ مشخصات را کامل کنید.`,
        link: `/dashboard/business-cards/${card.id}/edit`,
      });
    } else {
      await this.prisma.businessCardClaimRequest.update({
        where: { id: request.id },
        data: {
          status: 'REJECTED',
          note: note?.trim() || null,
          decidedAt,
          decidedById: adminId,
        },
      });
      await this.notifications.notify({
        userId: request.userId,
        type: NotificationType.WARNING,
        title: 'درخواست تصاحب رد شد',
        body:
          note?.trim() ||
          `درخواست شما برای «${request.businessCard.fullName}» تأیید نشد.`,
        link: `/business/${request.businessCard.slug}`,
      });
    }

    await this.activity.log({
      action: approve
        ? 'BUSINESS_CARD_CLAIM_APPROVED'
        : 'BUSINESS_CARD_CLAIM_REJECTED',
      summary: `${approve ? 'تأیید' : 'رد'} درخواست تصاحب «${request.businessCard.fullName}»`,
      entityType: 'BUSINESS_CARD',
      entityId: request.businessCard.id,
    });
    return { status: approve ? 'APPROVED' : 'REJECTED' };
  }

  private async queueForAdmin(
    card: { id: string; slug: string; fullName: string },
    userId: string,
  ): Promise<ClaimStartResult> {
    const request = await this.prisma.businessCardClaimRequest.create({
      data: { businessCardId: card.id, userId },
    });
    await this.notifications.notifyAdmins({
      category: 'BUSINESS_CARD',
      type: NotificationType.WARNING,
      title: 'درخواست تصاحب بدون راه ارتباطی',
      body: `«${card.fullName}» موبایل/ایمیل قابل تأیید ندارد؛ درخواست کاربر را بررسی کنید.`,
      link: '/jga4rm8j?section=claim-requests',
    });
    await this.activity.log({
      action: 'BUSINESS_CARD_CLAIM_REQUESTED',
      summary: `درخواست تصاحب «${card.fullName}» برای بررسی مدیر ثبت شد`,
      entityType: 'BUSINESS_CARD',
      entityId: card.id,
    });
    return { channel: 'admin', requested: true, requestId: request.id };
  }

  /** Shared ownership transfer used by a verified claim and admin approval. */
  private async transfer(
    card: {
      id: string;
      fullName: string;
      isPublished: boolean;
    },
    userId: string,
  ): Promise<void> {
    await this.prisma.businessCard.update({
      where: { id: card.id },
      data: {
        userId,
        isUnclaimed: false,
        ...(card.isPublished
          ? {}
          : {
              status: BiolinkStatus.PENDING,
              isPublished: false,
              approvedAt: null,
              publishedAt: null,
            }),
      },
    });
    await this.activity.log({
      action: 'BUSINESS_CARD_CLAIMED',
      summary: `تصاحب کسب‌وکار «${card.fullName}» توسط کاربر`,
      entityType: 'BUSINESS_CARD',
      entityId: card.id,
    });
  }
}
