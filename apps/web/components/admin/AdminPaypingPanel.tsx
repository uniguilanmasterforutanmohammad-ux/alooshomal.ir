'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BadgePercent,
  Banknote,
  CreditCard,
  FileText,
  Plug,
  Receipt,
  ShieldQuestion,
  ShoppingBag,
  Upload,
  Users,
  Wallet,
} from 'lucide-react';

import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

import { BnplTab } from './payping/BnplTab';
import { CouponsTab } from './payping/CouponsTab';
import { CustomersTab } from './payping/CustomersTab';
import { InquiryTab } from './payping/InquiryTab';
import { InvoicesTab } from './payping/InvoicesTab';
import { OverviewTab } from './payping/OverviewTab';
import { PayTab } from './payping/PayTab';
import { ProductsTab } from './payping/ProductsTab';
import { TransactionsTab } from './payping/TransactionsTab';
import { UploadTab } from './payping/UploadTab';
import { WithdrawalsTab } from './payping/WithdrawalsTab';
import { errorText, type PaypingStatus } from './payping/shared';

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
