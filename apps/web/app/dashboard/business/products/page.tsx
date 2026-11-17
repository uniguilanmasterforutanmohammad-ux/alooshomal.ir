'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ImagePlus, Pencil, Plus, Search, Trash2 } from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { api, type RetailProduct, type UploadResult } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const emptyForm = {
  title: '',
  description: '',
  category: '',
  sku: '',
  price: '0',
  compareAtPrice: '',
  stock: '0',
  lowStockThreshold: '0',
  unit: 'عدد',
  imageUrl: '',
  status: 'DRAFT' as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
};

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

export default function ProductsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [items, setItems] = useState<RetailProduct[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RetailProduct | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

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

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(product: RetailProduct) {
    setEditing(product);
    setForm({
      title: product.title,
      description: product.description ?? '',
      category: product.category ?? '',
      sku: product.sku ?? '',
      price: String(product.price),
      compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : '',
      stock: String(product.stock),
      lowStockThreshold: String(product.lowStockThreshold),
      unit: product.unit,
      imageUrl: product.imageUrl ?? '',
      status: product.status,
    });
    setShowForm(true);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const result = await api.upload<UploadResult>('/uploads/gallery', body);
      setForm((prev) => ({ ...prev, imageUrl: result.url }));
      toast.success('تصویر آپلود شد');
    } finally {
      setUploading(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category: form.category.trim() || undefined,
      sku: form.sku.trim() || undefined,
      price: Number(form.price) || 0,
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
      stock: Number(form.stock) || 0,
      lowStockThreshold: Number(form.lowStockThreshold) || 0,
      unit: form.unit.trim() || 'عدد',
      imageUrl: form.imageUrl.trim() || undefined,
      status: form.status,
    };
    if (editing) {
      await api.patch(`/retail/products/${editing.id}`, payload);
      toast.success('محصول به‌روزرسانی شد');
    } else {
      await api.post('/retail/products', payload);
      toast.success('محصول ثبت شد');
    }
    setShowForm(false);
    setEditing(null);
    await load();
  }

  async function togglePublish(product: RetailProduct) {
    const status = product.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    await api.patch(`/retail/products/${product.id}`, { status });
    await load();
  }

  async function remove(product: RetailProduct) {
    if (!window.confirm(`محصول «${product.title}» حذف شود؟`)) return;
    await api.delete(`/retail/products/${product.id}`);
    await load();
    toast.success('محصول حذف شد');
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">محصولات فروشگاه</h1>
          <p className="mt-1 text-sm text-muted">
            محصولات منتشرشده در ویترین عمومی فروشگاه شما نمایش داده می‌شوند.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="indeed-btn indeed-btn-primary">
          <Plus className="size-4" aria-hidden />
          محصول جدید
        </button>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      {showForm ? (
        <form onSubmit={save} className="indeed-panel grid gap-3 p-5 md:grid-cols-2">
          <input className={field} placeholder="نام محصول" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} required />
          <input className={field} placeholder="دسته‌بندی" value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} />
          <input className={field} placeholder="کد کالا (SKU)" value={form.sku} onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))} />
          <input className={field} placeholder="واحد (عدد، کیلوگرم…)" value={form.unit} onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))} />
          <input className={field} type="number" min={0} placeholder="قیمت (تومان)" value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} />
          <input className={field} type="number" min={0} placeholder="قیمت قبل از تخفیف" value={form.compareAtPrice} onChange={(event) => setForm((prev) => ({ ...prev, compareAtPrice: event.target.value }))} />
          <input className={field} type="number" min={0} placeholder="موجودی" value={form.stock} onChange={(event) => setForm((prev) => ({ ...prev, stock: event.target.value }))} />
          <input className={field} type="number" min={0} placeholder="آستانه‌ی هشدار موجودی" value={form.lowStockThreshold} onChange={(event) => setForm((prev) => ({ ...prev, lowStockThreshold: event.target.value }))} />
          <textarea className={`${field} md:col-span-2`} rows={3} placeholder="توضیحات" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
          <select className={field} value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as typeof prev.status }))}>
            <option value="DRAFT">پیش‌نویس</option>
            <option value="PUBLISHED">منتشرشده</option>
            <option value="ARCHIVED">بایگانی</option>
          </select>
          <div className="flex items-center gap-2">
            <label className="indeed-btn cursor-pointer text-xs">
              <ImagePlus className="size-4" aria-hidden />
              {uploading ? 'در حال آپلود…' : 'تصویر محصول'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadImage(file);
                }}
              />
            </label>
            {form.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.imageUrl} alt="" className="size-10 rounded object-cover" />
            ) : null}
          </div>
          <div className="flex gap-2 md:col-span-2">
            <button type="submit" className="indeed-btn indeed-btn-primary">ذخیره محصول</button>
            <button type="button" onClick={() => setShowForm(false)} className="indeed-btn">انصراف</button>
          </div>
        </form>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute end-3 top-2.5 size-4 text-muted" aria-hidden />
        <input className={field} placeholder="جستجوی نام، کد کالا یا دسته…" value={q} onChange={(event) => setQ(event.target.value)} />
      </div>

      {loading ? (
        <p className="text-sm text-muted">در حال بارگذاری…</p>
      ) : items.length === 0 ? (
        <div className="indeed-panel p-8 text-center text-sm text-muted">
          هنوز محصولی ثبت نشده است.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((product) => (
            <article key={product.id} className="indeed-panel flex flex-col gap-2 p-4">
              <div className="flex items-start gap-3">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt={product.title} className="size-14 rounded object-cover" />
                ) : (
                  <span className="flex size-14 items-center justify-center rounded bg-[var(--vintage-paper)] text-xs text-muted">بدون عکس</span>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-extrabold text-ink">{product.title}</h3>
                  <p className="text-xs text-muted">
                    {product.price.toLocaleString('fa-IR')} تومان
                    {product.category ? ` • ${product.category}` : ''}
                  </p>
                  <p className="text-[11px] text-muted">
                    موجودی: {product.stock.toLocaleString('fa-IR')} {product.unit}
                  </p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold',
                    product.status === 'PUBLISHED'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700',
                  )}
                >
                  {product.status === 'PUBLISHED' ? 'منتشرشده' : product.status === 'ARCHIVED' ? 'بایگانی' : 'پیش‌نویس'}
                </span>
              </div>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <button type="button" onClick={() => void togglePublish(product)} className="indeed-btn py-1 text-[11px]">
                  {product.status === 'PUBLISHED' ? 'برداشتن از ویترین' : 'انتشار در ویترین'}
                </button>
                <button type="button" onClick={() => openEdit(product)} className="indeed-btn py-1 text-[11px]">
                  <Pencil className="size-3" aria-hidden /> ویرایش
                </button>
                <button type="button" onClick={() => void remove(product)} className="indeed-btn py-1 text-[11px] text-red-600">
                  <Trash2 className="size-3" aria-hidden /> حذف
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
