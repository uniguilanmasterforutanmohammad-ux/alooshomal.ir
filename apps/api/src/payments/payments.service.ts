import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  getBusinessModule,
  INDUSTRY_PACKAGES,
} from '../business-modules/business-modules.registry';
import { FINANCE_SOURCE_TYPES } from '../finance/finance.constants';

export type PaymentKind =
  | 'SUBSCRIPTION'
  | 'SERVICE'
  | 'WALLET'
  | 'BOOST'
  | 'AD'
  | 'BUSINESS_MODULE';

export interface PaymentDetailRow {
  label: string;
  value: string;
}

export interface MyPayment {
  id: string;
  kind: PaymentKind;
  title: string;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
  paidAt: string | null;
  refId: string | null;
  failureReason: string | null;
  details: PaymentDetailRow[];
  /** The archived invoice of this payment (null while pending / not issued). */
  invoiceId: string | null;
  /** Per-module outcome for a paid composite (empty otherwise). */
  results: Array<{
    label: string;
    ok: boolean;
    message: string;
  }>;
}

function faNumber(value: number): string {
  return value.toLocaleString('fa-IR');
}

function money(value: number): string {
  return `${faNumber(value)} تومان`;
}

/**
 * Unified «پرداخت‌های من» feed: every gateway attempt a user made — plan
 * subscriptions, one-off service/composite inquiries, wallet settlements and
 * boost/ad requests — with the order details and the success/failure state.
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async mine(userId: string, take = 100): Promise<MyPayment[]> {
    await this.settings.assertFeatureEnabled('featureMyPayments');
    const [subscriptions, services, wallets, requests, modulePurchases, invoices] =
      await Promise.all([
      this.prisma.subscriptionPayment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take,
        include: { plan: { select: { name: true } } },
      }),
      this.prisma.servicePayment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.prisma.walletPayment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.prisma.requestPayment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take,
        include: {
          boostRequest: { select: { kind: true, targetId: true } },
          adRequest: { select: { kind: true, placement: true, targetId: true } },
        },
      }),
      this.prisma.businessModulePurchase.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.prisma.invoice.findMany({
        where: { customerUserId: userId, sourceId: { not: null } },
        select: { id: true, sourceId: true },
      }),
    ]);

    const items: MyPayment[] = [];

    for (const payment of subscriptions) {
      const details: PaymentDetailRow[] = [
        { label: 'نوع', value: 'خرید/تمدید اشتراک' },
        { label: 'پلن', value: payment.plan?.name ?? '—' },
        { label: 'دوره', value: `${faNumber(payment.months)} ماه` },
      ];
      if (payment.businessAmount > 0) {
        details.push({
          label: 'بسته مدیریت کسب‌وکار',
          value: money(payment.businessAmount),
        });
      }
      if (payment.identityAmount > 0) {
        details.push({ label: 'استعلام هویت', value: money(payment.identityAmount) });
      }
      if (payment.moduleAmount > 0) {
        details.push({ label: 'ماژول‌های شروع آسان', value: money(payment.moduleAmount) });
      }
      items.push({
        id: payment.id,
        kind: 'SUBSCRIPTION',
        title: `اشتراک «${payment.plan?.name ?? '—'}» — ${faNumber(payment.months)} ماه`,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt.toISOString(),
        paidAt: payment.paidAt?.toISOString() ?? null,
        refId: payment.refId ?? null,
        failureReason: payment.failureReason ?? null,
        details,
        results: [],
        invoiceId: null,
      });
    }

    for (const payment of services) {
      const itemsJson = (payment.items ?? null) as
        | { modules?: Array<{ label?: string; serviceKey?: string }> }
        | null;
      const modules = Array.isArray(itemsJson?.modules)
        ? itemsJson.modules
            .map((item) => item.label ?? item.serviceKey ?? '')
            .filter(Boolean)
        : [];
      const title =
        payment.title ??
        (modules.length > 0 ? modules.join(' + ') : 'استعلام خدمت');
      const details: PaymentDetailRow[] = [{ label: 'نوع', value: 'استعلام/خدمت' }];
      if (modules.length > 0) {
        details.push({ label: 'ماژول‌ها', value: modules.join('، ') });
      }
      if (payment.nationalCode) {
        details.push({ label: 'کد ملی', value: payment.nationalCode });
      }
      if (payment.withLicense) {
        details.push({ label: 'جواز کسب', value: 'دارد' });
      }
      const resultJson = payment.result as unknown;
      const results = Array.isArray(resultJson)
        ? (resultJson as Array<Record<string, unknown>>).map((row) => ({
            label: String(row.label ?? row.serviceKey ?? 'ماژول'),
            ok: Boolean(row.ok),
            message: String(row.message ?? ''),
          }))
        : [];
      items.push({
        id: payment.id,
        kind: 'SERVICE',
        title,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt.toISOString(),
        paidAt: payment.paidAt?.toISOString() ?? null,
        refId: payment.refId ?? null,
        failureReason: payment.failureReason ?? null,
        details,
        results,
        invoiceId: null,
      });
    }

    for (const payment of wallets) {
      items.push({
        id: payment.id,
        kind: 'WALLET',
        title: 'تسویه بدهی کیف پول',
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt.toISOString(),
        paidAt: payment.paidAt?.toISOString() ?? null,
        refId: payment.refId ?? null,
        failureReason: payment.failureReason ?? null,
        details: [{ label: 'نوع', value: 'شارژ/تسویه کیف پول' }],
        results: [],
        invoiceId: null,
      });
    }

    for (const payment of requests) {
      const isBoost = Boolean(payment.boostRequest);
      const placement = payment.adRequest?.placement;
      items.push({
        id: payment.id,
        kind: isBoost ? 'BOOST' : 'AD',
        title: isBoost
          ? 'پرداخت پله (ارتقای جایگاه)'
          : placement === 'DIRECTORY'
            ? 'پرداخت تبلیغ در دایرکتوری'
            : 'پرداخت تبلیغ صفحه اصلی',
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt.toISOString(),
        paidAt: payment.paidAt?.toISOString() ?? null,
        refId: payment.refId ?? null,
        failureReason: payment.failureReason ?? null,
        details: [{ label: 'نوع', value: isBoost ? 'پله' : 'تبلیغ' }],
        results: [],
        invoiceId: null,
      });
    }

    for (const purchase of modulePurchases) {
      const isPackage = purchase.moduleKey.startsWith('package:');
      const key = isPackage
        ? purchase.moduleKey.slice('package:'.length)
        : purchase.moduleKey;
      const label = isPackage
        ? (INDUSTRY_PACKAGES.find((item) => item.key === key)?.label ?? key)
        : (getBusinessModule(key)?.label ?? key);
      const details: PaymentDetailRow[] = [
        { label: 'نوع', value: isPackage ? 'مدیریت کسب‌وکار' : 'ماژول کسب‌وکار' },
        { label: 'عنوان', value: label },
        { label: 'دوره', value: `${faNumber(purchase.months)} ماه` },
      ];
      if (purchase.expiresAt) {
        details.push({
          label: 'اعتبار تا',
          value: new Date(purchase.expiresAt).toLocaleDateString('fa-IR'),
        });
      }
      items.push({
        id: purchase.id,
        kind: 'BUSINESS_MODULE',
        title: isPackage
          ? `مدیریت کسب‌وکار «${label}»`
          : `ماژول «${label}»`,
        amount: purchase.amount,
        status: purchase.status as PaymentStatus,
        createdAt: purchase.createdAt.toISOString(),
        paidAt: purchase.paidAt?.toISOString() ?? null,
        refId: null,
        failureReason: null,
        details,
        results: [],
        invoiceId: null,
      });
    }

    // Attach the archived invoice id to each payment so the UI can offer the
    // full invoice for every settled sale (rule: every payment has an invoice).
    const invoiceBySourceId = new Map(
      invoices
        .filter((row): row is { id: string; sourceId: string } => Boolean(row.sourceId))
        .map((row) => [row.sourceId, row.id]),
    );
    for (const item of items) {
      item.invoiceId = invoiceBySourceId.get(item.id) ?? null;
    }

    items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return items.slice(0, take);
  }

  /**
   * One archived invoice belonging to the signed-in user, with its line items
   * and buyer snapshot — used by the «فاکتور» button on «پرداخت‌های من».
   * Owner-scoped: a user can never read another buyer's invoice.
   */
  async invoice(userId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId },
      include: {
        items: true,
        customer: {
          select: {
            id: true,
            fullName: true,
            firstName: true,
            lastName: true,
            fatherName: true,
            birthDate: true,
            nationalCode: true,
            email: true,
            phone: true,
          },
        },
      },
    });
    if (!invoice) throw new NotFoundException('فاکتور یافت نشد');
    if (invoice.customerUserId === userId) return invoice;
    // Older retail-order invoices may not carry `customerUserId`; fall back to
    // the owning order so the buyer can still open their own receipt.
    if (
      invoice.sourceType === FINANCE_SOURCE_TYPES.RETAIL_ORDER &&
      invoice.sourceId
    ) {
      const order = await this.prisma.retailOrder.findFirst({
        where: { id: invoice.sourceId, customerUserId: userId },
        select: { id: true },
      });
      if (order) return invoice;
    }
    throw new NotFoundException('فاکتور یافت نشد');
  }
}
