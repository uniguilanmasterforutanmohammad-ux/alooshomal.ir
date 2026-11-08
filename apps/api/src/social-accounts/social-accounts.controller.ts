import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateSocialAccountDto } from './dto/create-social-account.dto';
import { RevealSocialAccountDto } from './dto/reveal-social-account.dto';
import { UpdateSocialAccountDto } from './dto/update-social-account.dto';
import { SocialAccountsService } from './social-accounts.service';

/**
 * Admin-only vault for the «شمالی کارت» brand accounts (Instagram / Bale /
 * Eitaa / Aparat / …). Passwords are stored encrypted and are never part of a
 * list response: the only way to read one back is the audited `reveal` route.
 */
@ApiTags('social-accounts')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/social-accounts')
export class SocialAccountsController {
  constructor(private readonly accounts: SocialAccountsService) {}

  @Get()
  @ApiOperation({
    summary: 'فهرست حساب‌های شبکه‌های اجتماعی برند (بدون رمز) و سکوهای پشتیبانی‌شده',
  })
  list() {
    return this.accounts.list();
  }

  @Post()
  @ApiOperation({ summary: 'افزودن حساب شبکه‌ی اجتماعی با رمز رمزنگاری‌شده' })
  create(@Body() dto: CreateSocialAccountDto, @CurrentUser() user: AuthUser) {
    return this.accounts.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش اطلاعات حساب (و در صورت ارسال، تغییر رمز)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSocialAccountDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.accounts.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف حساب شبکه‌ی اجتماعی' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.accounts.remove(id, user);
  }

  @Post(':id/reveal')
  @ApiOperation({
    summary: 'نمایش رمز یک حساب؛ دلیل در «گزارش‌های سیستم» ثبت می‌شود',
  })
  reveal(
    @Param('id') id: string,
    @Body() dto: RevealSocialAccountDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.accounts.reveal(id, dto.reason, user);
  }
}
