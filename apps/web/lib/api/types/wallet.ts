export type WalletEntryKind =
  | 'IDENTITY_INQUIRY'
  | 'PHONE_MATCH'
  | 'SUBSCRIPTION'
  | 'BOOST'
  | 'AD_HOME'
  | 'AD_DIRECTORY'
  | 'FEED_TAG'
  | 'FEED_PACKAGE'
  | 'ADJUSTMENT'
  | 'PAYMENT';

export interface WalletEntry {
  id: string;
  walletId: string;
  /** Owner's national code captured when the entry was written. */
  nationalCode: string | null;
  kind: WalletEntryKind;
  /** Negative = charged to the user, positive = paid/credited. */
  amount: number;
  title: string;
  sourceType: string | null;
  sourceId: string | null;
  createdAt: string;
}

export type WalletPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELED';

export interface WalletPayment {
  id: string;
  userId: string;
  /** Owner's national code captured when the payment was created. */
  nationalCode: string | null;
  amount: number;
  status: WalletPaymentStatus;
  clientRefId: string;
  paymentCode: string | null;
  refId: string | null;
  gatewayUrl: string | null;
  paidAt: string | null;
  verifiedAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface MyWallet {
  /** The account's national code; the wallet ledger is keyed to it. */
  nationalCode: string | null;
  /** Negative while the user owes money. */
  balance: number;
  dueAt: string | null;
  overdue: boolean;
  settlementDays: number;
  entries: WalletEntry[];
  payments: WalletPayment[];
}

export interface WalletCheckout {
  paymentId: string;
  amount: number;
  paymentCode: string | null;
  url: string | null;
}
