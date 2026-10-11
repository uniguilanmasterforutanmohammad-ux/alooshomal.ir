import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BiolinkStatus,
  ModerationDecision,
  NotificationType,
  Prisma,
} from '@prisma/client';

import { UpdateBiolinkDto } from '../biolinks/dto/update-biolink.dto';
import { UpdateBusinessCardDto } from '../businesscards/dto/update-business-card.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { ModerateBiolinkDto } from './dto/moderate-biolink.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
  ) {}

  async listBiolinks(pagination: PaginationDto, status?: BiolinkStatus) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? (await this.settings.getAdminListPageSize());
    const where: Prisma.BiolinkWhereInput = status ? { status } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.biolink.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.biolink.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async moderate(adminId: string, biolinkId: string, dto: ModerateBiolinkDto) {
    const biolink = await this.prisma.biolink.findUnique({ where: { id: biolinkId } });
    if (!biolink) {
      throw new NotFoundException('بیولینک یافت نشد');
    }

    const approved = dto.decision === ModerationDecision.APPROVED;
    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.biolink.update({
        where: { id: biolinkId },
        data: approved
          ? {
              status: BiolinkStatus.APPROVED,
              isPublished: true,
              approvedAt: now,
              publishedAt: now,
              rejectedAt: null,
              rejectionReason: null,
            }
          : {
              status: BiolinkStatus.REJECTED,
              isPublished: false,
              rejectedAt: now,
              rejectionReason: dto.reason ?? null,
              approvedAt: null,
              publishedAt: null,
            },
      });

      await tx.moderationLog.create({
        data: {
          biolinkId,
          adminId,
          decision: dto.decision,
          reason: dto.reason ?? null,
        },
      });

      return updated;
    });

    await this.notifyUser(
      updated.userId,
      approved ? 'بیولینک شما تأیید شد' : 'بیولینک شما رد شد',
      approved
        ? 'بیولینک «' + updated.fullName + '» تأیید و منتشر شد.'
        : 'بیولینک «' + updated.fullName + '» رد شد.' +
          (dto.reason ? ` دلیل: ${dto.reason}` : ''),
      approved ? NotificationType.SUCCESS : NotificationType.WARNING,
      // approved → the live public page; rejected → owner's edit page (the
      // public page 404s until it is approved).
      approved && updated.slug
        ? `/biolinks/${updated.slug}`
        : `/dashboard/biolinks/${updated.id}/edit`,
    );

    return updated;
  }

  async getBiolink(biolinkId: string) {
    const biolink = await this.prisma.biolink.findUnique({
      where: { id: biolinkId },
      include: { city: true, business: true },
    });
    if (!biolink) {
      throw new NotFoundException('بیولینک یافت نشد');
    }
    return biolink;
  }

  /**
   * Admin can edit any biolink field directly. Editing does not change the
   * moderation status; the admin then approves or rejects explicitly.
   */
  async updateBiolink(biolinkId: string, dto: UpdateBiolinkDto) {
    await this.getBiolink(biolinkId);

    if (dto.cityId) {
      const city = await this.prisma.city.findUnique({ where: { id: dto.cityId } });
      if (!city || !city.isActive) {
        throw new BadRequestException('شهر انتخاب‌شده معتبر نیست');
      }
    }
    if (dto.businessId) {
      const business = await this.prisma.businessCategory.findUnique({
        where: { id: dto.businessId },
      });
      if (!business || !business.isActive) {
        throw new BadRequestException('کسب‌وکار انتخاب‌شده معتبر نیست');
      }
    }

    return this.prisma.biolink.update({
      where: { id: biolinkId },
      data: { ...dto },
      include: { city: true, business: true },
    });
  }

  async listBusinessCards(pagination: PaginationDto, status?: BiolinkStatus) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? (await this.settings.getAdminListPageSize());
    const where: Prisma.BusinessCardWhereInput = status ? { status } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.businessCard.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.businessCard.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async moderateBusinessCard(
    adminId: string,
    businessCardId: string,
    dto: ModerateBiolinkDto,
  ) {
    const businessCard = await this.prisma.businessCard.findUnique({
      where: { id: businessCardId },
    });
    if (!businessCard) {
      throw new NotFoundException('کارت ویزیت یافت نشد');
    }

    const approved = dto.decision === ModerationDecision.APPROVED;
    const now = new Date();

    const updated = await this.prisma.businessCard.update({
      where: { id: businessCardId },
      data: approved
        ? {
            status: BiolinkStatus.APPROVED,
            isPublished: true,
            approvedAt: now,
            publishedAt: now,
            rejectedAt: null,
            rejectionReason: null,
          }
        : {
            status: BiolinkStatus.REJECTED,
            isPublished: false,
            rejectedAt: now,
            rejectionReason: dto.reason ?? null,
            approvedAt: null,
            publishedAt: null,
          },
    });

    await this.notifyUser(
      updated.userId,
      approved ? 'کارت ویزیت شما تأیید شد' : 'کارت ویزیت شما رد شد',
      approved
        ? 'کارت ویزیت «' + updated.fullName + '» تأیید و منتشر شد.'
        : 'کارت ویزیت «' + updated.fullName + '» رد شد.' +
          (dto.reason ? ` دلیل: ${dto.reason}` : ''),
      approved ? NotificationType.SUCCESS : NotificationType.WARNING,
      approved && updated.slug
        ? `/business-cards/${updated.slug}`
        : `/dashboard/business-cards/${updated.id}/edit`,
    );

    return updated;
  }

  async getBusinessCard(businessCardId: string) {
    const businessCard = await this.prisma.businessCard.findUnique({
      where: { id: businessCardId },
      include: { city: true, business: true },
    });
    if (!businessCard) {
      throw new NotFoundException('کارت ویزیت یافت نشد');
    }
    return businessCard;
  }

  async updateBusinessCard(businessCardId: string, dto: UpdateBusinessCardDto) {
    await this.getBusinessCard(businessCardId);

    if (dto.cityId) {
      const city = await this.prisma.city.findUnique({ where: { id: dto.cityId } });
      if (!city || !city.isActive) {
        throw new BadRequestException('شهر انتخاب‌شده معتبر نیست');
      }
    }
    if (dto.businessId) {
      const business = await this.prisma.businessCategory.findUnique({
        where: { id: dto.businessId },
      });
      if (!business || !business.isActive) {
        throw new BadRequestException('کسب‌وکار انتخاب‌شده معتبر نیست');
      }
    }

    return this.prisma.businessCard.update({
      where: { id: businessCardId },
      data: { ...dto },
      include: { city: true, business: true },
    });
  }

  async stats() {
    const [
      pending,
      approved,
      rejected,
      published,
      users,
      scans,
      openTickets,
      totalTickets,
      recentUsers,
    ] = await this.prisma.$transaction([
      this.prisma.biolink.count({ where: { status: BiolinkStatus.PENDING } }),
      this.prisma.biolink.count({ where: { status: BiolinkStatus.APPROVED } }),
      this.prisma.biolink.count({ where: { status: BiolinkStatus.REJECTED } }),
      this.prisma.biolink.count({ where: { isPublished: true } }),
      this.prisma.user.count(),
      this.prisma.scanEvent.count(),
      this.prisma.ticket.count({ where: { status: 'OPEN' } }),
      this.prisma.ticket.count(),
      this.prisma.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      }),
    ]);
    return {
      pending,
      approved,
      rejected,
      published,
      users,
      scans,
      openTickets,
      totalTickets,
      recentUsers,
    };
  }

  async recentUsers(limit = 6) {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        deactivatedReason: true,
        adminComment: true,
        createdAt: true,
        _count: { select: { biolinks: true, businessCards: true } },
      },
    });
  }

  // ----- User management (deactivate / delete / comment) -----

  async listUsers(pagination: PaginationDto, search?: string) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? (await this.settings.getAdminListPageSize());
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { fullName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          deactivatedReason: true,
          adminComment: true,
          createdAt: true,
          _count: { select: { biolinks: true, businessCards: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /** Enable / disable a user account, recording the admin's reason. */
  async setUserActive(adminId: string, userId: string, isActive: boolean, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    if (user.role === 'ADMIN') {
      throw new BadRequestException('حساب مدیر را نمی‌توان غیرفعال کرد');
    }
    if (!isActive && !reason?.trim()) {
      throw new BadRequestException('برای غیرفعال‌سازی، ذکر علت الزامی است');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: isActive
        ? { isActive: true, deactivatedAt: null, deactivatedReason: null }
        : { isActive: false, deactivatedAt: new Date(), deactivatedReason: reason ?? null },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        deactivatedReason: true,
        adminComment: true,
        createdAt: true,
      },
    });

    if (!isActive) {
      await this.notifyUser(
        userId,
        'حساب کاربری شما غیرفعال شد',
        reason ? `علت: ${reason}` : 'حساب شما توسط مدیر غیرفعال شده است.',
        NotificationType.ERROR,
        null,
        adminId,
      );
    } else {
      await this.notifyUser(
        userId,
        'حساب کاربری شما فعال شد',
        'حساب شما مجدداً فعال شد.',
        NotificationType.SUCCESS,
        null,
        adminId,
      );
    }

    return updated;
  }

  /** Store an internal admin comment about a user. */
  async setUserComment(userId: string, comment: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { adminComment: comment?.trim() || null },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        deactivatedReason: true,
        adminComment: true,
        createdAt: true,
      },
    });
  }

  /** Hard-delete a user (cascades their cards, likes, saves...). */
  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    if (user.role === 'ADMIN') {
      throw new BadRequestException('حساب مدیر را نمی‌توان حذف کرد');
    }
    await this.prisma.user.delete({ where: { id: userId } });
    return { deleted: true };
  }

  private async notifyUser(
    userId: string,
    title: string,
    body: string,
    type: NotificationType = NotificationType.INFO,
    link: string | null = null,
    actorId: string | null = null,
  ) {
    return this.notifications.notify({ userId, title, body, type, link, actorId });
  }

  async recentTickets(limit = 6) {
    return this.prisma.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { email: true, fullName: true } } },
    });
  }

  async recentReports(limit = 6) {
    return this.prisma.report.findMany({
      orderBy: { generatedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Signups per month for the dashboard chart (last 12 months).
   */
  async signupSeries() {
    const since = new Date();
    since.setMonth(since.getMonth() - 11);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    });

    const buckets = new Array(12).fill(0) as number[];
    const base = new Date(since);
    for (const user of users) {
      const diff =
        (user.createdAt.getFullYear() - base.getFullYear()) * 12 +
        (user.createdAt.getMonth() - base.getMonth());
      if (diff >= 0 && diff < 12) {
        buckets[diff] += 1;
      }
    }
    return buckets;
  }

}
