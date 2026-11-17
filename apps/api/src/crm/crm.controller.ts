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
import { CrmService } from './crm.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('crm')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('crm')
@Controller('crm/customers')
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست مشتریان کسب‌وکار (جستجو با q)' })
  list(@CurrentUser() user: AuthUser, @Query('q') q?: string) {
    return this.crm.list(user.id, q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'پروفایل مشتری همراه تعامل‌ها و رزروها' })
  find(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.crm.find(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'افزودن مشتری به دفترچه‌ی CRM' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerDto) {
    return this.crm.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش مشتری' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.crm.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف مشتری' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.crm.remove(user.id, id);
  }

  @Post(':id/interactions')
  @ApiOperation({ summary: 'ثبت یادداشت/تماس برای مشتری' })
  addInteraction(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateInteractionDto,
  ) {
    return this.crm.addInteraction(user.id, id, dto);
  }
}
