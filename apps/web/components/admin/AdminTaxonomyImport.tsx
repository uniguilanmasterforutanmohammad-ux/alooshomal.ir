'use client';

import { useRef, useState } from 'react';
import { Download, Loader2, Upload } from 'lucide-react';

import { api } from '@/lib/api';
import { fa } from '@/lib/jalali';

interface CityImportResult {
  citiesCreated: number;
  neighborhoodsCreated: number;
  skipped: number;
  errors: string[];
}

interface BusinessImportResult {
  categoriesCreated: number;
  subCategoriesCreated: number;
  subSubCategoriesCreated: number;
  skipped: number;
  errors: string[];
}

type Kind = 'cities' | 'businesses';

/**
 * «ایمپورت شهرها و محله‌ها / مشاغل» — two independent upload boxes in the
 * «شهرها و کسب‌وکارها» settings section. Each file is idempotent (existing
 * names are reused), and the current taxonomy can be downloaded in the same
 * CSV format to edit and re-import.
 */
export function AdminTaxonomyImport() {
  const cityFileRef = useRef<HTMLInputElement>(null);
  const businessFileRef = useRef<HTMLInputElement>(null);
  const [citiesBusy, setCitiesBusy] = useState(false);
  const [businessesBusy, setBusinessesBusy] = useState(false);
  const [citiesMessage, setCitiesMessage] = useState<string | null>(null);
  const [businessesMessage, setBusinessesMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function importFile(kind: Kind) {
    const input = kind === 'cities' ? cityFileRef.current : businessFileRef.current;
    const file = input?.files?.[0];
    if (!file) {
      setError('ابتدا فایل CSV یا Excel را انتخاب کنید');
      return;
    }
    setError(null);
    if (kind === 'cities') {
      setCitiesBusy(true);
      setCitiesMessage(null);
    } else {
      setBusinessesBusy(true);
      setBusinessesMessage(null);
    }
    try {
      const form = new FormData();
      form.append('file', file);
      if (kind === 'cities') {
        const result = await api.upload<CityImportResult>(
          '/admin/taxonomy/import/cities',
          form,
        );
        setCitiesMessage(
          `${fa(result.citiesCreated)} شهر و ${fa(result.neighborhoodsCreated)} محله اضافه شد` +
            (result.skipped ? `؛ ${fa(result.skipped)} ردیف رد شد.` : '.'),
        );
        if (result.errors.length) setError(result.errors.join(' | '));
      } else {
        const result = await api.upload<BusinessImportResult>(
          '/admin/taxonomy/import/businesses',
          form,
        );
        setBusinessesMessage(
          `${fa(result.categoriesCreated)} دسته، ${fa(result.subCategoriesCreated)} زیردسته و ${fa(result.subSubCategoriesCreated)} زیرشاخه اضافه شد` +
            (result.skipped ? `؛ ${fa(result.skipped)} ردیف رد شد.` : '.'),
        );
        if (result.errors.length) setError(result.errors.join(' | '));
      }
      if (input) input.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ایمپورت ناموفق بود');
    } finally {
      if (kind === 'cities') setCitiesBusy(false);
      else setBusinessesBusy(false);
    }
  }

  async function download(kind: Kind) {
    setError(null);
    try {
      await api.download(
        kind === 'cities'
          ? '/admin/taxonomy/export/cities'
          : '/admin/taxonomy/export/businesses',
        kind === 'cities' ? 'cities-neighborhoods.csv' : 'business-taxonomy.csv',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'دانلود فایل ناموفق بود');
    }
  }

  return (
    <div className="indeed-panel p-5">
      <div>
        <h3 className="text-base font-extrabold text-ink">ایمپورت شهرها و مشاغل</h3>
        <p className="mt-1 text-xs text-muted">
          دو فایل مستقل: یکی برای شهرها و محله‌ها و یکی برای مشاغل (دسته اصلی +
          زیردسته + زیرشاخه). هر دو CSV یا Excel قبول می‌کنند، تکراری نمی‌سازند و
          فایل «فعلی» را می‌توانید دانلود، ویرایش و دوباره ایمپورت کنید.
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--vintage-border)] bg-white p-4">
          <p className="text-sm font-extrabold text-ink">شهرها و محله‌ها</p>
          <p className="mt-1 text-xs text-muted">
            ستون‌ها: «شهر» و «محله». برای شهری بدون محله، ستون محله را خالی
            بگذارید. اگر شهری در فایل باشد و در سایت نباشد، ساخته می‌شود.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-bold text-muted">
              فایل
              <input
                ref={cityFileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-1.5 text-xs text-ink file:me-2 file:rounded-md file:border-0 file:bg-soft file:px-2 file:py-1 file:text-xs file:font-bold"
              />
            </label>
            <button
              type="button"
              onClick={() => void importFile('cities')}
              disabled={citiesBusy}
              className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
            >
              {citiesBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="size-4" aria-hidden />
              )}
              ایمپورت
            </button>
            <button
              type="button"
              onClick={() => void download('cities')}
              className="indeed-btn indeed-btn-secondary py-2 text-xs"
            >
              <Download className="size-4" aria-hidden />
              دانلود فایل فعلی
            </button>
          </div>
          {citiesMessage ? (
            <p className="mt-3 rounded-lg bg-green-50 p-2 text-xs text-green-700">
              {citiesMessage}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-[var(--vintage-border)] bg-white p-4">
          <p className="text-sm font-extrabold text-ink">مشاغل</p>
          <p className="mt-1 text-xs text-muted">
            ستون‌ها: «کسب و کار»، «زیردسته»، «زیرشاخه». ردیف می‌تواند فقط تا
            زیردسته برود (زیرشاخه خالی). دسته‌های تازه ساخته می‌شوند.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-bold text-muted">
              فایل
              <input
                ref={businessFileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-1.5 text-xs text-ink file:me-2 file:rounded-md file:border-0 file:bg-soft file:px-2 file:py-1 file:text-xs file:font-bold"
              />
            </label>
            <button
              type="button"
              onClick={() => void importFile('businesses')}
              disabled={businessesBusy}
              className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
            >
              {businessesBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="size-4" aria-hidden />
              )}
              ایمپورت
            </button>
            <button
              type="button"
              onClick={() => void download('businesses')}
              className="indeed-btn indeed-btn-secondary py-2 text-xs"
            >
              <Download className="size-4" aria-hidden />
              دانلود فایل فعلی
            </button>
          </div>
          {businessesMessage ? (
            <p className="mt-3 rounded-lg bg-green-50 p-2 text-xs text-green-700">
              {businessesMessage}
            </p>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
