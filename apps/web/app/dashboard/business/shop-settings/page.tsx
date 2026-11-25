'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Store } from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { api, type RetailShopSettings } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

type FormState = {
  city: string;
  neighborhoods: string;
  deliveryFee: string;
  deliveryEnabled: boolean;
  snapEnabled: boolean;
  pickupEnabled: boolean;
  pickupAddress: string;
  pickupHours: string;
  supportPhone: string;
  returnPolicy: string;
  reservationMinutes: string;
  orderApprovalMode: 'MANUAL' | 'AUTO';
};

const empty: FormState = {
  city: '',
  neighborhoods: '',
  deliveryFee: '0',
  deliveryEnabled: true,
  snapEnabled: true,
  pickupEnabled: true,
  pickupAddress: '',
  pickupHours: '',
  supportPhone: '',
  returnPolicy: '',
  reservationMinutes: '30',
  orderApprovalMode: 'MANUAL',
};

export default function ShopSettingsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [form, setForm] = useState<FormState>(empty);
  const [capabilities, setCapabilities] = useState({
    snapEnabled: true,
    pickupEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/shop-settings');
      return;
    }
    if (!enabled) return;
    let active = true;
    Promise.all([
      api.get<RetailShopSettings>('/retail/shop-settings'),
      api
        .get<{ retailCapabilities?: { snapEnabled?: boolean; pickupEnabled?: boolean } }>(
          '/settings/public',
        )
        .catch(() => null),
    ])
      .then(([settings, publicSettings]) => {
        if (!active) return;
        setForm({
          city: settings.city ?? '',
          neighborhoods: settings.neighborhoods.join('، '),
          deliveryFee: String(settings.deliveryFee),
          deliveryEnabled: settings.deliveryEnabled,
          snapEnabled: settings.snapEnabled,
          pickupEnabled: settings.pickupEnabled,
          pickupAddress: settings.pickupAddress ?? '',
          pickupHours: settings.pickupHours ?? '',
          supportPhone: settings.supportPhone ?? '',
          returnPolicy: settings.returnPolicy ?? '',
          reservationMinutes: String(settings.reservationMinutes),
          orderApprovalMode:
            settings.orderApprovalMode === 'AUTO' ? 'AUTO' : 'MANUAL',
        });
        setCapabilities({
          snapEnabled: publicSettings?.retailCapabilities?.snapEnabled !== false,
          pickupEnabled:
            publicSettings?.retailCapabilities?.pickupEnabled !== false,
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hydrated, token, router, enabled]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.put('/retail/shop-settings', {
        city: form.city.trim() || undefined,
        neighborhoods: form.neighborhoods
          .split(/[،,\n]/)
          .map((item) => item.trim())
          .filter(Boolean),
        deliveryFee: Number(form.deliveryFee) || 0,
        deliveryEnabled: form.deliveryEnabled,
        snapEnabled: form.snapEnabled,
        pickupEnabled: form.pickupEnabled,
        pickupAddress: form.pickupAddress.trim() || undefined,
        pickupHours: form.pickupHours.trim() || undefined,
        supportPhone: form.supportPhone.trim() || undefined,
        returnPolicy: form.returnPolicy.trim() || undefined,
        reservationMinutes: Number(form.reservationMinutes) || 30,
        orderApprovalMode: form.orderApprovalMode,
      });
      toast.success('تنظیمات فروشگاه ذخیره شد');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">تنظیمات فروشگاه</h1>
        <p className="mt-1 text-sm text-muted">
          محدوده‌ی فروش شهری، کرایه‌ی ارسال، دریافت حضوری و شرایط مرجوعی را اینجا
          تعیین کنید.
        </p>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      {loading ? (
        <p className="text-sm text-muted">در حال بارگذاری…</p>
      ) : (
        <form onSubmit={save} className="indeed-panel grid gap-3 p-5 md:grid-cols-2">
          <div className="flex items-center gap-2 text-sm font-extrabold text-ink md:col-span-2">
            <Store className="size-4" aria-hidden />
            محدوده و تحویل
          </div>
          <label className="flex flex-col gap-1 text-xs text-muted">
            شهر
            <input className={field} value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} placeholder="مثلاً تنکابن" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            محله‌های تحت پوشش (با ویرگول)
            <input className={field} value={form.neighborhoods} onChange={(event) => setForm((prev) => ({ ...prev, neighborhoods: event.target.value }))} placeholder="خالی = کل شهر" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            کرایه‌ی ثابت ارسال (تومان)
            <input className={field} type="number" min={0} value={form.deliveryFee} onChange={(event) => setForm((prev) => ({ ...prev, deliveryFee: event.target.value }))} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            مهلت ارسال رسید (دقیقه)
            <input className={field} type="number" min={5} value={form.reservationMinutes} onChange={(event) => setForm((prev) => ({ ...prev, reservationMinutes: event.target.value }))} />
          </label>
          <div className="flex flex-wrap gap-4 text-xs text-muted md:col-span-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.deliveryEnabled} disabled={!capabilities.snapEnabled} onChange={(event) => setForm((prev) => ({ ...prev, deliveryEnabled: event.target.checked }))} />
              ارسال با پیک فعال
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.snapEnabled} disabled={!capabilities.snapEnabled} onChange={(event) => setForm((prev) => ({ ...prev, snapEnabled: event.target.checked }))} />
              اسنپ فعال
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.pickupEnabled} disabled={!capabilities.pickupEnabled} onChange={(event) => setForm((prev) => ({ ...prev, pickupEnabled: event.target.checked }))} />
              دریافت حضوری فعال
            </label>
            {!capabilities.snapEnabled ? (
              <p className="w-full text-[11px] text-amber-700">
                ارسال با پیک توسط مدیر به‌صورت سراسری غیرفعال شده است.
              </p>
            ) : null}
            {!capabilities.pickupEnabled ? (
              <p className="w-full text-[11px] text-amber-700">
                دریافت حضوری توسط مدیر به‌صورت سراسری غیرفعال شده است.
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2 text-sm font-extrabold text-ink md:col-span-2">
            جریان تأیید سفارش
          </div>
          <label className="flex flex-col gap-1 text-xs text-muted md:col-span-2">
            نحوه‌ی تأیید سفارش
            <select
              className={field}
              value={form.orderApprovalMode}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  orderApprovalMode: event.target.value as 'MANUAL' | 'AUTO',
                }))
              }
            >
              <option value="MANUAL">
                تأیید فروشنده پیش از پرداخت (سفارش ابتدا در انتظار تأیید می‌ماند)
              </option>
              <option value="AUTO">
                پرداخت بلافاصله پس از ثبت سفارش (بدون نیاز به تأیید فروشنده)
              </option>
            </select>
            <span className="text-[11px] text-muted">
              در هر دو حالت، مشتری پس از پرداخت کارت‌به‌کارت رسید را ارسال می‌کند و
              شما آن را از بخش «کارت به کارت» تأیید یا رد می‌کنید.
            </span>
          </label>

          <div className="flex items-center gap-2 text-sm font-extrabold text-ink md:col-span-2">
            دریافت حضوری و پشتیبانی
          </div>
          <label className="flex flex-col gap-1 text-xs text-muted">
            نشانی دریافت حضوری
            <input className={field} value={form.pickupAddress} onChange={(event) => setForm((prev) => ({ ...prev, pickupAddress: event.target.value }))} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            ساعات مراجعه
            <input className={field} value={form.pickupHours} onChange={(event) => setForm((prev) => ({ ...prev, pickupHours: event.target.value }))} placeholder="مثلاً ۹ تا ۲۱" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            شماره تماس پشتیبانی
            <input className={field} value={form.supportPhone} onChange={(event) => setForm((prev) => ({ ...prev, supportPhone: event.target.value }))} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted md:col-span-2">
            شرایط لغو و مرجوعی
            <textarea className={field} rows={3} value={form.returnPolicy} onChange={(event) => setForm((prev) => ({ ...prev, returnPolicy: event.target.value }))} />
          </label>

          <div className="md:col-span-2">
            <button type="submit" disabled={saving} className="indeed-btn indeed-btn-primary disabled:opacity-50">
              {saving ? 'در حال ذخیره…' : 'ذخیره تنظیمات'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
