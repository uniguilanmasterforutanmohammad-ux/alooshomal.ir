import type { Prisma } from '@prisma/client';

/** One line of a subscription invoice (plan, add-on package or inquiry). */
export interface SubscriptionInvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface StoredBusinessAddon {
  workspaceId?: string;
  packageKey?: string;
  label?: string;
  businessName?: string;
  amount?: number;
  months?: number;
  paidUntil?: string;
}

/** Persian label of a billable term, used in invoice lines. */
export function subscriptionTermLabel(months: number): string {
  if (months === 3) return 'سه‌ماهه';
  if (months === 6) return 'شش‌ماهه';
  if (months === 12) return 'یک‌ساله';
  return 'یک‌ماهه';
}

function storedAddons(
  raw: Prisma.JsonValue | null | undefined,
): StoredBusinessAddon[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item) => Boolean(item) && typeof item === 'object' && !Array.isArray(item),
  ) as StoredBusinessAddon[];
}

function faDate(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('fa-IR');
}

/**
 * Build the itemised lines of a subscription payment: the plan term, every
 * «بسته مدیریت کسب‌وکار» bought in the same cart, and the identity inquiry.
 * The plan amount is the remainder of the paid total, so the lines always add
 * up to exactly the amount the buyer paid.
 */
export function buildSubscriptionInvoiceLines(input: {
  months: number;
  amount: number;
  businessAmount?: number | null;
  identityAmount?: number | null;
  businessPackages?: Prisma.JsonValue | null;
  planName: string;
}): SubscriptionInvoiceLine[] {
  const amount = Math.max(0, Math.floor(input.amount));
  const addons = storedAddons(input.businessPackages);
  const addonSum = addons.reduce(
    (sum, item) => sum + Math.max(0, Math.floor(item.amount ?? 0)),
    0,
  );
  const businessTotal =
    addonSum > 0 ? addonSum : Math.max(0, Math.floor(input.businessAmount ?? 0));
  const identityTotal = Math.max(0, Math.floor(input.identityAmount ?? 0));
  const planTotal = Math.max(0, amount - businessTotal - identityTotal);
  const lines: SubscriptionInvoiceLine[] = [];

  if (input.months > 0 && planTotal > 0) {
    const quantity = input.months > 1 ? input.months : 1;
    lines.push({
      description: `اشتراک «${input.planName}» — دوره ${subscriptionTermLabel(
        input.months,
      )}`,
      quantity,
      unitPrice: Math.round(planTotal / quantity),
      total: planTotal,
    });
  }

  for (const addon of addons) {
    const itemTotal = Math.max(0, Math.floor(addon.amount ?? 0));
    if (itemTotal <= 0) continue;
    const label = addon.label?.trim() || 'بسته مدیریت کسب‌وکار';
    const business = addon.businessName?.trim();
    const until = faDate(addon.paidUntil);
    lines.push({
      description: `بسته مدیریت کسب‌وکار «${label}»${
        business ? ` — ${business}` : ''
      }${until ? ` (تا ${until})` : ''}`,
      quantity: 1,
      unitPrice: itemTotal,
      total: itemTotal,
    });
  }

  if (identityTotal > 0) {
    lines.push({
      description: 'استعلام هویت و جواز کسب',
      quantity: 1,
      unitPrice: identityTotal,
      total: identityTotal,
    });
  }

  const linesTotal = lines.reduce((sum, line) => sum + line.total, 0);
  if (linesTotal < amount) {
    lines.push({
      description: 'سایر خدمات',
      quantity: 1,
      unitPrice: amount - linesTotal,
      total: amount - linesTotal,
    });
  }

  return lines;
}
