/** One archived sales invoice (see `GET /admin/finance/invoices`). */
export interface FinanceInvoice {
  id: string;
  number: string;
  status: 'ISSUED' | 'VOID';
  sourceType: string;
  sourceId: string | null;
  title: string;
  description: string | null;
  customerUserId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  issuedAt: string;
  paidAt: string | null;
  metadata: Record<string, unknown> | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string;
  updatedAt: string;
  items?: FinanceInvoiceItem[];
  customer?: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  createdBy?: {
    id: string;
    fullName: string | null;
    email: string | null;
  } | null;
}

export interface FinanceInvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/** A manually recorded purchase/expense. */
export interface FinanceExpense {
  id: string;
  title: string;
  category: string;
  amount: number;
  taxAmount: number;
  spentAt: string;
  vendor: string | null;
  reference: string | null;
  description: string | null;
  attachmentUrl: string | null;
  createdById: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface FinanceInvoiceList {
  items: FinanceInvoice[];
  meta: FinanceListMeta;
}

export interface FinanceExpenseList {
  items: FinanceExpense[];
  meta: FinanceListMeta;
}

export interface FinanceSummaryRow {
  year: number;
  month: number;
  sales: number;
  expenses: number;
  profit: number;
}

export interface FinanceYearRow {
  year: number;
  sales: number;
  expenses: number;
  profit: number;
}

export interface FinanceSourceRow {
  sourceType: string;
  label: string;
  count: number;
  total: number;
}

export interface FinanceExpenseCategoryRow {
  category: string;
  count: number;
  total: number;
}

export interface FinanceSummary {
  totals: {
    sales: number;
    salesSubtotal: number;
    salesTax: number;
    expenses: number;
    expensesTax: number;
    netProfit: number;
    invoiceCount: number;
    expenseCount: number;
  };
  monthly: FinanceSummaryRow[];
  yearly: FinanceYearRow[];
  bySource: FinanceSourceRow[];
  byExpenseCategory: FinanceExpenseCategoryRow[];
}

export interface FinanceMeta {
  expenseCategories: string[];
}
