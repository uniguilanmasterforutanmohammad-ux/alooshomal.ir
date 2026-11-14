import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

/**
 * Sends SMS through Melipayamak's console endpoints only.
 *
 * The project uses two token-based console APIs:
 *  - `/api/send/otp/<token>` — generates a one-time code itself and returns it
 *    so `OtpService` can store it for verification;
 *  - `/api/send/shared/<token>` — sends the fixed admin-notification template
 *    by `bodyId`.
 *
 * The panel username / API key REST transport was removed: it silently failed
 * once an API key was configured and blocked the working console path. There is
 * no API-key code path anymore; the console token is the single source.
 *
 * Secrets live in env vars rather than in source. In production the project
 * tokens are the default, so no extra server config is needed. In local
 * development SMS stays simulated unless `MELIPAYAMAK_OTP_PATH` /
 * `MELIPAYAMAK_SHARED_PATH` are set explicitly (the dev test button forces the
 * real OTP endpoint for a one-off check).
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  /**
   * Project-specific Melipayamak console endpoints. They are used as defaults
   * in production so the service works without extra server configuration;
   * `MELIPAYAMAK_OTP_PATH` / `MELIPAYAMAK_SHARED_PATH` can override them.
   */
  private static readonly DEFAULT_OTP_PATH =
    '/api/send/otp/18ab83118e8740d3b2ee9aa59bf1a6e2';
  private static readonly DEFAULT_SHARED_PATH =
    '/api/send/shared/18ab83118e8740d3b2ee9aa59bf1a6e2';
  /** Fixed template id for admin notifications; never change it. */
  private static readonly ADMIN_NOTIFY_BODY_ID = 586239;

  /** Keep phone numbers out of logs: 0912***4567. */
  private static maskPhone(phone: string): string {
    if (phone.length <= 6) return '***';
    return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
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

  /**
   * OTP endpoint. The configured path wins; in production the project token is
   * the fallback, while local development keeps the no-SMS bypass unless the
   * env var is set explicitly. `force` ignores the dev bypass so the local test
   * button can send a real code.
   */
  private static otpPath(force = false): string {
    const configured = SmsService.consolePath(
      process.env.MELIPAYAMAK_OTP_PATH,
    );
    if (configured) return configured;
    if (force || process.env.NODE_ENV === 'production') {
      return SmsService.DEFAULT_OTP_PATH;
    }
    return '';
  }

  /**
   * Shared-template endpoint used for every admin notification SMS. `force`
   * ignores the dev bypass so the admin panel's test button can send a real
   * message locally.
   */
  private static sharedPath(force = false): string {
    const configured = SmsService.consolePath(
      process.env.MELIPAYAMAK_SHARED_PATH,
    );
    if (configured) return configured;
    if (force || process.env.NODE_ENV === 'production') {
      return SmsService.DEFAULT_SHARED_PATH;
    }
    return '';
  }

  /** True when OTP delivery is configured (console token path). */
  get enabled(): boolean {
    return Boolean(SmsService.otpPath());
  }

  /**
   * Sends a fresh OTP for `phone` and returns the code so the caller can store
   * it for later verification.
   *
   * Melipayamak's console OTP endpoint generates the code itself and returns it
   * in `code`. `force` bypasses the local-dev no-SMS rule; it is used only by
   * the development test button.
   *
   * Returns `null` when SMS is not configured (dev) — caller uses the bypass.
   */
  async sendOtp(phone: string, options: { force?: boolean } = {}): Promise<string | null> {
    const path = SmsService.otpPath(options.force === true);
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
   * and returns it:
   *   { "code": "3741437414", "status": "عملیات موفق" }
   * An error response has no `code` and carries the reason in `status`.
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
        | { code?: string | number; status?: string }
        | null;

      const code =
        payload?.code === undefined || payload?.code === null
          ? ''
          : String(payload.code).trim();

      if (!response.ok || !code) {
        const reason = payload?.status?.trim() || `HTTP ${response.status}`;
        this.logger.error(
          `Melipayamak OTP failed for ${SmsService.maskPhone(phone)}: ${reason}`,
        );
        throw new ServiceUnavailableException(
          response.ok ? reason : 'ارسال پیامک ناموفق بود',
        );
      }
      this.logger.log(`OTP SMS sent to ${SmsService.maskPhone(phone)}`);
      return code;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.error(
        `Melipayamak OTP request failed for ${SmsService.maskPhone(phone)}: ${
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
      SmsService.consolePath(process.env.MELIPAYAMAK_SMS_PATH) && from,
    );
  }

  /**
   * Sends a plain-text SMS (no generated code) through Melipayamak's simple
   * send endpoint. Used by the resource monitor for admin alerts.
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
    if (!path || !from) {
      this.logger.warn(
        `SMS is not configured (need a numeric MELIPAYAMAK_SMS_FROM or MELIPAYAMAK_OTP_FROM, plus MELIPAYAMAK_SMS_PATH) — SMS to ${SmsService.maskPhone(phone)} was not sent.`,
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

  /** True when the shared admin-notification template is available. */
  get adminNotificationsEnabled(): boolean {
    return Boolean(SmsService.sharedPath());
  }

  /**
   * Sends one admin notification through Melipayamak's shared-template
   * endpoint. The provider owns the text:
   *
   *   کاربر مدیریت بخش {0} شما یک درخواست با موضوع {1} دارید. shomalicard
   *
   * `bodyId` is fixed by the project (586239) and must not be changed.
   * Never throws: notifications are best-effort and must not break the action
   * that triggered them.
   */
  async sendAdminNotification(
    phone: string,
    section: string,
    subject: string,
    options: { force?: boolean } = {},
  ): Promise<boolean> {
    const path = SmsService.sharedPath(options.force === true);
    if (!path) {
      this.logger.warn(
        `Admin SMS is not configured — notification for ${SmsService.maskPhone(phone)} was not sent.`,
      );
      return false;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`https://console.melipayamak.com${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bodyId: SmsService.ADMIN_NOTIFY_BODY_ID,
          to: phone,
          args: [section, subject],
        }),
        signal: controller.signal,
      });

      const payload = (await response.json().catch(() => null)) as
        | { recId?: number | string; status?: string }
        | null;

      const status = payload?.status?.trim();
      const ok =
        response.ok &&
        (payload?.recId !== undefined || status === 'عملیات موفق');
      if (!ok) {
        this.logger.error(
          `Melipayamak shared-send failed for ${SmsService.maskPhone(phone)}: ${
            status || `HTTP ${response.status}`
          }`,
        );
        return false;
      }
      this.logger.log(
        `Admin notification SMS sent to ${SmsService.maskPhone(phone)} (${section} / ${subject})`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Melipayamak shared-send failed for ${SmsService.maskPhone(phone)}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
}
