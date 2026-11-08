'use client';

import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types & helpers                                                    */
/* ------------------------------------------------------------------ */

export type Row = Record<string, unknown>;

export interface PaypingStatus {
  configured: boolean;
  reachable: boolean;
  baseUrl: string;
  latencyMs: number | null;
  message: string | null;
}

export interface OverviewPayload {
  transactions: { result?: number } | null;
  withdrawals: { result?: number } | null;
  customers: { count?: number } | null;
  coupons: { count?: number } | null;
  invoices: { count?: number } | null;
}

export const INPUT =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand';

export function toman(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString('fa-IR')} تومان`;
}

export function cell(row: Row, key: string): string {
  const value = row[key];
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر';
  if (typeof value === 'number') return value.toLocaleString('fa-IR');
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'خطای نامشخص';
}

export function Panel({
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

export function Banner({
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

export function DataTable({
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

export function Field({
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
