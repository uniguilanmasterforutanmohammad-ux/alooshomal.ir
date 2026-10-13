import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';

export interface StoredObject {
  /** public URL the browser can load the object from */
  url: string;
  /** object key inside the bucket (path within the storage root) */
  key: string;
}

/**
 * Thin wrapper around object storage (MinIO, S3-compatible).
 *
 * Everything is grouped under one bucket with a stable, category-based folder
 * layout so the media tree stays portable: moving to a dedicated media server
 * later only means re-pointing the endpoint / copying the bucket, with no code
 * changes — the keys already carry the folder structure:
 *
 *   <folder>/<ownerId>/<uuid>.webp        e.g. logos/<userId>/<uuid>.webp
 *   <folder>/<ownerId>/<uuid>.webp        e.g. avatars/<userId>/<uuid>.webp
 *
 * New categories (news, gallery, ...) just get their own folder name.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: MinioClient;
  private readonly bucket: string;
  private readonly publicBase: string;
  private readonly enabled: boolean;
  private ready = false;

  constructor(private readonly config: ConfigService) {
    const endPoint = this.config.get<string>('MINIO_ENDPOINT', 'minio');
    const port = Number(this.config.get<string>('MINIO_PORT', '9000'));
    const useSSL = this.config.get<string>('MINIO_USE_SSL', 'false') === 'true';
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'alooshomal');
    this.enabled = this.config.get<string>('MINIO_ENABLED', 'true') !== 'false';

    this.client = new MinioClient({
      endPoint,
      port,
      useSSL,
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY', ''),
      secretKey: this.config.get<string>('MINIO_SECRET_KEY', ''),
    });

    // Public base used to build object URLs. In production this is the media
    // host (e.g. https://media.alooshomal.ir); in dev it is the local MinIO.
    const configuredBase = this.config.get<string>('MINIO_PUBLIC_URL', '').trim();
    this.publicBase = configuredBase
      ? configuredBase.replace(/\/+$/, '')
      : `${useSSL ? 'https' : 'http'}://${endPoint}:${port}`;
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('object storage disabled (MINIO_ENABLED=false)');
      return;
    }
    try {
      await this.ensureBucket();
      this.ready = true;
    } catch (error) {
      this.logger.error(
        `object storage unavailable at init: ${(error as Error).message}`,
      );
    }
  }

  get isReady(): boolean {
    return this.ready;
  }

  private async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket).catch(() => false);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`created bucket "${this.bucket}"`);
    }
    // Objects are served directly from MinIO, so the bucket must be readable.
    await this.client
      .setBucketPolicy(this.bucket, this.readOnlyPolicy())
      .catch((error) =>
        this.logger.warn(`could not set bucket policy: ${(error as Error).message}`),
      );
  }

  private readOnlyPolicy(): string {
    return JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucket}/*`],
        },
      ],
    });
  }

  /**
   * Store a buffer under `<folder>/<ownerId>/<uuid>.<ext>` and return its key
   * and public URL.
   */
  async put(
    folder: string,
    ownerId: string,
    buffer: Buffer,
    ext: string,
    contentType: string,
  ): Promise<StoredObject> {
    const key = `${folder}/${ownerId}/${crypto.randomUUID()}.${ext}`;
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    return { key, url: this.publicUrl(key) };
  }

  /** Best-effort removal; never throws (a missing object is fine). */
  async remove(key: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, key);
    } catch {
      // ignore — deletion is best-effort
    }
  }

  /** Convert a stored key back into its public URL. */
  publicUrl(key: string): string {
    return `${this.publicBase}/${this.bucket}/${key}`;
  }

  /**
   * Extract the object key from a URL we previously handed out, so old objects
   * can be replaced / removed. Returns null for external URLs.
   */
  keyFromUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    const prefix = `${this.publicBase}/${this.bucket}/`;
    return url.startsWith(prefix) ? url.slice(prefix.length) : null;
  }
}
