import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { RequestSubscriptionDto } from './dto/request-subscription.dto';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'فهرست اشتراک‌های فعال' })
  plans() {
    return this.subscriptionsService.listPlans(true);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'اشتراک فعلی و درخواست‌های من' })
  mine(@CurrentUser() user: AuthUser) {
    return this.subscriptionsService.mySubscriptions(user.id);
  }

  @Post('request')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'درخواست اشتراک جدید (در انتظار تأیید مدیر)' })
  request(@CurrentUser() user: AuthUser, @Body() dto: RequestSubscriptionDto) {
    return this.subscriptionsService.requestSubscription(user.id, dto);
  }
}
