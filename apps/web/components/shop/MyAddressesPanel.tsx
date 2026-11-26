'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, MapPin, Plus, Trash2 } from 'lucide-react';

import { api, type AddressInput, type UserAddress } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

const EMPTY_FORM: AddressInput = {
  title: '',
  receiverName: '',
  phone: '',
  province: '',
  city: '',
  neighborhood: '',
  address: '',
  postalCode: '',
  isDefault: false,
};

function describe(address: UserAddress) {
  return [address.province, address.city, address.neighborhood, address.address]
    .filter(Boolean)
    .join('، ');
}

/**
 * «آدرس‌های من» — the customer's saved delivery addresses. Selecting one lifts
 * it to the cart so every shop's order form is prefilled; new addresses are
 * saved to the account and reused on the next purchase.
 */
export function MyAddressesPanel({
  onSelect,
}: {
  onSelect: (address: UserAddress | null) => void;
}) {
  const { token, hydrated } = useAuth();
  const signedIn = hydrated && Boolean(token);
  const [items, setItems] = useState<UserAddress[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<AddressInput>(EMPTY_FORM);

  const load = useCallback(async () => {
    if (!signedIn) return;
    setLoading(true);
    try {
      const list = await api.get<UserAddress[]>('/addresses');
      setItems(list);
      const next = list.find((item) => item.isDefault) ?? list[0] ?? null;
      setSelectedId(next?.id ?? null);
      onSelect(next ?? null);
    } catch {
      // API client already surfaced the error.
    } finally {
      setLoading(false);
    }
  }, [signedIn, onSelect]);

  useEffect(() => {
    void load();
  }, [load]);

  function choose(address: UserAddress) {
    setSelectedId(address.id);
    onSelect(address);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.receiverName.trim() || !form.phone.trim() || !form.address.trim()) {
      toast.error('نام گیرنده، شماره تماس و نشانی الزامی است.');
      return;
    }
    setBusy(true);
    try {
      const created = await api.post<UserAddress>('/addresses', {
        ...form,
        title: form.title?.trim() || undefined,
        isDefault: items.length === 0 || form.isDefault === true,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      setItems((prev) => [created, ...prev]);
      choose(created);
      toast.success('آدرس ذخیره شد');
    } catch {
      // API client already surfaced the error.
    } finally {
      setBusy(false);
    }
  }

  async function remove(address: UserAddress) {
    setBusy(true);
    try {
      await api.delete(`/addresses/${address.id}`);
      setItems((prev) => prev.filter((item) => item.id !== address.id));
      if (selectedId === address.id) {
        setSelectedId(null);
        onSelect(null);
      }
      toast.success('آدرس حذف شد');
    } catch {
      // API client already surfaced the error.
    } finally {
      setBusy(false);
    }
  }

  if (!signedIn) {
    return (
      <section className="indeed-panel flex flex-wrap items-center gap-3 p-4 text-xs text-muted">
        <MapPin className="size-4 shrink-0 text-brand" aria-hidden />
        <span className="flex-1 leading-6">
          برای ذخیره و انتخاب «آدرس‌های من» وارد حساب خود شوید.
        </span>
        <Link href="/login?next=/cart" className="font-bold text-brand underline">
          ورود به حساب
        </Link>
      </section>
    );
  }

  return (
    <section className="indeed-panel flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <MapPin className="size-4 text-brand" aria-hidden />
          آدرس‌های من
        </h2>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-brand"
        >
          <Plus className="size-3.5" aria-hidden />
          افزودن آدرس
        </button>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-muted">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          در حال بارگذاری آدرس‌ها…
        </p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted">
          هنوز آدرسی ذخیره نکرده‌اید. با «افزودن آدرس» نشانی خود را برای خریدهای
          بعدی ذخیره کنید.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((address) => (
            <li
              key={address.id}
              className={cn(
                'flex items-start gap-2 rounded-lg border p-2.5 text-xs transition',
                address.id === selectedId
                  ? 'border-brand bg-brand-light/40'
                  : 'border-[var(--vintage-border)]',
              )}
            >
              <button
                type="button"
                onClick={() => choose(address)}
                className="flex min-w-0 flex-1 items-start gap-2 text-right"
              >
                <span
                  className={cn(
                    'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                    address.id === selectedId
                      ? 'border-brand bg-brand text-white'
                      : 'border-[var(--vintage-border)]',
                  )}
                  aria-hidden
                >
                  {address.id === selectedId ? <Check className="size-3" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block font-bold text-ink">
                    {address.title}
                    {address.isDefault ? (
                      <span className="mr-1 text-[10px] font-normal text-brand">
                        (پیش‌فرض)
                      </span>
                    ) : null}
                  </span>
                  <span className="block leading-5 text-muted">
                    {address.receiverName} · {address.phone}
                  </span>
                  <span className="block leading-5 text-muted">
                    {describe(address)}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => void remove(address)}
                disabled={busy}
                className="text-red-600 disabled:opacity-40"
                aria-label="حذف آدرس"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <form onSubmit={save} className="grid gap-2 border-t border-dashed border-[var(--vintage-border)] pt-3 sm:grid-cols-2">
          <input
            className={field}
            placeholder="عنوان (خانه، محل کار…)"
            value={form.title ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          />
          <input
            className={field}
            placeholder="نام گیرنده"
            value={form.receiverName}
            onChange={(event) => setForm((prev) => ({ ...prev, receiverName: event.target.value }))}
            required
          />
          <input
            className={field}
            placeholder="شماره تماس"
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            required
          />
          <input
            className={field}
            placeholder="استان"
            value={form.province ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, province: event.target.value }))}
          />
          <input
            className={field}
            placeholder="شهر"
            value={form.city ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
          />
          <input
            className={field}
            placeholder="محله"
            value={form.neighborhood ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, neighborhood: event.target.value }))}
          />
          <input
            className={`${field} sm:col-span-2`}
            placeholder="نشانی کامل (خیابان، پلاک، واحد)"
            value={form.address}
            onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
            required
          />
          <input
            className={field}
            placeholder="کد پستی (اختیاری)"
            value={form.postalCode ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, postalCode: event.target.value }))}
          />
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={form.isDefault === true}
              onChange={(event) => setForm((prev) => ({ ...prev, isDefault: event.target.checked }))}
            />
            آدرس پیش‌فرض باشد
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={busy} className="indeed-btn indeed-btn-primary py-2 text-xs disabled:opacity-50">
              {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Check className="size-3.5" aria-hidden />}
              ذخیره آدرس
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(EMPTY_FORM);
              }}
              className="indeed-btn indeed-btn-secondary py-2 text-xs"
            >
              انصراف
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
