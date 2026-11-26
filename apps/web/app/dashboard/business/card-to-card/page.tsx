'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Smartphone,
  X,
  XCircle,
} from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import {
  api,
  type CardToCardAccount,
  type CardToCardPayment,
  type CardVerificationApplyResult,
  type CardVerificationOverview,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

const statusLabel: Record<string, string> = {
  PENDING: 'در انتظار بررسی',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
};

function formatCardInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function maskCard(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits.length >= 8
    ? `${digits.slice(0, 4)} **** **** ${digits.slice(-4)}`
    : digits;
}

function CardToCardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [account, setAccount] = useState<CardToCardAccount | null>(null);
  const [overview, setOverview] = useState<CardVerificationOverview | null>(
    null,
  );
  const [payments, setPayments] = useState<CardToCardPayment[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const appliedRef = useRef<string | null>(null);
  const paymentState = searchParams.get('payment');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settings, list, verification] = await Promise.all([
        api.get<CardToCardAccount | null>('/card-to-card/settings'),
        api.get<CardToCardPayment[]>(
          `/card-to-card/payments${filter ? `?status=${filter}` : ''}`,
        ),
        api.get<CardVerificationOverview>('/card-to-card/verification'),
      ]);
      setAccount(settings);
      setPayments(list);
      setOverview(verification);
      if (settings) {
        setCardNumber(
          (current) => current || formatCardInput(settings.cardNumber),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/card-to-card');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  const applyResult = useCallback(
    async (silent = false) => {
      setApplying(true);
      try {
        const result = await api.post<CardVerificationApplyResult>(
          '/card-to-card/verification/apply',
        );
        if (result.applied) {
          toast.success(result.message);
        } else if (!silent || result.matched === false) {
          toast.error(result.message);
        }
        await load();
        return result;
      } catch (error) {
        if (!silent) {
          toast.error(
            error instanceof Error
              ? error.message
              : 'ثبت نتیجه‌ی استعلام ناموفق بود',
          );
        }
        return null;
      } finally {
        setApplying(false);
      }
    },
    [load],
  );

  useEffect(() => {
    if (!enabled || paymentState !== 'success') return;
    if (appliedRef.current === paymentState) return;
    appliedRef.current = paymentState;
    void applyResult(true);
  }, [enabled, paymentState, applyResult]);

  async function startVerification(event: React.FormEvent) {
    event.preventDefault();
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length !== 16) {
      toast.error('شماره کارت باید دقیقاً ۱۶ رقم باشد');
      return;
    }
    setStarting(true);
    try {
      const result = await api.post<{ url?: string; amount?: number }>(
        '/card-to-card/verification/checkout',
        { cardNumber: digits },
      );
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      toast.error('ساخت پرداخت در درگاه ناموفق بود');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'شروع پرداخت ناموفق بود',
      );
    } finally {
      setStarting(false);
    }
  }

  async function review(
    payment: CardToCardPayment,
    status: 'APPROVED' | 'REJECTED',
  ) {
    const reviewNote =
      status === 'REJECTED'
        ? window.prompt('دلیل رد رسید (اختیاری):') ?? undefined
        : undefined;
    await api.patch(`/card-to-card/payments/${payment.id}`, {
      status,
      reviewNote,
    });
    await load();
    toast.success(status === 'APPROVED' ? 'رسید تأیید شد' : 'رسید رد شد');
  }

  const composite = overview?.composite ?? null;
  const profileReady = Boolean(overview?.profile.ready);
  const canStart =
    Boolean(composite?.purchasable) && profileReady && !starting && !applying;
  const latest = overview?.latest ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">پرداخت کارت به کارت</h1>
        <p className="mt-1 text-sm text-muted">
          شماره کارت بانکی خودتان را ثبت کنید تا مشتریان بتوانند مبلغ را واریز و
          رسید را برای تأیید شما ارسال کنند.
        </p>
        <Link
          href="/dashboard/business/card-to-card/sms-gateway"
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand-light px-3 py-1.5 text-xs font-bold text-brand"
        >
          <Smartphone className="size-3.5" aria-hidden />
          اتصال اپ اندروید و تأیید خودکار با پیامک بانکی
        </Link>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      {paymentState === 'failed' ? (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <XCircle className="size-4" aria-hidden />
          پرداخت ناموفق بود یا استعلام اجرا نشد. دوباره تلاش کنید.
        </p>
      ) : null}

      <section className="indeed-panel flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <ShieldCheck className="size-4 text-brand" aria-hidden />
          تأیید کارت با کد ملی و تبدیل به شبا
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-6 text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            شماره کارت باید <b>به نام خودتان</b> باشد و با کد ملی حساب شما
            مطابقت داشته باشد. پس از پرداخت هزینه‌ی استعلام، ابتدا تطابق کارت با
            کد ملی بررسی می‌شود و فقط در صورت موفقیت، شماره شبا همان کارت
            به‌صورت خودکار استخراج و ثبت می‌شود.
          </span>
        </div>

        {overview?.simulated ? (
          <div className="rounded-lg bg-sky-50 p-3 text-xs leading-6 text-sky-800">
            <p className="font-bold">حالت شبیه‌سازی محلی فعال است</p>
            <p>
              هیچ استعلام واقعی یا هزینه‌ای انجام نمی‌شود. برای تست عدم تطابق،
              شماره کارت <b dir="ltr">1111 2222 3333 4444</b> را وارد کنید.
            </p>
          </div>
        ) : null}

        {!overview && loading ? (
          <p className="text-sm text-muted">در حال بارگذاری…</p>
        ) : !overview?.available || !composite ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            محصول ترکیبی «کارت با کدملی + تبدیل به شبا» در پنل مدیریت تعریف نشده
            است. لطفاً با پشتیبانی تماس بگیرید.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--vintage-surface)] p-3 text-xs text-muted">
              <span className="font-bold text-ink">{composite.label}</span>
              <span>
                هزینه‌ی استعلام:{' '}
                <b className="text-ink">
                  {composite.amount.toLocaleString('fa-IR')} تومان
                </b>
              </span>
            </div>

            {!profileReady ? (
              <p className="rounded-lg bg-amber-50 p-3 text-xs leading-6 text-amber-800">
                برای انجام این استعلام، ابتدا کد ملی و تاریخ تولد خود را در{' '}
                <Link href="/dashboard/profile" className="font-bold underline">
                  پروفایل
                </Link>{' '}
                تکمیل کنید.
              </p>
            ) : null}

            {!composite.purchasable && composite.issues.length > 0 ? (
              <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
                {composite.issues[0]}
              </p>
            ) : null}

            <form onSubmit={startVerification} className="flex flex-col gap-3">
              <label className="text-xs font-bold text-muted">
                شماره کارت بانکی (به نام خودتان)
                <input
                  className={`${field} mt-1 text-center tracking-[0.2em]`}
                  dir="ltr"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="6037 9975 1234 5678"
                  value={cardNumber}
                  onChange={(event) =>
                    setCardNumber(formatCardInput(event.target.value))
                  }
                  required
                />
              </label>
              <button
                type="submit"
                disabled={!canStart}
                className="indeed-btn indeed-btn-primary justify-self-end disabled:opacity-50"
              >
                {starting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    در حال انتقال به درگاه…
                  </>
                ) : (
                  <>
                    <CreditCard className="size-4" aria-hidden />
                    پرداخت و استعلام کارت
                  </>
                )}
              </button>
            </form>

            {account ? (
              <div className="rounded-lg border border-[var(--vintage-border)] p-3 text-xs leading-6">
                <p className="flex items-center gap-1.5 font-bold text-emerald-700">
                  <CheckCircle2 className="size-4" aria-hidden />
                  کارت تأییدشده‌ی فعلی
                </p>
                <p className="mt-1 text-muted" dir="ltr">
                  {maskCard(account.cardNumber)}
                </p>
                <p className="text-muted">
                  صاحب کارت: <b className="text-ink">{account.holderName}</b>
                  {account.bankName ? ` • ${account.bankName}` : ''}
                </p>
                {account.iban ? (
                  <p className="text-muted" dir="ltr">
                    {account.iban}
                  </p>
                ) : (
                  <p className="text-amber-700">
                    شماره شبا ثبت نشده است؛ استعلام را دوباره انجام دهید.
                  </p>
                )}
              </div>
            ) : null}

            {latest ? (
              <div
                className={cn(
                  'rounded-lg p-3 text-xs leading-6',
                  latest.status === 'RUNNING'
                    ? 'bg-amber-50 text-amber-800'
                    : latest.matched === false
                      ? 'bg-red-50 text-red-700'
                      : latest.matched === true && !latest.iban
                        ? 'bg-red-50 text-red-700'
                      : latest.applied
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-800',
                )}
              >
                {latest.status === 'RUNNING' ? (
                  <p className="flex items-center gap-1.5 font-bold">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    استعلام در حال اجراست…
                  </p>
                ) : latest.matched === false ? (
                  <p className="flex items-center gap-1.5 font-bold">
                    <XCircle className="size-4" aria-hidden />
                    {latest.message || 'شماره کارت با کد ملی مطابقت ندارد.'}
                  </p>
                ) : latest.matched === true && !latest.iban ? (
                  <p className="flex items-center gap-1.5 font-bold">
                    <XCircle className="size-4" aria-hidden />
                    کارت با کد ملی مطابقت داشت، اما تبدیل به شبا انجام نشد؛
                    دوباره استعلام را اجرا کنید.
                  </p>
                ) : latest.applied ? (
                  <p className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="size-4" aria-hidden />
                    کارت تأیید شد و شبا ثبت گردید.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      نتیجه‌ی موفق استعلام آماده است
                      {latest.iban ? (
                        <>
                          {' '}
                          — شبا: <b dir="ltr">{latest.iban}</b>
                        </>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      onClick={() => void applyResult()}
                      disabled={applying}
                      className="indeed-btn indeed-btn-primary py-1 text-xs disabled:opacity-50"
                    >
                      {applying ? 'در حال ثبت…' : 'ثبت شبا از نتیجه‌ی استعلام'}
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold text-ink">رسیدهای دریافتی</h2>
          <div className="flex gap-1.5">
            {[
              { value: '', label: 'همه' },
              { value: 'PENDING', label: 'در انتظار' },
              { value: 'APPROVED', label: 'تأییدشده' },
              { value: 'REJECTED', label: 'ردشده' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={cn(
                  'indeed-btn py-1 text-xs',
                  filter === option.value && 'indeed-btn-primary',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted">در حال بارگذاری…</p>
        ) : payments.length === 0 ? (
          <div className="indeed-panel p-8 text-center text-sm text-muted">
            {account
              ? 'رسیدی با این وضعیت وجود ندارد.'
              : 'ابتدا کارت را تأیید کنید تا مشتریان بتوانند رسید ارسال کنند.'}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {payments.map((payment) => (
              <article key={payment.id} className="indeed-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-ink">
                      {payment.customerName} —{' '}
                      {payment.amount.toLocaleString('fa-IR')} تومان
                    </h3>
                    <p className="text-xs text-muted">
                      {payment.customerPhone}
                      {payment.trackingNumber
                        ? ` • پیگیری ${payment.trackingNumber}`
                        : ''}
                      {payment.referenceType === 'ORDER'
                        ? ' • سفارش'
                        : payment.referenceType === 'BOOKING'
                          ? ' • رزرو'
                          : ''}
                    </p>
                    {payment.note ? (
                      <p className="mt-1 text-xs text-muted">{payment.note}</p>
                    ) : null}
                    {payment.expectedAmount != null &&
                    payment.expectedAmount !== payment.amount ? (
                      <p className="mt-1 text-[11px] font-bold text-amber-700">
                        مبلغ مورد انتظار:{' '}
                        {payment.expectedAmount.toLocaleString('fa-IR')} تومان •
                        اختلاف:{' '}
                        {Math.abs(
                          payment.amount - payment.expectedAmount,
                        ).toLocaleString('fa-IR')}{' '}
                        تومان
                        {payment.amount < payment.expectedAmount
                          ? ' (کسری)'
                          : ' (اضافه‌واریز)'}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-1 text-[10px] font-bold',
                      payment.status === 'PENDING'
                        ? 'bg-amber-50 text-amber-700'
                        : payment.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700',
                    )}
                  >
                    {statusLabel[payment.status] ?? payment.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {payment.source === 'SMS_GATEWAY' ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                      <CheckCircle2 className="size-3" aria-hidden /> تأیید خودکار با پیامک بانکی
                    </span>
                  ) : (
                    <a
                      href={payment.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="indeed-btn py-1 text-xs"
                    >
                      <ExternalLink className="size-3" aria-hidden /> مشاهده رسید
                    </a>
                  )}
                  {payment.status === 'PENDING' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void review(payment, 'APPROVED')}
                        className="indeed-btn indeed-btn-primary py-1 text-xs"
                      >
                        <Check className="size-3" aria-hidden /> تأیید
                      </button>
                      <button
                        type="button"
                        onClick={() => void review(payment, 'REJECTED')}
                        className="indeed-btn py-1 text-xs text-red-600"
                      >
                        <X className="size-3" aria-hidden /> رد
                      </button>
                    </>
                  ) : payment.reviewNote ? (
                    <span className="text-xs text-muted">
                      یادداشت: {payment.reviewNote}
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function CardToCardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">در حال بارگذاری…</p>}>
      <CardToCardContent />
    </Suspense>
  );
}
