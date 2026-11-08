import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

/** Where the OAuth tokens are persisted between restarts. */
const TOKENS_KEY = 'paypingOauthTokens';
/** Where the admin-editable requested scopes live. */
const SCOPES_KEY = 'paypingOauthScopes';
/** Where the PKCE verifier for an in-flight authorization is kept (Redis). */
const STATE_PREFIX = 'payping:oauth:state:';
const STATE_TTL_SECONDS = 600;

/**
 * Scopes this OAuth client is actually allowed to request. Verified against the
 * authorize endpoint: `profile`, `email`, `phone`, `offline_access` and every
 * `inquiry:*` scope are rejected for this client (they return an error page),
 * while the financial scopes below are accepted. Because `offline_access` is not
 * allowed, no refresh token is issued and the admin must re-connect when the
 * access token expires.
 */
const DEFAULT_SCOPES = [
  'openid',
  'pay:read',
  'pay:write',
  'report:read',
  'product:read',
  'product:write',
  'coupon:read',
  'coupon:write',
  'customer:read',
  'customer:write',
  'invoice:read',
  'invoice:write',
  'upload:write',
  'bnpl:merchantread',
  'bnpl:merchantwrite',
].join(' ');

const REQUEST_TIMEOUT_MS = 30_000;

interface StoredTokens {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  scope: string;
  expiresAt: number;
}

export interface OAuthStatus {
  configured: boolean;
  connected: boolean;
  clientId: string | null;
  redirectUri: string;
  authorizeUrl: string;
  tokenUrl: string;
  requestedScopes: string[];
  grantedScopes: string[];
  expiresAt: string | null;
  message: string | null;
}

export interface ProbeResult {
  scope: string;
  method: string;
  path: string;
  ok: boolean;
  status: number;
  message: string;
}

/**
 * OAuth2 (authorization-code + PKCE) client for PayPing.
 *
 * Unlike the merchant access token used by `PaypingService`, this client is a
 * registered OAuth application: it cannot use `client_credentials`, so the
 * admin must authorise it once and the resulting access/refresh tokens are
 * stored server-side. The panel then shows exactly what the granted scopes
 * allow by probing representative endpoints.
 */
@Injectable()
export class PaypingOAuthService {
  private readonly logger = new Logger(PaypingOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly authorizeUrl: string;
  private readonly tokenUrl: string;
  private readonly userinfoUrl: string;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    this.clientId = (config.get<string>('PAYPING_OAUTH_CLIENT_ID') ?? '').trim();
    this.clientSecret = (
      config.get<string>('PAYPING_OAUTH_CLIENT_SECRET') ?? ''
    ).trim();
    this.redirectUri = (
      config.get<string>('PAYPING_OAUTH_REDIRECT_URI') ??
      'https://shomalicard.ir'
    ).trim();
    this.authorizeUrl =
      config.get<string>('PAYPING_OAUTH_AUTHORIZE_URL') ??
      'https://oauth.payping.ir/connect/authorize';
    this.tokenUrl =
      config.get<string>('PAYPING_OAUTH_TOKEN_URL') ??
      'https://oauth.payping.ir/connect/token';
    this.userinfoUrl =
      config.get<string>('PAYPING_OAUTH_USERINFO_URL') ??
      'https://oauth.payping.ir/connect/userinfo';
  }

  get configured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  // -------------------------------------------------------------------------
  //  Settings / token persistence
  // -------------------------------------------------------------------------

  private async readSetting(key: string): Promise<string | null> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return row?.value ?? null;
  }

  private async writeSetting(key: string, value: string): Promise<void> {
    await this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  private async readTokens(): Promise<StoredTokens | null> {
    const raw = await this.readSetting(TOKENS_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredTokens;
    } catch {
      return null;
    }
  }

  private async saveTokens(tokens: StoredTokens): Promise<void> {
    await this.writeSetting(TOKENS_KEY, JSON.stringify(tokens));
  }

  async getRequestedScopes(): Promise<string[]> {
    const raw = await this.readSetting(SCOPES_KEY);
    const value = raw && raw.trim() ? raw : DEFAULT_SCOPES;
    return value.split(/\s+/).filter(Boolean);
  }

  async setRequestedScopes(scopes: string): Promise<string[]> {
    const cleaned = scopes.split(/\s+/).filter(Boolean).join(' ');
    await this.writeSetting(SCOPES_KEY, cleaned || DEFAULT_SCOPES);
    return this.getRequestedScopes();
  }

  // -------------------------------------------------------------------------
  //  Status
  // -------------------------------------------------------------------------

  async status(): Promise<OAuthStatus> {
    const [requestedScopes, tokens] = await Promise.all([
      this.getRequestedScopes(),
      this.readTokens(),
    ]);
    return {
      configured: this.configured,
      connected: Boolean(tokens?.accessToken),
      clientId: this.clientId ? this.mask(this.clientId) : null,
      redirectUri: this.redirectUri,
      authorizeUrl: this.authorizeUrl,
      tokenUrl: this.tokenUrl,
      requestedScopes,
      grantedScopes: tokens?.scope ? tokens.scope.split(/\s+/).filter(Boolean) : [],
      expiresAt: tokens ? new Date(tokens.expiresAt).toISOString() : null,
      message: this.configured
        ? null
        : 'ClientId/ClientSecret پی‌پینگ روی سرور تنظیم نشده است (PAYPING_OAUTH_CLIENT_ID / PAYPING_OAUTH_CLIENT_SECRET).',
    };
  }

  private mask(value: string): string {
    if (value.length <= 8) return `${value.slice(0, 2)}***`;
    return `${value.slice(0, 4)}…${value.slice(-4)}`;
  }

  // -------------------------------------------------------------------------
  //  Authorization-code + PKCE
  // -------------------------------------------------------------------------

  /** Builds the authorize URL and remembers the PKCE verifier under `state`. */
  async start(): Promise<{ url: string; state: string }> {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'ClientId/ClientSecret پی‌پینگ تنظیم نشده است.',
      );
    }
    const verifier = base64url(randomBytes(48));
    const challenge = base64url(createHash('sha256').update(verifier).digest());
    const state = base64url(randomBytes(24));

    // Redis is the natural home for the short-lived verifier; fall back to a
    // setting row so the flow still works when Redis is disabled.
    if (this.redis.isReady) {
      await this.redis.set(`${STATE_PREFIX}${state}`, verifier, STATE_TTL_SECONDS);
    } else {
      await this.writeSetting(`${STATE_PREFIX}${state}`, verifier);
    }

    const scopes = await this.getRequestedScopes();
    const url = new URL(this.authorizeUrl);
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('scope', scopes.join(' '));
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return { url: url.toString(), state };
  }

  private async takeVerifier(state: string): Promise<string | null> {
    if (!state) return null;
    const verifier = await this.redis.get(`${STATE_PREFIX}${state}`);
    if (verifier) {
      await this.redis.del(`${STATE_PREFIX}${state}`);
      return verifier;
    }
    const row = await this.readSetting(`${STATE_PREFIX}${state}`);
    if (row) {
      await this.prisma.setting
        .delete({ where: { key: `${STATE_PREFIX}${state}` } })
        .catch(() => undefined);
    }
    return row;
  }

  /** Exchanges the authorization code for tokens and stores them. */
  async callback(code: string, state: string): Promise<OAuthStatus> {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'ClientId/ClientSecret پی‌پینگ تنظیم نشده است.',
      );
    }
    if (!code) {
      throw new BadRequestException('کد بازگشتی پی‌پینگ خالی است.');
    }
    const verifier = await this.takeVerifier(state);
    if (!verifier) {
      throw new BadRequestException(
        'وضعیت (state) نامعتبر یا منقضی شده است؛ دوباره از دکمه‌ی اتصال استفاده کنید.',
      );
    }
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      code,
      code_verifier: verifier,
    });
    const payload = await this.postForm(this.tokenUrl, body);
    await this.persistTokenResponse(payload);
    return this.status();
  }

  private async persistTokenResponse(
    payload: Record<string, unknown>,
  ): Promise<void> {
    const accessToken = String(payload.access_token ?? '');
    if (!accessToken) {
      throw new BadGatewayException('پاسخ پی‌پینگ توکن دسترسی نداشت.');
    }
    const expiresIn = Number(payload.expires_in ?? 3600);
    const tokens: StoredTokens = {
      accessToken,
      refreshToken: payload.refresh_token ? String(payload.refresh_token) : null,
      tokenType: String(payload.token_type ?? 'Bearer'),
      scope: String(payload.scope ?? ''),
      expiresAt:
        Date.now() + (Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000,
    };
    await this.saveTokens(tokens);
  }

  private async postForm(
    url: string,
    body: URLSearchParams,
  ): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body,
        signal: controller.signal,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`PayPing OAuth token request failed: ${reason}`);
      throw new BadGatewayException(
        'ارتباط با سرور احراز هویت پی‌پینگ برقرار نشد.',
      );
    } finally {
      clearTimeout(timeout);
    }
    const text = await response.text();
    let payload: Record<string, unknown> = {};
    if (text) {
      try {
        payload = JSON.parse(text) as Record<string, unknown>;
      } catch {
        payload = { raw: text };
      }
    }
    if (!response.ok || payload.error) {
      const detail =
        (payload.error_description as string) ??
        (payload.error as string) ??
        `خطای ${response.status}`;
      throw new BadRequestException(`پی‌پینگ: ${detail}`);
    }
    return payload;
  }

  /** Refreshes the access token when it is about to expire. */
  private async ensureFreshTokens(): Promise<StoredTokens> {
    const tokens = await this.readTokens();
    if (!tokens?.accessToken) {
      throw new BadRequestException(
        'هنوز به پی‌پینگ متصل نشده‌اید؛ ابتدا از دکمه‌ی «اتصال به پی‌پینگ» استفاده کنید.',
      );
    }
    if (tokens.expiresAt - Date.now() > 60_000 || !tokens.refreshToken) {
      return tokens;
    }
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: tokens.refreshToken,
    });
    try {
      const payload = await this.postForm(this.tokenUrl, body);
      await this.persistTokenResponse(payload);
      return (await this.readTokens()) as StoredTokens;
    } catch (error) {
      this.logger.warn(`OAuth refresh failed: ${String(error)}`);
      return tokens;
    }
  }

  async disconnect(): Promise<OAuthStatus> {
    await this.prisma.setting
      .delete({ where: { key: TOKENS_KEY } })
      .catch(() => undefined);
    return this.status();
  }

  // -------------------------------------------------------------------------
  //  Authenticated calls
  // -------------------------------------------------------------------------

  async userinfo(): Promise<unknown> {
    const tokens = await this.ensureFreshTokens();
    return this.request('GET', this.userinfoUrl, tokens.accessToken);
  }

  /** Generic call against the PayPing API using the OAuth access token. */
  async call(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; data: unknown }> {
    if (!path.startsWith('/')) {
      throw new BadRequestException('مسیر باید با «/» شروع شود.');
    }
    const allowed = [
      '/v1/report',
      '/v1/customer',
      '/v1/coupon',
      '/v1/product',
      '/v1/permalink',
      '/v1/withdraw',
      '/v1/bnpl',
      '/v1/inquiry',
      '/v2/invoice',
      '/v3/pay',
    ];
    if (!allowed.some((prefix) => path.startsWith(prefix))) {
      throw new BadRequestException('این مسیر در فهرست مجاز پنل نیست.');
    }
    const tokens = await this.ensureFreshTokens();
    const url = `https://api.payping.ir${path}`;
    return this.request(method.toUpperCase(), url, tokens.accessToken, body);
  }

  private async request(
    method: string,
    url: string,
    accessToken: string,
    body?: unknown,
  ): Promise<{ status: number; data: unknown }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const text = await response.text();
      let data: unknown = text;
      try {
        data = text ? (JSON.parse(text) as unknown) : null;
      } catch {
        /* keep raw text */
      }
      return { status: response.status, data };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new BadGatewayException(`ارتباط با پی‌پینگ برقرار نشد: ${reason}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  // -------------------------------------------------------------------------
  //  Scope probe
  // -------------------------------------------------------------------------

  /** Calls one representative endpoint per scope and reports what works. */
  async probe(): Promise<ProbeResult[]> {
    const tokens = await this.ensureFreshTokens();
    const checks: Array<{
      scope: string;
      method: string;
      path: string;
      body?: unknown;
    }> = [
      { scope: 'profile', method: 'GET', path: this.userinfoUrl },
      {
        scope: 'pay:read',
        method: 'POST',
        path: '/v1/report/TransactionReportCount',
        body: {},
      },
      {
        scope: 'report:read',
        method: 'POST',
        path: '/v1/report/WithdrawTransactionsCount',
        body: {},
      },
      { scope: 'customer:read', method: 'GET', path: '/v1/customer/ListCount' },
      { scope: 'coupon:read', method: 'GET', path: '/v1/coupon/ListCount' },
      { scope: 'product:read', method: 'GET', path: '/v1/product/List' },
      { scope: 'invoice:read', method: 'GET', path: '/v2/invoice/ListCount' },
      {
        scope: 'bnpl:merchantread',
        method: 'GET',
        path: '/v1/bnpl/merchant/options/get',
      },
      {
        scope: 'inquiry:bankInquiry',
        method: 'GET',
        path: '/v1/inquiry/Cards/card-to-sheba-inquiry?cardNumber=0',
      },
      {
        scope: 'inquiry:identityInquiry',
        method: 'GET',
        path: '/v1/inquiry/Matching/nationalcode-with-mobile?nationalCode=0&mobile=0',
      },
      {
        scope: 'inquiry:facilityInquiry',
        method: 'GET',
        path: '/v1/inquiry/PostalCode/inquiry-postal-code?postalCode=0',
      },
    ];

    const results: ProbeResult[] = [];
    for (const check of checks) {
      const url = check.path.startsWith('http')
        ? check.path
        : `https://api.payping.ir${check.path}`;
      try {
        const { status, data } = await this.request(
          check.method,
          url,
          tokens.accessToken,
          check.body,
        );
        const ok = status >= 200 && status < 300;
        results.push({
          scope: check.scope,
          method: check.method,
          path: check.path,
          ok,
          status,
          message: ok ? 'دسترسی دارد' : this.describe(data, status),
        });
      } catch (error) {
        results.push({
          scope: check.scope,
          method: check.method,
          path: check.path,
          ok: false,
          status: 0,
          message: error instanceof Error ? error.message : 'خطای نامشخص',
        });
      }
    }
    return results;
  }

  private describe(data: unknown, status: number): string {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const record = data as Record<string, unknown>;
      for (const key of [
        'detail',
        'message',
        'title',
        'error_description',
        'error',
      ]) {
        if (typeof record[key] === 'string' && record[key]) {
          return record[key] as string;
        }
      }
    }
    return `کد ${status}`;
  }
}

function base64url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
