import { Injectable } from '@nestjs/common';
import { BoostStatus, SubscriptionStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { addJalaliMonths, jalaliParts } from '../common/jalali';

/**
 * Read-only revenue reporting for the admin dashboard, split out of the
 * (large) `AdminService`. Prices come from the settings registry; the
 * approved transactions come from Prisma.
 */
@Injectable()
export class AdminRevenueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Revenue estimate for the four monetisation models. There is no payment
   * gateway yet, so each approved transaction is priced with the admin-set
   * unit price for its model:
   *
   *   1. subscriptions   → SubscriptionPlan.price  (per approved plan request)
   *   2. boosts «پله»    → BOOST_PRICE              (per approved boost)
   *   3. directory ads   → AD_DIRECTORY_PRICE       (per approved DIRECTORY ad)
   *   4. home-page ads   → AD_HOME_PRICE            (per approved HOME ad)
   *   5. feed tag fee    → FEED_TAG_PRICE           (per paid feed tag)
   *
   * The feed packages (FeedPackage.price) are counted as their own row so the
   * whole picture is visible, since they are a separate paid subscription.
   */
  async revenueReport() {
    const [boostPrice, adHomePrice, adDirectoryPrice, feedTagPrice] = await Promise.all([
      this.settings.getBoostPrice(),
      this.settings.getAdHomePrice(),
      this.settings.getAdDirectoryPrice(),
      this.settings.getFeedTagPrice(),
    ]);

    const [
      boosts,
      homeAds,
      directoryAds,
      paidFeedTags,
      planSubscriptions,
      feedSubscriptions,
      pendingBoosts,
      pendingAds,
      pendingSubscriptions,
      activeFeedSubscriptions,
    ] = await Promise.all([
      this.prisma.boostRequest.findMany({
        where: { status: BoostStatus.APPROVED },
        select: { requestedAt: true, decidedAt: true },
      }),
      this.prisma.adRequest.findMany({
        where: { status: BoostStatus.APPROVED, placement: 'HOME' },
        select: { requestedAt: true, decidedAt: true },
      }),
      this.prisma.adRequest.findMany({
        where: { status: BoostStatus.APPROVED, placement: 'DIRECTORY' },
        select: { requestedAt: true, decidedAt: true },
      }),
      this.prisma.feedPost.findMany({
        where: { tagPaid: true, tagKind: { not: null } },
        select: { tagPrice: true, tagDecidedAt: true, createdAt: true },
      }),
      this.prisma.userSubscription.findMany({
        where: { status: SubscriptionStatus.ACTIVE },
        select: {
          decidedAt: true,
          requestedAt: true,
          plan: { select: { name: true, price: true } },
        },
      }),
      this.prisma.userFeedSubscription.findMany({
        where: { status: SubscriptionStatus.ACTIVE },
        select: {
          decidedAt: true,
          requestedAt: true,
          package: { select: { name: true, price: true } },
        },
      }),
      this.prisma.boostRequest.count({ where: { status: BoostStatus.PENDING } }),
      this.prisma.adRequest.count({ where: { status: BoostStatus.PENDING } }),
      this.prisma.userSubscription.count({
        where: { status: SubscriptionStatus.PENDING },
      }),
      this.prisma.userFeedSubscription.count({
        where: { status: SubscriptionStatus.ACTIVE },
      }),
    ]);

    const planRows = new Map<string, { name: string; price: number; count: number }>();
    for (const sub of planSubscriptions) {
      const key = sub.plan?.name ?? '—';
      const row = planRows.get(key) ?? {
        name: key,
        price: sub.plan?.price ?? 0,
        count: 0,
      };
      row.count += 1;
      planRows.set(key, row);
    }

    const feedRows = new Map<string, { name: string; price: number; count: number }>();
    for (const sub of feedSubscriptions) {
      const key = sub.package?.name ?? '—';
      const row = feedRows.get(key) ?? {
        name: key,
        price: sub.package?.price ?? 0,
        count: 0,
      };
      row.count += 1;
      feedRows.set(key, row);
    }

    const items = [
      ...Array.from(planRows.values()).map((row) => ({
        model: 'اشتراک پلن',
        label: row.name,
        count: row.count,
        unitPrice: row.price,
        revenue: row.count * row.price,
      })),
      ...Array.from(feedRows.values()).map((row) => ({
        model: 'اشتراک فید',
        label: row.name,
        count: row.count,
        unitPrice: row.price,
        revenue: row.count * row.price,
      })),
      {
        model: 'پله',
        label: 'افزایش بازدید (پله)',
        count: boosts.length,
        unitPrice: boostPrice,
        revenue: boosts.length * boostPrice,
      },
      {
        model: 'تبلیغ در دایرکتوری',
        label: 'تبلیغ هدفمند در دایرکتوری',
        count: directoryAds.length,
        unitPrice: adDirectoryPrice,
        revenue: directoryAds.length * adDirectoryPrice,
      },
      {
        model: 'تبلیغ در صفحه اصلی',
        label: 'تبلیغ در کادر صفحه اصلی',
        count: homeAds.length,
        unitPrice: adHomePrice,
        revenue: homeAds.length * adHomePrice,
      },
      {
        model: 'تگ فید',
        label: 'تگ کارت/بیولینک روی پست فید',
        count: paidFeedTags.length,
        unitPrice: feedTagPrice,
        revenue: paidFeedTags.length * feedTagPrice,
      },
    ];

    const totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0);
    const totalCount = items.reduce((sum, item) => sum + item.count, 0);

    // ---- Time breakdown (Jalali month / year) ----------------------------
    // Each approved transaction is one revenue event stamped with the date the
    // money is attributed to: the decision date for requests, the settlement
    // date for feed tags. Buckets are keyed on the Persian calendar so the
    // panel's breakdown lines up with everything else in the admin.
    interface RevenueEvent {
      model: string;
      revenue: number;
      at: Date;
    }
    const events: RevenueEvent[] = [];
    const pushEvents = (
      rows: Array<{ requestedAt: Date; decidedAt: Date | null }>,
      model: string,
      unitPrice: number,
    ) => {
      for (const row of rows) {
        events.push({
          model,
          revenue: unitPrice,
          at: row.decidedAt ?? row.requestedAt,
        });
      }
    };
    pushEvents(boosts, 'پله', boostPrice);
    pushEvents(directoryAds, 'تبلیغ در دایرکتوری', adDirectoryPrice);
    pushEvents(homeAds, 'تبلیغ در صفحه اصلی', adHomePrice);
    for (const post of paidFeedTags) {
      events.push({
        model: 'تگ فید',
        revenue: post.tagPrice ?? feedTagPrice,
        at: post.tagDecidedAt ?? post.createdAt,
      });
    }
    for (const sub of planSubscriptions) {
      events.push({
        model: 'اشتراک پلن',
        revenue: sub.plan?.price ?? 0,
        at: sub.decidedAt ?? sub.requestedAt,
      });
    }
    for (const sub of feedSubscriptions) {
      events.push({
        model: 'اشتراک فید',
        revenue: sub.package?.price ?? 0,
        at: sub.decidedAt ?? sub.requestedAt,
      });
    }

    const monthAgg = new Map<
      string,
      { year: number; month: number; revenue: number; count: number }
    >();
    const yearAgg = new Map<number, { year: number; revenue: number; count: number }>();
    for (const event of events) {
      const { year, month } = jalaliParts(event.at);
      const monthKey = `${year}-${month}`;
      const monthRow = monthAgg.get(monthKey) ?? { year, month, revenue: 0, count: 0 };
      monthRow.revenue += event.revenue;
      monthRow.count += 1;
      monthAgg.set(monthKey, monthRow);

      const yearRow = yearAgg.get(year) ?? { year, revenue: 0, count: 0 };
      yearRow.revenue += event.revenue;
      yearRow.count += 1;
      yearAgg.set(year, yearRow);
    }

    const now = new Date();
    const today = jalaliParts(now);
    const monthly: Array<{
      year: number;
      month: number;
      revenue: number;
      count: number;
    }> = [];
    for (let offset = 11; offset >= 0; offset -= 1) {
      const { year, month } = addJalaliMonths(today.year, today.month, -offset);
      const row = monthAgg.get(`${year}-${month}`);
      monthly.push({ year, month, revenue: row?.revenue ?? 0, count: row?.count ?? 0 });
    }
    const yearly = Array.from(yearAgg.values()).sort((a, b) => b.year - a.year);

    const thisMonth =
      monthAgg.get(`${today.year}-${today.month}`)?.revenue ?? 0;
    const thisYear = yearAgg.get(today.year)?.revenue ?? 0;
    const lastMonthParts = addJalaliMonths(today.year, today.month, -1);
    const lastMonth =
      monthAgg.get(`${lastMonthParts.year}-${lastMonthParts.month}`)?.revenue ?? 0;
    const activeMonths = monthly.filter((row) => row.count > 0).length;
    const averageMonthly = activeMonths ? Math.round(thisYear / activeMonths) : 0;

    return {
      items,
      totalRevenue,
      totalCount,
      monthly,
      yearly,
      summary: {
        thisMonth,
        lastMonth,
        thisYear,
        averageMonthly,
        pendingBoosts,
        pendingAds,
        pendingSubscriptions,
        activeFeedSubscriptions,
        approvedCount: events.length,
      },
    };
  }
}
