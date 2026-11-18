import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import {
  getBusinessModule,
  withDependencies,
} from '../business-modules/business-modules.registry';

export interface BusinessPackageTerm {
  months: 1 | 3 | 6 | 12;
  /** Total price of the term (Toman). */
  price: number;
  /** Discount percent applied to this term vs `price × months`. */
  discount: number;
}

const TERM_MONTHS = [1, 3, 6, 12] as const;

/**
 * Pricing and activation of one «مدیریت کسب‌وکار» package.
 *
 * Deliberately depends on Prisma only: the subscriptions module needs to price
 * and grant a package as part of a subscription checkout, and importing the
 * much larger `BusinessModulesService` there would create a circular module
 * dependency (business-modules → subscriptions).
 */
@Injectable()
export class BusinessPackageService {
  constructor(private readonly prisma: PrismaService) {}

  /** The package row plus the module keys its price is computed from. */
  private async load(packageKey: string) {
    const [management, memberships, prices] = await Promise.all([
      this.prisma.businessManagement.findUnique({
        where: { key: packageKey },
        select: {
          key: true,
          label: true,
          discount3: true,
          discount6: true,
          discount12: true,
        },
      }),
      this.prisma.businessManagementModule.findMany({
        where: { management: { key: packageKey } },
        select: { moduleKey: true },
      }),
      this.prisma.businessModulePrice.findMany({
        where: { isActive: true, price: { gt: 0 } },
        select: { moduleKey: true, price: true },
      }),
    ]);
    if (!management) return null;
    const keys = withDependencies(memberships.map((row) => row.moduleKey));
    const keySet = new Set(keys);
    const paid = prices.filter((row) => keySet.has(row.moduleKey));
    const monthly = paid.reduce((sum, row) => sum + row.price, 0);
    return { management, keys, paid, monthly };
  }

  /** Display label of a package (falls back to the key). */
  async label(packageKey: string): Promise<string> {
    const found = await this.prisma.businessManagement.findUnique({
      where: { key: packageKey },
      select: { label: true },
    });
    return found?.label ?? packageKey;
  }

  /** Keys of every package the panel offers for purchase, cheapest-ready first. */
  async availablePackageKeys(): Promise<string[]> {
    const rows = await this.prisma.businessManagement.findMany({
      where: { available: true },
      select: { key: true },
      orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }],
    });
    return rows.map((row) => row.key);
  }

  /**
   * The four purchasable terms of a package. Mirrors the admin's per-package
   * discounts: price = Σ monthly billable module prices × months × (1 − discount).
   */
  async terms(packageKey: string): Promise<BusinessPackageTerm[]> {
    const data = await this.load(packageKey);
    if (!data) return [];
    return TERM_MONTHS.map((months) => {
      const discount =
        months === 1
          ? 0
          : months === 3
            ? data.management.discount3
            : months === 6
              ? data.management.discount6
              : data.management.discount12;
      const percent = Math.min(Math.max(Math.round(discount), 0), 100);
      return {
        months,
        discount: percent,
        price: Math.max(
          0,
          Math.round(data.monthly * months * (1 - percent / 100)),
        ),
      };
    });
  }

  /** Price of one package term (0 when the package has no priced modules). */
  async termPrice(packageKey: string, months: number): Promise<number> {
    const terms = await this.terms(packageKey);
    return terms.find((term) => term.months === months)?.price ?? 0;
  }

  /**
   * Prorated price of a package for `days` of coverage. The whole-term price of
   * `months` is spread across its days, so a full term keeps the admin's term
   * discount while a mid-term add-on only pays for the days that are left.
   */
  async proratedPrice(
    packageKey: string,
    months: number,
    days: number,
  ): Promise<number> {
    const term = await this.termPrice(packageKey, months);
    if (term <= 0) return 0;
    const wholeDays = Math.max(1, months) * 30.4375;
    return Math.max(0, Math.round((term * Math.max(0, days)) / wholeDays));
  }

  /** The package a workspace runs (its chosen industry, falling back to base). */
  async packageKeyForWorkspace(workspaceId: string): Promise<string> {
    const workspace = await this.prisma.businessWorkspace.findUnique({
      where: { id: workspaceId },
      select: { industryKey: true },
    });
    return workspace?.industryKey ?? 'generalBusiness';
  }

  /** Loads a workspace the user owns, or throws. */
  async requireOwnedWorkspace(userId: string, workspaceId: string) {
    const workspace = await this.prisma.businessWorkspace.findFirst({
      where: { id: workspaceId, ownerId: userId },
      select: { id: true, name: true, industryKey: true },
    });
    if (!workspace) {
      throw new NotFoundException('کسب‌وکار انتخاب‌شده پیدا نشد');
    }
    return workspace;
  }

  /**
   * Make a package active for a workspace: adopt its industry and enable every
   * module, with the priced ones expiring at `paidUntil`. Data is never
   * removed — an expired term only stops the module from being controllable.
   */
  async activate(
    workspaceId: string,
    packageKey: string,
    paidUntil: Date | null,
  ): Promise<void> {
    const data = await this.load(packageKey);
    if (!data) {
      throw new BadRequestException('بسته‌ی صنف انتخاب‌شده معتبر نیست');
    }
    const paidKeys = new Set(data.paid.map((row) => row.moduleKey));
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.businessWorkspace.update({
        where: { id: workspaceId },
        data: { industryKey: packageKey },
      });
      for (const key of data.keys) {
        const timeLimited = Boolean(
          getBusinessModule(key)?.billable && paidKeys.has(key),
        );
        const expiry = timeLimited ? { paidUntil } : {};
        await tx.businessModuleActivation.upsert({
          where: { workspaceId_moduleKey: { workspaceId, moduleKey: key } },
          update: { enabled: true, enabledAt: now, ...expiry },
          create: {
            workspaceId,
            moduleKey: key,
            enabled: true,
            enabledAt: now,
            ...expiry,
          },
        });
      }
    });
  }
}
