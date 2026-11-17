import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { Public } from '../common/decorators/public.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { parseGatewayCallback } from '../payping/gateway-callback';
import { SettingsService } from '../settings/settings.service';
import { BusinessModulesService } from './business-modules.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { PurchaseManagementDto } from './dto/purchase-management.dto';
import { PurchaseModuleDto } from './dto/purchase-module.dto';
import { SetIndustryDto } from './dto/set-industry.dto';
import { SetModuleDto } from './dto/set-module.dto';
import { UpdateWorkspaceByIdDto } from './dto/update-workspace-by-id.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@ApiTags('business-modules')
@ApiBearerAuth()
@Controller('business-modules')
export class BusinessModulesController {
  constructor(
    private readonly modules: BusinessModulesService,
    private readonly settings: SettingsService,
  ) {}

  private async ensureEnabled(): Promise<void> {
    await this.settings.assertFeatureEnabled('featureBusinessWorkspace');
  }

  @Get('catalog')
  @ApiOperation({
    summary: 'کاتالوگ ماژول‌ها، بسته‌های صنف و قیمت‌های تعیین‌شده',
  })
  async catalog() {
    await this.ensureEnabled();
    return this.modules.resolveCatalog();
  }

  @Get('workspaces')
  @ApiOperation({ summary: 'فهرست کسب‌وکارهای من (برای سوییچ بالای پنل)' })
  async workspaces(@CurrentUser() user: AuthUser) {
    await this.ensureEnabled();
    return this.modules.listWorkspaces(user.id);
  }

  @Post('workspaces')
  @ApiOperation({
    summary: 'ساخت کسب‌وکار جدید (محدود به تعداد مجاز اشتراک)',
  })
  async createWorkspace(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateWorkspaceDto,
  ) {
    await this.ensureEnabled();
    return this.modules.createWorkspace(user.id, dto);
  }

  @Patch('workspaces/:id')
  @ApiOperation({ summary: 'ویرایش نام/صنف/پیش‌فرض‌بودن یک کسب‌وکار' })
  async updateWorkspace(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceByIdDto,
  ) {
    await this.ensureEnabled();
    return this.modules.updateWorkspaceById(user.id, id, dto);
  }

  @Delete('workspaces/:id')
  @ApiOperation({ summary: 'حذف یک کسب‌وکار (حداقل یکی باقی می‌ماند)' })
  async removeWorkspace(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.ensureEnabled();
    return this.modules.removeWorkspace(user.id, id);
  }

  @Get('my')
  @ApiOperation({
    summary:
      'فضای کسب‌وکار فعال: صنف، ماژول‌های فعال/قفل‌شده، قیمت و ظرفیت اشتراک',
  })
  async mine(@CurrentUser() user: AuthUser) {
    await this.ensureEnabled();
    return this.modules.resolve(user.id);
  }

  @Patch('my')
  @ApiOperation({ summary: 'تغییر نام نمایشی فضای کسب‌وکار فعال' })
  async updateMine(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    await this.ensureEnabled();
    return this.modules.updateWorkspace(user.id, dto);
  }

  @Patch('my/industry')
  @ApiOperation({
    summary: 'انتخاب بسته‌ی صنف؛ ماژول‌های پیش‌فرض آن به‌صورت افزودنی فعال می‌شوند',
  })
  async setIndustry(
    @CurrentUser() user: AuthUser,
    @Body() dto: SetIndustryDto,
  ) {
    await this.ensureEnabled();
    return this.modules.setIndustry(user.id, dto.industryKey);
  }

  @Get('purchases')
  @ApiOperation({ summary: 'سابقه‌ی خرید ماژول‌های کسب‌وکار فعال' })
  async purchases(@CurrentUser() user: AuthUser) {
    await this.ensureEnabled();
    return this.modules.listPurchases(user.id);
  }

  @Get('managements')
  @ApiOperation({
    summary:
      'فهرست «مدیریت کسب‌وکار»ها با ماژول‌های فعال و قیمت کل (مجموع قیمت ماژول‌ها)',
  })
  async managements(@CurrentUser() user: AuthUser) {
    await this.ensureEnabled();
    return this.modules.listManagements(user.id);
  }

  @Post('managements/:key/purchase')
  @ApiOperation({
    summary:
      'خرید یک «مدیریت کسب‌وکار» کامل (همه‌ی ماژول‌های خریدنی آن)؛ کیف پول یا پی‌پینگ',
  })
  async purchaseManagement(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
    @Body() dto: PurchaseManagementDto,
  ) {
    await this.ensureEnabled();
    return this.modules.purchaseManagement(
      user.id,
      key,
      dto.months,
      dto.returnTo,
    );
  }

  @Post('my/:key/purchase')
  @ApiOperation({
    summary:
      'خرید ماژول کسب‌وکار (کیف پول یا درگاه پی‌پینگ)؛ پس از پرداخت فعال می‌شود',
  })
  async purchase(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
    @Body() dto: PurchaseModuleDto,
  ) {
    await this.ensureEnabled();
    this.assertCanManageModules(user);
    return this.modules.purchase(user.id, key, dto.months, dto.returnTo);
  }

  @Patch('my/:key')
  @ApiOperation({
    summary: 'فعال/غیرفعال‌کردن یک ماژول (خرید و وابستگی‌ها بررسی می‌شوند)',
  })
  async setModule(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
    @Body() dto: SetModuleDto,
  ) {
    await this.ensureEnabled();
    this.assertCanManageModules(user);
    return this.modules.setModuleEnabled(user.id, key, dto.enabled);
  }

  /**
   * Module activation is an admin decision: the business owner only sees the
   * modules that are already active for their workspace.
   */
  private assertCanManageModules(user: AuthUser): void {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException({
        message:
          'فعال یا غیرفعال‌کردن ماژول‌ها فقط توسط مدیر سامانه انجام می‌شود.',
        code: 'MODULE_MANAGEMENT_ADMIN_ONLY',
      });
    }
  }

  @Public()
  @Get('payments/callback')
  @ApiOperation({ summary: 'بازگشت GET از درگاه پس از پرداخت خرید ماژول' })
  async paymentCallbackGet(
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ) {
    return this.finishPaymentCallback(parseGatewayCallback(query, null), res);
  }

  @Public()
  @Post('payments/callback')
  @ApiOperation({ summary: 'بازگشت POST از درگاه پس از پرداخت خرید ماژول' })
  async paymentCallbackPost(
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ) {
    return this.finishPaymentCallback(parseGatewayCallback(query, body), res);
  }

  private async finishPaymentCallback(
    payload: {
      paymentCode?: string;
      refId?: string;
      clientRefId?: string;
      status?: number;
    },
    res: Response,
  ) {
    const result = await this.modules.handlePurchaseCallback(payload);
    res.redirect(302, result.redirectUrl);
  }
}
