import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { NotificationType, WalletEntryKind } from '@prisma/client';
import { randomBytes } from 'node:crypto';

import { ActivityService } from '../activity/activity.service';
import { paypingReturnBaseUrl } from '../common/app-url';
import { addMonths } from '../common/plans';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentSimulatorService } from '../payping/payment-simulator.service';
import { PaypingService } from '../payping/payping.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { WalletService } from '../wallet/wallet.service';
import {
  BUSINESS_MODULES,
  BusinessModuleDefinition,
  defaultModulesForIndustry,
  getBusinessModule,
  getIndustryPackage,
  INDUSTRY_PACKAGES,
  IndustryPackageDefinition,
  withDependencies,
} from './business-modules.registry';
import { currentWorkspaceId } from './workspace-context';

export interface ResolvedBusinessModule extends BusinessModuleDefinition {
  enabled: boolean;
  available: boolean;
  /** Admin-set price (Toman). 0 = free to enable. */
  price: number;
  /** Term length the price buys, in months (0 = lifetime). */
  months: number;
  /** Whether the workspace owns an active paid term for this module. */
  purchased: boolean;
  paidUntil: string | null;
  /** Billable module that still needs a purchase before it can be enabled. */
  locked: boolean;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  industryKey: string;
  industryLabel: string;
  isDefault: boolean;
  enabledModules: number;
  createdAt: string;
}

export interface ResolvedWorkspace {
  id: string;
  name: string;
  industryKey: string;
  industry: IndustryPackageDefinition;
  isDefault: boolean;
  modules: ResolvedBusinessModule[];
  industries: IndustryPackageDefinition[];
  /** Plan capacity for business workspaces + how many are used. */
  capacity: { max: number; used: number };
}

export interface ModulePriceView {
  moduleKey: string;
  price: number;
  months: number;
  isActive: boolean;
  description: string | null;
}

export interface ManagementPackageView {
  key: string;
  label: string;
  description: string;
  modules: ResolvedBusinessModule[];
  /** Sum of every billable module's price in this package. */
  totalPrice: number;
  /** Sum of the modules that still need to be bought for this workspace. */
  remainingPrice: number;
  /** Every module in the package is enabled for the workspace. */
  active: boolean;
  activeModules: number;
  moduleCount: number;
}

@Injectable()
export class BusinessModulesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly subscriptions: SubscriptionsService,
    private readonly wallet: WalletService,
    private readonly payping: PaypingService,
    private readonly simulator: PaymentSimulatorService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
  ) {}

  /**
   * One-time migration to the «only business card + biolink by default» rule.
   * Older workspaces had every industry-package module auto-enabled; this
   * turns the billable ones off unless they carry a paid term. A marker setting
   * keeps a later manual enable from being reset on every boot.
   */
  async onModuleInit(): Promise<void> {
    try {
      const marker = 'businessModulesDefaultsV1';
      const done = await this.prisma.setting.findUnique({
        where: { key: marker },
      });
      if (done) return;
      const billableKeys = BUSINESS_MODULES.filter(
        (definition) => definition.billable,
      ).map((definition) => definition.key);
      await this.prisma.businessModuleActivation.updateMany({
        where: {
          moduleKey: { in: billableKeys },
          paidUntil: null,
        },
        data: { enabled: false },
      });
      await this.prisma.setting.create({
        data: { key: marker, value: new Date().toISOString() },
      });
    } catch {
      // The table may not exist yet on a very first boot.
    }
  }

  // -------------------------------------------------------------------------
  //  Workspaces
  // -------------------------------------------------------------------------

  private async fallbackName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, firstName: true, lastName: true },
    });
    return (
      [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
      user?.fullName ||
      'کسب‌وکار من'
    );
  }

  private async createWorkspaceRow(
    userId: string,
    name: string | undefined,
    industryKey: string,
    isDefault: boolean,
  ) {
    const industry = getIndustryPackage(industryKey)
      ? industryKey
      : 'generalBusiness';
    const fallback = await this.fallbackName(userId);
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.businessWorkspace.create({
        data: {
          ownerId: userId,
          name: name?.trim() || fallback,
          industryKey: industry,
          isDefault,
        },
      });
      const keys = defaultModulesForIndustry(industry);
      if (keys.length) {
        await tx.businessModuleActivation.createMany({
          data: keys.map((moduleKey) => ({
            workspaceId: workspace.id,
            moduleKey,
            enabled: true,
            enabledAt: new Date(),
          })),
        });
      }
      return workspace;
    });
  }

  /**
   * Resolves the workspace the current request is acting on: the one selected
   * with `x-workspace-id` (validated to belong to the user), else the flagged
   * default, else the oldest one. Creates a first workspace lazily.
   */
  async ensureWorkspace(userId: string) {
    const requested = currentWorkspaceId();
    if (requested) {
      const selected = await this.prisma.businessWorkspace.findFirst({
        where: { id: requested, ownerId: userId },
        include: { modules: true },
      });
      if (selected) return selected;
      // A stale/deleted id (or one owned by someone else) is ignored and the
      // default workspace is used instead of breaking the whole panel.
    }

    const existing = await this.prisma.businessWorkspace.findFirst({
      where: { ownerId: userId },
      include: { modules: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    if (existing) return existing;

    try {
      const created = await this.createWorkspaceRow(
        userId,
        undefined,
        'generalBusiness',
        true,
      );
      return this.prisma.businessWorkspace.findUniqueOrThrow({
        where: { id: created.id },
        include: { modules: true },
      });
    } catch {
      return this.prisma.businessWorkspace.findFirstOrThrow({
        where: { ownerId: userId },
        include: { modules: true },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });
    }
  }

  async getWorkspaceId(userId: string): Promise<string> {
    return (await this.ensureWorkspace(userId)).id;
  }

  async listWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
    const rows = await this.prisma.businessWorkspace.findMany({
      where: { ownerId: userId },
      include: { modules: { where: { enabled: true }, select: { id: true } } },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      industryKey: row.industryKey,
      industryLabel:
        getIndustryPackage(row.industryKey)?.label ?? row.industryKey,
      isDefault: row.isDefault,
      enabledModules: row.modules.length,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async createWorkspace(
    userId: string,
    dto: { name?: string; industryKey?: string },
  ) {
    const limits = await this.subscriptions.limitsForUser(userId);
    const used = await this.prisma.businessWorkspace.count({
      where: { ownerId: userId },
    });
    if (used >= limits.maxBusinesses) {
      throw new ForbiddenException({
        message: `سقف اشتراک شما (${limits.maxBusinesses} کسب‌وکار) تکمیل شده است. برای افزودن کسب‌وکار بیشتر اشتراک خود را ارتقا دهید.`,
        code: 'WORKSPACE_LIMIT',
      });
    }
    const created = await this.createWorkspaceRow(
      userId,
      dto.name,
      dto.industryKey ?? 'generalBusiness',
      used === 0,
    );
    await this.activity.log({
      action: 'BUSINESS_WORKSPACE_CREATED',
      summary: `ایجاد کسب‌وکار «${created.name}»`,
      entityType: 'BUSINESS_WORKSPACE',
      entityId: created.id,
    });
    return this.listWorkspaces(userId);
  }

  async updateWorkspaceById(
    userId: string,
    workspaceId: string,
    dto: { name?: string; industryKey?: string; isDefault?: boolean },
  ) {
    const workspace = await this.prisma.businessWorkspace.findFirst({
      where: { id: workspaceId, ownerId: userId },
    });
    if (!workspace) throw new NotFoundException('کسب‌وکار پیدا نشد');
    if (dto.industryKey && !getIndustryPackage(dto.industryKey)) {
      throw new BadRequestException('صنف انتخاب‌شده معتبر نیست');
    }
    await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.businessWorkspace.updateMany({
          where: { ownerId: userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      await tx.businessWorkspace.update({
        where: { id: workspaceId },
        data: {
          ...(dto.name ? { name: dto.name.trim() } : {}),
          ...(dto.industryKey ? { industryKey: dto.industryKey } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        },
      });
    });
    if (dto.industryKey) {
      const keys = defaultModulesForIndustry(dto.industryKey);
      await this.prisma.$transaction(
        keys.map((moduleKey) =>
          this.prisma.businessModuleActivation.upsert({
            where: { workspaceId_moduleKey: { workspaceId, moduleKey } },
            update: { enabled: true, enabledAt: new Date() },
            create: {
              workspaceId,
              moduleKey,
              enabled: true,
              enabledAt: new Date(),
            },
          }),
        ),
      );
    }
    return this.resolve(userId);
  }

  async removeWorkspace(userId: string, workspaceId: string) {
    const workspace = await this.prisma.businessWorkspace.findFirst({
      where: { id: workspaceId, ownerId: userId },
    });
    if (!workspace) throw new NotFoundException('کسب‌وکار پیدا نشد');
    const count = await this.prisma.businessWorkspace.count({
      where: { ownerId: userId },
    });
    if (count <= 1) {
      throw new BadRequestException('حداقل یک کسب‌وکار باید باقی بماند');
    }
    await this.prisma.businessWorkspace.delete({ where: { id: workspaceId } });
    if (workspace.isDefault) {
      const next = await this.prisma.businessWorkspace.findFirst({
        where: { ownerId: userId },
        orderBy: { createdAt: 'asc' },
      });
      if (next) {
        await this.prisma.businessWorkspace.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }
    return this.listWorkspaces(userId);
  }

  // -------------------------------------------------------------------------
  //  Catalog / resolution
  // -------------------------------------------------------------------------

  async resolveCatalog() {
    const prices = await this.prisma.businessModulePrice.findMany();
    return {
      modules: BUSINESS_MODULES,
      industries: INDUSTRY_PACKAGES,
      prices: prices.map((row) => this.priceView(row)),
    };
  }

  private priceView(row: {
    moduleKey: string;
    price: number;
    months: number;
    isActive: boolean;
    description: string | null;
  }): ModulePriceView {
    return {
      moduleKey: row.moduleKey,
      price: row.price,
      months: row.months,
      isActive: row.isActive,
      description: row.description,
    };
  }

  async resolve(userId: string): Promise<ResolvedWorkspace> {
    const workspace = await this.ensureWorkspace(userId);
    const industry =
      getIndustryPackage(workspace.industryKey) ??
      getIndustryPackage('generalBusiness')!;
    const activationByKey = new Map(
      workspace.modules.map((row) => [row.moduleKey, row]),
    );
    const availableKeys = new Set(industry.modules);
    const defaultKeys = new Set(defaultModulesForIndustry(industry.key));
    const prices = await this.prisma.businessModulePrice.findMany();
    const priceByKey = new Map(prices.map((row) => [row.moduleKey, row]));
    const now = Date.now();

    const visibleKeys = new Set([
      ...industry.modules,
      ...activationByKey.keys(),
    ]);
    const modules: ResolvedBusinessModule[] = BUSINESS_MODULES.filter(
      (definition) => visibleKeys.has(definition.key),
    ).map((definition) => {
      const activation = activationByKey.get(definition.key);
      const paidUntil = activation?.paidUntil ?? null;
      const paidActive = !!paidUntil && paidUntil.getTime() > now;
      const enabled = activation
        ? activation.enabled && (!activation.paidUntil || paidActive)
        : definition.defaultEnabled && defaultKeys.has(definition.key);
      const priceRow = priceByKey.get(definition.key);
      const price = priceRow?.isActive ? priceRow.price : 0;
      const purchased = paidActive;
      const locked =
        definition.billable && !purchased && price > 0 && !enabled;
      return {
        ...definition,
        enabled,
        available: availableKeys.has(definition.key),
        price,
        months: priceRow?.months ?? 12,
        purchased,
        paidUntil: paidUntil ? paidUntil.toISOString() : null,
        locked,
      };
    });

    const [limits, used] = await Promise.all([
      this.subscriptions.limitsForUser(userId),
      this.prisma.businessWorkspace.count({ where: { ownerId: userId } }),
    ]);

    return {
      id: workspace.id,
      name: workspace.name,
      industryKey: industry.key,
      industry,
      isDefault: workspace.isDefault,
      modules,
      industries: INDUSTRY_PACKAGES,
      capacity: { max: limits.maxBusinesses, used },
    };
  }

  async updateWorkspace(
    userId: string,
    dto: { name?: string },
  ): Promise<ResolvedWorkspace> {
    const workspace = await this.ensureWorkspace(userId);
    if (dto.name) {
      await this.prisma.businessWorkspace.update({
        where: { id: workspace.id },
        data: { name: dto.name.trim() },
      });
    }
    return this.resolve(userId);
  }

  async setIndustry(userId: string, industryKey: string): Promise<ResolvedWorkspace> {
    const industry = getIndustryPackage(industryKey);
    if (!industry) {
      throw new BadRequestException('صنف انتخاب‌شده معتبر نیست');
    }
    const workspace = await this.ensureWorkspace(userId);
    const keys = defaultModulesForIndustry(industry.key);

    await this.prisma.$transaction([
      this.prisma.businessWorkspace.update({
        where: { id: workspace.id },
        data: { industryKey: industry.key },
      }),
      ...keys.map((moduleKey) =>
        this.prisma.businessModuleActivation.upsert({
          where: {
            workspaceId_moduleKey: { workspaceId: workspace.id, moduleKey },
          },
          update: { enabled: true, enabledAt: new Date() },
          create: {
            workspaceId: workspace.id,
            moduleKey,
            enabled: true,
            enabledAt: new Date(),
          },
        }),
      ),
    ]);
    return this.resolve(userId);
  }

  async setModuleEnabled(
    userId: string,
    moduleKey: string,
    enabled: boolean,
  ): Promise<ResolvedWorkspace> {
    const definition = getBusinessModule(moduleKey);
    if (!definition) {
      throw new BadRequestException('ماژول انتخاب‌شده معتبر نیست');
    }
    const workspace = await this.ensureWorkspace(userId);
    const current = await this.resolve(userId);
    const resolved = current.modules.find((item) => item.key === moduleKey);

    if (enabled) {
      if (definition.billable && resolved?.price && !resolved.purchased) {
        throw new ForbiddenException({
          message: `ماژول «${definition.label}» نیاز به خرید دارد. آن را از «مدیریت کسب‌وکار» تهیه کنید.`,
          code: 'MODULE_PURCHASE_REQUIRED',
        });
      }
      const keys = withDependencies([moduleKey]);
      await this.prisma.$transaction(
        keys.map((key) =>
          this.prisma.businessModuleActivation.upsert({
            where: {
              workspaceId_moduleKey: { workspaceId: workspace.id, moduleKey: key },
            },
            update: { enabled: true, enabledAt: new Date() },
            create: {
              workspaceId: workspace.id,
              moduleKey: key,
              enabled: true,
              enabledAt: new Date(),
            },
          }),
        ),
      );
    } else {
      const dependents = current.modules.filter(
        (item) => item.enabled && (item.dependsOn ?? []).includes(moduleKey),
      );
      if (dependents.length) {
        throw new ConflictException({
          message: `ابتدا ماژول‌های وابسته را غیرفعال کنید: ${dependents
            .map((item) => item.label)
            .join('، ')}`,
          code: 'MODULE_HAS_DEPENDENTS',
        });
      }
      await this.prisma.businessModuleActivation.upsert({
        where: {
          workspaceId_moduleKey: { workspaceId: workspace.id, moduleKey },
        },
        update: { enabled: false },
        create: {
          workspaceId: workspace.id,
          moduleKey,
          enabled: false,
        },
      });
    }
    return this.resolve(userId);
  }

  /**
   * Server-side gate used by `@RequireModule(...)`. It checks the global admin
   * feature flag first (so a module can be stopped for everyone) and then the
   * per-workspace activation.
   */
  async assertModuleEnabled(userId: string, moduleKey: string): Promise<void> {
    const definition = getBusinessModule(moduleKey);
    if (!definition) {
      throw new BadRequestException('ماژول انتخاب‌شده معتبر نیست');
    }
    if (definition.featureFlag) {
      await this.settings.assertFeatureEnabled(definition.featureFlag);
    }
    if (!definition.enforced) return;

    const workspace = await this.resolve(userId);
    const module = workspace.modules.find((item) => item.key === moduleKey);
    if (!module?.enabled) {
      throw new ForbiddenException({
        message: `ماژول «${definition.label}» برای این کسب‌وکار فعال نیست. آن را از «مدیریت کسب‌وکار» فعال کنید.`,
        code: 'MODULE_DISABLED',
      });
    }
  }

  // -------------------------------------------------------------------------
  //  Purchase (wallet or PayPing)
  // -------------------------------------------------------------------------

  async listPurchases(userId: string) {
    const workspace = await this.ensureWorkspace(userId);
    return this.prisma.businessModulePurchase.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * The «مدیریت کسب‌وکار» catalog: every industry package with its modules,
   * which ones are active for this workspace, and the total price of the
   * package (sum of module prices) plus what is still payable.
   */
  async listManagements(userId: string): Promise<ManagementPackageView[]> {
    const workspace = await this.ensureWorkspace(userId);
    const prices = await this.prisma.businessModulePrice.findMany();
    const priceByKey = new Map(prices.map((row) => [row.moduleKey, row]));
    const activationByKey = new Map(
      workspace.modules.map((row) => [row.moduleKey, row]),
    );
    const now = Date.now();

    return INDUSTRY_PACKAGES.filter((industry) => industry.available).map((industry) => {
      const modules: ResolvedBusinessModule[] = BUSINESS_MODULES.filter(
        (definition) => industry.modules.includes(definition.key),
      ).map((definition) => {
        const activation = activationByKey.get(definition.key);
        const paidUntil = activation?.paidUntil ?? null;
        const paidActive = !!paidUntil && paidUntil.getTime() > now;
        const enabled = activation
          ? activation.enabled && (!activation.paidUntil || paidActive)
          : definition.defaultEnabled;
        const priceRow = priceByKey.get(definition.key);
        const price = priceRow?.isActive ? priceRow.price : 0;
        return {
          ...definition,
          enabled,
          available: true,
          price,
          months: priceRow?.months ?? 12,
          purchased: paidActive,
          paidUntil: paidUntil ? paidUntil.toISOString() : null,
          locked:
            definition.billable && !paidActive && price > 0 && !enabled,
        };
      });
      const billable = modules.filter((module) => module.billable);
      return {
        key: industry.key,
        label: industry.label,
        description: industry.description,
        modules,
        totalPrice: billable.reduce((sum, module) => sum + module.price, 0),
        remainingPrice: billable
          .filter((module) => !module.purchased)
          .reduce((sum, module) => sum + module.price, 0),
        active: modules.every((module) => module.enabled),
        activeModules: modules.filter((module) => module.enabled).length,
        moduleCount: modules.length,
      };
    });
  }

  /** Buy a whole «مدیریت کسب‌وکار» package (all its modules at once). */
  async purchaseManagement(
    userId: string,
    packageKey: string,
    requestedMonths?: number,
    returnTo?: string,
  ) {
    const industry = getIndustryPackage(packageKey);
    if (!industry) {
      throw new BadRequestException('مدیریت کسب‌وکار انتخاب‌شده معتبر نیست');
    }
    const workspace = await this.ensureWorkspace(userId);
    const views = await this.listManagements(userId);
    const view = views.find((item) => item.key === packageKey);
    const chargeable =
      view?.modules.filter(
        (module) => module.billable && !module.purchased && module.price > 0,
      ) ?? [];
    // The admin sets one price per management (the term is the price row's
    // `months`). The payable amount is therefore the sum of the module prices
    // shown in the panel — not price × months.
    const defaultTerm = chargeable.reduce(
      (max, module) => Math.max(max, module.months || 0),
      0,
    );
    const months =
      Number.isFinite(requestedMonths) && requestedMonths! > 0
        ? Math.min(Math.round(requestedMonths!), 24)
        : defaultTerm || 12;
    const amount = chargeable.reduce((sum, module) => sum + module.price, 0);
    if (amount <= 0) {
      await this.activatePackage(workspace.id, packageKey, months);
      return { free: true, activated: true };
    }

    const onlineOnly = await this.settings.getPaymentsOnlineOnly();
    if (!onlineOnly && (await this.settings.isFeatureEnabled('featureWallet'))) {
      const purchase = await this.prisma.businessModulePurchase.create({
        data: {
          workspaceId: workspace.id,
          moduleKey: `package:${packageKey}`,
          userId,
          amount,
          months,
          status: 'PAID',
          clientRefId: randomBytes(16).toString('hex'),
          paidAt: new Date(),
          expiresAt: months > 0 ? addMonths(new Date(), months) : null,
        },
      });
      const charged = await this.wallet.charge({
        userId,
        kind: WalletEntryKind.BUSINESS_MODULE,
        amount,
        title: `خرید مدیریت کسب‌وکار «${industry.label}»`,
        sourceType: 'BUSINESS_MODULE',
        sourceId: purchase.id,
        idempotencyKey: `business-package:${purchase.id}`,
      });
      await this.activatePackage(workspace.id, packageKey, months);
      await this.notifications.notify({
        userId,
        type: NotificationType.SUCCESS,
        title: 'مدیریت کسب‌وکار فعال شد',
        body:
          charged > 0
            ? `مدیریت «${industry.label}» فعال شد و مبلغ ${charged.toLocaleString('fa-IR')} تومان به بدهی کیف پول شما اضافه شد.`
            : `مدیریت «${industry.label}» فعال شد.`,
        link: '/dashboard/business',
      });
      return { wallet: true, activated: true, amount: charged, purchase };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, phone: true, email: true },
    });
    const clientRefId = randomBytes(16).toString('hex');
    const purchase = await this.prisma.businessModulePurchase.create({
      data: {
        workspaceId: workspace.id,
        moduleKey: `package:${packageKey}`,
        userId,
        amount,
        months,
        clientRefId,
      },
    });
    const returnUrl = `${paypingReturnBaseUrl()}/api/business-modules/payments/callback`;
    let result: { paymentCode?: string; url?: string } | null = null;
    try {
      result = this.simulator.isEnabled
        ? this.simulator.createPayment({
            amount,
            returnUrl,
            clientRefId,
            description: `مدیریت ${industry.label} — شمالی‌کارت`,
          })
        : ((await this.payping.createPayment({
            amount,
            returnUrl,
            payerIdentity: user?.phone ?? user?.email ?? undefined,
            payerName: user?.fullName ?? undefined,
            description: `مدیریت ${industry.label} — شمالی‌کارت`,
            clientRefId,
            isReversible: false,
          })) as { paymentCode?: string; url?: string } | null);
    } catch (error) {
      await this.prisma.businessModulePurchase.update({
        where: { id: purchase.id },
        data: { status: 'FAILED' },
      });
      throw error;
    }
    if (!result?.paymentCode || !result?.url) {
      await this.prisma.businessModulePurchase.update({
        where: { id: purchase.id },
        data: { status: 'FAILED' },
      });
      throw new BadGatewayException('ساخت پرداخت در پی‌پینگ ناموفق بود');
    }
    await this.prisma.businessModulePurchase.update({
      where: { id: purchase.id },
      data: { paymentCode: result.paymentCode, gatewayUrl: result.url },
    });
    return {
      paymentId: purchase.id,
      amount,
      months,
      paymentCode: result.paymentCode,
      url: result.url,
      returnTo: returnTo && /^\/(?!\/)/.test(returnTo) ? returnTo : null,
    };
  }

  /** Enable every module of a package and make it the workspace's industry. */
  private async activatePackage(
    workspaceId: string,
    packageKey: string,
    months: number,
  ) {
    const industry = getIndustryPackage(packageKey);
    if (!industry) return;
    const keys = withDependencies(industry.modules);
    const paidUntil = months > 0 ? addMonths(new Date(), months) : null;
    await this.prisma.$transaction(async (tx) => {
      await tx.businessWorkspace.update({
        where: { id: workspaceId },
        data: { industryKey: packageKey },
      });
      for (const key of keys) {
        const definition = getBusinessModule(key);
        await tx.businessModuleActivation.upsert({
          where: { workspaceId_moduleKey: { workspaceId, moduleKey: key } },
          update: {
            enabled: true,
            enabledAt: new Date(),
            ...(definition?.billable ? { paidUntil } : {}),
          },
          create: {
            workspaceId,
            moduleKey: key,
            enabled: true,
            enabledAt: new Date(),
            ...(definition?.billable ? { paidUntil } : {}),
          },
        });
      }
    });
  }

  private async requirePrice(moduleKey: string) {
    const definition = getBusinessModule(moduleKey);
    if (!definition) throw new BadRequestException('ماژول انتخاب‌شده معتبر نیست');
    if (!definition.billable) {
      throw new BadRequestException('این ماژول رایگان و پیش‌فرض است');
    }
    const price = await this.prisma.businessModulePrice.findUnique({
      where: { moduleKey },
    });
    if (!price || !price.isActive) {
      throw new BadRequestException(
        'قیمت این ماژول هنوز توسط مدیر تعیین نشده است',
      );
    }
    return { definition, price };
  }

  async purchase(
    userId: string,
    moduleKey: string,
    requestedMonths?: number,
    returnTo?: string,
  ) {
    const { definition, price } = await this.requirePrice(moduleKey);
    const workspace = await this.ensureWorkspace(userId);
    const months =
      Number.isFinite(requestedMonths) && requestedMonths! > 0
        ? Math.min(Math.round(requestedMonths!), 24)
        : price.months;
    const amount = price.price * (months || 1);
    if (amount <= 0) {
      await this.activateModule(workspace.id, moduleKey, months);
      return { free: true, activated: true };
    }

    const existing = await this.prisma.businessModuleActivation.findUnique({
      where: {
        workspaceId_moduleKey: { workspaceId: workspace.id, moduleKey },
      },
    });
    if (existing?.paidUntil && existing.paidUntil.getTime() > Date.now()) {
      throw new ConflictException('این ماژول برای کسب‌وکار شما فعال است');
    }

    const onlineOnly = await this.settings.getPaymentsOnlineOnly();
    if (!onlineOnly && (await this.settings.isFeatureEnabled('featureWallet'))) {
      const purchase = await this.prisma.businessModulePurchase.create({
        data: {
          workspaceId: workspace.id,
          moduleKey,
          userId,
          amount,
          months,
          status: 'PAID',
          clientRefId: randomBytes(16).toString('hex'),
          paidAt: new Date(),
          expiresAt: months > 0 ? addMonths(new Date(), months) : null,
        },
      });
      const charged = await this.wallet.charge({
        userId,
        kind: WalletEntryKind.BUSINESS_MODULE,
        amount,
        title: `خرید ماژول «${definition.label}»`,
        sourceType: 'BUSINESS_MODULE',
        sourceId: purchase.id,
        idempotencyKey: `business-module:${purchase.id}`,
      });
      await this.activateModule(workspace.id, moduleKey, months);
      await this.notifications.notify({
        userId,
        type: NotificationType.SUCCESS,
        title: 'ماژول کسب‌وکار فعال شد',
        body:
          charged > 0
            ? `ماژول «${definition.label}» فعال شد و مبلغ ${charged.toLocaleString('fa-IR')} تومان به بدهی کیف پول شما اضافه شد.`
            : `ماژول «${definition.label}» فعال شد.`,
        link: '/dashboard/business',
      });
      return { wallet: true, activated: true, amount: charged, purchase };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, phone: true, email: true },
    });
    const clientRefId = randomBytes(16).toString('hex');
    const purchase = await this.prisma.businessModulePurchase.create({
      data: {
        workspaceId: workspace.id,
        moduleKey,
        userId,
        amount,
        months,
        clientRefId,
      },
    });
    const returnUrl = `${paypingReturnBaseUrl()}/api/business-modules/payments/callback`;
    let result: { paymentCode?: string; url?: string } | null = null;
    try {
      result = this.simulator.isEnabled
        ? this.simulator.createPayment({
            amount,
            returnUrl,
            clientRefId,
            description: `ماژول ${definition.label} — شمالی‌کارت`,
          })
        : ((await this.payping.createPayment({
            amount,
            returnUrl,
            payerIdentity: user?.phone ?? user?.email ?? undefined,
            payerName: user?.fullName ?? undefined,
            description: `ماژول ${definition.label} — شمالی‌کارت`,
            clientRefId,
            isReversible: false,
          })) as { paymentCode?: string; url?: string } | null);
    } catch (error) {
      await this.prisma.businessModulePurchase.update({
        where: { id: purchase.id },
        data: { status: 'FAILED' },
      });
      throw error;
    }
    if (!result?.paymentCode || !result?.url) {
      await this.prisma.businessModulePurchase.update({
        where: { id: purchase.id },
        data: { status: 'FAILED' },
      });
      throw new BadGatewayException('ساخت پرداخت در پی‌پینگ ناموفق بود');
    }
    await this.prisma.businessModulePurchase.update({
      where: { id: purchase.id },
      data: { paymentCode: result.paymentCode, gatewayUrl: result.url },
    });
    return {
      paymentId: purchase.id,
      amount,
      months,
      paymentCode: result.paymentCode,
      url: result.url,
      returnTo: returnTo && /^\/(?!\/)/.test(returnTo) ? returnTo : null,
    };
  }

  private async activateModule(
    workspaceId: string,
    moduleKey: string,
    months: number,
  ) {
    const keys = withDependencies([moduleKey]);
    const paidUntil = months > 0 ? addMonths(new Date(), months) : null;
    await this.prisma.$transaction(
      keys.map((key) =>
        this.prisma.businessModuleActivation.upsert({
          where: { workspaceId_moduleKey: { workspaceId, moduleKey: key } },
          update: {
            enabled: true,
            enabledAt: new Date(),
            ...(key === moduleKey ? { paidUntil } : {}),
          },
          create: {
            workspaceId,
            moduleKey: key,
            enabled: true,
            enabledAt: new Date(),
            ...(key === moduleKey ? { paidUntil } : {}),
          },
        }),
      ),
    );
  }

  async handlePurchaseCallback(params: {
    paymentCode?: string;
    refId?: string;
    clientRefId?: string;
    status?: number;
  }) {
    const paymentCode = params.paymentCode?.trim() || undefined;
    const clientRefId = params.clientRefId?.trim() || undefined;
    const purchase = paymentCode
      ? await this.prisma.businessModulePurchase.findUnique({
          where: { paymentCode },
        })
      : clientRefId
        ? await this.prisma.businessModulePurchase.findUnique({
            where: { clientRefId },
          })
        : null;
    const base = `${paypingReturnBaseUrl()}/dashboard/business`;
    if (!purchase) {
      return { redirectUrl: `${base}?purchase=failed` };
    }
    if (purchase.status === 'PAID') {
      return { redirectUrl: `${base}?purchase=success` };
    }
    if (params.status === 0) {
      await this.prisma.businessModulePurchase.update({
        where: { id: purchase.id },
        data: { status: 'CANCELED' },
      });
      return { redirectUrl: `${base}?purchase=failed` };
    }
    if (!params.refId || !purchase.paymentCode) {
      return { redirectUrl: `${base}?purchase=failed` };
    }
    try {
      if (this.simulator.handles(purchase.paymentCode)) {
        this.simulator.verifyPayment({
          paymentCode: purchase.paymentCode,
          amount: purchase.amount,
          clientRefId: purchase.clientRefId,
        });
      } else {
        await this.payping.verifyPayment({
          paymentCode: purchase.paymentCode,
          refId: params.refId,
        });
      }
    } catch {
      await this.prisma.businessModulePurchase.update({
        where: { id: purchase.id },
        data: { status: 'FAILED' },
      });
      return { redirectUrl: `${base}?purchase=failed` };
    }
    await this.prisma.businessModulePurchase.update({
      where: { id: purchase.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        expiresAt:
          purchase.months > 0 ? addMonths(new Date(), purchase.months) : null,
      },
    });
    const isPackage = purchase.moduleKey.startsWith('package:');
    if (isPackage) {
      await this.activatePackage(
        purchase.workspaceId,
        purchase.moduleKey.slice('package:'.length),
        purchase.months,
      );
    } else {
      await this.activateModule(
        purchase.workspaceId,
        purchase.moduleKey,
        purchase.months,
      );
    }
    await this.notifications.notify({
      userId: purchase.userId,
      type: NotificationType.SUCCESS,
      title: isPackage ? 'مدیریت کسب‌وکار فعال شد' : 'ماژول کسب‌وکار فعال شد',
      body: isPackage
        ? 'پرداخت شما تأیید شد و تمام ماژول‌های این مدیریت کسب‌وکار فعال شد.'
        : 'پرداخت شما تأیید شد و ماژول موردنظر فعال شد.',
      link: '/dashboard/business',
    });
    return { redirectUrl: `${base}?purchase=success` };
  }

  // -------------------------------------------------------------------------
  //  Admin
  // -------------------------------------------------------------------------

  async adminCatalog() {
    const [prices, activations, workspaces] = await Promise.all([
      this.prisma.businessModulePrice.findMany(),
      this.prisma.businessModuleActivation.groupBy({
        by: ['moduleKey'],
        where: { enabled: true },
        _count: { _all: true },
      }),
      this.prisma.businessWorkspace.count(),
    ]);
    const priceByKey = new Map(prices.map((row) => [row.moduleKey, row]));
    const countByKey = new Map(
      activations.map((row) => [row.moduleKey, row._count._all]),
    );
    return {
      modules: BUSINESS_MODULES.map((definition) => ({
        ...definition,
        price: priceByKey.get(definition.key)?.price ?? 0,
        months: priceByKey.get(definition.key)?.months ?? 12,
        priceActive: priceByKey.get(definition.key)?.isActive ?? false,
        priceDescription: priceByKey.get(definition.key)?.description ?? null,
        enabledWorkspaces: countByKey.get(definition.key) ?? 0,
      })),
      industries: INDUSTRY_PACKAGES,
      totals: { workspaces },
    };
  }

  async adminListWorkspaces(query: { q?: string; take?: number }) {
    const take = Math.min(Math.max(query.take ?? 50, 1), 200);
    const rows = await this.prisma.businessWorkspace.findMany({
      where: query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              {
                owner: {
                  OR: [
                    { fullName: { contains: query.q, mode: 'insensitive' } },
                    { email: { contains: query.q, mode: 'insensitive' } },
                    { phone: { contains: query.q, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          }
        : undefined,
      include: {
        owner: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        modules: true,
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      industryKey: row.industryKey,
      isDefault: row.isDefault,
      createdAt: row.createdAt.toISOString(),
      owner: row.owner,
      modules: row.modules.map((module) => ({
        moduleKey: module.moduleKey,
        enabled: module.enabled,
        paidUntil: module.paidUntil?.toISOString() ?? null,
      })),
    }));
  }

  async adminSetModule(workspaceId: string, moduleKey: string, enabled: boolean) {
    const definition = getBusinessModule(moduleKey);
    if (!definition) throw new BadRequestException('ماژول انتخاب‌شده معتبر نیست');
    const workspace = await this.prisma.businessWorkspace.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });
    if (!workspace) throw new NotFoundException('کسب‌وکار پیدا نشد');
    const keys = enabled ? withDependencies([moduleKey]) : [moduleKey];
    await this.prisma.$transaction(
      keys.map((key) =>
        this.prisma.businessModuleActivation.upsert({
          where: { workspaceId_moduleKey: { workspaceId, moduleKey: key } },
          update: {
            enabled,
            ...(enabled ? { enabledAt: new Date() } : {}),
          },
          create: {
            workspaceId,
            moduleKey: key,
            enabled,
            enabledAt: enabled ? new Date() : null,
          },
        }),
      ),
    );
    await this.activity.log({
      action: 'BUSINESS_MODULE_ADMIN_SET',
      summary: `${enabled ? 'فعال‌سازی' : 'غیرفعال‌سازی'} ماژول «${definition.label}» توسط مدیر`,
      entityType: 'BUSINESS_WORKSPACE',
      entityId: workspaceId,
    });
    return { workspaceId, moduleKey, enabled };
  }

  async adminSetPrice(
    moduleKey: string,
    dto: {
      price?: number;
      months?: number;
      isActive?: boolean;
      description?: string | null;
    },
  ) {
    const definition = getBusinessModule(moduleKey);
    if (!definition) throw new BadRequestException('ماژول انتخاب‌شده معتبر نیست');
    const row = await this.prisma.businessModulePrice.upsert({
      where: { moduleKey },
      update: {
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.months !== undefined ? { months: dto.months } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
      },
      create: {
        moduleKey,
        price: dto.price ?? 0,
        months: dto.months ?? 12,
        isActive: dto.isActive ?? true,
        description: dto.description ?? null,
      },
    });
    return this.priceView(row);
  }

  async adminListPrices() {
    const rows = await this.prisma.businessModulePrice.findMany();
    return rows.map((row) => this.priceView(row));
  }
}
