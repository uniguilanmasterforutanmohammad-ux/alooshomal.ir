import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { BiolinkStatus, PaymentStatus, Prisma } from '@prisma/client';

import { ActivityService } from '../activity/activity.service';
import { BusinessModulesService } from '../business-modules/business-modules.service';
import { industryKeyForCategoryName } from '../business-modules/business-modules.registry';
import { isFreePlan } from '../common/plans';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileService } from '../profile/profile.service';
import { SettingsService } from '../settings/settings.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import {
  DEFAULT_ONBOARDING_STEPS,
  MANUAL_STEP_KINDS,
  ONBOARDING_FINISHED_STEP_ID,
  ONBOARDING_STEPS_SETTING_KEY,
  ONBOARDING_STEP_KINDS,
  type OnboardingDocument,
  type OnboardingBusinessState,
  type OnboardingProgressPayload,
  type OnboardingStepDef,
  type OnboardingStepKind,
  type OnboardingStepState,
} from './onboarding.constants';
import type {
  AddOnboardingDocumentDto,
  OnboardingStepDto,
  SaveOnboardingBusinessDto,
} from './dto/onboarding.dto';

/** The built-in kinds whose completion is derived from account data. */
const BUILT_IN_KINDS = new Set<OnboardingStepKind>(
  ONBOARDING_STEP_KINDS.filter((kind) => !MANUAL_STEP_KINDS.includes(kind)),
);

/** The kinds the user ticks off manually (welcome + admin-added steps). */
const MANUAL_KINDS = new Set<OnboardingStepKind>(MANUAL_STEP_KINDS);

@Injectable()
export class OnboardingService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly activity: ActivityService,
    private readonly modules: BusinessModulesService,
    private readonly subscriptions: SubscriptionsService,
    private readonly profile: ProfileService,
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
        optional: base.optional === true,
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

  /** Replace the step list (admin). Order of the array is the display order. */
  async setSteps(
    steps: OnboardingStepDto[],
    actorId?: string,
  ): Promise<OnboardingStepDef[]> {
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
    const identity = await this.identityState(userId);
    // The business step now runs before identity and creates the workspace
    // itself (name/industry/draft only, no card or biolink). We still ensure
    // the default plan is assigned for accounts that predate that rule.
    await this.subscriptions.limitsForUser(userId);
    const [done, history, documents, business, finished] = await Promise.all([
      this.completionMap(userId),
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
    ]);
    const states: OnboardingStepState[] = steps.map((step) => {
      const isDone = done.get(step.id) ?? false;
      return { ...step, done: isDone, hint: this.hintFor(step, isDone) };
    });
    const completed = states.filter((step) => step.done).length;
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
      await this.profile.runPaidIdentityBundle(userId, data);
      await this.prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: { identityConsumedAt: new Date() },
      });
      return {
        ran: true,
        success: true,
        businessLicenseVerified: Boolean(data.withLicense),
        message: 'استعلام هویت با موفقیت انجام شد.',
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
    const industryKey = category
      ? industryKeyForCategoryName(category.name)
      : 'generalBusiness';
    const onboardingData: Record<string, string> = { name };
    for (const key of [
      'cityId',
      'businessId',
      'mobile',
      'address',
      'fullName',
    ] as const) {
      const value = dto[key]?.trim();
      if (value) onboardingData[key] = value;
    }
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
    const workspace = await this.prisma.businessWorkspace.findFirst({
      where: { ownerId: userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        industryKey: true,
        onboardingData: true,
      },
    });
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        nationalCode: true,
        birthDate: true,
        firstName: true,
        lastName: true,
        fatherName: true,
        phoneMatchVerifiedAt: true,
        identityVerifiedAt: true,
        businessLicenseVerifiedAt: true,
      },
    });
    return {
      nationalCode: user?.nationalCode ?? null,
      birthDate: user?.birthDate ?? null,
      firstName: user?.firstName ?? null,
      lastName: user?.lastName ?? null,
      fatherName: user?.fatherName ?? null,
      phoneMatched: Boolean(user?.phoneMatchVerifiedAt),
      verified: Boolean(user?.identityVerifiedAt),
      businessLicenseVerified: Boolean(user?.businessLicenseVerifiedAt),
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
    await this.prisma.onboardingStepCompletion.upsert({
      where: { userId_stepId: { userId, stepId: step.id } },
      create: { userId, stepId: step.id },
      update: { completedAt: new Date() },
    });
    return this.getMyProgress(userId);
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
    return this.getMyProgress(userId);
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
  private async completionMap(userId: string): Promise<Map<string, boolean>> {
    const [user, completions] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
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
              industryKey: true,
              modules: { select: { paidUntil: true } },
            },
            take: 1,
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
    map.set('identity', Boolean(user.identityVerifiedAt));
    map.set(
      'business',
      cards.length > 0 || user.businessWorkspaces.length > 0,
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
    const workspace = user.businessWorkspaces[0];
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

    // The invoice is settled once the paid plan is active and the identity
    // inquiry has been completed (both are bought in the same payment).
    const identityDone = Boolean(user.identityVerifiedAt);
    const planSettled = paidPlanActive || (freePlanChosen && freePlanActive);
    map.set('invoice', planSettled && identityDone);
    map.set(
      'approval',
      identityDone && planSettled,
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
      result.push({
        id,
        kind: step.kind,
        title,
        description: (step.description ?? '').trim(),
        ...(href ? { href } : {}),
        enabled: step.enabled !== false,
        ...(step.optional === true ? { optional: true } : {}),
      });
    }
    return result;
  }
}
