import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';

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
import { VerifyEmailLoginDto } from './dto/verify-email-login.dto';
import { OtpService } from './otp.service';
import { SmsService } from './sms.service';

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

/** Roles allowed to use the email + password sign-in path. */
const ADMIN_LOGIN_ROLES = new Set(['ADMIN', 'MODERATOR']);

/** `admin@example.com` → `ad***@example.com`, safe to echo to the client. */
function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain) return null;
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
}

/** `09123456789` → `0912***789`. */
function maskPhone(phone: string | null): string | null {
  if (!phone || phone.length <= 6) return null;
  return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
}

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
    private readonly sms: SmsService,
    private readonly sessions: SessionsService,
    private readonly rateLimit: RateLimitService,
  ) {}

  /** Ensures phone sign-in is allowed by the admin toggle. */
  private async assertPhoneLoginEnabled(): Promise<void> {
    if (!(await this.settings.getPhoneLoginEnabled())) {
      throw new ForbiddenException('ورود با موبایل در حال حاضر غیرفعال است');
    }
  }

  /** Ensures email + password sign-in is allowed by the admin toggle. */
  private async assertEmailLoginEnabled(): Promise<void> {
    if (!(await this.settings.getEmailLoginEnabled())) {
      throw new ForbiddenException('ورود با ایمیل و رمز عبور در حال حاضر غیرفعال است');
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
    // The code is delivered by SMS and, when we know an address, by email too.
    // For an existing account the email on file wins; a new number may pass an
    // address so the sign-up code reaches both channels. That address is
    // rate-limited on its own to keep the endpoint from being used as an open
    // email relay.
    const requestedEmail = dto.email?.toLowerCase().trim();
    if (requestedEmail) {
      await this.rateLimit.hit(
        RATE_LIMITS.otpRequestEmail,
        createHash('sha256').update(requestedEmail).digest('hex'),
      );
    }
    const existing = await this.prisma.user.findUnique({
      where: { phone },
      select: { email: true },
    });
    const issued = await this.otp.issue(phone, 'login', {
      email: existing?.email ?? requestedEmail,
      channel: dto.channel,
      // Asking for SMS right after a Bale message must not hit the resend
      // cooldown; the per-phone rate limit still caps repeated requests.
      resend: dto.channel === 'sms',
    });
    // Do not reveal whether the number already has an account: the response is
    // identical for new and returning users (the verify step asks for the
    // profile fields only when it actually needs them).
    return { phone, ...issued };
  }

  /**
   * Development-only helper behind the login page's «تست ارسال پیامک» button.
   * It sends a real code through Melipayamak's console OTP endpoint so the
   * token can be verified without switching the whole dev environment to live
   * SMS. The code is not stored, so it cannot be used to sign in; production
   * responds 404.
   */
  async sendDevTestOtp(rawPhone: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException('مسیر یافت نشد');
    }
    const phone = OtpService.normalizePhone(rawPhone);
    const code = await this.sms.sendOtp(phone, { force: true });
    if (!code) {
      throw new ServiceUnavailableException('ارسال پیامک ناموفق بود');
    }
    return { phone: maskPhone(phone), sent: true, code };
  }

  /**
   * Development-only helper for the shared admin-notification template. Sends
   * a real SMS with `bodyId=586239` and the given `{0}`/`{1}` values so the
   * channel can be verified locally; production responds 404.
   */
  async sendDevAdminSmsTest(input: {
    phone: string;
    section?: string;
    subject?: string;
  }) {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException('مسیر یافت نشد');
    }
    const phone = OtpService.normalizePhone(input.phone);
    const section = input.section?.trim() || 'پشتیبانی';
    const subject = input.subject?.trim() || 'پشتیبانی آنلاین';
    const sent = await this.sms.sendAdminNotification(phone, section, subject, {
      force: true,
    });
    if (!sent) {
      throw new ServiceUnavailableException('ارسال پیامک ناموفق بود');
    }
    return { phone: maskPhone(phone), sent: true, section, subject };
  }

  /**
   * Step 2 of the phone flow: verify the code and either sign the existing
   * user in or create a new account from the phone alone. The identity fields
   * (first/last name, national code) are completed later on the profile page.
   */
  async verifyPhoneCode(dto: VerifyPhoneDto, context: SessionContext = {}) {
    await this.assertPhoneLoginEnabled();
    const phone = OtpService.normalizePhone(dto.phone);
    await this.rateLimit.hit(RATE_LIMITS.otpVerify, phone);
    const existing = await this.prisma.user.findUnique({ where: { phone } });

    // A first-time sign-up only needs the phone: name, national code and the
    // rest are collected afterwards on `/dashboard/profile`. Name/email are
    // still accepted when a client sends them, and the email must be free.
    if (!existing) {
      if (dto.email?.trim()) {
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

    const fullName = dto.fullName?.trim() || null;
    const email = dto.email?.toLowerCase().trim() || null;

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
      link: '/jga4rm8j?section=users',
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
    await this.assertEmailLoginEnabled();
    if (context.ip) await this.rateLimit.hit(RATE_LIMITS.register, context.ip);
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('این ایمیل قبلاً ثبت شده است');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, fullName: dto.fullName },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        role: true,
      },
    });

    // Sign-up is confirmed with the same one-time code as sign-in. The plan,
    // the admin notification and the session all wait for `verifyRegister`,
    // so an abandoned form never creates a "real" account.
    const issued = await this.otp.issueEmailLogin(
      user.id,
      user.email,
      user.phone,
      'register',
    );
    return {
      requiresOtp: true,
      email: maskEmail(user.email),
      phone: maskPhone(user.phone),
      ...issued,
    };
  }

  /** Step 2 of the email sign-up flow: verifies the code and opens a session. */
  async verifyRegister(
    dto: VerifyEmailLoginDto,
    context: SessionContext = {},
  ) {
    await this.assertEmailLoginEnabled();
    if (context.ip) {
      await this.rateLimit.hit(RATE_LIMITS.registerVerify, context.ip);
    }
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('حساب کاربری معتبر نیست');
    }
    await this.otp.verifyEmailLogin(user.id, dto.code);

    // Brand-new accounts start on the free plan so the panel shows
    // «اشتراک فعلی شما» instead of an «درخواست اشتراک» button.
    await this.subscriptions.assignDefaultPlan(user.id);

    await this.notifications.notifyAdmins({
      category: 'NEW_USER',
      title: 'کاربر جدید ثبت‌نام کرد',
      body: `${user.fullName ?? user.email} به پلتفرم پیوست.`,
      link: '/jga4rm8j?section=users',
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
    await this.assertEmailLoginEnabled();
    if (context.ip) await this.rateLimit.hit(RATE_LIMITS.login, context.ip);
    const email = dto.email.toLowerCase().trim();
    // Per-account bucket on top of the per-IP one: a botnet spreading attempts
    // across many addresses still cannot hammer a single account.
    // Hash the email so raw addresses do not end up in Redis keys/logs.
    await this.rateLimit.hit(
      RATE_LIMITS.loginEmail,
      createHash('sha256').update(email).digest('hex'),
    );
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always run a bcrypt comparison — against the real hash when the account
    // exists, otherwise a dummy — so response time does not reveal whether the
    // email is registered. Phone-only accounts (no hash) take the same path.
    const hash = user?.passwordHash ?? DUMMY_BCRYPT_HASH;
    const valid = await bcrypt.compare(dto.password, hash);
    if (!user || !user.isActive || !user.passwordHash || !valid) {
      throw new UnauthorizedException('ایمیل یا رمز عبور اشتباه است');
    }
    // Second factor: even a correct password must be confirmed with a one-time
    // code sent to the account's email (and phone, when configured). No token
    // is issued until `verifyEmailLogin` succeeds.
    const issued = await this.otp.issueEmailLogin(
      user.id,
      user.email,
      user.phone,
      'login',
    );
    return {
      requiresOtp: true,
      email: maskEmail(user.email),
      phone: maskPhone(user.phone),
      ...issued,
    };
  }

  /**
   * Unified email entry point used by the combined «ورود یا ثبت‌نام» form.
   * An existing account is signed in after checking its password; a new email
   * creates the account. Both paths then issue the same one-time code, and the
   * returned `flow` tells the client which verify endpoint to call.
   */
  async emailStart(dto: LoginDto, context: SessionContext = {}) {
    await this.assertEmailLoginEnabled();
    if (context.ip) await this.rateLimit.hit(RATE_LIMITS.login, context.ip);
    const email = dto.email.toLowerCase().trim();
    await this.rateLimit.hit(
      RATE_LIMITS.loginEmail,
      createHash('sha256').update(email).digest('hex'),
    );
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      if (context.ip) {
        await this.rateLimit.hit(RATE_LIMITS.register, context.ip);
      }
      const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
      const created = await this.prisma.user.create({
        data: { email, passwordHash },
        select: {
          id: true,
          email: true,
          phone: true,
          fullName: true,
          role: true,
        },
      });
      const issued = await this.otp.issueEmailLogin(
        created.id,
        created.email,
        created.phone,
        'register',
      );
      return {
        requiresOtp: true as const,
        flow: 'register' as const,
        email: maskEmail(created.email),
        phone: maskPhone(created.phone),
        ...issued,
      };
    }

    // Compare against a dummy hash when the account has no password so the
    // response time stays constant, exactly like `login`.
    const hash = user.passwordHash ?? DUMMY_BCRYPT_HASH;
    const valid = await bcrypt.compare(dto.password, hash);
    if (!user.isActive || !user.passwordHash || !valid) {
      throw new UnauthorizedException('ایمیل یا رمز عبور اشتباه است');
    }
    const issued = await this.otp.issueEmailLogin(
      user.id,
      user.email,
      user.phone,
      'login',
    );
    return {
      requiresOtp: true as const,
      flow: 'login' as const,
      email: maskEmail(user.email),
      phone: maskPhone(user.phone),
      ...issued,
    };
  }

  /**
   * Step 2 of the email/password flow: verifies the one-time code issued by
   * `login` and only then creates the session.
   */
  async verifyEmailLogin(
    dto: VerifyEmailLoginDto,
    context: SessionContext = {},
  ) {
    await this.assertEmailLoginEnabled();
    if (context.ip) await this.rateLimit.hit(RATE_LIMITS.login, context.ip);
    const email = dto.email.toLowerCase().trim();
    await this.rateLimit.hit(
      RATE_LIMITS.adminLoginVerify,
      createHash('sha256').update(email).digest('hex'),
    );
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('حساب کاربری معتبر نیست');
    }
    await this.otp.verifyEmailLogin(user.id, dto.code);

    await this.activity.log({
      actor: { id: user.id, email: user.email, role: user.role },
      action: 'USER_LOGIN',
      summary: `ورود با ایمیل و تأیید کد یکبارمصرف: ${user.fullName ?? user.email}`,
      entityType: 'USER',
      entityId: user.id,
    });

    return this.buildAuthResponse(user, context);
  }

  // -------------------------------------------------------------------------
  //  Admin / manager sign-in API (the web UI uses the shared `/login` page)
  // -------------------------------------------------------------------------

  /**
   * Step 1 of the admin email/password flow. Identical to `login` except the
   * account must belong to an admin or manager.
   */
  async adminLogin(dto: LoginDto, context: SessionContext = {}) {
    await this.assertEmailLoginEnabled();
    if (context.ip) await this.rateLimit.hit(RATE_LIMITS.login, context.ip);
    const email = dto.email.toLowerCase().trim();
    await this.rateLimit.hit(
      RATE_LIMITS.loginEmail,
      createHash('sha256').update(email).digest('hex'),
    );
    const user = await this.prisma.user.findUnique({ where: { email } });
    const hash = user?.passwordHash ?? DUMMY_BCRYPT_HASH;
    const valid = await bcrypt.compare(dto.password, hash);
    if (!user || !user.isActive || !user.passwordHash || !valid) {
      throw new UnauthorizedException('ایمیل یا رمز عبور اشتباه است');
    }
    if (!ADMIN_LOGIN_ROLES.has(user.role)) {
      throw new ForbiddenException('این حساب دسترسی مدیریتی ندارد');
    }
    const issued = await this.otp.issueEmailLogin(
      user.id,
      user.email,
      user.phone,
      'login',
      { simulateDelivery: true },
    );
    return {
      requiresOtp: true,
      email: maskEmail(user.email),
      phone: maskPhone(user.phone),
      ...issued,
    };
  }

  /** Step 2 of the admin email/password flow (role-checked). */
  async verifyAdminLogin(
    dto: VerifyEmailLoginDto,
    context: SessionContext = {},
  ) {
    await this.assertEmailLoginEnabled();
    if (context.ip) await this.rateLimit.hit(RATE_LIMITS.login, context.ip);
    const email = dto.email.toLowerCase().trim();
    await this.rateLimit.hit(
      RATE_LIMITS.adminLoginVerify,
      createHash('sha256').update(email).digest('hex'),
    );
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive || !ADMIN_LOGIN_ROLES.has(user.role)) {
      throw new UnauthorizedException('حساب مدیریتی معتبر نیست');
    }
    await this.otp.verifyEmailLogin(user.id, dto.code);
    await this.activity.log({
      actor: { id: user.id, email: user.email, role: user.role },
      action: 'USER_LOGIN',
      summary: `ورود مدیر با تأیید کد یکبارمصرف: ${user.fullName ?? user.email}`,
      entityType: 'USER',
      entityId: user.id,
    });
    return this.buildAuthResponse(user, context);
  }

  /**
   * Step 1 of the admin phone flow: only an existing, active admin/manager
   * number receives a code. Unlike the public phone flow this never creates an
   * account.
   */
  async requestAdminPhoneCode(dto: RequestCodeDto, ip?: string | null) {
    await this.assertPhoneLoginEnabled();
    const phone = OtpService.normalizePhone(dto.phone);
    await this.rateLimit.hit(RATE_LIMITS.otpRequestPhone, phone);
    if (ip) await this.rateLimit.hit(RATE_LIMITS.otpRequestIp, ip);
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user || !user.isActive || !ADMIN_LOGIN_ROLES.has(user.role)) {
      throw new UnauthorizedException('حساب مدیریتی با این شماره یافت نشد');
    }
    const issued = await this.otp.issue(phone, 'login', {
      email: user.email,
      simulateDelivery: true,
    });
    return { phone: maskPhone(phone), ...issued };
  }

  /** Step 2 of the admin phone flow (role-checked, never signs up). */
  async verifyAdminPhoneCode(
    dto: VerifyPhoneDto,
    context: SessionContext = {},
  ) {
    await this.assertPhoneLoginEnabled();
    const phone = OtpService.normalizePhone(dto.phone);
    await this.rateLimit.hit(RATE_LIMITS.otpVerify, phone);
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user || !user.isActive || !ADMIN_LOGIN_ROLES.has(user.role)) {
      throw new UnauthorizedException('حساب مدیریتی معتبر نیست');
    }
    await this.otp.verify(phone, dto.code);
    await this.activity.log({
      actor: { id: user.id, email: user.email, role: user.role },
      action: 'USER_LOGIN',
      summary: `ورود مدیر با موبایل: ${user.fullName ?? user.email ?? phone}`,
      entityType: 'USER',
      entityId: user.id,
    });
    return this.buildAuthResponse(user, context);
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

  /**
   * Sends a password-reset code to the signed-in user's email and, on request,
   * their phone. Used by the profile page so a password can be changed without
   * knowing the old one — proving control of the account's contact channels
   * replaces the old-password check.
   */
  async requestPasswordResetCode(userId: string, sendToPhone: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true },
    });
    if (!user) {
      throw new UnauthorizedException('حساب کاربری معتبر نیست');
    }
    if (!user.email && !(sendToPhone && user.phone)) {
      throw new BadRequestException(
        'برای این حساب راهی برای دریافت کد تأیید ثبت نشده است',
      );
    }
    await this.rateLimit.hit(RATE_LIMITS.passwordResetRequest, userId);
    return this.otp.issuePasswordReset(
      user.id,
      user.email ?? '',
      user.phone,
      sendToPhone && Boolean(user.phone),
    );
  }

  /**
   * Replaces the password after the OTP check. Unlike `setPassword`, this does
   * not ask for the current password: the OTP already proved account control.
   */
  async resetPasswordWithOtp(
    userId: string,
    code: string,
    password: string,
  ): Promise<{ ok: true }> {
    await this.rateLimit.hit(RATE_LIMITS.passwordResetVerify, userId);
    await this.otp.verifyPasswordReset(userId, code);
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
      summary: `تغییر رمز عبور با کد یکبارمصرف: ${user.fullName ?? user.email ?? user.phone}`,
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
      role: 'USER' | 'CITIZEN_REPORTER' | 'MODERATOR' | 'ADMIN';
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
    if (context.ip) await this.rateLimit.hit(RATE_LIMITS.refresh, context.ip);
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
