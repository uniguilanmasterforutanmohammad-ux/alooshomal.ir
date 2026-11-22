import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  BiolinkStatus,
  IdentityInquiryKind,
  IdentityInquiryStatus,
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
  ONBOARDING_MATCH_SOURCES,
  ONBOARDING_MATCH_MODES,
  isOptionalModuleStepUnused,
  type OnboardingDocument,
  type OnboardingBusinessState,
  type OnboardingCartItem,
  type OnboardingFieldOption,
  type OnboardingFieldOverride,
  type OnboardingFieldPrefill,
  type OnboardingMatchMode,
  type OnboardingMatchRule,
  type OnboardingModuleField,
  type OnboardingModuleInfo,
  type OnboardingModuleResponseField,
  type OnboardingProgressPayload,
  type OnboardingStepDef,
  type OnboardingStepExport,
  type OnboardingStepOnSuccess,
  type OnboardingStepsExport,
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

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Normalises Persian/Arabic digits and letters before comparing values. */
function normalizeIdentityText(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\u200e\u200f]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Loose equality: digits/letters normalised and every whitespace ignored. */
function normalizeMatchValue(value: string | null | undefined): string {
  return normalizeIdentityText(value).replace(/\s+/g, '').toLowerCase();
}

/** Token-wise name comparison so word order/extra spacing does not matter. */
function sameFullName(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const a = normalizeIdentityText(left);
  const b = normalizeIdentityText(right);
  if (!a || !b) return false;
  const leftTokens = a.split(' ').sort();
  const rightTokens = b.split(' ').sort();
  return (
    leftTokens.length === rightTokens.length &&
    leftTokens.every((token, index) => token === rightTokens[index])
  );
}

/**
 * True when a value carries masked characters. `x`/`X` only count as a mask
 * when the value also contains digits, so a name like «Max» is never split.
 */
function hasMaskChars(value: string): boolean {
  if (/[*•●#_]/.test(value)) return true;
  return /\d/.test(value) && /[xX]/.test(value);
}

/**
 * Compare a *masked* provider value (e.g. api.ir returns the license owner's
 * national code as `536****001`) with the expected value. Every visible chunk
 * must appear somewhere in the expected value; the masked middle is ignored.
 * This is deliberately looser than `normalized`/`exact` because the upstream
 * hides digits, but still rejects a value whose visible digits are absent.
 */
function sameMaskedValue(
  actual: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  const rawActual = (actual ?? '').trim();
  const target = normalizeMatchValue(expected);
  if (!rawActual || !target) return false;
  if (!hasMaskChars(rawActual)) {
    return normalizeMatchValue(rawActual) === target;
  }
  const withX = /\d/.test(rawActual);
  const chunks = rawActual
    .split(withX ? /[*•●#_xX]+/ : /[*•●#_]+/)
    .map((chunk) => normalizeMatchValue(chunk))
    .filter(Boolean);
  if (chunks.length === 0) return false;
  // Require at least one meaningful chunk so a fully-masked value never passes.
  if (!chunks.some((chunk) => chunk.length >= 2)) return false;
  return chunks.every((chunk) => target.includes(chunk));
}

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
  /** Response fields the module's inquiry returns (name + example). */
  responseFields: OnboardingModuleResponseField[];
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
   * A self-contained export of every configured «شروع آسان» step: the stored
   * configuration plus each module resolved from the catalog (label, price,
   * built-in form fields, effective fields with the admin's overrides applied,
   * and the comparable response fields). Used by the admin panel to download
   * the whole configuration as JSON.
   */
  async exportSteps(): Promise<OnboardingStepsExport> {
    const [steps, catalog] = await Promise.all([
      this.getSteps(),
      this.getModuleCatalog(),
    ]);
    const moduleByKey = new Map(
      catalog.items.map((item) => [item.key, item] as const),
    );
    const exported: OnboardingStepExport[] = steps.map((step) => {
      const module = step.moduleKey
        ? moduleByKey.get(step.moduleKey)
        : undefined;
      const fields = module?.fields ?? [];
      return {
        id: step.id,
        kind: step.kind,
        title: step.title,
        description: step.description,
        ...(step.href ? { href: step.href } : {}),
        enabled: step.enabled,
        optional: step.optional === true,
        ...(step.moduleKey ? { moduleKey: step.moduleKey } : {}),
        module: module
          ? {
              key: module.key,
              type: module.type,
              label: module.label,
              description: module.description,
              href: module.href,
              price: module.price,
              fields,
              responseFields: module.responseFields ?? [],
              group: module.group,
              enabled: module.enabled,
              composite: module.composite === true,
              resolvedFields: this.resolveModuleFields(
                fields,
                step.fieldOverrides,
                {},
              ),
            }
          : null,
        ...(step.fieldOverrides ? { fieldOverrides: step.fieldOverrides } : {}),
        ...(step.onSuccess ? { onSuccess: step.onSuccess } : {}),
        ...(step.match ? { match: step.match } : {}),
        ...(step.requires ? { requires: step.requires } : {}),
      };
    });
    return {
      schema: 'onboarding-steps/v1',
      exportedAt: new Date().toISOString(),
      count: exported.length,
      steps: exported,
    };
  }

  /**
   * Replace the whole «شروع آسان» configuration from a previously exported
   * document (`{ steps: [...] }`) or a bare step array. The payload is run
   * through the same {@link setSteps} sanitizer/validator as the panel save, so
   * an imported file can never store an unknown kind or an invalid module key;
   * a bad file is rejected with a clear message.
   */
  async importSteps(
    payload: unknown,
    actorId?: string,
  ): Promise<OnboardingStepDef[]> {
    const rawSteps = Array.isArray(payload)
      ? payload
      : payload && typeof payload === 'object' && !Array.isArray(payload)
        ? (payload as { steps?: unknown }).steps
        : null;
    if (!Array.isArray(rawSteps)) {
      throw new BadRequestException(
        'فایل ورودی معتبر نیست؛ آرایه‌ی «steps» پیدا نشد.',
      );
    }
    return this.setSteps(rawSteps as OnboardingStepDto[], actorId);
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
        responseFields: service.responseFields ?? [],
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
        responseFields: [],
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
        responseFields: service.responseFields ?? [],
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
        responseFields: [],
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
        responseFields: [],
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
        responseFields: [],
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
        responseFields: [],
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
        responseFields: [],
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
              responseFields: module.responseFields ?? [],
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
    const stepById = new Map(steps.map((step) => [step.id, step] as const));
    const storedCart = this.parseCart(cartRow?.value);
    const cart = storedCart.filter((item) => {
      if (!activeModuleStepIds.has(item.stepId)) return false;
      // The admin may mark a step optional after the user already used it; an
      // optional step whose inputs are now empty must not stay in the cart.
      return !isOptionalModuleStepUnused(
        stepById.get(item.stepId),
        stepData.get(item.stepId),
      );
    });
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
      return this.identityRunOutcome(userId, null);
    }
    // Atomically claim the paid identity run so a concurrent request (or a
    // page reload mid-flight) can never run — and charge — it twice.
    const claimed = await this.prisma.subscriptionPayment.updateMany({
      where: { id: payment.id, identityConsumedAt: null },
      data: { identityConsumedAt: new Date() },
    });
    if (claimed.count === 0) {
      return this.identityRunOutcome(userId, null);
    }
    const data = (payment.identityData ?? {}) as {
      nationalCode?: string | null;
      birthDate?: string | null;
      withLicense?: boolean;
      licenseTrackingCode?: string | null;
    };
    try {
      const result = await this.profile.runPaidIdentityBundle(userId, data);
      return {
        ran: true,
        success: true,
        businessLicenseVerified: result.businessLicenseVerified,
        message:
          result.businessLicenseMessage ?? 'استعلام هویت با موفقیت انجام شد.',
      };
    } catch (error) {
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

  /**
   * Outcome reported when no paid, unconsumed identity bundle is waiting
   * (either nothing was bought or another request already delivered it); it
   * mirrors the user's current verification state without running anything.
   */
  private async identityRunOutcome(userId: string, message: string | null) {
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
      message,
    };
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
    // Resolve every field first (locked prefills ignore the client), so we can
    // tell whether an optional step was left completely empty.
    const resolved = fields.map((field) => {
      const raw =
        field.readonly && field.value !== undefined
          ? field.value
          : (data?.[field.name] ?? field.value);
      return {
        field,
        value: typeof raw === 'string' ? raw.trim() : raw,
      };
    });
    const isEmpty = (value: unknown) =>
      value === undefined || value === null || value === '';
    // An optional module left untouched is a valid "skip": no inquiry, no fee.
    // Readonly prefilled fields are filled by the server, so they must not
    // count as user input; otherwise an optional step whose only filled field
    // is a locked prefill (e.g. the account's national code) would be billed
    // even though the user never entered the required license number.
    const skipped =
      step.optional === true &&
      resolved.every((entry) => entry.field.readonly || isEmpty(entry.value));
    // A dependent module (e.g. a license lookup) only runs once its
    // prerequisites are fulfilled; block the submit early so the user does not
    // reach the invoice with an inquiry that cannot run.
    if (!skipped && step.requires?.length) {
      const [doneMap, allSteps] = await Promise.all([
        this.completionMap(userId),
        this.getSteps(),
      ]);
      const stepById = new Map(allSteps.map((entry) => [entry.id, entry] as const));
      const unmet = await this.unmetRequires(
        userId,
        step,
        doneMap,
        stepById,
        new Map(),
        identity,
      );
      if (unmet.length > 0) {
        const titles = unmet.map((id) => stepById.get(id)?.title ?? id);
        throw new BadRequestException(
          `برای ثبت این مرحله ابتدا باید مراحل «${titles.join('»، «')}» تکمیل شوند.`,
        );
      }
    }
    const clean: Record<string, unknown> = {};
    for (const { field, value } of resolved) {
      if (!skipped && field.required && isEmpty(value)) {
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
    // A skipped optional step stores no user input, so the cart/checkout can
    // reliably tell it apart from a filled one even if the admin later edits
    // the step. A skipped step never runs, so its prefills are not needed.
    const stored = skipped ? {} : clean;
    await this.prisma.setting.upsert({
      where: { key: this.stepDataKey(userId, step.id) },
      create: {
        key: this.stepDataKey(userId, step.id),
        value: JSON.stringify(stored),
      },
      update: { value: JSON.stringify(stored) },
    });
    await this.prisma.onboardingStepCompletion.upsert({
      where: { userId_stepId: { userId, stepId: step.id } },
      create: { userId, stepId: step.id },
      update: { completedAt: new Date() },
    });
    await this.syncCartForStep(userId, step, module, !skipped);
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
   * always matches what the user actually opted into. `used` is false when an
   * optional step was submitted empty: the user skipped the inquiry, so it
   * must not be charged.
   */
  private async syncCartForStep(
    userId: string,
    step: OnboardingStepDef,
    module?: OnboardingModuleOption,
    used = true,
  ) {
    const cart = await this.readCart(userId);
    const without = cart.filter((item) => item.stepId !== step.id);
    if (
      used &&
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

  /** Stored inquiry result of a module step, or `undefined` when none ran. */
  private async readStepResult(
    userId: string,
    stepId: string,
  ): Promise<unknown> {
    const row = await this.prisma.setting.findUnique({
      where: { key: `${ONBOARDING_MODULE_RESULT_PREFIX}${userId}:${stepId}` },
    });
    if (!row?.value) return undefined;
    try {
      return JSON.parse(row.value) as unknown;
    } catch {
      return undefined;
    }
  }

  /**
   * Order cart items so a module that requires another module in the same
   * cart runs after it, letting the dependent module read the prerequisite's
   * fresh result. Items are first sorted by their position in the configured
   * wizard (the admin's step order), so the execution order is deterministic
   * and matches the numbered steps the user sees — never the order the cart
   * happened to be filled in. The `requires` edges then pull any remaining
   * prerequisite ahead of its dependent.
   */
  private orderItemsByRequires(
    items: OnboardingCartItem[],
    stepById: Map<string, OnboardingStepDef>,
    stepOrder: Map<string, number>,
  ): OnboardingCartItem[] {
    const byStep = new Map(items.map((item) => [item.stepId, item] as const));
    const visited = new Set<string>();
    const ordered: OnboardingCartItem[] = [];
    const visit = (item: OnboardingCartItem) => {
      if (visited.has(item.stepId)) return;
      visited.add(item.stepId);
      for (const req of stepById.get(item.stepId)?.requires ?? []) {
        const dependency = byStep.get(req);
        if (dependency) visit(dependency);
      }
      ordered.push(item);
    };
    const byWizardOrder = [...items].sort((a, b) => {
      const left = stepOrder.get(a.stepId) ?? Number.MAX_SAFE_INTEGER;
      const right = stepOrder.get(b.stepId) ?? Number.MAX_SAFE_INTEGER;
      return left - right;
    });
    for (const item of byWizardOrder) visit(item);
    return ordered;
  }

  /**
   * Prerequisite step ids of `step` that are not fulfilled yet.
   *
   * `mode: 'completion'` is used while the user fills the form (before any
   * payment): every prerequisite — built-in or module — only needs to be
   * complete.
   *
   * `mode: 'result'` is used after payment, when the inquiries run: a built-in
   * prerequisite must be complete and a module prerequisite must have come
   * back positive (in this run or a previous one), so a chained inquiry
   * actually waits for the prerequisite's result.
   */
  private async unmetRequires(
    userId: string,
    step: OnboardingStepDef | undefined,
    doneMap: Map<string, boolean>,
    stepById: Map<string, OnboardingStepDef>,
    runPositives: Map<string, boolean>,
    identity: {
      nationalCode?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      fatherName?: string | null;
      birthDate?: string | null;
      fullName?: string | null;
      phone?: string | null;
    } | null,
    mode: 'completion' | 'result' = 'completion',
  ): Promise<string[]> {
    const requires = step?.requires ?? [];
    const unmet: string[] = [];
    for (const reqId of requires) {
      let satisfied: boolean;
      if (runPositives.has(reqId)) {
        satisfied = runPositives.get(reqId) === true;
      } else {
        const reqStep = stepById.get(reqId);
        const isModule = Boolean(
          reqStep && reqStep.kind === 'module' && reqStep.moduleKey,
        );
        if (isModule && mode === 'result') {
          const stored = await this.readStepResult(userId, reqId);
          if (stored === undefined) {
            satisfied = false;
          } else {
            const storedData = await this.readStepData(userId, reqId);
            satisfied =
              this.isPositiveModuleResult(stored) &&
              this.matchRulesPass(reqStep, stored, storedData, identity);
          }
        } else {
          satisfied = doneMap.get(reqId) === true;
        }
      }
      if (!satisfied) unmet.push(reqId);
    }
    return unmet;
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
      return {
        delivered: 0,
        results: [] as Array<{
          stepId: string;
          ok: boolean;
          matched: boolean;
          message: string | null;
        }>,
      };
    }
    // Atomically claim this delivery before running any inquiry. Two requests
    // can arrive at the same moment (the checkout redirect and the load-time
    // fallback), and a read-then-write consume would let both run — and charge
    // — the same paid modules twice. Only the request that flips
    // `moduleConsumedAt` from NULL proceeds.
    const claimed = await this.prisma.subscriptionPayment.updateMany({
      where: { id: payment.id, moduleConsumedAt: null },
      data: { moduleConsumedAt: new Date() },
    });
    if (claimed.count === 0) {
      return {
        delivered: 0,
        results: [] as Array<{
          stepId: string;
          ok: boolean;
          matched: boolean;
          message: string | null;
        }>,
      };
    }
    const items = this.normaliseCartItems(payment.moduleItems);
    const configuredSteps = await this.getSteps();
    const stepById = new Map(
      configuredSteps.map((step) => [step.id, step] as const),
    );
    // Position of each step in the admin-configured wizard, used to run the
    // inquiries in the same order the user sees them.
    const stepOrder = new Map(
      configuredSteps.map((step, index) => [step.id, index] as const),
    );
    const identitySelect = {
      nationalCode: true,
      firstName: true,
      lastName: true,
      fatherName: true,
      birthDate: true,
      fullName: true,
      phone: true,
    } as const;
    let identity = await this.prisma.user.findUnique({
      where: { id: userId },
      select: identitySelect,
    });
    const doneMap = await this.completionMap(userId);
    // Positivity of every module that ran in this delivery, so a dependent
    // module can wait for its prerequisite's fresh result.
    const runPositives = new Map<string, boolean>();
    const results: Array<{
      stepId: string;
      ok: boolean;
      matched: boolean;
      message: string | null;
    }> = [];
    for (const item of this.orderItemsByRequires(
      items,
      stepById,
      stepOrder,
    )) {
      // A prerequisite module earlier in this same delivery may have just
      // written the national code / name to the account (e.g. the identity
      // step before the business-license lookup). Re-read it so match rules
      // compare against the freshly verified identity, not the pre-run state.
      identity =
        (await this.prisma.user.findUnique({
          where: { id: userId },
          select: identitySelect,
        })) ?? identity;
      const separator = item.moduleKey.indexOf(':');
      const prefix = separator < 0 ? '' : item.moduleKey.slice(0, separator);
      const rest = separator < 0 ? '' : item.moduleKey.slice(separator + 1);
      if (!rest || (prefix !== 'apiir' && prefix !== 'zohal')) {
        continue;
      }
      const isComposite = rest.startsWith('composite:');
      const key = isComposite ? rest.slice('composite:'.length) : rest;
      if (!key) continue;
      const step = stepById.get(item.stepId);
      const unmet = await this.unmetRequires(
        userId,
        step,
        doneMap,
        stepById,
        runPositives,
        identity,
        'result',
      );
      if (unmet.length > 0) {
        // Prerequisites are not fulfilled (e.g. identity not verified yet):
        // the inquiry must not run.
        results.push({
          stepId: item.stepId,
          ok: false,
          matched: false,
          message: null,
        });
        continue;
      }
      const payload = await this.readStepData(userId, item.stepId);
      if (isOptionalModuleStepUnused(step, payload)) {
        // The user left this optional inquiry empty, so it was never meant to
        // run (and must not have been charged).
        results.push({
          stepId: item.stepId,
          ok: false,
          matched: false,
          message: 'این مرحله‌ی اختیاری خالی مانده و استعلامی اجرا نشد.',
        });
        continue;
      }
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
        const evaluation = this.evaluateMatchRules(
          step,
          result,
          payload,
          identity,
        );
        // Keep the admin's match verdict next to the raw response so the user
        // and the admin panel can show «استعلام انجام شد اما مطابقت نداشت»
        // instead of silently treating it as a failed call.
        const storedResult =
          result && typeof result === 'object' && !Array.isArray(result)
            ? {
                ...(result as Record<string, unknown>),
                matched: evaluation.passed,
                matchMessage: evaluation.message,
              }
            : result;
        const resultKey = `${ONBOARDING_MODULE_RESULT_PREFIX}${userId}:${item.stepId}`;
        await this.prisma.setting.upsert({
          where: { key: resultKey },
          create: { key: resultKey, value: JSON.stringify(storedResult) },
          update: { value: JSON.stringify(storedResult) },
        });
        const positive =
          this.isPositiveModuleResult(result) && evaluation.passed;
        runPositives.set(item.stepId, positive);
        if (step?.onSuccess) {
          await this.applyModuleSuccessTicks(userId, step, storedResult, {
            positive,
            matchMessage: evaluation.message,
            payload,
          });
        }
        results.push({
          stepId: item.stepId,
          ok,
          matched: evaluation.passed,
          message: evaluation.passed ? null : evaluation.message,
        });
      } catch {
        results.push({
          stepId: item.stepId,
          ok: false,
          matched: false,
          message: null,
        });
      }
    }
    await this.writeCart(userId, []);
    return { delivered: results.length, results };
  }

  /**
   * A module inquiry is "positive" when the call itself succeeded and, for
   * results that carry an explicit `matched` flag (Shahkar / identity), that
   * flag is true. Anything else (transport error, mismatch) is not positive.
   */
  private isPositiveModuleResult(result: unknown): boolean {
    if (!result || typeof result !== 'object') return false;
    const record = result as Record<string, unknown>;
    if (record.ok !== true) return false;
    const data = record.data;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const matched = (data as Record<string, unknown>).matched;
      if (typeof matched === 'boolean') return matched;
    }
    return true;
  }

  /**
   * Apply an admin-step's `match` rules to an inquiry response. With no rules
   * the call is accepted as-is (legacy behaviour); with rules, every rule must
   * match or the inquiry is treated as failed (so no ticks are granted). This
   * is how, for example, a business-license lookup whose response carries the
   * owner's national code is checked against the signed-in user.
   */
  private matchRulesPass(
    step: OnboardingStepDef | undefined,
    result: unknown,
    payload: Record<string, unknown>,
    identity: {
      nationalCode?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      fatherName?: string | null;
      birthDate?: string | null;
      fullName?: string | null;
      phone?: string | null;
    } | null,
  ): boolean {
    return this.evaluateMatchRules(step, result, payload, identity).passed;
  }

  /**
   * Evaluate the admin's `match` rules and describe the outcome in Persian.
   * The inquiry itself can succeed while a rule fails (e.g. the license
   * belongs to someone else); in that case the caller still records the
   * response but reports «عدم تطبیق» to the user instead of granting a tick.
   */
  private evaluateMatchRules(
    step: OnboardingStepDef | undefined,
    result: unknown,
    payload: Record<string, unknown>,
    identity: {
      nationalCode?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      fatherName?: string | null;
      birthDate?: string | null;
      fullName?: string | null;
      phone?: string | null;
    } | null,
  ): { passed: boolean; message: string | null } {
    const rules = step?.match ?? [];
    if (rules.length === 0) return { passed: true, message: null };
    const data = this.moduleResultData(result);
    if (!data) {
      return {
        passed: false,
        message:
          'پاسخ استعلام قابل خواندن نبود؛ تطبیق نتیجه با اطلاعات شما انجام نشد.',
      };
    }
    const failures: string[] = [];
    for (const rule of rules) {
      const actual = data[rule.resultField];
      let expected: unknown;
      switch (rule.compareTo) {
        case 'userNationalCode':
          expected = identity?.nationalCode ?? null;
          break;
        case 'userMobile':
          expected = identity?.phone ?? null;
          break;
        case 'userFullName':
          expected =
            [identity?.firstName, identity?.lastName]
              .filter(Boolean)
              .join(' ') ||
            identity?.fullName ||
            null;
          break;
        case 'userFirstName':
          expected = identity?.firstName ?? null;
          break;
        case 'userLastName':
          expected = identity?.lastName ?? null;
          break;
        case 'userFatherName':
          expected = identity?.fatherName ?? null;
          break;
        case 'userBirthDate':
          expected = identity?.birthDate ?? null;
          break;
        case 'field':
          expected = rule.field ? payload[rule.field] : undefined;
          break;
        default:
          expected = undefined;
      }
      const fieldLabel = this.matchFieldLabel(rule.resultField);
      if (
        actual === undefined ||
        actual === null ||
        expected === undefined ||
        expected === null ||
        expected === ''
      ) {
        failures.push(
          actual === undefined || actual === null || actual === ''
            ? `پاسخ استعلام فیلد «${fieldLabel}» را برنگرداند`
            : `مقدار مقایسه‌ای «${fieldLabel}» برای تطبیق در دسترس نبود`,
        );
        continue;
      }
      const ok = this.compareMatchValues(
        String(actual),
        String(expected),
        rule.mode ?? 'normalized',
      );
      if (!ok) {
        failures.push(
          `«${fieldLabel}» پاسخ استعلام (${String(actual)}) با مقدار مورد انتظار (${String(expected)}) مطابقت ندارد`,
        );
      }
    }
    if (failures.length === 0) return { passed: true, message: null };
    return {
      passed: false,
      message: `استعلام انجام شد اما نتیجه با اطلاعات شما تطبیق نداشت: ${failures.join('؛ ')}.`,
    };
  }

  /** Persian label for a response field used in a match rule. */
  private matchFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      nationalCode: 'کد ملی',
      national_code: 'کد ملی',
      mobile: 'شماره موبایل',
      phone: 'شماره موبایل',
      fullName: 'نام و نام خانوادگی',
      full_name: 'نام و نام خانوادگی',
      firstName: 'نام',
      first_name: 'نام',
      lastName: 'نام خانوادگی',
      last_name: 'نام خانوادگی',
      fatherName: 'نام پدر',
      father_name: 'نام پدر',
      birthDate: 'تاریخ تولد',
      birth_date: 'تاریخ تولد',
      trackingCode: 'کد پیگیری جواز',
      title: 'عنوان مجوز',
    };
    return labels[field] ?? field;
  }

  private compareMatchValues(
    actual: string,
    expected: string,
    mode: OnboardingMatchMode,
  ): boolean {
    if (mode === 'exact') return actual.trim() === expected.trim();
    if (mode === 'nameMatch') return sameFullName(actual, expected);
    if (mode === 'masked') return sameMaskedValue(actual, expected);
    const a = normalizeMatchValue(actual);
    const b = normalizeMatchValue(expected);
    return Boolean(a) && a === b;
  }

  /** The `data` payload of a stored module result (or null). */
  private moduleResultData(result: unknown): Record<string, unknown> | null {
    if (!result || typeof result !== 'object') return null;
    const record = result as Record<string, unknown>;
    const data = record.data;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }
    // A composite inquiry (several modules delivered behind one paid step)
    // nests each module's payload under `modules[].data`. Merge them so the
    // identity name fields, the match rules and the stored profile data work
    // exactly as they do for a single-module step.
    const modules = record.modules;
    if (Array.isArray(modules)) {
      const merged: Record<string, unknown> = {};
      for (const entry of modules) {
        if (!entry || typeof entry !== 'object') continue;
        const inner = (entry as Record<string, unknown>).data;
        if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
          Object.assign(merged, inner as Record<string, unknown>);
        }
      }
      if (Object.keys(merged).length > 0) return merged;
    }
    return null;
  }

  /** Best-effort first/last name extraction from an identity-style payload. */
  private extractIdentityNames(
    data: Record<string, unknown> | null,
  ): {
    firstName: string | null;
    lastName: string | null;
    fatherName: string | null;
  } {
    const pick = (...keys: string[]): string => {
      for (const key of keys) {
        const value = data?.[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
      }
      return '';
    };
    let firstName = pick('first_name', 'firstName');
    let lastName = pick('last_name', 'lastName');
    if (!firstName || !lastName) {
      const fullName = pick('fullName', 'full_name', 'name');
      if (fullName && !firstName && !lastName) {
        const parts = fullName.split(/\s+/);
        firstName = parts[0] ?? '';
        lastName = parts.slice(1).join(' ');
      }
    }
    return {
      firstName: firstName || null,
      lastName: lastName || null,
      fatherName: pick('father_name', 'fatherName') || null,
    };
  }

  /**
   * Grant the ticks an admin attached to a module step once its inquiry came
   * back positive. White tick = identity verified + phone matched; blue tick =
   * business license verified. Existing ticks are never downgraded. When the
   * call succeeded but the admin's match rules failed, the raw response is
   * still stored and a `FAILED` (mismatch) log is written so the user and the
   * admin panel can see why no tick was granted.
   */
  private async applyModuleSuccessTicks(
    userId: string,
    step: OnboardingStepDef,
    result: unknown,
    options: {
      positive: boolean;
      matchMessage: string | null;
      payload: Record<string, unknown>;
    } = { positive: true, matchMessage: null, payload: {} },
  ): Promise<void> {
    const award: OnboardingStepOnSuccess | undefined = step.onSuccess;
    if (!award?.grantWhiteTick && !award?.grantBlueTick) return;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        phone: true,
        nationalCode: true,
        birthDate: true,
        phoneMatchVerifiedAt: true,
        identityVerifiedAt: true,
        businessLicenseVerifiedAt: true,
      },
    });
    if (!user) return;
    const now = new Date();
    const data = this.moduleResultData(result);
    const label = step.title || 'ماژول استعلام';
    const payloadNationalCode = this.pickString(options.payload, [
      'national_code',
      'nationalCode',
    ]);
    const payloadBirthDate = this.pickString(options.payload, [
      'birth_date',
      'birthDate',
    ]);
    const nationalCode = user.nationalCode ?? payloadNationalCode;
    const birthDate = user.birthDate ?? payloadBirthDate;

    if (award.grantWhiteTick && options.positive) {
      const names = this.extractIdentityNames(data);
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          phoneMatchVerifiedAt: user.phoneMatchVerifiedAt ?? now,
          identityVerifiedAt: user.identityVerifiedAt ?? now,
          ...(nationalCode ? { nationalCode } : {}),
          ...(birthDate ? { birthDate } : {}),
          ...(names.firstName ? { firstName: names.firstName } : {}),
          ...(names.lastName ? { lastName: names.lastName } : {}),
          ...(names.firstName && names.lastName
            ? { fullName: `${names.firstName} ${names.lastName}` }
            : {}),
          ...(names.fatherName ? { fatherName: names.fatherName } : {}),
          ...(data
            ? { identityInquiryData: data as Prisma.InputJsonValue }
            : {}),
        },
      });
      await this.prisma.identityInquiryLog.create({
        data: {
          userId,
          kind: IdentityInquiryKind.PHONE_MATCH,
          status: IdentityInquiryStatus.SUCCESS,
          nationalCode,
          phone: user.phone,
          matched: true,
          message: `تطبیق شماره تماس از نتیجه‌ی موفق ماژول «${label}».`,
        },
      });
      await this.prisma.identityInquiryLog.create({
        data: {
          userId,
          kind: IdentityInquiryKind.IDENTITY_INQUIRY,
          status: IdentityInquiryStatus.SUCCESS,
          nationalCode,
          birthDate,
          matched: true,
          firstName: names.firstName,
          lastName: names.lastName,
          fatherName: names.fatherName,
          raw: (data ?? undefined) as Prisma.InputJsonValue | undefined,
          message: `احراز هویت از نتیجه‌ی موفق ماژول «${label}».`,
        },
      });
    }

    if (award.grantBlueTick && options.positive) {
      const names = this.extractIdentityNames(data);
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          businessLicenseVerifiedAt: user.businessLicenseVerifiedAt ?? now,
          ...(data
            ? { businessLicenseData: data as Prisma.InputJsonValue }
            : {}),
        },
      });
      await this.prisma.identityInquiryLog.create({
        data: {
          userId,
          kind: IdentityInquiryKind.BUSINESS_LICENSE,
          status: IdentityInquiryStatus.SUCCESS,
          nationalCode: nationalCode ?? user.nationalCode,
          matched: true,
          firstName: names.firstName,
          lastName: names.lastName,
          fatherName: names.fatherName,
          raw: (data ?? undefined) as Prisma.InputJsonValue | undefined,
          message: `استعلام جواز کسب از نتیجه‌ی موفق ماژول «${label}».`,
        },
      });
    }

    if (award.grantBlueTick && !options.positive && data) {
      // The inquiry ran and returned an owner, but the national code (or
      // another admin rule) did not match this account: keep the response and
      // log the mismatch instead of granting a blue tick.
      const names = this.extractIdentityNames(data);
      await this.prisma.user.update({
        where: { id: userId },
        data: { businessLicenseData: data as Prisma.InputJsonValue },
      });
      await this.prisma.identityInquiryLog.create({
        data: {
          userId,
          kind: IdentityInquiryKind.BUSINESS_LICENSE,
          status: IdentityInquiryStatus.FAILED,
          nationalCode: nationalCode ?? user.nationalCode,
          matched: false,
          firstName: names.firstName,
          lastName: names.lastName,
          fatherName: names.fatherName,
          raw: data as Prisma.InputJsonValue,
          message:
            options.matchMessage ??
            `استعلام جواز کسب انجام شد اما با اطلاعات حساب شما تطبیق نداشت (ماژول «${label}»).`,
        },
      });
      await this.activity.log({
        actor: { id: userId },
        action: 'ONBOARDING_MODULE_MISMATCH',
        summary: `عدم تطبیق نتیجه‌ی استعلام ماژول «${label}» با اطلاعات کاربر`,
        entityType: 'USER',
        entityId: userId,
      });
      return;
    }

    await this.activity.log({
      actor: { id: userId },
      action: 'ONBOARDING_MODULE_TICKS',
      summary: `اعطای تیک از نتیجه‌ی موفق ماژول «${label}»${
        award.grantWhiteTick ? ' (تیک سفید)' : ''
      }${award.grantBlueTick ? ' (تیک آبی)' : ''}`,
      entityType: 'USER',
      entityId: userId,
    });
  }

  /** First non-empty string value of the given keys in a payload. */
  private pickString(
    payload: Record<string, unknown>,
    keys: string[],
  ): string | null {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return null;
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
      const onSuccess =
        step.kind === 'module'
          ? this.sanitizeOnSuccess(step.onSuccess)
          : undefined;
      const match =
        step.kind === 'module' ? this.sanitizeMatchRules(step.match) : undefined;
      const requires =
        step.kind === 'module'
          ? this.sanitizeRequires(step.requires, id)
          : undefined;
      result.push({
        id,
        kind: step.kind,
        title,
        description: (step.description ?? '').trim(),
        ...(href ? { href } : {}),
        ...(step.kind === 'module' ? { moduleKey } : {}),
        ...(fieldOverrides ? { fieldOverrides } : {}),
        ...(onSuccess ? { onSuccess } : {}),
        ...(match ? { match } : {}),
        ...(requires ? { requires } : {}),
        enabled: step.enabled !== false,
        ...(typeof step.optional === 'boolean'
          ? { optional: step.optional }
          : {}),
      });
    }
    return result;
  }

  /**
   * Keep only well-formed `onSuccess` tick grants; returns undefined when no
   * tick is selected, so the stored step stays lean.
   */
  private sanitizeOnSuccess(
    input: unknown,
  ): OnboardingStepOnSuccess | undefined {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return undefined;
    }
    const raw = input as Record<string, unknown>;
    const onSuccess: OnboardingStepOnSuccess = {};
    if (typeof raw.grantWhiteTick === 'boolean') {
      onSuccess.grantWhiteTick = raw.grantWhiteTick;
    }
    if (typeof raw.grantBlueTick === 'boolean') {
      onSuccess.grantBlueTick = raw.grantBlueTick;
    }
    return onSuccess.grantWhiteTick || onSuccess.grantBlueTick
      ? onSuccess
      : undefined;
  }

  /**
   * Keep only well-formed `match` rules; returns undefined when none survive,
   * so a step with no comparison stays lean and keeps the legacy "any
   * successful call counts" behaviour.
   */
  private sanitizeMatchRules(
    input: unknown,
  ): OnboardingMatchRule[] | undefined {
    if (!Array.isArray(input)) return undefined;
    const rules: OnboardingMatchRule[] = [];
    for (const entry of input) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const raw = entry as Record<string, unknown>;
      const resultField =
        typeof raw.resultField === 'string' ? raw.resultField.trim() : '';
      if (!resultField) continue;
      if (
        typeof raw.compareTo !== 'string' ||
        !(ONBOARDING_MATCH_SOURCES as readonly string[]).includes(raw.compareTo)
      ) {
        continue;
      }
      const compareTo = raw.compareTo as OnboardingMatchRule['compareTo'];
      const rule: OnboardingMatchRule = { resultField, compareTo };
      if (compareTo === 'field') {
        const field = typeof raw.field === 'string' ? raw.field.trim() : '';
        if (!field) continue;
        rule.field = field;
      }
      if (
        typeof raw.mode === 'string' &&
        (ONBOARDING_MATCH_MODES as readonly string[]).includes(raw.mode)
      ) {
        rule.mode = raw.mode as OnboardingMatchMode;
      }
      rules.push(rule);
    }
    return rules.length > 0 ? rules : undefined;
  }

  /**
   * Keep only well-formed, non-self prerequisite step ids. Unknown ids are
   * kept (they may belong to a step defined later); a step that points at
   * itself is dropped to avoid an unfulfillable requirement.
   */
  private sanitizeRequires(
    input: unknown,
    selfId: string,
  ): string[] | undefined {
    if (!Array.isArray(input)) return undefined;
    const seen = new Set<string>();
    const requires: string[] = [];
    for (const entry of input) {
      if (typeof entry !== 'string') continue;
      const id = entry.trim();
      if (!id || id === selfId || seen.has(id)) continue;
      seen.add(id);
      requires.push(id);
    }
    return requires.length > 0 ? requires : undefined;
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
