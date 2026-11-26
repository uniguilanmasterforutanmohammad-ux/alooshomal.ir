export type SmsTransactionStatus =
  | 'UNMATCHED'
  | 'AMBIGUOUS'
  | 'AUTO_APPROVED'
  | 'MANUALLY_LINKED'
  | 'IGNORED';

export interface SmsGatewayDevice {
  id: string;
  name: string;
  platform: string;
  appVersion: string | null;
  status: 'ACTIVE' | 'REVOKED' | string;
  lastSeenAt: string | null;
  lastSmsAt: string | null;
  pairedAt: string;
}

export interface SmsGatewayOrderRef {
  id: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
}

export interface SmsGatewayTransaction {
  id: string;
  workspaceId: string;
  deviceId: string | null;
  rawText: string;
  amount: number;
  bankName: string | null;
  senderName: string | null;
  destinationLast4: string | null;
  destinationCard: string | null;
  trackingNumber: string | null;
  smsReceivedAt: string | null;
  status: SmsTransactionStatus | string;
  orderId: string | null;
  cardPaymentId: string | null;
  candidates:
    | Array<{
        orderId: string;
        orderNumber: string;
        customerName: string;
        totalAmount: number;
        createdAt: string;
      }>
    | null;
  note: string | null;
  createdAt: string;
  device: { id: string; name: string } | null;
  order: SmsGatewayOrderRef | null;
}

export interface SmsGatewayOverview {
  enabled: boolean;
  workspace: { id: string; name: string } | null;
  account: {
    cardNumber: string;
    cardLast4: string;
    holderName: string;
    bankName: string | null;
    isActive: boolean;
  } | null;
  devices: SmsGatewayDevice[];
  transactions: SmsGatewayTransaction[];
  stats: Record<string, number>;
}

export interface SmsPairingCode {
  code: string;
  expiresAt: string;
  cardLast4: string;
  apiBaseUrl: string;
}

export interface SmsTransactionCandidateOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

export interface SmsStatementImportResult {
  totalRows: number;
  deposits: number;
  imported: number;
  duplicates: number;
  otherCard: number;
  invalid: number;
  autoApproved: number;
  ambiguous: number;
  unmatched: number;
  accountNumber: string | null;
  bankName: string | null;
  errors: string[];
}
