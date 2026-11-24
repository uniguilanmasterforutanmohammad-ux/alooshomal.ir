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

import { BusinessModuleGuard } from '../business-modules/business-module.guard';
import { RequireModule } from '../business-modules/require-module.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { BuildingsService } from './buildings.service';
import {
  CreateBuildingDto,
  CreateUnitDto,
  UpdateBuildingDto,
  UpdateUnitDto,
} from './dto/buildings.dto';

@ApiTags('buildings')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('buildingUnits')
@Controller('buildings')
export class BuildingsController {
  constructor(private readonly buildings: BuildingsService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست ساختمان‌های تحت مدیریت' })
  list(@CurrentUser() user: AuthUser) {
    return this.buildings.listBuildings(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'ثبت ساختمان جدید' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBuildingDto) {
    return this.buildings.createBuilding(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات ساختمان همراه با واحدها' })
  find(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.buildings.getBuilding(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش ساختمان' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBuildingDto,
  ) {
    return this.buildings.updateBuilding(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف ساختمان' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.buildings.removeBuilding(user.id, id);
  }

  @Post(':id/units')
  @ApiOperation({ summary: 'افزودن واحد به ساختمان' })
  addUnit(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateUnitDto,
  ) {
    return this.buildings.createUnit(user.id, id, dto);
  }

  @Patch(':id/units/:unitId')
  @ApiOperation({ summary: 'ویرایش واحد (مالک/ساکن/متراژ/وضعیت)' })
  updateUnit(
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.buildings.updateUnit(user.id, unitId, dto);
  }

  @Delete(':id/units/:unitId')
  @ApiOperation({ summary: 'حذف واحد' })
  removeUnit(@CurrentUser() user: AuthUser, @Param('unitId') unitId: string) {
    return this.buildings.removeUnit(user.id, unitId);
  }
}
