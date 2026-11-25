'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react';

import {
  api,
  type AdminRetailProduct,
  type RetailProductCategory,
} from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-paper)] px-2 py-1.5 text-sm text-ink';

function formatToman(value: number): string {
  return value.toLocaleString('fa-IR');
}

export function AdminRetailSettings() {
  const [categories, setCategories] = useState<RetailProductCategory[]>([]);
  const [settings, setSettings] = useState({
    maxImages: 6,
    maxImageKb: 2048,
    aiPricePer1k: 1500,
    aiMinPrice: 5000,
  });
  const [pending, setPending] = useState<AdminRetailProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, limits, queue] = await Promise.all([
        api.get<RetailProductCategory[]>('/admin/retail/categories'),
        api.get<{
          maxImages: number;
          maxImageKb: number;
          aiPricePer1k: number;
          aiMinPrice: number;
        }>('/admin/retail/settings'),
        api.get<AdminRetailProduct[]>(
          '/admin/retail/products?status=PENDING_REVIEW',
        ),
      ]);
      setCategories(cats);
      setSettings(limits);
      setPending(queue);
    } catch {
      // API client already surfaced the error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addCategory() {
    const name = newCategory.trim();
    if (!name) return;
    setBusy('add-category');
    try {
      await api.post('/admin/retail/categories', { name });
      setNewCategory('');
      toast.success('دسته‌بندی اضافه شد');
      await load();
    } catch {
      // handled
    } finally {
      setBusy(null);
    }
  }

  async function updateCategory(
    category: RetailProductCategory,
    patch: Partial<Pick<RetailProductCategory, 'name' | 'isActive'>>,
  ) {
    setBusy(`category:${category.id}`);
    try {
      await api.patch(`/admin/retail/categories/${category.id}`, patch);
      await load();
    } catch {
      // handled
    } finally {
      setBusy(null);
    }
  }

  async function removeCategory(category: RetailProductCategory) {
    if (
      !window.confirm(`دسته‌بندی «${category.name}» حذف شود؟`)
    )
      return;
    setBusy(`category:${category.id}`);
    try {
      await api.delete(`/admin/retail/categories/${category.id}`);
      toast.success('دسته‌بندی حذف شد');
      await load();
    } catch {
      // handled
    } finally {
      setBusy(null);
    }
  }

  async function saveSettings() {
    setBusy('settings');
    try {
      await api.patch('/admin/retail/settings', settings);
      toast.success('تنظیمات تصاویر ذخیره شد');
    } catch {
      // handled
    } finally {
      setBusy(null);
    }
  }

  async function review(product: AdminRetailProduct, approve: boolean) {
    setBusy(`review:${product.id}`);
    try {
      await api.patch(`/admin/retail/products/${product.id}/review`, {
        approve,
        reason: approve ? undefined : rejectReason.trim() || undefined,
      });
      toast.success(approve ? 'محصول تأیید و منتشر شد' : 'محصول رد شد');
      setRejectFor(null);
      setRejectReason('');
      await load();
    } catch {
      // handled
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <section className="indeed-panel flex items-center gap-2 p-5 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        در حال بارگذاری مدیریت فروشگاه…
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="indeed-panel p-5">
        <h4 className="text-sm font-extrabold text-ink">
          دسته‌بندی‌های محصول
        </h4>
        <p className="mt-0.5 text-xs leading-6 text-muted">
          فروشندگان فقط از میان این دسته‌بندی‌ها یکی را انتخاب می‌کنند.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            className={`${field} max-w-xs`}
            placeholder="نام دسته‌بندی جدید"
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void addCategory();
              }
            }}
          />
          <button
            type="button"
            onClick={() => void addCategory()}
            disabled={busy === 'add-category'}
            className="indeed-btn indeed-btn-primary py-1.5 text-xs disabled:opacity-50"
          >
            {busy === 'add-category' ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-3.5" aria-hidden />
            )}
            افزودن
          </button>
        </div>
        {categories.length === 0 ? (
          <p className="mt-3 text-xs text-muted">هنوز دسته‌بندی‌ای ثبت نشده است.</p>
        ) : (
          <ul className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <li
                key={category.id}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs',
                  category.isActive
                    ? 'border-[var(--vintage-border)]'
                    : 'border-dashed border-[var(--vintage-border)] opacity-60',
                )}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={category.isActive}
                    disabled={busy === `category:${category.id}`}
                    onChange={(event) =>
                      void updateCategory(category, {
                        isActive: event.target.checked,
                      })
                    }
                    aria-label="فعال"
                  />
                  <span className="font-bold text-ink">{category.name}</span>
                  {category._count ? (
                    <span className="text-[10px] text-muted">
                      {formatToman(category._count.products)} محصول
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => void removeCategory(category)}
                  disabled={busy === `category:${category.id}`}
                  className="text-red-600 disabled:opacity-40"
                  aria-label="حذف"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="indeed-panel p-5">
        <h4 className="text-sm font-extrabold text-ink">تنظیمات تصاویر محصول</h4>
        <p className="mt-0.5 text-xs leading-6 text-muted">
          حداکثر تعداد تصویر و حجم هر تصویر که فروشنده می‌تواند آپلود کند.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-[11px] font-bold text-muted">
            حداکثر تعداد تصویر
            <input
              type="number"
              min={1}
              max={20}
              value={settings.maxImages}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  maxImages: Number(event.target.value) || 1,
                }))
              }
              className={`${field} mt-1`}
            />
          </label>
          <label className="text-[11px] font-bold text-muted">
            حداکثر حجم هر تصویر (کیلوبایت)
            <input
              type="number"
              min={64}
              max={20480}
              value={settings.maxImageKb}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  maxImageKb: Number(event.target.value) || 64,
                }))
              }
              className={`${field} mt-1`}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void saveSettings()}
              disabled={busy === 'settings'}
              className="indeed-btn indeed-btn-primary py-1.5 text-xs disabled:opacity-50"
            >
              {busy === 'settings' ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Save className="size-3.5" aria-hidden />
              )}
              ذخیره
            </button>
          </div>
        </div>
      </section>

      <section className="indeed-panel p-5">
        <h4 className="text-sm font-extrabold text-ink">
          تعرفه‌ی ورود خودکار محصول (هوش مصنوعی)
        </h4>
        <p className="mt-0.5 text-xs leading-6 text-muted">
          هزینه‌ی هر ایمپورت محصول از دیجی‌کالا بر اساس توکن مصرفی و این نرخ
          محاسبه و از کیف پول کاربر کسر می‌شود.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-[11px] font-bold text-muted">
            هزینه‌ی هر ۱۰۰۰ توکن (تومان)
            <input
              type="number"
              min={0}
              value={settings.aiPricePer1k}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  aiPricePer1k: Number(event.target.value) || 0,
                }))
              }
              className={`${field} mt-1`}
            />
          </label>
          <label className="text-[11px] font-bold text-muted">
            حداقل هزینه‌ی هر ایمپورت (تومان)
            <input
              type="number"
              min={0}
              value={settings.aiMinPrice}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  aiMinPrice: Number(event.target.value) || 0,
                }))
              }
              className={`${field} mt-1`}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void saveSettings()}
              disabled={busy === 'settings'}
              className="indeed-btn indeed-btn-primary py-1.5 text-xs disabled:opacity-50"
            >
              {busy === 'settings' ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Save className="size-3.5" aria-hidden />
              )}
              ذخیره
            </button>
          </div>
        </div>
      </section>

      <section className="indeed-panel p-5">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-extrabold text-ink">
              صف بررسی محصولات
            </h4>
            <p className="mt-0.5 text-xs leading-6 text-muted">
              محصولات ارسال‌شده توسط فروشگاه‌ها برای تأیید انتشار.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="indeed-btn py-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            به‌روزرسانی
          </button>
        </div>
        {pending.length === 0 ? (
          <p className="mt-3 text-xs text-muted">
            محصولی در انتظار بررسی نیست.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {pending.map((product) => (
              <li
                key={product.id}
                className="flex flex-col gap-2 rounded-lg border border-[var(--vintage-border)] p-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="size-14 rounded object-cover"
                    />
                  ) : (
                    <span className="flex size-14 items-center justify-center rounded bg-[var(--vintage-paper)] text-[10px] text-muted">
                      بدون عکس
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">
                      {product.title}
                    </p>
                    <p className="text-[10px] text-muted">
                      {product.workspace.name}
                      {product.category ? ` • ${product.category}` : ''}
                      {product.sku ? ` • ${product.sku}` : ''}
                    </p>
                    <p className="text-[10px] text-muted">
                      {formatToman(product.price)} تومان • موجودی{' '}
                      {formatToman(product.stock)} {product.unit}
                    </p>
                  </div>
                </div>
                {rejectFor === product.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      className={`${field} max-w-xs`}
                      placeholder="دلیل رد شدن (اختیاری)"
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => void review(product, false)}
                      disabled={busy === `review:${product.id}`}
                      className="indeed-btn py-1 text-[11px] text-red-600 disabled:opacity-40"
                    >
                      تأیید رد
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectFor(null);
                        setRejectReason('');
                      }}
                      className="indeed-btn py-1 text-[11px]"
                    >
                      انصراف
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void review(product, true)}
                      disabled={busy === `review:${product.id}`}
                      className="indeed-btn indeed-btn-primary py-1 text-[11px] disabled:opacity-40"
                    >
                      {busy === `review:${product.id}` ? (
                        <Loader2 className="size-3 animate-spin" aria-hidden />
                      ) : (
                        <Check className="size-3" aria-hidden />
                      )}
                      تأیید و انتشار
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectFor(product.id);
                        setRejectReason('');
                      }}
                      className="indeed-btn py-1 text-[11px] text-red-600"
                    >
                      <X className="size-3" aria-hidden />
                      رد کردن
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
