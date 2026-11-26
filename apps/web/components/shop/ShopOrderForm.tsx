'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Check, Minus, Plus, ShoppingBag, Truck } from 'lucide-react';

import { CardToCardForm } from '@/components/payments/CardToCardForm';
import { PayerCardField } from '@/components/shop/PayerCardField';
import { api, type PublicShop, type RetailOrder } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { toast } from '@/lib/toast';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

export function ShopOrderForm({ shop }: { shop: PublicShop }) {
  const settings = shop.settings;
  const slug = shop.workspace.publicSlug ?? '';
  const { items: cartItems, setQuantity, clearShop } = useCart();
  const { user } = useAuth();
  const [customer, setCustomer] = useState({
    customerName: user?.fullName ?? '',
    customerPhone: user?.phone ?? '',
    customerAddress: '',
    payerCardLast4: '',
    neighborhood: '',
    note: '',
    paymentMethod:
      settings.cardToCardEnabled === false ? 'CASH_ON_DELIVERY' : 'CARD_TO_CARD',
    deliveryMethod: settings.snapEnabled ? 'SNAP' : 'PICKUP',
  });
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<RetailOrder | null>(null);

  const quantities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cartItems) {
      if (item.slug === slug) map[item.productId] = item.quantity;
    }
    return map;
  }, [cartItems, slug]);

  const lines = useMemo(
    () =>
      shop.products
        .filter((product) => (quantities[product.id] ?? 0) > 0)
        .map((product) => ({
          product,
          quantity: quantities[product.id],
          total: product.price * quantities[product.id],
        })),
    [quantities, shop.products],
  );
  const itemsTotal = lines.reduce((sum, line) => sum + line.total, 0);
  const cardAvailable = settings.cardToCardEnabled !== false;
  const cashAvailable = settings.cashOnDeliveryEnabled !== false;
  const paymentAvailable = cardAvailable || cashAvailable;
  const deliveryAvailable = settings.snapEnabled || settings.pickupEnabled;
  const deliveryFee =
    customer.deliveryMethod === 'SNAP' ? settings.deliveryFee : 0;
  const total = itemsTotal + deliveryFee;

  function change(productId: string, delta: number, max: number) {
    const next = Math.max(
      0,
      Math.min(max, (quantities[productId] ?? 0) + delta),
    );
    setQuantity(slug, productId, next);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (lines.length === 0) {
      toast.error('سبد خرید خالی است');
      return;
    }
    if (!customer.customerName.trim() || !customer.customerPhone.trim()) return;
    if (
      customer.paymentMethod === 'CARD_TO_CARD' &&
      customer.payerCardLast4.length !== 4
    ) {
      toast.error('۴ رقم آخر کارت خود را وارد کنید');
      return;
    }
    setBusy(true);
    try {
      const created = await api.post<RetailOrder>(
        `/public/shops/${shop.workspace.publicSlug}/orders`,
        {
          customerName: customer.customerName.trim(),
          customerPhone: customer.customerPhone.trim(),
          customerAddress: customer.customerAddress.trim() || undefined,
          payerCardLast4:
            customer.paymentMethod === 'CARD_TO_CARD'
              ? customer.payerCardLast4
              : undefined,
          neighborhood: customer.neighborhood || undefined,
          note: customer.note.trim() || undefined,
          paymentMethod: customer.paymentMethod,
          deliveryMethod: customer.deliveryMethod,
          items: lines.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity,
          })),
        },
      );
      setOrder(created);
      clearShop(slug);
      toast.success('سفارش ثبت شد');
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
          شماره سفارش: <span className="font-bold text-ink">{order.orderNumber}</span>
        </p>
        <p className="text-sm font-bold text-brand">
          مبلغ قابل پرداخت: {order.totalAmount.toLocaleString('fa-IR')} تومان
        </p>
        {order.deliveryMethod === 'SNAP' && order.deliveryFee > 0 ? (
          <p className="text-[11px] text-muted">
            شامل {order.deliveryFee.toLocaleString('fa-IR')} تومان کرایه‌ی ارسال
          </p>
        ) : null}
        {order.trackingToken ? (
          <Link
            href={`/shop/${shop.workspace.publicSlug}/track/${order.trackingToken}`}
            className="text-xs font-bold text-brand underline"
          >
            مشاهده‌ی صفحه‌ی پیگیری سفارش
          </Link>
        ) : null}
        {order.paymentMethod === 'CARD_TO_CARD' && shop.card ? (
          order.status === 'CONFIRMED' ? (
            <CardToCardForm
              slug={shop.workspace.publicSlug ?? ''}
              card={shop.card}
              referenceType="ORDER"
              referenceId={order.id}
              defaultAmount={order.totalAmount}
              defaultCustomerName={order.customerName}
              defaultCustomerPhone={order.customerPhone}
              title="پرداخت سفارش با کارت به کارت"
            />
          ) : (
            <p className="rounded-lg bg-amber-50 p-3 text-[11px] leading-6 text-amber-800">
              سفارش شما در انتظار تأیید فروشنده است. پس از تأیید، از همین صفحه‌ی
              پیگیری می‌توانید مبلغ را کارت‌به‌کارت کنید و رسید را ارسال کنید.
            </p>
          )
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
            const quantity = quantities[product.id] ?? 0;
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

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-bold text-muted">روش تحویل</legend>
        <div className="flex flex-wrap gap-2">
          {settings.snapEnabled ? (
            <label className="flex items-center gap-1.5 rounded-lg border border-[var(--vintage-border)] px-2.5 py-1.5 text-xs">
              <input
                type="radio"
                name="deliveryMethod"
                value="SNAP"
                checked={customer.deliveryMethod === 'SNAP'}
                onChange={() => setCustomer((prev) => ({ ...prev, deliveryMethod: 'SNAP' }))}
              />
              <Truck className="size-3.5" aria-hidden />
              ارسال با پیک
              {settings.deliveryFee > 0 ? ` (${settings.deliveryFee.toLocaleString('fa-IR')} تومان)` : ''}
            </label>
          ) : null}
          {settings.pickupEnabled ? (
            <label className="flex items-center gap-1.5 rounded-lg border border-[var(--vintage-border)] px-2.5 py-1.5 text-xs">
              <input
                type="radio"
                name="deliveryMethod"
                value="PICKUP"
                checked={customer.deliveryMethod === 'PICKUP'}
                onChange={() => setCustomer((prev) => ({ ...prev, deliveryMethod: 'PICKUP' }))}
              />
              دریافت حضوری
            </label>
          ) : null}
        </div>
      </fieldset>

      {customer.deliveryMethod === 'PICKUP' ? (
        <div className="rounded-lg bg-[var(--vintage-paper)] p-2 text-[11px] leading-6 text-muted">
          {settings.pickupAddress ? <p>نشانی مراجعه: {settings.pickupAddress}</p> : null}
          {settings.pickupHours ? <p>ساعات مراجعه: {settings.pickupHours}</p> : null}
          {!settings.pickupAddress && !settings.pickupHours
            ? 'برای هماهنگی مراجعه با فروشگاه تماس بگیرید.'
            : null}
        </div>
      ) : null}

      <div className="grid gap-2">
        <input className={field} placeholder="نام و نام خانوادگی" value={customer.customerName} onChange={(event) => setCustomer((prev) => ({ ...prev, customerName: event.target.value }))} required />
        <input className={field} placeholder="شماره موبایل" value={customer.customerPhone} onChange={(event) => setCustomer((prev) => ({ ...prev, customerPhone: event.target.value }))} required />
        {customer.deliveryMethod === 'SNAP' ? (
          <>
            {settings.neighborhoods.length > 0 ? (
              <select className={field} value={customer.neighborhood} onChange={(event) => setCustomer((prev) => ({ ...prev, neighborhood: event.target.value }))}>
                <option value="">انتخاب محله…</option>
                {settings.neighborhoods.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            ) : null}
            <input className={field} placeholder="نشانی ارسال (خیابان، پلاک)" value={customer.customerAddress} onChange={(event) => setCustomer((prev) => ({ ...prev, customerAddress: event.target.value }))} />
          </>
        ) : null}
        <select className={field} value={customer.paymentMethod} onChange={(event) => setCustomer((prev) => ({ ...prev, paymentMethod: event.target.value }))}>
          {cardAvailable ? <option value="CARD_TO_CARD">کارت به کارت</option> : null}
          {cashAvailable ? <option value="CASH_ON_DELIVERY">پرداخت در محل</option> : null}
        </select>
        {customer.paymentMethod === 'CARD_TO_CARD' ? (
          <PayerCardField
            value={customer.payerCardLast4}
            onChange={(value) =>
              setCustomer((prev) => ({ ...prev, payerCardLast4: value }))
            }
          />
        ) : null}
        {!paymentAvailable ? (
          <p className="text-[11px] text-amber-700">
            روش پرداخت توسط مدیر غیرفعال شده است؛ لطفاً بعداً تلاش کنید.
          </p>
        ) : null}
        {!deliveryAvailable ? (
          <p className="text-[11px] text-amber-700">
            روش تحویل توسط مدیر غیرفعال شده است؛ لطفاً بعداً تلاش کنید.
          </p>
        ) : null}
        <textarea className={field} rows={2} placeholder="یادداشت سفارش" value={customer.note} onChange={(event) => setCustomer((prev) => ({ ...prev, note: event.target.value }))} />
      </div>

      <div className="flex flex-col gap-1 border-t border-[var(--vintage-border)] pt-3 text-sm">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>جمع کالاها</span>
          <span>{itemsTotal.toLocaleString('fa-IR')} تومان</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted">
          <span>کرایه‌ی ارسال</span>
          <span>{deliveryFee.toLocaleString('fa-IR')} تومان</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">مبلغ نهایی</span>
          <span className="font-extrabold text-brand">{total.toLocaleString('fa-IR')} تومان</span>
        </div>
      </div>
      {settings.reservationMinutes > 0 ? (
        <p className="text-[11px] text-muted">
          پس از ثبت سفارش، {settings.reservationMinutes.toLocaleString('fa-IR')} دقیقه برای ارسال رسید
          فرصت دارید؛ سپس موجودی آزاد می‌شود.
        </p>
      ) : null}
      <button type="submit" disabled={busy || lines.length === 0 || !paymentAvailable || !deliveryAvailable} className="indeed-btn indeed-btn-primary disabled:opacity-50">
        {busy ? 'در حال ثبت…' : 'ثبت سفارش'}
      </button>
    </form>
  );
}
