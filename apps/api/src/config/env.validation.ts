import { Logger } from '@nestjs/common';

import { isInsecureSecret } from '../auth/jwt.config';

/**
 * Fail-fast validation of the process environment.
 *
 * `ConfigService` happily returns `undefined` for a missing variable and every
 * call site then falls back to its own default, which is how a production
 * deploy can boot with a placeholder secret or a wildcard CORS origin. This
 * validator runs once, before any module is instantiated, and refuses to start
 * when a security-relevant invariant is broken.
 *
 * Rules are intentionally conservative in production and permissive in
 * development, so local runs keep working without a full `.env`.
 */

const VALID_NODE_ENVS = new Set(['development', 'test', 'production']);

const TRUST_PROXY_NAMED = new Set([
  'true',
  'false',
  'loopback',
  'linklocal',
  'uniquelocal',
]);

type Env = Record<string, string | undefined>;

function asEnv(config: Record<string, unknown>): Env {
  const env: Env = {};
  for (const [key, value] of Object.entries(config)) {
    env[key] = value === undefined || value === null ? undefined : String(value);
  }
  return env;
}

function isUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function checkInt(
  env: Env,
  name: string,
  min: number,
  max: number,
  problems: string[],
): void {
  const raw = env[name]?.trim();
  if (!raw) return;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    problems.push(`${name} must be an integer between ${min} and ${max} (got "${raw}")`);
  }
}

function checkTrustProxy(raw: string | undefined, problems: string[]): void {
  const value = (raw ?? '0').trim();
  if (!value || value === '0') return;
  if (/^\d+$/.test(value)) return;
  if (TRUST_PROXY_NAMED.has(value.toLowerCase())) return;
  // Express also accepts an IP/subnet list; a loose shape check is enough to
  // catch typos like `truee` without re-implementing proxy-addr.
  if (/^[0-9a-fA-F:.,\s/]+$/.test(value)) return;
  problems.push(
    `TRUST_PROXY must be 0, a hop count, a named range, or an IP/subnet list (got "${value}")`,
  );
}

function checkSocialKey(raw: string | undefined, problems: string[]): void {
  const value = raw?.trim();
  if (!value) return;
  const bytes = /^[0-9a-fA-F]{64}$/.test(value)
    ? Buffer.from(value, 'hex')
    : Buffer.from(value, 'base64');
  if (bytes.length !== 32) {
    problems.push(
      'SOCIAL_CREDENTIALS_KEY must decode to 32 bytes (64 hex chars or base64)',
    );
  }
}

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const env = asEnv(config);
  const nodeEnv = env.NODE_ENV?.trim() || 'development';
  const isProd = nodeEnv === 'production';
  const problems: string[] = [];
  const warnings: string[] = [];

  if (!VALID_NODE_ENVS.has(nodeEnv)) {
    problems.push(
      `NODE_ENV must be one of ${[...VALID_NODE_ENVS].join(', ')} (got "${nodeEnv}")`,
    );
  }

  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    problems.push('DATABASE_URL is required');
  } else if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    problems.push('DATABASE_URL must be a postgres:// connection string');
  }

  const jwtSecret = env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    if (isProd) problems.push('JWT_SECRET is required in production');
    else warnings.push('JWT_SECRET is missing; a development-only secret will be used');
  } else if (isProd && (jwtSecret.length < 32 || isInsecureSecret(jwtSecret))) {
    problems.push(
      'JWT_SECRET must be at least 32 characters and not a known/placeholder value in production',
    );
  }

  const origins = (env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (isProd) {
    if (origins.length === 0) {
      problems.push('CORS_ORIGIN must list the public web origin(s) in production');
    }
    if (origins.includes('*')) {
      problems.push('CORS_ORIGIN may not contain "*" in production');
    }
  }
  for (const origin of origins) {
    if (origin !== '*' && !isUrl(origin)) {
      problems.push(`CORS_ORIGIN entry is not a valid http(s) URL: "${origin}"`);
    }
  }

  checkInt(env, 'API_PORT', 1, 65535, problems);
  checkInt(env, 'DATABASE_POOL_MAX', 1, 200, problems);
  checkInt(env, 'BACKUP_KEEP', 1, 10000, problems);
  checkTrustProxy(env.TRUST_PROXY, problems);
  checkSocialKey(env.SOCIAL_CREDENTIALS_KEY, problems);

  if (isProd && env.ENABLE_SWAGGER?.trim() === 'true') {
    warnings.push(
      'ENABLE_SWAGGER=true in production exposes the full API schema; keep it off unless the docs are intentionally public',
    );
  }

  if (env.PAYPING_TOKEN?.trim()) {
    const base = env.PAYPING_BASE_URL?.trim() || 'https://api.payping.ir';
    if (!isUrl(base)) problems.push(`PAYPING_BASE_URL is not a valid URL: "${base}"`);
  }

  const minioEnabled = (env.MINIO_ENABLED ?? 'true').trim() !== 'false';
  if (minioEnabled) {
    const required = [
      'MINIO_ENDPOINT',
      'MINIO_ACCESS_KEY',
      'MINIO_SECRET_KEY',
      'MINIO_BUCKET',
    ];
    for (const name of required) {
      if (!env[name]?.trim()) {
        const message = `${name} is required when MINIO_ENABLED is not "false"`;
        if (isProd) problems.push(message);
        else warnings.push(message);
      }
    }
  }

  const logger = new Logger('EnvValidation');
  for (const warning of warnings) logger.warn(warning);

  if (problems.length > 0) {
    throw new Error(
      [
        'Invalid environment configuration:',
        ...problems.map((problem) => `  - ${problem}`),
      ].join('\n'),
    );
  }

  return config;
}
