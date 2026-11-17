import { Body, Controller, Get, Patch, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { SettingsService } from '../settings/settings.service';
import { BusinessModulesService } from './business-modules.service';
import { SetIndustryDto } from './dto/set-industry.dto';
import { SetModuleDto } from './dto/set-module.dto';
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
    summary: 'کاتالوگ ماژول‌ها و بسته‌های صنف (برای رندر پنل کسب‌وکار)',
  })
  async catalog() {
    await this.ensureEnabled();
    return this.modules.resolveCatalog();
  }

  @Get('my')
  @ApiOperation({
    summary: 'فضای کسب‌وکار من: صنف، ماژول‌های فعال و قابل فعال‌سازی',
  })
  async mine(@CurrentUser() user: AuthUser) {
    await this.ensureEnabled();
    return this.modules.resolve(user.id);
  }

  @Patch('my')
  @ApiOperation({ summary: 'تغییر نام نمایشی فضای کسب‌وکار' })
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

  @Patch('my/:key')
  @ApiOperation({
    summary: 'فعال/غیرفعال‌کردن یک ماژول (وابستگی‌ها خودکار بررسی می‌شوند)',
  })
  async setModule(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
    @Body() dto: SetModuleDto,
  ) {
    await this.ensureEnabled();
    return this.modules.setModuleEnabled(user.id, key, dto.enabled);
  }
}
