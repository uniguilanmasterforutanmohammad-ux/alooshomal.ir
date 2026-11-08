import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

/**
 * Sends sign-in verification codes through Melipayamak's OTP endpoint.
 *
 * Melipayamak's `/api/send/otp/<token>` generates the code itself and returns
 * it in the response body — it does *not* offer a verify endpoint — so we
 * store the returned code and compare it ourselves (see `OtpService`).
 *
 * The token embeds the sender line and is a secret, so it lives in the
 * `MELIPAYAMAK_OTP_PATH` env var rather than in source. When it is missing
 * (local dev), `send()` is a no-op and the OTP flow falls back to the dev
 * bypass in `OtpService`, so nothing leaves the machine.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  /** Keep phone numbers out of logs: 0912***4567. */
  private static maskPhone(phone: string): string {
    if (phone.length <= 6) return '***';
    return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
  }

  /** True when a Melipayamak OTP path is configured. */
  get enabled(): boolean {
    return Boolean(process.env.MELIPAYAMAK_OTP_PATH?.trim());
  }

  /**
   * Requests a fresh OTP for `phone` and returns the code Melipayamak
   * generated, so the caller can store it for later verification.
   * Returns `null` when SMS is not configured (dev) — caller uses the bypass.
   */
  async sendOtp(phone: string): Promise<string | null> {
    const path = process.env.MELIPAYAMAK_OTP_PATH?.trim();
    if (!path) {
      this.logger.warn(
        `MELIPAYAMAK_OTP_PATH is not set — OTP for ${SmsService.maskPhone(phone)} was not sent (dev bypass).`,
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
    return Boolean(process.env.MELIPAYAMAK_SMS_PATH?.trim());
  }

  /**
   * Sends a plain-text SMS (no generated code) through Melipayamak's simple
   * send endpoint. Used by the resource monitor for admin alerts.
   *
   * The path (which embeds the token) lives in `MELIPAYAMAK_SMS_PATH`, e.g.
   * `/api/send/simple/<token>`. Never throws: monitoring must not crash when
   * SMS is unavailable; the caller just gets `false`.
   */
  async sendText(phone: string, text: string): Promise<boolean> {
    const path = process.env.MELIPAYAMAK_SMS_PATH?.trim();
    if (!path) {
      this.logger.warn(
        `MELIPAYAMAK_SMS_PATH is not set — SMS to ${SmsService.maskPhone(phone)} was not sent.`,
      );
      return false;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`https://console.melipayamak.com${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, text }),
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
}
