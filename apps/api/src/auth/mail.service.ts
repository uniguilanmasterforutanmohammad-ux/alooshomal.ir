import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Sends transactional email — currently the sign-in one-time code — through
 * the SMTP account configured in the environment.
 *
 * Configuration (all optional; when host/user/password are missing the service
 * is disabled and the OTP flow stays SMS-only):
 *   MAIL_HOST, MAIL_PORT (default 587), MAIL_SECURE (default false),
 *   MAIL_USER, MAIL_PASSWORD, MAIL_FROM (defaults to MAIL_USER),
 *   MAIL_FROM_NAME (defaults to «شمالی کارت»).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  /** True when SMTP credentials are present. */
  get enabled(): boolean {
    return Boolean(
      process.env.MAIL_HOST?.trim() &&
        process.env.MAIL_USER?.trim() &&
        process.env.MAIL_PASSWORD?.trim(),
    );
  }

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;
    const port = Number(process.env.MAIL_PORT ?? 587);
    const secure = (process.env.MAIL_SECURE ?? 'false').toLowerCase() === 'true';
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST!.trim(),
      port: Number.isFinite(port) ? port : 587,
      secure,
      // Port 587 expects STARTTLS; require it so credentials never travel in
      // clear text even if the server forgets to advertise the extension.
      requireTLS: !secure,
      auth: {
        user: process.env.MAIL_USER!.trim(),
        pass: process.env.MAIL_PASSWORD!,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    return this.transporter;
  }

  /** Keeps addresses out of logs: a***@example.com. */
  private static maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    return `${local.slice(0, 1)}***@${domain}`;
  }

  private static purposeLabel(purpose: string): string {
    if (purpose === 'phone-change') return 'تغییر شماره موبایل';
    if (purpose === 'email-change') return 'تغییر ایمیل';
    return 'ورود به سایت';
  }

  /**
   * Sends the one-time code. Returns `false` when SMTP is not configured and
   * throws on a transport error, so the caller can decide how to react.
   */
  async sendOtp(
    to: string,
    code: string,
    purpose: 'login' | 'phone-change' | 'email-change' = 'login',
  ): Promise<boolean> {
    if (!this.enabled) {
      this.logger.warn(
        `MAIL_* is not configured — OTP email to ${MailService.maskEmail(to)} was not sent.`,
      );
      return false;
    }

    const fromAddress = (process.env.MAIL_FROM ?? process.env.MAIL_USER!).trim();
    const fromName = (process.env.MAIL_FROM_NAME ?? 'شمالی کارت').trim();
    const label = MailService.purposeLabel(purpose);
    const text = `کد ${label}: ${code}\nاین کد تا ۵ دقیقه معتبر است و نباید در اختیار کسی قرار گیرد.`;
    const html = `
      <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;background:#f6f3ec;padding:24px">
        <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:24px;border:1px solid #e8e1d4">
          <h2 style="margin:0 0 8px;color:#1f4d3a;font-size:18px">شمالی کارت</h2>
          <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.9">
            کد ${label} شما:
          </p>
          <p dir="ltr" style="margin:0 0 16px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:6px;color:#1f4d3a;background:#f3f7f4;border-radius:12px;padding:12px 0">
            ${code}
          </p>
          <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.9">
            این کد تا ۵ دقیقه معتبر است. اگر شما درخواست نداده‌اید، این ایمیل را نادیده بگیرید.
          </p>
        </div>
      </div>`;

    await this.getTransporter().sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject: `کد ${label}: ${code}`,
      text,
      html,
    });
    this.logger.log(`OTP email sent to ${MailService.maskEmail(to)}`);
    return true;
  }
}
