/** `Setting` key holding the encrypted backup destinations + retention. */
export const BACKUP_SETTINGS_KEY = 'backupSettings';

/** Default number of full backup bundles kept on disk. */
export const DEFAULT_BACKUP_RETENTION = 10;

/** Minimum free bytes required before starting a new backup. */
export const MIN_FREE_BYTES = 200 * 1024 * 1024;

/** Archive naming: `alooshomal_YYYYMMDD-HHMMSS.tar.gz`. */
export const BACKUP_FILE_PATTERN = /^alooshomal_\d{8}-\d{6}(-\d+)?\.tar\.gz$/;

export type BackupDestination = 'google-drive' | 's3' | 'webdav';

export interface GoogleDriveSettings {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  /** destination folder id (optional; root of the Drive when empty) */
  folderId?: string;
}

export interface S3DestinationSettings {
  endpoint: string;
  port?: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region?: string;
  /** key prefix inside the bucket */
  prefix?: string;
}

export interface WebdavSettings {
  baseUrl: string;
  username: string;
  password: string;
  /** sub-folder under the base URL */
  folder?: string;
}

export interface BackupSettings {
  retention: number;
  googleDrive?: GoogleDriveSettings;
  s3?: S3DestinationSettings;
  webdav?: WebdavSettings;
}
