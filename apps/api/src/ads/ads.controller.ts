import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AdsService } from './ads.service';
import { CreateAdDto } from './dto/create-ad.dto';

@ApiTags('ads')
@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Public()
  @Get('public/active')
  @ApiOperation({ summary: 'تبلیغ فعال صفحه اصلی (چرخشی با تنظیم مدیر)' })
  active() {
    return this.adsService.activeAd();
  }

  @Get('overview')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'نمای کلی تبلیغات: موارد قابل تبلیغ و درخواست‌های من' })
  overview(@CurrentUser() user: AuthUser) {
    return this.adsService.overview(user.id);
  }

  @Post('request')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ثبت درخواست تبلیغ برای یک کارت/بیولینک (در انتظار تأیید مدیر)' })
  request(@CurrentUser() user: AuthUser, @Body() dto: CreateAdDto) {
    return this.adsService.create(user.id, dto);
  }
}
