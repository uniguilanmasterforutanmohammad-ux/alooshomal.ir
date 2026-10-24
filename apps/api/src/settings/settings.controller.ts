import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  ADMIN_NOTIFY_CATEGORIES,
  AdminNotifyCategory,
  DIRECTORY_DISPLAY_MODES,
  DirectoryDisplayMode,
  FEATURE_FLAGS,
  NEWS_ACCESS_LEVELS,
  NewsAccessLevel,
  SettingsService,
} from './settings.service';

class UpdateSettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  directoryPageSize?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  adminListPageSize?: number;

  @IsOptional()
  @IsIn(DIRECTORY_DISPLAY_MODES as unknown as string[])
  directoryDisplayMode?: DirectoryDisplayMode;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  myListPageSize?: number;

  @IsOptional()
  adminNotifications?: Partial<Record<AdminNotifyCategory, boolean>>;

  @IsOptional()
  @IsBoolean()
  allowBiolinkCreation?: boolean;

  @IsOptional()
  @IsBoolean()
  allowBusinessCardCreation?: boolean;

  /**
   * Unified user-facing feature switches, keyed by the flag's `key`
   * (see `FEATURE_FLAGS`). Unknown keys are ignored server-side.
   */
  @IsOptional()
  features?: Record<string, boolean>;

  /**
   * Paired *visibility* switches (same keys as `features`): when false the
   * enabled feature is not advertised in the site chrome (nav/CTAs/links).
   */
  @IsOptional()
  featureVisibility?: Record<string, boolean>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  newsHeadlineCount?: number;

  @IsOptional()
  newsAccessLevel?: NewsAccessLevel;

  @IsOptional()
  @IsBoolean()
  phoneLoginEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  emailLoginEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  adDurationDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  adDailySlots?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  boostDurationDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  adDirectoryDurationDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  boostPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  adHomePrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  adDirectoryPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  feedTagPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  pointsPerNews?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  feedMaxImages?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(64)
  @Max(20480)
  feedMaxImageKb?: number;
}
const ADMIN_NOTIFY_CATEGORY_SET = new Set<string>(ADMIN_NOTIFY_CATEGORIES);
const NEWS_ACCESS_LEVEL_SET = new Set<string>(NEWS_ACCESS_LEVELS);

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'تنظیمات عمومی (اندازه صفحه دایرکتوری)' })
  async publicSettings() {
    const locks = await this.settingsService.getCreationLocks();
    return {
      directoryPageSize: await this.settingsService.getDirectoryPageSize(),
      directoryDisplayMode: await this.settingsService.getDirectoryDisplayMode(),
      myListPageSize: await this.settingsService.getMyListPageSize(),
      phoneLoginEnabled: await this.settingsService.getPhoneLoginEnabled(),
      emailLoginEnabled: await this.settingsService.getEmailLoginEnabled(),
      feedMaxImages: await this.settingsService.getFeedMaxImages(),
      feedMaxImageKb: await this.settingsService.getFeedMaxImageKb(),
      features: await this.settingsService.getFeatureFlags(),
      featureVisibility: await this.settingsService.getFeatureVisibility(),
      hiddenNavHrefs: await this.settingsService.getHiddenNavHrefs(),
      // Public areas whose display the admin stopped (drives the notice bar).
      stoppedSections: await this.settingsService.getStoppedSections(),
      ...locks,
    };
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'همه تنظیمات برای پنل مدیر' })
  async admin() {
    const { ...all } = await this.settingsService.all();
    const locks = await this.settingsService.getCreationLocks();
    return {
      ...all,
      directoryPageSize: await this.settingsService.getDirectoryPageSize(),
      directoryDisplayMode: await this.settingsService.getDirectoryDisplayMode(),
      adminListPageSize: await this.settingsService.getAdminListPageSize(),
      myListPageSize: await this.settingsService.getMyListPageSize(),
      adminNotifications: await this.settingsService.getAdminNotifyPrefs(),
      newsHeadlineCount: await this.settingsService.getNewsHeadlineCount(),
      newsAccessLevel: await this.settingsService.getNewsAccessLevel(),
      phoneLoginEnabled: await this.settingsService.getPhoneLoginEnabled(),
      emailLoginEnabled: await this.settingsService.getEmailLoginEnabled(),
      adDurationDays: await this.settingsService.getAdDurationDays(),
      adDailySlots: await this.settingsService.getAdDailySlots(),
      boostDurationDays: await this.settingsService.getBoostDurationDays(),
      adDirectoryDurationDays:
        await this.settingsService.getAdDirectoryDurationDays(),
      boostPrice: await this.settingsService.getBoostPrice(),
      adHomePrice: await this.settingsService.getAdHomePrice(),
      adDirectoryPrice: await this.settingsService.getAdDirectoryPrice(),
      feedTagPrice: await this.settingsService.getFeedTagPrice(),
      pointsPerNews: await this.settingsService.getPointsPerNews(),
      feedMaxImages: await this.settingsService.getFeedMaxImages(),
      feedMaxImageKb: await this.settingsService.getFeedMaxImageKb(),
      features: await this.settingsService.getFeatureFlags(),
      featureVisibility: await this.settingsService.getFeatureVisibility(),
      stoppedSections: await this.settingsService.getStoppedSections(),
      // The registry drives the single admin panel (labels/groups/defaults).
      featureFlags: FEATURE_FLAGS,
      ...locks,
    };
  }

  @Patch()
  @ApiOperation({ summary: 'به‌روزرسانی تنظیمات مدیر' })
  async update(@Body() dto: UpdateSettingsDto) {
    const result: {
      directoryPageSize?: number;
      directoryDisplayMode?: DirectoryDisplayMode;
      adminListPageSize?: number;
      myListPageSize?: number;
      adminNotifications?: Record<AdminNotifyCategory, boolean>;
      allowBiolinkCreation?: boolean;
      allowBusinessCardCreation?: boolean;
      features?: Record<string, boolean>;
      featureVisibility?: Record<string, boolean>;
      newsHeadlineCount?: number;
      newsAccessLevel?: NewsAccessLevel;
      phoneLoginEnabled?: boolean;
      emailLoginEnabled?: boolean;
      adDurationDays?: number;
      adDailySlots?: number;
      boostDurationDays?: number;
      adDirectoryDurationDays?: number;
      boostPrice?: number;
      adHomePrice?: number;
      adDirectoryPrice?: number;
      feedTagPrice?: number;
      pointsPerNews?: number;
      feedMaxImages?: number;
      feedMaxImageKb?: number;
    } = {};
    if (dto.directoryPageSize !== undefined) {
      result.directoryPageSize = await this.settingsService.setDirectoryPageSize(
        dto.directoryPageSize,
      );
    }
    if (dto.adminListPageSize !== undefined) {
      result.adminListPageSize = await this.settingsService.setAdminListPageSize(
        dto.adminListPageSize,
      );
    }
    if (dto.directoryDisplayMode !== undefined) {
      result.directoryDisplayMode =
        await this.settingsService.setDirectoryDisplayMode(
          dto.directoryDisplayMode,
        );
    }
    if (dto.myListPageSize !== undefined) {
      result.myListPageSize = await this.settingsService.setMyListPageSize(
        dto.myListPageSize,
      );
    }
    if (dto.adminNotifications !== undefined) {
      const clean: Partial<Record<AdminNotifyCategory, boolean>> = {};
      for (const [key, value] of Object.entries(dto.adminNotifications)) {
        if (ADMIN_NOTIFY_CATEGORY_SET.has(key) && typeof value === 'boolean') {
          clean[key as AdminNotifyCategory] = value;
        }
      }
      result.adminNotifications =
        await this.settingsService.setAdminNotifyPrefs(clean);
    }
    if (
      dto.allowBiolinkCreation !== undefined ||
      dto.allowBusinessCardCreation !== undefined
    ) {
      const locks = await this.settingsService.setCreationLocks({
        allowBiolinkCreation: dto.allowBiolinkCreation,
        allowBusinessCardCreation: dto.allowBusinessCardCreation,
      });
      result.allowBiolinkCreation = locks.allowBiolinkCreation;
      result.allowBusinessCardCreation = locks.allowBusinessCardCreation;
    }
    if (dto.features !== undefined) {
      // A single bag for every user-facing feature switch; unknown keys are
      // dropped inside the service, and the two creation locks stay mirrored
      // into their dedicated fields for backward compatibility.
      const flags = await this.settingsService.setFeatureFlags(dto.features);
      result.features = flags;
      result.allowBiolinkCreation = flags.allowBiolinkCreation;
      result.allowBusinessCardCreation = flags.allowBusinessCardCreation;
    }
    if (dto.featureVisibility !== undefined) {
      result.featureVisibility = await this.settingsService.setFeatureVisibility(
        dto.featureVisibility,
      );
    }
    if (dto.newsHeadlineCount !== undefined) {
      result.newsHeadlineCount = await this.settingsService.setNewsHeadlineCount(
        dto.newsHeadlineCount,
      );
    }
    if (
      dto.newsAccessLevel !== undefined &&
      NEWS_ACCESS_LEVEL_SET.has(dto.newsAccessLevel)
    ) {
      result.newsAccessLevel = await this.settingsService.setNewsAccessLevel(
        dto.newsAccessLevel,
      );
    }
    if (dto.phoneLoginEnabled !== undefined) {
      result.phoneLoginEnabled = await this.settingsService.setPhoneLoginEnabled(
        dto.phoneLoginEnabled,
      );
    }
    if (dto.emailLoginEnabled !== undefined) {
      result.emailLoginEnabled = await this.settingsService.setEmailLoginEnabled(
        dto.emailLoginEnabled,
      );
    }
    if (dto.adDurationDays !== undefined) {
      result.adDurationDays = await this.settingsService.setAdDurationDays(
        dto.adDurationDays,
      );
    }
    if (dto.adDailySlots !== undefined) {
      result.adDailySlots = await this.settingsService.setAdDailySlots(
        dto.adDailySlots,
      );
    }
    if (dto.boostDurationDays !== undefined) {
      result.boostDurationDays = await this.settingsService.setBoostDurationDays(
        dto.boostDurationDays,
      );
    }
    if (dto.adDirectoryDurationDays !== undefined) {
      result.adDirectoryDurationDays =
        await this.settingsService.setAdDirectoryDurationDays(
          dto.adDirectoryDurationDays,
        );
    }
    if (dto.boostPrice !== undefined) {
      result.boostPrice = await this.settingsService.setBoostPrice(
        dto.boostPrice,
      );
    }
    if (dto.adHomePrice !== undefined) {
      result.adHomePrice = await this.settingsService.setAdHomePrice(
        dto.adHomePrice,
      );
    }
    if (dto.adDirectoryPrice !== undefined) {
      result.adDirectoryPrice = await this.settingsService.setAdDirectoryPrice(
        dto.adDirectoryPrice,
      );
    }
    if (dto.feedTagPrice !== undefined) {
      result.feedTagPrice = await this.settingsService.setFeedTagPrice(
        dto.feedTagPrice,
      );
    }
    if (dto.pointsPerNews !== undefined) {
      result.pointsPerNews = await this.settingsService.setPointsPerNews(
        dto.pointsPerNews,
      );
    }
    if (dto.feedMaxImages !== undefined) {
      result.feedMaxImages = await this.settingsService.setFeedMaxImages(
        dto.feedMaxImages,
      );
    }
    if (dto.feedMaxImageKb !== undefined) {
      result.feedMaxImageKb = await this.settingsService.setFeedMaxImageKb(
        dto.feedMaxImageKb,
      );
    }
    return result;
  }
}
