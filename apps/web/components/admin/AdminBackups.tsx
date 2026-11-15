'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  CloudUpload,
  Database,
  Download,
  HardDrive,
  Play,
  RefreshCw,
  Save,
  Server,
  Trash2,
  XCircle,
} from 'lucide-react';

import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface BackupManifest {
  id: string;
  createdAt: string;
  includeMedia: boolean;
  bucket: string;
  database: { file: string; bytes: number; sha256: string };
  media: { objectCount: number; bytes: number };
  destinations?: Partial<
    Record<string, { uploadedAt: string; location: string } | undefined>
  >;
}

interface BackupItem {
  name: string;
  size: number;
  createdAt: string;
  manifest: BackupManifest | null;
}

interface BackupJob {
  id: string;
  status: 'RUNNING' | 'DONE' | 'FAILED';
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

interface BackupsPayload {
  items: BackupItem[];
  jobs: BackupJob[];
  retention: number;
  storage: { dir: string; freeBytes: number | null; totalBytes: number | null };
}

interface DestinationView {
  configured: boolean;
  [key: string]: unknown;
}

interface BackupSettingsView {
  retention: number;
  googleDrive: DestinationView;
  s3: DestinationView;
  webdav: DestinationView;
}

type Destination = 'google-drive' | 's3' | 'webdav';

const DESTINATION_LABELS: Record<Destination, string> = {
  'google-drive': 'Google Drive',
  s3: 'مقصد S3',
  webdav: 'WebDAV',
};

function formatBytes(value: number | null | undefined): string {
  if (!value || value <= 0) return '۰';
  const units = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت', 'ترابایت'];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(value) / Math.log(1024)),
  );
  const amount = value / Math.pow(1024, exponent);
  return `${(exponent === 0 ? amount : Math.round(amount * 10) / 10).toLocaleString('fa-IR')} ${units[exponent]}`;
}

function faDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-bold text-ink">{label}</span>
      {children}
      {hint ? <span className="text-[10px] text-muted">{hint}</span> : null}
    </label>
  );
}

function DestinationCard({
  title,
  icon,
  configured,
  children,
  onSave,
  onTest,
  onRemove,
  busy,
}: {
  title: string;
  icon: React.ReactNode;
  configured: boolean;
  children: React.ReactNode;
  onSave: () => void;
  onTest: () => void;
  onRemove: () => void;
  busy: boolean;
}) {
  return (
    <section className="indeed-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
          {icon}
          {title}
        </h3>
        <span
          className={cn(
            'inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold',
            configured ? 'badge-open' : 'badge-progress',
          )}
        >
          {configured ? 'تنظیم‌شده' : 'تنظیم نشده'}
        </span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{children}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className="indeed-btn indeed-btn-primary py-1.5 text-xs"
        >
          <Save className="size-3.5" aria-hidden />
          ذخیره
        </button>
        <button
          type="button"
          onClick={onTest}
          disabled={busy || !configured}
          className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
        >
          آزمایش اتصال
        </button>
        {configured ? (
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            className="indeed-btn indeed-btn-secondary py-1.5 text-xs text-red-600"
          >
            حذف تنظیمات
          </button>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Admin «پشتیبان‌گیری» panel: create a full bundle (PostgreSQL dump + every
 * uploaded media file), download it, keep it on Google Drive / an S3-compatible
 * server / WebDAV, and read the exact restore steps.
 */
export function AdminBackups() {
  const [data, setData] = useState<BackupsPayload | null>(null);
  const [settings, setSettings] = useState<BackupSettingsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [includeMedia, setIncludeMedia] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [gdrive, setGdrive] = useState({
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    folderId: '',
  });
  const [s3, setS3] = useState({
    endpoint: '',
    port: '',
    useSSL: true,
    accessKey: '',
    secretKey: '',
    bucket: '',
    region: '',
    prefix: 'alooshomal-backups',
  });
  const [webdav, setWebdav] = useState({
    baseUrl: '',
    username: '',
    password: '',
    folder: 'alooshomal-backups',
  });

  const load = useCallback(async () => {
    try {
      const [payload, view] = await Promise.all([
        api.get<BackupsPayload>('/admin/backups'),
        api.get<BackupSettingsView>('/admin/backups/settings'),
      ]);
      setData(payload);
      setSettings(view);
      setGdrive((current) => ({
        ...current,
        folderId:
          current.folderId ||
          (view.googleDrive.configured
            ? String(view.googleDrive.folderId ?? '')
            : ''),
      }));
      setS3((current) => ({
        ...current,
        endpoint:
          current.endpoint ||
          (view.s3.configured ? String(view.s3.endpoint ?? '') : ''),
        port:
          current.port ||
          (view.s3.configured ? String(view.s3.port ?? '') : ''),
        useSSL: view.s3.configured ? Boolean(view.s3.useSSL) : current.useSSL,
        bucket:
          current.bucket ||
          (view.s3.configured ? String(view.s3.bucket ?? '') : ''),
        region:
          current.region ||
          (view.s3.configured ? String(view.s3.region ?? '') : ''),
        prefix: String(view.s3.prefix ?? current.prefix ?? 'alooshomal-backups'),
      }));
      setWebdav((current) => ({
        ...current,
        baseUrl:
          current.baseUrl ||
          (view.webdav.configured ? String(view.webdav.baseUrl ?? '') : ''),
        username:
          current.username ||
          (view.webdav.configured ? String(view.webdav.username ?? '') : ''),
        folder: String(view.webdav.folder ?? current.folder ?? 'alooshomal-backups'),
      }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری پشتیبان‌ها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);

  const running = data?.jobs.find((job) => job.status === 'RUNNING') ?? null;

  useEffect(() => {
    if (!running) return;
    timer.current = setTimeout(() => void load(), 1500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [running, data, load]);

  async function createBackup() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api.post('/admin/backups', { includeMedia });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'شروع پشتیبان‌گیری ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function download(name: string) {
    setError(null);
    try {
      await api.download(`/admin/backups/${name}/download`, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'دانلود ناموفق بود');
    }
  }

  async function remove(name: string) {
    if (!window.confirm(`حذف بسته‌ی «${name}»؟ این فایل از سرور پاک می‌شود.`)) return;
    setBusy(true);
    try {
      await api.delete(`/admin/backups/${name}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function upload(name: string, destination: Destination) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.post<{ location: string }>(
        `/admin/backups/${name}/destinations/${destination}`,
      );
      setMessage(
        `ارسال به ${DESTINATION_LABELS[destination]} انجام شد: ${result.location}`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function saveDestination(destination: Destination) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const body =
        destination === 'google-drive'
          ? {
              googleDrive: {
                ...(gdrive.clientId ? { clientId: gdrive.clientId } : {}),
                ...(gdrive.clientSecret
                  ? { clientSecret: gdrive.clientSecret }
                  : {}),
                ...(gdrive.refreshToken
                  ? { refreshToken: gdrive.refreshToken }
                  : {}),
                folderId: gdrive.folderId,
              },
            }
          : destination === 's3'
            ? {
                s3: {
                  ...(s3.endpoint ? { endpoint: s3.endpoint } : {}),
                  ...(s3.port ? { port: Number(s3.port) } : {}),
                  useSSL: s3.useSSL,
                  ...(s3.accessKey ? { accessKey: s3.accessKey } : {}),
                  ...(s3.secretKey ? { secretKey: s3.secretKey } : {}),
                  ...(s3.bucket ? { bucket: s3.bucket } : {}),
                  region: s3.region,
                  prefix: s3.prefix,
                },
              }
            : {
                webdav: {
                  ...(webdav.baseUrl ? { baseUrl: webdav.baseUrl } : {}),
                  ...(webdav.username ? { username: webdav.username } : {}),
                  ...(webdav.password ? { password: webdav.password } : {}),
                  folder: webdav.folder,
                },
              };
      const view = await api.put<BackupSettingsView>('/admin/backups/settings', body);
      setSettings(view);
      setMessage('تنظیمات مقصد ذخیره شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره تنظیمات ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function removeDestination(destination: Destination) {
    if (!window.confirm('تنظیمات این مقصد حذف شود؟')) return;
    setBusy(true);
    try {
      const body =
        destination === 'google-drive'
          ? { googleDrive: null }
          : destination === 's3'
            ? { s3: null }
            : { webdav: null };
      const view = await api.put<BackupSettingsView>('/admin/backups/settings', body);
      setSettings(view);
      setMessage('تنظیمات مقصد حذف شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف تنظیمات ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function testDestination(destination: Destination) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.post<{ message: string }>(
        `/admin/backups/test/${destination}`,
      );
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'آزمایش اتصال ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function saveRetention(value: number) {
    setBusy(true);
    try {
      const view = await api.put<BackupSettingsView>('/admin/backups/settings', {
        retention: value,
      });
      setSettings(view);
      setMessage('تعداد نگهداری بکاپ‌ها ذخیره شد.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="indeed-panel p-4">
          <p className="flex items-center gap-1 text-[11px] text-muted">
            <HardDrive className="size-3.5" aria-hidden />
            مسیر ذخیره
          </p>
          <b dir="ltr" className="mt-1 block truncate text-xs text-ink">
            {data?.storage.dir ?? '—'}
          </b>
        </div>
        <div className="indeed-panel p-4">
          <p className="text-[11px] text-muted">فضای آزاد</p>
          <b className="text-base text-ink">{formatBytes(data?.storage.freeBytes)}</b>
        </div>
        <div className="indeed-panel p-4">
          <p className="text-[11px] text-muted">تعداد بکاپ‌ها</p>
          <b className="text-base text-ink">
            {(data?.items.length ?? 0).toLocaleString('fa-IR')}
          </b>
        </div>
        <div className="indeed-panel p-4">
          <p className="text-[11px] text-muted">نگهداری (تعداد)</p>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={100}
              defaultValue={settings?.retention ?? 10}
              onBlur={(event) => {
                const value = Number(event.target.value);
                if (value && value !== settings?.retention) void saveRetention(value);
              }}
              className="indeed-input w-20 py-1 text-sm"
            />
            <span className="text-[10px] text-muted">بکاپ آخر نگه داشته می‌شود</span>
          </div>
        </div>
      </div>

      <section className="indeed-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <Archive className="size-4 text-brand" aria-hidden />
              ساخت بکاپ دستی
            </h3>
            <p className="mt-1 text-xs text-muted">
              دامپ کامل دیتابیس + تمام تصاویر و فایل‌های آپلودشده، همراه با
              اسکریپت بازیابی و فایل هش.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-ink">
              <input
                type="checkbox"
                checked={includeMedia}
                onChange={(event) => setIncludeMedia(event.target.checked)}
                className="size-4 accent-[var(--brand)]"
              />
              شامل رسانه‌ها
            </label>
            <button
              type="button"
              onClick={() => void createBackup()}
              disabled={busy || Boolean(running)}
              className="indeed-btn indeed-btn-primary py-2 text-sm"
            >
              <Play className="size-4" aria-hidden />
              شروع پشتیبان‌گیری
            </button>
          </div>
        </div>

        {running ? (
          <div className="mt-4 rounded-lg border border-[var(--vintage-border)] bg-white p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-ink">{running.phase}</span>
              <span className="text-muted">
                {running.progress.toLocaleString('fa-IR')}٪
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-soft">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${Math.min(100, running.progress)}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted">{running.message}</p>
          </div>
        ) : null}

        {data?.jobs.some((job) => job.status === 'FAILED') ? (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            آخرین عملیات ناموفق:{' '}
            {data.jobs.find((job) => job.status === 'FAILED')?.error ?? '—'}
          </p>
        ) : null}
      </section>

      <section className="indeed-panel overflow-hidden">
        <header className="flex items-center justify-between border-b-2 border-dashed border-[var(--vintage-accent-hover)] px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
            <Database className="size-4 text-brand" aria-hidden />
            بکاپ‌های موجود
          </h3>
          <button
            type="button"
            onClick={() => void load()}
            className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} aria-hidden />
            تازه‌سازی
          </button>
        </header>
        {loading && !data ? (
          <p className="p-6 text-center text-sm text-muted">در حال بارگذاری...</p>
        ) : (data?.items.length ?? 0) === 0 ? (
          <p className="p-6 text-center text-sm text-muted">
            هنوز بکاپی ساخته نشده است.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-right text-sm">
              <thead>
                <tr className="bg-[var(--vintage-surface)] text-xs text-muted">
                  <th className="px-3 py-2 font-bold">نام</th>
                  <th className="px-3 py-2 font-bold">تاریخ</th>
                  <th className="px-3 py-2 font-bold">حجم</th>
                  <th className="px-3 py-2 font-bold">محتوا</th>
                  <th className="px-3 py-2 font-bold">مقصدها</th>
                  <th className="px-3 py-2 font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((item) => (
                  <tr key={item.name} className="border-t border-[var(--vintage-border)]">
                    <td
                      dir="ltr"
                      className="px-3 py-2 text-right text-xs font-semibold text-ink"
                    >
                      {item.name}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">
                      {faDateTime(item.createdAt)}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">
                      {formatBytes(item.size)}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted">
                      {item.manifest
                        ? `${item.manifest.media.objectCount.toLocaleString('fa-IR')} فایل رسانه`
                        : 'نامشخص'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {(['google-drive', 's3', 'webdav'] as Destination[]).map(
                          (destination) =>
                            item.manifest?.destinations?.[destination] ? (
                              <span
                                key={destination}
                                title={
                                  item.manifest?.destinations?.[destination]?.location
                                }
                                className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700"
                              >
                                {DESTINATION_LABELS[destination]}
                              </span>
                            ) : null,
                        )}
                        {!item.manifest?.destinations ||
                        Object.keys(item.manifest.destinations).length === 0 ? (
                          <span className="text-[10px] text-muted">—</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void download(item.name)}
                          title="دانلود روی سیستم"
                          className="flex size-7 items-center justify-center rounded-md border border-[var(--vintage-border)] bg-white text-brand hover:bg-soft"
                        >
                          <Download className="size-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => void upload(item.name, 'google-drive')}
                          disabled={busy || !settings?.googleDrive.configured}
                          title="ارسال به Google Drive"
                          className="flex size-7 items-center justify-center rounded-md border border-[var(--vintage-border)] bg-white text-muted hover:bg-soft disabled:opacity-40"
                        >
                          <CloudUpload className="size-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => void upload(item.name, 's3')}
                          disabled={busy || !settings?.s3.configured}
                          title="ارسال به مقصد S3"
                          className="flex size-7 items-center justify-center rounded-md border border-[var(--vintage-border)] bg-white text-muted hover:bg-soft disabled:opacity-40"
                        >
                          <Server className="size-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => void upload(item.name, 'webdav')}
                          disabled={busy || !settings?.webdav.configured}
                          title="ارسال به WebDAV"
                          className="flex size-7 items-center justify-center rounded-md border border-[var(--vintage-border)] bg-white text-muted hover:bg-soft disabled:opacity-40"
                        >
                          <Archive className="size-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(item.name)}
                          disabled={busy}
                          title="حذف"
                          className="flex size-7 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {error ? (
        <p className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <DestinationCard
          title="Google Drive"
          icon={<CloudUpload className="size-4 text-brand" aria-hidden />}
          configured={Boolean(settings?.googleDrive.configured)}
          busy={busy}
          onSave={() => void saveDestination('google-drive')}
          onTest={() => void testDestination('google-drive')}
          onRemove={() => void removeDestination('google-drive')}
        >
          <Field label="Client ID">
            <input
              dir="ltr"
              value={gdrive.clientId}
              onChange={(event) =>
                setGdrive((current) => ({ ...current, clientId: event.target.value }))
              }
              placeholder={
                settings?.googleDrive.configured
                  ? String(settings.googleDrive.clientId ?? '')
                  : ''
              }
              className="indeed-input py-1.5 text-xs"
            />
          </Field>
          <Field label="Client Secret" hint="خالی = بدون تغییر">
            <input
              dir="ltr"
              type="password"
              value={gdrive.clientSecret}
              onChange={(event) =>
                setGdrive((current) => ({
                  ...current,
                  clientSecret: event.target.value,
                }))
              }
              className="indeed-input py-1.5 text-xs"
            />
          </Field>
          <Field label="Refresh Token" hint="خالی = بدون تغییر">
            <input
              dir="ltr"
              type="password"
              value={gdrive.refreshToken}
              onChange={(event) =>
                setGdrive((current) => ({
                  ...current,
                  refreshToken: event.target.value,
                }))
              }
              className="indeed-input py-1.5 text-xs"
            />
          </Field>
          <Field label="شناسه پوشه (اختیاری)">
            <input
              dir="ltr"
              value={gdrive.folderId}
              onChange={(event) =>
                setGdrive((current) => ({ ...current, folderId: event.target.value }))
              }
              className="indeed-input py-1.5 text-xs"
            />
          </Field>
        </DestinationCard>

        <DestinationCard
          title="سرور S3 / MinIO"
          icon={<Server className="size-4 text-brand" aria-hidden />}
          configured={Boolean(settings?.s3.configured)}
          busy={busy}
          onSave={() => void saveDestination('s3')}
          onTest={() => void testDestination('s3')}
          onRemove={() => void removeDestination('s3')}
        >
          <Field label="Endpoint">
            <input
              dir="ltr"
              value={s3.endpoint}
              onChange={(event) =>
                setS3((current) => ({ ...current, endpoint: event.target.value }))
              }
              placeholder="s3.example.com"
              className="indeed-input py-1.5 text-xs"
            />
          </Field>
          <Field label="Port">
            <input
              dir="ltr"
              value={s3.port}
              onChange={(event) =>
                setS3((current) => ({ ...current, port: event.target.value }))
              }
              placeholder="443"
              className="indeed-input py-1.5 text-xs"
            />
          </Field>
          <Field label="Access Key">
            <input
              dir="ltr"
              value={s3.accessKey}
              onChange={(event) =>
                setS3((current) => ({ ...current, accessKey: event.target.value }))
              }
              placeholder={
                settings?.s3.configured ? String(settings.s3.accessKey ?? '') : ''
              }
              className="indeed-input py-1.5 text-xs"
            />
          </Field>
          <Field label="Secret Key" hint="خالی = بدون تغییر">
            <input
              dir="ltr"
              type="password"
              value={s3.secretKey}
              onChange={(event) =>
                setS3((current) => ({ ...current, secretKey: event.target.value }))
              }
              className="indeed-input py-1.5 text-xs"
            />
          </Field>
          <Field label="Bucket">
            <input
              dir="ltr"
              value={s3.bucket}
              onChange={(event) =>
                setS3((current) => ({ ...current, bucket: event.target.value }))
              }
              className="indeed-input py-1.5 text-xs"
            />
          </Field>
          <Field label="Region (اختیاری)">
            <input
              dir="ltr"
              value={s3.region}
              onChange={(event) =>
                setS3((current) => ({ ...current, region: event.target.value }))
              }
              className="indeed-input py-1.5 text-xs"
            />
          </Field>
          <Field label="پیشوند کلید">
            <input
              dir="ltr"
              value={s3.prefix}
              onChange={(event) =>
                setS3((current) => ({ ...current, prefix: event.target.value }))
              }
              className="indeed-input py-1.5 text-xs"
            />
          </Field>
          <label className="flex items-center gap-2 self-end text-xs font-bold text-ink">
            <input
              type="checkbox"
              checked={s3.useSSL}
              onChange={(event) =>
                setS3((current) => ({ ...current, useSSL: event.target.checked }))
              }
              className="size-4 accent-[var(--brand)]"
            />
            اتصال امن (HTTPS)
          </label>
        </DestinationCard>

        <DestinationCard
          title="WebDAV (Nextcloud)"
          icon={<Archive className="size-4 text-brand" aria-hidden />}
          configured={Boolean(settings?.webdav.configured)}
          busy={busy}
          onSave={() => void saveDestination('webdav')}
          onTest={() => void testDestination('webdav')}
          onRemove={() => void removeDestination('webdav')}
        >
          <Field
            label="آدرس پایه"
            hint="مثال: https://cloud.example.com/remote.php/dav/files/user"
          >
            <input
              dir="ltr"
              value={webdav.baseUrl}
              onChange={(event) =>
                setWebdav((current) => ({ ...current, baseUrl: event.target.value }))
              }
              className="indeed-input py-1.5 text-xs"
            />
          </Field>
          <Field label="نام کاربری">
            <input
              dir="ltr"
              value={webdav.username}
              onChange={(event) =>
                setWebdav((current) => ({ ...current, username: event.target.value }))
              }
              className="indeed-input py-1.5 text-xs"
            />
          </Field>
          <Field label="گذرواژه" hint="خالی = بدون تغییر">
            <input
              dir="ltr"
              type="password"
              value={webdav.password}
              onChange={(event) =>
                setWebdav((current) => ({ ...current, password: event.target.value }))
              }
              className="indeed-input py-1.5 text-xs"
            />
          </Field>
          <Field label="پوشه">
            <input
              dir="ltr"
              value={webdav.folder}
              onChange={(event) =>
                setWebdav((current) => ({ ...current, folder: event.target.value }))
              }
              className="indeed-input py-1.5 text-xs"
            />
          </Field>
        </DestinationCard>
      </div>

      <section className="indeed-panel p-4">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <Database className="size-4 text-brand" aria-hidden />
          بازیابی (Restore)
        </h3>
        <p className="mt-1 text-xs text-muted">
          هر بسته شامل <code>db.sql.gz</code>، پوشه‌ی <code>media</code>، فایل{' '}
          <code>manifest.json</code>، <code>SHA256SUMS</code> و اسکریپت{' '}
          <code>restore.sh</code> است. برای بازیابی، بسته را روی سرور مقصد کنار{' '}
          <code>docker-compose.yml</code> باز کنید و اجرا کنید:
        </p>
        <pre
          dir="ltr"
          className="mt-2 overflow-x-auto rounded-lg bg-[var(--vintage-surface)] p-3 text-left text-[11px] text-ink"
        >
          {RESTORE_COMMANDS}
        </pre>
        <p className="mt-2 text-[11px] text-muted">
          بازیابی، دیتابیس فعلی را با نسخه‌ی بسته جایگزین می‌کند و رسانه‌های
          هم‌نام را بازنویسی می‌کند؛ پیش از اجرا یک بکاپ تازه بگیرید.
        </p>
      </section>
    </div>
  );
}

const RESTORE_COMMANDS = `tar -xzf alooshomal_YYYYMMDD-HHMMSS.tar.gz -C ./restore-bundle
cd ./restore-bundle
sha256sum -c SHA256SUMS
FORCE=1 ./restore.sh
docker restart alooshomal-api`;

