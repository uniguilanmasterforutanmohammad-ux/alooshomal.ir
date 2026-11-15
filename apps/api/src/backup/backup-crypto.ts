import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const PREFIX = 'enc:v1:';

/**
 * Derive a stable 32-byte key from the app secret. Backup destination
 * credentials (Drive refresh token, S3 secret, WebDAV password) are stored in
 * the `settings` table, so they must never be readable as plain text in a
 * database dump.
 */
function keyFromSecret(secret: string): Buffer {
  return createHash('sha256').update(`alooshomal-backup:${secret}`).digest();
}

export function encryptJson(value: unknown, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFromSecret(secret), iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(value), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64url')}:${tag.toString('base64url')}:${data.toString('base64url')}`;
}

export function decryptJson<T>(payload: string, secret: string): T | null {
  if (!payload.startsWith(PREFIX)) {
    // Legacy/plain JSON is still accepted so a hand-written value keeps working.
    try {
      return JSON.parse(payload) as T;
    } catch {
      return null;
    }
  }
  const [ivPart, tagPart, dataPart] = payload.slice(PREFIX.length).split(':');
  if (!ivPart || !tagPart || !dataPart) return null;
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      keyFromSecret(secret),
      Buffer.from(ivPart, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(dataPart, 'base64url')),
      decipher.final(),
    ]);
    return JSON.parse(plain.toString('utf8')) as T;
  } catch {
    return null;
  }
}
