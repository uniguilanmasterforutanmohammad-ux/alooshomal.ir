import { createHash } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import { RedisService } from '../redis/redis.service';
import { SmsService } from './sms.service';

/**
 * Issues and verifies the one-time codes used by the phone sign-in flow.
 *
 * Storage is deliberately light: codes live in Redis (with an in-memory
 * fallback when Redis is off) for a few minutes and are never persisted in
 * Postgres. Only a hash of the code is stored, keyed by the phone number.
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
export type OtpPurpose = 'login' | 'phone-change' | 'email-change';

const keyPrefix = (purpose: OtpPurpose) => `otp:${purpose}:phone:`;

interface OtpRecord {
  hash: string;
  attempts: number;
}

export interface IssuedOtp {
  /** Present only in dev (no real SMS) so the UI can show the code. */
  devCode?: string;
  /** Seconds the client should wait before allowing a resend. */
  resendAfter: number;
  /** True when the code was actually sent by SMS. */
  sent: boolean;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  /** Fallback store used when Redis is unavailable. */
  private readonly memory = new Map<
    string,
    { record: OtpRecord; expiresAt: number }
  >();

  /**
   * True only outside production. The dev bypass (fixed code, no SMS) is
   * allowed exclusively here, so a production deploy can never leak `123456`.
   */
  private readonly isDev = process.env.NODE_ENV !== 'production';

  constructor(
    private readonly redis: RedisService,
    private readonly sms: SmsService,
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

  private async read(purpose: OtpPurpose, phone: string): Promise<OtpRecord | null> {
    const key = keyPrefix(purpose) + phone;
    const raw = await this.redis.get(key);
    if (raw) {
      try {
        return JSON.parse(raw) as OtpRecord;
      } catch {
        return null;
      }
    }
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return entry.record;
  }

  private async write(
    purpose: OtpPurpose,
    phone: string,
    record: OtpRecord,
  ): Promise<void> {
    const key = keyPrefix(purpose) + phone;
    const serialized = JSON.stringify(record);
    await this.redis.set(key, serialized, OTP_TTL_SECONDS);
    // Mirror to memory too: it is the only store when Redis is off, and a
    // harmless duplicate when Redis is on (kept in sync below on delete).
    this.memory.set(key, {
      record,
      expiresAt: Date.now() + OTP_TTL_SECONDS * 1000,
    });
  }

  private async clear(purpose: OtpPurpose, phone: string): Promise<void> {
    const key = keyPrefix(purpose) + phone;
    await this.redis.del(key);
    this.memory.delete(key);
  }

  /** True when a code was issued within the resend cooldown window. */
  private async recentlyIssued(purpose: OtpPurpose, phone: string): Promise<boolean> {
    const key = `${keyPrefix(purpose)}${phone}:issued`;
    const marker = await this.redis.get(key);
    if (marker) return true;
    const entry = this.memory.get(key);
    return Boolean(entry && entry.expiresAt > Date.now());
  }

  private async markIssued(purpose: OtpPurpose, phone: string): Promise<void> {
    const key = `${keyPrefix(purpose)}${phone}:issued`;
    await this.redis.set(key, '1', OTP_RESEND_COOLDOWN_SECONDS);
    this.memory.set(key, {
      record: { hash: '1', attempts: 0 },
      expiresAt: Date.now() + OTP_RESEND_COOLDOWN_SECONDS * 1000,
    });
  }

  /**
   * Sends (or, in dev, mints) a fresh code for `phone` and stores its hash.
   * Returns dev-only metadata so the UI can help the developer.
   */
  async issue(phone: string, purpose: OtpPurpose = 'login'): Promise<IssuedOtp> {
    if (await this.recentlyIssued(purpose, phone)) {
      throw new BadRequestException(
        'کد قبلی هنوز معتبر است؛ لطفاً کمی بعد دوباره تلاش کنید',
      );
    }

    let code: string;
    let sent = false;
    if (this.sms.enabled) {
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
      // Production without a Melipayamak path: refuse instead of handing out
      // the fixed dev code to real users.
      this.logger.error(
        `OTP request for ${phone} rejected: MELIPAYAMAK_OTP_PATH is not set in production`,
      );
      throw new ServiceUnavailableException(
        'ارسال پیامک در حال حاضر در دسترس نیست؛ لطفاً بعداً تلاش کنید',
      );
    }

    await this.write(purpose, phone, { hash: this.hash(code), attempts: 0 });
    await this.markIssued(purpose, phone);

    return {
      resendAfter: OTP_RESEND_COOLDOWN_SECONDS,
      sent,
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
}
