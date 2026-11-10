'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';

import { api, type UploadResult } from '@/lib/api';

interface Props {
  label?: string;
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}

/**
 * Multi-image uploader for the business gallery. Each pick uploads through
 * `/uploads/gallery` (WebP conversion) and appends the returned public URL.
 */
export function GalleryUpload({
  label = 'گالری تصاویر کسب‌وکار',
  value,
  onChange,
  max = 12,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = Math.max(0, max - value.length);
    const list = Array.from(files).slice(0, remaining);
    if (list.length === 0) return;
    setBusy(true);
    setError(null);
    const uploaded: string[] = [];
    try {
      for (const file of list) {
        const form = new FormData();
        form.append('file', file);
        const result = await api.upload<UploadResult>('/uploads/gallery', form);
        uploaded.push(result.url);
      }
      onChange([...value, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'آپلود تصویر ناموفق بود');
      if (uploaded.length > 0) onChange([...value, ...uploaded]);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-ink">{label}</span>
        <span className="text-[11px] text-muted">
          {value.length} از {max} تصویر
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {value.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="group relative size-20 overflow-hidden rounded-lg border border-[var(--vintage-border)] bg-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`گالری ${index + 1}`} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, position) => position !== index))}
              aria-label="حذف تصویر"
              className="absolute left-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        ))}
        {value.length < max ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[var(--vintage-border)] text-xs text-muted hover:border-brand hover:text-brand disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="size-5" aria-hidden />
            )}
            {busy ? 'آپلود…' : 'افزودن'}
          </button>
        ) : null}
      </div>
      <span className="text-[11px] text-muted">
        PNG/JPG/WebP — حداکثر ۲ مگابایت برای هر تصویر.
      </span>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => void pick(event.target.files)}
      />
    </div>
  );
}
