'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';

import { api, type UploadResult } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  /** which backend folder/category to store the file under */
  kind: 'logo' | 'avatar';
  value: string;
  onChange: (url: string) => void;
  /** square (avatar) vs free (logo) preview */
  round?: boolean;
  hint?: string;
  className?: string;
}

/**
 * Reusable image uploader. Sends the picked file to `/uploads/<kind>`, which
 * converts it to WebP, resizes it and stores it under a per-category folder in
 * object storage; the returned public URL is what the form persists.
 */
export function ImageUpload({
  label,
  kind,
  value,
  onChange,
  round,
  hint,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const result = await api.upload<UploadResult>(`/uploads/${kind}`, form);
      onChange(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'آپلود تصویر ناموفق بود');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="text-sm font-bold text-ink">{label}</span>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex size-16 shrink-0 items-center justify-center overflow-hidden border border-[var(--vintage-border)] bg-white',
            round ? 'rounded-full' : 'rounded-lg',
          )}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-6 text-muted" aria-hidden />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="indeed-btn indeed-btn-secondary py-1.5 text-xs disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <ImagePlus className="size-3.5" aria-hidden />
              )}
              {busy ? 'در حال آپلود...' : 'انتخاب تصویر'}
            </button>
            {value ? (
              <button
                type="button"
                onClick={() => onChange('')}
                disabled={busy}
                className="indeed-btn flex items-center gap-1 border border-red-200 bg-red-50 py-1.5 text-xs text-red-600 hover:bg-red-100 disabled:opacity-60"
              >
                <X className="size-3.5" aria-hidden />
                حذف
              </button>
            ) : null}
          </div>
          <span className="text-[11px] text-muted">
            {hint ?? 'PNG/JPG/WebP — حداکثر ۲ مگابایت (به‌صورت خودکار WebP می‌شود)'}
          </span>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => void pick(event.target.files?.[0])}
      />

      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
