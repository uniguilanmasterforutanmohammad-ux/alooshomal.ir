'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Boxes } from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { api, type RetailInventory } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

export default function InventoryPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [data, setData] = useState<RetailInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ productId: '', kind: 'IN', quantity: '1', note: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.get<RetailInventory>('/retail/inventory'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/inventory');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.productId) return;
    await api.post('/retail/inventory/movements', {
      productId: form.productId,
      kind: form.kind,
      quantity: Number(form.quantity) || 0,
      note: form.note.trim() || undefined,
    });
    setForm((prev) => ({ ...prev, quantity: '1', note: '' }));
    await load();
    toast.success('حرکت انبار ثبت شد');
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">انبار و موجودی</h1>
        <p className="mt-1 text-sm text-muted">
          کاردکس ورود/خروج کالا و هشدار موجودی کم. فروش از ویترین به‌صورت خودکار از
          موجودی کم می‌کند.
        </p>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      {loading || !data ? (
        <p className="text-sm text-muted">در حال بارگذاری…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="indeed-panel p-4">
              <p className="text-xs text-muted">تعداد محصولات</p>
              <p className="text-xl font-extrabold text-ink">{data.products.length.toLocaleString('fa-IR')}</p>
            </div>
            <div className="indeed-panel p-4">
              <p className="text-xs text-muted">موجودی کم</p>
              <p className="flex items-center gap-1 text-xl font-extrabold text-amber-700">
                <AlertTriangle className="size-4" aria-hidden />
                {data.lowStockCount.toLocaleString('fa-IR')}
              </p>
            </div>
            <div className="indeed-panel p-4">
              <p className="text-xs text-muted">حرکت‌های اخیر</p>
              <p className="text-xl font-extrabold text-ink">{data.movements.length.toLocaleString('fa-IR')}</p>
            </div>
          </div>

          <form onSubmit={submit} className="indeed-panel grid gap-3 p-5 md:grid-cols-5">
            <select className={field} value={form.productId} onChange={(event) => setForm((prev) => ({ ...prev, productId: event.target.value }))} required>
              <option value="">انتخاب محصول…</option>
              {data.products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.title} ({product.stock} {product.unit})
                </option>
              ))}
            </select>
            <select className={field} value={form.kind} onChange={(event) => setForm((prev) => ({ ...prev, kind: event.target.value }))}>
              <option value="IN">ورود</option>
              <option value="OUT">خروج</option>
              <option value="ADJUST">اصلاح موجودی</option>
            </select>
            <input className={field} type="number" min={0} value={form.quantity} onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))} />
            <input className={field} placeholder="توضیح" value={form.note} onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))} />
            <button type="submit" className="indeed-btn indeed-btn-primary">
              <Boxes className="size-4" aria-hidden /> ثبت
            </button>
          </form>

          <section className="indeed-panel p-5">
            <h2 className="mb-3 text-sm font-extrabold text-ink">موجودی محصولات</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted">
                    <th className="p-2 text-start">محصول</th>
                    <th className="p-2 text-start">موجودی</th>
                    <th className="p-2 text-start">آستانه</th>
                    <th className="p-2 text-start">وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((product) => (
                    <tr key={product.id} className="border-t border-[var(--vintage-border)]">
                      <td className="p-2 text-ink">{product.title}</td>
                      <td className="p-2">{product.stock.toLocaleString('fa-IR')} {product.unit}</td>
                      <td className="p-2">{product.lowStockThreshold.toLocaleString('fa-IR')}</td>
                      <td className="p-2">
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', product.lowStock ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>
                          {product.lowStock ? 'کمبود' : 'کافی'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="indeed-panel p-5">
            <h2 className="mb-3 text-sm font-extrabold text-ink">کاردکس اخیر</h2>
            <ul className="divide-y divide-[var(--vintage-border)] text-xs">
              {data.movements.map((move) => (
                <li key={move.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="text-ink">
                    {move.product?.title ?? '—'} •{' '}
                    {move.kind === 'IN' ? 'ورود' : move.kind === 'OUT' ? 'خروج' : 'اصلاح'}{' '}
                    {move.quantity.toLocaleString('fa-IR')}
                  </span>
                  <span className="text-muted">{move.note ?? ''}</span>
                </li>
              ))}
              {data.movements.length === 0 ? <li className="py-2 text-muted">حرکتی ثبت نشده است.</li> : null}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
