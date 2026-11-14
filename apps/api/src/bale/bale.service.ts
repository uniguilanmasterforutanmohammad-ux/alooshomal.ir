import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

/**
 * Bale «Safir» message service (https://docs.bale.ai/safir).
 *
 * Safir sends a message to a phone number through a Bale bot. For OTPs we use
 * its dedicated `otp_message` payload, which renders the code with a copy
 * button and the bot identity. Credentials live in env:
 *
 *   BALE_API_SHOMALICARDBOT — `api-access-key` header
 *   BOT_ID                  — numeric bot id
 *   BALE_OTP_ENABLED        — optional override (default: production only)
 *
 * Delivery is best-effort: callers fall back to SMS when Bale is not enabled
 * or the recipient does not have a Bale account (Safir error 17).
 */
@Injectable()
export class BaleService {
  private readonly logger = new Logger(BaleService.name);
  private readonly apiKey: string;
  private readonly botId: number | null;
  private readonly baseUrl: string;
  private readonly enabled: boolean;

  constructor(config: ConfigService) {
    this.apiKey = (
      config.get<string>('BALE_API_SHOMALICARDBOT') ??
      config.get<string>('BALE_API_ACCESS_KEY') ??
      ''
    ).trim();
    const rawBotId = (
      config.get<string>('BOT_ID') ??
      config.get<string>('BALE_BOT_ID') ??
      ''
    ).trim();
    const botId = Number.parseInt(rawBotId, 10);
    this.botId = Number.isFinite(botId) && botId > 0 ? botId : null;
    this.baseUrl = (
      config.get<string>('BALE_SAFIR_BASE_URL') ?? 'https://safir.bale.ai'
    ).replace(/\/+$/, '');

    const nodeEnv = (
      config.get<string>('NODE_ENV') ?? 'development'
    ).toLowerCase();
    const flag = (config.get<string>('BALE_OTP_ENABLED') ?? '')
      .trim()
      .toLowerCase();
    const credentialsReady = Boolean(this.apiKey && this.botId);
    this.enabled =
      credentialsReady &&
      (flag === 'true' ||
        flag === '1' ||
        (flag !== 'false' && flag !== '0' && nodeEnv === 'production'));

    if (this.enabled) {
      this.logger.log('Bale OTP delivery is enabled.');
    }
  }

  /** True when credentials exist and this environment may send via Bale. */
  get isEnabled(): boolean {
    return this.enabled;
  }

  /** `0912…` / `+98912…` / `98912…` → `98912…` (Safir's required shape). */
  static normalizePhone(input: string): string {
    const digits = input
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/\D/g, '');
    if (digits.startsWith('0098')) return `98${digits.slice(4)}`;
    if (digits.startsWith('98')) return digits;
    if (digits.startsWith('0')) return `98${digits.slice(1)}`;
    if (digits.startsWith('9') && digits.length === 10) return `98${digits}`;
    return digits;
  }

  private static maskPhone(phone: string): string {
    if (phone.length <= 6) return '***';
    return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
  }

  /**
   * Sends one OTP through Safir. Returns `false` (never throws) so the caller
   * can fall back to SMS; the failure reason is logged without the code.
   */
  async sendOtp(phone: string, code: string): Promise<boolean> {
    if (!this.enabled || this.botId === null) return false;
    const phoneNumber = BaleService.normalizePhone(phone);
    if (!/^989\d{9}$/.test(phoneNumber)) {
      this.logger.error(
        `Bale OTP skipped: invalid destination ${BaleService.maskPhone(phone)}`,
      );
      return false;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${this.baseUrl}/api/v3/send_message`, {
        method: 'POST',
        headers: {
          'api-access-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_id: randomUUID(),
          bot_id: this.botId,
          phone_number: phoneNumber,
          message_data: { otp_message: { otp: code } },
        }),
        signal: controller.signal,
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            message_id?: string;
            error_data?: Array<{
              phone_number?: string;
              code?: number;
              description?: string;
            }>;
          }
        | null;

      const errors = Array.isArray(payload?.error_data)
        ? payload.error_data
        : [];
      if (!response.ok || errors.length > 0 || !payload?.message_id) {
        const reason =
          errors
            .map((item) =>
              [item.code, item.description].filter(Boolean).join(':'),
            )
            .filter(Boolean)
            .join('; ') || `HTTP ${response.status}`;
        this.logger.error(
          `Bale OTP to ${BaleService.maskPhone(phone)} failed: ${reason}`,
        );
        return false;
      }

      this.logger.log(`Bale OTP sent to ${BaleService.maskPhone(phone)}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Bale OTP to ${BaleService.maskPhone(phone)} failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
}
