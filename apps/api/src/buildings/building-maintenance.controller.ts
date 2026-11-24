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
import { BuildingsService } from './buildings.service';
import { CreateTicketDto, UpdateTicketDto } from './dto/buildings.dto';

@ApiTags('buildings')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('buildingMaintenance')
@Controller('building-maintenance')
export class BuildingMaintenanceController {
  constructor(private readonly buildings: BuildingsService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست خرابی‌ها و درخواست‌های نگهداری' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('buildingId') buildingId?: string,
    @Query('status') status?: string,
  ) {
    return this.buildings.listTickets(user.id, buildingId, status);
  }

  @Post()
  @ApiOperation({ summary: 'ثبت خرابی/درخواست نگهداری' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) {
    return this.buildings.createTicket(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تغییر وضعیت/مسئول/هزینه‌ی درخواست' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.buildings.updateTicket(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف درخواست' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.buildings.removeTicket(user.id, id);
  }
}
