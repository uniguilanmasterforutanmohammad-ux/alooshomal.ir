import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { ImageService } from './image.service';
import { StorageService } from './storage.service';
import {
  UPLOAD_CATEGORIES,
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
  ) {}

  /**
   * Validate → normalise to WebP → store under `<folder>/<ownerId>/`.
   * Returns the public URL the form should persist in `logoUrl`/`avatarUrl`.
   */
  async upload(
    category: UploadCategoryKey,
    ownerId: string,
    file: Express.Multer.File | undefined,
  ): Promise<UploadResult> {
    if (!file?.buffer) {
      throw new BadRequestException('فایلی آپلود نشده است');
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('حجم تصویر نباید بیشتر از ۲ مگابایت باشد');
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
}
