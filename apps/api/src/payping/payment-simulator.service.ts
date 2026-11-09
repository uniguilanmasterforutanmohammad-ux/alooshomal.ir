import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';

/** Checkout returned by the simulator instead of a real PayPing order. */
export interface SimulatedCheckout {
  paymentCode: string;
  url: string;
}

/** Shape compatible with PayPing's `/v3/pay/verify` response. */
export interface SimulatedVerification {
  amount: number;
  clientRefId?: string;
  paymentRefId: number;
  payedDate: string;
  simulated: true;
}

const SIMULATED_PREFIX = 'SIM-';

/**
 * Development/localhost stand-in for the PayPing gateway.
 *
 * When `PAYMENT_SIMULATOR` is unset, the simulator turns itself on for any
 * non-production run whose public site URL is a loopback host, so a developer
 * can finish subscription, boost and ad purchases without a merchant token or
 * real money. Set `PAYMENT_SIMULATOR=false` to force the real gateway, or
 * `PAYMENT_SIMULATOR=true` to simulate on a staging server. It is never
 * enabled in production unless explicitly requested.
 */
@Injectable()
export class PaymentSimulatorService {
  private readonly logger = new Logger(PaymentSimulatorService.name);
  private readonly enabled: boolean;
  private readonly appUrl: string;
  private readonly apiUrl: string;

  constructor(private readonly config: ConfigService) {
    const nodeEnv = (
      config.get<string>('NODE_ENV') ?? 'development'
    ).toLowerCase();
    this.appUrl = (
      config.get<string>('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000'
    ).replace(/\/+$/, '');
    this.apiUrl = (config.get<string>('NEXT_PUBLIC_API_URL') ?? '').replace(
      /\/+$/,
      '',
    );

    const flag = (config.get<string>('PAYMENT_SIMULATOR') ?? '')
      .trim()
      .toLowerCase();
    this.enabled =
      flag === 'true' ||
      (flag !== 'false' && nodeEnv !== 'production' && isLoopback(this.appUrl));

    if (this.enabled) {
      this.logger.warn(
        'Payment simulator is ENABLED — checkouts will not charge real money.',
      );
    }
  }

  /** Whether new checkouts should be simulated. */
  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Whether a stored payment code was produced by this simulator. */
  handles(paymentCode?: string | null): boolean {
    return this.enabled && !!paymentCode?.startsWith(SIMULATED_PREFIX);
  }

  /** Build a fake gateway order pointing at the simulated checkout page. */
  createPayment(params: {
    amount: number;
    returnUrl: string;
    clientRefId?: string;
    description?: string;
  }): SimulatedCheckout {
    const paymentCode = `${SIMULATED_PREFIX}${randomBytes(8).toString('hex')}`;
    const url = new URL(`${this.appUrl}/payments/simulate`);
    url.searchParams.set('paymentCode', paymentCode);
    url.searchParams.set('amount', String(params.amount));
    url.searchParams.set('returnUrl', this.localReturnUrl(params.returnUrl));
    if (params.clientRefId) {
      url.searchParams.set('clientRefId', params.clientRefId);
    }
    if (params.description) {
      url.searchParams.set('description', params.description.slice(0, 120));
    }
    return { paymentCode, url: url.toString() };
  }

  /**
   * Confirm a simulated payment. The callback already loaded the payment row,
   * so echoing its amount/clientRefId back keeps the same consistency checks
   * the real gateway performs.
   */
  verifyPayment(params: {
    paymentCode: string;
    amount: number;
    clientRefId?: string | null;
  }): SimulatedVerification {
    if (!this.handles(params.paymentCode)) {
      throw new BadRequestException('این پرداخت شبیه‌سازی‌شده نیست.');
    }
    return {
      amount: params.amount,
      clientRefId: params.clientRefId ?? undefined,
      paymentRefId: Number(String(Date.now()).slice(-9)),
      payedDate: new Date().toISOString(),
      simulated: true,
    };
  }

  /**
   * Locally the web origin serves no `/api` proxy, so a callback URL pointing
   * at it would 404. Point loopback return URLs at the API origin instead.
   */
  private localReturnUrl(returnUrl: string): string {
    if (!this.apiUrl) return returnUrl;
    try {
      const target = new URL(returnUrl);
      if (!isLoopback(target.origin)) return returnUrl;
      const api = new URL(this.apiUrl);
      const prefix = api.pathname.replace(/\/+$/, '');
      // `NEXT_PUBLIC_API_URL` already ends in `/api`, and the callback path
      // starts with `/api` too; collapse the duplicate segment.
      const path = target.pathname.startsWith(`${prefix}/`)
        ? target.pathname.slice(prefix.length)
        : target.pathname;
      return `${api.origin}${prefix}${path}${target.search}`;
    } catch {
      return returnUrl;
    }
  }
}

function isLoopback(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname);
  } catch {
    return false;
  }
}
