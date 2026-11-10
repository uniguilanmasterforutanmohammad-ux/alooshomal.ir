'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, CreditCard } from 'lucide-react';

/** Callback paths the simulator is allowed to hand control back to. */
const ALLOWED_CALLBACKS = [
  '/api/subscriptions/payments/callback',
  '/api/payments/request-callback',
  '/api/wallet/payments/callback',
];

function isLoopbackHost(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname);
}

/** Only same-origin or loopback callback URLs are accepted (no open redirect). */
function safeReturnUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const target = new URL(raw, window.location.origin);
    const sameOrigin = target.origin === window.location.origin;
    if (!sameOrigin && !isLoopbackHost(target.hostname)) return null;
    if (!ALLOWED_CALLBACKS.includes(target.pathname)) return null;
    return target.toString();
  } catch {
    return null;
  }
}

function SimulatedCheckoutContent() {
  const params = useSearchParams();
  const paymentCode = params.get('paymentCode') ?? '';
  const amount = Number(params.get('amount') ?? '0');
  const clientRefId = params.get('clientRefId') ?? '';
  const description = params.get('description') ?? '';
  const returnUrl = useMemo(
    () => safeReturnUrl(params.get('returnUrl')),
    [params],
  );
  const devOnly = process.env.NODE_ENV !== 'production';

  function finish(success: boolean) {
    if (!returnUrl) return;
    const target = new URL(returnUrl);
    target.searchParams.set('paymentCode', paymentCode);
    if (clientRefId) target.searchParams.set('clientRefId', clientRefId);
    if (success) {
      target.searchParams.set('refId', String(Date.now()).slice(-9));
      target.searchParams.set('status', 'OK');
    } else {
      target.searchParams.set('status', 'NOK');
    }
    window.location.href = target.toString();
  }

  if (!devOnly) {
    return (
      <div className="container-page flex min-h-screen items-center justify-center py-12">
        <div className="indeed-panel w-full max-w-md p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-500" />
          <h1 className="text-lg font-bold">درگاه آزمایشی غیرفعال است</h1>
          <p className="mt-2 text-sm text-neutral-600">
            این صفحه فقط در محیط توسعه و روی لوکال‌هاست در دسترس است.
          </p>
        </div>
      </div>
    );
  }

  if (!paymentCode || !returnUrl) {
    return (
      <div className="container-page flex min-h-screen items-center justify-center py-12">
        <div className="indeed-panel w-full max-w-md p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-500" />
          <h1 className="text-lg font-bold">لینک پرداخت معتبر نیست</h1>
          <p className="mt-2 text-sm text-neutral-600">
            پارامترهای بازگشتی درگاه ناقص یا نامعتبر هستند.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page flex min-h-screen items-center justify-center py-12">
      <div className="indeed-panel w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            <CreditCard className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold">درگاه پرداخت آزمایشی</h1>
            <p className="text-xs text-neutral-500">
              حالت توسعه — هیچ مبلغی واقعاً کسر نمی‌شود.
            </p>
          </div>
        </div>

        <dl className="mb-6 space-y-2 rounded-xl bg-neutral-50 p-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-neutral-500">مبلغ</dt>
            <dd className="font-bold">
              {amount.toLocaleString('fa-IR')} تومان
            </dd>
          </div>
          {description ? (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-neutral-500">بابت</dt>
              <dd className="text-left">{description}</dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-4">
            <dt className="text-neutral-500">کد پرداخت</dt>
            <dd className="font-mono text-xs" dir="ltr">
              {paymentCode}
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="indeed-btn-primary w-full"
            onClick={() => finish(true)}
          >
            پرداخت موفق (شبیه‌سازی)
          </button>
          <button
            type="button"
            className="indeed-btn-secondary w-full"
            onClick={() => finish(false)}
          >
            انصراف از پرداخت
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SimulatedCheckoutPage() {
  return (
    <Suspense fallback={null}>
      <SimulatedCheckoutContent />
    </Suspense>
  );
}
