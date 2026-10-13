import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { BoostsService } from './boosts.service';
import { CreateBoostDto } from './dto/create-boost.dto';

@ApiTags('boosts')
@ApiBearerAuth()
@Controller('boosts')
export class BoostsController {
  constructor(private readonly boostsService: BoostsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'نمای کلی افزایش بازدید: لیست کارت‌ها/بیولینک‌ها و درخواست‌ها' })
  overview(@CurrentUser() user: AuthUser, @Query() query: PaginationDto) {
    return this.boostsService.overview(user.id, query.page, query.limit);
  }

  @Post('request')
  @ApiOperation({ summary: 'درخواست افزایش بازدید (پله) برای یک کارت/بیولینک' })
  request(@CurrentUser() user: AuthUser, @Body() dto: CreateBoostDto) {
    return this.boostsService.create(user.id, dto);
  }
}
