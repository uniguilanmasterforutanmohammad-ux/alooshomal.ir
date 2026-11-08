'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BadgePercent,
  Banknote,
  CheckCircle2,
  CreditCard,
  FileText,
  Link2,
  Loader2,
  Plug,
  Receipt,
  RefreshCw,
  Search,
  Send,
  ShieldQuestion,
  ShoppingBag,
  Trash2,
  Upload,
  Users,
  Wallet,
} from 'lucide-react';

import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types & helpers                                                    */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

type TabKey =
  | 'overview'
  | 'transactions'
  | 'withdrawals'
  | 'customers'
  | 'coupons'
  | 'products'
  | 'invoices'
  | 'bnpl'
  | 'pay'
  | 'inquiry'
  | 'upload';

const TABS: Array<{ key: TabKey; label: string; icon: typeof Plug }> = [
  { key: 'overview', label: 'خلاصه', icon: Plug },
  { key: 'transactions', label: 'تراکنش‌ها', icon: Receipt },
  { key: 'withdrawals', label: 'تسویه‌ها', icon: Wallet },
  { key: 'customers', label: 'مشتریان', icon: Users },
  { key: 'coupons', label: 'کد تخفیف', icon: BadgePercent },
  { key: 'products', label: 'آیتم‌های مالی', icon: ShoppingBag },
  { key: 'invoices', label: 'فاکتورها', icon: FileText },
  { key: 'bnpl', label: 'اقساطی', icon: CreditCard },
  { key: 'pay', label: 'ساخت پرداخت', icon: Banknote },
  { key: 'inquiry', label: 'استعلام', icon: ShieldQuestion },
  { key: 'upload', label: 'آپلود فایل', icon: Upload },
];

interface PaypingStatus {
  configured: boolean;
  reachable: boolean;
  baseUrl: string;
  latencyMs: number | null;
  message: string | null;
}

interface OverviewPayload {
  transactions: { result?: number } | null;
  withdrawals: { result?: number } | null;
  customers: { count?: number } | null;
  coupons: { count?: number } | null;
  invoices: { count?: number } | null;
}

const INPUT =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand';

function toman(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString('fa-IR')} تومان`;
}

function cell(row: Row, key: string): string {
  const value = row[key];
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر';
  if (typeof value === 'number') return value.toLocaleString('fa-IR');
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'خطای نامشخص';
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="indeed-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-extrabold text-ink">{title}</h3>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Banner({
  kind,
  children,
}: {
  kind: 'error' | 'ok' | 'info';
  children: React.ReactNode;
}) {
  const styles =
    kind === 'error'
      ? 'bg-red-50 text-red-700'
      : kind === 'ok'
        ? 'bg-green-50 text-green-700'
        : 'bg-amber-50 text-amber-800';
  return (
    <p className={cn('rounded-lg p-3 text-sm', styles)} dir="rtl">
      {children}
    </p>
  );
}

function DataTable({
  rows,
  columns,
  empty = 'موردی ثبت نشده است.',
}: {
  rows: Row[];
  columns: Array<{ key: string; label: string; money?: boolean }>;
  empty?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-right text-sm">
        <thead>
          <tr className="border-b border-[var(--vintage-border)] text-xs text-muted">
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-2 font-bold">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={String(row.code ?? row.id ?? index)}
              className="border-b border-[var(--vintage-border)] last:border-0"
            >
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-2 text-ink">
                  {column.money
                    ? toman(row[column.key])
                    : cell(row, column.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-bold text-muted">
      {label}
      {children}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Overview                                                           */
/* ------------------------------------------------------------------ */

function OverviewTab({
  status,
  onRefreshStatus,
}: {
  status: PaypingStatus | null;
  onRefreshStatus: () => void;
}) {
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOverview(await api.get<OverviewPayload>('/admin/payping/overview'));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cards: Array<{ label: string; value: number | undefined }> = [
    { label: 'تراکنش‌ها', value: overview?.transactions?.result },
    { label: 'تسویه‌ها', value: overview?.withdrawals?.result },
    { label: 'مشتریان', value: overview?.customers?.count },
    { label: 'کدهای تخفیف', value: overview?.coupons?.count },
    { label: 'فاکتورها', value: overview?.invoices?.count },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="وضعیت اتصال درگاه پی‌پینگ"
        action={
          <button
            onClick={onRefreshStatus}
            className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            بررسی مجدد
          </button>
        }
      >
        {!status ? (
          <p className="text-sm text-muted">در حال بررسی اتصال...</p>
        ) : status.configured && status.reachable ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2 font-bold text-green-700">
              <CheckCircle2 className="size-4" aria-hidden />
              اتصال برقرار است
            </span>
            <span className="text-muted" dir="ltr">
              {status.baseUrl}
              {status.latencyMs ? ` · ${status.latencyMs}ms` : ''}
            </span>
          </div>
        ) : (
          <Banner kind="error">
            {status.message ?? 'اتصال به پی‌پینگ برقرار نشد.'}
          </Banner>
        )}
      </Panel>

      <Panel
        title="خلاصه‌ی حساب"
        action={
          <button
            onClick={() => void load()}
            className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            بارگذاری
          </button>
        }
      >
        {error ? (
          <Banner kind="error">{error}</Banner>
        ) : loading && !overview ? (
          <p className="text-sm text-muted">در حال بارگذاری...</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-[var(--vintage-border)] p-4"
              >
                <p className="text-xs text-muted">{card.label}</p>
                <p className="mt-1 text-lg font-extrabold text-ink">
                  {card.value === undefined
                    ? '—'
                    : card.value.toLocaleString('fa-IR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Banner kind="info">
        این پنل با توکن پذیرنده‌ی پی‌پینگ کار می‌کند و همه‌ی سرویس‌های مجاز
        توکن (پرداخت، گزارش، تسویه، مشتریان، کد تخفیف، آیتم مالی، فاکتور،
        اقساطی، استعلام و آپلود) را در دسترس قرار می‌دهد. اگر سرویسی «IP مجاز
        نیست» برگرداند، باید IP سرور در کنسول توسعه‌دهنده‌ی پی‌پینگ ثبت شود.
      </Banner>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Transactions                                                       */
/* ------------------------------------------------------------------ */

function TransactionsTab() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const body = () => ({
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
  });

  async function load() {
    setLoading(true);
    setError(null);
    setDetail(null);
    try {
      const [list, total] = await Promise.all([
        api.post<Row[]>('/admin/payping/reports/transactions', body()),
        api.post<{ result?: number }>(
          '/admin/payping/reports/transactions/count',
          body(),
        ),
      ]);
      setRows(Array.isArray(list) ? list : []);
      setCount(total?.result ?? null);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(code: string) {
    setError(null);
    try {
      setDetail(
        await api.get<Row>(
          `/admin/payping/reports/transaction/${encodeURIComponent(code)}`,
        ),
      );
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel title="فیلتر گزارش تراکنش‌ها">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="از تاریخ">
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="تا تاریخ">
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className={INPUT}
            />
          </Field>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Search className="size-4" aria-hidden />
            )}
            نمایش گزارش
          </button>
        </div>
        {count !== null ? (
          <p className="mt-3 text-xs text-muted">
            تعداد تراکنش‌ها: {count.toLocaleString('fa-IR')}
          </p>
        ) : null}
      </Panel>

      {error ? <Banner kind="error">{error}</Banner> : null}

      <Panel title="نتیجه‌ی گزارش">
        <DataTable
          rows={rows}
          columns={[
            { key: 'code', label: 'کد پرداخت' },
            { key: 'amount', label: 'مبلغ', money: true },
            { key: 'name', label: 'نام' },
            { key: 'payerIdentity', label: 'پرداخت‌کننده' },
            { key: 'isPaid', label: 'پرداخت‌شده' },
            { key: 'isRequest', label: 'نوع' },
            { key: 'payDate', label: 'تاریخ پرداخت' },
            { key: 'clientRefId', label: 'ارجاع پذیرنده' },
          ]}
          empty="تراکنشی در این بازه یافت نشد."
        />
        {rows.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {rows.slice(0, 8).map((row, index) => {
              const code = String(row.code ?? '');
              if (!code) return null;
              return (
                <button
                  key={`${code}-${index}`}
                  onClick={() => void openDetail(code)}
                  className="indeed-btn indeed-btn-secondary py-1 text-xs"
                >
                  جزئیات {code}
                </button>
              );
            })}
          </div>
        ) : null}
        {detail ? (
          <pre
            dir="ltr"
            className="mt-4 max-h-72 overflow-auto rounded-lg bg-[var(--vintage-surface)] p-3 text-left text-xs text-ink"
          >
            {JSON.stringify(detail, null, 2)}
          </pre>
        ) : null}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Withdrawals                                                        */
/* ------------------------------------------------------------------ */

function WithdrawalsTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await api.post<Row[]>(
        '/admin/payping/reports/withdrawals',
        {},
      );
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function request() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 1000) {
      setError('مبلغ تسویه باید عددی بزرگ‌تر از ۱۰۰۰ تومان باشد.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api.post('/admin/payping/withdrawals', { amount: value });
      setMessage('درخواست تسویه ثبت شد.');
      setAmount('');
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel title="درخواست تسویه‌حساب">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="مبلغ (تومان)">
            <input
              type="number"
              min={1000}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className={INPUT}
            />
          </Field>
          <button
            onClick={() => void request()}
            disabled={busy}
            className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
          >
            <Send className="size-4" aria-hidden />
            ثبت درخواست
          </button>
        </div>
        {message ? (
          <div className="mt-3">
            <Banner kind="ok">{message}</Banner>
          </div>
        ) : null}
        {error ? (
          <div className="mt-3">
            <Banner kind="error">{error}</Banner>
          </div>
        ) : null}
      </Panel>

      <Panel
        title="تسویه‌حساب‌ها"
        action={
          <button
            onClick={() => void load()}
            className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            بارگذاری
          </button>
        }
      >
        <DataTable
          rows={rows}
          columns={[
            { key: 'code', label: 'کد' },
            { key: 'amount', label: 'مبلغ', money: true },
            { key: 'status', label: 'وضعیت' },
            { key: 'createdDate', label: 'تاریخ' },
          ]}
          empty="تسویه‌ای ثبت نشده است."
        />
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Customers                                                          */
/* ------------------------------------------------------------------ */

const EMPTY_CUSTOMER = { firstName: '', lastName: '', phone: '', email: '' };

function CustomersTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState({ ...EMPTY_CUSTOMER });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await api.get<Row[]>('/admin/payping/customers?limit=50');
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('نام و نام خانوادگی الزامی است.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post('/admin/payping/customers', form);
      setForm({ ...EMPTY_CUSTOMER });
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(code: string) {
    setError(null);
    try {
      await api.delete(`/admin/payping/customers/${encodeURIComponent(code)}`);
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel title="مشتری جدید">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="نام">
            <input
              value={form.firstName}
              onChange={(event) =>
                setForm({ ...form, firstName: event.target.value })
              }
              className={INPUT}
            />
          </Field>
          <Field label="نام خانوادگی">
            <input
              value={form.lastName}
              onChange={(event) =>
                setForm({ ...form, lastName: event.target.value })
              }
              className={INPUT}
            />
          </Field>
          <Field label="موبایل">
            <input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              className={INPUT}
              dir="ltr"
            />
          </Field>
          <Field label="ایمیل">
            <input
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className={INPUT}
              dir="ltr"
            />
          </Field>
        </div>
        <button
          onClick={() => void create()}
          disabled={busy}
          className="indeed-btn indeed-btn-primary mt-4 py-2 text-sm disabled:opacity-60"
        >
          افزودن مشتری
        </button>
        {error ? (
          <div className="mt-3">
            <Banner kind="error">{error}</Banner>
          </div>
        ) : null}
      </Panel>

      <Panel
        title="لیست مشتریان"
        action={
          <button
            onClick={() => void load()}
            className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            بارگذاری
          </button>
        }
      >
        <DataTable
          rows={rows}
          columns={[
            { key: 'firstName', label: 'نام' },
            { key: 'lastName', label: 'نام خانوادگی' },
            { key: 'phone', label: 'موبایل' },
            { key: 'email', label: 'ایمیل' },
            { key: 'code', label: 'کد' },
          ]}
          empty="مشتری‌ای ثبت نشده است."
        />
        {rows.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {rows.map((row, index) => {
              const code = String(row.code ?? '');
              if (!code) return null;
              return (
                <button
                  key={`${code}-${index}`}
                  onClick={() => void remove(code)}
                  className="indeed-btn indeed-btn-secondary py-1 text-xs text-red-600"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  حذف {code}
                </button>
              );
            })}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Coupons                                                            */
/* ------------------------------------------------------------------ */

const EMPTY_COUPON = { name: '', code: '', type: '0', amount: '' };

function CouponsTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState({ ...EMPTY_COUPON });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await api.get<Row[]>('/admin/payping/coupons?limit=50');
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (!form.name.trim()) {
      setError('نام کد تخفیف الزامی است.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post('/admin/payping/coupons', {
        name: form.name,
        ...(form.code ? { code: form.code } : {}),
        type: Number(form.type),
        ...(form.amount ? { amount: Number(form.amount) } : {}),
      });
      setForm({ ...EMPTY_COUPON });
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(code: string) {
    setError(null);
    try {
      await api.delete(`/admin/payping/coupons/${encodeURIComponent(code)}`);
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel title="کد تخفیف جدید">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="نام">
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className={INPUT}
            />
          </Field>
          <Field label="کد (اختیاری)">
            <input
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              className={INPUT}
              dir="ltr"
            />
          </Field>
          <Field label="نوع (۰ درصد / ۱ مبلغ)">
            <select
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
              className={INPUT}
            >
              <option value="0">درصد</option>
              <option value="1">مبلغ ثابت</option>
            </select>
          </Field>
          <Field label="مقدار">
            <input
              type="number"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
              className={INPUT}
            />
          </Field>
        </div>
        <button
          onClick={() => void create()}
          disabled={busy}
          className="indeed-btn indeed-btn-primary mt-4 py-2 text-sm disabled:opacity-60"
        >
          ساخت کد تخفیف
        </button>
        {error ? (
          <div className="mt-3">
            <Banner kind="error">{error}</Banner>
          </div>
        ) : null}
      </Panel>

      <Panel
        title="کدهای تخفیف"
        action={
          <button
            onClick={() => void load()}
            className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            بارگذاری
          </button>
        }
      >
        <DataTable
          rows={rows}
          columns={[
            { key: 'name', label: 'نام' },
            { key: 'code', label: 'کد' },
            { key: 'type', label: 'نوع' },
            { key: 'amount', label: 'مقدار' },
            { key: 'isActive', label: 'فعال' },
            { key: 'maxRedemption', label: 'حداکثر استفاده' },
          ]}
          empty="کد تخفیفی ثبت نشده است."
        />
        {rows.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {rows.map((row, index) => {
              const code = String(row.code ?? '');
              if (!code) return null;
              return (
                <button
                  key={`${code}-${index}`}
                  onClick={() => void remove(code)}
                  className="indeed-btn indeed-btn-secondary py-1 text-xs text-red-600"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  حذف {code}
                </button>
              );
            })}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Products & permalinks                                              */
/* ------------------------------------------------------------------ */

const EMPTY_PRODUCT = { title: '', amount: '', description: '' };

function ProductsTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState({ ...EMPTY_PRODUCT });
  const [permalink, setPermalink] = useState({ productCode: '', permalink: '' });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await api.get<Row[]>('/admin/payping/products?limit=50');
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (!form.title.trim()) {
      setError('عنوان آیتم مالی الزامی است.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.post('/admin/payping/products', {
        title: form.title,
        ...(form.amount ? { amount: Number(form.amount) } : {}),
        ...(form.description ? { description: form.description } : {}),
      });
      setForm({ ...EMPTY_PRODUCT });
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function createPermalink() {
    if (!permalink.productCode.trim()) {
      setError('کد آیتم مالی الزامی است.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.post('/admin/payping/permalinks', permalink);
      setNotice('لینک ثابت ساخته شد.');
      setPermalink({ productCode: '', permalink: '' });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Banner kind="info">
        سرویس‌های «آیتم مالی» و «لینک ثابت» در پی‌پینگ محدود به IP مجاز هستند؛
        اگر خطای «Client IP is not allowed» دیدید، IP سرور را در کنسول
        توسعه‌دهنده‌ی پی‌پینگ ثبت کنید.
      </Banner>

      <Panel title="آیتم مالی جدید">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="عنوان">
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className={INPUT}
            />
          </Field>
          <Field label="مبلغ (تومان)">
            <input
              type="number"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
              className={INPUT}
            />
          </Field>
          <Field label="توضیحات">
            <input
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              className={INPUT}
            />
          </Field>
        </div>
        <button
          onClick={() => void create()}
          disabled={busy}
          className="indeed-btn indeed-btn-primary mt-4 py-2 text-sm disabled:opacity-60"
        >
          ساخت آیتم مالی
        </button>
      </Panel>

      <Panel title="لینک ثابت (Permalink)">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="کد آیتم مالی">
            <input
              value={permalink.productCode}
              onChange={(event) =>
                setPermalink({ ...permalink, productCode: event.target.value })
              }
              className={INPUT}
              dir="ltr"
            />
          </Field>
          <Field label="لینک ثابت دلخواه (اختیاری)">
            <input
              value={permalink.permalink}
              onChange={(event) =>
                setPermalink({ ...permalink, permalink: event.target.value })
              }
              className={INPUT}
              dir="ltr"
            />
          </Field>
        </div>
        <button
          onClick={() => void createPermalink()}
          disabled={busy}
          className="indeed-btn indeed-btn-primary mt-4 py-2 text-sm disabled:opacity-60"
        >
          <Link2 className="size-4" aria-hidden />
          ساخت لینک ثابت
        </button>
        {notice ? (
          <div className="mt-3">
            <Banner kind="ok">{notice}</Banner>
          </div>
        ) : null}
        {error ? (
          <div className="mt-3">
            <Banner kind="error">{error}</Banner>
          </div>
        ) : null}
      </Panel>

      <Panel
        title="آیتم‌های مالی"
        action={
          <button
            onClick={() => void load()}
            className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            بارگذاری
          </button>
        }
      >
        <DataTable
          rows={rows}
          columns={[
            { key: 'title', label: 'عنوان' },
            { key: 'code', label: 'کد' },
            { key: 'amount', label: 'مبلغ', money: true },
            { key: 'quantity', label: 'موجودی' },
          ]}
          empty="آیتم مالی‌ای ثبت نشده است."
        />
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Invoices                                                           */
/* ------------------------------------------------------------------ */

const EMPTY_INVOICE = { title: '', number: '', createStatus: '0' };

function InvoicesTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState({ ...EMPTY_INVOICE });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await api.get<Row[]>('/admin/payping/invoices?limit=50');
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.post('/admin/payping/invoices', {
        ...(form.title ? { title: form.title } : {}),
        ...(form.number ? { number: form.number } : {}),
        createStatus: Number(form.createStatus),
        products: [],
        customers: [],
      });
      setForm({ ...EMPTY_INVOICE });
      setNotice('فاکتور ساخته شد.');
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function archive(code: string, archived: boolean) {
    setError(null);
    try {
      await api.post(
        `/admin/payping/invoices/${encodeURIComponent(code)}/${
          archived ? 'archive' : 'dearchive'
        }`,
      );
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function pdf(code: string) {
    setError(null);
    try {
      const result = await api.get<Row>(
        `/admin/payping/invoices/${encodeURIComponent(code)}/pdf`,
      );
      setNotice(`PDF: ${JSON.stringify(result)}`);
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel title="فاکتور جدید">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="عنوان فاکتور">
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className={INPUT}
            />
          </Field>
          <Field label="شماره فاکتور">
            <input
              value={form.number}
              onChange={(event) => setForm({ ...form, number: event.target.value })}
              className={INPUT}
              dir="ltr"
            />
          </Field>
          <Field label="وضعیت ثبت">
            <select
              value={form.createStatus}
              onChange={(event) =>
                setForm({ ...form, createStatus: event.target.value })
              }
              className={INPUT}
            >
              <option value="0">پیش‌نویس</option>
              <option value="1">ارسال</option>
              <option value="2">پرداخت‌شده</option>
            </select>
          </Field>
        </div>
        <button
          onClick={() => void create()}
          disabled={busy}
          className="indeed-btn indeed-btn-primary mt-4 py-2 text-sm disabled:opacity-60"
        >
          ساخت فاکتور
        </button>
        {notice ? (
          <div className="mt-3">
            <Banner kind="ok">{notice}</Banner>
          </div>
        ) : null}
        {error ? (
          <div className="mt-3">
            <Banner kind="error">{error}</Banner>
          </div>
        ) : null}
      </Panel>

      <Panel
        title="فاکتورها"
        action={
          <button
            onClick={() => void load()}
            className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            بارگذاری
          </button>
        }
      >
        <DataTable
          rows={rows}
          columns={[
            { key: 'number', label: 'شماره' },
            { key: 'title', label: 'عنوان' },
            { key: 'amount', label: 'مبلغ', money: true },
            { key: 'status', label: 'وضعیت' },
            { key: 'createdDate', label: 'تاریخ' },
          ]}
          empty="فاکتوری ثبت نشده است."
        />
        {rows.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {rows.map((row, index) => {
              const code = String(row.code ?? '');
              if (!code) return null;
              return (
                <span key={`${code}-${index}`} className="inline-flex gap-1">
                  <button
                    onClick={() => void archive(code, true)}
                    className="indeed-btn indeed-btn-secondary py-1 text-xs"
                  >
                    بایگانی {code}
                  </button>
                  <button
                    onClick={() => void pdf(code)}
                    className="indeed-btn indeed-btn-secondary py-1 text-xs"
                  >
                    PDF
                  </button>
                </span>
              );
            })}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  BNPL                                                               */
/* ------------------------------------------------------------------ */

function BnplTab() {
  const [options, setOptions] = useState<Row | null>(null);
  const [orders, setOrders] = useState<Row[]>([]);
  const [plans, setPlans] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const [opt, orderList, planList] = await Promise.all([
        api.get<Row>('/admin/payping/bnpl/options').catch(() => null),
        api
          .get<{ orders?: Row[] }>('/admin/payping/bnpl/orders')
          .catch(() => ({ orders: [] })),
        api
          .get<{ plansInfo?: Row[] }>('/admin/payping/bnpl/plans')
          .catch(() => ({ plansInfo: [] })),
      ]);
      setOptions(opt);
      setOrders(Array.isArray(orderList?.orders) ? orderList.orders : []);
      setPlans(Array.isArray(planList?.plansInfo) ? planList.plansInfo : []);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(planCode: string, isActive: boolean) {
    setError(null);
    try {
      await api.put('/admin/payping/bnpl/plans/toggle', { planCode, isActive });
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? <Banner kind="error">{error}</Banner> : null}

      <Panel
        title="گزینه‌های خرید اقساطی"
        action={
          <button
            onClick={() => void load()}
            disabled={busy}
            className="indeed-btn indeed-btn-secondary py-1.5 text-xs disabled:opacity-60"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            بارگذاری
          </button>
        }
      >
        {options ? (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[var(--vintage-border)] p-3">
              <p className="text-xs text-muted">شناسه قرارداد</p>
              <p className="text-sm font-bold text-ink">
                {cell(options, 'contractId')}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--vintage-border)] p-3">
              <p className="text-xs text-muted">اعتبارها</p>
              <p className="text-sm font-bold text-ink">
                {Array.isArray(options.credits) ? options.credits.length : 0}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--vintage-border)] p-3">
              <p className="text-xs text-muted">ضامن‌ها</p>
              <p className="text-sm font-bold text-ink">
                {Array.isArray(options.guarantors)
                  ? options.guarantors.length
                  : 0}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">گزینه‌ای دریافت نشد.</p>
        )}
      </Panel>

      <Panel title="طرح‌های اقساطی">
        <DataTable
          rows={plans}
          columns={[
            { key: 'name', label: 'نام طرح' },
            { key: 'code', label: 'کد' },
            { key: 'isActive', label: 'فعال' },
          ]}
          empty="طرح اقساطی‌ای تعریف نشده است."
        />
        {plans.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {plans.map((row, index) => {
              const code = String(row.code ?? '');
              if (!code) return null;
              const active = Boolean(row.isActive);
              return (
                <button
                  key={`${code}-${index}`}
                  onClick={() => void toggle(code, !active)}
                  className="indeed-btn indeed-btn-secondary py-1 text-xs"
                >
                  {active ? 'غیرفعال‌کردن' : 'فعال‌کردن'} {code}
                </button>
              );
            })}
          </div>
        ) : null}
      </Panel>

      <Panel title="سفارش‌های اقساطی">
        <DataTable
          rows={orders}
          columns={[
            { key: 'trackingCode', label: 'کد رهگیری' },
            { key: 'consumerName', label: 'خریدار' },
            { key: 'amount', label: 'مبلغ', money: true },
            { key: 'orderStatus', label: 'وضعیت' },
            { key: 'createdDate', label: 'تاریخ' },
          ]}
          empty="سفارش اقساطی‌ای ثبت نشده است."
        />
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Create payment                                                     */
/* ------------------------------------------------------------------ */

const EMPTY_PAY = {
  amount: '',
  returnUrl: '',
  payerName: '',
  payerIdentity: '',
  description: '',
  clientRefId: '',
};

function PayTab() {
  const [form, setForm] = useState({ ...EMPTY_PAY });
  const [result, setResult] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount < 1000) {
      setError('مبلغ باید عددی بزرگ‌تر از ۱۰۰۰ تومان باشد.');
      return;
    }
    if (!form.returnUrl.trim()) {
      setError('آدرس بازگشت الزامی است.');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const created = await api.post<Row>('/admin/payping/payments', {
        amount,
        returnUrl: form.returnUrl,
        ...(form.payerName ? { payerName: form.payerName } : {}),
        ...(form.payerIdentity ? { payerIdentity: form.payerIdentity } : {}),
        ...(form.description ? { description: form.description } : {}),
        ...(form.clientRefId ? { clientRefId: form.clientRefId } : {}),
      });
      setResult(created);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const gatewayUrl =
    result && typeof result.url === 'string' ? result.url : null;

  return (
    <div className="flex flex-col gap-5">
      <Panel title="ساخت پرداخت">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Field label="مبلغ (تومان)">
            <input
              type="number"
              min={1000}
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
              className={INPUT}
            />
          </Field>
          <Field label="آدرس بازگشت">
            <input
              value={form.returnUrl}
              onChange={(event) =>
                setForm({ ...form, returnUrl: event.target.value })
              }
              className={INPUT}
              dir="ltr"
              placeholder="https://shomalicard.ir/payments/callback"
            />
          </Field>
          <Field label="شناسه ارجاع پذیرنده">
            <input
              value={form.clientRefId}
              onChange={(event) =>
                setForm({ ...form, clientRefId: event.target.value })
              }
              className={INPUT}
              dir="ltr"
            />
          </Field>
          <Field label="نام پرداخت‌کننده">
            <input
              value={form.payerName}
              onChange={(event) =>
                setForm({ ...form, payerName: event.target.value })
              }
              className={INPUT}
            />
          </Field>
          <Field label="موبایل/ایمیل پرداخت‌کننده">
            <input
              value={form.payerIdentity}
              onChange={(event) =>
                setForm({ ...form, payerIdentity: event.target.value })
              }
              className={INPUT}
              dir="ltr"
            />
          </Field>
          <Field label="توضیحات">
            <input
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              className={INPUT}
            />
          </Field>
        </div>
        <button
          onClick={() => void create()}
          disabled={busy}
          className="indeed-btn indeed-btn-primary mt-4 py-2 text-sm disabled:opacity-60"
        >
          <CreditCard className="size-4" aria-hidden />
          ساخت پرداخت
        </button>
      </Panel>

      {error ? <Banner kind="error">{error}</Banner> : null}

      {result ? (
        <Panel title="نتیجه‌ی پرداخت">
          <p className="text-sm text-ink">
            کد پرداخت: <span dir="ltr">{cell(result, 'paymentCode')}</span>
          </p>
          {gatewayUrl ? (
            <p className="mt-2 text-sm">
              <a
                href={gatewayUrl}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-brand underline"
              >
                انتقال به درگاه پرداخت
              </a>
            </p>
          ) : null}
          <pre
            dir="ltr"
            className="mt-3 max-h-64 overflow-auto rounded-lg bg-[var(--vintage-surface)] p-3 text-left text-xs text-ink"
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </Panel>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inquiry                                                           */
/* ------------------------------------------------------------------ */

const INQUIRIES: Array<{
  key: string;
  label: string;
  params: Array<{ name: string; label: string }>;
}> = [
  {
    key: 'card-to-sheba',
    label: 'تبدیل کارت به شبا',
    params: [{ name: 'cardNumber', label: 'شماره کارت' }],
  },
  {
    key: 'card-to-deposit',
    label: 'تبدیل کارت به حساب',
    params: [{ name: 'cardNumber', label: 'شماره کارت' }],
  },
  {
    key: 'card-to-owner',
    label: 'استعلام کارت',
    params: [{ name: 'cardNumber', label: 'شماره کارت' }],
  },
  {
    key: 'sheba-owner',
    label: 'استعلام شبا',
    params: [{ name: 'sheba', label: 'شبا' }],
  },
  {
    key: 'postal-code',
    label: 'استعلام کدپستی',
    params: [{ name: 'postalCode', label: 'کدپستی' }],
  },
  {
    key: 'national-code',
    label: 'استعلام اطلاعات هویتی',
    params: [
      { name: 'nationalCode', label: 'کد ملی' },
      { name: 'birthDate', label: 'تاریخ تولد' },
    ],
  },
  {
    key: 'national-code-mobile',
    label: 'تطابق کد ملی و موبایل',
    params: [
      { name: 'nationalCode', label: 'کد ملی' },
      { name: 'mobile', label: 'موبایل' },
    ],
  },
];

function InquiryTab() {
  const [selected, setSelected] = useState(INQUIRIES[0]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    const query = new URLSearchParams();
    for (const param of selected.params) {
      const value = values[param.name];
      if (value) query.set(param.name, value);
    }
    try {
      setResult(
        await api.get<unknown>(
          `/admin/payping/inquiries/${selected.key}?${query.toString()}`,
        ),
      );
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Banner kind="info">
        سرویس‌های استعلامی به‌صورت پیش‌فرض در توکن فعال نیستند و ممکن است خطای
        دسترسی برگردانند؛ در صورت نیاز آن‌ها را در کنسول پی‌پینگ فعال کنید.
      </Banner>

      <Panel title="استعلام">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="نوع استعلام">
            <select
              value={selected.key}
              onChange={(event) => {
                const next = INQUIRIES.find(
                  (item) => item.key === event.target.value,
                );
                if (next) {
                  setSelected(next);
                  setValues({});
                }
              }}
              className={INPUT}
            >
              {INQUIRIES.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          {selected.params.map((param) => (
            <Field key={param.name} label={param.label}>
              <input
                value={values[param.name] ?? ''}
                onChange={(event) =>
                  setValues({ ...values, [param.name]: event.target.value })
                }
                className={INPUT}
                dir="ltr"
              />
            </Field>
          ))}
        </div>
        <button
          onClick={() => void run()}
          disabled={busy}
          className="indeed-btn indeed-btn-primary mt-4 py-2 text-sm disabled:opacity-60"
        >
          <ShieldQuestion className="size-4" aria-hidden />
          استعلام
        </button>
      </Panel>

      {error ? <Banner kind="error">{error}</Banner> : null}

      {result ? (
        <Panel title="نتیجه">
          <pre
            dir="ltr"
            className="max-h-72 overflow-auto rounded-lg bg-[var(--vintage-surface)] p-3 text-left text-xs text-ink"
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </Panel>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Upload                                                            */
/* ------------------------------------------------------------------ */

function UploadTab() {
  const [kind, setKind] = useState('ProfilePic');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file) {
      setError('ابتدا یک فایل انتخاب کنید.');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const body = new FormData();
      body.append('file', file);
      setResult(
        await api.upload<unknown>(`/admin/payping/uploads/${kind}`, body),
      );
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel title="آپلود فایل روی پی‌پینگ">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="نوع فایل">
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value)}
              className={INPUT}
            >
              <option value="ProfilePic">تصویر پروفایل مشتری</option>
              <option value="Item">تصویر آیتم مالی</option>
              <option value="InvoiceAttachment">ضمیمه‌ی فاکتور</option>
            </select>
          </Field>
          <Field label="فایل">
            <input
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className={INPUT}
            />
          </Field>
        </div>
        <button
          onClick={() => void upload()}
          disabled={busy}
          className="indeed-btn indeed-btn-primary mt-4 py-2 text-sm disabled:opacity-60"
        >
          <Upload className="size-4" aria-hidden />
          آپلود
        </button>
      </Panel>

      {error ? <Banner kind="error">{error}</Banner> : null}

      {result ? (
        <Panel title="نتیجه">
          <pre
            dir="ltr"
            className="max-h-72 overflow-auto rounded-lg bg-[var(--vintage-surface)] p-3 text-left text-xs text-ink"
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </Panel>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Root panel                                                        */
/* ------------------------------------------------------------------ */

// Admin panel for the merchant PayPing gateway: exposes every capability of
// the token (payments, reports, withdrawals, customers, coupons, products,
// invoices, BNPL, inquiries, uploads) through the server-side proxy.
export function AdminPaypingPanel() {
  const [tab, setTab] = useState<TabKey>('overview');
  const [status, setStatus] = useState<PaypingStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      setStatus(await api.get<PaypingStatus>('/admin/payping/status'));
    } catch (err) {
      setStatus({
        configured: false,
        reachable: false,
        baseUrl: '',
        latencyMs: null,
        message: errorText(err),
      });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const misconfigured = status && (!status.configured || !status.reachable);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                'indeed-btn py-1.5 text-xs',
                tab === item.key ? 'indeed-btn-primary' : 'indeed-btn-secondary',
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {item.label}
            </button>
          );
        })}
      </div>

      {misconfigured && tab !== 'overview' ? (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          <span>
            اتصال پی‌پینگ در حال حاضر برقرار نیست؛ ممکن است نتایج ناقص باشند.
          </span>
        </div>
      ) : null}

      {tab === 'overview' ? (
        statusLoading && !status ? (
          <p className="text-sm text-muted">در حال بررسی اتصال...</p>
        ) : (
          <OverviewTab
            status={status}
            onRefreshStatus={() => void loadStatus()}
          />
        )
      ) : null}
      {tab === 'transactions' ? <TransactionsTab /> : null}
      {tab === 'withdrawals' ? <WithdrawalsTab /> : null}
      {tab === 'customers' ? <CustomersTab /> : null}
      {tab === 'coupons' ? <CouponsTab /> : null}
      {tab === 'products' ? <ProductsTab /> : null}
      {tab === 'invoices' ? <InvoicesTab /> : null}
      {tab === 'bnpl' ? <BnplTab /> : null}
      {tab === 'pay' ? <PayTab /> : null}
      {tab === 'inquiry' ? <InquiryTab /> : null}
      {tab === 'upload' ? <UploadTab /> : null}
    </div>
  );
}
