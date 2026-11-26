'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  Trash2,
  UploadCloud,
  XCircle,
} from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import {
  api,
  type SmsGatewayOverview,
  type SmsGatewayTransaction,
  type SmsPairingCode,
  type SmsStatementImportResult,
  type SmsTransactionCandidateOrder,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const STATUS_META: Record<
  string,
  { label: string; className: string; hint?: string }
> = {
  AUTO_APPROVED: {
    label: 'تأیید خودکار',
    className: 'bg-emerald-50 text-emerald-700',
    hint: 'سفارش به‌صورت خودکار پرداخت‌شده شد.',
  },
  MANUALLY_LINKED: {
    label: 'تطبیق دستی',
    className: 'bg-sky-50 text-sky-700',
  },
  UNMATCHED: {
    label: 'بدون سفارش',
    className: 'bg-amber-50 text-amber-700',
    hint: 'سفارش هم‌مبلغ پیدا نشد؛ می‌توانید دستی وصل کنید.',
  },
  AMBIGUOUS: {
    label: 'چند سفارش هم‌مبلغ',
    className: 'bg-orange-50 text-orange-700',
    hint: 'بیش از یک سفارش هم‌مبلغ وجود دارد؛ انتخاب دستی لازم است.',
  },
  IGNORED: {
    label: 'نادیده‌گرفته‌شده',
    className: 'bg-slate-100 text-slate-600',
  },
};

const FILTERS = [
  { key: '', label: 'همه' },
  { key: 'AUTO_APPROVED', label: 'تأیید خودکار' },
  { key: 'UNMATCHED', label: 'بدون سفارش' },
  { key: 'AMBIGUOUS', label: 'چندگزینه‌ای' },
  { key: 'IGNORED', label: 'نادیده‌گرفته' },
];

function faPrice(value: number): string {
  return `${value.toLocaleString('fa-IR')} تومان`;
}

function faDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function relativeTime(value: string | null): string {
  if (!value) return 'هرگز';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'همین حالا';
  if (minutes < 60) return `${minutes.toLocaleString('fa-IR')} دقیقه پیش`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours.toLocaleString('fa-IR')} ساعت پیش`;
  return `${Math.round(hours / 24).toLocaleString('fa-IR')} روز پیش`;
}

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} کپی شد`);
  } catch {
    toast.error('کپی نشد؛ دستی انتخاب کنید');
  }
}

export default function SmsGatewayPage() {
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [overview, setOverview] = useState<SmsGatewayOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [pairing, setPairing] = useState<SmsPairingCode | null>(null);
  const [pairingBusy, setPairingBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [linking, setLinking] = useState<SmsGatewayTransaction | null>(null);
  const [candidates, setCandidates] = useState<SmsTransactionCandidateOrder[]>(
    [],
  );
  const [candidateBusy, setCandidateBusy] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [statementBusy, setStatementBusy] = useState(false);
  const [statementResult, setStatementResult] =
    useState<SmsStatementImportResult | null>(null);
  const [statementError, setStatementError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<SmsGatewayOverview>('/sms-gateway/overview');
      setOverview(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بارگذاری ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  const transactions = useMemo(() => {
    const rows = overview?.transactions ?? [];
    return filter ? rows.filter((row) => row.status === filter) : rows;
  }, [overview, filter]);

  async function createCode() {
    setPairingBusy(true);
    try {
      const data = await api.post<SmsPairingCode>('/sms-gateway/pairing-code');
      setPairing(data);
    } catch {
      // api client already surfaces the error toast
    } finally {
      setPairingBusy(false);
    }
  }

  async function revoke(deviceId: string) {
    if (!window.confirm('اتصال این دستگاه قطع شود؟')) return;
    setBusyId(deviceId);
    try {
      await api.delete(`/sms-gateway/devices/${deviceId}`);
      toast.success('دستگاه قطع شد');
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function rematch(id: string) {
    setBusyId(id);
    try {
      const result = await api.post<{ matched: boolean }>(
        `/sms-gateway/transactions/${id}/rematch`,
      );
      toast.success(
        result.matched ? 'تطبیق انجام شد' : 'هنوز سفارش متناظری پیدا نشد',
      );
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function ignore(id: string) {
    setBusyId(id);
    try {
      await api.post(`/sms-gateway/transactions/${id}/ignore`, {});
      toast.success('پیامک نادیده گرفته شد');
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function openLink(transaction: SmsGatewayTransaction) {
    setLinking(transaction);
    setSelectedOrder('');
    setCandidates([]);
    setCandidateBusy(true);
    try {
      const data = await api.get<{
        amount: number;
        orders: SmsTransactionCandidateOrder[];
      }>(`/sms-gateway/transactions/${transaction.id}/candidates`);
      setCandidates(data.orders);
      if (data.orders.length === 1) setSelectedOrder(data.orders[0].id);
    } finally {
      setCandidateBusy(false);
    }
  }

  async function submitLink() {
    if (!linking || !selectedOrder) return;
    setCandidateBusy(true);
    try {
      await api.post(`/sms-gateway/transactions/${linking.id}/link`, {
        orderId: selectedOrder,
      });
      toast.success('پیامک به سفارش وصل و پرداخت تأیید شد');
      setLinking(null);
      await load();
    } finally {
      setCandidateBusy(false);
    }
  }

  async function importStatement(file: File | undefined) {
    if (!file) {
      setStatementError('ابتدا فایل صورت‌حساب را انتخاب کنید');
      return;
    }
    setStatementBusy(true);
    setStatementError(null);
    setStatementResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const result = await api.upload<SmsStatementImportResult>(
        '/sms-gateway/statement/import',
        form,
      );
      setStatementResult(result);
      toast.success(
        `${result.autoApproved.toLocaleString('fa-IR')} پرداخت به‌صورت خودکار تأیید شد`,
      );
      await load();
    } catch (err) {
      setStatementError(
        err instanceof Error ? err.message : 'بارگذاری صورت‌حساب ناموفق بود',
      );
    } finally {
      setStatementBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/dashboard/business/card-to-card"
            className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-brand"
          >
            <ArrowRight className="size-3.5" aria-hidden />
            بازگشت به کارت به کارت
          </Link>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-extrabold text-ink">
            <Smartphone className="size-6 text-brand" aria-hidden />
            دروازه‌ی پیامک بانکی
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-7 text-muted">
            اپ اندروید را روی گوشی فروشنده نصب کنید تا پیامک‌های واریز بانکی
            خوانده و سفارش هم‌مبلغ به‌صورت خودکار تأیید شود. روش دستی ارسال رسید
            همیشه فعال می‌ماند. اگر گوشی متصل ندارید، خروجی پایان‌روز
            صورت‌حساب بانکی را هم می‌توانید بارگذاری کنید.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="indeed-btn py-1.5 text-xs"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden />
          )}
          به‌روزرسانی
        </button>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {!overview?.account ? (
        <section className="indeed-panel flex flex-wrap items-center gap-3 p-5">
          <ShieldAlert className="size-5 text-amber-600" aria-hidden />
          <div className="flex-1 text-sm text-amber-800">
            برای استفاده از تطبیق خودکار، ابتدا شماره کارت کسب‌وکار را در بخش
            کارت به کارت ثبت و فعال کنید.
          </div>
          <Link href="/dashboard/business/card-to-card" className="indeed-btn indeed-btn-primary text-xs">
            ثبت شماره کارت
          </Link>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="indeed-panel flex flex-col gap-3 p-5">
            <div className="text-sm font-extrabold text-ink">کارت مقصد</div>
            <div dir="ltr" className="text-lg font-black tracking-wider text-ink">
              {overview.account.cardNumber}
            </div>
            <div className="text-xs text-muted">
              {overview.account.holderName}
              {overview.account.bankName ? ` — ${overview.account.bankName}` : ''}
            </div>
            <div className="rounded-lg bg-[var(--vintage-surface)] p-3 text-xs leading-6 text-muted">
              فقط واریزی‌هایی تأیید می‌شوند که چهار رقم آخر کارت مقصدشان با{' '}
              <b className="text-ink">{overview.account.cardLast4}</b> برابر باشد.
            </div>
          </div>

          <div className="indeed-panel flex flex-col gap-3 p-5">
            <div className="text-sm font-extrabold text-ink">اتصال گوشی جدید</div>
            {pairing ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-xl border border-dashed border-brand/40 bg-brand-light p-4 text-center">
                  <div className="text-xs text-muted">کد اتصال (۱۵ دقیقه اعتبار)</div>
                  <div dir="ltr" className="mt-1 text-3xl font-black tracking-[0.35em] text-brand">
                    {pairing.code}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span>آدرس سرور:</span>
                  <code dir="ltr" className="rounded bg-[var(--vintage-surface)] px-2 py-1">
                    {pairing.apiBaseUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyText(pairing.apiBaseUrl, 'آدرس سرور')}
                    className="indeed-btn py-1 text-[10px]"
                  >
                    <Copy className="size-3" aria-hidden /> کپی
                  </button>
                </div>
                <p className="text-xs leading-6 text-muted">
                  اپ را باز کنید، آدرس بالا و کد را وارد کنید. پس از اتصال، کد
                  باطل می‌شود و گوشی در فهرست دستگاه‌ها می‌آید.
                </p>
                <button
                  type="button"
                  onClick={() => setPairing(null)}
                  className="indeed-btn w-fit text-xs"
                >
                  بستن
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs leading-6 text-muted">
                  یک کد یک‌بارمصرف بسازید و در اپ اندروید وارد کنید. برای هر
                  گوشی یک کد جدا لازم است.
                </p>
                <button
                  type="button"
                  onClick={() => void createCode()}
                  disabled={pairingBusy}
                  className="indeed-btn indeed-btn-primary w-fit text-xs"
                >
                  {pairingBusy ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Smartphone className="size-3.5" aria-hidden />
                  )}
                  ساخت کد اتصال
                </button>
              </>
            )}
          </div>
        </section>
      )}

      <section className="indeed-panel flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-extrabold text-ink">دستگاه‌های متصل</div>
          <span className="text-xs text-muted">
            {(overview?.devices.length ?? 0).toLocaleString('fa-IR')} دستگاه
          </span>
        </div>
        {!overview?.devices.length ? (
          <p className="text-sm text-muted">هنوز گوشی‌ای متصل نشده است.</p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--vintage-border)]">
            {overview.devices.map((device) => (
              <div
                key={device.id}
                className="flex flex-wrap items-center gap-3 py-3"
              >
                <Smartphone className="size-4 text-brand" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                    {device.name}
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold',
                        device.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600',
                      )}
                    >
                      {device.status === 'ACTIVE' ? 'فعال' : 'قطع‌شده'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    آخرین اتصال: {relativeTime(device.lastSeenAt)} — آخرین پیامک:{' '}
                    {relativeTime(device.lastSmsAt)}
                    {device.appVersion ? ` — نسخه ${device.appVersion}` : ''}
                  </div>
                </div>
                {device.status === 'ACTIVE' ? (
                  <button
                    type="button"
                    onClick={() => void revoke(device.id)}
                    disabled={busyId === device.id}
                    className="indeed-btn py-1 text-xs text-red-600"
                  >
                    {busyId === device.id ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="size-3.5" aria-hidden />
                    )}
                    قطع اتصال
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="indeed-panel flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <FileSpreadsheet className="size-5 text-brand" aria-hidden />
          <div className="text-sm font-extrabold text-ink">
            بارگذاری صورت‌حساب بانکی (پایان روز)
          </div>
        </div>
        <p className="text-xs leading-6 text-muted">
          اگر گوشی متصل ندارید، خروجی صورت‌حساب حساب بانکی (Excel یا CSV) را که
          بانک در پایان روز می‌دهد همین‌جا بارگذاری کنید. واریزهای کارت‌به‌کارت
          به کارت ثبت‌شده خوانده و سفارش‌های هم‌مبلغ به‌صورت خودکار تأیید
          می‌شوند. بارگذاری دوباره‌ی یک فایل، تراکنش تکراری نمی‌سازد.
        </p>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          disabled={statementBusy || !overview?.account}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            void importStatement(file);
          }}
          className="block w-full cursor-pointer text-xs text-muted file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-xs file:font-bold file:text-white disabled:cursor-not-allowed disabled:opacity-60"
        />
        {statementBusy ? (
          <p className="flex items-center gap-2 text-xs text-muted">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            در حال خواندن صورت‌حساب و تطبیق واریزها…
          </p>
        ) : null}
        {statementError ? (
          <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
            {statementError}
          </p>
        ) : null}
        {statementResult ? (
          <div className="rounded-lg bg-[var(--vintage-surface)] p-3 text-xs leading-6 text-ink">
            <div>
              ردیف‌های خوانده‌شده:{' '}
              <b>{statementResult.totalRows.toLocaleString('fa-IR')}</b> —
              واریز به کارت شما:{' '}
              <b>{statementResult.deposits.toLocaleString('fa-IR')}</b>
            </div>
            <div className="text-muted">
              ثبت جدید: {statementResult.imported.toLocaleString('fa-IR')} —
              تکراری: {statementResult.duplicates.toLocaleString('fa-IR')} —
              کارت دیگر: {statementResult.otherCard.toLocaleString('fa-IR')}
              {statementResult.invalid
                ? ` — نامعتبر: ${statementResult.invalid.toLocaleString('fa-IR')}`
                : ''}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              <span className="text-emerald-700">
                تأیید خودکار:{' '}
                {statementResult.autoApproved.toLocaleString('fa-IR')}
              </span>
              <span className="text-orange-700">
                چندگزینه‌ای: {statementResult.ambiguous.toLocaleString('fa-IR')}
              </span>
              <span className="text-amber-700">
                بدون سفارش: {statementResult.unmatched.toLocaleString('fa-IR')}
              </span>
            </div>
            {statementResult.errors.length ? (
              <ul className="mt-2 list-disc space-y-1 pr-4 text-[11px] text-red-700">
                {statementResult.errors.slice(0, 10).map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="indeed-panel flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-extrabold text-ink">واریزهای بانکی</div>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] font-bold transition',
                  filter === item.key
                    ? 'bg-brand text-white'
                    : 'bg-[var(--vintage-surface)] text-muted hover:text-ink',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {loading && !overview ? (
          <p className="text-sm text-muted">در حال بارگذاری…</p>
        ) : !transactions.length ? (
          <p className="text-sm text-muted">
            واریزی‌ای در این دسته ثبت نشده است. پس از اتصال گوشی یا بارگذاری
            صورت‌حساب بانکی، واریزها همین‌جا ظاهر می‌شوند.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {transactions.map((transaction) => {
              const meta =
                STATUS_META[transaction.status] ?? {
                  label: transaction.status,
                  className: 'bg-slate-100 text-slate-600',
                };
              const canLink =
                transaction.status === 'UNMATCHED' ||
                transaction.status === 'AMBIGUOUS';
              return (
                <div
                  key={transaction.id}
                  className="rounded-xl border border-[var(--vintage-border)] bg-[var(--vintage-surface)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-base font-extrabold text-ink">
                        {faPrice(transaction.amount)}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {transaction.bankName ?? 'بانک نامشخص'} — کارت مقصد:{' '}
                        <span dir="ltr">{transaction.destinationLast4 ?? '—'}</span>
                        {transaction.trackingNumber
                          ? ` — پیگیری ${transaction.trackingNumber}`
                          : ''}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[10px] font-bold',
                        meta.className,
                      )}
                    >
                      {meta.label}
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-muted">
                    {faDateTime(transaction.smsReceivedAt ?? transaction.createdAt)}
                    {transaction.device ? ` — از ${transaction.device.name}` : ''}
                  </div>

                  {transaction.order ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-white/60 p-2 text-xs">
                      <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden />
                      سفارش <b>{transaction.order.orderNumber}</b> —{' '}
                      {transaction.order.customerName} —{' '}
                      {faPrice(transaction.order.totalAmount)}
                    </div>
                  ) : null}

                  {transaction.note ? (
                    <p className="mt-2 text-xs leading-6 text-muted">
                      {transaction.note}
                    </p>
                  ) : null}

                  <details className="mt-2">
                    <summary className="cursor-pointer text-[11px] font-bold text-muted">
                      متن پیامک
                    </summary>
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-white/70 p-2 text-[11px] leading-6 text-ink">
                      {transaction.rawText}
                    </pre>
                  </details>

                  {canLink || transaction.status === 'IGNORED' ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {canLink ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void openLink(transaction)}
                            className="indeed-btn indeed-btn-primary py-1 text-xs"
                          >
                            تطبیق با سفارش
                          </button>
                          <button
                            type="button"
                            onClick={() => void rematch(transaction.id)}
                            disabled={busyId === transaction.id}
                            className="indeed-btn py-1 text-xs"
                          >
                            {busyId === transaction.id ? (
                              <Loader2 className="size-3.5 animate-spin" aria-hidden />
                            ) : (
                              <RefreshCw className="size-3.5" aria-hidden />
                            )}
                            تلاش دوباره
                          </button>
                          <button
                            type="button"
                            onClick={() => void ignore(transaction.id)}
                            disabled={busyId === transaction.id}
                            className="indeed-btn py-1 text-xs text-red-600"
                          >
                            <XCircle className="size-3.5" aria-hidden />
                            نادیده گرفتن
                          </button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {linking ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="text-sm font-extrabold text-ink">
              تطبیق پیامک {faPrice(linking.amount)} با سفارش
            </div>
            {candidateBusy ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                در حال دریافت سفارش‌های هم‌مبلغ…
              </p>
            ) : !candidates.length ? (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-6 text-amber-800">
                سفارش کارت‌به‌کارتِ در انتظار پرداخت با مبلغ{' '}
                {faPrice(linking.amount)} پیدا نشد. مبلغ سفارش باید دقیقاً با
                واریز برابر باشد.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {candidates.map((order) => (
                  <label
                    key={order.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-xs',
                      selectedOrder === order.id
                        ? 'border-brand bg-brand-light'
                        : 'border-[var(--vintage-border)]',
                    )}
                  >
                    <input
                      type="radio"
                      name="candidate-order"
                      checked={selectedOrder === order.id}
                      onChange={() => setSelectedOrder(order.id)}
                      className="mt-0.5"
                    />
                    <span className="flex-1">
                      <b className="text-ink">{order.orderNumber}</b> —{' '}
                      {order.customerName} — {faPrice(order.totalAmount)}
                      <span className="mt-1 block text-muted">
                        {order.customerPhone} — {faDateTime(order.createdAt)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setLinking(null)}
                className="indeed-btn text-xs"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => void submitLink()}
                disabled={!selectedOrder || candidateBusy}
                className="indeed-btn indeed-btn-primary text-xs"
              >
                تأیید و اتصال
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
