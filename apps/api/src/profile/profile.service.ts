import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NewsStatus, NotificationType, Prisma } from '@prisma/client';

import { ActivityService } from '../activity/activity.service';
import { OtpService } from '../auth/otp.service';
import { isProfileComplete, isValidNationalCode } from '../common/national-code';
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
          firstName: true,
          lastName: true,
          nationalCode: true,
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
    return {
      ...rest,
      hasPassword: Boolean(passwordHash),
      profileCompleted: isProfileComplete(user),
      pendingChange: pending,
    };
  }

  /**
   * Save the identity fields that unlock content creation. `fullName` is kept
   * in sync so every list, invoice and notification keeps showing one name.
   */
  async updateIdentity(
    userId: string,
    dto: { firstName: string; lastName: string; nationalCode: string },
  ) {
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();
    const nationalCode = dto.nationalCode.trim();
    if (!isValidNationalCode(nationalCode)) {
      throw new BadRequestException('کد ملی وارد‌شده معتبر نیست');
    }
    const owner = await this.prisma.user.findUnique({
      where: { nationalCode },
      select: { id: true },
    });
    if (owner && owner.id !== userId) {
      throw new ConflictException('این کد ملی قبلاً برای حساب دیگری ثبت شده است');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        nationalCode,
        fullName: `${firstName} ${lastName}`,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        firstName: true,
        lastName: true,
        nationalCode: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    await this.activity.log({
      actor: { id: userId, email: user.email, role: user.role },
      action: 'PROFILE_IDENTITY_UPDATED',
      summary: `تکمیل/ویرایش مشخصات هویتی: ${user.fullName}`,
      entityType: 'USER',
      entityId: userId,
    });
    return { ...user, profileCompleted: true };
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
   * Step 1 of an email change: validate the new address for uniqueness and send
   * the OTP to *that* address, so the user proves control of the mailbox they
   * want to add. No verified phone is required.
   */
  async requestEmailChange(userId: string, rawEmail: string) {
    const email = rawEmail.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('ایمیل معتبر نیست');
    }
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
    const issued = await this.otp.issueEmailChange(userId, email);
    return { email, sentTo: email, ...issued };
  }

  /**
   * Step 2 of an email change: check the OTP sent to the new email and apply
   * the change immediately. The code already proves control of the mailbox, so
   * no admin approval is required (unlike phone changes).
   */
  async verifyEmailChange(userId: string, rawEmail: string, code: string) {
    const email = rawEmail.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('ایمیل معتبر نیست');
    }
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
    await this.otp.verifyEmailChange(userId, code);
    await this.prisma.user.update({ where: { id: userId }, data: { email } });
    await this.activity.log({
      actor: { id: userId, email },
      action: 'PROFILE_EMAIL_CHANGED',
      summary: `تغییر ایمیل از ${me.email ?? '—'} به ${email}`,
      entityType: 'USER',
      entityId: userId,
    });
    return { applied: true, email };
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
      ...(approved && picked.fullName
        ? {
            firstName: picked.fullName.split(/\s+/)[0] ?? null,
            lastName: picked.fullName.split(/\s+/).slice(1).join(' ') || null,
          }
        : {}),
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
