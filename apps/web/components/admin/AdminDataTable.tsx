'use client';

import { cn } from '@/lib/utils';

export interface AdminColumn<T> {
  /** stable key for React */
  key: string;
  /** header label */
  label: string;
  /** optional fixed width class, e.g. `w-40` */
  className?: string;
  /** cell renderer */
  render: (row: T) => React.ReactNode;
}

interface Props<T> {
  columns: Array<AdminColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  /** shown when `rows` is empty */
  empty?: string;
  /** min table width so the columns don't crush on mobile */
  minWidthClass?: string;
}

/**
 * Shared admin table shell. The admin panels (subtabs included) all render as
 * tables; this keeps the header/row styling identical across every section so
 * the whole admin area stays visually consistent.
 */
export function AdminDataTable<T>({
  columns,
  rows,
  rowKey,
  empty = 'موردی برای نمایش نیست.',
  minWidthClass = 'min-w-[48rem]',
}: Props<T>) {
  return (
    <div className="indeed-panel overflow-x-auto">
      <table className={cn('w-full text-right text-sm', minWidthClass)}>
        <thead>
          <tr className="bg-[#fbf3e9] text-xs text-muted">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn('px-4 py-2.5 font-bold', column.className)}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-t border-[var(--vintage-border)]">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-2.5 align-top">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-muted">
                {empty}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
