import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NewsStatus, NotificationType, Prisma } from '@prisma/client';

import { ActivityService } from '../activity/activity.service';
import { OtpService } from '../auth/otp.service';
import { SettingsService } from '../settings/settings.service';
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
    private readonly otp: OtpService,
    private readonly settings: SettingsService,
  ) {}

  /** Contact changes rely on the same OTP delivery as phone sign-in. */
  private async assertOtpAvailable(): Promise<void> {
    if (!(await this.settings.getPhoneLoginEnabled())) {
      throw new BadRequestException(
        'امکان ارسال کد تأیید در حال حاضر غیرفعال است',
      );
    }
  }

  /** Profile of the current user plus their latest pending change request. */
  async me(userId: string) {
    const [user, pending] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          fullName: true,
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
    ]);
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    // Never leak the hash itself — only whether a password has been set.
    const { passwordHash, ...rest } = user;
    return { ...rest, hasPassword: Boolean(passwordHash), pendingChange: pending };
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
   * Step 2 of a phone change: check the OTP sent to the new number, then swap
   * it in. A code to the *current* number is not required because the user is
   * already authenticated and proving control of the new number is the point.
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
    await this.prisma.user.update({
      where: { id: userId },
      data: { phone, phoneVerified: true },
    });
    // Tell the user (and the admin team) that the account's phone changed.
    await this.notifications.notify({
      userId,
      type: NotificationType.SUCCESS,
      title: 'شماره موبایل تغییر کرد',
      body: `شماره موبایل حساب شما به ${phone} تغییر یافت.`,
      link: '/dashboard/profile',
      actorId: userId,
    });
    await this.notifications.notifyAdmins({
      category: 'SECURITY',
      type: NotificationType.WARNING,
      title: 'تغییر شماره موبایل کاربر',
      body: `${me.fullName ?? me.email ?? me.phone} شماره‌ی خود را به ${phone} تغییر داد.`,
      link: '/admin?section=reports',
      actorId: userId,
    });
    await this.activity.log({
      actor: { id: userId },
      action: 'PROFILE_PHONE_CHANGED',
      summary: `تغییر شماره موبایل به ${phone}`,
      entityType: 'USER',
      entityId: userId,
    });
    return this.me(userId);
  }

  /**
   * Step 1 of an email change. SMS is the only verification channel, so the
   * code is sent to the user's current phone (which proves control of the
   * account). The new email is validated for uniqueness up-front.
   */
  async requestEmailChange(userId: string, rawEmail: string) {
    await this.assertOtpAvailable();
    const email = rawEmail.toLowerCase().trim();
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
    if (!me.phone) {
      throw new BadRequestException(
        'برای تغییر ایمیل ابتدا باید شماره موبایل ثبت شده باشد',
      );
    }
    const issued = await this.otp.issue(me.phone, 'email-change');
    // The code goes to the current phone, so echo the masked target back.
    return { email, sentTo: me.phone, ...issued };
  }

  /** Step 2 of an email change: check the OTP sent to the current phone. */
  async verifyEmailChange(userId: string, rawEmail: string, code: string) {
    await this.assertOtpAvailable();
    const email = rawEmail.toLowerCase().trim();
    const me = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!me) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    if (!me.phone) {
      throw new BadRequestException(
        'برای تغییر ایمیل ابتدا باید شماره موبایل ثبت شده باشد',
      );
    }
    const owner = await this.prisma.user.findUnique({ where: { email } });
    if (owner && owner.id !== userId) {
      throw new ConflictException('این ایمیل قبلاً ثبت شده است');
    }
    await this.otp.verify(me.phone, code, 'email-change');
    await this.prisma.user.update({
      where: { id: userId },
      data: { email },
    });
    // Tell the user (and the admin team) that the account's email changed. The
    // body deliberately includes the *old* address so an unauthorised change is
    // obvious and reportable.
    await this.notifications.notify({
      userId,
      type: NotificationType.SUCCESS,
      title: 'ایمیل تغییر کرد',
      body: `ایمیل حساب شما به ${email} تغییر یافت (ایمیل قبلی: ${me.email ?? '—'}).`,
      link: '/dashboard/profile',
      actorId: userId,
    });
    await this.notifications.notifyAdmins({
      category: 'SECURITY',
      type: NotificationType.WARNING,
      title: 'تغییر ایمیل کاربر',
      body: `${me.fullName ?? me.phone ?? 'کاربر'} ایمیل خود را از ${me.email ?? '—'} به ${email} تغییر داد.`,
      link: '/admin?section=reports',
      actorId: userId,
    });
    await this.activity.log({
      actor: { id: userId, email: me.email },
      action: 'PROFILE_EMAIL_CHANGED',
      summary: `تغییر ایمیل به ${email}`,
      entityType: 'USER',
      entityId: userId,
    });
    return this.me(userId);
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
