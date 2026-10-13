import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BucketItem, Client as MinioClient } from 'minio';

import { UPLOAD_CATEGORIES } from './uploads.constants';

export interface StoredObject {
  /** public URL the browser can load the object from */
  url: string;
  /** object key inside the bucket (path within the storage root) */
  key: string;
}

/** A per-folder slice of the bucket, used by the admin storage panel. */
export interface StorageFolderUsage {
  /** top-level folder inside the bucket, e.g. `logos` */
  folder: string;
  /** Persian label when the folder maps to a known upload category */
  label: string;
  /** number of objects stored under this folder */
  count: number;
  /** total bytes stored under this folder */
  bytes: number;
}

export interface StorageUsage {
  /** whether the object-storage backend is enabled */
  enabled: boolean;
  /** bucket name */
  bucket: string;
  /** S3 endpoint host:port the API talks to */
  endpoint: string;
  /** browser-facing base URL used to build object URLs */
  publicBaseUrl: string;
  /** physical host path of the bucket data (best-effort, from config) */
  dataDir: string;
  /** number of stored objects */
  objectCount: number;
  /** total bytes stored in the bucket */
  totalBytes: number;
  /** usage grouped by top-level folder, largest first */
  folders: StorageFolderUsage[];
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
  private readonly endpoint: string;
  private readonly dataDir: string;
  private readonly enabled: boolean;
  private ready = false;

  constructor(private readonly config: ConfigService) {
    const endPoint = this.config.get<string>('MINIO_ENDPOINT', 'minio');
    const port = Number(this.config.get<string>('MINIO_PORT', '9000'));
    const useSSL = this.config.get<string>('MINIO_USE_SSL', 'false') === 'true';
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'alooshomal');
    this.enabled = this.config.get<string>('MINIO_ENABLED', 'true') !== 'false';
    this.endpoint = `${useSSL ? 'https' : 'http'}://${endPoint}:${port}`;
    // Physical path of the bucket on the host. The MinIO service mounts the
    // `alooshomal_minio_data` named volume at /data, so inside the API container
    // this only resolves when that volume is also mounted — otherwise it is a
    // hint for the operator and the per-folder byte totals below stay accurate.
    this.dataDir = this.config.get<string>(
      'MINIO_DATA_DIR',
      `/var/lib/docker/volumes/alooshomal_minio_data/_data`,
    );

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

  /**
   * Walk the whole bucket and aggregate stored bytes by top-level folder.
   *
   * Object storage has no cheap "disk usage" call, so this lists every object
   * (recursively) and sums the sizes. The bucket holds only processed WebP
   * images, so the walk stays small even for large sites; the result feeds the
   * admin storage panel.
   */
  async usage(): Promise<StorageUsage> {
    const base: StorageUsage = {
      enabled: this.enabled,
      bucket: this.bucket,
      endpoint: this.endpoint,
      publicBaseUrl: this.publicBase,
      dataDir: this.dataDir,
      objectCount: 0,
      totalBytes: 0,
      folders: [],
    };

    if (!this.enabled || !this.ready) {
      return base;
    }

    // Folder name → Persian label, so known categories show a friendly name.
    const labels = new Map<string, string>();
    for (const category of Object.values(UPLOAD_CATEGORIES)) {
      labels.set(category.folder, category.label);
    }

    const byFolder = new Map<string, StorageFolderUsage>();
    let objectCount = 0;
    let totalBytes = 0;

    await new Promise<void>((resolve, reject) => {
      const stream = this.client.listObjectsV2(this.bucket, '', true);
      stream.on('data', (item: BucketItem) => {
        const key = item.name;
        if (!key || typeof item.size !== 'number') return;
        const folder = key.includes('/') ? key.slice(0, key.indexOf('/')) : '(root)';
        const slice = byFolder.get(folder) ?? {
          folder,
          label: labels.get(folder) ?? folder,
          count: 0,
          bytes: 0,
        };
        slice.count += 1;
        slice.bytes += item.size;
        byFolder.set(folder, slice);
        objectCount += 1;
        totalBytes += item.size;
      });
      stream.on('error', reject);
      stream.on('end', resolve);
    });

    return {
      ...base,
      objectCount,
      totalBytes,
      folders: [...byFolder.values()].sort((a, b) => b.bytes - a.bytes),
    };
  }
}
