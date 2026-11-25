import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { Public } from '../common/decorators/public.decorator';
import { parseGatewayCallback } from '../payping/gateway-callback';
import { AccommodationsService } from './accommodations.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JabamaCalendarQueryDto } from './dto/jabama-calendar.dto';
import { PublicAccommodationListDto } from './dto/public-accommodation-list.dto';
import { JabamaCalendarService } from './jabama-calendar.service';

@ApiTags('accommodations')
@Public()
@Controller('public/accommodations')
export class PublicAccommodationsController {
  constructor(
    private readonly accommodations: AccommodationsService,
    private readonly jabamaCalendar: JabamaCalendarService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'فهرست عمومی اقامتگاه‌های منتشرشده با فیلتر جست‌وجو، شهر، نوع، ظرفیت و بازه‌ی قیمت',
  })
  list(@Query() query: PublicAccommodationListDto) {
    return this.accommodations.publicList(query);
  }

  @Get('filters')
  @ApiOperation({
    summary: 'گزینه‌های فیلتر دایرکتوری اقامتگاه‌ها (شهرها و نوع‌های دارای اقامتگاه)',
  })
  filters() {
    return this.accommodations.publicFacets();
  }

  @Get('jabama/calendar')
  @ApiOperation({
    summary:
      'پیش‌نمایش تقویم اقامتگاه جاباما (روزهای مسدود) از روی لینک صفحه‌ی جاباما',
  })
  jabamaCalendarPreview(@Query() query: JabamaCalendarQueryDto) {
    return this.jabamaCalendar.preview(query.url);
  }

  @Get('jabama/calendar.ics')
  @ApiOperation({
    summary: 'فید iCal ساخته‌شده از تقویم جاباما برای همگام‌سازی OTA',
  })
  async jabamaCalendarIcs(
    @Query() query: JabamaCalendarQueryDto,
    @Res() res: Response,
  ) {
    const ics = await this.jabamaCalendar.toIcal(query.url);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="jabama-calendar.ics"',
    );
    res.send(ics);
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'صفحه‌ی عمومی اقامتگاه همراه کانال‌های رزرو و تقویم مسدودی',
  })
  find(@Param('slug') slug: string) {
    return this.accommodations.publicFind(slug);
  }

  @Post(':slug/bookings')
  @ApiOperation({ summary: 'ثبت درخواست رزرو عمومی (بدون نیاز به ورود)' })
  book(@Param('slug') slug: string, @Body() dto: CreateBookingDto) {
    return this.accommodations.createPublicBooking(slug, dto);
  }

  @Get(':slug/calendar.ics')
  @ApiOperation({ summary: 'فید iCal عمومی اقامتگاه برای همگام‌سازی OTA' })
  async calendar(@Param('slug') slug: string, @Res() res: Response) {
    const ics = await this.accommodations.publicCalendar(slug);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.send(ics);
  }

  @Post(':slug/bookings/:id/deposit')
  @ApiOperation({ summary: 'شروع پرداخت آنلاین ودیعه‌ی یک درخواست رزرو' })
  deposit(@Param('slug') slug: string, @Param('id') id: string) {
    return this.accommodations.startDepositPayment(slug, id);
  }

  @Get('deposits/callback')
  @ApiOperation({ summary: 'بازگشت GET از درگاه پس از پرداخت ودیعه' })
  async depositCallbackGet(
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ) {
    return this.finishDepositCallback(parseGatewayCallback(query, null), res);
  }

  @Post('deposits/callback')
  @ApiOperation({ summary: 'بازگشت POST از درگاه پس از پرداخت ودیعه' })
  async depositCallbackPost(
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ) {
    return this.finishDepositCallback(parseGatewayCallback(query, body), res);
  }

  private async finishDepositCallback(
    payload: {
      paymentCode?: string;
      refId?: string;
      clientRefId?: string;
      status?: number;
    },
    res: Response,
  ) {
    const result = await this.accommodations.handleDepositCallback(payload);
    res.redirect(302, result.redirectUrl);
  }
}
