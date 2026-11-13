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
   * The API key is sent in the `password` parameter, exactly as the panel
   * instructs ("برای استفاده از APIKey مقدار آن را به‌جای رمز عبور در پارامتر
   * Password بفرستید").
   */
  private static restCredentials(): {
    username: string;
    apiKey: string;
  } | null {
    const username = process.env.MELIPAYAMAK_USERNAME?.trim();
    const apiKey = process.env.MELIPAYAMAK_API_KEY?.trim();
    return username && apiKey ? { username, apiKey } : null;
  }

  /** Sender line used for OTP; falls back to the simple-send line. */
  private static otpFrom(): string {
    return (
      process.env.MELIPAYAMAK_OTP_FROM?.trim() ||
      process.env.MELIPAYAMAK_SMS_FROM?.trim() ||
      ''
    );
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
    const path = process.env.MELIPAYAMAK_OTP_PATH?.trim();
    const credentials = SmsService.restCredentials();
    const from = SmsService.otpFrom();
    if (credentials && from) {
      const code = randomInt(100_000, 1_000_000).toString();
      const result = await this.postRest('SendOtp', {
        ...credentials,
        to: phone,
        from,
        code,
      });
      if (!result.ok) {
        throw new ServiceUnavailableException(
          result.status || 'ارسال پیامک ناموفق بود',
        );
      }
      return code;
    }

    if (!path) {
      this.logger.warn(
        `SMS is not configured — OTP for ${SmsService.maskPhone(phone)} was not sent (dev bypass).`,
      );
      return null;
    }

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
    return Boolean(
      (process.env.MELIPAYAMAK_SMS_PATH?.trim() &&
        process.env.MELIPAYAMAK_SMS_FROM?.trim()) ||
        (SmsService.restCredentials() &&
          process.env.MELIPAYAMAK_SMS_FROM?.trim()),
    );
  }

  /**
   * Sends a plain-text SMS (no generated code) through Melipayamak's simple
   * send endpoint or, when only REST credentials are configured, through
   * `rest.payamak-panel.com/api/SendSMS/SendSMS`. Used by the resource monitor
   * for admin alerts.
   *
   * The path (which embeds the token) lives in `MELIPAYAMAK_SMS_PATH`, e.g.
   * `/api/send/simple/<token>`, and the sender line must be provided in
   * `MELIPAYAMAK_SMS_FROM` — Melipayamak's simple-send contract requires both
   * `from` and `to` in the JSON body (see `console.melipayamak.com/send/simple`).
   * Never throws: monitoring must not crash when SMS is unavailable; the
   * caller just gets `false`.
   */
  async sendText(phone: string, text: string): Promise<boolean> {
    const path = process.env.MELIPAYAMAK_SMS_PATH?.trim();
    const from = process.env.MELIPAYAMAK_SMS_FROM?.trim();
    const credentials = SmsService.restCredentials();
    if (credentials && from) {
      const result = await this.postRest('SendSMS', {
        ...credentials,
        to: phone,
        from,
        text,
        isFlash: 'false',
      });
      if (result.ok) {
        this.logger.log(`Alert SMS sent to ${SmsService.maskPhone(phone)}`);
      }
      return result.ok;
    }

    if (!path || !from) {
      this.logger.warn(
        `SMS is not configured (need MELIPAYAMAK_SMS_PATH + MELIPAYAMAK_SMS_FROM or MELIPAYAMAK_USERNAME + MELIPAYAMAK_API_KEY + MELIPAYAMAK_SMS_FROM) — SMS to ${SmsService.maskPhone(phone)} was not sent.`,
      );
      return false;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`https://console.melipayamak.com${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: phone, text }),
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
  ): Promise<{ ok: boolean; status?: string }> {
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
        `Melipayamak ${method} failed (RetStatus ${payload?.RetStatus ?? 'unknown'}): ${status}`,
      );
      return { ok: false, status };
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
}
