import { randomInt } from 'node:crypto';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

/**
 * Sends sign-in verification codes through Melipayamak.
 *
 * Two transports are supported and both keep the code local for verification
 * (see `OtpService`):
 *  - the console OTP endpoint (`MELIPAYAMAK_OTP_PATH`), which generates the
 *    code itself and returns it;
 *  - the REST web service (`rest.payamak-panel.com`) with the panel username
 *    and API key (`MELIPAYAMAK_USERNAME` / `MELIPAYAMAK_API_KEY`), where we
 *    generate the code and send it with `SendOtp`. The API key is passed as
 *    the `password` parameter, as Melipayamak's panel instructs.
 *
 * Secrets live in env vars rather than in source. When neither transport is
 * configured (local dev), `sendOtp()` is a no-op and the OTP flow falls back
 * to the dev bypass in `OtpService`, so nothing leaves the machine.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private static readonly REST_BASE_URL =
    'https://rest.payamak-panel.com/api/SendSMS';

  /** Keep phone numbers out of logs: 0912***4567. */
  private static maskPhone(phone: string): string {
    if (phone.length <= 6) return '***';
    return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
  }

  /**
   * Credentials for Melipayamak's REST web service (`rest.payamak-panel.com`).
   * The API key must travel in the `password` parameter, exactly as the panel
   * instructs ("برای استفاده از APIKey مقدار آن را به‌جای رمز عبور در پارامتر
   * Password بفرستید"). Sending it as a separate `apiKey` field is silently
   * ignored by the provider, which then answers `InvalidData` (RetStatus 35)
   * because `password` arrives null.
   */
  private static restCredentials(): {
    username: string;
    password: string;
  } | null {
    const username = process.env.MELIPAYAMAK_USERNAME?.trim();
    const apiKey = process.env.MELIPAYAMAK_API_KEY?.trim();
    return username && apiKey ? { username, password: apiKey } : null;
  }

  /**
   * A Melipayamak sender line is numeric (e.g. `500010605021` or `1000...`).
   * Copied `.env` files often still contain the `خط-فرستنده` placeholder, and
   * sending that to the provider makes it answer `InvalidData`. Treat any
   * non-numeric value as unset so the next candidate is used instead.
   */
  private static isSenderLine(value: string | undefined): boolean {
    return Boolean(value && /^\+?\d{4,15}$/.test(value.trim()));
  }

  /** Sender line used for OTP; falls back to the simple-send line. */
  private static otpFrom(): string {
    const candidates = [
      process.env.MELIPAYAMAK_OTP_FROM,
      process.env.MELIPAYAMAK_SMS_FROM,
    ];
    return candidates.find((value) => SmsService.isSenderLine(value))?.trim() ?? '';
  }

  /** Sender line for plain-text SMS; falls back to the OTP line. */
  private static textFrom(): string {
    const candidates = [
      process.env.MELIPAYAMAK_SMS_FROM,
      process.env.MELIPAYAMAK_OTP_FROM,
    ];
    return candidates.find((value) => SmsService.isSenderLine(value))?.trim() ?? '';
  }

  /**
   * Melipayamak refuses texts that contain a link (RetStatus 14 — «متن پیامک
   * حاوی لینک است»). SMS copy is written without URLs, and this filter is a
   * safety net for any caller that slips one in: `http(s)://…`, `www.…` and
   * bare domains such as `alooshomal.ir/jga4rm8j?section=…` are removed.
   */
  private static stripLinks(text: string): string {
    return text
      .replace(/\bhttps?:\/\/\S+/giu, '')
      .replace(/\bwww\.\S+/giu, '')
      .replace(
        /\b(?:[\p{L}\p{N}-]+\.)+(?:ir|com|net|org|io|dev|app|me|co|info|site|online|xyz|shop|store|blog|news|tech|ai)(?:\/\S*)?\b/giu,
        '',
      )
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Console endpoints are configured as a path (`/api/send/otp/<token>`), but
   * a full URL (or a URL pasted after the path) is a common mistake. Keep only
   * the last `/api/send/...` segment so both forms work.
   */
  private static consolePath(raw: string | undefined): string {
    const value = raw?.trim();
    if (!value) return '';
    const marker = value.lastIndexOf('/api/send/');
    return marker >= 0 ? value.slice(marker) : value;
  }

  /** True when OTP delivery is configured (token path or API key). */
  get enabled(): boolean {
    return Boolean(
      process.env.MELIPAYAMAK_OTP_PATH?.trim() ||
        (SmsService.restCredentials() && SmsService.otpFrom()),
    );
  }

  /**
   * Sends a fresh OTP for `phone` and returns the code so the caller can store
   * it for later verification.
   *
   * Two delivery modes are supported:
   *  1. `MELIPAYAMAK_USERNAME` + `MELIPAYAMAK_API_KEY` (+ sender line) — the
   *     REST web service. Here we generate the code ourselves and send it with
   *     `SendOtp`; the API key travels in the `password` field.
   *  2. `MELIPAYAMAK_OTP_PATH` — Melipayamak's console endpoint, which
   *     generates the code itself and returns it.
   *
   * A fully configured API-key mode wins over the token path, so rotating to
   * the new API does not require deleting the old path first.
   *
   * Returns `null` when SMS is not configured (dev) — caller uses the bypass.
   */
  async sendOtp(phone: string): Promise<string | null> {
    const path = SmsService.consolePath(process.env.MELIPAYAMAK_OTP_PATH);
    const credentials = SmsService.restCredentials();
    const from = SmsService.otpFrom();

    if (credentials && from) {
      const code = randomInt(100_000, 1_000_000).toString();
      const otpResult = await this.postRest('SendOtp', {
        ...credentials,
        to: phone,
        from,
        code,
      });
      if (otpResult.ok) return code;

      // Some Melipayamak lines reject `SendOtp` (the provider answers
      // `InvalidData`) but still accept the same code as a normal text
      // message. Try that before giving up on the REST transport.
      this.logger.warn(
        `Melipayamak SendOtp failed (${otpResult.status}); retrying as plain SMS`,
      );
      const textResult = await this.postRest('SendSMS', {
        ...credentials,
        to: phone,
        from,
        text: `کد ورود شما به الوشمال: ${code}`,
        isflash: 'false',
      });
      if (textResult.ok) return code;

      if (!path) {
        throw new ServiceUnavailableException(
          SmsService.restErrorMessage(textResult),
        );
      }

      this.logger.warn(
        `Melipayamak REST transport failed (${textResult.status}); falling back to the console OTP path`,
      );
    }

    if (!path) {
      this.logger.warn(
        `SMS is not configured — OTP for ${SmsService.maskPhone(phone)} was not sent (dev bypass).`,
      );
      return null;
    }

    return this.sendConsoleOtp(path, phone);
  }

  /**
   * Calls Melipayamak's console OTP endpoint, which generates the code itself
   * and returns it. Used as the primary transport when no REST credentials are
   * configured and as a fallback when they are rejected.
   */
  private async sendConsoleOtp(path: string, phone: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`https://console.melipayamak.com${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone }),
        signal: controller.signal,
      });

      const payload = (await response.json().catch(() => null)) as
        | { code?: string; status?: string }
        | null;

      if (!response.ok) {
        this.logger.error(
          `Melipayamak returned ${response.status} for ${SmsService.maskPhone(phone)}`,
        );
        throw new ServiceUnavailableException('ارسال پیامک ناموفق بود');
      }

      // Success shape: { "code": "3741437414", "status": "عملیات موفق" }.
      // Error shape:  { "status": "شماره گیرنده نامعتبر است" } (no `code`).
      const code = typeof payload?.code === 'string' ? payload.code.trim() : '';
      if (!code) {
        this.logger.error(
          `Melipayamak did not return a code for ${SmsService.maskPhone(phone)}`,
        );
        throw new ServiceUnavailableException(
          payload?.status?.trim() || 'ارسال پیامک ناموفق بود',
        );
      }
      return code;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.error(
        `Melipayamak request failed for ${SmsService.maskPhone(phone)}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      throw new ServiceUnavailableException('ارسال پیامک ناموفق بود');
    } finally {
      clearTimeout(timeout);
    }
  }

  /** True when a Melipayamak *simple send* path is configured. */
  get textEnabled(): boolean {
    const from = SmsService.textFrom();
    return Boolean(
      (SmsService.consolePath(process.env.MELIPAYAMAK_SMS_PATH) &&
        from) ||
        (SmsService.restCredentials() && from),
    );
  }

  /**
   * Sends a plain-text SMS (no generated code) through Melipayamak's simple
   * send endpoint or, when only REST credentials are configured, through
   * `rest.payamak-panel.com/api/SendSMS/SendSMS`. Used by the resource monitor
   * for admin alerts.
   *
   * The path (which embeds the token) lives in `MELIPAYAMAK_SMS_PATH`, e.g.
   * `/api/send/simple/<token>`, and the sender line comes from
   * `MELIPAYAMAK_SMS_FROM` (falling back to `MELIPAYAMAK_OTP_FROM`) —
   * Melipayamak's simple-send contract requires both `from` and `to` in the
   * JSON body (see `console.melipayamak.com/send/simple`). Never throws:
   * monitoring must not crash when SMS is unavailable; the caller just gets
   * `false`.
   */
  async sendText(phone: string, text: string): Promise<boolean> {
    const safeText = SmsService.stripLinks(text);
    const path = SmsService.consolePath(process.env.MELIPAYAMAK_SMS_PATH);
    const from = SmsService.textFrom();
    const credentials = SmsService.restCredentials();
    if (credentials && from) {
      const result = await this.postRest('SendSMS', {
        ...credentials,
        to: phone,
        from,
        text: safeText,
        isflash: 'false',
      });
      if (result.ok) {
        this.logger.log(`Alert SMS sent to ${SmsService.maskPhone(phone)}`);
        return true;
      }

      if (!path) {
        this.logger.error(
          `Melipayamak SendSMS failed (${result.status}); no console path configured`,
        );
        return false;
      }
      this.logger.warn(
        `Melipayamak SendSMS failed (${result.status}); falling back to the console simple-send path`,
      );
    }

    if (!path || !from) {
      this.logger.warn(
        `SMS is not configured (need a numeric MELIPAYAMAK_SMS_FROM or MELIPAYAMAK_OTP_FROM, plus MELIPAYAMAK_SMS_PATH or MELIPAYAMAK_USERNAME + MELIPAYAMAK_API_KEY) — SMS to ${SmsService.maskPhone(phone)} was not sent.`,
      );
      return false;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`https://console.melipayamak.com${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: phone, text: safeText }),
        signal: controller.signal,
      });

      const payload = (await response.json().catch(() => null)) as
        | { recId?: number | string; status?: string }
        | null;

      if (!response.ok || payload?.recId === undefined) {
        this.logger.error(
          `Melipayamak simple-send failed for ${SmsService.maskPhone(phone)}: ${
            payload?.status ?? `HTTP ${response.status}`
          }`,
        );
        return false;
      }
      this.logger.log(`Alert SMS sent to ${SmsService.maskPhone(phone)}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Melipayamak simple-send failed for ${SmsService.maskPhone(phone)}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Calls one of Melipayamak's REST methods with form-urlencoded parameters.
   * Success is `RetStatus === 1`; any other value is a provider error code
   * (`0` = wrong username/API key, `2` = no credit, `5` = invalid sender, …).
   */
  private async postRest(
    method: 'SendOtp' | 'SendSMS',
    params: Record<string, string>,
  ): Promise<{ ok: boolean; status?: string; retStatus?: number }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(
        `${SmsService.REST_BASE_URL}/${method}`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/x-www-form-urlencoded; charset=UTF-8',
          },
          body: new URLSearchParams(params).toString(),
          signal: controller.signal,
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { Value?: string | number; RetStatus?: number; StrRetStatus?: string }
        | null;

      if (response.ok && payload?.RetStatus === 1) {
        return { ok: true };
      }

      const status =
        payload?.StrRetStatus?.trim() || `HTTP ${response.status}`;
      this.logger.error(
        `Melipayamak ${method} failed (RetStatus ${payload?.RetStatus ?? 'unknown'}, Value ${payload?.Value ?? 'unknown'}): ${status}`,
      );
      return { ok: false, status, retStatus: payload?.RetStatus };
    } catch (error) {
      this.logger.error(
        `Melipayamak ${method} request failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return { ok: false };
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Turns Melipayamak's error codes into a message the admin can act on. */
  private static restErrorMessage(result: {
    status?: string;
    retStatus?: number;
  }): string {
    switch (result.retStatus) {
      case 0:
        return 'نام کاربری یا API Key ملی‌پیامک نادرست است';
      case 2:
        return 'اعتبار حساب ملی‌پیامک کافی نیست';
      case 5:
        return 'خط فرستنده‌ی ملی‌پیامک معتبر نیست';
      case 14:
        return 'متن پیامک حاوی لینک است؛ لینک‌ها باید از متن حذف شوند';
      case 35:
        return 'تنظیمات ملی‌پیامک نامعتبر است (خط فرستنده و API Key را بررسی کنید)';
      case 108:
      case 109:
        return 'IP سرور در فهرست IPهای مجاز ملی‌پیامک نیست';
      case 110:
        return 'برای ملی‌پیامک باید API Key را به‌جای رمز عبور بفرستید';
      default:
        return result.status
          ? `ارسال پیامک ناموفق بود (${result.status})`
          : 'ارسال پیامک ناموفق بود';
    }
  }
}
