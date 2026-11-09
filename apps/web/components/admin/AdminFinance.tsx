'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Ban,
  Banknote,
  Download,
  FileText,
  Pencil,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import {
  api,
  type FinanceExpense,
  type FinanceExpenseList,
  type FinanceInvoice,
  type FinanceInvoiceList,
  type FinanceMeta,
  type FinanceSummary,
} from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { JalaliDatePicker } from '@/components/ui/JalaliDatePicker';
import { Pagination } from '@/components/ui/Pagination';
import { AdminDataTable, type AdminColumn } from './AdminDataTable';

type Tab = 'summary' | 'invoices' | 'expenses';

const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

function toman(value: number) {
  return `${value.toLocaleString('fa-IR')} تومان`;
}

function faDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fa-IR');
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char] ?? char,
  );
}

interface ExpenseDraft {
  title: string;
  category: string;
  amount: string;
  taxAmount: string;
  spentAt: string;
  vendor: string;
  reference: string;
  description: string;
}

interface ManualInvoiceDraft {
  title: string;
  amount: string;
  taxAmount: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  paidAt: string;
  description: string;
}

const EMPTY_EXPENSE: ExpenseDraft = {
  title: '',
  category: 'سرور و زیرساخت',
  amount: '',
  taxAmount: '',
  spentAt: new Date().toISOString().slice(0, 10),
  vendor: '',
  reference: '',
  description: '',
};

const EMPTY_MANUAL: ManualInvoiceDraft = {
  title: '',
  amount: '',
  taxAmount: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  paidAt: new Date().toISOString().slice(0, 10),
  description: '',
};

/**
 * «مالیاتی» — the tax archive. Sales invoices are created automatically by the
 * API for every settled payment (subscription, boost, ad, feed tag, and any
 * future paid feature that calls `FinanceService.recordSale`). This panel adds
 * manual expenses, the profit report, printable invoices and CSV exports for
 * the tax office.
 */
export function AdminFinance() {
  const [tab, setTab] = useState<Tab>('summary');
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [invoices, setInvoices] = useState<FinanceInvoiceList | null>(null);
  const [expenses, setExpenses] = useState<FinanceExpenseList | null>(null);
  const [meta, setMeta] = useState<FinanceMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('');
  const [invoiceSource, setInvoiceSource] = useState('');

  const [expensePage, setExpensePage] = useState(1);
  const [expenseQuery, setExpenseQuery] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');

  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(EMPTY_EXPENSE);
  const [editingExpense, setEditingExpense] = useState<FinanceExpense | null>(null);
  const [manualDraft, setManualDraft] = useState<ManualInvoiceDraft>(EMPTY_MANUAL);
  const [showManual, setShowManual] = useState(false);

  const rangeParams = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return params;
  }, [from, to]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const query = rangeParams.toString();
      setSummary(
        await api.get<FinanceSummary>(
          `/admin/finance/summary${query ? `?${query}` : ''}`,
        ),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری گزارش مالی');
    } finally {
      setLoading(false);
    }
  }, [rangeParams]);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(rangeParams);
      params.set('page', String(invoicePage));
      if (invoiceQuery) params.set('q', invoiceQuery);
      if (invoiceStatus) params.set('status', invoiceStatus);
      if (invoiceSource) params.set('sourceType', invoiceSource);
      setInvoices(
        await api.get<FinanceInvoiceList>(
          `/admin/finance/invoices?${params.toString()}`,
        ),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری فاکتورها');
    } finally {
      setLoading(false);
    }
  }, [rangeParams, invoicePage, invoiceQuery, invoiceStatus, invoiceSource]);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(rangeParams);
      params.set('page', String(expensePage));
      if (expenseQuery) params.set('q', expenseQuery);
      if (expenseCategory) params.set('category', expenseCategory);
      setExpenses(
        await api.get<FinanceExpenseList>(
          `/admin/finance/expenses?${params.toString()}`,
        ),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری هزینه‌ها');
    } finally {
      setLoading(false);
    }
  }, [rangeParams, expensePage, expenseQuery, expenseCategory]);

  useEffect(() => {
    void api
      .get<FinanceMeta>('/admin/finance/meta')
      .then(setMeta)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (tab === 'invoices') void loadInvoices();
  }, [tab, loadInvoices]);

  useEffect(() => {
    if (tab === 'expenses') void loadExpenses();
  }, [tab, loadExpenses]);

  async function saveExpense(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(expenseDraft.amount);
    if (!expenseDraft.title.trim() || !Number.isInteger(amount) || amount <= 0) {
      toast.error('عنوان و مبلغ هزینه (بزرگ‌تر از صفر) را وارد کنید.');
      return;
    }
    setBusy(true);
    try {
      const body = {
        title: expenseDraft.title.trim(),
        category: expenseDraft.category.trim(),
        amount,
        taxAmount: Number(expenseDraft.taxAmount) || 0,
        spentAt: expenseDraft.spentAt || undefined,
        vendor: expenseDraft.vendor.trim() || undefined,
        reference: expenseDraft.reference.trim() || undefined,
        description: expenseDraft.description.trim() || undefined,
      };
      if (editingExpense) {
        await api.patch(`/admin/finance/expenses/${editingExpense.id}`, body);
        toast.success('هزینه ویرایش شد.');
      } else {
        await api.post('/admin/finance/expenses', body);
        toast.success('هزینه ثبت شد.');
      }
      setExpenseDraft(EMPTY_EXPENSE);
      setEditingExpense(null);
      await Promise.all([loadExpenses(), loadSummary()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ذخیره هزینه ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  function editExpense(expense: FinanceExpense) {
    setEditingExpense(expense);
    setExpenseDraft({
      title: expense.title,
      category: expense.category,
      amount: String(expense.amount),
      taxAmount: String(expense.taxAmount),
      spentAt: expense.spentAt.slice(0, 10),
      vendor: expense.vendor ?? '',
      reference: expense.reference ?? '',
      description: expense.description ?? '',
    });
  }

  async function voidExpense(expense: FinanceExpense) {
    if (!window.confirm(`ابطال هزینه «${expense.title}»؟ سابقه حفظ می‌شود.`)) {
      return;
    }
    try {
      await api.delete(`/admin/finance/expenses/${expense.id}`);
      toast.success('هزینه ابطال شد.');
      await Promise.all([loadExpenses(), loadSummary()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ابطال هزینه ناموفق بود');
    }
  }

  async function createManualInvoice(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(manualDraft.amount);
    if (!manualDraft.title.trim() || !Number.isInteger(amount) || amount <= 0) {
      toast.error('عنوان و مبلغ فروش (بزرگ‌تر از صفر) را وارد کنید.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/admin/finance/invoices/manual', {
        title: manualDraft.title.trim(),
        amount,
        taxAmount: Number(manualDraft.taxAmount) || 0,
        customerName: manualDraft.customerName.trim() || undefined,
        customerPhone: manualDraft.customerPhone.trim() || undefined,
        customerEmail: manualDraft.customerEmail.trim() || undefined,
        paidAt: manualDraft.paidAt || undefined,
        description: manualDraft.description.trim() || undefined,
      });
      toast.success('فاکتور دستی صادر و بایگانی شد.');
      setManualDraft(EMPTY_MANUAL);
      setShowManual(false);
      await Promise.all([loadInvoices(), loadSummary()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'صدور فاکتور ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function voidInvoice(invoice: FinanceInvoice) {
    const reason = window.prompt(
      `دلیل ابطال فاکتور ${invoice.number} (اختیاری):`,
      'بازگشت وجه',
    );
    if (reason === null) return;
    try {
      await api.post(`/admin/finance/invoices/${invoice.id}/void`, {
        reason: reason.trim() || undefined,
      });
      toast.success('فاکتور ابطال شد و سابقه‌اش حفظ شد.');
      await Promise.all([loadInvoices(), loadSummary()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ابطال فاکتور ناموفق بود');
    }
  }

  async function runBackfill() {
    setBusy(true);
    try {
      const result = await api.post<{ created: number; skipped: number }>(
        '/admin/finance/backfill',
      );
      toast.success(
        `همگام‌سازی انجام شد: ${result.created.toLocaleString('fa-IR')} فاکتور جدید، ${result.skipped.toLocaleString('fa-IR')} مورد از قبل موجود.`,
      );
      await Promise.all([loadSummary(), loadInvoices()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'همگام‌سازی ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function exportInvoices() {
    try {
      const params = new URLSearchParams(rangeParams);
      if (invoiceStatus) params.set('status', invoiceStatus);
      if (invoiceSource) params.set('sourceType', invoiceSource);
      await api.download(
        `/admin/finance/invoices/export?${params.toString()}`,
        'invoices.csv',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'دانلود فاکتورها ناموفق بود');
    }
  }

  async function exportExpenses() {
    try {
      const params = new URLSearchParams(rangeParams);
      if (expenseCategory) params.set('category', expenseCategory);
      await api.download(
        `/admin/finance/expenses/export?${params.toString()}`,
        'expenses.csv',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'دانلود هزینه‌ها ناموفق بود');
    }
  }

  async function printInvoice(invoice: FinanceInvoice) {
    let full = invoice;
    if (!invoice.items) {
      try {
        full = await api.get<FinanceInvoice>(
          `/admin/finance/invoices/${invoice.id}`,
        );
      } catch {
        // Fall back to the list row (title/subtotal) if the detail call fails.
      }
    }
    const items =
      full.items && full.items.length
        ? full.items
        : [
            {
              description: full.title,
              quantity: 1,
              unitPrice: full.subtotal,
              total: full.subtotal,
            },
          ];
    const rows = items
      .map(
        (item) =>
          `<tr><td>${escapeHtml(item.description)}</td><td>${item.quantity.toLocaleString('fa-IR')}</td><td>${item.unitPrice.toLocaleString('fa-IR')}</td><td>${item.total.toLocaleString('fa-IR')}</td></tr>`,
      )
      .join('');
    const win = window.open('', '_blank', 'width=820,height=900');
    if (!win) {
      toast.error('مرورگر پنجره‌ی چاپ را مسدود کرد.');
      return;
    }
    win.document.write(`<!doctype html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(full.number)}</title>
  <style>
    body{font-family:Tahoma,sans-serif;padding:32px;color:#111}
    h1{font-size:22px;margin:0 0 4px}
    .muted{color:#666;font-size:12px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:18px}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th,td{border:1px solid #ccc;padding:8px;text-align:right;font-size:13px}
    th{background:#f3f3f3}
    .totals{margin-top:16px;margin-inline-start:auto;width:320px}
    .totals div{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #ccc}
    .grand{font-weight:bold;font-size:15px}
    .status{margin-top:18px;font-size:12px;color:#666}
  </style>
</head>
<body>
  <div class="head">
    <div>
      <h1>فاکتور فروش</h1>
      <div class="muted">شمالی کارت — سامانه کارت ویزیت دیجیتال</div>
    </div>
    <div class="muted">
      شماره: <b>${escapeHtml(full.number)}</b><br/>
      تاریخ: ${faDate(full.issuedAt)}<br/>
      وضعیت: ${full.status === 'VOID' ? 'ابطال‌شده' : 'صادرشده'}
    </div>
  </div>
  <div class="muted">
    مشتری: ${escapeHtml(full.customerName ?? '—')}<br/>
    موبایل: ${escapeHtml(full.customerPhone ?? '—')} — ایمیل: ${escapeHtml(full.customerEmail ?? '—')}
  </div>
  <table>
    <thead><tr><th>شرح</th><th>تعداد</th><th>مبلغ واحد (تومان)</th><th>جمع (تومان)</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div><span>جمع قبل از مالیات</span><span>${full.subtotal.toLocaleString('fa-IR')}</span></div>
    <div><span>مالیات</span><span>${full.taxAmount.toLocaleString('fa-IR')}</span></div>
    <div class="grand"><span>مبلغ کل</span><span>${full.total.toLocaleString('fa-IR')} تومان</span></div>
  </div>
  ${full.description ? `<p class="status">${escapeHtml(full.description)}</p>` : ''}
  ${full.status === 'VOID' ? `<p class="status">دلیل ابطال: ${escapeHtml(full.voidReason ?? '—')}</p>` : ''}
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 150);
  }

  const invoiceColumns: Array<AdminColumn<FinanceInvoice>> = [
    {
      key: 'number',
      label: 'شماره',
      render: (row) => (
        <span dir="ltr" className="text-xs font-bold text-ink">
          {row.number}
        </span>
      ),
    },
    {
      key: 'issuedAt',
      label: 'تاریخ',
      render: (row) => <span className="text-xs text-muted">{faDate(row.issuedAt)}</span>,
    },
    {
      key: 'title',
      label: 'شرح فروش',
      render: (row) => (
        <div>
          <p className="font-bold text-ink">{row.title}</p>
          <p className="text-[11px] text-muted">
            {row.customerName ?? row.customerPhone ?? row.customerEmail ?? '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'total',
      label: 'مبلغ',
      render: (row) => (
        <span className="font-extrabold text-brand">{toman(row.total)}</span>
      ),
    },
    {
      key: 'status',
      label: 'وضعیت',
      render: (row) => (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-bold',
            row.status === 'VOID'
              ? 'bg-red-50 text-red-700'
              : 'bg-green-50 text-green-700',
          )}
        >
          {row.status === 'VOID' ? 'ابطال‌شده' : 'صادرشده'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'عملیات',
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => void printInvoice(row)}
            className="indeed-btn indeed-btn-secondary py-1 text-xs"
          >
            <Printer className="size-3.5" aria-hidden />
            چاپ
          </button>
          {row.status === 'ISSUED' ? (
            <button
              type="button"
              onClick={() => void voidInvoice(row)}
              className="indeed-btn indeed-btn-secondary py-1 text-xs text-red-700"
            >
              <Ban className="size-3.5" aria-hidden />
              ابطال
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  const expenseColumns: Array<AdminColumn<FinanceExpense>> = [
    {
      key: 'spentAt',
      label: 'تاریخ',
      render: (row) => <span className="text-xs text-muted">{faDate(row.spentAt)}</span>,
    },
    {
      key: 'title',
      label: 'عنوان',
      render: (row) => (
        <div>
          <p className="font-bold text-ink">{row.title}</p>
          <p className="text-[11px] text-muted">
            {row.category}
            {row.vendor ? ` • ${row.vendor}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'مبلغ',
      render: (row) => (
        <span className="font-extrabold text-ink">{toman(row.amount)}</span>
      ),
    },
    {
      key: 'status',
      label: 'وضعیت',
      render: (row) => (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-bold',
            row.voidedAt
              ? 'bg-red-50 text-red-700'
              : 'bg-green-50 text-green-700',
          )}
        >
          {row.voidedAt ? 'ابطال‌شده' : 'ثبت‌شده'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'عملیات',
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          {!row.voidedAt ? (
            <>
              <button
                type="button"
                onClick={() => editExpense(row)}
                className="indeed-btn indeed-btn-secondary py-1 text-xs"
              >
                <Pencil className="size-3.5" aria-hidden />
                ویرایش
              </button>
              <button
                type="button"
                onClick={() => void voidExpense(row)}
                className="indeed-btn indeed-btn-secondary py-1 text-xs text-red-700"
              >
                <Ban className="size-3.5" aria-hidden />
                ابطال
              </button>
            </>
          ) : (
            <span className="text-[11px] text-muted">—</span>
          )}
        </div>
      ),
    },
  ];

  const totals = summary?.totals;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="vintage-avatar flex size-10 items-center justify-center">
            <Receipt className="size-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-ink">بایگانی مالی و مالیاتی</h3>
            <p className="text-xs text-muted">
              فاکتور هر فروش به‌صورت خودکار صادر و ذخیره می‌شود؛ هزینه‌ها را دستی ثبت کنید.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void runBackfill()}
            disabled={busy}
            className="indeed-btn indeed-btn-secondary py-2 text-xs"
          >
            <RefreshCw className={cn('size-3.5', busy && 'animate-spin')} aria-hidden />
            همگام‌سازی فاکتورهای قبلی
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--vintage-border)] bg-white p-3">
        <label className="text-xs font-bold text-muted">
          از تاریخ
          <JalaliDatePicker
            className="mt-1"
            value={from}
            onChange={(iso) => {
              setFrom(iso);
              setInvoicePage(1);
              setExpensePage(1);
            }}
          />
        </label>
        <label className="text-xs font-bold text-muted">
          تا تاریخ
          <JalaliDatePicker
            className="mt-1"
            value={to}
            onChange={(iso) => {
              setTo(iso);
              setInvoicePage(1);
              setExpensePage(1);
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            void loadSummary();
            if (tab === 'invoices') void loadInvoices();
            if (tab === 'expenses') void loadExpenses();
          }}
          className="indeed-btn indeed-btn-primary py-2 text-xs"
        >
          <Search className="size-3.5" aria-hidden />
          اعمال بازه
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['summary', 'گزارش سود و زیان', Wallet],
            ['invoices', 'فاکتورهای فروش', FileText],
            ['expenses', 'هزینه‌ها', Banknote],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition',
              tab === key
                ? 'border-brand bg-brand-light text-brand'
                : 'border-[var(--vintage-border)] bg-white text-muted hover:border-brand',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {tab === 'summary' ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="فروش کل"
              value={toman(totals?.sales ?? 0)}
              hint={`${(totals?.invoiceCount ?? 0).toLocaleString('fa-IR')} فاکتور`}
              icon={TrendingUp}
              tone="green"
            />
            <SummaryCard
              label="هزینه کل"
              value={toman(totals?.expenses ?? 0)}
              hint={`${(totals?.expenseCount ?? 0).toLocaleString('fa-IR')} هزینه`}
              icon={TrendingDown}
              tone="red"
            />
            <SummaryCard
              label="سود خالص"
              value={toman(totals?.netProfit ?? 0)}
              hint="فروش منهای هزینه"
              icon={Wallet}
              tone={(totals?.netProfit ?? 0) >= 0 ? 'green' : 'red'}
            />
            <SummaryCard
              label="مالیات فروش"
              value={toman(totals?.salesTax ?? 0)}
              hint={`هزینه مالیات: ${toman(totals?.expensesTax ?? 0)}`}
              icon={Receipt}
              tone="amber"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="indeed-panel p-4">
              <h4 className="text-sm font-extrabold text-ink">ریز ماهانه (شمسی)</h4>
              {summary?.monthly.length ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="text-muted">
                      <tr>
                        <th className="px-2 py-2 font-bold">ماه</th>
                        <th className="px-2 py-2 font-bold">فروش</th>
                        <th className="px-2 py-2 font-bold">هزینه</th>
                        <th className="px-2 py-2 font-bold">سود</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.monthly.map((row) => (
                        <tr
                          key={`${row.year}-${row.month}`}
                          className="border-t border-[var(--vintage-border)]"
                        >
                          <td className="px-2 py-2 font-bold text-ink">
                            {JALALI_MONTHS[row.month - 1] ?? row.month} {row.year}
                          </td>
                          <td className="px-2 py-2 text-green-700">{toman(row.sales)}</td>
                          <td className="px-2 py-2 text-red-700">{toman(row.expenses)}</td>
                          <td
                            className={cn(
                              'px-2 py-2 font-bold',
                              row.profit >= 0 ? 'text-ink' : 'text-red-700',
                            )}
                          >
                            {toman(row.profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted">داده‌ای در این بازه نیست.</p>
              )}
            </div>

            <div className="indeed-panel p-4">
              <h4 className="text-sm font-extrabold text-ink">فروش به تفکیک نوع</h4>
              {summary?.bySource.length ? (
                <ul className="mt-3 flex flex-col gap-2 text-xs">
                  {summary.bySource.map((row) => (
                    <li
                      key={row.sourceType}
                      className="flex items-center justify-between border-b border-[var(--vintage-border)] pb-2"
                    >
                      <span className="font-bold text-ink">
                        {row.label}
                        <span className="ms-1 text-muted">
                          ({row.count.toLocaleString('fa-IR')})
                        </span>
                      </span>
                      <span className="font-extrabold text-brand">{toman(row.total)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-muted">فروشی ثبت نشده است.</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="indeed-panel p-4">
              <h4 className="text-sm font-extrabold text-ink">هزینه به تفکیک دسته</h4>
              {summary?.byExpenseCategory.length ? (
                <ul className="mt-3 flex flex-col gap-2 text-xs">
                  {summary.byExpenseCategory.map((row) => (
                    <li
                      key={row.category}
                      className="flex items-center justify-between border-b border-[var(--vintage-border)] pb-2"
                    >
                      <span className="font-bold text-ink">
                        {row.category}
                        <span className="ms-1 text-muted">
                          ({row.count.toLocaleString('fa-IR')})
                        </span>
                      </span>
                      <span className="font-extrabold text-red-700">{toman(row.total)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-muted">هزینه‌ای ثبت نشده است.</p>
              )}
            </div>

            <div className="indeed-panel p-4">
              <h4 className="text-sm font-extrabold text-ink">جمع سالانه</h4>
              {summary?.yearly.length ? (
                <ul className="mt-3 flex flex-col gap-2 text-xs">
                  {summary.yearly.map((row) => (
                    <li
                      key={row.year}
                      className="flex items-center justify-between border-b border-[var(--vintage-border)] pb-2"
                    >
                      <span className="font-bold text-ink">{row.year}</span>
                      <span className="text-muted">
                        فروش {toman(row.sales)} • هزینه {toman(row.expenses)} • سود{' '}
                        <b className={row.profit >= 0 ? 'text-ink' : 'text-red-700'}>
                          {toman(row.profit)}
                        </b>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-muted">داده‌ای ثبت نشده است.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'invoices' ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-bold text-muted">
              جستجو
              <input
                className="indeed-input mt-1"
                value={invoiceQuery}
                onChange={(event) => {
                  setInvoicePage(1);
                  setInvoiceQuery(event.target.value);
                }}
                placeholder="شماره، عنوان یا مشتری"
              />
            </label>
            <label className="text-xs font-bold text-muted">
              وضعیت
              <select
                className="indeed-input mt-1"
                value={invoiceStatus}
                onChange={(event) => {
                  setInvoicePage(1);
                  setInvoiceStatus(event.target.value);
                }}
              >
                <option value="">همه</option>
                <option value="ISSUED">صادرشده</option>
                <option value="VOID">ابطال‌شده</option>
              </select>
            </label>
            <label className="text-xs font-bold text-muted">
              نوع فروش
              <select
                className="indeed-input mt-1"
                value={invoiceSource}
                onChange={(event) => {
                  setInvoicePage(1);
                  setInvoiceSource(event.target.value);
                }}
              >
                <option value="">همه</option>
                {(summary?.bySource ?? []).map((row) => (
                  <option key={row.sourceType} value={row.sourceType}>
                    {row.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void exportInvoices()}
              className="indeed-btn indeed-btn-secondary py-2 text-xs"
            >
              <Download className="size-3.5" aria-hidden />
              خروجی CSV
            </button>
            <button
              type="button"
              onClick={() => setShowManual((value) => !value)}
              className="indeed-btn indeed-btn-primary py-2 text-xs"
            >
              <Plus className="size-3.5" aria-hidden />
              ثبت فروش دستی
            </button>
          </div>

          {showManual ? (
            <form
              onSubmit={createManualInvoice}
              className="indeed-panel grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4"
            >
              <label className="text-xs font-bold text-muted">
                عنوان فروش
                <input
                  className="indeed-input mt-1"
                  value={manualDraft.title}
                  onChange={(event) =>
                    setManualDraft({ ...manualDraft, title: event.target.value })
                  }
                  placeholder="مثلاً تیک آبی"
                />
              </label>
              <label className="text-xs font-bold text-muted">
                مبلغ (تومان)
                <input
                  className="indeed-input mt-1"
                  inputMode="numeric"
                  value={manualDraft.amount}
                  onChange={(event) =>
                    setManualDraft({ ...manualDraft, amount: event.target.value })
                  }
                />
              </label>
              <label className="text-xs font-bold text-muted">
                مالیات (اختیاری)
                <input
                  className="indeed-input mt-1"
                  inputMode="numeric"
                  value={manualDraft.taxAmount}
                  onChange={(event) =>
                    setManualDraft({ ...manualDraft, taxAmount: event.target.value })
                  }
                />
              </label>
              <label className="text-xs font-bold text-muted">
                تاریخ پرداخت
                <JalaliDatePicker
                  className="mt-1"
                  value={manualDraft.paidAt}
                  onChange={(iso) =>
                    setManualDraft({ ...manualDraft, paidAt: iso })
                  }
                />
              </label>
              <label className="text-xs font-bold text-muted">
                نام مشتری
                <input
                  className="indeed-input mt-1"
                  value={manualDraft.customerName}
                  onChange={(event) =>
                    setManualDraft({ ...manualDraft, customerName: event.target.value })
                  }
                />
              </label>
              <label className="text-xs font-bold text-muted">
                موبایل مشتری
                <input
                  className="indeed-input mt-1"
                  dir="ltr"
                  value={manualDraft.customerPhone}
                  onChange={(event) =>
                    setManualDraft({ ...manualDraft, customerPhone: event.target.value })
                  }
                />
              </label>
              <label className="text-xs font-bold text-muted">
                ایمیل مشتری
                <input
                  className="indeed-input mt-1"
                  dir="ltr"
                  value={manualDraft.customerEmail}
                  onChange={(event) =>
                    setManualDraft({ ...manualDraft, customerEmail: event.target.value })
                  }
                />
              </label>
              <label className="text-xs font-bold text-muted">
                توضیحات
                <input
                  className="indeed-input mt-1"
                  value={manualDraft.description}
                  onChange={(event) =>
                    setManualDraft({ ...manualDraft, description: event.target.value })
                  }
                />
              </label>
              <div className="flex items-end gap-2 md:col-span-2 xl:col-span-4">
                <button
                  type="submit"
                  disabled={busy}
                  className="indeed-btn indeed-btn-primary py-2 text-xs"
                >
                  صدور و بایگانی فاکتور
                </button>
                <button
                  type="button"
                  onClick={() => setShowManual(false)}
                  className="indeed-btn indeed-btn-secondary py-2 text-xs"
                >
                  لغو
                </button>
              </div>
            </form>
          ) : null}

          {loading ? (
            <p className="text-sm text-muted">در حال بارگذاری...</p>
          ) : (
            <>
              <AdminDataTable
                columns={invoiceColumns}
                rows={invoices?.items ?? []}
                rowKey={(row) => row.id}
                empty="فاکتوری در این بازه ثبت نشده است."
                minWidthClass="min-w-[70rem]"
              />
              {invoices ? (
                <Pagination meta={invoices.meta} onPage={setInvoicePage} />
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {tab === 'expenses' ? (
        <div className="flex flex-col gap-3">
          <form
            onSubmit={saveExpense}
            className="indeed-panel grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4"
          >
            <h4 className="text-sm font-extrabold text-ink md:col-span-2 xl:col-span-4">
              {editingExpense ? 'ویرایش هزینه' : 'ثبت هزینه‌ی جدید'}
            </h4>
            <label className="text-xs font-bold text-muted">
              عنوان
              <input
                className="indeed-input mt-1"
                value={expenseDraft.title}
                onChange={(event) =>
                  setExpenseDraft({ ...expenseDraft, title: event.target.value })
                }
                placeholder="مثلاً هزینه ماهانه سرور"
              />
            </label>
            <label className="text-xs font-bold text-muted">
              دسته
              <input
                className="indeed-input mt-1"
                list="finance-expense-categories"
                value={expenseDraft.category}
                onChange={(event) =>
                  setExpenseDraft({ ...expenseDraft, category: event.target.value })
                }
              />
              <datalist id="finance-expense-categories">
                {(meta?.expenseCategories ?? []).map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </label>
            <label className="text-xs font-bold text-muted">
              مبلغ (تومان)
              <input
                className="indeed-input mt-1"
                inputMode="numeric"
                value={expenseDraft.amount}
                onChange={(event) =>
                  setExpenseDraft({ ...expenseDraft, amount: event.target.value })
                }
              />
            </label>
            <label className="text-xs font-bold text-muted">
              مالیات (اختیاری)
              <input
                className="indeed-input mt-1"
                inputMode="numeric"
                value={expenseDraft.taxAmount}
                onChange={(event) =>
                  setExpenseDraft({ ...expenseDraft, taxAmount: event.target.value })
                }
              />
            </label>
            <label className="text-xs font-bold text-muted">
              تاریخ
              <JalaliDatePicker
                className="mt-1"
                value={expenseDraft.spentAt}
                onChange={(iso) =>
                  setExpenseDraft({ ...expenseDraft, spentAt: iso })
                }
              />
            </label>
            <label className="text-xs font-bold text-muted">
              فروشنده/سرویس‌دهنده
              <input
                className="indeed-input mt-1"
                value={expenseDraft.vendor}
                onChange={(event) =>
                  setExpenseDraft({ ...expenseDraft, vendor: event.target.value })
                }
              />
            </label>
            <label className="text-xs font-bold text-muted">
              شماره سند/فاکتور
              <input
                className="indeed-input mt-1"
                dir="ltr"
                value={expenseDraft.reference}
                onChange={(event) =>
                  setExpenseDraft({ ...expenseDraft, reference: event.target.value })
                }
              />
            </label>
            <label className="text-xs font-bold text-muted">
              توضیحات
              <input
                className="indeed-input mt-1"
                value={expenseDraft.description}
                onChange={(event) =>
                  setExpenseDraft({ ...expenseDraft, description: event.target.value })
                }
              />
            </label>
            <div className="flex items-end gap-2 md:col-span-2 xl:col-span-4">
              <button
                type="submit"
                disabled={busy}
                className="indeed-btn indeed-btn-primary py-2 text-xs"
              >
                {editingExpense ? 'ذخیره تغییرات' : 'ثبت هزینه'}
              </button>
              {editingExpense ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingExpense(null);
                    setExpenseDraft(EMPTY_EXPENSE);
                  }}
                  className="indeed-btn indeed-btn-secondary py-2 text-xs"
                >
                  لغو ویرایش
                </button>
              ) : null}
            </div>
          </form>

          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-bold text-muted">
              جستجو
              <input
                className="indeed-input mt-1"
                value={expenseQuery}
                onChange={(event) => {
                  setExpensePage(1);
                  setExpenseQuery(event.target.value);
                }}
                placeholder="عنوان، فروشنده یا سند"
              />
            </label>
            <label className="text-xs font-bold text-muted">
              دسته
              <select
                className="indeed-input mt-1"
                value={expenseCategory}
                onChange={(event) => {
                  setExpensePage(1);
                  setExpenseCategory(event.target.value);
                }}
              >
                <option value="">همه</option>
                {(meta?.expenseCategories ?? []).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void exportExpenses()}
              className="indeed-btn indeed-btn-secondary py-2 text-xs"
            >
              <Download className="size-3.5" aria-hidden />
              خروجی CSV
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-muted">در حال بارگذاری...</p>
          ) : (
            <>
              <AdminDataTable
                columns={expenseColumns}
                rows={expenses?.items ?? []}
                rowKey={(row) => row.id}
                empty="هزینه‌ای در این بازه ثبت نشده است."
                minWidthClass="min-w-[60rem]"
              />
              {expenses ? (
                <Pagination meta={expenses.meta} onPage={setExpensePage} />
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Wallet;
  tone: 'green' | 'red' | 'amber';
}) {
  const toneClass =
    tone === 'green'
      ? 'bg-green-50 text-green-700'
      : tone === 'red'
        ? 'bg-red-50 text-red-700'
        : 'bg-amber-50 text-amber-700';
  return (
    <div className="indeed-panel flex items-center gap-3 p-4">
      <span className={cn('flex size-10 items-center justify-center rounded-lg', toneClass)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-muted">{label}</p>
        <p className="truncate text-sm font-extrabold text-ink">{value}</p>
        <p className="text-[10px] text-muted">{hint}</p>
      </div>
    </div>
  );
}
