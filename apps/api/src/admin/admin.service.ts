import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { statfs } from 'node:fs/promises';
import {
  BiolinkStatus,
  ModerationDecision,
  NotificationType,
  Prisma,
} from '@prisma/client';

import { UpdateBiolinkDto } from '../biolinks/dto/update-biolink.dto';
import { UpdateBusinessCardDto } from '../businesscards/dto/update-business-card.dto';
import { ActivityService } from '../activity/activity.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { FacetsCacheService } from '../common/facets-cache.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';
import { SettingsService } from '../settings/settings.service';
import { StorageService } from '../uploads/storage.service';
import { ModerateBiolinkDto } from './dto/moderate-biolink.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
    private readonly activity: ActivityService,
    private readonly facetsCache: FacetsCacheService,
    private readonly storage: StorageService,
    private readonly sessions: SessionsService,
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

    await this.activity.log({
      action: approved ? 'BIOLINK_APPROVED' : 'BIOLINK_REJECTED',
      summary: `${approved ? 'تأیید' : 'رد'} بیولینک «${updated.fullName}»`,
      entityType: 'BIOLINK',
      entityId: biolinkId,
    });

    this.facetsCache.invalidateDirectory('biolink');
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

    const updated = await this.prisma.biolink.update({
      where: { id: biolinkId },
      data: { ...dto },
      include: { city: true, business: true },
    });
    this.facetsCache.invalidateDirectory('biolink');
    return updated;
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

    await this.activity.log({
      action: approved ? 'CARD_APPROVED' : 'CARD_REJECTED',
      summary: `${approved ? 'تأیید' : 'رد'} کارت ویزیت «${updated.fullName}»`,
      entityType: 'BUSINESS_CARD',
      entityId: businessCardId,
    });

    this.facetsCache.invalidateDirectory('businesscard');
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

    const updated = await this.prisma.businessCard.update({
      where: { id: businessCardId },
      data: { ...dto },
      include: { city: true, business: true },
    });
    this.facetsCache.invalidateDirectory('businesscard');
    return updated;
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

  /**
   * Storage + server disk snapshot for the admin storage panel.
   *
   * `storage` comes from walking the object-storage bucket (accurate byte
   * totals per upload folder). `disk` reports the filesystem the API container
   * lives on — inside Docker this is the host disk (overlay), so it is a good
   * proxy for "server total / free space".
   */
  async storageOverview() {
    const [storage, disk] = await Promise.all([
      this.storage.usage(),
      this.diskStats(),
    ]);
    return { storage, disk };
  }

  private async diskStats(): Promise<{
    path: string;
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
  } | null> {
    // `/` is the container root; the overlay fs reports the underlying host
    // disk's capacity, which is what an operator wants to see.
    const candidates = ['/'];
    for (const path of candidates) {
      try {
        const stats = await statfs(path);
        const totalBytes = Number(stats.blocks) * Number(stats.bsize);
        const freeBytes = Number(stats.bavail) * Number(stats.bsize);
        return {
          path,
          totalBytes,
          freeBytes,
          usedBytes: Math.max(0, totalBytes - freeBytes),
        };
      } catch {
        // try the next candidate
      }
    }
    return null;
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
    if (userId === adminId && !isActive) {
      throw new BadRequestException('حساب خودتان را نمی‌توانید غیرفعال کنید');
    }
    if (user.role === 'ADMIN' && !isActive) {
      await this.assertNotLastAdmin(
        userId,
        'آخرین مدیر فعال سامانه را نمی‌توان غیرفعال کرد',
      );
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
      // Deactivating an account must also kill its live sessions, otherwise an
      // existing token keeps working until it expires.
      await this.sessions.revokeAll(userId);
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

    await this.activity.log({
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      summary: `${isActive ? 'فعال‌سازی' : 'غیرفعال‌سازی'} حساب «${user.fullName ?? user.email}»${reason ? ` — علت: ${reason}` : ''}`,
      entityType: 'USER',
      entityId: userId,
    });

    return updated;
  }

  /** Session list of one user, for the admin «نشست‌ها» drawer. */
  async listUserSessions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true },
    });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    await this.sessions.pruneStale(userId);
    return { user, sessions: await this.sessions.listForAdmin(userId) };
  }

  /** Force-logout every device of a user. */
  async revokeUserSessions(adminId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    const count = await this.sessions.revokeAll(userId);
    await this.notifyUser(
      userId,
      'خروج از همه‌ی دستگاه‌ها',
      'مدیر همه‌ی نشست‌های فعال شما را بست. لطفاً دوباره وارد شوید.',
      NotificationType.WARNING,
      null,
      adminId,
    );
    await this.activity.log({
      actor: { id: adminId },
      action: 'USER_SESSIONS_REVOKED',
      summary: `خروج اجباری از ${count} نشست کاربر «${user.fullName ?? user.email}»`,
      entityType: 'USER',
      entityId: userId,
    });
    return { ok: true, revoked: count };
  }

  /** Store an internal admin comment about a user. */
  async setUserComment(userId: string, comment: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    const updated = await this.prisma.user.update({
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
    await this.activity.log({
      action: 'USER_COMMENT_SET',
      summary: `ثبت یادداشت مدیر برای «${user.fullName ?? user.email}»`,
      entityType: 'USER',
      entityId: userId,
    });
    return updated;
  }

  /** Change a user's role (USER / CITIZEN_REPORTER / ADMIN). */
  async setUserRole(
    adminId: string,
    userId: string,
    role: 'USER' | 'CITIZEN_REPORTER' | 'ADMIN',
  ) {
    if (role === 'ADMIN') {
      throw new BadRequestException('ارتقای کاربر به نقش مدیر امکان‌پذیر نیست');
    }
    if (userId === adminId) {
      throw new BadRequestException('نقش حساب خودتان را نمی‌توانید تغییر دهید');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    if (user.role === 'ADMIN') {
      await this.assertNotLastAdmin(userId, 'آخرین مدیر سامانه را نمی‌توان تغییر داد');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
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
    const roleLabel = role === 'CITIZEN_REPORTER' ? 'شهروند خبرنگار' : 'کاربر';
    await this.notifications.notify({
      userId,
      title: 'نقش کاربری شما تغییر کرد',
      body: `نقش جدید شما: ${roleLabel}`,
      type: NotificationType.INFO,
      link: '/dashboard/profile',
      actorId: adminId,
    });
    await this.activity.log({
      actor: { id: adminId },
      action: 'USER_ROLE_CHANGED',
      summary: `تغییر نقش «${user.fullName ?? user.email}» به ${roleLabel}`,
      entityType: 'USER',
      entityId: userId,
    });
    return updated;
  }

  /** Guard: refuse an action that would remove the last remaining admin. */
  private async assertNotLastAdmin(userId: string, message: string) {
    const admins = await this.prisma.user.count({
      where: { role: 'ADMIN', isActive: true, NOT: { id: userId } },
    });
    if (admins === 0) {
      throw new BadRequestException(message);
    }
  }

  /** Hard-delete a user (cascades their cards, likes, saves...). */
  async deleteUser(adminId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    if (userId === adminId) {
      throw new BadRequestException('حساب خودتان را نمی‌توانید حذف کنید');
    }
    if (user.role === 'ADMIN') {
      await this.assertNotLastAdmin(userId, 'آخرین مدیر سامانه را نمی‌توان حذف کرد');
    }
    await this.prisma.user.delete({ where: { id: userId } });
    await this.activity.log({
      actor: { id: adminId },
      action: 'USER_DELETED',
      summary: `حذف کاربر «${user.fullName ?? user.email}»`,
      entityType: 'USER',
      entityId: userId,
    });
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
