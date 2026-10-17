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

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  AdjustPointsDto,
  CreateRewardDto,
  RedeemRewardDto,
  UpdateRewardDto,
} from './dto/reward.dto';
import { PointsService } from './points.service';

@ApiTags('points')
@Controller('points')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'امتیاز من: موجودی، گردش امتیاز و جوایز فعال' })
  mine(@CurrentUser() user: AuthUser) {
    return this.pointsService.summary(user.id);
  }

  @Public()
  @Get('rewards')
  @ApiOperation({ summary: 'فهرست جوایز فعال' })
  rewards() {
    return this.pointsService.listRewards(true);
  }

  @Post('redeem/:rewardId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'دریافت جایزه با کسر امتیاز' })
  redeem(
    @CurrentUser() user: AuthUser,
    @Param('rewardId') rewardId: string,
    @Body() dto: RedeemRewardDto,
  ) {
    return this.pointsService.redeem(user.id, rewardId, dto);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/points')
export class AdminPointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get()
  @ApiOperation({ summary: 'نمای کلی امتیازها و جوایز (مدیر)' })
  overview() {
    return this.pointsService.adminOverview();
  }

  @Get('rewards')
  @ApiOperation({ summary: 'همه جوایز (مدیر)' })
  rewards() {
    return this.pointsService.listRewards(false);
  }

  @Post('rewards')
  @ApiOperation({ summary: 'افزودن جایزه جدید' })
  createReward(@Body() dto: CreateRewardDto) {
    return this.pointsService.createReward(dto);
  }

  @Patch('rewards/:id')
  @ApiOperation({ summary: 'ویرایش جایزه' })
  updateReward(@Param('id') id: string, @Body() dto: UpdateRewardDto) {
    return this.pointsService.updateReward(id, dto);
  }

  @Delete('rewards/:id')
  @ApiOperation({ summary: 'حذف جایزه' })
  removeReward(@Param('id') id: string) {
    return this.pointsService.removeReward(id);
  }

  @Post('users/:id/adjust')
  @ApiOperation({ summary: 'تنظیم دستی امتیاز کاربر' })
  adjust(@Param('id') id: string, @Body() dto: AdjustPointsDto) {
    return this.pointsService.adjustPoints(id, dto);
  }
}
