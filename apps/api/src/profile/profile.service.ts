import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NewsStatus, NotificationType, Prisma } from '@prisma/client';

import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

// Only these profile fields may be changed through a request. Everything else
// (email, role, password, ...) is intentionally out of scope.
const ALLOWED_FIELDS = ['fullName'] as const;
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
  ) {}

  /** Profile of the current user plus their latest pending change request. */
  async me(userId: string) {
    const [user, pending] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
          plan: true,
        },
      }),
      this.prisma.profileChangeRequest.findFirst({
        where: { userId, status: NewsStatus.PENDING },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    return { ...user, pendingChange: pending };
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
    const existing = await this.prisma.profileChangeRequest.findFirst({
      where: { userId, status: NewsStatus.PENDING },
    });
    if (existing) {
      throw new BadRequestException('یک درخواست تغییر نام در انتظار بررسی دارید');
    }
    const created = await this.prisma.profileChangeRequest.create({
      data: { userId, changes: { fullName: fullName.trim() } },
    });
    await this.notifications.notifyAdmins({
      title: 'درخواست تغییر پروفایل',
      body: `«${user.fullName ?? user.email}» درخواست تغییر نام به «${fullName.trim()}» دارد.`,
      link: '/admin?section=users',
      type: NotificationType.INFO,
      actorId: userId,
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

    await this.prisma.$transaction([
      this.prisma.profileChangeRequest.update({
        where: { id },
        data: { status: decision, reason: reason ?? null, decidedAt: new Date() },
      }),
      ...(approved && Object.keys(picked).length > 0
        ? [this.prisma.user.update({ where: { id: request.userId }, data: picked })]
        : []),
    ]);

    await this.notifications.notify({
      userId: request.userId,
      title: approved ? 'تغییر پروفایل تأیید شد' : 'درخواست تغییر پروفایل رد شد',
      body: approved
        ? 'تغییرات پروفایل شما اعمال شد.'
        : reason
          ? `درخواست شما رد شد: ${reason}`
          : 'درخواست تغییر پروفایل شما رد شد.',
      type: approved ? NotificationType.SUCCESS : NotificationType.WARNING,
      link: '/dashboard/profile',
      actorId: adminId,
    });
    await this.activity.log({
      actor: { id: adminId },
      action: approved ? 'PROFILE_CHANGE_APPROVED' : 'PROFILE_CHANGE_REJECTED',
      summary: `${approved ? 'تأیید' : 'رد'} تغییر پروفایل «${request.user.fullName ?? request.user.email}»`,
      entityType: 'USER',
      entityId: request.userId,
    });
    return { ok: true };
  }
}
