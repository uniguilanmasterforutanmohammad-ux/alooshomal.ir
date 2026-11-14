import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { ImageService } from './image.service';
import { StorageService } from './storage.service';
import { RATE_LIMITS, RateLimitService } from '../common/rate-limit.service';
import {
  ALLOWED_DOCUMENT_MIME,
  UPLOAD_CATEGORIES,
  MAX_DOCUMENT_BYTES,
  MAX_UPLOAD_BYTES,
  UploadCategoryKey,
} from './uploads.constants';

export interface UploadResult {
  url: string;
  key: string;
  width: number;
  height: number;
  size: number;
  contentType: string;
}

@Injectable()
export class UploadsService {
  constructor(
    private readonly storage: StorageService,
    private readonly images: ImageService,
    private readonly rateLimit: RateLimitService,
  ) {}

  /**
   * Validate → normalise to WebP → store under `<folder>/<ownerId>/`.
   * Returns the public URL the form should persist in `logoUrl`/`avatarUrl`.
   *
   * `maxBytes` lets a caller apply a smaller, admin-configured cap (e.g. the
   * feed image size setting) in place of the platform-wide default.
   */
  async upload(
    category: UploadCategoryKey,
    ownerId: string,
    file: Express.Multer.File | undefined,
    maxBytes?: number,
  ): Promise<UploadResult> {
    if (!file?.buffer) {
      throw new BadRequestException('فایلی آپلود نشده است');
    }
    // Every upload is decoded in memory and written to object storage; cap the
    // rate per account so a signed-in user cannot exhaust memory/disk.
    await this.rateLimit.hit(RATE_LIMITS.upload, ownerId);
    const limitBytes = maxBytes ?? MAX_UPLOAD_BYTES;
    if (file.size > limitBytes) {
      const kb = Math.floor(limitBytes / 1024).toLocaleString('fa-IR');
      throw new BadRequestException(`حجم تصویر نباید بیشتر از ${kb} کیلوبایت باشد`);
    }
    if (!this.storage.isReady) {
      throw new ServiceUnavailableException(
        'سرویس ذخیره‌سازی تصویر در دسترس نیست',
      );
    }

    const processed = await this.images.toWebp(file.buffer, category);
    const stored = await this.storage.put(
      UPLOAD_CATEGORIES[category].folder,
      ownerId,
      processed.buffer,
      processed.ext,
      processed.contentType,
    );

    return {
      url: stored.url,
      key: stored.key,
      width: processed.width,
      height: processed.height,
      size: processed.buffer.length,
      contentType: processed.contentType,
    };
  }

  /** Remove a previously stored object by its public URL (best-effort). */
  async removeByUrl(url: string | null | undefined): Promise<void> {
    const key = this.storage.keyFromUrl(url);
    if (key) {
      await this.storage.remove(key);
    }
  }

  /**
   * Store an onboarding document (business licence, ID card, …) as-is.
   * Unlike images these are not re-encoded: PDFs must stay PDFs, and the admin
   * needs the original file for the blue-tick review.
   */
  async uploadDocument(
    ownerId: string,
    file: Express.Multer.File | undefined,
  ): Promise<UploadResult> {
    if (!file?.buffer) {
      throw new BadRequestException('فایلی آپلود نشده است');
    }
    await this.rateLimit.hit(RATE_LIMITS.upload, ownerId);
    if (file.size > MAX_DOCUMENT_BYTES) {
      throw new BadRequestException(
        `حجم فایل نباید بیشتر از ${Math.floor(MAX_DOCUMENT_BYTES / 1024 / 1024).toLocaleString('fa-IR')} مگابایت باشد`,
      );
    }
    if (!ALLOWED_DOCUMENT_MIME.includes(file.mimetype)) {
      throw new BadRequestException(
        'فرمت فایل مجاز نیست؛ فقط PDF یا تصویر (PNG/JPG/WebP) بپذیرید.',
      );
    }
    if (!this.storage.isReady) {
      throw new ServiceUnavailableException(
        'سرویس ذخیره‌سازی فایل در دسترس نیست',
      );
    }
    const ext = DOCUMENT_EXTENSIONS[file.mimetype] ?? 'bin';
    const stored = await this.storage.put(
      UPLOAD_CATEGORIES.document.folder,
      ownerId,
      file.buffer,
      ext,
      file.mimetype,
    );
    return {
      url: stored.url,
      key: stored.key,
      width: 0,
      height: 0,
      size: file.size,
      contentType: file.mimetype,
    };
  }
}

const DOCUMENT_EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};
