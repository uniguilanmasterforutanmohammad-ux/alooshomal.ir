import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  BiolinkStatus,
  IdentityInquiryKind,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

import { ActivityService } from '../activity/activity.service';
import { ApiIrService } from '../apiir/apiir.service';
import { OtpService } from '../auth/otp.service';
import { BusinessModulesService } from '../business-modules/business-modules.service';
import { isFreePlan } from '../common/plans';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileService } from '../profile/profile.service';
import { SettingsService } from '../settings/settings.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ZohalService } from '../zohal/zohal.service';
import {
  DEFAULT_ONBOARDING_STEPS,
  MANUAL_STEP_KINDS,
  ONBOARDING_CART_PREFIX,
  ONBOARDING_FINISHED_STEP_ID,
  ONBOARDING_MODULE_RESULT_PREFIX,
  ONBOARDING_STEP_DATA_PREFIX,
  ONBOARDING_STEPS_SETTING_KEY,
  ONBOARDING_STEP_KINDS,
  ONBOARDING_FIELD_PREFILLS,
  type OnboardingDocument,
  type OnboardingBusinessState,
  type OnboardingCartItem,
  type OnboardingFieldOption,
  type OnboardingFieldOverride,
  type OnboardingFieldPrefill,
  type OnboardingModuleField,
  type OnboardingModuleInfo,
  type OnboardingProgressPayload,
  type OnboardingStepDef,
  type OnboardingStepKind,
  type OnboardingStepState,
} from './onboarding.constants';
import type {
  AddOnboardingDocumentDto,
  OnboardingStepDto,
  SaveOnboardingBusinessDto,
  SaveOnboardingStepDataDto,
} from './dto/onboarding.dto';

/** The built-in kinds whose completion is derived from account data. */
const BUILT_IN_KINDS = new Set<OnboardingStepKind>(
  ONBOARDING_STEP_KINDS.filter((kind) => !MANUAL_STEP_KINDS.includes(kind)),
);

/** The kinds the user ticks off manually (welcome + admin-added steps). */
const MANUAL_KINDS = new Set<OnboardingStepKind>(MANUAL_STEP_KINDS);

/** One selectable module/product the admin can drop into a wizard step. */
export interface OnboardingModuleOption {
  /** stable key stored on the step (`plan:<id>`, `management:<key>`, …). */
  key: string;
  type: 'zohal' | 'apiir' | 'plan' | 'management' | 'biolink' | 'businessCard';
  group: string;
  label: string;
  description: string;
  href: string;
  enabled: boolean;
  /** Toman; 0 when the module is free or has no fixed price. */
  price: number;
  /** Inputs the user must fill for this module (empty for non-inquiry items). */
  fields: OnboardingModuleField[];
  /** True when this item is an admin-defined composite of several modules. */
  composite?: boolean;
}

@Injectable()
export class OnboardingService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly activity: ActivityService,
    private readonly modules: BusinessModulesService,
    private readonly subscriptions: SubscriptionsService,
    private readonly profile: ProfileService,
    private readonly zohal: ZohalService,
    private readonly apiir: ApiIrService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Repair accounts whose identity was captured by an older flow that did not
    // set the verification flags (so the wizard wrongly asked them to pay
    // again). Guarded by a marker so it only ever runs once.
    try {
      await this.backfillIdentityState();
    } catch {
      // the table may not exist on a first boot; a later boot retries
    }
    try {
      await this.upgradeStoredSteps();
    } catch {
      // settings table may not exist yet; a later boot retries
    }
    try {
      await this.upgradeStoredStepsV3();
    } catch {
      // settings table may not exist yet; a later boot retries
    }
    try {
      await this.upgradeStoredStepsV4();
    } catch {
      // settings table may not exist yet; a later boot retries
    }
  }

  /** The configured step list, falling back to the shipped defaults. */
  async getSteps(): Promise<OnboardingStepDef[]> {
    const row = await this.prisma.setting.findUnique({
      where: { key: ONBOARDING_STEPS_SETTING_KEY },
    });
    if (!row?.value) return DEFAULT_ONBOARDING_STEPS;
    try {
      const parsed = JSON.parse(row.value) as unknown;
      if (!Array.isArray(parsed)) return DEFAULT_ONBOARDING_STEPS;
      return this.normalize(this.sanitize(parsed as OnboardingStepDto[]));
    } catch {
      return DEFAULT_ONBOARDING_STEPS;
    }
  }

  /**
   * The built-in step set evolves with the product (the «تکمیل مشخصات» step was
   * merged into «عنوان کسب‌وکار» and «مدارک» became optional). A stored admin
   * config would otherwise keep the old list, so this one-time upgrade drops
   * the removed step, refreshes the built-in copy and applies the new optional
   * flags while preserving the admin's order, enabled state and custom steps.
   */
  private async upgradeStoredSteps(): Promise<void> {
    const markerKey = 'onboardingStepsV2';
    const [marker, row] = await Promise.all([
      this.prisma.setting.findUnique({ where: { key: markerKey } }),
      this.prisma.setting.findUnique({
        where: { key: ONBOARDING_STEPS_SETTING_KEY },
      }),
    ]);
    if (marker) return;
    if (row?.value) {
      try {
        const parsed = JSON.parse(row.value) as unknown;
        if (Array.isArray(parsed)) {
          const upgraded = this.normalize(
            this.sanitize(parsed as OnboardingStepDto[]),
            true,
          );
          await this.prisma.setting.update({
            where: { key: ONBOARDING_STEPS_SETTING_KEY },
            data: { value: JSON.stringify(upgraded) },
          });
        }
      } catch {
        // leave the stored value untouched if it is not valid JSON
      }
    }
    await this.prisma.setting.upsert({
      where: { key: markerKey },
      create: { key: markerKey, value: new Date().toISOString() },
      update: {},
    });
  }

  /**
   * Drop steps that no longer exist in the product and apply the built-in
   * defaults' `optional` flag. With `refreshCopy`, the built-in title /
   * description / href are replaced by the shipped defaults too (used by the
   * one-time upgrade).
   */
  private normalize(
    steps: OnboardingStepDef[],
    refreshCopy = false,
  ): OnboardingStepDef[] {
    const defaults = new Map(
      DEFAULT_ONBOARDING_STEPS.map((step) => [step.kind, step]),
    );
    const result: OnboardingStepDef[] = [];
    for (const step of steps) {
      if (step.kind === 'details' || step.kind === 'documents') continue;
      const base = defaults.get(step.kind);
      if (!base) {
        result.push(step);
        continue;
      }
      const next: OnboardingStepDef = {
        ...step,
        ...(refreshCopy
          ? { title: base.title, description: base.description }
          : {}),
        // Respect the admin's per-step «اختیاری» toggle. Only fall back to the
        // shipped default when the stored config predates the field.
        optional: step.optional ?? base.optional === true,
      };
      if (base.href) next.href = base.href;
      else delete next.href;
      result.push(next);
    }
    return result;
  }

  /**
   * «شروع آسان» v3: the business step moved before identity, the documents
   * step was merged into identity, and the plan step now also carries the
   * business-management add-on. Preserve the admin's enabled flags and custom
   * steps while adopting the shipped order/copy.
   */
  private async upgradeStoredStepsV3(): Promise<void> {
    const markerKey = 'onboardingStepsV3';
    const marker = await this.prisma.setting.findUnique({
      where: { key: markerKey },
    });
    if (marker) return;
    const row = await this.prisma.setting.findUnique({
      where: { key: ONBOARDING_STEPS_SETTING_KEY },
    });
    if (row?.value) {
      try {
        const parsed = JSON.parse(row.value) as unknown;
        if (Array.isArray(parsed)) {
          const merged = this.mergeWithDefaults(
            this.sanitize(parsed as OnboardingStepDto[]),
          );
          await this.prisma.setting.update({
            where: { key: ONBOARDING_STEPS_SETTING_KEY },
            data: { value: JSON.stringify(merged) },
          });
        }
      } catch {
        // leave the stored value untouched if it is not valid JSON
      }
    }
    await this.prisma.setting.upsert({
      where: { key: markerKey },
      create: { key: markerKey, value: new Date().toISOString() },
      update: {},
    });
  }

  /**
   * «شروع آسان» v4: the plan step now only picks the subscription, the new
   * management step picks the industry package, and the invoice step collects
   * everything into one payment. Rebuild the built-in list from the shipped
   * defaults while keeping the admin's enabled flags and custom steps.
   */
  private async upgradeStoredStepsV4(): Promise<void> {
    const markerKey = 'onboardingStepsV4';
    const marker = await this.prisma.setting.findUnique({
      where: { key: markerKey },
    });
    if (marker) return;
    const row = await this.prisma.setting.findUnique({
      where: { key: ONBOARDING_STEPS_SETTING_KEY },
    });
    if (row?.value) {
      try {
        const parsed = JSON.parse(row.value) as unknown;
        if (Array.isArray(parsed)) {
          const merged = this.mergeWithDefaults(
            this.sanitize(parsed as OnboardingStepDto[]),
          );
          await this.prisma.setting.update({
            where: { key: ONBOARDING_STEPS_SETTING_KEY },
            data: { value: JSON.stringify(merged) },
          });
        }
      } catch {
        // leave the stored value untouched if it is not valid JSON
      }
    }
    await this.prisma.setting.upsert({
      where: { key: markerKey },
      create: { key: markerKey, value: new Date().toISOString() },
      update: {},
    });
  }

  /**
   * Rebuild the built-in steps from the shipped defaults (order + copy) while
   * keeping the enabled flag the admin had set. Custom steps stay at the end.
   */
  private mergeWithDefaults(stored: OnboardingStepDef[]): OnboardingStepDef[] {
    const builtIn = new Set(DEFAULT_ONBOARDING_STEPS.map((step) => step.kind));
    const byKind = new Map(
      stored
        .filter((step) => builtIn.has(step.kind))
        .map((step) => [step.kind, step]),
    );
    const merged = DEFAULT_ONBOARDING_STEPS.map((step) => {
      const previous = byKind.get(step.kind);
      return {
        ...step,
        enabled: previous?.enabled ?? step.enabled,
        ...(step.optional === true ? { optional: true } : {}),
      };
    });
    const customs = stored.filter((step) => !builtIn.has(step.kind));
    return [...merged, ...customs];
  }

  /**
   * The library of modules/products the admin can place in a wizard step:
   * Zohal and api.ir services, subscription plans, management packages and the
   * two user-created assets (biolink / business card).
   */
  async getModuleCatalog(): Promise<{ items: OnboardingModuleOption[] }> {
    const [zohal, apiir, plans, catalog] = await Promise.all([
      this.zohal.listServices(),
      this.apiir.listServices(),
      this.subscriptions.listPlans(false),
      this.modules.resolveCatalog(),
    ]);
    const items: OnboardingModuleOption[] = [];
    for (const service of zohal.services) {
      items.push({
        key: `zohal:${service.key}`,
        type: 'zohal',
        group: 'zohal (استعلام هویت)',
        label: service.label,
        description: service.description,
        href: '/dashboard/profile',
        enabled: service.enabled,
        price: service.price,
        fields: service.fields ?? [],
      });
    }
    for (const composite of zohal.composites) {
      items.push({
        key: `zohal:composite:${composite.key}`,
        type: 'zohal',
        group: 'zohal (محصولات ترکیبی)',
        label: composite.label,
        description:
          composite.description?.trim() ||
          `ترکیب: ${composite.serviceLabels.join(' + ')}`,
        href: '/dashboard/profile',
        enabled: composite.purchasable,
        price: composite.amount,
        fields: composite.fields ?? [],
        composite: true,
      });
    }
    for (const service of apiir.services) {
      items.push({
        key: `apiir:${service.key}`,
        type: 'apiir',
        group: 'api.ir (استعلام)',
        label: service.label,
        description: service.description,
        href: '/dashboard/profile',
        enabled: service.enabled,
        price: service.price,
        fields: service.fields ?? [],
      });
    }
    for (const composite of apiir.composites ?? []) {
      items.push({
        key: `apiir:composite:${composite.key}`,
        type: 'apiir',
        group: 'api.ir (محصولات ترکیبی)',
        label: composite.label,
        description:
          composite.description?.trim() ||
          `ترکیب: ${composite.serviceLabels.join(' + ')}`,
        href: '/dashboard/profile',
        enabled: composite.purchasable,
        price: composite.amount,
        fields: composite.fields ?? [],
        composite: true,
      });
    }
    for (const plan of plans) {
      items.push({
        key: `plan:${plan.id}`,
        type: 'plan',
        group: 'اشتراک‌ها',
        label: `اشتراک ${plan.name}`,
        description: plan.description ?? '',
        href: '/dashboard/subscriptions',
        enabled: plan.isActive,
        price: plan.price,
        fields: [],
      });
    }
    const monthlyPrice = new Map<string, number>();
    for (const row of catalog.prices) {
      if (row.months === 1 && row.isActive) {
        monthlyPrice.set(row.moduleKey, row.price);
      }
    }
    for (const industry of catalog.industries) {
      const price = industry.modules.reduce(
        (sum, moduleKey) => sum + (monthlyPrice.get(moduleKey) ?? 0),
        0,
      );
      items.push({
        key: `management:${industry.key}`,
        type: 'management',
        group: 'مدیریت کسب‌وکار',
        label: `مدیریت ${industry.label}`,
        description: industry.description,
        href: '/dashboard/subscriptions',
        enabled: industry.available !== false,
        price,
        fields: [],
      });
    }
    items.push(
      {
        key: 'biolink',
        type: 'biolink',
        group: 'ساخت و مدیریت',
        label: 'بیولینک',
        description: 'ساخت صفحه‌ی لینک اختصاصی کسب‌وکار.',
        href: '/dashboard/biolinks',
        enabled: true,
        price: 0,
        fields: [],
      },
      {
        key: 'businessCard',
        type: 'businessCard',
        group: 'ساخت و مدیریت',
        label: 'کارت ویزیت',
        description: 'ساخت کارت ویزیت دیجیتال کسب‌وکار.',
        href: '/dashboard/business-cards',
        enabled: true,
        price: 0,
        fields: [],
      },
    );
    return { items };
  }

  /** Replace the step list (admin). Order of the array is the display order. */
  async setSteps(
    steps: OnboardingStepDto[],
    actorId?: string,
  ): Promise<OnboardingStepDef[]> {
    const moduleSteps = steps.filter((step) => step.kind === 'module');
    if (moduleSteps.length > 0) {
      const catalog = await this.getModuleCatalog();
      const validKeys = new Set(catalog.items.map((item) => item.key));
      for (const step of moduleSteps) {
        const key = (step.moduleKey ?? '').trim();
        if (!key) {
          throw new BadRequestException(
            'برای مرحله‌ی ماژول، ماژول یا محصول موردنظر را انتخاب کنید.',
          );
        }
        if (!validKeys.has(key)) {
          throw new BadRequestException(
            `ماژول انتخاب‌شده «${key}» در کتابخانه‌ی «شروع آسان» یافت نشد.`,
          );
        }
      }
    }
    const clean = this.sanitize(steps);
    if (clean.length === 0) {
      throw new BadRequestException('حداقل یک مرحله لازم است.');
    }
    await this.prisma.setting.upsert({
      where: { key: ONBOARDING_STEPS_SETTING_KEY },
      create: { key: ONBOARDING_STEPS_SETTING_KEY, value: JSON.stringify(clean) },
      update: { value: JSON.stringify(clean) },
    });
    await this.activity.log({
      actor: actorId ? { id: actorId } : null,
      action: 'ONBOARDING_STEPS_UPDATED',
      summary: `مراحل «شروع آسان» به‌روزرسانی شد (${clean.length} مرحله)`,
      entityType: 'SETTING',
      entityId: ONBOARDING_STEPS_SETTING_KEY,
    });
    return clean;
  }

  /** Steps + the signed-in user's progress. */
  async getMyProgress(userId: string): Promise<OnboardingProgressPayload> {
    await this.settings.assertFeatureEnabled(
      'featureOnboarding',
      'بخش «شروع آسان» موقتاً توسط مدیر غیرفعال شده است.',
    );
    const steps = (await this.getSteps()).filter((step) => step.enabled);
    const identityStep = steps.find((step) => step.kind === 'identity');
    const identityBundle = await this.zohal.identityBundleQuote();
    // The identity inquiry is only mandatory when its step is enabled and not
    // marked optional, and the underlying Shahkar/identity services are on.
    // A disabled or optional-skipped step must not keep the invoice/approval
    // steps open forever.
    const identityRequired = Boolean(
      identityStep && !identityStep.optional && identityBundle.available,
    );
    const identity = await this.identityState(userId);
    // The business step now runs before identity and creates the workspace
    // itself (name/industry/draft only, no card or biolink). We still ensure
    // the default plan is assigned for accounts that predate that rule.
    await this.subscriptions.limitsForUser(userId);
    const hasModuleSteps = steps.some(
      (step) => step.kind === 'module' && step.moduleKey,
    );
    const [
      done,
      history,
      documents,
      business,
      finished,
      moduleCatalog,
      stepDataRows,
      cartRow,
      resultRows,
      pendingModulePayment,
    ] = await Promise.all([
      this.completionMap(userId, { identityRequired }),
      this.prisma.identityInquiryLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      this.documentsState(userId),
      this.businessState(userId),
      this.prisma.onboardingStepCompletion.findUnique({
        where: {
          userId_stepId: {
            userId,
            stepId: ONBOARDING_FINISHED_STEP_ID,
          },
        },
        select: { stepId: true },
      }),
      hasModuleSteps
        ? this.getModuleCatalog()
        : Promise.resolve({ items: [] as OnboardingModuleOption[] }),
      this.prisma.setting.findMany({
        where: {
          key: { startsWith: `${ONBOARDING_STEP_DATA_PREFIX}${userId}:` },
        },
      }),
      this.prisma.setting.findUnique({
        where: { key: this.cartKey(userId) },
      }),
      this.prisma.setting.findMany({
        where: {
          key: { startsWith: `${ONBOARDING_MODULE_RESULT_PREFIX}${userId}:` },
        },
      }),
      this.prisma.subscriptionPayment.findFirst({
        where: {
          userId,
          status: PaymentStatus.PAID,
          moduleAmount: { gt: 0 },
          moduleConsumedAt: null,
        },
        select: { id: true },
      }),
    ]);
    const moduleByKey = new Map(
      moduleCatalog.items.map((item) => [item.key, item]),
    );
    const stepData = new Map<string, Record<string, unknown>>();
    for (const row of stepDataRows) {
      const stepId = row.key.slice(
        `${ONBOARDING_STEP_DATA_PREFIX}${userId}:`.length,
      );
      try {
        const parsed = JSON.parse(row.value) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          stepData.set(stepId, parsed as Record<string, unknown>);
        }
      } catch {
        // Ignore malformed rows; the form simply starts empty.
      }
    }
    const stepResults = new Map<string, unknown>();
    for (const row of resultRows) {
      const stepId = row.key.slice(
        `${ONBOARDING_MODULE_RESULT_PREFIX}${userId}:`.length,
      );
      try {
        stepResults.set(stepId, JSON.parse(row.value) as unknown);
      } catch {
        // Ignore malformed rows.
      }
    }
    const states: OnboardingStepState[] = steps.map((step) => {
      const isDone = done.get(step.id) ?? false;
      const module =
        step.kind === 'module' && step.moduleKey
          ? moduleByKey.get(step.moduleKey)
          : null;
      return {
        ...step,
        done: isDone,
        hint: this.hintFor(step, isDone),
        module: module
          ? ({
              key: module.key,
              type: module.type,
              label: module.label,
              description: module.description,
              href: module.href,
              price: module.price,
              fields: this.resolveModuleFields(
                module.fields ?? [],
                step.fieldOverrides,
                identity,
              ),
            } satisfies OnboardingModuleInfo)
          : null,
        data: stepData.get(step.id) ?? null,
        result: stepResults.get(step.id) ?? null,
      };
    });
    const completed = states.filter((step) => step.done).length;
    // A module step can be removed/disabled by the admin after the user added
    // it to the cart. Drop those stale entries so the invoice never charges
    // for a step that no longer exists in the wizard.
    const activeModuleStepIds = new Set(
      states
        .filter((step) => step.kind === 'module' && step.moduleKey)
        .map((step) => step.id),
    );
    const storedCart = this.parseCart(cartRow?.value);
    const cart = storedCart.filter((item) =>
      activeModuleStepIds.has(item.stepId),
    );
    if (cart.length !== storedCart.length) {
      await this.writeCart(userId, cart);
    }
    return {
      steps: states,
      completed,
      total: states.length,
      currentStepId: states.find((step) => !step.done)?.id ?? null,
      identity,
      history,
      documents,
      business,
      finished: Boolean(finished),
      cart,
      cartTotal: cart.reduce((sum, item) => sum + item.amount, 0),
      pendingModuleDelivery: Boolean(pendingModulePayment),
    };
  }

  /**
   * Run the identity inquiry that was paid together with a subscription
   * checkout. Idempotent: the payment is marked consumed, so a reload never
   * runs (or charges) it again. A failed inquiry is consumed too — the wizard
   * warns that a wrong national code / birth date needs a new paid attempt.
   */
  async runPendingIdentity(userId: string) {
    const payment = await this.prisma.subscriptionPayment.findFirst({
      where: {
        userId,
        identityAmount: { gt: 0 },
        status: PaymentStatus.PAID,
        identityConsumedAt: null,
      },
      orderBy: { paidAt: 'desc' },
      select: { id: true, identityData: true },
    });
    if (!payment) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          identityVerifiedAt: true,
          businessLicenseVerifiedAt: true,
        },
      });
      return {
        ran: false,
        success: Boolean(user?.identityVerifiedAt),
        businessLicenseVerified: Boolean(user?.businessLicenseVerifiedAt),
        message: null as string | null,
      };
    }
    const data = (payment.identityData ?? {}) as {
      nationalCode?: string | null;
      birthDate?: string | null;
      withLicense?: boolean;
      licenseTrackingCode?: string | null;
    };
    try {
      const result = await this.profile.runPaidIdentityBundle(userId, data);
      await this.prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: { identityConsumedAt: new Date() },
      });
      return {
        ran: true,
        success: true,
        businessLicenseVerified: result.businessLicenseVerified,
        message:
          result.businessLicenseMessage ?? 'استعلام هویت با موفقیت انجام شد.',
      };
    } catch (error) {
      await this.prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: { identityConsumedAt: new Date() },
      });
      return {
        ran: true,
        success: false,
        businessLicenseVerified: false,
        message:
          error instanceof Error
            ? error.message
            : 'استعلام هویت انجام نشد؛ لطفاً اطلاعات را اصلاح و دوباره تلاش کنید.',
      };
    }
  }

  /** Record that the user finished the wizard (idempotent). */
  async finish(userId: string): Promise<OnboardingProgressPayload> {
    await this.settings.assertFeatureEnabled(
      'featureOnboarding',
      'بخش «شروع آسان» موقتاً توسط مدیر غیرفعال شده است.',
    );
    await this.prisma.onboardingStepCompletion.upsert({
      where: {
        userId_stepId: { userId, stepId: ONBOARDING_FINISHED_STEP_ID },
      },
      create: { userId, stepId: ONBOARDING_FINISHED_STEP_ID },
      update: { completedAt: new Date() },
    });
    return this.getMyProgress(userId);
  }

  /**
   * «مرحله ۲»: create/update the workspace from the business form. Only the
   * workspace is created — no business card or biolink — and the raw draft is
   * kept on it so the card builder can prefill later.
   */
  async saveBusiness(
    userId: string,
    dto: SaveOnboardingBusinessDto,
  ): Promise<OnboardingProgressPayload> {
    await this.settings.assertFeatureEnabled(
      'featureOnboarding',
      'بخش «شروع آسان» موقتاً توسط مدیر غیرفعال شده است.',
    );
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('عنوان کسب‌وکار الزامی است.');
    }
    const category = dto.businessId
      ? await this.prisma.businessCategory.findUnique({
          where: { id: dto.businessId },
          select: { name: true },
        })
      : null;
    // Prefer the admin-defined category → management link; fall back to the
    // legacy keyword mapping only when no link exists yet.
    const industryKey = await this.modules.managementKeyForCategory(
      dto.businessId ?? null,
      category?.name ?? null,
    );
    const primaryMobile = dto.mobile
      ? OtpService.normalizePhone(dto.mobile)
      : null;
    const additionalMobiles = Array.from(
      new Set(
        (dto.additionalMobiles ?? [])
          .map((value) => OtpService.normalizePhone(value))
          .filter((value) => value !== primaryMobile),
      ),
    );
    // The business step only collects the numbers. Before the identity step
    // there is no national code yet, so the numbers stay pending and are
    // verified with Shahkar when the identity inquiry runs. A user who already
    // has a national code (identity done) gets every new number checked now.
    const owner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { nationalCode: true },
    });
    if (owner?.nationalCode) {
      await this.profile.verifyBusinessPhones(
        userId,
        owner.nationalCode,
        [...(primaryMobile ? [primaryMobile] : []), ...additionalMobiles],
        { throwOnFailure: true },
      );
    }
    const onboardingData: Record<string, unknown> = { name };
    for (const key of ['cityId', 'businessId', 'address', 'fullName'] as const) {
      const value = dto[key]?.trim();
      if (value) onboardingData[key] = value;
    }
    if (primaryMobile) onboardingData.mobile = primaryMobile;
    onboardingData.additionalMobiles = additionalMobiles;
    await this.modules.upsertOnboardingBusiness(userId, {
      name,
      industryKey,
      onboardingData: onboardingData as Prisma.InputJsonValue,
    });
    return this.getMyProgress(userId);
  }

  /** The documents the user uploaded for the blue-tick review (newest first). */
  private async documentsState(userId: string): Promise<OnboardingDocument[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { documents: true },
    });
    return this.parseDocuments(user?.documents);
  }

  /** The business draft captured by the onboarding business step, if any. */
  private async businessState(
    userId: string,
  ): Promise<OnboardingBusinessState | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        fullName: true,
        businessWorkspaces: {
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            name: true,
            industryKey: true,
            onboardingData: true,
            isPlaceholder: true,
          },
        },
      },
    });
    const fallbackName =
      [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
      user?.fullName ||
      'کسب‌وکار من';
    const isPlaceholder = (workspace: {
      name: string;
      onboardingData: unknown;
      isPlaceholder: boolean;
    }) =>
      workspace.isPlaceholder ||
      (workspace.onboardingData == null &&
        (workspace.name.trim() === 'کسب‌وکار من' ||
          workspace.name.trim() === fallbackName.trim()));
    const workspace =
      user?.businessWorkspaces.find((row) => !isPlaceholder(row)) ??
      user?.businessWorkspaces[0];
    if (!workspace) return null;
    const industry = await this.modules.managementLabel(workspace.industryKey);
    const draft =
      workspace.onboardingData && typeof workspace.onboardingData === 'object'
        ? (workspace.onboardingData as Record<string, unknown>)
        : {};
    return {
      id: workspace.id,
      name: workspace.name,
      industryKey: workspace.industryKey,
      industryLabel: industry,
      cityId: typeof draft.cityId === 'string' ? draft.cityId : null,
      businessId: typeof draft.businessId === 'string' ? draft.businessId : null,
      mobile: typeof draft.mobile === 'string' ? draft.mobile : null,
      additionalMobiles: Array.isArray(draft.additionalMobiles)
        ? draft.additionalMobiles.filter(
            (value): value is string => typeof value === 'string',
          )
        : [],
      address: typeof draft.address === 'string' ? draft.address : null,
      fullName: typeof draft.fullName === 'string' ? draft.fullName : null,
    };
  }

  private parseDocuments(value: unknown): OnboardingDocument[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((entry): entry is OnboardingDocument => {
        if (!entry || typeof entry !== 'object') return false;
        const doc = entry as Record<string, unknown>;
        return typeof doc.url === 'string' && typeof doc.id === 'string';
      })
      .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
  }

  /** Attach an already-uploaded file to the account's document list. */
  async addDocument(userId: string, dto: AddOnboardingDocumentDto) {
    await this.settings.assertFeatureEnabled(
      'featureOnboarding',
      'بخش «شروع آسان» موقتاً توسط مدیر غیرفعال شده است.',
    );
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { documents: true },
    });
    const documents = this.parseDocuments(user?.documents);
    const doc: OnboardingDocument = {
      id: crypto.randomUUID(),
      name: dto.name?.trim() || 'مدرک',
      url: dto.url,
      size: dto.size ?? 0,
      contentType: dto.contentType ?? '',
      uploadedAt: new Date().toISOString(),
    };
    await this.prisma.user.update({
      where: { id: userId },
      data: { documents: [...documents, doc] as unknown as object },
    });
    return this.getMyProgress(userId);
  }

  /** Remove one uploaded document from the account. */
  async removeDocument(userId: string, documentId: string) {
    await this.settings.assertFeatureEnabled(
      'featureOnboarding',
      'بخش «شروع آسان» موقتاً توسط مدیر غیرفعال شده است.',
    );
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { documents: true },
    });
    const documents = this.parseDocuments(user?.documents).filter(
      (doc) => doc.id !== documentId,
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: { documents: documents as unknown as object },
    });
    return this.getMyProgress(userId);
  }

  /** The identity fields currently stored on the account (read-only snapshot). */
  private async identityState(userId: string) {
    const [user, latestLicense] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          phone: true,
          fullName: true,
          nationalCode: true,
          birthDate: true,
          firstName: true,
          lastName: true,
          fatherName: true,
          phoneMatchVerifiedAt: true,
          identityVerifiedAt: true,
          businessLicenseVerifiedAt: true,
        },
      }),
      this.prisma.identityInquiryLog.findFirst({
        where: { userId, kind: IdentityInquiryKind.BUSINESS_LICENSE },
        orderBy: { createdAt: 'desc' },
        select: {
          status: true,
          matched: true,
          message: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
      }),
    ]);
    const licenseOwnerName =
      [latestLicense?.firstName, latestLicense?.lastName]
        .filter(Boolean)
        .join(' ') || null;
    return {
      phone: user?.phone ?? null,
      fullName: user?.fullName ?? null,
      nationalCode: user?.nationalCode ?? null,
      birthDate: user?.birthDate ?? null,
      firstName: user?.firstName ?? null,
      lastName: user?.lastName ?? null,
      fatherName: user?.fatherName ?? null,
      phoneMatched: Boolean(user?.phoneMatchVerifiedAt),
      verified: Boolean(user?.identityVerifiedAt),
      businessLicenseVerified: Boolean(user?.businessLicenseVerifiedAt),
      businessLicenseStatus: user?.businessLicenseVerifiedAt
        ? 'SUCCESS'
        : (latestLicense?.status ?? null),
      businessLicenseMessage: user?.businessLicenseVerifiedAt
        ? null
        : (latestLicense?.message ?? null),
      businessLicenseOwnerName: licenseOwnerName,
      businessLicenseCheckedAt: latestLicense?.createdAt ?? null,
    };
  }

  /**
   * One-time repair for accounts that hold identity data but no verification
   * flags (e.g. captured by the legacy manual profile form). It sets the flags
   * from the stored data and appends a `CACHED` history row, so the wizard
   * stops asking those users to pay for an inquiry that already happened.
   */
  private async backfillIdentityState(): Promise<void> {
    const markerKey = 'identityStateBackfillV1';
    const marker = await this.prisma.setting.findUnique({
      where: { key: markerKey },
    });
    if (marker) return;

    const users = await this.prisma.user.findMany({
      where: { nationalCode: { not: null }, birthDate: { not: null } },
      select: {
        id: true,
        nationalCode: true,
        birthDate: true,
        firstName: true,
        lastName: true,
        fullName: true,
        phoneMatchVerifiedAt: true,
        identityVerifiedAt: true,
      },
    });

    for (const user of users) {
      const data: {
        phoneMatchVerifiedAt?: Date;
        firstName?: string;
        lastName?: string;
        fullName?: string;
        identityVerifiedAt?: Date;
      } = {};
      let first = user.firstName?.trim() ?? '';
      let last = user.lastName?.trim() ?? '';
      if ((!first || !last) && user.fullName?.trim()) {
        const parts = user.fullName.trim().split(/\s+/);
        if (parts.length > 1) {
          first = first || parts[0];
          last = last || parts.slice(1).join(' ');
        } else if (!first) {
          first = parts[0];
        }
      }
      const matched = !user.phoneMatchVerifiedAt;
      const verified =
        !user.identityVerifiedAt && Boolean(first) && Boolean(last);
      if (!matched && !verified) continue;

      const now = new Date();
      if (matched) data.phoneMatchVerifiedAt = now;
      if (verified) {
        data.firstName = first;
        data.lastName = last;
        data.fullName = `${first} ${last}`;
        data.identityVerifiedAt = now;
      }
      await this.prisma.user.update({ where: { id: user.id }, data });

      const common = {
        userId: user.id,
        status: 'CACHED' as const,
        nationalCode: user.nationalCode,
        birthDate: user.birthDate,
        matched: true,
        message: 'بازیابی از اطلاعات ثبت‌شده‌ی قبلی؛ هزینه‌ی مجدد ثبت نشد.',
      };
      if (matched) {
        await this.prisma.identityInquiryLog.create({
          data: { ...common, kind: 'PHONE_MATCH' },
        });
      }
      if (verified) {
        await this.prisma.identityInquiryLog.create({
          data: {
            ...common,
            kind: 'IDENTITY_INQUIRY',
            firstName: first,
            lastName: last,
          },
        });
      }
    }

    await this.prisma.setting.upsert({
      where: { key: markerKey },
      create: { key: markerKey, value: new Date().toISOString() },
      update: {},
    });
  }

  /** Tick a custom step off (built-in steps complete automatically). */
  async completeStep(userId: string, stepId: string) {
    await this.settings.assertFeatureEnabled(
      'featureOnboarding',
      'بخش «شروع آسان» موقتاً توسط مدیر غیرفعال شده است.',
    );
    const step = await this.findCustomStep(stepId);
    let module: OnboardingModuleOption | undefined;
    if (step.kind === 'module' && step.moduleKey) {
      const catalog = await this.getModuleCatalog();
      module = catalog.items.find((item) => item.key === step.moduleKey);
      if (module && module.fields.length > 0) {
        throw new BadRequestException(
          'این مرحله فرم اطلاعات دارد؛ اطلاعات خواسته‌شده را پر و ثبت کنید.',
        );
      }
    }
    await this.prisma.onboardingStepCompletion.upsert({
      where: { userId_stepId: { userId, stepId: step.id } },
      create: { userId, stepId: step.id },
      update: { completedAt: new Date() },
    });
    await this.syncCartForStep(userId, step, module);
    return this.getMyProgress(userId);
  }

  /**
   * Value of an account field used to prefill a module input, or an empty
   * string when the account does not have it yet.
   */
  private prefillValue(
    source: OnboardingFieldPrefill,
    identity: {
      phone?: string | null;
      fullName?: string | null;
      nationalCode?: string | null;
      birthDate?: string | null;
      firstName?: string | null;
      lastName?: string | null;
    },
  ): string {
    switch (source) {
      case 'userMobile':
        return identity.phone ?? '';
      case 'userNationalCode':
        return identity.nationalCode ?? '';
      case 'userBirthDate':
        return identity.birthDate ?? '';
      case 'userFullName':
        return (
          [identity.firstName, identity.lastName].filter(Boolean).join(' ') ||
          identity.fullName ||
          ''
        );
      default:
        return '';
    }
  }

  /**
   * Merge the admin's per-step `fieldOverrides` into a module's built-in form
   * fields and resolve any account-based prefill. The result is what the wizard
   * renders (and what {@link saveModuleStepData} validates against).
   */
  private resolveModuleFields(
    fields: OnboardingModuleField[],
    overrides: Record<string, OnboardingFieldOverride> | undefined,
    identity: {
      phone?: string | null;
      fullName?: string | null;
      nationalCode?: string | null;
      birthDate?: string | null;
      firstName?: string | null;
      lastName?: string | null;
    },
  ): OnboardingModuleField[] {
    return fields.map((field) => {
      const defaults: OnboardingModuleField =
        field.type === 'date' ? { ...field, datePicker: true } : { ...field };
      const override = overrides?.[field.name];
      if (!override) return defaults;
      const resolved: OnboardingModuleField = {
        ...defaults,
        ...(override.label !== undefined ? { label: override.label } : {}),
        ...(override.placeholder !== undefined
          ? { placeholder: override.placeholder }
          : {}),
        ...(override.required !== undefined
          ? { required: override.required }
          : {}),
        ...(override.readonly !== undefined
          ? { readonly: override.readonly }
          : {}),
        ...(override.datePicker !== undefined
          ? { datePicker: override.datePicker }
          : {}),
        ...(override.options?.length ? { options: override.options } : {}),
      };
      if (override.prefill) {
        const value = this.prefillValue(override.prefill, identity);
        if (value) resolved.value = value;
      }
      return resolved;
    });
  }

  /**
   * Save the inputs of a `module` step (an inquiry the admin placed in the
   * wizard) and mark it done. Only known fields are stored, and required ones
   * must be present, so the form cannot be completed with missing data.
   */
  async saveModuleStepData(
    userId: string,
    stepId: string,
    data: SaveOnboardingStepDataDto['data'],
  ) {
    await this.settings.assertFeatureEnabled(
      'featureOnboarding',
      'بخش «شروع آسان» موقتاً توسط مدیر غیرفعال شده است.',
    );
    const step = await this.findCustomStep(stepId);
    if (step.kind !== 'module' || !step.moduleKey) {
      throw new BadRequestException('این مرحله فرم اطلاعات ندارد.');
    }
    const catalog = await this.getModuleCatalog();
    const module = catalog.items.find((item) => item.key === step.moduleKey);
    if (!module) {
      throw new NotFoundException('ماژول این مرحله یافت نشد.');
    }
    const identity = await this.identityState(userId);
    const fields = this.resolveModuleFields(
      module.fields,
      step.fieldOverrides,
      identity,
    );
    const clean: Record<string, unknown> = {};
    for (const field of fields) {
      // A locked, account-prefilled field ignores whatever the client sent.
      const raw =
        field.readonly && field.value !== undefined
          ? field.value
          : (data?.[field.name] ?? field.value);
      const value =
        typeof raw === 'string' ? raw.trim() : raw;
      if (
        field.required &&
        (value === undefined || value === null || value === '')
      ) {
        throw new BadRequestException(`مقدار «${field.label}» الزامی است.`);
      }
      if (value !== undefined && value !== null && value !== '') {
        if (
          field.options?.length &&
          !field.options.some((option) => option.value === String(value))
        ) {
          throw new BadRequestException(
            `مقدار «${field.label}» یکی از گزینه‌های مجاز نیست.`,
          );
        }
        if (
          field.type === 'boolean' &&
          value !== true &&
          value !== false &&
          value !== 'true' &&
          value !== 'false'
        ) {
          throw new BadRequestException(
            `مقدار «${field.label}» باید بله یا خیر باشد.`,
          );
        }
      }
      if (value !== undefined && value !== null && value !== '') {
        clean[field.name] = value;
      }
    }
    await this.prisma.setting.upsert({
      where: { key: this.stepDataKey(userId, step.id) },
      create: {
        key: this.stepDataKey(userId, step.id),
        value: JSON.stringify(clean),
      },
      update: { value: JSON.stringify(clean) },
    });
    await this.prisma.onboardingStepCompletion.upsert({
      where: { userId_stepId: { userId, stepId: step.id } },
      create: { userId, stepId: step.id },
      update: { completedAt: new Date() },
    });
    await this.syncCartForStep(userId, step, module);
    return this.getMyProgress(userId);
  }

  private stepDataKey(userId: string, stepId: string) {
    return `${ONBOARDING_STEP_DATA_PREFIX}${userId}:${stepId}`;
  }

  private cartKey(userId: string) {
    return `${ONBOARDING_CART_PREFIX}${userId}`;
  }

  private normaliseCartItems(parsed: unknown): OnboardingCartItem[] {
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is OnboardingCartItem =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as OnboardingCartItem).stepId === 'string' &&
        typeof (item as OnboardingCartItem).moduleKey === 'string' &&
        typeof (item as OnboardingCartItem).label === 'string' &&
        typeof (item as OnboardingCartItem).amount === 'number',
    );
  }

  private parseCart(value: string | undefined): OnboardingCartItem[] {
    if (!value) return [];
    try {
      return this.normaliseCartItems(JSON.parse(value));
    } catch {
      return [];
    }
  }

  private async readCart(userId: string): Promise<OnboardingCartItem[]> {
    const row = await this.prisma.setting.findUnique({
      where: { key: this.cartKey(userId) },
    });
    return this.parseCart(row?.value);
  }

  private async writeCart(userId: string, items: OnboardingCartItem[]) {
    if (items.length === 0) {
      await this.prisma.setting.deleteMany({
        where: { key: this.cartKey(userId) },
      });
      return;
    }
    await this.prisma.setting.upsert({
      where: { key: this.cartKey(userId) },
      create: { key: this.cartKey(userId), value: JSON.stringify(items) },
      update: { value: JSON.stringify(items) },
    });
  }

  /**
   * Add a priced module step to the user's cart when it is used, or drop it
   * when the step is free/not a module. Called on every completion so the cart
   * always matches what the user actually opted into.
   */
  private async syncCartForStep(
    userId: string,
    step: OnboardingStepDef,
    module?: OnboardingModuleOption,
  ) {
    const cart = await this.readCart(userId);
    const without = cart.filter((item) => item.stepId !== step.id);
    if (
      step.kind === 'module' &&
      step.moduleKey &&
      module &&
      module.price > 0 &&
      // Plans and management packages are already charged by their own
      // dedicated steps; only inquiry modules are extra cart items.
      (module.type === 'apiir' || module.type === 'zohal')
    ) {
      without.push({
        stepId: step.id,
        moduleKey: module.key,
        type: module.type,
        label: module.label,
        amount: module.price,
      });
    }
    await this.writeCart(userId, without);
  }

  /** Undo a custom step tick. */
  async uncompleteStep(userId: string, stepId: string) {
    await this.settings.assertFeatureEnabled(
      'featureOnboarding',
      'بخش «شروع آسان» موقتاً توسط مدیر غیرفعال شده است.',
    );
    const step = await this.findCustomStep(stepId);
    await this.prisma.onboardingStepCompletion.deleteMany({
      where: { userId, stepId: step.id },
    });
    await this.prisma.setting.deleteMany({
      where: { key: this.stepDataKey(userId, step.id) },
    });
    const cart = await this.readCart(userId);
    await this.writeCart(
      userId,
      cart.filter((item) => item.stepId !== step.id),
    );
    return this.getMyProgress(userId);
  }

  private async readStepData(
    userId: string,
    stepId: string,
  ): Promise<Record<string, unknown>> {
    const row = await this.prisma.setting.findUnique({
      where: { key: this.stepDataKey(userId, stepId) },
    });
    if (!row?.value) return {};
    try {
      const parsed = JSON.parse(row.value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  /**
   * Run the paid module inquiries after the onboarding invoice was settled.
   * Only api.ir/Zohal modules are executable here; other module types are
   * delivered by their own flows. Idempotent: the payment is marked consumed
   * and the cart cleared, so a reload never runs (or charges) twice.
   */
  async deliverPaidCart(userId: string) {
    await this.settings.assertFeatureEnabled(
      'featureOnboarding',
      'بخش «شروع آسان» موقتاً توسط مدیر غیرفعال شده است.',
    );
    const payment = await this.prisma.subscriptionPayment.findFirst({
      where: {
        userId,
        status: PaymentStatus.PAID,
        moduleAmount: { gt: 0 },
        moduleConsumedAt: null,
      },
      orderBy: { paidAt: 'desc' },
    });
    if (!payment) {
      return { delivered: 0, results: [] as Array<{ stepId: string; ok: boolean }> };
    }
    const items = this.normaliseCartItems(payment.moduleItems);
    const results: Array<{ stepId: string; ok: boolean }> = [];
    for (const item of items) {
      const separator = item.moduleKey.indexOf(':');
      const prefix = separator < 0 ? '' : item.moduleKey.slice(0, separator);
      const rest = separator < 0 ? '' : item.moduleKey.slice(separator + 1);
      if (!rest || (prefix !== 'apiir' && prefix !== 'zohal')) {
        continue;
      }
      const isComposite = rest.startsWith('composite:');
      const key = isComposite ? rest.slice('composite:'.length) : rest;
      if (!key) continue;
      const payload = await this.readStepData(userId, item.stepId);
      try {
        let ok: boolean;
        let result: unknown;
        if (isComposite) {
          // Composite items run every underlying module in the admin-defined
          // order.
          const composite =
            prefix === 'apiir'
              ? await this.apiir.runComposite(key, payload, { userId })
              : await this.zohal.runComposite(key, payload, { userId });
          ok = composite.ok;
          result = composite;
        } else {
          const call =
            prefix === 'apiir'
              ? await this.apiir.call(key, payload, { userId })
              : await this.zohal.call(key, payload, { userId });
          ok = call.ok;
          result = call;
        }
        const resultKey = `${ONBOARDING_MODULE_RESULT_PREFIX}${userId}:${item.stepId}`;
        await this.prisma.setting.upsert({
          where: { key: resultKey },
          create: { key: resultKey, value: JSON.stringify(result) },
          update: { value: JSON.stringify(result) },
        });
        results.push({ stepId: item.stepId, ok });
      } catch {
        results.push({ stepId: item.stepId, ok: false });
      }
    }
    await this.prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: { moduleConsumedAt: new Date() },
    });
    await this.writeCart(userId, []);
    return { delivered: results.length, results };
  }

  /**
   * Record that the user picked a plan (including the free one) in step 4.
   * The plan itself is activated by the single invoice payment; this marker
   * only lets the free-plan choice count as a completed step, since the free
   * plan is otherwise assigned automatically at registration.
   */
  async selectPlan(userId: string, planId?: string) {
    await this.settings.assertFeatureEnabled(
      'featureOnboarding',
      'بخش «شروع آسان» موقتاً توسط مدیر غیرفعال شده است.',
    );
    const plan = planId
      ? await this.prisma.subscriptionPlan.findUnique({
          where: { id: planId },
          select: { name: true },
        })
      : null;
    // The free plan is assigned automatically, so only an explicit free choice
    // is recorded separately; a paid plan still needs its payment to settle.
    const stepId = plan && isFreePlan(plan) ? 'plan:free' : 'plan';
    await this.prisma.onboardingStepCompletion.upsert({
      where: { userId_stepId: { userId, stepId } },
      create: { userId, stepId },
      update: { completedAt: new Date() },
    });
    return this.getMyProgress(userId);
  }

  private async findCustomStep(stepId: string): Promise<OnboardingStepDef> {
    const steps = await this.getSteps();
    const step = steps.find((entry) => entry.id === stepId && entry.enabled);
    if (!step) throw new NotFoundException('مرحله یافت نشد');
    if (!MANUAL_KINDS.has(step.kind)) {
      throw new BadRequestException(
        'این مرحله به‌صورت خودکار تکمیل می‌شود و تیک دستی ندارد.',
      );
    }
    return step;
  }

  /**
   * One map of step id → done. Built-in rules read the user's account once;
   * custom steps read the manual completion rows.
   */
  private async completionMap(
    userId: string,
    options?: { identityRequired?: boolean },
  ): Promise<Map<string, boolean>> {
    const [user, completions] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          lastName: true,
          fullName: true,
          identityVerifiedAt: true,
          blueTickRequestedAt: true,
          verifiedAt: true,
          planId: true,
          planExpiresAt: true,
          plan: { select: { name: true, price: true } },
          documents: true,
          businessCards: {
            select: {
              status: true,
              bio: true,
              phone: true,
              mobile: true,
              cityId: true,
              businessId: true,
              instagram: true,
              telegram: true,
              whatsapp: true,
              website: true,
            },
          },
          businessWorkspaces: {
            select: {
              id: true,
              name: true,
              industryKey: true,
              onboardingData: true,
              isPlaceholder: true,
              modules: { select: { paidUntil: true } },
            },
          },
        },
      }),
      this.prisma.onboardingStepCompletion.findMany({
        where: { userId },
        select: { stepId: true },
      }),
    ]);
    const map = new Map<string, boolean>();
    for (const completion of completions) map.set(completion.stepId, true);
    if (!user) return map;

    const cards = user.businessCards;
    const now = Date.now();
    const fallbackName =
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.fullName ||
      'کسب‌وکار من';
    const isPlaceholder = (workspace: {
      name: string;
      onboardingData: unknown;
      isPlaceholder: boolean;
    }) =>
      workspace.isPlaceholder ||
      (workspace.onboardingData == null &&
        (workspace.name.trim() === 'کسب‌وکار من' ||
          workspace.name.trim() === fallbackName.trim()));
    const realWorkspace = user.businessWorkspaces.find(
      (workspace) => !isPlaceholder(workspace),
    );
    map.set('identity', Boolean(user.identityVerifiedAt));
    map.set(
      'business',
      cards.length > 0 || Boolean(realWorkspace),
    );
    map.set('details', cards.some((card) => this.detailsComplete(card)));
    map.set(
      'documents',
      Boolean(user.blueTickRequestedAt || user.verifiedAt) ||
        this.parseDocuments(user.documents).length > 0,
    );
    // The plan step sells Eco/Plus *and* the free plan. The free plan is
    // assigned automatically at registration, so it only counts as done once
    // the user explicitly picks a plan in the wizard (recorded as a manual
    // completion) — otherwise step 4 would be skipped for every new account.
    const paidPlanActive =
      Boolean(user.plan) &&
      !isFreePlan(user.plan) &&
      Boolean(user.planExpiresAt && user.planExpiresAt.getTime() > now);
    const planChosen = completions.some((row) => row.stepId === 'plan');
    const freePlanChosen = completions.some((row) => row.stepId === 'plan:free');
    const freePlanActive =
      Boolean(user.plan) &&
      isFreePlan(user.plan) &&
      Boolean(user.planExpiresAt && user.planExpiresAt.getTime() > now);
    map.set('plan', paidPlanActive || planChosen || freePlanChosen);

    // The management step is optional: it is done once the workspace has a
    // paid package, or when its industry has no package to buy.
    const workspace = realWorkspace ?? user.businessWorkspaces[0];
    let managementDone = false;
    if (workspace) {
      const catalog = await this.modules.resolveCatalog();
      const packageAvailable = catalog.industries.some(
        (item) => item.key === workspace.industryKey && item.available,
      );
      managementDone =
        !packageAvailable ||
        workspace.modules.some(
          (row) => row.paidUntil && row.paidUntil.getTime() > now,
        );
    }
    map.set('management', managementDone);

    // The invoice is settled once the paid plan is active and, when the
    // identity step is mandatory, the identity inquiry has been completed.
    // Optional or disabled identity steps do not block the final steps.
    const identityRequired = options?.identityRequired ?? true;
    const identityDone = Boolean(user.identityVerifiedAt);
    const identitySettled = !identityRequired || identityDone;
    const planSettled = paidPlanActive || (freePlanChosen && freePlanActive);
    map.set('invoice', planSettled && identitySettled);
    map.set(
      'approval',
      identitySettled && planSettled,
    );
    return map;
  }

  /** A card counts as «complete» once the public profile has real content. */
  private detailsComplete(card: {
    bio: string | null;
    phone: string | null;
    mobile: string | null;
    cityId: string | null;
    businessId: string | null;
    instagram: string | null;
    telegram: string | null;
    whatsapp: string | null;
    website: string | null;
  }): boolean {
    const hasContact = Boolean(card.phone || card.mobile);
    const hasSocial = Boolean(
      card.instagram || card.telegram || card.whatsapp || card.website,
    );
    return Boolean(card.bio) && hasContact && Boolean(card.cityId) &&
      Boolean(card.businessId) && hasSocial;
  }

  private hintFor(step: OnboardingStepDef, done: boolean): string {
    if (done) return 'تکمیل شد';
    switch (step.kind) {
      case 'identity':
        return 'در انتظار استعلام هویت';
      case 'business':
        return 'در انتظار ساخت کسب‌وکار';
      case 'details':
        return 'در انتظار تکمیل مشخصات';
      case 'documents':
        return 'در انتظار ارسال مدارک';
      case 'plan':
        return 'در انتظار خرید اشتراک اکو یا بلاس';
      case 'management':
        return 'در انتظار انتخاب بسته مدیریت (اختیاری)';
      case 'invoice':
        return 'در انتظار پرداخت نهایی';
      case 'approval':
        return 'در انتظار نتیجه استعلام';
      case 'module':
        return 'در انتظار انجام این ماژول';
      case 'welcome':
        return 'تکمیل نشده — برای شروع وارد شوید';
      default:
        return 'انجام نشده';
    }
  }

  /** Normalise admin input: unique ids, one built-in step per kind, order kept. */
  private sanitize(steps: OnboardingStepDto[]): OnboardingStepDef[] {
    const seen = new Set<string>();
    const seenKinds = new Set<OnboardingStepKind>();
    const result: OnboardingStepDef[] = [];
    for (const step of steps) {
      if (!step || !ONBOARDING_STEP_KINDS.includes(step.kind)) continue;
      const title = (step.title ?? '').trim();
      if (!title) continue;
      if (BUILT_IN_KINDS.has(step.kind)) {
        if (seenKinds.has(step.kind)) continue;
        seenKinds.add(step.kind);
      }
      let id = (step.id ?? '').trim();
      if (!BUILT_IN_KINDS.has(step.kind)) {
        id = id || `custom-${Date.now().toString(36)}-${result.length}`;
      } else {
        id = step.kind;
      }
      if (seen.has(id)) continue;
      seen.add(id);
      const href = (step.href ?? '').trim();
      const moduleKey = (step.moduleKey ?? '').trim();
      if (step.kind === 'module' && !moduleKey) continue;
      const fieldOverrides =
        step.kind === 'module'
          ? this.sanitizeFieldOverrides(step.fieldOverrides)
          : undefined;
      result.push({
        id,
        kind: step.kind,
        title,
        description: (step.description ?? '').trim(),
        ...(href ? { href } : {}),
        ...(step.kind === 'module' ? { moduleKey } : {}),
        ...(fieldOverrides ? { fieldOverrides } : {}),
        enabled: step.enabled !== false,
        ...(typeof step.optional === 'boolean'
          ? { optional: step.optional }
          : {}),
      });
    }
    return result;
  }

  /**
   * Keep only well-formed per-field overrides. Unknown keys are dropped, so a
   * stored config stays valid even after a module's form changes.
   */
  private sanitizeFieldOverrides(
    input: unknown,
  ): Record<string, OnboardingFieldOverride> | undefined {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return undefined;
    }
    const result: Record<string, OnboardingFieldOverride> = {};
    for (const [name, rawValue] of Object.entries(
      input as Record<string, unknown>,
    )) {
      const fieldName = name.trim();
      if (!fieldName) continue;
      if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
        continue;
      }
      const raw = rawValue as Record<string, unknown>;
      const override: OnboardingFieldOverride = {};
      if (typeof raw.label === 'string' && raw.label.trim()) {
        override.label = raw.label.trim();
      }
      if (typeof raw.placeholder === 'string') {
        override.placeholder = raw.placeholder.trim();
      }
      if (typeof raw.required === 'boolean') override.required = raw.required;
      if (typeof raw.readonly === 'boolean') override.readonly = raw.readonly;
      if (typeof raw.datePicker === 'boolean') {
        override.datePicker = raw.datePicker;
      }
      if (
        typeof raw.prefill === 'string' &&
        (ONBOARDING_FIELD_PREFILLS as readonly string[]).includes(raw.prefill)
      ) {
        override.prefill = raw.prefill as OnboardingFieldPrefill;
      }
      if (Array.isArray(raw.options)) {
        const options: OnboardingFieldOption[] = [];
        for (const entry of raw.options) {
          if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            continue;
          }
          const option = entry as Record<string, unknown>;
          const value =
            typeof option.value === 'string' ? option.value.trim() : '';
          const label =
            typeof option.label === 'string' ? option.label.trim() : '';
          if (!value || !label) continue;
          options.push({ value, label });
        }
        if (options.length) override.options = options;
      }
      if (Object.keys(override).length > 0) result[fieldName] = override;
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }
}
