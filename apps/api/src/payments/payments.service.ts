import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

export type PaymentKind =
  | 'SUBSCRIPTION'
  | 'SERVICE'
  | 'WALLET'
  | 'BOOST'
  | 'AD';

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
    const [subscriptions, services, wallets, requests] = await Promise.all([
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
      });
    }

    items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return items.slice(0, take);
  }
}
