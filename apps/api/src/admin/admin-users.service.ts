import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { NotificationType, Prisma } from '@prisma/client';

import { ActivityService } from '../activity/activity.service';
import { ModeratorScope, normalizeScopes } from '../auth/moderator-scopes';
import { OtpService } from '../auth/otp.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';
import { SettingsService } from '../settings/settings.service';
import { StorageService } from '../uploads/storage.service';
import { notifyUser } from './admin-notify';

const SALT_ROUNDS = 12;

/**
 * Admin user management: the user list, account deactivation/deletion, roles,
 * comments and the limited-moderator accounts (create/update/delete).
 * Split out of `AdminService` so content review and platform reporting stay
 * separate from account administration.
 */
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
    private readonly activity: ActivityService,
    private readonly sessions: SessionsService,
    private readonly storage: StorageService,
  ) {}

  async listUsers(pagination: PaginationDto, search?: string) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? (await this.settings.getAdminListPageSize());
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { fullName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { nationalCode: { contains: search, mode: 'insensitive' } },
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
          phone: true,
          nationalCode: true,
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

  /**
   * Full 360° view of one user for the admin «کاربران» panel: profile and
   * identity data, every content item they own, subscriptions and payments,
   * wallet ledger, points, tickets, notifications, sessions and the actual
   * objects uploaded to the media bucket. Lists are capped so a heavy account
   * still opens quickly; the table counts come from `_count`.
   */
  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        phoneVerified: true,
        fullName: true,
        firstName: true,
        lastName: true,
        fatherName: true,
        nationalCode: true,
        birthDate: true,
        phoneMatchVerifiedAt: true,
        identityVerifiedAt: true,
        identityInquiryData: true,
        verifiedAt: true,
        blueTickRequestedAt: true,
        blueTickNote: true,
        documents: true,
        role: true,
        isActive: true,
        moderatorScopes: true,
        deactivatedReason: true,
        deactivatedAt: true,
        adminComment: true,
        planId: true,
        planExpiresAt: true,
        pointsBalance: true,
        createdAt: true,
        updatedAt: true,
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            maxBiolinks: true,
            maxBusinessCards: true,
          },
        },
        _count: {
          select: {
            biolinks: true,
            businessCards: true,
            feedPosts: true,
            tickets: true,
            notifications: true,
            sessions: true,
            identityInquiryLogs: true,
            invoices: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    const [
      biolinks,
      businessCards,
      feedPosts,
      subscriptions,
      feedSubscriptions,
      subscriptionPayments,
      wallet,
      walletPayments,
      servicePayments,
      requestPayments,
      boosts,
      ads,
      identityInquiries,
      pointsLedger,
      tickets,
      invoices,
      profileChangeRequests,
      reviews,
      rewardRedemptions,
      onboardingCompletions,
      notifications,
      sessions,
      supportConversations,
      activityLogs,
      sentEmails,
      claimRequests,
      media,
    ] = await Promise.all([
      this.prisma.biolink.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          city: { select: { id: true, name: true } },
          business: { select: { id: true, name: true } },
          _count: { select: { scanEvents: true, likes: true, saves: true } },
        },
      }),
      this.prisma.businessCard.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          city: { select: { id: true, name: true } },
          business: { select: { id: true, name: true } },
          _count: {
            select: { scans: true, likes: true, saves: true, reviews: true },
          },
        },
      }),
      this.prisma.feedPost.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          topic: { select: { id: true, name: true } },
          _count: { select: { likes: true, comments: true, saves: true } },
        },
      }),
      this.prisma.userSubscription.findMany({
        where: { userId },
        orderBy: { requestedAt: 'desc' },
        include: {
          plan: true,
          decidedBy: { select: { id: true, fullName: true, email: true } },
          payment: true,
        },
      }),
      this.prisma.userFeedSubscription.findMany({
        where: { userId },
        orderBy: { requestedAt: 'desc' },
        include: {
          package: true,
          decidedBy: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.subscriptionPayment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { plan: { select: { id: true, name: true, price: true } } },
      }),
      this.prisma.userWallet.findUnique({
        where: { userId },
        include: {
          entries: { orderBy: { createdAt: 'desc' }, take: 100 },
        },
      }),
      this.prisma.walletPayment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.servicePayment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.requestPayment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          boostRequest: {
            select: {
              id: true,
              kind: true,
              targetId: true,
              feature: true,
              status: true,
            },
          },
          adRequest: {
            select: {
              id: true,
              kind: true,
              targetId: true,
              placement: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.boostRequest.findMany({
        where: { userId },
        orderBy: { requestedAt: 'desc' },
        take: 100,
        include: {
          decidedBy: { select: { id: true, fullName: true, email: true } },
          payment: true,
        },
      }),
      this.prisma.adRequest.findMany({
        where: { userId },
        orderBy: { requestedAt: 'desc' },
        take: 100,
        include: {
          decidedBy: { select: { id: true, fullName: true, email: true } },
          payment: true,
        },
      }),
      this.prisma.identityInquiryLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.pointsLedger.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.ticket.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { _count: { select: { messages: true } } },
      }),
      this.prisma.invoice.findMany({
        where: { customerUserId: userId },
        orderBy: { issuedAt: 'desc' },
        take: 100,
        include: { items: true },
      }),
      this.prisma.profileChangeRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.businessReview.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          businessCard: { select: { id: true, fullName: true, slug: true } },
        },
      }),
      this.prisma.rewardRedemption.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { reward: { select: { id: true, title: true, kind: true } } },
      }),
      this.prisma.onboardingStepCompletion.findMany({
        where: { userId },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          actor: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.session.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.supportConversation.findMany({
        where: { userId },
        orderBy: { lastMessageAt: 'desc' },
        take: 50,
        select: {
          id: true,
          status: true,
          lastMessageAt: true,
          lastMessagePreview: true,
          userUnread: true,
          staffUnread: true,
          createdAt: true,
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.activityLog.findMany({
        where: {
          OR: [{ actorId: userId }, { entityType: 'USER', entityId: userId }],
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.sentEmail.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.businessCardClaimRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          businessCard: {
            select: { id: true, fullName: true, slug: true, status: true },
          },
          decidedBy: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.storage.listOwnerObjects(userId),
    ]);

    const mediaByFolder = new Map<
      string,
      { folder: string; label: string; count: number; bytes: number }
    >();
    for (const item of media) {
      const group = mediaByFolder.get(item.folder) ?? {
        folder: item.folder,
        label: item.label,
        count: 0,
        bytes: 0,
      };
      group.count += 1;
      group.bytes += item.size;
      mediaByFolder.set(item.folder, group);
    }

    return {
      user,
      biolinks,
      businessCards,
      posts: feedPosts,
      subscriptions,
      feedSubscriptions,
      subscriptionPayments,
      wallet,
      walletPayments,
      servicePayments,
      requestPayments,
      boosts,
      ads,
      identityInquiries,
      pointsLedger,
      tickets,
      invoices,
      profileChangeRequests,
      reviews,
      rewardRedemptions,
      onboardingCompletions,
      notifications,
      sessions,
      supportConversations,
      activityLogs,
      sentEmails,
      claimRequests,
      media,
      mediaSummary: {
        count: media.length,
        bytes: media.reduce((sum, item) => sum + item.size, 0),
        folders: [...mediaByFolder.values()],
      },
    };
  }

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
      await notifyUser(this.notifications, 
        userId,
        'حساب کاربری شما غیرفعال شد',
        reason ? `علت: ${reason}` : 'حساب شما توسط مدیر غیرفعال شده است.',
        NotificationType.ERROR,
        null,
        adminId,
      );
    } else {
      await notifyUser(this.notifications, 
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
    await notifyUser(this.notifications, 
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
    role: 'USER' | 'CITIZEN_REPORTER' | 'MODERATOR' | 'ADMIN',
  ) {
    // Limited admins have per-account content scopes, so they are created and
    // granted through the dedicated «کاربران ادمین» panel — not this selector.
    if (role === 'MODERATOR') {
      throw new BadRequestException(
        'برای ساخت کاربر ادمین از بخش «کاربران ادمین» استفاده کنید',
      );
    }
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
      // Demoting a limited admin clears its content scopes so a later re-grant
      // never silently inherits stale permissions.
      data: { role, moderatorScopes: [] },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        moderatorScopes: true,
        isActive: true,
        deactivatedReason: true,
        adminComment: true,
        createdAt: true,
      },
    });
    const roleLabel =
      role === 'CITIZEN_REPORTER'
        ? 'شهروند خبرنگار'
        : 'کاربر';
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

  // ------------------------------------------------------------------
  //  «کاربر ادمین محدود» (moderators) — created by the super admin
  // ------------------------------------------------------------------

  /** List every moderator account plus the currently-signed-in admin. */
  async listModerators() {
    return this.prisma.user.findMany({
      where: { role: 'MODERATOR' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        isActive: true,
        moderatorScopes: true,
        createdAt: true,
      },
    });
  }

  /**
   * Create a limited admin account. Requires an email + password (the
   * moderator signs in with email/password) and the granted content scopes. An
   * optional phone number lets the same account also sign in with mobile + OTP
   * on the shared `/login` page.
   */
  async createModerator(
    adminId: string,
    input: {
      email: string;
      phone?: string | null;
      password: string;
      fullName?: string | null;
      scopes: ModeratorScope[];
    },
  ) {
    const email = input.email.toLowerCase().trim();
    const phone = input.phone?.trim()
      ? OtpService.normalizePhone(input.phone)
      : null;
    const scopes = normalizeScopes(input.scopes);
    if (scopes.length === 0) {
      throw new BadRequestException('حداقل یک سطح دسترسی را انتخاب کنید');
    }
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('این ایمیل قبلاً ثبت شده است');
    }
    if (phone) {
      const phoneOwner = await this.prisma.user.findUnique({ where: { phone } });
      if (phoneOwner) {
        throw new BadRequestException('این شماره موبایل قبلاً ثبت شده است');
      }
    }
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const created = await this.prisma.user.create({
      data: {
        email,
        phone,
        passwordHash,
        fullName: input.fullName?.trim() || null,
        role: 'MODERATOR',
        moderatorScopes: scopes,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        isActive: true,
        moderatorScopes: true,
        createdAt: true,
      },
    });
    await this.activity.log({
      actor: { id: adminId },
      action: 'MODERATOR_CREATED',
      summary: `ایجاد کاربر ادمین «${created.fullName ?? created.email}» با دسترسی ${scopes.join(', ')}`,
      entityType: 'USER',
      entityId: created.id,
    });
    return created;
  }

  /** Update a moderator's scopes, active flag, name or password. */
  async updateModerator(
    adminId: string,
    userId: string,
    input: {
      phone?: string | null;
      scopes?: ModeratorScope[];
      isActive?: boolean;
      fullName?: string | null;
      password?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('کاربر ادمین یافت نشد');
    }
    if (user.role !== 'MODERATOR') {
      throw new BadRequestException('این حساب کاربر ادمین محدود نیست');
    }

    const data: Prisma.UserUpdateInput = {};
    if (input.phone !== undefined) {
      const phone = input.phone?.trim()
        ? OtpService.normalizePhone(input.phone)
        : null;
      if (phone && phone !== user.phone) {
        const phoneOwner = await this.prisma.user.findUnique({ where: { phone } });
        if (phoneOwner && phoneOwner.id !== userId) {
          throw new BadRequestException('این شماره موبایل قبلاً ثبت شده است');
        }
      }
      data.phone = phone;
    }
    if (input.scopes !== undefined) {
      const scopes = normalizeScopes(input.scopes);
      if (scopes.length === 0) {
        throw new BadRequestException('حداقل یک سطح دسترسی را انتخاب کنید');
      }
      data.moderatorScopes = scopes;
    }
    if (input.isActive !== undefined) {
      data.isActive = input.isActive;
      if (!input.isActive) {
        data.deactivatedAt = new Date();
        data.deactivatedReason = 'غیرفعال‌سازی توسط مدیر کل';
      } else {
        data.deactivatedAt = null;
        data.deactivatedReason = null;
      }
    }
    if (input.fullName !== undefined) {
      data.fullName = input.fullName?.trim() || null;
    }
    if (input.password) {
      data.passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        isActive: true,
        moderatorScopes: true,
        createdAt: true,
      },
    });

    if (input.isActive === false) {
      // A disabled moderator must not keep working on a live token.
      await this.sessions.revokeAll(userId);
    }
    await this.activity.log({
      actor: { id: adminId },
      action: 'MODERATOR_UPDATED',
      summary: `ویرایش کاربر ادمین «${updated.fullName ?? updated.email}»`,
      entityType: 'USER',
      entityId: userId,
    });
    return updated;
  }

  /** Permanently remove a moderator account. */
  async deleteModerator(adminId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('کاربر ادمین یافت نشد');
    }
    if (user.role !== 'MODERATOR') {
      throw new BadRequestException('این حساب کاربر ادمین محدود نیست');
    }
    await this.sessions.revokeAll(userId);
    // `ModerationLog.adminId` is `onDelete: Restrict` (an audit trail must not
    // silently vanish), so reassign this reviewer's past decisions to the
    // super admin performing the removal before deleting the account.
    await this.prisma.$transaction([
      this.prisma.moderationLog.updateMany({
        where: { adminId: userId },
        data: { adminId },
      }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);
    await this.activity.log({
      actor: { id: adminId },
      action: 'MODERATOR_DELETED',
      summary: `حذف کاربر ادمین «${user.fullName ?? user.email}»`,
      entityType: 'USER',
      entityId: userId,
    });
    return { deleted: true };
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

}
