import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SettingsService } from '../settings/settings.service';
import { ActivityService } from './activity.service';

class ListActivityDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  adminOnly?: boolean;
}

class UpdateActivitySettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  activityRetentionMonths?: number;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/activity')
export class AdminActivityController {
  constructor(
    private readonly activity: ActivityService,
    private readonly settings: SettingsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'گزارش رویدادهای سیستم با صفحه‌بندی' })
  async list(@Query() query: ListActivityDto) {
    const [result, actions] = await Promise.all([
      this.activity.list(query),
      this.activity.actions(),
    ]);
    return { ...result, actions };
  }

  @Get('settings')
  @ApiOperation({ summary: 'تنظیمات گزارش سیستم (مدت ماندگاری)' })
  async settings_() {
    return {
      activityRetentionMonths: await this.settings.getActivityRetentionMonths(),
    };
  }

  @Patch('settings')
  @ApiOperation({ summary: 'تعیین مدت ماندگاری گزارش‌ها (ماه) و پاک‌سازی فوری' })
  async updateSettings(@Body() dto: UpdateActivitySettingsDto) {
    if (dto.activityRetentionMonths === undefined) {
      return {
        activityRetentionMonths: await this.settings.getActivityRetentionMonths(),
        pruned: 0,
      };
    }
    const months = await this.settings.setActivityRetentionMonths(
      dto.activityRetentionMonths,
    );
    // Apply the new window immediately so a shorter retention shrinks the
    // table right away (not only on the next daily sweep).
    const pruned = await this.activity.prune();
    return { activityRetentionMonths: months, pruned };
  }
}
