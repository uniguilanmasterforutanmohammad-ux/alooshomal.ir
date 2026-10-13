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
// (role, password, ...) is intentionally out of scope. Phone/email changes are
// OTP-verified before the request is filed, then need admin approval too.
const ALLOWED_FIELDS = ['fullName', 'phone', 'email'] as const;
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
    const created = await this.fileChangeRequest(userId, { fullName: fullName.trim() });
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
   * Step 2 of a phone change: check the OTP sent to the new number, then file a
   * pending change request. The number is NOT swapped here — the account keeps
   * its current phone until an admin approves the request. A code to the
   * *current* number is not required because the user is already authenticated
   * and proving control of the new number is the point.
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
    const request = await this.fileChangeRequest(userId, { phone });
    await this.notifications.notifyAdmins({
      category: 'SECURITY',
      type: NotificationType.INFO,
      title: 'درخواست تغییر شماره موبایل',
      body: `${me.fullName ?? me.email ?? me.phone} درخواست تغییر شماره به ${phone} دارد (کد تأیید شده).`,
      link: '/admin?section=users',
      actorId: userId,
    });
    await this.activity.log({
      actor: { id: userId },
      action: 'PROFILE_PHONE_CHANGE_REQUESTED',
      summary: `درخواست تغییر شماره موبایل به ${phone}`,
      entityType: 'USER',
      entityId: userId,
    });
    return { ...request, applied: false };
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
    const request = await this.fileChangeRequest(userId, { email });
    await this.notifications.notifyAdmins({
      category: 'SECURITY',
      type: NotificationType.INFO,
      title: 'درخواست تغییر ایمیل',
      body: `${me.fullName ?? me.phone ?? 'کاربر'} درخواست تغییر ایمیل از ${me.email ?? '—'} به ${email} دارد (کد تأیید شده).`,
      link: '/admin?section=users',
      actorId: userId,
    });
    await this.activity.log({
      actor: { id: userId, email: me.email },
      action: 'PROFILE_EMAIL_CHANGE_REQUESTED',
      summary: `درخواست تغییر ایمیل به ${email}`,
      entityType: 'USER',
      entityId: userId,
    });
    return { ...request, applied: false };
  }

  /**
   * Files the single PENDING change request for a user. When one already exists
   * its changes are merged with the new ones (a user may, for example, verify a
   * phone and an email while the admin has not reviewed the first request yet),
   * so the queue never contains more than one open request per user.
   */
  private async fileChangeRequest(
    userId: string,
    changes: Partial<Record<AllowedField, string>>,
  ) {
    const existing = await this.prisma.profileChangeRequest.findFirst({
      where: { userId, status: NewsStatus.PENDING },
    });
    if (existing) {
      const merged = {
        ...(existing.changes as Prisma.JsonObject),
        ...changes,
      } as Prisma.InputJsonValue;
      return this.prisma.profileChangeRequest.update({
        where: { id: existing.id },
        data: { changes: merged },
      });
    }
    return this.prisma.profileChangeRequest.create({
      data: { userId, changes },
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

    // Re-check uniqueness at approval time: another account may have claimed the
    // new phone/email while this request was pending.
    if (approved) {
      if (picked.phone) {
        const owner = await this.prisma.user.findUnique({
          where: { phone: picked.phone },
        });
        if (owner && owner.id !== request.userId) {
          throw new ConflictException(
            'این شماره از زمان ثبت درخواست توسط کاربر دیگری ثبت شده است',
          );
        }
      }
      if (picked.email) {
        const owner = await this.prisma.user.findUnique({
          where: { email: picked.email },
        });
        if (owner && owner.id !== request.userId) {
          throw new ConflictException(
            'این ایمیل از زمان ثبت درخواست توسط کاربر دیگری ثبت شده است',
          );
        }
      }
    }

    // A verified phone change also marks the new number as phone-verified.
    const appliedData: Prisma.UserUpdateInput = {
      ...picked,
      ...(approved && picked.phone ? { phoneVerified: true } : {}),
    };

    await this.prisma.$transaction([
      this.prisma.profileChangeRequest.update({
        where: { id },
        data: { status: decision, reason: reason ?? null, decidedAt: new Date() },
      }),
      ...(approved && Object.keys(picked).length > 0
        ? [this.prisma.user.update({ where: { id: request.userId }, data: appliedData })]
        : []),
    ]);

    const changedLabels = [
      picked.fullName ? 'نام' : null,
      picked.phone ? 'شماره موبایل' : null,
      picked.email ? 'ایمیل' : null,
    ].filter(Boolean) as string[];

    await this.notifications.notify({
      userId: request.userId,
      title: approved ? 'تغییر پروفایل تأیید شد' : 'درخواست تغییر پروفایل رد شد',
      body: approved
        ? changedLabels.length
          ? `تغییر ${changedLabels.join(' و ')} شما تأیید و اعمال شد.`
          : 'تغییرات پروفایل شما اعمال شد.'
        : reason
          ? `درخواست شما رد شد: ${reason}`
          : 'درخواست تغییر پروفایل شما رد شد.',
      type: approved ? NotificationType.SUCCESS : NotificationType.WARNING,
      link: '/dashboard/profile',
      actorId: adminId,
    });
    if (approved) {
      await this.notifications.notifyAdmins({
        category: 'SECURITY',
        type: NotificationType.SUCCESS,
        title: 'تغییر تماس کاربر تأیید شد',
        body: `تغییر ${changedLabels.join(' و ') || 'پروفایل'} برای «${request.user.fullName ?? request.user.email}» اعمال شد.`,
        link: '/admin?section=reports',
        actorId: adminId,
      });
    }
    await this.activity.log({
      actor: { id: adminId },
      action: approved ? 'PROFILE_CHANGE_APPROVED' : 'PROFILE_CHANGE_REJECTED',
      summary: `${approved ? 'تأیید' : 'رد'} تغییر ${changedLabels.join(' و ') || 'پروفایل'} «${request.user.fullName ?? request.user.email}»`,
      entityType: 'USER',
      entityId: request.userId,
    });
    return { ok: true };
  }
}
