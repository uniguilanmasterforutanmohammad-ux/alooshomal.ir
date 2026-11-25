'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import {
  api,
  type RetailProduct,
  type RetailProductMeta,
  type UploadResult,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

/** Mirrors `RETAIL_PRODUCT_UNITS` on the API so the dropdown stays in sync. */
const PRODUCT_UNITS = [
  'عدد',
  'کیلوگرم',
  'گرم',
  'لیتر',
  'میلی‌لیتر',
  'بسته',
  'جعبه',
  'کارتن',
  'متر',
  'متر مربع',
  'دستگاه',
  'خدمت',
] as const;

type SellerStatus = 'DRAFT' | 'PENDING_REVIEW' | 'ARCHIVED';

const STATUS_META: Record<
  RetailProduct['status'],
  { label: string; className: string }
> = {
  DRAFT: { label: 'پیش‌نویس', className: 'bg-amber-50 text-amber-700' },
  PENDING_REVIEW: {
    label: 'در انتظار تأیید',
    className: 'bg-sky-50 text-sky-700',
  },
  PUBLISHED: {
    label: 'منتشرشده',
    className: 'bg-emerald-50 text-emerald-700',
  },
  REJECTED: { label: 'رد شده', className: 'bg-red-50 text-red-700' },
  ARCHIVED: { label: 'بایگانی', className: 'bg-neutral-100 text-neutral-600' },
};

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

interface FormState {
  title: string;
  description: string;
  categoryId: string;
  price: string;
  compareAtPrice: string;
  costPrice: string;
  stock: string;
  lowStockThreshold: string;
  unit: string;
  images: string[];
}

const emptyForm: FormState = {
  title: '',
  description: '',
  categoryId: '',
  price: '0',
  compareAtPrice: '',
  costPrice: '0',
  stock: '0',
  lowStockThreshold: '0',
  unit: 'عدد',
  images: [],
};

function formatToman(value: number): string {
  return value.toLocaleString('fa-IR');
}

export default function ProductsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);

  const [items, setItems] = useState<RetailProduct[]>([]);
  const [meta, setMeta] = useState<RetailProductMeta | null>(null);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RetailProduct | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploading, setUploading] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState<SellerStatus | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
      setItems(await api.get<RetailProduct[]>(`/retail/products${query}`));
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/products');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  useEffect(() => {
    if (!enabled) return;
    api
      .get<RetailProductMeta>('/retail/products/meta')
      .then(setMeta)
      .catch(() => undefined);
  }, [enabled]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, categoryId: meta?.categories[0]?.id ?? '' });
    setShowForm(true);
  }

  function openEdit(product: RetailProduct) {
    setEditing(product);
    setForm({
      title: product.title,
      description: product.description ?? '',
      categoryId: product.categoryId ?? '',
      price: String(product.price),
      compareAtPrice: product.compareAtPrice
        ? String(product.compareAtPrice)
        : '',
      costPrice: String(product.costPrice),
      stock: String(product.stock),
      lowStockThreshold: String(product.lowStockThreshold),
      unit: product.unit,
      images: [
        ...(product.imageUrl ? [product.imageUrl] : []),
        ...product.gallery.filter((url) => url !== product.imageUrl),
      ],
    });
    setShowForm(true);
  }

  async function uploadFiles(files: FileList | File[]) {
    if (!meta) return;
    const list = Array.from(files).filter((file) =>
      file.type.startsWith('image/'),
    );
    if (list.length === 0) return;
    const remaining = meta.maxImages - form.images.length;
    if (remaining <= 0) {
      toast.error(`حداکثر ${meta.maxImages} تصویر مجاز است.`);
      return;
    }
    const accepted = list.slice(0, remaining);
    if (list.length > remaining) {
      toast.error(`فقط ${remaining} تصویر دیگر قابل افزودن است.`);
    }
    for (const file of accepted) {
      if (file.size > meta.maxImageKb * 1024) {
        toast.error(
          `حجم «${file.name}» بیش از ${formatToman(meta.maxImageKb)} کیلوبایت است.`,
        );
        continue;
      }
      setUploading((count) => count + 1);
      try {
        const body = new FormData();
        body.append('file', file);
        const result = await api.upload<UploadResult>(
          '/retail/products/uploads',
          body,
        );
        setForm((prev) => ({ ...prev, images: [...prev.images, result.url] }));
      } catch {
        // API client already surfaced the error
      } finally {
        setUploading((count) => count - 1);
      }
    }
  }

  function removeImage(index: number) {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, position) => position !== index),
    }));
  }

  function moveImage(index: number, delta: number) {
    setForm((prev) => {
      const next = [...prev.images];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, images: next };
    });
  }

  async function save(status: SellerStatus) {
    if (!form.title.trim()) {
      toast.error('نام محصول را وارد کنید.');
      return;
    }
    if (!form.categoryId) {
      toast.error('دسته‌بندی محصول را انتخاب کنید.');
      return;
    }
    setSaving(status);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      categoryId: form.categoryId,
      price: Number(form.price) || 0,
      compareAtPrice: form.compareAtPrice
        ? Number(form.compareAtPrice)
        : undefined,
      costPrice: Number(form.costPrice) || 0,
      stock: Number(form.stock) || 0,
      lowStockThreshold: Number(form.lowStockThreshold) || 0,
      unit: form.unit,
      imageUrl: form.images[0],
      gallery: form.images,
      status,
    };
    try {
      if (editing) {
        await api.patch(`/retail/products/${editing.id}`, payload);
      } else {
        await api.post('/retail/products', payload);
      }
      toast.success(
        status === 'PENDING_REVIEW'
          ? 'محصول برای تأیید مدیر ارسال شد'
          : status === 'ARCHIVED'
            ? 'محصول بایگانی شد'
            : 'پیش‌نویس محصول ذخیره شد',
      );
      setShowForm(false);
      setEditing(null);
      await load();
    } catch {
      // API client already surfaced the error
    } finally {
      setSaving(null);
    }
  }

  async function remove(product: RetailProduct) {
    if (!window.confirm(`محصول «${product.title}» حذف شود؟`)) return;
    await api.delete(`/retail/products/${product.id}`);
    await load();
    toast.success('محصول حذف شد');
  }

  const canAddImages = meta ? form.images.length < meta.maxImages : false;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">محصولات فروشگاه</h1>
          <p className="mt-1 text-sm text-muted">
            محصول پس از ثبت، برای تأیید مدیر ارسال می‌شود و پس از تأیید در ویترین
            عمومی فروشگاه نمایش داده خواهد شد.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/business/shop-settings" className="indeed-btn">
            تنظیمات فروشگاه
          </Link>
          <Link href="/shop" className="indeed-btn">
            دایرکتوری عمومی
          </Link>
          <button
            type="button"
            onClick={openCreate}
            className="indeed-btn indeed-btn-primary"
          >
            <Plus className="size-4" aria-hidden />
            محصول جدید
          </button>
        </div>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      {showForm ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save('DRAFT');
          }}
          className="indeed-panel flex flex-col gap-5 p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-ink">
              {editing ? 'ویرایش محصول' : 'ثبت محصول جدید'}
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="rounded-full p-1 text-muted hover:bg-[var(--vintage-paper)]"
              aria-label="بستن"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          {editing?.status === 'REJECTED' && editing.rejectionReason ? (
            <p className="rounded-lg bg-red-50 p-3 text-xs leading-6 text-red-700">
              دلیل رد شدن: {editing.rejectionReason}
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-bold text-muted md:col-span-2">
              نام محصول
              <input
                className={field}
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="مثلاً زعفران سرگل ۵ گرمی"
                maxLength={160}
                required
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-bold text-muted">
              دسته‌بندی
              <select
                className={field}
                value={form.categoryId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    categoryId: event.target.value,
                  }))
                }
                required
              >
                <option value="">انتخاب دسته‌بندی…</option>
                {(meta?.categories ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <span className="font-normal text-[10px] text-muted">
                دسته‌بندی‌ها توسط مدیر سامانه مدیریت می‌شوند؛ فقط یکی را انتخاب
                کنید.
              </span>
            </label>

            <label className="flex flex-col gap-1 text-xs font-bold text-muted">
              کد کالا (SKU)
              <input
                className={`${field} cursor-not-allowed bg-[var(--vintage-paper)] text-muted`}
                value={editing?.sku ?? 'به‌صورت خودکار توسط سیستم تولید می‌شود'}
                readOnly
                dir="ltr"
              />
              <span className="font-normal text-[10px] text-muted">
                کد کالا برای هر محصول به‌طور سیستمی و یکتا ساخته می‌شود.
              </span>
            </label>

            <label className="flex flex-col gap-1 text-xs font-bold text-muted">
              واحد فروش
              <select
                className={field}
                value={form.unit}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, unit: event.target.value }))
                }
              >
                {PRODUCT_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
              <span className="font-normal text-[10px] text-muted">
                واحدی که محصول با آن به فروش می‌رسد (مثلاً عدد، کیلوگرم).
              </span>
            </label>

            <label className="flex flex-col gap-1 text-xs font-bold text-muted">
              قیمت فروش (تومان)
              <input
                className={field}
                type="number"
                min={0}
                value={form.price}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, price: event.target.value }))
                }
              />
              <span className="font-normal text-[10px] text-muted">
                مبلغی که مشتری پرداخت می‌کند.
              </span>
            </label>

            <label className="flex flex-col gap-1 text-xs font-bold text-muted">
              قیمت قبل از تخفیف (تومان)
              <input
                className={field}
                type="number"
                min={0}
                value={form.compareAtPrice}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    compareAtPrice: event.target.value,
                  }))
                }
                placeholder="اختیاری"
              />
              <span className="font-normal text-[10px] text-muted">
                اگر از قیمت فروش بیشتر باشد، به‌عنوان قیمت خط‌خورده و درصد تخفیف
                نمایش داده می‌شود.
              </span>
            </label>

            <label className="flex flex-col gap-1 text-xs font-bold text-muted">
              بهای خرید (تومان)
              <input
                className={field}
                type="number"
                min={0}
                value={form.costPrice}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, costPrice: event.target.value }))
                }
              />
              <span className="font-normal text-[10px] text-muted">
                فقط برای محاسبه‌ی سود شما استفاده می‌شود و به مشتری نمایش داده
                نمی‌شود.
              </span>
            </label>

            <label className="flex flex-col gap-1 text-xs font-bold text-muted">
              موجودی
              <input
                className={field}
                type="number"
                min={0}
                value={form.stock}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, stock: event.target.value }))
                }
              />
              <span className="font-normal text-[10px] text-muted">
                تعداد موجود در انبار؛ صفر یعنی ناموجود.
              </span>
            </label>

            <label className="flex flex-col gap-1 text-xs font-bold text-muted">
              آستانه‌ی هشدار موجودی کم
              <input
                className={field}
                type="number"
                min={0}
                value={form.lowStockThreshold}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    lowStockThreshold: event.target.value,
                  }))
                }
              />
              <span className="font-normal text-[10px] text-muted">
                وقتی موجودی به این عدد برسد، هشدار «موجودی کم» نمایش داده می‌شود.
              </span>
            </label>

            <label className="flex flex-col gap-1 text-xs font-bold text-muted md:col-span-2">
              توضیحات محصول
              <textarea
                className={field}
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder="ویژگی‌ها، جنس، ابعاد و هر توضیح مفید دیگر…"
                maxLength={5000}
              />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-muted">
                تصاویر محصول
              </span>
              <span className="text-[10px] text-muted">
                حداکثر {formatToman(meta?.maxImages ?? 0)} تصویر • هر تصویر تا{' '}
                {formatToman(meta?.maxImageKb ?? 0)} کیلوبایت
              </span>
            </div>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                if (event.dataTransfer.files.length > 0) {
                  void uploadFiles(event.dataTransfer.files);
                }
              }}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center text-xs transition',
                dragging
                  ? 'border-brand bg-brand-light text-brand'
                  : 'border-[var(--vintage-border)] text-muted',
              )}
            >
              <UploadCloud className="size-6" aria-hidden />
              <p>تصاویر را اینجا رها کنید یا انتخاب کنید (چندتایی مجاز است)</p>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={!canAddImages || uploading > 0}
                className="indeed-btn py-1.5 text-xs disabled:opacity-50"
              >
                {uploading > 0 ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    در حال آپلود…
                  </>
                ) : (
                  <>
                    <ImagePlus className="size-3.5" aria-hidden />
                    انتخاب تصویر
                  </>
                )}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  if (event.target.files) void uploadFiles(event.target.files);
                  event.target.value = '';
                }}
              />
            </div>
            {form.images.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {form.images.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="group relative overflow-hidden rounded-lg border border-[var(--vintage-border)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="aspect-square w-full object-cover"
                    />
                    {index === 0 ? (
                      <span className="absolute start-1 top-1 rounded bg-brand px-1.5 py-0.5 text-[9px] font-bold text-white">
                        اصلی
                      </span>
                    ) : null}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-1 py-0.5 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => moveImage(index, -1)}
                        disabled={index === 0}
                        className="text-[10px] text-white disabled:opacity-30"
                        aria-label="جابجایی به چپ"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="text-white"
                        aria-label="حذف تصویر"
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(index, 1)}
                        disabled={index === form.images.length - 1}
                        className="text-[10px] text-white disabled:opacity-30"
                        aria-label="جابجایی به راست"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--vintage-border)] pt-4">
            <button
              type="submit"
              disabled={saving !== null}
              className="indeed-btn indeed-btn-primary disabled:opacity-50"
            >
              {saving === 'DRAFT' ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              ذخیره پیش‌نویس
            </button>
            <button
              type="button"
              onClick={() => void save('PENDING_REVIEW')}
              disabled={saving !== null}
              className="indeed-btn disabled:opacity-50"
            >
              {saving === 'PENDING_REVIEW' ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
              ارسال برای تأیید
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="indeed-btn"
            >
              انصراف
            </button>
            <span className="text-[11px] text-muted">
              انتشار در ویترین فقط پس از تأیید مدیر انجام می‌شود.
            </span>
          </div>
        </form>
      ) : null}

      <div className="relative">
        <Search
          className="pointer-events-none absolute end-3 top-2.5 size-4 text-muted"
          aria-hidden
        />
        <input
          className={field}
          placeholder="جستجوی نام، کد کالا یا دسته…"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted">در حال بارگذاری…</p>
      ) : items.length === 0 ? (
        <div className="indeed-panel p-8 text-center text-sm text-muted">
          هنوز محصولی ثبت نشده است.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((product) => {
            const status = STATUS_META[product.status];
            const discount =
              product.compareAtPrice && product.compareAtPrice > product.price
                ? Math.round(
                    ((product.compareAtPrice - product.price) /
                      product.compareAtPrice) *
                      100,
                  )
                : 0;
            return (
              <article
                key={product.id}
                className="indeed-panel flex flex-col overflow-hidden"
              >
                <div className="relative aspect-[4/3] w-full bg-[var(--vintage-paper)]">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-xs text-muted">
                      بدون عکس
                    </span>
                  )}
                  <span
                    className={cn(
                      'absolute end-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold',
                      status.className,
                    )}
                  >
                    {status.label}
                  </span>
                  {discount > 0 ? (
                    <span className="absolute start-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      {formatToman(discount)}٪
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <h3 className="line-clamp-2 text-sm font-extrabold text-ink">
                    {product.title}
                  </h3>
                  <p className="text-[11px] text-muted">
                    {product.category ?? 'بدون دسته'}
                    {product.sku ? ` • ${product.sku}` : ''}
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-sm font-bold text-brand">
                      {formatToman(product.price)} تومان
                    </span>
                    {discount > 0 ? (
                      <span className="text-[11px] text-muted line-through">
                        {formatToman(product.compareAtPrice ?? 0)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-muted">
                    موجودی: {formatToman(product.stock)} {product.unit}
                  </p>
                  {product.status === 'REJECTED' && product.rejectionReason ? (
                    <p className="rounded bg-red-50 px-2 py-1 text-[10px] text-red-700">
                      دلیل رد: {product.rejectionReason}
                    </p>
                  ) : null}
                  <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => openEdit(product)}
                      className="indeed-btn py-1 text-[11px]"
                    >
                      <Pencil className="size-3" aria-hidden /> ویرایش
                    </button>
                    {product.status === 'PUBLISHED' ? (
                      <a
                        href={`/shop/${workspace?.publicSlug ?? ''}/p/${product.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="indeed-btn py-1 text-[11px]"
                      >
                        <BadgeCheck className="size-3" aria-hidden /> مشاهده
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void remove(product)}
                      className="indeed-btn py-1 text-[11px] text-red-600"
                    >
                      <Trash2 className="size-3" aria-hidden /> حذف
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
