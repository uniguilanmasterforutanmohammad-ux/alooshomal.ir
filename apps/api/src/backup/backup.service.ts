import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createGzip } from 'node:zlib';

import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../uploads/storage.service';
import {
  BACKUP_FILE_PATTERN,
  BACKUP_SETTINGS_KEY,
  BackupDestination,
  BackupSettings,
  DEFAULT_BACKUP_RETENTION,
  GoogleDriveSettings,
  MIN_FREE_BYTES,
  S3DestinationSettings,
  WebdavSettings,
} from './backup.constants';
import { decryptJson, encryptJson } from './backup-crypto';
import { RESTORE_README, RESTORE_SCRIPT } from './backup-templates';
import {
  GoogleDriveSettingsDto,
  S3DestinationSettingsDto,
  UpdateBackupSettingsDto,
  WebdavSettingsDto,
} from './dto/update-backup-settings.dto';

export type BackupJobStatus = 'RUNNING' | 'DONE' | 'FAILED';

export interface BackupJob {
  id: string;
  status: BackupJobStatus;
  phase: string;
  progress: number;
  message: string;
  includeMedia: boolean;
  startedAt: string;
  finishedAt?: string;
  fileName?: string;
  size?: number;
  error?: string;
}

export interface BackupManifest {
  id: string;
  createdAt: string;
  includeMedia: boolean;
  bucket: string;
  database: { file: string; bytes: number; sha256: string };
  media: { objectCount: number; bytes: number };
  destinations?: Partial<
    Record<BackupDestination, { uploadedAt: string; location: string }>
  >;
}

export interface BackupListItem {
  name: string;
  size: number;
  createdAt: string;
  manifest: BackupManifest | null;
}

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);
  private readonly jobs = new Map<string, BackupJob>();
  private readonly dir: string;
  private activeJobId: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
    private readonly activity: ActivityService,
  ) {
    this.dir = this.config.get<string>('BACKUP_DIR', '/usr/src/app/backups');
  }

  async onModuleInit(): Promise<void> {
    try {
      await fs.promises.mkdir(this.dir, { recursive: true });
      await fs.promises.access(this.dir, fs.constants.W_OK);
    } catch (error) {
      this.logger.warn(
        `backup dir '${this.dir}' is not writable: ${(error as Error).message}`,
      );
    }
  }

  // ------------------------------------------------------------------
  //  Settings
  // ------------------------------------------------------------------

  private secret(): string {
    return this.config.get<string>('JWT_SECRET', 'alooshomal-backup');
  }

  async getSettings(): Promise<BackupSettings> {
    const row = await this.prisma.setting.findUnique({
      where: { key: BACKUP_SETTINGS_KEY },
    });
    const parsed = row ? decryptJson<BackupSettings>(row.value, this.secret()) : null;
    return {
      ...parsed,
      retention: parsed?.retention ?? DEFAULT_BACKUP_RETENTION,
    };
  }

  /** Masked view for the admin panel — secrets never leave the server. */
  async getPublicSettings() {
    const settings = await this.getSettings();
    return {
      retention: settings.retention,
      googleDrive: settings.googleDrive
        ? {
            configured: true,
            clientId: mask(settings.googleDrive.clientId),
            folderId: settings.googleDrive.folderId ?? '',
            hasSecret: Boolean(settings.googleDrive.clientSecret),
            hasRefreshToken: Boolean(settings.googleDrive.refreshToken),
          }
        : { configured: false },
      s3: settings.s3
        ? {
            configured: true,
            endpoint: settings.s3.endpoint,
            port: settings.s3.port ?? (settings.s3.useSSL ? 443 : 9000),
            useSSL: settings.s3.useSSL,
            bucket: settings.s3.bucket,
            region: settings.s3.region ?? '',
            prefix: settings.s3.prefix ?? 'alooshomal-backups',
            accessKey: mask(settings.s3.accessKey),
            hasSecret: Boolean(settings.s3.secretKey),
          }
        : { configured: false },
      webdav: settings.webdav
        ? {
            configured: true,
            baseUrl: settings.webdav.baseUrl,
            username: settings.webdav.username,
            folder: settings.webdav.folder ?? 'alooshomal-backups',
            hasPassword: Boolean(settings.webdav.password),
          }
        : { configured: false },
    };
  }

  async updateSettings(dto: UpdateBackupSettingsDto) {
    const current = await this.getSettings();
    const next: BackupSettings = {
      retention: dto.retention ?? current.retention,
      googleDrive:
        dto.googleDrive === null
          ? undefined
          : dto.googleDrive
            ? mergeGoogleDrive(current.googleDrive, dto.googleDrive)
            : current.googleDrive,
      s3:
        dto.s3 === null
          ? undefined
          : dto.s3
            ? mergeS3(current.s3, dto.s3)
            : current.s3,
      webdav:
        dto.webdav === null
          ? undefined
          : dto.webdav
            ? mergeWebdav(current.webdav, dto.webdav)
            : current.webdav,
    };
    await this.prisma.setting.upsert({
      where: { key: BACKUP_SETTINGS_KEY },
      create: { key: BACKUP_SETTINGS_KEY, value: encryptJson(next, this.secret()) },
      update: { value: encryptJson(next, this.secret()) },
    });
    return this.getPublicSettings();
  }

  // ------------------------------------------------------------------
  //  Local bundles
  // ------------------------------------------------------------------

  private assertName(name: string): string {
    if (!BACKUP_FILE_PATTERN.test(name)) {
      throw new BadRequestException('نام فایل پشتیبان معتبر نیست');
    }
    const resolved = path.resolve(this.dir, name);
    if (!resolved.startsWith(path.resolve(this.dir) + path.sep)) {
      throw new BadRequestException('مسیر فایل پشتیبان معتبر نیست');
    }
    return resolved;
  }

  private sidecarPath(name: string): string {
    return path.join(this.dir, `${name}.json`);
  }

  async list() {
    let names: string[] = [];
    try {
      names = (await fs.promises.readdir(this.dir)).filter((name) =>
        BACKUP_FILE_PATTERN.test(name),
      );
    } catch {
      names = [];
    }
    const items: BackupListItem[] = [];
    for (const name of names) {
      try {
        const stat = await fs.promises.stat(path.join(this.dir, name));
        let manifest: BackupManifest | null = null;
        try {
          manifest = JSON.parse(
            await fs.promises.readFile(this.sidecarPath(name), 'utf8'),
          ) as BackupManifest;
        } catch {
          manifest = null;
        }
        items.push({
          name,
          size: stat.size,
          createdAt: manifest?.createdAt ?? stat.mtime.toISOString(),
          manifest,
        });
      } catch {
        // a file removed between readdir and stat is simply skipped
      }
    }
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const settings = await this.getSettings();
    return {
      items,
      jobs: [...this.jobs.values()].sort((a, b) =>
        b.startedAt.localeCompare(a.startedAt),
      ),
      retention: settings.retention,
      storage: await this.storageInfo(),
    };
  }

  private async storageInfo() {
    try {
      const stat = await fs.promises.statfs(this.dir);
      return {
        dir: this.dir,
        freeBytes: stat.bavail * stat.bsize,
        totalBytes: stat.blocks * stat.bsize,
      };
    } catch {
      return { dir: this.dir, freeBytes: null, totalBytes: null };
    }
  }

  getJob(id: string): BackupJob {
    const job = this.jobs.get(id);
    if (!job) throw new NotFoundException('عملیات پشتیبان‌گیری یافت نشد');
    return job;
  }

  async create(adminId: string, includeMedia = true): Promise<BackupJob> {
    if (this.activeJobId) {
      throw new BadRequestException('یک پشتیبان‌گیری دیگر در حال اجراست');
    }
    const info = await this.storageInfo();
    if (info.freeBytes !== null && info.freeBytes < MIN_FREE_BYTES) {
      throw new BadRequestException(
        'فضای دیسک کافی برای ساخت پشتیبان وجود ندارد (حداقل ۲۰۰ مگابایت لازم است)',
      );
    }
    const stamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '-')
      .slice(0, 15);
    let name = `alooshomal_${stamp}.tar.gz`;
    let counter = 1;
    while (fs.existsSync(path.join(this.dir, name))) {
      counter += 1;
      name = `alooshomal_${stamp}-${counter}.tar.gz`;
    }

    const job: BackupJob = {
      id: randomUUID(),
      status: 'RUNNING',
      phase: 'آماده‌سازی',
      progress: 0,
      message: 'در حال آماده‌سازی پشتیبان...',
      includeMedia,
      startedAt: new Date().toISOString(),
      fileName: name,
    };
    this.jobs.set(job.id, job);
    this.activeJobId = job.id;
    void this.run(job, adminId).catch((error) => {
      job.status = 'FAILED';
      job.error = (error as Error).message;
      job.message = 'پشتیبان‌گیری ناموفق بود';
      job.finishedAt = new Date().toISOString();
      this.activeJobId = null;
      this.logger.error(`backup failed: ${(error as Error).message}`);
    });
    return job;
  }

  private async run(job: BackupJob, adminId: string): Promise<void> {
    const name = job.fileName!;
    const archivePath = path.join(this.dir, name);
    const staging = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'alooshomal-backup-'),
    );
    try {
      job.phase = 'دیتابیس';
      job.progress = 5;
      job.message = 'در حال گرفتن دامپ دیتابیس...';
      const db = await this.dumpDatabase(path.join(staging, 'db.sql.gz'));

      let media = { objectCount: 0, bytes: 0 };
      if (job.includeMedia) {
        job.phase = 'رسانه‌ها';
        job.progress = 35;
        job.message = 'در حال کپی تصاویر و فایل‌های آپلودشده...';
        media = await this.storage.exportAllTo(
          path.join(staging, 'media'),
          (done, total) => {
            job.progress = 35 + Math.round((done / Math.max(1, total)) * 50);
            job.message = `کپی رسانه‌ها: ${done.toLocaleString('fa-IR')} از ${total.toLocaleString('fa-IR')}`;
          },
        );
      }

      job.phase = 'بسته‌بندی';
      job.progress = 88;
      job.message = 'در حال ساخت فایل فشرده...';

      const manifest: BackupManifest = {
        id: job.id,
        createdAt: new Date().toISOString(),
        includeMedia: job.includeMedia,
        bucket: this.storage.bucketName,
        database: db,
        media,
      };
      await fs.promises.writeFile(
        path.join(staging, 'manifest.json'),
        JSON.stringify(manifest, null, 2),
      );
      await fs.promises.writeFile(path.join(staging, 'README-RESTORE.md'), RESTORE_README);
      await fs.promises.writeFile(
        path.join(staging, 'restore.sh'),
        RESTORE_SCRIPT.replace('__BUCKET__', this.storage.bucketName),
        { mode: 0o755 },
      );
      await fs.promises.writeFile(
        path.join(staging, 'SHA256SUMS'),
        `${db.sha256}  db.sql.gz\n`,
      );

      await runCommand('tar', ['-czf', archivePath, '-C', staging, '.']);
      const stat = await fs.promises.stat(archivePath);
      await fs.promises.writeFile(
        this.sidecarPath(name),
        JSON.stringify(manifest, null, 2),
      );

      job.status = 'DONE';
      job.progress = 100;
      job.phase = 'پایان';
      job.message = 'پشتیبان با موفقیت ساخته شد';
      job.size = stat.size;
      job.finishedAt = new Date().toISOString();

      await this.activity.log({
        actor: { id: adminId },
        action: 'BACKUP_CREATED',
        summary: `ساخت پشتیبان کامل «${name}» (${formatBytes(stat.size)})`,
        entityType: 'BACKUP',
        entityId: name,
      });
      await this.prune();
    } finally {
      this.activeJobId = null;
      await fs.promises
        .rm(staging, { recursive: true, force: true })
        .catch(() => undefined);
    }
  }

  private async dumpDatabase(target: string) {
    const databaseUrl = this.config.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      throw new BadRequestException('DATABASE_URL تنظیم نشده است');
    }
    const cleanUrl = databaseUrl.replace(/\?.*$/, '');
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        'pg_dump',
        ['--clean', '--if-exists', '--no-owner', '--no-privileges', cleanUrl],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
      let stderr = '';
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      const gzip = createGzip({ level: 6 });
      const out = fs.createWriteStream(target);
      child.stdout.pipe(gzip).pipe(out);
      child.on('error', reject);
      out.on('error', reject);
      out.on('finish', () => resolve());
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`pg_dump failed (${code}): ${stderr.trim()}`));
        }
      });
    });
    const stat = await fs.promises.stat(target);
    if (!stat.size) throw new Error('دامپ دیتابیس خالی است');
    return {
      file: 'db.sql.gz',
      bytes: stat.size,
      sha256: await sha256File(target),
    };
  }

  private async prune(): Promise<void> {
    const settings = await this.getSettings();
    const names = (await fs.promises.readdir(this.dir))
      .filter((name) => BACKUP_FILE_PATTERN.test(name))
      .sort()
      .reverse();
    const extra = names.slice(Math.max(1, settings.retention));
    for (const name of extra) {
      await fs.promises.rm(path.join(this.dir, name), { force: true });
      await fs.promises.rm(this.sidecarPath(name), { force: true });
      this.logger.log(`pruned old backup ${name}`);
    }
  }

  async remove(adminId: string, name: string) {
    const file = this.assertName(name);
    if (!fs.existsSync(file)) throw new NotFoundException('فایل پشتیبان یافت نشد');
    await fs.promises.rm(file, { force: true });
    await fs.promises.rm(this.sidecarPath(name), { force: true });
    await this.activity.log({
      actor: { id: adminId },
      action: 'BACKUP_DELETED',
      summary: `حذف پشتیبان «${name}»`,
      entityType: 'BACKUP',
      entityId: name,
    });
    return { ok: true };
  }

  filePath(name: string): string {
    const file = this.assertName(name);
    if (!fs.existsSync(file)) throw new NotFoundException('فایل پشتیبان یافت نشد');
    return file;
  }

  // ------------------------------------------------------------------
  //  Destinations
  // ------------------------------------------------------------------

  async testDestination(destination: BackupDestination) {
    const settings = await this.getSettings();
    if (destination === 'google-drive') {
      if (!settings.googleDrive) {
        throw new BadRequestException('Google Drive تنظیم نشده است');
      }
      await this.googleToken(settings.googleDrive);
      return { ok: true, message: 'اتصال به Google Drive تأیید شد' };
    }
    if (destination === 's3') {
      if (!settings.s3) throw new BadRequestException('مقصد S3 تنظیم نشده است');
      const client = this.s3Client(settings.s3);
      if (!(await client.bucketExists(settings.s3.bucket))) {
        throw new BadRequestException(
          `باکت «${settings.s3.bucket}» روی مقصد وجود ندارد`,
        );
      }
      return { ok: true, message: 'اتصال به مقصد S3 تأیید شد' };
    }
    if (!settings.webdav) throw new BadRequestException('WebDAV تنظیم نشده است');
    await this.webdavRequest(settings.webdav, 'PROPFIND', '', { Depth: '0' });
    return { ok: true, message: 'اتصال به WebDAV تأیید شد' };
  }

  async upload(adminId: string, name: string, destination: BackupDestination) {
    const file = this.filePath(name);
    const settings = await this.getSettings();
    let location = '';
    if (destination === 'google-drive') {
      if (!settings.googleDrive) {
        throw new BadRequestException('Google Drive تنظیم نشده است');
      }
      location = await this.uploadGoogleDrive(settings.googleDrive, file, name);
    } else if (destination === 's3') {
      if (!settings.s3) throw new BadRequestException('مقصد S3 تنظیم نشده است');
      location = await this.uploadS3(settings.s3, file, name);
    } else {
      if (!settings.webdav) throw new BadRequestException('WebDAV تنظیم نشده است');
      location = await this.uploadWebdav(settings.webdav, file, name);
    }

    const manifest = await this.readManifest(name);
    if (manifest) {
      manifest.destinations = {
        ...(manifest.destinations ?? {}),
        [destination]: { uploadedAt: new Date().toISOString(), location },
      };
      await fs.promises.writeFile(
        this.sidecarPath(name),
        JSON.stringify(manifest, null, 2),
      );
    }
    await this.activity.log({
      actor: { id: adminId },
      action: 'BACKUP_UPLOADED',
      summary: `ارسال پشتیبان «${name}» به ${destinationLabel(destination)}`,
      entityType: 'BACKUP',
      entityId: name,
    });
    return { ok: true, location };
  }

  private async readManifest(name: string): Promise<BackupManifest | null> {
    try {
      return JSON.parse(
        await fs.promises.readFile(this.sidecarPath(name), 'utf8'),
      ) as BackupManifest;
    } catch {
      return null;
    }
  }

  private async googleToken(settings: GoogleDriveSettings): Promise<string> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: settings.clientId,
        client_secret: settings.clientSecret,
        refresh_token: settings.refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      access_token?: string;
      error_description?: string;
      error?: string;
    };
    if (!response.ok || !payload.access_token) {
      throw new BadRequestException(
        `دریافت توکن Google ناموفق بود: ${payload.error_description ?? payload.error ?? response.status}`,
      );
    }
    return payload.access_token;
  }

  private async uploadGoogleDrive(
    settings: GoogleDriveSettings,
    file: string,
    name: string,
  ): Promise<string> {
    const token = await this.googleToken(settings);
    const stat = await fs.promises.stat(file);
    const init = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': 'application/gzip',
          'X-Upload-Content-Length': String(stat.size),
        },
        body: JSON.stringify({
          name,
          ...(settings.folderId ? { parents: [settings.folderId] } : {}),
        }),
      },
    );
    const location = init.headers.get('location');
    if (!init.ok || !location) {
      throw new BadRequestException(
        `آغاز آپلود Google Drive ناموفق بود (${init.status})`,
      );
    }
    const upload = await fetch(location, {
      method: 'PUT',
      headers: {
        'Content-Length': String(stat.size),
        'Content-Type': 'application/gzip',
      },
      body: fs.createReadStream(file) as unknown as never,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });
    const result = (await upload.json().catch(() => ({}))) as {
      id?: string;
      webViewLink?: string;
      error?: { message?: string };
    };
    if (!upload.ok || !result.id) {
      throw new BadRequestException(
        `آپلود Google Drive ناموفق بود: ${result.error?.message ?? upload.status}`,
      );
    }
    return result.webViewLink ?? `https://drive.google.com/file/d/${result.id}/view`;
  }

  private s3Client(settings: S3DestinationSettings): MinioClient {
    return new MinioClient({
      endPoint: settings.endpoint.replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
      port: settings.port ?? (settings.useSSL ? 443 : 9000),
      useSSL: settings.useSSL,
      accessKey: settings.accessKey,
      secretKey: settings.secretKey,
      region: settings.region || undefined,
    });
  }

  private async uploadS3(
    settings: S3DestinationSettings,
    file: string,
    name: string,
  ): Promise<string> {
    const client = this.s3Client(settings);
    if (!(await client.bucketExists(settings.bucket))) {
      throw new BadRequestException(`باکت «${settings.bucket}» روی مقصد وجود ندارد`);
    }
    const stat = await fs.promises.stat(file);
    const key = `${(settings.prefix ?? 'alooshomal-backups').replace(/\/+$/, '')}/${name}`;
    await client.putObject(settings.bucket, key, fs.createReadStream(file), stat.size, {
      'Content-Type': 'application/gzip',
    });
    return `s3://${settings.bucket}/${key}`;
  }

  private webdavUrl(settings: WebdavSettings, name: string): string {
    const base = settings.baseUrl.replace(/\/+$/, '');
    const folder = (settings.folder ?? 'alooshomal-backups').replace(
      /^\/+|\/+$/g,
      '',
    );
    const parts = [base, ...folder.split('/').filter(Boolean), name];
    return parts.join('/');
  }

  private webdavHeaders(settings: WebdavSettings): Record<string, string> {
    const token = Buffer.from(
      `${settings.username}:${settings.password}`,
    ).toString('base64');
    return { Authorization: `Basic ${token}` };
  }

  private async webdavRequest(
    settings: WebdavSettings,
    method: string,
    name: string,
    extra: Record<string, string> = {},
    body?: unknown,
  ): Promise<Response> {
    const response = await fetch(this.webdavUrl(settings, name), {
      method,
      headers: { ...this.webdavHeaders(settings), ...extra },
      body: body as never,
      duplex: body ? 'half' : undefined,
    } as RequestInit & { duplex?: 'half' });
    if (!response.ok && response.status !== 405) {
      throw new BadRequestException(
        `WebDAV پاسخ ${response.status} داد: ${response.statusText}`,
      );
    }
    return response;
  }

  private async uploadWebdav(
    settings: WebdavSettings,
    file: string,
    name: string,
  ): Promise<string> {
    const stat = await fs.promises.stat(file);
    const folder = (settings.folder ?? 'alooshomal-backups')
      .replace(/^\/+|\/+$/g, '')
      .split('/')
      .filter(Boolean);
    let current = '';
    for (const part of folder) {
      current = current ? `${current}/${part}` : part;
      await this.webdavRequest(settings, 'MKCOL', current).catch(() => undefined);
    }
    await this.webdavRequest(
      settings,
      'PUT',
      name,
      { 'Content-Type': 'application/gzip', 'Content-Length': String(stat.size) },
      fs.createReadStream(file) as unknown as never,
    );
    return this.webdavUrl(settings, name);
  }
}

function mask(value: string | undefined): string {
  if (!value) return '';
  if (value.length <= 6) return '••••••';
  return `${value.slice(0, 3)}••••${value.slice(-3)}`;
}

function destinationLabel(destination: BackupDestination): string {
  if (destination === 'google-drive') return 'Google Drive';
  if (destination === 's3') return 'مقصد S3';
  return 'WebDAV';
}

function formatBytes(bytes: number): string {
  const units = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت', 'ترابایت'];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(Math.max(1, bytes)) / Math.log(1024)),
  );
  const value = bytes / Math.pow(1024, exponent);
  return `${(exponent === 0 ? value : Math.round(value * 10) / 10).toLocaleString('fa-IR')} ${units[exponent]}`;
}

function sha256File(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(file);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed (${code}): ${stderr.trim()}`));
    });
  });
}

function mergeGoogleDrive(
  current: GoogleDriveSettings | undefined,
  patch: GoogleDriveSettingsDto,
): GoogleDriveSettings | undefined {
  const next: GoogleDriveSettings = {
    clientId: patch.clientId ?? current?.clientId ?? '',
    clientSecret: patch.clientSecret ?? current?.clientSecret ?? '',
    refreshToken: patch.refreshToken ?? current?.refreshToken ?? '',
    folderId: patch.folderId ?? current?.folderId ?? '',
  };
  if (!next.clientId || !next.clientSecret || !next.refreshToken) return undefined;
  return next;
}

function mergeS3(
  current: S3DestinationSettings | undefined,
  patch: S3DestinationSettingsDto,
): S3DestinationSettings | undefined {
  const next: S3DestinationSettings = {
    endpoint: patch.endpoint ?? current?.endpoint ?? '',
    port: patch.port ?? current?.port,
    useSSL: patch.useSSL ?? current?.useSSL ?? true,
    accessKey: patch.accessKey ?? current?.accessKey ?? '',
    secretKey: patch.secretKey ?? current?.secretKey ?? '',
    bucket: patch.bucket ?? current?.bucket ?? '',
    region: patch.region ?? current?.region ?? '',
    prefix: patch.prefix ?? current?.prefix ?? 'alooshomal-backups',
  };
  if (!next.endpoint || !next.accessKey || !next.secretKey || !next.bucket) {
    return undefined;
  }
  return next;
}

function mergeWebdav(
  current: WebdavSettings | undefined,
  patch: WebdavSettingsDto,
): WebdavSettings | undefined {
  const next: WebdavSettings = {
    baseUrl: patch.baseUrl ?? current?.baseUrl ?? '',
    username: patch.username ?? current?.username ?? '',
    password: patch.password ?? current?.password ?? '',
    folder: patch.folder ?? current?.folder ?? 'alooshomal-backups',
  };
  if (!next.baseUrl || !next.username || !next.password) return undefined;
  return next;
}
