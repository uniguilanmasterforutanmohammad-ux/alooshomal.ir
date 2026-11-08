import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from 'node:crypto';

/**
 * Symmetric encryption for credentials the server must be able to read back —
 * currently the brand social-network passwords (see the `social-accounts`
 * module). AES-256-GCM gives both confidentiality and tamper detection, so a
 * modified row fails to decrypt instead of silently returning garbage.
 *
 * The key comes from `SOCIAL_CREDENTIALS_KEY` when set (32 bytes as 64 hex
 * chars or base64), otherwise it is derived from `JWT_SECRET` with HKDF so an
 * existing install keeps working without new configuration. Setting the
 * dedicated key is still preferred because rotating `JWT_SECRET` would make
 * already-stored secrets unreadable.
 *
 * Payload format: `v1.<iv>.<tag>.<ciphertext>` (base64url), which leaves room
 * to rotate the scheme later while still reading older rows.
 */

const VERSION = 'v1';
const HKDF_SALT = 'alooshomal:secret-box:salt:v1';
const HKDF_INFO = 'alooshomal:secret-box:key:v1';
const KEY_BYTES = 32;
const IV_BYTES = 12;

let cachedKey: Buffer | null = null;

function resolveKey(): Buffer {
  if (cachedKey) return cachedKey;

  const configured = process.env.SOCIAL_CREDENTIALS_KEY?.trim();
  if (configured) {
    const key = /^[0-9a-fA-F]{64}$/.test(configured)
      ? Buffer.from(configured, 'hex')
      : Buffer.from(configured, 'base64');
    if (key.length !== KEY_BYTES) {
      throw new Error(
        'SOCIAL_CREDENTIALS_KEY must be 32 bytes (64 hex characters or base64)',
      );
    }
    cachedKey = key;
    return key;
  }

  const fallback = process.env.JWT_SECRET?.trim();
  if (!fallback) {
    throw new Error(
      'Cannot encrypt secrets: set SOCIAL_CREDENTIALS_KEY or JWT_SECRET',
    );
  }
  cachedKey = Buffer.from(
    hkdfSync('sha256', Buffer.from(fallback, 'utf8'), HKDF_SALT, HKDF_INFO, KEY_BYTES),
  );
  return cachedKey;
}

function toBase64Url(buffer: Buffer): string {
  return buffer.toString('base64url');
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', resolveKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [
    VERSION,
    toBase64Url(iv),
    toBase64Url(cipher.getAuthTag()),
    toBase64Url(ciphertext),
  ].join('.');
}

export function decryptSecret(payload: string): string {
  const parts = payload.split('.');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Unsupported encrypted payload format');
  }
  const [, iv, tag, ciphertext] = parts;
  const decipher = createDecipheriv(
    'aes-256-gcm',
    resolveKey(),
    Buffer.from(iv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
