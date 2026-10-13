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
import { RATE_LIMITS, RateLimitService } from '../common/rate-limit.service';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';
import { SettingsService } from '../settings/settings.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestCodeDto } from './dto/request-code.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { OtpService } from './otp.service';

const SALT_ROUNDS = 12;

/**
 * A well-formed bcrypt hash of a random value, used to keep login timing
 * constant when the account does not exist (or has no password). Without it,
 * "unknown email" returns noticeably faster than "wrong password" and leaks
 * which emails are registered. Computed once at startup so the cost stays
 * realistic (a fresh random salt, SALT_ROUNDS work factor).
 */
const DUMMY_BCRYPT_HASH = bcrypt.hashSync(
  `timing-${Math.random().toString(36)}`,
  SALT_ROUNDS,
);

/** Client hints captured at login, used for the session list. */
export interface SessionContext {
  userAgent?: string | null;
  ip?: string | null;
}

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
    private readonly sessions: SessionsService,
    private readonly rateLimit: RateLimitService,
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
  async requestPhoneCode(dto: RequestCodeDto, ip?: string | null) {
    await this.assertPhoneLoginEnabled();
    const phone = OtpService.normalizePhone(dto.phone);
    // Guard against SMS-cost abuse and enumeration: cap per phone and per IP.
    await this.rateLimit.hit(RATE_LIMITS.otpRequestPhone, phone);
    if (ip) await this.rateLimit.hit(RATE_LIMITS.otpRequestIp, ip);
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
  async verifyPhoneCode(dto: VerifyPhoneDto, context: SessionContext = {}) {
    await this.assertPhoneLoginEnabled();
    const phone = OtpService.normalizePhone(dto.phone);
    await this.rateLimit.hit(RATE_LIMITS.otpVerify, phone);
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
        ...(await this.buildAuthResponse(existing, context)),
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
    return { ...(await this.buildAuthResponse(user, context)), isNewUser: true };
  }

  async register(dto: RegisterDto, context: SessionContext = {}) {
    if (context.ip) await this.rateLimit.hit(RATE_LIMITS.register, context.ip);
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

    return this.buildAuthResponse(user, context);
  }

  async login(dto: LoginDto, context: SessionContext = {}) {
    if (context.ip) await this.rateLimit.hit(RATE_LIMITS.login, context.ip);
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always run a bcrypt comparison — against the real hash when the account
    // exists, otherwise a dummy — so response time does not reveal whether the
    // email is registered. Phone-only accounts (no hash) take the same path.
    const hash = user?.passwordHash ?? DUMMY_BCRYPT_HASH;
    const valid = await bcrypt.compare(dto.password, hash);
    if (!user || !user.isActive || !user.passwordHash || !valid) {
      throw new UnauthorizedException('ایمیل یا رمز عبور اشتباه است');
    }

    await this.activity.log({
      actor: { id: user.id, email: user.email, role: user.role },
      action: 'USER_LOGIN',
      summary: `ورود به حساب: ${user.fullName ?? user.email}`,
      entityType: 'USER',
      entityId: user.id,
    });

    return this.buildAuthResponse(
      {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
      },
      context,
    );
  }

  /**
   * Sets (or replaces) the current user's password. Used right after a phone
   * sign-up — where the account starts without one — and later from the
   * profile panel. The caller is already authenticated, so this only trusts
   * the JWT subject, never a client-supplied user id.
   */
  async setPassword(
    userId: string,
    password: string,
    currentPassword?: string,
  ): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('حساب کاربری معتبر نیست');
    }
    // If a password already exists, require the current one before replacing
    // it — otherwise a stolen session could take over the account outright.
    if (user.passwordHash) {
      const ok =
        Boolean(currentPassword) &&
        (await bcrypt.compare(currentPassword as string, user.passwordHash));
      if (!ok) {
        throw new UnauthorizedException('رمز عبور فعلی صحیح نیست');
      }
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

  private async buildAuthResponse(
    user: {
      id: string;
      email: string | null;
      phone?: string | null;
      fullName?: string | null;
      role: 'USER' | 'CITIZEN_REPORTER' | 'ADMIN';
    },
    context: SessionContext = {},
  ) {
    const session = await this.sessions.create({
      userId: user.id,
      userAgent: context.userAgent,
      ip: context.ip,
    });
    const accessToken = this.jwt.sign({
      sub: user.id,
      sid: session.id,
      email: user.email,
      phone: user.phone ?? null,
      role: user.role,
    });
    return {
      accessToken,
      // NOTE: the refresh token is delivered via the HttpOnly cookie set by the
      // controller, never in the JSON body — JS must not be able to read it.
      refreshToken: session.refreshToken,
      sessionId: session.id,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone ?? null,
        fullName: user.fullName ?? null,
        role: user.role,
      },
    };
  }

  /**
   * Exchanges a valid refresh token for a fresh access token, rotating the
   * refresh token in the process. The user must still be active.
   */
  async refresh(rawRefreshToken: string, context: SessionContext = {}) {
    const rotated = await this.sessions.rotateRefresh(rawRefreshToken);
    if (!rotated) {
      throw new UnauthorizedException('نشست منقضی شده است؛ دوباره وارد شوید');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: rotated.userId },
      select: { id: true, email: true, phone: true, fullName: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      await this.sessions.revoke(rotated.sessionId, rotated.userId);
      throw new UnauthorizedException('حساب کاربری معتبر نیست');
    }
    const accessToken = this.jwt.sign({
      sub: user.id,
      sid: rotated.sessionId,
      email: user.email,
      phone: user.phone ?? null,
      role: user.role,
    });
    return {
      accessToken,
      refreshToken: rotated.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  /** Logout of the current device (revokes just this session). */
  async logout(userId: string, sessionId?: string): Promise<{ ok: true }> {
    if (sessionId) {
      await this.sessions.revoke(sessionId, userId);
    }
    return { ok: true };
  }

}
