import { BadRequestException } from '@nestjs/common';

/**
 * User-supplied image URLs must point at our own media origin.
 *
 * Uploads are normalised and stored under `MINIO_PUBLIC_URL`, so anything else
 * is either a stale value or an attempt to embed a third-party tracking pixel
 * (which would leak every visitor's IP) or a URL the image optimiser would
 * have to fetch. Relative `/…` URLs are accepted for same-origin deployments.
 */
function mediaBase(): string | null {
  const raw = process.env.MINIO_PUBLIC_URL?.trim();
  return raw ? raw.replace(/\/+$/, '') : null;
}

export function isOwnedMediaUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('/')) return true;
  const base = mediaBase();
  // Without a configured origin we cannot validate; keep the old behaviour
  // rather than rejecting every upload in a misconfigured environment.
  if (!base) return true;
  return url === base || url.startsWith(`${base}/`);
}

export function assertOwnedMediaUrls(
  urls: ReadonlyArray<string | null | undefined>,
  label = 'تصویر',
): void {
  if (urls.some((url) => typeof url === 'string' && url && !isOwnedMediaUrl(url))) {
    throw new BadRequestException(
      `${label} باید از تصاویر آپلودشده در همین سایت انتخاب شود`,
    );
  }
}
