import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { BusinessModuleGuard } from '../business-modules/business-module.guard';
import { RequireModule } from '../business-modules/require-module.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { AccommodationsService } from './accommodations.service';
import { AccommodationAiImportService } from './accommodation-ai-import.service';
import { AddAccommodationPhotoDto } from './dto/add-photo.dto';
import {
  EstimateAccommodationAiImportDto,
  ImportAccommodationAiImportDto,
} from './dto/ai-import.dto';
import { CreateAccommodationDto } from './dto/create-accommodation.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateCalendarBlockDto } from './dto/create-block.dto';
import { CalendarOverviewQueryDto } from './dto/calendar-overview.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateMessageDto } from './dto/message.dto';
import { QuoteStayDto } from './dto/quote.dto';
import { CreateRateDto, UpdateRateDto } from './dto/rate.dto';
import { ReplyReviewDto } from './dto/review.dto';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { UpdateAccommodationDto } from './dto/update-accommodation.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { UpdateDepositDto } from './dto/update-deposit.dto';

@ApiTags('accommodations')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('accommodationRental')
@Controller('accommodations')
export class AccommodationsController {
  constructor(
    private readonly accommodations: AccommodationsService,
    private readonly aiImport: AccommodationAiImportService,
  ) {}

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

  @Post('ai-import/estimate')
  @ApiOperation({
    summary:
      'برآورد هزینه و توکن ورود خودکار اقامتگاه از جاباما (پیش از پرداخت)',
  })
  estimateAiImport(
    @CurrentUser() user: AuthUser,
    @Body() dto: EstimateAccommodationAiImportDto,
  ) {
    return this.aiImport.estimate(user.id, dto);
  }

  @Post('ai-import')
  @ApiOperation({
    summary:
      'ورود خودکار اقامتگاه از جاباما با هوش مصنوعی (پس از تأیید هزینه)',
  })
  importAiAccommodation(
    @CurrentUser() user: AuthUser,
    @Body() dto: ImportAccommodationAiImportDto,
  ) {
    return this.aiImport.import(user.id, dto);
  }

  @Get('bookings')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'همه‌ی درخواست‌های رزرو کسب‌وکار (با فیلتر وضعیت)' })
  bookings(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.accommodations.listBookings(user.id, status);
  }

  @Get('calendar')
  @RequireModule('accommodationReservations')
  @ApiOperation({
    summary:
      'نمای یکپارچه‌ی تقویم: همه‌ی اقامتگاه‌ها همراه رزروها و مسدودی‌ها در یک بازه',
  })
  calendarOverview(
    @CurrentUser() user: AuthUser,
    @Query() query: CalendarOverviewQueryDto,
  ) {
    return this.accommodations.calendarOverview(user.id, query.from, query.to);
  }

  @Get('reports')
  @RequireModule('accommodationReservations')
  @ApiOperation({
    summary:
      'گزارش اشغال و درآمد (ADR/RevPAR) به تفکیک اقامتگاه، کانال و ماه',
  })
  reports(
    @CurrentUser() user: AuthUser,
    @Query() query: CalendarOverviewQueryDto,
  ) {
    return this.accommodations.reports(user.id, query.from, query.to);
  }

  @Get('tasks')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'وظایف عملیاتی (نظافت/تعمیر) با فیلتر وضعیت' })
  tasks(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.accommodations.listTasks(user.id, status);
  }

  @Post('tasks')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'افزودن وظیفه‌ی عملیاتی' })
  createTask(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
    return this.accommodations.createTask(user.id, dto);
  }

  @Patch('tasks/:id')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'ویرایش/تکمیل وظیفه' })
  updateTask(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.accommodations.updateTask(user.id, id, dto);
  }

  @Delete('tasks/:id')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'حذف وظیفه' })
  removeTask(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.accommodations.removeTask(user.id, id);
  }

  @Patch('bookings/:id/cancel')
  @RequireModule('accommodationReservations')
  @ApiOperation({
    summary: 'لغو رزرو و محاسبه‌ی مبلغ بازگشتی بر اساس سیاست لغو اقامتگاه',
  })
  cancelBooking(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.accommodations.cancelBooking(user.id, id, dto.reason);
  }

  @Get('bookings/:id/messages')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'پیام‌های یک رزرو (صندوق پیام مهمان)' })
  messages(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.accommodations.listMessages(user.id, id);
  }

  @Post('bookings/:id/messages')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'ثبت پیام برای مهمان یک رزرو' })
  addMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.accommodations.createMessage(user.id, id, dto);
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

  @Get(':id/rates')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'نرخ‌های فصلی/آخر هفته‌ی اقامتگاه' })
  rates(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.accommodations.listRates(user.id, id);
  }

  @Post(':id/rates')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'افزودن نرخ فصلی/آخر هفته' })
  createRate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateRateDto,
  ) {
    return this.accommodations.createRate(user.id, id, dto);
  }

  @Patch(':id/rates/:rateId')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'ویرایش نرخ' })
  updateRate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('rateId') rateId: string,
    @Body() dto: UpdateRateDto,
  ) {
    return this.accommodations.updateRate(user.id, id, rateId, dto);
  }

  @Delete(':id/rates/:rateId')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'حذف نرخ' })
  removeRate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('rateId') rateId: string,
  ) {
    return this.accommodations.removeRate(user.id, id, rateId);
  }

  @Post(':id/quote')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'برآورد قیمت اقامت بر اساس نرخ‌ها و هزینه‌ها' })
  quote(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: QuoteStayDto,
  ) {
    return this.accommodations.quoteForOwner(user.id, id, dto);
  }

  @Get(':id/reviews')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'نظرات مهمانان این اقامتگاه' })
  reviews(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.accommodations.listReviews(user.id, id);
  }

  @Patch(':id/reviews/:reviewId/reply')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'پاسخ میزبان به نظر مهمان' })
  replyReview(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.accommodations.replyReview(user.id, id, reviewId, dto.reply);
  }

  @Patch(':id/reviews/:reviewId/status')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'نمایش/پنهان‌کردن نظر' })
  reviewStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('reviewId') reviewId: string,
    @Body('status') status: string,
  ) {
    return this.accommodations.setReviewStatus(user.id, id, reviewId, status);
  }

  @Get(':id/calendar.ics')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'خروجی iCal تقویم اقامتگاه (مسدودی‌ها و رزروها)' })
  async calendar(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const ics = await this.accommodations.ownerCalendar(user.id, id);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="property-${id}.ics"`,
    );
    res.send(ics);
  }

  @Patch('bookings/:id/deposit')
  @RequireModule('accommodationReservations')
  @ApiOperation({ summary: 'ثبت دستی وضعیت ودیعه‌ی یک رزرو' })
  setDeposit(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDepositDto,
  ) {
    return this.accommodations.setDepositStatus(user.id, id, dto.status);
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
