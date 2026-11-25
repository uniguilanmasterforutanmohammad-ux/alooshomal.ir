'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Check,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react';

import { CardToCardForm } from '@/components/payments/CardToCardForm';
import { api, type PublicProduct, type RetailOrder } from '@/lib/api';
import { toast } from '@/lib/toast';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

export function ProductBuyBox({ data }: { data: PublicProduct }) {
  const { product, settings, card, workspace } = data;
  const slug = workspace.publicSlug ?? '';
  const [quantity, setQuantity] = useState(1);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<RetailOrder | null>(null);
  const [customer, setCustomer] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    neighborhood: '',
    note: '',
    paymentMethod: 'CARD_TO_CARD',
    deliveryMethod: settings.snapEnabled ? 'SNAP' : 'PICKUP',
  });

  const out = product.stock <= 0;
  const max = Math.max(1, product.stock);
  const itemsTotal = product.price * quantity;
  const deliveryFee =
    customer.deliveryMethod === 'SNAP' ? settings.deliveryFee : 0;
  const total = itemsTotal + deliveryFee;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!customer.customerName.trim() || !customer.customerPhone.trim()) {
      toast.error('نام و شماره‌ی تماس را وارد کنید.');
      return;
    }
    setBusy(true);
    try {
      const created = await api.post<RetailOrder>(
        `/public/shops/${slug}/orders`,
        {
          customerName: customer.customerName.trim(),
          customerPhone: customer.customerPhone.trim(),
          customerAddress: customer.customerAddress.trim() || undefined,
          neighborhood: customer.neighborhood || undefined,
          note: customer.note.trim() || undefined,
          paymentMethod: customer.paymentMethod,
          deliveryMethod: customer.deliveryMethod,
          items: [{ productId: product.id, quantity }],
        },
      );
      setOrder(created);
      toast.success('سفارش ثبت شد');
    } catch {
      // API client already surfaced the error
    } finally {
      setBusy(false);
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
          شماره سفارش:{' '}
          <span className="font-bold text-ink">{order.orderNumber}</span>
        </p>
        <p className="text-sm font-bold text-brand">
          مبلغ قابل پرداخت: {order.totalAmount.toLocaleString('fa-IR')} تومان
        </p>
        {order.trackingToken ? (
          <Link
            href={`/shop/${slug}/track/${order.trackingToken}`}
            className="text-xs font-bold text-brand underline"
          >
            مشاهده‌ی صفحه‌ی پیگیری سفارش
          </Link>
        ) : null}
        {order.paymentMethod === 'CARD_TO_CARD' && card ? (
          <CardToCardForm
            slug={slug}
            card={card}
            referenceType="ORDER"
            referenceId={order.id}
            defaultAmount={order.totalAmount}
            title="پرداخت سفارش با کارت به کارت"
          />
        ) : null}
        <button
          type="button"
          onClick={() => {
            setOrder(null);
            setOpen(false);
          }}
          className="indeed-btn justify-self-start"
        >
          بازگشت به محصول
        </button>
      </div>
    );
  }

  return (
    <div className="indeed-panel flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">قیمت</span>
        <span className="text-lg font-extrabold text-brand">
          {product.price.toLocaleString('fa-IR')} تومان
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3.5 text-emerald-600" aria-hidden />
          {out
            ? 'ناموجود'
            : `${product.stock.toLocaleString('fa-IR')} ${product.unit} موجود`}
        </span>
        {settings.snapEnabled ? (
          <span className="flex items-center gap-1">
            <Truck className="size-3.5" aria-hidden />
            ارسال با پیک
          </span>
        ) : null}
      </div>

      {!open ? (
        <button
          type="button"
          disabled={out}
          onClick={() => setOpen(true)}
          className="indeed-btn indeed-btn-primary w-full disabled:opacity-50"
        >
          <ShoppingBag className="size-4" aria-hidden />
          {out ? 'ناموجود' : 'ثبت سفارش'}
        </button>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted">تعداد</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity <= 1}
                className="rounded border px-1.5 py-0.5 disabled:opacity-40"
                aria-label="کم‌کردن"
              >
                <Minus className="size-3" aria-hidden />
              </button>
              <span className="w-8 text-center text-sm font-bold">
                {quantity.toLocaleString('fa-IR')}
              </span>
              <button
                type="button"
                onClick={() =>
                  setQuantity((value) => Math.min(max, value + 1))
                }
                disabled={quantity >= max}
                className="rounded border px-1.5 py-0.5 disabled:opacity-40"
                aria-label="افزودن"
              >
                <Plus className="size-3" aria-hidden />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {settings.snapEnabled ? (
              <label className="flex items-center gap-1.5 rounded-lg border border-[var(--vintage-border)] px-2.5 py-1.5 text-xs">
                <input
                  type="radio"
                  name="deliveryMethod"
                  checked={customer.deliveryMethod === 'SNAP'}
                  onChange={() =>
                    setCustomer((prev) => ({
                      ...prev,
                      deliveryMethod: 'SNAP',
                    }))
                  }
                />
                ارسال با پیک
              </label>
            ) : null}
            {settings.pickupEnabled ? (
              <label className="flex items-center gap-1.5 rounded-lg border border-[var(--vintage-border)] px-2.5 py-1.5 text-xs">
                <input
                  type="radio"
                  name="deliveryMethod"
                  checked={customer.deliveryMethod === 'PICKUP'}
                  onChange={() =>
                    setCustomer((prev) => ({
                      ...prev,
                      deliveryMethod: 'PICKUP',
                    }))
                  }
                />
                دریافت حضوری
              </label>
            ) : null}
          </div>

          <input
            className={field}
            placeholder="نام و نام خانوادگی"
            value={customer.customerName}
            onChange={(event) =>
              setCustomer((prev) => ({
                ...prev,
                customerName: event.target.value,
              }))
            }
            required
          />
          <input
            className={field}
            placeholder="شماره موبایل"
            value={customer.customerPhone}
            onChange={(event) =>
              setCustomer((prev) => ({
                ...prev,
                customerPhone: event.target.value,
              }))
            }
            required
          />
          {customer.deliveryMethod === 'SNAP' ? (
            <>
              {settings.neighborhoods.length > 0 ? (
                <select
                  className={field}
                  value={customer.neighborhood}
                  onChange={(event) =>
                    setCustomer((prev) => ({
                      ...prev,
                      neighborhood: event.target.value,
                    }))
                  }
                >
                  <option value="">انتخاب محله…</option>
                  {settings.neighborhoods.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              ) : null}
              <input
                className={field}
                placeholder="نشانی ارسال (خیابان، پلاک)"
                value={customer.customerAddress}
                onChange={(event) =>
                  setCustomer((prev) => ({
                    ...prev,
                    customerAddress: event.target.value,
                  }))
                }
              />
            </>
          ) : null}
          <select
            className={field}
            value={customer.paymentMethod}
            onChange={(event) =>
              setCustomer((prev) => ({
                ...prev,
                paymentMethod: event.target.value,
              }))
            }
          >
            <option value="CARD_TO_CARD">کارت به کارت</option>
            <option value="CASH_ON_DELIVERY">پرداخت در محل</option>
          </select>
          <textarea
            className={field}
            rows={2}
            placeholder="یادداشت سفارش (اختیاری)"
            value={customer.note}
            onChange={(event) =>
              setCustomer((prev) => ({ ...prev, note: event.target.value }))
            }
          />

          <div className="flex flex-col gap-1 border-t border-[var(--vintage-border)] pt-2 text-xs text-muted">
            <div className="flex items-center justify-between">
              <span>جمع کالا</span>
              <span>{itemsTotal.toLocaleString('fa-IR')} تومان</span>
            </div>
            <div className="flex items-center justify-between">
              <span>کرایه‌ی ارسال</span>
              <span>{deliveryFee.toLocaleString('fa-IR')} تومان</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">مبلغ نهایی</span>
              <span className="font-extrabold text-brand">
                {total.toLocaleString('fa-IR')} تومان
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="indeed-btn indeed-btn-primary w-full disabled:opacity-50"
          >
            {busy ? 'در حال ثبت…' : 'ثبت سفارش'}
          </button>
        </form>
      )}
    </div>
  );
}
