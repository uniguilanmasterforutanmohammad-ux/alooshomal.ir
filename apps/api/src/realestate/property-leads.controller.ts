import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BusinessModuleGuard } from '../business-modules/business-module.guard';
import { RequireModule } from '../business-modules/require-module.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { CreateLeadDto, UpdateLeadDto } from './dto/realestate.dto';
import { RealEstateService } from './realestate.service';

@ApiTags('real-estate')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('propertyCrm')
@Controller('property-leads')
export class PropertyLeadsController {
  constructor(private readonly realEstate: RealEstateService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست تقاضاهای مشتریان (فیلتر وضعیت/نوع/جستجو)' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('kind') kind?: string,
    @Query('q') q?: string,
  ) {
    return this.realEstate.listLeads(user.id, { status, kind, q });
  }

  @Post()
  @ApiOperation({ summary: 'ثبت تقاضای مشتری جدید' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLeadDto) {
    return this.realEstate.createLead(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات تقاضا همراه بازدیدها و قراردادها' })
  find(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.realEstate.getLead(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش تقاضا/اقدام بعدی' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.realEstate.updateLead(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف تقاضا' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.realEstate.removeLead(user.id, id);
  }

  @Get(':id/matches')
  @ApiOperation({ summary: 'فایل‌های فعال متناسب با این تقاضا' })
  matches(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.realEstate.matchPropertiesForLead(user.id, id);
  }
}
