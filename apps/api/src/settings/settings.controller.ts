import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  ADMIN_NOTIFY_CATEGORIES,
  AdminNotifyCategory,
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
  adminNotifications?: Partial<Record<AdminNotifyCategory, boolean>>;
}
const ADMIN_NOTIFY_CATEGORY_SET = new Set<string>(ADMIN_NOTIFY_CATEGORIES);

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'تنظیمات عمومی (اندازه صفحه دایرکتوری)' })
  async publicSettings() {
    return {
      directoryPageSize: await this.settingsService.getDirectoryPageSize(),
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
    return {
      ...all,
      directoryPageSize: await this.settingsService.getDirectoryPageSize(),
      adminListPageSize: await this.settingsService.getAdminListPageSize(),
      adminNotifications: await this.settingsService.getAdminNotifyPrefs(),
    };
  }

  @Patch()
  @ApiOperation({ summary: 'به‌روزرسانی تنظیمات مدیر' })
  async update(@Body() dto: UpdateSettingsDto) {
    const result: {
      directoryPageSize?: number;
      adminListPageSize?: number;
      adminNotifications?: Record<AdminNotifyCategory, boolean>;
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
    return result;
  }
}
