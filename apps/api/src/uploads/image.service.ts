import { BadRequestException, Injectable } from '@nestjs/common';
import sharp from 'sharp';

import {
  ALLOWED_IMAGE_MIME,
  UPLOAD_CATEGORIES,
  UploadCategoryKey,
} from './uploads.constants';

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  contentType: string;
  ext: string;
}

/**
 * Normalises every upload to a web-friendly WebP with sharp:
 *  - validates the real format (not just the client-supplied MIME),
 *  - resizes so the longest edge stays within the category limits,
 *  - for avatar-style categories, centre-crops to a square cover,
 *  - strips metadata and encodes WebP.
 */
@Injectable()
export class ImageService {
  async toWebp(input: Buffer, category: UploadCategoryKey): Promise<ProcessedImage> {
    const config = UPLOAD_CATEGORIES[category];

    const pipeline = sharp(input, { failOn: 'error' }).rotate();
    const meta = await pipeline.metadata().catch(() => null);
    if (!meta || !meta.format || !ALLOWED_IMAGE_MIME.includes(`image/${meta.format}`)) {
      throw new BadRequestException('فرمت تصویر پشتیبانی نمی‌شود');
    }

    const resized = config.cover
      ? pipeline.resize(config.cover, config.cover, { fit: 'cover', position: 'centre' })
      : pipeline.resize(config.maxWidth, config.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });

    const output = await resized
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: output.data,
      width: output.info.width,
      height: output.info.height,
      contentType: 'image/webp',
      ext: 'webp',
    };
  }
}
