import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { BackupDestination } from './backup.constants';
import { BackupService } from './backup.service';
import { CreateBackupDto } from './dto/create-backup.dto';
import { UpdateBackupSettingsDto } from './dto/update-backup-settings.dto';

@ApiTags('admin-backups')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/backups')
export class BackupController {
  constructor(private readonly backups: BackupService) {}

  @Get()
  @ApiOperation({
    summary: 'فهرست بسته‌های پشتیبان محلی، عملیات در حال اجرا و وضعیت فضای ذخیره‌سازی',
  })
  list() {
    return this.backups.list();
  }

  @Post()
  @ApiOperation({
    summary: 'ساخت بکاپ دستی کامل (دیتابیس + رسانه‌ها) به‌صورت عملیات پس‌زمینه',
  })
  create(@CurrentUser() admin: AuthUser, @Body() dto: CreateBackupDto) {
    return this.backups.create(admin.id, dto.includeMedia ?? true);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'وضعیت و پیشرفت یک عملیات پشتیبان‌گیری' })
  job(@Param('id') id: string) {
    return this.backups.getJob(id);
  }

  @Get('settings')
  @ApiOperation({
    summary: 'تنظیمات مقصدهای پشتیبان (Google Drive، S3 و WebDAV) با مقادیر پوشانده‌شده',
  })
  settings() {
    return this.backups.getPublicSettings();
  }

  @Put('settings')
  @ApiOperation({ summary: 'ذخیره‌ی تنظیمات مقصدهای پشتیبان (رمزها رمزنگاری‌شده)' })
  updateSettings(@Body() dto: UpdateBackupSettingsDto) {
    return this.backups.updateSettings(dto);
  }

  @Post('test/:destination')
  @ApiOperation({ summary: 'آزمایش اتصال به یک مقصد پشتیبان' })
  test(@Param('destination') destination: BackupDestination) {
    return this.backups.testDestination(destination);
  }

  @Get(':name/download')
  @ApiOperation({ summary: 'دانلود بسته‌ی پشتیبان' })
  download(@Param('name') name: string, @Res() res: Response) {
    const file = this.backups.filePath(name);
    return res.download(file, name);
  }

  @Post(':name/destinations/:destination')
  @ApiOperation({ summary: 'ارسال بسته‌ی پشتیبان به مقصد انتخاب‌شده' })
  upload(
    @CurrentUser() admin: AuthUser,
    @Param('name') name: string,
    @Param('destination') destination: BackupDestination,
  ) {
    return this.backups.upload(admin.id, name, destination);
  }

  @Delete(':name')
  @ApiOperation({ summary: 'حذف یک بسته‌ی پشتیبان محلی' })
  remove(@CurrentUser() admin: AuthUser, @Param('name') name: string) {
    return this.backups.remove(admin.id, name);
  }
}
