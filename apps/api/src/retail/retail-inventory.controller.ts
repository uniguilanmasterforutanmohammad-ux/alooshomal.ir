import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BusinessModuleGuard } from '../business-modules/business-module.guard';
import { RequireModule } from '../business-modules/require-module.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { StockMovementDto } from './dto/stock-movement.dto';
import { RetailService } from './retail.service';

@ApiTags('retail')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('retailInventory')
@Controller('retail/inventory')
export class RetailInventoryController {
  constructor(private readonly retail: RetailService) {}

  @Get()
  @ApiOperation({ summary: 'موجودی محصولات، هشدار کمبود و کاردکس انبار' })
  inventory(@CurrentUser() user: AuthUser) {
    return this.retail.inventory(user.id);
  }

  @Post('movements')
  @ApiOperation({ summary: 'ثبت ورود/خروج/اصلاح موجودی' })
  movement(@CurrentUser() user: AuthUser, @Body() dto: StockMovementDto) {
    return this.retail.addMovement(user.id, dto);
  }
}
