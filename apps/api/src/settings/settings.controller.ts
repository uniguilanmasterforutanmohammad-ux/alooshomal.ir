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
      adDurationDays: await this.settingsService.getAdDurationDays(),
      adDailySlots: await this.settingsService.getAdDailySlots(),
      boostDurationDays: await this.settingsService.getBoostDurationDays(),
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
      newsHeadlineCount?: number;
      newsAccessLevel?: NewsAccessLevel;
      phoneLoginEnabled?: boolean;
      adDurationDays?: number;
      adDailySlots?: number;
      boostDurationDays?: number;
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
    return result;
  }
}
