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
import { AccommodationsService } from './accommodations.service';
import { AddAccommodationPhotoDto } from './dto/add-photo.dto';
import { CreateAccommodationDto } from './dto/create-accommodation.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateCalendarBlockDto } from './dto/create-block.dto';
import { UpdateAccommodationDto } from './dto/update-accommodation.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@ApiTags('accommodations')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('accommodationRental')
@Controller('accommodations')
export class AccommodationsController {
  constructor(private readonly accommodations: AccommodationsService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست اقامتگاه‌های من' })
  list(@CurrentUser() user: AuthUser) {
    return this.accommodations.listMine(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'ثبت اقامتگاه جدید (پیش‌نویس یا منتشرشده)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAccommodationDto) {
    return this.accommodations.create(user.id, dto);
  }

  @Get('bookings')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'همه‌ی درخواست‌های رزرو کسب‌وکار (با فیلتر وضعیت)' })
  bookings(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.accommodations.listBookings(user.id, status);
  }

  @Patch('bookings/:id/status')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'تغییر وضعیت یک درخواست رزرو' })
  updateBooking(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.accommodations.updateBookingStatus(user.id, id, dto.status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات اقامتگاه من (همراه عکس‌ها، رزروها و مسدودی‌ها)' })
  find(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.accommodations.findMine(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش اقامتگاه' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAccommodationDto,
  ) {
    return this.accommodations.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف اقامتگاه و داده‌های وابسته' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.accommodations.remove(user.id, id);
  }

  @Post(':id/photos')
  @ApiOperation({
    summary: 'افزودن عکس به اقامتگاه (URL خروجی `POST /uploads/gallery`)',
  })
  addPhoto(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddAccommodationPhotoDto,
  ) {
    return this.accommodations.addPhoto(user.id, id, dto);
  }

  @Delete(':id/photos/:photoId')
  @ApiOperation({ summary: 'حذف عکس اقامتگاه' })
  removePhoto(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ) {
    return this.accommodations.removePhoto(user.id, id, photoId);
  }

  @Get(':id/blocks')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'بازه‌های مسدودشده‌ی اقامتگاه' })
  blocks(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.accommodations.listBlocks(user.id, id);
  }

  @Post(':id/blocks')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'مسدودکردن یک بازه‌ی تاریخ' })
  createBlock(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateCalendarBlockDto,
  ) {
    return this.accommodations.createBlock(user.id, id, dto);
  }

  @Delete(':id/blocks/:blockId')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'حذف بازه‌ی مسدود' })
  removeBlock(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('blockId') blockId: string,
  ) {
    return this.accommodations.removeBlock(user.id, id, blockId);
  }

  @Post(':id/bookings')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'ثبت دستی رزرو (تأییدشده) توسط مالک' })
  createBooking(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateBookingDto,
  ) {
    return this.accommodations.createManualBooking(user.id, id, dto);
  }
}
