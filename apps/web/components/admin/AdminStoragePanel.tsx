'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Database,
  FolderTree,
  HardDrive,
  Image as ImageIcon,
  RefreshCw,
  Server,
} from 'lucide-react';

import { api } from '@/lib/api';

interface StorageFolderUsage {
  folder: string;
  label: string;
  count: number;
  bytes: number;
}

interface StorageUsage {
  enabled: boolean;
  bucket: string;
  endpoint: string;
  publicBaseUrl: string;
  dataDir: string;
  objectCount: number;
  totalBytes: number;
  folders: StorageFolderUsage[];
}

interface DiskStats {
  path: string;
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
}

interface StoragePayload {
  storage: StorageUsage;
  disk: DiskStats | null;
}

const PALETTE = [
  '#8b3a1a',
  '#a95c39',
  '#c98a5b',
  '#e0b184',
  '#6b8e6b',
  '#7a6b9e',
  '#b5657a',
];

/** Human-readable byte size with a Persian-friendly unit. */
function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '۰';
  const units = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت', 'ترابایت'];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / Math.pow(1024, exponent);
  const rounded = exponent === 0 ? value : Math.round(value * 10) / 10;
  return `${rounded.toLocaleString('fa-IR')} ${units[exponent]}`;
}

function formatCount(value: number): string {
  return value.toLocaleString('fa-IR');
}

/**
 * Admin panel that visualises where uploaded media lives: total bytes stored in
 * the object-storage bucket, a per-folder breakdown, the bucket's physical path
 * on the server, and the server disk's total / used / free space.
 */
export function AdminStoragePanel() {
  const [data, setData] = useState<StoragePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<StoragePayload>('/admin/storage');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری وضعیت سرور');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="indeed-panel p-6 text-center text-sm text-muted">
        در حال خواندن وضعیت ذخیره‌سازی و دیسک سرور...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="indeed-panel p-6">
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        <button
          onClick={() => void load()}
          className="indeed-btn indeed-btn-secondary mt-3 py-2 text-sm"
        >
          <RefreshCw className="size-4" aria-hidden />
          تلاش مجدد
        </button>
      </div>
    );
  }

  const storage = data?.storage;
  const disk = data?.disk;
  const folders = storage?.folders ?? [];
  const storageTotal = Math.max(1, storage?.totalBytes ?? 0);

  const diskUsedPct =
    disk && disk.totalBytes > 0
      ? Math.min(100, (disk.usedBytes / disk.totalBytes) * 100)
      : 0;
  const diskWarn = diskUsedPct >= 85;
  const diskCritical = diskUsedPct >= 95;
  const diskColor = diskCritical ? '#b91c1c' : diskWarn ? '#d97706' : '#8b3a1a';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Server className="size-4" aria-hidden />
          <span dir="ltr">{storage?.endpoint ?? '—'}</span>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="indeed-btn indeed-btn-secondary py-2 text-sm disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
          به‌روزرسانی
        </button>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {storage && !storage.enabled ? (
        <div className="indeed-panel flex items-start gap-3 p-4 text-sm text-amber-700">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>
            سرویس ذخیره‌سازی تصاویر غیرفعال است
            (<code dir="ltr">MINIO_ENABLED=false</code>)؛ آمار باکت در دسترس نیست.
          </p>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={ImageIcon}
          label="حجم کل آپلودها"
          value={formatBytes(storage?.totalBytes ?? 0)}
        />
        <StatTile
          icon={FolderTree}
          label="تعداد فایل‌ها"
          value={formatCount(storage?.objectCount ?? 0)}
        />
        <StatTile
          icon={HardDrive}
          label="کل هارد سرور"
          value={disk ? formatBytes(disk.totalBytes) : '—'}
        />
        <StatTile
          icon={Database}
          label="فضای خالی سرور"
          value={disk ? formatBytes(disk.freeBytes) : '—'}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="indeed-panel p-5">
          <div className="flex items-center gap-2">
            <HardDrive className="size-5 text-brand" aria-hidden />
            <h3 className="text-sm font-extrabold text-ink">فضای هارد دیسک سرور</h3>
          </div>
          <p className="mt-1 text-xs text-muted">
            ظرفیت کل، مصرف‌شده و فضای خالی دیسکی که سرویس API روی آن اجرا می‌شود
            {disk ? ` (${disk.path})` : ''}.
          </p>

          {disk ? (
            <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row">
              <DonutGauge
                usedPct={diskUsedPct}
                color={diskColor}
                centerTop={`${Math.round(diskUsedPct).toLocaleString('fa-IR')}٪`}
                centerBottom="مصرف‌شده"
              />
              <div className="w-full flex-1">
                <UsageBar usedPct={diskUsedPct} color={diskColor} trackColor="#e7d9c7" />
                <ul className="mt-4 flex flex-col gap-2 text-sm">
                  <li className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted">
                      <span className="size-3 rounded-sm" style={{ background: diskColor }} />
                      مصرف‌شده
                    </span>
                    <b className="text-ink">{formatBytes(disk.usedBytes)}</b>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted">
                      <span className="size-3 rounded-sm bg-[#e7d9c7]" />
                      خالی
                    </span>
                    <b className="text-ink">{formatBytes(disk.freeBytes)}</b>
                  </li>
                  <li className="flex items-center justify-between border-t border-[var(--vintage-border)] pt-2">
                    <span className="text-muted">ظرفیت کل</span>
                    <b className="text-ink">{formatBytes(disk.totalBytes)}</b>
                  </li>
                </ul>
                {diskWarn ? (
                  <p
                    className={`mt-3 flex items-center gap-2 rounded-lg p-2 text-xs ${
                      diskCritical ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    <AlertTriangle className="size-4 shrink-0" aria-hidden />
                    {diskCritical
                      ? 'فضای دیسک سرور تقریباً پر است — فوراً فضای آزاد کنید.'
                      : 'فضای دیسک سرور در حال پر شدن است؛ پاک‌سازی/افزایش فضا را بررسی کنید.'}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">آمار دیسک در دسترس نیست.</p>
          )}
        </div>

        <div className="indeed-panel p-5">
          <div className="flex items-center gap-2">
            <FolderTree className="size-5 text-brand" aria-hidden />
            <h3 className="text-sm font-extrabold text-ink">ریشه‌ی آپلود (باکت)</h3>
          </div>
          <p className="mt-1 text-xs text-muted">
            محل ذخیره‌ی تصاویر آپلودی و مسیر فیزیکی آن روی سرور.
          </p>
          <ul className="mt-4 flex flex-col gap-3 text-sm">
            <li className="flex flex-col gap-0.5 border-b border-[var(--vintage-border)] pb-2">
              <span className="text-xs text-muted">نام باکت</span>
              <b dir="ltr" className="truncate text-ink">
                {storage?.bucket ?? '—'}
              </b>
            </li>
            <li className="flex flex-col gap-0.5 border-b border-[var(--vintage-border)] pb-2">
              <span className="text-xs text-muted">آدرس عمومی رسانه</span>
              <b dir="ltr" className="truncate text-ink">
                {storage?.publicBaseUrl ?? '—'}
              </b>
            </li>
            <li className="flex flex-col gap-0.5">
              <span className="text-xs text-muted">مسیر فیزیکی روی سرور</span>
              <b dir="ltr" className="truncate text-ink" title={storage?.dataDir}>
                {storage?.dataDir ?? '—'}
              </b>
            </li>
          </ul>
        </div>
      </div>

      <div className="indeed-panel p-5">
        <div className="flex items-center gap-2">
          <ImageIcon className="size-5 text-brand" aria-hidden />
          <h3 className="text-sm font-extrabold text-ink">
            تفکیک حجم آپلودها بر اساس پوشه
          </h3>
        </div>
        <p className="mt-1 text-xs text-muted">
          مجموع حجم و تعداد فایل‌های هر دسته از تصاویر (لوگو، تصویر پروفایل و ...).
        </p>

        {folders.length === 0 ? (
          <p className="mt-4 text-sm text-muted">هنوز تصویری آپلود نشده است.</p>
        ) : (
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
            <div className="flex flex-col items-center justify-center gap-4">
              <DonutGauge
                usedPct={100}
                color="#8b3a1a"
                centerTop={formatBytes(storage?.totalBytes ?? 0)}
                centerBottom="کل آپلودها"
                segments={folders.map((folder, index) => ({
                  value: folder.bytes,
                  color: PALETTE[index % PALETTE.length],
                }))}
              />
            </div>

            <ul className="flex flex-col gap-4">
              {folders.map((folder, index) => {
                const share = (folder.bytes / storageTotal) * 100;
                const color = PALETTE[index % PALETTE.length];
                return (
                  <li key={folder.folder}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-semibold text-ink">
                        <span className="size-3 rounded-sm" style={{ background: color }} />
                        {folder.label}
                        <span dir="ltr" className="text-[11px] font-normal text-muted">
                          {folder.folder}
                        </span>
                      </span>
                      <span className="text-muted">
                        {formatBytes(folder.bytes)}
                        <span className="mr-2 text-[11px]">
                          ({formatCount(folder.count)} فایل)
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <UsageBar usedPct={share} color={color} trackColor="#efe4d5" />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof HardDrive;
  label: string;
  value: string;
}) {
  return (
    <div className="indeed-panel flex items-center gap-3.5 p-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--vintage-border)] bg-brand-light text-brand">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-lg font-extrabold text-ink">{value}</p>
      </div>
    </div>
  );
}

/** Horizontal progress bar (0–100). */
function UsageBar({
  usedPct,
  color,
  trackColor,
}: {
  usedPct: number;
  color: string;
  trackColor: string;
}) {
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full"
      style={{ background: trackColor }}
      role="progressbar"
      aria-valuenow={Math.round(usedPct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, usedPct))}%`, background: color }}
      />
    </div>
  );
}

/** SVG donut chart; when `segments` is given it draws a multi-slice ring. */
function DonutGauge({
  usedPct,
  color,
  centerTop,
  centerBottom,
  segments,
}: {
  usedPct: number;
  color: string;
  centerTop: string;
  centerBottom: string;
  segments?: Array<{ value: number; color: string }>;
}) {
  const size = 168;
  const stroke = 20;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const total = segments?.reduce((sum, item) => sum + item.value, 0) ?? 0;
  const arcs: Array<{ color: string; dash: number; offset: number }> = [];
  if (segments && total > 0) {
    let offset = 0;
    for (const segment of segments) {
      const length = (segment.value / total) * circumference;
      arcs.push({ color: segment.color, dash: length, offset });
      offset += length;
    }
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        width={size}
        height={size}
        role="img"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e7d9c7"
          strokeWidth={stroke}
        />
        {arcs.length > 0
          ? arcs.map((arc, index) => (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={stroke}
                strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
                strokeDashoffset={-arc.offset}
              />
            ))
          : (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${(Math.min(100, Math.max(0, usedPct)) / 100) * circumference} ${circumference}`}
            />
          )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-base font-extrabold text-ink">{centerTop}</span>
        <span className="mt-0.5 text-[11px] text-muted">{centerBottom}</span>
      </div>
    </div>
  );
}
