'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Minus, Plus, ShoppingBag } from 'lucide-react';

import { api, type PublicShop, type RetailOrder } from '@/lib/api';
import { toast } from '@/lib/toast';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

export function ShopOrderForm({ shop }: { shop: PublicShop }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customer, setCustomer] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    note: '',
    paymentMethod: 'CARD_TO_CARD',
  });
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<RetailOrder | null>(null);
  const [copied, setCopied] = useState(false);

  const lines = useMemo(
    () =>
      shop.products
        .filter((product) => (cart[product.id] ?? 0) > 0)
        .map((product) => ({
          product,
          quantity: cart[product.id],
          total: product.price * cart[product.id],
        })),
    [cart, shop.products],
  );
  const total = lines.reduce((sum, line) => sum + line.total, 0);

  function change(productId: string, delta: number, max: number) {
    setCart((prev) => {
      const next = Math.max(0, Math.min(max, (prev[productId] ?? 0) + delta));
      return { ...prev, [productId]: next };
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (lines.length === 0) {
      toast.error('سبد خرید خالی است');
      return;
    }
    if (!customer.customerName.trim() || !customer.customerPhone.trim()) return;
    setBusy(true);
    try {
      const created = await api.post<RetailOrder>(
        `/public/shops/${shop.workspace.publicSlug}/orders`,
        {
          customerName: customer.customerName.trim(),
          customerPhone: customer.customerPhone.trim(),
          customerAddress: customer.customerAddress.trim() || undefined,
          note: customer.note.trim() || undefined,
          paymentMethod: customer.paymentMethod,
          items: lines.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity,
          })),
        },
      );
      setOrder(created);
      setCart({});
      toast.success('سفارش ثبت شد');
    } finally {
      setBusy(false);
    }
  }

  async function copyCard() {
    if (!shop.card) return;
    try {
      await navigator.clipboard.writeText(shop.card.cardNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('کپی شماره کارت ممکن نشد');
    }
  }

  if (order) {
    return (
      <div className="indeed-panel flex flex-col gap-3 p-5">
        <p className="flex items-center gap-2 text-sm font-extrabold text-emerald-700">
          <Check className="size-4" aria-hidden />
          سفارش شما ثبت شد
        </p>
        <p className="text-xs text-muted">
          شماره سفارش: <span className="font-bold text-ink">{order.orderNumber}</span>
        </p>
        <p className="text-sm font-bold text-brand">
          مبلغ قابل پرداخت: {order.totalAmount.toLocaleString('fa-IR')} تومان
        </p>
        {order.paymentMethod === 'CARD_TO_CARD' && shop.card ? (
          <div className="rounded-lg bg-[var(--vintage-paper)] p-3 text-xs">
            <p className="font-bold text-ink">پرداخت کارت به کارت</p>
            <p className="mt-1 text-muted">
              مبلغ را به کارت زیر واریز کنید و سپس رسید را برای تأیید ارسال کنید.
            </p>
            <p className="mt-2 flex items-center gap-2 font-mono text-sm text-ink">
              {shop.card.cardNumber}
              <button type="button" onClick={() => void copyCard()} className="text-brand" aria-label="کپی شماره کارت">
                {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              </button>
            </p>
            <p className="text-muted">
              به نام {shop.card.holderName}
              {shop.card.bankName ? ` • ${shop.card.bankName}` : ''}
            </p>
            {shop.card.instructions ? (
              <p className="mt-2 whitespace-pre-line text-muted">{shop.card.instructions}</p>
            ) : null}
          </div>
        ) : null}
        <button type="button" onClick={() => setOrder(null)} className="indeed-btn justify-self-start">
          ثبت سفارش دیگر
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="indeed-panel flex flex-col gap-4 p-5">
      <h2 className="text-sm font-extrabold text-ink">سبد خرید</h2>
      {shop.products.length === 0 ? (
        <p className="text-xs text-muted">این فروشگاه هنوز محصولی منتشر نکرده است.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shop.products.map((product) => {
            const quantity = cart[product.id] ?? 0;
            const out = product.stock <= 0;
            return (
              <li key={product.id} className="flex items-center gap-3 rounded-lg border border-[var(--vintage-border)] p-2">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt={product.title} className="size-12 rounded object-cover" />
                ) : (
                  <span className="flex size-12 items-center justify-center rounded bg-[var(--vintage-paper)]">
                    <ShoppingBag className="size-4 text-muted" aria-hidden />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-ink">{product.title}</p>
                  <p className="text-[11px] text-muted">
                    {product.price.toLocaleString('fa-IR')} تومان
                    {out ? ' • ناموجود' : ` • ${product.stock} ${product.unit}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => change(product.id, -1, product.stock)} disabled={quantity === 0} className="rounded border px-1.5 py-0.5 disabled:opacity-40" aria-label="کم‌کردن">
                    <Minus className="size-3" aria-hidden />
                  </button>
                  <span className="w-6 text-center text-xs font-bold">{quantity.toLocaleString('fa-IR')}</span>
                  <button type="button" onClick={() => change(product.id, 1, product.stock)} disabled={out || quantity >= product.stock} className="rounded border px-1.5 py-0.5 disabled:opacity-40" aria-label="افزودن">
                    <Plus className="size-3" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid gap-2">
        <input className={field} placeholder="نام و نام خانوادگی" value={customer.customerName} onChange={(event) => setCustomer((prev) => ({ ...prev, customerName: event.target.value }))} required />
        <input className={field} placeholder="شماره موبایل" value={customer.customerPhone} onChange={(event) => setCustomer((prev) => ({ ...prev, customerPhone: event.target.value }))} required />
        <input className={field} placeholder="نشانی ارسال (اختیاری)" value={customer.customerAddress} onChange={(event) => setCustomer((prev) => ({ ...prev, customerAddress: event.target.value }))} />
        <select className={field} value={customer.paymentMethod} onChange={(event) => setCustomer((prev) => ({ ...prev, paymentMethod: event.target.value }))}>
          <option value="CARD_TO_CARD">کارت به کارت</option>
          <option value="CASH_ON_DELIVERY">پرداخت در محل</option>
        </select>
        <textarea className={field} rows={2} placeholder="یادداشت سفارش" value={customer.note} onChange={(event) => setCustomer((prev) => ({ ...prev, note: event.target.value }))} />
      </div>

      <div className="flex items-center justify-between border-t border-[var(--vintage-border)] pt-3 text-sm">
        <span className="text-muted">جمع کل</span>
        <span className="font-extrabold text-brand">{total.toLocaleString('fa-IR')} تومان</span>
      </div>
      <button type="submit" disabled={busy || lines.length === 0} className="indeed-btn indeed-btn-primary disabled:opacity-50">
        {busy ? 'در حال ثبت…' : 'ثبت سفارش'}
      </button>
    </form>
  );
}
