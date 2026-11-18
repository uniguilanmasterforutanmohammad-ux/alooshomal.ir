import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { NotificationType, Prisma, WalletEntryKind } from '@prisma/client';
import { randomBytes } from 'node:crypto';

import { ActivityService } from '../activity/activity.service';
import { paypingReturnBaseUrl } from '../common/app-url';
import { addMonths, isFreePlan } from '../common/plans';
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
  getBusinessModule,
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
  /**
   * True once a «مدیریت کسب‌وکار» has actually been bought for this workspace:
   * the industry package is then fixed (renaming stays allowed) and the other
   * packages are no longer offered — a different trade needs a new workspace.
   */
  industryLocked: boolean;
  /** End of the paid management term (ISO date) or `null` when nothing is paid. */
  subscriptionPaidUntil: string | null;
}

export interface ManagementDefinition extends IndustryPackageDefinition {
  isBase: boolean;
  sortOrder: number;
  /** Discount percent for the 3/6/12-month term vs the 1-month total. */
  discounts: { 3: number; 6: number; 12: number };
}

export interface ManagementTerm {
  months: 1 | 3 | 6 | 12;
  /** Price for the whole term (Toman). */
  price: number;
  /** Discount percent applied to this term. */
  discount: number;
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
  /** One-month price: the sum of every billable module's monthly price. */
  totalPrice: number;
  /** One-month price of the modules that still need to be bought. */
  remainingPrice: number;
  /** Purchasable terms (1/3/6/12 months) with their discounts. */
  terms: ManagementTerm[];
  /** Every module in the package is enabled for the workspace. */
  active: boolean;
  activeModules: number;
  moduleCount: number;
  /** End of this package's paid term (ISO date) or `null` when not paid. */
  paidUntil: string | null;
  /** One-time renewal offer for an already-bought package. */
  extension: ManagementExtensionView;
}

/**
 * The «تمدید» offer that follows a purchased management. A workspace may buy
 * the same package exactly once again with a *longer* term; the unused days of
 * the current term are carried over so nothing the user paid for is lost.
 */
export interface ManagementExtensionView {
  /** A longer term can still be bought for this package. */
  allowed: boolean;
  /** The one-time renewal has already been used. */
  alreadyExtended: boolean;
  /** Months of the current paid term. */
  currentMonths: number;
  /** Days left in the current term that get carried over (0 when expired). */
  remainingDays: number;
  /** Longer terms that may be bought to extend the current one. */
  terms: ManagementTerm[];
  /** End of the current paid term (ISO) or `null`. */
  paidUntil: string | null;
}

export interface AdminManagementModuleView {
  key: string;
  label: string;
  group: string;
  billable: boolean;
  defaultEnabled: boolean;
  price: number;
  months: number;
  priceActive: boolean;
}

export interface AdminManagementView {
  key: string;
  label: string;
  description: string;
  available: boolean;
  modules: AdminManagementModuleView[];
  totalPrice: number;
  discounts: { 3: number; 6: number; 12: number };
  terms: ManagementTerm[];
  productCode: string | null;
  productCodes: Record<string, string | null>;
  lastSyncedAt: string | null;
  simulated: boolean;
}

const MANAGEMENT_PAYPING_SETTING_PREFIX = 'businessManagementPayping:';

@Injectable()
export class BusinessModulesService implements OnModuleInit {
  private managementCache: ManagementDefinition[] = [];

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
      await this.seedManagements();
      await this.syncRegistryManagements();
      await this.alignRegistryManagements();
      await this.backfillPublicSlugs();
      await this.backfillCardWorkspaceScopes();
      await this.reloadManagements();
    } catch {
      // The management tables may not exist yet on a very first boot.
    }
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

  /**
   * Seed the editable management table from the code registry exactly once.
   * After this, the database is the source of truth so the admin can rename,
   * delete, or change the modules of a management without a redeploy.
   */
  private async seedManagements(): Promise<void> {
    const marker = 'businessManagementsSeededV1';
    const done = await this.prisma.setting.findUnique({ where: { key: marker } });
    if (done) return;
    for (const [index, industry] of INDUSTRY_PACKAGES.entries()) {
      await this.prisma.businessManagement.upsert({
        where: { key: industry.key },
        update: {},
        create: {
          key: industry.key,
          label: industry.label,
          description: industry.description,
          available: Boolean(industry.available),
          isBase: industry.key === 'generalBusiness',
          sortOrder: index,
          modules: {
            create: industry.modules.map((moduleKey) => ({ moduleKey })),
          },
        },
      });
    }
    await this.prisma.setting.create({
      data: { key: marker, value: new Date().toISOString() },
    });
  }

  /**
   * One-time sync of the code registry into the editable management table.
   * `seedManagements` only runs on a brand-new database; this pass adds the
   * modules and availability of newly shipped packages (e.g. the retail
   * management) to an existing installation without touching admin edits to
   * other managements.
   */
  private async syncRegistryManagements(): Promise<void> {
    const marker = 'businessManagementsSeedV2';
    const done = await this.prisma.setting.findUnique({ where: { key: marker } });
    if (done) return;
    for (const industry of INDUSTRY_PACKAGES) {
      const row = await this.prisma.businessManagement.findUnique({
        where: { key: industry.key },
      });
      if (!row) continue;
      if (industry.available && !row.available) {
        await this.prisma.businessManagement.update({
          where: { id: row.id },
          data: { available: true },
        });
      }
      const existing = await this.prisma.businessManagementModule.findMany({
        where: { managementId: row.id },
        select: { moduleKey: true },
      });
      const known = new Set(existing.map((item) => item.moduleKey));
      const missing = industry.modules.filter((key) => !known.has(key));
      if (missing.length) {
        await this.prisma.businessManagementModule.createMany({
          data: missing.map((moduleKey) => ({
            managementId: row.id,
            moduleKey,
          })),
          skipDuplicates: true,
        });
      }
    }
    await this.prisma.setting.create({
      data: { key: marker, value: new Date().toISOString() },
    });
  }

  /** Give every pre-existing workspace a public storefront slug. */
  private async backfillPublicSlugs(): Promise<void> {
    const marker = 'businessWorkspaceSlugsV1';
    const done = await this.prisma.setting.findUnique({ where: { key: marker } });
    if (done) return;
    const rows = await this.prisma.businessWorkspace.findMany({
      where: { publicSlug: null },
      select: { id: true, name: true },
    });
    for (const row of rows) {
      await this.prisma.businessWorkspace.update({
        where: { id: row.id },
        data: { publicSlug: await this.uniquePublicSlug(row.name) },
      });
    }
    await this.prisma.setting.create({
      data: { key: marker, value: new Date().toISOString() },
    });
  }

  /**
   * One-time backfill for the workspace scoping added to business cards and
   * biolinks: rows created before the column existed are attached to their
   * owner's default workspace, so the panel keeps showing them.
   */
  private async backfillCardWorkspaceScopes(): Promise<void> {
    const marker = 'cardWorkspaceScopeV1';
    const done = await this.prisma.setting.findUnique({ where: { key: marker } });
    if (done) return;
    const select = { id: true, userId: true } as const;
    const [cards, biolinks] = await Promise.all([
      this.prisma.businessCard.findMany({ where: { workspaceId: null }, select }),
      this.prisma.biolink.findMany({ where: { workspaceId: null }, select }),
    ]);
    const workspaceByOwner = new Map<string, string>();
    for (const ownerId of new Set(
      [...cards, ...biolinks].map((row) => row.userId),
    )) {
      try {
        workspaceByOwner.set(ownerId, (await this.ensureWorkspace(ownerId)).id);
      } catch {
        // A user whose workspace cannot be resolved keeps a null scope.
      }
    }
    const groupByOwner = (rows: typeof cards) => {
      const grouped = new Map<string, string[]>();
      for (const row of rows) {
        const list = grouped.get(row.userId) ?? [];
        list.push(row.id);
        grouped.set(row.userId, list);
      }
      return grouped;
    };
    for (const [ownerId, ids] of groupByOwner(cards)) {
      const workspaceId = workspaceByOwner.get(ownerId);
      if (!workspaceId) continue;
      await this.prisma.businessCard.updateMany({
        where: { id: { in: ids } },
        data: { workspaceId },
      });
    }
    for (const [ownerId, ids] of groupByOwner(biolinks)) {
      const workspaceId = workspaceByOwner.get(ownerId);
      if (!workspaceId) continue;
      await this.prisma.biolink.updateMany({
        where: { id: { in: ids } },
        data: { workspaceId },
      });
    }
    await this.prisma.setting.create({
      data: { key: marker, value: new Date().toISOString() },
    });
  }

  /**
   * One-time alignment of the shipped packages with the code registry: remove
   * module memberships that the registry no longer lists (e.g. the social feed
   * that older retail seeds carried). Admin-created managements are untouched.
   */
  private async alignRegistryManagements(): Promise<void> {
    const marker = 'businessManagementsSeedV3';
    const done = await this.prisma.setting.findUnique({ where: { key: marker } });
    if (done) return;
    for (const industry of INDUSTRY_PACKAGES) {
      const row = await this.prisma.businessManagement.findUnique({
        where: { key: industry.key },
        select: { id: true },
      });
      if (!row) continue;
      await this.prisma.businessManagementModule.deleteMany({
        where: {
          managementId: row.id,
          moduleKey: { notIn: industry.modules },
        },
      });
    }
    await this.prisma.setting.create({
      data: { key: marker, value: new Date().toISOString() },
    });
  }

  /** URL-safe, unique storefront slug derived from the workspace name. */
  private async uniquePublicSlug(name: string): Promise<string> {
    const base =
      name
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'shop';
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = `${base}-${randomBytes(3).toString('hex')}`;
      const exists = await this.prisma.businessWorkspace.findUnique({
        where: { publicSlug: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  /** Reload the in-memory management cache from the database. */
  private async reloadManagements(): Promise<void> {
    const rows = await this.prisma.businessManagement.findMany({
      include: { modules: { select: { moduleKey: true } } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    this.managementCache = rows.map((row) => {
      const modules = row.modules.map((item) => item.moduleKey);
      return {
        key: row.key,
        label: row.label,
        description: row.description,
        available: row.available,
        isBase: row.isBase,
        sortOrder: row.sortOrder,
        discounts: {
          3: row.discount3,
          6: row.discount6,
          12: row.discount12,
        },
        modules,
        defaultModules: modules.filter(
          (moduleKey) => getBusinessModule(moduleKey)?.defaultEnabled,
        ),
      };
    });
  }

  private management(key: string): ManagementDefinition | undefined {
    return this.managementCache.find((item) => item.key === key);
  }

  private baseManagement(): ManagementDefinition | undefined {
    return this.management('generalBusiness') ?? this.managementCache[0];
  }

  private managementTerms(
    basePrice: number,
    discounts: { 3: number; 6: number; 12: number },
  ): ManagementTerm[] {
    return ([1, 3, 6, 12] as const).map((months) => {
      const discount = months === 1 ? 0 : discounts[months];
      const gross = basePrice * months;
      return {
        months,
        price: Math.max(0, Math.round(gross * (1 - discount / 100))),
        discount,
      };
    });
  }

  private async ensureManagementsLoaded(): Promise<void> {
    if (this.managementCache.length === 0) {
      await this.reloadManagements();
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
    onboardingData?: Prisma.InputJsonValue,
  ) {
    await this.ensureManagementsLoaded();
    const industry =
      this.management(industryKey)?.key ??
      this.baseManagement()?.key ??
      'generalBusiness';
    const fallback = await this.fallbackName(userId);
    const displayName = name?.trim() || fallback;
    const publicSlug = await this.uniquePublicSlug(displayName);
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.businessWorkspace.create({
        data: {
          ownerId: userId,
          name: displayName,
          industryKey: industry,
          publicSlug,
          isDefault,
          ...(onboardingData ? { onboardingData } : {}),
        },
      });
      const keys = this.management(industry)?.defaultModules ?? [];
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

  /**
   * Create-or-update the workspace captured by the «شروع آسان» business step.
   * It never creates a business card or biolink — only the workspace (name,
   * industry and the raw onboarding draft) so the plan step can price the
   * matching management package and the card can be completed later.
   */
  async upsertOnboardingBusiness(
    userId: string,
    dto: {
      name: string;
      industryKey: string;
      onboardingData: Prisma.InputJsonValue;
    },
  ) {
    await this.ensureManagementsLoaded();
    const existing = await this.prisma.businessWorkspace.findFirst({
      where: { ownerId: userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    if (!existing) {
      const created = await this.createWorkspaceRow(
        userId,
        dto.name,
        dto.industryKey,
        true,
        dto.onboardingData,
      );
      await this.activity.log({
        actor: { id: userId },
        action: 'BUSINESS_WORKSPACE_CREATED',
        summary: `ایجاد کسب‌وکار «${created.name}» از «شروع آسان»`,
        entityType: 'BUSINESS_WORKSPACE',
        entityId: created.id,
      });
      return created;
    }

    // The onboarding business step runs before any purchase, so the industry
    // is editable. The locked check keeps a later edit from changing a paid
    // management behind the user's back.
    const locked = (await this.paidState(existing.id)).locked;
    return this.prisma.businessWorkspace.update({
      where: { id: existing.id },
      data: {
        name: dto.name.trim() || existing.name,
        ...(locked ? {} : { industryKey: dto.industryKey }),
        onboardingData: dto.onboardingData,
      },
    });
  }

  async getWorkspaceId(userId: string): Promise<string> {
    return (await this.ensureWorkspace(userId)).id;
  }

  /** Public storefront lookup by slug (used by `/public/shops/:slug`). */
  async findWorkspaceByPublicSlug(slug: string) {
    return this.prisma.businessWorkspace.findUnique({
      where: { publicSlug: slug },
      select: {
        id: true,
        name: true,
        industryKey: true,
        publicSlug: true,
        status: true,
      },
    });
  }

  /**
   * Whether a module is active for one workspace, including the global feature
   * flag. Public controllers use it to avoid serving a module the owner has
   * not bought (or that the admin stopped for everyone).
   */
  async isModuleEnabledForWorkspace(
    workspaceId: string,
    moduleKey: string,
  ): Promise<boolean> {
    const definition = getBusinessModule(moduleKey);
    if (!definition) return false;
    if (
      definition.featureFlag &&
      !(await this.settings.isFeatureEnabled(definition.featureFlag))
    ) {
      return false;
    }
    const activation = await this.prisma.businessModuleActivation.findUnique({
      where: { workspaceId_moduleKey: { workspaceId, moduleKey } },
    });
    if (!activation) return definition.defaultEnabled;
    return (
      activation.enabled &&
      (!activation.paidUntil || activation.paidUntil.getTime() > Date.now())
    );
  }

  /**
   * Whether a «مدیریت کسب‌وکار» has been bought for this workspace, plus when
   * the paid term ends. A purchase row is the signal — free activations keep
   * the industry editable — and the expiry is the latest paid activation.
   */
  private async paidState(workspaceId: string): Promise<{
    locked: boolean;
    paidUntil: Date | null;
  }> {
    const [paidCount, latest] = await Promise.all([
      this.prisma.businessModulePurchase.count({
        where: { workspaceId, status: 'PAID' },
      }),
      this.prisma.businessModuleActivation.findFirst({
        where: { workspaceId, paidUntil: { not: null } },
        orderBy: { paidUntil: 'desc' },
        select: { paidUntil: true },
      }),
    ]);
    return { locked: paidCount > 0, paidUntil: latest?.paidUntil ?? null };
  }

  async listWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
    await this.ensureManagementsLoaded();
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
        this.management(row.industryKey)?.label ?? row.industryKey,
      isDefault: row.isDefault,
      enabledModules: row.modules.length,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async createWorkspace(
    userId: string,
    dto: { name?: string; industryKey?: string },
  ) {
    await this.ensureManagementsLoaded();
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
    await this.ensureManagementsLoaded();
    const workspace = await this.prisma.businessWorkspace.findFirst({
      where: { id: workspaceId, ownerId: userId },
    });
    if (!workspace) throw new NotFoundException('کسب‌وکار پیدا نشد');
    if (dto.industryKey && !this.management(dto.industryKey)) {
      throw new BadRequestException('صنف انتخاب‌شده معتبر نیست');
    }
    if (
      dto.industryKey &&
      dto.industryKey !== workspace.industryKey &&
      (await this.paidState(workspaceId)).locked
    ) {
      throw new ForbiddenException({
        message:
          'پس از خرید «مدیریت کسب‌وکار»، صنف این کسب‌وکار ثابت می‌شود. برای صنف دیگر یک کسب‌وکار جدید بسازید.',
        code: 'INDUSTRY_LOCKED',
      });
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
      const keys = this.management(dto.industryKey)?.defaultModules ?? [];
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
    await this.ensureManagementsLoaded();
    const prices = await this.prisma.businessModulePrice.findMany();
    return {
      modules: BUSINESS_MODULES,
      industries: this.managementCache,
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
    await this.ensureManagementsLoaded();
    const workspace = await this.ensureWorkspace(userId);
    const industry =
      this.management(workspace.industryKey) ?? this.baseManagement();
    if (!industry) {
      throw new BadRequestException('مدیریت کسب‌وکار پیش‌فرض یافت نشد');
    }
    const activationByKey = new Map(
      workspace.modules.map((row) => [row.moduleKey, row]),
    );
    const availableKeys = new Set(industry.modules);
    const defaultKeys = new Set(industry.defaultModules);
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
        months: 0,
        purchased,
        paidUntil: paidUntil ? paidUntil.toISOString() : null,
        locked,
      };
    });

    const [limits, used] = await Promise.all([
      this.subscriptions.limitsForUser(userId),
      this.prisma.businessWorkspace.count({ where: { ownerId: userId } }),
    ]);
    const paid = await this.paidState(workspace.id);

    return {
      id: workspace.id,
      name: workspace.name,
      industryKey: industry.key,
      industry,
      isDefault: workspace.isDefault,
      modules,
      industries: this.managementCache,
      capacity: { max: limits.maxBusinesses, used },
      industryLocked: paid.locked,
      subscriptionPaidUntil: paid.paidUntil
        ? paid.paidUntil.toISOString()
        : null,
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
    await this.ensureManagementsLoaded();
    const industry = this.management(industryKey);
    if (!industry) {
      throw new BadRequestException('صنف انتخاب‌شده معتبر نیست');
    }
    const workspace = await this.ensureWorkspace(userId);
    if ((await this.paidState(workspace.id)).locked) {
      throw new ForbiddenException({
        message:
          'پس از خرید «مدیریت کسب‌وکار»، صنف این کسب‌وکار ثابت می‌شود. برای صنف دیگر یک کسب‌وکار جدید بسازید.',
        code: 'INDUSTRY_LOCKED',
      });
    }
    const keys = industry.defaultModules;

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
    await this.ensureManagementsLoaded();
    // The free plan cannot buy a «مدیریت کسب‌وکار»; it only gets the limited
    // card/biolink of the base plan. Returning no package hides every purchase
    // button instead of letting the buyer hit a wall at the gateway.
    if (isFreePlan(await this.subscriptions.limitsForUser(userId))) {
      return [];
    }
    const workspace = await this.ensureWorkspace(userId);
    const prices = await this.prisma.businessModulePrice.findMany();
    const priceByKey = new Map(prices.map((row) => [row.moduleKey, row]));
    const activationByKey = new Map(
      workspace.modules.map((row) => [row.moduleKey, row]),
    );
    const now = Date.now();
    const paid = await this.paidState(workspace.id);
    // Paid «مدیریت کسب‌وکار» purchases of this workspace, used to decide
    // whether the one-time renewal is still available and which term it had.
    const paidPackagePurchases =
      await this.prisma.businessModulePurchase.findMany({
        where: {
          workspaceId: workspace.id,
          status: 'PAID',
          moduleKey: { startsWith: 'package:' },
        },
        select: { moduleKey: true, months: true },
        orderBy: { createdAt: 'asc' },
      });

    // Once a management is bought, the trade is fixed: only that package is
    // offered (to renew/upgrade), so the user is never nudged into a second
    // unrelated package inside the same workspace.
    return this.managementCache
      .filter(
        (industry) =>
          industry.available &&
          (!paid.locked || industry.key === workspace.industryKey),
      )
      .map((industry) => {
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
          months: 0,
          purchased: paidActive,
          paidUntil: paidUntil ? paidUntil.toISOString() : null,
          locked:
            definition.billable && !paidActive && price > 0 && !enabled,
        };
      });
      const billable = modules.filter((module) => module.billable);
      const totalPrice = billable.reduce((sum, module) => sum + module.price, 0);
      const paidUntil =
        modules
          .map((module) => module.paidUntil)
          .filter((value): value is string => Boolean(value))
          .sort()
          .pop() ?? null;
      const ownPurchases = paidPackagePurchases.filter(
        (row) => row.moduleKey === `package:${industry.key}`,
      );
      const currentMonths = ownPurchases.reduce(
        (max, row) => Math.max(max, row.months || 0),
        0,
      );
      const alreadyExtended = ownPurchases.length > 1;
      const extensionTerms = alreadyExtended
        ? []
        : this.managementTerms(totalPrice, industry.discounts).filter(
            (option) => option.months > currentMonths,
          );
      const paidUntilDate = paidUntil ? new Date(paidUntil) : null;
      const remainingDays =
        paidUntilDate && paidUntilDate.getTime() > now
          ? Math.ceil((paidUntilDate.getTime() - now) / 86_400_000)
          : 0;
      return {
        key: industry.key,
        label: industry.label,
        description: industry.description,
        modules,
        totalPrice,
        remainingPrice: billable
          .filter((module) => !module.purchased)
          .reduce((sum, module) => sum + module.price, 0),
        terms: this.managementTerms(totalPrice, industry.discounts),
        active: modules.every((module) => module.enabled),
        activeModules: modules.filter((module) => module.enabled).length,
        moduleCount: modules.length,
        paidUntil,
        extension: {
          allowed:
            paid.locked &&
            industry.key === workspace.industryKey &&
            !alreadyExtended &&
            totalPrice > 0 &&
            extensionTerms.length > 0,
          alreadyExtended,
          currentMonths,
          remainingDays,
          terms: extensionTerms,
          paidUntil,
        },
      };
    });
  }

  /** Display label of one industry package (falls back to the key). */
  async managementLabel(industryKey: string): Promise<string> {
    await this.ensureManagementsLoaded();
    return this.management(industryKey)?.label ?? industryKey;
  }

  /** Buy a whole «مدیریت کسب‌وکار» package (all its modules at once). */
  async purchaseManagement(
    userId: string,
    packageKey: string,
    requestedMonths?: number,
    returnTo?: string,
  ) {
    await this.ensureManagementsLoaded();
    // Guard the purchase itself too: a free-plan user can never buy the add-on
    // even if the client posts straight to this route.
    if (isFreePlan(await this.subscriptions.limitsForUser(userId))) {
      throw new ForbiddenException(
        'اشتراک رایگان امکان خرید «بسته مدیریت کسب‌وکار» را ندارد؛ ابتدا به اکو یا پلاس ارتقا دهید.',
      );
    }
    const industry = this.management(packageKey);
    if (!industry) {
      throw new BadRequestException('مدیریت کسب‌وکار انتخاب‌شده معتبر نیست');
    }
    const workspace = await this.ensureWorkspace(userId);
    const views = await this.listManagements(userId);
    const view = views.find((item) => item.key === packageKey);
    if (!view) {
      throw new BadRequestException(
        'این صنف برای کسب‌وکار فعلی قابل خرید نیست؛ برای صنف دیگر یک کسب‌وکار جدید بسازید',
      );
    }
    // Modules carry a monthly price; the management owns the term discounts.
    const months = ([1, 3, 6, 12] as const).includes(
      requestedMonths as 1 | 3 | 6 | 12,
    )
      ? (requestedMonths as 1 | 3 | 6 | 12)
      : 1;
    // A workspace that already bought its package may renew the *same* package
    // once with a longer term; the unused days of the current term are carried
    // over, so a paid-for period is never thrown away.
    const paid = await this.paidState(workspace.id);
    const isExtension = paid.locked && workspace.industryKey === packageKey;
    let basePrice: number;
    let targetPaidUntil: Date | null = null;
    if (isExtension) {
      const extension = view.extension;
      if (!extension || extension.alreadyExtended) {
        throw new BadRequestException(
          'امکان تمدید مدیریت کسب‌وکار تنها یک‌بار وجود دارد',
        );
      }
      if (!extension.terms.some((item) => item.months === months)) {
        throw new BadRequestException(
          'برای تمدید باید دوره‌ای طولانی‌تر از دوره‌ی فعلی انتخاب کنید',
        );
      }
      basePrice = view.totalPrice;
      const current = paid.paidUntil;
      const from =
        current && current.getTime() > Date.now() ? current : new Date();
      targetPaidUntil = addMonths(from, months);
    } else {
      const chargeable = view.modules.filter(
        (module) => module.billable && !module.purchased && module.price > 0,
      );
      basePrice = chargeable.reduce((sum, module) => sum + module.price, 0);
    }
    const term = this.managementTerms(basePrice, industry.discounts).find(
      (item) => item.months === months,
    );
    const amount = term?.price ?? 0;
    const purchaseExpiresAt = isExtension
      ? targetPaidUntil
      : months > 0
        ? addMonths(new Date(), months)
        : null;
    if (amount <= 0) {
      await this.activatePackage(
        workspace.id,
        packageKey,
        months,
        targetPaidUntil,
      );
      return {
        free: true,
        activated: true,
        extended: isExtension,
        paidUntil: targetPaidUntil?.toISOString() ?? null,
      };
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
          expiresAt: purchaseExpiresAt,
        },
      });
      const charged = await this.wallet.charge({
        userId,
        kind: WalletEntryKind.BUSINESS_MODULE,
        amount,
        title: isExtension
          ? `تمدید مدیریت کسب‌وکار «${industry.label}»`
          : `خرید مدیریت کسب‌وکار «${industry.label}»`,
        sourceType: 'BUSINESS_MODULE',
        sourceId: purchase.id,
        idempotencyKey: `business-package:${purchase.id}`,
      });
      await this.activatePackage(
        workspace.id,
        packageKey,
        months,
        isExtension ? targetPaidUntil : undefined,
      );
      await this.notifications.notify({
        userId,
        type: NotificationType.SUCCESS,
        title: isExtension
          ? 'مدیریت کسب‌وکار تمدید شد'
          : 'مدیریت کسب‌وکار فعال شد',
        body:
          charged > 0
            ? `مدیریت «${industry.label}» ${isExtension ? 'تمدید' : 'فعال'} شد و مبلغ ${charged.toLocaleString('fa-IR')} تومان به بدهی کیف پول شما اضافه شد.`
            : `مدیریت «${industry.label}» ${isExtension ? 'تمدید' : 'فعال'} شد.`,
        link: '/dashboard/business',
      });
      return {
        wallet: true,
        activated: true,
        extended: isExtension,
        amount: charged,
        purchase,
        paidUntil: targetPaidUntil?.toISOString() ?? null,
      };
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
        // For a renewal the target expiry is fixed up-front so a slow callback
        // still credits the carried-over days.
        ...(isExtension ? { expiresAt: targetPaidUntil } : {}),
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
      extended: isExtension,
      paidUntil: targetPaidUntil?.toISOString() ?? null,
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
    paidUntilOverride?: Date | null,
  ) {
    await this.ensureManagementsLoaded();
    const industry = this.management(packageKey);
    if (!industry) return;
    const keys = withDependencies(industry.modules);
    const paidUntil =
      months > 0
        ? (paidUntilOverride ?? addMonths(new Date(), months))
        : null;
    // Only modules that actually carry a price should expire. Free/default
    // modules stay enabled regardless of the purchased term.
    const prices = await this.prisma.businessModulePrice.findMany({
      where: { moduleKey: { in: keys }, isActive: true },
      select: { moduleKey: true, price: true },
    });
    const paidKeys = new Set(
      prices.filter((row) => row.price > 0).map((row) => row.moduleKey),
    );
    await this.prisma.$transaction(async (tx) => {
      await tx.businessWorkspace.update({
        where: { id: workspaceId },
        data: { industryKey: packageKey },
      });
      for (const key of keys) {
        const definition = getBusinessModule(key);
        const timeLimited = Boolean(definition?.billable && paidKeys.has(key));
        await tx.businessModuleActivation.upsert({
          where: { workspaceId_moduleKey: { workspaceId, moduleKey: key } },
          update: {
            enabled: true,
            enabledAt: new Date(),
            ...(timeLimited ? { paidUntil } : {}),
          },
          create: {
            workspaceId,
            moduleKey: key,
            enabled: true,
            enabledAt: new Date(),
            ...(timeLimited ? { paidUntil } : {}),
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
    const paymentRefId = Number(params.refId);
    if (!Number.isFinite(paymentRefId)) {
      return { redirectUrl: `${base}?purchase=failed` };
    }
    type VerifyResult = {
      amount?: number;
      clientRefId?: string;
      paymentRefId?: number;
      payedDate?: string;
    };
    let verified: VerifyResult | null = null;
    let alreadyVerified = false;
    try {
      if (this.simulator.handles(purchase.paymentCode)) {
        verified = this.simulator.verifyPayment({
          paymentCode: purchase.paymentCode,
          amount: purchase.amount,
          clientRefId: purchase.clientRefId,
        });
      } else {
        // PayPing's `/v3/pay/verify` expects `paymentRefId` (number) plus the
        // original `amount`; sending `refId` or omitting the amount is rejected
        // and used to fail the purchase even though the bank had charged it.
        verified = (await this.payping.verifyPayment({
          paymentRefId,
          paymentCode: purchase.paymentCode,
          amount: purchase.amount,
        })) as VerifyResult;
      }
    } catch (error) {
      const current = await this.prisma.businessModulePurchase.findUnique({
        where: { id: purchase.id },
      });
      if (current?.status === 'PAID') {
        return { redirectUrl: `${base}?purchase=success` };
      }
      const upstreamStatus = (error as { paypingStatus?: number }).paypingStatus;
      const status =
        upstreamStatus ??
        (error instanceof HttpException ? error.getStatus() : 500);
      if (status === 409) {
        // PayPing code 110: the transaction is already verified (e.g. a
        // duplicated callback). Continue and activate instead of failing.
        alreadyVerified = true;
      } else if (status >= 500) {
        // Verification is still processing upstream; keep the purchase open so
        // a later callback can finish it.
        return { redirectUrl: `${base}?purchase=pending` };
      } else {
        await this.prisma.businessModulePurchase.update({
          where: { id: purchase.id },
          data: { status: 'FAILED' },
        });
        return { redirectUrl: `${base}?purchase=failed` };
      }
    }
    if (
      !alreadyVerified &&
      verified &&
      typeof verified.amount === 'number' &&
      verified.amount !== purchase.amount
    ) {
      await this.prisma.businessModulePurchase.update({
        where: { id: purchase.id },
        data: { status: 'FAILED' },
      });
      return { redirectUrl: `${base}?purchase=failed` };
    }
    const isPackage = purchase.moduleKey.startsWith('package:');
    // A «تمدید» purchase carries its pre-computed target expiry from creation
    // time, so the days carried over from the previous term are not lost when
    // the callback arrives late.
    const isExtension = isPackage && Boolean(purchase.expiresAt);
    await this.prisma.businessModulePurchase.update({
      where: { id: purchase.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        expiresAt:
          purchase.expiresAt ??
          (purchase.months > 0 ? addMonths(new Date(), purchase.months) : null),
      },
    });
    if (isPackage) {
      await this.activatePackage(
        purchase.workspaceId,
        purchase.moduleKey.slice('package:'.length),
        purchase.months,
        purchase.expiresAt ?? undefined,
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
      title: isPackage
        ? isExtension
          ? 'مدیریت کسب‌وکار تمدید شد'
          : 'مدیریت کسب‌وکار فعال شد'
        : 'ماژول کسب‌وکار فعال شد',
      body: isPackage
        ? isExtension
          ? 'پرداخت شما تأیید شد؛ دوره‌ی این مدیریت کسب‌وکار با احتساب مانده‌ی دوره‌ی قبل تمدید شد.'
          : 'پرداخت شما تأیید شد و تمام ماژول‌های این مدیریت کسب‌وکار فعال شد.'
        : 'پرداخت شما تأیید شد و ماژول موردنظر فعال شد.',
      link: '/dashboard/business',
    });
    return { redirectUrl: `${base}?purchase=success` };
  }

  // -------------------------------------------------------------------------
  //  Admin
  // -------------------------------------------------------------------------

  async adminCatalog() {
    await this.ensureManagementsLoaded();
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
        months: 0,
        priceActive: priceByKey.get(definition.key)?.isActive ?? false,
        priceDescription: priceByKey.get(definition.key)?.description ?? null,
        enabledWorkspaces: countByKey.get(definition.key) ?? 0,
      })),
      industries: this.managementCache,
      totals: { workspaces },
    };
  }

  /** Every «مدیریت کسب‌وکار» as a card, with its modules and PayPing state. */
  async adminManagements(): Promise<AdminManagementView[]> {
    await this.ensureManagementsLoaded();
    const [prices, synced] = await Promise.all([
      this.prisma.businessModulePrice.findMany(),
      this.prisma.setting.findMany({
        where: { key: { startsWith: MANAGEMENT_PAYPING_SETTING_PREFIX } },
      }),
    ]);
    const priceByKey = new Map(prices.map((row) => [row.moduleKey, row]));
    const syncByKey = new Map(
      synced.map((row) => [
        row.key.slice(MANAGEMENT_PAYPING_SETTING_PREFIX.length),
        this.parseManagementSync(row.value),
      ]),
    );

    return this.managementCache.map((industry) => {
      const modules: AdminManagementModuleView[] = BUSINESS_MODULES.filter(
        (definition) => industry.modules.includes(definition.key),
      ).map((definition) => {
        const priceRow = priceByKey.get(definition.key);
        return {
          key: definition.key,
          label: definition.label,
          group: definition.group,
          billable: definition.billable,
          defaultEnabled: definition.defaultEnabled,
          price: priceRow?.isActive ? priceRow.price : 0,
          months: 0,
          priceActive: priceRow?.isActive ?? false,
        };
      });
      const sync = syncByKey.get(industry.key);
      const totalPrice = modules
        .filter((module) => module.billable)
        .reduce((sum, module) => sum + module.price, 0);
      return {
        key: industry.key,
        label: industry.label,
        description: industry.description,
        available: Boolean(industry.available),
        isBase: industry.isBase,
        modules,
        totalPrice,
        discounts: industry.discounts,
        terms: this.managementTerms(totalPrice, industry.discounts),
        productCode: sync?.codes?.['1'] ?? sync?.code ?? null,
        productCodes: sync?.codes ?? {},
        lastSyncedAt: sync?.syncedAt ?? null,
        simulated: sync?.simulated ?? false,
      };
    });
  }

  /**
   * Create/update one PayPing «آیتم مالی» for a management card. The amount is
   * the sum of the card's module prices, so the merchant catalog always matches
   * what the user panel shows. In local dev the simulator returns a fake code
   * instead of touching the real merchant account.
   */
  async syncManagementPayping(packageKey: string) {
    await this.ensureManagementsLoaded();
    const industry = this.management(packageKey);
    if (!industry) {
      throw new BadRequestException('مدیریت کسب‌وکار انتخاب‌شده معتبر نیست');
    }
    const cards = await this.adminManagements();
    const card = cards.find((item) => item.key === packageKey);
    if (!card) {
      throw new BadRequestException('مدیریت کسب‌وکار انتخاب‌شده معتبر نیست');
    }
    const termCards = card.terms.filter((term) => term.price >= 1000);
    if (termCards.length === 0) {
      throw new BadRequestException(
        'برای ساخت محصول پی‌پینگ، مجموع قیمت ماژول‌های این مدیریت باید حداقل ۱۰۰۰ تومان باشد.',
      );
    }

    const settingKey = `${MANAGEMENT_PAYPING_SETTING_PREFIX}${packageKey}`;
    const previous = this.parseManagementSync(
      (await this.prisma.setting.findUnique({ where: { key: settingKey } }))
        ?.value ?? '',
    );
    const codes: Record<string, string | null> = { ...(previous?.codes ?? {}) };
    const amounts: Record<string, number> = {};
    let simulated = false;
    const terms: Array<{
      months: number;
      price: number;
      productCode: string | null;
      created: boolean;
    }> = [];

    for (const term of termCards) {
      const monthsKey = String(term.months);
      const termLabel =
        term.months === 1
          ? 'یک‌ماهه'
          : term.months === 12
            ? 'یک‌ساله'
            : `${term.months} ماهه`;
      const payload = {
        title: `مدیریت کسب‌وکار ${industry.label} — ${termLabel} — شمالی‌کارت`,
        description: industry.description,
        amount: term.price,
        defineAmountByUser: false,
        haveTax: false,
        unlimited: true,
      };
      let code = codes[monthsKey] ?? null;
      let created = false;

      if (this.simulator.isEnabled) {
        simulated = true;
        created = !code;
        code =
          code ??
          `SIM-PRODUCT-${packageKey}-${term.months}-${randomBytes(3).toString('hex')}`;
      } else if (!this.payping.configured) {
        throw new ServiceUnavailableException(
          'توکن درگاه پرداخت پی‌پینگ تنظیم نشده است. مقدار PAYPING_TOKEN را در محیط سرور قرار دهید.',
        );
      } else if (code) {
        await this.payping.updateProduct({ ...payload, code });
      } else {
        const result = (await this.payping.createProduct(payload)) as {
          code?: string;
        } | null;
        if (!result?.code) {
          throw new BadGatewayException(
            'ساخت محصول مدیریت کسب‌وکار در پی‌پینگ ناموفق بود؛ لطفاً دوباره تلاش کنید.',
          );
        }
        code = result.code;
        created = true;
      }

      codes[monthsKey] = code;
      amounts[monthsKey] = term.price;
      terms.push({
        months: term.months,
        price: term.price,
        productCode: code,
        created,
      });
    }

    const syncedAt = new Date().toISOString();
    const value = JSON.stringify({ codes, amounts, syncedAt, simulated });
    await this.prisma.setting.upsert({
      where: { key: settingKey },
      create: { key: settingKey, value },
      update: { value },
    });
    await this.activity.log({
      action: 'BUSINESS_MANAGEMENT_PAYPING_SYNC',
      summary: `همگام‌سازی محصولات پی‌پینگ مدیریت «${industry.label}» (${terms
        .map((term) => `${term.months} ماهه`)
        .join('، ')})`,
      entityType: 'SETTING',
      entityId: settingKey,
    });

    return {
      packageKey,
      label: industry.label,
      terms,
      simulated,
      syncedAt,
      modules: card.modules.filter((module) => module.billable),
    };
  }

  private parseManagementSync(value: string): {
    code: string | null;
    codes: Record<string, string | null>;
    amounts: Record<string, number>;
    amount: number;
    syncedAt: string | null;
    simulated: boolean;
  } | null {
    try {
      const parsed = JSON.parse(value) as {
        code?: string | null;
        codes?: Record<string, string | null>;
        amounts?: Record<string, number>;
        amount?: number;
        syncedAt?: string | null;
        simulated?: boolean;
      };
      const codes = parsed.codes ?? (parsed.code ? { '1': parsed.code } : {});
      return {
        code: parsed.code ?? null,
        codes,
        amounts: parsed.amounts ?? {},
        amount: Number(parsed.amount) || 0,
        syncedAt: parsed.syncedAt ?? null,
        simulated: Boolean(parsed.simulated),
      };
    } catch {
      return null;
    }
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
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
      },
      create: {
        moduleKey,
        price: dto.price ?? 0,
        months: 0,
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

  // -------------------------------------------------------------------------
  //  Admin — management CRUD
  // -------------------------------------------------------------------------

  private clampDiscount(value: unknown): number {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.min(90, Math.max(0, Math.round(number)));
  }

  async adminCreateManagement(dto: {
    key?: string;
    label: string;
    description?: string;
    available?: boolean;
    discounts?: { 3?: number; 6?: number; 12?: number };
    modules?: string[];
  }) {
    const key = (dto.key ?? '').trim();
    if (!/^[a-zA-Z][a-zA-Z0-9_-]{1,40}$/.test(key)) {
      throw new BadRequestException(
        'کلید مدیریت باید با حرف شروع شود و فقط شامل حروف انگلیسی، عدد، خط تیره و زیرخط باشد.',
      );
    }
    const exists = await this.prisma.businessManagement.findUnique({
      where: { key },
    });
    if (exists) {
      throw new ConflictException('مدیریتی با این کلید قبلاً وجود دارد');
    }
    const modules = Array.from(
      new Set((dto.modules ?? []).filter((item) => getBusinessModule(item))),
    );
    const max = await this.prisma.businessManagement.aggregate({
      _max: { sortOrder: true },
    });
    await this.prisma.businessManagement.create({
      data: {
        key,
        label: dto.label.trim(),
        description: dto.description?.trim() ?? '',
        available: dto.available ?? false,
        isBase: false,
        sortOrder: (max._max.sortOrder ?? 0) + 1,
        discount3: this.clampDiscount(dto.discounts?.[3]),
        discount6: this.clampDiscount(dto.discounts?.[6]),
        discount12: this.clampDiscount(dto.discounts?.[12]),
        modules: { create: modules.map((moduleKey) => ({ moduleKey })) },
      },
    });
    await this.reloadManagements();
    await this.activity.log({
      action: 'BUSINESS_MANAGEMENT_ADMIN_CREATED',
      summary: `ایجاد مدیریت کسب‌وکار «${dto.label.trim()}»`,
      entityType: 'SETTING',
      entityId: key,
    });
    return this.adminManagements();
  }

  async adminUpdateManagement(
    key: string,
    dto: {
      label?: string;
      description?: string;
      available?: boolean;
      discounts?: { 3?: number; 6?: number; 12?: number };
      modules?: string[];
    },
  ) {
    const row = await this.prisma.businessManagement.findUnique({
      where: { key },
      include: { modules: { select: { moduleKey: true } } },
    });
    if (!row) throw new NotFoundException('مدیریت کسب‌وکار پیدا نشد');

    let modules: string[] | undefined;
    if (dto.modules) {
      modules = Array.from(
        new Set(dto.modules.filter((item) => getBusinessModule(item))),
      );
      if (row.isBase) {
        const defaults = BUSINESS_MODULES.filter(
          (definition) => definition.defaultEnabled,
        ).map((definition) => definition.key);
        for (const moduleKey of defaults) {
          if (!modules.includes(moduleKey)) modules.push(moduleKey);
        }
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.businessManagement.update({
        where: { key },
        data: {
          ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description.trim() }
            : {}),
          ...(dto.available !== undefined ? { available: dto.available } : {}),
          ...(dto.discounts
            ? {
                discount3: this.clampDiscount(dto.discounts[3]),
                discount6: this.clampDiscount(dto.discounts[6]),
                discount12: this.clampDiscount(dto.discounts[12]),
              }
            : {}),
        },
      });
      if (modules) {
        await tx.businessManagementModule.deleteMany({
          where: { managementId: row.id },
        });
        if (modules.length) {
          await tx.businessManagementModule.createMany({
            data: modules.map((moduleKey) => ({
              managementId: row.id,
              moduleKey,
            })),
          });
        }
      }
    });
    await this.reloadManagements();
    return this.adminManagements();
  }

  async adminDeleteManagement(key: string) {
    const row = await this.prisma.businessManagement.findUnique({
      where: { key },
    });
    if (!row) throw new NotFoundException('مدیریت کسب‌وکار پیدا نشد');
    if (row.isBase) {
      throw new BadRequestException(
        'مدیریت پایه قابل حذف نیست؛ می‌توانید نام یا ماژول‌های آن را ویرایش کنید.',
      );
    }
    await this.ensureManagementsLoaded();
    const base = this.baseManagement();
    if (!base || base.key === key) {
      throw new BadRequestException('مدیریت پایه برای انتقال کسب‌وکارها یافت نشد');
    }
    const affected = await this.prisma.businessWorkspace.findMany({
      where: { industryKey: key },
      select: { id: true },
    });
    if (affected.length) {
      const ids = affected.map((item) => item.id);
      await this.prisma.$transaction([
        this.prisma.businessWorkspace.updateMany({
          where: { id: { in: ids } },
          data: { industryKey: base.key },
        }),
        this.prisma.businessModuleActivation.updateMany({
          where: {
            workspaceId: { in: ids },
            moduleKey: { notIn: base.modules },
          },
          data: { enabled: false },
        }),
      ]);
    }
    await this.prisma.businessManagement.delete({ where: { key } });
    await this.prisma.setting.deleteMany({
      where: { key: `${MANAGEMENT_PAYPING_SETTING_PREFIX}${key}` },
    });
    await this.reloadManagements();
    await this.activity.log({
      action: 'BUSINESS_MANAGEMENT_ADMIN_DELETED',
      summary: `حذف مدیریت کسب‌وکار «${row.label}»${
        affected.length ? ` و انتقال ${affected.length} کسب‌وکار به مدیریت پایه` : ''
      }`,
      entityType: 'SETTING',
      entityId: key,
    });
    return this.adminManagements();
  }

  async adminAddManagementModule(key: string, moduleKey: string) {
    const definition = getBusinessModule(moduleKey);
    if (!definition) {
      throw new BadRequestException('ماژول انتخاب‌شده معتبر نیست');
    }
    const row = await this.prisma.businessManagement.findUnique({
      where: { key },
    });
    if (!row) throw new NotFoundException('مدیریت کسب‌وکار پیدا نشد');
    await this.prisma.businessManagementModule.upsert({
      where: {
        managementId_moduleKey: { managementId: row.id, moduleKey },
      },
      update: {},
      create: { managementId: row.id, moduleKey },
    });
    await this.reloadManagements();
    return this.adminManagements();
  }

  async adminRemoveManagementModule(key: string, moduleKey: string) {
    const row = await this.prisma.businessManagement.findUnique({
      where: { key },
    });
    if (!row) throw new NotFoundException('مدیریت کسب‌وکار پیدا نشد');
    const definition = getBusinessModule(moduleKey);
    if (!definition) {
      throw new BadRequestException('ماژول انتخاب‌شده معتبر نیست');
    }
    if (row.isBase && definition.defaultEnabled) {
      throw new BadRequestException(
        'ماژول‌های پیش‌فرض (کارت ویزیت و بیولینک) از مدیریت پایه قابل حذف نیستند.',
      );
    }
    await this.prisma.businessManagementModule.deleteMany({
      where: { managementId: row.id, moduleKey },
    });
    await this.reloadManagements();
    return this.adminManagements();
  }
}
