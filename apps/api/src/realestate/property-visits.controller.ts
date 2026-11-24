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
import { CreateVisitDto, UpdateVisitDto } from './dto/realestate.dto';
import { RealEstateService } from './realestate.service';

@ApiTags('real-estate')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('propertyVisits')
@Controller('property-visits')
export class PropertyVisitsController {
  constructor(private readonly realEstate: RealEstateService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست بازدیدها (فیلتر وضعیت/فایل/تقاضا)' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('propertyId') propertyId?: string,
    @Query('leadId') leadId?: string,
  ) {
    return this.realEstate.listVisits(user.id, { status, propertyId, leadId });
  }

  @Post()
  @ApiOperation({ summary: 'هماهنگی بازدید جدید' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateVisitDto) {
    return this.realEstate.createVisit(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ثبت نتیجه/تغییر وضعیت بازدید' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateVisitDto,
  ) {
    return this.realEstate.updateVisit(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف بازدید' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.realEstate.removeVisit(user.id, id);
  }
}
