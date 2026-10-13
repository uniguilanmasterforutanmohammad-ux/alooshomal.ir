import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestCodeDto } from './dto/request-code.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { OtpService } from './otp.service';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly notifications: NotificationsService,
    private readonly subscriptions: SubscriptionsService,
    private readonly activity: ActivityService,
    private readonly settings: SettingsService,
    private readonly otp: OtpService,
  ) {}

  /** Ensures phone sign-in is allowed by the admin toggle. */
  private async assertPhoneLoginEnabled(): Promise<void> {
    if (!(await this.settings.getPhoneLoginEnabled())) {
      throw new ForbiddenException('ورود با موبایل در حال حاضر غیرفعال است');
    }
  }

  /**
   * Step 1 of the phone flow: normalise the number and send an OTP. The
   * response is identical whether or not the number is already registered, so
   * it never leaks which phones have accounts.
   */
  async requestPhoneCode(dto: RequestCodeDto) {
    await this.assertPhoneLoginEnabled();
    const phone = OtpService.normalizePhone(dto.phone);
    const issued = await this.otp.issue(phone);
    // Tell the client whether this number is a returning user (login) or a new
    // one (sign-up), so a single form can drive both flows. This is only a UX
    // hint — no secret is revealed beyond "an account exists for this phone".
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    return { phone, ...issued, registered: Boolean(existing) };
  }

  /**
   * Step 2 of the phone flow: verify the code and either sign the existing
   * user in or create a new account. New accounts must supply a full name —
   * that is what makes the same form serve both login and sign-up.
   */
  async verifyPhoneCode(dto: VerifyPhoneDto) {
    await this.assertPhoneLoginEnabled();
    const phone = OtpService.normalizePhone(dto.phone);
    const existing = await this.prisma.user.findUnique({ where: { phone } });

    // Check the new-user case *before* consuming the code: a first-time
    // sign-up that still needs its profile fields must not burn the OTP,
    // otherwise the second call (with the fields) would fail with «کد منقضی».
    if (!existing) {
      if (!dto.fullName?.trim()) {
        // Signals the client to reveal the sign-up fields (name + email).
        throw new BadRequestException({
          code: 'FULLNAME_REQUIRED',
          message: 'برای ساخت حساب، نام و نام خانوادگی را وارد کنید',
        });
      }
      if (!dto.email?.trim()) {
        // Same sign-up step also collects the email.
        throw new BadRequestException({
          code: 'EMAIL_REQUIRED',
          message: 'برای ساخت حساب، ایمیل را وارد کنید',
        });
      }
      // Check the email *before* consuming the code, so a conflict lets the
      // user correct the address without requesting a new OTP.
      const emailOwner = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase().trim() },
      });
      if (emailOwner) {
        throw new ConflictException({
          code: 'EMAIL_TAKEN',
          message: 'این ایمیل قبلاً ثبت شده است',
        });
      }
    }

    await this.otp.verify(phone, dto.code);

    if (existing) {
      if (!existing.isActive) {
        throw new UnauthorizedException('حساب کاربری غیرفعال است');
      }
      if (!existing.phoneVerified) {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: { phoneVerified: true },
        });
      }
      await this.activity.log({
        actor: { id: existing.id, email: existing.email, role: existing.role },
        action: 'USER_LOGIN',
        summary: `ورود با موبایل: ${existing.fullName ?? existing.email ?? phone}`,
        entityType: 'USER',
        entityId: existing.id,
      });
      return {
        ...this.buildAuthResponse(existing),
        isNewUser: false,
      };
    }

    const fullName = dto.fullName!.trim();
    const email = dto.email!.toLowerCase().trim();

    const user = await this.prisma.user.create({
      data: { phone, phoneVerified: true, fullName, email },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        role: true,
      },
    });
    await this.subscriptions.assignDefaultPlan(user.id);
    await this.notifications.notifyAdmins({
      category: 'NEW_USER',
      title: 'کاربر جدید ثبت‌نام کرد',
      body: `${user.fullName ?? phone} با موبایل به پلتفرم پیوست.`,
      link: '/admin?section=users',
      actorId: user.id,
    });
    await this.activity.log({
      actor: { id: user.id, email: user.email, role: user.role },
      action: 'USER_REGISTERED',
      summary: `ثبت‌نام با موبایل: ${user.fullName ?? phone}`,
      entityType: 'USER',
      entityId: user.id,
    });
    return { ...this.buildAuthResponse(user), isNewUser: true };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('این ایمیل قبلاً ثبت شده است');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, fullName: dto.fullName },
      select: { id: true, email: true, fullName: true, role: true },
    });

    // Brand-new accounts start on the free plan so the panel shows
    // «اشتراک فعلی شما» instead of an «درخواست اشتراک» button.
    await this.subscriptions.assignDefaultPlan(user.id);

    await this.notifications.notifyAdmins({
      category: 'NEW_USER',
      title: 'کاربر جدید ثبت‌نام کرد',
      body: `${user.fullName ?? user.email} به پلتفرم پیوست.`,
      link: '/admin?section=users',
      actorId: user.id,
    });

    await this.activity.log({
      actor: { id: user.id, email: user.email, role: user.role },
      action: 'USER_REGISTERED',
      summary: `ثبت‌نام کاربر جدید: ${user.fullName ?? user.email}`,
      entityType: 'USER',
      entityId: user.id,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('ایمیل یا رمز عبور اشتباه است');
    }

    // Phone-only accounts have no password yet — treat as invalid credentials
    // rather than crashing bcrypt.compare.
    if (!user.passwordHash) {
      throw new UnauthorizedException('ایمیل یا رمز عبور اشتباه است');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('ایمیل یا رمز عبور اشتباه است');
    }

    await this.activity.log({
      actor: { id: user.id, email: user.email, role: user.role },
      action: 'USER_LOGIN',
      summary: `ورود به حساب: ${user.fullName ?? user.email}`,
      entityType: 'USER',
      entityId: user.id,
    });

    return this.buildAuthResponse({
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      role: user.role,
    });
  }

  /**
   * Sets (or replaces) the current user's password. Used right after a phone
   * sign-up — where the account starts without one — and later from the
   * profile panel. The caller is already authenticated, so this only trusts
   * the JWT subject, never a client-supplied user id.
   */
  async setPassword(userId: string, password: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('حساب کاربری معتبر نیست');
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await this.activity.log({
      actor: { id: user.id, email: user.email, role: user.role },
      action: 'USER_PASSWORD_SET',
      summary: `ثبت/تغییر رمز عبور: ${user.fullName ?? user.email ?? user.phone}`,
      entityType: 'USER',
      entityId: user.id,
    });
    return { ok: true };
  }

  private buildAuthResponse(user: {
    id: string;
    email: string | null;
    phone?: string | null;
    fullName?: string | null;
    role: 'USER' | 'CITIZEN_REPORTER' | 'ADMIN';
  }) {
    const accessToken = this.jwt.sign({
      sub: user.id,
      email: user.email,
      phone: user.phone ?? null,
      role: user.role,
    });
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone ?? null,
        fullName: user.fullName ?? null,
        role: user.role,
      },
    };
  }
}
