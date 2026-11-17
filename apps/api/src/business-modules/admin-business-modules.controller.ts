import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminSetModuleDto } from './dto/admin-set-module.dto';
import { AdminSetPriceDto } from './dto/admin-set-price.dto';
import { BusinessModulesService } from './business-modules.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/business-modules')
export class AdminBusinessModulesController {
  constructor(private readonly modules: BusinessModulesService) {}

  @Get('catalog')
  @ApiOperation({
    summary: 'کاتالوگ کامل ماژول‌ها با قیمت و تعداد کسب‌وکارهای فعال',
  })
  catalog() {
    return this.modules.adminCatalog();
  }

  @Get('workspaces')
  @ApiOperation({ summary: 'فهرست کسب‌وکارها و ماژول‌های فعال هرکدام' })
  workspaces(
    @Query('q') q?: string,
    @Query('take') take?: string,
  ) {
    return this.modules.adminListWorkspaces({
      q,
      take: take ? Number.parseInt(take, 10) : undefined,
    });
  }

  @Patch('workspaces/:id/modules/:key')
  @ApiOperation({ summary: 'فعال/غیرفعال‌کردن یک ماژول برای یک کسب‌وکار' })
  setModule(
    @Param('id') id: string,
    @Param('key') key: string,
    @Body() dto: AdminSetModuleDto,
  ) {
    return this.modules.adminSetModule(id, key, dto.enabled);
  }

  @Get('prices')
  @ApiOperation({ summary: 'فهرست قیمت‌های تعیین‌شده‌ی ماژول‌ها' })
  prices() {
    return this.modules.adminListPrices();
  }

  @Patch('prices/:key')
  @ApiOperation({ summary: 'تعیین/ویرایش قیمت یک «مدیریت کسب‌وکار»' })
  setPrice(@Param('key') key: string, @Body() dto: AdminSetPriceDto) {
    return this.modules.adminSetPrice(key, dto);
  }
}
