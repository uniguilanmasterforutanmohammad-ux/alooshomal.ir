import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
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

export interface ResolvedBusinessModule extends BusinessModuleDefinition {
  enabled: boolean;
  available: boolean;
}

export interface ResolvedWorkspace {
  id: string;
  name: string;
  industryKey: string;
  industry: IndustryPackageDefinition;
  modules: ResolvedBusinessModule[];
  industries: IndustryPackageDefinition[];
}

@Injectable()
export class BusinessModulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Every user has exactly one workspace. It is created lazily on first use
   * with the «general business» package, so existing accounts keep working
   * without a data migration. A concurrent double-call is handled by the
   * unique `ownerId` constraint.
   */
  async ensureWorkspace(userId: string) {
    const existing = await this.prisma.businessWorkspace.findUnique({
      where: { ownerId: userId },
      include: { modules: true },
    });
    if (existing) return existing;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, firstName: true, lastName: true },
    });
    const fallbackName =
      [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
      user?.fullName ||
      'کسب‌وکار من';

    try {
      return await this.prisma.$transaction(async (tx) => {
        const workspace = await tx.businessWorkspace.create({
          data: {
            ownerId: userId,
            name: fallbackName,
            industryKey: 'generalBusiness',
          },
        });
        const keys = defaultModulesForIndustry('generalBusiness');
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
        return tx.businessWorkspace.findUniqueOrThrow({
          where: { id: workspace.id },
          include: { modules: true },
        });
      });
    } catch {
      // Another request created it between our read and write.
      return this.prisma.businessWorkspace.findUniqueOrThrow({
        where: { ownerId: userId },
        include: { modules: true },
      });
    }
  }

  async getWorkspaceId(userId: string): Promise<string> {
    return (await this.ensureWorkspace(userId)).id;
  }

  resolveCatalog() {
    return {
      modules: BUSINESS_MODULES,
      industries: INDUSTRY_PACKAGES,
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
        data: { name: dto.name },
      });
    }
    return this.resolve(userId);
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

    // Keep explicitly activated modules visible even after the workspace
    // switches to a package that does not list them, so the user can see (and
    // deliberately turn off) modules they enabled earlier.
    const visibleKeys = new Set([
      ...industry.modules,
      ...activationByKey.keys(),
    ]);
    const modules: ResolvedBusinessModule[] = BUSINESS_MODULES.filter(
      (definition) => visibleKeys.has(definition.key),
    ).map((definition) => {
      const activation = activationByKey.get(definition.key);
      const enabled = activation
        ? activation.enabled
        : definition.defaultEnabled && defaultKeys.has(definition.key);
      return {
        ...definition,
        enabled,
        available: availableKeys.has(definition.key),
      };
    });

    return {
      id: workspace.id,
      name: workspace.name,
      industryKey: industry.key,
      industry,
      modules,
      industries: INDUSTRY_PACKAGES,
    };
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

    if (enabled) {
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
        (item) =>
          item.enabled && (item.dependsOn ?? []).includes(moduleKey),
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
   * per-workspace activation. Legacy modules (`enforced: false`) are only
   * subject to their own feature flag.
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
        message: `ماژول «${definition.label}» برای این کسب‌وکار فعال نیست. آن را از «پنل کسب‌وکار» فعال کنید.`,
        code: 'MODULE_DISABLED',
      });
    }
  }
}
