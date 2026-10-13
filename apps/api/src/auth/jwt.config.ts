import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtSignOptions } from '@nestjs/jwt';

/**
 * Central JWT policy — one place that decides the secret, the access-token
 * lifetime and the issuer/audience claims.
 *
 * Design notes (best practice for a browser + API split):
 *   * the access token is intentionally SHORT-lived (15 minutes by default).
 *     It is the thing that travels on every request, so a leaked copy has a
 *     small blast radius; sessions and the refresh cookie carry the longevity.
 *   * `iss`/`aud` are pinned and verified so a token minted for another service
 *     (or another environment) can never be replayed here.
 *   * the secret is required in production. A well-known fallback secret would
 *     let anyone forge a token, so production refuses to boot without one.
 */

export const JWT_ISSUER = 'alooshomal-api';
export const JWT_AUDIENCE = 'alooshomal-web';

/** Access-token lifetime. Deliberately short — refresh extends the session. */
export const DEFAULT_ACCESS_TTL = '15m';

const DEV_FALLBACK_SECRET = 'dev_secret_only_for_local_development';

export function resolveJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET')?.trim();
  const isProd = config.get<string>('NODE_ENV') === 'production';
  if (secret && secret.length >= 16) {
    return secret;
  }
  if (isProd) {
    // Fail closed: never sign tokens with a guessable secret in production.
    throw new Error(
      'JWT_SECRET must be set to a strong value (≥۱۶ کاراکتر) in production',
    );
  }
  new Logger('JwtConfig').warn(
    'JWT_SECRET is missing or too short — using an insecure development secret',
  );
  return DEV_FALLBACK_SECRET;
}

export function jwtSignOptions(config: ConfigService): JwtSignOptions {
  const expiresIn = config.get<string>('JWT_EXPIRES_IN')?.trim() || DEFAULT_ACCESS_TTL;
  return {
    expiresIn: expiresIn as JwtSignOptions['expiresIn'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  };
}
