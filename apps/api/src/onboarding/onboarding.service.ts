import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { BiolinkStatus } from '@prisma/client';

import { ActivityService } from '../activity/activity.service';
import { DEFAULT_PLAN } from '../common/plans';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  DEFAULT_ONBOARDING_STEPS,
  MANUAL_STEP_KINDS,
  ONBOARDING_STEPS_SETTING_KEY,
  ONBOARDING_STEP_KINDS,
  type OnboardingProgressPayload,
  type OnboardingStepDef,
  type OnboardingStepKind,
  type OnboardingStepState,
} from './onboarding.constants';
import type { OnboardingStepDto } from './dto/onboarding.dto';

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
      return this.sanitize(parsed as OnboardingStepDto[]);
    } catch {
      return DEFAULT_ONBOARDING_STEPS;
    }
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
    const [done, identity, history] = await Promise.all([
      this.completionMap(userId),
      this.identityState(userId),
      this.prisma.identityInquiryLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 25,
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
    };
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
    const [user, completions, defaultPlan] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          identityVerifiedAt: true,
          blueTickRequestedAt: true,
          verifiedAt: true,
          planId: true,
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
          subscriptions: {
            where: { status: 'ACTIVE' },
            select: { id: true },
            take: 1,
          },
        },
      }),
      this.prisma.onboardingStepCompletion.findMany({
        where: { userId },
        select: { stepId: true },
      }),
      this.prisma.subscriptionPlan.findFirst({
        where: { name: DEFAULT_PLAN.name },
        select: { id: true },
      }),
    ]);
    const map = new Map<string, boolean>();
    for (const completion of completions) map.set(completion.stepId, true);
    if (!user) return map;

    const cards = user.businessCards;
    map.set('identity', Boolean(user.identityVerifiedAt));
    map.set('business', cards.length > 0);
    map.set('details', cards.some((card) => this.detailsComplete(card)));
    map.set('documents', Boolean(user.blueTickRequestedAt || user.verifiedAt));
    // New accounts get the free plan assigned automatically, so an explicit
    // plan choice (an approved subscription, or a non-default plan) is what
    // completes this step — not the auto-assigned default.
    const hasExplicitPlan =
      user.subscriptions.length > 0 ||
      (Boolean(user.planId) && user.planId !== defaultPlan?.id);
    map.set('plan', hasExplicitPlan);
    map.set(
      'approval',
      cards.some((card) => card.status === BiolinkStatus.APPROVED),
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
        return 'در انتظار انتخاب طرح';
      case 'approval':
        return 'در انتظار تأیید مدیر';
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
      });
    }
    return result;
  }
}
