import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { InquiriesService } from './inquiries.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/inquiries')
export class InquiriesController {
  constructor(private readonly inquiries: InquiriesService) {}

  @Get()
  @ApiOperation({
    summary:
      'فهرست کامل استعلام‌های زحل و api.ir با جست‌وجو در سرویس، کاربر، کد ملی و پیام',
  })
  @ApiQuery({ name: 'provider', required: false, enum: ['ZOHAL', 'APIIR'] })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'take', required: false })
  list(
    @Query('provider') provider?: string,
    @Query('q') q?: string,
    @Query('take') take?: string,
  ) {
    return this.inquiries.list({
      provider,
      q,
      take: take ? Number.parseInt(take, 10) : undefined,
    });
  }
}
