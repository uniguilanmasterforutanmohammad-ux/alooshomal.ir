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
import {
  CreateCooperationDto,
  UpdateCooperationDto,
} from './dto/realestate.dto';
import { RealEstateService } from './realestate.service';

@ApiTags('real-estate')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('propertyFiles')
@Controller('property-cooperations')
export class PropertyCooperationsController {
  constructor(private readonly realEstate: RealEstateService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست همکاری‌های بین مشاوران/شعب (فیلتر فایل)' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('propertyId') propertyId?: string,
  ) {
    return this.realEstate.listCooperations(user.id, propertyId);
  }

  @Post()
  @ApiOperation({ summary: 'ثبت همکاری و سهم شریک روی یک فایل' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCooperationDto) {
    return this.realEstate.createCooperation(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش همکاری/سهم/وضعیت' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCooperationDto,
  ) {
    return this.realEstate.updateCooperation(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف همکاری' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.realEstate.removeCooperation(user.id, id);
  }
}
