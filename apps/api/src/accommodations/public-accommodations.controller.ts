import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';
import { AccommodationsService } from './accommodations.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('accommodations')
@Public()
@Controller('public/accommodations')
export class PublicAccommodationsController {
  constructor(private readonly accommodations: AccommodationsService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست عمومی اقامتگاه‌های منتشرشده' })
  list(@Query('q') q?: string, @Query('cityId') cityId?: string) {
    return this.accommodations.publicList({ q, cityId });
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
}
