'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  BedDouble,
  Loader2,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';

import { AccommodationForm, type AccommodationFormValues } from '@/components/business/AccommodationForm';
import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import {
  api,
  type AccommodationAiImportEstimate,
  type AccommodationAiImportResult,
  type AccommodationProperty,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { useFeatures } from '@/lib/features';
import { toast } from '@/lib/toast';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  PUBLISHED: 'منتشرشده',
  PAUSED: 'متوقف',
};

export default function AccommodationsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const features = useFeatures();
  const { workspace } = useBusinessWorkspace(enabled);
  const [items, setItems] = useState<AccommodationProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAi, setShowAi] = useState(false);
  const [aiUrl, setAiUrl] = useState('');
  const [aiStatus, setAiStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [aiEstimate, setAiEstimate] =
    useState<AccommodationAiImportEstimate | null>(null);
  const [aiBusy, setAiBusy] = useState<'estimate' | 'import' | null>(null);
  const [aiResult, setAiResult] =
    useState<AccommodationAiImportResult | null>(null);
  const aiImportVisible = features.isFeatureVisible(
    'featureAccommodationAiImport',
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.get<AccommodationProperty[]>('/accommodations'));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بارگذاری اقامتگاه‌ها ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/accommodations');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  async function create(values: AccommodationFormValues) {
    setSubmitting(true);
    try {
      await api.post('/accommodations', values);
      toast.success('اقامتگاه ثبت شد');
      setShowForm(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  function openAi() {
    setAiUrl('');
    setAiEstimate(null);
    setAiResult(null);
    setAiStatus('DRAFT');
    setShowAi(true);
  }

  async function estimateAi() {
    const url = aiUrl.trim();
    if (!url) {
      toast.error('لینک اقامتگاه جاباما را وارد کنید.');
      return;
    }
    setAiBusy('estimate');
    setAiResult(null);
    try {
      const result = await api.post<AccommodationAiImportEstimate>(
        '/accommodations/ai-import/estimate',
        { url },
      );
      setAiEstimate(result);
    } catch {
      // API client already surfaced the error
    } finally {
      setAiBusy(null);
    }
  }

  async function runAiImport() {
    if (!aiEstimate) return;
    setAiBusy('import');
    try {
      const result = await api.post<AccommodationAiImportResult>(
        '/accommodations/ai-import',
        { url: aiEstimate.url, status: aiStatus },
      );
      setAiResult(result);
      setAiEstimate(null);
      toast.success('اقامتگاه با هوش مصنوعی ساخته شد');
      await load();
    } catch {
      // API client already surfaced the error
    } finally {
      setAiBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">اقامتگاه‌های من</h1>
          <p className="mt-1 text-sm text-muted">
            واحدهای اجاره‌ای خود را ثبت کنید، عکس اضافه کنید و برای رزرو منتشر کنید.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/stay" className="indeed-btn">
            دایرکتوری عمومی
          </Link>
          {aiImportVisible ? (
            <button type="button" onClick={openAi} className="indeed-btn">
              <Sparkles className="size-4" aria-hidden />
              ورود خودکار از جاباما
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            className="indeed-btn indeed-btn-primary"
          >
            <Plus className="size-4" aria-hidden />
            {showForm ? 'بستن فرم' : 'اقامتگاه جدید'}
          </button>
        </div>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      {showAi ? (
        <section className="indeed-panel flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink">
                <Sparkles className="size-5 text-brand" aria-hidden />
                ورود خودکار اقامتگاه از جاباما
              </h2>
              <p className="mt-1 text-xs leading-6 text-muted">
                لینک صفحه‌ی اقامتگاه در جاباما را بچسبانید. ابتدا برآورد توکن و
                هزینه نمایش داده می‌شود و پس از تأیید شما، اقامتگاه همراه
                تصاویر، امکانات، قوانین و موقعیت مکانی ساخته می‌شود.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAi(false);
                setAiEstimate(null);
                setAiResult(null);
              }}
              className="rounded-full p-1 text-muted hover:bg-[var(--vintage-paper)]"
              aria-label="بستن"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            لینک اقامتگاه جاباما
            <input
              className="w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              dir="ltr"
              value={aiUrl}
              onChange={(event) => {
                setAiUrl(event.target.value);
                setAiEstimate(null);
              }}
              placeholder="https://www.jabama.com/stay/cottage-..."
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-bold text-muted sm:max-w-xs">
            وضعیت پس از ایمپورت
            <select
              className="w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              value={aiStatus}
              onChange={(event) =>
                setAiStatus(event.target.value as 'DRAFT' | 'PUBLISHED')
              }
            >
              <option value="DRAFT">پیش‌نویس (بازبینی قبل از انتشار)</option>
              <option value="PUBLISHED">منتشرشده</option>
            </select>
          </label>

          {aiEstimate ? (
            <div className="rounded-xl border border-[var(--vintage-border)] bg-[var(--vintage-paper)] p-4 text-sm">
              {aiEstimate.sourceTitle ? (
                <p className="mb-2 font-bold text-ink">{aiEstimate.sourceTitle}</p>
              ) : null}
              <div className="grid gap-2 text-xs text-muted sm:grid-cols-3">
                <span>
                  توکن برآوردی:{' '}
                  <b className="text-ink">
                    {aiEstimate.estimatedTokens.toLocaleString('fa-IR')}
                  </b>
                </span>
                <span>
                  نرخ هر ۱۰۰۰ توکن:{' '}
                  <b className="text-ink">
                    {aiEstimate.pricePer1k.toLocaleString('fa-IR')} تومان
                  </b>
                </span>
                <span>
                  هزینه‌ی برآوردی:{' '}
                  <b className="text-brand">
                    {aiEstimate.price.toLocaleString('fa-IR')} تومان
                  </b>
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-muted">
                مبلغ برآوردی از کیف پول شما کسر می‌شود؛ هزینه‌ی نهایی بر اساس
                توکن مصرف‌شده‌ی واقعی محاسبه و در گزارش پرداخت‌ها ثبت می‌شود.
              </p>
            </div>
          ) : null}

          {aiResult ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-bold">
                اقامتگاه «{aiResult.property.title}» ساخته شد.
              </p>
              <p className="mt-1 text-xs">
                {aiResult.images.toLocaleString('fa-IR')} تصویر ذخیره شد • توکن
                مصرف‌شده: {aiResult.usage.totalTokens.toLocaleString('fa-IR')} •
                هزینه: {aiResult.cost.toLocaleString('fa-IR')} تومان
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--vintage-border)] pt-4">
            <button
              type="button"
              onClick={() => void estimateAi()}
              disabled={aiBusy !== null}
              className="indeed-btn disabled:opacity-50"
            >
              {aiBusy === 'estimate' ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Search className="size-4" aria-hidden />
              )}
              برآورد هزینه
            </button>
            <button
              type="button"
              onClick={() => void runAiImport()}
              disabled={aiBusy !== null || !aiEstimate}
              className="indeed-btn indeed-btn-primary disabled:opacity-50"
            >
              {aiBusy === 'import' ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-4" aria-hidden />
              )}
              پرداخت و ایمپورت
            </button>
            <span className="text-[11px] text-muted">
              هر ایمپورت هزینه‌ی جداگانه دارد و بر اساس توکن مصرفی محاسبه می‌شود.
            </span>
          </div>
        </section>
      ) : null}

      {showForm ? (
        <section className="indeed-panel p-5">
          <h2 className="mb-4 text-lg font-extrabold text-ink">ثبت اقامتگاه جدید</h2>
          <AccommodationForm
            submitLabel="ثبت اقامتگاه"
            submitting={submitting}
            onSubmit={create}
          />
        </section>
      ) : null}

      {error ? (
        <div className="indeed-panel p-4 text-sm text-red-700">
          {error}
          {error.includes('فعال نیست') ? (
            <Link href="/dashboard/business" className="ms-2 font-bold text-brand underline">
              فعال‌سازی ماژول
            </Link>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <p className="text-muted">در حال بارگذاری…</p>
      ) : items.length === 0 ? (
        <div className="indeed-panel p-10 text-center">
          <p className="text-lg font-bold text-ink">هنوز اقامتگاهی ثبت نکرده‌اید</p>
          <p className="mt-2 text-sm text-muted">
            اولین واحد اجاره‌ای خود را اضافه کنید تا صفحه‌ی عمومی رزرو ساخته شود.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const cover = item.photos.find((photo) => photo.isCover) ?? item.photos[0];
            return (
              <Link
                key={item.id}
                href={`/dashboard/business/accommodations/${item.id}`}
                prefetch={false}
                className="indeed-panel group overflow-hidden transition hover:border-brand/50"
              >
                <div className="relative h-40 bg-[var(--vintage-paper)]">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover.url}
                      alt={item.title}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xs text-muted">
                      بدون تصویر
                    </div>
                  )}
                  <span className="absolute end-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white">
                    {STATUS_LABELS[item.status] ?? item.status}
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-4">
                  <h3 className="text-sm font-extrabold text-ink">{item.title}</h3>
                  <p className="flex items-center gap-1 text-xs text-muted">
                    <MapPin className="size-3" aria-hidden />
                    {item.city?.name ?? item.address ?? 'بدون موقعیت'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Users className="size-3" aria-hidden />
                      {item.maxGuests} مهمان
                    </span>
                    <span className="flex items-center gap-1">
                      <BedDouble className="size-3" aria-hidden />
                      {item.bedrooms} اتاق
                    </span>
                    <span>{item._count?.bookings ?? 0} رزرو</span>
                  </div>
                  <p className="mt-1 text-sm font-extrabold text-brand">
                    {item.basePrice.toLocaleString('fa-IR')} تومان / شب
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
