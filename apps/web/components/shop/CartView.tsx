'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
} from 'lucide-react';

import { MyAddressesPanel } from '@/components/shop/MyAddressesPanel';
import { OrderTrackingLoader } from '@/components/shop/OrderTrackingPanel';
import {
  api,
  type PublicShop,
  type RetailOrder,
  type UserAddress,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCart, type CartItem } from '@/lib/cart';
import { toast } from '@/lib/toast';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

interface PlacedOrder {
  slug: string;
  shopName: string;
  token: string;
}

const PLACED_KEY = 'alooshomal.placed_orders.v1';

function groupByShop(items: CartItem[]) {
  const groups = new Map<string, { slug: string; shopName: string; items: CartItem[] }>();
  for (const item of items) {
    const group = groups.get(item.slug) ?? {
      slug: item.slug,
      shopName: item.shopName,
      items: [],
    };
    group.items.push(item);
    groups.set(item.slug, group);
  }
  return [...groups.values()];
}

function ShopCartCheckout({
  slug,
  shopName,
  items,
  prefill,
  onPlaced,
}: {
  slug: string;
  shopName: string;
  items: CartItem[];
  prefill?: {
    name: string;
    phone: string;
    address: string;
    neighborhood: string;
  };
  onPlaced: (placed: PlacedOrder) => void;
}) {
  const { clearShop } = useCart();
  const [shop, setShop] = useState<PublicShop | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState({
    customerName: prefill?.name ?? '',
    customerPhone: prefill?.phone ?? '',
    customerAddress: prefill?.address ?? '',
    neighborhood: prefill?.neighborhood ?? '',
    note: '',
    paymentMethod: 'CARD_TO_CARD',
    deliveryMethod: 'SNAP',
  });

  // Keep the contact/address fields in sync when the customer picks a saved
  // address (or the profile finishes loading) — never clobber a typed value
  // with an empty prefill.
  useEffect(() => {
    if (!prefill) return;
    setCustomer((prev) => ({
      ...prev,
      customerName: prefill.name || prev.customerName,
      customerPhone: prefill.phone || prev.customerPhone,
      customerAddress: prefill.address || prev.customerAddress,
      neighborhood: prefill.neighborhood || prev.neighborhood,
    }));
  }, [prefill]);

  useEffect(() => {
    api
      .get<PublicShop>(`/public/shops/${encodeURIComponent(slug)}`)
      .then((data) => {
        setShop(data);
        setCustomer((prev) => ({
          ...prev,
          paymentMethod:
            data.settings.cardToCardEnabled === false
              ? 'CASH_ON_DELIVERY'
              : 'CARD_TO_CARD',
          deliveryMethod: data.settings.snapEnabled
            ? 'SNAP'
            : data.settings.pickupEnabled
              ? 'PICKUP'
              : 'SNAP',
        }));
      })
      .catch(() => setError('فروشگاه در دسترس نیست'))
      .finally(() => setLoading(false));
  }, [slug]);

  const itemsTotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const deliveryFee =
    customer.deliveryMethod === 'SNAP' && shop ? shop.settings.deliveryFee : 0;
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
        `/public/shops/${encodeURIComponent(slug)}/orders`,
        {
          customerName: customer.customerName.trim(),
          customerPhone: customer.customerPhone.trim(),
          customerAddress: customer.customerAddress.trim() || undefined,
          neighborhood: customer.neighborhood || undefined,
          note: customer.note.trim() || undefined,
          paymentMethod: customer.paymentMethod,
          deliveryMethod: customer.deliveryMethod,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      );
      if (created.trackingToken) {
        onPlaced({ slug, shopName, token: created.trackingToken });
      }
      clearShop(slug);
      toast.success('سفارش ثبت شد');
    } catch {
      // API client already surfaced the error
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        در حال آماده‌سازی تسویه…
      </p>
    );
  }
  if (error || !shop) {
    return (
      <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
        {error ?? 'فروشگاه در دسترس نیست'}
      </p>
    );
  }

  const snapAvailable = shop.settings.snapEnabled;
  const pickupAvailable = shop.settings.pickupEnabled;
  const cardAvailable = shop.settings.cardToCardEnabled !== false;
  const cashAvailable = shop.settings.cashOnDeliveryEnabled !== false;
  const paymentAvailable = cardAvailable || cashAvailable;
  const deliveryAvailable = snapAvailable || pickupAvailable;

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 border-t border-dashed border-[var(--vintage-border)] pt-3">
      <div className="flex flex-wrap gap-2 text-xs">
        {snapAvailable ? (
          <label className="flex items-center gap-1.5 rounded-lg border border-[var(--vintage-border)] px-2.5 py-1.5">
            <input
              type="radio"
              name={`delivery-${slug}`}
              checked={customer.deliveryMethod === 'SNAP'}
              onChange={() =>
                setCustomer((prev) => ({ ...prev, deliveryMethod: 'SNAP' }))
              }
            />
            <Truck className="size-3.5" aria-hidden />
            ارسال با پیک
            {shop.settings.deliveryFee > 0
              ? ` (${shop.settings.deliveryFee.toLocaleString('fa-IR')} تومان)`
              : ''}
          </label>
        ) : null}
        {pickupAvailable ? (
          <label className="flex items-center gap-1.5 rounded-lg border border-[var(--vintage-border)] px-2.5 py-1.5">
            <input
              type="radio"
              name={`delivery-${slug}`}
              checked={customer.deliveryMethod === 'PICKUP'}
              onChange={() =>
                setCustomer((prev) => ({ ...prev, deliveryMethod: 'PICKUP' }))
              }
            />
            دریافت حضوری
          </label>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          className={field}
          placeholder="نام و نام خانوادگی"
          value={customer.customerName}
          onChange={(event) =>
            setCustomer((prev) => ({ ...prev, customerName: event.target.value }))
          }
          required
        />
        <input
          className={field}
          placeholder="شماره موبایل"
          value={customer.customerPhone}
          onChange={(event) =>
            setCustomer((prev) => ({ ...prev, customerPhone: event.target.value }))
          }
          required
        />
        {customer.deliveryMethod === 'SNAP' ? (
          <>
            {shop.settings.neighborhoods.length > 0 ? (
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
                {shop.settings.neighborhoods.map((item) => (
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
            setCustomer((prev) => ({ ...prev, paymentMethod: event.target.value }))
          }
        >
          {cardAvailable ? <option value="CARD_TO_CARD">کارت به کارت</option> : null}
          {cashAvailable ? <option value="CASH_ON_DELIVERY">پرداخت در محل</option> : null}
        </select>
        <textarea
          className={`${field} sm:col-span-2`}
          rows={2}
          placeholder="یادداشت سفارش (اختیاری)"
          value={customer.note}
          onChange={(event) =>
            setCustomer((prev) => ({ ...prev, note: event.target.value }))
          }
        />
      </div>

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

      <div className="flex flex-col gap-1 text-xs text-muted">
        <div className="flex items-center justify-between">
          <span>جمع کالاها</span>
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
        disabled={busy || !paymentAvailable || !deliveryAvailable}
        className="indeed-btn indeed-btn-primary disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Check className="size-4" aria-hidden />
        )}
        ثبت سفارش این فروشگاه
      </button>
    </form>
  );
}

export function CartView() {
  const { items, hydrated, count, setQuantity, remove } = useCart();
  const { user } = useAuth();
  const [placed, setPlaced] = useState<PlacedOrder[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(
    null,
  );
  const groups = useMemo(() => groupByShop(items), [items]);

  // Restore orders placed earlier in this browser so their status/receipt stays
  // visible on the cart page even after a reload.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PLACED_KEY);
      if (raw) setPlaced(JSON.parse(raw) as PlacedOrder[]);
    } catch {
      // ignore a corrupt cache
    }
  }, []);

  const rememberPlaced = useCallback((entry: PlacedOrder) => {
    setPlaced((prev) => {
      if (prev.some((row) => row.token === entry.token)) return prev;
      const next = [entry, ...prev];
      try {
        window.localStorage.setItem(PLACED_KEY, JSON.stringify(next));
      } catch {
        // storage may be full/unavailable; the in-memory list still works
      }
      return next;
    });
  }, []);

  const prefill = useMemo(
    () => ({
      name: selectedAddress?.receiverName || user?.fullName || '',
      phone: selectedAddress?.phone || user?.phone || '',
      address: selectedAddress?.address || '',
      neighborhood: selectedAddress?.neighborhood || '',
    }),
    [selectedAddress, user?.fullName, user?.phone],
  );

  if (!hydrated) {
    return (
      <div className="indeed-panel flex items-center gap-2 p-6 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        در حال بارگذاری سبد خرید…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <MyAddressesPanel onSelect={setSelectedAddress} />

      {placed.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-extrabold text-ink">
            پیگیری سفارش‌های اخیر
          </h2>
          {placed.map((entry) => (
            <div
              key={entry.token}
              className="indeed-panel flex flex-col gap-3 p-5"
            >
              <p className="flex items-center gap-2 text-sm font-extrabold text-emerald-700">
                <Check className="size-4" aria-hidden />
                سفارش «{entry.shopName}» ثبت شد
              </p>
              <OrderTrackingLoader slug={entry.slug} token={entry.token} />
            </div>
          ))}
        </section>
      ) : null}

      {groups.length === 0 ? (
        placed.length === 0 ? (
          <div className="indeed-panel flex flex-col items-center gap-3 p-10 text-center">
            <ShoppingBag className="size-10 text-muted" aria-hidden />
            <p className="text-sm font-bold text-ink">سبد خرید شما خالی است</p>
            <p className="text-xs text-muted">
              از صفحه‌ی محصولات فروشگاه‌ها، کالای موردنظر را به سبد اضافه کنید.
            </p>
            <Link href="/shop" className="indeed-btn indeed-btn-primary">
              رفتن به فروشگاه‌ها
            </Link>
          </div>
        ) : null
      ) : (
        <>
          <p className="text-xs text-muted">
            {count.toLocaleString('fa-IR')} قلم در سبد خرید شما
          </p>
          {groups.map((group) => {
            const subtotal = group.items.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0,
            );
            return (
              <section key={group.slug} className="indeed-panel flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-extrabold text-ink">
                    {group.shopName || 'فروشگاه'}
                  </h2>
                  <Link
                    href={`/shop/${group.slug}`}
                    className="text-[11px] font-bold text-brand underline"
                  >
                    مشاهده‌ی فروشگاه
                  </Link>
                </div>
                <ul className="flex flex-col gap-2">
                  {group.items.map((item) => (
                    <li
                      key={item.productId}
                      className="flex items-center gap-3 rounded-lg border border-[var(--vintage-border)] p-2"
                    >
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="size-14 rounded object-cover"
                        />
                      ) : (
                        <span className="flex size-14 items-center justify-center rounded bg-[var(--vintage-paper)]">
                          <ShoppingBag className="size-4 text-muted" aria-hidden />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-ink">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-muted">
                          {item.price.toLocaleString('fa-IR')} تومان
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity(
                              item.slug,
                              item.productId,
                              item.quantity - 1,
                            )
                          }
                          className="rounded border px-1.5 py-0.5"
                          aria-label="کم‌کردن"
                        >
                          <Minus className="size-3" aria-hidden />
                        </button>
                        <span className="w-6 text-center text-xs font-bold">
                          {item.quantity.toLocaleString('fa-IR')}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity(
                              item.slug,
                              item.productId,
                              item.quantity + 1,
                            )
                          }
                          disabled={item.quantity >= item.stock}
                          className="rounded border px-1.5 py-0.5 disabled:opacity-40"
                          aria-label="افزودن"
                        >
                          <Plus className="size-3" aria-hidden />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(item.slug, item.productId)}
                        className="text-red-600"
                        aria-label="حذف از سبد"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="flex items-center justify-between text-sm">
                  <span className="text-muted">جمع این فروشگاه</span>
                  <span className="font-extrabold text-brand">
                    {subtotal.toLocaleString('fa-IR')} تومان
                  </span>
                </p>
                <ShopCartCheckout
                  slug={group.slug}
                  shopName={group.shopName}
                  items={group.items}
                  prefill={prefill}
                  onPlaced={rememberPlaced}
                />
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
