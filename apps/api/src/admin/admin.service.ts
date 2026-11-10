import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { statfs } from 'node:fs/promises';
import {
  BiolinkStatus,
  ContentDecisionKind,
  ModerationDecision,
  NotificationType,
  Prisma,
} from '@prisma/client';

import { UpdateBiolinkDto } from '../biolinks/dto/update-biolink.dto';
import { UpdateBusinessCardDto } from '../businesscards/dto/update-business-card.dto';
import { sanitizeWorkingHours } from '../businesscards/working-hours';
import { ActivityService } from '../activity/activity.service';
import { addJalaliMonths, jalaliParts } from '../common/jalali';
import { PaginationDto } from '../common/dto/pagination.dto';
import { FacetsCacheService } from '../common/facets-cache.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';
import { SettingsService } from '../settings/settings.service';
import { StorageService } from '../uploads/storage.service';
import { ModerateBiolinkDto } from './dto/moderate-biolink.dto';
import { notifyUser } from './admin-notify';

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

  async listBiolinks(
    pagination: PaginationDto,
    status?: BiolinkStatus,
    search?: string,
  ) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? (await this.settings.getAdminListPageSize());
    const where: Prisma.BiolinkWhereInput = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { jobTitle: { contains: search, mode: 'insensitive' } },
              { company: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
              { user: { fullName: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

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

    const decisions = await this.contentDecisionMap(
      ContentDecisionKind.BIOLINK,
      items.map((item) => item.id),
    );
    return {
      items: items.map((item) => ({
        ...item,
        decidedBy: decisions.get(item.id) ?? null,
      })),
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

  /**
   * Admin reviewer trail for a set of items. Biased to the limited «کاربر ادمین»
   * decision (`content_decisions`, written by the moderator panel) and, when
   * absent, falling back to the classic `ModerationLog` for biolinks. Both map
   * to `{ id, fullName, email }` of the deciding admin.
   */
  private async contentDecisionMap(
    kind: ContentDecisionKind,
    itemIds: string[],
  ): Promise<
    Map<string, { id: string; fullName: string | null; email: string | null }>
  > {
    const result = new Map<
      string,
      { id: string; fullName: string | null; email: string | null }
    >();
    if (itemIds.length === 0) return result;

    const decisions = await this.prisma.contentDecision.findMany({
      where: { kind, itemId: { in: itemIds } },
      include: { admin: { select: { id: true, fullName: true, email: true } } },
    });
    for (const decision of decisions) {
      result.set(decision.itemId, decision.admin);
    }

    // Legacy moderation logs (only biolinks keep a full log); fill the gaps.
    if (kind === ContentDecisionKind.BIOLINK) {
      const missing = itemIds.filter((id) => !result.has(id));
      if (missing.length > 0) {
        const logs = await this.prisma.moderationLog.findMany({
          where: { biolinkId: { in: missing } },
          orderBy: { createdAt: 'desc' },
          include: { admin: { select: { id: true, fullName: true, email: true } } },
        });
        for (const log of logs) {
          if (!result.has(log.biolinkId)) {
            result.set(log.biolinkId, log.admin);
          }
        }
      }
    }
    return result;
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

      // Record the reviewer so the admin list can show «تأییدکننده» for every
      // decision, not only the ones taken from the limited moderator panel.
      await tx.contentDecision.upsert({
        where: { kind_itemId: { kind: ContentDecisionKind.BIOLINK, itemId: biolinkId } },
        update: { adminId, approved, reason: dto.reason ?? null },
        create: {
          kind: ContentDecisionKind.BIOLINK,
          itemId: biolinkId,
          adminId,
          approved,
          reason: dto.reason ?? null,
        },
      });

      return updated;
    });

    await notifyUser(
      this.notifications,
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

  async listBusinessCards(
    pagination: PaginationDto,
    status?: BiolinkStatus,
    search?: string,
  ) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? (await this.settings.getAdminListPageSize());
    const where: Prisma.BusinessCardWhereInput = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { jobTitle: { contains: search, mode: 'insensitive' } },
              { company: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
              { user: { fullName: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

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

    const decisions = await this.contentDecisionMap(
      ContentDecisionKind.BUSINESS_CARD,
      items.map((item) => item.id),
    );
    return {
      items: items.map((item) => ({
        ...item,
        decidedBy: decisions.get(item.id) ?? null,
      })),
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

    await notifyUser(
      this.notifications,
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

    // Record the reviewer so the admin list can show «تأییدکننده» for every
    // decision, not only the ones taken from the limited moderator panel.
    await this.prisma.contentDecision.upsert({
      where: {
        kind_itemId: {
          kind: ContentDecisionKind.BUSINESS_CARD,
          itemId: businessCardId,
        },
      },
      update: { adminId, approved, reason: dto.reason ?? null },
      create: {
        kind: ContentDecisionKind.BUSINESS_CARD,
        itemId: businessCardId,
        adminId,
        approved,
        reason: dto.reason ?? null,
      },
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

    const { workingHours: rawWorkingHours, ...fields } = dto;
    const workingHours = sanitizeWorkingHours(rawWorkingHours);
    const updated = await this.prisma.businessCard.update({
      where: { id: businessCardId },
      data: {
        ...fields,
        ...(workingHours !== undefined ? { workingHours } : {}),
      },
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

  /**
   * Paginated log of transactional emails sent to users (the «ایمیل‌های
   * ارسالی» admin page). Codes are never stored; only the redacted subject.
   */
  async listEmails(
    pagination: PaginationDto,
    search?: string,
    status?: string,
  ) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? (await this.settings.getAdminListPageSize());
    const where: Prisma.SentEmailWhereInput = {
      ...(search
        ? {
            OR: [
              { to: { contains: search, mode: 'insensitive' } },
              { subject: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.sentEmail.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.sentEmail.count({ where }),
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
   * Signup chart series for the admin dashboard. Both series are bucketed on
   * the **Persian (Jalali) calendar**, because that is the calendar the whole
   * panel shows:
   *
   *   - `monthly`: the last 12 Jalali months (oldest → newest) with the Jalali
   *     month index (1 = فروردین … 12 = اسفند) and the Jalali year, so the
   *     client can label each bar with the correct month name.
   *   - `daily`: every day of the *current* Jalali month up to today, with the
   *     Jalali day-of-month, for the «روزانه در ماه جاری» tab.
   *
   * Istanbul/Tehran users can be up to 3.5h ahead of UTC, so "today" is
   * computed in `Asia/Tehran` and stored query bounds are widened by one day to
   * avoid dropping recent signups near midnight.
   */
  async signupSeries() {
    const now = new Date();
    const today = jalaliParts(now);
    const monthKeys: string[] = [];
    const monthly: Array<{ month: number; year: number; count: number }> = [];
    for (let offset = 11; offset >= 0; offset -= 1) {
      const { month, year } = addJalaliMonths(today.year, today.month, -offset);
      monthKeys.push(`${year}-${month}`);
      monthly.push({ month, year, count: 0 });
    }

    const currentMonthKey = `${today.year}-${today.month}`;
    const daily: Array<{ day: number; count: number }> = [];
    for (let day = 1; day <= today.day; day += 1) {
      daily.push({ day, count: 0 });
    }

    // Widen the query to ~13 months back (the oldest Jalali month can start up
    // to a month before its Gregorian 1st) and bucket precisely in JS.
    const since = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000);

    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    });
    const monthIndex = new Map(monthKeys.map((key, index) => [key, index]));
    for (const user of users) {
      const parts = jalaliParts(user.createdAt);
      const key = `${parts.year}-${parts.month}`;
      const bucket = monthIndex.get(key);
      if (bucket !== undefined) {
        monthly[bucket].count += 1;
      }
      if (key === currentMonthKey && parts.day <= today.day) {
        daily[parts.day - 1].count += 1;
      }
    }
    return { monthly, daily };
  }

}
