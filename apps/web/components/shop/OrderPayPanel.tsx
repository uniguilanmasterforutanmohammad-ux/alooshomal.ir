'use client';

import { CardToCardForm } from '@/components/payments/CardToCardForm';
import type { PublicOrderTracking } from '@/lib/api';

/**
 * Payment area on the public order-tracking page. Shows the card-to-card form
 * only when the seller has approved the order (or the shop auto-confirms), so a
 * customer can always come back later and pay without re-ordering.
 */
export function OrderPayPanel({
  slug,
  order,
}: {
  slug: string;
  order: PublicOrderTracking;
}) {
  if (order.paymentMethod !== 'CARD_TO_CARD') {
    return (
      <section className="indeed-panel p-5 text-xs leading-6 text-muted">
        روش پرداخت این سفارش «پرداخت در محل» است؛ مبلغ را هنگام تحویل بپردازید.
      </section>
    );
  }

  if (order.paymentStatus === 'PAID') {
    return (
      <section className="indeed-panel p-5 text-sm font-bold text-emerald-700">
        پرداخت این سفارش تأیید شده است. سپاس از خرید شما!
      </section>
    );
  }

  if (order.paymentStatus === 'PENDING_REVIEW') {
    return (
      <section className="indeed-panel p-5 text-xs leading-6 text-muted">
        رسید پرداخت شما ارسال شده و در انتظار تأیید فروشنده است.
      </section>
    );
  }

  if (!order.paymentAllowed) {
    return (
      <section className="indeed-panel p-5 text-xs leading-6 text-amber-800">
        سفارش شما در انتظار تأیید فروشنده است. پس از تأیید، این صفحه امکان
        کارت‌به‌کارت و ارسال رسید را نشان می‌دهد.
      </section>
    );
  }

  if (!order.card) {
    return (
      <section className="indeed-panel p-5 text-xs leading-6 text-muted">
        فروشگاه هنوز شماره کارت برای پرداخت ثبت نکرده است؛ برای هماهنگی با
        پشتیبانی تماس بگیرید.
      </section>
    );
  }

  return (
    <section className="indeed-panel p-5">
      <CardToCardForm
        slug={slug}
        card={order.card}
        referenceType="ORDER"
        referenceId={order.id}
        defaultAmount={order.totalAmount}
        title="پرداخت سفارش با کارت به کارت"
      />
    </section>
  );
}
