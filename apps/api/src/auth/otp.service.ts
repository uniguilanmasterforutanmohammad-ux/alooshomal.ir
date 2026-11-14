import { createHash, randomInt } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import { RedisService } from '../redis/redis.service';
import { MailService } from './mail.service';
import { SmsService } from './sms.service';

/**
 * Issues and verifies the one-time codes used by the phone sign-in flow.
 *
 * Storage is deliberately light: codes live in Redis (with an in-memory
 * fallback used *only* while Redis is unreachable) for a few minutes and are
 * never persisted in Postgres. Only a hash of the code is stored, keyed by the
 * phone number.
 *
 * Redis is the source of truth whenever it is connected: the in-memory mirror
 * is consulted only during an outage, never as a stale shadow of a live Redis.
 * Without that rule, flushing Redis (or an operator deleting a key) would not
 * take effect and an already-consumed code could still be replayed.
 *
 * Local dev never sends real SMS: when Melipayamak is not configured *and* the
 * app is not running in production, the service mints a fixed `DEV_OTP_CODE`,
 * logs it, and returns it in the API response so the developer can complete the
 * flow without a real phone. In production the same missing configuration is a
 * hard error — the fixed code must never be handed out on a real deployment.
 */
const OTP_TTL_SECONDS = 5 * 60;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;

/** Fixed code used when SMS delivery is disabled (local dev). */
export const DEV_OTP_CODE = '123456';

/**
 * OTP purposes. Each flow gets its own key namespace so a code issued for one
 * action (e.g. sign-in) can never be replayed to authorise another (e.g.
 * changing the account phone/email).
 */
export type OtpPurpose = 'login' | 'phone-change' | 'email-change' | 'claim';

const keyPrefix = (purpose: OtpPurpose) => `otp:${purpose}:phone:`;
const passwordResetKey = (userId: string) => `otp:password-reset:user:${userId}`;
const emailChangeKey = (userId: string) => `otp:email-change:user:${userId}`;
const emailLoginKey = (userId: string) => `otp:email-login:user:${userId}`;
const claimUserCooldownKey = (userId: string) => `otp:claim:user:${userId}:issued`;

/**
 * Claim codes are bound to the card *and* the channel target, so a code issued
 * for one business can never be replayed on another (even by the same user).
 */
const claimKey = (
  businessCardId: string,
  channel: 'sms' | 'email',
  target: string,
) => `otp:claim:${channel}:${businessCardId}:${target.trim().toLowerCase()}`;

interface OtpRecord {
  hash: string;
  attempts: number;
}

export interface IssuedOtp {
  /** Present only in dev (no real SMS) so the UI can show the code. */
  devCode?: string;
  /** True when this environment deliberately skipped real SMS/email delivery. */
  simulated?: boolean;
  /** Seconds the client should wait before allowing a resend. */
  resendAfter: number;
  /** True when the code was actually sent by SMS. */
  sent: boolean;
  /** True when the same code was also delivered to the account's email. */
  emailSent?: boolean;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  /**
   * Fallback store, used only while Redis is unavailable (see the class doc).
   * Bounded so a long-running process cannot grow it without limit.
   */
  private readonly memory = new Map<
    string,
    { record: OtpRecord; expiresAt: number }
  >();
  private static readonly MEMORY_MAX_ENTRIES = 5000;

  /**
   * True only outside production. The dev bypass (fixed code, no SMS) is
   * allowed exclusively here, so a production deploy can never leak `123456`.
   */
  private readonly isDev = process.env.NODE_ENV !== 'production';

  constructor(
    private readonly redis: RedisService,
    private readonly sms: SmsService,
    private readonly mail: MailService,
  ) {}

  /**
   * Normalises an Iranian mobile number to the canonical `09xxxxxxxxx` form.
   * Accepts `09…`, `9…`, `+989…`, `00989…` and Persian/Arabic digits.
   * Throws when the value cannot be a valid mobile number.
   */
  static normalizePhone(input: string): string {
    const digits = input
      .trim()
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/[^\d+]/g, '');

    let local = digits;
    if (local.startsWith('+98')) local = `0${local.slice(3)}`;
    else if (local.startsWith('0098')) local = `0${local.slice(4)}`;
    else if (local.startsWith('98') && local.length === 12) local = `0${local.slice(2)}`;
    else if (local.startsWith('9') && local.length === 10) local = `0${local}`;

    if (!/^09\d{9}$/.test(local)) {
      throw new BadRequestException('شماره موبایل معتبر نیست');
    }
    return local;
  }

  private hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private async readKey(key: string): Promise<OtpRecord | null> {
    const raw = await this.redis.get(key);
    if (raw) {
      try {
        return JSON.parse(raw) as OtpRecord;
      } catch {
        return null;
      }
    }
    // While Redis is reachable it is authoritative: a cache miss means the code
    // is genuinely absent (expired, consumed or flushed), so the in-memory
    // mirror must not resurrect it.
    if (this.redis.isReady) return null;
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return entry.record;
  }

  private read(purpose: OtpPurpose, phone: string): Promise<OtpRecord | null> {
    return this.readKey(keyPrefix(purpose) + phone);
  }

  /** Drops expired entries (and, if still needed, the oldest ones). */
  private pruneMemory(): void {
    const now = Date.now();
    for (const [key, entry] of this.memory) {
      if (entry.expiresAt < now) this.memory.delete(key);
    }
    while (this.memory.size > OtpService.MEMORY_MAX_ENTRIES) {
      const oldest = this.memory.keys().next().value;
      if (oldest === undefined) break;
      this.memory.delete(oldest);
    }
  }

  private async writeKey(key: string, record: OtpRecord): Promise<void> {
    const serialized = JSON.stringify(record);
    await this.redis.set(key, serialized, OTP_TTL_SECONDS);
    // Mirror to memory so an outage that starts right after issuing still has a
    // usable code. Reads ignore this mirror while Redis is reachable.
    this.pruneMemory();
    this.memory.set(key, {
      record,
      expiresAt: Date.now() + OTP_TTL_SECONDS * 1000,
    });
  }

  private write(purpose: OtpPurpose, phone: string, record: OtpRecord): Promise<void> {
    return this.writeKey(keyPrefix(purpose) + phone, record);
  }

  private async clearKey(key: string): Promise<void> {
    await this.redis.del(key);
    this.memory.delete(key);
  }

  private clear(purpose: OtpPurpose, phone: string): Promise<void> {
    return this.clearKey(keyPrefix(purpose) + phone);
  }

  /** True when a code was issued within the resend cooldown window. */
  private async recentlyIssuedKey(key: string): Promise<boolean> {
    const marker = await this.redis.get(key);
    if (marker) return true;
    // Same rule as `read`: the memory fallback is only trusted during an outage.
    if (this.redis.isReady) return false;
    const entry = this.memory.get(key);
    return Boolean(entry && entry.expiresAt > Date.now());
  }

  private recentlyIssued(purpose: OtpPurpose, phone: string): Promise<boolean> {
    return this.recentlyIssuedKey(`${keyPrefix(purpose)}${phone}:issued`);
  }

  private async markIssuedKey(key: string): Promise<void> {
    await this.redis.set(key, '1', OTP_RESEND_COOLDOWN_SECONDS);
    this.memory.set(key, {
      record: { hash: '1', attempts: 0 },
      expiresAt: Date.now() + OTP_RESEND_COOLDOWN_SECONDS * 1000,
    });
  }

  private markIssued(purpose: OtpPurpose, phone: string): Promise<void> {
    return this.markIssuedKey(`${keyPrefix(purpose)}${phone}:issued`);
  }

  /**
   * Sends (or, in dev, mints) a fresh code for `phone` and stores its hash.
   * Returns dev-only metadata so the UI can help the developer.
   */
  async issue(
    phone: string,
    purpose: OtpPurpose = 'login',
    options: { email?: string | null; simulateDelivery?: boolean } = {},
  ): Promise<IssuedOtp> {
    if (await this.recentlyIssued(purpose, phone)) {
      throw new BadRequestException(
        'کد قبلی هنوز معتبر است؛ لطفاً کمی بعد دوباره تلاش کنید',
      );
    }

    // Admin sign-in on a developer machine must never hit the real gateway,
    // even when SMTP/Melipayamak credentials are present in `.env`.
    const simulate = this.isDev && options.simulateDelivery === true;
    let code: string;
    let sent = false;
    if (simulate) {
      code = DEV_OTP_CODE;
      this.logger.log(
        `[dev] ${purpose} OTP for ${phone} is ${code} (delivery simulated)`,
      );
    } else if (this.sms.enabled) {
      const remote = await this.sms.sendOtp(phone);
      if (!remote) {
        // Configured but the gateway returned no code — never fall back to a
        // hard-coded value.
        throw new ServiceUnavailableException(
          'ارسال پیامک در حال حاضر در دسترس نیست؛ لطفاً بعداً تلاش کنید',
        );
      }
      code = remote;
      sent = true;
    } else if (this.isDev) {
      // Dev bypass: fixed code, no network, printed to the API log.
      code = DEV_OTP_CODE;
      this.logger.log(`[dev] OTP for ${phone} is ${code} (SMS disabled)`);
    } else {
      // Production without any Melipayamak transport (token path or REST
      // username/APIKey): refuse instead of handing out the fixed dev code.
      this.logger.error(
        `OTP request for ${phone} rejected: no Melipayamak transport is configured in production`,
      );
      throw new ServiceUnavailableException(
        'ارسال پیامک در حال حاضر در دسترس نیست؛ لطفاً بعداً تلاش کنید',
      );
    }

    await this.write(purpose, phone, { hash: this.hash(code), attempts: 0 });
    await this.markIssued(purpose, phone);

    // Deliver the same code by email as well, so the user can pick whichever
    // channel is easier. A mail failure must not break an SMS that already
    // went out, so it is logged and swallowed.
    let emailSent = false;
    const email = options.email?.trim();
    if (!simulate && email && this.mail.enabled) {
      try {
        emailSent = await this.mail.sendOtp(email, code, purpose);
      } catch (error) {
        this.logger.error(
          `OTP email to ${email} failed: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }

    return {
      resendAfter: OTP_RESEND_COOLDOWN_SECONDS,
      sent,
      emailSent,
      ...(simulate ? { simulated: true } : {}),
      ...(sent ? {} : { devCode: code }),
    };
  }

  /**
   * Verifies `code` for `phone`. Throws on mismatch; clears the code on
   * success or when the attempt budget is exhausted.
   */
  async verify(
    phone: string,
    code: string,
    purpose: OtpPurpose = 'login',
  ): Promise<void> {
    const record = await this.read(purpose, phone);
    if (!record) {
      throw new BadRequestException('کد منقضی شده است؛ دوباره درخواست کنید');
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await this.clear(purpose, phone);
      throw new BadRequestException('تعداد تلاش‌ها بیش از حد مجاز است');
    }
    if (record.hash !== this.hash(code.trim())) {
      await this.write(purpose, phone, {
        hash: record.hash,
        attempts: record.attempts + 1,
      });
      throw new BadRequestException('کد وارد‌شده صحیح نیست');
    }
    await this.clear(purpose, phone);
  }

  /**
   * Issues a password-reset code for the signed-in user.
   *
   * The code always goes to the account email; when `sendToPhone` is true and a
   * phone is on file, the same code is texted as well. It is keyed by user id
   * (not phone) so an account without a phone — such as the admin — can still
   * reset its password.
   */
  async issuePasswordReset(
    userId: string,
    email: string,
    phone: string | null,
    sendToPhone: boolean,
  ): Promise<IssuedOtp> {
    const key = passwordResetKey(userId);
    if (await this.recentlyIssuedKey(`${key}:issued`)) {
      throw new BadRequestException(
        'کد قبلی هنوز معتبر است؛ لطفاً کمی بعد دوباره تلاش کنید',
      );
    }

    let code: string;
    let sent = false;
    if (sendToPhone && phone && this.sms.enabled) {
      const remote = await this.sms.sendOtp(phone);
      if (!remote) {
        throw new ServiceUnavailableException(
          'ارسال پیامک در حال حاضر در دسترس نیست؛ لطفاً بعداً تلاش کنید',
        );
      }
      code = remote;
      sent = true;
    } else if (this.isDev && !this.mail.enabled) {
      // Local dev without SMTP: same fixed-code bypass as the login flow.
      code = DEV_OTP_CODE;
      this.logger.log(`[dev] password-reset OTP for ${userId} is ${code}`);
    } else {
      code = String(randomInt(100_000, 1_000_000));
    }

    let emailSent = false;
    if (email && this.mail.enabled) {
      try {
        emailSent = await this.mail.sendOtp(email, code, 'password-reset');
      } catch (error) {
        this.logger.error(
          `Password-reset email to ${email} failed: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
        // If SMS did not go out either, the user has no way to receive the code.
        if (!sent) {
          throw new ServiceUnavailableException('ارسال کد تأیید ناموفق بود');
        }
      }
    }
    // In dev the fixed code is returned to the caller, so no channel is fine.
    if (!emailSent && !sent && !this.isDev) {
      throw new ServiceUnavailableException(
        'ارسال کد تأیید در حال حاضر در دسترس نیست',
      );
    }

    await this.writeKey(key, { hash: this.hash(code), attempts: 0 });
    await this.markIssuedKey(`${key}:issued`);

    return {
      resendAfter: OTP_RESEND_COOLDOWN_SECONDS,
      sent,
      emailSent,
      ...(this.isDev && !sent && !emailSent ? { devCode: code } : {}),
    };
  }

  /** Verifies a password-reset code for `userId`; clears it on success. */
  async verifyPasswordReset(userId: string, code: string): Promise<void> {
    const key = passwordResetKey(userId);
    const record = await this.readKey(key);
    if (!record) {
      throw new BadRequestException('کد منقضی شده است؛ دوباره درخواست کنید');
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await this.clearKey(key);
      throw new BadRequestException('تعداد تلاش‌ها بیش از حد مجاز است');
    }
    if (record.hash !== this.hash(code.trim())) {
      await this.writeKey(key, {
        hash: record.hash,
        attempts: record.attempts + 1,
      });
      throw new BadRequestException('کد وارد‌شده صحیح نیست');
    }
    await this.clearKey(key);
  }

  /**
   * Issues a code to the *new* email address for an email change.
   *
   * Keyed by user id (not phone) so the account does not need a verified phone
   * to change its email. The code is delivered only by email — proving control
   * of the new address is the whole point of this step.
   */
  async issueEmailChange(userId: string, email: string): Promise<IssuedOtp> {
    const key = emailChangeKey(userId);
    if (await this.recentlyIssuedKey(`${key}:issued`)) {
      throw new BadRequestException(
        'کد قبلی هنوز معتبر است؛ لطفاً کمی بعد دوباره تلاش کنید',
      );
    }

    let code: string;
    let emailSent = false;
    if (this.mail.enabled) {
      code = String(randomInt(100_000, 1_000_000));
      try {
        emailSent = await this.mail.sendOtp(email, code, 'email-change');
      } catch (error) {
        this.logger.error(
          `Email-change OTP to ${email} failed: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
      if (!emailSent) {
        throw new ServiceUnavailableException('ارسال کد تأیید ناموفق بود');
      }
    } else if (this.isDev) {
      // Local dev without SMTP: same fixed-code bypass as the other flows.
      code = DEV_OTP_CODE;
      this.logger.log(`[dev] email-change OTP for ${userId} is ${code}`);
    } else {
      throw new ServiceUnavailableException(
        'ارسال ایمیل در حال حاضر در دسترس نیست',
      );
    }

    await this.writeKey(key, { hash: this.hash(code), attempts: 0 });
    await this.markIssuedKey(`${key}:issued`);

    return {
      resendAfter: OTP_RESEND_COOLDOWN_SECONDS,
      sent: false,
      emailSent,
      ...(this.isDev && !emailSent ? { devCode: code } : {}),
    };
  }

  /** Verifies an email-change code for `userId`; clears it on success. */
  async verifyEmailChange(userId: string, code: string): Promise<void> {
    const key = emailChangeKey(userId);
    const record = await this.readKey(key);
    if (!record) {
      throw new BadRequestException('کد منقضی شده است؛ دوباره درخواست کنید');
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await this.clearKey(key);
      throw new BadRequestException('تعداد تلاش‌ها بیش از حد مجاز است');
    }
    if (record.hash !== this.hash(code.trim())) {
      await this.writeKey(key, {
        hash: record.hash,
        attempts: record.attempts + 1,
      });
      throw new BadRequestException('کد وارد‌شده صحیح نیست');
    }
    await this.clearKey(key);
  }

  /**
   * Issues the second-factor code after an email + password check (regular
   * users on `/login`, admins/managers on `/jga4rm8j/login`) or after an email
   * sign-up.
   *
   * Keyed by user id (not phone) so accounts without a verified phone still
   * receive it by email. The code is delivered to the account email and, when
   * Melipayamak is configured and a phone is on file, by SMS too.
   */
  async issueEmailLogin(
    userId: string,
    email: string | null,
    phone: string | null,
    purpose: 'login' | 'register' = 'login',
    options: { simulateDelivery?: boolean } = {},
  ): Promise<IssuedOtp> {
    const key = emailLoginKey(userId);
    if (await this.recentlyIssuedKey(`${key}:issued`)) {
      throw new BadRequestException(
        'کد قبلی هنوز معتبر است؛ لطفاً کمی بعد دوباره تلاش کنید',
      );
    }

    // Only the local/dev admin sign-in passes `simulateDelivery`; production
    // still delivers through the configured channels.
    const simulate = this.isDev && options.simulateDelivery === true;
    let code: string;
    let sent = false;
    if (simulate) {
      code = DEV_OTP_CODE;
      this.logger.log(
        `[dev] admin-login OTP for ${userId} is ${code} (delivery simulated)`,
      );
    } else if (phone && this.sms.enabled) {
      const remote = await this.sms.sendOtp(phone);
      if (!remote) {
        throw new ServiceUnavailableException(
          'ارسال پیامک در حال حاضر در دسترس نیست؛ لطفاً بعداً تلاش کنید',
        );
      }
      code = remote;
      sent = true;
    } else if (this.isDev && !this.mail.enabled) {
      // Local dev without SMTP: same fixed-code bypass as the other flows.
      code = DEV_OTP_CODE;
      this.logger.log(`[dev] ${purpose} OTP for ${userId} is ${code}`);
    } else {
      code = String(randomInt(100_000, 1_000_000));
    }

    let emailSent = false;
    if (!simulate && email && this.mail.enabled) {
      try {
        emailSent = await this.mail.sendOtp(email, code, purpose);
      } catch (error) {
        this.logger.error(
          `${purpose} email to ${email} failed: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
        // In local dev a broken SMTP must not block the flow: the generated
        // code is returned as `devCode` below instead.
        if (!sent && !this.isDev) {
          throw new ServiceUnavailableException('ارسال کد تأیید ناموفق بود');
        }
      }
    }
    // In dev the fixed code is returned to the caller, so no channel is fine.
    if (!emailSent && !sent && !this.isDev) {
      throw new ServiceUnavailableException(
        'ارسال کد تأیید در حال حاضر در دسترس نیست',
      );
    }

    await this.writeKey(key, { hash: this.hash(code), attempts: 0 });
    await this.markIssuedKey(`${key}:issued`);

    return {
      resendAfter: OTP_RESEND_COOLDOWN_SECONDS,
      sent,
      emailSent,
      ...(simulate ? { simulated: true } : {}),
      ...(this.isDev && !sent && !emailSent ? { devCode: code } : {}),
    };
  }

  /** Verifies an email sign-in/sign-up code for `userId`; clears it on success. */
  async verifyEmailLogin(userId: string, code: string): Promise<void> {
    const key = emailLoginKey(userId);
    const record = await this.readKey(key);
    if (!record) {
      throw new BadRequestException('کد منقضی شده است؛ دوباره درخواست کنید');
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await this.clearKey(key);
      throw new BadRequestException('تعداد تلاش‌ها بیش از حد مجاز است');
    }
    if (record.hash !== this.hash(code.trim())) {
      await this.writeKey(key, {
        hash: record.hash,
        attempts: record.attempts + 1,
      });
      throw new BadRequestException('کد وارد‌شده صحیح نیست');
    }
    await this.clearKey(key);
  }

  /**
   * Sends a one-time code to the **business card's own** mobile/e-mail, used
   * before an owner can take over an imported profile. The key carries the card
   * id, so a code issued for one business can never verify another. A per-user
   * cooldown prevents a signed-in account from spraying SMS across cards.
   */
  async issueClaimCode(input: {
    businessCardId: string;
    userId: string;
    channel: 'sms' | 'email';
    phone?: string | null;
    email?: string | null;
  }): Promise<IssuedOtp> {
    const target = (input.channel === 'sms' ? input.phone : input.email)?.trim();
    if (!target) {
      throw new BadRequestException('راه ارتباطی برای ارسال کد وجود ندارد');
    }
    if (await this.recentlyIssuedKey(claimUserCooldownKey(input.userId))) {
      throw new BadRequestException(
        'کد قبلی هنوز معتبر است؛ لطفاً کمی بعد دوباره تلاش کنید',
      );
    }

    let code: string;
    let sent = false;
    let emailSent = false;
    if (input.channel === 'sms') {
      if (this.sms.enabled) {
        const remote = await this.sms.sendOtp(target);
        if (!remote) {
          throw new ServiceUnavailableException(
            'ارسال پیامک در حال حاضر در دسترس نیست؛ لطفاً بعداً تلاش کنید',
          );
        }
        code = remote;
        sent = true;
      } else if (this.isDev) {
        code = DEV_OTP_CODE;
        this.logger.log(
          `[dev] claim OTP for ${target} is ${code} (SMS disabled)`,
        );
      } else {
        throw new ServiceUnavailableException(
          'ارسال پیامک در حال حاضر در دسترس نیست؛ لطفاً بعداً تلاش کنید',
        );
      }
    } else {
      code = String(randomInt(100_000, 1_000_000));
      if (this.mail.enabled) {
        try {
          emailSent = await this.mail.sendOtp(target, code, 'claim');
        } catch (error) {
          this.logger.error(
            `claim OTP email to ${target} failed: ${
              error instanceof Error ? error.message : 'unknown error'
            }`,
          );
        }
        if (!emailSent && !this.isDev) {
          throw new ServiceUnavailableException('ارسال کد تأیید به ایمیل ناموفق بود');
        }
      } else if (this.isDev) {
        code = DEV_OTP_CODE;
        this.logger.log(
          `[dev] claim OTP for ${target} is ${code} (email disabled)`,
        );
      } else {
        throw new ServiceUnavailableException(
          'ارسال ایمیل در حال حاضر در دسترس نیست؛ لطفاً بعداً تلاش کنید',
        );
      }
    }

    const key = claimKey(input.businessCardId, input.channel, target);
    await this.writeKey(key, { hash: this.hash(code), attempts: 0 });
    await this.markIssuedKey(`${key}:issued`);
    await this.markIssuedKey(claimUserCooldownKey(input.userId));
    return {
      resendAfter: OTP_RESEND_COOLDOWN_SECONDS,
      sent,
      emailSent,
      ...(this.isDev && !sent && !emailSent ? { devCode: code } : {}),
    };
  }

  /** Verifies a claim code bound to `businessCardId` + the channel target. */
  async verifyClaimCode(input: {
    businessCardId: string;
    channel: 'sms' | 'email';
    target: string;
    code: string;
  }): Promise<void> {
    const key = claimKey(input.businessCardId, input.channel, input.target);
    const record = await this.readKey(key);
    if (!record) {
      throw new BadRequestException('کد منقضی شده است؛ دوباره درخواست کنید');
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await this.clearKey(key);
      throw new BadRequestException('تعداد تلاش‌ها بیش از حد مجاز است');
    }
    if (record.hash !== this.hash(input.code.trim())) {
      await this.writeKey(key, {
        hash: record.hash,
        attempts: record.attempts + 1,
      });
      throw new BadRequestException('کد وارد‌شده صحیح نیست');
    }
    await this.clearKey(key);
  }
}
