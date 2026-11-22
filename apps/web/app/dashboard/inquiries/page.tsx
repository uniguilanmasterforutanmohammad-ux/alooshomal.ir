'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BadgeCheck,
  CheckCircle2,
  Combine,
  Loader2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface OfferField {
  name: string;
  label: string;
  required: boolean;
  type: string;
  placeholder?: string;
}

interface OfferService {
  key: string;
  label: string;
  group: string;
  description: string;
  price: number;
  fields: OfferField[];
}

interface OfferComposite {
  key: string;
  label: string;
  description: string | null;
  amount: number;
  serviceLabels: string[];
  fields: OfferField[];
}

interface OfferResponse {
  services: OfferService[];
  composites: OfferComposite[];
}

interface CheckoutResponse {
  paymentId: string;
  amount: number;
  url: string;
  paymentCode: string;
}

type Selection =
  | { kind: 'composite'; item: OfferComposite }
  | { kind: 'service'; item: OfferService };

function faPrice(value: number): string {
  return value > 0 ? `${value.toLocaleString('fa-IR')} تومان` : 'رایگان';
}

/**
 * User-facing «استعلام و خدمات» page: lists the priced Zohal modules and the
 * admin-built composite products, collects the inputs each module needs and
 * starts one gateway payment. The callback runs every module after payment.
 */
function InquiriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, hydrated } = useAuth();
  const [offer, setOffer] = useState<OfferResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [payload, setPayload] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const paymentState = searchParams.get('payment');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<OfferResponse>('/zohal/offer');
      setOffer(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بارگذاری خدمات ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace('/login?next=/dashboard/inquiries');
      return;
    }
    void load();
  }, [hydrated, token, router, load]);

  function openForm(next: Selection) {
    setSelection(next);
    setPayload({});
  }

  async function startCheckout() {
    if (!selection) return;
    setBusy(true);
    try {
      const path =
        selection.kind === 'composite'
          ? `/zohal/composites/${selection.item.key}/checkout`
          : `/zohal/services/${selection.item.key}/checkout`;
      const result = await api.post<CheckoutResponse>(path, {
        payload,
        returnTo: '/dashboard/inquiries',
      });
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setError('ساخت پرداخت در درگاه ناموفق بود.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'شروع پرداخت ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink">
          <ShieldCheck className="size-5 text-brand" aria-hidden />
          استعلام و خدمات
        </h1>
        <p className="mt-1 text-sm leading-7 text-muted">
          ماژول‌های هزینه‌دار و محصولات ترکیبی؛ با یک پرداخت، همه‌ی استعلام‌های
          محصول اجرا می‌شود.
        </p>
      </div>

      {paymentState === 'success' ? (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="size-4" aria-hidden />
          پرداخت موفق بود و استعلام‌ها اجرا شد. نتیجه در «پرداخت‌های من» است.
        </p>
      ) : paymentState === 'failed' ? (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <XCircle className="size-4" aria-hidden />
          پرداخت ناموفق بود یا استعلام اجرا نشد. جزئیات در «پرداخت‌های من» است.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {loading && !offer ? (
        <p className="text-sm text-muted">در حال بارگذاری...</p>
      ) : null}

      {offer && offer.composites.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
            <Combine className="size-4 text-brand" aria-hidden />
            محصولات ترکیبی
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {offer.composites.map((composite) => (
              <div key={composite.key} className="indeed-panel flex flex-col p-4">
                <p className="font-extrabold text-ink">{composite.label}</p>
                <p className="mt-1 text-xs leading-6 text-muted">
                  {composite.serviceLabels.join(' + ')}
                </p>
                {composite.description ? (
                  <p className="mt-1 text-xs leading-6 text-muted">
                    {composite.description}
                  </p>
                ) : null}
                <p className="mt-3 text-lg font-extrabold text-brand">
                  {faPrice(composite.amount)}
                </p>
                <button
                  type="button"
                  onClick={() => openForm({ kind: 'composite', item: composite })}
                  className="indeed-btn indeed-btn-primary mt-3 py-2 text-sm"
                >
                  خرید و استعلام
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {offer && offer.services.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
            <BadgeCheck className="size-4 text-brand" aria-hidden />
            ماژول‌های تکی
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {offer.services.map((service) => (
              <div key={service.key} className="indeed-panel flex flex-col p-4">
                <p className="font-extrabold text-ink">{service.label}</p>
                <p className="mt-1 text-xs leading-6 text-muted">
                  {service.description}
                </p>
                <p className="mt-3 text-lg font-extrabold text-brand">
                  {faPrice(service.price)}
                </p>
                <button
                  type="button"
                  onClick={() => openForm({ kind: 'service', item: service })}
                  className="indeed-btn indeed-btn-secondary mt-3 py-2 text-sm"
                >
                  خرید و استعلام
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {offer &&
      offer.services.length === 0 &&
      offer.composites.length === 0 &&
      !loading ? (
        <p className="text-sm text-muted">
          در حال حاضر خدمت هزینه‌داری برای خرید آنلاین فعال نیست.
        </p>
      ) : null}

      {selection ? (
        <div className="indeed-panel p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-extrabold text-ink">{selection.item.label}</p>
              <p className="mt-1 text-xs text-muted">
                {selection.kind === 'composite'
                  ? selection.item.serviceLabels.join(' + ')
                  : selection.item.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelection(null)}
              className="text-xs text-muted"
            >
              بستن
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {selection.item.fields.map((field) => (
              <label
                key={field.name}
                className="text-[11px] font-bold text-muted"
              >
                {field.label}
                {field.required ? ' *' : ''}
                <input
                  className="indeed-input mt-1 py-1.5 text-sm"
                  dir={field.type === 'date' ? 'ltr' : undefined}
                  placeholder={field.placeholder}
                  value={payload[field.name] ?? ''}
                  onChange={(event) =>
                    setPayload((current) => ({
                      ...current,
                      [field.name]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-6 text-muted">
            مبلغ قابل پرداخت:{' '}
            <span className="font-bold text-brand">
              {faPrice(
                selection.kind === 'composite'
                  ? selection.item.amount
                  : selection.item.price,
              )}
            </span>
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void startCheckout()}
            className={cn('indeed-btn indeed-btn-primary mt-3 py-2 text-sm')}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ShieldCheck className="size-4" aria-hidden />
            )}
            پرداخت و اجرای استعلام
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function InquiriesPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-muted">در حال بارگذاری...</div>}
    >
      <InquiriesContent />
    </Suspense>
  );
}
