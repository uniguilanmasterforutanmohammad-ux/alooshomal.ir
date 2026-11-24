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
import { CreateContractDto, UpdateContractDto } from './dto/realestate.dto';
import { RealEstateService } from './realestate.service';

@ApiTags('real-estate')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('propertyFinance')
@Controller('property-contracts')
export class PropertyContractsController {
  constructor(private readonly realEstate: RealEstateService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست قراردادها و وضعیت تسویه‌ی کمیسیون' })
  list(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.realEstate.listContracts(user.id, { status });
  }

  @Post()
  @ApiOperation({ summary: 'ثبت قرارداد و کمیسیون' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateContractDto) {
    return this.realEstate.createContract(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش قرارداد/وصولی/سهم‌ها' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
  ) {
    return this.realEstate.updateContract(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف قرارداد' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.realEstate.removeContract(user.id, id);
  }
}
