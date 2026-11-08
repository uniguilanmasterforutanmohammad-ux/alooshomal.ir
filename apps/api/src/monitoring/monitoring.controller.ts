import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateMonitoringDto } from './dto/update-monitoring.dto';
import { MonitoringService } from './monitoring.service';

@ApiTags('monitoring')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/monitoring')
export class MonitoringController {
  constructor(private readonly monitoring: MonitoringService) {}

  @Get()
  @ApiOperation({
    summary: 'وضعیت لحظه‌ای منابع سرور و تنظیمات آستانه‌ها',
  })
  snapshot() {
    return this.monitoring.getSnapshot();
  }

  @Patch()
  @ApiOperation({
    summary: 'تنظیم آستانه‌ی رم/پردازنده/دیسک و گیرندگان هشدار',
  })
  update(@Body() dto: UpdateMonitoringDto) {
    return this.monitoring.updateConfig(dto);
  }

  @Post('test')
  @ApiOperation({ summary: 'ارسال پیام آزمایشی به ایمیل و موبایل ادمین' })
  test() {
    return this.monitoring.sendTest();
  }
}
